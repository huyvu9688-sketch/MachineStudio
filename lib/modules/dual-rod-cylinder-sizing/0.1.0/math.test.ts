import { describe, expect, it } from "vitest";
import {
  DualRodCylinderSizingInputError,
  resolveAllowableLoadMass,
  resolveCushionKineticEnergy,
  resolvePistonAreas,
  resolveRequiredForce,
  resolveTheoreticalForce,
  type LoadMassCurve,
} from "./math";

describe("resolveRequiredForce", () => {
  it("adds the gravity and friction terms on extend", () => {
    const g = 9.80665;
    const { forceN } = resolveRequiredForce({
      processForceN: 0,
      loadMassKg: 10,
      inclineAngleRad: Math.PI / 2,
      frictionCoefficient: 0,
      direction: "extend",
    });
    expect(forceN).toBeCloseTo(10 * g, 3);
  });

  it("subtracts the gravity term on retract, keeping friction added", () => {
    const g = 9.80665;
    const thetaRad = (80 * Math.PI) / 180;
    const { forceN } = resolveRequiredForce({
      processForceN: 0,
      loadMassKg: 10,
      inclineAngleRad: thetaRad,
      frictionCoefficient: 0.05,
      direction: "retract",
    });
    const expected =
      10 * g * 0.05 * Math.cos(thetaRad) - 10 * g * Math.sin(thetaRad);
    expect(forceN).toBeCloseTo(expected, 3);
    expect(forceN).toBeLessThan(0);
  });

  it("applies process force on extend only", () => {
    const extend = resolveRequiredForce({
      processForceN: 500,
      loadMassKg: 10,
      inclineAngleRad: 0,
      frictionCoefficient: 0,
      direction: "extend",
    });
    const retract = resolveRequiredForce({
      processForceN: 500,
      loadMassKg: 10,
      inclineAngleRad: 0,
      frictionCoefficient: 0,
      direction: "retract",
    });
    expect(extend.forceN).toBeCloseTo(500, 6);
    expect(retract.forceN).toBeCloseTo(0, 6);
  });

  it("rejects a non-positive load mass", () => {
    expect(() =>
      resolveRequiredForce({
        processForceN: 0,
        loadMassKg: 0,
        inclineAngleRad: 0,
        frictionCoefficient: 0,
        direction: "extend",
      }),
    ).toThrow(DualRodCylinderSizingInputError);
  });
});

describe("resolvePistonAreas", () => {
  it("computes A1 = 2*pi*D^2/4 and A2 = 2*pi*(D^2-d^2)/4 (dual-piston mechanism)", () => {
    const { extendAreaMm2, retractAreaMm2 } = resolvePistonAreas({
      boreDiameterMm: 20,
      rodDiameterMm: 10,
    });
    expect(extendAreaMm2).toBeCloseTo(2 * ((Math.PI * 20 ** 2) / 4), 6);
    expect(retractAreaMm2).toBeCloseTo(2 * ((Math.PI * (400 - 100)) / 4), 6);
  });

  it("rejects a rod diameter not less than the bore diameter", () => {
    expect(() =>
      resolvePistonAreas({ boreDiameterMm: 10, rodDiameterMm: 10 }),
    ).toThrow(DualRodCylinderSizingInputError);
  });

  /** Asserts `actual` is within `toleranceFraction` (relative) of `catalogValue` -- the printed catalog figure is itself rounded to 3 significant figures, so an exact-decimal-place comparison is the wrong tool here. */
  function expectWithinCatalogRounding(
    actual: number,
    catalogValue: number,
    toleranceFraction = 0.01,
  ): void {
    expect(Math.abs(actual - catalogValue) / catalogValue).toBeLessThan(toleranceFraction);
  }

  it("matches SMC's own published CXS2 Theoretical Output areas at bore 10 (rod 6mm) to within catalog rounding", () => {
    // reference/source-material/dual-rod-cylinder/CXS2.md: CXS2m10, rod 6mm,
    // OUT 157mm^2, IN 100mm^2 -- both exactly 2x the naive single-piston
    // pi*D^2/4 (78.54mm^2) / pi*(D^2-d^2)/4 (50.27mm^2) figures.
    const { extendAreaMm2, retractAreaMm2 } = resolvePistonAreas({
      boreDiameterMm: 10,
      rodDiameterMm: 6,
    });
    expectWithinCatalogRounding(extendAreaMm2, 157);
    expectWithinCatalogRounding(retractAreaMm2, 100);
  });

  it("matches SMC's own published CXS2 Theoretical Output areas at bore 32 (rod 16mm) to within catalog rounding", () => {
    // reference/source-material/dual-rod-cylinder/CXS2.md: CXS2m32, rod
    // 16mm, OUT 1608mm^2, IN 1206mm^2 -- both exactly 2x the naive
    // single-piston pi*D^2/4 (804.25mm^2) / pi*(D^2-d^2)/4 (603.19mm^2)
    // figures. A second, independent bore size confirming the same 2x
    // pattern already confirmed at bore 10 -- not a coincidence.
    const { extendAreaMm2, retractAreaMm2 } = resolvePistonAreas({
      boreDiameterMm: 32,
      rodDiameterMm: 16,
    });
    expectWithinCatalogRounding(extendAreaMm2, 1608);
    expectWithinCatalogRounding(retractAreaMm2, 1206);
  });
});

