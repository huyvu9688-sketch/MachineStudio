// Local EngineeringValue helpers for the linear-guide module. Mirrors the
// pattern in lib/modules/axis-load-cases/0.1.0/values.ts and
// lib/modules/ball-screw/0.1.0/values.ts.

import type {
  EngineeringValue,
  ModuleInput,
  Quantity,
  VectorQuantity,
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

/** Reads a port value as a `VectorQuantity`, or `undefined` when absent/mismatched. */
export function vectorAt(
  values: ModuleValues,
  key: string,
): VectorQuantity | undefined {
  const value: EngineeringValue | undefined = values[key];
  return value?.kind === "vector_quantity" ? value : undefined;
}

/** Reads a port value's enum option string, or `undefined` when absent/mismatched. */
export function enumValueAt(
  values: ModuleValues,
  key: string,
): string | undefined {
  const value: EngineeringValue | undefined = values[key];
  return value?.kind === "enum" ? value.value : undefined;
}

/**
 * Reads a `vector_quantity`'s three `axis.v1` components.
 *
 * `VectorQuantity.components` is a plain `number[]` of any length as far as the
 * value schema is concerned; `axis.v1` fixes it at three
 * (context/modules/axis-load-cases/stage-1-spec.md "Proposed Coordinate and
 * Sign Convention" item 1). A wrong component count is rejected here rather
 * than silently reinterpreted, which is what that same convention requires of
 * a consuming module's input validation.
 */
export function axisComponents(
  vector: VectorQuantity,
  key: string,
): readonly [number, number, number] {
  const { components } = vector;
  if (components.length !== 3) {
    throw new Error(
      `Port "${key}" must carry exactly three axis.v1 components, got ${components.length}.`,
    );
  }
  return [components[0], components[1], components[2]];
}
