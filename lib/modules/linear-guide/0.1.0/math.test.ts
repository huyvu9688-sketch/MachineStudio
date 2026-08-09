import { describe, expect, it } from "vitest";
import {
  LinearGuideInputError,
  resolveBlockLoadsFromResultant,
  resolveEquivalentLoad,
  resolveHorizontalInertiaBlockLoads,
  resolveHorizontalUniformBlockLoads,
  resolveMeanLoad,
  resolveNominalLife,
  resolveServiceLifeHours,
  resolveStaticSafetyFactor,
  resolveVerticalInertiaBlockLoads,
  resolveVerticalUniformBlockLoads,
} from "./math";

// PMI's own full worked numerical example (Linear Guideway catalog, Chapter
// 9) is deliberately NOT reproduced here. It uses a bespoke two-mass,
// two-height geometry (model MSA35LA2SSFC + R2520-20/20 P II) with its own
// "No.1"-"No.4" carriage numbering, and this session could not confirm with
// confidence that its numbering/sign convention maps onto the generic
// Section 6 diagrams' P1-P4 convention these functions implement (see
// context/modules/linear-guide/stage-1-spec.md item 8). Reproducing it
// requires either re-reading both diagrams side by side to pin the mapping,
// or a superposition argument confirmed against the source — reserved for
// Stage 4, not guessed here. These tests instead verify internal
// consistency, the same treatment motion-profile's Stage 1 kernel received
// before a published example was found.

describe("resolveHorizontalUniformBlockLoads", () => {
  it("distributes force equally when the load is centered", () => {
    const result = resolveHorizontalUniformBlockLoads({
      forceN: 400,
      railSpacingM: 0.5,
      blockSpacingM: 0.3,
      loadOffsetRailM: 0,
      loadOffsetBlockM: 0,
    });
    expect(result.block1.radialN).toBeCloseTo(100, 9);
    expect(result.block2.radialN).toBeCloseTo(100, 9);
    expect(result.block3.radialN).toBeCloseTo(100, 9);
    expect(result.block4.radialN).toBeCloseTo(100, 9);
  });

  it("conserves total force across all four blocks regardless of offset", () => {
    const result = resolveHorizontalUniformBlockLoads({
      forceN: 1000,
      railSpacingM: 0.6,
      blockSpacingM: 0.4,
      loadOffsetRailM: 0.1,
      loadOffsetBlockM: 0.05,
    });
    const sum =
      result.block1.radialN +
      result.block2.radialN +
      result.block3.radialN +
      result.block4.radialN;
    expect(sum).toBeCloseTo(1000, 9);
  });

  it("produces no lateral component (this installation has none)", () => {
    const result = resolveHorizontalUniformBlockLoads({
      forceN: 500,
      railSpacingM: 0.5,
      blockSpacingM: 0.3,
      loadOffsetRailM: 0.05,
      loadOffsetBlockM: 0.02,
    });
    expect(result.block1.lateralN).toBe(0);
    expect(result.block4.lateralN).toBe(0);
  });

  it("matches the printed sign pattern: block1 and block4 rise together as loadOffsetRailM increases", () => {
    const base = resolveHorizontalUniformBlockLoads({
      forceN: 400,
      railSpacingM: 0.5,
      blockSpacingM: 0.3,
      loadOffsetRailM: 0,
      loadOffsetBlockM: 0,
    });
    const offset = resolveHorizontalUniformBlockLoads({
      forceN: 400,
      railSpacingM: 0.5,
      blockSpacingM: 0.3,
      loadOffsetRailM: 0.1,
      loadOffsetBlockM: 0,
    });
    expect(offset.block1.radialN).toBeGreaterThan(base.block1.radialN);
    expect(offset.block4.radialN).toBeGreaterThan(base.block4.radialN);
    expect(offset.block2.radialN).toBeLessThan(base.block2.radialN);
    expect(offset.block3.radialN).toBeLessThan(base.block3.radialN);
  });

  it("rejects non-positive rail or block spacing", () => {
    expect(() =>
      resolveHorizontalUniformBlockLoads({
        forceN: 400,
        railSpacingM: 0,
        blockSpacingM: 0.3,
        loadOffsetRailM: 0,
        loadOffsetBlockM: 0,
      }),
    ).toThrow(LinearGuideInputError);
    expect(() =>
      resolveHorizontalUniformBlockLoads({
        forceN: 400,
        railSpacingM: 0.5,
        blockSpacingM: -0.1,
        loadOffsetRailM: 0,
        loadOffsetBlockM: 0,
      }),
    ).toThrow(LinearGuideInputError);
  });
});

