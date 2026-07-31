// `createMachineAssembly` and `renameMachineAssembly` (Unit 3.2), bundled
// the way stale-propagation.ts bundles its three related use cases.

import "server-only";
import { z } from "zod";
import {
  createAssembly,
  isConfigurationOwnedBy,
  loadAssemblyForOwner,
  renameAssembly,
  type AssemblyId,
  type AssemblyRecord,
  type MachineConfigurationId,
  type UserId,
} from "@/lib/db";

/** Machine-readable classification of an assembly-management failure. */
export type ManageAssemblyErrorCode = "invalid_input" | "unauthorized" | "not_found";

/** A failed assembly-management outcome. */
export interface ManageAssemblyError {
  readonly code: ManageAssemblyErrorCode;
  readonly message: string;
}

const nameSchema = z.string().trim().min(1, "Assembly name is required.").max(200);

function invalidName(): { ok: false; error: ManageAssemblyError } {
  return { ok: false, error: { code: "invalid_input", message: "Assembly name is required." } };
}
function unauthorized(message: string): { ok: false; error: ManageAssemblyError } {
  return { ok: false, error: { code: "unauthorized", message } };
}

/** Input to {@link createMachineAssembly}. Omit `parentId` for a root assembly. */
export interface CreateMachineAssemblyInput {
  readonly configurationId: MachineConfigurationId;
  readonly parentId?: AssemblyId;
  readonly name: string;
}

/** Result of {@link createMachineAssembly}. */
export type CreateMachineAssemblyResult =
  | { readonly ok: true; readonly assembly: AssemblyRecord }
  | { readonly ok: false; readonly error: ManageAssemblyError };

/**
 * Creates an assembly under `input.configurationId` (a root assembly, or
 * nested under `input.parentId`). Cross-checks that a given parent actually
 * belongs to the named configuration — the "target ownership plus
 * configuration membership" rule the 2026-07-30 hardening pass established
 * for every other write (context/progress-tracker.md Architecture
 * Decisions), applied here from this feature's first version rather than
 * needing a later hardening pass of its own.
 */
export async function createMachineAssembly(
  input: CreateMachineAssemblyInput,
  ownerId: UserId,
): Promise<CreateMachineAssemblyResult> {
  const nameResult = nameSchema.safeParse(input.name);
  if (!nameResult.success) {
    return invalidName();
  }

  const configOwned = await isConfigurationOwnedBy(input.configurationId, ownerId);
  if (!configOwned) {
    return unauthorized("Configuration not found or not owned by this user.");
  }

  if (input.parentId !== undefined) {
    const parent = await loadAssemblyForOwner(input.parentId, ownerId);
    if (parent === null) {
      return unauthorized("Parent assembly not found or not owned by this user.");
    }
    if (parent.configurationId !== input.configurationId) {
      return unauthorized("Parent assembly does not belong to the given configuration.");
    }
  }

  const assembly = await createAssembly({
    configurationId: input.configurationId,
    parentId: input.parentId,
    name: nameResult.data,
  });
  return { ok: true, assembly };
}

/** Result of {@link renameMachineAssembly}. */
export type RenameMachineAssemblyResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: ManageAssemblyError };

/** Renames an assembly owned by `ownerId`. */
export async function renameMachineAssembly(
  assemblyId: AssemblyId,
  name: string,
  ownerId: UserId,
): Promise<RenameMachineAssemblyResult> {
  const nameResult = nameSchema.safeParse(name);
  if (!nameResult.success) {
    return invalidName();
  }
  const renamed = await renameAssembly(assemblyId, ownerId, nameResult.data);
  if (!renamed) {
    return {
      ok: false,
      error: { code: "not_found", message: "Assembly not found or not owned by this user." },
    };
  }
  return { ok: true };
}
