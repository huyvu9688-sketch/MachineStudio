// Two independent-benchmark reimplementations for
// belt-pulley-drive-motor-sizing 0.2.0. Test-only: not part of the module
// package itself.
//
// 1. resolveOrientalMotorLoadTorque -- carried over unchanged from 0.1.0:
//    Oriental Motor's own combined "Wire Belt Mechanism, Rack and Pinion
//    Mechanism" load-torque formula, reimplemented as a single expression.
//
// 2. resolvePhaseRmsTorque -- NEW in 0.2.0: Oriental Motor's own effective
//    (RMS) torque formula (jp.oriental_motor.motor_sizing_calculations,
//    p. 6), reimplemented as a direct per-phase computation over an
//    explicit four-phase list [accel, run, decel, dwell] with dwell
//    torque fixed at zero, rather than the closed-form expression
//    ./math.ts's own resolveEffectiveTorque uses -- the same
//    "structurally separate reimplementation, proved identical" pattern
//    drive-train@0.1.0's own closed-cycle-benchmark.ts already
//    establishes for its own RMS-torque formula.

export interface OrientalMotorLoadTorqueInput {
  readonly totalMovingMassKg: number;
  readonly gravityMps2: number;
  readonly inclineAngleRad: number;
  readonly frictionCoefficient: number;
  readonly externalForceN: number;
  readonly pulleyPitchDiameterM: number;
  readonly mechanicalEfficiency: number;
  readonly gearRatio: number;
}

export interface OrientalMotorLoadTorqueResult {
  readonly forceN: number;
  readonly loadTorqueNm: number;
}

/** `F = FA + m*g*(sin(theta)+mu*cos(theta))`; `TL = F*D/(2*eta*i)`. */
export function resolveOrientalMotorLoadTorque(
  input: OrientalMotorLoadTorqueInput,
): OrientalMotorLoadTorqueResult {
  const forceN =
    input.externalForceN +
    input.totalMovingMassKg *
      input.gravityMps2 *
      (Math.sin(input.inclineAngleRad) +
        input.frictionCoefficient * Math.cos(input.inclineAngleRad));

  const loadTorqueNm =
    (forceN * input.pulleyPitchDiameterM) /
    (2 * input.mechanicalEfficiency * input.gearRatio);

  return { forceN, loadTorqueNm };
}

export interface RmsTorquePhase {
  /** Constant torque during this phase, in N*m. Signed -- the formula squares it. */
  readonly torqueNm: number;
  /** Duration of this phase, in s. Must be > 0. */
  readonly durationS: number;
}

/**
 * `Trms = sqrt(sum(T_i^2*t_i) / sum(t_i))` -- the general per-phase
 * effective-torque shape, applied directly to an explicit phase list
 * rather than derived from `resolveEffectiveTorque`'s own closed-form
 * three-term expression. Never calls, and does not depend on, `./math.ts`.
 */
export function resolvePhaseRmsTorque(
  phases: readonly RmsTorquePhase[],
): number {
  const totalDurationS = phases.reduce(
    (sum, phase) => sum + phase.durationS,
    0,
  );
  const weightedSquareSum = phases.reduce(
    (sum, phase) => sum + phase.torqueNm ** 2 * phase.durationS,
    0,
  );
  return Math.sqrt(weightedSquareSum / totalDurationS);
}
