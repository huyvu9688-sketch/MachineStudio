// Shared transaction-client type for repository functions (Unit 2.4; reads
// joined in as part of the 2026-07-30 design-risk follow-up "transactionally
// consistent read snapshots" — see context/progress-tracker.md).
//
// context/code-standards.md "Application Services": "Database transactions
// are opened at the application-service boundary" and "Calculation
// execution, run storage, stale propagation, assignment updates, and audit
// creation must be atomic when part of one use case." A repository function
// that accepts this type can run either standalone (the default `prisma`
// singleton) or inside `prisma.$transaction(async (tx) => ...)` — the
// application service passes the same `tx` to every read and write it needs
// atomic, without lib/application importing the Prisma client directly
// (lib/db remains the only boundary that does — context/architecture.md
// "lib/db/"). Originally only write functions accepted this (the type's own
// name still says so); `createBaseline`'s seven-plus independent reads and
// `executeModuleInstance`'s multi-step input resolution are why reads need
// it too — under concurrent edits, several reads issued one at a time
// against the default READ COMMITTED isolation can each see a different
// committed state, so a baseline or a run could freeze/compute from data
// that was never simultaneously true. Running the whole read set inside one
// `prisma.$transaction(fn, { isolationLevel: "RepeatableRead" })` gives every
// read in the group the same MVCC snapshot as of the transaction's start.

import "server-only";
import { Prisma, type PrismaClient } from "../generated/prisma/client";

/**
 * Either the top-level {@link PrismaClient} singleton or the interactive
 * transaction client Prisma hands to a `$transaction` callback. Repository
 * write functions default their `client` parameter to the singleton.
 */
export type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * True when `error` is Postgres's serialization-failure error (SQLSTATE
 * `40001`) raised by a `Serializable`-isolation transaction. The application
 * layer needs this to translate a caught write-skew conflict into a typed
 * "retry" outcome without importing the Prisma client directly (lib/db is
 * the only boundary allowed to — context/architecture.md "lib/db/").
 *
 * Checks two distinct shapes, confirmed both occur for the same underlying
 * Postgres error depending on exactly when in the transaction it fires:
 * Prisma's own translated `PrismaClientKnownRequestError` code `P2034`
 * (documented in Prisma's own error reference), and — seen directly running
 * this project's own DB-gated suite under concurrent load — an untranslated
 * `DriverAdapterError` from `@prisma/adapter-neon` with
 * `cause.kind === "TransactionWriteConflict"` (that adapter's own mapping of
 * SQLSTATE `40001`), which reaches the caller as-is rather than as a
 * `PrismaClientKnownRequestError` when the conflict surfaces at COMMIT
 * rather than during a query.
 */
export function isSerializationConflict(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  ) {
    return true;
  }
  return (
    error instanceof Error &&
    error.name === "DriverAdapterError" &&
    "cause" in error &&
    typeof error.cause === "object" &&
    error.cause !== null &&
    "kind" in error.cause &&
    error.cause.kind === "TransactionWriteConflict"
  );
}
