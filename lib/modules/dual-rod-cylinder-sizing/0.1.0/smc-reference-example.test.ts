import { describe, expect, it } from "vitest";
import { runCxs2m20Example } from "./smc-reference-example";

describe("SMC CXS2M20 (20 mm bore, slide bearing) reached via this module's own compute path", () => {
  it("reproduces a 0.4903 N required extend force from a 0.5 kg horizontal, frictional load", () => {
    const { requiredExtendForceN } = runCxs2m20Example();
    // F = m*g*mu*cos(0) = 0.5 * 9.80665 * 0.1 = 0.4903 N (horizontal, zero incline, zero process force).
    expect(requiredExtendForceN).toBeCloseTo(0.4903, 3);
  });

  it("confirms the CXS2M20 candidate's own theoretical force clears the requirement", () => {
    const { requiredExtendForceN, theoreticalExtendForceN } = runCxs2m20Example();
    expect(theoreticalExtendForceN).toBeGreaterThanOrEqual(requiredExtendForceN);
  });

  it("confirms the load-mass-vs-overhang-length check clears the requirement at the seeded plateau", () => {
    const { loadMassCheck, loadMassKg } = runCxs2m20Example();
    expect(loadMassCheck.inEnvelope).toBe(true);
    if (loadMassCheck.inEnvelope) {
      // At overhang = 4mm (<= the plateau threshold of 4mm), the allowable
      // load mass is the flat 1.0 kg plateau value -- a real, visible
      // margin over this scenario's own 0.5 kg load, not a coincidence.
      expect(loadMassCheck.allowableLoadMassKg).toBeCloseTo(1.0, 6);
      expect(loadMassCheck.allowableLoadMassKg).toBeGreaterThan(loadMassKg);
    }
  });

  it("selects the correct seeded band (horizontal, <=10mm stroke, <=400mm/s, bore 20)", () => {
    const { loadMassCheck } = runCxs2m20Example();
    expect(loadMassCheck.inEnvelope).toBe(true);
    if (loadMassCheck.inEnvelope) {
      expect(loadMassCheck.matchedCurve.strokeBandMaxMm).toBe(10);
      expect(loadMassCheck.matchedCurve.speedBandMaxMps).toBe(0.4);
      expect(loadMassCheck.matchedCurve.boreDiameterMm).toBe(20);
    }
  });
});
