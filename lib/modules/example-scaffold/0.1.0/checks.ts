// Acceptance checks for the example-scaffold module. Every check has a stable id, a
// status (pass/fail/warning/not_applicable/invalid_input), a message, and,
// where meaningful, a criterion, observed value, allowable limit, and margin.

import type { CheckResult, EngineeringValue } from "@/lib/engine";

export function buildChecks(result: EngineeringValue): CheckResult[] {
  const value = result.kind === "quantity" ? result.value : 0;
  return [
    // TODO: replace with the module's real acceptance checks.
    {
      id: "result-nonnegative",
      status: value >= 0 ? "pass" : "fail",
      message:
        value >= 0 ? "Result is non-negative." : "Result is negative.",
      criterion: "result >= 0",
      observed: result,
    },
  ];
}
