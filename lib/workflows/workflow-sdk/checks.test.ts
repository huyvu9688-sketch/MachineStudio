import { describe, expect, it } from "vitest";
import {
  asLinkId,
  asNodeId,
  asParameterId,
  asScopeId,
  buildParameterGraph,
  type GraphNode,
  type ModulePorts,
  type ParameterGraph,
} from "@/lib/engine";
import { evaluateWorkflowChecks } from "./checks";
import { instancePortNodeId } from "./links";
import type {
  WorkflowCheckRule,
  WorkflowDefinition,
  WorkflowRoleInstance,
} from "./types";

const LEAD = asParameterId("screw.lead");
const SCOPE = asScopeId("axis-1");

const leadInputPorts: ModulePorts = {
  inputs: [{ key: "lead", parameterId: LEAD, required: true }],
  outputs: [],
};

const screwInstance: WorkflowRoleInstance = {
  instanceId: "screw-1",
  roleId: "screw",
  moduleId: "ball-screw",
  ports: leadInputPorts,
};

const couplingInstance: WorkflowRoleInstance = {
  instanceId: "coupling-1",
  roleId: "coupling",
  moduleId: "coupling",
  ports: leadInputPorts,
};

const rule: WorkflowCheckRule = {
  kind: "shared_value_topology",
  id: "shared-lead",
  parameterId: LEAD,
  roleIds: ["screw", "coupling"],
};

function definitionWith(
  rules: readonly WorkflowCheckRule[],
): WorkflowDefinition {
  return {
    manifest: { id: "test", version: "1.0.0", title: "t", description: "t" },
    roles: [],
    sequence: [],
    linkRules: [],
    completionRules: [],
    checkRules: rules,
    comparisonCriteria: [],
  };
}

function assemblyParamNode(id: string): GraphNode {
  return {
    id: asNodeId(id),
    kind: "assembly_parameter",
    parameterId: LEAD,
    scopeId: SCOPE,
  };
}

describe("evaluateWorkflowChecks — shared_value_topology", () => {
  it("is not_applicable when fewer than two present instances declare the parameter", () => {
    const graph: ParameterGraph = {
      scopes: [{ id: SCOPE }],
      nodes: [],
      links: [],
    };
    const result = evaluateWorkflowChecks({
      definition: definitionWith([rule]),
      instances: [screwInstance],
      graph: buildParameterGraph(graph),
    });
    expect(result[0]?.status).toBe("not_applicable");
  });

  it("fails when one instance's port has no confirmed link at all", () => {
    const source = assemblyParamNode("assembly.lead");
    const screwNode: GraphNode = {
      id: instancePortNodeId("screw-1", "lead"),
      kind: "module_input",
      parameterId: LEAD,
      scopeId: SCOPE,
      moduleInstanceId: "screw-1",
    };
    const couplingNode: GraphNode = {
      id: instancePortNodeId("coupling-1", "lead"),
      kind: "module_input",
      parameterId: LEAD,
      scopeId: SCOPE,
      moduleInstanceId: "coupling-1",
    };
    const graph: ParameterGraph = {
      scopes: [{ id: SCOPE }],
      nodes: [source, screwNode, couplingNode],
      links: [
        {
          id: asLinkId("l1"),
          sourceNodeId: source.id,
          targetNodeId: screwNode.id,
        },
        // coupling's lead input is left unlinked (manual entry).
      ],
    };
    const result = evaluateWorkflowChecks({
      definition: definitionWith([rule]),
      instances: [screwInstance, couplingInstance],
      graph: buildParameterGraph(graph),
    });
    expect(result[0]?.status).toBe("fail");
  });

  it("fails when two instances link to different sources — a real divergence", () => {
    const sourceA = assemblyParamNode("assembly.lead-a");
    const sourceB = assemblyParamNode("assembly.lead-b");
    const screwNode: GraphNode = {
      id: instancePortNodeId("screw-1", "lead"),
      kind: "module_input",
      parameterId: LEAD,
      scopeId: SCOPE,
      moduleInstanceId: "screw-1",
    };
    const couplingNode: GraphNode = {
      id: instancePortNodeId("coupling-1", "lead"),
      kind: "module_input",
      parameterId: LEAD,
      scopeId: SCOPE,
      moduleInstanceId: "coupling-1",
    };
    const graph: ParameterGraph = {
      scopes: [{ id: SCOPE }],
      nodes: [sourceA, sourceB, screwNode, couplingNode],
      links: [
        {
          id: asLinkId("l1"),
          sourceNodeId: sourceA.id,
          targetNodeId: screwNode.id,
        },
        {
          id: asLinkId("l2"),
          sourceNodeId: sourceB.id,
          targetNodeId: couplingNode.id,
        },
      ],
    };
    const result = evaluateWorkflowChecks({
      definition: definitionWith([rule]),
      instances: [screwInstance, couplingInstance],
      graph: buildParameterGraph(graph),
    });
    expect(result[0]?.status).toBe("fail");
  });

  it("passes when every instance links to the identical source", () => {
    const source = assemblyParamNode("assembly.lead");
    const screwNode: GraphNode = {
      id: instancePortNodeId("screw-1", "lead"),
      kind: "module_input",
      parameterId: LEAD,
      scopeId: SCOPE,
      moduleInstanceId: "screw-1",
    };
    const couplingNode: GraphNode = {
      id: instancePortNodeId("coupling-1", "lead"),
      kind: "module_input",
      parameterId: LEAD,
      scopeId: SCOPE,
      moduleInstanceId: "coupling-1",
    };
    const graph: ParameterGraph = {
      scopes: [{ id: SCOPE }],
      nodes: [source, screwNode, couplingNode],
      links: [
        {
          id: asLinkId("l1"),
          sourceNodeId: source.id,
          targetNodeId: screwNode.id,
        },
        {
          id: asLinkId("l2"),
          sourceNodeId: source.id,
          targetNodeId: couplingNode.id,
        },
      ],
    };
    const result = evaluateWorkflowChecks({
      definition: definitionWith([rule]),
      instances: [screwInstance, couplingInstance],
      graph: buildParameterGraph(graph),
    });
    expect(result[0]?.status).toBe("pass");
  });
});
