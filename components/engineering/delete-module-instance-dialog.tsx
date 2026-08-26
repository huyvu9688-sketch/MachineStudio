"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
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
import {
  deleteModuleInstanceAction,
  previewDeleteModuleInstanceImpactAction,
} from "@/app/(workspace)/workspace/actions";
import { IDLE_ACTION_STATE } from "@/app/(workspace)/workspace/action-state";

export interface DeleteModuleInstanceDialogProps {
  readonly moduleInstanceId: string;
  readonly moduleInstanceLabel: string;
  readonly trigger: ReactNode;
}

type ImpactPreviewState =
  | { readonly status: "loading" }
  | {
      readonly status: "loaded";
      readonly dependentModuleInstanceLabels: readonly string[];
      readonly attachedToWorkflow: boolean;
    }
  | { readonly status: "error"; readonly message: string };

/**
 * Permanently deletes a module instance — its saved values, parameter
 * links, calculation run history, and component assignments are all gone,
 * unlike `ArchiveModuleInstanceDialog`'s reversible hide. Shows what would
 * be broken (dependent links, a filled workflow role) before the founder
 * confirms, reusing the same impact-preview shape archiving already showed,
 * since the underlying question — "what else touches this instance?" — is
 * the same; the difference is what happens to it.
 */
export function DeleteModuleInstanceDialog({
  moduleInstanceId,
  moduleInstanceLabel,
  trigger,
}: DeleteModuleInstanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ImpactPreviewState>({
    status: "loading",
  });
  const [state, formAction, isPending] = useActionState(
    deleteModuleInstanceAction,
    IDLE_ACTION_STATE,
  );

  const [seenStatus, setSeenStatus] = useState(state.status);
  if (state.status !== seenStatus) {
    setSeenStatus(state.status);
    if (state.status === "success") {
      setOpen(false);
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    void previewDeleteModuleInstanceImpactAction(moduleInstanceId).then(
      (result) => {
        if (cancelled) {
          return;
        }
        if (!result.ok) {
          setPreview({ status: "error", message: result.message });
          return;
        }
        setPreview({
          status: "loaded",
          dependentModuleInstanceLabels: result.dependentModuleInstanceLabels,
          attachedToWorkflow: result.attachedToWorkflow,
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, moduleInstanceId]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setPreview({ status: "loading" });
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <input
            type="hidden"
            name="moduleInstanceId"
            value={moduleInstanceId}
          />
          <DialogHeader>
            <DialogTitle>Delete &quot;{moduleInstanceLabel}&quot;</DialogTitle>
            <DialogDescription>
              This permanently deletes the module instance — its saved
              values, links, and calculation run history. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-4 text-[13px] text-text-primary">
            {preview.status === "loading" ? (
              <p className="text-text-muted">
                Checking what depends on this module…
              </p>
            ) : preview.status === "error" ? (
              <p role="alert" style={{ color: "var(--state-error)" }}>
                {preview.message}
              </p>
            ) : (
              <>
                {preview.dependentModuleInstanceLabels.length > 0 ? (
                  <p role="alert" style={{ color: "var(--state-error)" }}>
                    {preview.dependentModuleInstanceLabels.length} other
                    module
                    {preview.dependentModuleInstanceLabels.length === 1
                      ? ""
                      : "s"}{" "}
                    still link
                    {preview.dependentModuleInstanceLabels.length === 1
                      ? "s"
                      : ""}{" "}
                    from this one&apos;s outputs:{" "}
                    {preview.dependentModuleInstanceLabels.join(", ")}. Those
                    links will break.
                  </p>
                ) : (
                  <p className="text-text-muted">
                    No other module links from this one&apos;s outputs.
                  </p>
                )}
                {preview.attachedToWorkflow ? (
                  <p role="alert" style={{ color: "var(--state-error)" }}>
                    This module fills a role in an active workflow. Deleting
                    it leaves that role unfilled.
                  </p>
                ) : null}
              </>
            )}
            {state.status === "error" ? (
              <p role="alert" style={{ color: "var(--state-error)" }}>
                {state.message}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              variant="outline"
              disabled={isPending}
              style={{ color: "var(--state-error)" }}
            >
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
