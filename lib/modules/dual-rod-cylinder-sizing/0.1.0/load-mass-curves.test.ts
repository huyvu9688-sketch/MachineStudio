import { describe, expect, it } from "vitest";
import { DUAL_ROD_LOAD_MASS_CURVES } from "./load-mass-curves";

describe("DUAL_ROD_LOAD_MASS_CURVES data integrity", () => {
  it("has 130 digitized curves (44 vertical + 86 horizontal -- one curve per bore x bearing-type combination across SMC's own 21 published graphs, not 21 curves total)", () => {
    expect(DUAL_ROD_LOAD_MASS_CURVES.length).toBe(130);
  });

  it("has 44 vertical curves and 86 horizontal curves", () => {
    const vertical = DUAL_ROD_LOAD_MASS_CURVES.filter((c) => c.mountingOrientation === "vertical");
    const horizontal = DUAL_ROD_LOAD_MASS_CURVES.filter((c) => c.mountingOrientation === "horizontal");
    expect(vertical.length).toBe(44);
    expect(horizontal.length).toBe(86);
  });

  it("every curve has a positive plateau overhang at or below its own positive edge overhang (matches math.ts's own resolveAllowableLoadMass validation, which requires both strictly positive)", () => {
    for (const curve of DUAL_ROD_LOAD_MASS_CURVES) {
      expect(curve.plateauEndOverhangMm).toBeGreaterThan(0);
      expect(curve.edgeOverhangMm).toBeGreaterThan(0);
      expect(curve.plateauEndOverhangMm).toBeLessThanOrEqual(curve.edgeOverhangMm);
    }
  });

  it("every curve's plateau load mass is at or above its own edge load mass (monotonically non-increasing)", () => {
    for (const curve of DUAL_ROD_LOAD_MASS_CURVES) {
      expect(curve.plateauLoadMassKg).toBeGreaterThanOrEqual(curve.edgeLoadMassKg);
    }
  });

  it("every curve's load-mass fields are positive (matches math.ts's own resolveAllowableLoadMass validation)", () => {
    for (const curve of DUAL_ROD_LOAD_MASS_CURVES) {
      expect(curve.plateauLoadMassKg).toBeGreaterThan(0);
      expect(curve.edgeLoadMassKg).toBeGreaterThan(0);
    }
  });

  it("every horizontal curve has a stroke band; every vertical curve does not", () => {
    for (const curve of DUAL_ROD_LOAD_MASS_CURVES) {
      if (curve.mountingOrientation === "horizontal") {
        expect(curve.strokeBandMaxMm).not.toBeNull();
      } else {
        expect(curve.strokeBandMaxMm).toBeNull();
      }
    }
  });

  it("has no duplicate (orientation, stroke band, speed band, bore, bearing type) key", () => {
    const keys = DUAL_ROD_LOAD_MASS_CURVES.map(
      (c) =>
        `${c.mountingOrientation}|${c.strokeBandMaxMm}|${c.speedBandMaxMps}|${c.boreDiameterMm}|${c.bearingType}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});
