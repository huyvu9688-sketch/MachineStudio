import { describe, expect, it } from "vitest";
import { SERIALIZATION_FORMAT_VERSION } from "./format";
import {
  BooleanValueSchema,
  ComponentReferenceSchema,
  CurveSchema,
  EngineeringValueSchema,
  EnumValueSchema,
  LoadSpectrumSchema,
  MaterialReferenceSchema,
  QuantitySchema,
  TableValueSchema,
  VectorQuantitySchema,
} from "./schemas";
import {
  allSampleValues,
  sampleBooleanValue,
  sampleComponentReference,
  sampleCurve,
  sampleEnumValue,
  sampleLoadSpectrum,
  sampleMaterialReference,
  sampleQuantity,
  sampleTableValue,
  sampleVectorQuantity,
} from "./samples";

describe("EngineeringValueSchema", () => {
  it("accepts a valid value of every kind and routes to the right member", () => {
    for (const value of allSampleValues) {
      const result = EngineeringValueSchema.safeParse(value);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.kind).toBe(value.kind);
      }
    }
  });

  it("rejects an unknown discriminator", () => {
    const result = EngineeringValueSchema.safeParse({
      ...sampleQuantity,
      kind: "not_a_kind",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a payload written under a different format version", () => {
    const result = EngineeringValueSchema.safeParse({
      ...sampleQuantity,
      v: SERIALIZATION_FORMAT_VERSION + 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown extra keys (strict)", () => {
    const result = EngineeringValueSchema.safeParse({
      ...sampleQuantity,
      unexpected: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-object", () => {
    expect(EngineeringValueSchema.safeParse(null).success).toBe(false);
    expect(EngineeringValueSchema.safeParse(42).success).toBe(false);
    expect(EngineeringValueSchema.safeParse("quantity").success).toBe(false);
  });
});

describe("QuantitySchema", () => {
  it("accepts a valid quantity", () => {
    expect(QuantitySchema.safeParse(sampleQuantity).success).toBe(true);
  });

  it("accepts a quantity without the optional display unit", () => {
    const { displayUnit: _displayUnit, ...withoutDisplay } = sampleQuantity;
    void _displayUnit;
    expect(QuantitySchema.safeParse(withoutDisplay).success).toBe(true);
  });

  it("rejects a missing unit", () => {
    const { unit: _unit, ...withoutUnit } = sampleQuantity;
    void _unit;
    expect(QuantitySchema.safeParse(withoutUnit).success).toBe(false);
  });

  it("rejects an empty unit", () => {
    expect(
      QuantitySchema.safeParse({ ...sampleQuantity, unit: "" }).success,
    ).toBe(false);
  });

  it("rejects non-finite magnitudes", () => {
    for (const value of [
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NaN,
    ]) {
      expect(QuantitySchema.safeParse({ ...sampleQuantity, value }).success).toBe(
        false,
      );
    }
  });

  it("rejects a non-numeric magnitude", () => {
    expect(
      QuantitySchema.safeParse({ ...sampleQuantity, value: "12" }).success,
    ).toBe(false);
  });
});

describe("the other value schemas accept their samples", () => {
  it("validates vector, curve, load spectrum, table, enum, boolean, and refs", () => {
    expect(VectorQuantitySchema.safeParse(sampleVectorQuantity).success).toBe(
      true,
    );
    expect(CurveSchema.safeParse(sampleCurve).success).toBe(true);
    expect(LoadSpectrumSchema.safeParse(sampleLoadSpectrum).success).toBe(true);
    expect(TableValueSchema.safeParse(sampleTableValue).success).toBe(true);
    expect(EnumValueSchema.safeParse(sampleEnumValue).success).toBe(true);
    expect(BooleanValueSchema.safeParse(sampleBooleanValue).success).toBe(true);
    expect(
      MaterialReferenceSchema.safeParse(sampleMaterialReference).success,
    ).toBe(true);
    expect(
      ComponentReferenceSchema.safeParse(sampleComponentReference).success,
    ).toBe(true);
  });

  it("rejects an empty vector, curve, and load spectrum", () => {
    expect(
      VectorQuantitySchema.safeParse({ ...sampleVectorQuantity, components: [] })
        .success,
    ).toBe(false);
    expect(
      CurveSchema.safeParse({ ...sampleCurve, points: [] }).success,
    ).toBe(false);
    expect(
      LoadSpectrumSchema.safeParse({ ...sampleLoadSpectrum, bins: [] }).success,
    ).toBe(false);
  });

  it("rejects a load-spectrum fraction outside [0, 1]", () => {
    expect(
      LoadSpectrumSchema.safeParse({
        ...sampleLoadSpectrum,
        bins: [{ load: 100, fraction: 1.5 }],
      }).success,
    ).toBe(false);
  });

  it("rejects an unknown component reference source", () => {
    expect(
      ComponentReferenceSchema.safeParse({
        ...sampleComponentReference,
        source: "purchasing",
      }).success,
    ).toBe(false);
  });
});
