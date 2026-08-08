// Acceptance checks for the motion-profile module. `resolveTrapezoidalMove`
// and `resolveMotionCycle` (./math.ts, ./cycle.ts) already hard-reject a
// non-positive move input or a negative dwell before a computation is ever
// returned (context/modules/motion-profile/stage-1-spec.md "Checks
// (Proposed)": "Invalid input: move_distance <= 0, max_velocity <= 0, or
// max_acceleration <= 0"; "Multi-segment: non-negative dwell_time"), so these
// checks restate that same acceptance criterion for the report rather than
// guarding an unreachable failure path. One set of checks is emitted per
// supplied move (./manifest.ts, MAX_MOVES) — as many as were actually
// supplied, not a fixed count.

import { type CheckResult } from "@/lib/engine";
import type { ResolvedMoveSegment } from "./values";

export function buildChecks(
  moves: readonly ResolvedMoveSegment[],
): CheckResult[] {
  return moves.flatMap((move) => {
    const distanceOk = move.distance.value > 0;
    const velocityOk = move.maxVelocity.value > 0;
    const accelerationOk = move.maxAcceleration.value > 0;
    const dwellTime = move.dwellTime;
    const dwellOk = dwellTime === undefined || dwellTime.value >= 0;

    return [
      {
        id: `move-${move.index}-distance-positive`,
        status: distanceOk ? "pass" : "fail",
        message: distanceOk
          ? `Move ${move.index}: distance is positive.`
          : `Move ${move.index}: distance must be positive.`,
        criterion: "d > 0",
        observed: move.distance,
      },
      {
        id: `move-${move.index}-max-velocity-positive`,
        status: velocityOk ? "pass" : "fail",
        message: velocityOk
          ? `Move ${move.index}: velocity ceiling is positive.`
          : `Move ${move.index}: velocity ceiling must be positive.`,
        criterion: "v_lim > 0",
        observed: move.maxVelocity,
      },
      {
        id: `move-${move.index}-max-acceleration-positive`,
        status: accelerationOk ? "pass" : "fail",
        message: accelerationOk
          ? `Move ${move.index}: acceleration ceiling is positive.`
          : `Move ${move.index}: acceleration ceiling must be positive.`,
        criterion: "a_lim > 0",
        observed: move.maxAcceleration,
      },
      {
        id: `dwell-${move.index}-time-non-negative`,
        status:
          dwellTime === undefined
            ? "not_applicable"
            : dwellOk
              ? "pass"
              : "fail",
        message:
          dwellTime === undefined
            ? `No dwell segment supplied after move ${move.index}; this check does not apply.`
            : dwellOk
              ? `Dwell after move ${move.index} is non-negative.`
              : `Dwell after move ${move.index} must be non-negative.`,
        criterion: "t_d >= 0",
        ...(dwellTime !== undefined && { observed: dwellTime }),
      },
    ];
  });
}
