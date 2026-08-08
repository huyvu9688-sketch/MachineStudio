// Shared test-only helpers for the motion-profile module test files. Not
// part of the module package itself (never imported by manifest/compute/
// trace/checks/ui/report/validation or package.ts).

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
