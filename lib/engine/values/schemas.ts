// Runtime (Zod) validation for the engineering value contracts in ./types.
// Used at every persistence and external boundary — JSONB reads/writes,
// stored calculation snapshots, module I/O (context/code-standards.md
// "Validation"). Schemas are strict: unknown keys are rejected so a payload
// from a different format version cannot slip through unnoticed.

import { z } from "zod";
import { SERIALIZATION_FORMAT_VERSION } from "./format";
import type {
  BooleanValue,
  ComponentReference,
  Curve,
  EngineeringValue,
  EnumValue,
  LoadSpectrum,
  MaterialReference,
  Quantity,
  TableValue,
  VectorQuantity,
} from "./types";

// z.number() rejects NaN and ±Infinity in Zod 4, so this doubles as the
// finite-number guard; physical magnitudes must be finite and JSON cannot
// represent non-finite numbers anyway.
const finiteNumber = z.number();
const nonEmptyString = z.string().min(1);
const formatVersion = z.literal(SERIALIZATION_FORMAT_VERSION);

export const QuantitySchema = z.strictObject({
  v: formatVersion,
  kind: z.literal("quantity"),
  value: finiteNumber,
  unit: nonEmptyString,
  displayUnit: nonEmptyString.optional(),
});

export const VectorQuantitySchema = z.strictObject({
  v: formatVersion,
  kind: z.literal("vector_quantity"),
  components: z.array(finiteNumber).min(1),
  unit: nonEmptyString,
  frame: nonEmptyString.optional(),
  displayUnit: nonEmptyString.optional(),
});

const CurvePointSchema = z.strictObject({
  x: finiteNumber,
  y: finiteNumber,
});

export const CurveSchema = z.strictObject({
  v: formatVersion,
  kind: z.literal("curve"),
  xUnit: nonEmptyString,
  yUnit: nonEmptyString,
  points: z.array(CurvePointSchema).min(1),
  xLabel: nonEmptyString.optional(),
  yLabel: nonEmptyString.optional(),
});

const LoadSpectrumBinSchema = z.strictObject({
  load: finiteNumber,
  fraction: finiteNumber.min(0).max(1),
});

export const LoadSpectrumSchema = z.strictObject({
  v: formatVersion,
  kind: z.literal("load_spectrum"),
  loadUnit: nonEmptyString,
  bins: z.array(LoadSpectrumBinSchema).min(1),
});

const TableColumnSchema = z.strictObject({
  key: nonEmptyString,
  label: nonEmptyString.optional(),
  unit: nonEmptyString.optional(),
});

const TableCellSchema = z.union([finiteNumber, z.string(), z.boolean()]);

export const TableValueSchema = z.strictObject({
  v: formatVersion,
  kind: z.literal("table"),
  columns: z.array(TableColumnSchema).min(1),
  rows: z.array(z.array(TableCellSchema)),
});

export const EnumValueSchema = z.strictObject({
  v: formatVersion,
  kind: z.literal("enum"),
  enumId: nonEmptyString,
  value: nonEmptyString,
});

export const BooleanValueSchema = z.strictObject({
  v: formatVersion,
  kind: z.literal("boolean"),
  value: z.boolean(),
});

export const MaterialReferenceSchema = z.strictObject({
  v: formatVersion,
  kind: z.literal("material_ref"),
  materialId: nonEmptyString,
  library: nonEmptyString.optional(),
  revision: nonEmptyString.optional(),
});

export const ComponentReferenceSchema = z.strictObject({
  v: formatVersion,
  kind: z.literal("component_ref"),
  componentType: nonEmptyString,
  source: z.enum(["catalog", "manual"]),
  refId: nonEmptyString,
});

/**
 * Validates any {@link EngineeringValue} by discriminating on `kind`. A value
 * with a valid `kind` but a mismatched `v` still fails, because the routed
 * member schema requires the current {@link SERIALIZATION_FORMAT_VERSION}.
 */
export const EngineeringValueSchema = z.discriminatedUnion("kind", [
  QuantitySchema,
  VectorQuantitySchema,
  CurveSchema,
  LoadSpectrumSchema,
  TableValueSchema,
  EnumValueSchema,
  BooleanValueSchema,
  MaterialReferenceSchema,
  ComponentReferenceSchema,
]);

// --- Compile-time schema/interface parity guard -----------------------------
// Guarantees every schema's inferred output type stays mutually assignable
// with its hand-written interface in ./types. If a schema and its interface
// drift, `_SchemaTypeParity` fails to typecheck. Types only; no runtime emit.
// Exported so the unused-vars lint rule leaves it alone; not part of the public
// API and intentionally omitted from ./index.

type MutuallyAssignable<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : false
  : false;

type Assert<T extends true> = T;

export type _SchemaTypeParity = [
  Assert<MutuallyAssignable<Quantity, z.infer<typeof QuantitySchema>>>,
  Assert<
    MutuallyAssignable<VectorQuantity, z.infer<typeof VectorQuantitySchema>>
  >,
  Assert<MutuallyAssignable<Curve, z.infer<typeof CurveSchema>>>,
  Assert<MutuallyAssignable<LoadSpectrum, z.infer<typeof LoadSpectrumSchema>>>,
  Assert<MutuallyAssignable<TableValue, z.infer<typeof TableValueSchema>>>,
  Assert<MutuallyAssignable<EnumValue, z.infer<typeof EnumValueSchema>>>,
  Assert<MutuallyAssignable<BooleanValue, z.infer<typeof BooleanValueSchema>>>,
  Assert<
    MutuallyAssignable<
      MaterialReference,
      z.infer<typeof MaterialReferenceSchema>
    >
  >,
  Assert<
    MutuallyAssignable<
      ComponentReference,
      z.infer<typeof ComponentReferenceSchema>
    >
  >,
  Assert<
    MutuallyAssignable<EngineeringValue, z.infer<typeof EngineeringValueSchema>>
  >,
];
