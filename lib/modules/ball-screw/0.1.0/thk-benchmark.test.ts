// Independent-benchmark tests (roadmap Module Definition of Done item 9;
// context/code-standards.md "Module Testing") for ./thk-benchmark.ts. Two
// kinds of check per formula:
//  1. Reproduces THK's own published worked example (printed pages
//     A-744/A-745) within its stated catalog-rounding tolerance.
//  2. Cross-checks against ./math.ts's Rockford-based
//     resolveBucklingLoad/resolveCriticalSpeed for the equivalent geometry
//     and nominal end condition — bounded-ratio agreement only, NOT
//     floating-point agreement, since the two sources use different
//     calibration constants for the same nominal mounting condition (a
//     real, documented discrepancy — see this module's README.md "THK
//     buckling/critical-speed formula" note). This differs from
//     axis-load-cases/atlanta-benchmark.ts's cross-check, where both
//     sources reduce to identical Newtonian physics with no calibration
//     constant to disagree on.

import { describe, expect, it } from "vitest";
import {
  resolveBucklingLoad,
  resolveCriticalSpeed,
  resolveEquivalentDynamicLoad,
} from "./math";
import {
  resolveThkBucklingLoad,
  resolveThkCriticalSpeed,
  resolveThkDirectionalEquivalentLoad,
  resolveThkDnPermissibleSpeed,
  ThkBenchmarkInputError,
} from "./thk-benchmark";

describe("resolveThkBucklingLoad vs. THK's published worked example (A-744)", () => {
  const input = {
    rootDiameterMm: 17.5,
    unsupportedLengthMm: 1100,
    mountingFactor: 20, // fixed-fixed, per THK's own printed text
  };

  it("reproduces the published 15,500 N result", () => {
    // 20 * 17.5^4 / 1100^2 * 1e4 = 15,502.3 N; THK prints 15,500 N.
    expect(resolveThkBucklingLoad(input)).toBeCloseTo(15_502.3, 0);
    expect(
      Math.abs(resolveThkBucklingLoad(input) - 15_500),
    ).toBeLessThanOrEqual(5);
  });

  it("stays within the same order of magnitude as the kernel's Rockford-based buckling load for the equivalent fixed-fixed geometry", () => {
    const thkN = resolveThkBucklingLoad(input);
    const rockfordN = resolveBucklingLoad({
      rootDiameterM: input.rootDiameterMm / 1000,
      unsupportedLengthM: input.unsupportedLengthMm / 1000,
      endSupportArrangement: "fixed-fixed",
    }).bucklingLoadN;
    const ratio = thkN / rockfordN;
    expect(ratio).toBeGreaterThan(0.3);
    expect(ratio).toBeLessThan(3);
  });

  it("rejects non-positive inputs", () => {
    expect(() =>
      resolveThkBucklingLoad({ ...input, rootDiameterMm: 0 }),
    ).toThrow(ThkBenchmarkInputError);
    expect(() =>
      resolveThkBucklingLoad({ ...input, unsupportedLengthMm: -1 }),
    ).toThrow(ThkBenchmarkInputError);
    expect(() =>
      resolveThkBucklingLoad({ ...input, mountingFactor: 0 }),
    ).toThrow(ThkBenchmarkInputError);
  });
});

