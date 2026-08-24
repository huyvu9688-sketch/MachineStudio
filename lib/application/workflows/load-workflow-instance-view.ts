// The `loadWorkflowInstanceView` use case (Unit 4.9): assembles a
// `WorkflowInstance`'s full read-only state — present role instances,
// resolved link proposals, confirmed links, completion, live status, and
// workflow-level checks — from real persisted data. This is what wires
// lib/workflows' pure workflow-sdk contract to the database for the first
// time (context/adr/0007-workflow-definition-contract.md: "No lib/db,
// lib/application, or UI wiring in this pass" — this is that follow-on
// unit).
//
// Read-only except for one narrow exception: it keeps the persisted
// `WorkflowInstance.status` column in sync with what `evaluateWorkflowStatus`
// derives (never touching `"abandoned"`, an explicit user action the SDK
// never derives itself) — `components/engineering/machine-navigator.tsx`
// already renders that column read-only, so leaving it perpetually "draft"
// the moment a real module instance attaches would make an existing UI
// surface wrong. No other write happens here.
//
// A module instance attached to this workflow instance is silently excluded
// from `roleInstances` (and reported in `excludedModuleInstances`, not
// hidden) when either: its module package is not registered (expected today
// for every linear-axis@1 module — see context/progress-tracker.md "Unit
// 4.1"), or no role in the resolved definition names its module package id.
// When a module package id is named by more than one role's `moduleIds` (not
// true of any workflow definition in this codebase today), the first
// declared match wins — a real, documented limitation, not invented
// resolution logic.
//
// An input port linked to another module's *output* is never resolved into
// `inputValues` here: `lib/db`'s `resolveModuleInputs` deliberately returns
// `null` for that case (its own value comes from that source module's latest
// calculation run), and only `executeModuleInstance`'s own bespoke lookup
// resolves it — replicating that here would mean this read-only view could
// silently diverge from the actual execution path. A link to a *provider*
// value (an assembly parameter, a machine requirement, or a
// workflow-provided value) resolves normally, since `resolveModuleInputs`
// already resolves those directly.

import "server-only";
import {
  asLinkId,
  asNodeId,
  asParameterId,
  asScopeId,
  buildParameterGraph,
  type Assumption,
  type CheckResult,
  type EngineeringValue,
  type GraphLink,
  type GraphNode,
  type IndexedParameterGraph,
  type ModuleComputation,
} from "@/lib/engine";
import { getWorkflowDefinition } from "@/lib/workflows";
import {
  evaluateCompletion,
  evaluateWorkflowChecks,
  evaluateWorkflowStatus,
  instancePortNodeId,
  linkProposalKey,
  resolveLinkProposals,
  type CompletionResult,
  type ReachableWorkflowStatus,
  type WorkflowInstanceContext,
  type WorkflowLinkProposal,
  type WorkflowModuleRole,
  type WorkflowRoleInstance,
} from "@/lib/workflows/workflow-sdk";
import { getModulePackage } from "@/lib/modules";
import {
  asCalculationRunId,
  listDesignAssumptions,
  listModuleInstancesForWorkflowInstance,
  listParameterLinksForConfiguration,
  loadCalculationRun,
  loadWorkflowInstanceForOwner,
  resolveModuleInputs,
  updateWorkflowInstanceStatus,
  type ModuleInstanceId,
  type ModuleInstanceRecord,
  type ParameterLinkRecord,
  type UserId,
  type WorkflowInstanceId,
  type WorkflowInstanceRecord,
} from "@/lib/db";

/** Machine-readable classification of a {@link loadWorkflowInstanceView} failure. */
export type LoadWorkflowInstanceViewErrorCode =
  "unauthorized" | "workflow_not_found";

/** A failed {@link loadWorkflowInstanceView} outcome. */
export interface LoadWorkflowInstanceViewError {
  readonly code: LoadWorkflowInstanceViewErrorCode;
  readonly message: string;
}

/** A module instance attached to this workflow instance that could not be mapped to a role. */
export interface ExcludedModuleInstanceView {
  readonly moduleInstanceId: ModuleInstanceId;
  readonly reason: string;
}

