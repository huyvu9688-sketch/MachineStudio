import { describe, expect, it } from "vitest";
import { asParameterId } from "../parameters";
import { buildParameterGraph } from "./graph";
import { suggestSources } from "./suggest";
import {
  asLinkId,
  asNodeId,
  asScopeId,
  type GraphNode,
  type GraphNodeKind,
  type ParameterGraph,
} from "./types";

const MACHINE = asScopeId("machine");
const ASM_X = asScopeId("asmX");
const ASM_Y = asScopeId("asmY");

const TF = "motion.axis.thrust_force";

function n(
  id: string,
  kind: GraphNodeKind,
  param: string,
  scope: ReturnType<typeof asScopeId>,
  moduleInstanceId?: string,
): GraphNode {
  return {
    id: asNodeId(id),
    kind,
    parameterId: asParameterId(param),
    scopeId: scope,
    ...(moduleInstanceId !== undefined && { moduleInstanceId }),
  };
}

/**
 * Sink `k` (consumer.in, thrust force, in asmX) plus candidate sources:
 * an in-scope output, an ancestor assembly parameter, a sibling-assembly output,
 * an incompatible in-scope output, and a downstream output (would cycle).
 */
function baseGraph(includeSameScope = true): ParameterGraph {
  const nodes: GraphNode[] = [
    n("k", "module_input", TF, ASM_X, "consumer"),
    n("k_out", "module_output", TF, ASM_X, "consumer"),
    n("s_parent", "assembly_parameter", TF, MACHINE),
    n("s_sib", "module_output", TF, ASM_Y, "prodY"),
    n("s_bad", "module_output", "motion.axis.payload_mass", ASM_X, "prodBad"),
    n("d_in", "module_input", TF, ASM_X, "down"),
    n("d_out", "module_output", TF, ASM_X, "down"),
  ];
  if (includeSameScope) {
    nodes.push(n("s_same", "module_output", TF, ASM_X, "prodSame"));
  }
  return {
    scopes: [
      { id: MACHINE },
      { id: ASM_X, parentId: MACHINE },
      { id: ASM_Y, parentId: MACHINE },
    ],
    nodes,
    // consumer.out feeds down.in, so down.out is downstream of the sink.
    links: [link("L_cd", "k_out", "d_in")],
  };
}

function link(id: string, from: string, to: string) {
  return {
    id: asLinkId(id),
    sourceNodeId: asNodeId(from),
    targetNodeId: asNodeId(to),
  };
}

describe("suggestSources — scope proximity", () => {
  it("prefers a same-assembly source over an ancestor source", () => {
    const indexed = buildParameterGraph(baseGraph());
    const ranked = suggestSources(indexed, asNodeId("k")).map(
      (s) => s.sourceNodeId,
    );
    expect(ranked).toEqual(["s_same", "s_parent"]);
  });

  it("falls back to a parent-scope source when none is in scope", () => {
    const indexed = buildParameterGraph(baseGraph(false));
    const suggestions = suggestSources(indexed, asNodeId("k"));
    expect(suggestions.map((s) => s.sourceNodeId)).toEqual(["s_parent"]);
    expect(suggestions[0].scopeDistance).toBe(1);
    expect(suggestions[0].origin).toBe("scope");
  });

  it("includes an explicitly exposed cross-assembly source, ranked last", () => {
    const indexed = buildParameterGraph(baseGraph());
    const suggestions = suggestSources(indexed, asNodeId("k"), {
      crossAssemblySourceIds: [asNodeId("s_sib")],
    });
    expect(suggestions.map((s) => s.sourceNodeId)).toEqual([
      "s_same",
      "s_parent",
      "s_sib",
    ]);
    const sibling = suggestions.find((s) => s.sourceNodeId === "s_sib");
    expect(sibling?.origin).toBe("cross_assembly");
  });

  it("hides a sibling-assembly source that is not exposed", () => {
    const indexed = buildParameterGraph(baseGraph());
    const ids = suggestSources(indexed, asNodeId("k")).map(
      (s) => s.sourceNodeId,
    );
    expect(ids).not.toContain("s_sib");
  });
});

describe("suggestSources — filtering", () => {
  it("skips semantically incompatible sources", () => {
    const indexed = buildParameterGraph(baseGraph());
    const ids = suggestSources(indexed, asNodeId("k")).map(
      (s) => s.sourceNodeId,
    );
    expect(ids).not.toContain("s_bad");
  });

  it("skips sources that would create a cycle", () => {
    const indexed = buildParameterGraph(baseGraph());
    const ids = suggestSources(indexed, asNodeId("k")).map(
      (s) => s.sourceNodeId,
    );
    // consumer's own output and the downstream module's output both cycle.
    expect(ids).not.toContain("k_out");
    expect(ids).not.toContain("d_out");
  });

  it("returns nothing for a non-input node", () => {
    const indexed = buildParameterGraph(baseGraph());
    expect(suggestSources(indexed, asNodeId("s_parent"))).toEqual([]);
    expect(suggestSources(indexed, asNodeId("unknown"))).toEqual([]);
  });
});
