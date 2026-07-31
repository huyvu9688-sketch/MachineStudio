// Pure, stored-run comparison support for the Unit 3.8 baseline workspace.
//
// A MachineBaseline snapshot pins calculation-run IDs, rather than copying a
// second copy of every immutable run snapshot. This helper compares the
// outputs and checks from two of those pinned runs. It deliberately accepts
// only stored output/check data: callers must load immutable CalculationRun
// snapshots and must never re-execute a module to populate a baseline diff.

import {
  engineeringValuesEqual,
  type EngineeringValue,
} from "@/lib/engine/values";
import type { CheckResult } from "@/lib/engine/trace";

/** The immutable portion of a stored calculation run needed for a baseline comparison. */
export interface StoredCalculationResultForComparison {
  readonly id: string;
  readonly outputs: Readonly<Record<string, EngineeringValue>>;
  readonly checks: readonly CheckResult[];
}

/** One output added, removed, or changed between two immutable calculation runs. */
export interface StoredRunOutputChange {
  readonly portKey: string;
  /** `null` when the output did not exist in the earlier run. */
  readonly before: EngineeringValue | null;
  /** `null` when the output no longer exists in the later run. */
  readonly after: EngineeringValue | null;
}

/** One check added, removed, or changed between two immutable calculation runs. */
export interface StoredRunCheckChange {
  readonly id: string;
  /** A stable display message from the later check when available. */
  readonly message: string;
  /** `null` when the check did not exist in the earlier run. */
  readonly before: CheckResult | null;
  /** `null` when the check no longer exists in the later run. */
  readonly after: CheckResult | null;
}

/** Detailed output/check changes for one module instance's two pinned runs. */
export interface StoredCalculationResultComparison {
  readonly beforeRunId: string | null;
  readonly afterRunId: string | null;
  readonly changedOutputs: readonly StoredRunOutputChange[];
  readonly changedChecks: readonly StoredRunCheckChange[];
}

function optionalEngineeringValuesEqual(
  before: EngineeringValue | undefined,
  after: EngineeringValue | undefined,
): boolean {
  if (before === undefined || after === undefined) return before === after;
  return engineeringValuesEqual(before, after);
}

/**
 * Source citations are part of a stored check's engineering provenance. Their
 * array order is not meaningful, so compare a stable normalized projection
 * and treat an absent list like an empty list.
 */
function sourcesEqual(
  before: CheckResult["sources"],
  after: CheckResult["sources"],
): boolean {
  const normalize = (sources: CheckResult["sources"]): string[] =>
    (sources ?? [])
      .map((source) =>
        [
          source.sourceRevisionId,
          source.clause ?? "",
          source.page ?? "",
          source.label ?? "",
        ].join("\u0000"),
      )
      .sort();
  const normalizedBefore = normalize(before);
  const normalizedAfter = normalize(after);
  return (
    normalizedBefore.length === normalizedAfter.length &&
    normalizedBefore.every((source, index) => source === normalizedAfter[index])
  );
}

function checksEqual(before: CheckResult, after: CheckResult): boolean {
  return (
    before.status === after.status &&
    before.message === after.message &&
    before.criterion === after.criterion &&
    optionalEngineeringValuesEqual(before.observed, after.observed) &&
    optionalEngineeringValuesEqual(before.allowable, after.allowable) &&
    optionalEngineeringValuesEqual(before.margin, after.margin) &&
    sourcesEqual(before.sources, after.sources)
  );
}

/**
 * Compares output and check payloads from two immutable stored runs. Output
 * ports and check IDs that occur in only one run are reported as added or
 * removed, so a later module-version change is visible rather than silently
 * excluded. Results are key-sorted for deterministic rendering and tests.
 */
export function compareStoredCalculationResults(
  before: StoredCalculationResultForComparison | null,
  after: StoredCalculationResultForComparison | null,
): StoredCalculationResultComparison {
  const beforeOutputs = before?.outputs ?? {};
  const afterOutputs = after?.outputs ?? {};
  const outputKeys = [
    ...new Set([...Object.keys(beforeOutputs), ...Object.keys(afterOutputs)]),
  ].sort();
  const changedOutputs: StoredRunOutputChange[] = [];
  for (const portKey of outputKeys) {
    const beforeValue = beforeOutputs[portKey];
    const afterValue = afterOutputs[portKey];
    if (!optionalEngineeringValuesEqual(beforeValue, afterValue)) {
      changedOutputs.push({
        portKey,
        before: beforeValue ?? null,
        after: afterValue ?? null,
      });
    }
  }

  const beforeChecks = new Map(
    (before?.checks ?? []).map((check) => [check.id, check] as const),
  );
  const afterChecks = new Map(
    (after?.checks ?? []).map((check) => [check.id, check] as const),
  );
  const checkIds = [
    ...new Set([...beforeChecks.keys(), ...afterChecks.keys()]),
  ].sort();
  const changedChecks: StoredRunCheckChange[] = [];
  for (const id of checkIds) {
    const beforeCheck = beforeChecks.get(id);
    const afterCheck = afterChecks.get(id);
    if (
      beforeCheck === undefined ||
      afterCheck === undefined ||
      !checksEqual(beforeCheck, afterCheck)
    ) {
      changedChecks.push({
        id,
        message: afterCheck?.message ?? beforeCheck?.message ?? id,
        before: beforeCheck ?? null,
        after: afterCheck ?? null,
      });
    }
  }

  return {
    beforeRunId: before?.id ?? null,
    afterRunId: after?.id ?? null,
    changedOutputs,
    changedChecks,
  };
}
