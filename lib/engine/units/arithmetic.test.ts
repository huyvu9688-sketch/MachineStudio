import { describe, expect, it } from "vitest";
import {
  addQuantities,
  angularVelocityFromPower,
  divideQuantities,
  multiplyQuantities,
  rotationalPower,
  scaleQuantity,
  subtractQuantities,
  torqueFromPower,
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

describe("rotational-mechanics helpers (angle-cancelling exceptions)", () => {
  it("confirms generic multiply cannot express torque x angular velocity as power", () => {
    // Regression guard for the documented design risk: this is the exact
    // case from context/progress-tracker.md's Open Questions. If this ever
    // starts returning "W", the angle-dimension trade-off changed and the
    // rotational-power helpers below may no longer be necessary.
    const product = multiplyQuantities(
      makeQuantity(10, "N*m"),
      makeQuantity(100, "rad/s"),
    );
    expect(product.unit).not.toBe("W");
    expect(product.unit).toBe("kg*m^2*s^-3*rad");
    expect(product.value).toBeCloseTo(1000, 9);
  });

  it("computes rotational power from torque and angular velocity", () => {
    const power = rotationalPower(makeQuantity(10, "N*m"), makeQuantity(100, "rad/s"));
    expect(power.unit).toBe("W");
    expect(power.value).toBeCloseTo(1000, 9);
  });

  it("normalizes operands to SI before combining", () => {
    const power = rotationalPower(makeQuantity(10, "N*mm"), makeQuantity(1000, "rpm"));
    expect(power.unit).toBe("W");
    // 10 N*mm = 0.01 N*m; 1000 rpm = 1000 * 2*pi/60 rad/s
    expect(power.value).toBeCloseTo(0.01 * ((1000 * 2 * Math.PI) / 60), 6);
  });

  it("rejects a non-torque first operand", () => {
    expect(() =>
      rotationalPower(makeQuantity(10, "N"), makeQuantity(100, "rad/s")),
    ).toThrow(DimensionMismatchError);
  });

  it("rejects a non-angular-velocity second operand", () => {
    expect(() =>
      rotationalPower(makeQuantity(10, "N*m"), makeQuantity(100, "Hz")),
    ).toThrow(DimensionMismatchError);
  });

  it("computes torque from power and angular velocity, inverting rotationalPower", () => {
    const torque = torqueFromPower(makeQuantity(1000, "W"), makeQuantity(100, "rad/s"));
    expect(torque.unit).toBe("N*m");
    expect(torque.value).toBeCloseTo(10, 9);
  });

  it("computes angular velocity from power and torque, inverting rotationalPower", () => {
    const omega = angularVelocityFromPower(
      makeQuantity(1000, "W"),
      makeQuantity(10, "N*m"),
    );
    expect(omega.unit).toBe("rad/s");
    expect(omega.value).toBeCloseTo(100, 9);
  });

  it("rejects dividing by a zero angular velocity", () => {
    expect(() =>
      torqueFromPower(makeQuantity(1000, "W"), makeQuantity(0, "rad/s")),
    ).toThrow(NonFiniteValueError);
  });

  it("rejects affine operands", () => {
    expect(() =>
      rotationalPower(makeQuantity(20, "degC"), makeQuantity(100, "rad/s")),
    ).toThrow(AffineUnitError);
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
