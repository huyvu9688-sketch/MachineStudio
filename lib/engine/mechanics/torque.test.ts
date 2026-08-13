import { describe, expect, it } from "vitest";
import { MechanicsInputError } from "./errors";
import { accelerationTorque, angularAccelerationFromSpeedRamp } from "./torque";

describe("accelerationTorque", () => {
  it("returns J*alpha", () => {
    expect(
      accelerationTorque({
        inertiaKgM2: 0.0025,
        angularAccelerationRadPerS2: 400,
      }).torqueNm,
    ).toBeCloseTo(1, 12);
  });

  it("returns zero torque at zero angular acceleration", () => {
    expect(
      accelerationTorque({
        inertiaKgM2: 0.0025,
        angularAccelerationRadPerS2: 0,
      }).torqueNm,
    ).toBe(0);
  });

  it("keeps the sign of the angular acceleration, so a deceleration is negative", () => {
    expect(
      accelerationTorque({
        inertiaKgM2: 0.0025,
        angularAccelerationRadPerS2: -400,
      }).torqueNm,
    ).toBeCloseTo(-1, 12);
  });

  it("is linear in inertia", () => {
    const single = accelerationTorque({
      inertiaKgM2: 0.001,
      angularAccelerationRadPerS2: 250,
    }).torqueNm;
    const doubled = accelerationTorque({
      inertiaKgM2: 0.002,
      angularAccelerationRadPerS2: 250,
    }).torqueNm;
    expect(doubled / single).toBeCloseTo(2, 12);
  });

  it("rejects a negative inertia", () => {
    expect(() =>
      accelerationTorque({
        inertiaKgM2: -0.001,
        angularAccelerationRadPerS2: 250,
      }),
    ).toThrow(MechanicsInputError);
  });

  it("rejects a non-finite angular acceleration", () => {
    expect(() =>
      accelerationTorque({
        inertiaKgM2: 0.001,
        angularAccelerationRadPerS2: Number.POSITIVE_INFINITY,
      }),
    ).toThrow(MechanicsInputError);
  });

  it("reproduces the source's rpm-packaged form Ta = J*N/(9.55*t1)", () => {
    // Oriental Motor prints the same relationship with speed in r/min and the
    // rounded constant 9.55 (exactly 30/pi = 9.5493...). Agreement to the
    // precision that rounding allows is the check; exact equality is not
    // available, and asserting it would be asserting the source's own
    // rounding rather than the physics.
    const inertiaKgM2 = 0.0032;
    const operatingSpeedRpm = 3000;
    const rampTimeS = 0.15;

    const printedFormNm =
      (inertiaKgM2 / 9.55) * (operatingSpeedRpm / rampTimeS);

    const { torqueNm } = accelerationTorque({
      inertiaKgM2,
      angularAccelerationRadPerS2: angularAccelerationFromSpeedRamp({
        angularVelocityChangeRadPerS: (operatingSpeedRpm * 2 * Math.PI) / 60,
        rampTimeS,
      }).angularAccelerationRadPerS2,
    });

    expect(torqueNm).toBeCloseTo(printedFormNm, 3);
    expect(Math.abs(torqueNm / printedFormNm - 1)).toBeLessThan(1e-4);
  });
});

describe("angularAccelerationFromSpeedRamp", () => {
  it("returns delta-omega / t", () => {
    expect(
      angularAccelerationFromSpeedRamp({
        angularVelocityChangeRadPerS: 100,
        rampTimeS: 0.25,
      }).angularAccelerationRadPerS2,
    ).toBeCloseTo(400, 12);
  });

  it("keeps the sign of the velocity change", () => {
    expect(
      angularAccelerationFromSpeedRamp({
        angularVelocityChangeRadPerS: -100,
        rampTimeS: 0.25,
      }).angularAccelerationRadPerS2,
    ).toBeCloseTo(-400, 12);
  });

  it("rejects a zero ramp time", () => {
    expect(() =>
      angularAccelerationFromSpeedRamp({
        angularVelocityChangeRadPerS: 100,
        rampTimeS: 0,
      }),
    ).toThrow(MechanicsInputError);
  });

  it("rejects a negative ramp time", () => {
    expect(() =>
      angularAccelerationFromSpeedRamp({
        angularVelocityChangeRadPerS: 100,
        rampTimeS: -0.25,
      }),
    ).toThrow(MechanicsInputError);
  });
});
