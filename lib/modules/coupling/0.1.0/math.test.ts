import { describe, expect, it } from "vitest";
import {
  CouplingInputError,
  resolveOperatingSpeed,
  resolveRequiredTorqueFromPower,
  resolveScaledRequiredTorque,
  resolveSpeedSafetyFactor,
  resolveTorqueSafetyFactor,
} from "./math";

const RPM_TO_RAD_PER_S = (2 * Math.PI) / 60;

describe("resolveRequiredTorqueFromPower", () => {
  it("computes T = P / omega", () => {
    expect(
      resolveRequiredTorqueFromPower({
        powerW: 1000,
        rotationalSpeedRadPerS: 100,
      }).requiredTorqueNm,
    ).toBeCloseTo(10, 9);
  });

  it("rejects non-positive power or speed", () => {
    expect(() =>
      resolveRequiredTorqueFromPower({
        powerW: 0,
        rotationalSpeedRadPerS: 100,
      }),
    ).toThrow(CouplingInputError);
    expect(() =>
      resolveRequiredTorqueFromPower({
        powerW: 1000,
        rotationalSpeedRadPerS: 0,
      }),
    ).toThrow(CouplingInputError);
  });

  // Reference examples: KTR "Coupling Selection Based on Operating Factors"
  // (context/modules/coupling/stage-1-spec.md item 1) and R+W "Sizing and
  // Selection" (DIN 740 part 2). Both sources' own printed constant (9550,
  // Nm/kW/rpm) is a rounded stand-in for 60,000/(2*pi) = 9549.30..., so an
  // exact SI computation differs from their own printed intermediate figures
  // by a small, explainable amount — a relative tolerance is the honest
  // comparison, the same treatment this project gives other sources' own
  // shown-arithmetic-vs-printed-rounding gaps (e.g.
  // lib/modules/ball-screw/0.1.0/validation.ts's "rockford-drive-torque").
  it("reproduces KTR's own worked example (200 kW / 1500 rpm -> T_AN = 1273 Nm)", () => {
    const result = resolveRequiredTorqueFromPower({
      powerW: 200_000,
      rotationalSpeedRadPerS: 1500 * RPM_TO_RAD_PER_S,
    });
    expect(Math.abs(result.requiredTorqueNm - 1273) / 1273).toBeLessThan(0.001);
  });

  it("reproduces R+W's own Example 1 (450 kW / 980 rpm -> T_AN = 4385.2 Nm)", () => {
    const result = resolveRequiredTorqueFromPower({
      powerW: 450_000,
      rotationalSpeedRadPerS: 980 * RPM_TO_RAD_PER_S,
    });
    expect(Math.abs(result.requiredTorqueNm - 4385.2) / 4385.2).toBeLessThan(
      0.001,
    );
  });

  it("reproduces R+W's own Example 2 (800 kW / 980 rpm -> T_AN = 7796 Nm)", () => {
    const result = resolveRequiredTorqueFromPower({
      powerW: 800_000,
      rotationalSpeedRadPerS: 980 * RPM_TO_RAD_PER_S,
    });
    expect(Math.abs(result.requiredTorqueNm - 7796) / 7796).toBeLessThan(0.001);
  });
});

describe("resolveScaledRequiredTorque", () => {
  it("scales by the service factor", () => {
    expect(
      resolveScaledRequiredTorque({
        requiredTorqueNm: 1000,
        serviceFactor: 1.5,
      }).scaledRequiredTorqueNm,
    ).toBeCloseTo(1500, 9);
  });

  it("takes the magnitude of a signed required torque", () => {
    expect(
      resolveScaledRequiredTorque({
        requiredTorqueNm: -1000,
        serviceFactor: 1.5,
      }).scaledRequiredTorqueNm,
    ).toBeCloseTo(1500, 9);
  });

  it("rejects a zero required torque or non-positive service factor", () => {
    expect(() =>
      resolveScaledRequiredTorque({ requiredTorqueNm: 0, serviceFactor: 1.5 }),
    ).toThrow(CouplingInputError);
    expect(() =>
      resolveScaledRequiredTorque({ requiredTorqueNm: 1000, serviceFactor: 0 }),
    ).toThrow(CouplingInputError);
  });

  // Reference examples: same two sources, the steady-torque check.
  it("reproduces KTR's own required T_KN (1273 Nm * 1.5 * 1.0 * 1.0 = 1909.5 Nm)", () => {
    const result = resolveScaledRequiredTorque({
      requiredTorqueNm: 1273,
      serviceFactor: 1.5 * 1.0 * 1.0,
    });
    expect(result.scaledRequiredTorqueNm).toBeCloseTo(1909.5, 6);
  });

  it("reproduces R+W's own Example 1 required T_KN (4385.2 * 1.25 * 1.1 * 1.0 = 6029.7 Nm)", () => {
    const result = resolveScaledRequiredTorque({
      requiredTorqueNm: 4385.2,
      serviceFactor: 1.25 * 1.1 * 1.0,
    });
    expect(Math.abs(result.scaledRequiredTorqueNm - 6029.7)).toBeLessThan(0.1);
  });

  it("reproduces R+W's own Example 2 required T_KN (7796 * 2 = 15,592 Nm)", () => {
    const result = resolveScaledRequiredTorque({
      requiredTorqueNm: 7796,
      serviceFactor: 2,
    });
    expect(result.scaledRequiredTorqueNm).toBeCloseTo(15_592, 6);
  });
});

