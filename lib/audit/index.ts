// lib/audit owns append-only engineering audit event definitions
// (context/architecture.md "lib/audit/"). Persistence lives in
// lib/db/repositories/audit-repository.ts — the only boundary allowed to
// import Prisma.

export type { AuditEntityType, AuditEventInput, AuditEventType } from "./types";
export { AuditEventInputSchema } from "./schemas";
