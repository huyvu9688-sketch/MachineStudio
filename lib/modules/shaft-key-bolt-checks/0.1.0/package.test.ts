import { describe, expect, it } from "vitest";
import { executeModule, makeQuantity, runModuleConformance } from "@/lib/engine";
import { readModuleSources } from "../../test-support";
import { shaftKeyBoltChecksModule } from "./index";
import {
  asQuantity,
  boltThreadStandardValue,
  type RawInput,
} from "./test-helpers";

/**
 * A minimal, valid scenario exercising every required port. Round
 * engineering numbers, not a published worked example — the three Stage 4
 * reference examples reproduced through the real compute() path live in
 * ./reference-examples.ts/.test.ts (see ./validation.ts). Every case is
 * kept comfortably within every applicable limit so the baseline passes
 * every check.
 */
function baselineInput(): RawInput {
  return {
    values: {
      shaft_diameter: makeQuantity(0.02, "m"),
      // shaft_bore_diameter omitted deliberately: exercises the registry's
      // constant default (0, solid shaft) auto-fill in resolveModuleInput.
      shaft_material_yield_strength: makeQuantity(250, "MPa"),
      shaft_torque_service_factor: makeQuantity(1, "ratio"),
      shaft_bending_service_factor: makeQuantity(1.5, "ratio"),
      shaft_safety_factor_minimum: makeQuantity(1.5, "ratio"),
      normal_shaft_applied_torque: makeQuantity(100, "N*m"),
      normal_shaft_applied_bending_moment: makeQuantity(50, "N*m"),
      peak_shaft_applied_torque: makeQuantity(120, "N*m"),
      peak_shaft_applied_bending_moment: makeQuantity(60, "N*m"),
      key_width: makeQuantity(0.008, "m"),
      key_height: makeQuantity(0.009, "m"),
      key_length: makeQuantity(0.025, "m"),
      key_material_yield_strength: makeQuantity(200, "MPa"),
      key_safety_factor_minimum: makeQuantity(1.5, "ratio"),
      bolt_thread_standard: boltThreadStandardValue("metric"),
      bolt_nominal_diameter: makeQuantity(0.01, "m"),
      bolt_thread_pitch: makeQuantity(0.0015, "m"),
      bolt_proof_strength: makeQuantity(580, "MPa"),
      bolt_k_factor: makeQuantity(0.2, "ratio"),
      bolt_installation_torque: makeQuantity(25, "N*m"),
      bolt_safety_factor_minimum: makeQuantity(1.5, "ratio"),
      // bolt_joint_stiffness_ratio omitted deliberately: exercises the
      // tensile check's own conservative C = 1 default.
      normal_bolt_external_tensile_load: makeQuantity(1000, "N"),
      peak_bolt_external_tensile_load: makeQuantity(2000, "N"),
    },
  };
}

// Pinned by `npm run module:source-hash -- shaft-key-bolt-checks 0.1.0` —
// see lib/engine/module-sdk/conformance.ts's "source-immutability" check.
// Update this value in the same commit as a deliberate change to this
// directory's .ts files; an unreviewed change leaves it stale and the check
// below fails.
const EXPECTED_SOURCE_HASH = "2b2961a779ba6b59";

