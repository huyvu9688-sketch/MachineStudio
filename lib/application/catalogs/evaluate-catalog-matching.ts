// Shared catalog-matching evaluation, factored out of
// `load-component-assignment-view.ts` (Unit 3.6) so a live, unpersisted
// preview (`preview-module-computation.ts`) can show the same candidate
// table a persisted run's `ComponentAssignmentPanel` shows, from a
// `ModuleComputation`/`ModuleInput` pair either caller already has in hand —
// no `CalculationRun` required. Every componentType-dispatch and
// candidate-description rule here must stay identical for both callers: a
// module's real matcher is what it is regardless of whether its computation
// came from a preview or a saved run.

import "server-only";
import type { RequiredSpecEntry } from "@/lib/catalog";
import type {
  CatalogAdapter,
  ModuleComputation,
  ModuleInput,
} from "@/lib/engine";
import {
  asComponentTypeId,
  listManufacturerPartRevisionsByComponentType,
  loadManufacturer,
  type ManufacturerPartRevisionId,
  type ManufacturerPartRevisionRecord,
} from "@/lib/db";
import {
  evaluatePneumaticCylinderCandidates,
  type PneumaticCylinderMatchCandidate,
} from "./pneumatic-cylinder-matching";
import {
  evaluateGuidedCylinderCandidates,
  type GuidedCylinderMatchCandidate,
} from "./guided-cylinder-matching";
import {
  evaluateDualRodCylinderCandidates,
  type DualRodCylinderMatchCandidate,
} from "./dual-rod-cylinder-matching";
import {
  evaluateMgpGuidedCylinderCandidates,
  type MgpGuidedCylinderMatchCandidate,
} from "./mgp-guided-cylinder-matching";

/** One candidate manufacturer part, described for the candidate table. */
export interface CandidatePartView {
  readonly id: ManufacturerPartRevisionId;
  readonly manufacturerName: string;
  readonly partNumber: string;
  readonly sourceRevision: string;
  readonly sourceLink: string | null;
  readonly lifecycleStatus: string | null;
  readonly dataQualityStatus: string;
}

/** A hard-filter-passing candidate with its transparent ranking explanation. */
export interface RankedCandidateView {
  readonly part: CandidatePartView;
  /** Mean fractional surplus across scored criteria; lower is a tighter fit. */
  readonly score: number;
  /** Why this candidate ranks where it does — one line per satisfied criterion. */
  readonly rankingReasons: readonly string[];
}

/** A hard-filter-failing candidate with the reasons it was excluded. */
export interface RejectedCandidateView {
  readonly part: CandidatePartView;
  readonly rejectionReasons: readonly string[];
}

/** The candidate-matching half of `ComponentAssignmentPanelView` — everything derivable from a computation alone, without a persisted run. */
export interface CatalogMatchingView {
  /** The component type this module's adapter matches parts for; `null` without an adapter. */
  readonly componentType: string | null;
  readonly requiredSpec: readonly RequiredSpecEntry[];
  /** `false` when the module declares no `catalogAdapter`, or its component type has no `MatchCriterion` mapping yet (`load-component-assignment-view.ts`'s own header explains the latter deferral). */
  readonly matchingAvailable: boolean;
  readonly matchingUnavailableReason: string | null;
  readonly accepted: readonly RankedCandidateView[];
  readonly rejected: readonly RejectedCandidateView[];
}

const NO_ADAPTER_REASON =
  "This module does not define catalog matching, so there is no required specification to filter parts against. A manual or custom part can still be assigned.";
const NO_CRITERIA_REASON =
  "This module publishes a required specification but no comparison rules yet, so candidate parts cannot be filtered or ranked automatically. A manual or custom part can still be assigned.";

/** Resolves a part revision plus its manufacturer's display name (memoized per call). */
export async function describePart(
  revision: ManufacturerPartRevisionRecord,
  manufacturerNames: Map<string, string>,
): Promise<CandidatePartView> {
  let manufacturerName = manufacturerNames.get(revision.manufacturerId);
  if (manufacturerName === undefined) {
    const manufacturer = await loadManufacturer(revision.manufacturerId);
    manufacturerName = manufacturer?.name ?? revision.manufacturerId;
    manufacturerNames.set(revision.manufacturerId, manufacturerName);
  }
  return {
    id: revision.id,
    manufacturerName,
    partNumber: revision.partNumber,
    sourceRevision: revision.sourceRevision,
    sourceLink: revision.sourceLink,
    lifecycleStatus: revision.lifecycleStatus,
    dataQualityStatus: revision.dataQualityStatus,
  };
}

