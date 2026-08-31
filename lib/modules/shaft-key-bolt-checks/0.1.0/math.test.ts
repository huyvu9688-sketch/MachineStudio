import { describe, expect, it } from "vitest";
import { convert } from "@/lib/engine";
import {
  ShaftKeyBoltInputError,
  resolveBoltBearingStress,
  resolveBoltPreload,
  resolveBoltSafetyFactor,
  resolveBoltSeparationSafetyFactor,
  resolveBoltShearStress,
  resolveBoltStressArea,
  resolveBoltTensileSafetyFactor,
  resolveKeyBearingStress,
  resolveKeySafetyFactor,
  resolveKeyShearStress,
  resolveKeyTangentialForce,
  resolveShaftCombinedStress,
  resolveShaftSafetyFactor,
} from "./math";

describe("resolveShaftCombinedStress", () => {
  it("computes the Tresca combined stress for a solid shaft", () => {
    // Pure torsion (M = 0): sigma = 16*Ks*T / (pi*D^3).
    const result = resolveShaftCombinedStress({
      torqueNm: 100,
      bendingMomentNm: 0,
      torqueServiceFactor: 1,
      bendingServiceFactor: 1,
      diameterM: 0.02,
      boreDiameterM: 0,
    });
    const expected = (16 * 100) / (Math.PI * Math.pow(0.02, 3));
    expect(result.combinedStressPa).toBeCloseTo(expected, 3);
  });

  it("reduces to the pure-bending case when torque is 0", () => {
    // sigma = 16*Km*M / (pi*D^3), the same shape as pure torsion with M in
    // place of Ks*T -- a direct algebraic consequence of the sqrt(a^2+b^2)
    // form collapsing to |b| when a = 0.
    const result = resolveShaftCombinedStress({
      torqueNm: 0,
      bendingMomentNm: 200,
      torqueServiceFactor: 1,
      bendingServiceFactor: 1.5,
      diameterM: 0.02,
      boreDiameterM: 0,
    });
    const expected = (16 * 1.5 * 200) / (Math.PI * Math.pow(0.02, 3));
    expect(result.combinedStressPa).toBeCloseTo(expected, 3);
  });

  it("increases the reported stress for a hollow shaft of the same outer diameter", () => {
    const solid = resolveShaftCombinedStress({
      torqueNm: 100,
      bendingMomentNm: 50,
      torqueServiceFactor: 1,
      bendingServiceFactor: 1,
      diameterM: 0.02,
      boreDiameterM: 0,
    });
    const hollow = resolveShaftCombinedStress({
      torqueNm: 100,
      bendingMomentNm: 50,
      torqueServiceFactor: 1,
      bendingServiceFactor: 1,
      diameterM: 0.02,
      boreDiameterM: 0.01,
    });
    expect(hollow.combinedStressPa).toBeGreaterThan(solid.combinedStressPa);
  });

  it("rejects a bore diameter that is not less than the outer diameter", () => {
    expect(() =>
      resolveShaftCombinedStress({
        torqueNm: 100,
        bendingMomentNm: 50,
        torqueServiceFactor: 1,
        bendingServiceFactor: 1,
        diameterM: 0.02,
        boreDiameterM: 0.02,
      }),
    ).toThrow(ShaftKeyBoltInputError);
  });

  it("rejects a non-positive diameter or service factor", () => {
    expect(() =>
      resolveShaftCombinedStress({
        torqueNm: 100,
        bendingMomentNm: 50,
        torqueServiceFactor: 1,
        bendingServiceFactor: 1,
        diameterM: 0,
        boreDiameterM: 0,
      }),
    ).toThrow(ShaftKeyBoltInputError);
    expect(() =>
      resolveShaftCombinedStress({
        torqueNm: 100,
        bendingMomentNm: 50,
        torqueServiceFactor: 0,
        bendingServiceFactor: 1,
        diameterM: 0.02,
        boreDiameterM: 0,
      }),
    ).toThrow(ShaftKeyBoltInputError);
  });

  // Reference example: US Air Force Flight Dynamics Laboratory Stress
  // Analysis Manual (Oct. 1986), Chapter 10 -- 20 hp / 300 rpm pulley shaft
  // worked example, read directly 2026-08-31
  // (lib/standards/engineering-sources.ts,
  // "us.engineeringlibrary.afdl_stress_analysis_manual_shafts"). The
  // source's own printed inputs at the governing cross-section (pulley B):
  // T = 4200 lbf*in, M = 7685 lbf*in (combined bending moment), Ks = 1.0,
  // Km = 1.5 (gradually applied load), solid shaft, design allowable stress
  // 12,150 psi (yield/ultimate-derived, keyway-derated -- this module's own
  // simpler yield/safety-factor model does not reproduce that derivation
  // itself, a disclosed scope difference, see validation.ts), solved
  // diameter D = 1.726 in. This test reproduces the stress-formula half
  // only: at the source's own solved diameter, this module's own combined-
  // stress formula must recover the source's own 12,150 psi design stress.
  it("reproduces the AFDL 20 hp / 300 rpm pulley-shaft worked example", () => {
    const torqueNm = convert(4200, "lbf*in", "N*m");
    const bendingMomentNm = convert(7685, "lbf*in", "N*m");
    const diameterM = convert(1.726, "in", "m");
    const expectedStressPa = convert(12150, "psi", "Pa");

    const result = resolveShaftCombinedStress({
      torqueNm,
      bendingMomentNm,
      torqueServiceFactor: 1.0,
      bendingServiceFactor: 1.5,
      diameterM,
      boreDiameterM: 0,
    });

    expect(
      Math.abs(result.combinedStressPa - expectedStressPa) / expectedStressPa,
    ).toBeLessThan(0.002);
  });
});

