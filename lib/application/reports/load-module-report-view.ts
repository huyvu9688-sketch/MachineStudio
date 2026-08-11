// The `loadModuleReportView` use case (Unit 5.2: "Module and assembly report
// renderer"). Assembles everything one module instance's printable
// calculation report needs — inputs, active load case, assumptions,
// outputs, checks/margins, warnings, validity limits, the calculation
// trace, source references, assigned parts, and stale state — entirely
// from the module instance's latest immutable `CalculationRun` snapshot
// plus its `ComponentAssignment` rows. It never calls a module's `compute`
// function (context/implementation-map.md Unit 5.2 rule: "The renderer
// receives stored trace data; it does not import module formulas"), so a
// stored historical run renders identically after the module package that
// produced it is superseded by a newer version (Unit 5.2 exit criterion).
//
// Shares its port-value description and source-reference resolution with
// `loadModuleResultView` (Unit 3.5) via `../calculations/run-view-helpers`
// — both describe the exact same stored `ModuleComputation` shape.
//
// Assigned-part resolution mirrors `loadBomView`'s own `describeBomItem`
// (lib/application/reports/load-bom-view.ts) — same manufacturer-name
// memoization, same "a dangling part revision degrades to a plain
// description rather than failing the whole view" treatment — duplicated
// rather than imported, since that function is private to a different view
// shape (a whole configuration's BOM tree vs. one module's own assignment
// list), the same "two call sites this different" reasoning that file's own
// header already documents.

import "server-only";
import {
  type CalculationTrace,
  type CheckResult,
  type CheckStatus,
  type EngineeringValue,
  type ValidityResult,
  type Warning,
} from "@/lib/engine";
import { getModulePackage } from "@/lib/modules";
import {
  collectClauseReferences,
  describePortValues,
  resolveSourceReferences,
  type PortValueView,
  type SourceReferenceView,
} from "../calculations/run-view-helpers";
import {
  listComponentAssignmentsForModuleInstance,
  listLoadCases,
  listRunsForModuleInstance,
  loadCalculationRun,
  loadManufacturer,
  loadManufacturerPartRevision,
  loadModuleInstanceForOwner,
  type AssemblyId,
  type ComponentAssignmentRecord,
  type MachineConfigurationId,
  type ModuleInstanceId,
  type UserId,
} from "@/lib/db";

export type { PortValueView };

/** One assumption relied upon by the run, with its citations resolved for display. */
export interface AssumptionView {
  readonly id: string;
  readonly statement: string;
  readonly value: EngineeringValue | null;
  readonly sources: readonly SourceReferenceView[];
}

/** The `LoadCase` a run was computed against, resolved from `CalculationRunSnapshot.input.loadCaseId`. */
export interface ReportLoadCaseView {
  readonly id: string;
  readonly category: string;
  readonly label: string;
  readonly description: string | null;
}

/** One assigned part on this module instance, described for the report — a scoped-down `BomItem` (lib/application/reports/load-bom-view.ts). */
export interface ReportAssignedPartView {
  readonly id: string;
  readonly partSource: "catalog" | "manual";
  readonly description: string;
  readonly manufacturerName: string | null;
  readonly partNumber: string | null;
  readonly sourceRevision: string | null;
  readonly notes: string | null;
  readonly quantity: number;
  readonly stale: boolean;
  readonly staleReason: string | null;
}

/** Run summary fields the report header and footer render, including the version pins that make the run reproducible. */
export interface ModuleReportRunView {
  readonly id: string;
  readonly status: CheckStatus;
  readonly criticalMargin: number | null;
  readonly stale: boolean;
  readonly staleReason: string | null;
  readonly createdAt: Date;
  readonly engineSdkVersion: string;
  readonly modulePackageHash: string;
  readonly parameterRegistryVersion: string;
}

/** What the printable module report renderer needs for one module instance. */
export interface ModuleReportView {
  readonly moduleInstance: {
    readonly id: ModuleInstanceId;
    readonly assemblyId: AssemblyId;
    readonly configurationId: MachineConfigurationId;
    readonly label: string;
    readonly modulePackageId: string;
    readonly moduleVersion: string;
  };
  /** `null` when the module instance has never been run. */
  readonly run: ModuleReportRunView | null;
  readonly inputs: readonly PortValueView[];
  readonly outputs: readonly PortValueView[];
  readonly checks: readonly CheckResult[];
  readonly warnings: readonly Warning[];
  readonly validity: readonly ValidityResult[];
  readonly trace: CalculationTrace | null;
  readonly assumptions: readonly AssumptionView[];
  /** The run's own active load case, when `CalculationRunSnapshot.input.loadCaseId` names one this configuration still defines. */
  readonly activeLoadCase: ReportLoadCaseView | null;
  readonly sources: readonly SourceReferenceView[];
  readonly assignedParts: readonly ReportAssignedPartView[];
}

