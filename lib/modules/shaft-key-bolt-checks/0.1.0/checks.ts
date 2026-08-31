// Acceptance checks for the shaft-key-bolt-checks module. `math.ts`'s own
// kernel functions already hard-reject non-positive stress/force/factor
// inputs, so the checks below restate the same acceptance criteria for the
// report rather than guarding an unreachable failure path -- the same
// pattern every other module in this project already uses.

import { makeQuantity, type CheckResult, type Quantity } from "@/lib/engine";

export type ShaftKeyBoltCase = "normal" | "peak";

export interface CaseCheckInput {
  readonly shaftSafetyFactor: number;
  readonly keyShearSafetyFactor: number;
  readonly keyBearingSafetyFactor: number;
  readonly boltTensileSafetyFactor: number;
}

export interface ChecksInput {
  readonly shaftSafetyFactorMinimum: Quantity;
  readonly keySafetyFactorMinimum: Quantity;
  readonly boltSafetyFactorMinimum: Quantity;
  readonly cases: Readonly<Record<ShaftKeyBoltCase, CaseCheckInput>>;
}

function marginCheck(
  id: string,
  message: string,
  observedFactor: number,
  minimumFactor: Quantity,
): CheckResult {
  const ok = observedFactor >= minimumFactor.value;
  return {
    id,
    status: ok ? "pass" : "fail",
    message: ok
      ? `${message} meets the required minimum safety factor.`
      : `${message} is below the required minimum safety factor.`,
    criterion: "fs >= fs_min",
    observed: makeQuantity(observedFactor, "ratio"),
    allowable: minimumFactor,
    margin: makeQuantity(observedFactor - minimumFactor.value, "ratio"),
  };
}

export function buildChecks(input: ChecksInput): CheckResult[] {
  const checks: CheckResult[] = [];

  for (const loadCase of ["normal", "peak"] as const) {
    const c = input.cases[loadCase];

    checks.push(
      marginCheck(
        `shaft-safety-${loadCase}`,
        `Shaft combined-stress safety factor (${loadCase})`,
        c.shaftSafetyFactor,
        input.shaftSafetyFactorMinimum,
      ),
      marginCheck(
        `key-shear-safety-${loadCase}`,
        `Key shear safety factor (${loadCase})`,
        c.keyShearSafetyFactor,
        input.keySafetyFactorMinimum,
      ),
      marginCheck(
        `key-bearing-safety-${loadCase}`,
        `Key bearing safety factor (${loadCase})`,
        c.keyBearingSafetyFactor,
        input.keySafetyFactorMinimum,
      ),
      marginCheck(
        `bolt-tensile-safety-${loadCase}`,
        `Bolt tensile-capacity safety factor (${loadCase})`,
        c.boltTensileSafetyFactor,
        input.boltSafetyFactorMinimum,
      ),
    );
  }

  return checks;
}
