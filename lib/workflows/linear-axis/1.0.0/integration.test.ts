// End-to-end exercise of linear-axis@1.0.0: assembles all seven modules'
// real ports into one 8-instance fixture (support-bearing appears twice —
// fixed and supported), resolves link proposals, assembles a real
// ParameterGraph from them, and exercises evaluateWorkflowChecks,
// evaluateCompletion, and evaluateWorkflowStatus together the way the
// (future) application layer eventually will.

import { describe, expect, it } from "vitest";
import {
  asLinkId,
  asNodeId,
  asScopeId,
  buildParameterGraph,
  type GraphLink,
  type GraphNode,
  type ParameterGraph,
} from "@/lib/engine";
import {
  evaluateCompletion,
  evaluateWorkflowChecks,
  evaluateWorkflowStatus,
  instancePortNodeId,
  linkProposalKey,
  resolveLinkProposals,
  type WorkflowInstanceContext,
  type WorkflowLinkProposal,
  type WorkflowRoleInstance,
} from "@/lib/workflows/workflow-sdk";
import {
  enumValue,
  fixtureComputation,
  passCheck,
} from "@/lib/workflows/workflow-sdk/test-support";
import {
  linearAxisDefinition,
  VERTICAL_HOLDING_ACKNOWLEDGMENT_ID,
} from "./definition";

import { ports as axisPorts } from "@/lib/modules/axis-load-cases/0.1.0/manifest";
import { ports as motionPorts } from "@/lib/modules/motion-profile/0.1.0/manifest";
import { ports as screwPorts } from "@/lib/modules/ball-screw/0.1.0/manifest";
import { ports as guidePorts } from "@/lib/modules/linear-guide/0.1.0/manifest";
import { ports as couplingPorts } from "@/lib/modules/coupling/0.1.0/manifest";
import { ports as bearingPorts } from "@/lib/modules/support-bearing/0.1.0/manifest";
import { ports as drivePorts } from "@/lib/modules/drive-train/0.1.0/manifest";

const SCOPE = asScopeId("axis-1-scope");

const ROLE_INSTANCES: readonly WorkflowRoleInstance[] = [
  {
    instanceId: "axis-1",
    roleId: "linear-axis.axis",
    moduleId: "axis-load-cases",
    ports: axisPorts,
  },
  {
    instanceId: "motion-1",
    roleId: "linear-axis.motion",
    moduleId: "motion-profile",
    ports: motionPorts,
  },
  {
    instanceId: "screw-1",
    roleId: "linear-axis.screw",
    moduleId: "ball-screw",
    ports: screwPorts,
  },
  {
    instanceId: "guide-1",
    roleId: "linear-axis.guide",
    moduleId: "linear-guide",
    ports: guidePorts,
  },
  {
    instanceId: "coupling-1",
    roleId: "linear-axis.coupling",
    moduleId: "coupling",
    ports: couplingPorts,
  },
  {
    instanceId: "bearing-fixed",
    roleId: "linear-axis.bearing",
    moduleId: "support-bearing",
    ports: bearingPorts,
  },
  {
    instanceId: "bearing-supported",
    roleId: "linear-axis.bearing",
    moduleId: "support-bearing",
    ports: bearingPorts,
  },
  {
    instanceId: "drive-1",
    roleId: "linear-axis.drive",
    moduleId: "drive-train",
    ports: drivePorts,
  },
];

function instanceById(instanceId: string): WorkflowRoleInstance {
  const found = ROLE_INSTANCES.find((i) => i.instanceId === instanceId);
  if (found === undefined) throw new Error(`Unknown instance "${instanceId}".`);
  return found;
}

function portNode(
  instance: WorkflowRoleInstance,
  direction: "input" | "output",
  portKey: string,
): GraphNode {
  const list =
    direction === "input" ? instance.ports.inputs : instance.ports.outputs;
  const port = list.find((p) => p.key === portKey);
  if (port === undefined) {
    throw new Error(
      `Port "${portKey}" (${direction}) not found on instance "${instance.instanceId}".`,
    );
  }
  return {
    id: instancePortNodeId(instance.instanceId, portKey),
    kind: direction === "input" ? "module_input" : "module_output",
    parameterId: port.parameterId,
    scopeId: SCOPE,
    moduleInstanceId: instance.instanceId,
    ...(port.loadCase !== undefined && { loadCase: port.loadCase }),
  };
}

