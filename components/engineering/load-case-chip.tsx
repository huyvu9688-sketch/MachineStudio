import { LOAD_CASE_LABELS } from "./load-case-labels";
import type { LoadCaseCategory } from "@/lib/engine";

/**
 * Load-case context chip (ui-context.md "Generic Module Workspace": "Load-case
 * and coordinate-frame context"). Shared by `module-input-workspace.tsx` (an
 * input field's load case) and `module-result-panel.tsx` (an output port's
 * load case) — extracted here rather than duplicated a second time, the same
 * "shared module, not a second copy" call `load-case-labels.ts` itself and
 * `format-engineering-value.ts` already made.
 */
export function LoadCaseChip({
  loadCase,
}: {
  readonly loadCase: LoadCaseCategory;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium"
      style={{
        color: "var(--state-info)",
        backgroundColor: "rgba(29, 78, 216, 0.08)",
      }}
    >
      {LOAD_CASE_LABELS[loadCase]} load case
    </span>
  );
}
