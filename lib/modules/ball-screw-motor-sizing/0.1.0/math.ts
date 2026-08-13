/**
 * Pure SI-number kernel for the in-progress ball-screw-motor-sizing module
 * (Unit 6.2, Stage 3 draft). Resolves: screw/load/system inertia and
 * inertia ratio, per-direction drive force and load torque, per-phase
 * acceleration torque, motor-shaft operating speed, maximum momentary
 * torque, effective (RMS) torque over the full cycle, and required
 * torque with an engineer-supplied safety factor — see
 * context/modules/ball-screw-motor-sizing/stage-1-spec.md and
 * stage-2-contract.md.
 *
 * Self-contained per ADR-0011 "Reuse policy": every formula below is
 * reproduced, not imported, from physics already released in
 * `axis-load-cases@0.1.0`, `ball-screw@0.1.0`, `motion-profile@0.1.0`, and
 * `drive-train@0.1.0` — except moment of inertia and `Ta = J*alpha`, which
 * are genuinely imported from `lib/engine/mechanics` (Unit 6.1), the one
 * shared, source-independent physics package this family depends on
 * directly.
 *
 * Formula source: Oriental Motor Co., Ltd., *Motor Sizing Calculations*
 * (`jp.oriental_motor.motor_sizing_calculations@web-2026-08-08`, cached at
 * `reference/source-material/Oriental_Motor Sizing Calculators.pdf`,
 * pp. 4-6), cross-checked against Omron Corporation's own worked example
 * (`jp.omron.servo_motor_selection_guide@csm-tg-e-3-1`, `reference/
 * source-material/Servo Selection.pdf`, pp. 12-13) — see
 * `stage-1-spec.md` "Reference Examples" and `math.test.ts`.
 *
 * Values become EngineeringValues only at the module-package boundary; bare
 * numbers remain internal here, mirroring every other module's own math.ts.
 */

import {
  accelerationTorque,
  linearMotionInertia,
  solidCylinderInertia,
} from "@/lib/engine";

export class BallScrewMotorSizingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BallScrewMotorSizingInputError";
  }
}

function fail(message: string): never {
  throw new BallScrewMotorSizingInputError(message);
}

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) fail(`${name} must be finite.`);
}

function assertPositive(name: string, value: number): void {
  assertFinite(name, value);
  if (value <= 0) fail(`${name} must be positive.`);
}

function assertNonNegative(name: string, value: number): void {
  assertFinite(name, value);
  if (value < 0) fail(`${name} must not be negative.`);
}

// --- 1. Inertia ---------------------------------------------------------------

export interface ScrewInertiaInput {
  /** Nominal (outer) diameter of the ball-screw shaft, in m. Must be > 0. */
  readonly screwDiameterM: number;
  /** Mass of the ball-screw shaft, in kg. Must be > 0. */
  readonly screwMassKg: number;
}

export interface ScrewInertiaResult {
  readonly screwInertiaKgM2: number;
}

/**
 * The ball-screw shaft's own rotating inertia: `J_B = (1/8)*M_B*D^2`
 * (`lib/engine/mechanics`' `solidCylinderInertia`) — Oriental Motor's own
 * `JB = MB*D^2/8` (Servo Selection.pdf p. 12, "Calculation of Motor Shaft
 * Conversion Load Inertia").
 */
export function resolveScrewInertia(
  input: ScrewInertiaInput,
): ScrewInertiaResult {
  assertPositive("screwDiameterM", input.screwDiameterM);
  assertPositive("screwMassKg", input.screwMassKg);

  return {
    screwInertiaKgM2: solidCylinderInertia({
      massKg: input.screwMassKg,
      outerDiameterM: input.screwDiameterM,
    }).inertiaKgM2,
  };
}

export interface LoadInertiaInput {
  /** The ball-screw shaft's own rotating inertia, in kg*m^2. Must be >= 0. */
  readonly screwInertiaKgM2: number;
  /** Total moving mass (table and payload), in kg. Must be > 0. */
  readonly totalMovingMassKg: number;
  /** Ball-screw lead, in m. Must be > 0. */
  readonly leadM: number;
}

