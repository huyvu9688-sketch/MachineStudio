// The EngineeringValue discriminated union — the public value contract every
// module port speaks in. Module interfaces accept and return these, never bare
// physical numbers (context/architecture.md "Engineering Value Model";
// context/code-standards.md "Engineering Values and Units"). Runtime
// validation lives in ./schemas, kept in lockstep with these interfaces by the
// compile-time parity guard there.

import type { SerializationFormatVersion } from "./format";

/** Discriminator tag identifying each {@link EngineeringValue} member. */
export type EngineeringValueKind =
  | "quantity"
  | "vector_quantity"
  | "curve"
  | "load_spectrum"
  | "table"
  | "enum"
  | "boolean"
  | "material_ref"
  | "component_ref";

/**
 * A scalar physical quantity stored in its parameter's canonical unit.
 *
 * `value` is the magnitude expressed in `unit`; `displayUnit` is optional
 * presentation metadata that never changes the stored magnitude. Unit symbols
 * are opaque strings at this layer — the unit registry (Unit 1.2) owns
 * dimensional meaning and conversion; this contract only guarantees that a
 * canonical unit is present.
 */
export interface Quantity {
  readonly v: SerializationFormatVersion;
  readonly kind: "quantity";
  /** Magnitude in {@link Quantity.unit}. Always finite. */
  readonly value: number;
  /** Canonical unit symbol, e.g. `"m"`, `"N"`, `"kg*m^2"`. Non-empty. */
  readonly unit: string;
  /** Optional display unit symbol; presentation only, never affects `value`. */
  readonly displayUnit?: string;
}

/**
 * An ordered set of scalar components sharing one canonical unit, e.g. a force
 * or moment resolved onto axes of `frame`.
 *
 * Component ordering is defined by the coordinate frame; interpreting it is the
 * consumer's responsibility. This layer guarantees at least one finite
 * component and a present unit.
 */
export interface VectorQuantity {
  readonly v: SerializationFormatVersion;
  readonly kind: "vector_quantity";
  /** Component magnitudes in {@link VectorQuantity.unit}. All finite. */
  readonly components: number[];
  /** Canonical unit symbol shared by every component. Non-empty. */
  readonly unit: string;
  /** Optional coordinate-frame identifier the components are resolved onto. */
  readonly frame?: string;
  /** Optional display unit symbol; presentation only. */
  readonly displayUnit?: string;
}

/** A single sample of a {@link Curve}. */
export interface CurvePoint {
  /** Independent-axis value in the curve's `xUnit`. Finite. */
  readonly x: number;
  /** Dependent-axis value in the curve's `yUnit`. Finite. */
  readonly y: number;
}

/**
 * A sampled curve of `y` versus `x`, each axis in its own canonical unit —
 * e.g. a motion position/velocity/acceleration profile over time.
 *
 * Points are stored in caller order; this contract does not impose
 * monotonicity, leaving that to the producing module. At least one sample is
 * required.
 */
export interface Curve {
  readonly v: SerializationFormatVersion;
  readonly kind: "curve";
  /** Canonical unit of the independent (x) axis. Non-empty. */
  readonly xUnit: string;
  /** Canonical unit of the dependent (y) axis. Non-empty. */
  readonly yUnit: string;
  /** Ordered samples; at least one. */
  readonly points: CurvePoint[];
  /** Optional independent-axis label, e.g. `"time"`. */
  readonly xLabel?: string;
  /** Optional dependent-axis label, e.g. `"velocity"`. */
  readonly yLabel?: string;
}

/** A single bin of a {@link LoadSpectrum}. */
export interface LoadSpectrumBin {
  /** Load magnitude in the spectrum's `loadUnit`. Finite. */
  readonly load: number;
  /** Duty fraction spent at `load`, in the closed interval [0, 1]. */
  readonly fraction: number;
}