describe("resolveTorqueSafetyFactor", () => {
  it("computes capacity / scaled required torque", () => {
    expect(
      resolveTorqueSafetyFactor({
        capacityTorqueNm: 2000,
        scaledRequiredTorqueNm: 1000,
      }).torqueSafetyFactor,
    ).toBeCloseTo(2, 9);
  });

  it("rejects non-positive input", () => {
    expect(() =>
      resolveTorqueSafetyFactor({
        capacityTorqueNm: 0,
        scaledRequiredTorqueNm: 1000,
      }),
    ).toThrow(CouplingInputError);
    expect(() =>
      resolveTorqueSafetyFactor({
        capacityTorqueNm: 2000,
        scaledRequiredTorqueNm: 0,
      }),
    ).toThrow(CouplingInputError);
  });

  // R+W's own two examples both select a catalog size whose rated torque
  // barely clears the requirement (by design -- a selection picks the
  // smallest standard size that passes), so the safety factor is just above 1.
  it("confirms R+W's own Example 1 selection clears its own requirement (ST2/10, T_KN = 6030 Nm)", () => {
    const result = resolveTorqueSafetyFactor({
      capacityTorqueNm: 6030,
      scaledRequiredTorqueNm: 6029.7,
    });
    expect(result.torqueSafetyFactor).toBeGreaterThan(1);
    expect(result.torqueSafetyFactor).toBeCloseTo(1, 2);
  });

  it("confirms R+W's own Example 2 selection clears its own requirement (ST4/10, T_KN = 16,000 Nm)", () => {
    const result = resolveTorqueSafetyFactor({
      capacityTorqueNm: 16_000,
      scaledRequiredTorqueNm: 15_592,
    });
    expect(result.torqueSafetyFactor).toBeGreaterThan(1);
    expect(result.torqueSafetyFactor).toBeCloseTo(1.026, 3);
  });
});

describe("resolveOperatingSpeed", () => {
  it("computes n = (v / lead) * 2*pi * gearRatio", () => {
    const result = resolveOperatingSpeed({
      linearVelocityMps: 0.1,
      leadM: 0.01,
      gearRatio: 1,
    });
    // v/lead = 10 rev/s -> 62.83 rad/s
    expect(result.rotationalSpeedRadPerS).toBeCloseTo(10 * 2 * Math.PI, 9);
  });

  it("scales up by the gear ratio (driving shaft turns faster than the screw)", () => {
    const direct = resolveOperatingSpeed({
      linearVelocityMps: 0.1,
      leadM: 0.01,
      gearRatio: 1,
    });
    const geared = resolveOperatingSpeed({
      linearVelocityMps: 0.1,
      leadM: 0.01,
      gearRatio: 3,
    });
    expect(geared.rotationalSpeedRadPerS).toBeCloseTo(
      direct.rotationalSpeedRadPerS * 3,
      9,
    );
  });

  it("permits a zero linear velocity (a real peak-case-at-start-up scenario)", () => {
    const result = resolveOperatingSpeed({
      linearVelocityMps: 0,
      leadM: 0.01,
      gearRatio: 1,
    });
    expect(result.rotationalSpeedRadPerS).toBe(0);
  });

  it("rejects a non-positive lead or gear ratio", () => {
    expect(() =>
      resolveOperatingSpeed({ linearVelocityMps: 0.1, leadM: 0, gearRatio: 1 }),
    ).toThrow(CouplingInputError);
    expect(() =>
      resolveOperatingSpeed({
        linearVelocityMps: 0.1,
        leadM: 0.01,
        gearRatio: 0,
      }),
    ).toThrow(CouplingInputError);
  });
});

describe("resolveSpeedSafetyFactor", () => {
  it("computes allowable / operating speed", () => {
    expect(
      resolveSpeedSafetyFactor({
        allowableSpeedRadPerS: 100,
        operatingSpeedRadPerS: 25,
      }).speedSafetyFactor,
    ).toBeCloseTo(4, 9);
  });

  it("rejects a zero or negative operating speed, unlike resolveOperatingSpeed", () => {
    expect(() =>
      resolveSpeedSafetyFactor({
        allowableSpeedRadPerS: 100,
        operatingSpeedRadPerS: 0,
      }),
    ).toThrow(CouplingInputError);
  });

  it("rejects a non-positive allowable speed", () => {
    expect(() =>
      resolveSpeedSafetyFactor({
        allowableSpeedRadPerS: 0,
        operatingSpeedRadPerS: 25,
      }),
    ).toThrow(CouplingInputError);
  });
});
