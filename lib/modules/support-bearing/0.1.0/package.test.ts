import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
} from "@/lib/engine";
import { readModuleSources } from "../../test-support";
import { supportBearingModule } from "./index";
import {
  asQuantity,
  bearingLocationValue,
  type RawInput,
} from "./test-helpers";

/**
 * A minimal, valid "fixed"-location scenario exercising every required
 * (and the fixed-only) port. Round engineering numbers, not a published
 * worked example — no full published worked numerical example is
 * reproduced here (see ./validation.ts's own header note for why). Every
 * case is kept comfortably within every applicable limit so the baseline
 * passes every check.
 */
function baselineFixedInput(): RawInput {
  return {
    values: {
      location: bearingLocationValue("fixed"),
      lead: makeQuantity(0.01, "m"),
      dynamic_load_rating: makeQuantity(5000, "N"),
      static_load_rating: makeQuantity(8000, "N"),
      allowable_speed: makeQuantity(300, "rad/s"),
      dynamic_load_factor_x: makeQuantity(1, "ratio"),
      dynamic_load_factor_y: makeQuantity(1.5, "ratio"),
      static_load_factor_x: makeQuantity(0.6, "ratio"),
      static_load_factor_y: makeQuantity(0.5, "ratio"),
      bore_diameter: makeQuantity(0.02, "m"),
      outside_diameter: makeQuantity(0.047, "m"),
      preload: makeQuantity(100, "N"),
      static_safety_factor_minimum: makeQuantity(1.5, "ratio"),
      normal_actual_radial_load: makeQuantity(200, "N"),
      normal_thrust_force: makeQuantity(300, "N"),
      normal_linear_velocity: makeQuantity(0.1, "m/s"),
      peak_actual_radial_load: makeQuantity(400, "N"),
      peak_thrust_force: makeQuantity(600, "N"),
      peak_linear_velocity: makeQuantity(0.15, "m/s"),
    },
  };
}

/** The same scenario, but for the supported/floating-side bearing. */
function baselineSupportedInput(): RawInput {
  return {
    values: {
      location: bearingLocationValue("supported"),
      lead: makeQuantity(0.01, "m"),
      dynamic_load_rating: makeQuantity(3000, "N"),
      static_load_rating: makeQuantity(4500, "N"),
      allowable_speed: makeQuantity(300, "rad/s"),
      dynamic_load_factor_x: makeQuantity(1, "ratio"),
      static_load_factor_x: makeQuantity(0.6, "ratio"),
      bore_diameter: makeQuantity(0.02, "m"),
      outside_diameter: makeQuantity(0.047, "m"),
      static_safety_factor_minimum: makeQuantity(1.5, "ratio"),
      normal_actual_radial_load: makeQuantity(150, "N"),
      normal_linear_velocity: makeQuantity(0.1, "m/s"),
      peak_actual_radial_load: makeQuantity(250, "N"),
      peak_linear_velocity: makeQuantity(0.15, "m/s"),
    },
  };
}

// Pinned by `npm run module:source-hash -- support-bearing 0.1.0` — see
// lib/engine/module-sdk/conformance.ts's "source-immutability" check. Update
// this value in the same commit as a deliberate change to this directory's
// .ts files; an unreviewed change leaves it stale and the check below fails.
const EXPECTED_SOURCE_HASH = "7abf25cd378683a7";

