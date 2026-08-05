// Live-database tests for `addModuleInstance` (Unit 3.2): only a module
// package actually registered in lib/modules can be instantiated, and the
// same cross-configuration-write rejection applies as every other write.

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

describe.skipIf(!liveDatabaseAvailable)(
  "addModuleInstance (live database)",
  () => {
    let addModuleInstance: typeof import("./add-module-instance").addModuleInstance;
    let projects: typeof import("../../db/repositories/project-repository");
    let client: typeof import("../../db/client");
    const createdUserIds: string[] = [];

    interface Fixture {
      readonly ownerId: import("../../db/repositories/types").UserId;
      readonly configurationId: import("../../db/repositories/types").MachineConfigurationId;
      readonly assemblyId: import("../../db/repositories/types").AssemblyId;
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
      ({ addModuleInstance } = await import("./add-module-instance"));
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

    it("adds a module instance from a registered module package", async () => {
      const { ownerId, configurationId, assemblyId } = await fixture();

      const result = await addModuleInstance(
        {
          assemblyId,
          configurationId,
          modulePackageId: "example-scaffold",
          moduleVersion: "0.1.0",
          label: "Thrust check",
        },
        ownerId,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.moduleInstance.modulePackageId).toBe("example-scaffold");
      expect(result.moduleInstance.moduleVersion).toBe("0.1.0");
      expect(result.moduleInstance.label).toBe("Thrust check");
    });

    it("rejects an unregistered module package id/version", async () => {
      const { ownerId, configurationId, assemblyId } = await fixture();

      const result = await addModuleInstance(
        {
          assemblyId,
          configurationId,
          modulePackageId: "not-a-real-module",
          moduleVersion: "9.9.9",
          label: "Should fail",
        },
        ownerId,
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("module_not_found");
    });

    it("rejects an assembly from a different configuration", async () => {
      const { ownerId, assemblyId } = await fixture();
      const otherProject = await projects.createProject({
        ownerId,
        name: "Other project",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const otherConfig = await projects.createConfiguration({
        projectId: otherProject.id,
        name: "other cfg",
      });

      const result = await addModuleInstance(
        {
          assemblyId,
          configurationId: otherConfig.id,
          modulePackageId: "example-scaffold",
          moduleVersion: "0.1.0",
          label: "Should fail",
        },
        ownerId,
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");
    });

    it("rejects an assembly the caller does not own", async () => {
      const { configurationId, assemblyId } = await fixture();
      const strangerId = await newUser();

      const result = await addModuleInstance(
        {
          assemblyId,
          configurationId,
          modulePackageId: "example-scaffold",
          moduleVersion: "0.1.0",
          label: "Should fail",
        },
        strangerId,
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");
    });

    it("rejects a blank label", async () => {
      const { ownerId, configurationId, assemblyId } = await fixture();

      const result = await addModuleInstance(
        {
          assemblyId,
          configurationId,
          modulePackageId: "example-scaffold",
          moduleVersion: "0.1.0",
          label: "   ",
        },
        ownerId,
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("invalid_input");
    });
  },
);
