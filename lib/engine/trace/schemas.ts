// Structural (Zod) validation for the calculation trace and check contracts in
// ./types. Shape only — presence, types, enum membership, non-empty strings,
// format version. Trace invariants (unique node IDs, source-reference
// completeness) are enforced in ./trace; check-status aggregation lives in
// ./checks. Schemas are strict: unknown keys are rejected. See
// context/code-standards.md "Validation".

import { z } from "zod";
import { EngineeringValueSchema } from "../values";
import { ClauseReferenceSchema } from "../../standards/schemas";
import { TRACE_FORMAT_VERSION } from "./format";
import type {
  CalculationTrace,
  CheckResult,
  TraceNode,
  TraceOperand,
  TraceSection,
  TraceStep,
  ValidityResult,
  Warning,
} from "./types";

const nonEmptyString = z.string().min(1);
const clauseReferences = z.array(ClauseReferenceSchema).readonly();

export const TraceOperandSchema = z.strictObject({
  label: nonEmptyString,
  value: EngineeringValueSchema,
  ref: nonEmptyString.optional(),
});

export const TraceStepSchema = z.strictObject({
  node: z.literal("step"),
  id: nonEmptyString,
  title: nonEmptyString.optional(),
  methodId: nonEmptyString,
  expression: nonEmptyString.optional(),
  inputs: z.array(TraceOperandSchema).readonly(),
  outputs: z.array(TraceOperandSchema).readonly(),
  sources: clauseReferences.optional(),
  notes: z.array(nonEmptyString).readonly().optional(),
});

// TraceSection and TraceNode are mutually recursive (a section's children may be
// steps or further sections). Both schemas are declared with explicit
// z.ZodType annotations and defined lazily so the recursion type-checks and the
// parity guard below infers the intended interface, not `any`.
export const TraceNodeSchema: z.ZodType<TraceNode> = z.lazy(() =>
  z.union([TraceStepSchema, TraceSectionSchema]),
);

export const TraceSectionSchema: z.ZodType<TraceSection> = z.lazy(() =>
  z.strictObject({
    node: z.literal("section"),
    id: nonEmptyString,
    title: nonEmptyString,
    children: z.array(TraceNodeSchema).readonly(),
  }),
);

export const CalculationTraceSchema = z.strictObject({
  v: z.literal(TRACE_FORMAT_VERSION),
  sections: z.array(TraceSectionSchema).readonly(),
});

const checkStatus = z.enum([
  "pass",
  "fail",
  "warning",
  "not_applicable",
  "invalid_input",
]);

export const CheckResultSchema = z.strictObject({
  id: nonEmptyString,
  status: checkStatus,
  message: nonEmptyString,
  criterion: nonEmptyString.optional(),
  observed: EngineeringValueSchema.optional(),
  allowable: EngineeringValueSchema.optional(),
  margin: EngineeringValueSchema.optional(),
  sources: clauseReferences.optional(),
});

export const WarningSchema = z.strictObject({
  id: nonEmptyString,
  message: nonEmptyString,
  detail: nonEmptyString.optional(),
  sources: clauseReferences.optional(),
});

const validityStatus = z.enum(["within_limits", "out_of_range", "not_evaluated"]);

export const ValidityResultSchema = z.strictObject({
  id: nonEmptyString,
  status: validityStatus,
  limit: nonEmptyString,
  message: nonEmptyString.optional(),
  observed: EngineeringValueSchema.optional(),
  sources: clauseReferences.optional(),
});

/** Validates an unknown value as a well-formed {@link CalculationTrace} (shape only). */
export function parseCalculationTrace(input: unknown): CalculationTrace {
  return CalculationTraceSchema.parse(input);
}

/** Non-throwing variant of {@link parseCalculationTrace}. */
export function safeParseCalculationTrace(
  input: unknown,
): z.ZodSafeParseResult<CalculationTrace> {
  return CalculationTraceSchema.safeParse(input);
}

/** Validates an unknown value as a well-formed {@link CheckResult}. */
export function parseCheckResult(input: unknown): CheckResult {
  return CheckResultSchema.parse(input);
}

/** Validates an unknown value as a well-formed {@link Warning}. */
export function parseWarning(input: unknown): Warning {
  return WarningSchema.parse(input);
}

/** Validates an unknown value as a well-formed {@link ValidityResult}. */
export function parseValidityResult(input: unknown): ValidityResult {
  return ValidityResultSchema.parse(input);
}

// --- Compile-time schema/interface parity guard -----------------------------

type MutuallyAssignable<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : false
  : false;

type Assert<T extends true> = T;

export type _TraceSchemaParity = [
  Assert<MutuallyAssignable<TraceOperand, z.infer<typeof TraceOperandSchema>>>,
  Assert<MutuallyAssignable<TraceStep, z.infer<typeof TraceStepSchema>>>,
  Assert<MutuallyAssignable<TraceSection, z.infer<typeof TraceSectionSchema>>>,
  Assert<MutuallyAssignable<TraceNode, z.infer<typeof TraceNodeSchema>>>,
  Assert<
    MutuallyAssignable<CalculationTrace, z.infer<typeof CalculationTraceSchema>>
  >,
  Assert<MutuallyAssignable<CheckResult, z.infer<typeof CheckResultSchema>>>,
  Assert<MutuallyAssignable<Warning, z.infer<typeof WarningSchema>>>,
  Assert<MutuallyAssignable<ValidityResult, z.infer<typeof ValidityResultSchema>>>,
];
