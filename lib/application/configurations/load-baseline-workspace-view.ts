// The `loadBaselineWorkspaceView` use case (Unit 3.8) â€” the configuration-
// level read model for creating and comparing immutable machine baselines.
//
// It composes existing services and repositories only: current-state
// readiness is an advisory preflight, `createBaseline` remains the atomic
// authority that re-evaluates readiness before persisting, and comparison is
// based exclusively on immutable baseline/run snapshots. No module is
// re-executed and no live configuration value is used to explain an already
// created baseline.

import "server-only";
import {
  evaluateBaselineReadiness,
  type BaselineAssemblyNode,
  type BaselineBlocker,
  type BaselineCalculationRunRef,
  type BaselineComparison,
  type BaselineComponentAssignment,
  type MachineBaselineSnapshot,
} from "@/lib/configuration";
import {
  asCalculationRunId,
  asMachineBaselineId,
  listComponentAssignmentsForConfiguration,
  listMachineBaselinesForConfiguration,
  loadCalculationRun,
  loadConfigurationForOwner,
  loadConfigurationTree,
  loadMachineBaseline,
  type AssemblyNode,
  type CalculationRunRecord,
  type MachineConfigurationId,
  type ModuleInstanceRecord,
  type UserId,
} from "@/lib/db";
import {
  compareStoredCalculationResults,
  type StoredRunCheckChange,
  type StoredRunOutputChange,
} from "./baseline-run-comparison";
import { compareBaselines } from "./compare-baselines";

/** A baseline list entry described for the client workspace. */
export interface BaselineListItemView {
  readonly id: string;
  readonly label: string;
  readonly createdByUserId: string | null;
  readonly createdAt: Date;
}

/** One output change sourced from two immutable calculation-run snapshots. */
export interface BaselineOutputChangeView extends StoredRunOutputChange {
  readonly moduleInstanceId: string;
  /** The module-instance label frozen in the selected baseline snapshots. */
  readonly moduleLabel: string;
}

/** One check change sourced from two immutable calculation-run snapshots. */
export interface BaselineCheckChangeView extends StoredRunCheckChange {
  readonly moduleInstanceId: string;
  /** The module-instance label frozen in the selected baseline snapshots. */
  readonly moduleLabel: string;
}

/** A run detail that could not be rendered, while its summary diff remains available. */
export interface BaselineRunDetailUnavailableView {
  readonly moduleInstanceId: string;
  readonly moduleLabel: string;
  readonly beforeRunId: string | null;
  readonly afterRunId: string | null;
  readonly message: string;
}

/** The fully described comparison selected in the baseline workspace. */
export interface BaselineComparisonView {
  readonly before: BaselineListItemView;
  readonly after: BaselineListItemView;
  /** Structural changes captured by `compareBaselineSnapshots`. */
  readonly comparison: BaselineComparison;
  /** Detailed diffs from the immutable runs pinned by the two baselines. */
  readonly changedOutputs: readonly BaselineOutputChangeView[];
  /** Detailed diffs from the immutable runs pinned by the two baselines. */
  readonly changedChecks: readonly BaselineCheckChangeView[];
  /** Rare degradation cases; never replaced with a recomputed calculation. */
  readonly unavailableRunDetails: readonly BaselineRunDetailUnavailableView[];
}

/** What the Unit 3.8 baseline workspace renders for one owned configuration. */
export interface BaselineWorkspaceView {
  readonly projectId: string;
  readonly configurationId: MachineConfigurationId;
  /** Current draft-state blockers that require acknowledgement before creation. */
  readonly blockers: readonly BaselineBlocker[];
  readonly baselines: readonly BaselineListItemView[];
  readonly selectedBeforeBaselineId: string | null;
  readonly selectedAfterBaselineId: string | null;
  readonly comparison: BaselineComparisonView | null;
  /** An invalid/partial selection is visible to the user instead of silently ignored. */
  readonly comparisonError: string | null;
}

/** Flattens a configuration tree to the module instances it contains. */
function collectModuleInstances(
  nodes: readonly AssemblyNode[],
): ModuleInstanceRecord[] {
  const result: ModuleInstanceRecord[] = [];
  const visit = (node: AssemblyNode): void => {
    result.push(...node.moduleInstances);
    for (const child of node.children) visit(child);
  };
  for (const node of nodes) visit(node);
  return result;
}

