// `createMachineRequirement` and `createRequirementAcceptanceCriterion`
// (Unit 3.7), bundled the way manage-assemblies.ts bundles its two related
// use cases for one entity family.
//
// Both apply the "target ownership plus configuration membership" rule the
// 2026-07-30 hardening pass established for every write (context/
// progress-tracker.md Architecture Decisions), matching createMachineAssembly
// from the feature's first version rather than needing a later pass of its
// own: a requirement's optional `assemblyId` must belong to the same
// configuration, and an acceptance criterion's target requirement must be
// owned by the caller.

import "server-only";
import { z } from "zod";
import {
  createAcceptanceCriterion,
  createRequirement,
  isConfigurationOwnedBy,
  loadAssemblyForOwner,
  loadRequirementForOwner,
  type AcceptanceCriterionRecord,
  type AssemblyId,
  type MachineConfigurationId,
  type RequirementId,
  type RequirementRecord,
  type UserId,
} from "@/lib/db";

/** Machine-readable classification of a requirements-management failure. */
export type ManageRequirementsErrorCode = "invalid_input" | "unauthorized";

/** A failed requirements-management outcome. */
export interface ManageRequirementsError {
  readonly code: ManageRequirementsErrorCode;
  readonly message: string;
}

const codeSchema = z.string().trim().min(1, "A requirement code is required.").max(40);
const statementSchema = z.string().trim().min(1, "A statement is required.").max(2000);

function invalid(message: string): { ok: false; error: ManageRequirementsError } {
  return { ok: false, error: { code: "invalid_input", message } };
}
function unauthorized(message: string): { ok: false; error: ManageRequirementsError } {
  return { ok: false, error: { code: "unauthorized", message } };
}

/** Input to {@link createMachineRequirement}. Omit `assemblyId` for a machine-level requirement. */
export interface CreateMachineRequirementInput {
  readonly configurationId: MachineConfigurationId;
  readonly assemblyId?: AssemblyId;
  readonly code: string;
  readonly statement: string;
}

/** Result of {@link createMachineRequirement}. */
export type CreateMachineRequirementResult =
  | { readonly ok: true; readonly requirement: RequirementRecord }
  | { readonly ok: false; readonly error: ManageRequirementsError };

/**
 * Records a requirement (machine-level, or scoped to `input.assemblyId`
 * within the same configuration) — the "Requirement editor" deliverable
 * (context/implementation-map.md Unit 3.7).
 */
export async function createMachineRequirement(
  input: CreateMachineRequirementInput,
  ownerId: UserId,
): Promise<CreateMachineRequirementResult> {
  const codeResult = codeSchema.safeParse(input.code);
  if (!codeResult.success) {
    return invalid(codeResult.error.issues[0]?.message ?? "Invalid requirement code.");
  }
  const statementResult = statementSchema.safeParse(input.statement);
  if (!statementResult.success) {
    return invalid(statementResult.error.issues[0]?.message ?? "Invalid statement.");
  }

  const configOwned = await isConfigurationOwnedBy(input.configurationId, ownerId);
  if (!configOwned) {
    return unauthorized("Configuration not found or not owned by this user.");
  }

  if (input.assemblyId !== undefined) {
    const assembly = await loadAssemblyForOwner(input.assemblyId, ownerId);
    if (assembly === null) {
      return unauthorized("Assembly not found or not owned by this user.");
    }
    if (assembly.configurationId !== input.configurationId) {
      return unauthorized("Assembly does not belong to the given configuration.");
    }
  }

  const requirement = await createRequirement({
    configurationId: input.configurationId,
    assemblyId: input.assemblyId,
    code: codeResult.data,
    statement: statementResult.data,
  });
  return { ok: true, requirement };
}

/** Input to {@link createRequirementAcceptanceCriterion}. */
export interface CreateRequirementAcceptanceCriterionInput {
  readonly requirementId: RequirementId;
  readonly statement: string;
}

/** Result of {@link createRequirementAcceptanceCriterion}. */
export type CreateRequirementAcceptanceCriterionResult =
  | { readonly ok: true; readonly acceptanceCriterion: AcceptanceCriterionRecord }
  | { readonly ok: false; readonly error: ManageRequirementsError };

/**
 * Adds a testable acceptance criterion to an owned requirement — the
 * "Acceptance criteria" deliverable. `loadRequirementForOwner` is this
 * unit's one new `lib/db` read (no schema change), the same "one new
 * repository function, no migration" shape Unit 3.6 used for
 * `listComponentAssignmentsForModuleInstance`.
 */
export async function createRequirementAcceptanceCriterion(
  input: CreateRequirementAcceptanceCriterionInput,
  ownerId: UserId,
): Promise<CreateRequirementAcceptanceCriterionResult> {
  const statementResult = statementSchema.safeParse(input.statement);
  if (!statementResult.success) {
    return invalid(statementResult.error.issues[0]?.message ?? "Invalid statement.");
  }

  const requirement = await loadRequirementForOwner(input.requirementId, ownerId);
  if (requirement === null) {
    return unauthorized("Requirement not found or not owned by this user.");
  }

  const acceptanceCriterion = await createAcceptanceCriterion({
    requirementId: input.requirementId,
    statement: statementResult.data,
  });
  return { ok: true, acceptanceCriterion };
}
