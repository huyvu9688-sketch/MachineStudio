// Shared test-only helpers for the axis-load-cases module test files. Not
// part of the module package itself (never imported by manifest/compute/
// trace/checks/ui/report/validation or package.ts).

import {
  SERIALIZATION_FORMAT_VERSION,
  type EngineeringValue,
  type EnumValue,
  type Quantity,
  type VectorQuantity,
} from "@/lib/engine";

export function enumValue(enumId: string, value: string): EnumValue {
  return { v: SERIALIZATION_FORMAT_VERSION, kind: "enum", enumId, value };
}

export const orientationValue = (value: string): EnumValue =>
  enumValue("axis_orientation", value);

export const travelDirectionValue = (
  value: "positive" | "negative",
): EnumValue => enumValue("axis_travel_direction", value);

/** Narrows an `EngineeringValue` to a `Quantity`; throws otherwise (test-only). */
export function asQuantity(value: EngineeringValue): Quantity {
  if (value.kind !== "quantity") {
    throw new Error(`Expected a quantity output, got "${value.kind}".`);
  }
  return value;
}

/** Narrows an `EngineeringValue` to a `VectorQuantity`; throws otherwise (test-only). */
export function asVectorQuantity(value: EngineeringValue): VectorQuantity {
  if (value.kind !== "vector_quantity") {
    throw new Error(`Expected a vector_quantity output, got "${value.kind}".`);
  }
  return value;
}

/** A raw, untrusted module input shape, as authored in test fixtures. */
export interface RawInput {
  readonly values: Record<string, unknown>;
}