describe("resolveVerticalUniformBlockLoads", () => {
  it("distributes radial and lateral shares equally across all four blocks", () => {
    const result = resolveVerticalUniformBlockLoads({
      forceN: 300,
      railSpacingM: 0.5,
      loadOffsetRadialM: 0.2,
      loadOffsetLateralM: 0.1,
    });
    expect(result.block1).toEqual(result.block2);
    expect(result.block2).toEqual(result.block3);
    expect(result.block3).toEqual(result.block4);
    expect(result.block1.radialN).toBeCloseTo((300 * 0.2) / (2 * 0.5), 9);
    expect(result.block1.lateralN).toBeCloseTo((300 * 0.1) / (2 * 0.5), 9);
  });

  it("rejects a non-positive rail spacing", () => {
    expect(() =>
      resolveVerticalUniformBlockLoads({
        forceN: 300,
        railSpacingM: 0,
        loadOffsetRadialM: 0.2,
        loadOffsetLateralM: 0.1,
      }),
    ).toThrow(LinearGuideInputError);
  });
});

describe("resolveHorizontalInertiaBlockLoads", () => {
  const base = {
    massKg: 200,
    gravityMps2: 9.80665,
    accelerationMps2: 4,
    decelerationMps2: 2,
    railSpacingM: 0.5,
    loadOffsetRadialM: 0.3,
    loadOffsetLateralM: 0.1,
  } as const;

  it("gives every block an equal share in uniform motion", () => {
    const result = resolveHorizontalInertiaBlockLoads({
      ...base,
      phase: "uniform",
    });
    const expected = (base.massKg * base.gravityMps2) / 4;
    expect(result.block1.radialN).toBeCloseTo(expected, 9);
    expect(result.block2.radialN).toBeCloseTo(expected, 9);
    expect(result.block3.radialN).toBeCloseTo(expected, 9);
    expect(result.block4.radialN).toBeCloseTo(expected, 9);
    expect(result.block1.lateralN).toBe(0);
  });

  it("conserves total radial force across all four blocks in every phase", () => {
    for (const phase of ["acceleration", "deceleration", "uniform"] as const) {
      const result = resolveHorizontalInertiaBlockLoads({ ...base, phase });
      const sum =
        result.block1.radialN +
        result.block2.radialN +
        result.block3.radialN +
        result.block4.radialN;
      expect(sum).toBeCloseTo(base.massKg * base.gravityMps2, 6);
    }
  });

  it("uses the acceleration rate only during acceleration, not deceleration's rate", () => {
    const accel = resolveHorizontalInertiaBlockLoads({
      ...base,
      phase: "acceleration",
    });
    const decel = resolveHorizontalInertiaBlockLoads({
      ...base,
      phase: "deceleration",
    });
    // Different rates (4 vs 2 m/s^2) must produce different magnitudes of
    // differential loading -- this is exactly the a1/a3 distinction a first
    // draft of this kernel got wrong (see stage-1-spec.md "Evidence Gaps").
    const accelSpread = Math.abs(accel.block1.radialN - accel.block2.radialN);
    const decelSpread = Math.abs(decel.block1.radialN - decel.block2.radialN);
    expect(accelSpread).toBeGreaterThan(decelSpread);
  });

  it("applies an equal, non-differential lateral load across all four blocks", () => {
    const result = resolveHorizontalInertiaBlockLoads({
      ...base,
      phase: "acceleration",
    });
    expect(result.block1.lateralN).toBeCloseTo(result.block2.lateralN, 9);
    expect(result.block2.lateralN).toBeCloseTo(result.block3.lateralN, 9);
    expect(result.block3.lateralN).toBeCloseTo(result.block4.lateralN, 9);
    expect(result.block1.lateralN).not.toBe(0);
  });

  it("rejects a non-positive mass or gravity", () => {
    expect(() =>
      resolveHorizontalInertiaBlockLoads({
        ...base,
        massKg: 0,
        phase: "uniform",
      }),
    ).toThrow(LinearGuideInputError);
    expect(() =>
      resolveHorizontalInertiaBlockLoads({
        ...base,
        gravityMps2: -1,
        phase: "uniform",
      }),
    ).toThrow(LinearGuideInputError);
  });
});

