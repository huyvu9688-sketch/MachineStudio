// Machine baseline snapshot contracts (Unit 2.9 part 1; context/
// architecture.md "lib/configuration/": "Draft configurations, immutable
// baselines, baseline comparison"). Pure types only — no Prisma, no
// persistence. The snapshot builder and repository live in lib/application
// and lib/db (Unit 2.9 part 2).
//
// A `MachineBaseline` freezes "the requirements/assumptions, assembly/module
// tree, parameter values and links, run IDs and package hashes, component
// assignments, BOM, and market/source profile versions in effect at baseline
// creation" (ADR-0002). Every ID here is a plain `string`, deliberately
// decoupled from lib/db's branded ID types — the same generic-and-DB-free
// pattern lib/catalog's matching engine (Unit 2.8 part 1) uses for
// `CandidatePart.id` — so this boundary never imports lib/db (a schema
// change to the persisted row shape must not ripple into the pure snapshot
// contract, and vice versa).
//
// **BOM scope decision**: the implementation map lists "BOM" as part of the
// baseline snapshot, but no `BomItem` model exists yet — BOM generation is
// Milestone 5 (Unit 5.1), not yet built. Per `context/code-standards.md`
// ("no invented behavior"), this snapshot does not fabricate a BOM shape
// ahead of its owning unit. `componentAssignments` — already required
// separately by the implementation map, and explicitly named in
// project-overview.md as "required for BOM generation" — is what a BOM is
// generated *from*; freezing it here is what keeps a future BOM
// reproducible from this baseline. A literal frozen `BomItem[]` is deferred
// to Unit 5.1, which can extend this snapshot (a new format version) once
// that model exists.

import type { EngineeringValue } from "../engine/values";
import type { GraphNodeKind } from "../engine/graph";
import type { LoadCaseCategory } from "../engine/parameters";
import type { CheckStatus } from "../engine/trace";
import type { ManualPartDetails } from "../catalog";

/** Current baseline-snapshot envelope format version. */
export const BASELINE_SNAPSHOT_FORMAT_VERSION = 1 as const;
/** Type of {@link BASELINE_SNAPSHOT_FORMAT_VERSION}. */
export type BaselineSnapshotFormatVersion =
  typeof BASELINE_SNAPSHOT_FORMAT_VERSION;

/** A frozen `AcceptanceCriterion`. */
export interface BaselineAcceptanceCriterion {
  readonly id: string;
  readonly statement: string;
}

/** A frozen `Requirement`, with its acceptance criteria. */
export interface BaselineRequirement {
  readonly id: string;
  /** Null for a machine-level requirement; set for an assembly-scoped one. */
  readonly assemblyId: string | null;
  readonly code: string;
  readonly statement: string;
  readonly acceptanceCriteria: readonly BaselineAcceptanceCriterion[];
}

/** A frozen `DesignAssumption`. */
export interface BaselineDesignAssumption {
  readonly id: string;
  readonly assemblyId: string | null;
  readonly statement: string;
  readonly rationale: string | null;
}

/** A frozen `LoadCase`. */
export interface BaselineLoadCase {
  readonly id: string;
  readonly category: LoadCaseCategory;
  readonly label: string;
  readonly description: string | null;
}

/** A frozen `ModuleInstance`. */
export interface BaselineModuleInstance {
  readonly id: string;
  readonly modulePackageId: string;
  readonly moduleVersion: string;
  readonly label: string;
  readonly workflowInstanceId: string | null;
  /** Null when this module instance has never been run. */
  readonly lastCalculationRunId: string | null;
  readonly lastRunStatus: CheckStatus | null;
}

/** A frozen node in the assembly hierarchy, with its module instances and children. */
export interface BaselineAssemblyNode {
  readonly id: string;
  readonly parentId: string | null;
  readonly name: string;
  readonly moduleInstances: readonly BaselineModuleInstance[];
  readonly children: readonly BaselineAssemblyNode[];
}

/** How an authored `ParameterValue` was supplied (mirrors the persisted enum). */
export type BaselineParameterValueSource = "manual" | "workflow";

