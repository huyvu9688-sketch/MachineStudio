import { describe, expect, it } from "vitest";
import { SERIALIZATION_FORMAT_VERSION } from "./format";
import { engineeringValuesEqual } from "./equality";
import {
  deserializeEngineeringValue,
  parseEngineeringValue,
  safeParseEngineeringValue,
  serializeEngineeringValue,
} from "./serialization";
import { allSampleValues, sampleQuantity } from "./samples";

describe("serialization round-trip", () => {
  it("preserves every value kind through serialize -> deserialize", () => {
    for (const value of allSampleValues) {
      const restored = deserializeEngineeringValue(
        serializeEngineeringValue(value),
      );
      expect(restored).toEqual(value);
      expect(engineeringValuesEqual(restored, value)).toBe(true);
    }
  });

  it("is independent of key order in the serialized JSON", () => {
    const reordered = JSON.stringify({
      unit: sampleQuantity.unit,
      value: sampleQuantity.value,
      kind: sampleQuantity.kind,
      v: sampleQuantity.v,
      displayUnit: sampleQuantity.displayUnit,
    });
    const restored = deserializeEngineeringValue(reordered);
    expect(engineeringValuesEqual(restored, sampleQuantity)).toBe(true);
  });
});

describe("parseEngineeringValue", () => {
  it("returns the validated value for valid input", () => {
    expect(parseEngineeringValue(sampleQuantity)).toEqual(sampleQuantity);
  });

  it("throws on invalid input", () => {
    expect(() => parseEngineeringValue({ kind: "quantity" })).toThrow();
    expect(() => parseEngineeringValue(null)).toThrow();
  });
});

describe("safeParseEngineeringValue", () => {
  it("reports success for valid input", () => {
    const result = safeParseEngineeringValue(sampleQuantity);
    expect(result.success).toBe(true);
  });

  it("reports failure without throwing for invalid input", () => {
    const result = safeParseEngineeringValue({ kind: "quantity", value: 1 });
    expect(result.success).toBe(false);
  });
});

describe("deserializeEngineeringValue", () => {
  it("throws on a payload from a different format version", () => {
    const forwardVersion = JSON.stringify({
      ...sampleQuantity,
      v: SERIALIZATION_FORMAT_VERSION + 1,
    });
    expect(() => deserializeEngineeringValue(forwardVersion)).toThrow();
  });

  it("throws on malformed JSON", () => {
    expect(() => deserializeEngineeringValue("{ not json")).toThrow();
  });
});
