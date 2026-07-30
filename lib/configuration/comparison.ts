// Baseline comparison (Unit 2.9 part 1; implementation map "Baseline
// comparison", tested via "Comparison of changed values, results, and
// parts"). Pure diff of two `MachineBaselineSnapshot`s — no persistence, no
// re-execution (invariant "Trace-driven reporting" applied here too: a
// comparison reads two frozen snapshots, never recomputes anything).
//
// Most persisted categories this compares have no update path in `lib/db`
// today (a `Requirement`, `DesignAssumption`, `LoadCase`, `ParameterLink`, or
// `ComponentAssignment` row is created once and never edited — only created,
// and, for a `ComponentAssignment`, its `stale` flag flips in place). Two
// categories genuinely accrue new content over time at the same logical slot:
// a `ParameterValue` is append-only history (Unit 2.2/2.5) — the same graph
// node gets a new row each time its value changes — and a module instance's
// backing `CalculationRun` is a new row each execution. Diffing those two by
// their **logical slot** (graph node key / module instance id) rather than
// raw row id is what surfaces a real "the payload mass changed from 10 kg to
// 12 kg" or "the screw sizing module now has a different run" comparison,
// instead of a meaningless "row X removed, row Y added." Every other
// category is diffed by its own persisted `id`, which is exact for
// create-only data and still catches a `ComponentAssignment`'s `stale` flag
// changing between two baselines of the same id.

import { engineeringValuesEqual } from "../engine/values";
import type {
  BaselineAcceptanceCriterion,
  BaselineAssemblyNode,
  BaselineCalculationRunRef,
  BaselineComponentAssignment,
  BaselineDesignAssumption,
  BaselineLoadCase,
  BaselineModuleInstance,
  BaselineParameterLink,
  BaselineParameterValue,
  BaselineRequirement,
  MachineBaselineSnapshot,
} from "./types";

/** One item present in both snapshots but changed between them. */
export interface BaselineChange<T> {
  readonly id: string;
  readonly before: T;
  readonly after: T;
}

/** Added/removed/changed diff of one baseline category. */
export interface BaselineListDiff<T> {
  readonly added: readonly T[];
  readonly removed: readonly T[];
  readonly changed: readonly BaselineChange<T>[];
}

function diffByKey<T>(
  before: readonly T[],
  after: readonly T[],
  keyOf: (item: T) => string,
  equal: (a: T, b: T) => boolean,
): BaselineListDiff<T> {
  const beforeByKey = new Map(before.map((item) => [keyOf(item), item] as const));
  const afterByKey = new Map(after.map((item) => [keyOf(item), item] as const));
  const added: T[] = [];
  const removed: T[] = [];
  const changed: BaselineChange<T>[] = [];

  for (const [key, beforeItem] of beforeByKey) {
    const afterItem = afterByKey.get(key);
    if (afterItem === undefined) {
      removed.push(beforeItem);
    } else if (!equal(beforeItem, afterItem)) {
      changed.push({ id: key, before: beforeItem, after: afterItem });
    }
  }
  for (const [key, afterItem] of afterByKey) {
    if (!beforeByKey.has(key)) {
      added.push(afterItem);
    }
  }
  return { added, removed, changed };
}

// --- Per-category key/equality functions ----------------------------------

function acceptanceCriteriaEqual(
  a: readonly BaselineAcceptanceCriterion[],
  b: readonly BaselineAcceptanceCriterion[],
): boolean {
  if (a.length !== b.length) return false;
  const byId = new Map(a.map((c) => [c.id, c.statement]));
  return b.every((c) => byId.get(c.id) === c.statement);
}

function requirementsEqual(a: BaselineRequirement, b: BaselineRequirement): boolean {
  return (
    a.code === b.code &&
    a.statement === b.statement &&
    a.assemblyId === b.assemblyId &&
    acceptanceCriteriaEqual(a.acceptanceCriteria, b.acceptanceCriteria)
  );
}

