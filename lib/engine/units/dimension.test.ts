import { describe, expect, it } from "vitest";
import {
  addDimensions,
  canonicalDimensionSymbol,
  DIMENSIONLESS,
  dimension,
  dimensionKey,
  dimensionsEqual,
  isDimensionless,
  subtractDimensions,
} from "./dimension";

describe("dimension", () => {
  it("fills omitted base exponents with zero", () => {
    expect(dimension({ length: 1 })).toEqual({
      length: 1,
      mass: 0,
      time: 0,
      temperature: 0,
      angle: 0,
    });
  });

  it("compares base exponents for equality", () => {
    expect(dimensionsEqual(dimension({ length: 1 }), dimension({ length: 1 }))).toBe(
      true,
    );
    expect(dimensionsEqual(dimension({ length: 1 }), dimension({ mass: 1 }))).toBe(
      false,
    );
  });

  it("adds and subtracts dimensions component-wise", () => {
    const speed = dimension({ length: 1, time: -1 });
    const time = dimension({ time: 1 });
    expect(addDimensions(speed, time)).toEqual(dimension({ length: 1 }));
    const acceleration = dimension({ length: 1, time: -2 });
    expect(subtractDimensions(speed, time)).toEqual(acceleration);
  });

  it("recognizes the dimensionless dimension", () => {
    expect(isDimensionless(DIMENSIONLESS)).toBe(true);
    expect(isDimensionless(dimension({ angle: 1 }))).toBe(false);
  });

  it("produces a stable key", () => {
    expect(dimensionKey(dimension({ mass: 1, length: 1, time: -2 }))).toBe(
      "1,1,-2,0,0",
    );
  });

  it("generates canonical base symbols", () => {
    expect(canonicalDimensionSymbol(DIMENSIONLESS)).toBe("ratio");
    expect(canonicalDimensionSymbol(dimension({ mass: 1, length: 1, time: -2 }))).toBe(
      "kg*m*s^-2",
    );
    expect(canonicalDimensionSymbol(dimension({ mass: 1, length: 2, time: -3 }))).toBe(
      "kg*m^2*s^-3",
    );
    expect(canonicalDimensionSymbol(dimension({ angle: 1 }))).toBe("rad");
  });
});
