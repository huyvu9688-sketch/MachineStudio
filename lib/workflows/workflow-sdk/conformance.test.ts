import { describe, expect, it } from "vitest";
import { asParameterId, type ModulePorts } from "@/lib/engine";
import { runWorkflowConformance } from "./conformance";
import type { WorkflowDefinition, WorkflowRoleInstance } from "./types";

const THRUST_FORCE = asParameterId("motion.axis.thrust_force");

function validDefinition(): WorkflowDefinition {
  return {
    manifest: { id: "test", version: "1.0.0", title: "Test", description: "d" },
    roles: [
      {
        id: "axis",
        label: "Axis",
        moduleIds: ["axis-load-cases"],
        cardinality: { min: 1, max: 1 },
      },
      {
        id: "screw",
        label: "Screw",
        moduleIds: ["ball-screw"],
        cardinality: { min: 1, max: 1 },
      },
    ],
    sequence: [["axis"], ["screw"]],
    linkRules: [
      {
        id: "axis-to-screw-thrust",
        parameterId: THRUST_FORCE,
        fromRoleId: "axis",
        toRoleId: "screw",
      },
    ],
    completionRules: [
      { kind: "role_cardinality", id: "axis-present", roleId: "axis" },
      {
        kind: "link_confirmed",
        id: "thrust-linked",
        ruleId: "axis-to-screw-thrust",
      },
    ],
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
  ],
  outputs: [],
};

const instances: readonly WorkflowRoleInstance[] = [
  {
    instanceId: "axis-1",
    roleId: "axis",
    moduleId: "axis-load-cases",
    ports: axisPorts,
  },
  {
    instanceId: "screw-1",
    roleId: "screw",
    moduleId: "ball-screw",
    ports: screwPorts,
  },
];

describe("runWorkflowConformance", () => {
  it("passes every check for a well-formed definition with representative instances", () => {
    const report = runWorkflowConformance(validDefinition(), { instances });
    expect(report.ok).toBe(true);
    expect(report.checks.every((c) => c.status !== "fail")).toBe(true);
  });

  it("skips link-rules-resolve when no representative instances are supplied", () => {
    const report = runWorkflowConformance(validDefinition());
    const check = report.checks.find((c) => c.id === "link-rules-resolve");
    expect(check?.status).toBe("skipped");
    expect(report.ok).toBe(true);
  });

  it("fails role-references when a link rule names an undeclared role", () => {
    const definition = {
      ...validDefinition(),
      linkRules: [
        {
          id: "bad-rule",
          parameterId: THRUST_FORCE,
          fromRoleId: "axis",
          toRoleId: "nonexistent-role",
        },
      ],
    };
    const report = runWorkflowConformance(definition);
    const check = report.checks.find((c) => c.id === "role-references");
    expect(check?.status).toBe("fail");
    expect(report.ok).toBe(false);
  });

  it("fails sequence-consistency when a role is missing from the sequence", () => {
    const definition = { ...validDefinition(), sequence: [["axis"]] };
    const report = runWorkflowConformance(definition);
    const check = report.checks.find((c) => c.id === "sequence-consistency");
    expect(check?.status).toBe("fail");
  });

  it("fails sequence-consistency when a linkRule's fromRole does not precede its toRole", () => {
    const definition = {
      ...validDefinition(),
      sequence: [["screw"], ["axis"]],
    };
    const report = runWorkflowConformance(definition);
    const check = report.checks.find((c) => c.id === "sequence-consistency");
    expect(check?.status).toBe("fail");
  });

  it("fails link-rules-resolve when a declared rule has no compatible port pair despite both roles present", () => {
    const definition = {
      ...validDefinition(),
      linkRules: [
        {
          id: "impossible-rule",
          parameterId: asParameterId("motion.axis.orientation"),
          fromRoleId: "axis",
          toRoleId: "screw",
        },
      ],
    };
    const report = runWorkflowConformance(definition, { instances });
    const check = report.checks.find((c) => c.id === "link-rules-resolve");
    expect(check?.status).toBe("fail");
  });
});