describe("resolveTheoreticalForce", () => {
  it("computes F = eta*A*P", () => {
    const { forceN } = resolveTheoreticalForce({
      areaMm2: 100,
      pressureMPa: 0.5,
      loadFactor: 0.7,
    });
    expect(forceN).toBeCloseTo(35, 6);
  });

  it("rejects a load factor outside [0, 1]", () => {
    expect(() =>
      resolveTheoreticalForce({ areaMm2: 100, pressureMPa: 0.5, loadFactor: 1.5 }),
    ).toThrow(DualRodCylinderSizingInputError);
  });
});

describe("resolveCushionKineticEnergy", () => {
  it("computes E = (m/2)*V^2", () => {
    const { kineticEnergyJ } = resolveCushionKineticEnergy({
      loadMassKg: 8,
      maxPistonSpeedMps: 0.5,
    });
    expect(kineticEnergyJ).toBeCloseTo(1, 6);
  });
});

describe("resolveAllowableLoadMass", () => {
  /** Vertical graph 5, bore 16, <=200 mm/s: plateau 5.0 kg @ L<=8, 0.43 kg @ L=100 (design doc table). */
  const verticalBore16: LoadMassCurve = {
    mountingOrientation: "vertical",
    strokeBandMaxMm: null,
    speedBandMaxMps: 0.2,
    boreDiameterMm: 16,
    bearingType: "slide",
    plateauEndOverhangMm: 8,
    plateauLoadMassKg: 5.0,
    edgeOverhangMm: 100,
    edgeLoadMassKg: 0.43,
  };
  /** Vertical graph 1, bore 6, <=200 mm/s: no flat plateau, sloped from L=5 (0.9 kg) to L=100 (0.04 kg). */
  const verticalBore6NoPlateau: LoadMassCurve = {
    mountingOrientation: "vertical",
    strokeBandMaxMm: null,
    speedBandMaxMps: 0.2,
    boreDiameterMm: 6,
    bearingType: "slide",
    plateauEndOverhangMm: 5,
    plateauLoadMassKg: 0.9,
    edgeOverhangMm: 100,
    edgeLoadMassKg: 0.04,
  };
  /** Horizontal graph 14 (<=10mm stroke, <=400mm/s), bore 16, CXS2M: plateau 1.5 kg @ L<=4, 0.04 kg @ L=100. */
  const horizontalBore16Stroke10: LoadMassCurve = {
    mountingOrientation: "horizontal",
    strokeBandMaxMm: 10,
    speedBandMaxMps: 0.4,
    boreDiameterMm: 16,
    bearingType: "slide",
    plateauEndOverhangMm: 4,
    plateauLoadMassKg: 1.5,
    edgeOverhangMm: 100,
    edgeLoadMassKg: 0.04,
  };
  /** Horizontal graph 16 (<=30mm stroke, <=400mm/s), bore 16, CXS2M: plateau 0.35 kg @ L<=8, 0.03 kg @ L=100. */
  const horizontalBore16Stroke30: LoadMassCurve = {
    mountingOrientation: "horizontal",
    strokeBandMaxMm: 30,
    speedBandMaxMps: 0.4,
    boreDiameterMm: 16,
    bearingType: "slide",
    plateauEndOverhangMm: 8,
    plateauLoadMassKg: 0.35,
    edgeOverhangMm: 100,
    edgeLoadMassKg: 0.03,
  };

  const curves = [
    verticalBore16,
    verticalBore6NoPlateau,
    horizontalBore16Stroke10,
    horizontalBore16Stroke30,
  ];

  it("returns the flat plateau value at or below the plateau threshold", () => {
    const result = resolveAllowableLoadMass({
      mountingOrientation: "vertical",
      boreDiameterMm: 16,
      bearingType: "slide",
      maxPistonSpeedMps: 0.15,
      requiredStrokeMm: 0,
      overhangLengthMm: 5,
      curves,
    });
    expect(result.inEnvelope).toBe(true);
    if (result.inEnvelope) expect(result.allowableLoadMassKg).toBeCloseTo(5.0, 6);
  });

  it("log-log interpolates strictly between the two anchor points", () => {
    const result = resolveAllowableLoadMass({
      mountingOrientation: "vertical",
      boreDiameterMm: 16,
      bearingType: "slide",
      maxPistonSpeedMps: 0.15,
      requiredStrokeMm: 0,
      overhangLengthMm: 50,
      curves,
    });
    expect(result.inEnvelope).toBe(true);
    if (result.inEnvelope) {
      const expected = Math.exp(
        Math.log(5.0) +
          ((Math.log(50) - Math.log(8)) / (Math.log(100) - Math.log(8))) *
            (Math.log(0.43) - Math.log(5.0)),
      );
      expect(result.allowableLoadMassKg).toBeCloseTo(expected, 6);
      expect(result.allowableLoadMassKg).toBeLessThan(5.0);
      expect(result.allowableLoadMassKg).toBeGreaterThan(0.43);
    }
  });

  it("at the geometric midpoint of the overhang range, returns the geometric mean of the two anchor load masses (a property unique to log-log interpolation, not linear)", () => {
    const geometricMidpointOverhangMm = Math.sqrt(8 * 100);
    const result = resolveAllowableLoadMass({
      mountingOrientation: "vertical",
      boreDiameterMm: 16,
      bearingType: "slide",
      maxPistonSpeedMps: 0.15,
      requiredStrokeMm: 0,
      overhangLengthMm: geometricMidpointOverhangMm,
      curves,
    });
    expect(result.inEnvelope).toBe(true);
    if (result.inEnvelope) {
      const expectedGeometricMean = Math.sqrt(5.0 * 0.43);
      expect(result.allowableLoadMassKg).toBeCloseTo(expectedGeometricMean, 6);
    }
  });

  it("matches the exact anchor point for a curve with no flat plateau", () => {
    const result = resolveAllowableLoadMass({
      mountingOrientation: "vertical",
      boreDiameterMm: 6,
      bearingType: "slide",
      maxPistonSpeedMps: 0.15,
      requiredStrokeMm: 0,
      overhangLengthMm: 5,
      curves,
    });
    expect(result.inEnvelope).toBe(true);
    if (result.inEnvelope) expect(result.allowableLoadMassKg).toBeCloseTo(0.9, 6);
  });

  it("reports out-of-envelope beyond the matched curve's own edge overhang", () => {
    const result = resolveAllowableLoadMass({
      mountingOrientation: "vertical",
      boreDiameterMm: 16,
      bearingType: "slide",
      maxPistonSpeedMps: 0.15,
      requiredStrokeMm: 0,
      overhangLengthMm: 150,
      curves,
    });
    expect(result.inEnvelope).toBe(false);
  });

  it("reports out-of-envelope when no seeded speed band covers the query", () => {
    const result = resolveAllowableLoadMass({
      mountingOrientation: "vertical",
      boreDiameterMm: 16,
      bearingType: "slide",
      maxPistonSpeedMps: 5,
      requiredStrokeMm: 0,
      overhangLengthMm: 10,
      curves,
    });
    expect(result.inEnvelope).toBe(false);
  });

  it("selects the narrowest covering stroke band for horizontal mounting", () => {
    const result = resolveAllowableLoadMass({
      mountingOrientation: "horizontal",
      boreDiameterMm: 16,
      bearingType: "slide",
      maxPistonSpeedMps: 0.3,
      requiredStrokeMm: 9,
      overhangLengthMm: 4,
      curves,
    });
    expect(result.inEnvelope).toBe(true);
    if (result.inEnvelope) {
      expect(result.matchedCurve.strokeBandMaxMm).toBe(10);
      expect(result.allowableLoadMassKg).toBeCloseTo(1.5, 6);
    }
  });

  it("selects the next wider stroke band when the narrower one does not cover the required stroke", () => {
    const result = resolveAllowableLoadMass({
      mountingOrientation: "horizontal",
      boreDiameterMm: 16,
      bearingType: "slide",
      maxPistonSpeedMps: 0.3,
      requiredStrokeMm: 25,
      overhangLengthMm: 8,
      curves,
    });
    expect(result.inEnvelope).toBe(true);
    if (result.inEnvelope) {
      expect(result.matchedCurve.strokeBandMaxMm).toBe(30);
      expect(result.allowableLoadMassKg).toBeCloseTo(0.35, 6);
    }
  });

  it("reports out-of-envelope when no seeded stroke band covers the required stroke", () => {
    const result = resolveAllowableLoadMass({
      mountingOrientation: "horizontal",
      boreDiameterMm: 16,
      bearingType: "slide",
      maxPistonSpeedMps: 0.3,
      requiredStrokeMm: 500,
      overhangLengthMm: 4,
      curves,
    });
    expect(result.inEnvelope).toBe(false);
  });

  it("rejects a negative overhang length", () => {
    expect(() =>
      resolveAllowableLoadMass({
        mountingOrientation: "vertical",
        boreDiameterMm: 16,
        bearingType: "slide",
        maxPistonSpeedMps: 0.15,
        requiredStrokeMm: 0,
        overhangLengthMm: -1,
        curves,
      }),
    ).toThrow(DualRodCylinderSizingInputError);
  });

  it("throws when the matched curve's own load-mass field is corrupt (zero or negative), rather than silently returning a wrong-but-plausible result", () => {
    const corruptCurve: LoadMassCurve = {
      mountingOrientation: "vertical",
      strokeBandMaxMm: null,
      speedBandMaxMps: 0.5,
      boreDiameterMm: 25,
      bearingType: "slide",
      plateauEndOverhangMm: 10,
      plateauLoadMassKg: 0,
      edgeOverhangMm: 100,
      edgeLoadMassKg: 1.0,
    };
    expect(() =>
      resolveAllowableLoadMass({
        mountingOrientation: "vertical",
        boreDiameterMm: 25,
        bearingType: "slide",
        maxPistonSpeedMps: 0.15,
        requiredStrokeMm: 0,
        overhangLengthMm: 5,
        curves: [corruptCurve],
      }),
    ).toThrow(DualRodCylinderSizingInputError);
  });
});
