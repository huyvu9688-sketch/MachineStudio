// Constructors and inspectors that bridge the unit registry to the values
// package's Quantity. A Quantity produced here always carries a registered
// unit and a finite magnitude.

import { SERIALIZATION_FORMAT_VERSION, type Quantity } from "../values";
import { dimensionsEqual, type Dimension } from "./dimension";
import { DimensionMismatchError, NonFiniteValueError } from "./errors";
import { getUnit } from "./registry";

/**
 * Builds a validated {@link Quantity} in a registered `unit`.
 *
 * @throws {@link NonFiniteValueError} when `value` is not finite.
 * @throws {@link UnknownUnitError} when `unit` (or `displayUnit`) is unregistered.
 * @throws {@link DimensionMismatchError} when `displayUnit` has a different
 *   dimension from `unit`.
 */
export function makeQuantity(
  value: number,
  unit: string,
  displayUnit?: string,
): Quantity {
  if (!Number.isFinite(value)) throw new NonFiniteValueError(value);
  const unitDef = getUnit(unit);
  if (displayUnit !== undefined) {
    const displayDef = getUnit(displayUnit);
    if (!dimensionsEqual(unitDef.dimension, displayDef.dimension)) {
      throw new DimensionMismatchError(unit, displayUnit);
    }
    return {
      v: SERIALIZATION_FORMAT_VERSION,
      kind: "quantity",
      value,
      unit,
      displayUnit,
    };
  }
  return { v: SERIALIZATION_FORMAT_VERSION, kind: "quantity", value, unit };
}

/** The dimension of a registered unit symbol. */
export function getDimensionOf(unit: string): Dimension {
  return getUnit(unit).dimension;
}

/** The dimension of a quantity, from its unit. */
export function quantityDimension(quantity: Quantity): Dimension {
  return getDimensionOf(quantity.unit);
}
