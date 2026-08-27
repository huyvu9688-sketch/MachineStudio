import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
} from "@/lib/engine";
import { readModuleSources } from "../../test-support";
import { dualRodCylinderSizingModule } from "./index";
import {
  asQuantity,
  cushionTypeValue,
  mountingOrientationValue,
  type RawInput,
} from "./test-helpers";

function deg(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * A minimal, valid scenario exercising every port. Round engineering
 * numbers, hand-checked before writing this fixture: a 15 kg load on a
 * 20 degree incline, mu = 0.1, no process force, 400 mm required stroke,
 * horizontal mounting, 30 mm overhang -- every output is straightforward
 * to hand-verify.
 */
function baselineInput(): RawInput {
  return {
    values: {
      incline_angle: makeQuantity(deg(20), "rad"),
      friction_coefficient: makeQuantity(0.1, "ratio"),
      load_mass: makeQuantity(15, "kg"),
      process_force: makeQuantity(0, "N"),
      operating_pressure: makeQuantity(0.5, "MPa"),
      load_factor: makeQuantity(0.7, "ratio"),
      max_piston_speed: makeQuantity(0.3, "m/s"),
      cushion_type: cushionTypeValue("rubber_bumper"),
      required_stroke: makeQuantity(400, "mm"),
      overhang_length: makeQuantity(30, "mm"),
      mounting_orientation: mountingOrientationValue("horizontal"),
    },
  };
}

const EXPECTED_SOURCE_HASH = "4a67f6cd75227e5f";

describe("dual-rod-cylinder-sizing 0.1.0 module conformance", () => {
  const report = runModuleConformance(dualRodCylinderSizingModule, {
    sampleInputs: [baselineInput()],
    sources: readModuleSources(import.meta.dirname),
    expectedSourceHash: EXPECTED_SOURCE_HASH,
  });

  for (const check of report.checks) {
    it(`${check.id} (${check.status})`, () => {
      expect(check.status, check.detail).toBe("pass");
    });
  }

  it("runs the import-boundary check and it passes (not skipped)", () => {
    const check = report.checks.find((c) => c.id === "import-boundary");
    expect(check).toBeDefined();
    expect(check?.status, check?.detail).toBe("pass");
  });

  it("runs the source-immutability check and it passes (not skipped)", () => {
    const check = report.checks.find((c) => c.id === "source-immutability");
    expect(check).toBeDefined();
    expect(check?.status, check?.detail).toBe("pass");
  });
});

describe("dual-rod-cylinder-sizing 0.1.0 boundary and invalid input", () => {
  it("requires the full set of load/pressure/speed/stroke/overhang/orientation inputs", () => {
    const input = baselineInput();
    delete input.values.load_mass;
    expect(() => executeModule(dualRodCylinderSizingModule, input)).toThrow();
  });

  it("requires overhang_length", () => {
    const input = baselineInput();
    delete input.values.overhang_length;
    expect(() => executeModule(dualRodCylinderSizingModule, input)).toThrow();
  });

  it("requires mounting_orientation", () => {
    const input = baselineInput();
    delete input.values.mounting_orientation;
    expect(() => executeModule(dualRodCylinderSizingModule, input)).toThrow();
  });

  it("defaults an absent process_force to 0 N", () => {
    const input = baselineInput();
    delete input.values.process_force;
    const withoutProcessForce = executeModule(dualRodCylinderSizingModule, input);
    const withZeroProcessForce = executeModule(dualRodCylinderSizingModule, baselineInput());
    expect(
      asQuantity(withoutProcessForce.outputs.required_extend_force).value,
    ).toBeCloseTo(
      asQuantity(withZeroProcessForce.outputs.required_extend_force).value,
      9,
    );
  });

  it("rejects an incline angle above 90 degrees via the registry's own declared range", () => {
    const input = baselineInput();
    input.values.incline_angle = makeQuantity(deg(120), "rad");
    expect(() => executeModule(dualRodCylinderSizingModule, input)).toThrow();
  });

  it("rejects an unknown mounting orientation", () => {
    const input = baselineInput();
    input.values.mounting_orientation = mountingOrientationValue("inclined");
    expect(() => executeModule(dualRodCylinderSizingModule, input)).toThrow();
  });

  it("rejects a negative overhang length via the registry's own declared range", () => {
    const input = baselineInput();
    input.values.overhang_length = makeQuantity(-10, "mm");
    expect(() => executeModule(dualRodCylinderSizingModule, input)).toThrow();
  });
});

describe("dual-rod-cylinder-sizing 0.1.0 outputs", () => {
  it("produces dimensionally correct output units", () => {
    const computation = executeModule(dualRodCylinderSizingModule, baselineInput());
    expect(computation.outputs.required_extend_force).toMatchObject({ unit: "N" });
    expect(computation.outputs.required_retract_force).toMatchObject({ unit: "N" });
    expect(computation.outputs.kinetic_energy).toMatchObject({ unit: "J" });
    expect(computation.outputs.overhang_length_out).toMatchObject({ unit: "mm" });
  });

  it("computes required_extend_force as process_force + m*g*sin(theta) + m*g*mu*cos(theta)", () => {
    const computation = executeModule(dualRodCylinderSizingModule, baselineInput());
    const g = 9.80665;
    const thetaRad = (20 * Math.PI) / 180;
    const expected = 15 * g * Math.sin(thetaRad) + 15 * g * 0.1 * Math.cos(thetaRad);
    expect(asQuantity(computation.outputs.required_extend_force).value).toBeCloseTo(expected, 3);
  });

  it("computes required_retract_force as m*g*mu*cos(theta) - m*g*sin(theta)", () => {
    const computation = executeModule(dualRodCylinderSizingModule, baselineInput());
    const g = 9.80665;
    const thetaRad = (20 * Math.PI) / 180;
    const expected = 15 * g * 0.1 * Math.cos(thetaRad) - 15 * g * Math.sin(thetaRad);
    expect(asQuantity(computation.outputs.required_retract_force).value).toBeCloseTo(expected, 3);
  });

  it("produces a negative required_retract_force on a steep enough incline with low friction", () => {
    const input = baselineInput();
    input.values.incline_angle = makeQuantity(deg(80), "rad");
    input.values.friction_coefficient = makeQuantity(0.05, "ratio");
    const computation = executeModule(dualRodCylinderSizingModule, input);
    expect(asQuantity(computation.outputs.required_retract_force).value).toBeLessThan(0);
  });

  it("applies process_force only to required_extend_force, not required_retract_force", () => {
    const input = baselineInput();
    input.values.process_force = makeQuantity(200, "N");
    const withForce = executeModule(dualRodCylinderSizingModule, input);
    const without = executeModule(dualRodCylinderSizingModule, baselineInput());
    expect(
      asQuantity(withForce.outputs.required_extend_force).value -
        asQuantity(without.outputs.required_extend_force).value,
    ).toBeCloseTo(200, 6);
    expect(
      asQuantity(withForce.outputs.required_retract_force).value,
    ).toBeCloseTo(asQuantity(without.outputs.required_retract_force).value, 6);
  });

  it("echoes required_stroke, overhang_length, mounting_orientation, operating_pressure, load_factor, max_piston_speed, and cushion_type as outputs", () => {
    const computation = executeModule(dualRodCylinderSizingModule, baselineInput());
    expect(asQuantity(computation.outputs.required_stroke_out).value).toBe(400);
    expect(asQuantity(computation.outputs.overhang_length_out).value).toBe(30);
    expect(computation.outputs.mounting_orientation_out).toMatchObject({ value: "horizontal" });
    expect(asQuantity(computation.outputs.operating_pressure_out).value).toBe(0.5);
    expect(asQuantity(computation.outputs.load_factor_out).value).toBe(0.7);
    expect(asQuantity(computation.outputs.max_piston_speed_out).value).toBe(0.3);
    expect(computation.outputs.cushion_type_out).toMatchObject({ value: "rubber_bumper" });
  });

  it("echoes load_mass as an output (needed by the catalog matcher's load-mass-vs-overhang check)", () => {
    const computation = executeModule(dualRodCylinderSizingModule, baselineInput());
    expect(asQuantity(computation.outputs.load_mass_out).value).toBe(15);
  });
});
