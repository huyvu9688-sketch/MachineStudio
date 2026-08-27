import type { EngineeringValue, ModuleInput, Quantity } from "@/lib/engine";

type ModuleValues = ModuleInput["values"];

export type MgpApplicationCase =
  "vertical_lifter" | "horizontal_pusher" | "stopper";

const MGP_APPLICATION_CASES: readonly MgpApplicationCase[] = [
  "vertical_lifter",
  "horizontal_pusher",
  "stopper",
];

export function quantityAt(
  values: ModuleValues,
  key: string,
): Quantity | undefined {
  const value: EngineeringValue | undefined = values[key];
  return value?.kind === "quantity" ? value : undefined;
}

export function enumValueAt(
  values: ModuleValues,
  key: string,
): string | undefined {
  const value: EngineeringValue | undefined = values[key];
  return value?.kind === "enum" ? value.value : undefined;
}

export function applicationCaseAt(
  values: ModuleValues,
): MgpApplicationCase | undefined {
  const value = enumValueAt(values, "application_case");
  return MGP_APPLICATION_CASES.includes(value as MgpApplicationCase)
    ? (value as MgpApplicationCase)
    : undefined;
}
