// The `loadComponentAssignmentView` use case (Unit 3.6) — the read model the
// catalog matching and assignment UI needs (context/implementation-map.md
// Unit 3.6: "Required-spec panel", "Filtered candidate table", "Rejection
// reasons", "Ranking explanations", "Datasheet/source link", "Assign and
// manual-part actions"; exit criterion: "An engineer can assign a
// manufacturer part and see its supporting run").
//
// Performs no writes, like `loadModuleResultView` (Unit 3.5) and
// `loadModuleWorkspaceView` (Unit 3.3). Composes lib/db (authorization, the
// module instance, its latest run, its existing assignments) and lib/modules
// (the pinned package, for its optional `catalogAdapter` — never `compute`).
//
// WHY `matchingAvailable` CAN BE `false`
//
// Hard filtering and ranking (`rankCandidates`, Unit 2.8 part 1) need
// `MatchCriterion`s: an attribute key, a comparison operator, and a required
// value. A module's `CatalogAdapter.requiredSpec()` returns only
// `Record<string, EngineeringValue>` — no operator. Deciding whether an
// attribute needs a capacity floor (`"gte"`), a size ceiling (`"lte"`), or an
// identity match (`"eq"`) is real engineering judgment that no released
// contract records, and Unit 2.8 part 1 deliberately deferred building
// criteria from `requiredSpec()` to "whichever later unit first wires a real
// production module's catalog adapter to this engine (Milestone 4)"
// (context/progress-tracker.md, Unit 2.8 Architecture Decision). Extending
// `CatalogAdapter` to carry operators here was considered and rejected: it is
// a released SDK contract, and `lib/engine` deliberately does not import
// `lib/catalog`'s `MatchCriterion` (see the `CatalogAdapter` TSDoc).
//
// So this unit honors the deferral rather than inventing the mapping in a UI
// read model. Today no registered module declares a `catalogAdapter` at all,
// so every module reports `matchingAvailable: false` with a reason the panel
// states honestly. Manual/custom part assignment works fully, and is what
// satisfies this unit's exit criterion now. The candidate-table half of the
// view (`accepted`/`rejected`, rendered by `ComponentAssignmentPanel`) is
// built and tested against fixtures, ready for Milestone 4 to populate.

import "server-only";
import type { RequiredSpecEntry } from "@/lib/catalog";
import type { CheckStatus } from "@/lib/engine";
import { getModulePackage } from "@/lib/modules";
import {
  asComponentTypeId,
  listComponentAssignmentsForModuleInstance,
  listManufacturerPartRevisionsByComponentType,
  listRunsForModuleInstance,
  loadCalculationRun,
  loadManufacturer,
  loadManufacturerPartRevision,
  loadModuleInstanceForOwner,
  type CalculationRunId,
  type ComponentAssignmentRecord,
  type MachineConfigurationId,
  type ManufacturerPartRevisionId,
  type ManufacturerPartRevisionRecord,
  type ModuleInstanceId,
  type UserId,
} from "@/lib/db";
import {
  evaluatePneumaticCylinderCandidates,
  type PneumaticCylinderMatchCandidate,
} from "./pneumatic-cylinder-matching";
import {
  evaluateGuidedCylinderCandidates,
  type GuidedCylinderMatchCandidate,
} from "./guided-cylinder-matching";

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

/** An existing assignment on this module instance, with its supporting run. */
export interface ComponentAssignmentView {
  readonly id: string;
  readonly partSource: "catalog" | "manual";
  /** Present for a `"catalog"` assignment whose part revision still resolves. */
  readonly part: CandidatePartView | null;
  /** Present for a `"manual"` assignment. */
  readonly manualDescription: string | null;
  readonly manualManufacturerName: string | null;
  readonly manualPartNumber: string | null;
  readonly quantity: number;
  readonly stale: boolean;
  readonly staleReason: string | null;
  /** The justifying calculation run — this unit's exit criterion, "see its supporting run". */
  readonly supportingRun: {
    readonly id: CalculationRunId;
    readonly status: CheckStatus;
    readonly createdAt: Date;
  } | null;
  readonly createdAt: Date;
}

/** What the catalog matching and assignment UI needs for one module instance. */
export interface ComponentAssignmentPanelView {
  readonly moduleInstance: {
    readonly id: ModuleInstanceId;
    readonly configurationId: MachineConfigurationId;
    readonly label: string;
  };
  /**
   * The latest run, when one exists. A `"module_instance"` assignment
   * requires a supporting run, so the panel cannot offer an assign action
   * until the module has been run at least once.
   */
  readonly latestRunId: CalculationRunId | null;
  /** The component type this module's adapter matches parts for; `null` without an adapter. */
  readonly componentType: string | null;
  /** The required specification, shown first (ui-context.md "Catalog and Assignment UI"). */
  readonly requiredSpec: readonly RequiredSpecEntry[];
  /**
   * Whether hard filtering and ranking could actually run. `false` when the
   * module declares no `catalogAdapter`, when it has no run to derive a
   * required spec from, or while the `requiredSpec`-to-`MatchCriterion`
   * mapping remains Milestone 4's (see this file's header). The candidate
   * tables are empty whenever this is `false`.
   */
  readonly matchingAvailable: boolean;
  /** Why matching is unavailable, for an honest notice instead of an empty table. */
  readonly matchingUnavailableReason: string | null;
  readonly accepted: readonly RankedCandidateView[];
  readonly rejected: readonly RejectedCandidateView[];
  readonly assignments: readonly ComponentAssignmentView[];
}

