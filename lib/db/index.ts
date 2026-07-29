// lib/db owns the Prisma client and persistence adapters. This is the
// only library boundary that imports Prisma. Schema v1 (project
// hierarchy, graph, runs, catalog, baselines) is a later work unit
// (Milestone 2); prisma/schema.prisma currently declares only the
// datasource and generator. See context/architecture.md.

import "server-only";
import { prisma } from "./client";

export { prisma } from "./client";

/** Successful result of {@link checkDatabaseHealth}. */
export interface DatabaseHealthOk {
  readonly ok: true;
  /** Round-trip time of the health-check query, in milliseconds. */
  readonly latencyMs: number;
}

/** Failed result of {@link checkDatabaseHealth}. */
export interface DatabaseHealthError {
  readonly ok: false;
  /** Human-readable failure reason; never a raw stack trace. */
  readonly error: string;
}

/** Result of a database connectivity health check. */
export type DatabaseHealthResult = DatabaseHealthOk | DatabaseHealthError;

/**
 * Confirms the application can reach and query the configured PostgreSQL
 * database by round-tripping a trivial query through Prisma.
 *
 * This is Unit 0.4's database health check (`context/
 * implementation-map.md` Unit 0.4 exit criterion: "Database health check
 * passes"). It never throws — connection or query failures are caught
 * and returned as a typed `{ ok: false }` result — so a health-check
 * route handler or a startup check can render a status without a
 * try/catch, per `context/code-standards.md` ("Prefer discriminated
 * unions for engineering values and result states" and the API error
 * envelope convention of not exposing raw stack traces).
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthResult> {
  const startedAt = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: performance.now() - startedAt };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
