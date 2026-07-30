// Domain-facing contracts for the audit-event repository (Unit 2.4).
//
// Mirrors lib/audit's `AuditEventInput` with the persistence layer's branded
// IDs in place of plain strings, matching the convention every other
// repository input/record pair follows (context/code-standards.md: "Stable
// identifiers use branded string types where practical").

import type { AuditEntityType, AuditEventType } from "../../audit";
import type { MachineProjectId, UserId } from "./types";

/** An `AuditEvent` ID. */
export type AuditEventId = string & { readonly __brand: "AuditEventId" };

/** Casts a raw string to an {@link AuditEventId}. Identity at runtime. */
export function asAuditEventId(id: string): AuditEventId {
  return id as AuditEventId;
}

/** A persisted `AuditEvent` row. Append-only — no update path is exposed. */
export interface AuditEventRecord {
  readonly id: AuditEventId;
  readonly projectId: MachineProjectId;
  readonly eventType: AuditEventType;
  readonly entityType: AuditEntityType;
  readonly entityId: string;
  readonly userId: UserId | null;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly occurredAt: Date;
}

/** Input to append a new `AuditEvent`. */
export interface CreateAuditEventInput {
  readonly projectId: MachineProjectId;
  readonly eventType: AuditEventType;
  readonly entityType: AuditEntityType;
  readonly entityId: string;
  readonly userId?: UserId;
  readonly payload: Readonly<Record<string, unknown>>;
}
