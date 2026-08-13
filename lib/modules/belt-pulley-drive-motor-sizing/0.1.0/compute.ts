// Pure, deterministic compute function for the belt-pulley-drive-motor-
// sizing module (v0.1.0, Stage 3). Reads input magnitudes in their
// canonical units, delegates the physics to the pure kernel in ./math, and
// returns a structured computation. Performs no I/O and imports only the
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
  resolveBeltInertia,
  resolveDriveForce,
  resolveInertiaRatio,
  resolveLoadInertia,
  resolveLoadTorque,
  resolveMomentaryTorque,
  resolveOperatingSpeed,
  resolvePulleyInertia,
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
  const pulleyPitchDiameter = quantityAt(values, "pulley_pitch_diameter");
  const pulleyMass = quantityAt(values, "pulley_mass");
  const idlerPulleyMass = quantityAt(values, "idler_pulley_mass");
  const beltMass = quantityAt(values, "belt_mass");
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
    pulleyPitchDiameter === undefined ||
    pulleyMass === undefined ||
    idlerPulleyMass === undefined ||
    mechanicalEfficiency === undefined ||
    targetVelocity === undefined ||
    accelerationTime === undefined ||
    motorRotorInertia === undefined ||
    requiredTorqueSafetyFactor === undefined ||
    inertiaRatioMaximum === undefined ||
    orientation === undefined
  ) {
    throw new Error(
      "belt-pulley-drive-motor-sizing requires its full set of geometry, motion, motor, and safety-factor inputs.",
    );
  }
  // gravity has a registry constant default (9.80665 m/s^2); gear_ratio
  // defaults to 1; belt_mass and external_force default to 0 -- all
  // auto-filled by the module SDK when absent, so none should reach
  // compute() as undefined. Guarded anyway as a defense-in-depth measure,
  // the same treatment every other Motor Sizing Tool module already gives
  // its own constant-default ports.
  if (
    gravity === undefined ||
    gearRatio === undefined ||
    beltMass === undefined ||
    externalForce === undefined
  ) {
    throw new Error(
      "belt-pulley-drive-motor-sizing requires gravity, gear_ratio, belt_mass, and external_force to resolve (the registry defaults should have filled these).",
    );
  }

  // --- Inertia -------------------------------------------------------------

  const { inertiaKgM2: pulleyInertiaKgM2 } = resolvePulleyInertia({
    pulleyMassKg: pulleyMass.value,
    idlerPulleyMassKg: idlerPulleyMass.value,
    pulleyPitchDiameterM: pulleyPitchDiameter.value,
  });
  const { inertiaKgM2: beltInertiaKgM2 } = resolveBeltInertia({
    beltMassKg: beltMass.value,
    pulleyPitchDiameterM: pulleyPitchDiameter.value,
  });
  const { loadInertiaKgM2 } = resolveLoadInertia({
    pulleyInertiaKgM2,
    beltInertiaKgM2,
    totalMovingMassKg: totalMovingMass.value,
    pulleyPitchDiameterM: pulleyPitchDiameter.value,
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
    pulleyPitchDiameterM: pulleyPitchDiameter.value,
    mechanicalEfficiency: mechanicalEfficiency.value,
    gearRatio: gearRatio.value,
  });

  // --- Operating speed and acceleration torque ------------------------------

  const { operatingSpeedRadPerS } = resolveOperatingSpeed({
    targetVelocityMps: targetVelocity.value,
    pulleyPitchDiameterM: pulleyPitchDiameter.value,
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
    pulley_inertia: makeQuantity(pulleyInertiaKgM2, "kg*m^2"),
    belt_inertia: makeQuantity(beltInertiaKgM2, "kg*m^2"),
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
      pulleyPitchDiameter,
      pulleyMass,
      idlerPulleyMass,
      beltMass,
      gearRatio,
      mechanicalEfficiency,
      externalForce,
      targetVelocity,
      accelerationTime,
      motorRotorInertia,
      requiredTorqueSafetyFactor,
      inertiaRatioMaximum,
      pulleyInertiaKgM2,
      beltInertiaKgM2,
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
          "This module reproduces, rather than links to, Oriental Motor Co., Ltd.'s own combined wire-belt/rack-and-pinion sizing method (ADR-0011 'Reuse policy') -- it has no calculation-level dependency on any other Motor Sizing Tool or Milestone-4 discipline module, though its own force-balance and load-torque formulas are algebraically identical in shape to rack-pinion-motor-sizing@0.1.0's own (stage-1-spec.md 'The central finding').",
      },
      {
        id: "equal-pulley-diameters",
        statement:
          "Both the drive and idler pulleys share one pitch diameter -- no source found this session gives an unequal-diameter belt-drive formula (stage-1-spec.md 'Validity Envelope').",
      },
      {
        id: "efficiency-applied-to-load-torque",
        statement:
          "Mechanical efficiency divides load_torque, following Oriental Motor's own convention and every already-released Motor Sizing Tool sibling. AutomationDirect's own source instead divides inertia by efficiency -- a real, disclosed modeling disagreement between the two primary sources, not adopted here (stage-1-spec.md 'A real disagreement between sources').",
      },
      {
        id: "single-accelerate-event",
        statement:
          "One accelerate-to-speed event from standstill to target_velocity, not a repeating duty cycle: no deceleration-phase or effective (RMS) torque is computed -- no source found for this mechanism computes either (stage-1-spec.md 'Purpose').",
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