/**
 * A binned load spectrum for fatigue/life duty aggregation: each bin pairs a
 * load level with the duty `fraction` of time or cycles spent there.
 *
 * This layer validates bin structure only; it does not require the fractions
 * to sum to one — the consuming module owns that engineering rule.
 */
export interface LoadSpectrum {
  readonly v: SerializationFormatVersion;
  readonly kind: "load_spectrum";
  /** Canonical unit shared by every bin's `load`. Non-empty. */
  readonly loadUnit: string;
  /** Spectrum bins; at least one. */
  readonly bins: LoadSpectrumBin[];
}

/** Column metadata for a {@link TableValue}. */
export interface TableColumn {
  /** Stable column key aligning to each row's cell by index. Non-empty. */
  readonly key: string;
  /** Optional human-readable column label. */
  readonly label?: string;
  /** Optional canonical unit for numeric cells in this column. */
  readonly unit?: string;
}

/** A single {@link TableValue} cell. Numbers are always finite. */
export type TableCell = number | string | boolean;

/**
 * A generic tabular value: typed columns and positional rows. Each row's cells
 * align to `columns` by index; the table may have zero rows.
 *
 * This is the most general value family and is a validated contract only in
 * the MVP — no Phase 1 module executes it yet (Unit 1.1 initial scope).
 */
export interface TableValue {
  readonly v: SerializationFormatVersion;
  readonly kind: "table";
  /** Column definitions; at least one. */
  readonly columns: TableColumn[];
  /** Rows of cells; each inner array aligns to `columns` by index. */
  readonly rows: TableCell[][];
}

/**
 * A selected option from a named enumeration.
 *
 * `enumId` identifies the enumeration (e.g. an orientation or arrangement set)
 * and `value` is the chosen option key within it. Option-set membership is
 * enforced by the owning parameter/module, not this contract.
 */
export interface EnumValue {
  readonly v: SerializationFormatVersion;
  readonly kind: "enum";
  /** Stable enumeration identifier. Non-empty. */
  readonly enumId: string;
  /** Selected option key within the enumeration. Non-empty. */
  readonly value: string;
}

/** A boolean engineering value (e.g. a yes/no design condition). */
export interface BooleanValue {
  readonly v: SerializationFormatVersion;
  readonly kind: "boolean";
  readonly value: boolean;
}

/**
 * A reference to a material in a material library, by stable identifier.
 *
 * The value carries identity only; resolving material properties is a separate
 * concern. Validated contract only in the MVP.
 */
export interface MaterialReference {
  readonly v: SerializationFormatVersion;
  readonly kind: "material_ref";
  /** Stable material identifier. Non-empty. */
  readonly materialId: string;
  /** Optional source material library identifier. */
  readonly library?: string;
  /** Optional material-library revision. */
  readonly revision?: string;
}

/**
 * A reference to a component: either an exact manufacturer part revision from
 * the catalog or a manual/custom part record.
 *
 * `source` disambiguates how `refId` is resolved. This mirrors the lightweight
 * ComponentAssignment model (context/architecture.md) and is a validated
 * contract only in the MVP.
 */
export interface ComponentReference {
  readonly v: SerializationFormatVersion;
  readonly kind: "component_ref";
  /** Component type identifier, e.g. `"ball_screw"`. Non-empty. */
  readonly componentType: string;
  /** Whether `refId` points at a catalog part revision or a manual part. */
  readonly source: "catalog" | "manual";
  /** Manufacturer part revision id (catalog) or manual part id (manual). */
  readonly refId: string;
}

/**
 * The engineering value union. Every module input/output port carries one of
 * these; a bare physical `number` never crosses a module boundary
 * (context/architecture.md invariant "Units and value types everywhere").
 */
export type EngineeringValue =
  | Quantity
  | VectorQuantity
  | Curve
  | LoadSpectrum
  | TableValue
  | EnumValue
  | BooleanValue
  | MaterialReference
  | ComponentReference;