function linkForProposal(
  proposal: WorkflowLinkProposal,
  index: number,
): {
  readonly nodes: readonly GraphNode[];
  readonly link: GraphLink;
} {
  const source = portNode(
    instanceById(proposal.fromInstanceId),
    "output",
    proposal.fromPortKey,
  );
  const sink = portNode(
    instanceById(proposal.toInstanceId),
    "input",
    proposal.toPortKey,
  );
  return {
    nodes: [source, sink],
    link: {
      id: asLinkId(`proposal-${index}`),
      sourceNodeId: source.id,
      targetNodeId: sink.id,
    },
  };
}

/** A shared assembly-level source feeding the same input port key on several instances. */
function sharedValueLinks(
  sourceNodeId: string,
  parameterId: GraphNode["parameterId"],
  consumers: readonly { instanceId: string; portKey: string }[],
  linkIdPrefix: string,
): {
  readonly nodes: readonly GraphNode[];
  readonly links: readonly GraphLink[];
} {
  const source: GraphNode = {
    id: asNodeId(sourceNodeId),
    kind: "assembly_parameter",
    parameterId,
    scopeId: SCOPE,
  };
  const sinkNodes = consumers.map((c) =>
    portNode(instanceById(c.instanceId), "input", c.portKey),
  );
  const links = consumers.map((c, i) => ({
    id: asLinkId(`${linkIdPrefix}-${i}`),
    sourceNodeId: source.id,
    targetNodeId: instancePortNodeId(c.instanceId, c.portKey),
  }));
  return { nodes: [source, ...sinkNodes], links };
}

const proposals = resolveLinkProposals(linearAxisDefinition, ROLE_INSTANCES);

describe("linear-axis@1.0.0 link proposals", () => {
  it("resolves at least one proposal for every declared link rule", () => {
    const ruleIdsWithProposals = new Set(proposals.map((p) => p.ruleId));
    for (const rule of linearAxisDefinition.linkRules) {
      expect(ruleIdsWithProposals.has(rule.id)).toBe(true);
    }
  });

  it("proposes the axis-thrust-to-bearing link to both bearing instances", () => {
    const toBearing = proposals.filter(
      (p) => p.ruleId === "axis-thrust-to-bearing",
    );
    const toInstanceIds = new Set(toBearing.map((p) => p.toInstanceId));
    expect(toInstanceIds).toEqual(
      new Set(["bearing-fixed", "bearing-supported"]),
    );
  });
});

function buildFullGraph(): ParameterGraph {
  const proposalParts = proposals.map((p, i) => linkForProposal(p, i));
  const orientation = sharedValueLinks(
    "assembly.orientation",
    axisPorts.inputs.find((p) => p.key === "orientation")!.parameterId,
    [
      { instanceId: "axis-1", portKey: "orientation" },
      { instanceId: "guide-1", portKey: "orientation" },
    ],
    "orientation",
  );
  const lead = sharedValueLinks(
    "assembly.lead",
    screwPorts.inputs.find((p) => p.key === "lead")!.parameterId,
    [
      { instanceId: "screw-1", portKey: "lead" },
      { instanceId: "coupling-1", portKey: "lead" },
      { instanceId: "bearing-fixed", portKey: "lead" },
      { instanceId: "bearing-supported", portKey: "lead" },
      { instanceId: "drive-1", portKey: "lead" },
    ],
    "lead",
  );
  const gearRatio = sharedValueLinks(
    "assembly.gear-ratio",
    screwPorts.inputs.find((p) => p.key === "gear_ratio")!.parameterId,
    [
      { instanceId: "screw-1", portKey: "gear_ratio" },
      { instanceId: "coupling-1", portKey: "gear_ratio" },
      { instanceId: "drive-1", portKey: "gear_ratio" },
    ],
    "gear-ratio",
  );

  const nodesById = new Map<string, GraphNode>();
  for (const part of [
    ...proposalParts.flatMap((p) => p.nodes),
    ...orientation.nodes,
    ...lead.nodes,
    ...gearRatio.nodes,
  ]) {
    nodesById.set(part.id, part);
  }

  return {
    scopes: [{ id: SCOPE }],
    nodes: [...nodesById.values()],
    links: [
      ...proposalParts.map((p) => p.link),
      ...orientation.links,
      ...lead.links,
      ...gearRatio.links,
    ],
  };
}

