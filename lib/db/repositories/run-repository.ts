// Immutable calculation-run persistence adapter (Unit 2.3).
//
// A `lib/db` repository — the only boundary allowed to import Prisma
// (context/architecture.md "lib/db/"). A run is written once and never edited:
// this module exposes create + read paths and a stale-state primitive, but no
// way to update the engineering snapshot (invariant "Immutable runs"). The
// database trigger added in this unit's migration backs that up. The snapshot
// JSONB is validated on write AND read (never trust JSONB); `status` and
// `criticalMargin` are derived from the snapshot's checks and stored as
// search-critical summary columns.
//
// Full transactional stale propagation across the parameter graph is a later
// application service (Unit 2.5); `markRunStale` is the single-run write
// primitive that service will call inside its transaction.

import "server-only";
import { z } from "zod";
import { overallCheckStatus, type CheckResult, type CheckStatus } from "../../engine/trace";
import { getDimensionOf, hasUnit, isDimensionless } from "../../engine/units";
import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../client";
import type { CalculationRunId } from "./run-types";
import { asCalculationRunId } from "./run-types";
import type {
  CalculationRunRecord,
  CalculationRunSummary,
  CreateCalculationRunInput,
} from "./run-types";
import { safeParseRunSnapshot } from "./run-snapshot";
import type { ModuleInstanceId, UserId } from "./types";
import { asModuleInstanceId } from "./types";

/** Machine-readable classification of a run-repository failure. */
export type RunRepositoryErrorCode = "invalid_input" | "invalid_snapshot";

/** Thrown by the run repository for snapshot-validation failures. */
export class RunRepositoryError extends Error {
  readonly code: RunRepositoryErrorCode;

  constructor(message: string, code: RunRepositoryErrorCode) {
    super(message);
    this.name = "RunRepositoryError";
    this.code = code;
  }
}

const nonEmpty = z.string().trim().min(1);

function parseId(input: unknown): string {
  const result = nonEmpty.safeParse(input);
  if (!result.success) {
    throw new RunRepositoryError(
      `Invalid repository input: ${result.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")}`,
      "invalid_input",
    );
  }
  return result.data;
}

// --- Summary derivation --------------------------------------------------

/**
 * The smallest dimensionless (safety-factor) check margin, or `null` when no
 * check reports a dimensionless margin. Only dimensionless margins are
 * comparable across checks, so heterogeneous physical margins are ignored here;
 * the authoritative per-check margins (with units) remain in the snapshot.
 */
function deriveCriticalMargin(checks: readonly CheckResult[]): number | null {
  let min: number | null = null;
  for (const check of checks) {
    const margin = check.margin;
    if (margin === undefined || margin.kind !== "quantity") continue;
    if (!hasUnit(margin.unit) || !isDimensionless(getDimensionOf(margin.unit))) {
      continue;
    }
    if (min === null || margin.value < min) min = margin.value;
  }
  return min;
}

// --- Row → record mappers ------------------------------------------------

interface RunRow {
  id: string;
  moduleInstanceId: string;
  engineSdkVersion: string;
  modulePackageId: string;
  moduleVersion: string;
  modulePackageHash: string;
  parameterRegistryVersion: string;
  status: CheckStatus;
  criticalMargin: number | null;
  stale: boolean;
  staleReason: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  snapshot: Prisma.JsonValue;
}

function toRunSummary(row: Omit<RunRow, "snapshot" | "updatedAt">): CalculationRunSummary {
  return {
    id: asCalculationRunId(row.id),
    moduleInstanceId: asModuleInstanceId(row.moduleInstanceId),
    engineSdkVersion: row.engineSdkVersion,
    modulePackageId: row.modulePackageId,
    moduleVersion: row.moduleVersion,
    modulePackageHash: row.modulePackageHash,
    parameterRegistryVersion: row.parameterRegistryVersion,
    status: row.status,
    criticalMargin: row.criticalMargin,
    stale: row.stale,
    staleReason: row.staleReason,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
  };
}

function toRunRecord(row: RunRow): CalculationRunRecord {
  // Re-validate the snapshot on read (never trust stored JSONB).
  const parsed = safeParseRunSnapshot(row.snapshot);
  if (!parsed.success) {
    throw new RunRepositoryError(
      `Invalid stored run snapshot (${row.id}): ${parsed.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")}`,
      "invalid_snapshot",
    );
  }
  return {
    ...toRunSummary(row),
    snapshot: parsed.data,
    updatedAt: row.updatedAt,
  };
}

