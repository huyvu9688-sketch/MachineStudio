// Live-database tests for the requirements repository (Unit 2.2).
//
// Like the other lib/db suites, this exercises a real PostgreSQL round trip and
// skips (rather than failing collection) when the generated Prisma client is
// absent — see context/progress-tracker.md. Covers the Unit 2.2 requirements
// concern: create + ownership isolation for Requirement, AcceptanceCriterion,
// DesignAssumption, and LoadCase.

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { MachineConfigurationId, UserId } from "./types";

describe.skipIf(!liveDatabaseAvailable)(
  "requirements-repository (live database)",
  () => {
    let repo: typeof import("./requirements-repository");
    let projects: typeof import("./project-repository");
    let client: typeof import("../client");
    const createdUserIds: string[] = [];

    async function newOwner(): Promise<UserId> {
      const user = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(user.id);
      return user.id;
    }

    // Creates an owned project + configuration, returning the configuration id.
    async function newConfiguration(
      ownerId: UserId,
    ): Promise<MachineConfigurationId> {
      const project = await projects.createProject({
        ownerId,
        name: "Axis",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const config = await projects.createConfiguration({
        projectId: project.id,
        name: "Baseline",
      });
      return config.id;
    }

    beforeAll(async () => {
      repo = await import("./requirements-repository");
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

    it("creates requirements with acceptance criteria and loads them back", async () => {
      const ownerId = await newOwner();
      const configId = await newConfiguration(ownerId);

      const requirement = await repo.createRequirement({
        configurationId: configId,
        code: "REQ-01",
        statement: "Axis positions the payload within 0.1 mm.",
      });
      await repo.createAcceptanceCriterion({
        requirementId: requirement.id,
        statement: "Measured settle position within tolerance over 100 cycles.",
      });
      await repo.createAcceptanceCriterion({
        requirementId: requirement.id,
        statement: "No missed steps at peak acceleration.",
      });

      const loaded = await repo.listRequirements(configId, ownerId);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].code).toBe("REQ-01");
      expect(loaded[0].assemblyId).toBeNull();
      expect(loaded[0].acceptanceCriteria).toHaveLength(2);
    });

    it("creates design assumptions and load cases, scoped to the owner", async () => {
      const ownerId = await newOwner();
      const configId = await newConfiguration(ownerId);

      await repo.createDesignAssumption({
        configurationId: configId,
        statement: "Guideway friction coefficient 0.005.",
        rationale: "Manufacturer datasheet, lubricated.",
      });
      await repo.createLoadCase({
        configurationId: configId,
        category: "peak",
        label: "Peak acceleration",
        description: "Worst-case start of move.",
      });
      await repo.createLoadCase({
        configurationId: configId,
        category: "holding",
        label: "Vertical hold",
      });

      const assumptions = await repo.listDesignAssumptions(configId, ownerId);
      expect(assumptions).toHaveLength(1);
      expect(assumptions[0].rationale).toBe(
        "Manufacturer datasheet, lubricated.",
      );

      const loadCases = await repo.listLoadCases(configId, ownerId);
      expect(loadCases.map((c) => c.category).sort()).toEqual([
        "holding",
        "peak",
      ]);
    });

    it("enforces ownership isolation on the requirements reads", async () => {
      const ownerId = await newOwner();
      const configId = await newConfiguration(ownerId);
      await repo.createRequirement({
        configurationId: configId,
        code: "REQ-01",
        statement: "Owned requirement.",
      });
      await repo.createLoadCase({
        configurationId: configId,
        category: "normal",
        label: "Normal",
      });

      const strangerId = asUserId(`test-user-${randomUUID()}`);
      // A stranger sees nothing, even with the real configuration id.
      expect(await repo.listRequirements(configId, strangerId)).toHaveLength(0);
      expect(await repo.listLoadCases(configId, strangerId)).toHaveLength(0);
      expect(
        await repo.listDesignAssumptions(configId, strangerId),
      ).toHaveLength(0);
      // The real owner still sees them.
      expect(await repo.listRequirements(configId, ownerId)).toHaveLength(1);
    });

    it("loads a single requirement scoped to the owner", async () => {
      const ownerId = await newOwner();
      const configId = await newConfiguration(ownerId);
      const requirement = await repo.createRequirement({
        configurationId: configId,
        code: "REQ-01",
        statement: "Owned requirement.",
      });

      expect(
        await repo.loadRequirementForOwner(requirement.id, ownerId),
      ).not.toBeNull();

      const strangerId = asUserId(`test-user-${randomUUID()}`);
      expect(
        await repo.loadRequirementForOwner(requirement.id, strangerId),
      ).toBeNull();
    });

    it("rejects invalid input at the persistence boundary", async () => {
      const ownerId = await newOwner();
      const configId = await newConfiguration(ownerId);
      await expect(
        repo.createRequirement({
          configurationId: configId,
          code: "   ",
          statement: "blank code",
        }),
      ).rejects.toBeInstanceOf(repo.RequirementsRepositoryError);
    });
  },
);

function asUserId(id: string): UserId {
  return id as UserId;
}
