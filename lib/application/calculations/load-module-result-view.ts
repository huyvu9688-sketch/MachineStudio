// The `loadModuleResultView` use case (Unit 3.5) — the read model the
// generic result and trace renderer needs (context/implementation-map.md
// Unit 3.5: "Output summary", "Check table", "Warning/invalidity panel",
// "Expandable trace", "Source references", "Previous-run comparison",
// "Stale banner"; exit criterion: "The UI renders stored runs without
// importing module compute code").
//
// Performs no writes and no re-execution, like `loadModuleWorkspaceView`
// (Unit 3.3) — this reads the module instance's latest immutable
// `CalculationRun` snapshot (and, when one exists, the run immediately
// before it) and describes them for the renderer. Every output value,
// check, warning, assumption, and trace node already lives in the stored
// snapshot (`CalculationRunSnapshot.computation`, Unit 2.3); nothing here
// calls a module's `compute` function or imports `lib/modules` for
// anything but port/label metadata.
//
// Composes:
//   - lib/db — authorizes the owner, lists/loads calculation runs
//     (`listRunsForModuleInstance`/`loadCalculationRun`, Unit 2.3).
//   - lib/modules — loads the pinned package for its output ports (labels
//     only; never calls `compute`).
//   - lib/engine — the released parameter registry (output labels) and
//     `engineeringValuesEqual` (previous-run comparison).
//   - `./run-view-helpers` — port-value description and source-reference
//     resolution, shared verbatim with `loadModuleReportView` (Unit 5.2):
//     both describe the identical stored `ModuleComputation` shape. A
//     reference that fails to resolve (e.g. an old immutable run citing a
//     source ID this build no longer registers) is skipped rather than
//     failing the whole view — the same "degrade, don't crash on stored
//     data" posture `previewRemoveParameterLinkImpact` already established.

import "server-only";
import {
  engineeringValuesEqual,
  getParameter,
  type CalculationTrace,
  type CheckResult,
  type CheckStatus,
  type EngineeringValue,
  type LoadCaseCategory,
  type ValidityResult,
  type Warning,
} from "@/lib/engine";
import { getModulePackage } from "@/lib/modules";
import {
  collectClauseReferences,
  describePortValues,
  resolveSourceReferences,
  type PortShape,
  type PortValueView,
  type SourceReferenceView,
} from "./run-view-helpers";
import {
  loadCalculationRun,
  loadModuleInstanceForOwner,
  listRunsForModuleInstance,
  type AssemblyId,
  type CalculationRunId,
  type CalculationRunRecord,
  type MachineConfigurationId,
  type ModuleInstanceId,
  type UserId,
} from "@/lib/db";

/** One output value, described for display — no engine imports needed downstream. */
export type RunOutputView = PortValueView;

export type { SourceReferenceView };

/** One output that differs between the previous run and the latest run. */
export interface ChangedOutputView {
  readonly portKey: string;
  readonly label: string;
  readonly before: EngineeringValue;
  readonly after: EngineeringValue;
  readonly loadCase: LoadCaseCategory | null;
}

/** One check whose status differs between the previous run and the latest run. */
export interface ChangedCheckView {
  readonly id: string;
  readonly message: string;
  readonly before: CheckStatus;
  readonly after: CheckStatus;
}

/**
 * A diff against the run immediately before the latest one, for the same
 * module instance. `null` on {@link ModuleResultView.comparison} when fewer
 * than two runs exist — there is nothing to compare yet.
 */
export interface RunComparisonView {
  readonly previousRunId: CalculationRunId;
  readonly previousRunCreatedAt: Date;
  readonly changedOutputs: readonly ChangedOutputView[];
  readonly changedChecks: readonly ChangedCheckView[];
}

/** Summary header fields the result panel renders above the run detail. */
export interface ModuleResultRunSummary {
  readonly id: CalculationRunId;
  readonly status: CheckStatus;
  readonly criticalMargin: number | null;
  readonly stale: boolean;
  readonly staleReason: string | null;
  readonly createdAt: Date;
}

/** What the generic result and trace renderer needs for one module instance. */
export interface ModuleResultView {
  readonly moduleInstance: {
    readonly id: ModuleInstanceId;
    readonly assemblyId: AssemblyId;
    readonly configurationId: MachineConfigurationId;
    readonly label: string;
  };
  /** `null` when the module instance has never been run. */
  readonly run: ModuleResultRunSummary | null;
  readonly outputs: readonly RunOutputView[];
  readonly checks: readonly CheckResult[];
  readonly warnings: readonly Warning[];
  readonly validity: readonly ValidityResult[];
  readonly trace: CalculationTrace | null;
  readonly sources: readonly SourceReferenceView[];
  readonly comparison: RunComparisonView | null;
}

