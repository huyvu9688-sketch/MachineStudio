import { describe, expect, it } from "vitest";
import { asParameterId, type ModulePorts } from "@/lib/engine";
import { compareCandidateSystems } from "./comparison";
import {
  failCheck,
  fixtureComputation,
  passCheck,
  quantity,
} from "./test-support";
import type { WorkflowCandidate } from "./comparison";
import type { WorkflowDefinition } from "./types";

const NOMINAL_LIFE = asParameterId("screw.nominal_life");
const INERTIA_RATIO = asParameterId("drive.inertia_ratio");

function lifePorts(): ModulePorts {
  return {
    inputs: [],
    outputs: [{ key: "nominal_life", parameterId: NOMINAL_LIFE }],
  };
}

function inertiaPorts(): ModulePorts {
  return {
    inputs: [],
    outputs: [{ key: "inertia_ratio", parameterId: INERTIA_RATIO }],
  };
}

function candidate(
  label: string,
  lifeValue: number,
  lifeChecks: ReturnType<typeof passCheck>[] = [passCheck("ok")],
): WorkflowCandidate {
  return {
    label,
    instances: [
      {
        roleId: "screw",
        ports: lifePorts(),
        computation: fixtureComputation({
          outputs: { nominal_life: quantity(lifeValue, "rev") },
          checks: lifeChecks,
        }),
      },
    ],
  };
}

function definitionWithCriteria(
  criteria: WorkflowDefinition["comparisonCriteria"],
): WorkflowDefinition {
  return {
    manifest: { id: "test", version: "1.0.0", title: "t", description: "t" },
    roles: [],
    sequence: [],
    linkRules: [],
    completionRules: [],
    checkRules: [],
    comparisonCriteria: criteria,
  };
}

describe("compareCandidateSystems", () => {
  it("ranks higher_is_better descending", () => {
    const definition = definitionWithCriteria([
      {
        id: "life",
        roleId: "screw",
        parameterId: NOMINAL_LIFE,
        direction: "higher_is_better",
      },
    ]);
    const result = compareCandidateSystems(definition, [
      candidate("low", 100),
      candidate("high", 500),
    ]);
    expect(result.ranked.map((r) => r.label)).toEqual(["high", "low"]);
  });

  it("ranks lower_is_better ascending", () => {
    const definition = definitionWithCriteria([
      {
        id: "life",
        roleId: "screw",
        parameterId: NOMINAL_LIFE,
        direction: "lower_is_better",
      },
    ]);
    const result = compareCandidateSystems(definition, [
      candidate("low", 100),
      candidate("high", 500),
    ]);
    expect(result.ranked.map((r) => r.label)).toEqual(["low", "high"]);
  });

  it("disqualifies a candidate with any failing check, regardless of its criterion value", () => {
    const definition = definitionWithCriteria([
      {
        id: "life",
        roleId: "screw",
        parameterId: NOMINAL_LIFE,
        direction: "higher_is_better",
      },
    ]);
    const result = compareCandidateSystems(definition, [
      candidate("best-but-failing", 900, [failCheck("static-safety")]),
      candidate("worse-but-passing", 100),
    ]);
    expect(result.ranked.map((r) => r.label)).toEqual([
      "worse-but-passing",
      "best-but-failing",
    ]);
    expect(result.ranked[1]?.disqualified).toBe(true);
    expect(result.ranked[1]?.disqualifiedReason).toContain("static-safety");
  });

  it("breaks ties using the next criterion in declared order", () => {
    const definition = definitionWithCriteria([
      {
        id: "life",
        roleId: "screw",
        parameterId: NOMINAL_LIFE,
        direction: "higher_is_better",
      },
      {
        id: "inertia",
        roleId: "drive",
        parameterId: INERTIA_RATIO,
        direction: "lower_is_better",
      },
    ]);
    const withDrive = (
      label: string,
      life: number,
      inertia: number,
    ): WorkflowCandidate => ({
      label,
      instances: [
        {
          roleId: "screw",
          ports: lifePorts(),
          computation: fixtureComputation({
            outputs: { nominal_life: quantity(life, "rev") },
            checks: [passCheck("ok")],
          }),
        },
        {
          roleId: "drive",
          ports: inertiaPorts(),
          computation: fixtureComputation({
            outputs: { inertia_ratio: quantity(inertia, "ratio") },
            checks: [passCheck("ok")],
          }),
        },
      ],
    });
    const result = compareCandidateSystems(definition, [
      withDrive("tied-worse-inertia", 500, 8),
      withDrive("tied-better-inertia", 500, 3),
    ]);
    expect(result.ranked.map((r) => r.label)).toEqual([
      "tied-better-inertia",
      "tied-worse-inertia",
    ]);
  });

  it("sorts a candidate missing a criterion's value after ones that have it", () => {
    const definition = definitionWithCriteria([
      {
        id: "life",
        roleId: "screw",
        parameterId: NOMINAL_LIFE,
        direction: "higher_is_better",
      },
    ]);
    const missingRole: WorkflowCandidate = { label: "no-screw", instances: [] };
    const result = compareCandidateSystems(definition, [
      missingRole,
      candidate("has-screw", 100),
    ]);
    expect(result.ranked.map((r) => r.label)).toEqual([
      "has-screw",
      "no-screw",
    ]);
  });
});
