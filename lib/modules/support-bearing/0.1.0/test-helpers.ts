// Shared test-only helpers for the support-bearing module test files. Not
// part of the module package itself (never imported by manifest/compute/
// trace/checks/ui/report/validation or package.ts). Mirrors
// lib/modules/ball-screw/0.1.0/test-helpers.ts for the enum-value shape.

import {
  SERIALIZATION_FORMAT_VERSION,
  type EngineeringValue,
  type EnumValue,
  type Quantity,
} from "@/lib/engine";

export function enumValue(enumId: string, value: string): EnumValue {
  return { v: SERIALIZATION_FORMAT_VERSION, kind: "enum", enumId, value };
}

export const bearingLocationValue = (value: "fixed" | "supported"): EnumValue =>
  enumValue("bearing_location", value);

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
