// Dimension-checked arithmetic on quantities. Addition and subtraction require
// the same dimension; multiplication and division combine dimensions and
// express the result in the SI-coherent unit for the resulting dimension
// (composite-unit simplification). Affine units (degC, degF) are rejected —
// their offsets make arithmetic meaningless.

import { SERIALIZATION_FORMAT_VERSION, type Quantity } from "../values";
import {
  addDimensions,
  canonicalDimensionSymbol,
  subtractDimensions,
  type Dimension,
} from "./dimension";
import { AffineUnitError, NonFiniteValueError } from "./errors";
import { convert } from "./convert";
import { makeQuantity } from "./quantity";
import { getUnit, preferredSymbol } from "./registry";

function assertMultiplicative(unit: string, operation: string): void {
  if (getUnit(unit).affine) throw new AffineUnitError(unit, operation);
}

function resultQuantity(siValue: number, dim: Dimension): Quantity {
  if (!Number.isFinite(siValue)) throw new NonFiniteValueError(siValue);
  const symbol = preferredSymbol(dim) ?? canonicalDimensionSymbol(dim);
  return {
    v: SERIALIZATION_FORMAT_VERSION,
    kind: "quantity",
    value: siValue,
    unit: symbol,
  };
}

/**
 * Adds two quantities of the same dimension, returning the result in the first
 * operand's unit.
 *
 * @throws {@link AffineUnitError} when either operand uses an affine unit.
 * @throws {@link DimensionMismatchError} when the operands differ in dimension.
 */
export function addQuantities(a: Quantity, b: Quantity): Quantity {
  assertMultiplicative(a.unit, "addition");
  assertMultiplicative(b.unit, "addition");
  return makeQuantity(a.value + convert(b.value, b.unit, a.unit), a.unit);
}

/**
 * Subtracts the second quantity from the first (same dimension), returning the
 * result in the first operand's unit.
 *
 * @throws {@link AffineUnitError} when either operand uses an affine unit.
 * @throws {@link DimensionMismatchError} when the operands differ in dimension.
 */
export function subtractQuantities(a: Quantity, b: Quantity): Quantity {
  assertMultiplicative(a.unit, "subtraction");
  assertMultiplicative(b.unit, "subtraction");
  return makeQuantity(a.value - convert(b.value, b.unit, a.unit), a.unit);
}

/**
 * Multiplies two quantities. The result dimension is the sum of the operand
 * dimensions, expressed in that dimension's SI-coherent unit (e.g. a force
 * times a length yields `"N*m"`).
 *
 * @throws {@link AffineUnitError} when either operand uses an affine unit.
 */
export function multiplyQuantities(a: Quantity, b: Quantity): Quantity {
  assertMultiplicative(a.unit, "multiplication");
  assertMultiplicative(b.unit, "multiplication");
  const unitA = getUnit(a.unit);
  const unitB = getUnit(b.unit);
  const si = a.value * unitA.factor * (b.value * unitB.factor);
  return resultQuantity(si, addDimensions(unitA.dimension, unitB.dimension));
}

/**
 * Divides the first quantity by the second. The result dimension is the
 * difference of the operand dimensions; dividing two quantities of the same
 * dimension yields a dimensionless `"ratio"`.
 *
 * @throws {@link AffineUnitError} when either operand uses an affine unit.
 * @throws {@link NonFiniteValueError} when dividing by a zero magnitude.
 */
export function divideQuantities(a: Quantity, b: Quantity): Quantity {
  assertMultiplicative(a.unit, "division");
  assertMultiplicative(b.unit, "division");
  const unitA = getUnit(a.unit);
  const unitB = getUnit(b.unit);
  const si = (a.value * unitA.factor) / (b.value * unitB.factor);
  return resultQuantity(si, subtractDimensions(unitA.dimension, unitB.dimension));
}

/**
 * Scales a quantity by a dimensionless scalar, keeping its unit.
 *
 * @throws {@link AffineUnitError} when the quantity uses an affine unit.
 * @throws {@link NonFiniteValueError} when the scaled magnitude is not finite.
 */
export function scaleQuantity(quantity: Quantity, scalar: number): Quantity {
  assertMultiplicative(quantity.unit, "scaling");
  return makeQuantity(quantity.value * scalar, quantity.unit);
}
