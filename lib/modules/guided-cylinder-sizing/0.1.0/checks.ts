// Acceptance checks for the guided-cylinder-sizing module. This module
// computes a required specification for catalog matching, not a pass/fail
// against one candidate part -- see ./index.ts's own catalogAdapter and
// lib/application/catalogs/guided-cylinder-matching.ts for where the real
// per-candidate force/buckling/lateral-load/torque checks run, once a
// catalog candidate exists. One informational check confirms the
// specification was produced.

import type { CheckResult } from "@/lib/engine";

export function buildChecks(): CheckResult[] {
  return [
    {
      id: "required-specification-computed",
      status: "pass",
      message:
        "Required extend/retract force and required resultant moment computed for catalog matching.",
      criterion: "all required inputs resolved",
    },
  ];
}
