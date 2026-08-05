// Live-database tests for the append-only audit-event repository (Unit 2.4).
//
// Real PostgreSQL round trips; skips when the generated Prisma client is
// absent (see context/progress-tracker.md).

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { MachineProjectId, UserId } from "./types";

describe.skipIf(!liveDatabaseAvailable)(
  "audit-repository (live database)",
  () => {
    let audit: typeof import("./audit-repository");
    let projects: typeof import("./project-repository");
    let client: typeof import("../client");
    const createdUserIds: string[] = [];

    async function scaffold(): Promise<{
      ownerId: UserId;
      projectId: MachineProjectId;
    }> {
      const user = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(user.id);
      const project = await projects.createProject({
        ownerId: user.id,
        name: "Axis",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      return { ownerId: user.id, projectId: project.id };
    }

    beforeAll(async () => {
      audit = await import("./audit-repository");
      projects = await import("./project-repository");
      client = await import("../client");
    });

    afterEach(async () => {
      if (createdUserIds.length > 0) {
        await client.prisma.user.deleteMany({
          where: { id: { in: createdUserIds.splice(0) } },
        });
      }
    });

    it("appends an audit event and returns the persisted record", async () => {
      const s = await scaffold();
      const event = await audit.appendAuditEvent({
        projectId: s.projectId,
        eventType: "calculation_run.created",
        entityType: "CalculationRun",
        entityId: "run-1",
        userId: s.ownerId,
        payload: { status: "pass" },
      });
      expect(event.projectId).toBe(s.projectId);
      expect(event.eventType).toBe("calculation_run.created");
      expect(event.entityId).toBe("run-1");
      expect(event.payload).toEqual({ status: "pass" });

      const row = await client.prisma.auditEvent.findUnique({
        where: { id: event.id },
      });
      expect(row?.entityType).toBe("CalculationRun");
    });

    it("rejects an invalid audit event", async () => {
      const s = await scaffold();
      await expect(
        audit.appendAuditEvent({
          projectId: s.projectId,
          // @ts-expect-error deliberately invalid eventType for this test
          eventType: "not_a_real_event",
          entityType: "CalculationRun",
          entityId: "run-1",
          payload: {},
        }),
      ).rejects.toMatchObject({ code: "invalid_input" });
    });

    it("cascades away when the owning project is deleted", async () => {
      const s = await scaffold();
      const event = await audit.appendAuditEvent({
        projectId: s.projectId,
        eventType: "calculation_run.created",
        entityType: "CalculationRun",
        entityId: "run-1",
        payload: {},
      });
      await projects.deleteProject(s.projectId, s.ownerId);
      const row = await client.prisma.auditEvent.findUnique({
        where: { id: event.id },
      });
      expect(row).toBeNull();
    });

    it("lists a project's audit events newest first, scoped to the owner (Unit 2.9)", async () => {
      const s = await scaffold();
      const first = await audit.appendAuditEvent({
        projectId: s.projectId,
        eventType: "calculation_run.created",
        entityType: "CalculationRun",
        entityId: "run-1",
        payload: {},
      });
      const second = await audit.appendAuditEvent({
        projectId: s.projectId,
        eventType: "machine_baseline.created",
        entityType: "MachineBaseline",
        entityId: "baseline-1",
        payload: { label: "Review 1" },
      });

      const listed = await audit.listAuditEventsForProject(
        s.projectId,
        s.ownerId,
      );
      expect(listed.map((e) => e.id)).toEqual([second.id, first.id]);
    });

    it("returns an empty list for a project not owned by the caller", async () => {
      const s = await scaffold();
      await audit.appendAuditEvent({
        projectId: s.projectId,
        eventType: "calculation_run.created",
        entityType: "CalculationRun",
        entityId: "run-1",
        payload: {},
      });
      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);

      expect(
        await audit.listAuditEventsForProject(s.projectId, stranger.id),
      ).toEqual([]);
    });
  },
);
