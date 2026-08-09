import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
} from "@/lib/engine";
import { linearGuideModule } from "./package";
import {
  asQuantity,
  axisVector,
  orientationValue,
  preloadGradeValue,
  rollingElementTypeValue,
  type RawInput,
} from "./test-helpers";

/**
 * A minimal, valid scenario exercising every required port: a horizontally
 * installed guide carrying a ~200 kg assembly whose centre of mass sits ahead
 * of the guide centre, so the resolved moment loads one block pair harder than
 * the other. Round engineering numbers, not a published worked example — PMI's
 * own Chapter 9 example is reserved for Stage 4 (see ./validation.ts).
 *
 * The catalog ratings are PMI's own MSA35 figures (C = 63.6 kN, C0 = 100.6 kN)
 * so the resulting safety factor and life land in a realistic range rather
 * than an arbitrary one.
 */
function baselineInput(): RawInput {
  return {
    values: {
      orientation: orientationValue("horizontal"),
      rail_spacing: makeQuantity(0.4, "m"),
      block_spacing: makeQuantity(0.3, "m"),
      static_load_rating: makeQuantity(100_600, "N"),
      dynamic_load_rating: makeQuantity(63_600, "N"),
      rolling_element_type: rollingElementTypeValue("ball"),
      preload_grade: preloadGradeValue("light"),
      load_factor: makeQuantity(1.5, "ratio"),
      // hardness_factor and temperature_factor omitted deliberately: exercises
      // the registry's constant default (1.0) auto-fill in resolveModuleInput.
      static_safety_factor_minimum: makeQuantity(1.3, "ratio"),
      normal_resultant_force: axisVector([-300, 0, -1962], "N"),
      normal_resultant_moment: axisVector([0, 100, 0], "N*m"),
      peak_resultant_force: axisVector([-800, 0, -2500], "N"),
      peak_resultant_moment: axisVector([0, 250, 0], "N*m"),
    },
  };
}

describe("linear-guide 0.1.0 module conformance", () => {
  const report = runModuleConformance(linearGuideModule, {
    sampleInputs: [baselineInput()],
  });

  for (const check of report.checks) {
    it(`${check.id} (${check.status})`, () => {
      expect(check.status, check.detail).not.toBe("fail");
    });
  }

  it("passes overall conformance", () => {
    expect(report.ok, JSON.stringify(report.checks, null, 2)).toBe(true);
  });
});

describe("linear-guide 0.1.0 boundary and invalid input", () => {
  it("requires the full set of geometry, rating, and factor ports", () => {
    const input = baselineInput();
    delete input.values.rail_spacing;
    expect(() => executeModule(linearGuideModule, input)).toThrow();
  });

  it("requires the normal and peak resolved force and moment", () => {
    const input = baselineInput();
    delete input.values.peak_resultant_moment;
    expect(() => executeModule(linearGuideModule, input)).toThrow();
  });

  it("rejects non-positive guide geometry", () => {
    const input = baselineInput();
    input.values.block_spacing = makeQuantity(0, "m");
    expect(() => executeModule(linearGuideModule, input)).toThrow();
  });

  it("rejects a roller-type guide (0.1.0 implements the ball life branch only)", () => {
    const input = baselineInput();
    input.values.rolling_element_type = rollingElementTypeValue("roller");
    expect(() => executeModule(linearGuideModule, input)).toThrow();
  });

  it("rejects an inclined axis rather than approximating it", () => {
    const input = baselineInput();
    input.values.orientation = orientationValue("inclined");
    expect(() => executeModule(linearGuideModule, input)).toThrow();
  });

  it("rejects a force vector that is not three axis.v1 components", () => {
    const input = baselineInput();
    input.values.normal_resultant_force = axisVector(
      [0, -1962] as unknown as readonly [number, number, number],
      "N",
    );
    expect(() => executeModule(linearGuideModule, input)).toThrow();
  });

  it("rejects a completely unloaded guide instead of reporting an infinite safety factor", () => {
    const input = baselineInput();
    input.values.normal_resultant_force = axisVector([0, 0, 0], "N");
    input.values.normal_resultant_moment = axisVector([0, 0, 0], "N*m");
    expect(() => executeModule(linearGuideModule, input)).toThrow(
      /zero equivalent load/,
    );
  });
});

