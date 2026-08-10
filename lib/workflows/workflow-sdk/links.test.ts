import { describe, expect, it } from "vitest";
import { asParameterId, type ModulePorts } from "@/lib/engine";
import {
  instancePortNodeId,
  linkProposalKey,
  resolveLinkProposals,
} from "./links";
import type { WorkflowDefinition, WorkflowRoleInstance } from "./types";

const THRUST_FORCE = asParameterId("motion.axis.thrust_force");
const DRIVE_TORQUE = asParameterId("screw.drive_torque");
const ORIENTATION = asParameterId("motion.axis.orientation");

function definitionWithRule(
  ruleOverrides: Partial<WorkflowDefinition["linkRules"][number]> = {},
): WorkflowDefinition {
  return {
    manifest: { id: "test", version: "1.0.0", title: "t", description: "t" },
    roles: [],
    sequence: [],
    linkRules: [
      {
        id: "axis-to-screw-thrust",
        parameterId: THRUST_FORCE,
        fromRoleId: "axis",
        toRoleId: "screw",
        ...ruleOverrides,
      },
    ],
    completionRules: [],
    checkRules: [],
    comparisonCriteria: [],
  };
}

const axisPorts: ModulePorts = {
  inputs: [],
  outputs: [
    {
      key: "normal_thrust_force",
      parameterId: THRUST_FORCE,
      loadCase: "normal",
    },
    { key: "peak_thrust_force", parameterId: THRUST_FORCE, loadCase: "peak" },
  ],
};

const screwPorts: ModulePorts = {
  inputs: [
    {
      key: "normal_thrust_force",
      parameterId: THRUST_FORCE,
      required: true,
      loadCase: "normal",
    },
    {
      key: "peak_thrust_force",
      parameterId: THRUST_FORCE,
      required: true,
      loadCase: "peak",
    },
  ],
  outputs: [
    {
      key: "normal_drive_torque",
      parameterId: DRIVE_TORQUE,
      loadCase: "normal",
    },
  ],
};

const axisInstance: WorkflowRoleInstance = {
  instanceId: "axis-1",
  roleId: "axis",
  moduleId: "axis-load-cases",
  ports: axisPorts,
};

const screwInstance: WorkflowRoleInstance = {
  instanceId: "screw-1",
  roleId: "screw",
  moduleId: "ball-screw",
  ports: screwPorts,
};

describe("resolveLinkProposals", () => {
  it("proposes one link per matching load case", () => {
    const proposals = resolveLinkProposals(definitionWithRule(), [
      axisInstance,
      screwInstance,
    ]);

    expect(proposals).toHaveLength(2);
    expect(proposals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "axis-to-screw-thrust",
          fromInstanceId: "axis-1",
          fromPortKey: "normal_thrust_force",
          toInstanceId: "screw-1",
          toPortKey: "normal_thrust_force",
          parameterId: THRUST_FORCE,
          loadCase: "normal",
        }),
        expect.objectContaining({
          ruleId: "axis-to-screw-thrust",
          fromInstanceId: "axis-1",
          fromPortKey: "peak_thrust_force",
          toInstanceId: "screw-1",
          toPortKey: "peak_thrust_force",
          parameterId: THRUST_FORCE,
          loadCase: "peak",
        }),
      ]),
    );
  });

  it("never proposes a cross-case link — normal output does not feed a peak sink", () => {
    const proposals = resolveLinkProposals(definitionWithRule(), [
      axisInstance,
      screwInstance,
    ]);
    const crossCase = proposals.find(
      (p) =>
        p.fromPortKey === "normal_thrust_force" &&
        p.toPortKey === "peak_thrust_force",
    );
    expect(crossCase).toBeUndefined();
  });

  it("fans out to every present instance of the target role", () => {
    const secondScrewInstance: WorkflowRoleInstance = {
      ...screwInstance,
      instanceId: "screw-2",
    };
    const proposals = resolveLinkProposals(definitionWithRule(), [
      axisInstance,
      screwInstance,
      secondScrewInstance,
    ]);
    const toInstanceIds = new Set(proposals.map((p) => p.toInstanceId));
    expect(toInstanceIds).toEqual(new Set(["screw-1", "screw-2"]));
  });

  it("returns no proposals when no port on either side declares the rule's parameter", () => {
    const definition = definitionWithRule({ parameterId: ORIENTATION });
    const proposals = resolveLinkProposals(definition, [
      axisInstance,
      screwInstance,
    ]);
    expect(proposals).toEqual([]);
  });

  it("returns no proposals when the target role has no present instance", () => {
    const proposals = resolveLinkProposals(definitionWithRule(), [
      axisInstance,
    ]);
    expect(proposals).toEqual([]);
  });
});

describe("instancePortNodeId", () => {
  it("joins instance and port key with a dot", () => {
    expect(instancePortNodeId("axis-1", "normal_thrust_force")).toBe(
      "axis-1.normal_thrust_force",
    );
  });
});

describe("linkProposalKey", () => {
  it("produces a stable, unique key per proposal", () => {
    const proposals = resolveLinkProposals(definitionWithRule(), [
      axisInstance,
      screwInstance,
    ]);
    const keys = proposals.map(linkProposalKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys[0]).toContain("axis-to-screw-thrust::");
  });
});
