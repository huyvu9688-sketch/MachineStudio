// Local EngineeringValue helpers for the motion-profile module. This module's
// ports are all scalar quantities, so only the `Quantity` reader is needed
// (contrast lib/modules/axis-load-cases/0.1.0/values.ts, which also reads
// vectors and enums for its axis-frame ports).

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
