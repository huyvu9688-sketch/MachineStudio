// Prisma client singleton (Unit 0.4). lib/db is the only library boundary
// that imports Prisma (context/architecture.md "lib/db/": "Prisma client
// and persistence adapters. This is the only library boundary that
// imports Prisma."). Import `prisma` from this module (or re-exported
// from lib/db/index.ts) instead of constructing `new PrismaClient()`
// anywhere else.
//
// Prisma 7 no longer reads the connection URL from the datasource block in
// prisma/schema.prisma (error P1012). The runtime connection is supplied
// here through a driver adapter — `@prisma/adapter-pg`, which wraps the
// `pg` PostgreSQL driver — using the same DATABASE_URL that lib/env.ts
// already validates with Zod. prisma.config.ts carries the URL separately
// for the CLI (Migrate/introspection); the two are deliberately the same
// environment variable.
//
// Next.js's dev server hot-reloads server modules on every edit. Without
// caching, that would construct a brand new PrismaClient — and a new
// database connection pool — on every reload, eventually exhausting
// PostgreSQL's connection limit. The fix is the standard Next.js/Prisma
// global-singleton pattern: cache the client on `globalThis` outside of
// production, where each server process is loaded once instead of
// reloaded per edit.

import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../env";
import { PrismaClient } from "./generated/prisma/client";

declare global {
  // A `var` (not `let`/`const`) is required for ambient global
  // augmentation; this is the documented Next.js/Prisma singleton
  // pattern, not a general coding style.
  var prismaGlobal: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

/**
 * The application's singleton {@link PrismaClient} instance.
 *
 * This is the one place `PrismaClient` is constructed. Every other
 * server-side module that needs database access imports `prisma` from
 * here (or from `lib/db/index.ts`, which re-exports it) rather than
 * creating its own client — see the `lib/db` system boundary in
 * `context/architecture.md`.
 *
 * In development, the instance is cached on `globalThis` so hot module
 * reloading reuses the same client and connection pool across reloads
 * instead of opening a new one on every server-file change. In
 * production, exactly one client is created per server process.
 */
export const prisma: PrismaClient = globalThis.prismaGlobal ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
