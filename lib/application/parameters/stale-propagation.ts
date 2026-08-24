// Stale-propagation use cases (Unit 2.5, extended in Unit 2.8 part 2): change
// a manual/default value, change a workflow-provided value, confirm a link,
// and remove a link. Each computes downstream impact with
// `lib/engine/graph`'s `computeStaleImpact` and marks the affected
// calculation runs AND their dependent component assignments stale in the
// same transaction as the change (context/architecture.md invariant 8,
// "Transactional stale propagation": "downstream runs and component
// assignments become stale in the same transaction as the upstream change").
//
// DEFERRED (still not implemented here): "change an assigned-component
// feedback input" — the fourth use case the implementation map names. Unlike
// the simple "an assignment goes stale when its justifying run does"
// direction implemented below, this is an assignment acting as a *source* of
// a value other calculations consume (e.g. an assigned bearing's real
// stiffness feeding back into an upstream calculation) — it needs a new
// parameter-graph node kind and is a materially larger feature. Revisit as
// its own unit.
//
// Graph reconstruction needs each changed module's *full* port set (not only
// nodes that already appear as a link endpoint) so its own internal
// input→output feed edge exists even when one side is unlinked — otherwise
// changing a module's own directly-authored input would have no edge to its
// own output, and that module's own runs would wrongly appear unaffected.
// Only the application layer can enumerate a module's ports (from its
// package via `lib/modules`); `lib/db` deliberately never imports the module
// registry (mirrors Unit 2.4's `executeModuleInstance`).

import "server-only";
import {
  asParameterId,
  asScopeId,
  computeStaleImpact,
  engineeringValuesClose,
  evaluateLinkCompatibility,
  type GraphNode,
  type ModulePackage,
} from "@/lib/engine";
import { getModulePackage } from "@/lib/modules";
import {
  GraphRepositoryError,
  asModuleInstanceId,
  createParameterLink,
  createParameterValue,
  deleteParameterLink,
  findCurrentParameterValueForNode,
  isConfigurationOwnedBy,
  loadAssemblyForOwner,
  loadConfigurationGraph,
  loadModuleInstanceForOwner,
  loadParameterLinkForOwner,
  markComponentAssignmentsStaleForModuleInstances,
  markRunsStaleForModuleInstances,
  parameterGraphNodeId,
  prisma,
  type CreateParameterLinkInput,
  type CreateParameterValueInput,
  type DbClient,
  type GraphNodeDescriptor,
  type ModuleInstanceId,
  type ParameterLinkId,
  type ParameterLinkRecord,
  type ParameterValueRecord,
  type UserId,
} from "@/lib/db";

/** Machine-readable classification of a stale-propagation use-case failure. */
export type StalePropagationErrorCode =
  | "unauthorized"
  | "invalid_input"
  | "cycle"
  | "duplicate_link"
  | "module_not_found"
  | "incompatible";

/** A failed stale-propagation use-case outcome. */
export interface StalePropagationError {
  readonly code: StalePropagationErrorCode;
  readonly message: string;
}

/** Result of {@link setParameterValue}. */
export type SetParameterValueResult =
  | {
      readonly ok: true;
      readonly value: ParameterValueRecord;
      readonly staleModuleInstanceIds: readonly ModuleInstanceId[];
    }
  | { readonly ok: false; readonly error: StalePropagationError };

/** Result of {@link confirmParameterLink}. */
export type ConfirmParameterLinkResult =
  | {
      readonly ok: true;
      readonly link: ParameterLinkRecord;
      readonly staleModuleInstanceIds: readonly ModuleInstanceId[];
    }
  | { readonly ok: false; readonly error: StalePropagationError };

/** Result of {@link removeParameterLink}. */
export type RemoveParameterLinkResult =
  | {
      readonly ok: true;
      readonly staleModuleInstanceIds: readonly ModuleInstanceId[];
    }
  | { readonly ok: false; readonly error: StalePropagationError };

