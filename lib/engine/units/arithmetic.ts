// Dimension-checked arithmetic on quantities. Addition and subtraction require
// the same dimension; multiplication and division combine dimensions and
// express the result in the SI-coherent unit for the resulting dimension
// (composite-unit simplification). Affine units (degC, degF) are rejected —
// their offsets make arithmetic meaningless.

import { SERIALIZATION_FORMAT_VERSION, type Quantity } from "../values";
import {
  addDimensions,
  canonicalDimensionSymbol,
  dimensionsEqual,
  subtractDimensions,
  type Dimension,
} from "./dimension";
import {
  AffineUnitError,
  DimensionMismatchError,
  NonFiniteValueError,
} from "./errors";
import { convert } from "./convert";
import { makeQuantity } from "./quantity";
import { Dimensions, getUnit, preferredSymbol } from "./registry";

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
 * Throws {@link DimensionMismatchError} unless `quantity` has exactly
 * `expected`'s dimension. `expectedUnitExample` is a registered unit of that
 * dimension, used only to name the expectation in the error.
 */
function requireDimension(
  quantity: Quantity,
  expected: Dimension,
  expectedUnitExample: string,
): void {
  if (!dimensionsEqual(getUnit(quantity.unit).dimension, expected)) {
    throw new DimensionMismatchError(quantity.unit, expectedUnitExample);
  }
}

function siMagnitude(quantity: Quantity): number {
  const unit = getUnit(quantity.unit);
  return quantity.value * unit.factor;
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
  return resultQuantity(
    si,
    subtractDimensions(unitA.dimension, unitB.dimension),
  );
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

// --- Rotational-mechanics exceptions to generic multiply/divide ---
//
// This registry tracks angle as its own base dimension (dimension.ts) so
// `rad` stays distinct from a dimensionless ratio and `rad/s` stays
// distinct from `Hz` — the graph relies on that distinction to reject a
// link that is unit-compatible but semantically wrong
// (context/architecture.md, invariant 5). The cost is that generic
// `multiplyQuantities`/`divideQuantities` cannot express P = T*omega:
// torque carries no angle exponent, angular velocity carries `angle^1`, so
// the product is `W*rad`, not `W` — confirmed by direct test
// (`multiplyQuantities(10 N*m, 100 rad/s)` yields `kg*m^2*s^-3*rad`, right
// magnitude, wrong/inconvertible unit).
//
// Physically, radian is dimensionless (NIST SP811) — P = T*omega is a
// reviewed case where the angle exponent is meant to cancel. Rather than
// loosening generic multiply/divide to auto-cancel angle (which would also
// silently cancel it where the graph needs it kept, e.g. collapsing
// `rad/s^2` toward `s^-2`), this project follows the same convention
// `code-standards.md` already sets for other domain-specific relationships
// ("never infer force from mass or mass from force"): each reviewed
// rotational relationship gets its own explicit, dimension-checked
// function instead of a generic inference rule. Modules performing
// rotational-power sizing (Milestone 1C, servo drive train) must go
// through these, not through `multiplyQuantities`/`divideQuantities` with
// a torque and an angular velocity.

/**
 * Rotational power from torque and angular velocity: `P = T * omega`.
 *
 * @throws {@link AffineUnitError} when either operand uses an affine unit.
 * @throws {@link DimensionMismatchError} when `torque` is not
 *   torque-dimensioned or `angularVelocity` is not
 *   angular-velocity-dimensioned.
 */
export function rotationalPower(
  torque: Quantity,
  angularVelocity: Quantity,
): Quantity {
  assertMultiplicative(torque.unit, "rotational power");
  assertMultiplicative(angularVelocity.unit, "rotational power");
  requireDimension(torque, Dimensions.torque, "N*m");
  requireDimension(angularVelocity, Dimensions.angularVelocity, "rad/s");
  const si = siMagnitude(torque) * siMagnitude(angularVelocity);
  return resultQuantity(si, Dimensions.power);
}

/**
 * Torque required for a given power at a given angular velocity:
 * `T = P / omega`.
 *
 * @throws {@link AffineUnitError} when either operand uses an affine unit.
 * @throws {@link DimensionMismatchError} when `power` is not
 *   power-dimensioned or `angularVelocity` is not
 *   angular-velocity-dimensioned.
 * @throws {@link NonFiniteValueError} when `angularVelocity` is zero.
 */
export function torqueFromPower(
  power: Quantity,
  angularVelocity: Quantity,
): Quantity {
  assertMultiplicative(power.unit, "torque from power");
  assertMultiplicative(angularVelocity.unit, "torque from power");
  requireDimension(power, Dimensions.power, "W");
  requireDimension(angularVelocity, Dimensions.angularVelocity, "rad/s");
  const si = siMagnitude(power) / siMagnitude(angularVelocity);
  return resultQuantity(si, Dimensions.torque);
}

/**
 * Angular velocity implied by a given power at a given torque:
 * `omega = P / T`.
 *
 * @throws {@link AffineUnitError} when either operand uses an affine unit.
 * @throws {@link DimensionMismatchError} when `power` is not
 *   power-dimensioned or `torque` is not torque-dimensioned.
 * @throws {@link NonFiniteValueError} when `torque` is zero.
 */
export function angularVelocityFromPower(
  power: Quantity,
  torque: Quantity,
): Quantity {
  assertMultiplicative(power.unit, "angular velocity from power");
  assertMultiplicative(torque.unit, "angular velocity from power");
  requireDimension(power, Dimensions.power, "W");
  requireDimension(torque, Dimensions.torque, "N*m");
  const si = siMagnitude(power) / siMagnitude(torque);
  return resultQuantity(si, Dimensions.angularVelocity);
}