export interface LoadInertiaResult {
  readonly loadInertiaKgM2: number;
}

/**
 * `J_W = J_B + m*(P/(2*pi))^2` — the screw's own inertia plus the
 * table-and-load's own linear-motion-equivalent inertia
 * (`lib/engine/mechanics`' `linearMotionInertia`), reflected to the screw
 * shaft. Matches Oriental Motor's own `JW = M*(P/2pi)^2*10^-6 + JB`
 * exactly (Servo Selection.pdf p. 12) — confirmed by hand against the
 * printed worked example in `stage-1-spec.md` "Reference Examples" item 1
 * before this function was written: `JB=1.5e-4`, `JW=1.63e-4 kg*m^2`.
 */
export function resolveLoadInertia(input: LoadInertiaInput): LoadInertiaResult {
  assertNonNegative("screwInertiaKgM2", input.screwInertiaKgM2);
  assertPositive("totalMovingMassKg", input.totalMovingMassKg);
  assertPositive("leadM", input.leadM);

  const linearMotionTermKgM2 = linearMotionInertia({
    massKg: input.totalMovingMassKg,
    travelPerRevolutionM: input.leadM,
  }).inertiaKgM2;

  return {
    loadInertiaKgM2: input.screwInertiaKgM2 + linearMotionTermKgM2,
  };
}

export interface ReflectedLoadInertiaInput {
  /** Load inertia at the screw shaft, in kg*m^2. Must be >= 0. */
  readonly loadInertiaKgM2: number;
  /** Screw-to-motor gear ratio. Must be > 0. */
  readonly gearRatio: number;
}

export interface ReflectedLoadInertiaResult {
  readonly reflectedLoadInertiaKgM2: number;
}

/** `J_L = J_W / i^2` — reflected inertia divides by the gear ratio squared. */
export function resolveReflectedLoadInertia(
  input: ReflectedLoadInertiaInput,
): ReflectedLoadInertiaResult {
  assertNonNegative("loadInertiaKgM2", input.loadInertiaKgM2);
  assertPositive("gearRatio", input.gearRatio);

  return {
    reflectedLoadInertiaKgM2: input.loadInertiaKgM2 / input.gearRatio ** 2,
  };
}

export interface TotalSystemInertiaInput {
  /** Motor rotor moment of inertia, in kg*m^2. Must be > 0. */
  readonly motorRotorInertiaKgM2: number;
  /** Load inertia already reflected to the motor shaft, in kg*m^2. Must be >= 0. */
  readonly reflectedLoadInertiaKgM2: number;
}

export interface TotalSystemInertiaResult {
  readonly totalSystemInertiaKgM2: number;
}

/** `J_total = J_M + J_L`. */
export function resolveTotalSystemInertia(
  input: TotalSystemInertiaInput,
): TotalSystemInertiaResult {
  assertPositive("motorRotorInertiaKgM2", input.motorRotorInertiaKgM2);
  assertNonNegative("reflectedLoadInertiaKgM2", input.reflectedLoadInertiaKgM2);

  return {
    totalSystemInertiaKgM2:
      input.motorRotorInertiaKgM2 + input.reflectedLoadInertiaKgM2,
  };
}

export interface InertiaRatioInput {
  readonly reflectedLoadInertiaKgM2: number;
  readonly motorRotorInertiaKgM2: number;
}

export interface InertiaRatioResult {
  readonly inertiaRatio: number;
}

/** `R_J = J_L / J_M`. Checked against an engineer-supplied maximum. */
export function resolveInertiaRatio(
  input: InertiaRatioInput,
): InertiaRatioResult {
  assertNonNegative("reflectedLoadInertiaKgM2", input.reflectedLoadInertiaKgM2);
  assertPositive("motorRotorInertiaKgM2", input.motorRotorInertiaKgM2);

  return {
    inertiaRatio: input.reflectedLoadInertiaKgM2 / input.motorRotorInertiaKgM2,
  };
}

// --- 2. Drive force and load torque --------------------------------------------

export type MoveDirection = "forward" | "return";

