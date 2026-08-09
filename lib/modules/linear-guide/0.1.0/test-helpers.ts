// Shared test-only helpers for the linear-guide module test files. Not part of
// the module package itself (never imported by manifest/compute/frame/trace/
// checks/ui/report/validation or package.ts).

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

export const rollingElementTypeValue = (value: string): EnumValue =>
  enumValue("guide_rolling_element_type", value);

export const preloadGradeValue = (value: string): EnumValue =>
  enumValue("guide_preload_grade", value);

/** Builds an `axis.v1`-frame `VectorQuantity` from `[X, Y, Z]` components. */
export function axisVector(
  components: readonly [number, number, number],
  unit: string,
): VectorQuantity {
  return {
    v: SERIALIZATION_FORMAT_VERSION,
    kind: "vector_quantity",
    components: [...components],
    unit,
    frame: "axis",
  };
}

/** Narrows an `EngineeringValue` to a `Quantity`; throws otherwise (test-only). */
export function asQuantity(value: EngineeringValue): Quantity {
  if (value.kind !== "quantity") {
    throw new Error(`Expected a quantity output, got "${value.kind}".`);
  }
  return value;
}

/** A raw, untrusted module input shape, as authored in test fixtures. */
export interface RawInput {
  readonly values: Record<string, unknown>;
}
