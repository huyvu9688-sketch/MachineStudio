import { describe, expect, it } from "vitest";
import { executeModule } from "@/lib/engine";
import { couplingModule } from "./index";
import { asQuantity } from "./test-helpers";
import { RW_REFERENCE_EXAMPLES } from "./rw-reference-examples";

// Closes the gap ./validation.ts's own header note (and
// context/progress-tracker.md Unit 4.5) describes: ./math.test.ts reproduces
// R+W's own printed figures at the formula level
// (resolveRequiredTorqueFromPower, resolveScaledRequiredTorque), but not
// through this module's own compute path (compute.ts consumes
// screw.drive_torque directly). These tests run R+W's own two worked
// examples through executeModule(couplingModule, ...) — the real,
// input-schema-checked, sealed-package boundary production calculation runs
// would use — and confirm the result matches R+W's own printed conclusion.

describe("coupling 0.1.0 reference examples (R+W 'Sizing and Selection')", () => {
  for (const example of RW_REFERENCE_EXAMPLES) {
    describe(example.id, () => {
      it(`reproduces R+W's own printed required T_KN (${example.description})`, () => {
        const computation = executeModule(couplingModule, example.input);
        const scaledRequired =
          example.ratedTorqueNm /
          asQuantity(computation.outputs.normal_torque_safety_factor).value;
        expect(scaledRequired).toBeCloseTo(
          example.printedScaledRequiredTorqueNm,
          0,
        );
      });

      it(`reports a torque safety factor consistent with R+W's own selection of ${example.selectedModel}`, () => {
        const computation = executeModule(couplingModule, example.input);
        const factor = asQuantity(
          computation.outputs.normal_torque_safety_factor,
        ).value;
        const expectedFactor =
          example.ratedTorqueNm /
          (example.requiredTorqueNm * example.serviceFactor);
        expect(factor).toBeGreaterThanOrEqual(1);
        expect(factor).toBeCloseTo(expectedFactor, 3);
      });

      it("passes the torque-safety-normal check, matching R+W's own selection outcome", () => {
        const computation = executeModule(couplingModule, example.input);
        const check = computation.checks.find(
          (c) => c.id === "torque-safety-normal",
        );
        expect(check?.status).toBe("pass");
      });
    });
  }
});
