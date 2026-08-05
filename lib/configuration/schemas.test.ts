// Tests for the machine-baseline snapshot schema (Unit 2.9 part 1). Pure —
// no database needed. Covers round-trip validation and rejection of a wrong
// format version, a missing required field, and an unknown key (strict mode).

import { describe, expect, it } from "vitest";
import { makeQuantity } from "../engine/units";
import { MachineBaselineSnapshotSchema } from "./schemas";
import { BASELINE_SNAPSHOT_FORMAT_VERSION } from "./types";
import type { MachineBaselineSnapshot } from "./types";

function validSnapshot(): MachineBaselineSnapshot {
  return {
    snapshotVersion: BASELINE_SNAPSHOT_FORMAT_VERSION,
    projectId: "project-1",
    projectName: "Axis Project",
    configurationId: "config-1",
    configurationName: "Baseline configuration",
    marketProfileKey: "US-General-Industrial-Machinery@1",
    requirements: [
      {
        id: "req-1",
        assemblyId: null,
        code: "REQ-01",
        statement: "The axis shall move 500 mm in under 2 s.",
        acceptanceCriteria: [
          { id: "ac-1", statement: "Move time <= 2 s at rated payload." },
        ],
      },
    ],
    designAssumptions: [
      {
        id: "da-1",
        assemblyId: null,
        statement: "Ambient 25 C.",
        rationale: "Indoor factory.",
      },
    ],
    loadCases: [
      {
        id: "lc-1",
        category: "normal",
        label: "Normal cycle",
        description: null,
      },
    ],
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
        ],
        children: [],
      },
    ],
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
    parameterLinks: [
      {
        id: "pl-1",
        targetModuleInstanceId: "mi-1",
        targetParameterId: "motion.axis.payload_mass",
        targetLoadCase: null,
        sourceKind: "machine_requirement",
        sourceModuleInstanceId: null,
        sourceAssemblyId: null,
        sourceParameterId: "motion.axis.payload_mass",
        sourceLoadCase: null,
      },
    ],
    calculationRuns: [
      {
        id: "run-1",
        moduleInstanceId: "mi-1",
        modulePackageId: "example-scaffold",
        moduleVersion: "0.1.0",
        modulePackageHash: "sha256:abc",
        status: "pass",
        stale: false,
      },
    ],
    componentAssignments: [
      {
        id: "ca-1",
        targetKind: "module_instance",
        moduleInstanceId: "mi-1",
        assemblyId: null,
        partSource: "manual",
        manufacturerPartRevisionId: null,
        manualPartDetails: { description: "Custom bracket" },
        quantity: 1,
        calculationRunId: "run-1",
        stale: false,
      },
    ],
    createdAt: "2026-07-30T00:00:00.000Z",
    createdByUserId: "user-1",
  };
}

describe("MachineBaselineSnapshotSchema", () => {
  it("round-trips a fully populated valid snapshot", () => {
    const snapshot = validSnapshot();
    const result = MachineBaselineSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(snapshot);
    }
  });

  it("round-trips a minimal snapshot with every list empty", () => {
    const snapshot: MachineBaselineSnapshot = {
      ...validSnapshot(),
      requirements: [],
      designAssumptions: [],
      loadCases: [],
      assemblies: [],
      parameterValues: [],
      parameterLinks: [],
      calculationRuns: [],
      componentAssignments: [],
      createdByUserId: undefined,
    };
    const result = MachineBaselineSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(true);
  });

  it("round-trips nested assembly children", () => {
    const snapshot = validSnapshot();
    const nested: MachineBaselineSnapshot = {
      ...snapshot,
      assemblies: [
        {
          id: "asm-1",
          parentId: null,
          name: "X axis",
          moduleInstances: [],
          children: [
            {
              id: "asm-2",
              parentId: "asm-1",
              name: "Screw sub-assembly",
              moduleInstances: [],
              children: [],
            },
          ],
        },
      ],
    };
    const result = MachineBaselineSnapshotSchema.safeParse(nested);
    expect(result.success).toBe(true);
  });

  it("rejects a wrong snapshotVersion", () => {
    const snapshot = { ...validSnapshot(), snapshotVersion: 2 };
    const result = MachineBaselineSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(false);
  });

  it("rejects a missing required field", () => {
    const snapshot: Record<string, unknown> = { ...validSnapshot() };
    delete snapshot.projectId;
    const result = MachineBaselineSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(false);
  });

  it("rejects an unknown top-level key (strict mode)", () => {
    const snapshot = { ...validSnapshot(), unexpectedField: "surprise" };
    const result = MachineBaselineSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(false);
  });

  it("rejects a malformed EngineeringValue inside a parameter value", () => {
    const snapshot = validSnapshot();
    const corrupted = {
      ...snapshot,
      parameterValues: [
        {
          ...snapshot.parameterValues[0],
          value: { kind: "quantity" /* missing v/value/unit */ },
        },
      ],
    };
    const result = MachineBaselineSnapshotSchema.safeParse(corrupted);
    expect(result.success).toBe(false);
  });

  it("rejects a malformed manualPartDetails payload (missing description)", () => {
    const snapshot = validSnapshot();
    const corrupted = {
      ...snapshot,
      componentAssignments: [
        {
          ...snapshot.componentAssignments[0],
          manualPartDetails: { notes: "no description" },
        },
      ],
    };
    const result = MachineBaselineSnapshotSchema.safeParse(corrupted);
    expect(result.success).toBe(false);
  });
});
