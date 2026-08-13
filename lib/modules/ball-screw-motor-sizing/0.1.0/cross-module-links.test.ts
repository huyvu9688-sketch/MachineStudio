// Cross-module link compatibility tests (code-standards.md "Module
// Testing": "Cross-module link tests" -- required for every released
// module; ai-workflow-rules.md Stage 5: "workflow role and link
// integration"). Uses the real engine link-compatibility evaluator
// (lib/engine/graph/compatibility.ts) against every module's real
// manifest.ts ports, the same pattern every other module's own
// cross-module-links.test.ts already establishes.
//
// ADR-0011 "Reuse policy" is an explicit, deliberate design decision that
// this module reproduces, rather than links to, the CALCULATIONS already
// released in axis-load-cases@0.1.0, ball-screw@0.1.0,
// motion-profile@0.1.0, and drive-train@0.1.0 (see math.ts's own module
// doc comment and stage-1-spec.md's "Relationship to Existing Released
// Modules" table) -- this module has no compute-level dependency on any
// of the four. That is a separate question from graph-level PARAMETER
// compatibility, though: this module reuses several already-released
// `motion.axis.*`/`screw.*` parameter IDs directly (stage-1-spec.md
// "Existing Parameter Review"), and an exhaustive sweep run this session
// (every input port against every output port of all four modules) found
// exactly one real, incidental compatible pair, corrected below rather
// than assumed away: axis-load-cases@0.1.0's own resolved
// `total_moving_mass` output (it accepts several input mass routes -- a
// direct total, or payload+carriage+additional -- and re-exposes one
// canonical resolved value) is link-compatible with this module's own
// `total_moving_mass` input, since both share the identical
// `motion.axis.total_moving_mass` parameter ID and neither carries a
// `loadCase`. This does not weaken ADR-0011's own "reproduce, don't
// import" policy (no calculation code is shared either way) and nothing
// wires it today (this module has no workflow role -- see below), but it
// is real and worth a correct record rather than a blanket "no links"
// claim disproven by the very evaluator meant to check it.

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
import { ports as driveTrainPorts } from "../../drive-train/0.1.0/manifest";

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
  { label: "drive-train", outputs: driveTrainPorts.outputs },
];

// The one real, incidental exception found by the exhaustive sweep above
// (see this file's own module doc comment) -- excluded from the
// exhaustive "confirmed absent" sweep below so that sweep stays a
// genuine, currently-passing exhaustive check, not a list quietly edited
// down to dodge one real failure.
const KNOWN_COMPATIBLE_PAIRS: ReadonlySet<string> = new Set([
  "axis-load-cases.total_moving_mass->total_moving_mass",
]);

describe("ball-screw-motor-sizing 0.1.0 cross-module links: exhaustively confirmed absent, except one documented pair", () => {
  for (const upstream of UPSTREAM_MODULES) {
    it(`no ${upstream.label} 0.1.0 output is link-compatible with any ball-screw-motor-sizing input, other than the one documented exception`, () => {
      const sources = upstream.outputs.map((port) =>
        outputNode(port, `${upstream.label}-1`),
      );
      const sinks = ports.inputs.map((port) =>
        inputNode(port, "ball-screw-motor-sizing-1"),
      );

      for (const sink of sinks) {
        for (const source of sources) {
          const outputKey = source.id.slice(`${upstream.label}-1.`.length);
          const inputKey = sink.id.slice("ball-screw-motor-sizing-1.".length);
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
      "ball-screw-motor-sizing-1",
    );
    const result = evaluateLinkCompatibility(source, sink);
    expect(result.compatible).toBe(true);
    expect(result.reasons).toEqual([]);
  });
});

describe("ball-screw-motor-sizing 0.1.0 workflow role: deliberately none", () => {
  it("declares no workflowRoles — this module is not part of the linear-axis@1 workflow (ADR-0011 hides the seven discipline categories from the default picker but does not add this family to that workflow)", () => {
    expect(manifest.workflowRoles).toEqual([]);
  });
});
