// Local EngineeringValue helpers for the coupling module. Mirrors the
// pattern in lib/modules/ball-screw/0.1.0/values.ts.

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
