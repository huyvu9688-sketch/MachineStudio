import { describe, expect, it } from "vitest";
import {
  compareToNorgrenExample,
  NORGREN_M1000_EXAMPLES,
} from "./norgren-benchmark";

// Reproduces Norgren (IMI Precision Engineering)'s own M/1000 catalog
// theoretical-force and air-consumption ratings through this module's own
// kernel -- see ./norgren-benchmark.ts's own top comment for what this
// closes (the theoretical-force and air-consumption formulas' own
// independent-benchmark item) and what it does not (cushion
// kinetic-energy-allowable and buckling remain without a second
// independent source -- ./validation.ts "independentBenchmark").

describe("pneumatic-cylinder 0.1.0 Norgren M/1000 independent benchmark", () => {
  for (const example of NORGREN_M1000_EXAMPLES) {
    describe(`${example.model} (bore ${example.boreDiameterMm.toFixed(1)}mm, rod ${example.rodDiameterMm.toFixed(1)}mm)`, () => {
      const result = compareToNorgrenExample(example);

      it("reproduces Norgren's own printed outstroke theoretical force within 2%", () => {
        expect(Math.abs(result.outstrokeForceRelativeDeviation)).toBeLessThan(
          0.02,
        );
      });

      it("reproduces Norgren's own printed instroke theoretical force within 2%", () => {
        expect(Math.abs(result.instrokeForceRelativeDeviation)).toBeLessThan(
          0.02,
        );
      });

      it("reproduces Norgren's own printed combined air-consumption rate within 2%", () => {
        expect(
          Math.abs(result.combinedAirConsumptionRelativeDeviation),
        ).toBeLessThan(0.02);
      });
    });
  }

  it("agrees with Norgren's own printed figures to within 1% on average across all seven models (stronger than the per-model 2% bound)", () => {
    const deviations = NORGREN_M1000_EXAMPLES.flatMap((example) => {
      const result = compareToNorgrenExample(example);
      return [
        Math.abs(result.outstrokeForceRelativeDeviation),
        Math.abs(result.instrokeForceRelativeDeviation),
        Math.abs(result.combinedAirConsumptionRelativeDeviation),
      ];
    });
    const meanDeviation =
      deviations.reduce((sum, d) => sum + d, 0) / deviations.length;
    expect(meanDeviation).toBeLessThan(0.01);
  });
});
