import { describe, expect, it } from "vitest";
import { makeQuantity, runModuleConformance } from "@/lib/engine";
import modulePackage from "./index";

// The scaffold conforms out of the box. As you implement the real method,
// update the sample input(s) to exercise it and keep this suite green.
describe("example-scaffold conformance", () => {
  const report = runModuleConformance(modulePackage, {
    sampleInputs: [
      { values: { payload_mass: makeQuantity(10, "kg") } }, // TODO: realistic input
    ],
  });

  for (const check of report.checks) {
    it(`${check.id} (${check.status})`, () => {
      expect(check.status, check.detail).not.toBe("fail");
    });
  }

  it("passes overall conformance", () => {
    expect(report.ok, JSON.stringify(report.checks, null, 2)).toBe(true);
  });
});
