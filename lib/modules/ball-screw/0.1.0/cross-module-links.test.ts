// Cross-module link compatibility tests (roadmap Module Definition of Done
// item 13) for ball-screw 0.1.0's actual input ports against axis-load-cases
// 0.1.0's actual output ports — the only upstream module ball-screw's own
// ports can link to today. Uses the real engine link-compatibility evaluator
// (lib/engine/graph/compatibility.ts) against each module's real manifest.ts
// ports, not hand-typed parameter-id strings — the first per-module-pair
// test of its kind in this codebase (lib/engine/graph/compatibility.test.ts
// only exercises the generic algorithm with synthetic nodes).
//
// motion-profile 0.1.0's own outputs (cycle_time, peak_velocity,
// peak_acceleration, peak_deceleration, rms_acceleration) are not
// motion.axis.* parameters, so it has no port that links to any ball-screw
// input today — not tested here because there is nothing to test.

import { describe, expect, it } from "vitest";
import {
  asNodeId,
  asScopeId,
  evaluateLinkCompatibility,
  type GraphNode,
  type ModuleInputPort,
  type ModuleOutputPort,
} from "@/lib/engine";
import { linearAxisDefinition } from "@/lib/workflows/linear-axis/1.0.0/definition";
import {
  manifest as ballScrewManifest,
  ports as ballScrewPorts,
} from "./manifest";
import { ports as axisLoadCasesPorts } from "../../axis-load-cases/0.1.0/manifest";

const SCOPE = asScopeId("test-scope");

function outputNode(
  port: ModuleOutputPort,
  moduleInstanceId: string,
): GraphNode {
  return {
    id: asNodeId(`${moduleInstanceId}.${port.key}`),
    kind: "module_output",
    parameterId: port.parameterId,
    scopeId: SCOPE,
    moduleInstanceId,
    ...(port.loadCase !== undefined && { loadCase: port.loadCase }),
  };
}

function inputNode(port: ModuleInputPort, moduleInstanceId: string): GraphNode {
  return {
    id: asNodeId(`${moduleInstanceId}.${port.key}`),
    kind: "module_input",
    parameterId: port.parameterId,
    scopeId: SCOPE,
    moduleInstanceId,
    ...(port.loadCase !== undefined && { loadCase: port.loadCase }),
  };
}

function findPort<T extends { key: string }>(
  ports: readonly T[],
  key: string,
): T {
  const found = ports.find((p) => p.key === key);
  if (found === undefined) {
    throw new Error(`Port "${key}" not found in the supplied port list.`);
  }
  return found;
}

describe("axis-load-cases 0.1.0 -> ball-screw 0.1.0 link compatibility", () => {
  it("links normal_thrust_force to normal_thrust_force (same parameter, same load case)", () => {
    const source = outputNode(
      findPort(axisLoadCasesPorts.outputs, "normal_thrust_force"),
      "axis-load-cases-1",
    );
    const sink = inputNode(
      findPort(ballScrewPorts.inputs, "normal_thrust_force"),
      "ball-screw-1",
    );
    const result = evaluateLinkCompatibility(source, sink);
    expect(result.compatible).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("links peak_thrust_force to peak_thrust_force (same parameter, same load case)", () => {
    const source = outputNode(
      findPort(axisLoadCasesPorts.outputs, "peak_thrust_force"),
      "axis-load-cases-1",
    );
    const sink = inputNode(
      findPort(ballScrewPorts.inputs, "peak_thrust_force"),
      "ball-screw-1",
    );
    const result = evaluateLinkCompatibility(source, sink);
    expect(result.compatible).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("rejects normal_thrust_force feeding the peak sink — load case must match, not just parameter identity", () => {
    const source = outputNode(
      findPort(axisLoadCasesPorts.outputs, "normal_thrust_force"),
      "axis-load-cases-1",
    );
    const sink = inputNode(
      findPort(ballScrewPorts.inputs, "peak_thrust_force"),
      "ball-screw-1",
    );
    const result = evaluateLinkCompatibility(source, sink);
    expect(result.compatible).toBe(false);
    expect(result.reasons).toEqual(["load_case"]);
  });

  it("has no axis-load-cases output compatible with case_time_fraction or case_linear_velocity — a known, documented gap, confirmed here rather than assumed", () => {
    // context/modules/ball-screw/stage-2-contract.md: no upstream module
    // produces motion.axis.case_time_fraction or
    // motion.axis.case_linear_velocity yet. This asserts that gap against
    // axis-load-cases' real output ports instead of trusting the spec
    // document alone — if a future axis-load-cases version starts producing
    // one of these parameters, this test will start failing and needs
    // re-examining, not silently pass.
    const candidateSources = axisLoadCasesPorts.outputs.map((port) =>
      outputNode(port, "axis-load-cases-1"),
    );
    const sinks = [
      inputNode(
        findPort(ballScrewPorts.inputs, "normal_time_fraction"),
        "ball-screw-1",
      ),
      inputNode(
        findPort(ballScrewPorts.inputs, "normal_linear_velocity"),
        "ball-screw-1",
      ),
    ];
    for (const sink of sinks) {
      const anyCompatible = candidateSources.some(
        (source) => evaluateLinkCompatibility(source, sink).compatible,
      );
      expect(anyCompatible).toBe(false);
    }
  });
});

describe("linear-axis@1 workflow role (Unit 4.8)", () => {
  it("declares a workflowRoles entry matching a real linear-axis@1 role", () => {
    const roleIds = new Set(linearAxisDefinition.roles.map((r) => r.id));
    expect(ballScrewManifest.workflowRoles.length).toBeGreaterThan(0);
    for (const roleId of ballScrewManifest.workflowRoles) {
      expect(roleIds.has(roleId)).toBe(true);
    }
  });
});
