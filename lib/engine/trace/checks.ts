// Check-status aggregation (Unit 1.5). Turns a set of individual check results
// into the single overall status a module/result pane displays
// (context/ui-context.md "Result pane"; context/code-standards.md "Checks and
// Status"). A warning never converts a failed requirement into a pass.

import type { CheckResult, CheckStatus } from "./types";

// Severity order for overall aggregation, most severe first. `not_applicable`
// is intentionally absent: it does not contribute to the overall status.
const SEVERITY: readonly Exclude<CheckStatus, "not_applicable">[] = [
  "invalid_input",
  "fail",
  "warning",
  "pass",
];

/**
 * The overall status of a set of checks, taking the most severe contributing
 * status: `invalid_input` > `fail` > `warning` > `pass`. `not_applicable`
 * checks are ignored; a set with no contributing checks (empty, or all
 * `not_applicable`) is itself `not_applicable`.
 *
 * A `warning` therefore never masks a `fail`, and a `fail` never presents as a
 * `pass` — warnings are surfaced separately and cannot rescue a failed check.
 */
export function overallCheckStatus(
  checks: readonly CheckResult[],
): CheckStatus {
  let rank = SEVERITY.length; // start below the least-severe contributing status
  for (const check of checks) {
    if (check.status === "not_applicable") continue;
    const index = SEVERITY.indexOf(check.status);
    if (index < rank) rank = index;
  }
  return rank < SEVERITY.length ? SEVERITY[rank] : "not_applicable";
}

/**
 * Whether a status blocks a clean result — an `invalid_input` or a `fail`. Used
 * where the workspace or a baseline gate must stop on unresolved problems;
 * `warning` and `not_applicable` are not blocking.
 */
export function isBlockingStatus(status: CheckStatus): boolean {
  return status === "invalid_input" || status === "fail";
}
