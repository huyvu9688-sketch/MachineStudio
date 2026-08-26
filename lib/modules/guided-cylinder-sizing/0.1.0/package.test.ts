import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
} from "@/lib/engine";
import { readModuleSources } from "../../test-support";
import { guidedCylinderSizingModule } from "./index";
import {
  asQuantity,
  cushionTypeValue,
  mountingStyleValue,
  type RawInput,
} from "./test-helpers";

/** Degrees to radians -- see pneumatic-cylinder-sizing/0.1.0/package.test.ts's own identical helper for why. */
function deg(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * A minimal, valid scenario exercising every port. Round engineering
 * numbers, hand-checked before writing this fixture: a 20 kg load on a
 * 30 degree incline, mu = 0.15, no process force, 50/30/20 mm roll/pitch/
 * yaw offsets -- every output is straightforward to hand-verify.
 */
function baselineInput(): RawInput {
  return {
    values: {
      incline_angle: makeQuantity(deg(30), "rad"),
      friction_coefficient: makeQuantity(0.15, "ratio"),
      load_mass: makeQuantity(20, "kg"),
      process_force: makeQuantity(0, "N"),
      operating_pressure: makeQuantity(0.5, "MPa"),
      load_factor: makeQuantity(0.7, "ratio"),
      max_piston_speed: makeQuantity(0.3, "m/s"),
      cushion_type: cushionTypeValue("rubber_bumper"),
      required_stroke: makeQuantity(400, "mm"),
      mounting_style: mountingStyleValue("fixed-supported"),
      buckling_safety_factor: makeQuantity(4, "ratio"),
      roll_offset: makeQuantity(50, "mm"),
      pitch_offset: makeQuantity(30, "mm"),
      yaw_offset: makeQuantity(20, "mm"),
    },
  };
}

const EXPECTED_SOURCE_HASH = "f3b829c92ae603a7";

describe("guided-cylinder-sizing 0.1.0 module conformance", () => {
  const report = runModuleConformance(guidedCylinderSizingModule, {
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

describe("guided-cylinder-sizing 0.1.0 boundary and invalid input", () => {
  it("requires the full set of load/pressure/speed/stroke/mounting/safety-factor/offset inputs", () => {
    const input = baselineInput();
    delete input.values.load_mass;
    expect(() => executeModule(guidedCylinderSizingModule, input)).toThrow();
  });

  it("requires roll/pitch/yaw offsets", () => {
    const input = baselineInput();
    delete input.values.roll_offset;
    expect(() => executeModule(guidedCylinderSizingModule, input)).toThrow();
  });

  it("defaults an absent process_force to 0 N", () => {
    const input = baselineInput();
    delete input.values.process_force;
    const withoutProcessForce = executeModule(guidedCylinderSizingModule, input);
    const withZeroProcessForce = executeModule(guidedCylinderSizingModule, baselineInput());
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
    expect(() => executeModule(guidedCylinderSizingModule, input)).toThrow();
  });

  it("rejects an unknown mounting style", () => {
    const input = baselineInput();
    input.values.mounting_style = mountingStyleValue("cantilevered");
    expect(() => executeModule(guidedCylinderSizingModule, input)).toThrow();
  });

  it("rejects a buckling safety factor below 1", () => {
    const input = baselineInput();
    input.values.buckling_safety_factor = makeQuantity(0.5, "ratio");
    expect(() => executeModule(guidedCylinderSizingModule, input)).toThrow();
  });

  it("rejects a negative roll offset via the registry's own declared range", () => {
    const input = baselineInput();
    input.values.roll_offset = makeQuantity(-10, "mm");
    expect(() => executeModule(guidedCylinderSizingModule, input)).toThrow();
  });
});

describe("guided-cylinder-sizing 0.1.0 outputs", () => {
  it("produces dimensionally correct output units", () => {
    const computation = executeModule(guidedCylinderSizingModule, baselineInput());
    expect(computation.outputs.required_extend_force).toMatchObject({ unit: "N" });
    expect(computation.outputs.required_retract_force).toMatchObject({ unit: "N" });
    expect(computation.outputs.required_moment).toMatchObject({ unit: "N*m" });
    expect(computation.outputs.kinetic_energy).toMatchObject({ unit: "J" });
  });

  it("computes required_extend_force as process_force + m*g*sin(theta) + m*g*mu*cos(theta)", () => {
    const computation = executeModule(guidedCylinderSizingModule, baselineInput());
    const g = 9.80665;
    const thetaRad = (30 * Math.PI) / 180;
    const expected = 20 * g * Math.sin(thetaRad) + 20 * g * 0.15 * Math.cos(thetaRad);
    expect(asQuantity(computation.outputs.required_extend_force).value).toBeCloseTo(expected, 3);
  });

  it("computes required_retract_force as m*g*mu*cos(theta) - m*g*sin(theta)", () => {
    const computation = executeModule(guidedCylinderSizingModule, baselineInput());
    const g = 9.80665;
    const thetaRad = (30 * Math.PI) / 180;
    const expected = 20 * g * 0.15 * Math.cos(thetaRad) - 20 * g * Math.sin(thetaRad);
    expect(asQuantity(computation.outputs.required_retract_force).value).toBeCloseTo(expected, 3);
  });

  it("produces a negative required_retract_force on a steep enough incline with low friction", () => {
    const input = baselineInput();
    input.values.incline_angle = makeQuantity(deg(80), "rad");
    input.values.friction_coefficient = makeQuantity(0.05, "ratio");
    const computation = executeModule(guidedCylinderSizingModule, input);
    expect(asQuantity(computation.outputs.required_retract_force).value).toBeLessThan(0);
  });

  it("applies process_force only to required_extend_force, not required_retract_force", () => {
    const input = baselineInput();
    input.values.process_force = makeQuantity(500, "N");
    const withForce = executeModule(guidedCylinderSizingModule, input);
    const without = executeModule(guidedCylinderSizingModule, baselineInput());
    expect(
      asQuantity(withForce.outputs.required_extend_force).value -
        asQuantity(without.outputs.required_extend_force).value,
    ).toBeCloseTo(500, 6);
    expect(
      asQuantity(withForce.outputs.required_retract_force).value,
    ).toBeCloseTo(asQuantity(without.outputs.required_retract_force).value, 6);
  });

  it("computes required_moment as the Euclidean sum of F_req,ext * each offset", () => {
    const computation = executeModule(guidedCylinderSizingModule, baselineInput());
    const g = 9.80665;
    const thetaRad = (30 * Math.PI) / 180;
    const extendForceN = 20 * g * Math.sin(thetaRad) + 20 * g * 0.15 * Math.cos(thetaRad);
    const rollM = (extendForceN * 50) / 1000;
    const pitchM = (extendForceN * 30) / 1000;
    const yawM = (extendForceN * 20) / 1000;
    const expected = Math.sqrt(rollM ** 2 + pitchM ** 2 + yawM ** 2);
    expect(asQuantity(computation.outputs.required_moment).value).toBeCloseTo(expected, 3);
  });

  it("produces zero required_moment when every offset is zero", () => {
    const input = baselineInput();
    input.values.roll_offset = makeQuantity(0, "mm");
    input.values.pitch_offset = makeQuantity(0, "mm");
    input.values.yaw_offset = makeQuantity(0, "mm");
    const computation = executeModule(guidedCylinderSizingModule, input);
    expect(asQuantity(computation.outputs.required_moment).value).toBeCloseTo(0, 9);
  });

  it("echoes required_stroke, operating_pressure, load_factor, buckling_safety_factor, mounting_style, and cushion_type as outputs", () => {
    const computation = executeModule(guidedCylinderSizingModule, baselineInput());
    expect(asQuantity(computation.outputs.required_stroke_out).value).toBe(400);
    expect(asQuantity(computation.outputs.operating_pressure_out).value).toBe(0.5);
    expect(asQuantity(computation.outputs.load_factor_out).value).toBe(0.7);
    expect(asQuantity(computation.outputs.buckling_safety_factor_out).value).toBe(4);
    expect(computation.outputs.mounting_style_out).toMatchObject({ value: "fixed-supported" });
    expect(computation.outputs.cushion_type_out).toMatchObject({ value: "rubber_bumper" });
  });
});
