// Independent-benchmark tests (roadmap Module Definition of Done item 9;
// context/ai-workflow-rules.md Stage 4) for ./iko-benchmark.ts. Two kinds of
// check:
//  1. Reproduces IKO's own published worked "Example 1" (catalog printed
//     pages 15-16) within its stated catalog-rounding tolerance.
//  2. Cross-checks against ./math.ts's resolveEquivalentLoad (PMI's own
//     `PE = |PR| + |PT|` form) for the same four slide units — answering
//     context/modules/linear-guide/stage-1-spec.md item 7's open question
//     ("whether IKO's more elaborate formula would give a materially
//     different answer than PMI's simpler one for the same four-block
//     scenario") algebraically, not just empirically: for this series
//     bucket (kr = ka = 1), IKO's `P = X*Frw + Y*Faw` reduces exactly to
//     `PMI_PE - 0.4*min(|Fr|, |Fa|)`, so IKO's figure is always the lower
//     of the two, strictly lower whenever both load components are
//     nonzero — a real, bounded methodology disagreement, the same
//     "bounded ratio, not floating-point agreement" treatment
//     lib/modules/ball-screw/0.1.0/thk-benchmark.test.ts gives its own
//     cross-source comparison.

import { describe, expect, it } from "vitest";
import { resolveEquivalentLoad } from "./math";
import {
  IKO_EXAMPLE_1,
  IkoBenchmarkInputError,
  ikoExample1DynamicEquivalentLoad,
  ikoExample1GoverningDynamicLoad,
  ikoExample1GoverningStaticLoad,
  ikoExample1LifeHours,
  ikoExample1LifeKm,
  ikoExample1StaticEquivalentLoad,
  ikoExample1StaticSafetyFactor,
  ME_15_30_FACTORS,
  resolveIkoDynamicEquivalentLoad,
  resolveIkoStaticEquivalentLoad,
  type IkoExample1Unit,
} from "./iko-benchmark";

const UNITS: readonly IkoExample1Unit[] = ["unit1", "unit2", "unit3", "unit4"];

describe("resolveIkoDynamicEquivalentLoad", () => {
  it("picks X=1, Y=0.6 when the radial conversion load dominates", () => {
    // Table 4: |Frw| >= |Faw| -> X=1, Y=0.6.
    expect(
      resolveIkoDynamicEquivalentLoad({
        radialLoadN: 1000,
        lateralLoadN: 400,
        kr: 1,
        ka: 1,
      }),
    ).toBeCloseTo(1000 + 0.6 * 400, 9);
  });

  it("picks X=0.6, Y=1 when the lateral conversion load dominates", () => {
    expect(
      resolveIkoDynamicEquivalentLoad({
        radialLoadN: 400,
        lateralLoadN: 1000,
        kr: 1,
        ka: 1,
      }),
    ).toBeCloseTo(0.6 * 400 + 1000, 9);
  });

  it("applies kr/ka before comparing which load dominates", () => {
    // Equal raw loads, but ka=2 makes the lateral conversion load dominate.
    const result = resolveIkoDynamicEquivalentLoad({
      radialLoadN: 500,
      lateralLoadN: 500,
      kr: 1,
      ka: 2,
    });
    expect(result).toBeCloseTo(0.6 * 500 + 1 * 1000, 9);
  });

  it("rejects non-finite input", () => {
    expect(() =>
      resolveIkoDynamicEquivalentLoad({
        radialLoadN: Number.NaN,
        lateralLoadN: 0,
        kr: 1,
        ka: 1,
      }),
    ).toThrow(IkoBenchmarkInputError);
  });
});

describe("resolveIkoStaticEquivalentLoad", () => {
  it("sums the converted radial and lateral loads with no dominance weighting", () => {
    expect(
      resolveIkoStaticEquivalentLoad({
        radialLoadN: 1000,
        lateralLoadN: 400,
        kOr: 1,
        kOa: 1.19,
      }),
    ).toBeCloseTo(1000 + 1.19 * 400, 9);
  });
});

describe("IKO Example 1 (Linear Way ME 25 C2 R640 H): dynamic equivalent load", () => {
  // IKO's own printed P1-P4 (page 16). kr=ka=1 for this series/size bucket
  // (Table 3, "C-Lube Linear Way ME / Linear Way E", size 15-30), matching
  // Example 1's own arithmetic, which applies no conversion at all.
  const PRINTED_DYNAMIC: Record<IkoExample1Unit, number> = {
    unit1: 2710,
    unit2: 808,
    unit3: 1750,
    unit4: 1510,
  };

  for (const unit of UNITS) {
    it(`reproduces P for ${unit}`, () => {
      // Fr/Fa are IKO's own whole-Newton printed figures, so the tightest
      // honest tolerance is on the order of the rounding those already
      // carry, not floating-point equality.
      expect(
        Math.abs(
          ikoExample1DynamicEquivalentLoad(unit) - PRINTED_DYNAMIC[unit],
        ),
      ).toBeLessThanOrEqual(2);
    });
  }

  it("identifies unit 1 as governing, IKO's own conclusion", () => {
    const governing = ikoExample1GoverningDynamicLoad();
    expect(governing.unit).toBe("unit1");
    expect(Math.abs(governing.loadN - 2710)).toBeLessThanOrEqual(2);
  });
});

