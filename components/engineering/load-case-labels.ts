import type { LoadCaseCategory } from "@/lib/engine";

/** Load-case display labels, shared by `module-input-workspace.tsx` and `link-suggestion-panel.tsx`. */
export const LOAD_CASE_LABELS: Record<LoadCaseCategory, string> = {
  normal: "Normal",
  peak: "Peak",
  holding: "Holding",
  emergency_stop: "Emergency stop",
};
