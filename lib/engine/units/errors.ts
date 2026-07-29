// Typed errors for the unit registry and conversion engine. Callers can
// distinguish an unknown unit from a dimension mismatch from an affine-unit
// misuse without string-matching messages.

/** Thrown when a unit symbol is not present in the registry. */
export class UnknownUnitError extends Error {
  readonly symbol: string;
  constructor(symbol: string) {
    super(`Unknown unit: "${symbol}"`);
    this.name = "UnknownUnitError";
    this.symbol = symbol;
  }
}

/**
 * Thrown when an operation requires two units to share a dimension but they do
 * not — e.g. converting mass to force, or adding a length to a time.
 */
export class DimensionMismatchError extends Error {
  readonly from: string;
  readonly to: string;
  constructor(from: string, to: string) {
    super(`Incompatible dimensions: "${from}" and "${to}"`);
    this.name = "DimensionMismatchError";
    this.from = from;
    this.to = to;
  }
}

/**
 * Thrown when an affine unit (a temperature scale with a non-zero zero point,
 * such as degC or degF) is used in an operation where its offset makes it
 * meaningless — multiplication, division, or addition of absolute values.
 */
export class AffineUnitError extends Error {
  readonly symbol: string;
  readonly operation: string;
  constructor(symbol: string, operation: string) {
    super(`Affine unit "${symbol}" cannot be used in ${operation}`);
    this.name = "AffineUnitError";
    this.symbol = symbol;
    this.operation = operation;
  }
}

/** Thrown when a quantity magnitude is not a finite number. */
export class NonFiniteValueError extends Error {
  readonly value: number;
  constructor(value: number) {
    super(`Quantity magnitude must be finite, received: ${value}`);
    this.name = "NonFiniteValueError";
    this.value = value;
  }
}
