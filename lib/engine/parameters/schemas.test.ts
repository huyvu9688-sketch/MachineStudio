import { describe, expect, it } from "vitest";
import { ParameterDefinitionSchema, parseParameterDefinition } from "./schemas";

const valid = {
  id: "motion.axis.payload_mass",
  displayName: "Payload mass",
  symbol: "m_p",
  definition: "Mass of the payload.",
  valueType: "quantity",
  canonicalUnit: "kg",
  displayUnits: ["kg", "g"],
  range: { min: 0, unit: "kg" },
  qualifiers: {},
  frame: "none",
  defaultPolicy: { kind: "required" },
  lifecycle: "released",
} as const;

describe("ParameterDefinitionSchema", () => {
  it("accepts a well-formed definition", () => {
    const result = ParameterDefinitionSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("motion.axis.payload_mass");
    }
  });

  it("rejects unknown keys (strict)", () => {
    const result = ParameterDefinitionSchema.safeParse({ ...valid, extra: 1 });
    expect(result.success).toBe(false);
  });

  it("rejects an empty ID", () => {
    const result = ParameterDefinitionSchema.safeParse({ ...valid, id: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing required field", () => {
    const withoutName: Record<string, unknown> = { ...valid };
    delete withoutName.displayName;
    const result = ParameterDefinitionSchema.safeParse(withoutName);
    expect(result.success).toBe(false);
  });

  it("rejects an unknown value type", () => {
    const result = ParameterDefinitionSchema.safeParse({ ...valid, valueType: "curve" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown default-policy kind", () => {
    const result = ParameterDefinitionSchema.safeParse({
      ...valid,
      defaultPolicy: { kind: "unknown" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts a constant default carrying an engineering value", () => {
    const result = ParameterDefinitionSchema.safeParse({
      ...valid,
      defaultPolicy: {
        kind: "constant",
        value: { v: 1, kind: "quantity", value: 1, unit: "kg" },
      },
    });
    expect(result.success).toBe(true);
  });

  it("parseParameterDefinition throws on malformed input", () => {
    expect(() => parseParameterDefinition({ id: "x" })).toThrow();
  });
});
