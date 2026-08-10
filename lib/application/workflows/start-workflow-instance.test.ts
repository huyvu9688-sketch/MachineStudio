// Live-database tests for `startWorkflowInstance` (Unit 4.9): only a
// workflow definition actually registered in lib/workflows can be started,
// and the caller must own the target configuration.

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

describe.skipIf(!liveDatabaseAvailable)(
  "startWorkflowInstance (live database)",
  () => {
    let startWorkflowInstance: typeof import("./start-workflow-instance").startWorkflowInstance;
    let projects: typeof import("../../db/repositories/project-repository");
    let client: typeof import("../../db/client");
    const createdUserIds: string[] = [];

    interface Fixture {
      readonly ownerId: import("../../db/repositories/types").UserId;
      readonly configurationId: import("../../db/repositories/types").MachineConfigurationId;
    }

    async function newUser(): Promise<
      import("../../db/repositories/types").UserId
    > {
      const user = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(user.id);
      return user.id;
    }

    async function fixture(): Promise<Fixture> {
      const ownerId = await newUser();
      const project = await projects.createProject({
        ownerId,
        name: "Axis",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const configuration = await projects.createConfiguration({
        projectId: project.id,
        name: "cfg",
      });
      return { ownerId, configurationId: configuration.id };
    }

    beforeAll(async () => {
      ({ startWorkflowInstance } = await import("./start-workflow-instance"));
      projects = await import("../../db/repositories/project-repository");
      client = await import("../../db/client");
    });

    afterEach(async () => {
      if (createdUserIds.length > 0) {
        await client.prisma.user.deleteMany({
          where: { id: { in: createdUserIds.splice(0) } },
        });
      }
    });

    it("starts an instance of a registered workflow definition", async () => {
      const { ownerId, configurationId } = await fixture();

      const result = await startWorkflowInstance(
        {
          configurationId,
          workflowId: "linear-axis",
          workflowVersion: "1.0.0",
        },
        ownerId,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.workflowInstance.workflowId).toBe("linear-axis");
      expect(result.workflowInstance.workflowVersion).toBe("1.0.0");
      expect(result.workflowInstance.status).toBe("draft");
    });

    it("rejects an unregistered workflow id/version", async () => {
      const { ownerId, configurationId } = await fixture();

      const result = await startWorkflowInstance(
        {
          configurationId,
          workflowId: "not-a-real-workflow",
          workflowVersion: "9.9.9",
        },
        ownerId,
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("workflow_not_found");
    });

    it("rejects a configuration the caller does not own", async () => {
      const { configurationId } = await fixture();
      const strangerId = await newUser();

      const result = await startWorkflowInstance(
        {
          configurationId,
          workflowId: "linear-axis",
          workflowVersion: "1.0.0",
        },
        strangerId,
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");
    });
  },
);
