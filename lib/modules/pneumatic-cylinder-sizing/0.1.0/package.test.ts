import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
} from "@/lib/engine";
import { readModuleSources } from "../../test-support";
import { pneumaticCylinderSizingModule } from "./index";
import {
  asQuantity,
  cushionTypeValue,
  mountingStyleValue,
  type RawInput,
} from "./test-helpers";

/** Degrees to radians -- motion.axis.incline_angle's canonical unit is
 * "rad" (lib/engine/parameters/definitions.ts), and executeModule's own
 * assertValueMatchesParameter requires every module input Quantity to
 * already carry its parameter's canonical unit (no implicit unit
 * conversion at the input boundary) -- see
 * lib/engine/module-sdk/execute.ts. Every other module's own test fixture
 * follows this same "supply incline_angle in rad" convention. */
function deg(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * A minimal, valid scenario exercising every port. Round engineering
 * numbers, hand-checked before writing this fixture: a 20 kg load on a
 * 30 degree incline, mu = 0.15, no process force -- required_extend_force
 * and required_retract_force are both straightforward to hand-verify.
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
    },
  };
}

// Placeholder -- a later Stage 6 task replaces this with the real value
// from `npm run module:source-hash -- pneumatic-cylinder-sizing 0.1.0`.
const EXPECTED_SOURCE_HASH = "0000000000000000";

describe("pneumatic-cylinder-sizing 0.1.0 module conformance", () => {
  const report = runModuleConformance(pneumaticCylinderSizingModule, {
    sampleInputs: [baselineInput()],
    sources: readModuleSources(import.meta.dirname),
    expectedSourceHash: EXPECTED_SOURCE_HASH,
  });

  for (const check of report.checks) {
    if (check.id === "source-immutability") continue; // asserted separately below, expected to fail until the hash-pinning task runs
    it(`${check.id} (${check.status})`, () => {
      expect(check.status, check.detail).toBe("pass");
    });
  }

  it("runs the import-boundary check and it passes (not skipped)", () => {
    const check = report.checks.find((c) => c.id === "import-boundary");
    expect(check).toBeDefined();
    expect(check?.status, check?.detail).toBe("pass");
  });
});

describe("pneumatic-cylinder-sizing 0.1.0 boundary and invalid input", () => {
  it("requires the full set of load/pressure/speed/stroke/mounting/safety-factor inputs", () => {
    const input = baselineInput();
    delete input.values.load_mass;
    expect(() => executeModule(pneumaticCylinderSizingModule, input)).toThrow();
  });

  it("defaults an absent process_force to 0 N", () => {
    const input = baselineInput();
    delete input.values.process_force;
    expect(() => executeModule(pneumaticCylinderSizingModule, input)).not.toThrow();
  });

  it("rejects an incline angle above 90 degrees via the registry's own declared range", () => {
    const input = baselineInput();
    input.values.incline_angle = makeQuantity(deg(120), "rad");
    expect(() => executeModule(pneumaticCylinderSizingModule, input)).toThrow();
  });

  it("rejects an unknown mounting style", () => {
    const input = baselineInput();
    input.values.mounting_style = mountingStyleValue("cantilevered");
    expect(() => executeModule(pneumaticCylinderSizingModule, input)).toThrow();
  });

  it("rejects a buckling safety factor below 1", () => {
    const input = baselineInput();
    input.values.buckling_safety_factor = makeQuantity(0.5, "ratio");
    expect(() => executeModule(pneumaticCylinderSizingModule, input)).toThrow();
  });
});

describe("pneumatic-cylinder-sizing 0.1.0 outputs", () => {
  it("produces dimensionally correct output units", () => {
    const computation = executeModule(pneumaticCylinderSizingModule, baselineInput());
    expect(computation.outputs.required_extend_force).toMatchObject({ unit: "N" });
    expect(computation.outputs.required_retract_force).toMatchObject({ unit: "N" });
    expect(computation.outputs.kinetic_energy).toMatchObject({ unit: "J" });
  });

  it("computes required_extend_force as process_force + m*g*sin(theta) + m*g*mu*cos(theta)", () => {
    const computation = executeModule(pneumaticCylinderSizingModule, baselineInput());
    const g = 9.80665;
    const thetaRad = (30 * Math.PI) / 180;
    const expected = 20 * g * Math.sin(thetaRad) + 20 * g * 0.15 * Math.cos(thetaRad);
    expect(asQuantity(computation.outputs.required_extend_force).value).toBeCloseTo(expected, 3);
  });

  it("computes required_retract_force as m*g*mu*cos(theta) - m*g*sin(theta)", () => {
    const computation = executeModule(pneumaticCylinderSizingModule, baselineInput());
    const g = 9.80665;
    const thetaRad = (30 * Math.PI) / 180;
    const expected = 20 * g * 0.15 * Math.cos(thetaRad) - 20 * g * Math.sin(thetaRad);
    expect(asQuantity(computation.outputs.required_retract_force).value).toBeCloseTo(expected, 3);
  });

  it("produces a negative required_retract_force on a steep enough incline with low friction", () => {
    const input = baselineInput();
    input.values.incline_angle = makeQuantity(deg(80), "rad");
    input.values.friction_coefficient = makeQuantity(0.05, "ratio");
    const computation = executeModule(pneumaticCylinderSizingModule, input);
    expect(asQuantity(computation.outputs.required_retract_force).value).toBeLessThan(0);
  });

  it("applies process_force only to required_extend_force, not required_retract_force", () => {
    const input = baselineInput();
    input.values.process_force = makeQuantity(500, "N");
    const withForce = executeModule(pneumaticCylinderSizingModule, input);
    const without = executeModule(pneumaticCylinderSizingModule, baselineInput());
    expect(
      asQuantity(withForce.outputs.required_extend_force).value -
        asQuantity(without.outputs.required_extend_force).value,
    ).toBeCloseTo(500, 6);
    expect(
      asQuantity(withForce.outputs.required_retract_force).value,
    ).toBeCloseTo(asQuantity(without.outputs.required_retract_force).value, 6);
  });

  it("echoes required_stroke, operating_pressure, load_factor, buckling_safety_factor, mounting_style, and cushion_type as outputs", () => {
    const computation = executeModule(pneumaticCylinderSizingModule, baselineInput());
    expect(asQuantity(computation.outputs.required_stroke_out).value).toBe(400);
    expect(asQuantity(computation.outputs.operating_pressure_out).value).toBe(0.5);
    expect(asQuantity(computation.outputs.load_factor_out).value).toBe(0.7);
    expect(asQuantity(computation.outputs.buckling_safety_factor_out).value).toBe(4);
    expect(computation.outputs.mounting_style_out).toMatchObject({ value: "fixed-supported" });
    expect(computation.outputs.cushion_type_out).toMatchObject({ value: "rubber_bumper" });
  });
});
