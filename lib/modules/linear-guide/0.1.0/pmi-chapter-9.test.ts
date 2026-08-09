import { describe, expect, it } from "vitest";
import {
  CARRIAGE_MAP,
  PHASE_DISTANCES_M,
  PMI_EXAMPLE,
  blockFor,
  carriageLoad,
  resolveBlockMeanLoad,
  resolveBlockNominalLifeKm,
  resolveGoverningStaticSafetyFactor,
  resolvePhaseBlockLoads,
  resolvePhaseEquivalentLoads,
  type PmiPhase,
} from "./pmi-chapter-9";

// Stage 4 reference-example evidence: PMI Linear Guideway catalog, Chapter 9,
// printed pages B28-B33. Every expected number below is a figure PMI prints,
// transcribed from the source, not a value this kernel produced and then
// blessed.
//
// Tolerance is +/-0.1 N on loads, which is the precision PMI itself prints
// (one decimal place). Where PMI prints a whole number (-1577 N, 7212 N,
// 5367 N, 268 N) the same +/-0.1 N is applied against that figure.

type Carriage = keyof typeof CARRIAGE_MAP;

const CARRIAGES = ["no1", "no2", "no3", "no4"] as const;

/** PMI's printed radial loads, section 9.1.1 - 9.1.5, by carriage. */
const PRINTED_RADIAL: Record<PmiPhase, Record<Carriage, number>> = {
  uniform: { no1: 2562.4, no2: 3987.2, no3: 3072.6, no4: 1647.8 },
  accelLeft: { no1: -1577, no2: 8126.6, no3: 7212, no4: -2491.6 },
  decelLeft: { no1: 3942.2, no2: 2607.4, no3: 1692.8, no4: 3027.6 },
  accelRight: { no1: 6701.8, no2: -152.2, no3: -1066.8, no4: 5787.2 },
  decelRight: { no1: 1182.6, no2: 5367, no3: 4452.4, no4: 268 },
};

/**
 * PMI's printed lateral loads, same sections. Signs are PMI's own — with one
 * documented exception.
 *
 * **Section 9.1.3 contradicts itself, and this reproduction follows its
 * formulas rather than its numbers.** For deceleration to the left PMI prints
 * `Pt3la3 = -m1*a3*l4/(2*l1)` alongside the value `161.5 N`, and
 * `Pt4la3 = +m1*a3*l4/(2*l1)` alongside `-161.5 N`: in both cases the stated
 * formula and the stated value carry opposite signs. The other three phases
 * (9.1.2, 9.1.4, 9.1.5) each have formula and value in agreement, and their
 * sign patterns group carriages `{No.1, No.4}` against `{No.2, No.3}` in every
 * phase, flipping wholesale between accelerating and decelerating. Reading
 * 9.1.3 by its formulas fits that pattern exactly; reading it by its printed
 * values would make it the only phase whose lateral reactions regroup, which
 * no rigid-body arrangement can do.
 *
 * Nothing downstream in PMI's own example depends on it: equivalent load takes
 * `|PT|`, every magnitude here is 161.5 N, and so sections 9.2 through 9.5 come
 * out the same either way. That is presumably why the slip survived printing —
 * and it is why this file can follow the formulas without diverging from any
 * of PMI's own results.
 */
const PRINTED_LATERAL: Record<PmiPhase, Record<Carriage, number>> = {
  uniform: { no1: 0, no2: 0, no3: 0, no4: 0 },
  accelLeft: { no1: -484.6, no2: 484.6, no3: 484.6, no4: -484.6 },
  // Per 9.1.3's formulas; its printed values transpose No.3 and No.4.
  decelLeft: { no1: 161.5, no2: -161.5, no3: -161.5, no4: 161.5 },
  accelRight: { no1: 484.6, no2: -484.6, no3: -484.6, no4: 484.6 },
  decelRight: { no1: -161.5, no2: 161.5, no3: 161.5, no4: -161.5 },
};

/** What section 9.1.3 prints as values, kept so the discrepancy is testable. */
const PRINTED_DECEL_LEFT_LATERAL_AS_VALUES: Record<Carriage, number> = {
  no1: 161.5,
  no2: -161.5,
  no3: 161.5,
  no4: -161.5,
};

/** PMI's printed equivalent loads, section 9.2. */
const PRINTED_EQUIVALENT: Record<PmiPhase, Record<Carriage, number>> = {
  uniform: { no1: 2562.4, no2: 3987.2, no3: 3072.6, no4: 1647.8 },
  accelLeft: { no1: 2061.6, no2: 8611.2, no3: 7696.6, no4: 2976.2 },
  decelLeft: { no1: 4103.7, no2: 2768.9, no3: 1854.3, no4: 3189.1 },
  accelRight: { no1: 7186.4, no2: 636.8, no3: 1551.4, no4: 6271.8 },
  decelRight: { no1: 1344.1, no2: 5528.5, no3: 4613.9, no4: 429.5 },
};