function compareRuns(
  ports: readonly PortShape[],
  before: CalculationRunRecord,
  after: CalculationRunRecord,
): RunComparisonView {
  const changedOutputs: ChangedOutputView[] = [];
  for (const port of ports) {
    const beforeValue = before.snapshot.computation.outputs[port.key];
    const afterValue = after.snapshot.computation.outputs[port.key];
    if (beforeValue === undefined || afterValue === undefined) continue;
    if (!engineeringValuesEqual(beforeValue, afterValue)) {
      changedOutputs.push({
        portKey: port.key,
        label: getParameter(port.parameterId)?.displayName ?? port.key,
        before: beforeValue,
        after: afterValue,
        loadCase: port.loadCase ?? null,
      });
    }
  }

  const beforeChecksById = new Map(
    before.snapshot.computation.checks.map((c) => [c.id, c]),
  );
  const changedChecks: ChangedCheckView[] = [];
  for (const check of after.snapshot.computation.checks) {
    const previous = beforeChecksById.get(check.id);
    if (previous !== undefined && previous.status !== check.status) {
      changedChecks.push({
        id: check.id,
        message: check.message,
        before: previous.status,
        after: check.status,
      });
    }
  }

  return {
    previousRunId: before.id,
    previousRunCreatedAt: before.createdAt,
    changedOutputs,
    changedChecks,
  };
}

/**
 * Loads the generic result and trace renderer's read model for
 * `moduleInstanceId`, scoped to `ownerId`. Returns `null` when the module
 * instance does not exist, is not owned by `ownerId`, or its pinned package
 * is not registered — the same "nothing real to render" outcome
 * `loadModuleWorkspaceView` returns for an unknown/foreign deep link.
 *
 * When the module instance has never been run, `run`/`trace`/`comparison`
 * are `null` and `outputs`/`checks`/`warnings`/`validity`/`sources` are
 * empty — a normal render (an empty result), not an error.
 */
export async function loadModuleResultView(
  moduleInstanceId: ModuleInstanceId,
  ownerId: UserId,
): Promise<ModuleResultView | null> {
  const context = await loadModuleInstanceForOwner(moduleInstanceId, ownerId);
  if (context === null) {
    return null;
  }
  const { moduleInstance } = context;

  const pkg = getModulePackage(
    moduleInstance.modulePackageId,
    moduleInstance.moduleVersion,
  );
  if (pkg === undefined) {
    return null;
  }

  const summaries = await listRunsForModuleInstance(moduleInstanceId, ownerId);
  const moduleInstanceView = {
    id: moduleInstance.id,
    assemblyId: moduleInstance.assemblyId,
    configurationId: moduleInstance.configurationId,
    label: moduleInstance.label,
  };

  const latestSummary = summaries[0];
  if (latestSummary === undefined) {
    return {
      moduleInstance: moduleInstanceView,
      run: null,
      outputs: [],
      checks: [],
      warnings: [],
      validity: [],
      trace: null,
      sources: [],
      comparison: null,
    };
  }

  const latest = await loadCalculationRun(latestSummary.id, ownerId);
  if (latest === null) {
    // A race with a concurrent delete between the list and the load — treat
    // it the same as "never run" rather than failing the view.
    return {
      moduleInstance: moduleInstanceView,
      run: null,
      outputs: [],
      checks: [],
      warnings: [],
      validity: [],
      trace: null,
      sources: [],
      comparison: null,
    };
  }

  const previousSummary = summaries[1];
  const previous =
    previousSummary !== undefined
      ? await loadCalculationRun(previousSummary.id, ownerId)
      : null;

  return {
    moduleInstance: moduleInstanceView,
    run: {
      id: latest.id,
      status: latest.status,
      criticalMargin: latest.criticalMargin,
      stale: latest.stale,
      staleReason: latest.staleReason,
      createdAt: latest.createdAt,
    },
    outputs: describePortValues(
      latest.snapshot.computation.outputs,
      pkg.ports.outputs,
    ),
    checks: latest.snapshot.computation.checks,
    warnings: latest.snapshot.computation.warnings,
    validity: latest.snapshot.computation.validity,
    trace: latest.snapshot.computation.trace,
    sources: resolveSourceReferences(
      collectClauseReferences(latest.snapshot.computation),
    ),
    comparison:
      previous !== null
        ? compareRuns(pkg.ports.outputs, previous, latest)
        : null,
  };
}
