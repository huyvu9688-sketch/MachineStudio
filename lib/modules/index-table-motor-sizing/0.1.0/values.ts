// Local EngineeringValue helpers for the index-table-motor-sizing module,
// mirroring every other module's own values.ts. No enum-typed port exists
// in this module (no orientation input -- stage-1-spec.md "Genuinely
// different in kind"), so only the Quantity reader is needed.

import type { EngineeringValue, ModuleInput, Quantity } from "@/lib/engine";

type ModuleValues = ModuleInput["values"];

/** Reads a port value as a `Quantity`, or `undefined` when absent/mismatched. */
export function quantityAt(
  values: ModuleValues,
  key: string,
): Quantity | undefined {
  const value: EngineeringValue | undefined = values[key];
  return value?.kind === "quantity" ? value : undefined;
}
