// Cross-module link compatibility tests (roadmap Module Definition of Done
// item 13) for linear-guide 0.1.0's actual input ports against
// axis-load-cases 0.1.0's actual output ports. Uses the real engine
// link-compatibility evaluator (lib/engine/graph/compatibility.ts) against
// each module's real manifest.ts ports, not hand-typed parameter-id strings —
// the same approach lib/modules/ball-screw/0.1.0/cross-module-links.test.ts
// established.
//
// This pair matters more than most: registry 1.4.0 added
// motion.axis.resultant_force and motion.axis.resultant_moment to
// axis-load-cases specifically so this module could consume them
// (context/modules/linear-guide/stage-1-spec.md "A Real, Already-Documented
// Dependency Gap"). These tests confirm that link actually evaluates as
// compatible through the real graph rules, rather than trusting the two
// manifests to agree because the same session wrote both.
//
// ball-screw 0.1.0's own outputs are all screw.* parameters and motion-profile
// 0.1.0's are all motion.profile.*, so neither has a port that links to any
// linear-guide input today — not tested here because there is nothing to test.

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
  manifest as linearGuideManifest,
  ports as linearGuidePorts,
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

describe("axis-load-cases 0.1.0 -> linear-guide 0.1.0 link compatibility", () => {
  for (const loadCase of ["normal", "peak"] as const) {
    for (const quantity of ["resultant_force", "resultant_moment"] as const) {
      const key = `${loadCase}_${quantity}`;
      it(`links ${key} to ${key} (same parameter, same load case)`, () => {
        const result = evaluateLinkCompatibility(
          outputNode(
            findPort(axisLoadCasesPorts.outputs, key),
            "axis-load-cases-1",
          ),
          inputNode(findPort(linearGuidePorts.inputs, key), "linear-guide-1"),
        );
        expect(result.compatible).toBe(true);
        expect(result.reasons).toEqual([]);
      });
    }
  }

  it("rejects the normal resultant force feeding the peak sink — load case must match, not just parameter identity", () => {
    const result = evaluateLinkCompatibility(
      outputNode(
        findPort(axisLoadCasesPorts.outputs, "normal_resultant_force"),
        "axis-load-cases-1",
      ),
      inputNode(
        findPort(linearGuidePorts.inputs, "peak_resultant_force"),
        "linear-guide-1",
      ),
    );
    expect(result.compatible).toBe(false);
    expect(result.reasons).toEqual(["load_case"]);
  });

  it("rejects the resultant force feeding the resultant moment sink", () => {
    // Both are per-case axis-frame vector quantities, so only the parameter
    // identity separates them — a link the graph must still refuse.
    const result = evaluateLinkCompatibility(
      outputNode(
        findPort(axisLoadCasesPorts.outputs, "normal_resultant_force"),
        "axis-load-cases-1",
      ),
      inputNode(
        findPort(linearGuidePorts.inputs, "normal_resultant_moment"),
        "linear-guide-1",
      ),
    );
    expect(result.compatible).toBe(false);
  });

  it("does not accept the axial thrust-force scalar in place of the resolved force vector", () => {
    // This is the whole reason registry 1.4.0 exists. thrust_force carries
    // only the +X drive demand; feeding it to a guide would silently drop the
    // transverse components the block distribution depends on. Asserted
    // against the real ports so that if a future change made the two
    // interchangeable, this fails rather than passing unnoticed.
    const result = evaluateLinkCompatibility(
      outputNode(
        findPort(axisLoadCasesPorts.outputs, "normal_thrust_force"),
        "axis-load-cases-1",
      ),
      inputNode(
        findPort(linearGuidePorts.inputs, "normal_resultant_force"),
        "linear-guide-1",
      ),
    );
    expect(result.compatible).toBe(false);
  });

  it("has no axis-load-cases output compatible with any guide.* catalog or geometry input", () => {
    // The guide's own rail spacing, ratings, and correction factors are
    // engineer/catalog data with no upstream producer. Asserted against
    // axis-load-cases' real outputs rather than assumed, so that a future
    // upstream version producing one of them surfaces here.
    const candidateSources = axisLoadCasesPorts.outputs.map((port) =>
      outputNode(port, "axis-load-cases-1"),
    );
    const guideOnlyInputs = linearGuidePorts.inputs.filter((port) =>
      port.parameterId.startsWith("guide."),
    );
    expect(guideOnlyInputs.length).toBeGreaterThan(0);

    for (const port of guideOnlyInputs) {
      const sink = inputNode(port, "linear-guide-1");
      const anyCompatible = candidateSources.some(
        (source) => evaluateLinkCompatibility(source, sink).compatible,
      );
      expect(anyCompatible, `port "${port.key}"`).toBe(false);
    }
  });

  it("links the shared orientation input from axis-load-cases' own input port", () => {
    // orientation is an input on both modules, not an output of either, so a
    // workflow supplies it once to both rather than linking them. Confirmed
    // here so the absence of an orientation output is a recorded fact, not an
    // oversight.
    const orientationOutputs = axisLoadCasesPorts.outputs.filter(
      (port) => port.parameterId === "motion.axis.orientation",
    );
    expect(orientationOutputs).toEqual([]);
    expect(
      axisLoadCasesPorts.inputs.some(
        (port) => port.parameterId === "motion.axis.orientation",
      ),
    ).toBe(true);
  });
});

describe("linear-axis@1 workflow role (Unit 4.8)", () => {
  it("declares a workflowRoles entry matching a real linear-axis@1 role", () => {
    const roleIds = new Set(linearAxisDefinition.roles.map((r) => r.id));
    expect(linearGuideManifest.workflowRoles.length).toBeGreaterThan(0);
    for (const roleId of linearGuideManifest.workflowRoles) {
      expect(roleIds.has(roleId)).toBe(true);
    }
  });
});
