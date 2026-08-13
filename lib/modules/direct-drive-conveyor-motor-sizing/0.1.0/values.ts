// Local EngineeringValue helper for the direct-drive-conveyor-motor-sizing
// module, mirroring every other module's own values.ts. No enum port
// exists in this module (unlike ball-screw-motor-sizing's `orientation`),
// so only the quantity accessor is needed.

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