export interface DriveForceInput {
  /** External force along the axis of travel, in N. */
  readonly externalForceN: number;
  /** Total moving mass, in kg. Must be > 0. */
  readonly totalMovingMassKg: number;
  /** Gravitational acceleration, in m/s^2. Must be > 0. */
  readonly gravityMps2: number;
  /** Incline angle above horizontal, in rad. Must be in [0, pi/2]. */
  readonly inclineAngleRad: number;
  /** Sliding-surface friction coefficient, `>= 0`. */
  readonly frictionCoefficient: number;
  /**
   * `"forward"` is the direction that moves away from gravity (upward on a
   * vertical/inclined axis); `"return"` is gravity-assisted (downward).
   * Immaterial on a horizontal axis (`inclineAngleRad = 0`) — see
   * `motor_sizing.ball_screw.forward_move_distance`'s own registry
   * definition for this stated convention
   * (stage-2-contract.md "Stage 3 corrections").
   */
  readonly direction: MoveDirection;
}

export interface DriveForceResult {
  readonly forceN: number;
}

/**
 * Oriental Motor's own incline-force formula
 * (`F = F_A + m*g*(sin(theta) + mu*cos(theta))`, Motor Sizing
 * Calculators.pdf p. 4, "Incline Force Calculation"), for the forward
 * (gravity-opposing) direction. For the return (gravity-assisted)
 * direction, gravity's own contribution subtracts while friction still
 * opposes motion (still adds): `F = F_A + m*g*(mu*cos(theta) - sin(theta))`
 * — this project's own derivation, not stated explicitly by the source
 * (stage-1-spec.md "Candidate Methods" item 2 "Direction dependence"), but
 * ordinary statics required to reproduce THK's own vertical worked example
 * (`stage-1-spec.md` "Reference Examples" item 2), where the upward and
 * downward load torques are genuinely different.
 *
 * The result may be negative for a strongly gravity-assisted return
 * direction (e.g. lowering a heavy unbalanced load) — a real, physically
 * meaningful case where the motor must brake rather than drive. Downstream
 * torque and RMS calculations must not silently take an absolute value
 * before this sign has done its work in {@link resolvePhaseTorque}.
 */
export function resolveDriveForce(input: DriveForceInput): DriveForceResult {
  assertFinite("externalForceN", input.externalForceN);
  assertPositive("totalMovingMassKg", input.totalMovingMassKg);
  assertPositive("gravityMps2", input.gravityMps2);
  assertFinite("inclineAngleRad", input.inclineAngleRad);
  if (input.inclineAngleRad < 0 || input.inclineAngleRad > Math.PI / 2) {
    fail("inclineAngleRad must be between 0 and pi/2.");
  }
  assertNonNegative("frictionCoefficient", input.frictionCoefficient);

  const weightN = input.totalMovingMassKg * input.gravityMps2;
  const gravityTermN = weightN * Math.sin(input.inclineAngleRad);
  const frictionTermN =
    weightN * input.frictionCoefficient * Math.cos(input.inclineAngleRad);

  const directionalGravityTermN =
    input.direction === "forward" ? gravityTermN : -gravityTermN;

  return {
    forceN: input.externalForceN + directionalGravityTermN + frictionTermN,
  };
}

export interface LoadTorqueInput {
  /** Drive force for this direction, in N. May be signed. */
  readonly forceN: number;
  /** Ball-screw lead, in m. Must be > 0. */
  readonly leadM: number;
  /** Ball-screw mechanical efficiency, `0 < eta <= 1`. */
  readonly efficiency: number;
  /** Ball-nut preload, in N. Must be `>= 0`. */
  readonly preloadN: number;
  /** Internal friction coefficient of the preload nut, `>= 0`. */
  readonly internalFrictionCoefficient: number;
  /** Screw-to-motor gear ratio. Must be > 0. */
  readonly gearRatio: number;
}

export interface LoadTorqueResult {
  readonly loadTorqueNm: number;
}

/**
 * `T_L = ( F*P/(2*pi*eta) + mu0*F0*P/(2*pi) ) * (1/i)` — Oriental Motor's
 * ball-screw-drive load-torque formula (Motor Sizing Calculators.pdf p. 4),
 * the identical formula `ball-screw@0.1.0`'s own `resolveDriveTorque`
 * implements, reproduced here (not imported) since this module resolves
 * its own force internally rather than consuming `axis-load-cases`' output
 * (stage-1-spec.md "Relationship to Existing Released Modules").
 */
