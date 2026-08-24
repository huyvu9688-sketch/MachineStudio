import { describe, expect, it } from "vitest";
import { asParameterId, type ModulePorts } from "@/lib/engine";
import { evaluateCompletion } from "./completion";
import { linkProposalKey } from "./links";
import {
  enumValue,
  failCheck,
  fixtureComputation,
  passCheck,
} from "./test-support";
import type {
  WorkflowDefinition,
  WorkflowInstanceContext,
  WorkflowLinkProposal,
} from "./types";

const ORIENTATION = asParameterId("motion.axis.orientation");
const DRIVE_TORQUE = asParameterId("screw.drive_torque");

const emptyPorts: ModulePorts = { inputs: [], outputs: [] };

function baseDefinition(): WorkflowDefinition {
  return {
    manifest: { id: "test", version: "1.0.0", title: "t", description: "t" },
    roles: [
      {
        id: "axis",
        label: "Axis",
        moduleIds: ["axis-load-cases"],
        cardinality: { min: 1, max: 1 },
      },
      {
        id: "coupling",
        label: "Coupling",
        moduleIds: ["coupling"],
        cardinality: { min: 0, max: 1 },
      },
    ],
    sequence: [["axis"], ["coupling"]],
    linkRules: [
      {
        id: "screw-to-coupling-torque",
        parameterId: DRIVE_TORQUE,
        fromRoleId: "screw",
        toRoleId: "coupling",
      },
    ],
    completionRules: [],
    checkRules: [],
    comparisonCriteria: [],
  };
}

function instance(
  overrides: Partial<WorkflowInstanceContext> = {},
): WorkflowInstanceContext {
  return {
    instanceId: "axis-1",
    roleId: "axis",
    moduleId: "axis-load-cases",
    ports: emptyPorts,
    inputValues: {},
    ...overrides,
  };
}

describe("evaluateCompletion — role_cardinality", () => {
  it("is satisfied when the present count is within range", () => {
    const definition = {
      ...baseDefinition(),
      completionRules: [
        {
          kind: "role_cardinality",
          id: "axis-present",
          roleId: "axis",
        } as const,
      ],
    };
    const result = evaluateCompletion({
      definition,
      instances: [instance()],
      proposals: [],
      confirmedLinkKeys: new Set(),
    });
    expect(result.satisfied).toBe(true);
  });

  it("is not satisfied when the required minimum is not met", () => {
    const definition = {
      ...baseDefinition(),
      completionRules: [
        {
          kind: "role_cardinality",
          id: "axis-present",
          roleId: "axis",
        } as const,
      ],
    };
    const result = evaluateCompletion({
      definition,
      instances: [],
      proposals: [],
      confirmedLinkKeys: new Set(),
    });
    expect(result.satisfied).toBe(false);
    expect(result.results[0]?.satisfied).toBe(false);
  });

  it("fails closed when the rule references an unknown role", () => {
    const definition = {
      ...baseDefinition(),
      completionRules: [
        { kind: "role_cardinality", id: "bad", roleId: "nonexistent" } as const,
      ],
    };
    const result = evaluateCompletion({
      definition,
      instances: [instance()],
      proposals: [],
      confirmedLinkKeys: new Set(),
    });
    expect(result.satisfied).toBe(false);
  });
});

describe("evaluateCompletion — link_confirmed", () => {
  const proposal: WorkflowLinkProposal = {
    ruleId: "screw-to-coupling-torque",
    fromInstanceId: "screw-1",
    fromPortKey: "normal_drive_torque",
    toInstanceId: "coupling-1",
    toPortKey: "normal_drive_torque",
    parameterId: DRIVE_TORQUE,
    loadCase: "normal",
  };

  it("is vacuously satisfied when the rule resolves to no proposals (optional role absent)", () => {
    const definition = {
      ...baseDefinition(),
      completionRules: [
        {
          kind: "link_confirmed",
          id: "coupling-linked",
          ruleId: "screw-to-coupling-torque",
        } as const,
      ],
    };
    const result = evaluateCompletion({
      definition,
      instances: [instance()],
      proposals: [],
      confirmedLinkKeys: new Set(),
    });
    expect(result.satisfied).toBe(true);
  });

  it("is not satisfied when a proposal exists but is not confirmed", () => {
    const definition = {
      ...baseDefinition(),
      completionRules: [
        {
          kind: "link_confirmed",
          id: "coupling-linked",
          ruleId: "screw-to-coupling-torque",
        } as const,
      ],
    };
    const result = evaluateCompletion({
      definition,
      instances: [instance()],
      proposals: [proposal],
      confirmedLinkKeys: new Set(),
    });
    expect(result.satisfied).toBe(false);
  });

  it("is satisfied once every proposal for the rule is confirmed", () => {
    const definition = {
      ...baseDefinition(),
      completionRules: [
        {
          kind: "link_confirmed",
          id: "coupling-linked",
          ruleId: "screw-to-coupling-torque",
        } as const,
      ],
    };
    const result = evaluateCompletion({
      definition,
      instances: [instance()],
      proposals: [proposal],
      confirmedLinkKeys: new Set([linkProposalKey(proposal)]),
    });
    expect(result.satisfied).toBe(true);
  });
});

