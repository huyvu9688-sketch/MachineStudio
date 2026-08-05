// Structural (Zod) validation for the declarative module-package contracts and
// the runtime input/computation envelopes in ./types. Shape only — presence,
// types, enum membership, non-empty strings. Package/semantic invariants (ports
// reference real parameters, UI fields reference real ports, content hash
// matches, SDK/registry compatibility) live in ./validate; run-time input/output
// checks live in ./execute. Schemas are strict: unknown keys are rejected. See
// context/code-standards.md "Validation".
//
// The `compute` function, the author-provided `inputSchema`, and the
// `catalogAdapter` carry behavior (functions/schemas) and are not Zod-validated;
// everything declarative is.

import { z } from "zod";
import { EngineeringValueSchema } from "../values";
import { ClauseReferenceSchema } from "../../standards/schemas";
import {
  CalculationTraceSchema,
  CheckResultSchema,
  ValidityResultSchema,
  WarningSchema,
} from "../trace";
import type { ParameterId } from "../parameters";
import type { SourceRevisionId } from "../../standards/types";
import type {
  Assumption,
  ModuleComputation,
  ModuleInput,
  ModuleInputPort,
  ModuleManifest,
  ModuleOutputPort,
  ModulePorts,
  ModuleReplacement,
  ModuleReportSchema,
  ModuleReportSection,
  ModuleUiField,
  ModuleUiGroup,
  ModuleUiSchema,
  ReferenceExample,
  ValidationRecord,
} from "./types";

const nonEmptyString = z.string().min(1);
const parameterId = nonEmptyString.transform(
  (v): ParameterId => v as ParameterId,
);
const sourceRevisionId = nonEmptyString.transform(
  (v): SourceRevisionId => v as SourceRevisionId,
);
const sourceRevisionIds = z.array(sourceRevisionId).readonly();
const clauseReferences = z.array(ClauseReferenceSchema).readonly();
const loadCase = z.enum(["normal", "peak", "holding", "emergency_stop"]);
const engineeringValues = z
  .record(nonEmptyString, EngineeringValueSchema)
  .readonly();

export const SdkRangeSchema = z.strictObject({
  min: nonEmptyString,
  maxExclusive: nonEmptyString.optional(),
});

export const ModuleReplacementSchema = z.strictObject({
  moduleId: nonEmptyString,
  version: nonEmptyString,
  note: nonEmptyString.optional(),
});

export const ModuleManifestSchema = z.strictObject({
  id: nonEmptyString,
  version: nonEmptyString,
  contentHash: nonEmptyString,
  sdkRange: SdkRangeSchema,
  parameterRegistryVersion: nonEmptyString,
  category: nonEmptyString,
  tags: z.array(nonEmptyString).readonly(),
  workflowRoles: z.array(nonEmptyString).readonly(),
  validityEnvelopeSummary: nonEmptyString,
  sourceRevisionIds,
  replacedBy: ModuleReplacementSchema.optional(),
});

export const ModuleInputPortSchema = z.strictObject({
  key: nonEmptyString,
  parameterId,
  required: z.boolean(),
  loadCase: loadCase.optional(),
});

export const ModuleOutputPortSchema = z.strictObject({
  key: nonEmptyString,
  parameterId,
  loadCase: loadCase.optional(),
});

export const ModulePortsSchema = z.strictObject({
  inputs: z.array(ModuleInputPortSchema).readonly(),
  outputs: z.array(ModuleOutputPortSchema).readonly(),
});

export const ModuleUiFieldSchema = z.strictObject({
  portKey: nonEmptyString,
  label: nonEmptyString.optional(),
  help: nonEmptyString.optional(),
});

export const ModuleUiGroupSchema = z.strictObject({
  id: nonEmptyString,
  title: nonEmptyString,
  fields: z.array(ModuleUiFieldSchema).readonly(),
});

export const ModuleUiSchemaSchema = z.strictObject({
  groups: z.array(ModuleUiGroupSchema).readonly(),
});

const reportSectionKind = z.enum([
  "inputs",
  "outputs",
  "checks",
  "trace",
  "assumptions",
  "warnings",
  "validity",
]);

