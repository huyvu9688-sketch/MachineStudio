// Unit tests for `deleteAccount` (Unit 5.5, "Data export and account
// deletion path"; extended 2026-08-20 to also delete the Clerk identity).
// Mocked, not live-database: this use case's own database call
// (`deleteUserAccount`) already has full live-DB coverage elsewhere in the
// project's cascade-deletion tests, so this file's job is to isolate this
// use case's own new behavior -- calling `clerkClient().users.deleteUser`
// after the local deletion, and not failing the whole use case when that
// call itself throws -- which a live test could not exercise without a real
// Clerk account and API credentials.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserId } from "../../db/repositories/types";

const { mockDeleteUserAccount, mockDeleteUser, mockLoggerError } = vi.hoisted(
  () => ({
    mockDeleteUserAccount: vi.fn(),
    mockDeleteUser: vi.fn(),
    mockLoggerError: vi.fn(),
  }),
);

vi.mock("@/lib/db", () => ({
  deleteUserAccount: mockDeleteUserAccount,
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(async () => ({
    users: { deleteUser: mockDeleteUser },
  })),
}));

vi.mock("@/lib/logging", () => ({
  logger: { error: mockLoggerError },
  normalizeError: (error: unknown) => ({
    message: error instanceof Error ? error.message : String(error),
  }),
}));

describe("deleteAccount", () => {
  let deleteAccount: typeof import("./delete-account").deleteAccount;
  const ownerId = "user_123" as UserId;

  beforeEach(async () => {
    vi.clearAllMocks();
    deleteAccount = (await import("./delete-account")).deleteAccount;
  });

  it("rejects a confirmation phrase that does not exactly match, without touching the database or Clerk", async () => {
    const result = await deleteAccount(ownerId, "delete my account");
    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "confirmation_mismatch" }),
    });
    expect(mockDeleteUserAccount).not.toHaveBeenCalled();
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("reports not_found without calling Clerk when the local account is already gone", async () => {
    mockDeleteUserAccount.mockResolvedValueOnce(false);
    const result = await deleteAccount(ownerId, "DELETE MY ACCOUNT");
    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "not_found" }),
    });
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("deletes the Clerk identity after a successful local deletion", async () => {
    mockDeleteUserAccount.mockResolvedValueOnce(true);
    mockDeleteUser.mockResolvedValueOnce(undefined);
    const result = await deleteAccount(ownerId, "DELETE MY ACCOUNT");
    expect(result).toEqual({ ok: true });
    expect(mockDeleteUserAccount).toHaveBeenCalledWith(ownerId);
    expect(mockDeleteUser).toHaveBeenCalledWith(ownerId);
  });

  it("still reports success and logs when the local deletion succeeds but the Clerk call fails", async () => {
    mockDeleteUserAccount.mockResolvedValueOnce(true);
    mockDeleteUser.mockRejectedValueOnce(new Error("Clerk API unavailable"));
    const result = await deleteAccount(ownerId, "DELETE MY ACCOUNT");
    expect(result).toEqual({ ok: true });
    expect(mockLoggerError).toHaveBeenCalledWith(
      "Failed to delete Clerk identity after local account deletion",
      expect.objectContaining({ ownerId }),
    );
  });
});
