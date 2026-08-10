import { describe, expect, it } from "vitest";
import { resolveLifeHours, resolveNominalLife } from "./math";
import {
  resolveNskFatigueLifeFactor,
  resolveNskLifeHoursBall,
  resolveNskLifeHoursBallDirect,
  resolveNskSpeedFactorBall,
} from "./nsk-fh-benchmark";

// NSK "Rolling Bearings" (CAT. No. E1102a) Section 5.7 "Examples of Bearing
// Calculations" (printed page A34), Examples 1 and 3: single-row deep-groove
// ball bearing 6208, Cr = 29,100 N, n = 900 rpm.
const CR_N = 29_100;
const N_RPM = 900;

describe("NSK speed factor (fn) — ball bearings", () => {
  it("reproduces NSK's own fn = 0.333 at n = 900 rpm (Example 1)", () => {
    // fn = (0.03*900)^(-1/3) = 27^(-1/3) = 1/3 exactly.
    expect(resolveNskSpeedFactorBall(N_RPM)).toBeCloseTo(1 / 3, 9);
  });
});

describe("NSK fatigue life factor (fh) and life-hours — Example 1 (pure radial load)", () => {
  // Fr = 2500 N, P = Fr = 2500 N (NSK's own text: "Since only a radial load
  // is applied... P = Fr").
  const P_N = 2500;
  const fn = resolveNskSpeedFactorBall(N_RPM);

  it("reproduces NSK's own fh = 3.88", () => {
    const fh = resolveNskFatigueLifeFactor(fn, CR_N, P_N);
    expect(fh).toBeCloseTo(3.88, 2);
  });

  it("reproduces NSK's own approximate 29,000-hour service life, within chart-reading tolerance", () => {
    const fh = resolveNskFatigueLifeFactor(fn, CR_N, P_N);
    const lifeHours = resolveNskLifeHoursBall(fh);
    expect(Math.abs(lifeHours - 29_000) / 29_000).toBeLessThan(0.02);
  });
});

describe("NSK fatigue life factor (fh) and life-hours — Example 3 (combined radial + axial load)", () => {
  // Fa = 1000 N added to Example 1; X = 0.56, Y = 1.67 (NSK's own printed
  // factors, obtained from its own X/Y/e table by linear interpolation) ->
  // P = X*Fr + Y*Fa = 0.56*2500 + 1.67*1000 = 3070 N (NSK's own printed
  // figure).
  const P_N = 0.56 * 2500 + 1.67 * 1000;
  const fn = resolveNskSpeedFactorBall(N_RPM);

  it("reproduces NSK's own printed P = 3070 N exactly", () => {
    expect(P_N).toBeCloseTo(3070, 6);
  });

  it("reproduces NSK's own Cr/P = 9.48", () => {
    expect(CR_N / P_N).toBeCloseTo(9.48, 2);
  });

  it("reproduces NSK's own fh = 3.16", () => {
    const fh = resolveNskFatigueLifeFactor(fn, CR_N, P_N);
    expect(fh).toBeCloseTo(3.16, 2);
  });

  it("reproduces NSK's own approximate 15,800-hour service life, within chart-reading tolerance", () => {
    const fh = resolveNskFatigueLifeFactor(fn, CR_N, P_N);
    const lifeHours = resolveNskLifeHoursBall(fh);
    expect(Math.abs(lifeHours - 15_800) / 15_800).toBeLessThan(0.02);
  });
});

describe("algebraic identity: NSK's fh/fn method === this module's own L10/L10h formulas", () => {
  // Not a tolerance-bounded agreement (unlike thk-benchmark.ts's own
  // buckling/critical-speed cross-check, which compares two genuinely
  // different calibration constants) -- substituting NSK's own
  // fn = (0.03n)^(-1/3) into fh = fn*(C/P) and then into Lh = 500*fh^3
  // reduces algebraically to (C/P)^3 * 10^6/(60n), the exact form
  // resolveNominalLife composed with resolveLifeHours already computes. See
  // this file's sibling ./nsk-fh-benchmark.ts module doc comment for the
  // derivation.
  const cases: readonly { readonly n: number; readonly p: number }[] = [
    { n: 900, p: 2500 },
    { n: 900, p: 3070 },
    { n: 1, p: 1 },
    { n: 12_000, p: 45_000 },
  ];

  for (const { n, p } of cases) {
    it(`agrees with this module's own resolveNominalLife/resolveLifeHours to floating-point precision (n=${n}, P=${p})`, () => {
      const nskLifeHours = resolveNskLifeHoursBallDirect(n, CR_N, p);

      const { lifeRevolutions } = resolveNominalLife({
        dynamicLoadRatingN: CR_N,
        equivalentLoadN: p,
      });
      const { lifeHours: moduleLifeHours } = resolveLifeHours({
        lifeRevolutions,
        rotationalSpeedRevPerMin: n,
      });

      // A relative comparison, not toBeCloseTo's absolute decimal-place
      // comparison — some cases below produce life-hours figures many
      // orders of magnitude apart in scale, where floating-point rounding
      // alone (not a real algebraic disagreement) can exceed a fixed
      // absolute tolerance.
      expect(
        Math.abs(nskLifeHours - moduleLifeHours) / moduleLifeHours,
      ).toBeLessThan(1e-9);
    });
  }
});
