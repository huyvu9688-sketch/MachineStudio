import { describe, expect, it } from "vitest";
import { makeQuantity, runModuleConformance } from "@/lib/engine";
import { readModuleSources } from "../../test-support";
import modulePackage from "./index";

// Pinned by `npm run module:source-hash -- example-scaffold 0.1.0` — see
// lib/engine/module-sdk/conformance.ts's "source-immutability" check.
// Update this value in the same commit as a deliberate change to this
// directory's .ts files; an unreviewed change leaves it stale and the
// check below fails.
const EXPECTED_SOURCE_HASH = "ef7ab9d8c248bb02";

// The scaffold conforms out of the box. As you implement the real method,
// update the sample input(s) to exercise it and keep this suite green.
describe("example-scaffold conformance", () => {
  const report = runModuleConformance(modulePackage, {
    sampleInputs: [
      { values: { payload_mass: makeQuantity(10, "kg") } }, // TODO: realistic input
    ],
    sources: readModuleSources(import.meta.dirname),
    expectedSourceHash: EXPECTED_SOURCE_HASH,
  });

  for (const check of report.checks) {
    it(`${check.id} (${check.status})`, () => {
      expect(check.status, check.detail).not.toBe("fail");
    });
  }

  it("passes overall conformance", () => {
    expect(report.ok, JSON.stringify(report.checks, null, 2)).toBe(true);
  });

  it("pins its immutable parameter-registry target", () => {
    expect(modulePackage.manifest.parameterRegistryVersion).toBe("1.0.0");
  });
});
