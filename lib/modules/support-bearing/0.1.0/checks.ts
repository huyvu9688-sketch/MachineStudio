// Acceptance checks for the support-bearing module. `math.ts`'s kernel
// functions already hard-reject non-positive/negative input, so the checks
// below restate the acceptance criteria for the report rather than
// guarding an unreachable failure path — the same pattern every other
// module in this project already uses.
//
// No bore/outside-diameter or preload check exists: both are reported
// catalog values in 0.1.0, not evaluated against an actual shaft/housing
// diameter (context/modules/support-bearing/stage-2-contract.md
// "Decisions").

import { makeQuantity, type CheckResult, type Quantity } from "@/lib/engine";

export type SupportBearingCase = "normal" | "peak";

export interface CaseCheckInput {
  readonly staticSafetyFactor: number;
  readonly speedSafetyFactor: number;
}

export interface ChecksInput {
  readonly staticSafetyFactorMinimum: Quantity;
  readonly cases: Readonly<Record<SupportBearingCase, CaseCheckInput>>;
}

export function buildChecks(input: ChecksInput): CheckResult[] {
  const checks: CheckResult[] = [];

  for (const loadCase of ["normal", "peak"] as const) {
    const c = input.cases[loadCase];

    const staticOk =
      c.staticSafetyFactor >= input.staticSafetyFactorMinimum.value;
    checks.push({
      id: `static-safety-${loadCase}`,
      status: staticOk ? "pass" : "fail",
      message: staticOk
        ? `Static safety factor meets the required minimum for the ${loadCase} case.`
        : `Static safety factor is below the required minimum for the ${loadCase} case.`,
      criterion: "S0 >= S0_min",
      observed: makeQuantity(c.staticSafetyFactor, "ratio"),
      allowable: input.staticSafetyFactorMinimum,
      margin: makeQuantity(
        c.staticSafetyFactor - input.staticSafetyFactorMinimum.value,
        "ratio",
      ),
    });

    checks.push({
      id: `speed-safety-${loadCase}`,
      status: c.speedSafetyFactor >= 1 ? "pass" : "fail",
      message:
        c.speedSafetyFactor >= 1
          ? `Operating speed is within the bearing's allowable speed for the ${loadCase} case.`
          : `Operating speed exceeds the bearing's allowable speed for the ${loadCase} case.`,
      criterion: "fs_n >= 1",
      observed: makeQuantity(c.speedSafetyFactor, "ratio"),
      allowable: makeQuantity(1, "ratio"),
      margin: makeQuantity(c.speedSafetyFactor - 1, "ratio"),
    });
  }

  return checks;
}