describe("support-bearing 0.1.0 module conformance", () => {
  const report = runModuleConformance(supportBearingModule, {
    sampleInputs: [baselineFixedInput(), baselineSupportedInput()],
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

describe("support-bearing 0.1.0 boundary and invalid input", () => {
  it("requires the full set of catalog rating and installation ports", () => {
    const input = baselineFixedInput();
    delete input.values.dynamic_load_rating;
    expect(() => executeModule(supportBearingModule, input)).toThrow();
  });

  it("requires the normal and peak per-case ports", () => {
    const input = baselineFixedInput();
    delete input.values.peak_actual_radial_load;
    expect(() => executeModule(supportBearingModule, input)).toThrow();
  });

  it("rejects non-positive catalog ratings", () => {
    const input = baselineFixedInput();
    input.values.dynamic_load_rating = makeQuantity(0, "N");
    expect(() => executeModule(supportBearingModule, input)).toThrow();
  });

  it('requires dynamic_load_factor_y, static_load_factor_y, and per-case thrust force when location is "fixed"', () => {
    const input = baselineFixedInput();
    delete input.values.dynamic_load_factor_y;
    expect(() => executeModule(supportBearingModule, input)).toThrow();
  });

  it('does not require dynamic_load_factor_y or thrust force when location is "supported"', () => {
    const computation = executeModule(
      supportBearingModule,
      baselineSupportedInput(),
    );
    expect(computation.outputs.normal_static_safety_factor).toBeDefined();
  });

  it("throws rather than report an infinite speed safety factor at exactly zero operating speed", () => {
    const input = baselineFixedInput();
    input.values.peak_linear_velocity = makeQuantity(0, "m/s");
    expect(() => executeModule(supportBearingModule, input)).toThrow();
  });

  it("throws rather than report an infinite life at exactly zero dynamic equivalent load", () => {
    const input = baselineSupportedInput();
    input.values.normal_actual_radial_load = makeQuantity(0, "N");
    expect(() => executeModule(supportBearingModule, input)).toThrow();
  });
});

describe("support-bearing 0.1.0 outputs", () => {
  it("produces dimensionally correct output units", () => {
    const computation = executeModule(
      supportBearingModule,
      baselineFixedInput(),
    );
    expect(computation.outputs.normal_dynamic_equivalent_load).toMatchObject({
      unit: "N",
    });
    expect(computation.outputs.normal_nominal_life).toMatchObject({
      unit: "rev",
    });
    expect(computation.outputs.normal_nominal_life_hours).toMatchObject({
      unit: "s",
    });
    expect(computation.outputs.normal_static_safety_factor).toMatchObject({
      unit: "ratio",
    });
    expect(computation.outputs.normal_speed_safety_factor).toMatchObject({
      unit: "ratio",
    });
  });

  it("computes the normal-case dynamic equivalent load as X*Fr + Y*Fa", () => {
    const computation = executeModule(
      supportBearingModule,
      baselineFixedInput(),
    );
    // P = 1*200 + 1.5*300 = 650 N
    expect(
      asQuantity(computation.outputs.normal_dynamic_equivalent_load).value,
    ).toBeCloseTo(1 * 200 + 1.5 * 300, 9);
  });

  it("computes the normal-case nominal life as (C/P)^3 * 1e6", () => {
    const computation = executeModule(
      supportBearingModule,
      baselineFixedInput(),
    );
    const p = 1 * 200 + 1.5 * 300;
    expect(
      asQuantity(computation.outputs.normal_nominal_life).value,
    ).toBeCloseTo((5000 / p) ** 3 * 1e6, 3);
  });

  it("computes the normal-case static safety factor as C0 / max(X0*Fr + Y0*Fa, Fr)", () => {
    const computation = executeModule(
      supportBearingModule,
      baselineFixedInput(),
    );
    // combined = 0.6*200 + 0.5*300 = 270 > Fr (200)
    const p0 = Math.max(0.6 * 200 + 0.5 * 300, 200);
    expect(
      asQuantity(computation.outputs.normal_static_safety_factor).value,
    ).toBeCloseTo(8000 / p0, 9);
  });

  it('does not consume axial load for a "supported"-location calculation', () => {
    const computation = executeModule(
      supportBearingModule,
      baselineSupportedInput(),
    );
    // P = X*Fr (no axial term); Fr = 150, X = 1
    expect(
      asQuantity(computation.outputs.normal_dynamic_equivalent_load).value,
    ).toBeCloseTo(150, 9);
  });

  it("computes the speed safety factor from the screw-shaft rotational speed", () => {
    const computation = executeModule(
      supportBearingModule,
      baselineFixedInput(),
    );
    // n = (0.1 / 0.01) * 2*pi = 62.8318... rad/s
    const expectedFactor = 300 / (10 * 2 * Math.PI);
    expect(
      asQuantity(computation.outputs.normal_speed_safety_factor).value,
    ).toBeCloseTo(expectedFactor, 6);
  });

  it("fails the static-safety check when the required minimum exceeds the computed factor", () => {
    const input = baselineFixedInput();
    input.values.static_safety_factor_minimum = makeQuantity(1000, "ratio");
    const computation = executeModule(supportBearingModule, input);
    const check = computation.checks.find(
      (c) => c.id === "static-safety-normal",
    );
    expect(check?.status).toBe("fail");
  });

  it("fails the speed-safety check when the operating speed exceeds the allowable speed", () => {
    const input = baselineFixedInput();
    input.values.allowable_speed = makeQuantity(1, "rad/s");
    const computation = executeModule(supportBearingModule, input);
    const check = computation.checks.find(
      (c) => c.id === "speed-safety-normal",
    );
    expect(check?.status).toBe("fail");
  });
});

describe("support-bearing 0.1.0 validation record completeness", () => {
  it("records the finalized solo-review reviewer and review date", () => {
    expect(supportBearingModule.validation.reviewer).toBe(
      "Solo validation — NSK fh/fn independent-benchmark substitute",
    );
    expect(supportBearingModule.validation.reviewDate).toBe("2026-08-12");
  });

  it("rejects provisional/draft release language in supported-use limits and deviations", () => {
    const PROHIBITED_FRAGMENTS = [
      "draft package",
      "not registered",
      "not released",
      "reviewer is pending",
      "stay todo",
    ];
    const strings = [
      ...supportBearingModule.validation.supportedUseLimits,
      ...supportBearingModule.validation.deviations,
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
