// Project-hierarchy persistence adapter (Unit 2.1).
//
// This is a `lib/db` repository — a thin persistence adapter over Prisma,
// the only boundary allowed to import it (context/architecture.md
// "lib/db/"). Multi-step business transactions belong in `lib/application`
// (Unit 2.4+); this module owns single-aggregate reads/writes and the
// ownership-scoped project-tree load that Unit 2.1's exit criterion names
// ("A project tree can be created and loaded through repository
// interfaces").
//
// Ownership is enforced here on every read and delete: the caller passes the
// owning `UserId`, and queries filter by it so one user can never load or
// delete another user's project (context/architecture.md "Auth and Access";
// context/code-standards.md "Security").

import "server-only";
import { z } from "zod";
import type { CheckStatus } from "../../engine/trace";
import { prisma } from "../client";
import type { DbClient } from "./db-client";
import type {
  AssemblyId,
  AssemblyNode,
  AssemblyRecord,
  ConfigurationNode,
  CreateAssemblyInput,
  CreateConfigurationInput,
  CreateModuleInstanceInput,
  CreateProjectInput,
  MachineConfigurationId,
  MachineConfigurationRecord,
  MachineProjectId,
  MachineProjectRecord,
  ModuleInstanceExecutionContext,
  ModuleInstanceId,
  ModuleInstanceRecord,
  ProjectTree,
  UserId,
  UserRecord,
  WorkflowInstanceRecord,
  WorkflowInstanceStatus,
} from "./types";
import {
  asAssemblyId,
  asMachineConfigurationId,
  asMachineProjectId,
  asModuleInstanceId,
  asUserId,
  asWorkflowInstanceId,
} from "./types";

/** Machine-readable classification of a repository failure. */
export type ProjectRepositoryErrorCode = "invalid_input";

/** Thrown when a repository input fails validation at the persistence boundary. */
export class ProjectRepositoryError extends Error {
  readonly code: ProjectRepositoryErrorCode;

  constructor(
    message: string,
    code: ProjectRepositoryErrorCode = "invalid_input",
  ) {
    super(message);
    this.name = "ProjectRepositoryError";
    this.code = code;
  }
}

const nonEmpty = z.string().trim().min(1);