export function resolveLoadTorque(input: LoadTorqueInput): LoadTorqueResult {
  assertFinite("forceN", input.forceN);
  assertPositive("leadM", input.leadM);
  assertFinite("efficiency", input.efficiency);
  if (input.efficiency <= 0 || input.efficiency > 1) {
    fail("efficiency must be greater than 0 and at most 1.");
  }
  assertNonNegative("preloadN", input.preloadN);
  assertNonNegative(
    "internalFrictionCoefficient",
    input.internalFrictionCoefficient,
  );
  assertPositive("gearRatio", input.gearRatio);

  const driveTermNm =
    (input.forceN * input.leadM) / (2 * Math.PI * input.efficiency);
  const preloadFrictionTermNm =
    (input.internalFrictionCoefficient * input.preloadN * input.leadM) /
    (2 * Math.PI);

  return {
    loadTorqueNm: (driveTermNm + preloadFrictionTermNm) / input.gearRatio,
  };
}

// --- 3. Angular acceleration and motor-shaft speed -----------------------------

export interface AngularAccelerationInput {
  /** Linear acceleration magnitude, in m/s^2. Must be >= 0. */
  readonly linearAccelerationMps2: number;
  /** Ball-screw lead, in m. Must be > 0. */
  readonly leadM: number;
  /** Screw-to-motor gear ratio. Must be > 0. */
  readonly gearRatio: number;
}

export interface AngularAccelerationResult {
  readonly angularAccelerationRadPerS2: number;
}

/**
 * `alpha = (a/lead) * 2*pi * gearRatio` — the mechanism-specific
 * linear-to-angular conversion for a ball screw. Mechanism-specific
 * transmission math (ADR-0011 "Module shape" step 3) stays in this
 * module's own kernel, not `lib/engine/mechanics`, the same division of
 * responsibility `drive-train@0.1.0`'s own `resolveAccelerationTorque`
 * already established.
 */
export function resolveAngularAcceleration(
  input: AngularAccelerationInput,
): AngularAccelerationResult {
  assertNonNegative("linearAccelerationMps2", input.linearAccelerationMps2);
  assertPositive("leadM", input.leadM);
  assertPositive("gearRatio", input.gearRatio);

  return {
    angularAccelerationRadPerS2:
      (input.linearAccelerationMps2 / input.leadM) *
      2 *
      Math.PI *
      input.gearRatio,
  };
}

export interface MotorShaftSpeedInput {
  /** Linear velocity magnitude, in m/s. Must be >= 0. */
  readonly linearVelocityMps: number;
  /** Ball-screw lead, in m. Must be > 0. */
  readonly leadM: number;
  /** Screw-to-motor gear ratio. Must be > 0. */
  readonly gearRatio: number;
}

export interface MotorShaftSpeedResult {
  readonly rotationalSpeedRadPerS: number;
}

/**
 * `n_screw = v/lead` (rev/s), `N_op = n_screw * 2*pi * gearRatio` (rad/s) —
 * the same conversion `drive-train@0.1.0`'s own `resolveOperatingSpeed`
 * already uses, reproduced here rather than imported.
 */
export function resolveMotorShaftSpeed(
  input: MotorShaftSpeedInput,
): MotorShaftSpeedResult {
  assertNonNegative("linearVelocityMps", input.linearVelocityMps);
  assertPositive("leadM", input.leadM);
  assertPositive("gearRatio", input.gearRatio);

  const screwRevPerS = input.linearVelocityMps / input.leadM;
  return {
    rotationalSpeedRadPerS: screwRevPerS * 2 * Math.PI * input.gearRatio,
  };
}

// --- 4. Trapezoidal move kinematics ---------------------------------------------

export type MotionProfileType = "trapezoidal" | "triangular";

export interface TrapezoidalMoveInput {
  /** Commanded travel distance of the move, in m. Must be > 0. */
  readonly moveDistanceM: number;
  /** Velocity ceiling the move must not exceed, in m/s. Must be > 0. */
  readonly maxVelocityMps: number;
  /** Symmetric acceleration/deceleration ceiling, in m/s^2. Must be > 0. */
  readonly maxAccelerationMps2: number;
}

