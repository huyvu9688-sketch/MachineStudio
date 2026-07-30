// Tests for baseline creation-readiness checks (Unit 2.9 part 1). Pure — no
// database needed. Covers the implementation map's Unit 2.9 test intent:
// "Stale/failed acknowledgement requirements."

import { describe, expect, it } from "vitest";
import { evaluateBaselineReadiness } from "./readiness";
import type { BaselineCalculationRunRef, BaselineComponentAssignment } from "./types";

function run(overrides: Partial<BaselineCalculationRunRef> = {}): BaselineCalculationRunRef {
  return {
    id: "run-1",
    moduleInstanceId: "mi-1",
    modulePackageId: "example-scaffold",
    moduleVersion: "0.1.0",
    modulePackageHash: "sha256:abc",
    status: "pass",
    stale: false,
    ...overrides,
  };
}

function assignment(
  overrides: Partial<BaselineComponentAssignment> = {},
): BaselineComponentAssignment {
  return {
    id: "ca-1",
    targetKind: "module_instance",
    moduleInstanceId: "mi-1",
    assemblyId: null,
    partSource: "manual",
    manufacturerPartRevisionId: null,
    manualPartDetails: { description: "Bracket" },
    quantity: 1,
    calculationRunId: "run-1",
    stale: false,
    ...overrides,
  };
}

describe("evaluateBaselineReadiness", () => {
  it("is ready with no runs or assignments", () => {
    const result = evaluateBaselineReadiness({ calculationRuns: [], componentAssignments: [] });
    expect(result.ready).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("is ready when every run and assignment is fresh and passing", () => {
    const result = evaluateBaselineReadiness({
      calculationRuns: [run()],
      componentAssignments: [assignment()],
    });
    expect(result.ready).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("blocks on a stale run", () => {
    const result = evaluateBaselineReadiness({
      calculationRuns: [run({ stale: true })],
      componentAssignments: [],
    });
    expect(result.ready).toBe(false);
    expect(result.blockers).toHaveLength(1);
    expect(result.blockers[0].kind).toBe("stale_run");
    expect(result.blockers[0].id).toBe("run-1");
  });

  it("blocks on a failed run (status fail)", () => {
    const result = evaluateBaselineReadiness({
      calculationRuns: [run({ status: "fail" })],
      componentAssignments: [],
    });
    expect(result.ready).toBe(false);
    expect(result.blockers.map((b) => b.kind)).toEqual(["failed_run"]);
  });

  it("blocks on a run whose status is invalid_input", () => {
    const result = evaluateBaselineReadiness({
      calculationRuns: [run({ status: "invalid_input" })],
      componentAssignments: [],
    });
    expect(result.ready).toBe(false);
    expect(result.blockers.map((b) => b.kind)).toEqual(["failed_run"]);
  });

  it("does not block on a warning or not_applicable status", () => {
    const result = evaluateBaselineReadiness({
      calculationRuns: [run({ status: "warning" }), run({ id: "run-2", status: "not_applicable" })],
      componentAssignments: [],
    });
    expect(result.ready).toBe(true);
  });

  it("reports both stale_run and failed_run when a run is stale AND failed", () => {
    const result = evaluateBaselineReadiness({
      calculationRuns: [run({ stale: true, status: "fail" })],
      componentAssignments: [],
    });
    expect(result.ready).toBe(false);
    expect(result.blockers.map((b) => b.kind).sort()).toEqual(["failed_run", "stale_run"]);
  });

  it("blocks on a stale component assignment", () => {
    const result = evaluateBaselineReadiness({
      calculationRuns: [],
      componentAssignments: [assignment({ stale: true })],
    });
    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual([
      {
        kind: "stale_assignment",
        id: "ca-1",
        message: expect.stringContaining("ca-1"),
      },
    ]);
  });

  it("proceeds when blockers exist but acknowledgeWarnings is true, still reporting the blockers", () => {
    const result = evaluateBaselineReadiness({
      calculationRuns: [run({ stale: true })],
      componentAssignments: [assignment({ stale: true })],
      acknowledgeWarnings: true,
    });
    expect(result.ready).toBe(true);
    expect(result.blockers).toHaveLength(2);
  });

  it("does not require acknowledgement when there is nothing to acknowledge", () => {
    const result = evaluateBaselineReadiness({
      calculationRuns: [run()],
      componentAssignments: [assignment()],
      acknowledgeWarnings: false,
    });
    expect(result.ready).toBe(true);
  });
});