describe("resolveVerticalInertiaBlockLoads", () => {
  const base = {
    massKg: 150,
    gravityMps2: 9.80665,
    accelerationMps2: 3,
    decelerationMps2: 3,
    railSpacingM: 0.5,
    loadOffsetRadialM: 0.2,
    loadOffsetLateralM: 0.1,
  } as const;

  it("orders phase magnitudes as acceleration > uniform > deceleration for equal rates", () => {
    const accel = resolveVerticalInertiaBlockLoads({
      ...base,
      phase: "acceleration",
    });
    const uniform = resolveVerticalInertiaBlockLoads({
      ...base,
      phase: "uniform",
    });
    const decel = resolveVerticalInertiaBlockLoads({
      ...base,
      phase: "deceleration",
    });
    expect(accel.block1.radialN).toBeGreaterThan(uniform.block1.radialN);
    expect(uniform.block1.radialN).toBeGreaterThan(decel.block1.radialN);
  });

  it("gives every block an identical radial and lateral share in every phase", () => {
    for (const phase of ["acceleration", "deceleration", "uniform"] as const) {
      const result = resolveVerticalInertiaBlockLoads({ ...base, phase });
      expect(result.block1).toEqual(result.block2);
      expect(result.block2).toEqual(result.block3);
      expect(result.block3).toEqual(result.block4);
    }
  });

  it("rejects a non-positive rail spacing", () => {
    expect(() =>
      resolveVerticalInertiaBlockLoads({
        ...base,
        railSpacingM: -0.1,
        phase: "uniform",
      }),
    ).toThrow(LinearGuideInputError);
  });
});