/** The full read-only state of one workflow instance. */
export interface WorkflowInstanceView {
  readonly workflowInstance: WorkflowInstanceRecord;
  readonly definition: {
    readonly id: string;
    readonly version: string;
    readonly title: string;
    readonly description: string;
  };
  /**
   * The resolved definition's full role catalog — including roles with no
   * present instance — so a UI can render "which roles still need a module"
   * rather than only the roles `roleInstances` happens to fill.
   */
  readonly roles: readonly WorkflowModuleRole[];
  readonly roleInstances: readonly WorkflowInstanceContext[];
  /**
   * Each present role instance's `ModuleInstance.label`, keyed by
   * `instanceId` — `WorkflowInstanceContext` itself carries no label (it is
   * a pure workflow-sdk shape, `lib/workflows/workflow-sdk/types.ts`), and a
   * UI rendering role instances needs a human-readable name, not just an id.
   */
  readonly instanceLabels: Readonly<Record<string, string>>;
  readonly linkProposals: readonly WorkflowLinkProposal[];
  readonly confirmedLinkKeys: readonly string[];
  readonly completion: CompletionResult;
  readonly status: ReachableWorkflowStatus;
  readonly checks: readonly CheckResult[];
  readonly excludedModuleInstances: readonly ExcludedModuleInstanceView[];
}

/** Result of {@link loadWorkflowInstanceView}. */
export type LoadWorkflowInstanceViewResult =
  | { readonly ok: true; readonly view: WorkflowInstanceView }
  | { readonly ok: false; readonly error: LoadWorkflowInstanceViewError };

/** One module instance successfully mapped onto a role, before values are resolved. */
interface MappedInstance {
  readonly moduleInstance: ModuleInstanceRecord;
  readonly roleInstance: WorkflowRoleInstance;
}

const WORKFLOW_GRAPH_SCOPE = asScopeId("workflow-instance-view");

/**
 * Loads one workflow instance's full state, scoped to the owner. Returns
 * `unauthorized` when the instance does not exist or is not owned by
 * `ownerId`, and `workflow_not_found` when its `workflowId`/`workflowVersion`
 * no longer resolves against `lib/workflows`'s registry (should not happen in
 * practice — a workflow instance is only ever created from a registered
 * definition, `startWorkflowInstance` — but this view never trusts the
 * persisted row's claim without re-resolving it, the same discipline
 * `executeModuleInstance` already applies to a module instance's pinned
 * package).
 */
