// Zod validation for the machine-baseline snapshot (Unit 2.9 part 1). A
// stored baseline snapshot is validated on both write and read — "never
// trust JSONB only because the application originally wrote it"
// (context/code-standards.md "Validation": "Stored calculation snapshots" —
// the same rule applied to `MachineBaseline.snapshot`). Composes the engine's
// own `EngineeringValueSchema` and lib/catalog's `ManualPartDetailsSchema` so
// the snapshot envelope stays in lockstep with those contracts rather than
// duplicating them, the same approach `lib/db/repositories/run-snapshot.ts`
// takes for `CalculationRunSnapshot`.

import { z } from "zod";
import { EngineeringValueSchema } from "../engine/values";
import { ManualPartDetailsSchema } from "../catalog";
import type {
  BaselineAcceptanceCriterion,
  BaselineAssemblyNode,
  BaselineCalculationRunRef,
  BaselineComponentAssignment,
  BaselineComponentAssignmentPartSource,
  BaselineComponentAssignmentTargetKind,
  BaselineDesignAssumption,
  BaselineLoadCase,
  BaselineModuleInstance,
  BaselineParameterLink,
  BaselineParameterValue,
  BaselineParameterValueSource,
  BaselineRequirement,
  MachineBaselineSnapshot,
} from "./types";
import { BASELINE_SNAPSHOT_FORMAT_VERSION } from "./types";

const nonEmpty = z.string().trim().min(1);
const nullableId = z.union([nonEmpty, z.null()]);

const graphNodeKindSchema = z.enum([
  "machine_requirement",
  "assembly_parameter",
  "workflow_parameter",
  "module_input",
  "module_output",
]);
const loadCaseCategorySchema = z.enum(["normal", "peak", "holding", "emergency_stop"]);
const checkStatusSchema = z.enum(["pass", "fail", "warning", "not_applicable", "invalid_input"]);
const parameterValueSourceSchema: z.ZodType<BaselineParameterValueSource> = z.enum([
  "manual",
  "workflow",
]);
const targetKindSchema: z.ZodType<BaselineComponentAssignmentTargetKind> = z.enum([
  "module_instance",
  "assembly",
]);
const partSourceSchema: z.ZodType<BaselineComponentAssignmentPartSource> = z.enum([
  "catalog",
  "manual",
]);

const acceptanceCriterionSchema: z.ZodType<BaselineAcceptanceCriterion> = z
  .object({ id: nonEmpty, statement: nonEmpty })
  .strict();

const requirementSchema: z.ZodType<BaselineRequirement> = z
  .object({
    id: nonEmpty,
    assemblyId: nullableId,
    code: nonEmpty,
    statement: nonEmpty,
    acceptanceCriteria: z.array(acceptanceCriterionSchema).readonly(),
  })
  .strict();

const designAssumptionSchema: z.ZodType<BaselineDesignAssumption> = z
  .object({
    id: nonEmpty,
    assemblyId: nullableId,
    statement: nonEmpty,
    rationale: z.union([nonEmpty, z.null()]),
  })
  .strict();

const loadCaseSchema: z.ZodType<BaselineLoadCase> = z
  .object({
    id: nonEmpty,
    category: loadCaseCategorySchema,
    label: nonEmpty,
    description: z.union([nonEmpty, z.null()]),
  })
  .strict();

const moduleInstanceSchema: z.ZodType<BaselineModuleInstance> = z
  .object({
    id: nonEmpty,
    modulePackageId: nonEmpty,
    moduleVersion: nonEmpty,
    label: nonEmpty,
    workflowInstanceId: nullableId,
    lastCalculationRunId: nullableId,
    lastRunStatus: z.union([checkStatusSchema, z.null()]),
  })
  .strict();

// `BaselineAssemblyNode` nests itself (`children`), so its schema must be
// defined with `z.lazy` to reference itself before it exists.
const assemblyNodeSchema: z.ZodType<BaselineAssemblyNode> = z.lazy(() =>
  z
    .object({
      id: nonEmpty,
      parentId: nullableId,
      name: nonEmpty,
      moduleInstances: z.array(moduleInstanceSchema).readonly(),
      children: z.array(assemblyNodeSchema).readonly(),
    })
    .strict(),
);

const parameterValueSchema: z.ZodType<BaselineParameterValue> = z
  .object({
    id: nonEmpty,
    assemblyId: nullableId,
    moduleInstanceId: nullableId,
    nodeKind: graphNodeKindSchema,
    parameterId: nonEmpty,
    loadCase: z.union([loadCaseCategorySchema, z.null()]),
    source: parameterValueSourceSchema,
    value: EngineeringValueSchema,
  })
  .strict();

const parameterLinkSchema: z.ZodType<BaselineParameterLink> = z
  .object({
    id: nonEmpty,
    targetModuleInstanceId: nonEmpty,
    targetParameterId: nonEmpty,
    targetLoadCase: z.union([loadCaseCategorySchema, z.null()]),
    sourceKind: graphNodeKindSchema,
    sourceModuleInstanceId: nullableId,
    sourceAssemblyId: nullableId,
    sourceParameterId: nonEmpty,
    sourceLoadCase: z.union([loadCaseCategorySchema, z.null()]),
  })
  .strict();

const calculationRunRefSchema: z.ZodType<BaselineCalculationRunRef> = z
  .object({
    id: nonEmpty,
    moduleInstanceId: nonEmpty,
    modulePackageId: nonEmpty,
    moduleVersion: nonEmpty,
    modulePackageHash: nonEmpty,
    status: checkStatusSchema,
    stale: z.boolean(),
  })
  .strict();

const componentAssignmentSchema: z.ZodType<BaselineComponentAssignment> = z
  .object({
    id: nonEmpty,
    targetKind: targetKindSchema,
    moduleInstanceId: nullableId,
    assemblyId: nullableId,
    partSource: partSourceSchema,
    manufacturerPartRevisionId: nullableId,
    manualPartDetails: z.union([ManualPartDetailsSchema, z.null()]),
    quantity: z.number().int().positive(),
    calculationRunId: nullableId,
    stale: z.boolean(),
  })
  .strict();

/** Validates an unknown payload as a {@link MachineBaselineSnapshot}. */
export const MachineBaselineSnapshotSchema: z.ZodType<MachineBaselineSnapshot> = z
  .object({
    snapshotVersion: z.literal(BASELINE_SNAPSHOT_FORMAT_VERSION),
    projectId: nonEmpty,
    projectName: nonEmpty,
    configurationId: nonEmpty,
    configurationName: nonEmpty,
    marketProfileKey: nonEmpty,
    requirements: z.array(requirementSchema).readonly(),
    designAssumptions: z.array(designAssumptionSchema).readonly(),
    loadCases: z.array(loadCaseSchema).readonly(),
    assemblies: z.array(assemblyNodeSchema).readonly(),
    parameterValues: z.array(parameterValueSchema).readonly(),
    parameterLinks: z.array(parameterLinkSchema).readonly(),
    calculationRuns: z.array(calculationRunRefSchema).readonly(),
    componentAssignments: z.array(componentAssignmentSchema).readonly(),
    createdAt: nonEmpty,
    createdByUserId: nonEmpty.optional(),
  })
  .strict();

/**
 * Non-throwing validation of an untrusted/stored baseline snapshot, returning
 * Zod's discriminated success/error result.
 */
export function safeParseMachineBaselineSnapshot(
  input: unknown,
): z.ZodSafeParseResult<MachineBaselineSnapshot> {
  return MachineBaselineSnapshotSchema.safeParse(input);
}
