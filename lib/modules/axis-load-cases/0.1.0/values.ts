// Local EngineeringValue helpers for the axis-load-cases module. There is no
// shared `makeVectorQuantity` constructor in lib/engine (only `makeQuantity`
// for scalars), so this module builds `VectorQuantity` literals directly, the
// same pattern `parse-submitted-vector.ts` uses at the UI boundary.

import {
  SERIALIZATION_FORMAT_VERSION,
  type EngineeringValue,
  type EnumValue,
  type ModuleInput,
  type Quantity,
  type VectorQuantity,
} from "@/lib/engine";
import type { AxisVector } from "./math";

type ModuleValues = ModuleInput["values"];

/** Reads a port value as a `Quantity`, or `undefined` when absent/mismatched. */
export function quantityAt(
  values: ModuleValues,
  key: string,
): Quantity | undefined {
  const value: EngineeringValue | undefined = values[key];
  return value?.kind === "quantity" ? value : undefined;
}

/** Reads a port value as a `VectorQuantity`, or `undefined` when absent/mismatched. */
export function vectorAt(
  values: ModuleValues,
  key: string,
): VectorQuantity | undefined {
  const value: EngineeringValue | undefined = values[key];
  return value?.kind === "vector_quantity" ? value : undefined;
}

/** Reads a port value as an `EnumValue`, or `undefined` when absent/mismatched. */
export function enumAt(
  values: ModuleValues,
  key: string,
): EnumValue | undefined {
  const value: EngineeringValue | undefined = values[key];
  return value?.kind === "enum" ? value : undefined;
}

/** The `axis.v1` components of a vector quantity, or `[0, 0, 0]` when absent. */
export function axisComponents(value: VectorQuantity | undefined): AxisVector {
  if (value === undefined) return [0, 0, 0];
  const [x = 0, y = 0, z = 0] = value.components;
  return [x, y, z];
}

/** Builds an `axis.v1`-frame `VectorQuantity` from kernel output components. */
export function makeAxisVector(
  components: AxisVector,
  unit: string,
): VectorQuantity {
  return {
    v: SERIALIZATION_FORMAT_VERSION,
    kind: "vector_quantity",
    components: [...components],
    unit,
    frame: "axis",
  };
}