function unauthorized(message: string): {
  ok: false;
  error: StalePropagationError;
} {
  return { ok: false, error: { code: "unauthorized", message } };
}
function failure(
  code: StalePropagationErrorCode,
  message: string,
): { ok: false; error: StalePropagationError } {
  return { ok: false, error: { code, message } };
}

/**
 * Descriptors for every declared port of a module instance's package (both
 * directions), so `loadConfigurationGraph` can guarantee the module's own
 * internal feed edge exists regardless of link connectivity. Returns `[]`
 * (not an error) when the package can't be loaded — degraded but safe: the
 * changed node itself is always added separately by the caller, so impact
 * is still computed, just without this completeness guarantee for the rest
 * of that module's ports.
 */
function moduleInstancePortDescriptors(
  moduleInstanceId: string,
  modulePackageId: string,
  moduleVersion: string,
): GraphNodeDescriptor[] {
  const pkg = getModulePackage(modulePackageId, moduleVersion);
  if (pkg === undefined) {
    return [];
  }
  const descriptors: GraphNodeDescriptor[] = [];
  for (const port of pkg.ports.inputs) {
    descriptors.push({
      kind: "module_input",
      moduleInstanceId,
      assemblyId: null,
      parameterId: port.parameterId,
      loadCase: port.loadCase ?? null,
    });
  }
  for (const port of pkg.ports.outputs) {
    descriptors.push({
      kind: "module_output",
      moduleInstanceId,
      assemblyId: null,
      parameterId: port.parameterId,
      loadCase: port.loadCase ?? null,
    });
  }
  return descriptors;
}

/**
 * Computes the stale impact of changing `changedDescriptor`, reconstructing
 * the configuration's graph with `extraNodes` guaranteed present alongside it.
 * Reads through `client` so the traversal runs inside the same transaction as
 * the write it is about to authorize, rather than against separately-committed
 * state (see each use case's transaction body).
 */
async function computeImpact(
  configurationId: string,
  changedDescriptor: GraphNodeDescriptor,
  extraNodes: readonly GraphNodeDescriptor[],
  client: DbClient,
): Promise<readonly ModuleInstanceId[]> {
  const changedNodeId = parameterGraphNodeId(changedDescriptor);
  const graph = await loadConfigurationGraph(
    configurationId,
    [changedDescriptor, ...extraNodes],
    client,
  );
  const impact = computeStaleImpact(graph, [changedNodeId]);
  return impact.staleModuleInstanceIds.map(asModuleInstanceId);
}

/**
 * A `GraphNode` for one link endpoint, so the engine's semantic
 * link-compatibility rules (Unit 1.8) can be applied to a proposed link before
 * it is persisted. All endpoints share one synthetic scope: compatibility does
 * not consider scope proximity (only source *suggestion* ranking does).
 */
function compatibilityNode(
  descriptor: GraphNodeDescriptor,
  configurationId: string,
): GraphNode {
  return {
    id: parameterGraphNodeId(descriptor),
    kind: descriptor.kind,
    parameterId: asParameterId(descriptor.parameterId),
    scopeId: asScopeId(configurationId),
    ...(descriptor.loadCase !== null ? { loadCase: descriptor.loadCase } : {}),
    ...(descriptor.moduleInstanceId !== null
      ? { moduleInstanceId: descriptor.moduleInstanceId }
      : {}),
  };
}

/** Whether `pkg` declares an input port for exactly this parameter and load case. */
function declaresInputPort(
  pkg: ModulePackage,
  parameterId: string,
  loadCase: string | null,
): boolean {
  return pkg.ports.inputs.some(
    (port) =>
      port.parameterId === parameterId && (port.loadCase ?? null) === loadCase,
  );
}

/** Whether `pkg` declares an output port for exactly this parameter and load case. */
function declaresOutputPort(
  pkg: ModulePackage,
  parameterId: string,
  loadCase: string | null,
): boolean {
  return pkg.ports.outputs.some(
    (port) =>
      port.parameterId === parameterId && (port.loadCase ?? null) === loadCase,
  );
}

