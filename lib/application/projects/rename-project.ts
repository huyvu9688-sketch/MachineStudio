// The `renameMachineProject` use case (Unit 3.2).

import "server-only";
import { z } from "zod";
import { renameProject, type MachineProjectId, type UserId } from "@/lib/db";

/** Machine-readable classification of a {@link renameMachineProject} failure. */
export type RenameMachineProjectErrorCode = "invalid_input" | "not_found";

/** A failed {@link renameMachineProject} outcome. */
export interface RenameMachineProjectError {
  readonly code: RenameMachineProjectErrorCode;
  readonly message: string;
}

/** Result of {@link renameMachineProject}. */
export type RenameMachineProjectResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: RenameMachineProjectError };

const nameSchema = z.string().trim().min(1, "Project name is required.").max(200);

/**
 * Renames a project owned by `ownerId`. `not_found` covers both an unknown
 * id and a real id owned by someone else — the same uniform-null-on-either-
 * case reasoning `loadModuleInstanceForOwner` documents, applied to a write.
 */
export async function renameMachineProject(
  projectId: MachineProjectId,
  name: string,
  ownerId: UserId,
): Promise<RenameMachineProjectResult> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "invalid_input", message: parsed.error.issues[0]?.message ?? "Invalid name." },
    };
  }

  const renamed = await renameProject(projectId, ownerId, parsed.data);
  if (!renamed) {
    return {
      ok: false,
      error: { code: "not_found", message: "Project not found or not owned by this user." },
    };
  }
  return { ok: true };
}
