// Acceptance checks for the motion-profile module. `resolveTrapezoidalMove`
// and `resolveMotionCycle` (./math.ts, ./cycle.ts) already hard-reject a
// non-positive move input or a negative dwell before a computation is ever
// returned (context/modules/motion-profile/stage-1-spec.md "Checks
// (Proposed)": "Invalid input: move_distance <= 0, max_velocity <= 0, or
// max_acceleration <= 0"; "Multi-segment: non-negative dwell_time"), so these
// checks restate that same acceptance criterion for the report rather than
// guarding an unreachable failure path.

import { type CheckResult, type Quantity } from "@/lib/engine";

export interface ChecksInput {
  readonly moveDistance: Quantity;
  readonly maxVelocity: Quantity;
  readonly maxAcceleration: Quantity;
  /** Absent when the cycle is the single move only (no dwell segment). */
  readonly dwellTime: Quantity | undefined;
}

export function buildChecks(input: ChecksInput): CheckResult[] {
  const distanceOk = input.moveDistance.value > 0;
  const velocityOk = input.maxVelocity.value > 0;
  const accelerationOk = input.maxAcceleration.value > 0;
  const dwellTime = input.dwellTime;
  const dwellOk = dwellTime === undefined || dwellTime.value >= 0;

  return [
    {
      id: "move-distance-positive",
      status: distanceOk ? "pass" : "fail",
      message: distanceOk
        ? "Move distance is positive."
        : "Move distance must be positive.",
      criterion: "d > 0",
      observed: input.moveDistance,
    },
    {
      id: "max-velocity-positive",
      status: velocityOk ? "pass" : "fail",
      message: velocityOk
        ? "Velocity ceiling is positive."
        : "Velocity ceiling must be positive.",
      criterion: "v_lim > 0",
      observed: input.maxVelocity,
    },
    {
      id: "max-acceleration-positive",
      status: accelerationOk ? "pass" : "fail",
      message: accelerationOk
        ? "Acceleration ceiling is positive."
        : "Acceleration ceiling must be positive.",
      criterion: "a_lim > 0",
      observed: input.maxAcceleration,
    },
    {
      id: "dwell-time-non-negative",
      status:
        dwellTime === undefined ? "not_applicable" : dwellOk ? "pass" : "fail",
      message:
        dwellTime === undefined
          ? "No dwell segment supplied for this run; this check does not apply."
          : dwellOk
            ? "Dwell time is non-negative."
            : "Dwell time must be non-negative.",
      criterion: "t_d >= 0",
      ...(dwellTime !== undefined && { observed: dwellTime }),
    },
  ];
}
