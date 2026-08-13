// The `exportAccountData` use case (Unit 5.5, "Data export and account
// deletion path" — context/implementation-map.md Unit 5.5). Gives an owner
// everything MachineStudio stores about them, scoped by the same ownership
// chain every other read in this codebase already enforces (project ->
// configuration -> assembly -> module instance), by composing existing
// repository reads rather than a new bespoke query.
//
// This walks every owned project, and within each configuration fetches
// requirements/assumptions/load cases/parameter values/links/component
// assignments/baselines, plus every calculation run's own full immutable
// snapshot (not just its search summary) for every module instance — the
// same snapshot a report renders from, given back raw rather than
// re-rendered, since this is "what we stored," not a formatted document.
// lib/reports already owns rendering; this is not that.
//
// Deliberately not optimized: an export is a rare, owner-initiated action,
// not a hot path, so this issues one query per configuration-scoped entity
// list and one per module instance's run history rather than a single
// hand-tuned join. If a real account ever has enough projects for this to
// matter, that is a future performance concern, not a Unit 5.5 blocker.

import "server-only";
import {
  listProjectsByOwner,
  loadProjectTree,
  listRequirements,
  listDesignAssumptions,
  listLoadCases,
  listCurrentParameterValuesForConfiguration,
  listParameterLinksForConfiguration,
  listComponentAssignmentsForConfiguration,
  listMachineBaselinesForConfiguration,
  listRunsForModuleInstance,
  loadCalculationRun,
  listAuditEventsForProject,
  type AssemblyNode,
  type AuditEventRecord,
  type CalculationRunSnapshot,
  type ComponentAssignmentRecord,
  type DesignAssumptionRecord,
  type LoadCaseRecord,
  type MachineBaselineSummary,
  type ModuleInstanceRecord,
  type ParameterLinkRecord,
  type ParameterValueRecord,
  type ProjectTree,
  type RequirementNode,
  type UserId,
} from "@/lib/db";

/** One calculation run, given back as its full stored snapshot. */
export interface ExportedCalculationRun {
  readonly id: string;
  readonly snapshot: CalculationRunSnapshot;
}

/** One module instance's own run history, each run given back as its full stored snapshot. */
export interface ExportedModuleInstanceRuns {
  readonly moduleInstance: ModuleInstanceRecord;
  readonly runs: readonly ExportedCalculationRun[];
}

/** Everything owned within one `MachineConfiguration`, beyond its structural tree. */
export interface ExportedConfigurationData {
  readonly configurationId: string;
  readonly requirements: readonly RequirementNode[];
  readonly designAssumptions: readonly DesignAssumptionRecord[];
  readonly loadCases: readonly LoadCaseRecord[];
  readonly parameterValues: readonly ParameterValueRecord[];
  readonly parameterLinks: readonly ParameterLinkRecord[];
  readonly componentAssignments: readonly ComponentAssignmentRecord[];
  readonly baselines: readonly MachineBaselineSummary[];
  readonly moduleRuns: readonly ExportedModuleInstanceRuns[];
}

/** One owned project: its structural tree plus every configuration's own data. */
export interface ExportedProjectData {
  readonly tree: ProjectTree;
  readonly configurations: readonly ExportedConfigurationData[];
  readonly auditEvents: readonly AuditEventRecord[];
}

/** The full account export: every project the caller owns. */
export interface AccountDataExport {
  readonly exportedAt: string;
  readonly userId: string;
  readonly projects: readonly ExportedProjectData[];
}

function collectModuleInstances(
  assemblies: readonly AssemblyNode[],
): ModuleInstanceRecord[] {
  const instances: ModuleInstanceRecord[] = [];
  function visit(node: AssemblyNode): void {
    instances.push(...node.moduleInstances);
    node.children.forEach(visit);
  }
  assemblies.forEach(visit);
  return instances;
}

async function exportModuleInstanceRuns(
  moduleInstance: ModuleInstanceRecord,
  ownerId: UserId,
): Promise<ExportedModuleInstanceRuns> {
  const summaries = await listRunsForModuleInstance(moduleInstance.id, ownerId);
  const runs: ExportedCalculationRun[] = [];
  for (const summary of summaries) {
    const record = await loadCalculationRun(summary.id, ownerId);
    if (record !== null) {
      runs.push({ id: record.id, snapshot: record.snapshot });
    }
  }
  return { moduleInstance, runs };
}

async function exportConfiguration(
  tree: ProjectTree["configurations"][number],
  ownerId: UserId,
): Promise<ExportedConfigurationData> {
  const configurationId = tree.id;
  const [
    requirements,
    designAssumptions,
    loadCases,
    parameterValues,
    parameterLinks,
    componentAssignments,
    baselines,
  ] = await Promise.all([
    listRequirements(configurationId, ownerId),
    listDesignAssumptions(configurationId, ownerId),
    listLoadCases(configurationId, ownerId),
    listCurrentParameterValuesForConfiguration(configurationId, ownerId),
    listParameterLinksForConfiguration(configurationId, ownerId),
    listComponentAssignmentsForConfiguration(configurationId, ownerId),
    listMachineBaselinesForConfiguration(configurationId, ownerId),
  ]);

  const moduleInstances = collectModuleInstances(tree.assemblies);
  const moduleRuns = await Promise.all(
    moduleInstances.map((instance) =>
      exportModuleInstanceRuns(instance, ownerId),
    ),
  );

  return {
    configurationId,
    requirements,
    designAssumptions,
    loadCases,
    parameterValues,
    parameterLinks,
    componentAssignments,
    baselines,
    moduleRuns,
  };
}

/**
 * Assembles a complete export of every project `ownerId` owns: the full
 * structural tree plus every configuration's requirements, assumptions,
 * load cases, parameter values/links, component assignments, baselines, and
 * every module instance's own complete calculation-run history. Shared
 * catalog reference data (manufacturers, part revisions — no owner to scope
 * by, context/code-standards.md "Catalog") is intentionally excluded; a
 * `ComponentAssignment`'s own `manufacturerPartRevisionId` still identifies
 * which part was assigned.
 */
export async function exportAccountData(
  ownerId: UserId,
): Promise<AccountDataExport> {
  const projects = await listProjectsByOwner(ownerId);

  const exported: ExportedProjectData[] = [];
  for (const project of projects) {
    const tree = await loadProjectTree(project.id, ownerId);
    if (tree === null) {
      // Ownership already passed above (listProjectsByOwner is itself
      // owner-scoped); this would only happen on a race with a concurrent
      // delete between the two reads.
      continue;
    }
    const configurations = await Promise.all(
      tree.configurations.map((config) => exportConfiguration(config, ownerId)),
    );
    const auditEvents = await listAuditEventsForProject(project.id, ownerId);
    exported.push({ tree, configurations, auditEvents });
  }

  return {
    exportedAt: new Date().toISOString(),
    userId: ownerId,
    projects: exported,
  };
}
