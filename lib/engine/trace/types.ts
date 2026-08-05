// Calculation trace and check contracts (Unit 1.5). These are the structured,
// report-renderable records a module's compute path emits alongside its output
// values: a nested calculation trace, check results, warnings, and validity
// (envelope) results. Reports render this data and never re-run or duplicate a
// module's formulas (context/architecture.md invariant "Trace-driven
// reporting"; context/code-standards.md "Calculation Trace", "Checks and
// Status").
//
// Runtime validation lives in ./schemas (shape), ./trace (trace invariants),
// and ./checks (status aggregation). This layer reuses the EngineeringValue
// union (Unit 1.1) for every operand/observed value and the ClauseReference
// contract (Unit 1.4) for every source citation — a trace step never carries a
// bare physical number.

import type { EngineeringValue } from "../values";
import type { ClauseReference } from "../../standards/types";
import type { TraceFormatVersion } from "./format";

/**
 * A named value consumed or produced by a {@link TraceStep}.
 *
 * `label` is the symbol the value appears as in the step's expression (e.g.
 * `"m"`, `"a"`, `"F"`). `value` is the concrete {@link EngineeringValue} used or
 * produced, embedded so a report renders the actual number and unit without
 * recomputation. `ref` optionally records provenance — a canonical parameter ID
 * or an upstream step ID — kept as an opaque string so the trace stays
 * self-contained for rendering.
 */
export interface TraceOperand {
  /** Symbol/name of the operand within the step's expression. Non-empty. */
  readonly label: string;
  /** The concrete value used or produced, in its canonical unit. */
  readonly value: EngineeringValue;
  /** Optional provenance: a canonical parameter ID or an upstream step ID. */
  readonly ref?: string;
}

/** Discriminator tag identifying each {@link TraceNode} member. */
export type TraceNodeKind = "step" | "section";

/**
 * A single calculation step: one method/expression evaluated over named inputs
 * to produce named outputs, citing its engineering basis.
 *
 * `id` is stable and unique within the trace so reports, snapshots, and
 * cross-run comparison can address the step. `methodId` is a stable identifier
 * of the method/expression applied (e.g. `"screw.axial_thrust"`), suitable for
 * trace snapshotting; `expression` is an optional human-readable rendering of
 * the formula (e.g. `"F = m·a"`) carrying no computation. Changing a step's
 * engineering meaning requires a module version change (context/code-standards.md
 * "Calculation Trace").
 */
export interface TraceStep {
  readonly node: "step";
  /** Stable, trace-unique step ID. Non-empty. */
  readonly id: string;
  /** Optional short human-readable heading for the step. */
  readonly title?: string;
  /** Stable method/expression identifier applied by this step. Non-empty. */
  readonly methodId: string;
  /** Optional human-readable formula rendering; no computation logic. */
  readonly expression?: string;
  /** Named inputs consumed; may be empty for an assumption/given step. */
  readonly inputs: readonly TraceOperand[];
  /** Named outputs produced; may be empty. */
  readonly outputs: readonly TraceOperand[];
  /** Source citations for the method/expression, where applicable. */
  readonly sources?: readonly ClauseReference[];
  /** Optional free-text notes (no reproduced licensed text). */
  readonly notes?: readonly string[];
}

/**
 * A titled grouping of trace nodes. Sections may contain steps and further
 * subsections in `children`, preserving authoring order so a report can render
 * the trace as a nested outline. `id` is stable and unique within the trace.
 */
export interface TraceSection {
  readonly node: "section";
  /** Stable, trace-unique section ID. Non-empty. */
  readonly id: string;
  /** Human-readable section title. Non-empty. */
  readonly title: string;
  /** Ordered child nodes (steps and/or subsections); may be empty. */
  readonly children: readonly TraceNode[];
}

/** A node in a calculation trace: either a {@link TraceStep} or {@link TraceSection}. */
export type TraceNode = TraceStep | TraceSection;

/**
 * The structured calculation trace a module emits. A versioned envelope over an
 * ordered list of top-level {@link TraceSection sections}. Reports render this
 * without importing module compute code (Unit 1.5 exit criterion).
 */
export interface CalculationTrace {
  /** Trace serialization format version. */
  readonly v: TraceFormatVersion;
  /** Ordered top-level sections. */
  readonly sections: readonly TraceSection[];
}

/**
 * The outcome state of a {@link CheckResult}. A `warning` never converts a
 * failed requirement into a pass; `not_applicable` marks a check that does not
 * apply to the current inputs; `invalid_input` marks a check that could not be
 * evaluated because an input was invalid (context/code-standards.md "Checks and
 * Status").
 */
export type CheckStatus =
  "pass" | "fail" | "warning" | "not_applicable" | "invalid_input";

/**
 * The result of evaluating one engineering acceptance check.
 *
 * Every check has a stable `id`, a `status`, and a human-readable `message`.
 * Where meaningful it also records the `criterion` (the limit statement, e.g.
 * `"SF_s ≥ 2.0"`), the `observed` value, the `allowable` limit it was compared
 * against, a computed `margin`, and source citations. All physical values are
 * {@link EngineeringValue}s carrying their own unit.
 */
export interface CheckResult {
  /** Stable check ID. Non-empty. */
  readonly id: string;
  /** Outcome state. */
  readonly status: CheckStatus;
  /** Human-readable result message. Non-empty. */
  readonly message: string;
  /** Human-readable statement of the acceptance criterion. */
  readonly criterion?: string;
  /** The observed value evaluated by the check. */
  readonly observed?: EngineeringValue;
  /** The limiting value the observation was compared against. */
  readonly allowable?: EngineeringValue;
  /** The computed margin (e.g. a safety factor or a difference). */
  readonly margin?: EngineeringValue;
  /** Source citations for the check basis. */
  readonly sources?: readonly ClauseReference[];
}

/**
 * A non-fatal advisory raised by a module — an unsupported-but-tolerable
 * condition, a conservative assumption, or a near-limit notice. A warning is
 * surfaced separately from checks and never downgrades a check's status.
 */
export interface Warning {
  /** Stable warning ID. Non-empty. */
  readonly id: string;
  /** Human-readable warning message. Non-empty. */
  readonly message: string;
  /** Optional additional detail. */
  readonly detail?: string;
  /** Source citations, where applicable. */
  readonly sources?: readonly ClauseReference[];
}

/**
 * Whether an input or condition lies within the module's validity envelope.
 * `within_limits` — supported; `out_of_range` — outside the validated envelope,
 * so results are unreliable; `not_evaluated` — the limit was not checked for
 * these inputs.
 */
export type ValidityStatus = "within_limits" | "out_of_range" | "not_evaluated";

/**
 * The result of evaluating one validity (envelope) limit. Records whether the
 * inputs fall within a supported bound of the module's validated method, so a
 * report can flag an out-of-envelope calculation
 * (context/architecture.md `ModuleComputation` "Validity-limit results").
 */
export interface ValidityResult {
  /** Stable validity-limit ID. Non-empty. */
  readonly id: string;
  /** Whether the inputs lie within this limit. */
  readonly status: ValidityStatus;
  /** Human-readable description of the validity limit/envelope bound. Non-empty. */
  readonly limit: string;
  /** Optional message explaining the evaluation. */
  readonly message?: string;
  /** The observed value evaluated against the limit. */
  readonly observed?: EngineeringValue;
  /** Source citations for the limit basis. */
  readonly sources?: readonly ClauseReference[];
}