/**
 * Changes a manual or workflow-provided value — a provider value (machine
 * requirement, assembly parameter, workflow parameter) or a module's own
 * directly-authored input — and marks every downstream calculation run stale
 * in the same transaction as the write (invariant "Transactional stale
 * propagation"). Authored values are append-only history (Unit 2.2): this
 * creates a new `ParameterValue` row; it does not edit an existing one.
 *
 * No-op guard (Unit 3.9 follow-up): when the same node already holds a value
 * from the same `source` that is `engineeringValuesClose` to `input.value`,
 * this performs no write and marks nothing stale — it returns the existing
 * record instead. This exists because Unit 3.9 made the display-unit input
 * round-trip exactly (convert stored canonical -> display unit for editing,
 * then back on submit), so submitting an untouched field now reproduces the
 * stored canonical value up to float noise rather than drifting; without this
 * guard, that reproduction would still append a new history row and re-stale
 * every downstream run on every re-save, even though nothing actually
 * changed. A `source` change (e.g. workflow -> manual) is never treated as a
 * no-op, even at an identical magnitude — it is a real provenance change.
 */
export async function setParameterValue(
  input: CreateParameterValueInput,
  ownerId: UserId,
): Promise<SetParameterValueResult> {
  // Authorization has two parts, and the second is not implied by the first:
  // the caller must own the thing being changed, AND that thing must actually
  // live in `input.configurationId` — otherwise a value row lands in a
  // configuration (possibly another owner's) that the authorized target has
  // nothing to do with, where it would then resolve as a real input.
  let extraNodes: readonly GraphNodeDescriptor[] = [];
  if (input.moduleInstanceId !== undefined) {
    const context = await loadModuleInstanceForOwner(
      input.moduleInstanceId,
      ownerId,
    );
    if (context === null) {
      return unauthorized(
        "Module instance not found or not owned by this user.",
      );
    }
    if (context.configurationId !== input.configurationId) {
      return unauthorized(
        "Module instance does not belong to the given configuration.",
      );
    }
    extraNodes = moduleInstancePortDescriptors(
      input.moduleInstanceId,
      context.moduleInstance.modulePackageId,
      context.moduleInstance.moduleVersion,
    );
  } else {
    const owned = await isConfigurationOwnedBy(input.configurationId, ownerId);
    if (!owned) {
      return unauthorized("Configuration not found or not owned by this user.");
    }
    if (input.assemblyId !== undefined) {
      const assembly = await loadAssemblyForOwner(input.assemblyId, ownerId);
      if (assembly === null) {
        return unauthorized("Assembly not found or not owned by this user.");
      }
      if (assembly.configurationId !== input.configurationId) {
        return unauthorized(
          "Assembly does not belong to the given configuration.",
        );
      }
    }
  }

  const changedDescriptor: GraphNodeDescriptor = {
    kind: input.nodeKind,
    moduleInstanceId: input.moduleInstanceId ?? null,
    assemblyId: input.assemblyId ?? null,
    parameterId: input.parameterId,
    loadCase: input.loadCase ?? null,
  };

  try {
    const result = await prisma.$transaction(async (tx) => {
      // No-op guard: read the current value for this exact node inside the
      // same transaction (so it sees this transaction's own prior writes,
      // consistent with every other read in this file) before computing any
      // impact. A true no-op skips impact computation, stale-marking, and the
      // write entirely — not just the write — since there is nothing to
      // propagate when nothing actually changed.
      const current = await findCurrentParameterValueForNode(
        input.configurationId,
        changedDescriptor,
        tx,
      );
      if (
        current !== null &&
        current.source === input.source &&
        engineeringValuesClose(current.value, input.value)
      ) {
        return {
          value: current,
          staleModuleInstanceIds: [] as readonly ModuleInstanceId[],
        };
      }

      // Impact is computed inside the transaction so the traversal and the
      // stale marks it drives see one state of the graph.
      const staleModuleInstanceIds = await computeImpact(
        input.configurationId,
        changedDescriptor,
        extraNodes,
        tx,
      );
      // Stale-marking runs before the write so an invalid `input.value`
      // (caught by createParameterValue's own validation) rolls back the whole
      // transaction, proving atomicity rather than merely short-circuiting.
      await markRunsStaleForModuleInstances(
        staleModuleInstanceIds,
        "An upstream parameter value changed.",
        tx,
      );
      await markComponentAssignmentsStaleForModuleInstances(
        staleModuleInstanceIds,
        "An upstream parameter value changed.",
        tx,
      );
      const value = await createParameterValue(input, tx);
      return { value, staleModuleInstanceIds };
    });
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof GraphRepositoryError) {
      return {
        ok: false,
        error: { code: "invalid_input", message: error.message },
      };
    }
    throw error;
  }
}