/** PMI's printed mean loads and nominal lives, sections 9.4 and 9.5. */
const PRINTED_MEAN_LOAD: Record<Carriage, number> = {
  no1: 2700.7,
  no2: 4077.2,
  no3: 3187.7,
  no4: 1872.6,
};
const PRINTED_LIFE_KM: Record<Carriage, number> = {
  no1: 193_500,
  no2: 56_231,
  no3: 117_700,
  no4: 580_400,
};

/**
 * PMI prints its load figures to one decimal place, and its intermediate
 * roundings accumulate, so agreement is asserted as an absolute +/-0.1 N band
 * against the printed figure rather than with toBeCloseTo's power-of-ten
 * steps (which would demand better than +/-0.05 N -- tighter than the source
 * itself resolves).
 */
function expectWithinPrintedPrecision(actual: number, printed: number): void {
  expect(
    Math.abs(actual - printed),
    `expected ${actual} within 0.1 N of PMI's printed ${printed}`,
  ).toBeLessThanOrEqual(0.1);
}

const PHASES: readonly PmiPhase[] = [
  "uniform",
  "accelLeft",
  "decelLeft",
  "accelRight",
  "decelRight",
];

describe("PMI Chapter 9: per-carriage working load (sections 9.1.1-9.1.5)", () => {
  for (const phase of PHASES) {
    for (const carriage of CARRIAGES) {
      it(`reproduces the ${phase} radial load on carriage ${carriage.toUpperCase()}`, () => {
        expectWithinPrintedPrecision(
          carriageLoad(carriage, phase).radialN,
          PRINTED_RADIAL[phase][carriage],
        );
      });
    }
  }

  for (const phase of PHASES) {
    for (const carriage of CARRIAGES) {
      it(`reproduces the ${phase} lateral load on carriage ${carriage.toUpperCase()}, sign included`, () => {
        expectWithinPrintedPrecision(
          carriageLoad(carriage, phase).lateralN,
          PRINTED_LATERAL[phase][carriage],
        );
      });
    }
  }

  it("differs from section 9.1.3's printed values on exactly two carriages, and only in sign", () => {
    // Pins the one place this reproduction departs from a printed number, so
    // the departure is a tested, bounded claim rather than a footnote. See
    // PRINTED_LATERAL's own comment for why the formulas win.
    const loads = resolvePhaseBlockLoads("decelLeft");
    const disagreeing = CARRIAGES.filter(
      (carriage) =>
        Math.abs(
          loads[blockFor(carriage)].lateralN -
            PRINTED_DECEL_LEFT_LATERAL_AS_VALUES[carriage],
        ) > 0.1,
    );
    expect(disagreeing).toEqual(["no3", "no4"]);
    // Same magnitude, opposite sign -- not a different number.
    for (const carriage of disagreeing) {
      expect(Math.abs(loads[blockFor(carriage)].lateralN)).toBeCloseTo(
        Math.abs(PRINTED_DECEL_LEFT_LATERAL_AS_VALUES[carriage]),
        1,
      );
    }
  });

  it("agrees with every printed equivalent load despite that sign disagreement", () => {
    // The reason the departure above is safe: equivalent load takes |PT|, so
    // PMI's section 9.2.3 figures come out identical either way. Asserted
    // here explicitly rather than left as an argument in a comment.
    const equivalents = resolvePhaseEquivalentLoads("decelLeft");
    for (const carriage of CARRIAGES) {
      expectWithinPrintedPrecision(
        equivalents[blockFor(carriage)],
        PRINTED_EQUIVALENT.decelLeft[carriage],
      );
    }
  });

  it("distributes the lateral load as a zero-sum equilibrium, as PMI's own numbers do", () => {
    // The finding that corrected this kernel. PMI's general diagrams (B19,
    // B23, B24) print one unsigned lateral magnitude for all four blocks,
    // which the kernel originally reproduced literally. Chapter 9 prints the
    // same magnitude with alternating signs that cancel -- an equilibrium
    // distribution. Four equal, same-signed lateral forces could not balance a
    // yawing moment, so Chapter 9 is the reading that holds up.
    for (const phase of PHASES) {
      const loads = resolvePhaseBlockLoads(phase);
      const sum =
        loads.block1.lateralN +
        loads.block2.lateralN +
        loads.block3.lateralN +
        loads.block4.lateralN;
      expect(sum, `phase ${phase}`).toBeCloseTo(0, 9);
    }
  });

  it("conserves the total weight across the four blocks in every phase", () => {
    const weight = (PMI_EXAMPLE.m1 + PMI_EXAMPLE.m2) * PMI_EXAMPLE.gravityMps2;
    for (const phase of PHASES) {
      const loads = resolvePhaseBlockLoads(phase);
      const sum =
        loads.block1.radialN +
        loads.block2.radialN +
        loads.block3.radialN +
        loads.block4.radialN;
      expect(sum, `phase ${phase}`).toBeCloseTo(weight, 6);
    }
  });
});

