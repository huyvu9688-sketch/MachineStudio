import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
} from "@/lib/engine";
import { readModuleSources } from "../../test-support";
import { ballScrewModule } from "./index";
import {
  asQuantity,
  dynamicLoadRatingBasisValue as basis,
  endSupportArrangementValue as endSupport,
  type RawInput,
} from "./test-helpers";

/**
 * A minimal, valid scenario exercising every required port. Round engineering
 * numbers, not a published worked example (the kernel-level reproduction of
 * Rockford Ball Screw's own worked example lives in ./math.test.ts — see
 * ./validation.ts). `peak_linear_velocity` is deliberately kept below the
 * permissible critical speed for this geometry so the baseline passes every
 * applicable check.
 */
function baselineInput(): RawInput {
  return {
    values: {
      minor_diameter: makeQuantity(0.02, "m"),
      lead: makeQuantity(0.01, "m"),
      unsupported_length: makeQuantity(1, "m"),
      end_support_arrangement: endSupport("fixed-supported"),
      dynamic_load_rating: makeQuantity(20000, "N"),
      dynamic_load_rating_basis: basis("revolutions"),
      static_load_rating: makeQuantity(40000, "N"),
      preload: makeQuantity(500, "N"),
      internal_friction_coefficient: makeQuantity(0.2, "ratio"),
      mechanical_efficiency: makeQuantity(0.9, "ratio"),
      // gear_ratio omitted deliberately: exercises the registry's constant
      // default (1, direct-connected) auto-fill in resolveModuleInput.
      static_safety_factor_minimum: makeQuantity(1.5, "ratio"),
      buckling_safety_margin: makeQuantity(0.5, "ratio"),
      normal_thrust_force: makeQuantity(500, "N"),
      normal_time_fraction: makeQuantity(0.7, "ratio"),
      normal_linear_velocity: makeQuantity(0.2, "m/s"),
      peak_thrust_force: makeQuantity(1500, "N"),
      peak_time_fraction: makeQuantity(0.3, "ratio"),
      peak_linear_velocity: makeQuantity(0.4, "m/s"),
    },
  };
}

// Pinned by `npm run module:source-hash -- ball-screw 0.1.0` — see
// lib/engine/module-sdk/conformance.ts's "source-immutability" check. Update
// this value in the same commit as a deliberate change to this directory's
// .ts files; an unreviewed change leaves it stale and the check below fails.
const EXPECTED_SOURCE_HASH = "347ace63740b27fd";