/** Resolves one `ComponentAssignmentRecord` into a `ReportAssignedPartView`. Mirrors `loadBomView`'s `describeBomItem` — see this file's header. */
async function describeAssignedPart(
  assignment: ComponentAssignmentRecord,
  manufacturerNames: Map<string, string>,
): Promise<ReportAssignedPartView> {
  let manufacturerName: string | null = null;
  let partNumber: string | null = null;
  let sourceRevision: string | null = null;
  let notes: string | null = null;
  let description: string;

  if (assignment.partSource === "catalog") {
    const revision =
      assignment.manufacturerPartRevisionId !== null
        ? await loadManufacturerPartRevision(
            assignment.manufacturerPartRevisionId,
          )
        : null;
    if (revision !== null) {
      let name = manufacturerNames.get(revision.manufacturerId);
      if (name === undefined) {
        const manufacturer = await loadManufacturer(revision.manufacturerId);
        name = manufacturer?.name ?? revision.manufacturerId;
        manufacturerNames.set(revision.manufacturerId, name);
      }
      manufacturerName = name;
      partNumber = revision.partNumber;
      sourceRevision = revision.sourceRevision;
      description = `${name} ${revision.partNumber}`;
    } else {
      // Part revisions are write-once and not deleted in normal operation
      // (ADR-0006); a dangling reference degrades to a plain notice rather
      // than failing the whole report.
      description = "Catalog part (revision no longer resolves)";
    }
  } else {
    const details = assignment.manualPartDetails;
    description = details?.description ?? "Manual part";
    manufacturerName = details?.manufacturerName ?? null;
    partNumber = details?.partNumber ?? null;
    notes = details?.notes ?? null;
  }

  return {
    id: assignment.id,
    partSource: assignment.partSource,
    description,
    manufacturerName,
    partNumber,
    sourceRevision,
    notes,
    quantity: assignment.quantity,
    stale: assignment.stale,
    staleReason: assignment.staleReason,
  };
}

const EMPTY_RUN_FIELDS = {
  run: null,
  inputs: [],
  outputs: [],
  checks: [],
  warnings: [],
  validity: [],
  trace: null,
  assumptions: [],
  activeLoadCase: null,
  sources: [],
  assignedParts: [],
} as const;

/**
 * Loads the printable calculation report read model for `moduleInstanceId`,
 * scoped to `ownerId`. Returns `null` when the module instance does not
 * exist, is not owned by `ownerId`, or its pinned package is not registered
 * — the same "nothing real to render" outcome `loadModuleResultView`
 * returns for an unknown/foreign deep link.
 *
 * When the module instance has never been run, every run-derived field is
 * empty/`null` (including `assignedParts` — a `module_instance`-targeted
 * assignment requires a supporting run, so none can exist yet) rather than
 * an error.
 */
export async function loadModuleReportView(
  moduleInstanceId: ModuleInstanceId,
  ownerId: UserId,
): Promise<ModuleReportView | null> {
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

  const moduleInstanceView = {
    id: moduleInstance.id,
    assemblyId: moduleInstance.assemblyId,
    configurationId: moduleInstance.configurationId,
    label: moduleInstance.label,
    modulePackageId: moduleInstance.modulePackageId,
    moduleVersion: moduleInstance.moduleVersion,
  };

  const summaries = await listRunsForModuleInstance(moduleInstanceId, ownerId);
  const latestSummary = summaries[0];
  if (latestSummary === undefined) {
    return { moduleInstance: moduleInstanceView, ...EMPTY_RUN_FIELDS };
  }

  const latest = await loadCalculationRun(latestSummary.id, ownerId);
  if (latest === null) {
    // A race with a concurrent delete between the list and the load — treat
    // it the same as "never run" rather than failing the report.
    return { moduleInstance: moduleInstanceView, ...EMPTY_RUN_FIELDS };
  }

  const { computation, input, versions } = latest.snapshot;

  let activeLoadCase: ReportLoadCaseView | null = null;
  if (input.loadCaseId !== undefined) {
    const loadCases = await listLoadCases(
      moduleInstance.configurationId,
      ownerId,
    );
    const match = loadCases.find((lc) => lc.id === input.loadCaseId);
    if (match !== undefined) {
      activeLoadCase = {
        id: match.id,
        category: match.category,
        label: match.label,
        description: match.description,
      };
    }
  }

  const assumptions: AssumptionView[] = computation.assumptions.map(
    (assumption) => ({
      id: assumption.id,
      statement: assumption.statement,
      value: assumption.value ?? null,
      sources: resolveSourceReferences(assumption.sources ?? []),
    }),
  );

  const assignmentRecords = await listComponentAssignmentsForModuleInstance(
    moduleInstanceId,
    ownerId,
  );
  const manufacturerNames = new Map<string, string>();
  const assignedParts: ReportAssignedPartView[] = [];
  for (const record of assignmentRecords) {
    assignedParts.push(await describeAssignedPart(record, manufacturerNames));
  }

  return {
    moduleInstance: moduleInstanceView,
    run: {
      id: latest.id,
      status: latest.status,
      criticalMargin: latest.criticalMargin,
      stale: latest.stale,
      staleReason: latest.staleReason,
      createdAt: latest.createdAt,
      engineSdkVersion: versions.engineSdkVersion,
      modulePackageHash: versions.modulePackageHash,
      parameterRegistryVersion: versions.parameterRegistryVersion,
    },
    inputs: describePortValues(input.values, pkg.ports.inputs),
    outputs: describePortValues(computation.outputs, pkg.ports.outputs),
    checks: computation.checks,
    warnings: computation.warnings,
    validity: computation.validity,
    trace: computation.trace,
    assumptions,
    activeLoadCase,
    sources: resolveSourceReferences(collectClauseReferences(computation)),
    assignedParts,
  };
}
