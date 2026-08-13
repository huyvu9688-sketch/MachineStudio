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
import { Separator } from "@/components/ui/separator";
import { deleteAccountAction } from "@/app/(workspace)/workspace/actions";
import { IDLE_ACTION_STATE } from "@/app/(workspace)/workspace/action-state";

// Duplicated from lib/application/account/delete-account.ts's own
// DELETE_ACCOUNT_CONFIRMATION_PHRASE — that module carries "server-only"
// (transitively, via lib/application's barrel), so a Client Component
// cannot import it directly (context/architecture.md "app/ and
// components/": UI depends on lib one direction only). This is UX-only
// (enables the submit button); the server action re-validates the real
// value itself, which is the actual security boundary.
const CONFIRMATION_PHRASE = "DELETE MY ACCOUNT";

export interface AccountSettingsDialogProps {
  readonly trigger: ReactNode;
}

/**
 * "Account" dialog (Unit 5.5): a data-export download link plus a
 * type-to-confirm account-deletion form. The only destructive,
 * irreversible action anywhere in the generic UI, so — unlike every other
 * dialog in this codebase — the submit button stays disabled until the
 * typed confirmation exactly matches, in addition to the server's own
 * re-validation.
 */
export function AccountSettingsDialog({ trigger }: AccountSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    deleteAccountAction,
    IDLE_ACTION_STATE,
  );
  const [confirmationText, setConfirmationText] = useState("");
  const confirmationId = useId();
  const confirmed = confirmationText === CONFIRMATION_PHRASE;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setConfirmationText("");
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
          <DialogDescription>
            Export your data, or permanently delete your account.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <p className="text-[13px] font-medium text-text-primary">
              Export your data
            </p>
            <p className="text-[13px] text-text-muted">
              Every project, calculation, and baseline you own, as one JSON
              file.
            </p>
            <Button type="button" variant="outline" asChild className="w-fit">
              <a href="/workspace/account/export" download>
                Download account data
              </a>
            </Button>
          </div>

          <Separator />

          <form action={formAction} className="grid gap-3">
            <div>
              <p
                className="text-[13px] font-medium"
                style={{ color: "var(--state-error)" }}
              >
                Danger zone
              </p>
              <p className="text-[13px] text-text-muted">
                Permanently deletes your account and every project, calculation,
                and baseline you own. This cannot be undone.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={confirmationId}>
                Type &quot;{CONFIRMATION_PHRASE}&quot; to confirm
              </Label>
              <Input
                id={confirmationId}
                name="confirmationPhrase"
                autoComplete="off"
                value={confirmationText}
                onChange={(event) => setConfirmationText(event.target.value)}
              />
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
            <DialogFooter>
              <Button
                type="submit"
                variant="destructive"
                disabled={!confirmed || isPending}
              >
                {isPending ? "Deleting…" : "Delete my account"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