describe("ball-screw 0.1.0 module conformance", () => {
  const report = runModuleConformance(ballScrewModule, {
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

describe("ball-screw 0.1.0 boundary and invalid input", () => {
  it("requires the full set of screw geometry/rating ports", () => {
    const input = baselineInput();
    delete input.values.minor_diameter;
    expect(() => executeModule(ballScrewModule, input)).toThrow();
  });

  it("requires the normal and peak per-case ports", () => {
    const input = baselineInput();
    delete input.values.peak_thrust_force;
    expect(() => executeModule(ballScrewModule, input)).toThrow();
  });

  it("rejects non-positive screw geometry", () => {
    const input = baselineInput();
    input.values.lead = makeQuantity(0, "m");
    expect(() => executeModule(ballScrewModule, input)).toThrow();
  });

  it("rejects an unknown end-support arrangement", () => {
    const input = baselineInput();
    input.values.end_support_arrangement = endSupport("cantilevered");
    expect(() => executeModule(ballScrewModule, input)).toThrow();
  });

  it("rejects a distance-basis dynamic load rating (0.1.0 supports revolutions only)", () => {
    const input = baselineInput();
    input.values.dynamic_load_rating_basis = basis("distance");
    expect(() => executeModule(ballScrewModule, input)).toThrow();
  });
});

describe("ball-screw 0.1.0 outputs", () => {
  it("produces dimensionally correct output units", () => {
    const computation = executeModule(ballScrewModule, baselineInput());
    expect(computation.outputs.normal_drive_torque).toMatchObject({
      unit: "N*m",
    });
    expect(computation.outputs.peak_drive_torque).toMatchObject({
      unit: "N*m",
    });
    expect(computation.outputs.normal_static_safety_factor).toMatchObject({
      unit: "ratio",
    });
    expect(computation.outputs.equivalent_dynamic_load).toMatchObject({
      unit: "N",
    });
    expect(computation.outputs.mean_rotational_speed).toMatchObject({
      unit: "rad/s",
    });
    expect(computation.outputs.nominal_life).toMatchObject({ unit: "rev" });
    expect(computation.outputs.nominal_life_hours).toMatchObject({
      unit: "s",
    });
    expect(computation.outputs.buckling_load).toMatchObject({ unit: "N" });
    expect(computation.outputs.permissible_compressive_load).toMatchObject({
      unit: "N",
    });
    expect(computation.outputs.critical_speed).toMatchObject({
      unit: "rad/s",
    });
    expect(computation.outputs.permissible_speed).toMatchObject({
      unit: "rad/s",
    });
  });

  it("computes the static safety factor as static_load_rating / |applied load|", () => {
    const computation = executeModule(ballScrewModule, baselineInput());
    expect(
      asQuantity(computation.outputs.normal_static_safety_factor).value,
    ).toBeCloseTo(40000 / 500, 9);
    expect(
      asQuantity(computation.outputs.peak_static_safety_factor).value,
    ).toBeCloseTo(40000 / 1500, 9);
  });

  it("computes the permissible compressive load as buckling_load * buckling_safety_margin", () => {
    const input = baselineInput();
    input.values.buckling_safety_margin = makeQuantity(0.8, "ratio");
    const computation = executeModule(ballScrewModule, input);
    const bucklingLoad = asQuantity(computation.outputs.buckling_load).value;
    expect(
      asQuantity(computation.outputs.permissible_compressive_load).value,
    ).toBeCloseTo(bucklingLoad * 0.8, 6);
  });

  it("computes the permissible speed as critical_speed * 0.8 (fixed, uncontested margin)", () => {
    const computation = executeModule(ballScrewModule, baselineInput());
    const criticalSpeed = asQuantity(computation.outputs.critical_speed).value;
    expect(asQuantity(computation.outputs.permissible_speed).value).toBeCloseTo(
      criticalSpeed * 0.8,
      9,
    );
  });

  it("reports not_applicable for the DN limit when no manufacturer data is supplied", () => {
    const computation = executeModule(ballScrewModule, baselineInput());
    const dnCheck = computation.checks.find((check) => check.id === "dn-limit");
    expect(dnCheck?.status).toBe("not_applicable");
  });

  it("evaluates the DN limit when manufacturer data is supplied", () => {
    const input = baselineInput();
    input.values.manufacturer_speed_limit = makeQuantity(1, "rad/s");
    const computation = executeModule(ballScrewModule, input);
    const dnCheck = computation.checks.find((check) => check.id === "dn-limit");
    expect(dnCheck?.status).toBe("fail");
  });

  it("fails the static safety check when the applied load exceeds the supplied minimum allows", () => {
    const input = baselineInput();
    input.values.static_safety_factor_minimum = makeQuantity(1000, "ratio");
    const computation = executeModule(ballScrewModule, input);
    const check = computation.checks.find(
      (c) => c.id === "static-safety-normal",
    );
    expect(check?.status).toBe("fail");
  });

  it("fails the critical-speed check when the operating speed exceeds the permissible speed", () => {
    const input = baselineInput();
    input.values.peak_linear_velocity = makeQuantity(2, "m/s");
    const computation = executeModule(ballScrewModule, input);
    const check = computation.checks.find(
      (c) => c.id === "critical-speed-peak",
    );
    expect(check?.status).toBe("fail");
  });
});

describe("ball-screw 0.1.0 validation record completeness", () => {
  it("records the finalized solo-review reviewer and review date", () => {
    expect(ballScrewModule.validation.reviewer).toBe(
      "Solo validation — THK independent-benchmark substitute",
    );
    expect(ballScrewModule.validation.reviewDate).toBe("2026-08-12");
  });

  it("rejects provisional/draft release language in supported-use limits and deviations", () => {
    const PROHIBITED_FRAGMENTS = [
      "draft package",
      "not registered",
      "not released",
      "reviewer is pending",
      "no reviewer is recorded",
    ];
    const strings = [
      ...ballScrewModule.validation.supportedUseLimits,
      ...ballScrewModule.validation.deviations,
    ];
    expect(strings.length).toBeGreaterThan(0);
    for (const text of strings) {
      const lower = text.toLowerCase();
      for (const fragment of PROHIBITED_FRAGMENTS) {
        expect(lower).not.toContain(fragment);
      }
    }
  });
});
