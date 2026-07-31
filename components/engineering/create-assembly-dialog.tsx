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
import { createAssemblyAction } from "@/app/(workspace)/workspace/actions";
import { IDLE_ACTION_STATE } from "@/app/(workspace)/workspace/action-state";

export interface CreateAssemblyDialogProps {
  readonly configurationId: string;
  /** Omit to create a root assembly. */
  readonly parentId?: string;
  readonly trigger: ReactNode;
}

/** Creates a root or nested assembly under the active configuration. Unit 3.2. */
export function CreateAssemblyDialog({
  configurationId,
  parentId,
  trigger,
}: CreateAssemblyDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createAssemblyAction, IDLE_ACTION_STATE);
  const nameId = useId();

  // "Adjusting state during render," not an effect — see rename-dialog.tsx.
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
          <input type="hidden" name="configurationId" value={configurationId} />
          {parentId !== undefined ? (
            <input type="hidden" name="parentId" value={parentId} />
          ) : null}
          <DialogHeader>
            <DialogTitle>{parentId !== undefined ? "New sub-assembly" : "New assembly"}</DialogTitle>
            <DialogDescription>Name the assembly.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor={nameId}>Assembly name</Label>
              <Input id={nameId} name="name" required maxLength={200} autoFocus />
            </div>
            {state.status === "error" ? (
              <p role="alert" className="text-[13px]" style={{ color: "var(--state-error)" }}>
                {state.message}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding…" : "Add assembly"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
