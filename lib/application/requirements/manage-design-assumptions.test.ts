// Live-database tests for `createMachineDesignAssumption` (Unit 3.7), same
// "target ownership plus configuration membership" shape as
// manage-requirements.test.ts.

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

describe.skipIf(!liveDatabaseAvailable)(
  "manage-design-assumptions (live database)",
  () => {
    let createMachineDesignAssumption: typeof import("./manage-design-assumptions").createMachineDesignAssumption;
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
      ({ createMachineDesignAssumption } =
        await import("./manage-design-assumptions"));
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

    it("creates a machine-level design assumption", async () => {
      const { ownerId, configurationId } = await fixture();

      const result = await createMachineDesignAssumption(
        {
          configurationId,
          statement: "Guideway friction coefficient 0.005.",
          rationale: "Manufacturer datasheet.",
        },
        ownerId,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.designAssumption.assemblyId).toBeNull();
      expect(result.designAssumption.rationale).toBe("Manufacturer datasheet.");
    });

    it("creates an assembly-scoped design assumption in the same configuration", async () => {
      const { ownerId, configurationId } = await fixture();
      const assembly = await projects.createAssembly({
        configurationId,
        name: "X axis",
      });

      const result = await createMachineDesignAssumption(
        {
          configurationId,
          assemblyId: assembly.id,
          statement: "Local assumption.",
        },
        ownerId,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.designAssumption.assemblyId).toBe(assembly.id);
      expect(result.designAssumption.rationale).toBeNull();
    });

    it("rejects an assembly from a different configuration", async () => {
      const { ownerId, configurationId } = await fixture();
      const otherProject = await projects.createProject({
        ownerId,
        name: "Other project",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const otherConfig = await projects.createConfiguration({
        projectId: otherProject.id,
        name: "other cfg",
      });
      const foreignAssembly = await projects.createAssembly({
        configurationId: otherConfig.id,
        name: "Foreign",
      });

      const result = await createMachineDesignAssumption(
        {
          configurationId,
          assemblyId: foreignAssembly.id,
          statement: "Should fail.",
        },
        ownerId,
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");
    });

    it("rejects a configuration the caller does not own", async () => {
      const { configurationId } = await fixture();
      const strangerId = await newUser();

      const result = await createMachineDesignAssumption(
        { configurationId, statement: "Should fail." },
        strangerId,
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");
    });

    it("rejects a blank statement", async () => {
      const { ownerId, configurationId } = await fixture();

      const result = await createMachineDesignAssumption(
        { configurationId, statement: "   " },
        ownerId,
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("invalid_input");
    });
  },
);
