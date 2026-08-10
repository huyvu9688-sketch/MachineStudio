// The `startWorkflowInstance` use case (Unit 4.9): creates a `WorkflowInstance`
// row for a configuration, from a workflow definition actually registered in
// `lib/workflows` (mirrors `addModuleInstance`'s "never instantiate an
// unregistered package" rigor, lib/application/projects/add-module-instance.ts,
// one level up: the workflow definition itself, not a module package).
//
// Deliberately does not also create any `ModuleInstance` for the workflow's
// roles: attaching a module instance to a workflow instance is
// `addModuleInstance`'s own `workflowInstanceId` input (extended for this
// unit), reused rather than duplicated here.

import "server-only";
import { getWorkflowDefinition } from "@/lib/workflows";
import {
  createWorkflowInstance,
  isConfigurationOwnedBy,
  type MachineConfigurationId,
  type UserId,
  type WorkflowInstanceRecord,
} from "@/lib/db";

/** Machine-readable classification of a {@link startWorkflowInstance} failure. */
export type StartWorkflowInstanceErrorCode =
  "unauthorized" | "workflow_not_found";

/** A failed {@link startWorkflowInstance} outcome. */
export interface StartWorkflowInstanceError {
  readonly code: StartWorkflowInstanceErrorCode;
  readonly message: string;
}

/** Input to {@link startWorkflowInstance}. */
export interface StartWorkflowInstanceInput {
  readonly configurationId: MachineConfigurationId;
  readonly workflowId: string;
  readonly workflowVersion: string;
}

/** Result of {@link startWorkflowInstance}. */
export type StartWorkflowInstanceResult =
  | { readonly ok: true; readonly workflowInstance: WorkflowInstanceRecord }
  | { readonly ok: false; readonly error: StartWorkflowInstanceError };

/**
 * Starts a guided workflow instance for a configuration the caller owns, from
 * a workflow definition actually registered in `lib/workflows`
 * (`WORKFLOW_REGISTRY`/`getWorkflowDefinition`) — a caller can never start an
 * unregistered or mistyped workflow id+version this way.
 */
export async function startWorkflowInstance(
  input: StartWorkflowInstanceInput,
  ownerId: UserId,
): Promise<StartWorkflowInstanceResult> {
  const owned = await isConfigurationOwnedBy(input.configurationId, ownerId);
  if (!owned) {
    return {
      ok: false,
      error: {
        code: "unauthorized",
        message: "Configuration not found or not owned by this user.",
      },
    };
  }

  const definition = getWorkflowDefinition(
    input.workflowId,
    input.workflowVersion,
  );
  if (definition === undefined) {
    return {
      ok: false,
      error: {
        code: "workflow_not_found",
        message: `Workflow "${input.workflowId}@${input.workflowVersion}" is not registered.`,
      },
    };
  }

  const workflowInstance = await createWorkflowInstance({
    configurationId: input.configurationId,
    // The registry's own manifest values, not the caller's unvalidated
    // strings — identical once getWorkflowDefinition resolves, but this is
    // the confirmed-canonical source (mirrors addModuleInstance's own
    // pkg.manifest.id/version convention).
    workflowId: definition.manifest.id,
    workflowVersion: definition.manifest.version,
  });
  return { ok: true, workflowInstance };
}
