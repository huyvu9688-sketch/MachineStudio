"use client";

import { useId, useState, type ReactNode } from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";
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
import { createProjectAction } from "@/app/(workspace)/workspace/actions";
import { IDLE_ACTION_STATE } from "@/app/(workspace)/workspace/action-state";

export interface MarketProfileOption {
  readonly key: string;
  readonly displayName: string;
}

export interface CreateProjectDialogProps {
  readonly marketProfiles: readonly MarketProfileOption[];
  /** Custom trigger element; defaults to a "New project" button. */
  readonly trigger?: ReactNode;
}

/**
 * Creates a machine project (with its initial configuration) and, on
 * success, navigates to it — `createProjectAction` redirects rather than
 * returning a success state, so there is no explicit close-on-success
 * handling here (the navigation unmounts this dialog along with the rest of
 * the page). Unit 3.2.
 */
export function CreateProjectDialog({ marketProfiles, trigger }: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createProjectAction, IDLE_ACTION_STATE);
  const nameId = useId();
  const profileId = useId();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button">
            <Plus aria-hidden="true" className="h-4 w-4" />
            New project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>New machine project</DialogTitle>
            <DialogDescription>
              Starts with one working configuration you can build an assembly tree in.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor={nameId}>Project name</Label>
              <Input id={nameId} name="name" required maxLength={200} autoFocus />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={profileId}>Market profile</Label>
              <select
                id={profileId}
                name="marketProfileKey"
                required
                defaultValue=""
                className="h-9 rounded-md border border-border-default bg-bg-surface px-3 text-[14px] text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
              >
                <option value="" disabled>
                  Select a market profile
                </option>
                {marketProfiles.map((profile) => (
                  <option key={profile.key} value={profile.key}>
                    {profile.displayName}
                  </option>
                ))}
              </select>
            </div>
            {state.status === "error" ? (
              <p role="alert" className="text-[13px]" style={{ color: "var(--state-error)" }}>
                {state.message}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
