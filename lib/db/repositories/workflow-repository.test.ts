// Live-database tests for the workflow-instance repository (Unit 4.9).
// Same real-PostgreSQL round-trip convention as project-repository.test.ts:
// skips (rather than fails) when no live database is configured.

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

describe.skipIf(!liveDatabaseAvailable)(
  "workflow-repository (live database)",
  () => {
    let repo: typeof import("./workflow-repository");
    let projects: typeof import("./project-repository");
    let client: typeof import("../client");
    const createdUserIds: string[] = [];

    interface Fixture {
      readonly ownerId: import("./types").UserId;
      readonly configurationId: import("./types").MachineConfigurationId;
      readonly assemblyId: import("./types").AssemblyId;
    }

    async function newUser(): Promise<import("./types").UserId> {
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
      const assembly = await projects.createAssembly({
        configurationId: configuration.id,
        name: "X axis",
      });
      return {
        ownerId,
        configurationId: configuration.id,
        assemblyId: assembly.id,
      };
    }

    beforeAll(async () => {
      repo = await import("./workflow-repository");
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

    it("creates a workflow instance defaulting to draft status", async () => {
      const { ownerId, configurationId } = await fixture();

      const workflow = await repo.createWorkflowInstance({
        configurationId,
        workflowId: "linear-axis",
        workflowVersion: "1.0.0",
      });

      expect(workflow.workflowId).toBe("linear-axis");
      expect(workflow.workflowVersion).toBe("1.0.0");
      expect(workflow.status).toBe("draft");

      const loaded = await repo.loadWorkflowInstanceForOwner(
        workflow.id,
        ownerId,
      );
      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe(workflow.id);
    });

    it("returns null loading a workflow instance for a non-owner", async () => {
      const { configurationId } = await fixture();
      const stranger = await newUser();
      const workflow = await repo.createWorkflowInstance({
        configurationId,
        workflowId: "linear-axis",
        workflowVersion: "1.0.0",
      });

      expect(
        await repo.loadWorkflowInstanceForOwner(workflow.id, stranger),
      ).toBeNull();
    });

    it("lists only the module instances attached to a given workflow instance, scoped to owner", async () => {
      const { ownerId, configurationId, assemblyId } = await fixture();
      const workflow = await repo.createWorkflowInstance({
        configurationId,
        workflowId: "linear-axis",
        workflowVersion: "1.0.0",
      });
      const otherWorkflow = await repo.createWorkflowInstance({
        configurationId,
        workflowId: "linear-axis",
        workflowVersion: "1.0.0",
      });

      const attached = await projects.createModuleInstance({
        assemblyId,
        configurationId,
        workflowInstanceId: workflow.id,
        modulePackageId: "example-scaffold",
        moduleVersion: "0.1.0",
        label: "Attached",
      });
      await projects.createModuleInstance({
        assemblyId,
        configurationId,
        workflowInstanceId: otherWorkflow.id,
        modulePackageId: "example-scaffold",
        moduleVersion: "0.1.0",
        label: "Attached to a different workflow instance",
      });
      await projects.createModuleInstance({
        assemblyId,
        configurationId,
        modulePackageId: "example-scaffold",
        moduleVersion: "0.1.0",
        label: "Unattached",
      });

      const attachedInstances =
        await repo.listModuleInstancesForWorkflowInstance(workflow.id, ownerId);
      expect(attachedInstances.map((i) => i.id)).toEqual([attached.id]);
    });

    it("excludes an archived module instance even though it is still attached to the workflow instance", async () => {
      const { ownerId, configurationId, assemblyId } = await fixture();
      const workflow = await repo.createWorkflowInstance({
        configurationId,
        workflowId: "linear-axis",
        workflowVersion: "1.0.0",
      });
      const kept = await projects.createModuleInstance({
        assemblyId,
        configurationId,
        workflowInstanceId: workflow.id,
        modulePackageId: "example-scaffold",
        moduleVersion: "0.1.0",
        label: "Kept",
      });
      const archived = await projects.createModuleInstance({
        assemblyId,
        configurationId,
        workflowInstanceId: workflow.id,
        modulePackageId: "example-scaffold",
        moduleVersion: "0.1.0",
        label: "Archived",
      });
      const didArchive = await projects.archiveModuleInstance(
        archived.id,
        ownerId,
      );
      expect(didArchive).toBe(true);

      const attachedInstances =
        await repo.listModuleInstancesForWorkflowInstance(workflow.id, ownerId);
      expect(attachedInstances.map((i) => i.id)).toEqual([kept.id]);
    });

    it("returns an empty list for a non-owner", async () => {
      const { configurationId, assemblyId } = await fixture();
      const stranger = await newUser();
      const workflow = await repo.createWorkflowInstance({
        configurationId,
        workflowId: "linear-axis",
        workflowVersion: "1.0.0",
      });
      await projects.createModuleInstance({
        assemblyId,
        configurationId,
        workflowInstanceId: workflow.id,
        modulePackageId: "example-scaffold",
        moduleVersion: "0.1.0",
        label: "m",
      });

      expect(
        await repo.listModuleInstancesForWorkflowInstance(
          workflow.id,
          stranger,
        ),
      ).toEqual([]);
    });

    it("updates a workflow instance's persisted status", async () => {
      const { ownerId, configurationId } = await fixture();
      const workflow = await repo.createWorkflowInstance({
        configurationId,
        workflowId: "linear-axis",
        workflowVersion: "1.0.0",
      });

      await repo.updateWorkflowInstanceStatus(workflow.id, "active");

      const loaded = await repo.loadWorkflowInstanceForOwner(
        workflow.id,
        ownerId,
      );
      expect(loaded?.status).toBe("active");
    });
  },
);
