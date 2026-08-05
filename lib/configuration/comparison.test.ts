// Tests for baseline comparison (Unit 2.9 part 1). Pure — no database
// needed. Covers the implementation map's Unit 2.9 test intent: "Comparison
// of changed values, results, and parts."

import { describe, expect, it } from "vitest";
import { makeQuantity } from "../engine/units";
import { compareBaselineSnapshots } from "./comparison";
import { BASELINE_SNAPSHOT_FORMAT_VERSION } from "./types";
import type { MachineBaselineSnapshot } from "./types";

function baseline(
  overrides: Partial<MachineBaselineSnapshot> = {},
): MachineBaselineSnapshot {
  return {
    snapshotVersion: BASELINE_SNAPSHOT_FORMAT_VERSION,
    projectId: "project-1",
    projectName: "Axis Project",
    configurationId: "config-1",
    configurationName: "Baseline configuration",
    marketProfileKey: "US-General-Industrial-Machinery@1",
    requirements: [],
    designAssumptions: [],
    loadCases: [],
    assemblies: [],
    parameterValues: [],
    parameterLinks: [],
    calculationRuns: [],
    componentAssignments: [],
    createdAt: "2026-07-30T00:00:00.000Z",
    ...overrides,
  };
}

describe("compareBaselineSnapshots — requirements", () => {
  it("reports an added requirement", () => {
    const before = baseline();
    const after = baseline({
      requirements: [
        {
          id: "req-1",
          assemblyId: null,
          code: "REQ-01",
          statement: "Move fast.",
          acceptanceCriteria: [],
        },
      ],
    });
    const diff = compareBaselineSnapshots(before, after);
    expect(diff.requirements.added).toHaveLength(1);
    expect(diff.requirements.added[0].id).toBe("req-1");
    expect(diff.requirements.removed).toEqual([]);
    expect(diff.requirements.changed).toEqual([]);
  });

  it("reports a changed requirement (statement edited)", () => {
    const req = {
      id: "req-1",
      assemblyId: null,
      code: "REQ-01",
      statement: "Move fast.",
      acceptanceCriteria: [],
    };
    const before = baseline({ requirements: [req] });
    const after = baseline({
      requirements: [{ ...req, statement: "Move fast and quiet." }],
    });
    const diff = compareBaselineSnapshots(before, after);
    expect(diff.requirements.changed).toHaveLength(1);
    expect(diff.requirements.changed[0].before.statement).toBe("Move fast.");
    expect(diff.requirements.changed[0].after.statement).toBe(
      "Move fast and quiet.",
    );
  });

  it("reports a changed requirement when its acceptance criteria change", () => {
    const req = {
      id: "req-1",
      assemblyId: null,
      code: "REQ-01",
      statement: "Move fast.",
      acceptanceCriteria: [{ id: "ac-1", statement: "Under 2 s." }],
    };
    const before = baseline({ requirements: [req] });
    const after = baseline({
      requirements: [
        {
          ...req,
          acceptanceCriteria: [{ id: "ac-1", statement: "Under 1.5 s." }],
        },
      ],
    });
    const diff = compareBaselineSnapshots(before, after);
    expect(diff.requirements.changed).toHaveLength(1);
  });

  it("reports no diff for an unchanged requirement", () => {
    const req = {
      id: "req-1",
      assemblyId: null,
      code: "REQ-01",
      statement: "Move fast.",
      acceptanceCriteria: [],
    };
    const before = baseline({ requirements: [req] });
    const after = baseline({ requirements: [{ ...req }] });
    const diff = compareBaselineSnapshots(before, after);
    expect(diff.requirements.added).toEqual([]);
    expect(diff.requirements.removed).toEqual([]);
    expect(diff.requirements.changed).toEqual([]);
  });

  it("reports a removed requirement", () => {
    const req = {
      id: "req-1",
      assemblyId: null,
      code: "REQ-01",
      statement: "Move fast.",
      acceptanceCriteria: [],
    };
    const before = baseline({ requirements: [req] });
    const after = baseline();
    const diff = compareBaselineSnapshots(before, after);
    expect(diff.requirements.removed).toHaveLength(1);
  });
});

