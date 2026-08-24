import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
} from "@/lib/engine";
import { readModuleSources } from "../../test-support";
import { pneumaticCylinderModule } from "./index";
import {
  asQuantity,
  cushionTypeValue,
  mountingStyleValue,
  type RawInput,
} from "./test-helpers";

/**
 * A minimal, valid scenario exercising every port (both required-force
 * sides, a real cushion type, and piping configured). Round engineering
 * numbers, not a published worked example -- the kernel-level and
 * compute-path reproductions of SMC's own worked examples live in
 * ./math.test.ts and ./smc-reference-examples.ts. Every applicable check
 * passes for this baseline (confirmed by hand-computation before writing
 * this fixture, not merely assumed).
 */
function baselineInput(): RawInput {
  return {
    values: {
      bore_diameter: makeQuantity(50, "mm"),
      rod_diameter: makeQuantity(16, "mm"),
      operating_pressure: makeQuantity(0.5, "MPa"),
      load_factor: makeQuantity(0.8, "ratio"),
      required_extend_force: makeQuantity(500, "N"),
      required_retract_force: makeQuantity(300, "N"),
      load_mass: makeQuantity(20, "kg"),
      max_piston_speed: makeQuantity(0.4, "m/s"),
      cushion_type: cushionTypeValue("rubber_bumper"),
      allowable_kinetic_energy: makeQuantity(5, "J"),
      stroke: makeQuantity(400, "mm"),
      mounting_style: mountingStyleValue("fixed-supported"),
      buckling_safety_factor: makeQuantity(4, "ratio"),
      piping_length: makeQuantity(1000, "mm"),
      piping_bore: makeQuantity(8, "mm"),
    },
  };
}

// Pinned by `npm run module:source-hash -- pneumatic-cylinder 0.1.0` -- see
// lib/engine/module-sdk/conformance.ts's "source-immutability" check. Update
// this value in the same commit as a deliberate change to this directory's
// .ts files; an unreviewed change leaves it stale and the check below fails.
const EXPECTED_SOURCE_HASH = "9700fdc94f2a344f";

