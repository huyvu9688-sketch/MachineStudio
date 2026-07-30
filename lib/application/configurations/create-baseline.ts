// The `createBaseline` use case (Unit 2.9 part 2) — the persistence and
// orchestration half of baseline creation (context/architecture.md
// "lib/application/": "Create baselines"). Composes:
//
//   - lib/configuration (part 1) — the pure `MachineBaselineSnapshot`
//     contract, `evaluateBaselineReadiness` (the "Baseline creation checks"
//     deliverable).
//   - lib/db — authorizes the configuration, reads every domain record the
//     snapshot freezes, and persists the baseline.
//
// Steps: (1) authorize the configuration owner; (2) load the configuration's
// full current state (requirements, assumptions, load cases, assembly/module
// tree, current parameter values and links, each module's latest
// calculation run, component assignments); (3) assemble the immutable
// `MachineBaselineSnapshot`; (4) evaluate creation readiness — block with the
// found issues unless `input.acknowledgeWarnings` is set; (5) persist the
// baseline and append an audit event atomically (context/code-standards.md
// "Application Services").

import "server-only";
import {
  BASELINE_SNAPSHOT_FORMAT_VERSION,
  evaluateBaselineReadiness,
  type BaselineAssemblyNode,
  type BaselineBlocker,
  type BaselineCalculationRunRef,
  type BaselineComponentAssignment,
  type BaselineDesignAssumption,
  type BaselineLoadCase,
  type BaselineModuleInstance,
  type BaselineParameterLink,
  type BaselineParameterValue,
  type BaselineRequirement,
  type MachineBaselineSnapshot,
} from "@/lib/configuration";
import {
  appendAuditEvent,
  asCalculationRunId,
  createMachineBaseline,
  listComponentAssignmentsForConfiguration,
  listCurrentParameterValuesForConfiguration,
  listDesignAssumptions,
  listLoadCases,
  listParameterLinksForConfiguration,
  listRequirements,
  loadCalculationRun,
  loadConfigurationForOwner,
  loadConfigurationTree,
  prisma,
  BaselineRepositoryError,
  type AssemblyNode,
  type DbClient,
  type MachineBaselineRecord,
  type MachineConfigurationId,
  type ModuleInstanceRecord,
  type UserId,
} from "@/lib/db";

/** Input to {@link createBaseline}. */
export interface CreateBaselineInput {
  readonly configurationId: MachineConfigurationId;
  /** Human-readable label shown in the baseline list, e.g. "Design review 1". */
  readonly label: string;
  /**
   * When `true`, proceed even though `evaluateBaselineReadiness` found stale
   * or failed items — the caller has already shown the user the blockers
   * (Unit 3.8's validation summary) and the user chose to proceed. Defaults
   * to `false`.
   */
  readonly acknowledgeWarnings?: boolean;
}

/** Machine-readable classification of a `createBaseline` failure. */
export type CreateBaselineErrorCode = "unauthorized" | "not_ready" | "invalid_input";

/** A failed {@link createBaseline} outcome. */
export interface CreateBaselineError {
  readonly code: CreateBaselineErrorCode;
  readonly message: string;
  /** Populated only for `not_ready` — the blockers the caller must show/acknowledge. */
  readonly blockers?: readonly BaselineBlocker[];
}

/**
 * Result of {@link createBaseline} — a discriminated success/error result
 * (context/code-standards.md "Prefer discriminated unions ... for result
 * states"), not a throw, so a route handler renders either outcome without a
 * try/catch for expected domain failures.
 */
export type CreateBaselineResult =
  | { readonly ok: true; readonly baseline: MachineBaselineRecord }
  | { readonly ok: false; readonly error: CreateBaselineError };

function toBaselineModuleInstance(m: ModuleInstanceRecord): BaselineModuleInstance {
  return {
    id: m.id,
    modulePackageId: m.modulePackageId,
    moduleVersion: m.moduleVersion,
    label: m.label,
    workflowInstanceId: m.workflowInstanceId,
    lastCalculationRunId: m.lastCalculationRunId,
    lastRunStatus: m.lastRunStatus,
  };
}

function toBaselineAssemblyNode(node: AssemblyNode): BaselineAssemblyNode {
  return {
    id: node.id,
    parentId: node.parentId,
    name: node.name,
    moduleInstances: node.moduleInstances.map(toBaselineModuleInstance),
    children: node.children.map(toBaselineAssemblyNode),
  };
}

