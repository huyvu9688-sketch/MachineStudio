// Cross-module link compatibility tests (roadmap Module Definition of Done
// item 13) for coupling 0.1.0's actual input ports against ball-screw
// 0.1.0's and axis-load-cases 0.1.0's actual output ports. Uses the real
// engine link-compatibility evaluator (lib/engine/graph/compatibility.ts)
// against each module's real manifest.ts ports, not hand-typed parameter-id
// strings — the same approach lib/modules/ball-screw/0.1.0/
// cross-module-links.test.ts and lib/modules/linear-guide/0.1.0/
// cross-module-links.test.ts established.
//
// ball-screw is the only upstream module today with an output port coupling
// can link to: its per-case `screw.drive_torque` feeds coupling's own
// per-case drive-torque input directly (context/modules/coupling/
// stage-2-contract.md "Ports" table). axis-load-cases has no output
// compatible with any coupling input — coupling does not consume a resolved
// force/moment or the axial thrust force at all.

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
  manifest as couplingManifest,
  ports as couplingPorts,
} from "./manifest";
import { ports as ballScrewPorts } from "../../ball-screw/0.1.0/manifest";
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

describe("ball-screw 0.1.0 -> coupling 0.1.0 link compatibility", () => {
  for (const loadCase of ["normal", "peak"] as const) {
    const key = `${loadCase}_drive_torque`;
    it(`links ${key} to ${key} (same parameter, same load case)`, () => {
      const result = evaluateLinkCompatibility(
        outputNode(findPort(ballScrewPorts.outputs, key), "ball-screw-1"),
        inputNode(findPort(couplingPorts.inputs, key), "coupling-1"),
      );
      expect(result.compatible).toBe(true);
      expect(result.reasons).toEqual([]);
    });
  }

  it("rejects the normal drive torque feeding the peak sink — load case must match, not just parameter identity", () => {
    const result = evaluateLinkCompatibility(
      outputNode(
        findPort(ballScrewPorts.outputs, "normal_drive_torque"),
        "ball-screw-1",
      ),
      inputNode(
        findPort(couplingPorts.inputs, "peak_drive_torque"),
        "coupling-1",
      ),
    );
    expect(result.compatible).toBe(false);
    expect(result.reasons).toEqual(["load_case"]);
  });

  it("does not accept ball-screw's mean_rotational_speed in place of the linear-velocity sink coupling actually derives speed from", () => {
    // Stage 2 explicitly rejected screw.mean_rotational_speed as coupling's
    // speed source, because it is a duty-cycle-weighted mean, not the
    // steady/shock speed KTR's and R+W's own methods mean
    // (context/modules/coupling/stage-2-contract.md "Decisions" item 1).
    // Different parameter identity should already refuse this link; asserted
    // against the real ports so a future parameter-registry change that made
    // the two interchangeable would surface here instead of passing silently.
    for (const loadCase of ["normal", "peak"] as const) {
      const result = evaluateLinkCompatibility(
        outputNode(
          findPort(ballScrewPorts.outputs, "mean_rotational_speed"),
          "ball-screw-1",
        ),
        inputNode(
          findPort(couplingPorts.inputs, `${loadCase}_linear_velocity`),
          "coupling-1",
        ),
      );
      expect(result.compatible).toBe(false);
    }
  });

  it("has no ball-screw or axis-load-cases output compatible with case_linear_velocity — the same documented gap ball-screw's own cross-module-links.test.ts already records against its own consuming port", () => {
    // context/modules/coupling/stage-2-contract.md "Decisions" item 1: no
    // released module produces motion.axis.case_linear_velocity as an
    // output yet (ball-screw only consumes it as an input, the same gap its
    // own cross-module-links.test.ts confirms). Coupling derives its speed
    // input the same way, so it inherits the same unresolved-source gap;
    // confirmed here against real ports rather than assumed.
    const candidateSources = [
      ...ballScrewPorts.outputs.map((port) => outputNode(port, "ball-screw-1")),
      ...axisLoadCasesPorts.outputs.map((port) =>
        outputNode(port, "axis-load-cases-1"),
      ),
    ];
    for (const loadCase of ["normal", "peak"] as const) {
      const sink = inputNode(
        findPort(couplingPorts.inputs, `${loadCase}_linear_velocity`),
        "coupling-1",
      );
      const anyCompatible = candidateSources.some(
        (source) => evaluateLinkCompatibility(source, sink).compatible,
      );
      expect(anyCompatible).toBe(false);
    }
  });

  it("has no ball-screw or axis-load-cases output compatible with any coupling.* catalog input", () => {
    // Coupling's own catalog ratings and installation dimensions are
    // engineer/catalog data with no upstream producer, the same treatment
    // linear-guide's own guide.* catalog inputs get in its own
    // cross-module-links.test.ts.
    const candidateSources = [
      ...ballScrewPorts.outputs.map((port) => outputNode(port, "ball-screw-1")),
      ...axisLoadCasesPorts.outputs.map((port) =>
        outputNode(port, "axis-load-cases-1"),
      ),
    ];
    const couplingOnlyInputs = couplingPorts.inputs.filter((port) =>
      port.parameterId.startsWith("coupling."),
    );
    expect(couplingOnlyInputs.length).toBeGreaterThan(0);

    for (const port of couplingOnlyInputs) {
      const sink = inputNode(port, "coupling-1");
      const anyCompatible = candidateSources.some(
        (source) => evaluateLinkCompatibility(source, sink).compatible,
      );
      expect(anyCompatible, `port "${port.key}"`).toBe(false);
    }
  });
});

describe("linear-axis@1 workflow role (Unit 4.8)", () => {
  it("declares a workflowRoles entry matching a real linear-axis@1 role", () => {
    const roleIds = new Set(linearAxisDefinition.roles.map((r) => r.id));
    expect(couplingManifest.workflowRoles.length).toBeGreaterThan(0);
    for (const roleId of couplingManifest.workflowRoles) {
      expect(roleIds.has(roleId)).toBe(true);
    }
  });
});