describe("resolveShaftSafetyFactor", () => {
  it("computes fs = Sy / sigma_e", () => {
    expect(
      resolveShaftSafetyFactor({
        yieldStrengthPa: 400e6,
        combinedStressPa: 100e6,
      }).safetyFactor,
    ).toBeCloseTo(4, 9);
  });

  it("rejects a zero combined stress rather than reporting an infinite factor", () => {
    expect(() =>
      resolveShaftSafetyFactor({ yieldStrengthPa: 400e6, combinedStressPa: 0 }),
    ).toThrow(ShaftKeyBoltInputError);
  });
});

describe("key sub-check", () => {
  it("resolveKeyTangentialForce computes F = 2*T/d", () => {
    expect(
      resolveKeyTangentialForce({ torqueNm: 100, shaftDiameterM: 0.02 })
        .tangentialForceN,
    ).toBeCloseTo(10000, 6);
  });

  it("resolveKeyShearStress computes tau = F/(w*L)", () => {
    expect(
      resolveKeyShearStress({
        tangentialForceN: 1000,
        widthM: 0.006,
        lengthM: 0.02,
      }).shearStressPa,
    ).toBeCloseTo(1000 / (0.006 * 0.02), 3);
  });

  it("resolveKeyBearingStress computes sigma = F/((h/2)*L)", () => {
    expect(
      resolveKeyBearingStress({
        tangentialForceN: 1000,
        heightM: 0.006,
        lengthM: 0.02,
      }).bearingStressPa,
    ).toBeCloseTo(1000 / (0.003 * 0.02), 3);
  });

  it("resolveKeySafetyFactor computes fs = Sy / stress", () => {
    expect(
      resolveKeySafetyFactor({ yieldStrengthPa: 250e6, stressPa: 50e6 })
        .safetyFactor,
    ).toBeCloseTo(5, 9);
  });

  it("rejects non-positive inputs throughout", () => {
    expect(() =>
      resolveKeyTangentialForce({ torqueNm: 0, shaftDiameterM: 0.02 }),
    ).toThrow(ShaftKeyBoltInputError);
    expect(() =>
      resolveKeyShearStress({ tangentialForceN: 1000, widthM: 0, lengthM: 0.02 }),
    ).toThrow(ShaftKeyBoltInputError);
    expect(() =>
      resolveKeyBearingStress({
        tangentialForceN: 1000,
        heightM: 0.006,
        lengthM: 0,
      }),
    ).toThrow(ShaftKeyBoltInputError);
  });
});

