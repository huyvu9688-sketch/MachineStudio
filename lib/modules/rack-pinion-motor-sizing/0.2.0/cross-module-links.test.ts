// Cross-module link compatibility tests (code-standards.md "Module
// Testing": "Cross-module link tests" -- required for every released
// module; ai-workflow-rules.md Stage 5: "workflow role and link
// integration"). Uses the real engine link-compatibility evaluator
// (lib/engine/graph/compatibility.ts) against every other released
// module's real manifest.ts ports, the same exhaustive-sweep pattern
// every Motor Sizing Tool module's own cross-module-links.test.ts
// already establishes.
//
// ADR-0011 "Reuse policy" is an explicit, deliberate design decision that
// this module reproduces, rather than links to, Oriental Motor Co.,
// Ltd.'s and Andantex USA, Inc.'s own rack-and-pinion sizing methods --
// this module has no compute-level dependency on any other released
// module. This module DOES reuse several already-released
// `motion.axis.*` parameter IDs directly (orientation, incline_angle,
// gravity, friction_coefficient, total_moving_mass) -- the same
// interface `ball-screw-motor-sizing@0.1.0` already reuses
// (stage-1-spec.md "Relationship to Existing and Planned Modules"), so a
// real, exhaustive sweep is run below rather than a blanket "no links"
// claim assumed by copying the conveyor module's own different
// conclusion.

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
import { ports as directDriveConveyorMotorSizingPorts } from "../../direct-drive-conveyor-motor-sizing/0.1.0/manifest";

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
  candidatePorts: readonly T[],
  key: string,
): T {
  const found = candidatePorts.find((p) => p.key === key);
  if (found === undefined) {
    throw new Error(`Port "${key}" not found in the supplied port list.`);
  }
  return found;
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
  {
    label: "ball-screw-motor-sizing",
    outputs: ballScrewMotorSizingPorts.outputs,
  },
  {
    label: "direct-drive-conveyor-motor-sizing",
    outputs: directDriveConveyorMotorSizingPorts.outputs,
  },
];

// axis-load-cases@0.1.0's own resolved total_moving_mass output shares
// the identical motion.axis.total_moving_mass parameter ID this module
// also reuses -- the same real, incidental compatible pair
// ball-screw-motor-sizing@0.1.0's own sweep already found and documented
// for itself. Excluded from the exhaustive "confirmed absent" sweep below
// so that sweep stays a genuine, currently-passing exhaustive check.
const KNOWN_COMPATIBLE_PAIRS: ReadonlySet<string> = new Set([
  "axis-load-cases.total_moving_mass->total_moving_mass",
]);

describe("rack-pinion-motor-sizing 0.2.0 cross-module links: exhaustively confirmed absent, except one documented pair", () => {
  for (const upstream of UPSTREAM_MODULES) {
    it(`no ${upstream.label} 0.1.0 output is link-compatible with any rack-pinion-motor-sizing input, other than the one documented exception`, () => {
      const sources = upstream.outputs.map((port) =>
        outputNode(port, `${upstream.label}-1`),
      );
      const sinks = ports.inputs.map((port) =>
        inputNode(port, "rack-pinion-motor-sizing-1"),
      );

      for (const sink of sinks) {
        for (const source of sources) {
          const outputKey = source.id.slice(`${upstream.label}-1.`.length);
          const inputKey = sink.id.slice("rack-pinion-motor-sizing-1.".length);
          const pairKey = `${upstream.label}.${outputKey}->${inputKey}`;
          if (KNOWN_COMPATIBLE_PAIRS.has(pairKey)) continue;

          const result = evaluateLinkCompatibility(source, sink);
          expect(
            result.compatible,
            `expected ${upstream.label} output "${source.id}" to be incompatible with input "${sink.id}", but evaluateLinkCompatibility reported compatible (reasons: ${JSON.stringify(result.reasons)}) -- if this is a new, real, intentional compatibility, add it to KNOWN_COMPATIBLE_PAIRS and a confirming test; if not, something changed unexpectedly`,
          ).toBe(false);
        }
      }
    });
  }

  it("confirms the one documented exception really is compatible: axis-load-cases' own resolved total_moving_mass output feeds this module's total_moving_mass input", () => {
    const source = outputNode(
      findPort(axisLoadCasesPorts.outputs, "total_moving_mass"),
      "axis-load-cases-1",
    );
    const sink = inputNode(
      findPort(ports.inputs, "total_moving_mass"),
      "rack-pinion-motor-sizing-1",
    );
    const result = evaluateLinkCompatibility(source, sink);
    expect(result.compatible).toBe(true);
    expect(result.reasons).toEqual([]);
  });
});

describe("rack-pinion-motor-sizing 0.2.0 workflow role: deliberately none", () => {
  it("declares no workflowRoles -- this module is not part of the linear-axis@1 workflow, and no other guided workflow exists for the motor-sizing.* family yet (ADR-0011)", () => {
    expect(manifest.workflowRoles).toEqual([]);
  });
});
