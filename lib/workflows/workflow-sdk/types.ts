// Generic guided-workflow contract (Unit 4.8). A `WorkflowDefinition`
// coordinates a set of compatible calculation modules without combining their
// compute logic (context/architecture.md "lib/workflows/"): it declares
// required/optional module roles, a module sequence, initial parameter-link
// proposal rules, completion rules, workflow-level checks, and
// candidate-system-comparison criteria. `./linear-axis/1.0.0/definition.ts` is
// the first concrete definition; this file is the reusable shape every future
// workflow follows (context/adr/0007-workflow-definition-contract.md).
//
// Every function operating on a WorkflowDefinition (./links, ./completion,
// ./checks, ./comparison, ./status) is pure and deterministic: no I/O, and no
// import from lib/db, lib/application, lib/catalog, app, or components — the
// same engine-purity boundary lib/modules already holds itself to
// (context/code-standards.md "General"). None of these functions look up a
// module package themselves; the caller (today: a test fixture; eventually:
// the application layer) supplies each present role instance's real
// `ModulePorts` and resolved values, the same way a module's own `compute`
// never fetches its own input.

import type {
  EngineeringValue,
  LoadCaseCategory,
  ModuleComputation,
  ModulePorts,
  ParameterId,
} from "@/lib/engine";

/** Stable identity and human-facing metadata for a workflow definition. */
export interface WorkflowManifest {
  /** Stable workflow ID, e.g. `"linear-axis"`. Non-empty. */
  readonly id: string;
  /** Semantic version of this workflow definition, e.g. `"1.0.0"`. */
  readonly version: string;
  /** Human display title. Non-empty. */
  readonly title: string;
  /** Human summary of what the workflow guides an engineer through. */
  readonly description: string;
}

/**
 * How many instances of a role a complete workflow instance needs.
 * `max` absent means unbounded.
 */
export interface WorkflowRoleCardinality {
  readonly min: number;
  readonly max?: number;
}

/**
 * One role a module instance can fill in the workflow, e.g.
 * `"linear-axis.screw"`. `moduleIds` is the set of module IDs that may fill
 * this role (context/architecture.md "lib/workflows/": a workflow declares
 * "Required and optional module IDs") — not a category match, so a future
 * alternative implementation of the same role must be added here explicitly
 * rather than matched implicitly.
 */
export interface WorkflowModuleRole {
  /** Stable role ID, e.g. `"linear-axis.screw"`. Non-empty. */
  readonly id: string;
  /** Human display label. Non-empty. */
  readonly label: string;
  /** Module IDs that may fill this role. Non-empty. */
  readonly moduleIds: readonly string[];
  readonly cardinality: WorkflowRoleCardinality;
}

/**
 * A concrete module instance filling a role, supplied by the caller — this
 * SDK never looks a module package up itself (see file header).
 */
export interface WorkflowRoleInstance {
  /** Stable instance ID, unique within the workflow instance. */
  readonly instanceId: string;
  /** The {@link WorkflowModuleRole.id} this instance fills. */
  readonly roleId: string;
  /** The module ID actually filling the role (must be in the role's `moduleIds`). */
  readonly moduleId: string;
  /** The instance's real declared ports (from its `ModulePackage.ports`). */
  readonly ports: ModulePorts;
}

/**
 * A role instance's resolved runtime state: its input values and, once run,
 * its computation. Extends {@link WorkflowRoleInstance} because every
 * completion/check/comparison function needs the port shape too (to map a
 * canonical parameter ID back to a port key).
 */
export interface WorkflowInstanceContext extends WorkflowRoleInstance {
  /** Resolved input values, keyed by input port key (mirrors `ModuleInput.values`). */
  readonly inputValues: Readonly<Record<string, EngineeringValue>>;
  /** The instance's computation result, once it has been run. */
  readonly computation?: ModuleComputation;
}

/**
 * Declares that a canonical parameter output by `fromRoleId` may feed the
 * identically-named input on `toRoleId`. Resolution against real ports and
 * the real link-compatibility evaluator happens in `./links`
 * (`resolveLinkProposals`) — this rule never names a port key directly,
 * satisfying the Unit 4.8 gate ("no hardcoded database field-to-field
 * wiring"). One rule can resolve to several concrete proposals (e.g. once per
 * load case, or once per role instance when a role has more than one).
 */
export interface WorkflowLinkProposalRule {
  /** Stable rule ID. Non-empty. */
  readonly id: string;
  readonly parameterId: ParameterId;
  readonly fromRoleId: string;
  readonly toRoleId: string;
  /** Optional human note on why this link exists. */
  readonly note?: string;
}

