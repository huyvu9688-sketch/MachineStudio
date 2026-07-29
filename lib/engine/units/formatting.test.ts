import { describe, expect, it } from "vitest";
import {
  formatQuantity,
  formatSignificant,
  toSignificantFigures,
} from "./formatting";
import { makeQuantity } from "./quantity";

describe("toSignificantFigures", () => {
  it("rounds to the requested significant figures", () => {
    expect(toSignificantFigures(123.456, 4)).toBe(123.5);
    expect(toSignificantFigures(0.00123456, 3)).toBe(0.00123);
    expect(toSignificantFigures(1234.5, 3)).toBe(1230);
  });

  it("returns zero for zero", () => {
    expect(toSignificantFigures(0, 5)).toBe(0);
  });

  it("rejects a non-positive-integer figure count", () => {
    expect(() => toSignificantFigures(1, 0)).toThrow(RangeError);
    expect(() => toSignificantFigures(1, 2.5)).toThrow(RangeError);
  });
});

describe("formatSignificant", () => {
  it("drops trailing zeros", () => {
    expect(formatSignificant(12, 4)).toBe("12");
    expect(formatSignificant(0.1047197551, 5)).toBe("0.10472");
  });
});

describe("formatQuantity", () => {
  it("formats value and unit", () => {
    expect(formatQuantity(makeQuantity(12.3456, "mm"), { significantFigures: 4 })).toBe(
      "12.35 mm",
    );
  });

  it("converts to a requested display unit", () => {
    expect(formatQuantity(makeQuantity(1, "m"), { unit: "mm" })).toBe("1000 mm");
  });

  it("uses the quantity's display unit when asked", () => {
    const q = makeQuantity(1000, "mm", "m");
    expect(formatQuantity(q, { useDisplayUnit: true })).toBe("1 m");
  });
});