export interface TrapezoidalMoveResult {
  readonly profileType: MotionProfileType;
  readonly peakVelocityMps: number;
  readonly accelerationTimeS: number;
  readonly decelerationTimeS: number;
  readonly constantVelocityTimeS: number;
  readonly moveTimeS: number;
}

/**
 * Resolves a single symmetric trapezoidal (or triangular) move — the
 * identical kinematics `motion-profile@0.1.0`'s own `resolveTrapezoidalMove`
 * implements, reproduced here rather than linked (ADR-0011 "Module shape"
 * step 2: this module needs the per-phase intermediate values internally,
 * not `motion-profile`'s own module-boundary scalar outputs).
 */
export function resolveTrapezoidalMove(
  input: TrapezoidalMoveInput,
): TrapezoidalMoveResult {
  assertPositive("moveDistanceM", input.moveDistanceM);
  assertPositive("maxVelocityMps", input.maxVelocityMps);
  assertPositive("maxAccelerationMps2", input.maxAccelerationMps2);

  const { moveDistanceM, maxVelocityMps, maxAccelerationMps2 } = input;
  const accelerationDistanceAtLimitM =
    (maxVelocityMps * maxVelocityMps) / (2 * maxAccelerationMps2);

  if (2 * accelerationDistanceAtLimitM <= moveDistanceM) {
    const accelerationTimeS = maxVelocityMps / maxAccelerationMps2;
    const constantVelocityDistanceM =
      moveDistanceM - 2 * accelerationDistanceAtLimitM;
    const constantVelocityTimeS = constantVelocityDistanceM / maxVelocityMps;

    return {
      profileType: "trapezoidal",
      peakVelocityMps: maxVelocityMps,
      accelerationTimeS,
      decelerationTimeS: accelerationTimeS,
      constantVelocityTimeS,
      moveTimeS: 2 * accelerationTimeS + constantVelocityTimeS,
    };
  }

  const peakVelocityMps = Math.sqrt(maxAccelerationMps2 * moveDistanceM);
  const accelerationTimeS = peakVelocityMps / maxAccelerationMps2;

  return {
    profileType: "triangular",
    peakVelocityMps,
    accelerationTimeS,
    decelerationTimeS: accelerationTimeS,
    constantVelocityTimeS: 0,
    moveTimeS: 2 * accelerationTimeS,
  };
}

// --- 5. Per-phase torque, momentary torque, and effective (RMS) torque --------

export type MovePhaseKind = "accel" | "constant" | "decel";

export interface PhaseTorqueInput {
  /** Load torque for this move's own direction, in N*m. May be signed. */
  readonly loadTorqueNm: number;
  /** Acceleration-torque magnitude for this move's own direction, in N*m. Must be >= 0. */
  readonly accelerationTorqueNm: number;
  readonly phase: MovePhaseKind;
}

export interface PhaseTorqueResult {
  readonly torqueNm: number;
}

/**
 * `T = TL + Ta` (accel), `T = TL` (constant), `T = TL - Ta` (decel) —
 * Oriental Motor's own `T1 = TA+TL`, `T2 = TL`, `T3 = TL-TA` (Motor Sizing
 * Calculators.pdf p. 6), applied per direction with `loadTorqueNm`'s own
 * sign carried through (stage-2-contract.md "Decisions" item 3: true
 * signed per-direction values, not `drive-train@0.1.0`'s own conservative
 * `max(accel, decel)` summation).
 */
export function resolvePhaseTorque(input: PhaseTorqueInput): PhaseTorqueResult {
  assertFinite("loadTorqueNm", input.loadTorqueNm);
  assertNonNegative("accelerationTorqueNm", input.accelerationTorqueNm);

  const torqueNm =
    input.phase === "accel"
      ? input.loadTorqueNm + input.accelerationTorqueNm
      : input.phase === "decel"
        ? input.loadTorqueNm - input.accelerationTorqueNm
        : input.loadTorqueNm;

  return { torqueNm };
}