describe("shaft-key-bolt-checks 0.1.0 module conformance", () => {
  const report = runModuleConformance(shaftKeyBoltChecksModule, {
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
});

describe("shaft-key-bolt-checks 0.1.0 boundary and invalid input", () => {
  it("requires the full shaft/key/bolt input set", () => {
    const input = baselineInput();
    delete input.values.shaft_diameter;
    expect(() => executeModule(shaftKeyBoltChecksModule, input)).toThrow();
  });

  it("requires the normal and peak per-case ports", () => {
    const input = baselineInput();
    delete input.values.peak_shaft_applied_torque;
    expect(() => executeModule(shaftKeyBoltChecksModule, input)).toThrow();
  });

  it("rejects a non-positive shaft yield strength", () => {
    const input = baselineInput();
    input.values.shaft_material_yield_strength = makeQuantity(0, "MPa");
    expect(() => executeModule(shaftKeyBoltChecksModule, input)).toThrow();
  });

  it("throws rather than report an infinite shaft safety factor when torque and moment are both zero", () => {
    const input = baselineInput();
    input.values.normal_shaft_applied_torque = makeQuantity(0, "N*m");
    input.values.normal_shaft_applied_bending_moment = makeQuantity(0, "N*m");
    expect(() => executeModule(shaftKeyBoltChecksModule, input)).toThrow();
  });

  it("rejects a hollow-shaft bore diameter that is not less than the outer diameter", () => {
    const input = baselineInput();
    input.values.shaft_bore_diameter = makeQuantity(0.02, "m");
    expect(() => executeModule(shaftKeyBoltChecksModule, input)).toThrow();
  });
});

describe("shaft-key-bolt-checks 0.1.0 outputs", () => {
  it("produces dimensionally correct output units", () => {
    const computation = executeModule(shaftKeyBoltChecksModule, baselineInput());
    expect(computation.outputs.normal_shaft_safety_factor).toMatchObject({
      unit: "ratio",
    });
    expect(computation.outputs.normal_shaft_combined_stress).toMatchObject({
      unit: "MPa",
    });
    expect(computation.outputs.normal_key_shear_safety_factor).toMatchObject({
      unit: "ratio",
    });
    expect(computation.outputs.bolt_preload).toMatchObject({ unit: "N" });
    expect(computation.outputs.normal_bolt_tensile_safety_factor).toMatchObject(
      { unit: "ratio" },
    );
  });

  it("computes the normal-case shaft safety factor as Sy / sigma_e", () => {
    const computation = executeModule(shaftKeyBoltChecksModule, baselineInput());
    // sigma_e = 16/(pi*D^3) * sqrt((Ks*T)^2 + (Km*M)^2), D=0.02, Ks*T=100, Km*M=75
    const sigmaE =
      (16 / (Math.PI * Math.pow(0.02, 3))) * Math.sqrt(100 * 100 + 75 * 75);
    const expectedFs = (250e6 / sigmaE);
    expect(
      asQuantity(computation.outputs.normal_shaft_safety_factor).value,
    ).toBeCloseTo(expectedFs, 6);
  });

  it("computes bolt preload as F = T_i / (K*d)", () => {
    const computation = executeModule(shaftKeyBoltChecksModule, baselineInput());
    expect(asQuantity(computation.outputs.bolt_preload).value).toBeCloseTo(
      25 / (0.2 * 0.01),
      6,
    );
  });

  it("scales the tensile check's applied-tension share by joint_stiffness_ratio when supplied", () => {
    const withoutC = executeModule(shaftKeyBoltChecksModule, baselineInput());
    const input = baselineInput();
    input.values.bolt_joint_stiffness_ratio = makeQuantity(0.2, "ratio");
    const withC = executeModule(shaftKeyBoltChecksModule, input);
    // A smaller C reduces the bolt's own applied-tension share, raising the
    // safety factor relative to the C = 1 default.
    expect(
      asQuantity(withC.outputs.normal_bolt_tensile_safety_factor).value,
    ).toBeGreaterThan(
      asQuantity(withoutC.outputs.normal_bolt_tensile_safety_factor).value,
    );
  });

  it("fails the shaft safety check when the required minimum is not met", () => {
    const input = baselineInput();
    input.values.shaft_safety_factor_minimum = makeQuantity(10, "ratio");
    const computation = executeModule(shaftKeyBoltChecksModule, input);
    const check = computation.checks.find((c) => c.id === "shaft-safety-normal");
    expect(check?.status).toBe("fail");
  });

  it("fails the key bearing-safety check when the required minimum is not met", () => {
    const input = baselineInput();
    input.values.key_safety_factor_minimum = makeQuantity(10, "ratio");
    const computation = executeModule(shaftKeyBoltChecksModule, input);
    const check = computation.checks.find(
      (c) => c.id === "key-bearing-safety-normal",
    );
    expect(check?.status).toBe("fail");
  });

  it("fails the bolt tensile-safety check when proof strength is too low", () => {
    const input = baselineInput();
    input.values.bolt_proof_strength = makeQuantity(50, "MPa");
    const computation = executeModule(shaftKeyBoltChecksModule, input);
    const check = computation.checks.find(
      (c) => c.id === "bolt-tensile-safety-normal",
    );
    expect(check?.status).toBe("fail");
  });
});