describe("resolveThkCriticalSpeed vs. THK's published worked examples (A-745)", () => {
  it("reproduces the published 2180 min^-1 result (d1=17.5mm)", () => {
    const result = resolveThkCriticalSpeed({
      rootDiameterMm: 17.5,
      unsupportedLengthMm: 1100,
      mountingFactor: 15.1, // fixed-supported, per THK's own printed text
    });
    // 15.1 * 17.5 / 1100^2 * 1e7 = 2183.9 min^-1; THK prints 2180 min^-1.
    expect(result).toBeCloseTo(2183.9, 0);
    expect(Math.abs(result - 2180)).toBeLessThanOrEqual(5);
  });

  it("reproduces the published 3294 min^-1 result (d1=26.4mm)", () => {
    const result = resolveThkCriticalSpeed({
      rootDiameterMm: 26.4,
      unsupportedLengthMm: 1100,
      mountingFactor: 15.1,
    });
    expect(result).toBeCloseTo(3294.5, 0);
    expect(Math.abs(result - 3294)).toBeLessThanOrEqual(5);
  });

  it("stays within the same order of magnitude as the kernel's Rockford-based critical speed for the equivalent fixed-supported geometry", () => {
    const thkRevPerMin = resolveThkCriticalSpeed({
      rootDiameterMm: 17.5,
      unsupportedLengthMm: 1100,
      mountingFactor: 15.1,
    });
    const rockfordRevPerMin = resolveCriticalSpeed({
      rootDiameterM: 0.0175,
      unsupportedLengthM: 1.1,
      endSupportArrangement: "fixed-supported",
    }).criticalSpeedRevPerMin;
    const ratio = thkRevPerMin / rockfordRevPerMin;
    expect(ratio).toBeGreaterThan(0.3);
    expect(ratio).toBeLessThan(3);
  });

  it("rejects non-positive inputs", () => {
    expect(() =>
      resolveThkCriticalSpeed({
        rootDiameterMm: 0,
        unsupportedLengthMm: 1100,
        mountingFactor: 15.1,
      }),
    ).toThrow(ThkBenchmarkInputError);
    expect(() =>
      resolveThkCriticalSpeed({
        rootDiameterMm: 17.5,
        unsupportedLengthMm: 0,
        mountingFactor: 15.1,
      }),
    ).toThrow(ThkBenchmarkInputError);
  });
});

describe("resolveThkDnPermissibleSpeed vs. THK's published worked examples (A-745)", () => {
  it("reproduces the published 3370 min^-1 result (D=20.75mm)", () => {
    const result = resolveThkDnPermissibleSpeed({
      ballCenterDiameterMm: 20.75,
    });
    // 70000 / 20.75 = 3373.5 min^-1; THK prints 3370 min^-1.
    expect(Math.abs(result - 3370)).toBeLessThanOrEqual(5);
  });

  it("reproduces the published 2240 min^-1 result exactly (D=31.25mm)", () => {
    const result = resolveThkDnPermissibleSpeed({
      ballCenterDiameterMm: 31.25,
    });
    expect(result).toBeCloseTo(2240, 6);
  });

  it("rejects non-positive inputs", () => {
    expect(() =>
      resolveThkDnPermissibleSpeed({ ballCenterDiameterMm: 0 }),
    ).toThrow(ThkBenchmarkInputError);
    expect(() =>
      resolveThkDnPermissibleSpeed({ ballCenterDiameterMm: -5 }),
    ).toThrow(ThkBenchmarkInputError);
  });
});

