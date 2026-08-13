// Typed error for the rigid-body mechanics package. Callers can distinguish a
// rejected geometric/mass argument from a unit or dimension problem raised by
// lib/engine/units without string-matching messages.

/**
 * Thrown when a mechanics argument is outside the domain the formula is
 * defined on — a non-finite number, a non-positive mass or diameter, a
 * negative offset, or a hollow cylinder whose inner diameter is not smaller
 * than its outer diameter.
 */
export class MechanicsInputError extends Error {
  /** The rejected argument's parameter name, e.g. `"massKg"`. */
  readonly argument: string;
  constructor(argument: string, message: string) {
    super(message);
    this.name = "MechanicsInputError";
    this.argument = argument;
  }
}