/**
 * Confirms a `ParameterLink` (invariant "No silent binding": links are never
 * created silently) and marks every downstream calculation run stale in the
 * same transaction, including the target module's own runs — its resolved
 * input has effectively changed.
 *
 * This is the authoritative gate for invariant "Semantic link safety": both
 * endpoints must be owned by the caller and belong to `input.configurationId`,
 * each module endpoint must be a port its pinned package actually declares, and
 * the pair must satisfy `lib/engine/graph`'s `evaluateLinkCompatibility` —
 * parameter identity (or an approved mapping), value family, dimension,
 * qualifier axes, frame, and load case. A suggestion UI (Unit 3.4) may
 * pre-filter candidates for usability, but it is not what makes a link safe;
 * unit compatibility alone never authorizes one.
 *
 * No approved cross-parameter mappings are declared yet
 * (`lib/engine/graph`'s `ApprovedParameterMapping` set is deliberately empty),
 * so today a link is authorized only between the *same* canonical parameter.
 * Approved mappings must come from a reviewed, curated set when one exists —
 * never from this call's arguments, which the caller controls.
 */
export async function confirmParameterLink(
  input: CreateParameterLinkInput,
  ownerId: UserId,
): Promise<ConfirmParameterLinkResult> {
  const context = await loadModuleInstanceForOwner(
    input.targetModuleInstanceId,
    ownerId,
  );
  if (context === null) {
    return unauthorized(
      "Target module instance not found or not owned by this user.",
    );
  }
  if (context.configurationId !== input.configurationId) {
    return unauthorized(
      "Target module instance does not belong to the given configuration.",
    );
  }
  const targetPkg = getModulePackage(
    context.moduleInstance.modulePackageId,
    context.moduleInstance.moduleVersion,
  );
  if (targetPkg === undefined) {
    return failure(
      "module_not_found",
      `Module package "${context.moduleInstance.modulePackageId}@${context.moduleInstance.moduleVersion}" is not registered.`,
    );
  }

  const targetDescriptor: GraphNodeDescriptor = {
    kind: "module_input",
    moduleInstanceId: input.targetModuleInstanceId,
    assemblyId: null,
    parameterId: input.targetParameterId,
    loadCase: input.targetLoadCase ?? null,
  };
  if (
    !declaresInputPort(
      targetPkg,
      targetDescriptor.parameterId,
      targetDescriptor.loadCase,
    )
  ) {
    return failure(
      "invalid_input",
      `Module "${targetPkg.manifest.id}@${targetPkg.manifest.version}" declares no input port for ${input.targetParameterId}${input.targetLoadCase !== undefined ? ` (load case ${input.targetLoadCase})` : ""}.`,
    );
  }

  const sourceDescriptor: GraphNodeDescriptor = {
    kind: input.sourceKind,
    moduleInstanceId: input.sourceModuleInstanceId ?? null,
    assemblyId: input.sourceAssemblyId ?? null,
    parameterId: input.sourceParameterId,
    loadCase: input.sourceLoadCase ?? null,
  };

  // Every sourceKind has exactly one legitimate combination of
  // sourceModuleInstanceId/sourceAssemblyId; a mismatched combination (a
  // tampered sourceKind paired with a real sourceModuleInstanceId, e.g.)
  // previously fell through every branch below with no ownership or
  // port-membership check at all before the link was written — see the
  // release audit this closes.
  if (input.sourceKind === "module_output") {
    if (input.sourceModuleInstanceId === undefined) {
      return failure(
        "invalid_input",
        "A module-output source requires sourceModuleInstanceId.",
      );
    }
    if (input.sourceAssemblyId !== undefined) {
      return failure(
        "invalid_input",
        "A module-output source must not also carry sourceAssemblyId.",
      );
    }
    const sourceContext = await loadModuleInstanceForOwner(
      input.sourceModuleInstanceId,
      ownerId,
    );
    if (sourceContext === null) {
      return unauthorized(
        "Source module instance not found or not owned by this user.",
      );
    }
    if (sourceContext.configurationId !== input.configurationId) {
      return unauthorized(
        "Source module instance does not belong to the given configuration.",
      );
    }
    const sourcePkg = getModulePackage(
      sourceContext.moduleInstance.modulePackageId,
      sourceContext.moduleInstance.moduleVersion,
    );
    if (sourcePkg === undefined) {
      return failure(
        "module_not_found",
        `Module package "${sourceContext.moduleInstance.modulePackageId}@${sourceContext.moduleInstance.moduleVersion}" is not registered.`,
      );
    }
    if (
      !declaresOutputPort(
        sourcePkg,
        sourceDescriptor.parameterId,
        sourceDescriptor.loadCase,
      )
    ) {
      return failure(
        "invalid_input",
        `Module "${sourcePkg.manifest.id}@${sourcePkg.manifest.version}" declares no output port for ${input.sourceParameterId}.`,
      );
    }
  } else if (input.sourceKind === "assembly_parameter") {
    if (input.sourceModuleInstanceId !== undefined) {
      return failure(
        "invalid_input",
        "An assembly-parameter source must not also carry sourceModuleInstanceId.",
      );
    }
    if (input.sourceAssemblyId === undefined) {
      return failure(
        "invalid_input",
        "An assembly-parameter source requires sourceAssemblyId.",
      );
    }
    const assembly = await loadAssemblyForOwner(
      input.sourceAssemblyId,
      ownerId,
    );
    if (assembly === null) {
      return unauthorized(
        "Source assembly not found or not owned by this user.",
      );
    }
    if (assembly.configurationId !== input.configurationId) {
      return unauthorized(
        "Source assembly does not belong to the given configuration.",
      );
    }
  } else {
    // machine_requirement / workflow_parameter: configuration-scoped, no
    // module instance or assembly of their own.
    if (
      input.sourceModuleInstanceId !== undefined ||
      input.sourceAssemblyId !== undefined
    ) {
      return failure(
        "invalid_input",
        `A ${input.sourceKind} source must not carry sourceModuleInstanceId or sourceAssemblyId.`,
      );
    }
  }

  const compatibility = evaluateLinkCompatibility(
    compatibilityNode(sourceDescriptor, input.configurationId),
    compatibilityNode(targetDescriptor, input.configurationId),
  );
  if (!compatibility.compatible) {
    return failure(
      "incompatible",
      `Link from ${input.sourceParameterId} to ${input.targetParameterId} is not semantically compatible (${compatibility.reasons.join(", ")}).`,
    );
  }

  const extraNodes = moduleInstancePortDescriptors(
    input.targetModuleInstanceId,
    context.moduleInstance.modulePackageId,
    context.moduleInstance.moduleVersion,
  );

  try {
    const result = await prisma.$transaction(async (tx) => {
      const staleModuleInstanceIds = await computeImpact(
        input.configurationId,
        targetDescriptor,
        extraNodes,
        tx,
      );
      await markRunsStaleForModuleInstances(
        staleModuleInstanceIds,
        "A parameter link was confirmed.",
        tx,
      );
      await markComponentAssignmentsStaleForModuleInstances(
        staleModuleInstanceIds,
        "A parameter link was confirmed.",
        tx,
      );
      const link = await createParameterLink(input, tx);
      return { link, staleModuleInstanceIds };
    });
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof GraphRepositoryError) {
      const code =
        error.code === "cycle" || error.code === "duplicate_link"
          ? error.code
          : "invalid_input";
      return { ok: false, error: { code, message: error.message } };
    }
    throw error;
  }
}

