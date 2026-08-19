// Acceptance checks for the rack-pinion-motor-sizing module. Only one real
// check exists: the inertia ratio against an engineer-supplied maximum.
// Every other torque/speed/power figure is a reported required spec, not
// evaluated pass/fail (stage-1-spec.md "Checks and Warnings" -- the same
// single-check shape every Motor Sizing Tool module already establishes).
//
// 0.2.0: the exceeded-case status changed from "fail" to "warning"
// (docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md
// "Inertia-ratio recommended default") -- inertia_ratio_maximum now
// resolves to a founder-directed recommended default (10) rather than a
// required no-default value, so exceeding it is advisory, not a hard
// failure. 0.1.0's own check (required input, "fail" on exceedance) is
// untouched.

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
