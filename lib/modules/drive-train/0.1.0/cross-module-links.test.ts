// Cross-module link compatibility tests (roadmap Module Definition of Done
// item 13) for drive-train 0.1.0's actual input ports against ball-screw
// 0.1.0's, axis-load-cases 0.1.0's, and motion-profile 0.1.0's actual output
// ports. Uses the real engine link-compatibility evaluator
// (lib/engine/graph/compatibility.ts) against each module's real manifest.ts
// ports, not hand-typed parameter-id strings — the same approach
// lib/modules/ball-screw/0.1.0/cross-module-links.test.ts,
// lib/modules/coupling/0.1.0/cross-module-links.test.ts, and
// lib/modules/support-bearing/0.1.0/cross-module-links.test.ts already
// established.
//
// drive-train is the first module in this codebase to declare an input port
// for a motion.profile.* output: its unscoped peak_acceleration/
// peak_deceleration/rms_acceleration inputs link directly to motion-profile's
// own identically-named, identically-unscoped outputs — reversing the
// documented gap ball-screw's own cross-module-links.test.ts records
// ("motion-profile 0.1.0's own outputs ... [have] no port that links to any
// ball-screw input today"), which was true for ball-screw specifically and
// remains true for it, but not for drive-train.
//
// ball-screw is also an upstream module here: its per-case screw.drive_torque
// output feeds drive-train's own per-case drive-torque input directly (the
// same link coupling 0.1.0 already consumes). axis-load-cases has no output
// compatible with any drive-train input — asserted below rather than assumed.

import { describe, expect, it } from "vitest";
import {
  asNodeId,
  asScopeId,
  evaluateLinkCompatibility,
  type GraphNode,
  type ModuleInputPort,
  type ModuleOutputPort,
} from "@/lib/engine";
import { ports as driveTrainPorts } from "./manifest";
import { ports as ballScrewPorts } from "../../ball-screw/0.1.0/manifest";
import { ports as axisLoadCasesPorts } from "../../axis-load-cases/0.1.0/manifest";
import { ports as motionProfilePorts } from "../../motion-profile/0.1.0/manifest";

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

describe("ball-screw 0.1.0 -> drive-train 0.1.0 link compatibility", () => {
  for (const loadCase of ["normal", "peak"] as const) {
    const key = `${loadCase}_drive_torque`;
    it(`links ${key} to ${key} (same parameter, same load case)`, () => {
      const result = evaluateLinkCompatibility(
        outputNode(findPort(ballScrewPorts.outputs, key), "ball-screw-1"),
        inputNode(findPort(driveTrainPorts.inputs, key), "drive-train-1"),
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
        findPort(driveTrainPorts.inputs, "peak_drive_torque"),
        "drive-train-1",
      ),
    );
    expect(result.compatible).toBe(false);
    expect(result.reasons).toEqual(["load_case"]);
  });

  it("does not accept ball-screw's mean_rotational_speed in place of the linear-velocity sink drive-train actually derives operating speed from", () => {
    // drive-train computes its own motor-shaft operating speed from
    // motion.axis.case_linear_velocity + screw.lead + screw.gear_ratio, the
    // same derivation coupling 0.1.0 uses and the same rejection its own
    // cross-module-links.test.ts already records: screw.mean_rotational_speed
    // is a duty-cycle-weighted mean, a different parameter identity, so it
    // must not silently satisfy this sink.
    for (const loadCase of ["normal", "peak"] as const) {
      const result = evaluateLinkCompatibility(
        outputNode(
          findPort(ballScrewPorts.outputs, "mean_rotational_speed"),
          "ball-screw-1",
        ),
        inputNode(
          findPort(driveTrainPorts.inputs, `${loadCase}_linear_velocity`),
          "drive-train-1",
        ),
      );
      expect(result.compatible).toBe(false);
    }
  });
});