/**
 * Runs `adapter`'s real matcher against every seeded candidate of its
 * component type, for one `computation`/`moduleInput` pair. Never touches
 * `CalculationRun`/`ComponentAssignment` — the caller decides what, if
 * anything, a returned candidate can be assigned against.
 */
export async function evaluateCatalogMatching(
  adapter: CatalogAdapter | undefined,
  computation: ModuleComputation,
  moduleInput: ModuleInput,
): Promise<CatalogMatchingView> {
  if (adapter === undefined) {
    return {
      componentType: null,
      requiredSpec: [],
      matchingAvailable: false,
      matchingUnavailableReason: NO_ADAPTER_REASON,
      accepted: [],
      rejected: [],
    };
  }

  // "pneumatic_cylinder" (Unit 7.2), "pneumatic_cylinder_guided" (Unit 7.3),
  // "pneumatic_cylinder_dual_rod" (Unit 7.4), and "pneumatic_cylinder_guided_
  // mgp" (guided-cylinder-sizing@0.2.0) are the only component types with a
  // real requiredSpec -> MatchCriterion mapping today — see
  // load-component-assignment-view.ts's own header for why every other
  // component type still reports matchingAvailable: false (Milestone 4's own
  // still-open deferral, not touched by this change).
  if (
    adapter.componentType !== "pneumatic_cylinder" &&
    adapter.componentType !== "pneumatic_cylinder_guided" &&
    adapter.componentType !== "pneumatic_cylinder_dual_rod" &&
    adapter.componentType !== "pneumatic_cylinder_guided_mgp"
  ) {
    return {
      componentType: adapter.componentType,
      requiredSpec: [],
      matchingAvailable: false,
      matchingUnavailableReason: NO_CRITERIA_REASON,
      accepted: [],
      rejected: [],
    };
  }

  const revisions = await listManufacturerPartRevisionsByComponentType(
    asComponentTypeId(adapter.componentType),
  );
  const matchCandidates = revisions.map((revision) => ({
    id: revision.id,
    attributes: revision.attributes,
  }));

  const outcome =
    adapter.componentType === "pneumatic_cylinder"
      ? evaluatePneumaticCylinderCandidates(
          computation,
          matchCandidates as PneumaticCylinderMatchCandidate[],
        )
      : adapter.componentType === "pneumatic_cylinder_guided"
        ? evaluateGuidedCylinderCandidates(
            computation,
            matchCandidates as GuidedCylinderMatchCandidate[],
          )
        : adapter.componentType === "pneumatic_cylinder_dual_rod"
          ? evaluateDualRodCylinderCandidates(
              computation,
              matchCandidates as DualRodCylinderMatchCandidate[],
            )
          : // "pneumatic_cylinder_guided_mgp" -- the only matcher of the four
            // that also needs the raw input: max_piston_speed,
            // eccentric_distance, and transfer_speed are selection-only
            // inputs guided-cylinder-sizing@0.2.0 never echoes as outputs
            // (its own manifest.ts).
            evaluateMgpGuidedCylinderCandidates(
              computation,
              moduleInput,
              matchCandidates as MgpGuidedCylinderMatchCandidate[],
            );

  const manufacturerNames = new Map<string, string>();
  const revisionById = new Map(revisions.map((r) => [r.id, r]));
  const accepted: RankedCandidateView[] = [];
  for (const rankedCandidate of outcome.accepted) {
    const revision = revisionById.get(
      rankedCandidate.candidate.id as ManufacturerPartRevisionId,
    );
    if (revision === undefined) continue;
    accepted.push({
      part: await describePart(revision, manufacturerNames),
      score: rankedCandidate.score,
      rankingReasons: rankedCandidate.reasons,
    });
  }
  const rejected: RejectedCandidateView[] = [];
  for (const rejectedCandidate of outcome.rejected) {
    const revision = revisionById.get(
      rejectedCandidate.candidate.id as ManufacturerPartRevisionId,
    );
    if (revision === undefined) continue;
    rejected.push({
      part: await describePart(revision, manufacturerNames),
      rejectionReasons: rejectedCandidate.reasons,
    });
  }

  return {
    componentType: adapter.componentType,
    requiredSpec: outcome.requiredSpec,
    matchingAvailable: true,
    matchingUnavailableReason: null,
    accepted,
    rejected,
  };
}
