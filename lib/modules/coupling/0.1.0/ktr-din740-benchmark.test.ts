// Independent-benchmark tests (roadmap Module Definition of Done item 9;
// context/ai-workflow-rules.md Stage 4) for ./ktr-din740-benchmark.ts. Two
// kinds of check:
//  1. Reproduces KTR's own published worked example (catalog printed page
//     13, "Coupling Selection According to DIN 740 Part II") within a
//     documented tolerance that accounts for the source's own single-decimal
//     rounding of M_A (0.7, printed) against the exact 0.698... this file's
//     own resolveKtrInertiaCoefficients computes from the given inertias.
//  2. Compares this module's own simplified shock check
//     (resolveScaledRequiredTorque/resolveTorqueSafetyFactor) against KTR's
//     own detailed method for the same scenario — the "numerical comparison
//     ... which neither source's own worked examples exercise" validation.ts
//     previously flagged as the missing piece. Three coupling.service_factor
//     choices are compared: the fully composed factor (M_A*S_A*S_Z*S_t, which
//     reproduces KTR's own figure exactly, up to floating-point rounding),
//     the catalog shock factor alone (S_A, which understates KTR's own
//     requirement by about 1.2% for this scenario), and the shock/starting/
//     temperature factors without the mass-distribution correction
//     (S_A*S_Z*S_t, which overstates KTR's own requirement by about 43% and
//     would reject a coupling KTR's own detailed method accepts).

import { describe, expect, it } from "vitest";
import { resolveScaledRequiredTorque } from "./math";
import {
  compareModuleShockCheckToKtrDin740,
  KTR_DIN740_PART2_EXAMPLE,
  KtrDin740BenchmarkInputError,
  ktrDin740ExampleCoupledInertiasKgm2,
  ktrDin740ExampleDrivingSideInertiaCoefficient,
  ktrDin740ExampleDrivingTorqueNm,
  ktrDin740ExampleEquivalentServiceFactor,
  ktrDin740ExamplePeakTorqueDrivingSideNm,
  ktrDin740ExampleRequiredMaxTorqueNm,
  ktrDin740ExampleRequiredRatedTorqueNm,
  ktrDin740ExampleShockTorqueNm,
  resolveKtrDrivingSideShockTorque,
  resolveKtrInertiaCoefficients,
  resolveKtrMaxTorqueRequirement,
  resolveKtrRatedTorqueRequirement,
} from "./ktr-din740-benchmark";

describe("resolveKtrInertiaCoefficients", () => {
  it("splits inertia coefficients so they sum to 1", () => {
    const { drivingSideCoefficient, loadSideCoefficient } =
      resolveKtrInertiaCoefficients({
        drivingSideInertiaKgm2: 2.9673,
        loadSideInertiaKgm2: 6.8673,
      });
    expect(drivingSideCoefficient + loadSideCoefficient).toBeCloseTo(1, 12);
  });

  it("rejects non-positive inertia", () => {
    expect(() =>
      resolveKtrInertiaCoefficients({
        drivingSideInertiaKgm2: 0,
        loadSideInertiaKgm2: 5,
      }),
    ).toThrow(KtrDin740BenchmarkInputError);
  });
});

describe("resolveKtrDrivingSideShockTorque", () => {
  it("computes T_S = T_AS * M_A * S_A", () => {
    expect(
      resolveKtrDrivingSideShockTorque({
        peakTorqueDrivingSideNm: 2000,
        drivingSideInertiaCoefficient: 0.5,
        shockFactorDrivingSide: 2,
      }).shockTorqueNm,
    ).toBeCloseTo(2000 * 0.5 * 2, 9);
  });
});

describe("resolveKtrMaxTorqueRequirement", () => {
  it("adds the rated-torque overlap term when T_N > 0", () => {
    const withOverlap = resolveKtrMaxTorqueRequirement({
      shockTorqueNm: 1000,
      startingFactor: 1.1,
      temperatureFactor: 1.2,
      ratedTorqueOverlapNm: 500,
    }).requiredMaxTorqueNm;
    const withoutOverlap = resolveKtrMaxTorqueRequirement({
      shockTorqueNm: 1000,
      startingFactor: 1.1,
      temperatureFactor: 1.2,
      ratedTorqueOverlapNm: 0,
    }).requiredMaxTorqueNm;

    expect(withOverlap - withoutOverlap).toBeCloseTo(500 * 1.2, 9);
  });

  it("rejects a negative rated-torque overlap", () => {
    expect(() =>
      resolveKtrMaxTorqueRequirement({
        shockTorqueNm: 1000,
        startingFactor: 1.1,
        temperatureFactor: 1.2,
        ratedTorqueOverlapNm: -1,
      }),
    ).toThrow(KtrDin740BenchmarkInputError);
  });
});

describe("resolveKtrRatedTorqueRequirement", () => {
  it("computes T_KN = T_N * S_t", () => {
    expect(
      resolveKtrRatedTorqueRequirement({
        ratedTorqueNm: 930,
        temperatureFactor: 1.45,
      }).requiredRatedTorqueNm,
    ).toBeCloseTo(1348.5, 9);
  });
});

