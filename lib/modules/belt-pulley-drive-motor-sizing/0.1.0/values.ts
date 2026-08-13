// Local EngineeringValue helpers for the belt-pulley-drive-motor-sizing
// module, mirroring every other module's own values.ts.

import type {
  EngineeringValue,
  EnumValue,
  ModuleInput,
  Quantity,
} from "@/lib/engine";

type ModuleValues = ModuleInput["values"];

/** Reads a port value as a `Quantity`, or `undefined` when absent/mismatched. */
export function quantityAt(
  values: ModuleValues,
  key: string,
): Quantity | undefined {
  const value: EngineeringValue | undefined = values[key];
  return value?.kind === "quantity" ? value : undefined;
}

/** Reads a port value as an `EnumValue`, or `undefined` when absent/mismatched. */
export function enumAt(
  values: ModuleValues,
  key: string,
): EnumValue | undefined {
  const value: EngineeringValue | undefined = values[key];
  return value?.kind === "enum" ? value : undefined;
}
