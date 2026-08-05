// Live-database tests for `createMachineLoadCase` (Unit 3.7).

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

describe.skipIf(!liveDatabaseAvailable)(
  "manage-load-cases (live database)",
  () => {
    let createMachineLoadCase: typeof import("./manage-load-cases").createMachineLoadCase;
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
      ({ createMachineLoadCase } = await import("./manage-load-cases"));
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

    it("creates a load case", async () => {
      const { ownerId, configurationId } = await fixture();

      const result = await createMachineLoadCase(
        {
          configurationId,
          category: "peak",
          label: "Peak acceleration",
          description: "Worst case.",
        },
        ownerId,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.loadCase.category).toBe("peak");
      expect(result.loadCase.label).toBe("Peak acceleration");
    });

    it("creates a load case with no description", async () => {
      const { ownerId, configurationId } = await fixture();

      const result = await createMachineLoadCase(
        { configurationId, category: "normal", label: "Normal" },
        ownerId,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.loadCase.description).toBeNull();
    });

    it("rejects an invalid category", async () => {
      const { ownerId, configurationId } = await fixture();

      const result = await createMachineLoadCase(
        { configurationId, category: "not_a_category" as never, label: "Bad" },
        ownerId,
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("invalid_input");
    });

    it("rejects a blank label", async () => {
      const { ownerId, configurationId } = await fixture();

      const result = await createMachineLoadCase(
        { configurationId, category: "holding", label: "  " },
        ownerId,
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("invalid_input");
    });

    it("rejects a configuration the caller does not own", async () => {
      const { configurationId } = await fixture();
      const strangerId = await newUser();

      const result = await createMachineLoadCase(
        { configurationId, category: "emergency_stop", label: "E-stop" },
        strangerId,
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");
    });
  },
);
