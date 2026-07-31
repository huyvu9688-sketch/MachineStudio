import { overallCheckStatus, type CheckResult } from "@/lib/engine";
import type { AssemblyNode } from "@/lib/db";
import type { ModuleStatus } from "./status-badge";

/** Tallies of module-instance statuses across a configuration's assembly tree. */
export interface ModuleStatusSummary {
  readonly total: number;
  readonly pass: number;
  readonly fail: number;
  readonly warning: number;
  readonly notConfigured: number;
  readonly invalidInput: number;
  readonly notApplicable: number;
  /** Worst-case status across every module that has run at least once. */
  readonly overallStatus: ModuleStatus;
}

/**
 * Tallies module-instance statuses across a configuration's assembly tree,
 * for the status bar's "run status" / "failed checks" fields
 * (context/ui-context.md "Application Shell"). Pure display aggregation, not
 * an engineering calculation — it counts an already-computed enum rather
 * than evaluating anything (context/code-standards.md "Next.js": "React
 * components do not calculate engineering results"). Reuses the engine's own
 * `overallCheckStatus` severity ordering (`lib/engine/trace/checks.ts`)
 * rather than re-deriving it, restricted to modules that have actually run —
 * an un-run module is "not configured," not "not applicable."
 */
export function summarizeModuleStatuses(
  assemblies: readonly AssemblyNode[],
): ModuleStatusSummary {
  let total = 0;
  let pass = 0;
  let fail = 0;
  let warning = 0;
  let notConfigured = 0;
  let invalidInput = 0;
  let notApplicable = 0;
  const evaluated: CheckResult[] = [];

  const visit = (nodes: readonly AssemblyNode[]): void => {
    for (const node of nodes) {
      for (const moduleInstance of node.moduleInstances) {
        total += 1;
        const status = moduleInstance.lastRunStatus;
        if (status === null) {
          notConfigured += 1;
          continue;
        }
        evaluated.push({ id: moduleInstance.id, status, message: "" });
        switch (status) {
          case "pass":
            pass += 1;
            break;
          case "fail":
            fail += 1;
            break;
          case "warning":
            warning += 1;
            break;
          case "invalid_input":
            invalidInput += 1;
            break;
          case "not_applicable":
            notApplicable += 1;
            break;
        }
      }
      visit(node.children);
    }
  };
  visit(assemblies);

  return {
    total,
    pass,
    fail,
    warning,
    notConfigured,
    invalidInput,
    notApplicable,
    overallStatus: evaluated.length === 0 ? "not_configured" : overallCheckStatus(evaluated),
  };
}
