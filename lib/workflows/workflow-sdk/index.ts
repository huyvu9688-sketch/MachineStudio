// Public surface of the workflow SDK (Unit 4.8). A concrete workflow, such
// as `../linear-axis/1.0.0/definition.ts`, imports only from here — never
// from a sibling file directly — the same convention lib/engine/module-sdk
// and lib/engine/graph already establish for their own public surfaces.

export type {
  CandidateComparisonCriterion,
  CompletionRule,
  WorkflowCheckRule,
  WorkflowDefinition,
  WorkflowLinkProposal,
  WorkflowLinkProposalRule,
  WorkflowManifest,
  WorkflowModuleRole,
  WorkflowRoleCardinality,
  WorkflowRoleInstance,
  WorkflowInstanceContext,
  WorkflowStatus,
} from "./types";

export { WorkflowDefinitionSchema, parseWorkflowDefinition } from "./schemas";

export { findValueForParameter } from "./instance-values";

export {
  instancePortNodeId,
  linkProposalKey,
  resolveLinkProposals,
} from "./links";

export {
  evaluateCompletion,
  type CompletionResult,
  type CompletionRuleResult,
  type EvaluateCompletionInput,
} from "./completion";

export {
  evaluateWorkflowChecks,
  type EvaluateWorkflowChecksInput,
} from "./checks";

export {
  compareCandidateSystems,
  type CandidateComparisonResult,
  type CandidateCriterionValue,
  type CompareCandidateSystemsResult,
  type WorkflowCandidate,
  type WorkflowCandidateInstance,
} from "./comparison";

export {
  evaluateWorkflowStatus,
  type EvaluateWorkflowStatusInput,
  type ReachableWorkflowStatus,
} from "./status";

export {
  runWorkflowConformance,
  type ConformanceCheck,
  type ConformanceOptions,
  type ConformanceReport,
  type ConformanceStatus,
} from "./conformance";
