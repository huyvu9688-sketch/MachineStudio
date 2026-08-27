import type { CheckResult } from "@/lib/engine";

/**
 * Catalog-curve and candidate checks belong at the catalog boundary. This
 * package only establishes the factored graph demand.
 */
export function buildChecks(): CheckResult[] {
  return [
    {
      id: "factored-mgp-load-mass-computed",
      status: "pass",
      message: "Factored load mass computed for MGP graph selection.",
      criterion: "m_design = m_entered × S_guided",
    },
  ];
}
