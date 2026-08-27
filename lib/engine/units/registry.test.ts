import { describe, expect, it } from "vitest";
import { dimensionsEqual } from "./dimension";
import { UnknownUnitError } from "./errors";
import {
  Dimensions,
  getUnit,
  hasUnit,
  listUnits,
  preferredSymbol,
} from "./registry";

const EXPECTED_UNITS = [
  "m",
  "mm",
  "cm",
  "km",
  "in",
  "ft",
  "s",
  "min",
  "h",
  "kg",
  "g",
  "lbm",
  "N",
  "kN",
  "lbf",
  "N*m",
  "N*mm",
  "lbf*in",
  "lbf*ft",
  "J",
  "m/s",
  "m/min",
  "mm/s",
  "in/s",
  "m/s^2",
  "mm/s^2",
  "in/s^2",
  "rad",
  "deg",
  "rad/s",
  "rpm",
  "rad/s^2",
  "W",
  "kW",
  "hp",
  "Pa",
  "kPa",
  "MPa",
  "bar",
  "psi",
  "kg*m^2",
  "kg*cm^2",
  "g*cm^2",
  "N*m/rad",
  "K",
  "degC",
  "degF",
  "Hz",
  "ratio",
  "percent",
  "efficiency",
];

describe("unit registry", () => {
  it("registers every unit named in the implementation map", () => {
    for (const symbol of EXPECTED_UNITS) {
      expect(hasUnit(symbol)).toBe(true);
    }
  });

  it("defines m/min as a speed-compatible display unit", () => {
    const metersPerMinute = getUnit("m/min");
    const metersPerSecond = getUnit("m/s");

    expect(dimensionsEqual(metersPerMinute.dimension, Dimensions.speed)).toBe(
      true,
    );
    expect(metersPerMinute.factor).toBe(metersPerSecond.factor / 60);
  });
  it("throws UnknownUnitError for an unregistered symbol", () => {
    expect(() => getUnit("furlong")).toThrow(UnknownUnitError);
    expect(hasUnit("furlong")).toBe(false);
  });

  it("keeps frequency and angular velocity dimensionally distinct", () => {
    expect(
      dimensionsEqual(getUnit("Hz").dimension, getUnit("rad/s").dimension),
    ).toBe(false);
  });

  it("resolves the SI-coherent symbol for a dimension", () => {
    expect(preferredSymbol(Dimensions.torque)).toBe("N*m");
    expect(preferredSymbol(Dimensions.speed)).toBe("m/s");
    expect(preferredSymbol(Dimensions.dimensionless)).toBe("ratio");
  });

  it("marks exactly the SI-coherent units with factor 1", () => {
    for (const unit of listUnits()) {
      if (unit.siCoherent) {
        expect(unit.factor).toBe(1);
        expect(unit.offset).toBe(0);
      }
    }
  });
});