export interface CyclePhase {
  /** Duration of this phase, in s. Must be >= 0. */
  readonly durationS: number;
  /** Torque during this phase, in N*m. May be signed. */
  readonly torqueNm: number;
}

export interface MomentaryTorqueResult {
  readonly momentaryTorqueNm: number;
}

/**
 * The highest torque *magnitude* across every phase in the full cycle —
 * the motor's own peak instantaneous torque requirement, in either
 * direction (positive: driving; negative: braking).
 */
export function resolveMomentaryTorque(
  phases: readonly CyclePhase[],
): MomentaryTorqueResult {
  if (phases.length === 0) fail("At least one cycle phase is required.");

  let momentaryTorqueNm = 0;
  for (const phase of phases) {
    assertNonNegative("durationS", phase.durationS);
    assertFinite("torqueNm", phase.torqueNm);
    momentaryTorqueNm = Math.max(momentaryTorqueNm, Math.abs(phase.torqueNm));
  }

  return { momentaryTorqueNm };
}

export interface EffectiveTorqueResult {
  readonly effectiveTorqueNm: number;
}

/**
 * `Trms = sqrt( sum(T_i^2 * t_i) / sum(t_i) )` over every real phase in the
 * full cycle — the general N-phase form every source's own formula reduces
 * to (Oriental Motor's 3-phase form, Omron's 3-phase-plus-dwell form,
 * HMK's/Voss's 4-phase form — `stage-1-spec.md` item 5). This is the
 * structural fix ADR-0011 exists to make: a genuine multi-phase sum, not
 * `drive-train@0.1.0`'s own closed-form approximation from a single scalar
 * `rms_acceleration`.
 *
 * A zero-torque, zero-or-nonzero-duration dwell phase may be included
 * unconditionally — it contributes `0` to the numerator and its own
 * duration to the denominator, exactly matching Omron's own treatment of
 * a stationary phase (Servo Selection.pdf p. 12, `t4` in the denominator
 * only, no `T4` term).
 */
export function resolveEffectiveTorque(
  phases: readonly CyclePhase[],
): EffectiveTorqueResult {
  if (phases.length === 0) fail("At least one cycle phase is required.");

  let weightedSquareSum = 0;
  let totalDurationS = 0;
  for (const phase of phases) {
    assertNonNegative("durationS", phase.durationS);
    assertFinite("torqueNm", phase.torqueNm);
    weightedSquareSum += phase.torqueNm ** 2 * phase.durationS;
    totalDurationS += phase.durationS;
  }

  if (totalDurationS <= 0) {
    fail("Total cycle duration must be positive.");
  }

  return {
    effectiveTorqueNm: Math.sqrt(weightedSquareSum / totalDurationS),
  };
}

// --- 6. Required torque --------------------------------------------------------

export interface RequiredTorqueInput {
  /** Computed torque figure (momentary or effective), in N*m. Must be >= 0. */
  readonly computedTorqueNm: number;
  /** Safety factor, `>= 1`. */
  readonly safetyFactor: number;
}

export interface RequiredTorqueResult {
  readonly requiredTorqueNm: number;
}

/**
 * `T_required = T_computed * Sf` — Oriental Motor's own `TM = (TL+Ta)*Sf`
 * shape (Motor Sizing Calculators.pdf p. 6, "Calculation for Required
 * Torque"), applied per computed-torque figure rather than to one combined
 * `(TL+Ta)` sum (stage-2-contract.md "Decisions" item 4: two separate
 * safety factors, momentary and effective, since no source ties them to
 * one shared number).
 */
export function resolveRequiredTorque(
  input: RequiredTorqueInput,
): RequiredTorqueResult {
  assertNonNegative("computedTorqueNm", input.computedTorqueNm);
  assertFinite("safetyFactor", input.safetyFactor);
  if (input.safetyFactor < 1) {
    fail("safetyFactor must be at least 1.");
  }

  return {
    requiredTorqueNm: input.computedTorqueNm * input.safetyFactor,
  };
}

// Re-exported for callers that need Ta = J*alpha directly without importing
// lib/engine/mechanics themselves (compute.ts, math.test.ts).
export { accelerationTorque };
