import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
} from "@/lib/engine";
import { readModuleSources } from "../../test-support";
import modulePackage from "./index";

// Pinned by `npm run module:source-hash -- example-relay 0.1.0` — see
// lib/engine/module-sdk/conformance.ts's "source-immutability" check.
// Update this value in the same commit as a deliberate change to this
// directory's .ts files; an unreviewed change leaves it stale and the
// check below fails.
const EXPECTED_SOURCE_HASH = "b809a7f6b1e79080";

describe("example-relay conformance", () => {
  const report = runModuleConformance(modulePackage, {
    sampleInputs: [{ values: { thrust_force_in: makeQuantity(274, "N") } }],
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

describe("example-relay compute", () => {
  it("relays the required thrust force unchanged", () => {
    const computation = executeModule(modulePackage, {
      values: { thrust_force_in: makeQuantity(274, "N") },
    });
    expect(computation.outputs.thrust_force_out).toEqual(
      makeQuantity(274, "N"),
    );
    expect(computation.checks[0]?.status).toBe("pass");
  });

  it("declares the same canonical parameter on both sides, so a chain links validly", () => {
    // This is the property the integration tests depend on: an output of one
    // instance is the same canonical parameter as the input of the next, which
    // is what `confirmParameterLink`'s compatibility gate requires.
    expect(modulePackage.ports.outputs[0].parameterId).toBe(
      modulePackage.ports.inputs[0].parameterId,
    );
  });
});
