// Cross-module link compatibility tests for belt-pulley-drive-motor-sizing
// 0.2.0 (code-standards.md "Module Testing"; ai-workflow-rules.md Stage 5).
// Includes belt-pulley-drive-motor-sizing@0.1.0 itself as an upstream --
// the first time this project sweeps one module version's own outputs
// against a later version of the SAME module's own inputs -- since the
// two coexist as separate registered packages (0.1.0 stays released,
// immutable, and un-superseded).

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
import { ports as rackPinionMotorSizingPorts } from "../../rack-pinion-motor-sizing/0.1.0/manifest";
import { ports as indexTableMotorSizingPorts } from "../../index-table-motor-sizing/0.1.0/manifest";
import { ports as beltPulleyDriveMotorSizing010Ports } from "../0.1.0/manifest";
import { ports as beltPulleyDriveMotorSizing020Ports } from "../0.2.0/manifest";

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
  {
    label: "rack-pinion-motor-sizing",
    outputs: rackPinionMotorSizingPorts.outputs,
  },
  {
    label: "index-table-motor-sizing",
    outputs: indexTableMotorSizingPorts.outputs,
  },
  {
    label: "belt-pulley-drive-motor-sizing-0.1.0",
    outputs: beltPulleyDriveMotorSizing010Ports.outputs,
  },
  {
    label: "belt-pulley-drive-motor-sizing-0.2.0",
    outputs: beltPulleyDriveMotorSizing020Ports.outputs,
  },
];

// axis-load-cases@0.1.0's own resolved total_moving_mass output shares the
// identical motion.axis.total_moving_mass parameter ID this module also
// reuses -- the same real, incidental compatible pair 0.1.0's own sweep
// already found and documented for itself.
//
// NEW, found by this 0.3.0 sweep (not anticipated by
// docs/superpowers/plans/2026-08-19-belt-pulley-drive-motor-sizing-0.3.0.md
// Task 11's own text, which assumed 0.2.0 had nothing new to find here):
// 0.2.0's own four dual-role motion outputs (target_velocity,
// travel_distance, constant_velocity_time, cycle_time -- added by 0.2.0's
// own native motion-cycle work, untouched by this plan's three
// consistency-pass changes) share identical motor_sizing.belt_pulley.*
// parameter IDs with 0.3.0's own same-named inputs, so a 0.2.0 instance's
// own resolved motion outputs really are link-compatible with a 0.3.0
// instance's own same-mode inputs. Genuinely real and incidental, the same
// category as the axis-load-cases pair above -- not a defect in either
// version's own manifest.
const KNOWN_COMPATIBLE_PAIRS: ReadonlySet<string> = new Set([
  "axis-load-cases.total_moving_mass->total_moving_mass",
  "belt-pulley-drive-motor-sizing-0.2.0.target_velocity->target_velocity",
  "belt-pulley-drive-motor-sizing-0.2.0.travel_distance->travel_distance",
  "belt-pulley-drive-motor-sizing-0.2.0.constant_velocity_time->constant_velocity_time",
  "belt-pulley-drive-motor-sizing-0.2.0.cycle_time->cycle_time",
]);

describe("belt-pulley-drive-motor-sizing 0.3.0 cross-module links: exhaustively confirmed absent, except five documented pairs", () => {
  for (const upstream of UPSTREAM_MODULES) {
    it(`no ${upstream.label} output is link-compatible with any belt-pulley-drive-motor-sizing 0.3.0 input, other than the documented exceptions`, () => {
      const sources = upstream.outputs.map((port) =>
        outputNode(port, `${upstream.label}-1`),
      );
      const sinks = ports.inputs.map((port) =>
        inputNode(port, "belt-pulley-drive-motor-sizing-0.3.0-1"),
      );

      for (const sink of sinks) {
        for (const source of sources) {
          const outputKey = source.id.slice(`${upstream.label}-1.`.length);
          const inputKey = sink.id.slice(
            "belt-pulley-drive-motor-sizing-0.3.0-1.".length,
          );
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
      "belt-pulley-drive-motor-sizing-0.3.0-1",
    );
    const result = evaluateLinkCompatibility(source, sink);
    expect(result.compatible).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("confirms the four newly-found exceptions really are compatible: 0.2.0's own resolved motion outputs feed 0.3.0's own same-named motion inputs", () => {
    for (const key of [
      "target_velocity",
      "travel_distance",
      "constant_velocity_time",
      "cycle_time",
    ] as const) {
      const source = outputNode(
        findPort(beltPulleyDriveMotorSizing020Ports.outputs, key),
        "belt-pulley-drive-motor-sizing-0.2.0-1",
      );
      const sink = inputNode(
        findPort(ports.inputs, key),
        "belt-pulley-drive-motor-sizing-0.3.0-1",
      );
      const result = evaluateLinkCompatibility(source, sink);
      expect(result.compatible, key).toBe(true);
      expect(result.reasons, key).toEqual([]);
    }
  });
});

describe("belt-pulley-drive-motor-sizing 0.3.0 workflow role: deliberately none", () => {
  it("declares no workflowRoles -- this module is not part of the linear-axis@1 workflow, and no other guided workflow exists for the motor-sizing.* family yet (ADR-0011)", () => {
    expect(manifest.workflowRoles).toEqual([]);
  });
});