/** Flattens the nested assembly forest into every module instance it contains. */
function collectModuleInstances(nodes: readonly AssemblyNode[]): ModuleInstanceRecord[] {
  const result: ModuleInstanceRecord[] = [];
  const visit = (node: AssemblyNode): void => {
    result.push(...node.moduleInstances);
    for (const child of node.children) visit(child);
  };
  for (const node of nodes) visit(node);
  return result;
}

/**
 * Loads the calculation-run reference for every module instance that has run
 * at least once. A module with no run yet (`lastCalculationRunId === null`)
 * contributes nothing — a baseline of a partial/WIP design is legitimate; an
 * unrun module is simply absent from `calculationRuns`, not a blocker (only
 * a stale or failed *existing* run is — see `evaluateBaselineReadiness`).
 */
async function loadCalculationRunRefs(
  moduleInstances: readonly ModuleInstanceRecord[],
  ownerId: UserId,
  client: DbClient,
): Promise<BaselineCalculationRunRef[]> {
  const refs: BaselineCalculationRunRef[] = [];
  for (const moduleInstance of moduleInstances) {
    if (moduleInstance.lastCalculationRunId === null) continue;
    const run = await loadCalculationRun(
      asCalculationRunId(moduleInstance.lastCalculationRunId),
      ownerId,
      client,
    );
    if (run === null) continue;
    refs.push({
      id: run.id,
      moduleInstanceId: run.moduleInstanceId,
      modulePackageId: run.modulePackageId,
      moduleVersion: run.moduleVersion,
      modulePackageHash: run.modulePackageHash,
      status: run.status,
      stale: run.stale,
    });
  }
  return refs;
}

/** What the inner transaction settles on — resolved to a `CreateBaselineResult` after it commits. */
type CreateBaselineOutcome =
  | { readonly kind: "unauthorized" }
  | { readonly kind: "not_ready"; readonly blockers: readonly BaselineBlocker[] }
  | { readonly kind: "created"; readonly baseline: MachineBaselineRecord };

/**
 * Creates an immutable `MachineBaseline`, scoped to `ownerId`: authorizes the
 * configuration, freezes its current requirements, assumptions, load cases,
 * assembly/module tree, current parameter values and links, each module's
 * latest calculation run, and component assignments into a
 * `MachineBaselineSnapshot`, then persists it with an audit event.
 *
 * **Every read and the final write happen inside one `RepeatableRead`
 * transaction** (design-risk follow-up, 2026-07-30 — see
 * context/progress-tracker.md): at the default isolation, each of the
 * roughly-seven independent reads below could observe a different committed
 * state under a concurrent edit (a value changed between reading parameter
 * values and reading calculation runs, say), so the frozen snapshot could
 * describe a configuration state that was never simultaneously true. A
 * baseline is immutable once created, so this is exactly the place that
 * consequence matters most. `RepeatableRead` gives every read in the
 * transaction the same MVCC snapshot as of the transaction's start; if a
 * concurrent transaction commits a conflicting change to something already
 * read here, Postgres fails this transaction with a serialization error
 * rather than silently mixing snapshots (a rare, retryable failure — not
 * handled with a retry loop here, since nothing in this codebase has needed
 * one yet; revisit if that changes in practice).
 *
 * Never throws for an expected domain failure (unauthorized, not ready, or a
 * malformed label the repository's validation rejects); an unexpected
 * repository error still throws — that is a real bug, not a modeled outcome.
 */
