// Acceptance checks for belt-pulley-drive-motor-sizing 0.3.0. The inertia
// ratio against an engineer-supplied maximum is still the only real check
// -- no source found gives a universal continuous-torque acceptance
// criterion for effective_torque
// (docs/superpowers/specs/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0-design.md
// "Checks"). Duplicated, not imported, per stage-2-contract.md "0.2.0
// Addendum" cross-version reuse policy.
//
// 0.3.0: the exceeded-case status changed from "fail" to "warning"
// (docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md
// "Inertia-ratio recommended default") -- inertia_ratio_maximum now
// resolves to a founder-directed recommended default (10) rather than a
// required no-default value, so exceeding it is advisory, not a hard
// failure. 0.1.0's and 0.2.0's own check (required input, "fail" on
// exceedance) is untouched.

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
      status: inertiaOk ? "pass" : "warning",
      message: inertiaOk
        ? "Load-to-rotor inertia ratio is within the recommended maximum."
        : "Load-to-rotor inertia ratio exceeds the recommended maximum — motor response may be sluggish or harder to tune; not recommended, but this does not block the calculation.",
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
