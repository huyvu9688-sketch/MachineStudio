// Acceptance checks for the ball-screw-motor-sizing module. Only one real
// check exists in 0.1.0: the inertia ratio against an engineer-supplied
// maximum. Every other torque/speed/power figure is a reported required
// spec, not evaluated pass/fail -- this module takes no candidate motor's
// own rated/peak torque as an input to check against
// (stage-2-contract.md "Decisions" item 4; ADR-0011 "Output scope").

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
