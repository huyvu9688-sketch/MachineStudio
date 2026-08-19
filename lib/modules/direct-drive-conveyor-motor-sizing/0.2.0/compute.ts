// Pure, deterministic compute function for the direct-drive-conveyor-
// motor-sizing module (v0.1.0, Stage 3). Reads input magnitudes in their
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
  resolveFrictionForce,
  resolveInertiaRatio,
  resolveLinearMassInertia,
  resolveLoadTorque,
  resolveMomentaryTorque,
  resolveOperatingSpeed,
  resolveReflectedIdlerInertia,
  resolveReflectedLoadInertia,
  resolveRequiredTorque,
  resolveRollerInertia,
  resolveTotalSystemInertia,
} from "./math";
import { buildChecks } from "./checks";
import { buildTrace } from "./trace";
import { quantityAt } from "./values";

export function compute(input: ModuleInput): ModuleComputation {
  const values = input.values;

  const driveRollerDiameter = quantityAt(values, "drive_roller_diameter");
  const driveRollerMass = quantityAt(values, "drive_roller_mass");
  const idlerRollerDiameter = quantityAt(values, "idler_roller_diameter");
  const idlerRollerMass = quantityAt(values, "idler_roller_mass");
  const beltMass = quantityAt(values, "belt_mass");
  const carriedLoadMass = quantityAt(values, "carried_load_mass");
  const beltFrictionCoefficient = quantityAt(
    values,
    "belt_friction_coefficient",
  );
  const mechanicalEfficiency = quantityAt(values, "mechanical_efficiency");
  const targetBeltSpeed = quantityAt(values, "target_belt_speed");
  const accelerationTime = quantityAt(values, "acceleration_time");
  const motorRotorInertia = quantityAt(values, "motor_rotor_inertia");
  const requiredTorqueSafetyFactor = quantityAt(
    values,
    "required_torque_safety_factor",
  );
  const inertiaRatioMaximum = quantityAt(values, "inertia_ratio_maximum");

  if (
    driveRollerDiameter === undefined ||
    driveRollerMass === undefined ||
    idlerRollerDiameter === undefined ||
    idlerRollerMass === undefined ||
    beltMass === undefined ||
    carriedLoadMass === undefined ||
    beltFrictionCoefficient === undefined ||
    mechanicalEfficiency === undefined ||
    targetBeltSpeed === undefined ||
    accelerationTime === undefined ||
    motorRotorInertia === undefined ||
    requiredTorqueSafetyFactor === undefined ||
    inertiaRatioMaximum === undefined
  ) {
    throw new Error(
      "direct-drive-conveyor-motor-sizing requires its full set of geometry, motion, motor, and safety-factor inputs.",
    );
  }

  // --- Inertia -----------------------------------------------------------

  const { inertiaKgM2: driveRollerInertiaKgM2 } = resolveRollerInertia({
    massKg: driveRollerMass.value,
    diameterM: driveRollerDiameter.value,
  });
  const { inertiaKgM2: idlerRollerInertiaOwnKgM2 } = resolveRollerInertia({
    massKg: idlerRollerMass.value,
    diameterM: idlerRollerDiameter.value,
  });
  const { reflectedIdlerInertiaKgM2 } = resolveReflectedIdlerInertia({
    idlerInertiaOwnKgM2: idlerRollerInertiaOwnKgM2,
    driveRollerDiameterM: driveRollerDiameter.value,
    idlerRollerDiameterM: idlerRollerDiameter.value,
  });
  const { inertiaKgM2: beltInertiaKgM2 } = resolveLinearMassInertia({
    massKg: beltMass.value,
    driveRollerDiameterM: driveRollerDiameter.value,
  });
  const { inertiaKgM2: loadInertiaKgM2 } = resolveLinearMassInertia({
    massKg: carriedLoadMass.value,
    driveRollerDiameterM: driveRollerDiameter.value,
  });
  const { reflectedLoadInertiaKgM2 } = resolveReflectedLoadInertia({
    reflectedIdlerInertiaKgM2,
    beltInertiaKgM2,
    loadInertiaKgM2,
  });
  const { totalSystemInertiaKgM2 } = resolveTotalSystemInertia({
    motorRotorInertiaKgM2: motorRotorInertia.value,
    driveRollerInertiaKgM2,
    reflectedLoadInertiaKgM2,
  });
  const { inertiaRatio } = resolveInertiaRatio({
    reflectedLoadInertiaKgM2,
    motorRotorInertiaKgM2: motorRotorInertia.value,
  });

  // --- Friction force and load torque -------------------------------------

  const { forceN } = resolveFrictionForce({
    beltFrictionCoefficient: beltFrictionCoefficient.value,
    beltMassKg: beltMass.value,
    carriedLoadMassKg: carriedLoadMass.value,
  });
  const { loadTorqueNm } = resolveLoadTorque({
    forceN,
    driveRollerDiameterM: driveRollerDiameter.value,
    mechanicalEfficiency: mechanicalEfficiency.value,
  });

  // --- Operating speed and acceleration torque ----------------------------

  const { operatingSpeedRadPerS } = resolveOperatingSpeed({
    targetBeltSpeedMps: targetBeltSpeed.value,
    driveRollerDiameterM: driveRollerDiameter.value,
  });
  const { angularAccelerationRadPerS2 } = angularAccelerationFromSpeedRamp({
    angularVelocityChangeRadPerS: operatingSpeedRadPerS,
    rampTimeS: accelerationTime.value,
  });
  const { torqueNm: accelerationTorqueNm } = accelerationTorque({
    inertiaKgM2: totalSystemInertiaKgM2,
    angularAccelerationRadPerS2,
  });

  // --- Momentary and required torque, required power ----------------------

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
      driveRollerDiameter,
      driveRollerMass,
      idlerRollerDiameter,
      idlerRollerMass,
      beltMass,
      carriedLoadMass,
      beltFrictionCoefficient,
      mechanicalEfficiency,
      targetBeltSpeed,
      accelerationTime,
      motorRotorInertia,
      requiredTorqueSafetyFactor,
      inertiaRatioMaximum,
      driveRollerInertiaKgM2,
      reflectedLoadInertiaKgM2,
      totalSystemInertiaKgM2,
      inertiaRatio,
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
          "This module reproduces, rather than links to, Omron Corporation's and Oriental Motor Co., Ltd.'s own conveyor sizing methods (ADR-0011 'Reuse policy') -- it has no calculation-level dependency on any Milestone-4 discipline module or on ball-screw-motor-sizing@0.1.0.",
      },
      {
        id: "horizontal-only",
        statement:
          "This module models a horizontal belt conveyor only. No source found gives an inclined-conveyor formula or worked example (stage-1-spec.md 'Purpose').",
      },
      {
        id: "direct-drive-only",
        statement:
          "No gear ratio: the motor shaft and the drive-roller shaft are the same shaft (i = 1). 0.1.0's own input schema has no gear-ratio port at all, not one fixed at a constant 1 (stage-2-contract.md 'Decisions' item 5).",
      },
      {
        id: "single-accelerate-event",
        statement:
          "One accelerate-to-speed event from standstill to target_belt_speed, not a repeating duty cycle: no deceleration-phase or effective (RMS) torque is computed (stage-2-contract.md 'Decisions' item 3) -- neither of this module's own two reference examples frames a conveyor's own required motor sizing as a repeating cycle.",
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