describe("PMI Chapter 9: the carriage-numbering map", () => {
  it("assigns each PMI carriage to a distinct kernel block", () => {
    // Stage 1 could not pin this and reserved it for Stage 4. It is derived
    // from the printed sign patterns rather than the illustration: this kernel
    // puts blocks 1 and 4 at the +l3 end and blocks 3 and 4 on the +l4 rail,
    // while PMI's 9.1.1 gives No.2/No.3 the +l3 sign and No.1/No.2 the +l4
    // sign. Only one assignment satisfies both groupings -- and the twenty
    // load assertions above would fail under any other.
    expect(new Set(Object.values(CARRIAGE_MAP)).size).toBe(4);
    expect(CARRIAGE_MAP).toEqual({
      no1: "block3",
      no2: "block4",
      no3: "block1",
      no4: "block2",
    });
  });
});

describe("PMI Chapter 9: equivalent load (section 9.2)", () => {
  for (const phase of PHASES) {
    for (const carriage of CARRIAGES) {
      it(`reproduces the ${phase} equivalent load on carriage ${carriage.toUpperCase()}`, () => {
        expectWithinPrintedPrecision(
          resolvePhaseEquivalentLoads(phase)[blockFor(carriage)],
          PRINTED_EQUIVALENT[phase][carriage],
        );
      });
    }
  }
});

describe("PMI Chapter 9: static safety factor (section 9.3)", () => {
  it("reproduces fs = 11.7, governed by carriage No.2 accelerating to the left", () => {
    const result = resolveGoverningStaticSafetyFactor();
    expect(result.governingBlock).toBe(blockFor("no2"));
    expect(result.governingPhase).toBe("accelLeft");
    expectWithinPrintedPrecision(result.governingLoadN, 8611.2);
    // PMI prints 11.7; the underlying quotient is 11.68.
    expect(result.staticSafetyFactor).toBeCloseTo(11.7, 1);
  });
});

describe("PMI Chapter 9: mean load and nominal life (sections 9.4-9.5)", () => {
  it("weights the phases by distance travelled, summing to the stroke", () => {
    const perStroke =
      PHASE_DISTANCES_M.accel +
      PHASE_DISTANCES_M.uniform +
      PHASE_DISTANCES_M.decel;
    expect(perStroke).toBeCloseTo(PMI_EXAMPLE.strokeM, 9);
  });

  for (const carriage of CARRIAGES) {
    it(`reproduces the mean load on carriage ${carriage.toUpperCase()}`, () => {
      expectWithinPrintedPrecision(
        resolveBlockMeanLoad(blockFor(carriage)),
        PRINTED_MEAN_LOAD[carriage],
      );
    });
  }

  for (const carriage of CARRIAGES) {
    it(`reproduces the nominal life of carriage ${carriage.toUpperCase()}`, () => {
      // PMI prints these to 3-4 significant figures (193500, 56231, 117700,
      // 580400 km), so they are compared as a relative tolerance rather than
      // an absolute one.
      const actual = resolveBlockNominalLifeKm(blockFor(carriage));
      const printed = PRINTED_LIFE_KM[carriage];
      expect(Math.abs(actual - printed) / printed).toBeLessThan(0.001);
    });
  }

  it("identifies carriage No.2 as the shortest-lived, PMI's own conclusion", () => {
    // "the 56231 km running distance as service life of carriage No.2 is
    // obtained" -- PMI, section 9.5.
    const lives = CARRIAGES.map((carriage) => ({
      carriage,
      km: resolveBlockNominalLifeKm(blockFor(carriage)),
    }));
    const shortest = lives.reduce((a, b) => (a.km <= b.km ? a : b));
    expect(shortest.carriage).toBe("no2");
    expect(shortest.km).toBeCloseTo(56_231, -1);
  });
});

describe("PMI Chapter 9: the gravity constant the source uses", () => {
  it("needs g = 9.8, not standard gravity, to reproduce the printed figures", () => {
    // Recorded because it is a real deviation from this project's own
    // motion.axis.gravity default (9.80665) and explains any residual
    // disagreement if these figures are ever re-derived through the full
    // axis-load-cases path.
    expect(PMI_EXAMPLE.gravityMps2).toBe(9.8);
    const withStandardGravity =
      ((PMI_EXAMPLE.m1 + PMI_EXAMPLE.m2) * 9.80665) / 4;
    const withPmiGravity =
      ((PMI_EXAMPLE.m1 + PMI_EXAMPLE.m2) * PMI_EXAMPLE.gravityMps2) / 4;
    // ~1.9 N apart on the base share alone -- larger than the +/-0.1 N the
    // assertions above hold to, so this is not a free choice.
    expect(Math.abs(withStandardGravity - withPmiGravity)).toBeGreaterThan(1);
  });
});
