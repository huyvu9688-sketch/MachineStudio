// app/(workspace)/workspace/parse-submitted-field.test.ts
import { describe, expect, it } from "vitest";
import {
  parseLoadCase,
  parseSubmittedField,
  submittedPortKeys,
} from "./parse-submitted-field";
import { SERIALIZATION_FORMAT_VERSION } from "@/lib/engine";

function buildFormData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

describe("submittedPortKeys", () => {
  it("collects every distinct portKey with a submitted valueKind group", () => {
    const formData = buildFormData({
      "fields.payload_mass.valueKind": "quantity",
      "fields.payload_mass.magnitude": "12",
      "fields.orientation.valueKind": "enum",
      "fields.orientation.option": "vertical",
      configurationId: "cfg-1",
      moduleInstanceId: "mod-1",
    });
    expect([...submittedPortKeys(formData)].sort()).toEqual([
      "orientation",
      "payload_mass",
    ]);
  });

  it("returns an empty list when no field group was submitted", () => {
    expect(submittedPortKeys(buildFormData({ moduleInstanceId: "mod-1" }))).toEqual(
      [],
    );
  });
});

describe("parseSubmittedField", () => {
  it("parses a quantity field into its canonical value", () => {
    const result = parseSubmittedField(
      buildFormData({
        "fields.payload_mass.parameterId": "motion.axis.payload_mass",
        "fields.payload_mass.valueKind": "quantity",
        "fields.payload_mass.magnitude": "12",
        "fields.payload_mass.unit": "kg",
      }),
      "payload_mass",
    );
    expect(result).toEqual({
      ok: true,
      parameterId: "motion.axis.payload_mass",
      loadCase: undefined,
      value: { v: SERIALIZATION_FORMAT_VERSION, kind: "quantity", value: 12, unit: "kg", displayUnit: "kg" },
    });
  });

  it("rejects an unparseable magnitude without a portKey-unrelated error", () => {
    const result = parseSubmittedField(
      buildFormData({
        "fields.payload_mass.parameterId": "motion.axis.payload_mass",
        "fields.payload_mass.valueKind": "quantity",
        "fields.payload_mass.magnitude": "",
        "fields.payload_mass.unit": "kg",
      }),
      "payload_mass",
    );
    expect(result).toEqual({ ok: false, message: "Enter a numeric value." });
  });

  it("rejects a vector_quantity submission for a parameter whose real registry frame is not axis", () => {
    const result = parseSubmittedField(
      buildFormData({
        "fields.payload_mass.parameterId": "motion.axis.payload_mass",
        "fields.payload_mass.valueKind": "vector_quantity",
        "fields.payload_mass.component-0": "1",
        "fields.payload_mass.component-1": "2",
        "fields.payload_mass.component-2": "3",
        "fields.payload_mass.unit": "kg",
      }),
      "payload_mass",
    );
    expect(result).toEqual({
      ok: false,
      message: "This parameter does not use the axis vector frame.",
    });
  });

  it("parses a valid axis-frame vector_quantity submission", () => {
    const result = parseSubmittedField(
      buildFormData({
        "fields.cg_offset.parameterId": "motion.axis.center_of_mass_offset",
        "fields.cg_offset.valueKind": "vector_quantity",
        "fields.cg_offset.component-0": "1",
        "fields.cg_offset.component-1": "2",
        "fields.cg_offset.component-2": "3",
        "fields.cg_offset.unit": "m",
      }),
      "cg_offset",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      v: SERIALIZATION_FORMAT_VERSION,
      kind: "vector_quantity",
      components: [1, 2, 3],
      unit: "m",
      frame: "axis",
      displayUnit: "m",
    });
  });

  // No canonical parameter with valueType "boolean" exists in the released
  // registry yet (lib/engine/parameters/definitions.ts), so the boolean
  // branch's happy path cannot be exercised against real registry data the
  // way every other branch's test in this file is — only its rejection path
  // (a real, non-boolean parameter submitted as valueKind=boolean) can be.
  it("rejects a boolean submission for a parameter whose real registry valueType is not boolean", () => {
    // motion.axis.payload_mass is a real released "quantity" parameter. A
    // tampered request could still submit valueKind=boolean against it; the
    // parser must re-derive the registry's real valueType rather than trust
    // the client's claim.
    const result = parseSubmittedField(
      buildFormData({
        "fields.payload_mass.parameterId": "motion.axis.payload_mass",
        "fields.payload_mass.valueKind": "boolean",
        "fields.payload_mass.checked": "true",
      }),
      "payload_mass",
    );
    expect(result).toEqual({
      ok: false,
      message: "This parameter is not a boolean.",
    });
  });

  it("returns an error for an unknown parameter", () => {
    const result = parseSubmittedField(
      buildFormData({
        "fields.x.parameterId": "does.not.exist",
        "fields.x.valueKind": "quantity",
      }),
      "x",
    );
    expect(result).toEqual({
      ok: false,
      message: 'Unknown parameter "does.not.exist".',
    });
  });
});

describe("parseLoadCase", () => {
  it("accepts a declared category", () => {
    expect(parseLoadCase("peak")).toBe("peak");
  });

  it("ignores anything outside the declared set", () => {
    expect(parseLoadCase("bogus")).toBeUndefined();
    expect(parseLoadCase("")).toBeUndefined();
  });
});