describe("pneumatic-cylinder 0.1.0 module conformance", () => {
  const report = runModuleConformance(pneumaticCylinderModule, {
    sampleInputs: [baselineInput()],
    sources: readModuleSources(import.meta.dirname),
    expectedSourceHash: EXPECTED_SOURCE_HASH,
  });

  for (const check of report.checks) {
    it(`${check.id} (${check.status})`, () => {
      expect(check.status, check.detail).toBe("pass");
    });
  }

  it("passes overall conformance", () => {
    expect(report.ok, JSON.stringify(report.checks, null, 2)).toBe(true);
  });

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

describe("pneumatic-cylinder 0.1.0 boundary and invalid input", () => {
  it("requires the full set of geometry/pressure/mass/speed/stroke/mounting/safety-factor ports", () => {
    const input = baselineInput();
    delete input.values.bore_diameter;
    expect(() => executeModule(pneumaticCylinderModule, input)).toThrow();
  });

  it("rejects a rod diameter not smaller than the bore diameter", () => {
    const input = baselineInput();
    input.values.rod_diameter = makeQuantity(50, "mm");
    expect(() => executeModule(pneumaticCylinderModule, input)).toThrow();
  });

  it("rejects when neither required_extend_force nor required_retract_force is supplied", () => {
    const input = baselineInput();
    delete input.values.required_extend_force;
    delete input.values.required_retract_force;
    expect(() => executeModule(pneumaticCylinderModule, input)).toThrow();
  });

  it("accepts a required force on only one side", () => {
    const input = baselineInput();
    delete input.values.required_retract_force;
    expect(() => executeModule(pneumaticCylinderModule, input)).not.toThrow();
  });

  it("rejects a cushion type other than none without an allowable kinetic energy", () => {
    const input = baselineInput();
    delete input.values.allowable_kinetic_energy;
    expect(() => executeModule(pneumaticCylinderModule, input)).toThrow();
  });

  it("accepts cushion_type none without an allowable kinetic energy", () => {
    const input = baselineInput();
    input.values.cushion_type = cushionTypeValue("none");
    delete input.values.allowable_kinetic_energy;
    expect(() => executeModule(pneumaticCylinderModule, input)).not.toThrow();
  });

  it("rejects a nonzero piping length without a piping bore", () => {
    const input = baselineInput();
    delete input.values.piping_bore;
    expect(() => executeModule(pneumaticCylinderModule, input)).toThrow();
  });

  it("accepts an absent piping length/bore (defaults piping_length to 0)", () => {
    const input = baselineInput();
    delete input.values.piping_length;
    delete input.values.piping_bore;
    expect(() => executeModule(pneumaticCylinderModule, input)).not.toThrow();
  });

  it("rejects non-positive geometry via the registry's own declared range", () => {
    const input = baselineInput();
    input.values.stroke = makeQuantity(0, "mm");
    expect(() => executeModule(pneumaticCylinderModule, input)).toThrow();
  });

  it("rejects an unknown mounting style", () => {
    const input = baselineInput();
    input.values.mounting_style = mountingStyleValue("cantilevered");
    expect(() => executeModule(pneumaticCylinderModule, input)).toThrow();
  });

  it("rejects a buckling safety factor below 1", () => {
    const input = baselineInput();
    input.values.buckling_safety_factor = makeQuantity(0.5, "ratio");
    expect(() => executeModule(pneumaticCylinderModule, input)).toThrow();
  });
});

describe("pneumatic-cylinder 0.1.0 outputs", () => {
  it("produces dimensionally correct output units", () => {
    const computation = executeModule(pneumaticCylinderModule, baselineInput());
    expect(computation.outputs.theoretical_extend_force).toMatchObject({
      unit: "N",
    });
    expect(computation.outputs.theoretical_retract_force).toMatchObject({
      unit: "N",
    });
    expect(computation.outputs.kinetic_energy).toMatchObject({ unit: "J" });
    expect(computation.outputs.buckling_load).toMatchObject({ unit: "N" });
    expect(computation.outputs.permissible_compressive_load).toMatchObject({
      unit: "N",
    });
    expect(computation.outputs.air_consumption_per_cycle).toMatchObject({
      unit: "L",
    });
    expect(computation.outputs.required_air_volume).toMatchObject({
      unit: "L/min",
    });
  });

  it("computes theoretical force as load_factor * area * pressure for both sides", () => {
    const computation = executeModule(pneumaticCylinderModule, baselineInput());
    expect(
      asQuantity(computation.outputs.theoretical_extend_force).value,
    ).toBeCloseTo(0.8 * ((Math.PI * 50 ** 2) / 4) * 0.5, 6);
    expect(
      asQuantity(computation.outputs.theoretical_retract_force).value,
    ).toBeCloseTo(0.8 * ((Math.PI * (50 ** 2 - 16 ** 2)) / 4) * 0.5, 6);
  });

  it("computes permissible_compressive_load as buckling_load / buckling_safety_factor", () => {
    const input = baselineInput();
    input.values.buckling_safety_factor = makeQuantity(5, "ratio");
    const computation = executeModule(pneumaticCylinderModule, input);
    const bucklingLoad = asQuantity(computation.outputs.buckling_load).value;
    expect(
      asQuantity(computation.outputs.permissible_compressive_load).value,
    ).toBeCloseTo(bucklingLoad / 5, 6);
  });

  it("fails the force-capacity-extend check when the required force exceeds the theoretical force", () => {
    const input = baselineInput();
    input.values.required_extend_force = makeQuantity(1_000_000, "N");
    const computation = executeModule(pneumaticCylinderModule, input);
    const check = computation.checks.find(
      (c) => c.id === "force-capacity-extend",
    );
    expect(check?.status).toBe("fail");
  });

  it("reports not_applicable for force-capacity-retract when no retract force is supplied", () => {
    const input = baselineInput();
    delete input.values.required_retract_force;
    const computation = executeModule(pneumaticCylinderModule, input);
    const check = computation.checks.find(
      (c) => c.id === "force-capacity-retract",
    );
    expect(check?.status).toBe("not_applicable");
  });

  it("reports not_applicable for cushion-kinetic-energy when cushion_type is none", () => {
    const input = baselineInput();
    input.values.cushion_type = cushionTypeValue("none");
    delete input.values.allowable_kinetic_energy;
    const computation = executeModule(pneumaticCylinderModule, input);
    const check = computation.checks.find(
      (c) => c.id === "cushion-kinetic-energy",
    );
    expect(check?.status).toBe("not_applicable");
  });

  it("fails the cushion-kinetic-energy check when kinetic energy exceeds the allowable energy", () => {
    const input = baselineInput();
    input.values.allowable_kinetic_energy = makeQuantity(0.001, "J");
    const computation = executeModule(pneumaticCylinderModule, input);
    const check = computation.checks.find(
      (c) => c.id === "cushion-kinetic-energy",
    );
    expect(check?.status).toBe("fail");
  });

  it("fails the buckling check for a long, slender rod under a heavy pressure/factor", () => {
    const input = baselineInput();
    input.values.bore_diameter = makeQuantity(200, "mm");
    input.values.rod_diameter = makeQuantity(10, "mm");
    input.values.stroke = makeQuantity(2000, "mm");
    input.values.mounting_style = mountingStyleValue("fixed-free");
    input.values.load_factor = makeQuantity(1, "ratio");
    input.values.operating_pressure = makeQuantity(1, "MPa");
    const computation = executeModule(pneumaticCylinderModule, input);
    const check = computation.checks.find((c) => c.id === "buckling");
    expect(check?.status).toBe("fail");
  });

  it("reports a lower air_consumption_per_cycle when no piping is configured (drops the piping term)", () => {
    const input = baselineInput();
    delete input.values.piping_length;
    delete input.values.piping_bore;
    const computation = executeModule(pneumaticCylinderModule, input);
    const withPiping = executeModule(pneumaticCylinderModule, baselineInput());
    expect(
      asQuantity(computation.outputs.air_consumption_per_cycle).value,
    ).toBeLessThan(
      asQuantity(withPiping.outputs.air_consumption_per_cycle).value,
    );
  });
});