function designAssumptionsEqual(
  a: BaselineDesignAssumption,
  b: BaselineDesignAssumption,
): boolean {
  return (
    a.statement === b.statement &&
    a.rationale === b.rationale &&
    a.assemblyId === b.assemblyId
  );
}

function loadCasesEqual(a: BaselineLoadCase, b: BaselineLoadCase): boolean {
  return a.category === b.category && a.label === b.label && a.description === b.description;
}

function parameterLinksEqual(a: BaselineParameterLink, b: BaselineParameterLink): boolean {
  return (
    a.sourceKind === b.sourceKind &&
    a.sourceModuleInstanceId === b.sourceModuleInstanceId &&
    a.sourceAssemblyId === b.sourceAssemblyId &&
    a.sourceParameterId === b.sourceParameterId &&
    a.sourceLoadCase === b.sourceLoadCase
  );
}

function calculationRunRefsEqual(
  a: BaselineCalculationRunRef,
  b: BaselineCalculationRunRef,
): boolean {
  return a.id === b.id && a.modulePackageHash === b.modulePackageHash &&
    a.status === b.status && a.stale === b.stale;
}

function manualPartDetailsEqual(
  a: BaselineComponentAssignment["manualPartDetails"],
  b: BaselineComponentAssignment["manualPartDetails"],
): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.description === b.description &&
    a.manufacturerName === b.manufacturerName &&
    a.partNumber === b.partNumber &&
    a.notes === b.notes
  );
}

function componentAssignmentsEqual(
  a: BaselineComponentAssignment,
  b: BaselineComponentAssignment,
): boolean {
  return (
    a.targetKind === b.targetKind &&
    a.moduleInstanceId === b.moduleInstanceId &&
    a.assemblyId === b.assemblyId &&
    a.partSource === b.partSource &&
    a.manufacturerPartRevisionId === b.manufacturerPartRevisionId &&
    manualPartDetailsEqual(a.manualPartDetails, b.manualPartDetails) &&
    a.quantity === b.quantity &&
    a.calculationRunId === b.calculationRunId &&
    a.stale === b.stale
  );
}

/**
 * The graph-node "slot" a `ParameterValue` occupies, independent of its row
 * id — mirrors `lib/db/repositories/graph-repository.ts`'s
 * `parameterGraphNodeId`, reimplemented locally so lib/configuration never
 * imports lib/db (this boundary stays pure and DB-free).
 */
function parameterValueNodeKey(value: BaselineParameterValue): string {
  const owner =
    value.moduleInstanceId !== null ? `m:${value.moduleInstanceId}` : `a:${value.assemblyId ?? "root"}`;
  return `${value.nodeKind}|${owner}|${value.parameterId}|${value.loadCase ?? ""}`;
}

function parameterValuesEqual(a: BaselineParameterValue, b: BaselineParameterValue): boolean {
  return a.source === b.source && engineeringValuesEqual(a.value, b.value);
}

// --- Assembly-tree flattening ----------------------------------------------

/** A flattened assembly-hierarchy node, structural fields only. */
export interface BaselineAssemblySummary {
  readonly id: string;
  readonly parentId: string | null;
  readonly name: string;
}

/** A flattened module instance, with the assembly it belongs to. */
export interface BaselineModuleInstanceSummary extends BaselineModuleInstance {
  readonly assemblyId: string;
}

function flattenAssemblies(nodes: readonly BaselineAssemblyNode[]): {
  readonly assemblies: readonly BaselineAssemblySummary[];
  readonly moduleInstances: readonly BaselineModuleInstanceSummary[];
} {
  const assemblies: BaselineAssemblySummary[] = [];
  const moduleInstances: BaselineModuleInstanceSummary[] = [];
  const visit = (node: BaselineAssemblyNode): void => {
    assemblies.push({ id: node.id, parentId: node.parentId, name: node.name });
    for (const moduleInstance of node.moduleInstances) {
      moduleInstances.push({ ...moduleInstance, assemblyId: node.id });
    }
    for (const child of node.children) visit(child);
  };
  for (const node of nodes) visit(node);
  return { assemblies, moduleInstances };
}

