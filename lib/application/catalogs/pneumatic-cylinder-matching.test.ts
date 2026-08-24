import { describe, expect, it } from "vitest";
import {
  makeQuantity,
  SERIALIZATION_FORMAT_VERSION,
  type EnumValue,
  type ModuleComputation,
} from "@/lib/engine";
import { evaluatePneumaticCylinderCandidates } from "./pneumatic-cylinder-matching";

/** `EnumValue` requires `v: SerializationFormatVersion`, not just `kind`/`enumId`/`value`. */
function enumValue(enumId: string, value: string): EnumValue {
  return { v: SERIALIZATION_FORMAT_VERSION, kind: "enum", enumId, value };
}

function fixtureComputation(overrides: Partial<Record<string, unknown>> = {}): ModuleComputation {
  return {
    outputs: {
      required_extend_force: makeQuantity(1000, "N"),
      required_retract_force: makeQuantity(200, "N"),
      kinetic_energy: makeQuantity(2, "J"),
      required_stroke_out: makeQuantity(200, "mm"),
      operating_pressure_out: makeQuantity(0.5, "MPa"),
      load_factor_out: makeQuantity(0.7, "ratio"),
      buckling_safety_factor_out: makeQuantity(4, "ratio"),
      mounting_style_out: enumValue("pneumatic_mounting_style", "fixed-supported"),
      cushion_type_out: enumValue("pneumatic_cushion_type", "rubber_bumper"),
      ...overrides,
    },
    trace: { nodes: [] } as never,
    checks: [],
    warnings: [],
    assumptions: [],
    validity: [],
  };
}

function candidate(
  id: string,
  attrs: Partial<{
    bore: number;
    rod: number;
    strokeMin: number;
    strokeMax: number;
    mounting: string;
    ke: number;
  }>,
) {
  return {
    id,
    attributes: {
      bore_diameter: makeQuantity(attrs.bore ?? 63, "mm"),
      rod_diameter: makeQuantity(attrs.rod ?? 20, "mm"),
      stroke_min: makeQuantity(attrs.strokeMin ?? 25, "mm"),
      stroke_max: makeQuantity(attrs.strokeMax ?? 500, "mm"),
      mounting_style: enumValue("pneumatic_mounting_style", attrs.mounting ?? "fixed-supported"),
      allowable_kinetic_energy_rubber_bumper: makeQuantity(attrs.ke ?? 5, "J"),
    },
  };
}

describe("evaluatePneumaticCylinderCandidates", () => {
  it("accepts a candidate that clears every generic and custom check", () => {
    const result = evaluatePneumaticCylinderCandidates(fixtureComputation(), [
      candidate("CM2B63", {}),
    ]);
    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
  });

  it("rejects a candidate whose stroke range does not cover the requirement", () => {
    const result = evaluatePneumaticCylinderCandidates(fixtureComputation(), [
      candidate("CM2B63-short", { strokeMax: 100 }),
    ]);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]?.reasons.some((r) => r.includes("Maximum standard stroke"))).toBe(true);
  });

  it("rejects a candidate whose mounting style does not match", () => {
    const result = evaluatePneumaticCylinderCandidates(fixtureComputation(), [
      candidate("CM2B63-wrong-mount", { mounting: "fixed-free" }),
    ]);
    expect(result.rejected).toHaveLength(1);
  });

  it("rejects a candidate whose bore is too small for the required extend force", () => {
    const result = evaluatePneumaticCylinderCandidates(fixtureComputation(), [
      candidate("CM2B20-small", { bore: 20, rod: 8 }),
    ]);
    expect(result.rejected).toHaveLength(1);
    expect(
      result.rejected[0]?.reasons.some((r) => r.includes("Theoretical extend force")),
    ).toBe(true);
  });

  it("rejects a candidate whose cushion energy rating is too low", () => {
    const result = evaluatePneumaticCylinderCandidates(fixtureComputation(), [
      candidate("CM2B63-weak-cushion", { ke: 0.1 }),
    ]);
    expect(result.rejected).toHaveLength(1);
  });

  it("skips the cushion-energy criterion when cushion_type is none", () => {
    const result = evaluatePneumaticCylinderCandidates(
      fixtureComputation({
        cushion_type_out: enumValue("pneumatic_cushion_type", "none"),
      }),
      [candidate("CM2B63-no-cushion-rating", { ke: 0 })],
    );
    expect(result.accepted).toHaveLength(1);
  });

  it("ranks a tighter-fitting bore ahead of an oversized one", () => {
    const result = evaluatePneumaticCylinderCandidates(fixtureComputation(), [
      candidate("CM2B100-oversized", { bore: 100, rod: 25 }),
      candidate("CM2B63-tight", { bore: 63, rod: 20 }),
    ]);
    expect(result.accepted.map((a) => a.candidate.id)).toEqual([
      "CM2B63-tight",
      "CM2B100-oversized",
    ]);
  });

  it("floors a negative required_retract_force at 0 N rather than rejecting every candidate", () => {
    const result = evaluatePneumaticCylinderCandidates(
      fixtureComputation({ required_retract_force: makeQuantity(-300, "N") }),
      [candidate("CM2B63", {})],
    );
    expect(result.accepted).toHaveLength(1);
  });
});
