import { describe, expect, it } from "vitest";
import { SERIALIZATION_FORMAT_VERSION } from "@/lib/engine/values";
import { parseSubmittedVector } from "./parse-submitted-vector";

describe("parseSubmittedVector", () => {
  it("converts three components from a non-canonical display unit into canonical units", () => {
    const result = parseSubmittedVector(["50", "0", "-20"], "mm", "m", "axis");

    expect(result).toEqual({
      ok: true,
      value: {
        v: SERIALIZATION_FORMAT_VERSION,
        kind: "vector_quantity",
        components: [0.05, 0, -0.02],
        unit: "m",
        frame: "axis",
        displayUnit: "mm",
      },
    });
  });

  it("accepts a genuine zero in one component", () => {
    const result = parseSubmittedVector(["0", "0", "0"], "N", "N", "axis");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.components).toEqual([0, 0, 0]);
  });

  it("falls back to the canonical unit when no unit is submitted", () => {
    const result = parseSubmittedVector(["1", "2", "3"], "", "N", "axis");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.unit).toBe("N");
    expect(result.value.displayUnit).toBe("N");
  });

  it.each([
    ["blank first component", ["", "1", "2"]],
    ["blank middle component", ["1", "", "2"]],
    ["blank last component", ["1", "2", ""]],
    ["whitespace-only component", ["1", "   ", "2"]],
  ])("rejects with %s without storing a partial vector", (_label, components) => {
    const result = parseSubmittedVector(components, "N", "N", "axis");

    expect(result).toEqual({ ok: false, message: "Enter a numeric value." });
  });

  it("rejects a non-numeric component", () => {
    const result = parseSubmittedVector(["1", "abc", "2"], "N", "N", "axis");

    expect(result).toEqual({ ok: false, message: "Enter a numeric value." });
  });

  it("rejects an invalid unit", () => {
    const result = parseSubmittedVector(["1", "2", "3"], "not-a-unit", "N", "axis");

    expect(result).toEqual({
      ok: false,
      message: 'Unit "not-a-unit" is not valid for this value.',
    });
  });

  it("rejects a component that overflows to Infinity after unit conversion", () => {
    const result = parseSubmittedVector(
      [String(Number.MAX_VALUE), "1", "1"],
      "MPa",
      "Pa",
      "axis",
    );

    expect(result).toEqual({
      ok: false,
      message: 'Unit "MPa" is not valid for this value.',
    });
  });
});
