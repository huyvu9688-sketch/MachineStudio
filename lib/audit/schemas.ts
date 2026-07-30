// Structural (Zod) validation for the audit-event shape in ./types. Strict:
// unknown keys are rejected (context/code-standards.md "Validation").

import { z } from "zod";
import type { AuditEntityType, AuditEventInput, AuditEventType } from "./types";

const nonEmpty = z.string().trim().min(1);

const auditEventTypeSchema: z.ZodType<AuditEventType> = z.enum(["calculation_run.created"]);
const auditEntityTypeSchema: z.ZodType<AuditEntityType> = z.enum(["CalculationRun"]);

/** Validates an unknown value as a well-formed {@link AuditEventInput}. */
export const AuditEventInputSchema: z.ZodType<AuditEventInput> = z
  .object({
    projectId: nonEmpty,
    eventType: auditEventTypeSchema,
    entityType: auditEntityTypeSchema,
    entityId: nonEmpty,
    userId: nonEmpty.optional(),
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();

// --- Compile-time schema/interface parity guard -----------------------------

type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;

export type _AuditSchemaParity = Assert<
  MutuallyAssignable<AuditEventInput, z.infer<typeof AuditEventInputSchema>>
>;