/** Result of {@link previewRemoveParameterLinkImpact}. */
export type PreviewRemoveParameterLinkImpactResult =
  | {
      readonly ok: true;
      readonly staleModuleInstanceIds: readonly ModuleInstanceId[];
    }
  | { readonly ok: false; readonly error: StalePropagationError };

/**
 * Read-only preview of {@link removeParameterLink}'s downstream impact,
 * without deleting the link — Unit 3.4's "Downstream stale-impact warning on
 * removal" (implementation-map.md), shown before the user confirms removal
 * (ui-context.md "Modals and Errors": "Confirmation required for ...  link
 * removal with downstream impact"). Reuses the identical impact computation
 * {@link removeParameterLink} performs, just outside a transaction and
 * without the delete.
 */
export async function previewRemoveParameterLinkImpact(
  linkId: ParameterLinkId,
  ownerId: UserId,
): Promise<PreviewRemoveParameterLinkImpactResult> {
  const link = await loadParameterLinkForOwner(linkId, ownerId);
  if (link === null) {
    return unauthorized("Parameter link not found or not owned by this user.");
  }

  const context = await loadModuleInstanceForOwner(
    link.targetModuleInstanceId,
    ownerId,
  );
  const extraNodes =
    context === null
      ? []
      : moduleInstancePortDescriptors(
          link.targetModuleInstanceId,
          context.moduleInstance.modulePackageId,
          context.moduleInstance.moduleVersion,
        );

  const targetDescriptor: GraphNodeDescriptor = {
    kind: "module_input",
    moduleInstanceId: link.targetModuleInstanceId,
    assemblyId: null,
    parameterId: link.targetParameterId,
    loadCase: link.targetLoadCase,
  };

  const staleModuleInstanceIds = await computeImpact(
    link.configurationId,
    targetDescriptor,
    extraNodes,
    prisma,
  );
  return { ok: true, staleModuleInstanceIds };
}

