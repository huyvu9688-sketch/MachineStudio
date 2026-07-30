// Catalog matching contracts (Unit 2.8 part 1; context/architecture.md
// "lib/catalog/": "Hard filters and transparent ranking", "Compatibility
// rules", "Required-spec output"). Pure types only — the deterministic
// evaluator lives in ./matching.
//
// A `MatchCriterion` is a generic, component-type-agnostic hard constraint:
// an attribute key, a comparison operator, and a required `EngineeringValue`.
// The engine never encodes which attribute needs which operator — that
// judgment belongs to whoever builds the criteria for a specific component
// type (a module's `CatalogAdapter.requiredSpec` output, once a production
// module reaches Stage 5, mapped to explicit operators; see
// context/progress-tracker.md Unit 2.8 Architecture Decision). This mirrors
// how `lib/engine/graph`'s link-compatibility evaluator stays generic across
// parameters by reading qualifier metadata rather than hardcoding per-
// parameter rules.

import type { EngineeringValue } from "../engine/values";
import type { ComponentAttributes } from "./types";

/** Thrown for an invalid `MatchCriterion` definition — a setup error, not a per-candidate data problem. */
export class MatchCriterionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MatchCriterionError";
  }
}

/**
 * How a candidate's attribute value must relate to a criterion's required
 * value. `"gte"`/`"lte"` apply only to `quantity` values (a capacity or limit
 * threshold); `"eq"` applies to any value kind (identity/categorical match,
 * or a toleranced quantity match).
 */
export type ComparisonOperator = "gte" | "lte" | "eq";

/**
 * One hard constraint a candidate part's attributes must satisfy.
 *
 * `key` indexes into the candidate's {@link ComponentAttributes}, the same
 * key space a `ComponentSchemaVersion` declares (Unit 2.6). `label` is the
 * human-readable name shown in rejection reasons and the required-spec
 * summary (context/ui-context.md "Catalog and Assignment UI": "Required
 * specification summary first").
 */
export interface MatchCriterion {
  readonly key: string;
  readonly label: string;
  readonly operator: ComparisonOperator;
  readonly value: EngineeringValue;
  /**
   * Relative tolerance for an `"eq"` comparison on a `quantity` (fraction of
   * the required magnitude). Ignored for non-quantity kinds, where `"eq"` is
   * exact identity. Defaults to a numerical-noise tolerance (see
   * `matching.ts`'s `DEFAULT_EQUALITY_RELATIVE_TOLERANCE`) — callers with a
   * real engineering fit tolerance (e.g. a shaft-bore match) should pass one
   * explicitly.
   */
  readonly tolerance?: number;
}

/** Why one criterion evaluation did not pass. Absent when it passed. */
export type CriterionFailureReason =
  /** The candidate has no value for this attribute key. */
  | "missing_attribute"
  /** The candidate's value is a different `EngineeringValue` kind than required. */
  | "value_kind_mismatch"
  /** The candidate's quantity cannot be converted to the required unit's dimension. */
  | "dimension_mismatch"
  /** A `"gte"` comparison failed: the candidate is below the required minimum. */
  | "below_minimum"
  /** A `"lte"` comparison failed: the candidate is above the required maximum. */
  | "above_maximum"
  /** An `"eq"` comparison failed: the candidate does not match the required value. */
  | "not_equal";

/** The outcome of evaluating one candidate against one {@link MatchCriterion}. */
export interface CriterionEvaluation {
  readonly key: string;
  readonly label: string;
  readonly operator: ComparisonOperator;
  readonly satisfied: boolean;
  readonly reason?: CriterionFailureReason;
  /** Human-readable explanation, always present (a pass reason or a rejection reason). */
  readonly message: string;
  /**
   * Signed fractional surplus relative to the requirement, present only for a
   * `"gte"`/`"lte"` quantity comparison (positive means the candidate clears
   * the requirement by that fraction, negative means it falls short). Used by
   * {@link "./matching".rankCandidates} to score passing candidates; absent
   * for `"eq"` criteria, which are pass/fail only.
   */
  readonly margin?: number;
}

/** A candidate part: the minimum shape the matching engine needs. */
export interface CandidatePart {
  readonly id: string;
  readonly attributes: ComponentAttributes;
}

/** One candidate's full hard-filter evaluation, before ranking. */
export interface CandidateEvaluation<C extends CandidatePart = CandidatePart> {
  readonly candidate: C;
  readonly passed: boolean;
  readonly criteria: readonly CriterionEvaluation[];
}

/** A hard-filter-passing candidate, scored and ordered by {@link "./matching".rankCandidates}. */
export interface RankedCandidate<C extends CandidatePart = CandidatePart> {
  readonly candidate: C;
  /** Mean margin across scored criteria; lower (closer to zero) ranks first — the tightest fit. */
  readonly score: number;
  readonly criteria: readonly CriterionEvaluation[];
}

/** The full result of filtering and ranking a candidate list against required criteria. */
export interface MatchResult<C extends CandidatePart = CandidatePart> {
  /** Hard-filter-passing candidates, ranked tightest fit first, ties broken by `id`. */
  readonly accepted: readonly RankedCandidate<C>[];
  /** Hard-filter-failing candidates, each with its per-criterion rejection reasons. */
  readonly rejected: readonly CandidateEvaluation<C>[];
}

/** One entry of a human/UI-facing required-specification summary. */
export interface RequiredSpecEntry {
  readonly key: string;
  readonly label: string;
  readonly operator: ComparisonOperator;
  /** Formatted required value, e.g. `"3660 N"`, `"true"`, `"preloaded"`. */
  readonly displayValue: string;
}
