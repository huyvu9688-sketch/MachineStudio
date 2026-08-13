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
  archiveModuleInstanceAction,
  previewArchiveModuleInstanceImpactAction,
} from "@/app/(workspace)/workspace/actions";
import { IDLE_ACTION_STATE } from "@/app/(workspace)/workspace/action-state";

export interface ArchiveModuleInstanceDialogProps {
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
 * Archives (hides, never deletes) a module instance
 * (docs/superpowers/specs/2026-08-13-module-instance-management-design.md).
 * Shows what still links from this instance's outputs and whether it fills
 * a workflow role before the founder confirms — unlike parameter-link
 * removal's own impact preview, archiving deletes nothing, so this is a
 * "what depends on this" notice, not a stale-impact warning.
 */
export function ArchiveModuleInstanceDialog({
  moduleInstanceId,
  moduleInstanceLabel,
  trigger,
}: ArchiveModuleInstanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ImpactPreviewState>({
    status: "loading",
  });
  const [state, formAction, isPending] = useActionState(
    archiveModuleInstanceAction,
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
    void previewArchiveModuleInstanceImpactAction(moduleInstanceId).then(
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
            <DialogTitle>Archive &quot;{moduleInstanceLabel}&quot;</DialogTitle>
            <DialogDescription>
              Archiving hides this module from the navigator. Nothing is deleted
              — its saved values, links, and run history stay exactly as they
              are.
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
                  <p>
                    {preview.dependentModuleInstanceLabels.length} other module
                    {preview.dependentModuleInstanceLabels.length === 1
                      ? ""
                      : "s"}{" "}
                    still link
                    {preview.dependentModuleInstanceLabels.length === 1
                      ? "s"
                      : ""}{" "}
                    from this one&apos;s outputs:{" "}
                    {preview.dependentModuleInstanceLabels.join(", ")}. Those
                    links keep working; they just won&apos;t offer this module
                    as a link source for anything new.
                  </p>
                ) : (
                  <p className="text-text-muted">
                    No other module links from this one&apos;s outputs.
                  </p>
                )}
                {preview.attachedToWorkflow ? (
                  <p>
                    This module fills a role in an active workflow. Archiving it
                    leaves that role unfilled.
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
            <Button type="submit" variant="outline" disabled={isPending}>
              {isPending ? "Archiving…" : "Archive"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
