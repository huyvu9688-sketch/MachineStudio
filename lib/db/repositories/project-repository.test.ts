// Live-database tests for the project-hierarchy repository (Unit 2.1).
//
// Like lib/db/health.test.ts, this exercises a real PostgreSQL round trip,
// so it depends on (1) the generated Prisma client existing and (2)
// DATABASE_URL pointing at a reachable, migrated database (docker-compose.yml
// locally; the postgres service container in CI). When the generated client
// is absent the whole suite skips rather than failing collection — see
// context/progress-tracker.md.
//
// Covers the Unit 2.1 test plan: ownership constraints, parent/child assembly
// hierarchy, module package ID/version persistence, and deletion behavior.

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const generatedClientAvailable = existsSync(
  join(here, "..", "generated", "prisma"),
);

describe.skipIf(!generatedClientAvailable)(
  "project-repository (live database)",
  () => {
    let repo: typeof import("./project-repository");
    let client: typeof import("../client");
    const createdUserIds: string[] = [];

    // Register a freshly-created user so afterEach can cascade-delete
    // everything below it. Returns the branded id.
    async function newUser(): Promise<import("./types").UserId> {
      const user = await repo.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(user.id);
      return user.id;
    }

    beforeAll(async () => {
      repo = await import("./project-repository");
      client = await import("../client");
    });

    afterEach(async () => {
      if (createdUserIds.length > 0) {
        // Deleting the owning users cascades to their projects and the
        // entire subtree, keeping tests isolated and idempotent.
        await client.prisma.user.deleteMany({
          where: { id: { in: createdUserIds.splice(0) } },
        });
      }
    });

    it("creates and loads a full project tree through repository interfaces", async () => {
      const ownerId = await newUser();
      const project = await repo.createProject({
        ownerId,
        name: "Palletizer axis",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const config = await repo.createConfiguration({
        projectId: project.id,
        name: "Baseline configuration",
      });
      const workflow = await repo.createWorkflowInstance({
        configurationId: config.id,
        workflowId: "linear-axis",
        workflowVersion: "1.0.0",
      });
      const root = await repo.createAssembly({
        configurationId: config.id,
        name: "X axis",
      });
      const child = await repo.createAssembly({
        configurationId: config.id,
        parentId: root.id,
        name: "Drive train",
      });
      const grandchild = await repo.createAssembly({
        configurationId: config.id,
        parentId: child.id,
        name: "Screw support",
      });
      const moduleInstance = await repo.createModuleInstance({
        assemblyId: grandchild.id,
        workflowInstanceId: workflow.id,
        modulePackageId: "example-linear-thrust",
        moduleVersion: "0.1.0",
        label: "Thrust check",
      });

      const tree = await repo.loadProjectTree(project.id, ownerId);
      expect(tree).not.toBeNull();
      if (tree === null) return; // narrow for TypeScript

      expect(tree.name).toBe("Palletizer axis");
      expect(tree.marketProfileKey).toBe("US-General-Industrial-Machinery@1");
      expect(tree.configurations).toHaveLength(1);

      const loadedConfig = tree.configurations[0];
      expect(loadedConfig.id).toBe(config.id);
      expect(loadedConfig.workflowInstances).toHaveLength(1);
      expect(loadedConfig.workflowInstances[0].workflowId).toBe("linear-axis");
      expect(loadedConfig.workflowInstances[0].status).toBe("draft");

      // Parent/child assembly hierarchy is reconstructed by parentId.
      expect(loadedConfig.assemblies).toHaveLength(1);
      const loadedRoot = loadedConfig.assemblies[0];
      expect(loadedRoot.id).toBe(root.id);
      expect(loadedRoot.parentId).toBeNull();
      expect(loadedRoot.children).toHaveLength(1);

      const loadedChild = loadedRoot.children[0];
      expect(loadedChild.id).toBe(child.id);
      expect(loadedChild.parentId).toBe(root.id);
      expect(loadedChild.children).toHaveLength(1);

      const loadedGrandchild = loadedChild.children[0];
      expect(loadedGrandchild.id).toBe(grandchild.id);

      // Module package ID/version persistence.
      expect(loadedGrandchild.moduleInstances).toHaveLength(1);
      const loadedModule = loadedGrandchild.moduleInstances[0];
      expect(loadedModule.id).toBe(moduleInstance.id);
      expect(loadedModule.modulePackageId).toBe("example-linear-thrust");
      expect(loadedModule.moduleVersion).toBe("0.1.0");
      expect(loadedModule.workflowInstanceId).toBe(workflow.id);
    });

    it("enforces ownership: another user cannot load or list the project", async () => {
      const ownerId = await newUser();
      const project = await repo.createProject({
        ownerId,
        name: "Owned project",
        marketProfileKey: "JP-General-Industrial-Machinery@1",
      });

      const strangerId = repoAsUserId(`test-user-${randomUUID()}`);
      expect(await repo.loadProjectTree(project.id, strangerId)).toBeNull();
      expect(await repo.listProjectsByOwner(strangerId)).toHaveLength(0);

      // The real owner still sees it.
      const owned = await repo.listProjectsByOwner(ownerId);
      expect(owned.map((p) => p.id)).toContain(project.id);
    });

    it("rejects a project whose owner does not exist (FK ownership constraint)", async () => {
      await expect(
        repo.createProject({
          ownerId: repoAsUserId(`missing-user-${randomUUID()}`),
          name: "Orphan",
          marketProfileKey: "US-General-Industrial-Machinery@1",
        }),
      ).rejects.toThrow();
    });

    it("rejects invalid input at the persistence boundary", async () => {
      const ownerId = await newUser();
      await expect(
        repo.createProject({
          ownerId,
          name: "   ",
          marketProfileKey: "US-General-Industrial-Machinery@1",
        }),
      ).rejects.toBeInstanceOf(repo.ProjectRepositoryError);
    });

    it("deletes a project and cascades to the whole subtree", async () => {
      const ownerId = await newUser();
      const project = await repo.createProject({
        ownerId,
        name: "To delete",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const config = await repo.createConfiguration({
        projectId: project.id,
        name: "cfg",
      });
      const root = await repo.createAssembly({
        configurationId: config.id,
        name: "root",
      });
      const workflow = await repo.createWorkflowInstance({
        configurationId: config.id,
        workflowId: "linear-axis",
        workflowVersion: "1.0.0",
      });
      await repo.createModuleInstance({
        assemblyId: root.id,
        workflowInstanceId: workflow.id,
        modulePackageId: "example-linear-thrust",
        moduleVersion: "0.1.0",
        label: "m",
      });

      expect(await repo.deleteProject(project.id, ownerId)).toBe(true);
      expect(await repo.loadProjectTree(project.id, ownerId)).toBeNull();

      // Every descendant row is gone.
      expect(
        await client.prisma.machineConfiguration.count({
          where: { projectId: project.id },
        }),
      ).toBe(0);
      expect(
        await client.prisma.assembly.count({
          where: { configurationId: config.id },
        }),
      ).toBe(0);
      expect(
        await client.prisma.workflowInstance.count({
          where: { configurationId: config.id },
        }),
      ).toBe(0);
      expect(
        await client.prisma.moduleInstance.count({
          where: { assemblyId: root.id },
        }),
      ).toBe(0);

      // A second delete (and a wrong-owner delete) reports nothing removed.
      expect(await repo.deleteProject(project.id, ownerId)).toBe(false);
    });

    it("cascades when a parent assembly is deleted (self-referential hierarchy)", async () => {
      const ownerId = await newUser();
      const project = await repo.createProject({
        ownerId,
        name: "hierarchy",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const config = await repo.createConfiguration({
        projectId: project.id,
        name: "cfg",
      });
      const root = await repo.createAssembly({
        configurationId: config.id,
        name: "root",
      });
      const child = await repo.createAssembly({
        configurationId: config.id,
        parentId: root.id,
        name: "child",
      });
      await repo.createModuleInstance({
        assemblyId: child.id,
        modulePackageId: "example-linear-thrust",
        moduleVersion: "0.1.0",
        label: "m",
      });

      // Deleting the parent removes its descendants and their modules.
      await client.prisma.assembly.delete({ where: { id: root.id } });

      expect(
        await client.prisma.assembly.count({ where: { id: child.id } }),
      ).toBe(0);
      expect(
        await client.prisma.moduleInstance.count({
          where: { assemblyId: child.id },
        }),
      ).toBe(0);
    });

    it("detaches modules when their workflow instance is deleted (SetNull)", async () => {
      const ownerId = await newUser();
      const project = await repo.createProject({
        ownerId,
        name: "detach",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const config = await repo.createConfiguration({
        projectId: project.id,
        name: "cfg",
      });
      const root = await repo.createAssembly({
        configurationId: config.id,
        name: "root",
      });
      const workflow = await repo.createWorkflowInstance({
        configurationId: config.id,
        workflowId: "linear-axis",
        workflowVersion: "1.0.0",
      });
      const moduleInstance = await repo.createModuleInstance({
        assemblyId: root.id,
        workflowInstanceId: workflow.id,
        modulePackageId: "example-linear-thrust",
        moduleVersion: "0.1.0",
        label: "m",
      });

      await client.prisma.workflowInstance.delete({ where: { id: workflow.id } });

      const reloaded = await client.prisma.moduleInstance.findUnique({
        where: { id: moduleInstance.id },
      });
      expect(reloaded).not.toBeNull();
      expect(reloaded?.workflowInstanceId).toBeNull();
    });
  },
);

// Local narrow helper so the test file does not import the runtime module
// eagerly (env/prisma import is deferred to beforeAll, mirroring
// health.test.ts). Identity at runtime.
function repoAsUserId(id: string): import("./types").UserId {
  return id as import("./types").UserId;
}
