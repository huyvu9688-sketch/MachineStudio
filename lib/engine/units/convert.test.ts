import { describe, expect, it } from "vitest";
import { convert, convertQuantity } from "./convert";
import {
  DimensionMismatchError,
  NonFiniteValueError,
  UnknownUnitError,
} from "./errors";
import { makeQuantity } from "./quantity";
import { engineeringValuesClose } from "../values";

describe("convert — published multiplicative cases", () => {
  const cases: ReadonlyArray<[number, string, string, number]> = [
    [1, "in", "mm", 25.4],
    [1, "ft", "m", 0.3048],
    [1, "lbf", "N", 4.4482216152605],
    [1, "hp", "W", 745.6998715822702],
    [1, "psi", "Pa", 6894.757293168361],
    [1, "rpm", "rad/s", (2 * Math.PI) / 60],
    [1, "kW", "W", 1000],
    [1, "MPa", "Pa", 1_000_000],
    [60, "min", "s", 3600],
    [1, "lbf*ft", "N*m", 1.3558179483314003],
    [1, "percent", "ratio", 0.01],
  ];

  it.each(cases)("convert(%f, %s, %s)", (value, from, to, expected) => {
    expect(convert(value, from, to)).toBeCloseTo(expected, 9);
  });
});

describe("convert — temperature (affine)", () => {
  it("converts degC to K", () => {
    expect(convert(100, "degC", "K")).toBeCloseTo(373.15, 10);
    expect(convert(0, "degC", "K")).toBeCloseTo(273.15, 10);
  });

  it("converts across degC and degF at known reference points", () => {
    expect(convert(0, "degC", "degF")).toBeCloseTo(32, 9);
    expect(convert(100, "degC", "degF")).toBeCloseTo(212, 9);
    expect(convert(212, "degF", "degC")).toBeCloseTo(100, 9);
    expect(convert(32, "degF", "K")).toBeCloseTo(273.15, 9);
  });
});

describe("convert — round trips", () => {
  const roundTrips: ReadonlyArray<[number, string, string]> = [
    [123.4, "in", "mm"],
    [7.5, "lbf", "kN"],
    [3000, "rpm", "rad/s"],
    [72, "degF", "degC"],
    [850, "psi", "MPa"],
  ];

  it.each(roundTrips)("round-trips %f %s via %s", (value, unit, via) => {
    expect(convert(convert(value, unit, via), via, unit)).toBeCloseTo(value, 9);
  });
});
describe("convert — canonical/display quantity round trips", () => {
  const cases: ReadonlyArray<[number, string, string]> = [
    [0.5, "m", "mm"],
    [298.15, "K", "degC"],
  ];

  it.each(cases)(
    "restores canonical %f %s through display unit %s within engineering tolerance",
    (value, canonicalUnit, displayUnit) => {
      const expected = makeQuantity(value, canonicalUnit, displayUnit);
      const restored = makeQuantity(
        convert(
          convert(value, canonicalUnit, displayUnit),
          displayUnit,
          canonicalUnit,
        ),
        canonicalUnit,
        displayUnit,
      );

      expect(engineeringValuesClose(restored, expected)).toBe(true);
    },
  );
});

describe("convert — rejections", () => {
  it("rejects converting mass to force", () => {
    expect(() => convert(1, "kg", "N")).toThrow(DimensionMismatchError);
  });

  it("rejects converting length to time", () => {
    expect(() => convert(1, "m", "s")).toThrow(DimensionMismatchError);
  });

  it("rejects an unknown unit on either side", () => {
    expect(() => convert(1, "smoot", "m")).toThrow(UnknownUnitError);
    expect(() => convert(1, "m", "smoot")).toThrow(UnknownUnitError);
  });
});

describe("convertQuantity", () => {
  it("converts and carries the target unit", () => {
    const result = convertQuantity(makeQuantity(1, "m"), "mm");
    expect(result.value).toBeCloseTo(1000, 9);
    expect(result.unit).toBe("mm");
  });
});

describe("makeQuantity", () => {
  it("accepts a compatible display unit", () => {
    const q = makeQuantity(5, "mm", "m");
    expect(q.displayUnit).toBe("m");
  });

  it("rejects a display unit of a different dimension", () => {
    expect(() => makeQuantity(5, "mm", "s")).toThrow(DimensionMismatchError);
  });

  it("rejects an unregistered unit", () => {
    expect(() => makeQuantity(5, "smoot")).toThrow(UnknownUnitError);
  });

  it("rejects a non-finite magnitude", () => {
    expect(() => makeQuantity(Number.POSITIVE_INFINITY, "m")).toThrow(
      NonFiniteValueError,
    );
    expect(() => makeQuantity(Number.NaN, "m")).toThrow(NonFiniteValueError);
  });
});