describe("resolveThkDirectionalEquivalentLoad vs. THK's published worked example (A-746/A-747)", () => {
  // THK's own six-phase table for the WTF2040-2 "High-speed Transfer
  // Equipment" scenario: forward accel/uniform/decel, then backward
  // accel/uniform/decel. Signs follow THK's own printed Fa values.
  const sixPhases = [
    { signedAxialLoadN: 550, travelDistanceMm: 75 }, // No.1: forward accel
    { signedAxialLoadN: 17, travelDistanceMm: 850 }, // No.2: forward uniform
    { signedAxialLoadN: -516, travelDistanceMm: 75 }, // No.3: forward decel
    { signedAxialLoadN: -550, travelDistanceMm: 75 }, // No.4: backward accel
    { signedAxialLoadN: -17, travelDistanceMm: 850 }, // No.5: backward uniform
    { signedAxialLoadN: 516, travelDistanceMm: 75 }, // No.6: backward decel
  ];

  it("reproduces the published 225 N result in both directions", () => {
    const result = resolveThkDirectionalEquivalentLoad(sixPhases);
    expect(result.positiveDirectionLoadN).toBeCloseTo(225, 0);
    expect(result.negativeDirectionLoadN).toBeCloseTo(225, 0);
    expect(Math.abs(result.positiveDirectionLoadN - 225)).toBeLessThanOrEqual(
      1,
    );
    expect(Math.abs(result.negativeDirectionLoadN - 225)).toBeLessThanOrEqual(
      1,
    );
  });

  it("agrees with itself when the scenario is direction-symmetric (Fm1 = Fm2, matching THK's own stated reasoning)", () => {
    const result = resolveThkDirectionalEquivalentLoad(sixPhases);
    expect(result.positiveDirectionLoadN).toBeCloseTo(
      result.negativeDirectionLoadN,
      6,
    );
  });

  it("does NOT agree with math.ts's resolveEquivalentDynamicLoad for the equivalent (q_i, n_i, F_i) phases — a real, documented discrepancy, not a rounding difference", () => {
    // Screw lead 40 mm; total cycle time (both directions) 2.3 s, derived
    // from THK's own selection-condition inputs (t1 = t3 = 0.15 s,
    // uniform-motion time = 850 mm / 1000 mm/s = 0.85 s). Each phase's
    // rotational speed is its own time-average (revolutions in that phase,
    // over that phase's own duration) — the unique (q_i, n_i) choice that
    // makes q_i * n_i exactly proportional to that phase's travel distance,
    // so this is the correct feed for math.ts's formula, not an arbitrary
    // approximation.
    const leadMm = 40;
    const totalCycleTimeS = 2.3;
    const kernelPhases = [
      { timeS: 0.15, forceN: 550 },
      { timeS: 0.85, forceN: 17 },
      { timeS: 0.15, forceN: 516 },
      { timeS: 0.15, forceN: 550 },
      { timeS: 0.85, forceN: 17 },
      { timeS: 0.15, forceN: 516 },
    ].map(({ timeS, forceN }, index) => {
      const travelDistanceMm = sixPhases[index]!.travelDistanceMm;
      const revolutions = travelDistanceMm / leadMm;
      const rotationalSpeedRevPerMin = (revolutions / timeS) * 60;
      return {
        timeFraction: timeS / totalCycleTimeS,
        rotationalSpeedRevPerMin,
        axialLoadMagnitudeN: forceN,
      };
    });

    const kernelResult = resolveEquivalentDynamicLoad(kernelPhases);
    const thkResult = resolveThkDirectionalEquivalentLoad(sixPhases);

    // math.ts's single weighted-cube-mean over all six phases: ~283.5 N.
    expect(kernelResult.equivalentLoadN).toBeCloseTo(283.5, 0);
    // THK's own direction-split method: 225 N.
    expect(thkResult.positiveDirectionLoadN).toBeCloseTo(225, 0);
    // The two are not close — a genuine methodological disagreement, not a
    // unit or rounding mismatch.
    expect(
      Math.abs(kernelResult.equivalentLoadN - thkResult.positiveDirectionLoadN),
    ).toBeGreaterThan(50);
  });

  it("treats a zero-load phase as contributing distance but no cubed load to either direction", () => {
    const withZero = resolveThkDirectionalEquivalentLoad([
      { signedAxialLoadN: 500, travelDistanceMm: 100 },
      { signedAxialLoadN: 0, travelDistanceMm: 100 },
    ]);
    // Denominator includes both phases' distance (200 mm), numerator only
    // the positive-direction phase's contribution.
    expect(withZero.positiveDirectionLoadN).toBeCloseTo(
      Math.cbrt((500 ** 3 * 100) / 200),
      6,
    );
    expect(withZero.negativeDirectionLoadN).toBe(0);
  });

  it("rejects an empty phase list and non-finite/non-positive inputs", () => {
    expect(() => resolveThkDirectionalEquivalentLoad([])).toThrow(
      ThkBenchmarkInputError,
    );
    expect(() =>
      resolveThkDirectionalEquivalentLoad([
        { signedAxialLoadN: Number.NaN, travelDistanceMm: 100 },
      ]),
    ).toThrow(ThkBenchmarkInputError);
    expect(() =>
      resolveThkDirectionalEquivalentLoad([
        { signedAxialLoadN: 500, travelDistanceMm: 0 },
      ]),
    ).toThrow(ThkBenchmarkInputError);
    expect(() =>
      resolveThkDirectionalEquivalentLoad([
        { signedAxialLoadN: 500, travelDistanceMm: -1 },
      ]),
    ).toThrow(ThkBenchmarkInputError);
  });
});
