// Domain-facing contracts for the calculation-run repository (Unit 2.3).
//
// A run is an immutable snapshot of one module execution plus the version pins
// that make it reproducible (context/architecture.md "Calculation
// Reproducibility"). The full snapshot is a versioned JSONB payload validated
// with the lib/engine schemas (see ./run-snapshot); `status` and
// `criticalMargin` are search-critical summaries normalized into columns.

import type { CheckStatus } from "../../engine/trace";
import type { ModuleComputation, ModuleInput } from "../../engine/module-sdk";
import type { ModuleInstanceId } from "./types";

/** A `CalculationRun` ID. */
export type CalculationRunId = string & { readonly __brand: "CalculationRunId" };

/** Casts a raw string to a {@link CalculationRunId}. Identity at runtime. */
export function asCalculationRunId(id: string): CalculationRunId {
  return id as CalculationRunId;
}

/** Current run-snapshot envelope format version. */
export const RUN_SNAPSHOT_FORMAT_VERSION = 1 as const;
/** Type of {@link RUN_SNAPSHOT_FORMAT_VERSION}. */
export type RunSnapshotFormatVersion = typeof RUN_SNAPSHOT_FORMAT_VERSION;

/**
 * The version pins recorded on a run so its result can be reproduced and
 * filtered: engine SDK, module package identity + content hash, the canonical
 * parameter-registry version, and the source revisions the methods cite.
 */
export interface RunVersions {
  readonly engineSdkVersion: string;
  readonly modulePackageId: string;
  readonly moduleVersion: string;
  readonly modulePackageHash: string;
  readonly parameterRegistryVersion: string;
  readonly sourceRevisionIds: readonly string[];
}

/**
 * The full immutable computation snapshot: the resolved input fed to compute,
 * the returned {@link ModuleComputation} (outputs, trace, checks, warnings,
 * assumptions, validity), the version pins, and run attribution. A report
 * renders entirely from this — the module is never re-executed to display a run.
 */
export interface CalculationRunSnapshot {
  readonly snapshotVersion: RunSnapshotFormatVersion;
  readonly input: ModuleInput;
  readonly computation: ModuleComputation;
  readonly versions: RunVersions;
  /** ISO timestamp of when the computation was run. */
  readonly ranAt: string;
  /** Clerk user ID of who ran it, when attributed. */
  readonly ranByUserId?: string;
}

/**
 * A run's search-critical summary (no snapshot payload), as returned by
 * `listRunsForModuleInstance`.
 */
export interface CalculationRunSummary {
  readonly id: CalculationRunId;
  readonly moduleInstanceId: ModuleInstanceId;
  readonly engineSdkVersion: string;
  readonly modulePackageId: string;
  readonly moduleVersion: string;
  readonly modulePackageHash: string;
  readonly parameterRegistryVersion: string;
  readonly status: CheckStatus;
  readonly criticalMargin: number | null;
  readonly stale: boolean;
  readonly staleReason: string | null;
  readonly createdByUserId: string | null;
  readonly createdAt: Date;
}

/** A fully loaded run: its summary plus the validated immutable snapshot. */
export interface CalculationRunRecord extends CalculationRunSummary {
  readonly snapshot: CalculationRunSnapshot;
  readonly updatedAt: Date;
}

/** Input to persist a new `CalculationRun`. */
export interface CreateCalculationRunInput {
  readonly moduleInstanceId: ModuleInstanceId;
  readonly snapshot: CalculationRunSnapshot;
}