export async function loadWorkflowInstanceView(
  workflowInstanceId: WorkflowInstanceId,
  ownerId: UserId,
): Promise<LoadWorkflowInstanceViewResult> {
  const workflowInstance = await loadWorkflowInstanceForOwner(
    workflowInstanceId,
    ownerId,
  );
  if (workflowInstance === null) {
    return {
      ok: false,
      error: {
        code: "unauthorized",
        message: "Workflow instance not found or not owned by this user.",
      },
    };
  }

  const definition = getWorkflowDefinition(
    workflowInstance.workflowId,
    workflowInstance.workflowVersion,
  );
  if (definition === undefined) {
    return {
      ok: false,
      error: {
        code: "workflow_not_found",
        message: `Workflow "${workflowInstance.workflowId}@${workflowInstance.workflowVersion}" is not registered.`,
      },
    };
  }

  const moduleInstances = await listModuleInstancesForWorkflowInstance(
    workflowInstanceId,
    ownerId,
  );

  const mapped: MappedInstance[] = [];
  const excluded: ExcludedModuleInstanceView[] = [];
  for (const moduleInstance of moduleInstances) {
    const pkg = getModulePackage(
      moduleInstance.modulePackageId,
      moduleInstance.moduleVersion,
    );
    if (pkg === undefined) {
      excluded.push({
        moduleInstanceId: moduleInstance.id,
        reason: `Module package "${moduleInstance.modulePackageId}@${moduleInstance.moduleVersion}" is not registered.`,
      });
      continue;
    }
    const role = definition.roles.find((r) =>
      r.moduleIds.includes(moduleInstance.modulePackageId),
    );
    if (role === undefined) {
      excluded.push({
        moduleInstanceId: moduleInstance.id,
        reason: `No role in "${definition.manifest.id}@${definition.manifest.version}" accepts module "${moduleInstance.modulePackageId}".`,
      });
      continue;
    }
    mapped.push({
      moduleInstance,
      roleInstance: {
        instanceId: moduleInstance.id,
        roleId: role.id,
        moduleId: moduleInstance.modulePackageId,
        ports: pkg.ports,
      },
    });
  }

  const roleInstances = mapped.map((m) => m.roleInstance);
  const instanceLabels: Record<string, string> = {};
  for (const { moduleInstance } of mapped) {
    instanceLabels[moduleInstance.id] = moduleInstance.label;
  }

  const contexts: WorkflowInstanceContext[] = [];
  for (const { moduleInstance, roleInstance } of mapped) {
    const inputValues = await resolveInputValues(
      moduleInstance,
      roleInstance,
      ownerId,
    );
    const computation = await resolveLatestComputation(moduleInstance, ownerId);
    contexts.push({
      ...roleInstance,
      inputValues,
      ...(computation !== undefined ? { computation } : {}),
    });
  }

  const proposals = resolveLinkProposals(definition, roleInstances);

  const confirmedLinks = await listParameterLinksForConfiguration(
    workflowInstance.configurationId,
    ownerId,
  );
  const confirmedLinkKeys = new Set<string>();
  for (const proposal of proposals) {
    const confirmed = confirmedLinks.some(
      (link) =>
        link.sourceModuleInstanceId === proposal.fromInstanceId &&
        link.sourceParameterId === proposal.parameterId &&
        link.targetModuleInstanceId === proposal.toInstanceId &&
        link.targetParameterId === proposal.parameterId &&
        (link.targetLoadCase ?? undefined) === proposal.loadCase,
    );
    if (confirmed) {
      confirmedLinkKeys.add(linkProposalKey(proposal));
    }
  }

  const assumptionRecords = await listDesignAssumptions(
    workflowInstance.configurationId,
    ownerId,
  );
  const assumptions: Assumption[] = assumptionRecords.map((a) => ({
    id: a.id,
    statement: a.statement,
  }));

  // Computed before completion (not after, as a prior release had it): a
  // failing workflow-level check must gate "completed" status, not just be
  // displayed alongside it — a release audit found completion/status only
  // ever considered per-module checks, so a workflow with a failing
  // structural check (e.g. two roles linking a shared parameter to
  // different sources) could still report complete.
  const checks = evaluateWorkflowChecks({
    definition,
    instances: roleInstances,
    graph: buildConfirmedLinkGraph(roleInstances, confirmedLinks),
  });

  const completion = evaluateCompletion({
    definition,
    instances: contexts,
    proposals,
    confirmedLinkKeys,
    assumptions,
    workflowChecks: checks,
  });
  const status = evaluateWorkflowStatus({ instances: contexts, completion });

  // Keep the persisted status in sync with the live-derived one, unless the
  // engineer already explicitly abandoned this instance — that state is
  // never overwritten by a derived value (workflow-sdk's own
  // ReachableWorkflowStatus/evaluateWorkflowStatus doc comments).
  let persistedInstance = workflowInstance;
  if (
    workflowInstance.status !== "abandoned" &&
    workflowInstance.status !== status
  ) {
    await updateWorkflowInstanceStatus(workflowInstanceId, status);
    persistedInstance = { ...workflowInstance, status };
  }

  return {
    ok: true,
    view: {
      workflowInstance: persistedInstance,
      definition: {
        id: definition.manifest.id,
        version: definition.manifest.version,
        title: definition.manifest.title,
        description: definition.manifest.description,
      },
      roles: definition.roles,
      roleInstances: contexts,
      instanceLabels,
      linkProposals: proposals,
      confirmedLinkKeys: [...confirmedLinkKeys],
      completion,
      status,
      checks,
      excludedModuleInstances: excluded,
    },
  };
}

/**
 * Resolves one instance's input port values from real persisted sources:
 * manual/workflow-authored values, and links to an already-authored provider
 * value. A link to another module's *output* is always left out of the
 * returned record — `resolveModuleInputs` never resolves that case itself
 * (see file header) — and so is an unauthored "default" source, since this
 * view reports what is actually resolved, not what the module's own default
 * policy would eventually fill in.
 */
async function resolveInputValues(
  moduleInstance: ModuleInstanceRecord,
  roleInstance: WorkflowRoleInstance,
  ownerId: UserId,
): Promise<Record<string, EngineeringValue>> {
  const resolvedPorts = await resolveModuleInputs(
    moduleInstance.id,
    ownerId,
    roleInstance.ports.inputs.map((port) => ({
      parameterId: port.parameterId,
      ...(port.loadCase !== undefined ? { loadCase: port.loadCase } : {}),
    })),
  );
  const values: Record<string, EngineeringValue> = {};
  if (resolvedPorts === null) {
    return values;
  }
  roleInstance.ports.inputs.forEach((port, i) => {
    const resolved = resolvedPorts[i].resolved;
    if (resolved.source === "manual" || resolved.source === "workflow") {
      values[port.key] = resolved.value;
    } else if (resolved.source === "linked" && resolved.value !== null) {
      values[port.key] = resolved.value;
    }
    // A "linked" resolution to a module-output source (resolved.value is
    // always null in that case — see resolveModuleInputs) and "default" are
    // both left unresolved here on purpose (file header).
  });
  return values;
}

/**
 * The instance's latest calculation run's computation, when it has one and
 * that run is not stale — `undefined` otherwise (never run yet, or its
 * result is known to be out of date).
 */
