// Equality helpers for engineering values. Two flavors:
//   - engineeringValuesEqual: exact structural equality (round-trip fidelity).
//   - engineeringValuesClose: numeric comparison within an engineering
//     tolerance, per context/code-standards.md ("Numerical comparisons must
//     use engineering tolerances, not arbitrary string equality").
// Neither helper converts units: values are compared in their canonical units,
// which is how they are stored. Unit conversion is the unit registry's job
// (Unit 1.2) and lib/engine/values must not depend on it.

import type {
  Curve,
  EngineeringValue,
  LoadSpectrum,
  Quantity,
  VectorQuantity,
} from "./types";

/** Tolerance configuration for {@link engineeringValuesClose}. */
export interface ToleranceOptions {
  /**
   * Relative tolerance as a fraction of the larger magnitude being compared.
   * Defaults to 1e-9.
   */
  relative?: number;
  /** Absolute tolerance floor. Defaults to 1e-12. */
  absolute?: number;
}

const DEFAULT_RELATIVE = 1e-9;
const DEFAULT_ABSOLUTE = 1e-12;

function numbersClose(
  a: number,
  b: number,
  options: ToleranceOptions,
): boolean {
  const relative = options.relative ?? DEFAULT_RELATIVE;
  const absolute = options.absolute ?? DEFAULT_ABSOLUTE;
  const scale = Math.max(Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= Math.max(absolute, relative * scale);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  ) {
    return false;
  }
  const aArray = Array.isArray(a);
  const bArray = Array.isArray(b);
  if (aArray || bArray) {
    if (!aArray || !bArray || a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const aKeys = Object.keys(aRecord);
  const bKeys = Object.keys(bRecord);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(bRecord, key) &&
      deepEqual(aRecord[key], bRecord[key]),
  );
}

function assertNever(value: never): never {
  throw new Error(`Unhandled engineering value kind: ${JSON.stringify(value)}`);
}

/**
 * Exact structural equality of two engineering values. Numbers must match
 * exactly. Values of different kinds, or in different units, are never equal.
 * Suitable for serialization round-trip assertions.
 */
export function engineeringValuesEqual(
  a: EngineeringValue,
  b: EngineeringValue,
): boolean {
  return deepEqual(a, b);
}

/**
 * Compares two engineering values with a numeric tolerance applied to their
 * magnitudes. Non-numeric metadata (kind, units, frames, labels, keys) must
 * still match exactly, and value kinds with no numeric payload fall back to
 * exact structural equality.
 */
export function engineeringValuesClose(
  a: EngineeringValue,
  b: EngineeringValue,
  options: ToleranceOptions = {},
): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "quantity": {
      // `a.kind === b.kind` and `a` is a Quantity, so `b` is too.
      const other = b as Quantity;
      return (
        a.unit === other.unit &&
        a.displayUnit === other.displayUnit &&
        numbersClose(a.value, other.value, options)
      );
    }
    case "vector_quantity": {
      const other = b as VectorQuantity;
      return (
        a.unit === other.unit &&
        a.frame === other.frame &&
        a.displayUnit === other.displayUnit &&
        a.components.length === other.components.length &&
        a.components.every((component, index) =>
          numbersClose(component, other.components[index], options),
        )
      );
    }
    case "curve": {
      const other = b as Curve;
      return (
        a.xUnit === other.xUnit &&
        a.yUnit === other.yUnit &&
        a.xLabel === other.xLabel &&
        a.yLabel === other.yLabel &&
        a.points.length === other.points.length &&
        a.points.every(
          (point, index) =>
            numbersClose(point.x, other.points[index].x, options) &&
            numbersClose(point.y, other.points[index].y, options),
        )
      );
    }
    case "load_spectrum": {
      const other = b as LoadSpectrum;
      return (
        a.loadUnit === other.loadUnit &&
        a.bins.length === other.bins.length &&
        a.bins.every(
          (bin, index) =>
            numbersClose(bin.load, other.bins[index].load, options) &&
            numbersClose(bin.fraction, other.bins[index].fraction, options),
        )
      );
    }
    case "table":
    case "enum":
    case "boolean":
    case "material_ref":
    case "component_ref":
      return engineeringValuesEqual(a, b);
    default:
      return assertNever(a);
  }
}
