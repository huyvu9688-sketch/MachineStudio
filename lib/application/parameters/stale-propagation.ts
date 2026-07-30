// Stale-propagation use cases (Unit 2.5): change a manual/default value,
// change a workflow-provided value, confirm a link, and remove a link. Each
// computes downstream impact with `lib/engine/graph`'s `computeStaleImpact`
// and marks the affected calculation runs stale in the same transaction as
// the change (context/architecture.md invariant 8, "Transactional stale
// propagation": "downstream runs and component assignments become stale in
// the same transaction as the upstream change").
//
// DEFERRED (not implemented here): "change an assigned-component feedback
// input" — the fourth use case the implementation map names. It needs
// `ComponentAssignment`, which does not exist yet (Unit 2.8). Revisit then.
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
import { computeStaleImpact } from "@/lib/engine";
import { getModulePackage } from "@/lib/modules";
import {
  GraphRepositoryError,
  asModuleInstanceId,
  createParameterLink,
  createParameterValue,
  deleteParameterLink,
  isConfigurationOwnedBy,
  loadConfigurationGraph,
  loadModuleInstanceForOwner,
  loadParameterLinkForOwner,
  markRunsStaleForModuleInstances,
  parameterGraphNodeId,
  prisma,
  type CreateParameterLinkInput,
  type CreateParameterValueInput,
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
  | "duplicate_link";

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

function unauthorized(message: string): { ok: false; error: StalePropagationError } {
  return { ok: false, error: { code: "unauthorized", message } };
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
 */
async function computeImpact(
  configurationId: string,
  changedDescriptor: GraphNodeDescriptor,
  extraNodes: readonly GraphNodeDescriptor[],
): Promise<readonly ModuleInstanceId[]> {
  const changedNodeId = parameterGraphNodeId(changedDescriptor);
  const graph = await loadConfigurationGraph(configurationId, [
    changedDescriptor,
    ...extraNodes,
  ]);
  const impact = computeStaleImpact(graph, [changedNodeId]);
  return impact.staleModuleInstanceIds.map(asModuleInstanceId);
}

/**
 * Changes a manual or workflow-provided value — a provider value (machine
 * requirement, assembly parameter, workflow parameter) or a module's own
 * directly-authored input — and marks every downstream calculation run stale
 * in the same transaction as the write (invariant "Transactional stale
 * propagation"). Authored values are append-only history (Unit 2.2): this
 * creates a new `ParameterValue` row; it does not edit an existing one.
 */
export async function setParameterValue(
  input: CreateParameterValueInput,
  ownerId: UserId,
): Promise<SetParameterValueResult> {
  let extraNodes: readonly GraphNodeDescriptor[] = [];
  if (input.moduleInstanceId !== undefined) {
    const context = await loadModuleInstanceForOwner(input.moduleInstanceId, ownerId);
    if (context === null) {
      return unauthorized("Module instance not found or not owned by this user.");
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
  }

  const changedDescriptor: GraphNodeDescriptor = {
    kind: input.nodeKind,
    moduleInstanceId: input.moduleInstanceId ?? null,
    assemblyId: input.assemblyId ?? null,
    parameterId: input.parameterId,
    loadCase: input.loadCase ?? null,
  };
  const staleModuleInstanceIds = await computeImpact(
    input.configurationId,
    changedDescriptor,
    extraNodes,
  );

  try {
    const value = await prisma.$transaction(async (tx) => {
      // Stale-marking runs first so an invalid `input.value` (caught by
      // createParameterValue's own validation) rolls back the whole
      // transaction, proving atomicity rather than merely short-circuiting.
      await markRunsStaleForModuleInstances(
        staleModuleInstanceIds,
        "An upstream parameter value changed.",
        tx,
      );
      return createParameterValue(input, tx);
    });
    return { ok: true, value, staleModuleInstanceIds };
  } catch (error) {
    if (error instanceof GraphRepositoryError) {
      return { ok: false, error: { code: "invalid_input", message: error.message } };
    }
    throw error;
  }
}

/**
 * Confirms a `ParameterLink` (invariant "No silent binding": links are never
 * created silently) and marks every downstream calculation run stale in the
 * same transaction, including the target module's own runs — its resolved
 * input has effectively changed.
 */
export async function confirmParameterLink(
  input: CreateParameterLinkInput,
  ownerId: UserId,
): Promise<ConfirmParameterLinkResult> {
  const context = await loadModuleInstanceForOwner(input.targetModuleInstanceId, ownerId);
  if (context === null) {
    return unauthorized("Target module instance not found or not owned by this user.");
  }
  const extraNodes = moduleInstancePortDescriptors(
    input.targetModuleInstanceId,
    context.moduleInstance.modulePackageId,
    context.moduleInstance.moduleVersion,
  );

  const targetDescriptor: GraphNodeDescriptor = {
    kind: "module_input",
    moduleInstanceId: input.targetModuleInstanceId,
    assemblyId: null,
    parameterId: input.targetParameterId,
    loadCase: input.targetLoadCase ?? null,
  };
  const staleModuleInstanceIds = await computeImpact(
    input.configurationId,
    targetDescriptor,
    extraNodes,
  );

  try {
    const link = await prisma.$transaction(async (tx) => {
      await markRunsStaleForModuleInstances(
        staleModuleInstanceIds,
        "A parameter link was confirmed.",
        tx,
      );
      return createParameterLink(input, tx);
    });
    return { ok: true, link, staleModuleInstanceIds };
  } catch (error) {
    if (error instanceof GraphRepositoryError) {
      const code = error.code === "cycle" || error.code === "duplicate_link" ? error.code : "invalid_input";
      return { ok: false, error: { code, message: error.message } };
    }
    throw error;
  }
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

  const context = await loadModuleInstanceForOwner(link.targetModuleInstanceId, ownerId);
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
  );

  await prisma.$transaction(async (tx) => {
    await markRunsStaleForModuleInstances(
      staleModuleInstanceIds,
      "A parameter link was removed.",
      tx,
    );
    await deleteParameterLink(linkId, ownerId, tx);
  });

  return { ok: true, staleModuleInstanceIds };
}