/** Loads each current module instance's pinned latest run, omitting a concurrent missing row. */
async function loadCurrentRunRefs(
  moduleInstances: readonly ModuleInstanceRecord[],
  ownerId: UserId,
): Promise<BaselineCalculationRunRef[]> {
  const runs = await Promise.all(
    moduleInstances.map(async (moduleInstance) => {
      if (moduleInstance.lastCalculationRunId === null) return null;
      return loadCalculationRun(
        asCalculationRunId(moduleInstance.lastCalculationRunId),
        ownerId,
      );
    }),
  );

  return runs
    .filter((run): run is CalculationRunRecord => run !== null)
    .map((run) => ({
      id: run.id,
      moduleInstanceId: run.moduleInstanceId,
      modulePackageId: run.modulePackageId,
      moduleVersion: run.moduleVersion,
      modulePackageHash: run.modulePackageHash,
      status: run.status,
      stale: run.stale,
    }));
}

function toBaselineAssignment(
  assignment: Awaited<
    ReturnType<typeof listComponentAssignmentsForConfiguration>
  >[number],
): BaselineComponentAssignment {
  return {
    id: assignment.id,
    targetKind: assignment.targetKind,
    moduleInstanceId: assignment.moduleInstanceId,
    assemblyId: assignment.assemblyId,
    partSource: assignment.partSource,
    manufacturerPartRevisionId: assignment.manufacturerPartRevisionId,
    manualPartDetails: assignment.manualPartDetails,
    quantity: assignment.quantity,
    calculationRunId: assignment.calculationRunId,
    stale: assignment.stale,
  };
}

/** Builds a frozen module-instance label map without querying the live tree. */
function moduleLabels(snapshot: MachineBaselineSnapshot): Map<string, string> {
  const labels = new Map<string, string>();
  const visit = (node: BaselineAssemblyNode): void => {
    for (const moduleInstance of node.moduleInstances) {
      labels.set(moduleInstance.id, moduleInstance.label);
    }
    for (const child of node.children) visit(child);
  };
  for (const assembly of snapshot.assemblies) visit(assembly);
  return labels;
}

function runComparisonInput(run: CalculationRunRecord) {
  return {
    id: run.id,
    outputs: run.snapshot.computation.outputs,
    checks: run.snapshot.computation.checks,
  };
}

/** Loads detailed output/check changes only for calculation runs that actually changed identity. */
async function describeRunDetails(
  comparison: BaselineComparison,
  beforeSnapshot: MachineBaselineSnapshot,
  afterSnapshot: MachineBaselineSnapshot,
  ownerId: UserId,
): Promise<{
  readonly changedOutputs: readonly BaselineOutputChangeView[];
  readonly changedChecks: readonly BaselineCheckChangeView[];
  readonly unavailableRunDetails: readonly BaselineRunDetailUnavailableView[];
}> {
  const beforeLabels = moduleLabels(beforeSnapshot);
  const afterLabels = moduleLabels(afterSnapshot);
  const changedOutputs: BaselineOutputChangeView[] = [];
  const changedChecks: BaselineCheckChangeView[] = [];
  const unavailableRunDetails: BaselineRunDetailUnavailableView[] = [];

  const runPairs = [
    ...comparison.calculationRuns.changed.map((change) => ({
      moduleInstanceId: change.after.moduleInstanceId,
      beforeRunId: change.before.id,
      afterRunId: change.after.id,
    })),
    ...comparison.calculationRuns.added.map((run) => ({
      moduleInstanceId: run.moduleInstanceId,
      beforeRunId: null,
      afterRunId: run.id,
    })),
    ...comparison.calculationRuns.removed.map((run) => ({
      moduleInstanceId: run.moduleInstanceId,
      beforeRunId: run.id,
      afterRunId: null,
    })),
  ];

  for (const runPair of runPairs) {
    // A same-ID diff can only be a captured status/stale-state change. Its
    // immutable computation payload cannot differ, so no output/check detail
    // should be invented for it.
    if (
      runPair.beforeRunId !== null &&
      runPair.afterRunId !== null &&
      runPair.beforeRunId === runPair.afterRunId
    ) {
      continue;
    }

    const moduleLabel =
      afterLabels.get(runPair.moduleInstanceId) ??
      beforeLabels.get(runPair.moduleInstanceId) ??
      runPair.moduleInstanceId;
    const [beforeRun, afterRun] = await Promise.all([
      runPair.beforeRunId === null
        ? Promise.resolve(null)
        : loadCalculationRun(asCalculationRunId(runPair.beforeRunId), ownerId),
      runPair.afterRunId === null
        ? Promise.resolve(null)
        : loadCalculationRun(asCalculationRunId(runPair.afterRunId), ownerId),
    ]);
    if (
      (runPair.beforeRunId !== null && beforeRun === null) ||
      (runPair.afterRunId !== null && afterRun === null)
    ) {
      unavailableRunDetails.push({
        moduleInstanceId: runPair.moduleInstanceId,
        moduleLabel,
        beforeRunId: runPair.beforeRunId,
        afterRunId: runPair.afterRunId,
        message:
          "A stored calculation run could not be loaded, so its output and check details are unavailable.",
      });
      continue;
    }

    const runDiff = compareStoredCalculationResults(
      beforeRun === null ? null : runComparisonInput(beforeRun),
      afterRun === null ? null : runComparisonInput(afterRun),
    );
    changedOutputs.push(
      ...runDiff.changedOutputs.map((change) => ({
        ...change,
        moduleInstanceId: runPair.moduleInstanceId,
        moduleLabel,
      })),
    );
    changedChecks.push(
      ...runDiff.changedChecks.map((change) => ({
        ...change,
        moduleInstanceId: runPair.moduleInstanceId,
        moduleLabel,
      })),
    );
  }

  return { changedOutputs, changedChecks, unavailableRunDetails };
}