describe("IKO Example 1: static equivalent load and safety factor", () => {
  // IKO's own printed P01-P04 (page 16) — exact, since kOr=kOa=1 introduces
  // no rounding beyond IKO's own already-rounded Fr/Fa inputs.
  const PRINTED_STATIC: Record<IkoExample1Unit, number> = {
    unit1: 3350,
    unit2: 946,
    unit3: 1852,
    unit4: 1750,
  };

  for (const unit of UNITS) {
    it(`reproduces P0 for ${unit}`, () => {
      expect(ikoExample1StaticEquivalentLoad(unit)).toBeCloseTo(
        PRINTED_STATIC[unit],
        0,
      );
    });
  }

  it("identifies unit 1 as governing and reproduces fs = 6.3, IKO's own conclusion", () => {
    const governing = ikoExample1GoverningStaticLoad();
    expect(governing.unit).toBe("unit1");
    expect(governing.loadN).toBeCloseTo(3350, 0);
    // 21100 / 3350 = 6.2985..., which IKO prints rounded to 6.3.
    expect(ikoExample1StaticSafetyFactor()).toBeCloseTo(6.3, 1);
  });
});

describe("IKO Example 1: rating life", () => {
  it("reproduces the printed ~4410 km basic rating life within 0.5%", () => {
    // The cube exponent amplifies the rounding already present in Fr1/Fa1
    // (both whole-Newton printed figures), so a relative tolerance is the
    // honest comparison — the same treatment
    // ./pmi-chapter-9.test.ts gives PMI's own life figures.
    const actual = ikoExample1LifeKm();
    expect(Math.abs(actual - 4410) / 4410).toBeLessThan(0.005);
  });

  it('reproduces the printed "about 73,500 hours" service life within 0.5%', () => {
    const actual = ikoExample1LifeHours();
    expect(Math.abs(actual - 73_500) / 73_500).toBeLessThan(0.005);
  });
});

describe("IKO vs. PMI: the equivalent-load methodology disagreement, resolved for this scenario", () => {
  // stage-1-spec.md item 7 left this open: does IKO's more elaborate
  // equivalent-load formula give a materially different answer than PMI's
  // simpler PE = |PR| + |PT| for the same four-block load case? IKO's own
  // Example 1 is exactly that case (a real two-rail/four-block scenario,
  // not an invented one), so it can be answered directly.
  it("gives a strictly lower figure than PMI's PE = |PR| + |PT| on every slide unit", () => {
    for (const unit of UNITS) {
      const { radialN, lateralN } = IKO_EXAMPLE_1.slideUnits[unit];
      const pmiEquivalentN = resolveEquivalentLoad({
        radialN,
        lateralN,
      });
      const ikoEquivalentN = ikoExample1DynamicEquivalentLoad(unit);
      expect(ikoEquivalentN, unit).toBeLessThan(pmiEquivalentN);
    }
  });

  it("differs from PMI's form by exactly 0.4 * min(|Fr|, |Fa|) when kr = ka = 1", () => {
    // Algebraic identity, not a curve fit: with kr=ka=1, IKO's
    // P = X*|Fr| + Y*|Fa| where (X,Y) is (1, 0.6) or (0.6, 1) depending on
    // which of |Fr|, |Fa| is larger -- i.e. P = max(|Fr|,|Fa|) +
    // 0.6*min(|Fr|,|Fa|) = (|Fr|+|Fa|) - 0.4*min(|Fr|,|Fa|) = PMI_PE -
    // 0.4*min(|Fr|,|Fa|). Confirmed for kr=ka=1 (this module's ME 15-30
    // bucket); a series with kr != ka (e.g. MV, or ME 35-45's ka != 1)
    // would not reduce this cleanly, since the dominance comparison would
    // then be between *converted* loads, not raw ones.
    expect(ME_15_30_FACTORS.kr).toBe(1);
    expect(ME_15_30_FACTORS.ka).toBe(1);

    for (const unit of UNITS) {
      const { radialN, lateralN } = IKO_EXAMPLE_1.slideUnits[unit];
      const pmiEquivalentN = resolveEquivalentLoad({ radialN, lateralN });
      const ikoEquivalentN = resolveIkoDynamicEquivalentLoad({
        radialLoadN: radialN,
        lateralLoadN: lateralN,
        kr: ME_15_30_FACTORS.kr,
        ka: ME_15_30_FACTORS.ka,
      });
      const expectedGapN =
        0.4 * Math.min(Math.abs(radialN), Math.abs(lateralN));
      expect(pmiEquivalentN - ikoEquivalentN).toBeCloseTo(expectedGapN, 9);
    }
  });

  it("the gap ranges from about 5% to about 20% of PMI's figure across the four slide units", () => {
    // Documents the practical size of the disagreement, not just its sign.
    const ratios = UNITS.map((unit) => {
      const { radialN, lateralN } = IKO_EXAMPLE_1.slideUnits[unit];
      const pmiEquivalentN = resolveEquivalentLoad({ radialN, lateralN });
      const ikoEquivalentN = ikoExample1DynamicEquivalentLoad(unit);
      return ikoEquivalentN / pmiEquivalentN;
    });
    for (const ratio of ratios) {
      expect(ratio).toBeGreaterThan(0.75);
      expect(ratio).toBeLessThan(1);
    }
    expect(Math.min(...ratios)).toBeLessThan(0.85);
  });
});
