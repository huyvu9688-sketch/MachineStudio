// Derives a workflow instance's lifecycle status from its completion state.
// Mirrors prisma/schema.prisma's WorkflowInstanceStatus enum
// (draft | active | completed | abandoned) — see ./types WorkflowStatus.
//
// `"abandoned"` is deliberately never returned: it is an explicit user
// action (the engineer gives up on this instance), not a state derivable
// from engineering data. The future application layer widens this type when
// a user explicitly abandons an instance.

import type { CompletionResult } from "./completion";
import type { WorkflowInstanceContext, WorkflowStatus } from "./types";

/** Every status this function can derive — everything except the explicit `"abandoned"` action. */
export type ReachableWorkflowStatus = Exclude<WorkflowStatus, "abandoned">;

/** Input to {@link evaluateWorkflowStatus}. */
export interface EvaluateWorkflowStatusInput {
  readonly instances: readonly WorkflowInstanceContext[];
  /** The result of `evaluateCompletion` for the same instances. */
  readonly completion: CompletionResult;
}

/**
 * `"completed"` once every completion rule is satisfied; `"active"` once at
 * least one role instance is present; `"draft"` otherwise (no instance
 * added yet).
 */
export function evaluateWorkflowStatus(
  input: EvaluateWorkflowStatusInput,
): ReachableWorkflowStatus {
  if (input.completion.satisfied) return "completed";
  return input.instances.length > 0 ? "active" : "draft";
}
