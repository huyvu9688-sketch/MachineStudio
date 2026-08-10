// Cross-module link compatibility tests (roadmap Module Definition of Done
// item 13) for support-bearing 0.1.0's actual input ports against
// axis-load-cases 0.1.0's and ball-screw 0.1.0's actual output ports. Uses
// the real engine link-compatibility evaluator
// (lib/engine/graph/compatibility.ts) against each module's real
// manifest.ts ports, not hand-typed parameter-id strings — the same
// approach lib/modules/ball-screw/0.1.0/cross-module-links.test.ts,
// lib/modules/linear-guide/0.1.0/cross-module-links.test.ts, and
// lib/modules/coupling/0.1.0/cross-module-links.test.ts already established.
//
// This pair matters more than most: the roadmap's own Unit 4.6 gate reads
// "Support-bearing output integrates with the ball-screw module without a
// custom link mapping" (context/implementation-map.md). Stage 2 resolved
// this by reusing motion.axis.thrust_force directly, the exact parameter
// ball-screw 0.1.0 also consumes as an input (context/modules/
// support-bearing/stage-2-contract.md "Existing Parameter Review") — so the
// real upstream producer is axis-load-cases, the same module ball-screw's
// own thrust force comes from, not a bespoke ball-screw-to-support-bearing
// mapping. Ball-screw itself produces no output support-bearing can consume
// (it does not output thrust_force, only screw-specific results) — asserted
// below rather than assumed.

import { describe, expect, it } from "vitest";
import {
  asNodeId,
  asScopeId,
  evaluateLinkCompatibility,
  type GraphNode,
  type ModuleInputPort,
  type ModuleOutputPort,
} from "@/lib/engine";
import { ports as supportBearingPorts } from "./manifest";
import { ports as axisLoadCasesPorts } from "../../axis-load-cases/0.1.0/manifest";
import { ports as ballScrewPorts } from "../../ball-screw/0.1.0/manifest";

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

describe("axis-load-cases 0.1.0 -> support-bearing 0.1.0 link compatibility", () => {
  for (const loadCase of ["normal", "peak"] as const) {
    const key = `${loadCase}_thrust_force`;
    it(`links ${key} to ${key} (same parameter, same load case)`, () => {
      const result = evaluateLinkCompatibility(
        outputNode(
          findPort(axisLoadCasesPorts.outputs, key),
          "axis-load-cases-1",
        ),
        inputNode(findPort(supportBearingPorts.inputs, key), "support-bearing-1"),
      );
      expect(result.compatible).toBe(true);
      expect(result.reasons).toEqual([]);
    });
  }

  it("rejects the normal thrust force feeding the peak sink — load case must match, not just parameter identity", () => {
    const result = evaluateLinkCompatibility(
      outputNode(
        findPort(axisLoadCasesPorts.outputs, "normal_thrust_force"),
        "axis-load-cases-1",
      ),
      inputNode(
        findPort(supportBearingPorts.inputs, "peak_thrust_force"),
        "support-bearing-1",
      ),
    );
    expect(result.compatible).toBe(false);
    expect(result.reasons).toEqual(["load_case"]);
  });

  it("has no axis-load-cases or ball-screw output compatible with case_linear_velocity — the same documented gap ball-screw's own and coupling's own cross-module-links.test.ts already record against their own consuming ports", () => {
    // context/modules/support-bearing/stage-2-contract.md: no released
    // module produces motion.axis.case_linear_velocity as an output yet.
    // support-bearing derives its own operating speed from it the same way
    // coupling does, so it inherits the same unresolved-source gap;
    // confirmed here against real ports rather than assumed.
    const candidateSources = [
      ...axisLoadCasesPorts.outputs.map((port) =>
        outputNode(port, "axis-load-cases-1"),
      ),
      ...ballScrewPorts.outputs.map((port) => outputNode(port, "ball-screw-1")),
    ];
    for (const loadCase of ["normal", "peak"] as const) {
      const sink = inputNode(
        findPort(supportBearingPorts.inputs, `${loadCase}_linear_velocity`),
        "support-bearing-1",
      );
      const anyCompatible = candidateSources.some(
        (source) => evaluateLinkCompatibility(source, sink).compatible,
      );
      expect(anyCompatible).toBe(false);
    }
  });

  it("has no axis-load-cases or ball-screw output compatible with any bearing.* catalog input", () => {
    // The bearing's own catalog ratings, factors, and dimensions are
    // engineer/catalog data with no upstream producer, the same treatment
    // linear-guide's own guide.* and coupling's own coupling.* catalog
    // inputs get in their own cross-module-links.test.ts files.
    const candidateSources = [
      ...axisLoadCasesPorts.outputs.map((port) =>
        outputNode(port, "axis-load-cases-1"),
      ),
      ...ballScrewPorts.outputs.map((port) => outputNode(port, "ball-screw-1")),
    ];
    const bearingOnlyInputs = supportBearingPorts.inputs.filter((port) =>
      port.parameterId.startsWith("bearing."),
    );
    expect(bearingOnlyInputs.length).toBeGreaterThan(0);

    for (const port of bearingOnlyInputs) {
      const sink = inputNode(port, "support-bearing-1");
      const anyCompatible = candidateSources.some(
        (source) => evaluateLinkCompatibility(source, sink).compatible,
      );
      expect(anyCompatible, `port "${port.key}"`).toBe(false);
    }
  });

  it("confirms ball-screw itself has no output support-bearing can consume — the real upstream producer is axis-load-cases, not a ball-screw-to-support-bearing mapping", () => {
    // Direct evidence for the roadmap's own Unit 4.6 gate wording
    // ("integrates with the ball-screw module without a custom link
    // mapping"): ball-screw does not output motion.axis.thrust_force (only
    // screw.* results), so support-bearing's own thrust-force input can
    // only ever be satisfied by axis-load-cases — the same source
    // ball-screw's own thrust-force input already comes from.
    const ballScrewOutputs = ballScrewPorts.outputs.map((port) =>
      outputNode(port, "ball-screw-1"),
    );
    for (const loadCase of ["normal", "peak"] as const) {
      const sink = inputNode(
        findPort(supportBearingPorts.inputs, `${loadCase}_thrust_force`),
        "support-bearing-1",
      );
      const anyCompatible = ballScrewOutputs.some(
        (source) => evaluateLinkCompatibility(source, sink).compatible,
      );
      expect(anyCompatible).toBe(false);
    }
  });
});