describe("bolt sub-check", () => {
  it("resolveBoltPreload computes F = T/(K*d)", () => {
    expect(
      resolveBoltPreload({
        installationTorqueNm: 50,
        kFactor: 0.2,
        diameterM: 0.01,
      }).preloadN,
    ).toBeCloseTo(25000, 3);
  });

  // Reference figures: the ISO metric tensile stress-area formula and the
  // ASME B1.1 unified (US/UN) tensile stress-area formula both reproduce
  // their own well-published standard-table results (stage-1-spec.md
  // "Formulas" item 4; e.g. MechaniCalc's/Fastenal's own stress-area
  // tables) -- a property/sanity check against widely-cited figures, not a
  // single numbered worked example from one source.
  it("resolveBoltStressArea (metric) reproduces the published M10x1.5 stress area (58.0 mm^2)", () => {
    const result = resolveBoltStressArea({
      threadStandard: "metric",
      diameterM: 0.01,
      pitchM: 0.0015,
    });
    // Area has no registered unit-registry dimension (only length/pressure
    // do), so the expected figure is converted by hand: 58.0 mm^2 = 58.0e-6
    // m^2. 58.0 is itself a published figure rounded to 1 decimal place, so
    // a relative tolerance is the honest comparison, not an exact match.
    const expectedM2 = 58.0e-6;
    expect(Math.abs(result.stressAreaM2 - expectedM2) / expectedM2).toBeLessThan(
      0.001,
    );
  });

  it("resolveBoltStressArea (unified) reproduces the published 1/2-13 UNC stress area (0.1419 in^2)", () => {
    const diameterM = convert(0.5, "in", "m");
    const pitchM = convert(1 / 13, "in", "m");
    const result = resolveBoltStressArea({
      threadStandard: "unified",
      diameterM,
      pitchM,
    });
    const expectedM2 = 0.1419 * M_PER_IN_SQUARED;
    expect(Math.abs(result.stressAreaM2 - expectedM2) / expectedM2).toBeLessThan(
      0.002,
    );
  });

  it("resolveBoltTensileSafetyFactor defaults C to 1 when omitted", () => {
    const withoutC = resolveBoltTensileSafetyFactor({
      stressAreaM2: 58e-6,
      proofStrengthPa: 580e6,
      preloadN: 10000,
      externalTensileLoadN: 5000,
    });
    const withC1 = resolveBoltTensileSafetyFactor({
      stressAreaM2: 58e-6,
      proofStrengthPa: 580e6,
      preloadN: 10000,
      externalTensileLoadN: 5000,
      jointStiffnessRatio: 1,
    });
    expect(withoutC.tensileSafetyFactor).toBeCloseTo(
      withC1.tensileSafetyFactor,
      9,
    );
  });

  it("resolveBoltTensileSafetyFactor: a smaller C admits a larger safety factor", () => {
    const lowC = resolveBoltTensileSafetyFactor({
      stressAreaM2: 58e-6,
      proofStrengthPa: 580e6,
      preloadN: 10000,
      externalTensileLoadN: 5000,
      jointStiffnessRatio: 0.2,
    });
    const highC = resolveBoltTensileSafetyFactor({
      stressAreaM2: 58e-6,
      proofStrengthPa: 580e6,
      preloadN: 10000,
      externalTensileLoadN: 5000,
      jointStiffnessRatio: 0.8,
    });
    expect(lowC.tensileSafetyFactor).toBeGreaterThan(highC.tensileSafetyFactor);
  });

  it("resolveBoltSeparationSafetyFactor computes FoS = F_preload / (P_external*(1-C))", () => {
    const result = resolveBoltSeparationSafetyFactor({
      preloadN: 10000,
      externalTensileLoadN: 4000,
      jointStiffnessRatio: 0.2,
    });
    expect(result.separationSafetyFactor).toBeCloseTo(
      10000 / (4000 * 0.8),
      6,
    );
  });

  it("resolveBoltShearStress: single shear is twice double shear for the same load", () => {
    const single = resolveBoltShearStress({
      shearLoadN: 1000,
      diameterM: 0.01,
      shearPlaneCount: "single",
    });
    const double = resolveBoltShearStress({
      shearLoadN: 1000,
      diameterM: 0.01,
      shearPlaneCount: "double",
    });
    expect(single.shearStressPa).toBeCloseTo(2 * double.shearStressPa, 3);
  });

  it("resolveBoltBearingStress computes sigma = F/(d*t)", () => {
    expect(
      resolveBoltBearingStress({
        shearLoadN: 1000,
        diameterM: 0.01,
        thicknessM: 0.005,
      }).bearingStressPa,
    ).toBeCloseTo(1000 / (0.01 * 0.005), 3);
  });

  it("resolveBoltSafetyFactor computes fs = allowable / stress", () => {
    expect(
      resolveBoltSafetyFactor({ allowableStressPa: 200e6, stressPa: 50e6 })
        .safetyFactor,
    ).toBeCloseTo(4, 9);
  });

  it("rejects a thread pitch too coarse for the given diameter", () => {
    expect(() =>
      resolveBoltStressArea({
        threadStandard: "metric",
        diameterM: 0.003,
        pitchM: 0.01,
      }),
    ).toThrow(ShaftKeyBoltInputError);
  });
});

const M_PER_IN_SQUARED = 0.0254 * 0.0254;
