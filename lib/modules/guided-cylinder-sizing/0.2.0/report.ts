import type { ModuleReportSchema } from "@/lib/engine";

export const reportSchema: ModuleReportSchema = {
  sections: [
    { id: "inputs", title: "Inputs", include: "inputs" },
    { id: "calculation", title: "Calculation", include: "trace" },
    { id: "results", title: "MGP graph demand", include: "outputs" },
    { id: "checks", title: "Checks", include: "checks" },
    { id: "assumptions", title: "Assumptions", include: "assumptions" },
  ],
};
