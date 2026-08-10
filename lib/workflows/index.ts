// lib/workflows owns guided-workflow definitions that coordinate compatible
// modules without combining their compute logic (context/architecture.md
// "lib/workflows/"). Each definition lives at
// lib/workflows/<workflow-id>/<version>/definition.ts and conforms to the
// generic WorkflowDefinition contract in ./workflow-sdk.

import type { WorkflowDefinition } from "./workflow-sdk";
import { WORKFLOW_REGISTRY } from "./registry";

export { WORKFLOW_REGISTRY };

/**
 * Looks up a registered workflow definition by ID and version, or
 * `undefined` when no such version is registered.
 */
export function getWorkflowDefinition(
  workflowId: string,
  version: string,
): WorkflowDefinition | undefined {
  return WORKFLOW_REGISTRY[`${workflowId}@${version}`];
}

/** Every registered workflow definition, in registration-key order. */
export function listWorkflowDefinitions(): readonly WorkflowDefinition[] {
  return Object.values(WORKFLOW_REGISTRY);
}
