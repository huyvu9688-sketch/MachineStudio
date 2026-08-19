// Pure, deterministic compute function for the ball-screw-motor-sizing
// module (v0.1.0 draft, Stage 3). Reads input magnitudes in their
// canonical units, delegates the physics to the pure kernel in ./math, and
// returns a structured computation. Performs no I/O and imports only the
// engine's public surface and this module's own files.

import {
  accelerationTorque,
  makeQuantity,
  rotationalPower,
  type ModuleComputation,
  type ModuleInput,
  type Quantity,
} from "@/lib/engine";
import {
  resolveAngularAcceleration,
  resolveDriveForce,
  resolveEffectiveTorque,
  resolveInertiaRatio,
  resolveLoadInertia,
  resolveLoadTorque,
  resolveMomentaryTorque,
  resolveMotorShaftSpeed,
  resolvePhaseTorque,
  resolveReflectedLoadInertia,
  resolveRequiredTorque,
  resolveScrewInertia,
  resolveTotalSystemInertia,
  resolveTrapezoidalMove,
  type CyclePhase,
} from "./math";
import { buildChecks } from "./checks";
import { buildTrace } from "./trace";
import { enumAt, quantityAt } from "./values";

export function compute(input: ModuleInput): ModuleComputation {
  const values = input.values;

  const inclineAngle = quantityAt(values, "incline_angle");
  const frictionCoefficient = quantityAt(values, "friction_coefficient");
  const totalMovingMass = quantityAt(values, "total_moving_mass");
  const lead = quantityAt(values, "lead");
  const gearRatio = quantityAt(values, "gear_ratio");
  const preload = quantityAt(values, "preload");
  const internalFrictionCoefficient = quantityAt(
    values,
    "internal_friction_coefficient",
  );
  const mechanicalEfficiency = quantityAt(values, "mechanical_efficiency");
  const screwDiameter = quantityAt(values, "screw_diameter");
  const screwMass = quantityAt(values, "screw_mass");
  const externalForce = quantityAt(values, "external_force");
  const forwardMoveDistance = quantityAt(values, "forward_move_distance");
  const forwardMaxVelocity = quantityAt(values, "forward_max_velocity");
  const forwardMaxAcceleration = quantityAt(values, "forward_max_acceleration");
  const returnMoveDistance = quantityAt(values, "return_move_distance");
  const returnMaxVelocity = quantityAt(values, "return_max_velocity");
  const returnMaxAcceleration = quantityAt(values, "return_max_acceleration");
  const dwellTime = quantityAt(values, "dwell_time");
  const motorRotorInertia = quantityAt(values, "motor_rotor_inertia");
  const effectiveTorqueSafetyFactor = quantityAt(
    values,
    "effective_torque_safety_factor",
  );
  const momentaryTorqueSafetyFactor = quantityAt(
    values,
    "momentary_torque_safety_factor",
  );
  const inertiaRatioMaximum = quantityAt(values, "inertia_ratio_maximum");
  const orientation = enumAt(values, "orientation");

  if (
    inclineAngle === undefined ||
    frictionCoefficient === undefined ||
    totalMovingMass === undefined ||
    lead === undefined ||
    gearRatio === undefined ||
    preload === undefined ||
    internalFrictionCoefficient === undefined ||
    mechanicalEfficiency === undefined ||
    screwDiameter === undefined ||
    screwMass === undefined ||
    forwardMoveDistance === undefined ||
    forwardMaxVelocity === undefined ||
    forwardMaxAcceleration === undefined ||
    dwellTime === undefined ||
    motorRotorInertia === undefined ||
    effectiveTorqueSafetyFactor === undefined ||
    momentaryTorqueSafetyFactor === undefined ||
    inertiaRatioMaximum === undefined ||
    orientation === undefined
  ) {
    throw new Error(
      "ball-screw-motor-sizing requires its full set of geometry, motion, motor, and safety-factor inputs.",
    );
  }
  // external_force defaults to 0 N — auto-filled by the module SDK when
  // absent, so it should never reach compute() as undefined. Guarded
  // anyway as a defense-in-depth measure, the same treatment
  // gearboxEfficiency gets in drive-train@0.1.0's own compute.ts. gravity
  // is no longer an input in 0.2.0 (math.ts hardcodes
  // STANDARD_GRAVITY_M_PER_S2) — nothing to guard here anymore.
  if (externalForce === undefined) {
    throw new Error(
      "ball-screw-motor-sizing requires external_force to resolve (registry default should have filled this).",
    );
  }

  const hasReturn = returnMoveDistance !== undefined;
  if (
    hasReturn &&
    (returnMaxVelocity === undefined || returnMaxAcceleration === undefined)
  ) {
    // ./input-schema.ts already rejects a partial return-move declaration
    // before compute() is ever called; this is a defense-in-depth guard.
    throw new Error(
      "ball-screw-motor-sizing requires return_max_velocity and return_max_acceleration together with return_move_distance.",
    );
  }

  // --- Inertia ---------------------------------------------------------------

  const { screwInertiaKgM2 } = resolveScrewInertia({
    screwDiameterM: screwDiameter.value,
    screwMassKg: screwMass.value,
  });
  const { loadInertiaKgM2 } = resolveLoadInertia({
    screwInertiaKgM2,
    totalMovingMassKg: totalMovingMass.value,
    leadM: lead.value,
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

  // --- Drive force and load torque, both directions --------------------------
  // return_load_torque is always computed (pure statics, no move needed) --
  // see math.ts resolveDriveForce's own doc comment and
  // stage-2-contract.md "Decisions" item 3.

  const { forceN: forwardForceN } = resolveDriveForce({
    externalForceN: externalForce.value,
    totalMovingMassKg: totalMovingMass.value,
    inclineAngleRad: inclineAngle.value,
    frictionCoefficient: frictionCoefficient.value,
    direction: "forward",
  });
  const { loadTorqueNm: forwardLoadTorqueNm } = resolveLoadTorque({
    forceN: forwardForceN,
    leadM: lead.value,
    efficiency: mechanicalEfficiency.value,
    preloadN: preload.value,
    internalFrictionCoefficient: internalFrictionCoefficient.value,
    gearRatio: gearRatio.value,
  });

  const { forceN: returnForceN } = resolveDriveForce({
    externalForceN: externalForce.value,
    totalMovingMassKg: totalMovingMass.value,
    inclineAngleRad: inclineAngle.value,
    frictionCoefficient: frictionCoefficient.value,
    direction: "return",
  });
  const { loadTorqueNm: returnLoadTorqueNm } = resolveLoadTorque({
    forceN: returnForceN,
    leadM: lead.value,
    efficiency: mechanicalEfficiency.value,
    preloadN: preload.value,
    internalFrictionCoefficient: internalFrictionCoefficient.value,
    gearRatio: gearRatio.value,
  });

  // --- Motion, both directions -------------------------------------------------

  const forwardMove = resolveTrapezoidalMove({
    moveDistanceM: forwardMoveDistance.value,
    maxVelocityMps: forwardMaxVelocity.value,
    maxAccelerationMps2: forwardMaxAcceleration.value,
  });
  const { angularAccelerationRadPerS2: forwardAlpha } =
    resolveAngularAcceleration({
      linearAccelerationMps2: forwardMaxAcceleration.value,
      leadM: lead.value,
      gearRatio: gearRatio.value,
    });
  const { torqueNm: forwardAccelerationTorqueNm } = accelerationTorque({
    inertiaKgM2: totalSystemInertiaKgM2,
    angularAccelerationRadPerS2: forwardAlpha,
  });

  const returnMove = hasReturn
    ? resolveTrapezoidalMove({
        moveDistanceM: returnMoveDistance.value,
        maxVelocityMps: returnMaxVelocity!.value,
        maxAccelerationMps2: returnMaxAcceleration!.value,
      })
    : undefined;
  // No return move commanded this cycle: zero return-direction acceleration
  // torque is a structural fact (nothing accelerates in that direction),
  // not a guessed physical value — the same category as screw.gear_ratio = 1.
  const returnAccelerationTorqueNm = returnMove
    ? accelerationTorque({
        inertiaKgM2: totalSystemInertiaKgM2,
        angularAccelerationRadPerS2: resolveAngularAcceleration({
          linearAccelerationMps2: returnMaxAcceleration!.value,
          leadM: lead.value,
          gearRatio: gearRatio.value,
        }).angularAccelerationRadPerS2,
      }).torqueNm
    : 0;

  // --- Per-phase torque, momentary torque, effective torque ------------------

  const forwardAccelPhase = resolvePhaseTorque({
    loadTorqueNm: forwardLoadTorqueNm,
    accelerationTorqueNm: forwardAccelerationTorqueNm,
    phase: "accel",
  });
  const forwardConstPhase = resolvePhaseTorque({
    loadTorqueNm: forwardLoadTorqueNm,
    accelerationTorqueNm: forwardAccelerationTorqueNm,
    phase: "constant",
  });
  const forwardDecelPhase = resolvePhaseTorque({
    loadTorqueNm: forwardLoadTorqueNm,
    accelerationTorqueNm: forwardAccelerationTorqueNm,
    phase: "decel",
  });

  const phases: CyclePhase[] = [
    {
      durationS: forwardMove.accelerationTimeS,
      torqueNm: forwardAccelPhase.torqueNm,
    },
    {
      durationS: forwardMove.constantVelocityTimeS,
      torqueNm: forwardConstPhase.torqueNm,
    },
    {
      durationS: forwardMove.decelerationTimeS,
      torqueNm: forwardDecelPhase.torqueNm,
    },
    { durationS: dwellTime.value, torqueNm: 0 },
  ];

  if (returnMove) {
    const returnAccelPhase = resolvePhaseTorque({
      loadTorqueNm: returnLoadTorqueNm,
      accelerationTorqueNm: returnAccelerationTorqueNm,
      phase: "accel",
    });
    const returnConstPhase = resolvePhaseTorque({
      loadTorqueNm: returnLoadTorqueNm,
      accelerationTorqueNm: returnAccelerationTorqueNm,
      phase: "constant",
    });
    const returnDecelPhase = resolvePhaseTorque({
      loadTorqueNm: returnLoadTorqueNm,
      accelerationTorqueNm: returnAccelerationTorqueNm,
      phase: "decel",
    });
    phases.push(
      {
        durationS: returnMove.accelerationTimeS,
        torqueNm: returnAccelPhase.torqueNm,
      },
      {
        durationS: returnMove.constantVelocityTimeS,
        torqueNm: returnConstPhase.torqueNm,
      },
      {
        durationS: returnMove.decelerationTimeS,
        torqueNm: returnDecelPhase.torqueNm,
      },
    );
  }

  const { momentaryTorqueNm } = resolveMomentaryTorque(phases);
  const { effectiveTorqueNm } = resolveEffectiveTorque(phases);

  // --- Operating speed, required torque, required power ----------------------

  const { rotationalSpeedRadPerS: forwardSpeedRadPerS } =
    resolveMotorShaftSpeed({
      linearVelocityMps: forwardMove.peakVelocityMps,
      leadM: lead.value,
      gearRatio: gearRatio.value,
    });
  const returnSpeedRadPerS = returnMove
    ? resolveMotorShaftSpeed({
        linearVelocityMps: returnMove.peakVelocityMps,
        leadM: lead.value,
        gearRatio: gearRatio.value,
      }).rotationalSpeedRadPerS
    : 0;
  const operatingSpeedRadPerS = Math.max(
    forwardSpeedRadPerS,
    returnSpeedRadPerS,
  );

  const { requiredTorqueNm: requiredMotorRatedTorqueNm } =
    resolveRequiredTorque({
      computedTorqueNm: effectiveTorqueNm,
      safetyFactor: effectiveTorqueSafetyFactor.value,
    });
  const { requiredTorqueNm: requiredMotorPeakTorqueNm } = resolveRequiredTorque(
    {
      computedTorqueNm: momentaryTorqueNm,
      safetyFactor: momentaryTorqueSafetyFactor.value,
    },
  );

  const requiredMotorRatedTorque = makeQuantity(
    requiredMotorRatedTorqueNm,
    "N*m",
  );
  const operatingSpeed = makeQuantity(operatingSpeedRadPerS, "rad/s");
  const requiredPower = rotationalPower(
    requiredMotorRatedTorque,
    operatingSpeed,
  );

  const outputs: Record<string, Quantity> = {
    screw_inertia: makeQuantity(screwInertiaKgM2, "kg*m^2"),
    load_inertia: makeQuantity(loadInertiaKgM2, "kg*m^2"),
    reflected_load_inertia: makeQuantity(reflectedLoadInertiaKgM2, "kg*m^2"),
    total_system_inertia: makeQuantity(totalSystemInertiaKgM2, "kg*m^2"),
    inertia_ratio: makeQuantity(inertiaRatio, "ratio"),
    forward_load_torque: makeQuantity(forwardLoadTorqueNm, "N*m"),
    return_load_torque: makeQuantity(returnLoadTorqueNm, "N*m"),
    forward_acceleration_torque: makeQuantity(
      forwardAccelerationTorqueNm,
      "N*m",
    ),
    return_acceleration_torque: makeQuantity(returnAccelerationTorqueNm, "N*m"),
    momentary_torque: makeQuantity(momentaryTorqueNm, "N*m"),
    effective_torque: makeQuantity(effectiveTorqueNm, "N*m"),
    operating_speed: operatingSpeed,
    required_motor_rated_torque: requiredMotorRatedTorque,
    required_motor_peak_torque: makeQuantity(requiredMotorPeakTorqueNm, "N*m"),
    required_power: requiredPower,
  };

  return {
    outputs,
    trace: buildTrace({
      orientation,
      inclineAngle,
      frictionCoefficient,
      totalMovingMass,
      lead,
      gearRatio,
      preload,
      internalFrictionCoefficient,
      mechanicalEfficiency,
      screwDiameter,
      screwMass,
      externalForce,
      forwardMoveDistance,
      forwardMaxVelocity,
      forwardMaxAcceleration,
      returnMoveDistance,
      returnMaxVelocity,
      returnMaxAcceleration,
      dwellTime,
      motorRotorInertia,
      effectiveTorqueSafetyFactor,
      momentaryTorqueSafetyFactor,
      inertiaRatioMaximum,
      screwInertiaKgM2,
      loadInertiaKgM2,
      reflectedLoadInertiaKgM2,
      totalSystemInertiaKgM2,
      inertiaRatio,
      forwardLoadTorqueNm,
      returnLoadTorqueNm,
      forwardAccelerationTorqueNm,
      returnAccelerationTorqueNm,
      momentaryTorqueNm,
      effectiveTorqueNm,
      operatingSpeedRadPerS,
      requiredMotorRatedTorqueNm,
      requiredMotorPeakTorqueNm,
      hasReturn,
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
          "This module reproduces, rather than links to, the physics already released in axis-load-cases, ball-screw, motion-profile, and drive-train (ADR-0011 'Reuse policy') — it does not consume any of their outputs.",
      },
      {
        id: "direction-convention",
        statement:
          "'Forward' is the direction that moves away from gravity (upward on a vertical/inclined axis); 'return' is gravity-assisted (downward). Immaterial on a horizontal axis.",
      },
      {
        id: "return-load-torque-always-computed",
        statement: hasReturn
          ? "A return move is declared; return-direction phases contribute to momentary_torque and effective_torque."
          : "No return move is declared: return_load_torque is still reported (pure statics, no move needed), but return_acceleration_torque is 0 and no return-direction phase contributes to momentary_torque or effective_torque.",
      },
      {
        id: "dwell-holding-torque-not-modeled",
        statement:
          "The dwell phase contributes 0 torque to the RMS/momentary aggregates, matching Omron's own treatment of a stationary phase. A servo-motor holding-torque formula for a stationary vertical/inclined dwell is not modeled in 0.1.0 — the same 'reported catalog value, no formula' scope drive-train@0.1.0 already uses for holding-brake torque (stage-1-spec.md item 9 there).",
      },
      {
        id: "no-catalog-matching",
        statement:
          "No candidate motor's own rated/peak torque is taken as an input in 0.1.0 (ADR-0011 'Output scope'). required_motor_rated_torque, required_motor_peak_torque, and required_power are reported required-spec values, not pass/fail checks — the engineer takes them to a catalog.",
      },
    ],
    validity: [],
  };
}
