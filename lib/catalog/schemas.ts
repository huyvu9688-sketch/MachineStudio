// Runtime (Zod) validation for the component-schema contracts in ./types.
// Strict: unknown keys are rejected (context/code-standards.md "Validation").
// Used at the persistence boundary by lib/db/repositories/catalog-repository.ts,
// the same composition pattern lib/db/repositories/run-snapshot.ts uses for the
// engine's own schemas.

import { z } from "zod";
import { EngineeringValueSchema } from "../engine/values";
import type { EngineeringValueKind } from "../engine/values";
import type { ComponentAttributeFieldDefinition, ComponentAttributes } from "./types";

const nonEmpty = z.string().trim().min(1);

const engineeringValueKindSchema: z.ZodType<EngineeringValueKind> = z.enum([
  "quantity",
  "vector_quantity",
  "curve",
  "load_spectrum",
  "table",
  "enum",
  "boolean",
  "material_ref",
  "component_ref",
]);

/** Validates a single {@link ComponentAttributeFieldDefinition}. */
export const ComponentAttributeFieldDefinitionSchema: z.ZodType<ComponentAttributeFieldDefinition> =
  z
    .object({
      key: nonEmpty,
      label: nonEmpty,
      valueKind: engineeringValueKindSchema,
      required: z.boolean(),
      unit: nonEmpty.optional(),
      enumId: nonEmpty.optional(),
    })
    .strict();

/**
 * Validates a `ComponentSchemaVersion.fields` payload: a non-empty field list
 * with unique keys.
 */
export const ComponentAttributeFieldListSchema = z
  .array(ComponentAttributeFieldDefinitionSchema)
  .min(1)
  .refine((fields) => new Set(fields.map((f) => f.key)).size === fields.length, {
    message: "Field keys must be unique within a component schema version",
  });

/**
 * Validates a `ManufacturerPartRevision.attributes` payload: a record of
 * attribute key to `EngineeringValue`. Generic shape only — every value must
 * be a well-formed `EngineeringValue`; matching a specific schema version's
 * field list is a catalog import/matching concern (Units 2.7/2.8).
 */
export const ComponentAttributesSchema: z.ZodType<ComponentAttributes> = z.record(
  nonEmpty,
  EngineeringValueSchema,
);

// --- Compile-time schema/interface parity guard -----------------------------

type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;

export type _CatalogSchemaParity = [
  Assert<
    MutuallyAssignable<
      ComponentAttributeFieldDefinition,
      z.infer<typeof ComponentAttributeFieldDefinitionSchema>
    >
  >,
  Assert<MutuallyAssignable<ComponentAttributes, z.infer<typeof ComponentAttributesSchema>>>,
];