const createProjectSchema = z.object({
  ownerId: nonEmpty,
  name: nonEmpty,
  marketProfileKey: nonEmpty,
});
const createConfigurationSchema = z.object({
  projectId: nonEmpty,
  name: nonEmpty,
});
const createAssemblySchema = z.object({
  configurationId: nonEmpty,
  parentId: nonEmpty.optional(),
  name: nonEmpty,
});
const createModuleInstanceSchema = z.object({
  assemblyId: nonEmpty,
  configurationId: nonEmpty,
  workflowInstanceId: nonEmpty.optional(),
  modulePackageId: nonEmpty,
  moduleVersion: nonEmpty,
  label: nonEmpty,
});

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ProjectRepositoryError(
      `Invalid repository input: ${result.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
}

// --- Row → branded-record mappers ----------------------------------------

interface UserRow {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}
interface ProjectRow {
  id: string;
  ownerId: string;
  name: string;
  marketProfileKey: string;
  createdAt: Date;
  updatedAt: Date;
}
interface ConfigurationRow {
  id: string;
  projectId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
interface AssemblyRow {
  id: string;
  configurationId: string;
  parentId: string | null;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
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
  createdAt: Date;
  updatedAt: Date;
}

function toUserRecord(row: UserRow): UserRecord {
  return {
    id: asUserId(row.id),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
function toProjectRecord(row: ProjectRow): MachineProjectRecord {
  return {
    id: asMachineProjectId(row.id),
    ownerId: asUserId(row.ownerId),
    name: row.name,
    marketProfileKey: row.marketProfileKey,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
function toConfigurationRecord(
  row: ConfigurationRow,
): MachineConfigurationRecord {
  return {
    id: asMachineConfigurationId(row.id),
    projectId: asMachineProjectId(row.projectId),
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
function toAssemblyRecord(row: AssemblyRow): AssemblyRecord {
  return {
    id: asAssemblyId(row.id),
    configurationId: asMachineConfigurationId(row.configurationId),
    parentId: row.parentId === null ? null : asAssemblyId(row.parentId),
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// --- Creates -------------------------------------------------------------

/**
 * Creates (or, if it already exists, returns) a `User` ownership reference.
 * Accepts the same optional trailing `client` as every other create in this
 * file, so a caller can compose it inside its own transaction —
 * `createMachineProject` (Unit 3.2) does exactly this, upserting the caller
 * as the first statement in the same transaction that creates their first
 * project, since a real (non-test) Clerk user has no other entry point that
 * would have created their `User` row first.
 */
export async function upsertUser(
  id: string,
  client: DbClient = prisma,
): Promise<UserRecord> {
  const userId = parse(nonEmpty, id);
  const row = await client.user.upsert({
    where: { id: userId },
    create: { id: userId },
    update: {},
  });
  return toUserRecord(row);
}

/**
 * Creates a `MachineProject` owned by `input.ownerId`. Accepts an optional
 * transaction `client` (Unit 3.2: `createMachineProject` creates a project
 * and its initial configuration together, atomically) — the same trailing-
 * client convention the 2026-07-30 design-risk follow-up established for
 * reads, now extended to these two creates.
 */
export async function createProject(
  input: CreateProjectInput,
  client: DbClient = prisma,
): Promise<MachineProjectRecord> {
  const data = parse(createProjectSchema, input);
  const row = await client.machineProject.create({ data });
  return toProjectRecord(row);
}

/** Creates a `MachineConfiguration` under a project. See {@link createProject} on `client`. */
export async function createConfiguration(
  input: CreateConfigurationInput,
  client: DbClient = prisma,
): Promise<MachineConfigurationRecord> {
  const data = parse(createConfigurationSchema, input);
  const row = await client.machineConfiguration.create({ data });
  return toConfigurationRecord(row);
}

/** Creates an `Assembly`; omit `parentId` for a root assembly. */
export async function createAssembly(
  input: CreateAssemblyInput,
): Promise<AssemblyRecord> {
  const data = parse(createAssemblySchema, input);
  const row = await prisma.assembly.create({
    data: {
      configurationId: data.configurationId,
      name: data.name,
      parentId: data.parentId ?? null,
    },
  });
  return toAssemblyRecord(row);
}

/** Creates a `ModuleInstance` in an assembly, pinning its package id+version. */
export async function createModuleInstance(
  input: CreateModuleInstanceInput,
): Promise<ModuleInstanceRecord> {
  const data = parse(createModuleInstanceSchema, input);
  const row = await prisma.moduleInstance.create({
    data: {
      assemblyId: data.assemblyId,
      configurationId: data.configurationId,
      modulePackageId: data.modulePackageId,
      moduleVersion: data.moduleVersion,
      label: data.label,
      workflowInstanceId: data.workflowInstanceId ?? null,
    },
  });
  return toModuleInstanceRecord(row);
}

// --- Reads (ownership-scoped) --------------------------------------------

/** Lists a user's projects (newest first), scoped to the owner. */
export async function listProjectsByOwner(
  ownerId: UserId,
): Promise<MachineProjectRecord[]> {
  const owner = parse(nonEmpty, ownerId);
  const rows = await prisma.machineProject.findMany({
    where: { ownerId: owner },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toProjectRecord);
}

/**
 * Loads a project and its full configuration/assembly/module/workflow tree,
 * or `null` if the project does not exist or is not owned by `ownerId`.
 * The flat assembly rows are assembled into a nested tree by `parentId`.
 */
export async function loadProjectTree(
  projectId: MachineProjectId,
  ownerId: UserId,
): Promise<ProjectTree | null> {
  const id = parse(nonEmpty, projectId);
  const owner = parse(nonEmpty, ownerId);

  const project = await prisma.machineProject.findFirst({
    where: { id, ownerId: owner },
    include: {
      configurations: {
        orderBy: { createdAt: "asc" },
        include: {
          workflowInstances: { orderBy: { createdAt: "asc" } },
          assemblies: {
            orderBy: { createdAt: "asc" },
            include: { moduleInstances: { orderBy: { createdAt: "asc" } } },
          },
        },
      },
    },
  });
  if (project === null) {
    return null;
  }

  const configurations: ConfigurationNode[] = project.configurations.map(
    (config) => ({
      ...toConfigurationRecord(config),
      workflowInstances: config.workflowInstances.map(toWorkflowInstanceRecord),
      assemblies: buildAssemblyForest(config.assemblies),
    }),
  );

  return { ...toProjectRecord(project), configurations };
}

/** A configuration's assembly row joined with its module instances. */
type ConfigAssemblyRow = AssemblyRow & {
  readonly moduleInstances: readonly ModuleInstanceRow[];
};

/**
 * Builds the nested root-assembly forest from a configuration's flat assembly
 * rows. Every row belongs to one configuration, so any `parentId` that is not
 * itself in the list is treated as a root (defensive; should not occur).
 */
function buildAssemblyForest(
  rows: readonly ConfigAssemblyRow[],
): AssemblyNode[] {
  const childrenByParent = new Map<string | null, ConfigAssemblyRow[]>();
  const ids = new Set(rows.map((r) => r.id));
  for (const row of rows) {
    const key =
      row.parentId !== null && ids.has(row.parentId) ? row.parentId : null;
    const bucket = childrenByParent.get(key);
    if (bucket) {
      bucket.push(row);
    } else {
      childrenByParent.set(key, [row]);
    }
  }

  const build = (row: ConfigAssemblyRow): AssemblyNode => ({
    ...toAssemblyRecord(row),
    moduleInstances: row.moduleInstances.map(toModuleInstanceRecord),
    children: (childrenByParent.get(row.id) ?? []).map(build),
  });

  return (childrenByParent.get(null) ?? []).map(build);
}

// --- Delete (ownership-scoped) -------------------------------------------

/**
 * Deletes a project owned by `ownerId`, cascading to its configurations,
 * assemblies (whole subtree), workflow instances, and module instances via
 * the schema's `onDelete: Cascade` rules. Returns `true` when a row was
 * deleted, `false` when nothing matched (wrong owner or unknown id).
 */
export async function deleteProject(
  projectId: MachineProjectId,
  ownerId: UserId,
): Promise<boolean> {
  const id = parse(nonEmpty, projectId);
  const owner = parse(nonEmpty, ownerId);
  const result = await prisma.machineProject.deleteMany({
    where: { id, ownerId: owner },
  });
  return result.count > 0;
}

// --- Rename (ownership-scoped) --------------------------------------------
//
// Same ownership-scoped-bulk-write shape as deleteProject: the WHERE clause
// itself is the authorization check (an update that matches 0 rows because
// of a wrong owner is indistinguishable from one that matches 0 rows because
// the id is unknown — the same uniform-null-on-either-case reasoning
// loadModuleInstanceForOwner documents). Returns whether a row changed, not
// the row itself: every caller re-reads the tree afterward
// (loadWorkspaceView), so a second fetched copy here would go unused.

/** Renames a `MachineProject` owned by `ownerId`. Unit 3.2. */
export async function renameProject(
  projectId: MachineProjectId,
  ownerId: UserId,
  name: string,
): Promise<boolean> {
  const id = parse(nonEmpty, projectId);
  const owner = parse(nonEmpty, ownerId);
  const newName = parse(nonEmpty, name);
  const result = await prisma.machineProject.updateMany({
    where: { id, ownerId: owner },
    data: { name: newName },
  });
  return result.count > 0;
}

/** Renames an `Assembly` owned by `ownerId`. Unit 3.2. */
export async function renameAssembly(
  assemblyId: AssemblyId,
  ownerId: UserId,
  name: string,
): Promise<boolean> {
  const id = parse(nonEmpty, assemblyId);
  const owner = parse(nonEmpty, ownerId);
  const newName = parse(nonEmpty, name);
  const result = await prisma.assembly.updateMany({
    where: { id, configuration: { project: { ownerId: owner } } },
    data: { name: newName },
  });
  return result.count > 0;
}

// --- Module-instance execution support (Unit 2.4) ------------------------

/**
 * Loads a module instance and the project it belongs to, scoped to the owner
 * (the filter walks assembly → configuration → project → owner). Returns
 * `null` when the module instance does not exist or is not owned by
 * `ownerId` — the application layer treats both alike (invariant "Auth and
 * Access": ownership is enforced on every project-related query, and a
 * uniform `null` avoids leaking which case occurred).
 */
export async function loadModuleInstanceForOwner(
  moduleInstanceId: ModuleInstanceId,
  ownerId: UserId,
  client: DbClient = prisma,
): Promise<ModuleInstanceExecutionContext | null> {
  const id = parse(nonEmpty, moduleInstanceId);
  const owner = parse(nonEmpty, ownerId);

  const row = await client.moduleInstance.findFirst({
    where: { id, assembly: { configuration: { project: { ownerId: owner } } } },
    include: {
      assembly: {
        select: { configuration: { select: { id: true, projectId: true } } },
      },
    },
  });
  if (row === null) {
    return null;
  }
  const { assembly, ...moduleInstanceRow } = row;
  return {
    moduleInstance: toModuleInstanceRecord(moduleInstanceRow),
    configurationId: asMachineConfigurationId(assembly.configuration.id),
    projectId: asMachineProjectId(assembly.configuration.projectId),
  };
}

/**
 * Sets a module instance's normalized last-run summary. The only mutation of
 * these two columns; called by Unit 2.4's `executeModuleInstance` right after
 * `createCalculationRun`, in the same transaction. Ownership is authorized by
 * that caller (which just created the run for this exact module instance),
 * matching `markRunStale`'s convention for the run's own single-field mutation.
 */
export async function updateModuleInstanceRunStatus(
  moduleInstanceId: ModuleInstanceId,
  lastCalculationRunId: string,
  lastRunStatus: CheckStatus,
  client: DbClient = prisma,
): Promise<void> {
  const id = parse(nonEmpty, moduleInstanceId);
  await client.moduleInstance.update({
    where: { id },
    data: { lastCalculationRunId, lastRunStatus },
  });
}

// --- Configuration ownership (Unit 2.5) -----------------------------------

/**
 * Whether a configuration belongs to `ownerId` (the filter walks configuration
 * → project → owner). Unit 2.5's `setParameterValue` uses this to authorize a
 * change to a *provider* value (a machine requirement, assembly parameter, or
 * workflow-provided value — no owning module instance to check via
 * `loadModuleInstanceForOwner`).
 */
export async function isConfigurationOwnedBy(
  configurationId: string,
  ownerId: UserId,
): Promise<boolean> {
  const id = parse(nonEmpty, configurationId);
  const owner = parse(nonEmpty, ownerId);
  const row = await prisma.machineConfiguration.findFirst({
    where: { id, project: { ownerId: owner } },
    select: { id: true },
  });
  return row !== null;
}

// --- Configuration + project resolution (Unit 2.9) ------------------------

/**
 * Loads a configuration and the project it belongs to, scoped to the owner
 * (the filter walks configuration → project → owner). Returns `null` when
 * the configuration does not exist or is not owned by `ownerId`. Unit 2.9's
 * `createBaseline` needs the owning project's `id`/`name`/`marketProfileKey`
 * to populate the baseline snapshot — the configuration-level counterpart to
 * `loadModuleInstanceForOwner`'s module-instance-plus-project shape.
 */
export async function loadConfigurationForOwner(
  configurationId: MachineConfigurationId,
  ownerId: UserId,
  client: DbClient = prisma,
): Promise<{
  configuration: MachineConfigurationRecord;
  project: MachineProjectRecord;
} | null> {
  const id = parse(nonEmpty, configurationId);
  const owner = parse(nonEmpty, ownerId);

  const row = await client.machineConfiguration.findFirst({
    where: { id, project: { ownerId: owner } },
    include: { project: true },
  });
  if (row === null) {
    return null;
  }
  const { project, ...configurationRow } = row;
  return {
    configuration: toConfigurationRecord(configurationRow),
    project: toProjectRecord(project),
  };
}

/**
 * Loads one configuration's assembly/module tree, scoped to the owner.
 * Returns `null` when the configuration does not exist or is not owned by
 * `ownerId`. The single-configuration counterpart to `loadProjectTree`'s
 * per-project `configurations` array — Unit 2.9's baseline snapshot freezes
 * exactly one configuration's tree, not its whole project.
 */
export async function loadConfigurationTree(
  configurationId: MachineConfigurationId,
  ownerId: UserId,
  client: DbClient = prisma,
): Promise<ConfigurationNode | null> {
  const id = parse(nonEmpty, configurationId);
  const owner = parse(nonEmpty, ownerId);

  const config = await client.machineConfiguration.findFirst({
    where: { id, project: { ownerId: owner } },
    include: {
      workflowInstances: { orderBy: { createdAt: "asc" } },
      assemblies: {
        orderBy: { createdAt: "asc" },
        include: { moduleInstances: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
  if (config === null) {
    return null;
  }
  return {
    ...toConfigurationRecord(config),
    workflowInstances: config.workflowInstances.map(toWorkflowInstanceRecord),
    assemblies: buildAssemblyForest(config.assemblies),
  };
}

// --- Assembly ownership (Unit 2.8) ----------------------------------------

/**
 * Loads an assembly scoped to `ownerId` (the filter walks assembly →
 * configuration → project → owner), or `null` when it does not exist or is not
 * owned. Unit 2.8's `assignComponent` and Unit 2.5's `setParameterValue` use
 * this to authorize a write that names an assembly — no owning module instance
 * to check via `loadModuleInstanceForOwner`, the same gap
 * `isConfigurationOwnedBy` fills for a machine-level provider value.
 *
 * It returns the record rather than a boolean because the caller also needs the
 * assembly's `configurationId`: ownership alone does not prove the assembly
 * belongs to the configuration the write claims to be scoped to.
 */
export async function loadAssemblyForOwner(
  assemblyId: string,
  ownerId: UserId,
): Promise<AssemblyRecord | null> {
  const id = parse(nonEmpty, assemblyId);
  const owner = parse(nonEmpty, ownerId);
  const row = await prisma.assembly.findFirst({
    where: { id, configuration: { project: { ownerId: owner } } },
  });
  return row === null ? null : toAssemblyRecord(row);
}
