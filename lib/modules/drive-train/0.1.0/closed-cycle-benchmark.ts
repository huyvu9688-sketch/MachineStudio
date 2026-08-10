/**
 * Independent benchmark: verifies the closed-cycle RMS-acceleration
 * identity `./math.ts`'s `resolveEffectiveTorque` relies on --
 * `Trms^2 = (J_total*2*pi*gearRatio/lead)^2 * a_rms^2 + T_L^2` -- against a
 * structurally different, direct computation: the general per-phase RMS
 * formula every Stage 1 source gives (Omron, HMK, Voss, Oriental Motor --
 * `context/modules/drive-train/stage-1-spec.md` item 3),
 * `Trms = sqrt(sum(T_i^2*t_i) / sum(t_i))`, applied straight to a synthetic
 * multi-phase torque profile rather than derived from aggregate a_rms/T_L
 * statistics. Closes the "at least one independent benchmark source or
 * tool comparison" `context/roadmap.md` Module Definition of Done item 9 --
 * the "property test verifying the closed-cycle RMS-acceleration identity
 * against a synthetic per-phase torque profile" candidate this module's own
 * README.md "Stage 4" and `validation.ts`'s own `independentBenchmark` field
 * name.
 *
 * `context/modules/drive-train/stage-1-spec.md` "The RMS-Acceleration
 * Dependency Question" derives that the identity holds only for a
 * *repeating* duty cycle -- one whose net velocity change is zero,
 * `sum(alpha_i * t_i) = 0` -- because that is exactly the condition under
 * which the cross term in `Trms^2 = mean(T(t)^2)` vanishes. The sibling
 * test file proves both directions: the identity holds (to floating-point
 * precision, since it is an algebraic identity, not an approximate
 * corroboration) whenever that condition is met, across varied phase counts
 * and varied `(J_total, T_load)` pairs, and demonstrably fails to hold when
 * the condition is violated -- showing the condition is load-bearing, not a
 * vacuous restriction.
 */

export interface TorquePhase {
  /** Constant acceleration during this phase (angular or linear -- the identity is dimension-agnostic). Signed. */
  readonly accel: number;
  /** Duration of this phase, in seconds. Must be > 0. */
  readonly durationS: number;
}

export class ClosedCycleBenchmarkInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClosedCycleBenchmarkInputError";
  }
}

function fail(message: string): never {
  throw new ClosedCycleBenchmarkInputError(message);
}

function assertValidPhases(phases: readonly TorquePhase[]): void {
  if (phases.length === 0) fail("phases must not be empty.");
  for (const phase of phases) {
    if (!Number.isFinite(phase.accel)) fail("each phase accel must be finite.");
    if (!Number.isFinite(phase.durationS) || phase.durationS <= 0) {
      fail("each phase durationS must be positive.");
    }
  }
}

function totalDuration(phases: readonly TorquePhase[]): number {
  return phases.reduce((sum, phase) => sum + phase.durationS, 0);
}

/**
 * Net velocity change over the cycle, `sum(alpha_i*t_i)` -- zero iff the
 * cycle repeats (returns to its starting velocity), the condition
 * `resolveEffectiveTorque`'s own closed-form derivation depends on.
 */
export function resolveNetVelocityChange(
  phases: readonly TorquePhase[],
): number {
  assertValidPhases(phases);
  return phases.reduce((sum, phase) => sum + phase.accel * phase.durationS, 0);
}

/**
 * RMS of the phase-wise acceleration signal,
 * `a_rms = sqrt(sum(alpha_i^2*t_i) / sum(t_i))` -- the same aggregate
 * statistic `resolveEffectiveTorque` takes as `rmsAccelerationMps2`.
 */
export function resolvePhaseRmsAccel(phases: readonly TorquePhase[]): number {
  assertValidPhases(phases);
  const weightedSquareSum = phases.reduce(
    (sum, phase) => sum + phase.accel ** 2 * phase.durationS,
    0,
  );
  return Math.sqrt(weightedSquareSum / totalDuration(phases));
}

/**
 * Direct per-phase RMS torque, `Trms = sqrt(sum(T_i^2*t_i) / sum(t_i))` with
 * `T_i = totalInertia*alpha_i + loadTorque` -- the general shape every
 * Stage 1 source gives (stage-1-spec.md item 3), computed straight from the
 * phase list rather than through `resolveEffectiveTorque`'s aggregate-
 * statistics closed form. This is the structurally different second
 * computation: it never calls, and does not depend on, `./math.ts`.
 */
export function resolvePhaseRmsTorque(
  phases: readonly TorquePhase[],
  totalInertia: number,
  loadTorque: number,
): number {
  assertValidPhases(phases);
  if (!Number.isFinite(totalInertia) || totalInertia <= 0) {
    fail("totalInertia must be positive.");
  }
  if (!Number.isFinite(loadTorque) || loadTorque < 0) {
    fail("loadTorque must not be negative.");
  }

  const weightedSquareSum = phases.reduce((sum, phase) => {
    const torque = totalInertia * phase.accel + loadTorque;
    return sum + torque ** 2 * phase.durationS;
  }, 0);

  return Math.sqrt(weightedSquareSum / totalDuration(phases));
}
