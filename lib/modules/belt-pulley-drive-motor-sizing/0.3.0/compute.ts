// Pure, deterministic compute function for belt-pulley-drive-motor-sizing
// 0.2.0. Branches on motion_mode to resolve the repeating trapezoidal
// motion cycle (velocity-first or distance-first), then computes
// everything 0.1.0 already computes plus deceleration_torque and
// effective_torque -- see
// docs/superpowers/specs/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0-design.md.

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
  resolveEffectiveTorque,
  resolveInertiaRatio,
  resolveLoadInertia,
  resolveLoadTorque,
  resolveMomentaryTorque,
  resolveMotionFromDistance,
  resolveMotionFromVelocity,
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
  const frictionCoefficient = quantityAt(values, "friction_coefficient");
  const totalMovingMass = quantityAt(values, "total_moving_mass");
  const pulleyPitchDiameter = quantityAt(values, "pulley_pitch_diameter");
  const pulleyMass = quantityAt(values, "pulley_mass");
  const idlerPulleyMass = quantityAt(values, "idler_pulley_mass");
  const beltMass = quantityAt(values, "belt_mass");
  const gearRatio = quantityAt(values, "gear_ratio");
  const mechanicalEfficiency = quantityAt(values, "mechanical_efficiency");
  const externalForce = quantityAt(values, "external_force");
  const orientation = enumAt(values, "orientation");
  const motionMode = enumAt(values, "motion_mode");
  const accelerationTime = quantityAt(values, "acceleration_time");
  const decelerationTime = quantityAt(values, "deceleration_time");
  const dwellTime = quantityAt(values, "dwell_time");
  const motorRotorInertia = quantityAt(values, "motor_rotor_inertia");
  const requiredTorqueSafetyFactor = quantityAt(
    values,
    "required_torque_safety_factor",
  );
  const inertiaRatioMaximum = quantityAt(values, "inertia_ratio_maximum");

  if (
    inclineAngle === undefined ||
    frictionCoefficient === undefined ||
    totalMovingMass === undefined ||
    pulleyPitchDiameter === undefined ||
    pulleyMass === undefined ||
    idlerPulleyMass === undefined ||
    mechanicalEfficiency === undefined ||
    orientation === undefined ||
    motionMode === undefined ||
    accelerationTime === undefined ||
    decelerationTime === undefined ||
    motorRotorInertia === undefined ||
    requiredTorqueSafetyFactor === undefined ||
    inertiaRatioMaximum === undefined
  ) {
    throw new Error(
      "belt-pulley-drive-motor-sizing requires its full set of geometry, motion, motor, and safety-factor inputs.",
    );
  }
  // gear_ratio/belt_mass/external_force/dwell_time all have registry
  // constant defaults -- auto-filled by the module SDK when absent, so none
  // should reach compute() as undefined. Guarded anyway as a
  // defense-in-depth measure, the same treatment 0.1.0 already gives its
  // own constant-default ports. gravity is no longer an input in 0.3.0
  // (math.ts hardcodes STANDARD_GRAVITY_M_PER_S2) -- nothing to guard here
  // anymore.
  if (
    gearRatio === undefined ||
    beltMass === undefined ||
    externalForce === undefined ||
    dwellTime === undefined
  ) {
    throw new Error(
      "belt-pulley-drive-motor-sizing requires gear_ratio, belt_mass, external_force, and dwell_time to resolve (the registry defaults should have filled these).",
    );
  }

  // --- Motion profile (NEW in 0.2.0): velocity-first or distance-first ----

  let targetVelocityMps: number;
  let travelDistanceM: number;
  let constantVelocityTimeS: number;
  let cycleTimeS: number;

  if (motionMode.value === "velocity") {
    const targetVelocity = quantityAt(values, "target_velocity");
    const constantVelocityTime = quantityAt(values, "constant_velocity_time");
    if (targetVelocity === undefined || constantVelocityTime === undefined) {
      throw new Error(
        'belt-pulley-drive-motor-sizing requires target_velocity and constant_velocity_time when motion_mode is "velocity".',
      );
    }
    const derived = resolveMotionFromVelocity({
      targetVelocityMps: targetVelocity.value,
      accelerationTimeS: accelerationTime.value,
      decelerationTimeS: decelerationTime.value,
      constantVelocityTimeS: constantVelocityTime.value,
      dwellTimeS: dwellTime.value,
    });
    targetVelocityMps = targetVelocity.value;
    constantVelocityTimeS = constantVelocityTime.value;
    travelDistanceM = derived.travelDistanceM;
    cycleTimeS = derived.cycleTimeS;
  } else {
    const travelDistance = quantityAt(values, "travel_distance");
    const cycleTime = quantityAt(values, "cycle_time");
    if (travelDistance === undefined || cycleTime === undefined) {
      throw new Error(
        'belt-pulley-drive-motor-sizing requires travel_distance and cycle_time when motion_mode is "distance".',
      );
    }
    const derived = resolveMotionFromDistance({
      travelDistanceM: travelDistance.value,
      accelerationTimeS: accelerationTime.value,
      decelerationTimeS: decelerationTime.value,
      cycleTimeS: cycleTime.value,
      dwellTimeS: dwellTime.value,
    });
    targetVelocityMps = derived.targetVelocityMps;
    constantVelocityTimeS = derived.constantVelocityTimeS;
    travelDistanceM = travelDistance.value;
    cycleTimeS = cycleTime.value;
  }

  // --- Inertia (unchanged from 0.1.0) --------------------------------------

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

  // --- Drive force and load torque (unchanged from 0.1.0) -------------------

  const { forceN } = resolveDriveForce({
    externalForceN: externalForce.value,
    totalMovingMassKg: totalMovingMass.value,
    inclineAngleRad: inclineAngle.value,
    frictionCoefficient: frictionCoefficient.value,
  });
  const { loadTorqueNm } = resolveLoadTorque({
    forceN,
    pulleyPitchDiameterM: pulleyPitchDiameter.value,
    mechanicalEfficiency: mechanicalEfficiency.value,
    gearRatio: gearRatio.value,
  });

  // --- Operating speed, acceleration torque, deceleration torque -----------

  const { operatingSpeedRadPerS } = resolveOperatingSpeed({
    targetVelocityMps,
    pulleyPitchDiameterM: pulleyPitchDiameter.value,
    gearRatio: gearRatio.value,
  });
  const { angularAccelerationRadPerS2: accelRadPerS2 } =
    angularAccelerationFromSpeedRamp({
      angularVelocityChangeRadPerS: operatingSpeedRadPerS,
      rampTimeS: accelerationTime.value,
    });
  const { torqueNm: accelerationTorqueNm } = accelerationTorque({
    inertiaKgM2: totalSystemInertiaKgM2,
    angularAccelerationRadPerS2: accelRadPerS2,
  });
  // Deceleration torque (NEW in 0.2.0): the same alpha=omega/t, T=J*alpha
  // shape as acceleration_torque, over deceleration_time instead of
  // acceleration_time -- symmetric magnitude, not a signed value.
  const { angularAccelerationRadPerS2: decelRadPerS2 } =
    angularAccelerationFromSpeedRamp({
      angularVelocityChangeRadPerS: operatingSpeedRadPerS,
      rampTimeS: decelerationTime.value,
    });
  const { torqueNm: decelerationTorqueNm } = accelerationTorque({
    inertiaKgM2: totalSystemInertiaKgM2,
    angularAccelerationRadPerS2: decelRadPerS2,
  });

  // --- Momentary and required torque (unchanged from 0.1.0) -----------------

  const { momentaryTorqueNm } = resolveMomentaryTorque({
    accelerationTorqueNm,
    loadTorqueNm,
  });
  const { requiredTorqueNm } = resolveRequiredTorque({
    computedTorqueNm: momentaryTorqueNm,
    safetyFactor: requiredTorqueSafetyFactor.value,
  });

  // --- Effective (RMS) torque (NEW in 0.2.0) ---------------------------------

  const { effectiveTorqueNm } = resolveEffectiveTorque({
    accelerationTorqueNm,
    loadTorqueNm,
    decelerationTorqueNm,
    accelerationTimeS: accelerationTime.value,
    constantVelocityTimeS: constantVelocityTimeS,
    decelerationTimeS: decelerationTime.value,
    cycleTimeS: cycleTimeS,
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
    target_velocity: makeQuantity(targetVelocityMps, "m/s"),
    travel_distance: makeQuantity(travelDistanceM, "m"),
    constant_velocity_time: makeQuantity(constantVelocityTimeS, "s"),
    cycle_time: makeQuantity(cycleTimeS, "s"),
    deceleration_torque: makeQuantity(decelerationTorqueNm, "N*m"),
    effective_torque: makeQuantity(effectiveTorqueNm, "N*m"),
  };

  return {
    outputs,
    trace: buildTrace({
      orientation,
      inclineAngle,
      frictionCoefficient,
      totalMovingMass,
      pulleyPitchDiameter,
      pulleyMass,
      idlerPulleyMass,
      beltMass,
      gearRatio,
      mechanicalEfficiency,
      externalForce,
      motionMode,
      accelerationTime,
      decelerationTime,
      dwellTime,
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
      targetVelocityMps,
      travelDistanceM,
      constantVelocityTimeS,
      cycleTimeS,
      operatingSpeedRadPerS,
      accelerationTorqueNm,
      decelerationTorqueNm,
      effectiveTorqueNm,
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
          "This module reproduces, rather than links to, Oriental Motor Co., Ltd.'s own formulas (ADR-0011 'Reuse policy') -- it has no calculation-level dependency on any other module, and duplicates rather than imports 0.1.0's own unchanged kernel functions (stage-2-contract.md '0.2.0 Addendum' cross-version reuse policy).",
      },
      {
        id: "equal-pulley-diameters",
        statement:
          "Both the drive and idler pulleys share one pitch diameter -- no source found gives an unequal-diameter belt-drive formula.",
      },
      {
        id: "efficiency-applied-to-load-torque",
        statement:
          "Mechanical efficiency divides load_torque, following Oriental Motor's own convention and every already-released Motor Sizing Tool sibling.",
      },
      {
        id: "repeating-trapezoidal-cycle-constant-load",
        statement:
          "A repeating accelerate/run/decelerate/dwell cycle with load_torque assumed constant across all four phases -- orientation, mass, and friction do not change mid-cycle in this module's own force-balance model, so this is genuinely true for this mechanism's own physics, not an approximation across a module boundary the way drive-train@0.1.0's own closed-cycle RMS-acceleration approximation is (docs/superpowers/specs/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0-design.md 'Motion Profile Model').",
      },
      {
        id: "effective-torque-no-check",
        statement:
          "effective_torque is a reported value, not a pass/fail check in 0.2.0 -- no source found gives a universal continuous-torque acceptance criterion for this mechanism family.",
      },
      {
        id: "no-catalog-matching",
        statement:
          "No candidate motor's own rated/peak torque is taken as an input (ADR-0011 'Output scope'). required_torque, effective_torque, and required_power are reported required-spec values, not pass/fail checks -- the engineer takes them to a catalog.",
      },
    ],
    validity: [],
  };
}
