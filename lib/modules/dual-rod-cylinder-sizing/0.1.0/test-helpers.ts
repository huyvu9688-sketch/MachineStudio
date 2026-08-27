// Shared test-only helpers for the dual-rod-cylinder-sizing module test
// files. Mirrors lib/modules/guided-cylinder-sizing/0.1.0/test-helpers.ts.
// Not part of the module package itself (never imported by
// manifest/compute/trace/checks/ui/report/validation/index).

import {
  SERIALIZATION_FORMAT_VERSION,
  type EngineeringValue,
  type EnumValue,
  type Quantity,
} from "@/lib/engine";

/** A raw, untrusted module input shape, as authored in test fixtures. */
export type RawInput = {
  values: Record<string, Quantity | EnumValue>;
};

/**
 * `EnumValue` requires `v: SerializationFormatVersion`, not just
 * `kind`/`enumId`/`value` -- the same fix compute.ts's own
 * `makeEnumOutput` helper already applies.
 */
export function enumValue(enumId: string, value: string): EnumValue {
  return { v: SERIALIZATION_FORMAT_VERSION, kind: "enum", enumId, value };
}

export function cushionTypeValue(
  value: "none" | "rubber_bumper" | "air_cushion",
): EnumValue {
  return enumValue("pneumatic_cushion_type", value);
}

export function mountingOrientationValue(
  value: "vertical" | "horizontal" | string,
): EnumValue {
  return enumValue("dual_rod_mounting_orientation", value);
}

/** Narrows an `EngineeringValue` to a `Quantity`; throws otherwise (test-only). */
export function asQuantity(value: EngineeringValue): Quantity {
  if (value.kind !== "quantity") {
    throw new Error(`Expected a quantity output, got "${value.kind}".`);
  }
  return value;
}
