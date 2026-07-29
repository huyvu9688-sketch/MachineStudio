// One valid instance of every EngineeringValue kind, used by the value tests.
// Typing each against its interface also proves the interfaces are
// constructible with literal data. Not part of the public API (not re-exported
// from ./index) and not a test file, so vitest does not execute it.

import type {
  BooleanValue,
  ComponentReference,
  Curve,
  EnumValue,
  LoadSpectrum,
  MaterialReference,
  Quantity,
  TableValue,
  VectorQuantity,
} from "./types";

export const sampleQuantity: Quantity = {
  v: 1,
  kind: "quantity",
  value: 12,
  unit: "kg",
  displayUnit: "g",
};

export const sampleVectorQuantity: VectorQuantity = {
  v: 1,
  kind: "vector_quantity",
  components: [10, -5, 0.25],
  unit: "N",
  frame: "axis-xyz",
  displayUnit: "kN",
};

export const sampleCurve: Curve = {
  v: 1,
  kind: "curve",
  xUnit: "s",
  yUnit: "m/s",
  points: [
    { x: 0, y: 0 },
    { x: 0.5, y: 1.2 },
    { x: 1, y: 0 },
  ],
  xLabel: "time",
  yLabel: "velocity",
};

export const sampleLoadSpectrum: LoadSpectrum = {
  v: 1,
  kind: "load_spectrum",
  loadUnit: "N",
  bins: [
    { load: 100, fraction: 0.25 },
    { load: 250, fraction: 0.75 },
  ],
};

export const sampleTableValue: TableValue = {
  v: 1,
  kind: "table",
  columns: [
    { key: "position", label: "Position", unit: "mm" },
    { key: "label" },
  ],
  rows: [
    [0, "start"],
    [720, "end"],
  ],
};

export const sampleEnumValue: EnumValue = {
  v: 1,
  kind: "enum",
  enumId: "axis.orientation",
  value: "horizontal",
};

export const sampleBooleanValue: BooleanValue = {
  v: 1,
  kind: "boolean",
  value: true,
};

export const sampleMaterialReference: MaterialReference = {
  v: 1,
  kind: "material_ref",
  materialId: "steel-1045",
  library: "internal-materials",
  revision: "2026-07",
};

export const sampleComponentReference: ComponentReference = {
  v: 1,
  kind: "component_ref",
  componentType: "ball_screw",
  source: "catalog",
  refId: "BSS1520-914@r1",
};

/** All samples in a stable order, one per kind. */
export const allSampleValues = [
  sampleQuantity,
  sampleVectorQuantity,
  sampleCurve,
  sampleLoadSpectrum,
  sampleTableValue,
  sampleEnumValue,
  sampleBooleanValue,
  sampleMaterialReference,
  sampleComponentReference,
] as const;
