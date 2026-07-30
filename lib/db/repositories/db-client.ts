// Shared transaction-client type for repository write functions (Unit 2.4).
//
// context/code-standards.md "Application Services": "Database transactions
// are opened at the application-service boundary" and "Calculation
// execution, run storage, stale propagation, assignment updates, and audit
// creation must be atomic when part of one use case." A repository write
// function that accepts this type can run either standalone (the default
// `prisma` singleton) or inside `prisma.$transaction(async (tx) => ...)` —
// the application service passes the same `tx` to every write it needs
// atomic, without lib/application importing the Prisma client directly
// (lib/db remains the only boundary that does — context/architecture.md
// "lib/db/").

import "server-only";
import type { Prisma, PrismaClient } from "../generated/prisma/client";

/**
 * Either the top-level {@link PrismaClient} singleton or the interactive
 * transaction client Prisma hands to a `$transaction` callback. Repository
 * write functions default their `client` parameter to the singleton.
 */
export type DbClient = PrismaClient | Prisma.TransactionClient;
