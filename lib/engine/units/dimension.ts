// Dimension-vector model for the unit registry (Unit 1.2). Every unit has a
// physical dimension expressed over five base dimensions. Angle is tracked as
// a base dimension (not folded into "dimensionless") so radians stay distinct
// from a pure ratio, and angular velocity (rad/s) stays distinct from
// frequency (Hz). This is what lets the graph reject a link that is
// unit-compatible but semantically wrong (context/architecture.md).

/**
 * A physical dimension as integer exponents over the base dimensions.
 * `[m, kg, s, K, rad]` in field form: `length`, `mass`, `time`,
 * `temperature`, `angle`.
 */
export interface Dimension {
  readonly length: number;
  readonly mass: number;
  readonly time: number;
  readonly temperature: number;
  readonly angle: number;
}

/** The dimensionless dimension (all exponents zero). */
export const DIMENSIONLESS: Dimension = {
  length: 0,
  mass: 0,
  time: 0,
  temperature: 0,
  angle: 0,
};

/** SI base-unit symbol used for each base dimension when generating symbols. */
const BASE_SYMBOLS: { readonly [K in keyof Dimension]: string } = {
  mass: "kg",
  length: "m",
  time: "s",
  temperature: "K",
  angle: "rad",
};

// Stable ordering for canonical-symbol generation and iteration.
const BASE_ORDER: readonly (keyof Dimension)[] = [
  "mass",
  "length",
  "time",
  "temperature",
  "angle",
];

/** Builds a Dimension, defaulting any omitted base exponent to zero. */
export function dimension(partial: Partial<Dimension>): Dimension {
  return { ...DIMENSIONLESS, ...partial };
}

/** True when both dimensions have identical base exponents. */
export function dimensionsEqual(a: Dimension, b: Dimension): boolean {
  return (
    a.length === b.length &&
    a.mass === b.mass &&
    a.time === b.time &&
    a.temperature === b.temperature &&
    a.angle === b.angle
  );
}

/** Sum of two dimensions (used when multiplying quantities). */
export function addDimensions(a: Dimension, b: Dimension): Dimension {
  return {
    length: a.length + b.length,
    mass: a.mass + b.mass,
    time: a.time + b.time,
    temperature: a.temperature + b.temperature,
    angle: a.angle + b.angle,
  };
}

/** Difference of two dimensions (used when dividing quantities). */
export function subtractDimensions(a: Dimension, b: Dimension): Dimension {
  return {
    length: a.length - b.length,
    mass: a.mass - b.mass,
    time: a.time - b.time,
    temperature: a.temperature - b.temperature,
    angle: a.angle - b.angle,
  };
}

/** True when the dimension has no non-zero base exponent. */
export function isDimensionless(d: Dimension): boolean {
  return dimensionsEqual(d, DIMENSIONLESS);
}

/**
 * A stable string key for a dimension, suitable for map lookup, e.g.
 * `"0,1,-2,0,0"` in `length,mass,time,temperature,angle` order.
 */
export function dimensionKey(d: Dimension): string {
  return `${d.length},${d.mass},${d.time},${d.temperature},${d.angle}`;
}

/**
 * A canonical base-unit symbol for a dimension, e.g. `"kg*m^2*s^-3"` for power.
 * Used as a fallback display symbol for arithmetic results whose dimension has
 * no preferred named unit. Dimensionless yields `"ratio"`.
 */
export function canonicalDimensionSymbol(d: Dimension): string {
  if (isDimensionless(d)) return "ratio";
  const parts: string[] = [];
  for (const base of BASE_ORDER) {
    const exponent = d[base];
    if (exponent === 0) continue;
    parts.push(exponent === 1 ? BASE_SYMBOLS[base] : `${BASE_SYMBOLS[base]}^${exponent}`);
  }
  return parts.join("*");
}