describe("KTR DIN 740 Part II worked example (catalog printed page 13)", () => {
  it("reproduces T_AN = 1029 Nm", () => {
    // KTR's own printed figure rounds 9550*160/1485 = 1028.88... to 1029.
    expect(ktrDin740ExampleDrivingTorqueNm()).toBeCloseTo(1028.88, 1);
    expect(
      Math.abs(ktrDin740ExampleDrivingTorqueNm() - 1029) / 1029,
    ).toBeLessThan(0.001);
  });

  it("reproduces T_AS = 2058 Nm", () => {
    expect(
      Math.abs(ktrDin740ExamplePeakTorqueDrivingSideNm() - 2058) / 2058,
    ).toBeLessThan(0.001);
  });

  it("reproduces T_KN required = 1348.5 Nm, cleared by the catalog T_KN = 2400 Nm", () => {
    expect(ktrDin740ExampleRequiredRatedTorqueNm()).toBeCloseTo(1348.5, 6);
    expect(KTR_DIN740_PART2_EXAMPLE.coupling.ratedTorqueNm).toBeGreaterThan(
      ktrDin740ExampleRequiredRatedTorqueNm(),
    );
  });

  it("reproduces J_A = 2.9673 kg*m^2 and J_L = 6.8673 kg*m^2", () => {
    const { drivingSideInertiaKgm2, loadSideInertiaKgm2 } =
      ktrDin740ExampleCoupledInertiasKgm2();
    expect(drivingSideInertiaKgm2).toBeCloseTo(2.9673, 9);
    expect(loadSideInertiaKgm2).toBeCloseTo(6.8673, 9);
  });

  it("reproduces M_A within the source's own single-decimal rounding to 0.7", () => {
    const exact = ktrDin740ExampleDrivingSideInertiaCoefficient();
    expect(exact).toBeCloseTo(0.6983, 4);
    expect(Math.abs(exact - 0.7)).toBeLessThan(0.005);
  });

  it("reproduces T_S = 2593.1 Nm within the compounded rounding of M_A and T_AN", () => {
    // Using the exact M_A/T_AN this file computes, not the source's own
    // single-decimal-rounded intermediates, so the tolerance is wider than
    // 0.1% -- documented as the compounded effect of the source's own
    // rounding, not a defect in either computation.
    expect(
      Math.abs(ktrDin740ExampleShockTorqueNm() - 2593.1) / 2593.1,
    ).toBeLessThan(0.003);
  });

  it("reproduces T_Kmax required = 3760 Nm, cleared by the catalog T_Kmax = 4800 Nm", () => {
    const requiredMaxTorqueNm = ktrDin740ExampleRequiredMaxTorqueNm();
    expect(Math.abs(requiredMaxTorqueNm - 3760) / 3760).toBeLessThan(0.003);
    expect(KTR_DIN740_PART2_EXAMPLE.coupling.maxTorqueNm).toBeGreaterThan(
      requiredMaxTorqueNm,
    );
  });
});

describe("comparison to this module's own simplified shock check", () => {
  it("reproduces KTR's own required torque exactly when serviceFactor is the fully composed factor (M_A*S_A*S_Z*S_t)", () => {
    const equivalentServiceFactor = ktrDin740ExampleEquivalentServiceFactor();
    const comparison = compareModuleShockCheckToKtrDin740(
      equivalentServiceFactor,
    );

    // Algebraic identity: T_AS*(M_A*S_A*S_Z*S_t) === (T_AS*M_A*S_A)*S_Z*S_t.
    expect(comparison.relativeDeviation).toBeCloseTo(0, 9);
    expect(comparison.moduleSafetyFactor).toBeCloseTo(
      comparison.ktrSafetyFactor,
      9,
    );
  });

  it("understates KTR's own requirement by about 1.2% when serviceFactor is the catalog shock factor alone (S_A)", () => {
    const { factors } = KTR_DIN740_PART2_EXAMPLE;
    const comparison = compareModuleShockCheckToKtrDin740(
      factors.shockFactorDrivingSide,
    );

    expect(comparison.relativeDeviation).toBeLessThan(0);
    expect(comparison.relativeDeviation).toBeGreaterThan(-0.02);
    // The module reports a slightly larger (more optimistic) safety margin
    // than KTR's own detailed method for this scenario -- a real, if modest,
    // non-conservative gap, not a rounding artifact.
    expect(comparison.moduleSafetyFactor).toBeGreaterThan(
      comparison.ktrSafetyFactor,
    );
  });

  it("overstates KTR's own requirement by about 43% and produces a false fail when M_A is omitted (S_A*S_Z*S_t)", () => {
    const { factors } = KTR_DIN740_PART2_EXAMPLE;
    const naiveFactor =
      factors.shockFactorDrivingSide *
      factors.startingFactor *
      factors.temperatureFactor;
    const comparison = compareModuleShockCheckToKtrDin740(naiveFactor);

    expect(comparison.relativeDeviation).toBeGreaterThan(0.4);
    expect(comparison.relativeDeviation).toBeLessThan(0.45);
    // KTR's own detailed method passes this coupling (fs > 1); the module's
    // check with this factor choice would incorrectly fail it.
    expect(comparison.ktrSafetyFactor).toBeGreaterThan(1);
    expect(comparison.moduleSafetyFactor).toBeLessThan(1);
  });

  it("matches resolveScaledRequiredTorque directly for the equivalent-service-factor case", () => {
    const equivalentServiceFactor = ktrDin740ExampleEquivalentServiceFactor();
    const { scaledRequiredTorqueNm } = resolveScaledRequiredTorque({
      requiredTorqueNm: ktrDin740ExamplePeakTorqueDrivingSideNm(),
      serviceFactor: equivalentServiceFactor,
    });

    expect(scaledRequiredTorqueNm).toBeCloseTo(
      ktrDin740ExampleRequiredMaxTorqueNm(),
      6,
    );
  });
});
