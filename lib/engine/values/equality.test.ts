import { describe, expect, it } from "vitest";
import { engineeringValuesClose, engineeringValuesEqual } from "./equality";
import type { Curve, LoadSpectrum, Quantity, VectorQuantity } from "./types";
import {
  sampleCurve,
  sampleEnumValue,
  sampleLoadSpectrum,
  sampleQuantity,
  sampleVectorQuantity,
} from "./samples";

describe("engineeringValuesEqual", () => {
  it("is true for structurally identical values", () => {
    expect(engineeringValuesEqual(sampleQuantity, { ...sampleQuantity })).toBe(
      true,
    );
  });

  it("is false for different kinds", () => {
    expect(engineeringValuesEqual(sampleQuantity, sampleEnumValue)).toBe(false);
  });

  it("is false for a different unit", () => {
    const other: Quantity = { ...sampleQuantity, unit: "g" };
    expect(engineeringValuesEqual(sampleQuantity, other)).toBe(false);
  });

  it("is false for a different magnitude", () => {
    const other: Quantity = {
      ...sampleQuantity,
      value: sampleQuantity.value + 1,
    };
    expect(engineeringValuesEqual(sampleQuantity, other)).toBe(false);
  });

  it("treats a missing optional field as different from a present one", () => {
    const { displayUnit: _displayUnit, ...withoutDisplay } = sampleQuantity;
    void _displayUnit;
    expect(
      engineeringValuesEqual(sampleQuantity, withoutDisplay as Quantity),
    ).toBe(false);
  });

  it("compares nested arrays order-sensitively", () => {
    const reordered: VectorQuantity = {
      ...sampleVectorQuantity,
      components: [...sampleVectorQuantity.components].reverse(),
    };
    expect(engineeringValuesEqual(sampleVectorQuantity, reordered)).toBe(false);
  });
});

describe("engineeringValuesClose", () => {
  it("is true for magnitudes within the default tolerance", () => {
    const other: Quantity = {
      ...sampleQuantity,
      value: sampleQuantity.value + 1e-12,
    };
    expect(engineeringValuesClose(sampleQuantity, other)).toBe(true);
  });

  it("is false for magnitudes outside the default tolerance", () => {
    const other: Quantity = {
      ...sampleQuantity,
      value: sampleQuantity.value + 0.001,
    };
    expect(engineeringValuesClose(sampleQuantity, other)).toBe(false);
  });

  it("honors a custom absolute tolerance", () => {
    const other: Quantity = {
      ...sampleQuantity,
      value: sampleQuantity.value + 0.5,
    };
    expect(engineeringValuesClose(sampleQuantity, other, { absolute: 1 })).toBe(
      true,
    );
    expect(
      engineeringValuesClose(sampleQuantity, other, { absolute: 0.1 }),
    ).toBe(false);
  });

  it("still requires units and kinds to match exactly", () => {
    const other: Quantity = { ...sampleQuantity, unit: "g" };
    expect(engineeringValuesClose(sampleQuantity, other)).toBe(false);
    expect(engineeringValuesClose(sampleQuantity, sampleEnumValue)).toBe(false);
  });

  it("applies tolerance element-wise to vectors", () => {
    const other: VectorQuantity = {
      ...sampleVectorQuantity,
      components: sampleVectorQuantity.components.map((c) => c + 1e-12),
    };
    expect(engineeringValuesClose(sampleVectorQuantity, other)).toBe(true);
  });

  it("applies tolerance point-wise to curves", () => {
    const other: Curve = {
      ...sampleCurve,
      points: sampleCurve.points.map((p) => ({
        x: p.x,
        y: p.y + 1e-12,
      })),
    };
    expect(engineeringValuesClose(sampleCurve, other)).toBe(true);
  });

  it("applies tolerance to load-spectrum bins", () => {
    const other: LoadSpectrum = {
      ...sampleLoadSpectrum,
      bins: sampleLoadSpectrum.bins.map((bin) => ({
        load: bin.load + 1e-12,
        fraction: bin.fraction,
      })),
    };
    expect(engineeringValuesClose(sampleLoadSpectrum, other)).toBe(true);
  });

  it("falls back to exact equality for non-numeric kinds", () => {
    expect(
      engineeringValuesClose(sampleEnumValue, { ...sampleEnumValue }),
    ).toBe(true);
    expect(
      engineeringValuesClose(sampleEnumValue, {
        ...sampleEnumValue,
        value: "vertical",
      }),
    ).toBe(false);
  });
});
