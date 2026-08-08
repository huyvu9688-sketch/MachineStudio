/**
 * Pure SI-number kernel resolving a multi-segment move/dwell motion cycle
 * (Unit 4.2, Stage 2 draft) — an ordered sequence of independently-resolved
 * trapezoidal/triangular moves (see ./math.ts) and explicit dwells, sharing
 * one duty cycle. Per context/modules/motion-profile/stage-2-contract.md
 * "Multi-Segment Port Shape", every output here is a cycle-level aggregate
 * (a maximum across segments, or the cycle's overall RMS); per-segment/
 * per-phase detail belongs in a future calculation trace, not a canonical
 * port, until a downstream module needs it as machine-readable data.
 */

import {
  MotionProfileInputError,
  resolveTrapezoidalMove,
  type TrapezoidalMoveInput,
} from "./math";

/** One resolved move within a cycle: the same input `resolveTrapezoidalMove` takes. */
export interface MoveSegment extends TrapezoidalMoveInput {
  readonly kind: "move";
}

/** A stationary dwell within a cycle. */
export interface DwellSegment {
  readonly kind: "dwell";
  /** Dwell duration, in seconds. Must be >= 0. */
  readonly dwellTimeS: number;
}

/** One segment of a motion cycle: either a move or a dwell. */
export type MotionSegment = MoveSegment | DwellSegment;

export interface MotionCycleResult {
  /** Total cycle duration, in seconds: every move's `moveTimeS` plus every dwell's `dwellTimeS`. */
  readonly cycleTimeS: number;
  /** Maximum peak velocity across every move segment, in m/s. */
  readonly peakVelocityMps: number;
  /** Maximum peak acceleration across every move segment, in m/s^2. */
  readonly peakAccelerationMps2: number;
  /** Maximum peak deceleration across every move segment, in m/s^2. */
  readonly peakDecelerationMps2: number;
  /**
   * Time-weighted RMS acceleration magnitude across every phase of the cycle:
   * each move's accel phase, cruise phase (zero acceleration), and decel
   * phase, plus every dwell (zero acceleration), each phase treated as a
   * piecewise-constant acceleration demand over its own duration —
   * `sqrt(sum(a_i^2 * t_i) / sum(t_i))`. See stage-2-contract.md "Decisions"
   * item 1: this is elementary time-weighted-RMS arithmetic, not a
   * manufacturer-specific formula.
   */
  readonly rmsAccelerationMps2: number;
}

interface WeightedPhase {
  readonly accelerationMagnitudeMps2: number;
  readonly durationS: number;
}

function assertNonNegativeFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new MotionProfileInputError(`${name} must be finite.`);
  }
  if (value < 0) {
    throw new MotionProfileInputError(`${name} must be non-negative.`);
  }
}

function movePhases(
  move: ReturnType<typeof resolveTrapezoidalMove>,
): WeightedPhase[] {
  return [
    {
      accelerationMagnitudeMps2: move.peakAccelerationMps2,
      durationS: move.accelerationTimeS,
    },
    { accelerationMagnitudeMps2: 0, durationS: move.constantVelocityTimeS },
    {
      accelerationMagnitudeMps2: move.peakDecelerationMps2,
      durationS: move.decelerationTimeS,
    },
  ];
}

/**
 * Resolves a full motion cycle from an ordered sequence of move and dwell
 * segments. At least one move segment is required — a dwell-only sequence has
 * no kinematics to resolve. Each move segment is resolved independently via
 * {@link resolveTrapezoidalMove}; this function only aggregates across the
 * sequence, it does not alter any individual move's result.
 */
export function resolveMotionCycle(
  segments: readonly MotionSegment[],
): MotionCycleResult {
  if (segments.length === 0) {
    throw new MotionProfileInputError(
      "A motion cycle requires at least one segment.",
    );
  }

  let cycleTimeS = 0;
  let peakVelocityMps = 0;
  let peakAccelerationMps2 = 0;
  let peakDecelerationMps2 = 0;
  let hasMove = false;
  const phases: WeightedPhase[] = [];

  for (const segment of segments) {
    if (segment.kind === "dwell") {
      assertNonNegativeFinite("dwellTimeS", segment.dwellTimeS);
      cycleTimeS += segment.dwellTimeS;
      phases.push({
        accelerationMagnitudeMps2: 0,
        durationS: segment.dwellTimeS,
      });
      continue;
    }

    hasMove = true;
    const move = resolveTrapezoidalMove(segment);
    cycleTimeS += move.moveTimeS;
    peakVelocityMps = Math.max(peakVelocityMps, move.peakVelocityMps);
    peakAccelerationMps2 = Math.max(
      peakAccelerationMps2,
      move.peakAccelerationMps2,
    );
    peakDecelerationMps2 = Math.max(
      peakDecelerationMps2,
      move.peakDecelerationMps2,
    );
    phases.push(...movePhases(move));
  }

  if (!hasMove) {
    throw new MotionProfileInputError(
      "A motion cycle requires at least one move segment.",
    );
  }

  const weightedSquareSum = phases.reduce(
    (sum, phase) =>
      sum + phase.accelerationMagnitudeMps2 ** 2 * phase.durationS,
    0,
  );

  return {
    cycleTimeS,
    peakVelocityMps,
    peakAccelerationMps2,
    peakDecelerationMps2,
    rmsAccelerationMps2: Math.sqrt(weightedSquareSum / cycleTimeS),
  };
}
