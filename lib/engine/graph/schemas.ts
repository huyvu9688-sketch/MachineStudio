// Structural (Zod) validation for the parameter-graph contracts in ./types.
// Shape only — presence, types, non-empty strings, enum membership. Referential
// integrity (links reference real nodes, module ports carry a module instance,
// scope hierarchy is acyclic) lives in ./graph `buildParameterGraph`. Schemas
// are strict: unknown keys are rejected. These structures are persisted in
// Unit 2.2, so they are validated on read (context/code-standards.md
// "Validation": "Never trust JSONB only because the application wrote it").

import { z } from "zod";
import type { ParameterId, LoadCaseCategory } from "../parameters";
import type {
  ApprovedParameterMapping,
  GraphLink,
  GraphNode,
  GraphScope,
  LinkId,
  NodeId,
  ParameterGraph,
  ScopeId,
} from "./types";

const nonEmptyString = z.string().min(1);
const parameterId = nonEmptyString.transform(
  (v): ParameterId => v as ParameterId,
);
const scopeId = nonEmptyString.transform((v): ScopeId => v as ScopeId);
const nodeId = nonEmptyString.transform((v): NodeId => v as NodeId);
const linkId = nonEmptyString.transform((v): LinkId => v as LinkId);
const loadCase = z.enum(["normal", "peak", "holding", "emergency_stop"]);

const nodeKind = z.enum([
  "machine_requirement",
  "assembly_parameter",
  "workflow_parameter",
  "module_output",
  "module_input",
]);

export const GraphScopeSchema = z.strictObject({
  id: scopeId,
  parentId: scopeId.optional(),
});

export const GraphNodeSchema = z.strictObject({
  id: nodeId,
  kind: nodeKind,
  parameterId,
  scopeId,
  loadCase: loadCase.optional(),
  moduleInstanceId: nonEmptyString.optional(),
});

export const GraphLinkSchema = z.strictObject({
  id: linkId,
  sourceNodeId: nodeId,
  targetNodeId: nodeId,
});

export const ParameterGraphSchema = z.strictObject({
  scopes: z.array(GraphScopeSchema).readonly(),
  nodes: z.array(GraphNodeSchema).readonly(),
  links: z.array(GraphLinkSchema).readonly(),
});

export const ApprovedParameterMappingSchema = z.strictObject({
  from: parameterId,
  to: parameterId,
  note: nonEmptyString.optional(),
});

/** Validates an unknown value as a well-formed {@link ParameterGraph}. */
export function parseParameterGraph(input: unknown): ParameterGraph {
  return ParameterGraphSchema.parse(input);
}

// --- Compile-time schema/interface parity guard -----------------------------

type MutuallyAssignable<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : false
  : false;

type Assert<T extends true> = T;

export type _GraphSchemaParity = [
  // Guards the local load-case enum against the parameters package's own union.
  Assert<MutuallyAssignable<LoadCaseCategory, z.infer<typeof loadCase>>>,
  Assert<MutuallyAssignable<GraphScope, z.infer<typeof GraphScopeSchema>>>,
  Assert<MutuallyAssignable<GraphNode, z.infer<typeof GraphNodeSchema>>>,
  Assert<MutuallyAssignable<GraphLink, z.infer<typeof GraphLinkSchema>>>,
  Assert<
    MutuallyAssignable<ParameterGraph, z.infer<typeof ParameterGraphSchema>>
  >,
  Assert<
    MutuallyAssignable<
      ApprovedParameterMapping,
      z.infer<typeof ApprovedParameterMappingSchema>
    >
  >,
];
