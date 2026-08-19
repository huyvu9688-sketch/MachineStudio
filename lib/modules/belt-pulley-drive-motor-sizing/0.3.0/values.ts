// Local EngineeringValue helpers for the belt-pulley-drive-motor-sizing
// module, mirroring every other module's own values.ts. Identical to
// 0.1.0's own copy -- duplicated, not imported, per stage-2-contract.md
// "0.2.0 Addendum" cross-version reuse policy.

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
