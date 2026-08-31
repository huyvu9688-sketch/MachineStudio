import { describe, expect, it } from "vitest";
import { resolveShaftCombinedStress } from "./math";
import {
  ReuvenBenchmarkInputError,
  resolveReuvenTrescaDiameterM,
  resolveReuvenVonMisesDiameterM,
} from "./reuven-benchmark";

// Reuven Tools' own worked example (lib/standards/engineering-sources.ts,
// us.reuven_tools.shaft_design_calculator): M = T = 1.0e6 N*mm (1000 N*m),
// Sy = 400 MPa, N = 2, Kb = Kt = 1.
const REUVEN_INPUT = {
  bendingMomentNm: 1000,
  torqueNm: 1000,
  yieldStrengthPa: 400e6,
  safetyFactor: 2,
  kb: 1,
  kt: 1,
};

describe("Reuven Tools independent shaft-design benchmark", () => {
  it("reproduces Reuven's own Tresca worked result (d ~= 41.6 mm)", () => {
    const diameterM = resolveReuvenTrescaDiameterM(REUVEN_INPUT);
    expect(diameterM * 1000).toBeCloseTo(41.6, 1);
  });

  it("reproduces Reuven's own von Mises worked result (d ~= 40.7 mm)", () => {
    const diameterM = resolveReuvenVonMisesDiameterM(REUVEN_INPUT);
    expect(diameterM * 1000).toBeCloseTo(40.7, 1);
  });

  it("von Mises solves a smaller diameter than Tresca for the same loading (expected theoretical relationship)", () => {
    const tresca = resolveReuvenTrescaDiameterM(REUVEN_INPUT);
    const vonMises = resolveReuvenVonMisesDiameterM(REUVEN_INPUT);
    expect(vonMises).toBeLessThan(tresca);
  });

  it("rejects non-positive inputs", () => {
    expect(() =>
      resolveReuvenTrescaDiameterM({ ...REUVEN_INPUT, safetyFactor: 0 }),
    ).toThrow(ReuvenBenchmarkInputError);
  });

  /**
   * The real cross-check: this module's own resolveShaftCombinedStress
   * (./math.ts), evaluated at Reuven's own independently-solved Tresca
   * diameter with the same M/T/Kb/Kt inputs (Km/Ks here), must recover
   * Reuven's own governing allowable stress (tau_allow = Sy/(2N) = 100 MPa)
   * — confirming this module's own Tresca formula agrees with an
   * independently sourced tool's own solved result, not just its formula
   * shape. A small relative tolerance is expected: Reuven's own printed
   * diameter (41.6 mm) is itself rounded to 3 significant figures.
   */
  it("this module's own resolveShaftCombinedStress recovers Reuven's own tau_allow at Reuven's own solved diameter", () => {
    const reuvenDiameterM = resolveReuvenTrescaDiameterM(REUVEN_INPUT);
    const tauAllowPa =
      REUVEN_INPUT.yieldStrengthPa / (2 * REUVEN_INPUT.safetyFactor);

    const { combinedStressPa } = resolveShaftCombinedStress({
      torqueNm: REUVEN_INPUT.torqueNm,
      bendingMomentNm: REUVEN_INPUT.bendingMomentNm,
      torqueServiceFactor: REUVEN_INPUT.kt,
      bendingServiceFactor: REUVEN_INPUT.kb,
      diameterM: reuvenDiameterM,
      boreDiameterM: 0,
    });

    expect(
      Math.abs(combinedStressPa - tauAllowPa) / tauAllowPa,
    ).toBeLessThan(0.005);
  });

  /**
   * Same cross-check, but against Reuven's own *printed* (rounded to 3 sig
   * figs) diameter, 41.6 mm — the number an engineer reading Reuven's page
   * would actually see, not this benchmark's own unrounded intermediate
   * value.
   */
  it("also recovers tau_allow at Reuven's own printed 41.6 mm diameter", () => {
    const tauAllowPa =
      REUVEN_INPUT.yieldStrengthPa / (2 * REUVEN_INPUT.safetyFactor);

    const { combinedStressPa } = resolveShaftCombinedStress({
      torqueNm: REUVEN_INPUT.torqueNm,
      bendingMomentNm: REUVEN_INPUT.bendingMomentNm,
      torqueServiceFactor: REUVEN_INPUT.kt,
      bendingServiceFactor: REUVEN_INPUT.kb,
      diameterM: 0.0416,
      boreDiameterM: 0,
    });

    expect(
      Math.abs(combinedStressPa - tauAllowPa) / tauAllowPa,
    ).toBeLessThan(0.005);
  });
});