function assembliesEqual(a: BaselineAssemblySummary, b: BaselineAssemblySummary): boolean {
  return a.parentId === b.parentId && a.name === b.name;
}

function moduleInstancesEqual(
  a: BaselineModuleInstanceSummary,
  b: BaselineModuleInstanceSummary,
): boolean {
  return (
    a.assemblyId === b.assemblyId &&
    a.modulePackageId === b.modulePackageId &&
    a.moduleVersion === b.moduleVersion &&
    a.label === b.label &&
    a.workflowInstanceId === b.workflowInstanceId &&
    a.lastCalculationRunId === b.lastCalculationRunId &&
    a.lastRunStatus === b.lastRunStatus
  );
}

// --- Full comparison --------------------------------------------------------

/** The full structured diff between two baseline snapshots of the same configuration. */
export interface BaselineComparison {
  readonly requirements: BaselineListDiff<BaselineRequirement>;
  readonly designAssumptions: BaselineListDiff<BaselineDesignAssumption>;
  readonly loadCases: BaselineListDiff<BaselineLoadCase>;
  readonly assemblies: BaselineListDiff<BaselineAssemblySummary>;
  readonly moduleInstances: BaselineListDiff<BaselineModuleInstanceSummary>;
  /** Diffed by graph-node slot (see {@link parameterValueNodeKey}), not row id. */
  readonly parameterValues: BaselineListDiff<BaselineParameterValue>;
  readonly parameterLinks: BaselineListDiff<BaselineParameterLink>;
  /** Diffed by `moduleInstanceId` (the slot a run backs), not run id. */
  readonly calculationRuns: BaselineListDiff<BaselineCalculationRunRef>;
  readonly componentAssignments: BaselineListDiff<BaselineComponentAssignment>;
}

/**
 * Compares two `MachineBaselineSnapshot`s and returns a structured, per-category
 * added/removed/changed diff. Does not assume `before`/`after` are for the same
 * configuration or are chronologically ordered — the caller decides that.
 */
export function compareBaselineSnapshots(
  before: MachineBaselineSnapshot,
  after: MachineBaselineSnapshot,
): BaselineComparison {
  const beforeFlat = flattenAssemblies(before.assemblies);
  const afterFlat = flattenAssemblies(after.assemblies);

  return {
    requirements: diffByKey(before.requirements, after.requirements, (r) => r.id, requirementsEqual),
    designAssumptions: diffByKey(
      before.designAssumptions,
      after.designAssumptions,
      (a) => a.id,
      designAssumptionsEqual,
    ),
    loadCases: diffByKey(before.loadCases, after.loadCases, (l) => l.id, loadCasesEqual),
    assemblies: diffByKey(beforeFlat.assemblies, afterFlat.assemblies, (a) => a.id, assembliesEqual),
    moduleInstances: diffByKey(
      beforeFlat.moduleInstances,
      afterFlat.moduleInstances,
      (m) => m.id,
      moduleInstancesEqual,
    ),
    parameterValues: diffByKey(
      before.parameterValues,
      after.parameterValues,
      parameterValueNodeKey,
      parameterValuesEqual,
    ),
    parameterLinks: diffByKey(
      before.parameterLinks,
      after.parameterLinks,
      (l) => l.id,
      parameterLinksEqual,
    ),
    calculationRuns: diffByKey(
      before.calculationRuns,
      after.calculationRuns,
      (r) => r.moduleInstanceId,
      calculationRunRefsEqual,
    ),
    componentAssignments: diffByKey(
      before.componentAssignments,
      after.componentAssignments,
      (a) => a.id,
      componentAssignmentsEqual,
    ),
  };
}
