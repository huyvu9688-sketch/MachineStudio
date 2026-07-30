// Baseline creation checks (Unit 2.9 part 1; implementation map "Baseline
// creation checks", tested via "Stale/failed acknowledgement requirements").
// Pure decision logic: given the calculation runs and component assignments
// that would be frozen into a baseline, decide whether creation should
// proceed or be blocked pending explicit acknowledgement.
//
// A baseline is legitimately created from a known-imperfect design too
// (project-overview.md "Core User Flows": a baseline supports "design review
// or release," not only a finished release) — so this is a soft gate, not a
// hard block: `evaluateBaselineReadiness` reports every blocker it finds, and
// the caller (lib/application, Unit 2.9 part 2) proceeds only once the caller
// passes `acknowledgeWarnings: true`, mirroring Unit 3.8's named UI flow
// ("Pre-baseline validation summary" + "Warning acknowledgement").

import type { BaselineCalculationRunRef, BaselineComponentAssignment } from "./types";

/** Why one item blocks baseline creation, absent explicit acknowledgement. */
export type BaselineBlockerKind = "stale_run" | "failed_run" | "stale_assignment";

/** One blocking condition found while evaluating baseline readiness. */
export interface BaselineBlocker {
  readonly kind: BaselineBlockerKind;
  /** ID of the calculation run or component assignment this blocker concerns. */
  readonly id: string;
  readonly message: string;
}

/** Input to {@link evaluateBaselineReadiness}. */
export interface BaselineReadinessInput {
  readonly calculationRuns: readonly BaselineCalculationRunRef[];
  readonly componentAssignments: readonly BaselineComponentAssignment[];
  /**
   * When `true`, every blocker found is downgraded to informational and
   * readiness reports `ready: true` anyway — the caller has already shown the
   * user the blockers (Unit 3.8's validation summary) and the user chose to
   * proceed. Defaults to `false`.
   */
  readonly acknowledgeWarnings?: boolean;
}

/** Result of {@link evaluateBaselineReadiness}. */
export type BaselineReadinessResult =
  | { readonly ready: true; readonly blockers: readonly BaselineBlocker[] }
  | { readonly ready: false; readonly blockers: readonly BaselineBlocker[] };

/**
 * A run's check status counts as "failed" for baseline-readiness purposes.
 * `"fail"` is a genuine engineering failure; `"invalid_input"` means the
 * computation could not even run — neither is a usable engineering result to
 * freeze silently. `"warning"`, `"pass"`, and `"not_applicable"` are fine.
 */
function isFailedStatus(status: BaselineCalculationRunRef["status"]): boolean {
  return status === "fail" || status === "invalid_input";
}

/**
 * Evaluates whether a baseline may be created from the given (already
 * resolved) runs and component assignments. Reports every stale run, every
 * failed run, and every stale component assignment as a {@link BaselineBlocker}
 * — three independent conditions, since a run's own staleness and its check
 * result are different problems, and an assignment tracks its own stale flag
 * separately from its justifying run (context/architecture.md invariant 8:
 * assignments go stale in the same transaction as their justifying run, but
 * are still a distinct persisted fact worth surfacing on its own).
 *
 * `ready` is `true` when there are no blockers, or when
 * `input.acknowledgeWarnings` is `true` — in the latter case `blockers` is
 * still populated so the caller can record what was acknowledged (e.g. in the
 * audit event payload).
 */
export function evaluateBaselineReadiness(
  input: BaselineReadinessInput,
): BaselineReadinessResult {
  const blockers: BaselineBlocker[] = [];

  for (const run of input.calculationRuns) {
    if (run.stale) {
      blockers.push({
        kind: "stale_run",
        id: run.id,
        message: `Calculation run ${run.id} (module instance ${run.moduleInstanceId}) is stale.`,
      });
    }
    if (isFailedStatus(run.status)) {
      blockers.push({
        kind: "failed_run",
        id: run.id,
        message: `Calculation run ${run.id} (module instance ${run.moduleInstanceId}) has status "${run.status}".`,
      });
    }
  }

  for (const assignment of input.componentAssignments) {
    if (assignment.stale) {
      blockers.push({
        kind: "stale_assignment",
        id: assignment.id,
        message: `Component assignment ${assignment.id} is stale.`,
      });
    }
  }

  if (blockers.length === 0) {
    return { ready: true, blockers };
  }
  return { ready: input.acknowledgeWarnings === true, blockers };
}