// --- Create --------------------------------------------------------------

/**
 * Persists a new immutable calculation run. The snapshot is validated before it
 * is written; `status` and `criticalMargin` are derived from its checks and the
 * version pins are normalized into columns.
 *
 * @throws {@link RunRepositoryError} with code `invalid_input` on a malformed snapshot.
 */
export async function createCalculationRun(
  input: CreateCalculationRunInput,
): Promise<CalculationRunRecord> {
  const moduleInstanceId = parseId(input.moduleInstanceId);
  const parsed = safeParseRunSnapshot(input.snapshot);
  if (!parsed.success) {
    throw new RunRepositoryError(
      `Invalid run snapshot: ${parsed.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")}`,
      "invalid_input",
    );
  }
  const snapshot = parsed.data;

  const row = await prisma.calculationRun.create({
    data: {
      moduleInstanceId,
      engineSdkVersion: snapshot.versions.engineSdkVersion,
      modulePackageId: snapshot.versions.modulePackageId,
      moduleVersion: snapshot.versions.moduleVersion,
      modulePackageHash: snapshot.versions.modulePackageHash,
      parameterRegistryVersion: snapshot.versions.parameterRegistryVersion,
      status: overallCheckStatus(snapshot.computation.checks),
      criticalMargin: deriveCriticalMargin(snapshot.computation.checks),
      createdByUserId: snapshot.ranByUserId ?? null,
      snapshot: snapshot as unknown as Prisma.InputJsonValue,
    },
  });
  return toRunRecord(row);
}

// --- Reads (ownership-scoped) --------------------------------------------

/**
 * Loads a run and its validated snapshot, scoped to the owner (the filter walks
 * moduleInstance → assembly → configuration → project → owner). Returns `null`
 * when the run does not exist or is not owned by `ownerId`. The returned record
 * carries the full snapshot, so a report renders without re-executing the module
 * (Unit 2.3 exit criterion).
 */
export async function loadCalculationRun(
  runId: CalculationRunId,
  ownerId: UserId,
): Promise<CalculationRunRecord | null> {
  const id = parseId(runId);
  const owner = parseId(ownerId);
  const row = await prisma.calculationRun.findFirst({
    where: {
      id,
      moduleInstance: { assembly: { configuration: { project: { ownerId: owner } } } },
    },
  });
  return row === null ? null : toRunRecord(row);
}

/**
 * Lists a module instance's runs (newest first) as search summaries, scoped to
 * the owner. Returns `[]` when the module instance is not owned by `ownerId`.
 */
export async function listRunsForModuleInstance(
  moduleInstanceId: ModuleInstanceId,
  ownerId: UserId,
): Promise<CalculationRunSummary[]> {
  const id = parseId(moduleInstanceId);
  const owner = parseId(ownerId);
  const rows = await prisma.calculationRun.findMany({
    where: {
      moduleInstanceId: id,
      moduleInstance: { assembly: { configuration: { project: { ownerId: owner } } } },
    },
    orderBy: { createdAt: "desc" },
    omit: { snapshot: true, updatedAt: true },
  });
  return rows.map(toRunSummary);
}

// --- Stale state (the only mutable path) ---------------------------------

/**
 * Marks a run stale (or clears it), the only permitted mutation of a run. The
 * DB trigger rejects any attempt to change the engineering snapshot; this
 * function only touches `stale`/`staleReason`. Returns the updated summary, or
 * `null` when the run does not exist. Ownership is authorized by the calling
 * propagation service (Unit 2.5), which computes impact from an owned change.
 */
export async function markRunStale(
  runId: CalculationRunId,
  stale = true,
  reason?: string,
): Promise<CalculationRunSummary | null> {
  const id = parseId(runId);
  const existing = await prisma.calculationRun.findUnique({
    where: { id },
    select: { id: true },
  });
  if (existing === null) return null;
  const row = await prisma.calculationRun.update({
    where: { id },
    data: { stale, staleReason: stale ? (reason ?? null) : null },
    omit: { snapshot: true, updatedAt: true },
  });
  return toRunSummary(row);
}
