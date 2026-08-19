// Cross-module link compatibility tests (code-standards.md "Module
// Testing": "Cross-module link tests" -- required for every released
// module; ai-workflow-rules.md Stage 5: "workflow role and link
// integration"). Uses the real engine link-compatibility evaluator
// (lib/engine/graph/compatibility.ts) against every other released
// module's real manifest.ts ports, the same exhaustive-sweep pattern
// ball-screw-motor-sizing/0.1.0/cross-module-links.test.ts already
// establishes.
//
// ADR-0011 "Reuse policy" is an explicit, deliberate design decision that
// this module reproduces, rather than links to, Omron Corporation's and
// Oriental Motor Co., Ltd.'s own conveyor sizing methods -- this module
// has no compute-level dependency on any other released module. This
// module also reuses only one already-released parameter ID
// (`motion.axis.gravity`, stage-2-contract.md "Reused without change") --
// every other input/output is a new `motor_sizing.direct_drive_conveyor.*`
// parameter with no overlap in meaning with any released group, so an
// exhaustive sweep (every input port against every output port of every
// other released module) is expected to find zero compatible pairs, not
// the one incidental exception ball-screw-motor-sizing's own sweep found.

import { describe, expect, it } from "vitest";
import {
  asNodeId,
  asScopeId,
  evaluateLinkCompatibility,
  type GraphNode,
  type ModuleInputPort,
  type ModuleOutputPort,
} from "@/lib/engine";
import { manifest, ports } from "./manifest";
import { ports as axisLoadCasesPorts } from "../../axis-load-cases/0.1.0/manifest";
import { ports as ballScrewPorts } from "../../ball-screw/0.1.0/manifest";
import { ports as motionProfilePorts } from "../../motion-profile/0.1.0/manifest";
import { ports as linearGuidePorts } from "../../linear-guide/0.1.0/manifest";
import { ports as couplingPorts } from "../../coupling/0.1.0/manifest";
import { ports as supportBearingPorts } from "../../support-bearing/0.1.0/manifest";
import { ports as driveTrainPorts } from "../../drive-train/0.1.0/manifest";
import { ports as ballScrewMotorSizingPorts } from "../../ball-screw-motor-sizing/0.1.0/manifest";

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

const UPSTREAM_MODULES: ReadonlyArray<{
  readonly label: string;
  readonly outputs: readonly ModuleOutputPort[];
}> = [
  { label: "axis-load-cases", outputs: axisLoadCasesPorts.outputs },
  { label: "ball-screw", outputs: ballScrewPorts.outputs },
  { label: "motion-profile", outputs: motionProfilePorts.outputs },
  { label: "linear-guide", outputs: linearGuidePorts.outputs },
  { label: "coupling", outputs: couplingPorts.outputs },
  { label: "support-bearing", outputs: supportBearingPorts.outputs },
  { label: "drive-train", outputs: driveTrainPorts.outputs },
  { label: "ball-screw-motor-sizing", outputs: ballScrewMotorSizingPorts.outputs },
];

describe("direct-drive-conveyor-motor-sizing 0.2.0 cross-module links: exhaustively confirmed absent", () => {
  for (const upstream of UPSTREAM_MODULES) {
    it(`no ${upstream.label} 0.1.0 output is link-compatible with any direct-drive-conveyor-motor-sizing input`, () => {
      const sources = upstream.outputs.map((port) =>
        outputNode(port, `${upstream.label}-1`),
      );
      const sinks = ports.inputs.map((port) =>
        inputNode(port, "direct-drive-conveyor-motor-sizing-1"),
      );

      for (const sink of sinks) {
        for (const source of sources) {
          const result = evaluateLinkCompatibility(source, sink);
          expect(
            result.compatible,
            `expected ${upstream.label} output "${source.id}" to be incompatible with input "${sink.id}", but evaluateLinkCompatibility reported compatible (reasons: ${JSON.stringify(result.reasons)}) -- if this is a new, real, intentional compatibility, document it explicitly; if not, something changed unexpectedly`,
          ).toBe(false);
        }
      }
    });
  }
});

describe("direct-drive-conveyor-motor-sizing 0.2.0 workflow role: deliberately none", () => {
  it("declares no workflowRoles -- this module is not part of the linear-axis@1 workflow, and no other guided workflow exists for the motor-sizing.* family yet (ADR-0011)", () => {
    expect(manifest.workflowRoles).toEqual([]);
  });
});
