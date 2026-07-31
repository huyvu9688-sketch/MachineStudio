// The `loadWorkspaceView` use case (Unit 3.1) — the read-only counterpart to
// Unit 2.1's project-tree repository functions, giving the workspace shell
// (context/ui-context.md "Application Shell") exactly what it needs to
// render: the owner's project list (for the app bar's project selector) plus
// one fully loaded project tree (for the machine navigator). Kept in
// lib/application rather than called directly from app/ so the workspace
// route stays a thin handler (context/code-standards.md "Next.js": "Route
// handlers ... call one application service").
//
// This performs no writes and opens no transaction, unlike every other
// lib/application service so far — the closest existing precedent is
// compareBaselines (lib/application/configurations/compare-baselines.ts),
// also a read-only, ownership-scoped, multi-repository-call service.

import "server-only";
import {
  listProjectsByOwner,
  loadProjectTree,
  type MachineProjectId,
  type MachineProjectRecord,
  type ProjectTree,
  type UserId,
} from "@/lib/db";

/** What the workspace shell needs to render for one authenticated owner. */
export interface WorkspaceView {
  /** Every project owned by the caller, newest first — the selector's list. */
  readonly projects: readonly MachineProjectRecord[];
  /**
   * The active project's full tree, or `null` when the owner has no
   * projects yet (the shell's empty state, not an error).
   */
  readonly selectedProject: ProjectTree | null;
}

/**
 * Loads the workspace view for `ownerId`. `requestedProjectId` selects which
 * project's tree to load; when omitted, not found, or not owned by
 * `ownerId`, this falls back to the first project in `listProjectsByOwner`'s
 * order — the same "unknown deep link falls back to the first item"
 * behavior a stale or hand-edited `?project=` URL parameter should get,
 * rather than surfacing a dedicated error state for it.
 */
export async function loadWorkspaceView(
  ownerId: UserId,
  requestedProjectId?: MachineProjectId,
): Promise<WorkspaceView> {
  const projects = await listProjectsByOwner(ownerId);
  if (projects.length === 0) {
    return { projects, selectedProject: null };
  }

  const requested =
    requestedProjectId !== undefined
      ? await loadProjectTree(requestedProjectId, ownerId)
      : null;
  const selectedProject = requested ?? (await loadProjectTree(projects[0].id, ownerId));

  return { projects, selectedProject };
}
