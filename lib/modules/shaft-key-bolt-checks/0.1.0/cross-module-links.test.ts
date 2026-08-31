// Cross-module link compatibility test (roadmap Module Definition of Done
// item 13; context/ai-workflow-rules.md "Module Consistency Review" item 6)
// for shaft-key-bolt-checks 0.1.0's own shaft_applied_torque input ports
// against ball-screw 0.1.0's own drive_torque output ports.
//
// **A real, disclosed Stage 5 finding, not the outcome stage-2-contract.md
// "Decisions" item 5 originally claimed.** That record asserted the link is
// "compatible by the existing rules... no new port needed" because
// `screw.drive_torque` and `shaft.applied_torque` share the same canonical
// unit, qualifiers, and load cases. Running the real engine evaluator
// (lib/engine/graph/compatibility.ts's evaluateLinkCompatibility) against
// each module's real manifest.ts ports — the same pattern
// lib/modules/ball-screw/0.1.0/cross-module-links.test.ts already
// established — shows this is false as the system actually behaves today:
// `evaluateLinkCompatibility` only treats two ports as compatible when they
// share the identical `parameterId`, or when an `ApprovedParameterMapping`
// explicitly joins two different ones (lib/engine/graph/compatibility.ts's
// own module doc comment, criterion 2). `screw.drive_torque` and
// `shaft.applied_torque` are two distinct registered parameter IDs, and no
// `ApprovedParameterMapping` between them — or any pair — exists anywhere
// in this codebase yet (`ApprovedParameterMapping` is type-level scaffolding
// only; the real application call site, `confirmParameterLink` in
// lib/application/parameters/stale-propagation.ts, never passes a
// `mappings` argument). Every prior "link-compatible" module pair in this
// project (e.g. axis-load-cases -> ball-screw) achieves compatibility by
// reusing the identical registered parameter ID, not by a cross-parameter
// mapping — this module is the first to need one, and it is not built.
// `stage-2-contract.md` "Decisions" item 5 is corrected to record this;
// see also context/progress-tracker.md "Open decisions". This is not a
// release blocker for `0.1.0` itself: `shaft.applied_torque` remains a
// plain required direct-entry input, usable without any link at all — only
// the "auto-suggested cross-module link" convenience is unavailable until a
// real `ApprovedParameterMapping` mechanism is built and wired into
// `confirmParameterLink`, a cross-cutting generic-engine change out of this
// module's own scope (context/ai-workflow-rules.md "Split Rules").
//
// This module declares no workflowRoles (manifest.ts: `workflowRoles: []`)
// — mechanism-agnostic by design (stage-1-spec.md "Purpose"), unlike every
// module released so far — so there is no linear-axis@1 (or any other
// workflow) role-membership test to run here, unlike ball-screw's own
// sibling test file's second describe block.

import { describe, expect, it } from "vitest";
import {
  asNodeId,
  asScopeId,
  evaluateLinkCompatibility,
  type GraphNode,
  type ModuleInputPort,
  type ModuleOutputPort,
} from "@/lib/engine";
import { ports as ballScrewPorts } from "../../ball-screw/0.1.0/manifest";
import { ports as shaftKeyBoltPorts } from "./manifest";

const SCOPE = asScopeId("test-scope");

function outputNode(port: ModuleOutputPort, moduleInstanceId: string): GraphNode {
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

describe("ball-screw 0.1.0 -> shaft-key-bolt-checks 0.1.0 link compatibility", () => {
  it("does NOT link normal_drive_torque to normal_shaft_applied_torque today — different parameter IDs, no approved mapping exists (see this file's own header note)", () => {
    const source = outputNode(
      findPort(ballScrewPorts.outputs, "normal_drive_torque"),
      "ball-screw-1",
    );
    const sink = inputNode(
      findPort(shaftKeyBoltPorts.inputs, "normal_shaft_applied_torque"),
      "shaft-key-bolt-checks-1",
    );
    const result = evaluateLinkCompatibility(source, sink);
    expect(result.compatible).toBe(false);
    expect(result.reasons).toEqual(["parameter_identity"]);
  });

  it("does NOT link peak_drive_torque to peak_shaft_applied_torque today, for the same reason", () => {
    const source = outputNode(
      findPort(ballScrewPorts.outputs, "peak_drive_torque"),
      "ball-screw-1",
    );
    const sink = inputNode(
      findPort(shaftKeyBoltPorts.inputs, "peak_shaft_applied_torque"),
      "shaft-key-bolt-checks-1",
    );
    const result = evaluateLinkCompatibility(source, sink);
    expect(result.compatible).toBe(false);
    expect(result.reasons).toEqual(["parameter_identity"]);
  });

  it("would link normal_drive_torque to normal_shaft_applied_torque if an approved screw.drive_torque -> shaft.applied_torque mapping existed — confirming the two ports are otherwise semantically compatible (unit, qualifiers, load case), the one part of stage-2-contract.md 'Decisions' item 5 that IS accurate", () => {
    const source = outputNode(
      findPort(ballScrewPorts.outputs, "normal_drive_torque"),
      "ball-screw-1",
    );
    const sink = inputNode(
      findPort(shaftKeyBoltPorts.inputs, "normal_shaft_applied_torque"),
      "shaft-key-bolt-checks-1",
    );
    const result = evaluateLinkCompatibility(source, sink, {
      mappings: [
        {
          from: source.parameterId,
          to: sink.parameterId,
        },
      ],
    });
    expect(result.compatible).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("has no ball-screw output compatible with shaft_applied_bending_moment — direct-entry only, no source parameter exists (stage-2-contract.md 'Decisions' item 5)", () => {
    const candidateSources = ballScrewPorts.outputs.map((port) =>
      outputNode(port, "ball-screw-1"),
    );
    const sink = inputNode(
      findPort(shaftKeyBoltPorts.inputs, "normal_shaft_applied_bending_moment"),
      "shaft-key-bolt-checks-1",
    );
    const anyCompatible = candidateSources.some(
      (source) => evaluateLinkCompatibility(source, sink).compatible,
    );
    expect(anyCompatible).toBe(false);
  });
});