/**
 * A frozen `ParameterValue` — the value **currently in effect** at the node it
 * occupies. `ParameterValue` rows are append-only history (Unit 2.2/2.5): the
 * snapshot builder (Unit 2.9 part 2) resolves each node to its latest row
 * before freezing it here, so this is a point-in-time resolved value, not a
 * raw table dump.
 */
export interface BaselineParameterValue {
  readonly id: string;
  readonly assemblyId: string | null;
  readonly moduleInstanceId: string | null;
  readonly nodeKind: GraphNodeKind;
  readonly parameterId: string;
  readonly loadCase: LoadCaseCategory | null;
  readonly source: BaselineParameterValueSource;
  readonly value: EngineeringValue;
}

/** A frozen confirmed `ParameterLink`. */
export interface BaselineParameterLink {
  readonly id: string;
  readonly targetModuleInstanceId: string;
  readonly targetParameterId: string;
  readonly targetLoadCase: LoadCaseCategory | null;
  readonly sourceKind: GraphNodeKind;
  readonly sourceModuleInstanceId: string | null;
  readonly sourceAssemblyId: string | null;
  readonly sourceParameterId: string;
  readonly sourceLoadCase: LoadCaseCategory | null;
}

/**
 * A frozen reference to a module instance's calculation run — "run IDs and
 * package hashes" (implementation map), not the full immutable snapshot
 * (already permanently retrievable by `id` from the run itself, per ADR-0002
 * / invariant "Immutable runs"). `stale` is captured at baseline-creation
 * time so a later comparison can show it changed even though the run row's
 * own `stale` flag may since have flipped again.
 */
export interface BaselineCalculationRunRef {
  readonly id: string;
  readonly moduleInstanceId: string;
  readonly modulePackageId: string;
  readonly moduleVersion: string;
  readonly modulePackageHash: string;
  readonly status: CheckStatus;
  readonly stale: boolean;
}

/** What a frozen `ComponentAssignment` is attached to (mirrors the persisted enum). */
export type BaselineComponentAssignmentTargetKind =
  "module_instance" | "assembly";
/** How a frozen `ComponentAssignment`'s part is identified (mirrors the persisted enum). */
export type BaselineComponentAssignmentPartSource = "catalog" | "manual";

/** A frozen `ComponentAssignment`. */
export interface BaselineComponentAssignment {
  readonly id: string;
  readonly targetKind: BaselineComponentAssignmentTargetKind;
  readonly moduleInstanceId: string | null;
  readonly assemblyId: string | null;
  readonly partSource: BaselineComponentAssignmentPartSource;
  readonly manufacturerPartRevisionId: string | null;
  readonly manualPartDetails: ManualPartDetails | null;
  readonly quantity: number;
  readonly calculationRunId: string | null;
  readonly stale: boolean;
}

/**
 * The full immutable baseline snapshot (context/architecture.md "Calculation
 * Reproducibility" pattern, applied to a whole configuration rather than one
 * module run; ADR-0002 "Immutable calculation runs and baselines"). Everything
 * needed to render the baseline and compare it against another one without
 * re-reading live project state.
 */
export interface MachineBaselineSnapshot {
  readonly snapshotVersion: BaselineSnapshotFormatVersion;
  readonly projectId: string;
  readonly projectName: string;
  readonly configurationId: string;
  readonly configurationName: string;
  /** The project's `marketProfileKey` (e.g. `"US-General-Industrial-Machinery@1"`) in effect at creation. */
  readonly marketProfileKey: string;

  readonly requirements: readonly BaselineRequirement[];
  readonly designAssumptions: readonly BaselineDesignAssumption[];
  readonly loadCases: readonly BaselineLoadCase[];

  /** Root assemblies of the configuration's hierarchy, nested. */
  readonly assemblies: readonly BaselineAssemblyNode[];

  readonly parameterValues: readonly BaselineParameterValue[];
  readonly parameterLinks: readonly BaselineParameterLink[];
  readonly calculationRuns: readonly BaselineCalculationRunRef[];
  readonly componentAssignments: readonly BaselineComponentAssignment[];

  /** ISO timestamp of when the baseline was created. */
  readonly createdAt: string;
  readonly createdByUserId?: string;
}
