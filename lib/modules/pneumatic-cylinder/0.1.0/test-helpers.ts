// Shared test-only helpers for the pneumatic-cylinder module test files.
// Not part of the module package itself (never imported by
// manifest/compute/trace/checks/ui/report/validation/index).

import {
  SERIALIZATION_FORMAT_VERSION,
  type EngineeringValue,
  type EnumValue,
  type Quantity,
} from "@/lib/engine";

export function enumValue(enumId: string, value: string): EnumValue {
  return { v: SERIALIZATION_FORMAT_VERSION, kind: "enum", enumId, value };
}

export const cushionTypeValue = (value: string): EnumValue =>
  enumValue("pneumatic_cushion_type", value);

export const mountingStyleValue = (value: string): EnumValue =>
  enumValue("pneumatic_mounting_style", value);

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
