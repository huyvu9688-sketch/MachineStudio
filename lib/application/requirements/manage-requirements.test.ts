// Live-database tests for `createMachineRequirement`/
// `createRequirementAcceptanceCriterion` (Unit 3.7), including the cross-
// configuration write rejection the 2026-07-30 hardening pass established
// for every other write (context/progress-tracker.md Architecture
// Decisions: "target ownership plus configuration membership") — applied
// here the same way `createMachineAssembly`/`createMachineDesignAssumption`
// apply it, per this file's own header reasoning.

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

describe.skipIf(!liveDatabaseAvailable)(
  "manage-requirements (live database)",
  () => {
    let createMachineRequirement: typeof import("./manage-requirements").createMachineRequirement;
    let createRequirementAcceptanceCriterion: typeof import("./manage-requirements").createRequirementAcceptanceCriterion;
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
      ({ createMachineRequirement, createRequirementAcceptanceCriterion } =
        await import("./manage-requirements"));
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

    it("creates a machine-level requirement", async () => {
      const { ownerId, configurationId } = await fixture();

      const result = await createMachineRequirement(
        {
          configurationId,
          code: "REQ-01",
          statement: "Positions within 0.1 mm.",
        },
        ownerId,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.requirement.code).toBe("REQ-01");
      expect(result.requirement.assemblyId).toBeNull();
    });

    it("creates an assembly-scoped requirement in the same configuration", async () => {
      const { ownerId, configurationId } = await fixture();
      const assembly = await projects.createAssembly({
        configurationId,
        name: "X axis",
      });

      const result = await createMachineRequirement(
        {
          configurationId,
          assemblyId: assembly.id,
          code: "REQ-02",
          statement: "Holds under load.",
        },
        ownerId,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.requirement.assemblyId).toBe(assembly.id);
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

      const result = await createMachineRequirement(
        {
          configurationId,
          assemblyId: foreignAssembly.id,
          code: "REQ-03",
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

      const result = await createMachineRequirement(
        { configurationId, code: "REQ-04", statement: "Should fail." },
        strangerId,
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");
    });

    it("rejects a blank code or statement", async () => {
      const { ownerId, configurationId } = await fixture();

      const blankCode = await createMachineRequirement(
        { configurationId, code: "  ", statement: "Fine." },
        ownerId,
      );
      expect(blankCode.ok).toBe(false);
      if (!blankCode.ok) expect(blankCode.error.code).toBe("invalid_input");

      const blankStatement = await createMachineRequirement(
        { configurationId, code: "REQ-05", statement: "   " },
        ownerId,
      );
      expect(blankStatement.ok).toBe(false);
      if (!blankStatement.ok)
        expect(blankStatement.error.code).toBe("invalid_input");
    });

    it("adds an acceptance criterion to an owned requirement", async () => {
      const { ownerId, configurationId } = await fixture();
      const requirement = await createMachineRequirement(
        { configurationId, code: "REQ-06", statement: "Base statement." },
        ownerId,
      );
      if (!requirement.ok) throw new Error("fixture setup failed");

      const result = await createRequirementAcceptanceCriterion(
        {
          requirementId: requirement.requirement.id,
          statement: "Measured within tolerance.",
        },
        ownerId,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.acceptanceCriterion.requirementId).toBe(
        requirement.requirement.id,
      );
    });

    it("rejects an acceptance criterion on a requirement not owned by the caller", async () => {
      const { ownerId, configurationId } = await fixture();
      const strangerId = await newUser();
      const requirement = await createMachineRequirement(
        { configurationId, code: "REQ-07", statement: "Base statement." },
        ownerId,
      );
      if (!requirement.ok) throw new Error("fixture setup failed");

      const result = await createRequirementAcceptanceCriterion(
        { requirementId: requirement.requirement.id, statement: "Hijacked." },
        strangerId,
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");
    });
  },
);