export async function createBaseline(
  input: CreateBaselineInput,
  ownerId: UserId,
): Promise<CreateBaselineResult> {
  let outcome: CreateBaselineOutcome;
  try {
    outcome = await prisma.$transaction(
      async (tx): Promise<CreateBaselineOutcome> => {
        const context = await loadConfigurationForOwner(input.configurationId, ownerId, tx);
        if (context === null) {
          return { kind: "unauthorized" };
        }
        const tree = await loadConfigurationTree(input.configurationId, ownerId, tx);
        if (tree === null) {
          return { kind: "unauthorized" };
        }

        const allModuleInstances = collectModuleInstances(tree.assemblies);
        const [
          requirementNodes,
          designAssumptionRecords,
          loadCaseRecords,
          parameterValueRecords,
          parameterLinkRecords,
          assignmentRecords,
          calculationRuns,
        ] = await Promise.all([
          listRequirements(input.configurationId, ownerId, tx),
          listDesignAssumptions(input.configurationId, ownerId, tx),
          listLoadCases(input.configurationId, ownerId, tx),
          listCurrentParameterValuesForConfiguration(input.configurationId, ownerId, tx),
          listParameterLinksForConfiguration(input.configurationId, ownerId, tx),
          listComponentAssignmentsForConfiguration(input.configurationId, ownerId, tx),
          loadCalculationRunRefs(allModuleInstances, ownerId, tx),
        ]);

        const requirements: BaselineRequirement[] = requirementNodes.map((r) => ({
          id: r.id,
          assemblyId: r.assemblyId,
          code: r.code,
          statement: r.statement,
          acceptanceCriteria: r.acceptanceCriteria.map((ac) => ({ id: ac.id, statement: ac.statement })),
        }));
        const designAssumptions: BaselineDesignAssumption[] = designAssumptionRecords.map((a) => ({
          id: a.id,
          assemblyId: a.assemblyId,
          statement: a.statement,
          rationale: a.rationale,
        }));
        const loadCases: BaselineLoadCase[] = loadCaseRecords.map((l) => ({
          id: l.id,
          category: l.category,
          label: l.label,
          description: l.description,
        }));
        const parameterValues: BaselineParameterValue[] = parameterValueRecords.map((v) => ({
          id: v.id,
          assemblyId: v.assemblyId,
          moduleInstanceId: v.moduleInstanceId,
          nodeKind: v.nodeKind,
          parameterId: v.parameterId,
          loadCase: v.loadCase,
          source: v.source,
          value: v.value,
        }));
        const parameterLinks: BaselineParameterLink[] = parameterLinkRecords.map((l) => ({
          id: l.id,
          targetModuleInstanceId: l.targetModuleInstanceId,
          targetParameterId: l.targetParameterId,
          targetLoadCase: l.targetLoadCase,
          sourceKind: l.sourceKind,
          sourceModuleInstanceId: l.sourceModuleInstanceId,
          sourceAssemblyId: l.sourceAssemblyId,
          sourceParameterId: l.sourceParameterId,
          sourceLoadCase: l.sourceLoadCase,
        }));
        const componentAssignments: BaselineComponentAssignment[] = assignmentRecords.map((a) => ({
          id: a.id,
          targetKind: a.targetKind,
          moduleInstanceId: a.moduleInstanceId,
          assemblyId: a.assemblyId,
          partSource: a.partSource,
          manufacturerPartRevisionId: a.manufacturerPartRevisionId,
          manualPartDetails: a.manualPartDetails,
          quantity: a.quantity,
          calculationRunId: a.calculationRunId,
          stale: a.stale,
        }));

        const readiness = evaluateBaselineReadiness({
          calculationRuns,
          componentAssignments,
          ...(input.acknowledgeWarnings !== undefined
            ? { acknowledgeWarnings: input.acknowledgeWarnings }
            : {}),
        });
        if (!readiness.ready) {
          return { kind: "not_ready", blockers: readiness.blockers };
        }

        const snapshot: MachineBaselineSnapshot = {
          snapshotVersion: BASELINE_SNAPSHOT_FORMAT_VERSION,
          projectId: context.project.id,
          projectName: context.project.name,
          configurationId: input.configurationId,
          configurationName: context.configuration.name,
          marketProfileKey: context.project.marketProfileKey,
          requirements,
          designAssumptions,
          loadCases,
          assemblies: tree.assemblies.map(toBaselineAssemblyNode),
          parameterValues,
          parameterLinks,
          calculationRuns,
          componentAssignments,
          createdAt: new Date().toISOString(),
          createdByUserId: ownerId,
        };

        const created = await createMachineBaseline(
          {
            configurationId: input.configurationId,
            label: input.label,
            snapshot,
            createdByUserId: ownerId,
          },
          tx,
        );
        await appendAuditEvent(
          {
            projectId: context.project.id,
            eventType: "machine_baseline.created",
            entityType: "MachineBaseline",
            entityId: created.id,
            userId: ownerId,
            payload: {
              configurationId: input.configurationId,
              label: input.label,
              acknowledgedBlockers: readiness.blockers.map((b) => ({ kind: b.kind, id: b.id })),
            },
          },
          tx,
        );
        return { kind: "created", baseline: created };
      },
      { isolationLevel: "RepeatableRead" },
    );
  } catch (error) {
    if (error instanceof BaselineRepositoryError) {
      return { ok: false, error: { code: "invalid_input", message: error.message } };
    }
    throw error;
  }

  switch (outcome.kind) {
    case "unauthorized":
      return {
        ok: false,
        error: { code: "unauthorized", message: "Configuration not found or not owned by this user." },
      };
    case "not_ready":
      return {
        ok: false,
        error: {
          code: "not_ready",
          message: "Baseline creation is blocked by stale or failed items. Acknowledge to proceed.",
          blockers: outcome.blockers,
        },
      };
    case "created":
      return { ok: true, baseline: outcome.baseline };
  }
}
