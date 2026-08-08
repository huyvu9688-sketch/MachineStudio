/**
 * Pure SI-number kernel for the in-progress motion-profile module (Unit 4.2,
 * Stage 2 draft). Resolves a single symmetric trapezoidal/triangular move —
 * elementary constant-acceleration kinematics, not a manufacturer-specific
 * method — per context/modules/motion-profile/stage-1-spec.md "Candidate
 * Method — Single Trapezoidal Move".
 *
 * This is deliberately not a ModulePackage: the RMS-aggregate ownership,
 * multi-segment port shape, and S-curve/jerk scope remain open Stage 2
 * questions (see the spec's "Evidence Gaps" and "Stage 2 Entry Criteria").
 * Only the single-move kernel below is source-independent enough to build
 * ahead of those. Values become EngineeringValues only at a future module-
 * package boundary; bare numbers remain internal here, mirroring
 * lib/modules/axis-load-cases/0.1.0/math.ts.
 */

export type MotionProfileType = "trapezoidal" | "triangular";

export interface TrapezoidalMoveInput {
  /** Commanded travel distance of the move, in meters. Must be > 0. */
  readonly moveDistanceM: number;
  /** Velocity ceiling the move must not exceed, in m/s. Must be > 0. */
  readonly maxVelocityMps: number;
  /**
   * Acceleration ceiling, used for both the accelerating and decelerating
   * phase (symmetric profile, Stage 1 v0.1 scope), in m/s^2. Must be > 0.
   */
  readonly maxAccelerationMps2: number;
}

export interface TrapezoidalMoveResult {
  /** Whether the move reached `maxVelocityMps` (trapezoidal) or not (triangular). */
  readonly profileType: MotionProfileType;
  /** Resolved peak velocity, in m/s. Equal to `maxVelocityMps` when trapezoidal. */
  readonly peakVelocityMps: number;
  /** Acceleration magnitude actually used, in m/s^2. Equal to `maxAccelerationMps2`. */
  readonly peakAccelerationMps2: number;
  /** Deceleration magnitude actually used, in m/s^2. Equal to `maxAccelerationMps2` (symmetric). */
  readonly peakDecelerationMps2: number;
  /** Duration of the accelerating phase, in seconds. Equal to the decelerating phase (symmetric). */
  readonly accelerationTimeS: number;
  /** Duration of the decelerating phase, in seconds. Equal to `accelerationTimeS`. */
  readonly decelerationTimeS: number;
  /** Duration at constant `peakVelocityMps`, in seconds. Zero when triangular. */
  readonly constantVelocityTimeS: number;
  /** Distance covered at constant `peakVelocityMps`, in meters. Zero when triangular. */
  readonly constantVelocityDistanceM: number;
  /** Total move duration, in seconds: `2 * accelerationTimeS + constantVelocityTimeS`. */
  readonly moveTimeS: number;
}

/** Thrown when an input falls outside the explicit Stage 1 validity envelope. */
export class MotionProfileInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MotionProfileInputError";
  }
}

function fail(message: string): never {
  throw new MotionProfileInputError(message);
}

function assertPositive(name: string, value: number): void {
  if (!Number.isFinite(value)) fail(`${name} must be finite.`);
  if (value <= 0) fail(`${name} must be positive.`);
}

function validateInput(input: TrapezoidalMoveInput): void {
  assertPositive("moveDistanceM", input.moveDistanceM);
  assertPositive("maxVelocityMps", input.maxVelocityMps);
  assertPositive("maxAccelerationMps2", input.maxAccelerationMps2);
}

/**
 * Resolves a single symmetric trapezoidal (or triangular, when the distance
 * is too short to reach `maxVelocityMps` under `maxAccelerationMps2`) move.
 *
 * Trapezoidal case: accelerate to `maxVelocityMps` over distance
 * `d1 = v_lim^2 / (2*a_lim)`, cruise the remaining `d - 2*d1` at that
 * velocity, then decelerate symmetrically.
 *
 * Triangular case (`2*d1 > moveDistanceM`): the move never reaches
 * `maxVelocityMps`; solve `peakVelocityMps = sqrt(maxAccelerationMps2 *
 * moveDistanceM)` from `moveDistanceM = peakVelocityMps^2 /
 * maxAccelerationMps2` (the sum of the accel and decel distances at the
 * reduced peak), then `accelerationTimeS = peakVelocityMps /
 * maxAccelerationMps2`.
 *
 * A resolved `peakVelocityMps` below `maxVelocityMps` in the triangular case
 * is expected behavior, not a validity failure — the caller must not treat
 * it as one.
 */
export function resolveTrapezoidalMove(
  input: TrapezoidalMoveInput,
): TrapezoidalMoveResult {
  validateInput(input);

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
      peakAccelerationMps2: maxAccelerationMps2,
      peakDecelerationMps2: maxAccelerationMps2,
      accelerationTimeS,
      decelerationTimeS: accelerationTimeS,
      constantVelocityTimeS,
      constantVelocityDistanceM,
      moveTimeS: 2 * accelerationTimeS + constantVelocityTimeS,
    };
  }

  const peakVelocityMps = Math.sqrt(maxAccelerationMps2 * moveDistanceM);
  const accelerationTimeS = peakVelocityMps / maxAccelerationMps2;

  return {
    profileType: "triangular",
    peakVelocityMps,
    peakAccelerationMps2: maxAccelerationMps2,
    peakDecelerationMps2: maxAccelerationMps2,
    accelerationTimeS,
    decelerationTimeS: accelerationTimeS,
    constantVelocityTimeS: 0,
    constantVelocityDistanceM: 0,
    moveTimeS: 2 * accelerationTimeS,
  };
}
