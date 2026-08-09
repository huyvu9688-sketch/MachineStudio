import { describe, expect, it } from "vitest";
import {
  SupportBearingInputError,
  resolveDynamicEquivalentLoad,
  resolveLifeHours,
  resolveNominalLife,
  resolveOperatingSpeed,
  resolveSpeedSafetyFactor,
  resolveStaticEquivalentLoad,
  resolveStaticSafetyFactor,
} from "./math";

// No published worked numerical example is reproduced here: NTN's own
// handbook table of contents lists a "Bearing Life Calculation Examples"
// section (printed page 84) that both copies fetched this session are
// identically truncated right before -- a real, documented evidence gap
// (context/modules/support-bearing/stage-1-spec.md "Evidence Gaps"), not
// closed here. These tests cover formula correctness (against the printed
// equations) and boundary/invalid input only.

describe("resolveDynamicEquivalentLoad", () => {
  it("computes P = X*Fr + Y*Fa", () => {
    expect(
      resolveDynamicEquivalentLoad({
        radialLoadN: 1000,
        axialLoadN: 500,
        factorX: 0.4,
        factorY: 1.2,
      }).dynamicEquivalentLoadN,
    ).toBeCloseTo(1000, 9);
  });

  it("supports a zero axial load (a floating/supported-side bearing)", () => {
    expect(
      resolveDynamicEquivalentLoad({
        radialLoadN: 1000,
        axialLoadN: 0,
        factorX: 1,
        factorY: 0,
      }).dynamicEquivalentLoadN,
    ).toBeCloseTo(1000, 9);
  });

  it("rejects a negative load or factor", () => {
    expect(() =>
      resolveDynamicEquivalentLoad({
        radialLoadN: -1,
        axialLoadN: 0,
        factorX: 1,
        factorY: 0,
      }),
    ).toThrow(SupportBearingInputError);
    expect(() =>
      resolveDynamicEquivalentLoad({
        radialLoadN: 1000,
        axialLoadN: 0,
        factorX: -1,
        factorY: 0,
      }),
    ).toThrow(SupportBearingInputError);
  });
});

describe("resolveStaticEquivalentLoad", () => {
  it("takes the combined form when it exceeds the pure radial load", () => {
    const result = resolveStaticEquivalentLoad({
      radialLoadN: 1000,
      axialLoadN: 2000,
      factorX0: 0.6,
      factorY0: 0.5,
    });
    // combined = 0.6*1000 + 0.5*2000 = 1600 > Fr (1000)
    expect(result.staticEquivalentLoadN).toBeCloseTo(1600, 9);
  });

  it("falls back to the pure radial load when the combined form is smaller", () => {
    const result = resolveStaticEquivalentLoad({
      radialLoadN: 1000,
      axialLoadN: 10,
      factorX0: 0.5,
      factorY0: 0.2,
    });
    // combined = 0.5*1000 + 0.2*10 = 502 < Fr (1000)
    expect(result.staticEquivalentLoadN).toBeCloseTo(1000, 9);
  });

  it("rejects a negative load or factor", () => {
    expect(() =>
      resolveStaticEquivalentLoad({
        radialLoadN: 1000,
        axialLoadN: -1,
        factorX0: 1,
        factorY0: 1,
      }),
    ).toThrow(SupportBearingInputError);
  });
});

describe("resolveNominalLife", () => {
  it("computes L10 = (C/P)^3 * 1e6", () => {
    const result = resolveNominalLife({
      dynamicLoadRatingN: 2000,
      equivalentLoadN: 1000,
    });
    expect(result.lifeRevolutions).toBeCloseTo(8 * 1e6, 6);
  });

  it("rejects a non-positive dynamic load rating or equivalent load", () => {
    expect(() =>
      resolveNominalLife({ dynamicLoadRatingN: 0, equivalentLoadN: 1000 }),
    ).toThrow(SupportBearingInputError);
    expect(() =>
      resolveNominalLife({ dynamicLoadRatingN: 2000, equivalentLoadN: 0 }),
    ).toThrow(SupportBearingInputError);
  });
});

describe("resolveLifeHours", () => {
  it("computes L10h = L10 / (60*n)", () => {
    const result = resolveLifeHours({
      lifeRevolutions: 6_000_000,
      rotationalSpeedRevPerMin: 100,
    });
    expect(result.lifeHours).toBeCloseTo(1000, 6);
  });

  it("rejects non-positive input", () => {
    expect(() =>
      resolveLifeHours({ lifeRevolutions: 0, rotationalSpeedRevPerMin: 100 }),
    ).toThrow(SupportBearingInputError);
    expect(() =>
      resolveLifeHours({
        lifeRevolutions: 1000,
        rotationalSpeedRevPerMin: 0,
      }),
    ).toThrow(SupportBearingInputError);
  });
});

describe("resolveStaticSafetyFactor", () => {
  it("computes S0 = C0 / P0", () => {
    expect(
      resolveStaticSafetyFactor({
        staticLoadRatingN: 4000,
        staticEquivalentLoadN: 1000,
      }).staticSafetyFactor,
    ).toBeCloseTo(4, 9);
  });

  it("rejects non-positive input", () => {
    expect(() =>
      resolveStaticSafetyFactor({
        staticLoadRatingN: 0,
        staticEquivalentLoadN: 1000,
      }),
    ).toThrow(SupportBearingInputError);
    expect(() =>
      resolveStaticSafetyFactor({
        staticLoadRatingN: 4000,
        staticEquivalentLoadN: 0,
      }),
    ).toThrow(SupportBearingInputError);
  });
});

describe("resolveOperatingSpeed", () => {
  it("computes n = v / lead in both rev/min and rad/s", () => {
    const result = resolveOperatingSpeed({
      linearVelocityMps: 0.1,
      leadM: 0.01,
    });
    // v/lead = 10 rev/s -> 600 rev/min, 62.83 rad/s
    expect(result.rotationalSpeedRevPerMin).toBeCloseTo(600, 9);
    expect(result.rotationalSpeedRadPerS).toBeCloseTo(10 * 2 * Math.PI, 9);
  });

  it("permits a zero linear velocity", () => {
    const result = resolveOperatingSpeed({
      linearVelocityMps: 0,
      leadM: 0.01,
    });
    expect(result.rotationalSpeedRevPerMin).toBe(0);
    expect(result.rotationalSpeedRadPerS).toBe(0);
  });

  it("rejects a non-positive lead", () => {
    expect(() =>
      resolveOperatingSpeed({ linearVelocityMps: 0.1, leadM: 0 }),
    ).toThrow(SupportBearingInputError);
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

  it("rejects a zero or negative operating speed", () => {
    expect(() =>
      resolveSpeedSafetyFactor({
        allowableSpeedRadPerS: 100,
        operatingSpeedRadPerS: 0,
      }),
    ).toThrow(SupportBearingInputError);
  });

  it("rejects a non-positive allowable speed", () => {
    expect(() =>
      resolveSpeedSafetyFactor({
        allowableSpeedRadPerS: 0,
        operatingSpeedRadPerS: 25,
      }),
    ).toThrow(SupportBearingInputError);
  });
});
