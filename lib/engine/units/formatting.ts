// Significant-figure and display formatting. Engineering results are shown to
// a chosen number of significant figures so the UI never implies false
// precision (context/ui-context.md "Tables and Numeric Inputs").

import { type Quantity } from "../values";
import { convert } from "./convert";

const DEFAULT_SIGNIFICANT_FIGURES = 6;

/**
 * Rounds a number to `sigFigs` significant figures.
 *
 * @throws {RangeError} when `sigFigs` is not a positive integer.
 */
export function toSignificantFigures(value: number, sigFigs: number): number {
  if (!Number.isInteger(sigFigs) || sigFigs < 1) {
    throw new RangeError(`significant figures must be a positive integer, got ${sigFigs}`);
  }
  if (value === 0) return 0;
  return Number(value.toPrecision(sigFigs));
}

/** Formats a number to `sigFigs` significant figures without trailing zeros. */
export function formatSignificant(value: number, sigFigs: number): string {
  return String(toSignificantFigures(value, sigFigs));
}

/** Options for {@link formatQuantity}. */
export interface FormatQuantityOptions {
  /** Convert to this unit for display (must share the quantity's dimension). */
  unit?: string;
  /** Significant figures to show. Defaults to 6. */
  significantFigures?: number;
  /** When no explicit `unit` is given, prefer the quantity's `displayUnit`. */
  useDisplayUnit?: boolean;
}

/**
 * Formats a quantity as `"<value> <unit>"`, optionally converting to a display
 * unit and rounding to a number of significant figures.
 *
 * @throws {@link UnknownUnitError} when a requested display unit is unregistered.
 * @throws {@link DimensionMismatchError} when a requested display unit has a
 *   different dimension from the quantity.
 */
export function formatQuantity(
  quantity: Quantity,
  options: FormatQuantityOptions = {},
): string {
  const sigFigs = options.significantFigures ?? DEFAULT_SIGNIFICANT_FIGURES;
  const target =
    options.unit ??
    (options.useDisplayUnit ? (quantity.displayUnit ?? quantity.unit) : quantity.unit);
  const value =
    target === quantity.unit
      ? quantity.value
      : convert(quantity.value, quantity.unit, target);
  return `${formatSignificant(value, sigFigs)} ${target}`;
}
