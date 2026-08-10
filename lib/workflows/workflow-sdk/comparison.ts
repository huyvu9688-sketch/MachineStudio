// Compares candidate system configurations against a WorkflowDefinition's
// declared comparison criteria (./types CandidateComparisonCriterion). Pure:
// operates only on already-computed `ModuleComputation`s the caller supplies
// — no persistence, no catalog hard-filter/ranking duplication (Unit 2.8
// already owns that for manufacturer parts; this compares calculation
// outputs across whole candidate systems instead).
//
// Ranking is lexicographic over the declared criteria, in the order the
// definition lists them — not a weighted score. A weighted formula would
// invent relative-importance numbers with no sourced basis; ordering the
// criteria list *is* the founder's own explicit, reviewable judgment call
// (context/adr/0007-workflow-definition-contract.md).

import type {
  EngineeringValue,
  ModuleComputation,
  ModulePorts,
} from "@/lib/engine";
import type { CandidateComparisonCriterion, WorkflowDefinition } from "./types";

/** One role instance within a candidate system, already computed. */
export interface WorkflowCandidateInstance {
  readonly roleId: string;
  readonly ports: ModulePorts;
  readonly computation: ModuleComputation;
}

/** One labeled candidate system: a full set of already-computed role instances. */
export interface WorkflowCandidate {
  readonly label: string;
  readonly instances: readonly WorkflowCandidateInstance[];
}

/** One criterion's resolved value for one candidate. `undefined` when not found. */
export interface CandidateCriterionValue {
  readonly criterionId: string;
  readonly value: number | undefined;
}

/** One candidate's comparison outcome. */
export interface CandidateComparisonResult {
  readonly label: string;
  /** True when any instance has a failing `CheckResult` — reuses check-status semantics verbatim. */
  readonly disqualified: boolean;
  readonly disqualifiedReason?: string;
  readonly criteria: readonly CandidateCriterionValue[];
}

/** The result of {@link compareCandidateSystems}. */
export interface CompareCandidateSystemsResult {
  /** Qualified candidates first (ranked lexicographically), then disqualified ones. */
  readonly ranked: readonly CandidateComparisonResult[];
}

function extractNumericValue(
  value: EngineeringValue | undefined,
): number | undefined {
  return value !== undefined && value.kind === "quantity"
    ? value.value
    : undefined;
}

function findCriterionValue(
  criterion: CandidateComparisonCriterion,
  candidate: WorkflowCandidate,
): number | undefined {
  const instance = candidate.instances.find(
    (i) => i.roleId === criterion.roleId,
  );
  if (instance === undefined) return undefined;
  const port = instance.ports.outputs.find(
    (p) =>
      p.parameterId === criterion.parameterId &&
      p.loadCase === criterion.loadCase,
  );
  if (port === undefined) return undefined;
  return extractNumericValue(instance.computation.outputs[port.key]);
}

function disqualification(candidate: WorkflowCandidate): {
  disqualified: boolean;
  reason?: string;
} {
  for (const instance of candidate.instances) {
    const failing = instance.computation.checks.find(
      (c) => c.status === "fail",
    );
    if (failing !== undefined) {
      return {
        disqualified: true,
        reason: `Role "${instance.roleId}": ${failing.message}`,
      };
    }
  }
  return { disqualified: false };
}

/** Lexicographic comparator: earlier criteria dominate; missing values sort last. */
function compareByCriteria(
  criteria: readonly CandidateComparisonCriterion[],
  a: CandidateComparisonResult,
  b: CandidateComparisonResult,
): number {
  for (const criterion of criteria) {
    const av = a.criteria.find((c) => c.criterionId === criterion.id)?.value;
    const bv = b.criteria.find((c) => c.criterionId === criterion.id)?.value;
    if (av === undefined && bv === undefined) continue;
    if (av === undefined) return 1;
    if (bv === undefined) return -1;
    if (av === bv) continue;
    const diff = criterion.direction === "higher_is_better" ? bv - av : av - bv;
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Ranks `candidates` against `definition.comparisonCriteria`. A candidate
 * with any failing check is disqualified outright (never converted into a
 * pass by ranking — "Checks and Status": "Warnings never convert a failed
 * requirement into a pass") and sorted after every qualified candidate.
 */
export function compareCandidateSystems(
  definition: WorkflowDefinition,
  candidates: readonly WorkflowCandidate[],
): CompareCandidateSystemsResult {
  const evaluated = candidates.map((candidate): CandidateComparisonResult => {
    const dq = disqualification(candidate);
    const criteria = definition.comparisonCriteria.map((criterion) => ({
      criterionId: criterion.id,
      value: findCriterionValue(criterion, candidate),
    }));
    return {
      label: candidate.label,
      disqualified: dq.disqualified,
      ...(dq.reason !== undefined && { disqualifiedReason: dq.reason }),
      criteria,
    };
  });

  const qualified = evaluated.filter((c) => !c.disqualified);
  const disqualified = evaluated.filter((c) => c.disqualified);
  qualified.sort((a, b) =>
    compareByCriteria(definition.comparisonCriteria, a, b),
  );

  return { ranked: [...qualified, ...disqualified] };
}
