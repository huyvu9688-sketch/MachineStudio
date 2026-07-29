// Runtime type guards for engineering values. The per-kind guards narrow an
// already-typed EngineeringValue by its discriminator; isEngineeringValue
// validates untrusted input through the Zod schema.

import { EngineeringValueSchema } from "./schemas";
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

/** Validates unknown input as any {@link EngineeringValue}. */
export function isEngineeringValue(input: unknown): input is EngineeringValue {
  return EngineeringValueSchema.safeParse(input).success;
}

/** Narrows an {@link EngineeringValue} to a {@link Quantity}. */
export function isQuantity(value: EngineeringValue): value is Quantity {
  return value.kind === "quantity";
}

/** Narrows an {@link EngineeringValue} to a {@link VectorQuantity}. */
export function isVectorQuantity(
  value: EngineeringValue,
): value is VectorQuantity {
  return value.kind === "vector_quantity";
}

/** Narrows an {@link EngineeringValue} to a {@link Curve}. */
export function isCurve(value: EngineeringValue): value is Curve {
  return value.kind === "curve";
}

/** Narrows an {@link EngineeringValue} to a {@link LoadSpectrum}. */
export function isLoadSpectrum(value: EngineeringValue): value is LoadSpectrum {
  return value.kind === "load_spectrum";
}

/** Narrows an {@link EngineeringValue} to a {@link TableValue}. */
export function isTableValue(value: EngineeringValue): value is TableValue {
  return value.kind === "table";
}

/** Narrows an {@link EngineeringValue} to an {@link EnumValue}. */
export function isEnumValue(value: EngineeringValue): value is EnumValue {
  return value.kind === "enum";
}

/** Narrows an {@link EngineeringValue} to a {@link BooleanValue}. */
export function isBooleanValue(value: EngineeringValue): value is BooleanValue {
  return value.kind === "boolean";
}

/** Narrows an {@link EngineeringValue} to a {@link MaterialReference}. */
export function isMaterialReference(
  value: EngineeringValue,
): value is MaterialReference {
  return value.kind === "material_ref";
}

/** Narrows an {@link EngineeringValue} to a {@link ComponentReference}. */
export function isComponentReference(
  value: EngineeringValue,
): value is ComponentReference {
  return value.kind === "component_ref";
}
