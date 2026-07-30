// Immutable machine-baseline persistence adapter (Unit 2.9 part 2).
//
// A `lib/db` repository — the only boundary allowed to import Prisma
// (context/architecture.md "lib/db/"). A baseline is written once and never
// edited: this module exposes create + read paths only, no update path at
// all (stricter than `run-repository.ts`'s `CalculationRun`, which still
// allows its stale state to change — a baseline has no mutable field
// whatsoever, invariant "Baseline immutability"). The database trigger added
// in this unit's migration backs that up by rejecting every UPDATE. The
// snapshot JSONB is validated on write AND read (never trust JSONB) with
// lib/configuration's schema.

import "server-only";
import { z } from "zod";
import { safeParseMachineBaselineSnapshot } from "../../configuration";
import type { MachineBaselineSnapshot } from "../../configuration";
import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../client";
import type { DbClient } from "./db-client";
import type { MachineConfigurationId, UserId } from "./types";
import { asMachineConfigurationId, asUserId } from "./types";
import type {
  CreateMachineBaselineInput,
  MachineBaselineId,
  MachineBaselineRecord,
  MachineBaselineSummary,
} from "./baseline-types";
import { asMachineBaselineId } from "./baseline-types";

/** Machine-readable classification of a baseline-repository failure. */
export type BaselineRepositoryErrorCode = "invalid_input" | "invalid_snapshot";

/** Thrown by the baseline repository for validation failures. */
export class BaselineRepositoryError extends Error {
  readonly code: BaselineRepositoryErrorCode;

  constructor(message: string, code: BaselineRepositoryErrorCode) {
    super(message);
    this.name = "BaselineRepositoryError";
    this.code = code;
  }
}

const nonEmpty = z.string().trim().min(1);

function parseId(input: unknown): string {
  const result = nonEmpty.safeParse(input);
  if (!result.success) {
    throw new BaselineRepositoryError(
      `Invalid repository input: ${result.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")}`,
      "invalid_input",
    );
  }
  return result.data;
}

// --- Row → record mappers --------------------------------------------------

interface BaselineRow {
  id: string;
  configurationId: string;
  label: string;
  createdByUserId: string | null;
  createdAt: Date;
  snapshot: Prisma.JsonValue;
}

function toBaselineSummary(row: Omit<BaselineRow, "snapshot">): MachineBaselineSummary {
  return {
    id: asMachineBaselineId(row.id),
    configurationId: asMachineConfigurationId(row.configurationId),
    label: row.label,
    createdByUserId: row.createdByUserId === null ? null : asUserId(row.createdByUserId),
    createdAt: row.createdAt,
  };
}

function toBaselineRecord(row: BaselineRow): MachineBaselineRecord {
  // Re-validate the snapshot on read (never trust stored JSONB).
  const parsed = safeParseMachineBaselineSnapshot(row.snapshot);
  if (!parsed.success) {
    throw new BaselineRepositoryError(
      `Invalid stored baseline snapshot (${row.id}): ${parsed.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")}`,
      "invalid_snapshot",
    );
  }
  return { ...toBaselineSummary(row), snapshot: parsed.data };
}

// --- Create ------------------------------------------------------------------

/**
 * Persists a new immutable `MachineBaseline`. The snapshot is validated
 * before it is written. Pass `client` (a `$transaction` callback's `tx`) to
 * make this atomic with other writes — Unit 2.9's `createBaseline` appends an
 * audit event in the same transaction, mirroring `executeModuleInstance`
 * (Unit 2.4) and `createCalculationRun` (Unit 2.3).
 *
 * @throws {@link BaselineRepositoryError} with code `invalid_input` on a malformed snapshot.
 */
export async function createMachineBaseline(
  input: CreateMachineBaselineInput,
  client: DbClient = prisma,
): Promise<MachineBaselineRecord> {
  const configurationId = parseId(input.configurationId);
  const label = parseId(input.label);
  const parsed = safeParseMachineBaselineSnapshot(input.snapshot);
  if (!parsed.success) {
    throw new BaselineRepositoryError(
      `Invalid baseline snapshot: ${parsed.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")}`,
      "invalid_input",
    );
  }
  const snapshot: MachineBaselineSnapshot = parsed.data;

  const row = await client.machineBaseline.create({
    data: {
      configurationId,
      label,
      createdByUserId: input.createdByUserId ?? null,
      snapshot: snapshot as unknown as Prisma.InputJsonValue,
    },
  });
  return toBaselineRecord(row);
}

// --- Reads (ownership-scoped) --------------------------------------------

/**
 * Loads a baseline and its validated snapshot, scoped to the owner (the
 * filter walks configuration → project → owner). Returns `null` when the
 * baseline does not exist or is not owned by `ownerId`. The returned record
 * carries the full snapshot, so it renders without re-reading live project
 * state (invariant "Baseline immutability" — "A baseline remains renderable
 * after later project edits").
 */
export async function loadMachineBaseline(
  baselineId: MachineBaselineId,
  ownerId: UserId,
): Promise<MachineBaselineRecord | null> {
  const id = parseId(baselineId);
  const owner = parseId(ownerId);
  const row = await prisma.machineBaseline.findFirst({
    where: { id, configuration: { project: { ownerId: owner } } },
  });
  return row === null ? null : toBaselineRecord(row);
}

/**
 * Lists a configuration's baselines (newest first) as search summaries,
 * scoped to the owner. Returns `[]` when the configuration is not owned by
 * `ownerId` — the "Baseline list" surface (Unit 3.8).
 */
export async function listMachineBaselinesForConfiguration(
  configurationId: MachineConfigurationId,
  ownerId: UserId,
): Promise<MachineBaselineSummary[]> {
  const id = parseId(configurationId);
  const owner = parseId(ownerId);
  const rows = await prisma.machineBaseline.findMany({
    where: { configurationId: id, configuration: { project: { ownerId: owner } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    omit: { snapshot: true },
  });
  return rows.map(toBaselineSummary);
}
