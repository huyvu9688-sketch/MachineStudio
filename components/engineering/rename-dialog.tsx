"use client";

import { useActionState, useId, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IDLE_ACTION_STATE } from "@/app/(workspace)/workspace/action-state";
import type { ActionState } from "@/app/(workspace)/workspace/action-state";

export interface RenameDialogProps {
  readonly title: string;
  readonly action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  /** The hidden form field name the action reads the target id from. */
  readonly idFieldName: string;
  readonly idValue: string;
  readonly currentName: string;
  readonly trigger: ReactNode;
}

/**
 * Rename dialog reused for both a project and an assembly (Unit 3.2) — the
 * two are literally the same shape (one name field, one hidden id, one
 * Server Action), not merely similar, so one shared component is the
 * simpler choice, not a premature abstraction
 * (context/code-standards.md "General": "Prefer explicit duplication over
 * premature abstraction").
 */
export function RenameDialog({
  title,
  action,
  idFieldName,
  idValue,
  currentName,
  trigger,
}: RenameDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(action, IDLE_ACTION_STATE);
  const nameId = useId();

  // "Adjusting state during render" (React's documented alternative to an
  // effect for this exact case, https://react.dev/learn/you-might-not-need-an-effect):
  // closing the dialog in response to a state transition, not as a side
  // effect with its own lifecycle. Avoids the extra render pass an
  // effect-based setState would cause.
  const [seenStatus, setSeenStatus] = useState(state.status);
  if (state.status !== seenStatus) {
    setSeenStatus(state.status);
    if (state.status === "success") {
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <input type="hidden" name={idFieldName} value={idValue} />
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Choose a new name.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor={nameId}>Name</Label>
              <Input
                id={nameId}
                name="name"
                required
                maxLength={200}
                defaultValue={currentName}
                autoFocus
              />
            </div>
            {state.status === "error" ? (
              <p role="alert" className="text-[13px]" style={{ color: "var(--state-error)" }}>
                {state.message}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
