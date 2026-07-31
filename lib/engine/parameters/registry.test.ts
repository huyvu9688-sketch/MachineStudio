import { describe, expect, it } from "vitest";
import { SERIALIZATION_FORMAT_VERSION } from "../values";
import { makeQuantity } from "../units";
import { defineParameter } from "./define";
import { PARAMETER_DEFINITIONS } from "./definitions";
import { ParameterRegistryError } from "./errors";
import {
  buildParameterRegistry,
  parameterScope,
  type ParameterRegistry,
} from "./registry";
import {
  getParameter,
  hasParameter,
  listParameters,
  PARAMETER_REGISTRY,
} from "./registered";
import type { ParameterDefinition } from "./types";

function build(defs: readonly ParameterDefinition[]): ParameterRegistry {
  return buildParameterRegistry(defs, "test");
}

/** Asserts building `defs` throws a ParameterRegistryError with `code`. */
function expectBuildError(
  defs: readonly ParameterDefinition[],
  code: ParameterRegistryError["code"],
): void {
  try {
    build(defs);
  } catch (error) {
    expect(error).toBeInstanceOf(ParameterRegistryError);
    expect((error as ParameterRegistryError).code).toBe(code);
    return;
  }
  throw new Error(`expected build to throw ParameterRegistryError(${code})`);
}

const validQuantity = defineParameter({
  id: "a.mass",
  displayName: "Mass",
  symbol: "m",
  definition: "A mass.",
  valueType: "quantity",
  canonicalUnit: "kg",
  displayUnits: ["kg", "g"],
  range: { min: 0, unit: "kg" },
});

describe("parameterScope", () => {
  it("is everything before the final dotted segment", () => {
    expect(parameterScope("motion.axis.payload_mass")).toBe("motion.axis");
    expect(parameterScope("screw.lead")).toBe("screw");
    expect(parameterScope("flat")).toBe("");
  });
});

describe("parameter registry compatibility", () => {
  it("supports only explicitly declared historical registry targets", () => {
    const registry = buildParameterRegistry([], "1.1.0", ["1.0.0", "1.1.0"]);

    expect(registry.supportsVersion("1.0.0")).toBe(true);
    expect(registry.supportsVersion("1.1.0")).toBe(true);
    expect(registry.supportsVersion("1.0.1")).toBe(false);
    expect(registry.supportsVersion("2.0.0")).toBe(false);
  });
});

