import { describe, expect, it } from "vitest";
import { runSmcBoreSelectionExample } from "./smc-reference-example";

describe("SMC bore-size-selection Example 1, reached via this module's own compute path", () => {
  it("reproduces the 1000 N requirement from a vertical-lift load", () => {
    const { requiredExtendForceN } = runSmcBoreSelectionExample();
    expect(requiredExtendForceN).toBeCloseTo(1000, 3);
  });

  it("confirms SMC's own 63 mm bore selection clears the requirement", () => {
    const { requiredExtendForceN, theoreticalExtendForceN } = runSmcBoreSelectionExample();
    expect(theoreticalExtendForceN).toBeGreaterThanOrEqual(requiredExtendForceN);
    // F1 = 0.7 * (pi*63^2/4) * 0.5 ~= 1091.0 N, the same figure
    // pneumatic-cylinder@0.1.0's own validation record already confirms
    // clears this exact requirement.
    expect(theoreticalExtendForceN).toBeCloseTo(1091.0, 0);
  });
});
