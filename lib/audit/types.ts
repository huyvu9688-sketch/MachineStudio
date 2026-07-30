// Append-only engineering audit event definitions (Unit 2.4;
// context/architecture.md "lib/audit/": "Append-only engineering event
// records"). lib/audit owns the domain shape only — it never imports Prisma;
// persistence is lib/db/repositories/audit-repository.ts, the only boundary
// allowed to import it (context/architecture.md "lib/db/"). The full audit
// *service* (query surfaces, `ChangeReason`, baseline integration) is Unit
// 2.9 — this is deliberately the minimal shape Unit 2.4's "append an audit
// event" step needs.

/**
 * Stable, dotted audit-event type. Extend this union as new mutations need
 * recording; never change the meaning of an existing value (immutable
 * records read this back verbatim).
 */
export type AuditEventType = "calculation_run.created" | "machine_baseline.created";

/** The kind of record an audit event concerns. */
export type AuditEntityType = "CalculationRun" | "MachineBaseline";

/**
 * An engineering audit event to append. Once written, an audit event is
 * never edited or deleted (invariant "append-only" — the same append-only
 * intent as immutable calculation runs, context/architecture.md invariant 7,
 * applied to the audit log).
 */
export interface AuditEventInput {
  /** Owning project, so the event cascades and lists with it. */
  readonly projectId: string;
  readonly eventType: AuditEventType;
  readonly entityType: AuditEntityType;
  readonly entityId: string;
  /** Clerk user ID of who performed the action; omitted when unattributed. */
  readonly userId?: string;
  /**
   * Small descriptive summary. Never the full engineering snapshot — that
   * stays on the entity's own immutable record (e.g. `CalculationRun.snapshot`).
   */
  readonly payload: Readonly<Record<string, unknown>>;
}
