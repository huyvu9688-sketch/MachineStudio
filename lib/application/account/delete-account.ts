// The `deleteAccount` use case (Unit 5.5, "Data export and account deletion
// path"). Deletes the caller's own `User` row and, through the schema's
// cascade rules, every project they own (`lib/db`'s `deleteUserAccount` --
// see that function's own doc comment for the cascade proof). This is the
// one irreversible write in the whole application, so unlike every other
// mutation here it requires an explicit confirmation phrase, validated
// server-side -- a client-only "are you sure" dialog is not enough
// (context/code-standards.md "Next.js": "Server Actions follow the same
// validation ... rules as API routes").

import "server-only";
import { deleteUserAccount, type UserId } from "@/lib/db";

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
  return { ok: true };
}