describe("compareBaselineSnapshots — parameter values (diffed by graph-node slot, not row id)", () => {
  it("reports a changed value at the same node even though the row id differs", () => {
    const nodeShape = {
      assemblyId: null,
      moduleInstanceId: "mi-1",
      nodeKind: "module_input" as const,
      parameterId: "motion.axis.payload_mass",
      loadCase: null,
      source: "manual" as const,
    };
    const before = baseline({
      parameterValues: [
        { ...nodeShape, id: "pv-1", value: makeQuantity(10, "kg") },
      ],
    });
    const after = baseline({
      // A new row (append-only history), same node, new value.
      parameterValues: [
        { ...nodeShape, id: "pv-2", value: makeQuantity(12, "kg") },
      ],
    });
    const diff = compareBaselineSnapshots(before, after);
    expect(diff.parameterValues.added).toEqual([]);
    expect(diff.parameterValues.removed).toEqual([]);
    expect(diff.parameterValues.changed).toHaveLength(1);
    expect(diff.parameterValues.changed[0].before.value).toEqual(
      makeQuantity(10, "kg"),
    );
    expect(diff.parameterValues.changed[0].after.value).toEqual(
      makeQuantity(12, "kg"),
    );
  });

  it("reports no diff when the same node keeps the same value, even with a new row id", () => {
    const nodeShape = {
      assemblyId: null,
      moduleInstanceId: "mi-1",
      nodeKind: "module_input" as const,
      parameterId: "motion.axis.payload_mass",
      loadCase: null,
      source: "manual" as const,
    };
    const before = baseline({
      parameterValues: [
        { ...nodeShape, id: "pv-1", value: makeQuantity(10, "kg") },
      ],
    });
    const after = baseline({
      parameterValues: [
        { ...nodeShape, id: "pv-2", value: makeQuantity(10, "kg") },
      ],
    });
    const diff = compareBaselineSnapshots(before, after);
    expect(diff.parameterValues.changed).toEqual([]);
  });

  it("treats two different nodes as added/removed, not changed", () => {
    const before = baseline({
      parameterValues: [
        {
          id: "pv-1",
          assemblyId: null,
          moduleInstanceId: "mi-1",
          nodeKind: "module_input",
          parameterId: "motion.axis.payload_mass",
          loadCase: null,
          source: "manual",
          value: makeQuantity(10, "kg"),
        },
      ],
    });
    const after = baseline({
      parameterValues: [
        {
          id: "pv-2",
          assemblyId: null,
          moduleInstanceId: "mi-2",
          nodeKind: "module_input",
          parameterId: "motion.axis.payload_mass",
          loadCase: null,
          source: "manual",
          value: makeQuantity(10, "kg"),
        },
      ],
    });
    const diff = compareBaselineSnapshots(before, after);
    expect(diff.parameterValues.added).toHaveLength(1);
    expect(diff.parameterValues.removed).toHaveLength(1);
    expect(diff.parameterValues.changed).toEqual([]);
  });
});

describe("compareBaselineSnapshots — calculation runs (diffed by module instance slot)", () => {
  const runShape = {
    moduleInstanceId: "mi-1",
    modulePackageId: "example-scaffold",
    moduleVersion: "0.1.0",
    modulePackageHash: "sha256:abc",
    status: "pass" as const,
    stale: false,
  };

  it("reports a changed run when the module gets a new run id", () => {
    const before = baseline({
      calculationRuns: [{ ...runShape, id: "run-1" }],
    });
    const after = baseline({ calculationRuns: [{ ...runShape, id: "run-2" }] });
    const diff = compareBaselineSnapshots(before, after);
    expect(diff.calculationRuns.changed).toHaveLength(1);
    expect(diff.calculationRuns.changed[0].before.id).toBe("run-1");
    expect(diff.calculationRuns.changed[0].after.id).toBe("run-2");
  });

  it("reports a changed run when the same run id goes stale between baselines", () => {
    const before = baseline({
      calculationRuns: [{ ...runShape, id: "run-1", stale: false }],
    });
    const after = baseline({
      calculationRuns: [{ ...runShape, id: "run-1", stale: true }],
    });
    const diff = compareBaselineSnapshots(before, after);
    expect(diff.calculationRuns.changed).toHaveLength(1);
  });
});

describe("compareBaselineSnapshots — component assignments and module tree", () => {
  it("reports a changed assignment when it goes stale", () => {
    const assignmentShape = {
      id: "ca-1",
      targetKind: "module_instance" as const,
      moduleInstanceId: "mi-1",
      assemblyId: null,
      partSource: "manual" as const,
      manufacturerPartRevisionId: null,
      manualPartDetails: { description: "Bracket" },
      quantity: 1,
      calculationRunId: "run-1",
    };
    const before = baseline({
      componentAssignments: [{ ...assignmentShape, stale: false }],
    });
    const after = baseline({
      componentAssignments: [{ ...assignmentShape, stale: true }],
    });
    const diff = compareBaselineSnapshots(before, after);
    expect(diff.componentAssignments.changed).toHaveLength(1);
  });

  it("reports an added module instance and a changed run status for an existing one", () => {
    const before = baseline({
      assemblies: [
        {
          id: "asm-1",
          parentId: null,
          name: "X axis",
          moduleInstances: [
            {
              id: "mi-1",
              modulePackageId: "example-scaffold",
              moduleVersion: "0.1.0",
              label: "Screw sizing",
              workflowInstanceId: null,
              lastCalculationRunId: null,
              lastRunStatus: null,
            },
          ],
          children: [],
        },
      ],
    });
    const after = baseline({
      assemblies: [
        {
          id: "asm-1",
          parentId: null,
          name: "X axis",
          moduleInstances: [
            {
              id: "mi-1",
              modulePackageId: "example-scaffold",
              moduleVersion: "0.1.0",
              label: "Screw sizing",
              workflowInstanceId: null,
              lastCalculationRunId: "run-1",
              lastRunStatus: "pass",
            },
            {
              id: "mi-2",
              modulePackageId: "example-scaffold",
              moduleVersion: "0.1.0",
              label: "Guide sizing",
              workflowInstanceId: null,
              lastCalculationRunId: null,
              lastRunStatus: null,
            },
          ],
          children: [],
        },
      ],
    });
    const diff = compareBaselineSnapshots(before, after);
    expect(diff.moduleInstances.added).toHaveLength(1);
    expect(diff.moduleInstances.added[0].id).toBe("mi-2");
    expect(diff.moduleInstances.changed).toHaveLength(1);
    expect(diff.moduleInstances.changed[0].id).toBe("mi-1");
    expect(diff.assemblies.added).toEqual([]);
    expect(diff.assemblies.changed).toEqual([]);
  });
});
