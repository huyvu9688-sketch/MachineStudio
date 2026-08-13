// Pure, deterministic compute function for the rack-pinion-motor-sizing
// module (v0.1.0, Stage 3). Reads input magnitudes in their canonical
// units, delegates the physics to the pure kernel in ./math, and returns
// a structured computation. Performs no I/O and imports only the
// engine's public surface and this module's own files.

import {
  accelerationTorque,
  angularAccelerationFromSpeedRamp,
  makeQuantity,
  rotationalPower,
  type ModuleComputation,
  type ModuleInput,
  type Quantity,
} from "@/lib/engine";
import {
  resolveDriveForce,
  resolveInertiaRatio,
  resolveLoadInertia,
  resolveLoadTorque,
  resolveMomentaryTorque,
  resolveOperatingSpeed,
  resolvePinionInertia,
  resolveReflectedLoadInertia,
  resolveRequiredTorque,
  resolveTotalSystemInertia,
} from "./math";
import { buildChecks } from "./checks";
import { buildTrace } from "./trace";
import { enumAt, quantityAt } from "./values";

export function compute(input: ModuleInput): ModuleComputation {
  const values = input.values;

  const inclineAngle = quantityAt(values, "incline_angle");
  const gravity = quantityAt(values, "gravity");
  const frictionCoefficient = quantityAt(values, "friction_coefficient");
  const totalMovingMass = quantityAt(values, "total_moving_mass");
  const pinionPitchDiameter = quantityAt(values, "pinion_pitch_diameter");
  const pinionMass = quantityAt(values, "pinion_mass");
  const gearRatio = quantityAt(values, "gear_ratio");
  const mechanicalEfficiency = quantityAt(values, "mechanical_efficiency");
  const externalForce = quantityAt(values, "external_force");
  const targetVelocity = quantityAt(values, "target_velocity");
  const accelerationTime = quantityAt(values, "acceleration_time");
  const motorRotorInertia = quantityAt(values, "motor_rotor_inertia");
  const requiredTorqueSafetyFactor = quantityAt(
    values,
    "required_torque_safety_factor",
  );
  const inertiaRatioMaximum = quantityAt(values, "inertia_ratio_maximum");
  const orientation = enumAt(values, "orientation");

  if (
    inclineAngle === undefined ||
    frictionCoefficient === undefined ||
    totalMovingMass === undefined ||
    pinionPitchDiameter === undefined ||
    pinionMass === undefined ||
    mechanicalEfficiency === undefined ||
    targetVelocity === undefined ||
    accelerationTime === undefined ||
    motorRotorInertia === undefined ||
    requiredTorqueSafetyFactor === undefined ||
    inertiaRatioMaximum === undefined ||
    orientation === undefined
  ) {
    throw new Error(
      "rack-pinion-motor-sizing requires its full set of geometry, motion, motor, and safety-factor inputs.",
    );
  }
  // gravity has a registry constant default (9.80665 m/s^2); gear_ratio
  // defaults to 1; external_force defaults to 0 N -- all auto-filled by
  // the module SDK when absent, so none should reach compute() as
  // undefined. Guarded anyway as a defense-in-depth measure, the same
  // treatment every other Motor Sizing Tool module already gives its own
  // constant-default ports.
  if (gravity === undefined || gearRatio === undefined || externalForce === undefined) {
    throw new Error(
      "rack-pinion-motor-sizing requires gravity, gear_ratio, and external_force to resolve (the registry defaults should have filled these).",
    );
  }

  // --- Inertia -------------------------------------------------------------

  const { inertiaKgM2: pinionInertiaKgM2 } = resolvePinionInertia({
    massKg: pinionMass.value,
    diameterM: pinionPitchDiameter.value,
  });
  const { loadInertiaKgM2 } = resolveLoadInertia({
    pinionInertiaKgM2,
    totalMovingMassKg: totalMovingMass.value,
    pinionPitchDiameterM: pinionPitchDiameter.value,
  });
  const { reflectedLoadInertiaKgM2 } = resolveReflectedLoadInertia({
    loadInertiaKgM2,
    gearRatio: gearRatio.value,
  });
  const { totalSystemInertiaKgM2 } = resolveTotalSystemInertia({
    motorRotorInertiaKgM2: motorRotorInertia.value,
    reflectedLoadInertiaKgM2,
  });
  const { inertiaRatio } = resolveInertiaRatio({
    reflectedLoadInertiaKgM2,
    motorRotorInertiaKgM2: motorRotorInertia.value,
  });

  // --- Drive force and load torque ------------------------------------------

  const { forceN } = resolveDriveForce({
    externalForceN: externalForce.value,
    totalMovingMassKg: totalMovingMass.value,
    gravityMps2: gravity.value,
    inclineAngleRad: inclineAngle.value,
    frictionCoefficient: frictionCoefficient.value,
  });
  const { loadTorqueNm } = resolveLoadTorque({
    forceN,
    pinionPitchDiameterM: pinionPitchDiameter.value,
    mechanicalEfficiency: mechanicalEfficiency.value,
    gearRatio: gearRatio.value,
  });

  // --- Operating speed and acceleration torque ------------------------------

  const { operatingSpeedRadPerS } = resolveOperatingSpeed({
    targetVelocityMps: targetVelocity.value,
    pinionPitchDiameterM: pinionPitchDiameter.value,
    gearRatio: gearRatio.value,
  });
  const { angularAccelerationRadPerS2 } = angularAccelerationFromSpeedRamp({
    angularVelocityChangeRadPerS: operatingSpeedRadPerS,
    rampTimeS: accelerationTime.value,
  });
  const { torqueNm: accelerationTorqueNm } = accelerationTorque({
    inertiaKgM2: totalSystemInertiaKgM2,
    angularAccelerationRadPerS2,
  });

  // --- Momentary and required torque, required power ------------------------

  const { momentaryTorqueNm } = resolveMomentaryTorque({
    accelerationTorqueNm,
    loadTorqueNm,
  });
  const { requiredTorqueNm } = resolveRequiredTorque({
    computedTorqueNm: momentaryTorqueNm,
    safetyFactor: requiredTorqueSafetyFactor.value,
  });

  const requiredTorque = makeQuantity(requiredTorqueNm, "N*m");
  const operatingSpeed = makeQuantity(operatingSpeedRadPerS, "rad/s");
  const requiredPower = rotationalPower(requiredTorque, operatingSpeed);

  const outputs: Record<string, Quantity> = {
    pinion_inertia: makeQuantity(pinionInertiaKgM2, "kg*m^2"),
    load_inertia: makeQuantity(loadInertiaKgM2, "kg*m^2"),
    reflected_load_inertia: makeQuantity(reflectedLoadInertiaKgM2, "kg*m^2"),
    total_system_inertia: makeQuantity(totalSystemInertiaKgM2, "kg*m^2"),
    inertia_ratio: makeQuantity(inertiaRatio, "ratio"),
    load_torque: makeQuantity(loadTorqueNm, "N*m"),
    acceleration_torque: makeQuantity(accelerationTorqueNm, "N*m"),
    momentary_torque: makeQuantity(momentaryTorqueNm, "N*m"),
    required_torque: requiredTorque,
    operating_speed: operatingSpeed,
    required_power: requiredPower,
  };

  return {
    outputs,
    trace: buildTrace({
      orientation,
      inclineAngle,
      gravity,
      frictionCoefficient,
      totalMovingMass,
      pinionPitchDiameter,
      pinionMass,
      gearRatio,
      mechanicalEfficiency,
      externalForce,
      targetVelocity,
      accelerationTime,
      motorRotorInertia,
      requiredTorqueSafetyFactor,
      inertiaRatioMaximum,
      pinionInertiaKgM2,
      loadInertiaKgM2,
      reflectedLoadInertiaKgM2,
      totalSystemInertiaKgM2,
      inertiaRatio,
      forceN,
      loadTorqueNm,
      operatingSpeedRadPerS,
      accelerationTorqueNm,
      momentaryTorqueNm,
      requiredTorqueNm,
      requiredPowerW: requiredPower.value,
    }),
    checks: buildChecks({
      inertiaRatio,
      inertiaRatioMaximum: inertiaRatioMaximum.value,
    }),
    warnings: [],
    assumptions: [
      {
        id: "self-contained-reproduction",
        statement:
          "This module reproduces, rather than links to, Oriental Motor Co., Ltd.'s and Andantex USA, Inc.'s own rack-and-pinion sizing methods (ADR-0011 'Reuse policy') -- it has no calculation-level dependency on any other Motor Sizing Tool or Milestone-4 discipline module, though its own force-balance formula is algebraically identical in shape to ball-screw-motor-sizing@0.1.0's own (stage-1-spec.md 'Relationship to Existing and Planned Modules').",
      },
      {
        id: "rack-treated-as-rigid",
        statement:
          "The rack itself is treated as infinitely rigid/massless -- no source found this session gives the rack its own mass or inertia term (stage-1-spec.md 'Evidence Gaps').",
      },
      {
        id: "single-accelerate-event",
        statement:
          "One accelerate-to-speed event from standstill to target_velocity, not a repeating duty cycle: no deceleration-phase or effective (RMS) torque is computed -- no source found for this mechanism computes either (stage-1-spec.md 'Purpose').",
      },
      {
        id: "no-gear-tooth-strength-check",
        statement:
          "No rack/pinion gear-tooth mechanical-strength check (root bending fatigue, Hertzian pitting fatigue) -- a hardware-selection question symmetric with ball-screw@0.1.0's own separate responsibility for the screw shaft itself, out of this module's own scope.",
      },
      {
        id: "no-catalog-matching",
        statement:
          "No candidate motor's own rated/peak torque is taken as an input in 0.1.0 (ADR-0011 'Output scope'). required_torque and required_power are reported required-spec values, not pass/fail checks -- the engineer takes them to a catalog.",
      },
    ],
    validity: [],
  };
}
