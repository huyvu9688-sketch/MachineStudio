// Pure, deterministic compute function for the motion-profile module (v0.1.0
// draft, Stage 3). Resolves up to MAX_MOVES symmetric trapezoidal/triangular
// moves, each optionally followed by its own dwell, as the whole motion
// cycle (see ./manifest.ts for the bounded-segment-count decision). Reads
// input magnitudes in their canonical units, delegates the physics to the
// pure kernels in ./math and ./cycle, and returns a structured computation.
// Performs no I/O and imports only the engine's public surface and this
// module's own files.

import type { ModuleComputation, ModuleInput, Warning } from "@/lib/engine";
import { makeQuantity } from "@/lib/engine";
import { resolveTrapezoidalMove } from "./math";
import { resolveMotionCycle, type MotionSegment } from "./cycle";
import { MAX_MOVES } from "./manifest";
import { buildChecks } from "./checks";
import { buildTrace, type ResolvedMove } from "./trace";
import { readMoveSegments } from "./values";

export function compute(input: ModuleInput): ModuleComputation {
  const moveSegments = readMoveSegments(input.values, MAX_MOVES);
  if (moveSegments.length === 0) {
    throw new Error(
      'motion-profile requires at least "move_1_distance", "move_1_max_velocity", and "move_1_max_acceleration".',
    );
  }

  const moves: ResolvedMove[] = moveSegments.map((segment) => ({
    segment,
    result: resolveTrapezoidalMove({
      moveDistanceM: segment.distance.value,
      maxVelocityMps: segment.maxVelocity.value,
      maxAccelerationMps2: segment.maxAcceleration.value,
    }),
  }));

  const cycleSegments: MotionSegment[] = moves.flatMap(({ segment }) => [
    {
      kind: "move",
      moveDistanceM: segment.distance.value,
      maxVelocityMps: segment.maxVelocity.value,
      maxAccelerationMps2: segment.maxAcceleration.value,
    },
    ...(segment.dwellTime !== undefined
      ? [{ kind: "dwell" as const, dwellTimeS: segment.dwellTime.value }]
      : []),
  ]);
  const cycle = resolveMotionCycle(cycleSegments);

  const warnings: Warning[] = moves
    .filter(({ result }) => result.profileType === "triangular")
    .map(({ segment }) => ({
      id: `triangular-profile-move-${segment.index}`,
      message: `Move ${segment.index}: the move distance is too short to reach the declared velocity ceiling under the declared acceleration ceiling; the resolved peak velocity is below max_velocity. This is expected triangular-profile behavior, not a failure.`,
    }));

  return {
    outputs: {
      cycle_time: makeQuantity(cycle.cycleTimeS, "s"),
      peak_velocity: makeQuantity(cycle.peakVelocityMps, "m/s"),
      peak_acceleration: makeQuantity(cycle.peakAccelerationMps2, "m/s^2"),
      peak_deceleration: makeQuantity(cycle.peakDecelerationMps2, "m/s^2"),
      rms_acceleration: makeQuantity(cycle.rmsAccelerationMps2, "m/s^2"),
    },
    trace: buildTrace({ moves, cycle }),
    checks: buildChecks(moveSegments),
    warnings,
    assumptions: [
      {
        id: "scope-bounded-move-sequence",
        statement: `This module version (0.1.0) resolves ${moves.length} symmetric trapezoidal/triangular move(s) (up to ${MAX_MOVES} supported), each optionally followed by its own dwell, as the whole motion cycle (accelerating and decelerating phases use the same acceleration magnitude). Asymmetric acceleration/deceleration and jerk-limited S-curve profiles are out of scope for this version.`,
      },
    ],
    validity: [],
  };
}
