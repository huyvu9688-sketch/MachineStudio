import { describe, expect, it } from "vitest";
import {
  addQuantities,
  divideQuantities,
  multiplyQuantities,
  scaleQuantity,
  subtractQuantities,
} from "./arithmetic";
import { AffineUnitError, DimensionMismatchError, NonFiniteValueError } from "./errors";
import { makeQuantity } from "./quantity";

describe("addQuantities / subtractQuantities", () => {
  it("adds across compatible units, keeping the first operand's unit", () => {
    const sum = addQuantities(makeQuantity(1, "m"), makeQuantity(500, "mm"));
    expect(sum.unit).toBe("m");
    expect(sum.value).toBeCloseTo(1.5, 9);
  });

  it("subtracts across compatible units", () => {
    const difference = subtractQuantities(
      makeQuantity(1, "m"),
      makeQuantity(200, "mm"),
    );
    expect(difference.unit).toBe("m");
    expect(difference.value).toBeCloseTo(0.8, 9);
  });

  it("rejects adding mass to force", () => {
    expect(() =>
      addQuantities(makeQuantity(1, "kg"), makeQuantity(1, "N")),
    ).toThrow(DimensionMismatchError);
  });

  it("rejects arithmetic on affine units", () => {
    expect(() =>
      addQuantities(makeQuantity(20, "degC"), makeQuantity(5, "degC")),
    ).toThrow(AffineUnitError);
  });
});

describe("multiplyQuantities", () => {
  it("simplifies force x length to torque (N*m)", () => {
    const torque = multiplyQuantities(makeQuantity(2, "N"), makeQuantity(3, "m"));
    expect(torque.unit).toBe("N*m");
    expect(torque.value).toBeCloseTo(6, 9);
  });

  it("normalizes operands to SI before combining", () => {
    const torque = multiplyQuantities(makeQuantity(2, "kN"), makeQuantity(3, "m"));
    expect(torque.unit).toBe("N*m");
    expect(torque.value).toBeCloseTo(6000, 6);
  });

  it("applies a dimensionless factor without changing the dimension", () => {
    const scaled = multiplyQuantities(
      makeQuantity(100, "N"),
      makeQuantity(0.9, "efficiency"),
    );
    expect(scaled.unit).toBe("N");
    expect(scaled.value).toBeCloseTo(90, 9);
  });

  it("rejects affine operands", () => {
    expect(() =>
      multiplyQuantities(makeQuantity(20, "degC"), makeQuantity(2, "ratio")),
    ).toThrow(AffineUnitError);
  });
});

describe("divideQuantities", () => {
  it("simplifies length / time to speed (m/s)", () => {
    const speed = divideQuantities(makeQuantity(10, "m"), makeQuantity(2, "s"));
    expect(speed.unit).toBe("m/s");
    expect(speed.value).toBeCloseTo(5, 9);
  });

  it("simplifies speed / time to acceleration (m/s^2)", () => {
    const accel = divideQuantities(makeQuantity(6, "m/s"), makeQuantity(3, "s"));
    expect(accel.unit).toBe("m/s^2");
    expect(accel.value).toBeCloseTo(2, 9);
  });

  it("yields a dimensionless ratio for same-dimension operands", () => {
    const ratio = divideQuantities(makeQuantity(10, "m"), makeQuantity(5, "m"));
    expect(ratio.unit).toBe("ratio");
    expect(ratio.value).toBeCloseTo(2, 9);
  });

  it("keeps angular velocity (rad/s) distinct from frequency (Hz)", () => {
    const angular = divideQuantities(makeQuantity(2, "rad"), makeQuantity(1, "s"));
    expect(angular.unit).toBe("rad/s");
    const frequency = divideQuantities(
      makeQuantity(1, "ratio"),
      makeQuantity(1, "s"),
    );
    expect(frequency.unit).toBe("Hz");
  });

  it("rejects division by a zero magnitude", () => {
    expect(() =>
      divideQuantities(makeQuantity(1, "m"), makeQuantity(0, "s")),
    ).toThrow(NonFiniteValueError);
  });
});

describe("scaleQuantity", () => {
  it("scales by a dimensionless factor, keeping the unit", () => {
    const scaled = scaleQuantity(makeQuantity(10, "mm"), 2);
    expect(scaled.unit).toBe("mm");
    expect(scaled.value).toBeCloseTo(20, 9);
  });

  it("rejects scaling an affine unit", () => {
    expect(() => scaleQuantity(makeQuantity(20, "degC"), 2)).toThrow(
      AffineUnitError,
    );
  });
});
