import { describe, expect, it } from "vitest";
import { executeModule, makeQuantity } from "@/lib/engine";
import { dualRodCylinderSizingModule } from "@/lib/modules/dual-rod-cylinder-sizing/0.1.0/index";
import {
  cushionTypeValue,
  enumValue,
  mountingOrientationValue,
} from "@/lib/modules/dual-rod-cylinder-sizing/0.1.0/test-helpers";
import { evaluateDualRodCylinderCandidates } from "./dual-rod-cylinder-matching";

/**
 * Reproduces the smc-reference-example.ts CXS2M20 scenario exactly
 * (horizontal, 0.5 kg load, 0.1 friction, 0 incline, 0 process force,
 * 0.5 MPa, 0.7 load factor, 0.3 m/s speed, 8mm required stroke, 4mm
 * overhang) and runs it through the real matcher against two synthetic
 * candidates.
 */
function runScenario() {
  return executeModule(dualRodCylinderSizingModule, {
    values: {
      incline_angle: makeQuantity(0, "rad"),
      friction_coefficient: makeQuantity(0.1, "ratio"),
      load_mass: makeQuantity(0.5, "kg"),
      process_force: makeQuantity(0, "N"),
      operating_pressure: makeQuantity(0.5, "MPa"),
      load_factor: makeQuantity(0.7, "ratio"),
      max_piston_speed: makeQuantity(0.3, "m/s"),
      cushion_type: cushionTypeValue("none"),
      required_stroke: makeQuantity(8, "mm"),
      overhang_length: makeQuantity(4, "mm"),
      mounting_orientation: mountingOrientationValue("horizontal"),
    },
  });
}

describe("evaluateDualRodCylinderCandidates", () => {
  it("accepts a real CXS2M20-like candidate that clears every check", () => {
    const computation = runScenario();

    const result = evaluateDualRodCylinderCandidates(computation, [
      {
        id: "cxs2m20-good",
        attributes: {
          bore_diameter: makeQuantity(20, "mm"),
          rod_diameter: makeQuantity(10, "mm"),
          bearing_type: enumValue("dual_rod_bearing_type", "slide"),
          // Real CXS2M20 catalog stroke range is not yet seeded (Task 22);
          // 5-100mm is a synthetic standard-stroke range wide enough to
          // cover this scenario's own 8mm required stroke.
          stroke_min: makeQuantity(5, "mm"),
          stroke_max: makeQuantity(100, "mm"),
        },
      },
    ]);

    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0]?.candidate.id).toBe("cxs2m20-good");
    expect(result.rejected).toHaveLength(0);
  });

  it("rejects an undersized bore-6 candidate on the load-mass-vs-overhang-length check", () => {
    const computation = runScenario();

    const result = evaluateDualRodCylinderCandidates(computation, [
      {
        id: "cxs2m6-undersized",
        attributes: {
          bore_diameter: makeQuantity(6, "mm"),
          rod_diameter: makeQuantity(3, "mm"),
          bearing_type: enumValue("dual_rod_bearing_type", "slide"),
          stroke_min: makeQuantity(1, "mm"),
          stroke_max: makeQuantity(50, "mm"),
        },
      },
    ]);

    expect(result.accepted).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
    expect(
      result.rejected[0]?.reasons.some((r) => r.includes("Allowable load mass")),
    ).toBe(true);
  });
});
