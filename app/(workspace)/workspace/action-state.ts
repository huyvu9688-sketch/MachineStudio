// Shared `useActionState` result shape for the workspace's mutation forms
// (Unit 3.2). A plain module, not "use server" — a "use server" file may
// only export async functions, so this type/constant live here and are
// imported by both actions.ts and the dialog components.

export interface ActionState {
  readonly status: "idle" | "error" | "success";
  readonly message?: string;
}

export const IDLE_ACTION_STATE: ActionState = { status: "idle" };
