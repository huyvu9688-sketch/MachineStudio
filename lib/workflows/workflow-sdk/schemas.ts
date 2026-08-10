// Structural (Zod) validation for the declarative WorkflowDefinition contract
// in ./types. Shape only — presence, types, enum membership, non-empty
// strings — mirroring lib/engine/module-sdk/schemas.ts's own split (schema
// here, semantic/referential validation in ./conformance). Strict: unknown
// keys are rejected (context/code-standards.md "Validation").

import { z } from "zod";
import type { ParameterId } from "@/lib/engine";
import type {
  CandidateComparisonCriterion,
  CompletionRule,
  WorkflowCheckRule,
  WorkflowDefinition,
  WorkflowLinkProposalRule,
  WorkflowManifest,
  WorkflowModuleRole,
  WorkflowRoleCardinality,
} from "./types";

const nonEmptyString = z.string().min(1);
const parameterId = nonEmptyString.transform(
  (v): ParameterId => v as ParameterId,
);
const loadCase = z.enum(["normal", "peak", "holding", "emergency_stop"]);

export const WorkflowManifestSchema = z.strictObject({
  id: nonEmptyString,
  version: nonEmptyString,
  title: nonEmptyString,
  description: nonEmptyString,
});

export const WorkflowRoleCardinalitySchema = z.strictObject({
  min: z.number().int().min(0),
  max: z.number().int().min(0).optional(),
});

export const WorkflowModuleRoleSchema = z.strictObject({
  id: nonEmptyString,
  label: nonEmptyString,
  moduleIds: z.array(nonEmptyString).min(1).readonly(),
  cardinality: WorkflowRoleCardinalitySchema,
});

export const WorkflowLinkProposalRuleSchema = z.strictObject({
  id: nonEmptyString,
  parameterId,
  fromRoleId: nonEmptyString,
  toRoleId: nonEmptyString,
  note: nonEmptyString.optional(),
});

export const CompletionRuleSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("role_cardinality"),
    id: nonEmptyString,
    roleId: nonEmptyString,
  }),
  z.strictObject({
    kind: z.literal("link_confirmed"),
    id: nonEmptyString,
    ruleId: nonEmptyString,
  }),
  z.strictObject({
    kind: z.literal("no_failing_checks"),
    id: nonEmptyString,
    roleIds: z.array(nonEmptyString).min(1).readonly(),
  }),
  z.strictObject({
    kind: z.literal("conditional_acknowledgment"),
    id: nonEmptyString,
    roleId: nonEmptyString,
    parameterId,
    whenValue: nonEmptyString,
    acknowledgmentId: nonEmptyString,
  }),
]);

export const WorkflowCheckRuleSchema = z.strictObject({
  kind: z.literal("shared_value_topology"),
  id: nonEmptyString,
  parameterId,
  roleIds: z.array(nonEmptyString).min(1).readonly(),
});

export const CandidateComparisonCriterionSchema = z.strictObject({
  id: nonEmptyString,
  roleId: nonEmptyString,
  parameterId,
  loadCase: loadCase.optional(),
  direction: z.enum(["higher_is_better", "lower_is_better"]),
});

export const WorkflowDefinitionSchema = z.strictObject({
  manifest: WorkflowManifestSchema,
  roles: z.array(WorkflowModuleRoleSchema).readonly(),
  sequence: z.array(z.array(nonEmptyString).readonly()).readonly(),
  linkRules: z.array(WorkflowLinkProposalRuleSchema).readonly(),
  completionRules: z.array(CompletionRuleSchema).readonly(),
  checkRules: z.array(WorkflowCheckRuleSchema).readonly(),
  comparisonCriteria: z.array(CandidateComparisonCriterionSchema).readonly(),
});

/** Validates an unknown value as a well-formed {@link WorkflowDefinition} shape. */
export function parseWorkflowDefinition(input: unknown): WorkflowDefinition {
  return WorkflowDefinitionSchema.parse(input);
}

// --- Compile-time schema/interface parity guard -----------------------------

type MutuallyAssignable<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : false
  : false;

type Assert<T extends true> = T;

export type _WorkflowSdkSchemaParity = [
  Assert<
    MutuallyAssignable<WorkflowManifest, z.infer<typeof WorkflowManifestSchema>>
  >,
  Assert<
    MutuallyAssignable<
      WorkflowRoleCardinality,
      z.infer<typeof WorkflowRoleCardinalitySchema>
    >
  >,
  Assert<
    MutuallyAssignable<
      WorkflowModuleRole,
      z.infer<typeof WorkflowModuleRoleSchema>
    >
  >,
  Assert<
    MutuallyAssignable<
      WorkflowLinkProposalRule,
      z.infer<typeof WorkflowLinkProposalRuleSchema>
    >
  >,
  Assert<
    MutuallyAssignable<CompletionRule, z.infer<typeof CompletionRuleSchema>>
  >,
  Assert<
    MutuallyAssignable<
      WorkflowCheckRule,
      z.infer<typeof WorkflowCheckRuleSchema>
    >
  >,
  Assert<
    MutuallyAssignable<
      CandidateComparisonCriterion,
      z.infer<typeof CandidateComparisonCriterionSchema>
    >
  >,
  Assert<
    MutuallyAssignable<
      WorkflowDefinition,
      z.infer<typeof WorkflowDefinitionSchema>
    >
  >,
];
