// Acceptance checks for belt-pulley-drive-motor-sizing 0.2.0. Unchanged
// from 0.1.0: the inertia ratio against an engineer-supplied maximum is
// still the only real check -- no source found gives a universal
// continuous-torque acceptance criterion for effective_torque
// (docs/superpowers/specs/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0-design.md
// "Checks"). Duplicated, not imported, per stage-2-contract.md "0.2.0
// Addendum" cross-version reuse policy.

import { makeQuantity, type CheckResult } from "@/lib/engine";

export interface ChecksInput {
  readonly inertiaRatio: number;
  readonly inertiaRatioMaximum: number;
}

export function buildChecks(input: ChecksInput): CheckResult[] {
  const inertiaOk = input.inertiaRatio <= input.inertiaRatioMaximum;

  return [
    {
      id: "inertia-ratio",
      status: inertiaOk ? "pass" : "fail",
      message: inertiaOk
        ? "Load-to-rotor inertia ratio is within the required maximum."
        : "Load-to-rotor inertia ratio exceeds the required maximum.",
      criterion: "R_J <= R_Jmax",
      observed: makeQuantity(input.inertiaRatio, "ratio"),
      allowable: makeQuantity(input.inertiaRatioMaximum, "ratio"),
      margin: makeQuantity(
        input.inertiaRatioMaximum - input.inertiaRatio,
        "ratio",
      ),
    },
  ];
}
