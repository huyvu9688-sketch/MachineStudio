// The `deleteAccount` use case (Unit 5.5, "Data export and account deletion
// path"). Deletes the caller's own `User` row and, through the schema's
// cascade rules, every project they own (`lib/db`'s `deleteUserAccount` --
// see that function's own doc comment for the cascade proof), then deletes
// the underlying Clerk identity (2026-08-20 release-readiness audit: this
// use case previously only deleted the local ownership row -- "permanent"
// account deletion left the Clerk identity, and everything Clerk itself
// stores against it, untouched. Identity is owned by Clerk
// (context/architecture.md "Auth and Access"), so a claim of permanent
// deletion is not true without also deleting it there). This is the one
// irreversible write in the whole application, so unlike every other
// mutation here it requires an explicit confirmation phrase, validated
// server-side -- a client-only "are you sure" dialog is not enough
// (context/code-standards.md "Next.js": "Server Actions follow the same
// validation ... rules as API routes").

import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { deleteUserAccount, type UserId } from "@/lib/db";
import { logger, normalizeError } from "@/lib/logging";

/** The exact phrase `deleteAccount` requires, so a stray or scripted call cannot delete an account by accident. */
export const DELETE_ACCOUNT_CONFIRMATION_PHRASE = "DELETE MY ACCOUNT";

/** Machine-readable classification of a {@link deleteAccount} failure. */
export type DeleteAccountErrorCode = "confirmation_mismatch" | "not_found";

/** A failed {@link deleteAccount} outcome. */
export interface DeleteAccountError {
  readonly code: DeleteAccountErrorCode;
  readonly message: string;
}

/** Result of {@link deleteAccount}. */
export type DeleteAccountResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: DeleteAccountError };

/**
 * Permanently deletes `ownerId`'s account and everything they own. Requires
 * `confirmationPhrase` to exactly match {@link DELETE_ACCOUNT_CONFIRMATION_PHRASE}.
 * `not_found` means the account was already deleted (e.g. a second submit
 * of the same form) -- not an error the UI needs to treat differently from
 * success, since the end state (no account) is identical.
 *
 * Deletes the local `User` row (and everything it owns) first, then the
 * Clerk identity. If the Clerk call itself fails, this still reports success
 * rather than leaving the caller's own data undeleted: the local deletion
 * already happened and cannot be un-done, so failing the whole use case here
 * would only mislead the caller into thinking nothing was deleted. The
 * failure is logged instead, for an operator to clean up the orphaned Clerk
 * identity -- expected to be rare (Clerk's own API, not a database write
 * sharing this call's own transaction).
 */
export async function deleteAccount(
  ownerId: UserId,
  confirmationPhrase: string,
): Promise<DeleteAccountResult> {
  if (confirmationPhrase !== DELETE_ACCOUNT_CONFIRMATION_PHRASE) {
    return {
      ok: false,
      error: {
        code: "confirmation_mismatch",
        message: `Type "${DELETE_ACCOUNT_CONFIRMATION_PHRASE}" exactly to confirm.`,
      },
    };
  }

  const deleted = await deleteUserAccount(ownerId);
  if (!deleted) {
    return {
      ok: false,
      error: { code: "not_found", message: "Account already deleted." },
    };
  }

  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(ownerId);
  } catch (error) {
    logger.error(
      "Failed to delete Clerk identity after local account deletion",
      { ownerId, error: normalizeError(error) },
    );
  }

  return { ok: true };
}
