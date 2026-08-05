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
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

describe.skipIf(!liveDatabaseAvailable)(
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
        configurationId: config.id,
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

    it("rejects a module instance whose configurationId does not match its assembly's real configuration (design-risk follow-up, DB-level same-configuration constraint)", async () => {
      const ownerId = await newUser();
      const project = await repo.createProject({
        ownerId,
        name: "Two configs",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const configA = await repo.createConfiguration({
        projectId: project.id,
        name: "Config A",
      });
      const configB = await repo.createConfiguration({
        projectId: project.id,
        name: "Config B",
      });
      const assemblyInA = await repo.createAssembly({
        configurationId: configA.id,
        name: "Assembly in A",
      });

      // assemblyInA genuinely belongs to configA — claiming configB here is
      // exactly the bug the 2026-07-30 hardening pass closed at the service
      // boundary; this proves the database itself now also refuses it via
      // the composite foreign key on module_instances.assembly, not just a
      // well-behaved caller's own checks.
      await expect(
        repo.createModuleInstance({
          assemblyId: assemblyInA.id,
          configurationId: configB.id,
          modulePackageId: "example-linear-thrust",
          moduleVersion: "0.1.0",
          label: "Mismatched",
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
        configurationId: config.id,
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
        configurationId: config.id,
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
        configurationId: config.id,
        workflowInstanceId: workflow.id,
        modulePackageId: "example-linear-thrust",
        moduleVersion: "0.1.0",
        label: "m",
      });

      await client.prisma.workflowInstance.delete({
        where: { id: workflow.id },
      });

      const reloaded = await client.prisma.moduleInstance.findUnique({
        where: { id: moduleInstance.id },
      });
      expect(reloaded).not.toBeNull();
      expect(reloaded?.workflowInstanceId).toBeNull();
    });

    it("renames a project owned by the caller, and reports false for a wrong owner or unknown id (Unit 3.2)", async () => {
      const ownerId = await newUser();
      const strangerId = await newUser();
      const project = await repo.createProject({
        ownerId,
        name: "Original name",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });

      expect(await repo.renameProject(project.id, ownerId, "Renamed")).toBe(
        true,
      );
      const reloaded = await repo.loadProjectTree(project.id, ownerId);
      expect(reloaded?.name).toBe("Renamed");

      expect(await repo.renameProject(project.id, strangerId, "Hijacked")).toBe(
        false,
      );
      expect((await repo.loadProjectTree(project.id, ownerId))?.name).toBe(
        "Renamed",
      );

      expect(
        await repo.renameProject(
          repoAsMachineProjectId(`unknown-${randomUUID()}`),
          ownerId,
          "Nothing",
        ),
      ).toBe(false);
    });

    it("renames an assembly owned by the caller, and reports false for a wrong owner or unknown id (Unit 3.2)", async () => {
      const ownerId = await newUser();
      const strangerId = await newUser();
      const project = await repo.createProject({
        ownerId,
        name: "Axis",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const config = await repo.createConfiguration({
        projectId: project.id,
        name: "cfg",
      });
      const assembly = await repo.createAssembly({
        configurationId: config.id,
        name: "Original",
      });

      expect(
        await repo.renameAssembly(assembly.id, ownerId, "Renamed assembly"),
      ).toBe(true);
      const reloaded = await repo.loadConfigurationTree(config.id, ownerId);
      expect(reloaded?.assemblies[0]?.name).toBe("Renamed assembly");

      expect(
        await repo.renameAssembly(assembly.id, strangerId, "Hijacked"),
      ).toBe(false);
      expect(
        (await repo.loadConfigurationTree(config.id, ownerId))?.assemblies[0]
          ?.name,
      ).toBe("Renamed assembly");
    });
  },
);

// Local narrow helper so the test file does not import the runtime module
// eagerly (env/prisma import is deferred to beforeAll, mirroring
// health.test.ts). Identity at runtime.
function repoAsUserId(id: string): import("./types").UserId {
  return id as import("./types").UserId;
}
function repoAsMachineProjectId(
  id: string,
): import("./types").MachineProjectId {
  return id as import("./types").MachineProjectId;
}
