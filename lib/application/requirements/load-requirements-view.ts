// The `loadRequirementsView` use case (Unit 3.7) — the read model the
// requirements, assumptions, and load-case UI needs (context/
// implementation-map.md Unit 3.7: "Requirement editor", "Acceptance
// criteria", "Load-case table", "Assumption register", "Verification
// status"; exit criterion: "Axis design intent is stored before downstream
// modules are run").
//
// Performs no writes, like `loadModuleResultView` (Unit 3.5) and
// `loadComponentAssignmentView` (Unit 3.6). Composes `loadConfigurationForOwner`
// (authorization) with `listRequirements`/`listDesignAssumptions`/
// `listLoadCases` (Unit 2.2), unchanged.
//
// WHY "VERIFICATION STATUS" IS ONLY "ACCEPTANCE CRITERIA DEFINED OR NOT"
//
// context/architecture.md's domain model names a `VerificationLink` class
// under "Design intent" — linking a requirement to the calculation run that
// actually demonstrates it — but Unit 2.2 never built it (its own
// deliverable list in implementation-map.md names Requirement,
// AcceptanceCriterion, DesignAssumption, LoadCase, ParameterValue, and
// ParameterLink only), and Milestone 5's "Requirements verification matrix"
// (Unit 5.3) is the roadmap unit that actually needs a real requirement-to-
// run link. Adding that model now would combine a Prisma schema change with
// a UI unit — exactly what ai-workflow-rules.md's Split Rule forbids — and
// deciding *which* run or check satisfies *which* requirement is real
// engineering judgment no released contract records, the same shape of
// problem Unit 3.6 hit with `CatalogAdapter.requiredSpec()` and the missing
// `MatchCriterion` operator.
//
// So this unit reports only what it can honestly compute from data that
// already exists: whether a requirement has at least one recorded acceptance
// criterion. That is authoring completeness, not verification against a
// calculation result, and the UI states the distinction plainly rather than
// implying a requirement is "verified" when nothing has actually checked it
// yet (context/code-standards.md "Standards and Sources": "Do not label a
// result generally compliant" — the same non-overclaim posture, applied
// here to a requirement's status rather than a standards check).

import "server-only";
import {
  listDesignAssumptions,
  listLoadCases,
  listRequirements,
  loadConfigurationForOwner,
  type AcceptanceCriterionRecord,
  type AssemblyId,
  type DesignAssumptionRecord,
  type LoadCaseRecord,
  type MachineConfigurationId,
  type RequirementId,
  type UserId,
} from "@/lib/db";

/**
 * Whether a requirement has at least one recorded acceptance criterion.
 * Deliberately not "verified"/"unverified" — no calculation run is
 * consulted here (see this file's header).
 */
export type RequirementVerificationStatus =
  "criteria_defined" | "no_criteria_yet";

/** One requirement, its acceptance criteria, and its authoring-completeness status. */
export interface RequirementView {
  readonly id: RequirementId;
  readonly configurationId: MachineConfigurationId;
  readonly assemblyId: AssemblyId | null;
  readonly code: string;
  readonly statement: string;
  readonly acceptanceCriteria: readonly AcceptanceCriterionRecord[];
  readonly verificationStatus: RequirementVerificationStatus;
  readonly createdAt: Date;
}

/** What the requirements, assumptions, and load-case UI needs for one configuration. */
export interface RequirementsView {
  readonly configurationId: MachineConfigurationId;
  readonly requirements: readonly RequirementView[];
  readonly designAssumptions: readonly DesignAssumptionRecord[];
  readonly loadCases: readonly LoadCaseRecord[];
}

/**
 * Loads the requirements/assumptions/load-case read model for
 * `configurationId`, scoped to `ownerId`. Returns `null` when the
 * configuration does not exist or is not owned by `ownerId` — the same
 * "nothing real to render" outcome `loadComponentAssignmentView` returns
 * for an unknown/foreign deep link. An owned configuration with nothing
 * recorded yet is a normal render (every list empty), not an error.
 */
export async function loadRequirementsView(
  configurationId: MachineConfigurationId,
  ownerId: UserId,
): Promise<RequirementsView | null> {
  const context = await loadConfigurationForOwner(configurationId, ownerId);
  if (context === null) {
    return null;
  }

  const [requirementNodes, designAssumptions, loadCases] = await Promise.all([
    listRequirements(configurationId, ownerId),
    listDesignAssumptions(configurationId, ownerId),
    listLoadCases(configurationId, ownerId),
  ]);

  const requirements: RequirementView[] = requirementNodes.map((node) => ({
    id: node.id,
    configurationId: node.configurationId,
    assemblyId: node.assemblyId,
    code: node.code,
    statement: node.statement,
    acceptanceCriteria: node.acceptanceCriteria,
    verificationStatus:
      node.acceptanceCriteria.length > 0
        ? "criteria_defined"
        : "no_criteria_yet",
    createdAt: node.createdAt,
  }));

  return { configurationId, requirements, designAssumptions, loadCases };
}
