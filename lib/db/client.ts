// Prisma client singleton (Unit 0.4). lib/db is the only library boundary
// that imports Prisma (context/architecture.md "lib/db/": "Prisma client
// and persistence adapters. This is the only library boundary that
// imports Prisma."). Import `prisma` from this module (or re-exported
// from lib/db/index.ts) instead of constructing `new PrismaClient()`
// anywhere else.
//
// Prisma 7 no longer reads the connection URL from the datasource block in
// prisma/schema.prisma (error P1012). The runtime connection is supplied
// here through a driver adapter using the same DATABASE_URL that lib/env.ts
// already validates with Zod. prisma.config.ts carries the URL separately
// for the CLI (Migrate/introspection); the two are deliberately the same
// environment variable.
//
// Two adapters are supported, chosen by DATABASE_URL's host:
//   - `@prisma/adapter-pg` (wraps the `pg` driver, plain Postgres wire
//     protocol over TCP) is the default — what docker-compose.yml, CI's
//     postgres:16-alpine service container, and a native local install all
//     speak.
//   - `@prisma/adapter-neon` (wraps `@neondatabase/serverless`, which
//     tunnels the Postgres protocol over a WebSocket on port 443) is used
//     automatically when the host is a `*.neon.tech` Neon database —
//     added 2026-07-31 after a real, confirmed constraint on a
//     corporate-network dev machine: outbound TCP:5432 was silently
//     dropped after the SSL negotiation packet (not a TLS/cert issue —
//     confirmed by raw-socket test) while HTTPS:443 to the same Neon host
//     worked once the corporate TLS-inspection root CA was trusted
//     (NODE_EXTRA_CA_CERTS). This is a per-environment routing choice, not
//     a change to the default: nothing here touches docker-compose,
//     `pg`-based CI, or any non-Neon DATABASE_URL.
//
// Next.js's dev server hot-reloads server modules on every edit. Without
// caching, that would construct a brand new PrismaClient — and a new
// database connection pool — on every reload, eventually exhausting the
// connection limit. The fix is the standard Next.js/Prisma global-singleton
// pattern: cache the client on `globalThis` outside of production, where
// each server process is loaded once instead of reloaded per edit.

import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeon } from "@prisma/adapter-neon";
import { env } from "../env";
import { PrismaClient } from "./generated/prisma/client";

declare global {
  // A `var` (not `let`/`const`) is required for ambient global
  // augmentation; this is the documented Next.js/Prisma singleton
  // pattern, not a general coding style.
  var prismaGlobal: PrismaClient | undefined;
}

/** Whether `url` is a Neon-hosted database — routes to the WebSocket adapter. */
function isNeonHost(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".neon.tech");
  } catch {
    return false;
  }
}

function createPrismaClient(): PrismaClient {
  const adapter = isNeonHost(env.DATABASE_URL)
    ? new PrismaNeon({ connectionString: env.DATABASE_URL })
    : new PrismaPg({ connectionString: env.DATABASE_URL });
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
export const prisma: PrismaClient =
  globalThis.prismaGlobal ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
