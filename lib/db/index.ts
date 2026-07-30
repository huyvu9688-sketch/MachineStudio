// lib/db owns the Prisma client and persistence adapters. This is the
// only library boundary that imports Prisma. Live schema: the project
// hierarchy (Unit 2.1: User, MachineProject, MachineConfiguration, Assembly,
// WorkflowInstance, ModuleInstance), the requirements + parameter graph
// (Unit 2.2: Requirement, AcceptanceCriterion, DesignAssumption, LoadCase,
// ParameterValue, ParameterLink), immutable calculation runs (Unit 2.3:
// CalculationRun), append-only audit events (Unit 2.4: AuditEvent), and the
// manufacturer catalog (Unit 2.6: Manufacturer, ComponentType,
// ComponentSchemaVersion, CatalogImportBatch, ManufacturerPartRevision,
// DatasheetAttachment) — shared reference data, not project-owned — and
// component assignment (Unit 2.8: ComponentAssignment), which IS
// project-scoped. BOM (5.1) is a later work unit. See context/architecture.md.

import "server-only";
import { prisma } from "./client";

export { prisma } from "./client";
export * from "./repositories";

/** Successful result of {@link checkDatabaseHealth}. */
export interface DatabaseHealthOk {
  readonly ok: true;
  /** Round-trip time of the health-check query, in milliseconds. */
  readonly latencyMs: number;
}

/** Failed result of {@link checkDatabaseHealth}. */
export interface DatabaseHealthError {
  readonly ok: false;
  /**
   * Fixed, non-identifying failure reason. Driver messages for this query name
   * the host, port, database, and sometimes the role
   * (`Can't reach database server at localhost:5432`), so the detail is logged
   * server-side instead of being handed to whatever renders the result.
   */
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
 *
 * The returned `error` is a fixed string: a health endpoint is often the least
 * protected route in a deployment, and the driver's own message discloses the
 * connection target. The underlying error is logged instead, so an operator
 * still has the detail where it belongs.
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthResult> {
  const startedAt = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: performance.now() - startedAt };
  } catch (error) {
    console.error("Database health check failed:", error);
    return {
      ok: false,
      error: "Database health check failed.",
    };
  }
}
