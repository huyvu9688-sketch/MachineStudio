// Append-only audit-event persistence adapter (Unit 2.4).
//
// A `lib/db` repository — the only boundary allowed to import Prisma
// (context/architecture.md "lib/db/"). Validates the shape with lib/audit's
// schema before writing (context/code-standards.md "Validation"). No update
// or delete path is exposed — invariant "append-only" is a service rule here.
//
// `appendAuditEvent` accepts an optional transaction client so an application
// service can make it atomic with the write it documents (Unit 2.4's
// `executeModuleInstance`: run persistence + module-status update + audit
// event, context/code-standards.md "Application Services").
//
// `listAuditEventsForProject` (Unit 2.9) is the query surface Unit 2.4
// deliberately left out ("the full audit *service* — query surfaces,
// `ChangeReason` — is Unit 2.9"): a project's append-only history,
// ownership-scoped and newest first.

import "server-only";
import { z } from "zod";
import { AuditEventInputSchema } from "../../audit";
import type { AuditEntityType, AuditEventType } from "../../audit";
import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../client";
import type { DbClient } from "./db-client";
import { asMachineProjectId, asUserId } from "./types";
import type { MachineProjectId, UserId } from "./types";
import type { AuditEventRecord, CreateAuditEventInput } from "./audit-types";
import { asAuditEventId } from "./audit-types";

const nonEmpty = z.string().trim().min(1);

function parseId(input: unknown): string {
  const result = nonEmpty.safeParse(input);
  if (!result.success) {
    throw new AuditRepositoryError(
      `Invalid repository input: ${result.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
}

/** Machine-readable classification of an audit-repository failure. */
export type AuditRepositoryErrorCode = "invalid_input";

/** Thrown by the audit repository for shape-validation failures. */
export class AuditRepositoryError extends Error {
  readonly code: AuditRepositoryErrorCode;

  constructor(message: string, code: AuditRepositoryErrorCode = "invalid_input") {
    super(message);
    this.name = "AuditRepositoryError";
    this.code = code;
  }
}

interface AuditEventRow {
  id: string;
  projectId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  payload: Prisma.JsonValue;
  occurredAt: Date;
}

function toAuditEventRecord(row: AuditEventRow): AuditEventRecord {
  return {
    id: asAuditEventId(row.id),
    projectId: asMachineProjectId(row.projectId),
    eventType: row.eventType as AuditEventType,
    entityType: row.entityType as AuditEntityType,
    entityId: row.entityId,
    userId: row.userId === null ? null : asUserId(row.userId),
    payload: row.payload as Readonly<Record<string, unknown>>,
    occurredAt: row.occurredAt,
  };
}

/**
 * Appends a new `AuditEvent`. Pass `client` (a `$transaction` callback's `tx`)
 * to make this atomic with the write it documents.
 *
 * @throws {@link AuditRepositoryError} with code `invalid_input` on a malformed event.
 */
export async function appendAuditEvent(
  input: CreateAuditEventInput,
  client: DbClient = prisma,
): Promise<AuditEventRecord> {
  const parsed = AuditEventInputSchema.safeParse({
    projectId: input.projectId,
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId,
    ...(input.userId !== undefined ? { userId: input.userId } : {}),
    payload: input.payload,
  });
  if (!parsed.success) {
    throw new AuditRepositoryError(
      `Invalid audit event: ${parsed.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")}`,
    );
  }
  const data = parsed.data;
  const row = await client.auditEvent.create({
    data: {
      projectId: data.projectId,
      eventType: data.eventType,
      entityType: data.entityType,
      entityId: data.entityId,
      userId: data.userId ?? null,
      payload: data.payload as unknown as Prisma.InputJsonValue,
    },
  });
  return toAuditEventRecord(row);
}

/**
 * Lists a project's audit events (newest first), scoped to the owner. Returns
 * `[]` when the project does not exist or is not owned by `ownerId` — the
 * append-only counterpart to every other ownership-scoped list in this
 * package.
 */
export async function listAuditEventsForProject(
  projectId: MachineProjectId,
  ownerId: UserId,
): Promise<AuditEventRecord[]> {
  const id = parseId(projectId);
  const owner = parseId(ownerId);
  const rows = await prisma.auditEvent.findMany({
    where: { projectId: id, project: { ownerId: owner } },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
  });
  return rows.map(toAuditEventRecord);
}
