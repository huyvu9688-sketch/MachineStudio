// Local EngineeringValue helpers for the shaft-key-bolt-checks module.
// Identical pattern to lib/modules/dual-rod-cylinder-sizing/0.1.0/values.ts.

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

/** Reads a port value's enum option string, or `undefined` when absent/mismatched. */
export function enumValueAt(
  values: ModuleValues,
  key: string,
): string | undefined {
  const value: EngineeringValue | undefined = values[key];
  return value?.kind === "enum" ? value.value : undefined;
}