async function resolveLatestComputation(
  moduleInstance: ModuleInstanceRecord,
  ownerId: UserId,
): Promise<ModuleComputation | undefined> {
  if (moduleInstance.lastCalculationRunId === null) {
    return undefined;
  }
  const run = await loadCalculationRun(
    asCalculationRunId(moduleInstance.lastCalculationRunId),
    ownerId,
  );
  if (run === null || run.stale) {
    return undefined;
  }
  return run.snapshot.computation;
}

/**
 * Builds the workflow-scoped `IndexedParameterGraph` `evaluateWorkflowChecks`
 * needs: one node per role instance's input port that is a confirmed-link
 * target, keyed by `instancePortNodeId` (the convention every workflow-sdk
 * function shares — distinct from `lib/db`'s own `parameterGraphNodeId`
 * scheme, so that one cannot be reused directly for this side), and one
 * `GraphLink` per confirmed `ParameterLink` whose target is one of
 * `roleInstances`' own input ports. Confirmed links whose source is a
 * provider value (an assembly parameter, a machine requirement, or a
 * workflow-provided value) — or a module output outside this workflow
 * instance's own present roles — are included too: a `shared_value_topology`
 * rule only compares source-node *identity*, so that side's node id just
 * needs to be stable per distinct source, not conform to
 * `instancePortNodeId`'s own convention.
 */
function buildConfirmedLinkGraph(
  roleInstances: readonly WorkflowRoleInstance[],
  confirmedLinks: readonly ParameterLinkRecord[],
): IndexedParameterGraph {
  const nodesById = new Map<string, GraphNode>();
  const links: GraphLink[] = [];

  for (const link of confirmedLinks) {
    const targetInstance = roleInstances.find(
      (i) => i.instanceId === link.targetModuleInstanceId,
    );
    if (targetInstance === undefined) continue;
    const targetPort = targetInstance.ports.inputs.find(
      (p) =>
        p.parameterId === link.targetParameterId &&
        (p.loadCase ?? null) === link.targetLoadCase,
    );
    if (targetPort === undefined) continue;

    const targetNode: GraphNode = {
      id: instancePortNodeId(targetInstance.instanceId, targetPort.key),
      kind: "module_input",
      parameterId: targetPort.parameterId,
      scopeId: WORKFLOW_GRAPH_SCOPE,
      moduleInstanceId: targetInstance.instanceId,
      ...(targetPort.loadCase !== undefined && {
        loadCase: targetPort.loadCase,
      }),
    };

    const sourceInstance =
      link.sourceModuleInstanceId === null
        ? undefined
        : roleInstances.find(
            (i) => i.instanceId === link.sourceModuleInstanceId,
          );
    const sourcePort =
      sourceInstance === undefined
        ? undefined
        : sourceInstance.ports.outputs.find(
            (p) =>
              p.parameterId === link.sourceParameterId &&
              (p.loadCase ?? null) === link.sourceLoadCase,
          );

    let sourceNode: GraphNode;
    if (sourceInstance !== undefined && sourcePort !== undefined) {
      sourceNode = {
        id: instancePortNodeId(sourceInstance.instanceId, sourcePort.key),
        kind: "module_output",
        parameterId: sourcePort.parameterId,
        scopeId: WORKFLOW_GRAPH_SCOPE,
        moduleInstanceId: sourceInstance.instanceId,
        ...(sourcePort.loadCase !== undefined && {
          loadCase: sourcePort.loadCase,
        }),
      };
    } else {
      const owner =
        link.sourceModuleInstanceId !== null
          ? `m:${link.sourceModuleInstanceId}`
          : `a:${link.sourceAssemblyId ?? "root"}`;
      sourceNode = {
        id: asNodeId(
          `${link.sourceKind}|${owner}|${link.sourceParameterId}|${link.sourceLoadCase ?? ""}`,
        ),
        kind: link.sourceKind,
        parameterId: asParameterId(link.sourceParameterId),
        scopeId: WORKFLOW_GRAPH_SCOPE,
        ...(link.sourceModuleInstanceId !== null && {
          moduleInstanceId: link.sourceModuleInstanceId,
        }),
        ...(link.sourceLoadCase !== null && {
          loadCase: link.sourceLoadCase,
        }),
      };
    }

    nodesById.set(targetNode.id, targetNode);
    nodesById.set(sourceNode.id, sourceNode);
    links.push({
      id: asLinkId(`${sourceNode.id}->${targetNode.id}`),
      sourceNodeId: sourceNode.id,
      targetNodeId: targetNode.id,
    });
  }

  return buildParameterGraph({
    scopes: [{ id: WORKFLOW_GRAPH_SCOPE }],
    nodes: [...nodesById.values()],
    links,
  });
}
