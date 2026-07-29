// Unit conversion. Same-dimension only; converting across dimensions (mass to
// force, length to time) is rejected. Temperature scales convert correctly
// through their affine offsets.

import { type Quantity } from "../values";
import { dimensionsEqual } from "./dimension";
import { DimensionMismatchError } from "./errors";
import { getUnit } from "./registry";
import { makeQuantity } from "./quantity";

/**
 * Converts a magnitude from one unit to another of the same dimension.
 *
 * Uses the affine relation `siMagnitude = value * factor + offset`, so
 * temperature conversions (e.g. degF to degC) are handled correctly, not just
 * multiplicative ones.
 *
 * @throws {@link UnknownUnitError} when either unit is unregistered.
 * @throws {@link DimensionMismatchError} when the units have different dimensions.
 */
export function convert(value: number, from: string, to: string): number {
  const fromUnit = getUnit(from);
  const toUnit = getUnit(to);
  if (!dimensionsEqual(fromUnit.dimension, toUnit.dimension)) {
    throw new DimensionMismatchError(from, to);
  }
  const siMagnitude = value * fromUnit.factor + fromUnit.offset;
  return (siMagnitude - toUnit.offset) / toUnit.factor;
}

/**
 * Converts a {@link Quantity} to another unit of the same dimension. The result
 * carries the target unit; any display-unit metadata on the input is dropped
 * because it referenced the original unit.
 */
export function convertQuantity(quantity: Quantity, to: string): Quantity {
  return makeQuantity(convert(quantity.value, quantity.unit, to), to);
}
