// Deterministic hard-filter and ranking engine (Unit 2.8 part 1;
// context/architecture.md "lib/catalog/": "Hard filters and transparent
// ranking", "Compatibility rules", "Required-spec output";
// context/code-standards.md "Catalog": "Ranking is deterministic and exposes
// score reasons", "Hard constraints run before ranking").
//
// Pure and DB-free, like ./csv-import — this module never imports `lib/db`.
// `evaluateCandidate` runs every declared `MatchCriterion` against one
// candidate's attributes and reports a pass/fail plus a human-readable reason
// per criterion. `rankCandidates` applies hard filters first (only
// filter-passing candidates are scored) and orders survivors by how tightly
// they fit the requirement — the mean fractional surplus across `"gte"`/
// `"lte"` criteria, smallest (least over-spec) first — with a stable `id`
// tie-break, the same determinism pattern `lib/engine/graph/suggest.ts` uses
// for source-suggestion ordering.

import {
  convert,
  DimensionMismatchError,
  UnknownUnitError,
} from "../engine/units";
import { formatQuantity } from "../engine/units";
import type { EngineeringValue, Quantity } from "../engine/values";
import type {
  CandidateEvaluation,
  CandidatePart,
  CriterionEvaluation,
  CriterionFailureReason,
  MatchCriterion,
  MatchResult,
  RankedCandidate,
  RequiredSpecEntry,
} from "./matching-types";
import { MatchCriterionError } from "./matching-types";

/** Relative tolerance for an `"eq"` quantity comparison when the criterion sets none. */
const DEFAULT_EQUALITY_RELATIVE_TOLERANCE = 1e-9;

function failure(
  criterion: MatchCriterion,
  reason: CriterionFailureReason,
  message: string,
): CriterionEvaluation {
  return {
    key: criterion.key,
    label: criterion.label,
    operator: criterion.operator,
    satisfied: false,
    reason,
    message,
  };
}

function success(
  criterion: MatchCriterion,
  message: string,
  margin?: number,
): CriterionEvaluation {
  return {
    key: criterion.key,
    label: criterion.label,
    operator: criterion.operator,
    satisfied: true,
    message,
    ...(margin !== undefined && { margin }),
  };
}

function evaluateQuantityCriterion(
  criterion: MatchCriterion,
  required: Quantity,
  candidate: Quantity,
): CriterionEvaluation {
  let candidateInRequiredUnit: number;
  try {
    candidateInRequiredUnit = convert(
      candidate.value,
      candidate.unit,
      required.unit,
    );
  } catch (err) {
    if (err instanceof UnknownUnitError || err instanceof DimensionMismatchError) {
      return failure(
        criterion,
        "dimension_mismatch",
        `"${criterion.label}" (${formatQuantity(candidate)}) cannot be compared to the required unit "${required.unit}": ${err.message}`,
      );
    }
    throw err;
  }

  const requiredDisplay = formatQuantity(required);
  const candidateDisplay = `${candidateInRequiredUnit} ${required.unit}`;

  switch (criterion.operator) {
    case "gte": {
      const scale = Math.abs(required.value) || 1;
      const margin = (candidateInRequiredUnit - required.value) / scale;
      if (candidateInRequiredUnit < required.value) {
        return failure(
          criterion,
          "below_minimum",
          `"${criterion.label}" ${candidateDisplay} is below the required minimum ${requiredDisplay}`,
        );
      }
      return success(
        criterion,
        `"${criterion.label}" ${candidateDisplay} meets the required minimum ${requiredDisplay}`,
        margin,
      );
    }
    case "lte": {
      const scale = Math.abs(required.value) || 1;
      const margin = (required.value - candidateInRequiredUnit) / scale;
      if (candidateInRequiredUnit > required.value) {
        return failure(
          criterion,
          "above_maximum",
          `"${criterion.label}" ${candidateDisplay} is above the required maximum ${requiredDisplay}`,
        );
      }
      return success(
        criterion,
        `"${criterion.label}" ${candidateDisplay} meets the required maximum ${requiredDisplay}`,
        margin,
      );
    }
    case "eq": {
      const tolerance = criterion.tolerance ?? DEFAULT_EQUALITY_RELATIVE_TOLERANCE;
      const scale = Math.max(Math.abs(required.value), 1e-12);
      const withinTolerance =
        Math.abs(candidateInRequiredUnit - required.value) <= tolerance * scale;
      if (!withinTolerance) {
        return failure(
          criterion,
          "not_equal",
          `"${criterion.label}" ${candidateDisplay} does not equal the required ${requiredDisplay}`,
        );
      }
      return success(
        criterion,
        `"${criterion.label}" ${candidateDisplay} matches the required ${requiredDisplay}`,
      );
    }
    /* c8 ignore next 2 -- exhaustive ComparisonOperator union */
    default:
      throw new MatchCriterionError(`Unsupported operator: ${String(criterion.operator)}`);
  }
}

function displayEngineeringValue(value: EngineeringValue): string {
  switch (value.kind) {
    case "quantity":
      return formatQuantity(value);
    case "boolean":
      return value.value ? "true" : "false";
    case "enum":
      return value.value;
    case "material_ref":
      return value.materialId;
    default:
      throw new MatchCriterionError(
        `Unsupported match criterion value kind: "${value.kind}"`,
      );
  }
}

