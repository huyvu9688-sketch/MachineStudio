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
import { Label } from "@/components/ui/label";
import { startWorkflowInstanceAction } from "@/app/(workspace)/workspace/actions";
import { IDLE_ACTION_STATE } from "@/app/(workspace)/workspace/action-state";

export interface WorkflowDefinitionOption {
  readonly workflowId: string;
  readonly workflowVersion: string;
  readonly title: string;
}

export interface StartWorkflowInstanceDialogProps {
  readonly projectId: string;
  readonly configurationId: string;
  readonly workflowDefinitions: readonly WorkflowDefinitionOption[];
  readonly trigger: ReactNode;
}

/**
 * Starts a guided workflow instance for the active configuration, picked
 * from the real registered workflow-definition list (`lib/workflows`) —
 * never a free-typed id — mirroring `AddModuleInstanceDialog`'s own
 * registered-list discipline one level up (the workflow definition itself,
 * not a module package). Unit 4.9's generic UI surface: `startWorkflowInstance`
 * only requires the definition to be registered, not any of its own module
 * roles, so every workflow in `lib/workflows` (including `linear-axis@1`)
 * can be started here today even though none of its own seven modules are
 * registered yet.
 */
export function StartWorkflowInstanceDialog({
  projectId,
  configurationId,
  workflowDefinitions,
  trigger,
}: StartWorkflowInstanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    startWorkflowInstanceAction,
    IDLE_ACTION_STATE,
  );
  const workflowId = useId();

  // "Adjusting state during render," not an effect — see rename-dialog.tsx.
  // A successful submit redirects away from this route before this branch
  // would ever re-render with "success", but the dialog still closes itself
  // on an error-to-idle-to-error retry the same way every other dialog here
  // does, for consistency.
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
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="configurationId" value={configurationId} />
          <DialogHeader>
            <DialogTitle>Start guided workflow</DialogTitle>
            <DialogDescription>
              Pick a registered workflow definition.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor={workflowId}>Workflow</Label>
              <select
                id={workflowId}
                name="workflowKey"
                required
                defaultValue=""
                disabled={workflowDefinitions.length === 0}
                className="h-9 rounded-md border border-border-default bg-bg-surface px-3 text-[14px] text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
              >
                <option value="" disabled>
                  {workflowDefinitions.length === 0
                    ? "No workflows registered yet"
                    : "Select a workflow"}
                </option>
                {workflowDefinitions.map((definition) => (
                  <option
                    key={`${definition.workflowId}@${definition.workflowVersion}`}
                    value={`${definition.workflowId}@${definition.workflowVersion}`}
                  >
                    {definition.title} ({definition.workflowId}@
                    {definition.workflowVersion})
                  </option>
                ))}
              </select>
            </div>
            {state.status === "error" ? (
              <p
                role="alert"
                className="text-[13px]"
                style={{ color: "var(--state-error)" }}
              >
                {state.message}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={isPending || workflowDefinitions.length === 0}
            >
              {isPending ? "Starting…" : "Start workflow"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