describe("linear-axis@1.0.0 workflow-level checks", () => {
  it("passes every shared-value check when every consumer links to the identical source", () => {
    const indexed = buildParameterGraph(buildFullGraph());
    const results = evaluateWorkflowChecks({
      definition: linearAxisDefinition,
      instances: ROLE_INSTANCES,
      graph: indexed,
    });
    for (const result of results) {
      expect(result.status).toBe("pass");
    }
  });

  it("fails shared-lead when one consumer's lead input links to a different source", () => {
    const graph = buildFullGraph();
    const divergedSourceId = asNodeId("assembly.a-different-lead-source");
    const targetLinkId = asLinkId("lead-4");
    const divergedLinks: GraphLink[] = graph.links.map((link) =>
      link.id === targetLinkId
        ? { ...link, sourceNodeId: divergedSourceId }
        : link,
    );
    const divergedNode: GraphNode = {
      id: divergedSourceId,
      kind: "assembly_parameter",
      parameterId: screwPorts.inputs.find((p) => p.key === "lead")!.parameterId,
      scopeId: SCOPE,
    };
    const indexed = buildParameterGraph({
      ...graph,
      nodes: [...graph.nodes, divergedNode],
      links: divergedLinks,
    });
    const results = evaluateWorkflowChecks({
      definition: linearAxisDefinition,
      instances: ROLE_INSTANCES,
      graph: indexed,
    });
    const sharedLead = results.find((r) => r.id === "shared-lead");
    expect(sharedLead?.status).toBe("fail");
  });
});

function contextsWith(
  overrides: Partial<Record<string, Partial<WorkflowInstanceContext>>>,
): WorkflowInstanceContext[] {
  return ROLE_INSTANCES.map((instance) => ({
    ...instance,
    inputValues: {},
    computation: fixtureComputation({ checks: [passCheck("ok")] }),
    ...overrides[instance.instanceId],
  }));
}

describe("linear-axis@1.0.0 completion and status", () => {
  const allConfirmed = new Set(proposals.map(linkProposalKey));

  it("is completed once every role is present, every link confirmed, no checks fail, and orientation is horizontal", () => {
    const instances = contextsWith({
      "axis-1": {
        inputValues: {
          orientation: enumValue("axis_orientation", "horizontal"),
        },
      },
    });
    const completion = evaluateCompletion({
      definition: linearAxisDefinition,
      instances,
      proposals,
      confirmedLinkKeys: allConfirmed,
    });
    expect(completion.satisfied).toBe(true);
    expect(evaluateWorkflowStatus({ instances, completion })).toBe("completed");
  });

  it("is not completed when vertical and the holding acknowledgment is missing", () => {
    const instances = contextsWith({
      "axis-1": {
        inputValues: { orientation: enumValue("axis_orientation", "vertical") },
      },
    });
    const completion = evaluateCompletion({
      definition: linearAxisDefinition,
      instances,
      proposals,
      confirmedLinkKeys: allConfirmed,
    });
    expect(completion.satisfied).toBe(false);
    const rule = completion.results.find(
      (r) => r.ruleId === "vertical-holding-acknowledged",
    );
    expect(rule?.satisfied).toBe(false);
    expect(evaluateWorkflowStatus({ instances, completion })).toBe("active");
  });

  it("is completed once vertical and the holding acknowledgment is recorded", () => {
    const instances = contextsWith({
      "axis-1": {
        inputValues: { orientation: enumValue("axis_orientation", "vertical") },
      },
    });
    const completion = evaluateCompletion({
      definition: linearAxisDefinition,
      instances,
      proposals,
      confirmedLinkKeys: allConfirmed,
      assumptions: [
        {
          id: VERTICAL_HOLDING_ACKNOWLEDGMENT_ID,
          statement:
            "Holding brake sized to hold the vertical payload at rest.",
        },
      ],
    });
    expect(completion.satisfied).toBe(true);
    expect(evaluateWorkflowStatus({ instances, completion })).toBe("completed");
  });

  it("is draft with no instances and active once instances are present but incomplete", () => {
    const noInstancesCompletion = evaluateCompletion({
      definition: linearAxisDefinition,
      instances: [],
      proposals: [],
      confirmedLinkKeys: new Set(),
    });
    expect(
      evaluateWorkflowStatus({
        instances: [],
        completion: noInstancesCompletion,
      }),
    ).toBe("draft");

    const partialInstances = contextsWith({}).slice(0, 1);
    const partialCompletion = evaluateCompletion({
      definition: linearAxisDefinition,
      instances: partialInstances,
      proposals: [],
      confirmedLinkKeys: new Set(),
    });
    expect(
      evaluateWorkflowStatus({
        instances: partialInstances,
        completion: partialCompletion,
      }),
    ).toBe("active");
  });
});