function evaluateNonQuantityCriterion(
  criterion: MatchCriterion,
  required: EngineeringValue,
  candidate: EngineeringValue,
): CriterionEvaluation {
  if (criterion.operator !== "eq") {
    throw new MatchCriterionError(
      `Criterion "${criterion.key}" uses operator "${criterion.operator}", but only "eq" is supported for value kind "${required.kind}"`,
    );
  }
  const requiredDisplay = displayEngineeringValue(required);
  const candidateDisplay = displayEngineeringValue(candidate);
  const equal =
    required.kind === "enum" && candidate.kind === "enum"
      ? required.enumId === candidate.enumId && required.value === candidate.value
      : required.kind === "boolean" && candidate.kind === "boolean"
        ? required.value === candidate.value
        : required.kind === "material_ref" && candidate.kind === "material_ref"
          ? required.materialId === candidate.materialId
          : false;

  if (!equal) {
    return failure(
      criterion,
      "not_equal",
      `"${criterion.label}" ${candidateDisplay} does not equal the required ${requiredDisplay}`,
    );
  }
  return success(
    criterion,
    `"${criterion.label}" ${candidateDisplay} matches the required ${requiredDisplay}`,
  );
}

/**
 * Evaluates one {@link MatchCriterion} against a candidate's attribute value.
 * Never throws for missing or mismatched candidate data (that is a rejection
 * reason); throws {@link MatchCriterionError} only for an invalid criterion
 * definition (e.g. `"gte"` on a non-quantity kind, or an unsupported value
 * kind) — a setup error, not a per-candidate one.
 */
export function evaluateCriterion(
  criterion: MatchCriterion,
  candidateValue: EngineeringValue | undefined,
): CriterionEvaluation {
  if (candidateValue === undefined) {
    return failure(
      criterion,
      "missing_attribute",
      `"${criterion.label}" is not present on this part`,
    );
  }
  if (candidateValue.kind !== criterion.value.kind) {
    return failure(
      criterion,
      "value_kind_mismatch",
      `"${criterion.label}" is a "${candidateValue.kind}" value, but "${criterion.value.kind}" is required`,
    );
  }
  if (criterion.value.kind === "quantity") {
    return evaluateQuantityCriterion(
      criterion,
      criterion.value,
      candidateValue as Quantity,
    );
  }
  return evaluateNonQuantityCriterion(criterion, criterion.value, candidateValue);
}

/**
 * Runs every criterion against one candidate. `passed` is true only when every
 * criterion is satisfied (hard constraints, all-or-nothing).
 */
export function evaluateCandidate<C extends CandidatePart>(
  criteria: readonly MatchCriterion[],
  candidate: C,
): CandidateEvaluation<C> {
  const evaluations = criteria.map((criterion) =>
    evaluateCriterion(criterion, candidate.attributes[criterion.key]),
  );
  return {
    candidate,
    passed: evaluations.every((e) => e.satisfied),
    criteria: evaluations,
  };
}

/** Runs {@link evaluateCandidate} over every candidate in `candidates`. */
export function evaluateCandidates<C extends CandidatePart>(
  criteria: readonly MatchCriterion[],
  candidates: readonly C[],
): CandidateEvaluation<C>[] {
  return candidates.map((candidate) => evaluateCandidate(criteria, candidate));
}

/**
 * Applies hard filters, then ranks the survivors. Hard constraints run before
 * ranking: a candidate that fails any criterion is never scored, only
 * reported in `rejected` with its per-criterion reasons.
 *
 * Passing candidates are scored by the mean margin across their `"gte"`/
 * `"lte"` criteria (an `"eq"` criterion contributes no margin — it is
 * pass/fail only) and sorted ascending, so the tightest-fitting candidate
 * (least oversized relative to the requirement) ranks first. A candidate with
 * no scored criteria gets a score of `0`. Ties break on `candidate.id` for a
 * deterministic order independent of input ordering.
 */
export function rankCandidates<C extends CandidatePart>(
  criteria: readonly MatchCriterion[],
  candidates: readonly C[],
): MatchResult<C> {
  const evaluations = evaluateCandidates(criteria, candidates);
  const accepted: RankedCandidate<C>[] = [];
  const rejected: CandidateEvaluation<C>[] = [];

  for (const evaluation of evaluations) {
    if (!evaluation.passed) {
      rejected.push(evaluation);
      continue;
    }
    const margins = evaluation.criteria
      .map((c) => c.margin)
      .filter((m): m is number => m !== undefined);
    const score =
      margins.length > 0
        ? margins.reduce((sum, m) => sum + m, 0) / margins.length
        : 0;
    accepted.push({ candidate: evaluation.candidate, score, criteria: evaluation.criteria });
  }

  accepted.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.candidate.id < b.candidate.id ? -1 : a.candidate.id > b.candidate.id ? 1 : 0;
  });

  return { accepted, rejected };
}

/**
 * Formats `criteria` into a human/UI-facing required-specification summary
 * (context/ui-context.md "Catalog and Assignment UI": "Required specification
 * summary first"), independent of any candidate.
 */
export function describeRequiredSpec(
  criteria: readonly MatchCriterion[],
): RequiredSpecEntry[] {
  return criteria.map((criterion) => ({
    key: criterion.key,
    label: criterion.label,
    operator: criterion.operator,
    displayValue: displayEngineeringValue(criterion.value),
  }));
}