/** One concrete link proposal resolved from a {@link WorkflowLinkProposalRule}. */
export interface WorkflowLinkProposal {
  readonly ruleId: string;
  readonly fromInstanceId: string;
  readonly fromPortKey: string;
  readonly toInstanceId: string;
  readonly toPortKey: string;
  readonly parameterId: ParameterId;
  readonly loadCase?: LoadCaseCategory;
}

/**
 * A rule gating when a workflow instance may reach `"completed"` status
 * (`./completion`, `evaluateCompletion`). A discriminated union so each kind
 * carries only the data it needs:
 *
 * - `role_cardinality` — the named role's present instance count satisfies
 *   its declared {@link WorkflowRoleCardinality}.
 * - `link_confirmed` — every proposal a {@link WorkflowLinkProposalRule}
 *   resolves to (for the present instances) has been confirmed.
 * - `no_failing_checks` — none of the named roles' present instances has a
 *   `CheckResult` with `status === "fail"`.
 * - `conditional_acknowledgment` — when the named role's resolved value at
 *   `parameterId` equals `whenValue` (an enum option key), a recorded
 *   `Assumption` with `id === acknowledgmentId` must be present. Reuses the
 *   existing `Assumption` shape (`lib/engine/module-sdk/types.ts`) rather
 *   than inventing a new record —
 *   this is how `linear-axis@1` gates the vertical-holding design response
 *   (context/implementation-map.md Unit 4.8 "Cross-Module Checks"), since no
 *   parameter in this project's registry represents a required holding
 *   torque to check numerically.
 */
export type CompletionRule =
  | {
      readonly kind: "role_cardinality";
      readonly id: string;
      readonly roleId: string;
    }
  | {
      readonly kind: "link_confirmed";
      readonly id: string;
      readonly ruleId: string;
    }
  | {
      readonly kind: "no_failing_checks";
      readonly id: string;
      readonly roleIds: readonly string[];
    }
  | {
      readonly kind: "conditional_acknowledgment";
      readonly id: string;
      readonly roleId: string;
      readonly parameterId: ParameterId;
      readonly whenValue: string;
      readonly acknowledgmentId: string;
    };

/**
 * A workflow-level structural check (`./checks`, `evaluateWorkflowChecks`) —
 * distinct from a module's own `checks.ts`, which only ever sees its own
 * inputs. `shared_value_topology` is the one kind this pass implements: it
 * asserts that every named role's input port for `parameterId` resolves,
 * through a confirmed `GraphLink`, to the *same* source node — guarding
 * against two roles independently entering values for a parameter that
 * should be single-sourced (e.g. `screw.lead`, shared by four roles with no
 * producing module — see `context/adr/0007-workflow-definition-contract.md`).
 * Reusing `CheckResult`'s existing pass/fail/warning semantics rather than
 * inventing a new result shape.
 */
export type WorkflowCheckRule = {
  readonly kind: "shared_value_topology";
  readonly id: string;
  readonly parameterId: ParameterId;
  readonly roleIds: readonly string[];
};

/** One criterion in a candidate-system comparison. */
export interface CandidateComparisonCriterion {
  readonly id: string;
  readonly roleId: string;
  readonly parameterId: ParameterId;
  readonly loadCase?: LoadCaseCategory;
  readonly direction: "higher_is_better" | "lower_is_better";
}

/**
 * A workflow instance's lifecycle status. Mirrors
 * `prisma/schema.prisma`'s `WorkflowInstanceStatus` enum exactly — kept in
 * lockstep the same way that schema already keeps `LoadCaseCategory` in
 * lockstep with its own engine-side type.
 */
export type WorkflowStatus = "draft" | "active" | "completed" | "abandoned";

/**
 * A complete guided-workflow definition (context/architecture.md
 * "lib/workflows/"). `sequence` is authored explicitly (the architecture
 * doc's own literal "Module sequence" wording), but
 * `linear-axis/1.0.0/definition.test.ts` asserts it stays consistent with the
 * dependency edges `linkRules` implies, so the two data sources cannot
 * silently diverge.
 */
export interface WorkflowDefinition {
  readonly manifest: WorkflowManifest;
  readonly roles: readonly WorkflowModuleRole[];
  /** Ordered dependency levels of role IDs; role IDs in one level have no dependency on each other. */
  readonly sequence: readonly (readonly string[])[];
  readonly linkRules: readonly WorkflowLinkProposalRule[];
  readonly completionRules: readonly CompletionRule[];
  readonly checkRules: readonly WorkflowCheckRule[];
  readonly comparisonCriteria: readonly CandidateComparisonCriterion[];
}