describe("evaluateCompletion — no_failing_checks", () => {
  const rule = {
    kind: "no_failing_checks",
    id: "axis-clean",
    roleIds: ["axis"],
  } as const;

  it("is not satisfied when the instance has not been computed yet", () => {
    const definition = { ...baseDefinition(), completionRules: [rule] };
    const result = evaluateCompletion({
      definition,
      instances: [instance()],
      proposals: [],
      confirmedLinkKeys: new Set(),
    });
    expect(result.satisfied).toBe(false);
  });

  it("is not satisfied when a check has failed", () => {
    const definition = { ...baseDefinition(), completionRules: [rule] };
    const result = evaluateCompletion({
      definition,
      instances: [
        instance({
          computation: fixtureComputation({ checks: [failCheck("x")] }),
        }),
      ],
      proposals: [],
      confirmedLinkKeys: new Set(),
    });
    expect(result.satisfied).toBe(false);
  });

  it("is satisfied when every relevant instance has only passing checks", () => {
    const definition = { ...baseDefinition(), completionRules: [rule] };
    const result = evaluateCompletion({
      definition,
      instances: [
        instance({
          computation: fixtureComputation({ checks: [passCheck("x")] }),
        }),
      ],
      proposals: [],
      confirmedLinkKeys: new Set(),
    });
    expect(result.satisfied).toBe(true);
  });

  it("is vacuously satisfied when no instance of the named roles is present", () => {
    const definition = { ...baseDefinition(), completionRules: [rule] };
    const result = evaluateCompletion({
      definition,
      instances: [],
      proposals: [],
      confirmedLinkKeys: new Set(),
    });
    expect(result.satisfied).toBe(true);
  });
});

describe("evaluateCompletion — workflowChecks", () => {
  // A release audit found workflow-level checks (evaluateWorkflowChecks) were
  // computed and shown in the UI but never gated `satisfied`/"completed"
  // status — only per-module checks did, via the no_failing_checks rule
  // above. These cases prove a failing workflow-level check now blocks
  // completion even when every completionRule itself is satisfied.
  it("is satisfied when workflowChecks is omitted (opt-out, not a silent default)", () => {
    const definition = { ...baseDefinition(), completionRules: [] };
    const result = evaluateCompletion({
      definition,
      instances: [],
      proposals: [],
      confirmedLinkKeys: new Set(),
    });
    expect(result.satisfied).toBe(true);
  });

  it("is satisfied when workflowChecks is empty or all-passing, with no other completion rules", () => {
    const definition = { ...baseDefinition(), completionRules: [] };
    const result = evaluateCompletion({
      definition,
      instances: [],
      proposals: [],
      confirmedLinkKeys: new Set(),
      workflowChecks: [passCheck("shared-lead")],
    });
    expect(result.satisfied).toBe(true);
  });

  it("is NOT satisfied when a workflow-level check has failed, even with no other completion rules", () => {
    const definition = { ...baseDefinition(), completionRules: [] };
    const result = evaluateCompletion({
      definition,
      instances: [],
      proposals: [],
      confirmedLinkKeys: new Set(),
      workflowChecks: [failCheck("shared-lead")],
    });
    expect(result.satisfied).toBe(false);
    const workflowResult = result.results.find(
      (r) => r.ruleId === "workflow-checks",
    );
    expect(workflowResult?.satisfied).toBe(false);
  });

  it("blocks completion even when every other completion rule is satisfied", () => {
    const rule = {
      kind: "no_failing_checks",
      id: "axis-clean",
      roleIds: ["axis"],
    } as const;
    const definition = { ...baseDefinition(), completionRules: [rule] };
    const result = evaluateCompletion({
      definition,
      instances: [
        instance({
          computation: fixtureComputation({ checks: [passCheck("x")] }),
        }),
      ],
      proposals: [],
      confirmedLinkKeys: new Set(),
      workflowChecks: [failCheck("shared-lead")],
    });
    expect(result.satisfied).toBe(false);
  });
});

describe("evaluateCompletion — conditional_acknowledgment", () => {
  const rule = {
    kind: "conditional_acknowledgment",
    id: "vertical-holding",
    roleId: "axis",
    parameterId: ORIENTATION,
    whenValue: "vertical",
    acknowledgmentId: "vertical-holding-response",
  } as const;

  const orientationPorts: ModulePorts = {
    inputs: [{ key: "orientation", parameterId: ORIENTATION, required: true }],
    outputs: [],
  };

  it("is satisfied when the condition does not apply", () => {
    const definition = { ...baseDefinition(), completionRules: [rule] };
    const result = evaluateCompletion({
      definition,
      instances: [
        instance({
          ports: orientationPorts,
          inputValues: {
            orientation: enumValue("axis_orientation", "horizontal"),
          },
        }),
      ],
      proposals: [],
      confirmedLinkKeys: new Set(),
    });
    expect(result.satisfied).toBe(true);
  });

  it("is not satisfied when vertical and no acknowledgment is recorded", () => {
    const definition = { ...baseDefinition(), completionRules: [rule] };
    const result = evaluateCompletion({
      definition,
      instances: [
        instance({
          ports: orientationPorts,
          inputValues: {
            orientation: enumValue("axis_orientation", "vertical"),
          },
        }),
      ],
      proposals: [],
      confirmedLinkKeys: new Set(),
    });
    expect(result.satisfied).toBe(false);
  });

  it("is satisfied when vertical and the acknowledgment is recorded", () => {
    const definition = { ...baseDefinition(), completionRules: [rule] };
    const result = evaluateCompletion({
      definition,
      instances: [
        instance({
          ports: orientationPorts,
          inputValues: {
            orientation: enumValue("axis_orientation", "vertical"),
          },
        }),
      ],
      proposals: [],
      confirmedLinkKeys: new Set(),
      assumptions: [
        { id: "vertical-holding-response", statement: "Brake holds the load." },
      ],
    });
    expect(result.satisfied).toBe(true);
  });
});
