// Oriental Motor Co., Ltd.'s own combined "Wire Belt Mechanism, Rack and
// Pinion Mechanism" load-torque formula (jp.oriental_motor.
// general_catalog_motor_fan_sizing@f-tecref-2003-2004, p. F-3,
// `TL = F*D/(2*eta*i)`, `F = FA + m*(sin(alpha)+mu*cos(alpha))`),
// reimplemented here as a genuinely separate, single-expression
// computation -- the independent-benchmark comparison
// ./independent-benchmark.test.ts uses, the same "structurally separate
// reimplementation, proved identical" pattern
// direct-drive-conveyor-motor-sizing@0.1.0's own omron-independent-
// benchmark.ts already establishes. This module's own kernel
// (resolveDriveForce + resolveLoadTorque in ./math.ts) is a real,
// independently authored implementation of the same source, not a call
// into this file -- confirming both agree catches an implementation bug in
// either one, not a source-reading disagreement (there is only one
// primary source for this formula).
//
// Test-only: not part of the module package itself (never imported by
// manifest/compute/trace/checks/ui/report/validation or index.ts).

export interface OrientalMotorLoadTorqueInput {
  /** Total moving mass, in kg. */
  readonly totalMovingMassKg: number;
  /** Gravitational acceleration, in m/s^2. */
  readonly gravityMps2: number;
  /** Incline angle, in rad. */
  readonly inclineAngleRad: number;
  /** Coefficient of friction. */
  readonly frictionCoefficient: number;
  /** External force along the axis of travel, in N. */
  readonly externalForceN: number;
  /** Pulley pitch diameter, in m. */
  readonly pulleyPitchDiameterM: number;
  /** Mechanical efficiency, `0 < eta <= 1`. */
  readonly mechanicalEfficiency: number;
  /** Gear ratio between the drive pulley and the motor shaft. */
  readonly gearRatio: number;
}

export interface OrientalMotorLoadTorqueResult {
  readonly forceN: number;
  readonly loadTorqueNm: number;
}

/**
 * `F = FA + m*g*(sin(theta)+mu*cos(theta))`; `TL = F*D/(2*eta*i)` -- one
 * combined expression, written independently of `./math.ts`'s own
 * two-function decomposition (`resolveDriveForce` then `resolveLoadTorque`).
 */
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
