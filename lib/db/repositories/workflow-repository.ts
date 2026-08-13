// Workflow-instance persistence adapter (Unit 4.9): `WorkflowInstance` rows
// and the module instances attached to them. A `lib/db` repository — thin
// persistence over Prisma, the only boundary allowed to import it
// (context/architecture.md "lib/db/"). Split out of project-repository.ts
// the same way run-repository.ts already splits CalculationRun out of it:
// WorkflowInstance is a distinct aggregate hanging off MachineConfiguration,
// not a project/assembly-hierarchy concern.

import "server-only";
import { z } from "zod";
import type { CheckStatus } from "../../engine/trace";
import { prisma } from "../client";
import type { DbClient } from "./db-client";
import type {
  CreateWorkflowInstanceInput,
  ModuleInstanceRecord,
  UserId,
  WorkflowInstanceId,
  WorkflowInstanceRecord,
  WorkflowInstanceStatus,
} from "./types";
import {
  asAssemblyId,
  asMachineConfigurationId,
  asModuleInstanceId,
  asWorkflowInstanceId,
} from "./types";

/** Machine-readable classification of a workflow-repository failure. */
export type WorkflowRepositoryErrorCode = "invalid_input";

/** Thrown when a repository input fails validation at the persistence boundary. */
export class WorkflowRepositoryError extends Error {
  readonly code: WorkflowRepositoryErrorCode;

  constructor(
    message: string,
    code: WorkflowRepositoryErrorCode = "invalid_input",
  ) {
    super(message);
    this.name = "WorkflowRepositoryError";
    this.code = code;
  }
}

const nonEmpty = z.string().trim().min(1);

const workflowStatusSchema: z.ZodType<WorkflowInstanceStatus> = z.enum([
  "draft",
  "active",
  "completed",
  "abandoned",
]);
const createWorkflowInstanceSchema = z.object({
  configurationId: nonEmpty,
  workflowId: nonEmpty,
  workflowVersion: nonEmpty,
  status: workflowStatusSchema.optional(),
});

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new WorkflowRepositoryError(
      `Invalid repository input: ${result.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
}

// --- Row → branded-record mappers ----------------------------------------

interface WorkflowInstanceRow {
  id: string;
  configurationId: string;
  workflowId: string;
  workflowVersion: string;
  status: WorkflowInstanceStatus;
  createdAt: Date;
  updatedAt: Date;
}
interface ModuleInstanceRow {
  id: string;
  assemblyId: string;
  configurationId: string;
  workflowInstanceId: string | null;
  modulePackageId: string;
  moduleVersion: string;
  label: string;
  lastCalculationRunId: string | null;
  lastRunStatus: CheckStatus | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function toWorkflowInstanceRecord(
  row: WorkflowInstanceRow,
): WorkflowInstanceRecord {
  return {
    id: asWorkflowInstanceId(row.id),
    configurationId: asMachineConfigurationId(row.configurationId),
    workflowId: row.workflowId,
    workflowVersion: row.workflowVersion,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
function toModuleInstanceRecord(row: ModuleInstanceRow): ModuleInstanceRecord {
  return {
    id: asModuleInstanceId(row.id),
    assemblyId: asAssemblyId(row.assemblyId),
    configurationId: asMachineConfigurationId(row.configurationId),
    workflowInstanceId:
      row.workflowInstanceId === null
        ? null
        : asWorkflowInstanceId(row.workflowInstanceId),
    modulePackageId: row.modulePackageId,
    moduleVersion: row.moduleVersion,
    label: row.label,
    lastCalculationRunId: row.lastCalculationRunId,
    lastRunStatus: row.lastRunStatus,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// --- Creates ---------------------------------------------------------------

/**
 * Creates a `WorkflowInstance` under a configuration. Accepts an optional
 * transaction `client` (the same trailing-client convention every other
 * create in this repository layer follows) so a caller can compose this with
 * other writes in one transaction — unlike the version this was split from,
 * which never accepted one.
 */
export async function createWorkflowInstance(
  input: CreateWorkflowInstanceInput,
  client: DbClient = prisma,
): Promise<WorkflowInstanceRecord> {
  const data = parse(createWorkflowInstanceSchema, input);
  const row = await client.workflowInstance.create({
    data: {
      configurationId: data.configurationId,
      workflowId: data.workflowId,
      workflowVersion: data.workflowVersion,
      ...(data.status ? { status: data.status } : {}),
    },
  });
  return toWorkflowInstanceRecord(row);
}

// --- Reads (ownership-scoped) ----------------------------------------------

/**
 * Loads a `WorkflowInstance`, scoped to the owner (the filter walks
 * configuration → project → owner). Returns `null` when it does not exist or
 * is not owned by `ownerId` — the same uniform-null-on-either-case convention
 * `loadModuleInstanceForOwner` and `loadAssemblyForOwner` already establish.
 */
export async function loadWorkflowInstanceForOwner(
  workflowInstanceId: WorkflowInstanceId,
  ownerId: UserId,
  client: DbClient = prisma,
): Promise<WorkflowInstanceRecord | null> {
  const id = parse(nonEmpty, workflowInstanceId);
  const owner = parse(nonEmpty, ownerId);
  const row = await client.workflowInstance.findFirst({
    where: { id, configuration: { project: { ownerId: owner } } },
  });
  return row === null ? null : toWorkflowInstanceRecord(row);
}

/**
 * Lists every module instance attached to a workflow instance (its
 * `workflowInstanceId` foreign key), scoped to the owner, oldest first.
 * Returns `[]` when the workflow instance does not exist or is not owned by
 * `ownerId`, the same "uniform empty/null on unauthorized" convention this
 * repository layer already follows elsewhere.
 */
export async function listModuleInstancesForWorkflowInstance(
  workflowInstanceId: WorkflowInstanceId,
  ownerId: UserId,
  client: DbClient = prisma,
): Promise<ModuleInstanceRecord[]> {
  const id = parse(nonEmpty, workflowInstanceId);
  const owner = parse(nonEmpty, ownerId);
  const rows: ModuleInstanceRow[] = await client.moduleInstance.findMany({
    where: {
      workflowInstanceId: id,
      assembly: { configuration: { project: { ownerId: owner } } },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return rows.map(toModuleInstanceRecord);
}

// --- Status ------------------------------------------------------------

/**
 * Sets a `WorkflowInstance`'s persisted `status` column. A single-field
 * update outside a transaction, the same standalone-write convention
 * `markRunStale` already establishes for a derived-state column — this is
 * called by `loadWorkflowInstanceView` (`lib/application/workflows/`) to keep
 * the persisted status in sync with what `evaluateWorkflowStatus` derives,
 * since `components/engineering/machine-navigator.tsx` already renders this
 * column read-only and would otherwise show a permanently stale "draft".
 * Never called with `"abandoned"` here — that status is an explicit user
 * action, not something this repository derives (see workflow-sdk's own
 * `ReachableWorkflowStatus`).
 */
export async function updateWorkflowInstanceStatus(
  workflowInstanceId: WorkflowInstanceId,
  status: WorkflowInstanceStatus,
  client: DbClient = prisma,
): Promise<void> {
  const id = parse(nonEmpty, workflowInstanceId);
  await client.workflowInstance.update({
    where: { id },
    data: { status },
  });
}