export const ModuleReportSectionSchema = z.strictObject({
  id: nonEmptyString,
  title: nonEmptyString,
  include: reportSectionKind,
});

export const ModuleReportSchemaSchema = z.strictObject({
  sections: z.array(ModuleReportSectionSchema).readonly(),
});

export const ReferenceExampleSchema = z.strictObject({
  id: nonEmptyString,
  description: nonEmptyString,
  tolerance: nonEmptyString,
});

export const ValidationRecordSchema = z.strictObject({
  moduleId: nonEmptyString,
  moduleVersion: nonEmptyString,
  methods: z.array(nonEmptyString).readonly(),
  sourceRevisionIds,
  referenceExamples: z.array(ReferenceExampleSchema).readonly(),
  independentBenchmark: nonEmptyString,
  reviewer: nonEmptyString,
  reviewDate: nonEmptyString,
  supportedUseLimits: z.array(nonEmptyString).readonly(),
  deviations: z.array(nonEmptyString).readonly(),
});

export const AssumptionSchema = z.strictObject({
  id: nonEmptyString,
  statement: nonEmptyString,
  value: EngineeringValueSchema.optional(),
  sources: clauseReferences.optional(),
});

export const ModuleInputSchema = z.strictObject({
  values: engineeringValues,
  loadCaseId: nonEmptyString.optional(),
});

export const ModuleComputationSchema = z.strictObject({
  outputs: engineeringValues,
  trace: CalculationTraceSchema,
  checks: z.array(CheckResultSchema).readonly(),
  warnings: z.array(WarningSchema).readonly(),
  assumptions: z.array(AssumptionSchema).readonly(),
  validity: z.array(ValidityResultSchema).readonly(),
});

/** Validates an unknown value as a well-formed {@link ModuleInput} envelope. */
export function parseModuleInput(input: unknown): ModuleInput {
  return ModuleInputSchema.parse(input);
}

/** Validates an unknown value as a well-formed {@link ModuleComputation}. */
export function parseModuleComputation(input: unknown): ModuleComputation {
  return ModuleComputationSchema.parse(input);
}

// --- Compile-time schema/interface parity guard -----------------------------

type MutuallyAssignable<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : false
  : false;

type Assert<T extends true> = T;

export type _ModuleSdkSchemaParity = [
  Assert<
    MutuallyAssignable<
      ModuleReplacement,
      z.infer<typeof ModuleReplacementSchema>
    >
  >,
  Assert<
    MutuallyAssignable<ModuleManifest, z.infer<typeof ModuleManifestSchema>>
  >,
  Assert<
    MutuallyAssignable<ModuleInputPort, z.infer<typeof ModuleInputPortSchema>>
  >,
  Assert<
    MutuallyAssignable<ModuleOutputPort, z.infer<typeof ModuleOutputPortSchema>>
  >,
  Assert<MutuallyAssignable<ModulePorts, z.infer<typeof ModulePortsSchema>>>,
  Assert<
    MutuallyAssignable<ModuleUiField, z.infer<typeof ModuleUiFieldSchema>>
  >,
  Assert<
    MutuallyAssignable<ModuleUiGroup, z.infer<typeof ModuleUiGroupSchema>>
  >,
  Assert<
    MutuallyAssignable<ModuleUiSchema, z.infer<typeof ModuleUiSchemaSchema>>
  >,
  Assert<
    MutuallyAssignable<
      ModuleReportSection,
      z.infer<typeof ModuleReportSectionSchema>
    >
  >,
  Assert<
    MutuallyAssignable<
      ModuleReportSchema,
      z.infer<typeof ModuleReportSchemaSchema>
    >
  >,
  Assert<
    MutuallyAssignable<ReferenceExample, z.infer<typeof ReferenceExampleSchema>>
  >,
  Assert<
    MutuallyAssignable<ValidationRecord, z.infer<typeof ValidationRecordSchema>>
  >,
  Assert<MutuallyAssignable<Assumption, z.infer<typeof AssumptionSchema>>>,
  Assert<MutuallyAssignable<ModuleInput, z.infer<typeof ModuleInputSchema>>>,
  Assert<
    MutuallyAssignable<
      ModuleComputation,
      z.infer<typeof ModuleComputationSchema>
    >
  >,
];
