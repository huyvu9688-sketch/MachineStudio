import { describe, expect, it } from "vitest";
import { convert, executeModule } from "@/lib/engine";
import { supportBearingModule } from "./index";
import { asQuantity } from "./test-helpers";
import { NSK_REFERENCE_EXAMPLES } from "./nsk-reference-examples";

// Closes the gap ./validation.ts's own header note (and
// context/progress-tracker.md Unit 4.6) describes: no full published worked
// numerical example had been reproduced through this module's own compute
// path. These tests run NSK's own two worked examples through
// executeModule(supportBearingModule, ...) -- the real, input-schema-
// checked, sealed-package boundary a production calculation run would use
// -- and confirm the result matches NSK's own printed/stated figures.
//
// NSK's own approximate life-hours figures (read off its own Fig. 5.4 chart
// or the equivalent Lh = 500*fh^3 closed form, see ./nsk-fh-benchmark.ts) are
// stated to 2-3 significant figures, not printed to full precision -- the
// tolerance below is a documented allowance for that rounding, not slack
// introduced to make the test pass.

describe("support-bearing 0.1.0 reference examples (NSK 'Rolling Bearings')", () => {
  for (const example of NSK_REFERENCE_EXAMPLES) {
    describe(example.id, () => {
      it(`reproduces NSK's own printed dynamic equivalent load (${example.description})`, () => {
        const computation = executeModule(supportBearingModule, example.input);
        const dynamicEquivalentLoad = asQuantity(
          computation.outputs.normal_dynamic_equivalent_load,
        ).value;
        expect(dynamicEquivalentLoad).toBeCloseTo(
          example.dynamicEquivalentLoadN,
          6,
        );
      });

      it("reproduces NSK's own approximate service life, within chart-reading tolerance", () => {
        const computation = executeModule(supportBearingModule, example.input);
        const lifeHoursQuantity = asQuantity(
          computation.outputs.normal_nominal_life_hours,
        );
        // Stored canonically in seconds (compute.ts); convert back to hours.
        const lifeHours = convert(lifeHoursQuantity.value, "s", "h");
        expect(
          Math.abs(lifeHours - example.approximateLifeHours) /
            example.approximateLifeHours,
        ).toBeLessThan(0.02);
      });

      it("computes a rotational speed of exactly 900 rpm from the derived linear velocity and lead", () => {
        const computation = executeModule(supportBearingModule, example.input);
        const speedSection = computation.trace.sections.find(
          (s) => s.id === "operating-speed",
        );
        const step = speedSection?.children.find(
          (c) => c.id === "operating-speed-normal",
        );
        if (step === undefined || step.node !== "step") {
          throw new Error("operating-speed-normal step not found in trace");
        }
        const nRadPerS = asQuantity(step.outputs[0]!.value).value;
        // Both NSK examples share n = 900 rpm; both examples' own lead/
        // linear-velocity inputs are chosen only to reproduce it exactly.
        expect(nRadPerS).toBeCloseTo((900 * 2 * Math.PI) / 60, 6);
      });
    });
  }
});