describe("released registry", () => {
  it("loads every seed definition and is version 1.1.0", () => {
    expect(PARAMETER_REGISTRY.version).toBe("1.1.0");
    expect(listParameters().length).toBe(PARAMETER_DEFINITIONS.length);
  });

  it("explicitly supports packages authored against registry v1.0.0", () => {
    expect(PARAMETER_REGISTRY.supportsVersion("1.0.0")).toBe(true);
    expect(PARAMETER_REGISTRY.supportsVersion("1.0.1")).toBe(false);
  });

  it("looks up by stable ID", () => {
    expect(hasParameter("motion.axis.payload_mass")).toBe(true);
    expect(getParameter("motion.axis.payload_mass")?.symbol).toBe("m_p");
    expect(hasParameter("does.not.exist")).toBe(false);
    expect(getParameter("does.not.exist")).toBeUndefined();
  });

  it("lists definitions sorted by ID", () => {
    const ids = listParameters().map((d) => d.id);
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });

  it("maps every planned Phase 1A port (axis application + motion profile)", () => {
    // Exit-criterion coverage for the groups released in registry v1. Downstream
    // transmission/drive-train ports are approved pending proposals released per
    // module at its Stage-2 contract (see ./README.md).
    const expected = [
      "project.supply_frequency",
      "project.supply_voltage_class",
      "env.ambient_temperature",
      "motion.axis.orientation",
      "motion.axis.incline_angle",
      "motion.axis.stroke_length",
      "motion.axis.payload_mass",
      "motion.axis.carriage_mass",
      "motion.axis.additional_moving_mass",
      "motion.axis.total_moving_mass",
      "motion.axis.center_of_mass_offset",
      "motion.axis.friction_coefficient",
      "motion.axis.gravity",
      "motion.axis.duty_cycle",
      "motion.axis.case_travel_direction",
      "motion.axis.case_axial_acceleration",
      "motion.axis.guide_resistance_force",
      "motion.axis.external_force",
      "motion.axis.external_moment",
      "motion.axis.gravitational_force",
      "motion.axis.thrust_force",
      "motion.profile.move_distance",
      "motion.profile.move_time",
      "motion.profile.dwell_time",
      "motion.profile.cycle_time",
      "motion.profile.max_velocity",
      "motion.profile.max_acceleration",
      "motion.profile.peak_velocity",
      "motion.profile.peak_acceleration",
      "motion.profile.peak_deceleration",
    ];
    for (const id of expected) {
      expect(hasParameter(id)).toBe(true);
    }
  });

  it("gives the Stage 2 axis-load inputs precise moving-case semantics", () => {
    const direction = getParameter("motion.axis.case_travel_direction");
    const acceleration = getParameter("motion.axis.case_axial_acceleration");
    const resistance = getParameter("motion.axis.guide_resistance_force");

    expect(direction?.valueType).toBe("enum");
    expect(direction?.enumOptions).toEqual(["positive", "negative"]);
    expect(direction?.loadCases).toEqual(["normal", "peak", "emergency_stop"]);
    expect(acceleration?.canonicalUnit).toBe("m/s^2");
    expect(acceleration?.qualifiers).toEqual({
      bound: "required",
      loadNature: "dynamic",
    });
    expect(acceleration?.loadCases).toEqual([
      "normal",
      "peak",
      "emergency_stop",
    ]);
    expect(resistance?.canonicalUnit).toBe("N");
    expect(resistance?.range).toEqual({ min: 0, unit: "N" });
    expect(resistance?.loadCases).toEqual(["normal", "peak", "emergency_stop"]);
  });

  it("carries a registered canonical unit and dimension-compatible display units for every physical parameter", () => {
    // Also exercised structurally by build validation; asserted explicitly here.
    for (const def of listParameters()) {
      if (def.valueType === "quantity" || def.valueType === "vector_quantity") {
        expect(def.canonicalUnit).toBeDefined();
        expect(def.displayUnits && def.displayUnits.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("unique IDs", () => {
  it("rejects a duplicate parameter ID", () => {
    expectBuildError(
      [validQuantity, { ...validQuantity, symbol: "m2" }],
      "duplicate_id",
    );
  });
});

describe("symbol per scope", () => {
  it("rejects two parameters sharing a symbol in the same scope", () => {
    const other = defineParameter({
      id: "a.other_mass",
      displayName: "Other mass",
      symbol: "m",
      definition: "Another mass.",
      valueType: "quantity",
      canonicalUnit: "kg",
      displayUnits: ["kg"],
    });
    expectBuildError([validQuantity, other], "duplicate_symbol");
  });

  it("allows the same symbol in different scopes", () => {
    const other = defineParameter({
      id: "b.mass",
      displayName: "Mass in scope b",
      symbol: "m",
      definition: "A mass in another scope.",
      valueType: "quantity",
      canonicalUnit: "kg",
      displayUnits: ["kg"],
    });
    expect(() => build([validQuantity, other])).not.toThrow();
  });
});

describe("valid unit dimensions", () => {
  it("rejects an unknown canonical unit", () => {
    expectBuildError(
      [
        defineParameter({
          id: "x.q",
          displayName: "Q",
          symbol: "q",
          definition: "q",
          valueType: "quantity",
          canonicalUnit: "furlong",
          displayUnits: ["furlong"],
        }),
      ],
      "unknown_unit",
    );
  });

  it("rejects a display unit of a different dimension", () => {
    expectBuildError(
      [
        defineParameter({
          id: "x.q",
          displayName: "Q",
          symbol: "q",
          definition: "q",
          valueType: "quantity",
          canonicalUnit: "kg",
          displayUnits: ["kg", "N"],
        }),
      ],
      "dimension_mismatch",
    );
  });

  it("rejects a range unit of a different dimension", () => {
    expectBuildError(
      [
        defineParameter({
          id: "x.q",
          displayName: "Q",
          symbol: "q",
          definition: "q",
          valueType: "quantity",
          canonicalUnit: "kg",
          displayUnits: ["kg"],
          range: { min: 0, unit: "N" },
        }),
      ],
      "dimension_mismatch",
    );
  });

  it("rejects a range with min greater than max", () => {
    expectBuildError(
      [
        defineParameter({
          id: "x.q",
          displayName: "Q",
          symbol: "q",
          definition: "q",
          valueType: "quantity",
          canonicalUnit: "kg",
          displayUnits: ["kg"],
          range: { min: 10, max: 1, unit: "kg" },
        }),
      ],
      "invalid_range",
    );
  });

  it("rejects a physical parameter missing its unit metadata", () => {
    expectBuildError(
      [
        defineParameter({
          id: "x.q",
          displayName: "Q",
          symbol: "q",
          definition: "q",
          valueType: "quantity",
        }),
      ],
      "missing_physical_metadata",
    );
  });
});

describe("value-type shape", () => {
  it("rejects an enum parameter that declares unit metadata", () => {
    expectBuildError(
      [
        defineParameter({
          id: "x.e",
          displayName: "E",
          symbol: "e",
          definition: "e",
          valueType: "enum",
          enumId: "e",
          enumOptions: ["a", "b"],
          canonicalUnit: "kg",
        }),
      ],
      "unexpected_physical_metadata",
    );
  });

  it("rejects an enum parameter without options", () => {
    expectBuildError(
      [
        defineParameter({
          id: "x.e",
          displayName: "E",
          symbol: "e",
          definition: "e",
          valueType: "enum",
          enumId: "e",
        }),
      ],
      "invalid_enum",
    );
  });

  it("rejects an enum parameter with duplicate options", () => {
    expectBuildError(
      [
        defineParameter({
          id: "x.e",
          displayName: "E",
          symbol: "e",
          definition: "e",
          valueType: "enum",
          enumId: "e",
          enumOptions: ["a", "a"],
        }),
      ],
      "invalid_enum",
    );
  });

  it("rejects a boolean parameter that declares enum metadata", () => {
    expectBuildError(
      [
        defineParameter({
          id: "x.b",
          displayName: "B",
          symbol: "b",
          definition: "b",
          valueType: "boolean",
          enumId: "e",
          enumOptions: ["a"],
        }),
      ],
      "unexpected_physical_metadata",
    );
  });
});

describe("constant defaults", () => {
  it("accepts a dimension-compatible quantity default (e.g. gravity)", () => {
    expect(getParameter("motion.axis.gravity")?.defaultPolicy.kind).toBe(
      "constant",
    );
  });

  it("rejects a default whose value kind mismatches the parameter", () => {
    expectBuildError(
      [
        defineParameter({
          id: "x.e",
          displayName: "E",
          symbol: "e",
          definition: "e",
          valueType: "enum",
          enumId: "e",
          enumOptions: ["a"],
          defaultPolicy: { kind: "constant", value: makeQuantity(1, "kg") },
        }),
      ],
      "invalid_default",
    );
  });

  it("rejects a quantity default of a different dimension", () => {
    expectBuildError(
      [
        defineParameter({
          id: "x.q",
          displayName: "Q",
          symbol: "q",
          definition: "q",
          valueType: "quantity",
          canonicalUnit: "kg",
          displayUnits: ["kg"],
          defaultPolicy: { kind: "constant", value: makeQuantity(1, "N") },
        }),
      ],
      "invalid_default",
    );
  });

  it("rejects an enum default that is not one of the options", () => {
    expectBuildError(
      [
        defineParameter({
          id: "x.e",
          displayName: "E",
          symbol: "e",
          definition: "e",
          valueType: "enum",
          enumId: "e",
          enumOptions: ["a", "b"],
          defaultPolicy: {
            kind: "constant",
            value: {
              v: SERIALIZATION_FORMAT_VERSION,
              kind: "enum",
              enumId: "e",
              value: "c",
            },
          },
        }),
      ],
      "invalid_default",
    );
  });
});

describe("deprecation and replacement", () => {
  const released = defineParameter({
    id: "a.new",
    displayName: "New",
    symbol: "n",
    definition: "n",
    valueType: "quantity",
    canonicalUnit: "kg",
    displayUnits: ["kg"],
  });

  it("resolves a deprecated parameter to its replacement", () => {
    const old = defineParameter({
      id: "a.old",
      displayName: "Old",
      symbol: "o",
      definition: "o",
      valueType: "quantity",
      canonicalUnit: "kg",
      displayUnits: ["kg"],
      lifecycle: "deprecated",
      replacedBy: "a.new",
    });
    const registry = build([old, released]);
    expect(registry.resolve("a.old").id).toBe("a.new");
    expect(registry.resolve("a.new").id).toBe("a.new");
  });

  it("follows a multi-step replacement chain", () => {
    const older = defineParameter({
      id: "a.older",
      displayName: "Older",
      symbol: "oo",
      definition: "oo",
      valueType: "quantity",
      canonicalUnit: "kg",
      displayUnits: ["kg"],
      lifecycle: "deprecated",
      replacedBy: "a.old",
    });
    const old = defineParameter({
      id: "a.old",
      displayName: "Old",
      symbol: "o",
      definition: "o",
      valueType: "quantity",
      canonicalUnit: "kg",
      displayUnits: ["kg"],
      lifecycle: "deprecated",
      replacedBy: "a.new",
    });
    const registry = build([older, old, released]);
    expect(registry.resolve("a.older").id).toBe("a.new");
  });

  it("rejects a non-deprecated parameter declaring a replacement", () => {
    const bad = defineParameter({
      id: "a.bad",
      displayName: "Bad",
      symbol: "x",
      definition: "x",
      valueType: "quantity",
      canonicalUnit: "kg",
      displayUnits: ["kg"],
      replacedBy: "a.new",
    });
    expectBuildError([bad, released], "invalid_deprecation");
  });

  it("rejects a deprecated parameter without a replacement", () => {
    const bad = defineParameter({
      id: "a.bad",
      displayName: "Bad",
      symbol: "x",
      definition: "x",
      valueType: "quantity",
      canonicalUnit: "kg",
      displayUnits: ["kg"],
      lifecycle: "deprecated",
    });
    expectBuildError([bad], "invalid_deprecation");
  });

  it("rejects a replacement that does not exist", () => {
    const bad = defineParameter({
      id: "a.bad",
      displayName: "Bad",
      symbol: "x",
      definition: "x",
      valueType: "quantity",
      canonicalUnit: "kg",
      displayUnits: ["kg"],
      lifecycle: "deprecated",
      replacedBy: "a.missing",
    });
    expectBuildError([bad], "unknown_replacement");
  });

  it("rejects a deprecation cycle", () => {
    const p1 = defineParameter({
      id: "a.one",
      displayName: "One",
      symbol: "o1",
      definition: "o1",
      valueType: "quantity",
      canonicalUnit: "kg",
      displayUnits: ["kg"],
      lifecycle: "deprecated",
      replacedBy: "a.two",
    });
    const p2 = defineParameter({
      id: "a.two",
      displayName: "Two",
      symbol: "o2",
      definition: "o2",
      valueType: "quantity",
      canonicalUnit: "kg",
      displayUnits: ["kg"],
      lifecycle: "deprecated",
      replacedBy: "a.one",
    });
    expectBuildError([p1, p2], "deprecation_cycle");
  });

  it("throws unknown_parameter when resolving a missing ID", () => {
    const registry = build([released]);
    expect(() => registry.resolve("a.missing")).toThrow(ParameterRegistryError);
  });
});
