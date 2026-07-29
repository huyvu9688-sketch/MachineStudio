import { describe, expect, it } from "vitest";
import {
  isBooleanValue,
  isComponentReference,
  isCurve,
  isEngineeringValue,
  isEnumValue,
  isLoadSpectrum,
  isMaterialReference,
  isQuantity,
  isTableValue,
  isVectorQuantity,
} from "./guards";
import type { EngineeringValue, EngineeringValueKind } from "./types";
import {
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

const guardsByKind: Record<
  EngineeringValueKind,
  (value: EngineeringValue) => boolean
> = {
  quantity: isQuantity,
  vector_quantity: isVectorQuantity,
  curve: isCurve,
  load_spectrum: isLoadSpectrum,
  table: isTableValue,
  enum: isEnumValue,
  boolean: isBooleanValue,
  material_ref: isMaterialReference,
  component_ref: isComponentReference,
};

const samplesByKind: Record<EngineeringValueKind, EngineeringValue> = {
  quantity: sampleQuantity,
  vector_quantity: sampleVectorQuantity,
  curve: sampleCurve,
  load_spectrum: sampleLoadSpectrum,
  table: sampleTableValue,
  enum: sampleEnumValue,
  boolean: sampleBooleanValue,
  material_ref: sampleMaterialReference,
  component_ref: sampleComponentReference,
};

describe("per-kind type guards", () => {
  it("each guard matches only its own kind", () => {
    const kinds = Object.keys(guardsByKind) as EngineeringValueKind[];
    for (const guardKind of kinds) {
      const guard = guardsByKind[guardKind];
      for (const sampleKind of kinds) {
        expect(guard(samplesByKind[sampleKind])).toBe(
          guardKind === sampleKind,
        );
      }
    }
  });

  it("narrows the value type for downstream access", () => {
    const value: EngineeringValue = sampleQuantity;
    if (isQuantity(value)) {
      // Compiles only because `value` is narrowed to Quantity here.
      expect(typeof value.value).toBe("number");
      expect(value.unit).toBe("kg");
    } else {
      throw new Error("expected a quantity");
    }
  });
});

describe("isEngineeringValue", () => {
  it("accepts every valid sample", () => {
    for (const value of Object.values(samplesByKind)) {
      expect(isEngineeringValue(value)).toBe(true);
    }
  });

  it("rejects invalid input", () => {
    expect(isEngineeringValue(null)).toBe(false);
    expect(isEngineeringValue({ kind: "quantity" })).toBe(false);
    expect(isEngineeringValue({ ...sampleQuantity, unit: "" })).toBe(false);
    expect(isEngineeringValue(123)).toBe(false);
  });
});