// These are the tests that make the "moment = force * offset substitution is
// exact" claim machine-checked rather than asserted in prose. See
// resolveBlockLoadsFromResultant's own doc comment and
// context/modules/linear-guide/stage-2-contract.md.
describe("resolveBlockLoadsFromResultant subsumes the offset-based forms", () => {
  it("reproduces resolveHorizontalUniformBlockLoads (B17) exactly", () => {
    const F = 1000;
    const l1 = 0.6;
    const l2 = 0.4;
    const l3 = 0.1;
    const l4 = 0.05;

    const offsetBased = resolveHorizontalUniformBlockLoads({
      forceN: F,
      railSpacingM: l1,
      blockSpacingM: l2,
      loadOffsetRailM: l3,
      loadOffsetBlockM: l4,
    });
    const momentBased = resolveBlockLoadsFromResultant({
      normalForceN: F,
      lateralForceN: 0,
      momentLateralNm: 0,
      // The whole point: the offsets enter only as F*offset, i.e. a moment.
      momentAcrossRailsNm: F * l3,
      momentAlongRailNm: F * l4,
      railSpacingM: l1,
      blockSpacingM: l2,
    });

    expect(momentBased).toEqual(offsetBased);
  });

  it("reproduces resolveHorizontalInertiaBlockLoads (B23) radial loads exactly", () => {
    const m = 200;
    const g = 9.80665;
    const a1 = 4;
    const l1 = 0.5;
    const l3 = 0.3;

    const offsetBased = resolveHorizontalInertiaBlockLoads({
      massKg: m,
      gravityMps2: g,
      accelerationMps2: a1,
      decelerationMps2: 2,
      phase: "acceleration",
      railSpacingM: l1,
      loadOffsetRadialM: l3,
      loadOffsetLateralM: 0,
    });
    // B23's own printed sign pattern lowers blocks 1 and 4 during
    // acceleration, the opposite of B17's, so the equivalent moment is
    // negative in this kernel's stated sign convention -- a sign choice,
    // not a discrepancy between the two sources.
    const momentBased = resolveBlockLoadsFromResultant({
      normalForceN: m * g,
      lateralForceN: 0,
      momentLateralNm: 0,
      momentAcrossRailsNm: -(m * a1 * l3),
      momentAlongRailNm: 0,
      railSpacingM: l1,
      blockSpacingM: 0.4,
    });

    expect(momentBased.block1.radialN).toBeCloseTo(
      offsetBased.block1.radialN,
      9,
    );
    expect(momentBased.block2.radialN).toBeCloseTo(
      offsetBased.block2.radialN,
      9,
    );
    expect(momentBased.block3.radialN).toBeCloseTo(
      offsetBased.block3.radialN,
      9,
    );
    expect(momentBased.block4.radialN).toBeCloseTo(
      offsetBased.block4.radialN,
      9,
    );
  });

  it("resolves a pure moment with zero force -- the case the offset form cannot express", () => {
    // offset = moment / force is undefined here; axis-load-cases' own
    // external_moment input can produce exactly this (a moment with no
    // accompanying resultant force).
    const result = resolveBlockLoadsFromResultant({
      normalForceN: 0,
      lateralForceN: 0,
      momentLateralNm: 0,
      momentAcrossRailsNm: 120,
      momentAlongRailNm: 0,
      railSpacingM: 0.5,
      blockSpacingM: 0.4,
    });
    expect(Number.isFinite(result.block1.radialN)).toBe(true);
    expect(result.block1.radialN).toBeCloseTo(120 / (2 * 0.5), 9);
    expect(result.block2.radialN).toBeCloseTo(-120 / (2 * 0.5), 9);
    // A pure moment produces no net force: the four blocks must cancel.
    const sum =
      result.block1.radialN +
      result.block2.radialN +
      result.block3.radialN +
      result.block4.radialN;
    expect(sum).toBeCloseTo(0, 9);
  });

  it("conserves the normal force across all four blocks", () => {
    const result = resolveBlockLoadsFromResultant({
      normalForceN: 800,
      lateralForceN: 0,
      momentLateralNm: 0,
      momentAcrossRailsNm: 60,
      momentAlongRailNm: 25,
      railSpacingM: 0.5,
      blockSpacingM: 0.4,
    });
    const sum =
      result.block1.radialN +
      result.block2.radialN +
      result.block3.radialN +
      result.block4.radialN;
    expect(sum).toBeCloseTo(800, 9);
  });

  it("rejects non-positive spacings", () => {
    expect(() =>
      resolveBlockLoadsFromResultant({
        normalForceN: 800,
        lateralForceN: 0,
        momentLateralNm: 0,
        momentAcrossRailsNm: 0,
        momentAlongRailNm: 0,
        railSpacingM: 0,
        blockSpacingM: 0.4,
      }),
    ).toThrow(LinearGuideInputError);
  });
});

describe("resolveEquivalentLoad", () => {
  it("sums the absolute radial and lateral magnitudes", () => {
    expect(resolveEquivalentLoad({ radialN: 100, lateralN: 30 })).toBe(130);
    expect(resolveEquivalentLoad({ radialN: -100, lateralN: -30 })).toBe(130);
  });
});

describe("resolveStaticSafetyFactor", () => {
  it("computes fs = C0 / P", () => {
    const result = resolveStaticSafetyFactor({
      staticLoadRatingN: 100_600,
      appliedLoadN: 8611.2,
    });
    expect(result.staticSafetyFactor).toBeCloseTo(11.68, 1);
  });

  it("decreases as applied load increases", () => {
    const lower = resolveStaticSafetyFactor({
      staticLoadRatingN: 50_000,
      appliedLoadN: 1000,
    });
    const higher = resolveStaticSafetyFactor({
      staticLoadRatingN: 50_000,
      appliedLoadN: 5000,
    });
    expect(higher.staticSafetyFactor).toBeLessThan(lower.staticSafetyFactor);
  });

  it("rejects non-positive inputs", () => {
    expect(() =>
      resolveStaticSafetyFactor({ staticLoadRatingN: 0, appliedLoadN: 100 }),
    ).toThrow(LinearGuideInputError);
    expect(() =>
      resolveStaticSafetyFactor({ staticLoadRatingN: 100, appliedLoadN: 0 }),
    ).toThrow(LinearGuideInputError);
  });
});

