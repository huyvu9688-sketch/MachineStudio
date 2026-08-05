import { describe, expect, it } from "vitest";
import {
  asParameterId,
  buildParameterRegistry,
  defineParameter,
  type LoadCaseCategory,
} from "../parameters";
import { evaluateLinkCompatibility } from "./compatibility";
import {
  asNodeId,
  asScopeId,
  type GraphNode,
  type GraphNodeKind,
} from "./types";

const SCOPE = asScopeId("axis");

function node(
  id: string,
  kind: GraphNodeKind,
  parameterId: string,
  loadCase?: LoadCaseCategory,
): GraphNode {
  return {
    id: asNodeId(id),
    kind,
    parameterId: asParameterId(parameterId),
    scopeId: SCOPE,
    ...(loadCase !== undefined && { loadCase }),
    ...((kind === "module_input" || kind === "module_output") && {
      moduleInstanceId: id,
    }),
  };
}

const output = (param: string, lc?: LoadCaseCategory): GraphNode =>
  node(`out:${param}:${lc ?? ""}`, "module_output", param, lc);
const input = (param: string, lc?: LoadCaseCategory): GraphNode =>
  node(`in:${param}:${lc ?? ""}`, "module_input", param, lc);

describe("evaluateLinkCompatibility — direction", () => {
  it("rejects a link whose target is not a module input", () => {
    const source = output("motion.axis.thrust_force");
    const sink = node("req", "machine_requirement", "motion.axis.thrust_force");
    const result = evaluateLinkCompatibility(source, sink);
    expect(result.compatible).toBe(false);
    expect(result.reasons).toEqual(["direction"]);
  });

  it("rejects a link whose source is a module input", () => {
    const source = input("motion.axis.thrust_force");
    const sink = input("motion.axis.thrust_force");
    const result = evaluateLinkCompatibility(source, sink);
    expect(result.reasons).toEqual(["direction"]);
  });
});

describe("evaluateLinkCompatibility — parameter identity", () => {
  it("accepts a same-parameter link", () => {
    const result = evaluateLinkCompatibility(
      output("motion.axis.thrust_force"),
      input("motion.axis.thrust_force"),
    );
    expect(result.compatible).toBe(true);
    expect(result.mapped).toBe(false);
  });

  it("rejects a unit-compatible but semantically different parameter", () => {
    // payload_mass and carriage_mass are both kg — unit compatible, not the same.
    const result = evaluateLinkCompatibility(
      output("motion.axis.payload_mass"),
      input("motion.axis.carriage_mass"),
    );
    expect(result.compatible).toBe(false);
    expect(result.reasons).toEqual(["parameter_identity"]);
  });

  it("accepts a fully-compatible approved mapping", () => {
    const result = evaluateLinkCompatibility(
      output("motion.axis.payload_mass"),
      input("motion.axis.carriage_mass"),
      {
        mappings: [
          {
            from: asParameterId("motion.axis.payload_mass"),
            to: asParameterId("motion.axis.carriage_mass"),
          },
        ],
      },
    );
    expect(result.compatible).toBe(true);
    expect(result.mapped).toBe(true);
  });
});

describe("evaluateLinkCompatibility — semantic axes (via approved mapping)", () => {
  it("rejects a mapping across incompatible dimensions", () => {
    const result = evaluateLinkCompatibility(
      output("motion.axis.payload_mass"), // kg
      input("motion.axis.stroke_length"), // m
      {
        mappings: [
          {
            from: asParameterId("motion.axis.payload_mass"),
            to: asParameterId("motion.axis.stroke_length"),
          },
        ],
      },
    );
    expect(result.reasons).toContain("dimension");
  });

  it("rejects a mapping across value families", () => {
    const result = evaluateLinkCompatibility(
      output("motion.axis.payload_mass"), // quantity
      input("motion.axis.orientation"), // enum
      {
        mappings: [
          {
            from: asParameterId("motion.axis.payload_mass"),
            to: asParameterId("motion.axis.orientation"),
          },
        ],
      },
    );
    expect(result.reasons).toEqual(["value_type"]);
  });

  it("rejects a mapping across required/allowable bounds", () => {
    const result = evaluateLinkCompatibility(
      output("motion.profile.peak_velocity"), // { required, peak }
      input("motion.profile.max_velocity"), // { allowable }
      {
        mappings: [
          {
            from: asParameterId("motion.profile.peak_velocity"),
            to: asParameterId("motion.profile.max_velocity"),
          },
        ],
      },
    );
    expect(result.reasons).toContain("bound");
  });

  it("rejects a peak-vs-RMS aggregation mismatch", () => {
    // No RMS parameter exists in registry v1; build a focused test registry.
    const registry = buildParameterRegistry(
      [
        defineParameter({
          id: "test.velocity_peak",
          displayName: "Peak velocity",
          symbol: "v_pk",
          definition: "Peak velocity (test).",
          valueType: "quantity",
          canonicalUnit: "m/s",
          displayUnits: ["m/s"],
          qualifiers: { bound: "required", aggregation: "peak" },
        }),
        defineParameter({
          id: "test.velocity_rms",
          displayName: "RMS velocity",
          symbol: "v_rms",
          definition: "RMS velocity (test).",
          valueType: "quantity",
          canonicalUnit: "m/s",
          displayUnits: ["m/s"],
          qualifiers: { bound: "required", aggregation: "rms" },
        }),
      ],
      "test-1.0.0",
    );
    const result = evaluateLinkCompatibility(
      output("test.velocity_peak"),
      input("test.velocity_rms"),
      {
        registry,
        mappings: [
          {
            from: asParameterId("test.velocity_peak"),
            to: asParameterId("test.velocity_rms"),
          },
        ],
      },
    );
    expect(result.reasons).toEqual(["aggregation"]);
  });
});

describe("evaluateLinkCompatibility — load case", () => {
  it("rejects the same parameter under different load cases", () => {
    const result = evaluateLinkCompatibility(
      output("motion.axis.thrust_force", "peak"),
      input("motion.axis.thrust_force", "normal"),
    );
    expect(result.compatible).toBe(false);
    expect(result.reasons).toEqual(["load_case"]);
  });

  it("accepts the same parameter under the same load case", () => {
    const result = evaluateLinkCompatibility(
      output("motion.axis.thrust_force", "peak"),
      input("motion.axis.thrust_force", "peak"),
    );
    expect(result.compatible).toBe(true);
  });

  it("rejects an unpinned source silently linking into a load-case-pinned sink", () => {
    const result = evaluateLinkCompatibility(
      output("motion.axis.thrust_force"),
      input("motion.axis.thrust_force", "holding"),
    );
    expect(result.compatible).toBe(false);
    expect(result.reasons).toEqual(["load_case"]);
  });

  it("accepts a load-case-pinned source linking into an unpinned sink", () => {
    const result = evaluateLinkCompatibility(
      output("motion.axis.thrust_force", "peak"),
      input("motion.axis.thrust_force"),
    );
    expect(result.compatible).toBe(true);
  });

  it("accepts an unpinned source linking into an unpinned sink", () => {
    const result = evaluateLinkCompatibility(
      output("motion.axis.thrust_force"),
      input("motion.axis.thrust_force"),
    );
    expect(result.compatible).toBe(true);
  });
});
