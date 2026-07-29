// Domain-facing contracts for the requirements repository (Unit 2.2):
// Requirement, AcceptanceCriterion, DesignAssumption, and LoadCase — the
// design-intent side of the schema (context/architecture.md "Design intent").
//
// Branded ID aliases mirror the project-hierarchy types (Unit 2.1) so the
// application layer keeps identifiers distinct at compile time. `LoadCase`
// reuses the engine's `LoadCaseCategory` (Unit 1.3) so persisted load cases
// speak exactly the categories the parameter registry validates.

import type { LoadCaseCategory } from "../../engine/parameters";
import type { AssemblyId, MachineConfigurationId } from "./types";

/** A `Requirement` ID. */
export type RequirementId = string & { readonly __brand: "RequirementId" };
/** An `AcceptanceCriterion` ID. */
export type AcceptanceCriterionId = string & {
  readonly __brand: "AcceptanceCriterionId";
};
/** A `DesignAssumption` ID. */
export type DesignAssumptionId = string & {
  readonly __brand: "DesignAssumptionId";
};
/** A `LoadCase` ID. */
export type LoadCaseId = string & { readonly __brand: "LoadCaseId" };

/** Casts a raw string to a {@link RequirementId}. Identity at runtime. */
export function asRequirementId(id: string): RequirementId {
  return id as RequirementId;
}
/** Casts a raw string to an {@link AcceptanceCriterionId}. Identity at runtime. */
export function asAcceptanceCriterionId(id: string): AcceptanceCriterionId {
  return id as AcceptanceCriterionId;
}
/** Casts a raw string to a {@link DesignAssumptionId}. Identity at runtime. */
export function asDesignAssumptionId(id: string): DesignAssumptionId {
  return id as DesignAssumptionId;
}
/** Casts a raw string to a {@link LoadCaseId}. Identity at runtime. */
export function asLoadCaseId(id: string): LoadCaseId {
  return id as LoadCaseId;
}

// --- Records -------------------------------------------------------------

/** A persisted `Requirement` row (without its acceptance criteria). */
export interface RequirementRecord {
  readonly id: RequirementId;
  readonly configurationId: MachineConfigurationId;
  /** Null for a machine-level requirement; set for an assembly-scoped one. */
  readonly assemblyId: AssemblyId | null;
  readonly code: string;
  readonly statement: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** A persisted `AcceptanceCriterion` row. */
export interface AcceptanceCriterionRecord {
  readonly id: AcceptanceCriterionId;
  readonly requirementId: RequirementId;
  readonly statement: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** A requirement with its acceptance criteria, as returned by `listRequirements`. */
export interface RequirementNode extends RequirementRecord {
  readonly acceptanceCriteria: readonly AcceptanceCriterionRecord[];
}

/** A persisted `DesignAssumption` row. */
export interface DesignAssumptionRecord {
  readonly id: DesignAssumptionId;
  readonly configurationId: MachineConfigurationId;
  readonly assemblyId: AssemblyId | null;
  readonly statement: string;
  readonly rationale: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** A persisted `LoadCase` row. */
export interface LoadCaseRecord {
  readonly id: LoadCaseId;
  readonly configurationId: MachineConfigurationId;
  readonly category: LoadCaseCategory;
  readonly label: string;
  readonly description: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// --- Create inputs -------------------------------------------------------

/** Input to create a `Requirement`. Omit `assemblyId` for a machine-level one. */
export interface CreateRequirementInput {
  readonly configurationId: MachineConfigurationId;
  readonly assemblyId?: AssemblyId;
  readonly code: string;
  readonly statement: string;
}

/** Input to create an `AcceptanceCriterion`. */
export interface CreateAcceptanceCriterionInput {
  readonly requirementId: RequirementId;
  readonly statement: string;
}

/** Input to create a `DesignAssumption`. Omit `assemblyId` for machine-level. */
export interface CreateDesignAssumptionInput {
  readonly configurationId: MachineConfigurationId;
  readonly assemblyId?: AssemblyId;
  readonly statement: string;
  readonly rationale?: string;
}

/** Input to create a `LoadCase`. */
export interface CreateLoadCaseInput {
  readonly configurationId: MachineConfigurationId;
  readonly category: LoadCaseCategory;
  readonly label: string;
  readonly description?: string;
}
