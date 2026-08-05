// The canonical parameter registry contract (Unit 1.3). A parameter definition
// gives a physical/engineering quantity a stable identity and precise semantics
// so that module ports, requirements, and the parameter graph all speak about
// the same thing. Module ports map to these IDs; released IDs never change
// meaning (context/architecture.md "Canonical Parameter Registry";
// context/code-standards.md "Canonical Parameters").
//
// Runtime validation lives in ./schemas (shape) and ./registry (engineering
// invariants). The value families and unit symbols referenced here are owned by
// the values (Unit 1.1) and units (Unit 1.2) packages.

/**
 * A stable canonical parameter identifier, e.g. `"motion.axis.payload_mass"`.
 *
 * Branded so a raw string cannot be passed where a validated parameter ID is
 * expected. Build one with {@link asParameterId} or (for seed data)
 * {@link defineParameter}. IDs are dotted: everything before the final segment
 * is the parameter's {@link ParameterDefinition scope}.
 */
export type ParameterId = string & { readonly __brand: "ParameterId" };

/** Casts a raw string to a {@link ParameterId}. Identity at runtime. */
export function asParameterId(id: string): ParameterId {
  return id as ParameterId;
}

/**
 * The engineering value family a parameter carries. A subset of the value kinds
 * in the values package (Unit 1.1): the registry v1 models scalar, vector,
 * enumerated, and boolean parameters. Curve, load-spectrum, table, and
 * reference parameters are added when a module first needs them, so their
 * per-kind metadata is designed against a concrete engineering case rather than
 * invented up front.
 */
export type ParameterValueType =
  "quantity" | "vector_quantity" | "enum" | "boolean";

/** Lifecycle state of a parameter definition. */
export type ParameterLifecycle = "draft" | "released" | "deprecated";

/**
 * Whether the parameter expresses a demanded value or a limiting capacity.
 * `required` is the demand side (e.g. required thrust); `allowable` is the
 * capacity/limit side (e.g. allowable speed). The graph must not link a
 * `required` port to another `required` port as if it were a capacity.
 */
export type BoundQualifier = "required" | "allowable";

/** How a time-varying quantity is aggregated into a single value. */
export type AggregationQualifier = "peak" | "rms" | "nominal" | "mean";

/** Whether the quantity is a static (held) or dynamic (moving) load. */
export type LoadNatureQualifier = "static" | "dynamic";

/**
 * Independent semantic qualifier axes. Two ports are only link-compatible when
 * their qualifiers agree on every populated axis (Unit 1.8). Absent axes are
 * "unspecified" and do not constrain compatibility on their own.
 */
export interface ParameterQualifiers {
  readonly bound?: BoundQualifier;
  readonly aggregation?: AggregationQualifier;
  readonly loadNature?: LoadNatureQualifier;
}

/**
 * Load-case categories a parameter is meaningful for. A parameter that is not
 * load-case specific (e.g. a geometric length) omits this. Per-case magnitudes
 * are stored as separate values tagged with a load case at runtime; this field
 * declares which categories the parameter admits.
 */
export type LoadCaseCategory = "normal" | "peak" | "holding" | "emergency_stop";

/**
 * Coordinate-frame / direction requirement. `none` for a frame-free scalar;
 * `axis` for a value resolved onto the axis frame; `world` for the gravity/world
 * frame; `component` for a component-local frame. Frame compatibility is part of
 * link safety (context/architecture.md "Link Compatibility").
 */
export type FrameRequirement = "none" | "axis" | "world" | "component";

/**
 * A valid-range constraint. `min`/`max` are expressed in `unit`, which must
 * share the parameter's canonical dimension. Either bound may be omitted for a
 * one-sided range.
 */
export interface ValidRange {
  readonly min?: number;
  readonly max?: number;
  /** Unit the bounds are expressed in; dimension-compatible with the parameter. */
  readonly unit: string;
}

import type { EngineeringValue } from "../values";

/**
 * Default policy for a parameter when it is used as an input.
 *
 * - `required` — a value must be supplied (manual, linked, or workflow-provided).
 * - `optional` — the value may be omitted.
 * - `constant` — a fixed default value is used when none is supplied (e.g.
 *   standard gravity). The constant is a full {@link EngineeringValue} whose
 *   kind and dimension must match the parameter.
 */
export type DefaultPolicy =
  | { readonly kind: "required" }
  | { readonly kind: "optional" }
  | { readonly kind: "constant"; readonly value: EngineeringValue };

/**
 * A canonical parameter definition. See context/architecture.md
 * ("Canonical Parameter Registry") for the required fields.
 *
 * Physical parameters (`quantity`, `vector_quantity`) carry `canonicalUnit`,
 * `displayUnits`, and an optional `range`. Enum parameters carry `enumId` and
 * `enumOptions`. Boolean parameters carry none of these. The registry enforces
 * these shape rules (see ./registry); the physical dimension is derived from
 * `canonicalUnit` via the unit registry rather than stored redundantly.
 */
export interface ParameterDefinition {
  /** Stable canonical ID, e.g. `"motion.axis.payload_mass"`. */
  readonly id: ParameterId;
  /** Human-readable name, e.g. `"Payload mass"`. */
  readonly displayName: string;
  /** Engineering symbol, e.g. `"m_p"`. Unique within the parameter's scope. */
  readonly symbol: string;
  /** Precise engineering definition of what the parameter means. */
  readonly definition: string;
  /** Engineering value family the parameter carries. */
  readonly valueType: ParameterValueType;

  /** Canonical storage unit (physical parameters only). */
  readonly canonicalUnit?: string;
  /** Allowed display units, dimension-compatible with `canonicalUnit`. */
  readonly displayUnits?: readonly string[];
  /** Optional valid-range constraint (physical parameters only). */
  readonly range?: ValidRange;

  /** Enumeration identifier (enum parameters only). */
  readonly enumId?: string;
  /** Allowed option keys within the enumeration (enum parameters only). */
  readonly enumOptions?: readonly string[];

  /** Semantic qualifier axes. */
  readonly qualifiers: ParameterQualifiers;
  /** Load-case categories the parameter admits, if load-case specific. */
  readonly loadCases?: readonly LoadCaseCategory[];
  /** Coordinate-frame / direction requirement. */
  readonly frame: FrameRequirement;
  /** Input default policy. */
  readonly defaultPolicy: DefaultPolicy;

  /** Lifecycle state. */
  readonly lifecycle: ParameterLifecycle;
  /** Replacement parameter ID; present iff `lifecycle` is `deprecated`. */
  readonly replacedBy?: ParameterId;
}
