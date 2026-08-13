// Domain-facing contracts for the project-hierarchy repository (Unit 2.1).
//
// Prisma returns plain strings for every ID. These branded aliases let the
// application layer keep project/configuration/assembly identifiers
// distinct at compile time (context/code-standards.md: "Stable identifiers
// use branded string types where practical"). The `as*` helpers are the
// single documented place a raw string is narrowed to a branded ID — they
// are identity at runtime, matching lib/engine/graph's convention.

import type { CheckStatus } from "../../engine/trace";

/** A Clerk user ID used as the local ownership reference. */
export type UserId = string & { readonly __brand: "UserId" };
/** A `MachineProject` ID. */
export type MachineProjectId = string & {
  readonly __brand: "MachineProjectId";
};
/** A `MachineConfiguration` ID. */
export type MachineConfigurationId = string & {
  readonly __brand: "MachineConfigurationId";
};
/** An `Assembly` ID. */
export type AssemblyId = string & { readonly __brand: "AssemblyId" };
/** A `WorkflowInstance` ID. */
export type WorkflowInstanceId = string & {
  readonly __brand: "WorkflowInstanceId";
};
/** A `ModuleInstance` ID. */
export type ModuleInstanceId = string & {
  readonly __brand: "ModuleInstanceId";
};

/** Casts a raw string to a {@link UserId}. Identity at runtime. */
export function asUserId(id: string): UserId {
  return id as UserId;
}
/** Casts a raw string to a {@link MachineProjectId}. Identity at runtime. */
export function asMachineProjectId(id: string): MachineProjectId {
  return id as MachineProjectId;
}
/** Casts a raw string to a {@link MachineConfigurationId}. Identity at runtime. */
export function asMachineConfigurationId(id: string): MachineConfigurationId {
  return id as MachineConfigurationId;
}
/** Casts a raw string to an {@link AssemblyId}. Identity at runtime. */
export function asAssemblyId(id: string): AssemblyId {
  return id as AssemblyId;
}
/** Casts a raw string to a {@link WorkflowInstanceId}. Identity at runtime. */
export function asWorkflowInstanceId(id: string): WorkflowInstanceId {
  return id as WorkflowInstanceId;
}
/** Casts a raw string to a {@link ModuleInstanceId}. Identity at runtime. */
export function asModuleInstanceId(id: string): ModuleInstanceId {
  return id as ModuleInstanceId;
}

/** Lifecycle of a workflow instance; mirrors the Prisma enum. */
export type WorkflowInstanceStatus =
  "draft" | "active" | "completed" | "abandoned";

// --- Records (a single row, IDs branded) ---------------------------------

/** A persisted `User` ownership reference. */
export interface UserRecord {
  readonly id: UserId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** A persisted `MachineProject` row (without its children). */
export interface MachineProjectRecord {
  readonly id: MachineProjectId;
  readonly ownerId: UserId;
  readonly name: string;
  readonly marketProfileKey: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** A persisted `MachineConfiguration` row (without its children). */
export interface MachineConfigurationRecord {
  readonly id: MachineConfigurationId;
  readonly projectId: MachineProjectId;
  readonly name: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** A persisted `Assembly` row (without its children). */
export interface AssemblyRecord {
  readonly id: AssemblyId;
  readonly configurationId: MachineConfigurationId;
  readonly parentId: AssemblyId | null;
  readonly name: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** A persisted `WorkflowInstance` row. */
export interface WorkflowInstanceRecord {
  readonly id: WorkflowInstanceId;
  readonly configurationId: MachineConfigurationId;
  readonly workflowId: string;
  readonly workflowVersion: string;
  readonly status: WorkflowInstanceStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** A persisted `ModuleInstance` row. */
export interface ModuleInstanceRecord {
  readonly id: ModuleInstanceId;
  readonly assemblyId: AssemblyId;
  /**
   * Denormalized from the owning assembly's `configurationId` (design-risk
   * follow-up, 2026-07-30 — DB-level same-configuration constraints; see
   * `prisma/schema.prisma`'s `ModuleInstance.configurationId` comment).
   */
  readonly configurationId: MachineConfigurationId;
  readonly workflowInstanceId: WorkflowInstanceId | null;
  readonly modulePackageId: string;
  readonly moduleVersion: string;
  readonly label: string;
  /**
   * Normalized summary of the latest calculation run (Unit 2.4), null before
   * any run exists. A plain string, not a branded `CalculationRunId` —
   * importing run-types.ts here would cycle back against its own dependency
   * on this file for `ModuleInstanceId`.
   */
  readonly lastCalculationRunId: string | null;
  readonly lastRunStatus: CheckStatus | null;
  /** When this instance was archived (hidden from the navigator, nothing deleted); `null` when active. */
  readonly archivedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * A module instance plus the configuration and project it ultimately belongs
 * to. Unit 2.4's `executeModuleInstance` needs the owning project id to
 * attribute the audit event it appends, one join further than
 * `ModuleInstanceRecord` alone carries; the application services also need
 * `configurationId` to reject a write whose caller-supplied configuration is
 * not the one this module instance actually lives in (ownership alone does not
 * establish that — one owner can have many configurations, and a
 * `configurationId` from another owner entirely must not be written either).
 */
export interface ModuleInstanceExecutionContext {
  readonly moduleInstance: ModuleInstanceRecord;
  readonly configurationId: MachineConfigurationId;
  readonly projectId: MachineProjectId;
}

// --- Loaded tree (nested, ownership-scoped) ------------------------------

/** An assembly with its module instances and nested child assemblies. */
export interface AssemblyNode extends AssemblyRecord {
  readonly moduleInstances: readonly ModuleInstanceRecord[];
  readonly children: readonly AssemblyNode[];
}

/** A configuration with its root assemblies and workflow instances. */
export interface ConfigurationNode extends MachineConfigurationRecord {
  readonly assemblies: readonly AssemblyNode[];
  readonly workflowInstances: readonly WorkflowInstanceRecord[];
}

/** A fully loaded project tree, as returned by `loadProjectTree`. */
export interface ProjectTree extends MachineProjectRecord {
  readonly configurations: readonly ConfigurationNode[];
}

// --- Create inputs -------------------------------------------------------

/** Input to create a `MachineProject`. */
export interface CreateProjectInput {
  readonly ownerId: UserId;
  readonly name: string;
  readonly marketProfileKey: string;
}

/** Input to create a `MachineConfiguration`. */
export interface CreateConfigurationInput {
  readonly projectId: MachineProjectId;
  readonly name: string;
}

/** Input to create an `Assembly`. `parentId` is omitted for a root assembly. */
export interface CreateAssemblyInput {
  readonly configurationId: MachineConfigurationId;
  readonly parentId?: AssemblyId;
  readonly name: string;
}

/** Input to create a `WorkflowInstance`. */
export interface CreateWorkflowInstanceInput {
  readonly configurationId: MachineConfigurationId;
  readonly workflowId: string;
  readonly workflowVersion: string;
  readonly status?: WorkflowInstanceStatus;
}

/** Input to create a `ModuleInstance`. */
export interface CreateModuleInstanceInput {
  readonly assemblyId: AssemblyId;
  /**
   * The assembly's own configuration — caller-supplied and trusted, the same
   * convention `CreateParameterValueInput`/`CreateParameterLinkInput` already
   * establish (a mismatch is now rejected at the database level by the
   * composite foreign key on `ModuleInstance.assembly`, not just trusted).
   */
  readonly configurationId: MachineConfigurationId;
  readonly workflowInstanceId?: WorkflowInstanceId;
  readonly modulePackageId: string;
  readonly moduleVersion: string;
  readonly label: string;
}
