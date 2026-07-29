// Structural (Zod) validation for parameter definitions in ./types. This layer
// checks shape only — field presence, types, and enum membership — so a
// definition read from an external/persistence boundary is well-formed
// (context/code-standards.md "Validation"). Engineering invariants that depend
// on the unit registry and on the definition set as a whole (unit/dimension
// validity, symbol-per-scope uniqueness, deprecation references) are enforced in
// ./registry, not here. Schemas are strict: unknown keys are rejected.

import { z } from "zod";
import { EngineeringValueSchema } from "../values";
import type {
  DefaultPolicy,
  ParameterDefinition,
  ParameterId,
  ParameterQualifiers,
  ValidRange,
} from "./types";

const nonEmptyString = z.string().min(1);

const parameterIdSchema = nonEmptyString.transform(
  (value): ParameterId => value as ParameterId,
);

const qualifiersSchema = z.strictObject({
  bound: z.enum(["required", "allowable"]).optional(),
  aggregation: z.enum(["peak", "rms", "nominal", "mean"]).optional(),
  loadNature: z.enum(["static", "dynamic"]).optional(),
});

const loadCaseSchema = z.enum([
  "normal",
  "peak",
  "holding",
  "emergency_stop",
]);

const rangeSchema = z.strictObject({
  min: z.number().optional(),
  max: z.number().optional(),
  unit: nonEmptyString,
});

const defaultPolicySchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("required") }),
  z.strictObject({ kind: z.literal("optional") }),
  z.strictObject({ kind: z.literal("constant"), value: EngineeringValueSchema }),
]);

export const ParameterDefinitionSchema = z.strictObject({
  id: parameterIdSchema,
  displayName: nonEmptyString,
  symbol: nonEmptyString,
  definition: nonEmptyString,
  valueType: z.enum(["quantity", "vector_quantity", "enum", "boolean"]),

  canonicalUnit: nonEmptyString.optional(),
  displayUnits: z.array(nonEmptyString).min(1).readonly().optional(),
  range: rangeSchema.optional(),

  enumId: nonEmptyString.optional(),
  enumOptions: z.array(nonEmptyString).min(1).readonly().optional(),

  qualifiers: qualifiersSchema,
  loadCases: z.array(loadCaseSchema).min(1).readonly().optional(),
  frame: z.enum(["none", "axis", "world", "component"]),
  defaultPolicy: defaultPolicySchema,

  lifecycle: z.enum(["draft", "released", "deprecated"]),
  replacedBy: parameterIdSchema.optional(),
});

/**
 * Validates an unknown value as a well-formed {@link ParameterDefinition}
 * (shape only). Engineering invariants are checked when the definition set is
 * loaded into a registry (see ./registry).
 */
export function parseParameterDefinition(input: unknown): ParameterDefinition {
  return ParameterDefinitionSchema.parse(input);
}

// --- Compile-time schema/interface parity guard -----------------------------
// Keeps the Zod schema's inferred output type mutually assignable with the
// hand-written interfaces in ./types. Drift breaks the typecheck. Types only;
// no runtime emit. Not part of the public API.

type MutuallyAssignable<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : false
  : false;

type Assert<T extends true> = T;

export type _ParameterSchemaParity = [
  Assert<MutuallyAssignable<ParameterQualifiers, z.infer<typeof qualifiersSchema>>>,
  Assert<MutuallyAssignable<ValidRange, z.infer<typeof rangeSchema>>>,
  Assert<MutuallyAssignable<DefaultPolicy, z.infer<typeof defaultPolicySchema>>>,
  Assert<
    MutuallyAssignable<ParameterDefinition, z.infer<typeof ParameterDefinitionSchema>>
  >,
];
