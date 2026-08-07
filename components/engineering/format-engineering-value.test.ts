import { describe, expect, it } from "vitest";
import { formatEngineeringValue } from "./format-engineering-value";

describe("formatEngineeringValue", () => {
  it("converts a quantity magnitude into its display unit before rendering", () => {
    expect(
      formatEngineeringValue({
        v: 1,
        kind: "quantity",
        value: 0.5,
        unit: "m",
        displayUnit: "mm",
      }),
    ).toBe("500 mm");
  });

  it("preserves a quantity in its canonical unit when no display unit exists", () => {
    expect(
      formatEngineeringValue({ v: 1, kind: "quantity", value: 0.5, unit: "m" }),
    ).toBe("0.5 m");
  });

  it("labels each component X/Y/Z for a frame: axis vector and converts to the displayed unit", () => {
    expect(
      formatEngineeringValue({
        v: 1,
        kind: "vector_quantity",
        components: [0.5, 1, -0.25],
        unit: "m",
        displayUnit: "mm",
        frame: "axis",
      }),
    ).toBe("[X: 500, Y: 1000, Z: -250] mm");
  });

  it("leaves components unlabeled for a vector whose frame is not axis", () => {
    expect(
      formatEngineeringValue({
        v: 1,
        kind: "vector_quantity",
        components: [0.5, 1],
        unit: "m",
        displayUnit: "mm",
      }),
    ).toBe("[500, 1000] mm");
  });
});
