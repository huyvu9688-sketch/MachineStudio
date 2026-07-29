import { describe, expect, it } from "vitest";
import { asParameterId } from "../parameters";
import { ParameterGraphError } from "./errors";
import {
  buildParameterGraph,
  computeStaleImpact,
  downstreamNodeIds,
  wouldCreateCycle,
} from "./graph";
import {
  asLinkId,
  asNodeId,
  asScopeId,
  type GraphLink,
  type GraphNode,
  type GraphNodeKind,
  type ParameterGraph,
} from "./types";

const AXIS = asScopeId("axis");

function n(
  id: string,
  kind: GraphNodeKind,
  param: string,
  moduleInstanceId?: string,
): GraphNode {
  return {
    id: asNodeId(id),
    kind,
    parameterId: asParameterId(param),
    scopeId: AXIS,
    ...(moduleInstanceId !== undefined && { moduleInstanceId }),
  };
}

function link(id: string, from: string, to: string): GraphLink {
  return { id: asLinkId(id), sourceNodeId: asNodeId(from), targetNodeId: asNodeId(to) };
}

/** A two-module chain: req → modA(in→out) → modB(in→out). */
function chainGraph(): ParameterGraph {
  return {
    scopes: [{ id: AXIS }],
    nodes: [
      n("req", "machine_requirement", "motion.axis.payload_mass"),
      n("a_in", "module_input", "motion.axis.payload_mass", "modA"),
      n("a_out", "module_output", "motion.axis.thrust_force", "modA"),
      n("b_in", "module_input", "motion.axis.thrust_force", "modB"),
      n("b_out", "module_output", "motion.axis.thrust_force", "modB"),
    ],
    links: [link("L1", "req", "a_in"), link("L2", "a_out", "b_in")],
  };
}

function expectGraphError(fn: () => unknown, code: ParameterGraphError["code"]): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ParameterGraphError);
    expect((error as ParameterGraphError).code).toBe(code);
    return;
  }
  throw new Error(`expected ParameterGraphError(${code})`);
}

describe("buildParameterGraph — integrity", () => {
  it("builds a valid graph", () => {
    const indexed = buildParameterGraph(chainGraph());
    expect(indexed.nodeById.size).toBe(5);
  });

  it("rejects a duplicate node ID", () => {
    const g = chainGraph();
    const nodes = [...g.nodes, n("req", "machine_requirement", "motion.axis.payload_mass")];
    expectGraphError(() => buildParameterGraph({ ...g, nodes }), "duplicate_id");
  });

  it("rejects a node in an unknown scope", () => {
    const g = chainGraph();
    const bad: GraphNode = { ...g.nodes[0], scopeId: asScopeId("nope") };
    expectGraphError(
      () => buildParameterGraph({ ...g, nodes: [bad, ...g.nodes.slice(1)] }),
      "unknown_scope",
    );
  });

  it("rejects a module port with no module instance", () => {
    const g = chainGraph();
    const bad = n("a_in", "module_input", "motion.axis.payload_mass"); // no module
    const nodes = [g.nodes[0], bad, ...g.nodes.slice(2)];
    expectGraphError(() => buildParameterGraph({ ...g, nodes }), "missing_module_instance");
  });

  it("rejects a link targeting a non-input node", () => {
    const g = chainGraph();
    const links = [...g.links, link("L3", "req", "a_out")]; // a_out is an output
    expectGraphError(() => buildParameterGraph({ ...g, links }), "invalid_link_target");
  });

  it("rejects a link whose source is a module input", () => {
    const g = chainGraph();
    const links = [...g.links, link("L3", "a_in", "b_in")]; // a_in is an input
    expectGraphError(() => buildParameterGraph({ ...g, links }), "invalid_link_source");
  });

  it("rejects a link to an unknown node", () => {
    const g = chainGraph();
    const links = [...g.links, link("L3", "req", "ghost")];
    expectGraphError(() => buildParameterGraph({ ...g, links }), "unknown_node");
  });

  it("rejects an unknown scope parent", () => {
    const g = chainGraph();
    const scopes = [{ id: AXIS, parentId: asScopeId("ghost") }];
    expectGraphError(() => buildParameterGraph({ ...g, scopes }), "unknown_scope_parent");
  });

  it("rejects a scope hierarchy cycle", () => {
    const s1 = asScopeId("s1");
    const s2 = asScopeId("s2");
    const g: ParameterGraph = {
      scopes: [
        { id: s1, parentId: s2 },
        { id: s2, parentId: s1 },
      ],
      nodes: [],
      links: [],
    };
    expectGraphError(() => buildParameterGraph(g), "scope_cycle");
  });
});

describe("downstream resolution and stale impact", () => {
  it("resolves multi-level downstream nodes", () => {
    const indexed = buildParameterGraph(chainGraph());
    const downstream = downstreamNodeIds(indexed, [asNodeId("req")]);
    expect(downstream).toEqual(["a_in", "a_out", "b_in", "b_out"]);
  });

  it("marks every downstream module instance stale", () => {
    const indexed = buildParameterGraph(chainGraph());
    const impact = computeStaleImpact(indexed, [asNodeId("req")]);
    expect(impact.staleModuleInstanceIds).toEqual(["modA", "modB"]);
  });

  it("propagates from an intermediate output, not upstream", () => {
    const indexed = buildParameterGraph(chainGraph());
    const impact = computeStaleImpact(indexed, [asNodeId("a_out")]);
    expect(impact.downstreamNodeIds).toEqual(["b_in", "b_out"]);
    expect(impact.staleModuleInstanceIds).toEqual(["modB"]);
  });
});

describe("wouldCreateCycle", () => {
  it("rejects a self link", () => {
    const indexed = buildParameterGraph(chainGraph());
    expect(wouldCreateCycle(indexed, asNodeId("a_in"), asNodeId("a_in"))).toBe(true);
  });

  it("detects a transitive cycle through module-internal edges", () => {
    const indexed = buildParameterGraph(chainGraph());
    // b_out already feeds nothing, but a_in → a_out → b_in → b_out, so linking
    // b_out → a_in would close a loop.
    expect(wouldCreateCycle(indexed, asNodeId("b_out"), asNodeId("a_in"))).toBe(true);
  });

  it("allows a link that does not close a loop", () => {
    const indexed = buildParameterGraph(chainGraph());
    expect(wouldCreateCycle(indexed, asNodeId("req"), asNodeId("b_in"))).toBe(false);
  });
});
