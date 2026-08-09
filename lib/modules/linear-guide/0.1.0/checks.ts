// Acceptance checks for the linear-guide module, implementing
// context/modules/linear-guide/stage-1-spec.md "Checks (Proposed)".
//
// `math.ts`'s kernel functions already hard-reject non-positive geometry and
// ratings, so the positivity checks below restate that same acceptance
// criterion for the report rather than guarding an unreachable failure path —
// the same pattern axis-load-cases, motion-profile, and ball-screw already
// use.
//
// Two checks are deliberately `not_applicable` rather than `pass`, because
// reporting a pass for something never evaluated would be a false assurance:
//
//   - Nominal life. The Stage 1 spec calls it "informational unless/until a
//     required minimum life is supplied", and no minimum-life parameter is
//     registered — the Stage 2 contract's output set does not include one. The
//     computed life is carried on the check as the observed value so a report
//     still shows it, with no criterion attached.
//   - Preload grade. A selection fact the engineer supplies, not a computed
//     result; PMI's Section 11 gives fitted-condition guidance, not a formula
//     that could pass or fail (stage-1-spec.md item 9).
//
// The static safety factor minimum has no built-in default
// (context/modules/linear-guide/stage-2-contract.md "Decisions" item 2): the
// check compares against whatever the engineer supplied, not an embedded
// constant.

import {
  convert,
  makeQuantity,
  type CheckResult,
  type Quantity,
} from "@/lib/engine";

export type LinearGuideCase = "normal" | "peak";

export interface CaseCheckInput {
  readonly equivalentLoadN: number;
  readonly staticSafetyFactor: number;
  readonly lifeKm: number;
}

export interface ChecksInput {
  readonly railSpacing: Quantity;
  readonly blockSpacing: Quantity;
  readonly staticLoadRating: Quantity;
  readonly dynamicLoadRating: Quantity;
  readonly staticSafetyFactorMinimum: Quantity;
  readonly preloadGrade: string;
  readonly cases: Readonly<Record<LinearGuideCase, CaseCheckInput>>;
}

function positivityCheck(
  id: string,
  label: string,
  value: Quantity,
): CheckResult {
  const ok = value.value > 0;
  return {
    id,
    status: ok ? "pass" : "fail",
    message: ok ? `${label} is positive.` : `${label} must be positive.`,
    criterion: `${id.replace(/-/g, "_")} > 0`,
    observed: value,
  };
}

export function buildChecks(input: ChecksInput): CheckResult[] {
  const checks: CheckResult[] = [
    positivityCheck("rail-spacing-positive", "Rail spacing", input.railSpacing),
    positivityCheck(
      "block-spacing-positive",
      "Block spacing",
      input.blockSpacing,
    ),
    positivityCheck(
      "static-load-rating-positive",
      "Basic static load rating",
      input.staticLoadRating,
    ),
    positivityCheck(
      "dynamic-load-rating-positive",
      "Basic dynamic load rating",
      input.dynamicLoadRating,
    ),
  ];

  for (const loadCase of ["normal", "peak"] as const) {
    const c = input.cases[loadCase];

    const staticSafetyOk =
      c.staticSafetyFactor >= input.staticSafetyFactorMinimum.value;
    checks.push({
      id: `static-safety-${loadCase}`,
      status: staticSafetyOk ? "pass" : "fail",
      message: staticSafetyOk
        ? `Governing block's static safety factor meets the required minimum for the ${loadCase} case.`
        : `Governing block's static safety factor is below the required minimum for the ${loadCase} case.`,
      criterion: "fs >= fs_min",
      observed: makeQuantity(c.staticSafetyFactor, "ratio"),
      allowable: input.staticSafetyFactorMinimum,
      margin: makeQuantity(
        c.staticSafetyFactor - input.staticSafetyFactorMinimum.value,
        "ratio",
      ),
    });

    checks.push({
      id: `nominal-life-${loadCase}`,
      status: "not_applicable",
      message: `Nominal life for the ${loadCase} case is reported for information; no required minimum life was supplied, so nothing is evaluated against it.`,
      observed: makeQuantity(convert(c.lifeKm, "km", "m"), "m"),
    });
  }

  checks.push({
    id: "preload-grade",
    status: "not_applicable",
    message: `Preload grade "${input.preloadGrade}" is recorded as a selection fact; preload suitability is fitted-condition guidance in the source, not a pass/fail criterion this module evaluates.`,
  });

  return checks;
}
