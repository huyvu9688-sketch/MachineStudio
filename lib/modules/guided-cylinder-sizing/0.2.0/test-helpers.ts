// Test-only helpers for guided-cylinder-sizing@0.2.0. The production package
// never imports this file.

import {
  SERIALIZATION_FORMAT_VERSION,
  type EngineeringValue,
  type EnumValue,
  type Quantity,
} from "@/lib/engine";

export type RawInput = {
  values: Record<string, Quantity | EnumValue>;
};

export function applicationCaseValue(
  value: "vertical_lifter" | "horizontal_pusher" | "stopper",
): EnumValue {
  return {
    v: SERIALIZATION_FORMAT_VERSION,
    kind: "enum",
    enumId: "pneumatic_guided_mgp_application_case",
    value,
  };
}

export function asQuantity(value: EngineeringValue): Quantity {
  if (value.kind !== "quantity") {
    throw new Error(`Expected a quantity output, got "${value.kind}".`);
  }
  return value;
}
