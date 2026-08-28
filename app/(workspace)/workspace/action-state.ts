// Shared `useActionState` result shape for the workspace's mutation forms
// (Unit 3.2). A plain module, not "use server" — a "use server" file may
// only export async functions, so this type/constant live here and are
// imported by both actions.ts and the dialog components.

import type { ModulePreviewView } from "@/lib/application";

export interface ActionState {
  readonly status: "idle" | "error" | "success";
  readonly message?: string;
}

export const IDLE_ACTION_STATE: ActionState = { status: "idle" };

/**
 * `previewModuleComputationAction`'s own state shape (module workspace
 * save/run redesign, 2026-08-27) — success carries the fresh, unpersisted
 * computation itself, not just a status, so `ModuleInputWorkspace` can lift
 * it to the sibling `ModuleResultPanel` (via `WorkspaceShell`) without a
 * second round trip.
 */
export type ModulePreviewActionState =
  | { readonly status: "idle" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "success"; readonly preview: ModulePreviewView };

export const IDLE_MODULE_PREVIEW_ACTION_STATE: ModulePreviewActionState = {
  status: "idle",
};
