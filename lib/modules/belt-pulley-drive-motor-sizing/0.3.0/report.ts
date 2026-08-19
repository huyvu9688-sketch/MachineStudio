// Generic report schema for belt-pulley-drive-motor-sizing 0.2.0. Declares
// the sections a report renders from the stored trace and computation
// (Unit 5.2); it never reimplements formulas. Unchanged shape from
// 0.1.0 -- new outputs and trace steps render inside the same sections.

import type { ModuleReportSchema } from "@/lib/engine";

export const reportSchema: ModuleReportSchema = {
  sections: [
    { id: "inputs", title: "Inputs", include: "inputs" },
    { id: "calc", title: "Calculation", include: "trace" },
    { id: "checks", title: "Checks", include: "checks" },
    {
      id: "results",
      title: "Required motor specification",
      include: "outputs",
    },
    { id: "assumptions", title: "Assumptions", include: "assumptions" },
  ],
};
