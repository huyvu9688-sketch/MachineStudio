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
import { addModuleInstanceAction } from "@/app/(workspace)/workspace/actions";
import { IDLE_ACTION_STATE } from "@/app/(workspace)/workspace/action-state";

export interface ModulePackageOption {
  readonly modulePackageId: string;
  readonly moduleVersion: string;
  readonly category: string;
}

export interface AddModuleInstanceDialogProps {
  readonly assemblyId: string;
  readonly configurationId: string;
  readonly modulePackages: readonly ModulePackageOption[];
  readonly trigger: ReactNode;
}

/**
 * Adds a module instance to an assembly, picked from the real registered
 * module list (`lib/modules`) — never a free-typed id. Unit 3.2.
 */
export function AddModuleInstanceDialog({
  assemblyId,
  configurationId,
  modulePackages,
  trigger,
}: AddModuleInstanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    addModuleInstanceAction,
    IDLE_ACTION_STATE,
  );
  const packageId = useId();
  const labelId = useId();

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
          <input type="hidden" name="assemblyId" value={assemblyId} />
          <input type="hidden" name="configurationId" value={configurationId} />
          <DialogHeader>
            <DialogTitle>Add module instance</DialogTitle>
            <DialogDescription>Pick a registered module package.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor={packageId}>Module package</Label>
              <select
                id={packageId}
                name="modulePackageKey"
                required
                defaultValue=""
                disabled={modulePackages.length === 0}
                className="h-9 rounded-md border border-border-default bg-bg-surface px-3 text-[14px] text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
              >
                <option value="" disabled>
                  {modulePackages.length === 0 ? "No modules registered yet" : "Select a module"}
                </option>
                {modulePackages.map((pkg) => (
                  <option
                    key={`${pkg.modulePackageId}@${pkg.moduleVersion}`}
                    value={`${pkg.modulePackageId}@${pkg.moduleVersion}`}
                  >
                    {pkg.modulePackageId}@{pkg.moduleVersion} ({pkg.category})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={labelId}>Instance label</Label>
              <Input id={labelId} name="label" required maxLength={200} />
            </div>
            {state.status === "error" ? (
              <p role="alert" className="text-[13px]" style={{ color: "var(--state-error)" }}>
                {state.message}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || modulePackages.length === 0}>
              {isPending ? "Adding…" : "Add module"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
