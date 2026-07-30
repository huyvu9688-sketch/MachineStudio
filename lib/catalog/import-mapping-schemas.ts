// Runtime (Zod) validation for the import-mapping contracts in
// ./import-mapping. Strict: unknown keys are rejected
// (context/code-standards.md "Validation").

import { z } from "zod";
import type {
  ImportMapping,
  ImportMappingField,
  ImportMappingFieldSource,
} from "./import-mapping";

const nonEmpty = z.string().trim().min(1);

const importMappingFieldSourceSchema: z.ZodType<ImportMappingFieldSource> =
  z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("column"), column: nonEmpty }).strict(),
    z.object({ kind: z.literal("constant"), value: z.string() }).strict(),
  ]);

const importMappingFieldSchema: z.ZodType<ImportMappingField> = z
  .object({
    target: nonEmpty,
    source: importMappingFieldSourceSchema,
    sourceUnit: nonEmpty.optional(),
  })
  .strict();

/** Validates an unknown value as a well-formed {@link ImportMapping}. */
export const ImportMappingSchema: z.ZodType<ImportMapping> = z
  .object({
    id: nonEmpty,
    version: nonEmpty,
    componentTypeId: nonEmpty,
    componentSchemaVersionId: nonEmpty,
    fields: z
      .array(importMappingFieldSchema)
      .min(1)
      .refine(
        (fields) => new Set(fields.map((f) => f.target)).size === fields.length,
        {
          message: "Mapping targets must be unique within an import mapping",
        },
      ),
  })
  .strict();

// --- Compile-time schema/interface parity guard -----------------------------

type MutuallyAssignable<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : false
  : false;
type Assert<T extends true> = T;

export type _ImportMappingSchemaParity = [
  Assert<
    MutuallyAssignable<ImportMapping, z.infer<typeof ImportMappingSchema>>
  >,
];
