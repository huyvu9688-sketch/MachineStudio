import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
} from "@/lib/engine";
import modulePackage from "./index";

describe("example-relay conformance", () => {
  const report = runModuleConformance(modulePackage, {
    sampleInputs: [{ values: { thrust_force_in: makeQuantity(274, "N") } }],
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