/**
 * Loads the baseline workspace for an owned configuration. The optional
 * comparison IDs are deliberately accepted as raw query strings and checked
 * against this configuration's owned baseline list before being branded or
 * passed to `compareBaselines`; the UI therefore cannot silently compare an
 * unrelated configuration merely because a URL was edited by hand.
 */
export async function loadBaselineWorkspaceView(
  configurationId: MachineConfigurationId,
  ownerId: UserId,
  beforeBaselineId?: string,
  afterBaselineId?: string,
): Promise<BaselineWorkspaceView | null> {
  const context = await loadConfigurationForOwner(configurationId, ownerId);
  if (context === null) return null;

  const [tree, assignmentRecords, baselineRecords] = await Promise.all([
    loadConfigurationTree(configurationId, ownerId),
    listComponentAssignmentsForConfiguration(configurationId, ownerId),
    listMachineBaselinesForConfiguration(configurationId, ownerId),
  ]);
  if (tree === null) return null;

  const calculationRuns = await loadCurrentRunRefs(
    collectModuleInstances(tree.assemblies),
    ownerId,
  );
  const blockers = evaluateBaselineReadiness({
    calculationRuns,
    componentAssignments: assignmentRecords.map(toBaselineAssignment),
  }).blockers;
  const baselines: BaselineListItemView[] = baselineRecords.map((baseline) => ({
    id: baseline.id,
    label: baseline.label,
    createdByUserId: baseline.createdByUserId,
    createdAt: baseline.createdAt,
  }));
  const baselineById = new Map(
    baselines.map((baseline) => [baseline.id, baseline] as const),
  );
  const base = {
    projectId: context.project.id,
    configurationId,
    blockers,
    baselines,
    selectedBeforeBaselineId: beforeBaselineId ?? null,
    selectedAfterBaselineId: afterBaselineId ?? null,
  };

  if (beforeBaselineId === undefined && afterBaselineId === undefined) {
    return { ...base, comparison: null, comparisonError: null };
  }
  if (beforeBaselineId === undefined || afterBaselineId === undefined) {
    return {
      ...base,
      comparison: null,
      comparisonError:
        "Select both a before and an after baseline to compare them.",
    };
  }
  if (beforeBaselineId === afterBaselineId) {
    return {
      ...base,
      comparison: null,
      comparisonError: "Choose two different baselines to compare.",
    };
  }

  const before = baselineById.get(beforeBaselineId);
  const after = baselineById.get(afterBaselineId);
  if (before === undefined || after === undefined) {
    return {
      ...base,
      comparison: null,
      comparisonError: "Choose two baselines from the active configuration.",
    };
  }

  const comparisonResult = await compareBaselines(
    asMachineBaselineId(beforeBaselineId),
    asMachineBaselineId(afterBaselineId),
    ownerId,
  );
  if (!comparisonResult.ok) {
    return {
      ...base,
      comparison: null,
      comparisonError: comparisonResult.error.message,
    };
  }

  // `compareBaselines` owns the baseline-level authorization and structural
  // diff. We load the same owned immutable snapshots only to read the output
  // and check payloads that a baseline stores by run ID rather than copying.
  const [beforeRecord, afterRecord] = await Promise.all([
    loadMachineBaseline(asMachineBaselineId(beforeBaselineId), ownerId),
    loadMachineBaseline(asMachineBaselineId(afterBaselineId), ownerId),
  ]);
  if (beforeRecord === null || afterRecord === null) {
    return {
      ...base,
      comparison: null,
      comparisonError: "A selected baseline is no longer available.",
    };
  }
  const details = await describeRunDetails(
    comparisonResult.comparison,
    beforeRecord.snapshot,
    afterRecord.snapshot,
    ownerId,
  );

  return {
    ...base,
    comparison: {
      before,
      after,
      comparison: comparisonResult.comparison,
      ...details,
    },
    comparisonError: null,
  };
}