describe("motion-profile 0.1.0 -> drive-train 0.1.0 link compatibility", () => {
  // Unlike every other Milestone 4 module pair, neither side pins a load
  // case here: motion-profile's outputs are cycle-level aggregates with no
  // loadCase field, and drive-train's own peak_acceleration/
  // peak_deceleration/rms_acceleration inputs are declared the same way
  // (manifest.ts) rather than per-case — so a plain identity link is the
  // whole story for this pair.
  for (const key of [
    "peak_acceleration",
    "peak_deceleration",
    "rms_acceleration",
  ] as const) {
    it(`links ${key} to ${key} (same parameter, neither side load-case-scoped)`, () => {
      const result = evaluateLinkCompatibility(
        outputNode(
          findPort(motionProfilePorts.outputs, key),
          "motion-profile-1",
        ),
        inputNode(findPort(driveTrainPorts.inputs, key), "drive-train-1"),
      );
      expect(result.compatible).toBe(true);
      expect(result.reasons).toEqual([]);
    });
  }

  it("has no motion-profile output compatible with either per-case linear-velocity sink", () => {
    // motion-profile has no motion.axis.* output at all (cycle_time,
    // peak_velocity, and the three accel/decel/RMS outputs above are all
    // motion.profile.* parameters), so it cannot be a source for
    // motion.axis.case_linear_velocity — confirmed against real ports rather
    // than assumed.
    const candidateSources = motionProfilePorts.outputs.map((port) =>
      outputNode(port, "motion-profile-1"),
    );
    for (const loadCase of ["normal", "peak"] as const) {
      const sink = inputNode(
        findPort(driveTrainPorts.inputs, `${loadCase}_linear_velocity`),
        "drive-train-1",
      );
      const anyCompatible = candidateSources.some(
        (source) => evaluateLinkCompatibility(source, sink).compatible,
      );
      expect(anyCompatible).toBe(false);
    }
  });
});

describe("axis-load-cases 0.1.0 -> drive-train 0.1.0 link compatibility", () => {
  it("has no axis-load-cases output compatible with any drive-train input", () => {
    // drive-train consumes ball-screw's drive_torque and motion-profile's
    // acceleration/RMS outputs, never axis-load-cases directly — asserted
    // here against every real drive-train input port rather than assumed.
    const candidateSources = axisLoadCasesPorts.outputs.map((port) =>
      outputNode(port, "axis-load-cases-1"),
    );
    for (const sinkPort of driveTrainPorts.inputs) {
      const sink = inputNode(sinkPort, "drive-train-1");
      const anyCompatible = candidateSources.some(
        (source) => evaluateLinkCompatibility(source, sink).compatible,
      );
      expect(anyCompatible, `port "${sinkPort.key}"`).toBe(false);
    }
  });
});

describe("drive-train 0.1.0 catalog inputs have no upstream producer", () => {
  it("has no ball-screw, axis-load-cases, or motion-profile output compatible with any drive.* catalog input", () => {
    // The motor/gearbox/drive/brake catalog inputs and the required
    // margin/limit inputs are engineer/catalog data with no upstream
    // producer, the same treatment coupling.* and bearing.* catalog inputs
    // get in their own cross-module-links.test.ts files.
    const candidateSources = [
      ...ballScrewPorts.outputs.map((port) => outputNode(port, "ball-screw-1")),
      ...axisLoadCasesPorts.outputs.map((port) =>
        outputNode(port, "axis-load-cases-1"),
      ),
      ...motionProfilePorts.outputs.map((port) =>
        outputNode(port, "motion-profile-1"),
      ),
    ];
    const driveOnlyInputs = driveTrainPorts.inputs.filter((port) =>
      port.parameterId.startsWith("drive."),
    );
    expect(driveOnlyInputs.length).toBeGreaterThan(0);

    for (const port of driveOnlyInputs) {
      const sink = inputNode(port, "drive-train-1");
      const anyCompatible = candidateSources.some(
        (source) => evaluateLinkCompatibility(source, sink).compatible,
      );
      expect(anyCompatible, `port "${port.key}"`).toBe(false);
    }
  });

  it("has no ball-screw, axis-load-cases, or motion-profile output compatible with case_linear_velocity — the same documented gap ball-screw's, coupling's, and support-bearing's own cross-module-links.test.ts already record against their own consuming ports", () => {
    const candidateSources = [
      ...ballScrewPorts.outputs.map((port) => outputNode(port, "ball-screw-1")),
      ...axisLoadCasesPorts.outputs.map((port) =>
        outputNode(port, "axis-load-cases-1"),
      ),
      ...motionProfilePorts.outputs.map((port) =>
        outputNode(port, "motion-profile-1"),
      ),
    ];
    for (const loadCase of ["normal", "peak"] as const) {
      const sink = inputNode(
        findPort(driveTrainPorts.inputs, `${loadCase}_linear_velocity`),
        "drive-train-1",
      );
      const anyCompatible = candidateSources.some(
        (source) => evaluateLinkCompatibility(source, sink).compatible,
      );
      expect(anyCompatible).toBe(false);
    }
  });
});