/** Resolves a part revision plus its manufacturer's display name (memoized per view). */
async function describePart(
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

async function describeAssignment(
  assignment: ComponentAssignmentRecord,
  ownerId: UserId,
  manufacturerNames: Map<string, string>,
): Promise<ComponentAssignmentView> {
  let part: CandidatePartView | null = null;
  if (assignment.manufacturerPartRevisionId !== null) {
    const revision = await loadManufacturerPartRevision(
      assignment.manufacturerPartRevisionId,
    );
    // Part revisions are write-once and not deleted in normal operation
    // (ADR-0006); degrade to `null` rather than failing the whole panel.
    part =
      revision === null
        ? null
        : await describePart(revision, manufacturerNames);
  }

  let supportingRun: ComponentAssignmentView["supportingRun"] = null;
  if (assignment.calculationRunId !== null) {
    const run = await loadCalculationRun(assignment.calculationRunId, ownerId);
    if (run !== null) {
      supportingRun = {
        id: run.id,
        status: run.status,
        createdAt: run.createdAt,
      };
    }
  }

  return {
    id: assignment.id,
    partSource: assignment.partSource,
    part,
    manualDescription: assignment.manualPartDetails?.description ?? null,
    manualManufacturerName:
      assignment.manualPartDetails?.manufacturerName ?? null,
    manualPartNumber: assignment.manualPartDetails?.partNumber ?? null,
    quantity: assignment.quantity,
    stale: assignment.stale,
    staleReason: assignment.staleReason,
    supportingRun,
    createdAt: assignment.createdAt,
  };
}

const NO_ADAPTER_REASON =
  "This module does not define catalog matching, so there is no required specification to filter parts against. A manual or custom part can still be assigned.";
const NO_RUN_REASON =
  "Run this module to calculate its required specification before matching manufacturer parts.";
const NO_CRITERIA_REASON =
  "This module publishes a required specification but no comparison rules yet, so candidate parts cannot be filtered or ranked automatically. A manual or custom part can still be assigned.";

/**
 * Loads the catalog matching and assignment read model for
 * `moduleInstanceId`, scoped to `ownerId`. Returns `null` when the module
 * instance does not exist, is not owned by `ownerId`, or its pinned package
 * is not registered — the same "nothing real to render" outcome
 * `loadModuleResultView` returns for an unknown/foreign deep link.
 *
 * A module with no `catalogAdapter` (every registered module today) is a
 * normal render, not an error: `matchingAvailable` is `false` with a reason,
 * the candidate tables are empty, and the manual/custom part assignment path
 * plus any existing assignments still render.
 */
export async function loadComponentAssignmentView(
  moduleInstanceId: ModuleInstanceId,
  ownerId: UserId,
): Promise<ComponentAssignmentPanelView | null> {
  const context = await loadModuleInstanceForOwner(moduleInstanceId, ownerId);
  if (context === null) {
    return null;
  }
  const { moduleInstance } = context;

  const pkg = getModulePackage(
    moduleInstance.modulePackageId,
    moduleInstance.moduleVersion,
  );
  if (pkg === undefined) {
    return null;
  }

  const manufacturerNames = new Map<string, string>();
  const assignmentRecords = await listComponentAssignmentsForModuleInstance(
    moduleInstanceId,
    ownerId,
  );
  const assignments: ComponentAssignmentView[] = [];
  for (const record of assignmentRecords) {
    assignments.push(
      await describeAssignment(record, ownerId, manufacturerNames),
    );
  }

  const summaries = await listRunsForModuleInstance(moduleInstanceId, ownerId);
  const latestRunId = summaries[0]?.id ?? null;

  const base = {
    moduleInstance: {
      id: moduleInstance.id,
      configurationId: moduleInstance.configurationId,
      label: moduleInstance.label,
    },
    latestRunId,
    requiredSpec: [] as readonly RequiredSpecEntry[],
    matchingAvailable: false,
    accepted: [] as readonly RankedCandidateView[],
    rejected: [] as readonly RejectedCandidateView[],
    assignments,
  };

  const adapter = pkg.catalogAdapter;
  if (adapter === undefined) {
    return {
      ...base,
      componentType: null,
      matchingUnavailableReason: NO_ADAPTER_REASON,
    };
  }
  if (latestRunId === null) {
    return {
      ...base,
      componentType: adapter.componentType,
      matchingUnavailableReason: NO_RUN_REASON,
    };
  }

  // An adapter exists and the module has run. For "pneumatic_cylinder"
  // (Unit 7.2) and "pneumatic_cylinder_guided" (Unit 7.3), the
  // requiredSpec -> MatchCriterion mapping now has a real implementation
  // -- see this file's own header for why every other component type
  // still reports matchingAvailable: false (Milestone 4's own still-open
  // deferral, not touched by this change).
  if (
    adapter.componentType !== "pneumatic_cylinder" &&
    adapter.componentType !== "pneumatic_cylinder_guided"
  ) {
    return {
      ...base,
      componentType: adapter.componentType,
      matchingUnavailableReason: NO_CRITERIA_REASON,
    };
  }

  const run = await loadCalculationRun(latestRunId, ownerId);
  if (run === null) {
    return {
      ...base,
      componentType: adapter.componentType,
      matchingUnavailableReason: NO_RUN_REASON,
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
          run.snapshot.computation,
          matchCandidates as PneumaticCylinderMatchCandidate[],
        )
      : evaluateGuidedCylinderCandidates(
          run.snapshot.computation,
          matchCandidates as GuidedCylinderMatchCandidate[],
        );

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
    ...base,
    componentType: adapter.componentType,
    matchingUnavailableReason: null,
    requiredSpec: outcome.requiredSpec,
    matchingAvailable: true,
    accepted,
    rejected,
  };
}