describe("resolveNominalLife", () => {
  it("increases with dynamic load rating and decreases with applied load", () => {
    const base = resolveNominalLife({
      dynamicLoadRatingN: 63_600,
      equivalentLoadN: 4077.2,
      rollingElementType: "ball",
      loadFactor: 1.5,
    });
    const higherRating = resolveNominalLife({
      dynamicLoadRatingN: 80_000,
      equivalentLoadN: 4077.2,
      rollingElementType: "ball",
      loadFactor: 1.5,
    });
    const higherLoad = resolveNominalLife({
      dynamicLoadRatingN: 63_600,
      equivalentLoadN: 8000,
      rollingElementType: "ball",
      loadFactor: 1.5,
    });
    expect(higherRating.lifeKm).toBeGreaterThan(base.lifeKm);
    expect(higherLoad.lifeKm).toBeLessThan(base.lifeKm);
  });

  it("defaults hardness and temperature factors to 1.0 when omitted", () => {
    const withDefaults = resolveNominalLife({
      dynamicLoadRatingN: 63_600,
      equivalentLoadN: 4077.2,
      rollingElementType: "ball",
      loadFactor: 1.5,
    });
    const withExplicitOnes = resolveNominalLife({
      dynamicLoadRatingN: 63_600,
      equivalentLoadN: 4077.2,
      rollingElementType: "ball",
      loadFactor: 1.5,
      hardnessFactor: 1,
      temperatureFactor: 1,
    });
    expect(withDefaults.lifeKm).toBeCloseTo(withExplicitOnes.lifeKm, 9);
  });

  it("rejects a roller rolling-element type (not implemented in this version)", () => {
    expect(() =>
      resolveNominalLife({
        dynamicLoadRatingN: 63_600,
        equivalentLoadN: 4077.2,
        // @ts-expect-error -- deliberately invalid for this version
        rollingElementType: "roller",
        loadFactor: 1.5,
      }),
    ).toThrow(LinearGuideInputError);
  });

  it("rejects non-positive inputs", () => {
    expect(() =>
      resolveNominalLife({
        dynamicLoadRatingN: 0,
        equivalentLoadN: 100,
        rollingElementType: "ball",
        loadFactor: 1.5,
      }),
    ).toThrow(LinearGuideInputError);
    expect(() =>
      resolveNominalLife({
        dynamicLoadRatingN: 63_600,
        equivalentLoadN: 100,
        rollingElementType: "ball",
        loadFactor: 0,
      }),
    ).toThrow(LinearGuideInputError);
  });
});

describe("resolveServiceLifeHours", () => {
  it("computes Lh = L*1000 / (2*ls*n1*60)", () => {
    const hours = resolveServiceLifeHours({
      lifeKm: 56231,
      strokeLengthM: 1.5,
      cyclesPerMinute: 20,
    });
    expect(hours).toBeCloseTo((56231 * 1000) / (2 * 1.5 * 20 * 60), 6);
  });

  it("rejects non-positive inputs", () => {
    expect(() =>
      resolveServiceLifeHours({
        lifeKm: 0,
        strokeLengthM: 1,
        cyclesPerMinute: 10,
      }),
    ).toThrow(LinearGuideInputError);
  });
});

describe("resolveMeanLoad", () => {
  it("reduces to the shared value when every phase has the same load", () => {
    const mean = resolveMeanLoad([
      { loadN: 500, runningDistance: 100 },
      { loadN: 500, runningDistance: 300 },
    ]);
    expect(mean).toBeCloseTo(500, 9);
  });

  it("weights toward the phase with the larger load", () => {
    const meanEqualDistance = resolveMeanLoad([
      { loadN: 100, runningDistance: 50 },
      { loadN: 900, runningDistance: 50 },
    ]);
    // A cubic mean of two equally-weighted values sits closer to the larger
    // one than a plain arithmetic mean would (500).
    expect(meanEqualDistance).toBeGreaterThan(500);
  });

  it("rejects an empty phase list", () => {
    expect(() => resolveMeanLoad([])).toThrow(LinearGuideInputError);
  });

  it("rejects a non-positive load or running distance", () => {
    expect(() => resolveMeanLoad([{ loadN: 0, runningDistance: 100 }])).toThrow(
      LinearGuideInputError,
    );
    expect(() => resolveMeanLoad([{ loadN: 100, runningDistance: 0 }])).toThrow(
      LinearGuideInputError,
    );
  });
});
