// Generic report schema for the direct-drive-conveyor-motor-sizing module.
// Declares the sections a report renders from the stored trace and
// computation (Unit 5.2); it never reimplements formulas.

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
