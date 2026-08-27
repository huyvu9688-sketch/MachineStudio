// Generic report schema for the dual-rod-cylinder-sizing module.
// Declares the sections a report renders from the stored trace and
// computation; it never reimplements formulas.

import type { ModuleReportSchema } from "@/lib/engine";

export const reportSchema: ModuleReportSchema = {
  sections: [
    { id: "inputs", title: "Inputs", include: "inputs" },
    { id: "calc", title: "Calculation", include: "trace" },
    { id: "results", title: "Required specification", include: "outputs" },
    { id: "assumptions", title: "Assumptions", include: "assumptions" },
  ],
};