describe("linear-guide 0.1.0 outputs", () => {
  it("produces dimensionally correct output units", () => {
    const computation = executeModule(linearGuideModule, baselineInput());
    for (const loadCase of ["normal", "peak"] as const) {
      expect(computation.outputs[`${loadCase}_equivalent_load`]).toMatchObject({
        unit: "N",
      });
      expect(
        computation.outputs[`${loadCase}_static_safety_factor`],
      ).toMatchObject({ unit: "ratio" });
      // Life is a travel distance stored canonically in metres and displayed
      // in km, not a revolution count (context/modules/linear-guide/
      // stage-1-spec.md item 4).
      expect(computation.outputs[`${loadCase}_nominal_life`]).toMatchObject({
        unit: "m",
      });
    }
  });

  it("reports the governing block's equivalent load, not an average or a sum", () => {
    // The baseline's +My moment loads the +X block pair (3 and 4) harder:
    // 1962/4 + 100/(2*0.3) = 657.17 N, against 323.83 N on the other pair.
    const computation = executeModule(linearGuideModule, baselineInput());
    expect(
      asQuantity(computation.outputs.normal_equivalent_load).value,
    ).toBeCloseTo(1962 / 4 + 100 / (2 * 0.3), 6);
  });

  it("computes the static safety factor as static_load_rating / governing equivalent load", () => {
    const computation = executeModule(linearGuideModule, baselineInput());
    const equivalentLoad = asQuantity(
      computation.outputs.normal_equivalent_load,
    ).value;
    expect(
      asQuantity(computation.outputs.normal_static_safety_factor).value,
    ).toBeCloseTo(100_600 / equivalentLoad, 9);
  });

  it("computes nominal life on the ball-type 50 km distance basis", () => {
    const computation = executeModule(linearGuideModule, baselineInput());
    const equivalentLoad = asQuantity(
      computation.outputs.normal_equivalent_load,
    ).value;
    const expectedKm =
      Math.pow((1 * 1) / 1.5 / (equivalentLoad / 63_600), 3) * 50;
    expect(
      asQuantity(computation.outputs.normal_nominal_life).value,
    ).toBeCloseTo(expectedKm * 1000, 3);
  });

  it("applies the supplied load factor rather than a built-in one", () => {
    const relaxed = executeModule(linearGuideModule, baselineInput());
    const harsh = baselineInput();
    harsh.values.load_factor = makeQuantity(3, "ratio");
    const harshComputation = executeModule(linearGuideModule, harsh);

    expect(
      asQuantity(harshComputation.outputs.normal_nominal_life).value,
    ).toBeLessThan(asQuantity(relaxed.outputs.normal_nominal_life).value);
  });

  it("gives the same result for a vertical installation as a horizontal one under the same resolved load", () => {
    // Orientation selects no formula here, unlike in PMI's own method: gravity
    // is already resolved into the incoming force and moment. Asserted rather
    // than left implicit, because it is the single biggest departure from the
    // shape of the source's own procedure (./frame.ts).
    const horizontal = executeModule(linearGuideModule, baselineInput());
    const verticalInput = baselineInput();
    verticalInput.values.orientation = orientationValue("vertical");
    const vertical = executeModule(linearGuideModule, verticalInput);

    expect(vertical.outputs).toEqual(horizontal.outputs);
  });

  it("fails the static safety check when the supplied minimum is not met", () => {
    const input = baselineInput();
    input.values.static_safety_factor_minimum = makeQuantity(1000, "ratio");
    const computation = executeModule(linearGuideModule, input);
    expect(
      computation.checks.find((c) => c.id === "static-safety-normal")?.status,
    ).toBe("fail");
  });

  it("reports nominal life and preload grade without evaluating them", () => {
    // Both are deliberately not_applicable rather than pass: no required
    // minimum life is registered, and preload suitability is fitted-condition
    // guidance in the source, not a criterion (./checks.ts).
    const computation = executeModule(linearGuideModule, baselineInput());
    expect(
      computation.checks.find((c) => c.id === "nominal-life-normal")?.status,
    ).toBe("not_applicable");
    const preload = computation.checks.find((c) => c.id === "preload-grade");
    expect(preload?.status).toBe("not_applicable");
    expect(preload?.message).toContain("light");
  });

  it("traces the guide-frame resolution as its own step", () => {
    // The mapping from axis.v1 to guide-frame terms carries real sign choices,
    // so a report has to be able to show it rather than jumping from the
    // resolved load straight to per-block results.
    const computation = executeModule(linearGuideModule, baselineInput());
    const section = computation.trace.sections.find(
      (s) => s.id === "guide-frame",
    );
    expect(section?.children.map((child) => child.id)).toEqual([
      "guide-frame-normal",
      "guide-frame-peak",
    ]);
  });
});