/**
 * Removes a confirmed `ParameterLink` and marks every downstream calculation
 * run stale in the same transaction — the target module's resolved input
 * reverts (to another source or the parameter's default), so its result may
 * no longer reflect what was actually computed.
 */
export async function removeParameterLink(
  linkId: ParameterLinkId,
  ownerId: UserId,
): Promise<RemoveParameterLinkResult> {
  const link = await loadParameterLinkForOwner(linkId, ownerId);
  if (link === null) {
    return unauthorized("Parameter link not found or not owned by this user.");
  }

  const context = await loadModuleInstanceForOwner(
    link.targetModuleInstanceId,
    ownerId,
  );
  const extraNodes =
    context === null
      ? []
      : moduleInstancePortDescriptors(
          link.targetModuleInstanceId,
          context.moduleInstance.modulePackageId,
          context.moduleInstance.moduleVersion,
        );

  const targetDescriptor: GraphNodeDescriptor = {
    kind: "module_input",
    moduleInstanceId: link.targetModuleInstanceId,
    assemblyId: null,
    parameterId: link.targetParameterId,
    loadCase: link.targetLoadCase,
  };

  const staleModuleInstanceIds = await prisma.$transaction(async (tx) => {
    // Computed inside the transaction, and before the delete, so the traversal
    // still sees the link whose removal is being propagated.
    const impacted = await computeImpact(
      link.configurationId,
      targetDescriptor,
      extraNodes,
      tx,
    );
    await markRunsStaleForModuleInstances(
      impacted,
      "A parameter link was removed.",
      tx,
    );
    await markComponentAssignmentsStaleForModuleInstances(
      impacted,
      "A parameter link was removed.",
      tx,
    );
    await deleteParameterLink(linkId, ownerId, tx);
    return impacted;
  });

  return { ok: true, staleModuleInstanceIds };
}
