// Shared test-only helpers for the direct-drive-conveyor-motor-sizing
// module test files. Not part of the module package itself (never
// imported by manifest/compute/trace/checks/ui/report/validation or
// index.ts). Mirrors lib/modules/ball-screw-motor-sizing/0.1.0/
// test-helpers.ts.

import type { EngineeringValue, Quantity } from "@/lib/engine";

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
