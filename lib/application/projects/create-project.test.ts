// Live-database tests for `createMachineProject` (Unit 3.2). Proves the
// atomic project-plus-initial-configuration creation and the market-profile
// validation against the real SOURCE_REGISTRY, rather than a hardcoded pair
// of literals.

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

describe.skipIf(!liveDatabaseAvailable)("createMachineProject (live database)", () => {
  let createMachineProject: typeof import("./create-project").createMachineProject;
  let INITIAL_CONFIGURATION_NAME: typeof import("./create-project").INITIAL_CONFIGURATION_NAME;
  let projects: typeof import("../../db/repositories/project-repository");
  let client: typeof import("../../db/client");
  const createdUserIds: string[] = [];

  async function newUser(): Promise<import("../../db/repositories/types").UserId> {
    const user = await projects.upsertUser(`test-user-${randomUUID()}`);
    createdUserIds.push(user.id);
    return user.id;
  }

  beforeAll(async () => {
    ({ createMachineProject, INITIAL_CONFIGURATION_NAME } = await import("./create-project"));
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

  it("creates a project with exactly one initial configuration, atomically", async () => {
    const ownerId = await newUser();

    const result = await createMachineProject(
      { name: "Palletizer axis", marketProfileKey: "US-General-Industrial-Machinery@1" },
      ownerId,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.name).toBe("Palletizer axis");
    expect(result.project.ownerId).toBe(ownerId);
    expect(result.configuration.name).toBe(INITIAL_CONFIGURATION_NAME);
    expect(result.configuration.projectId).toBe(result.project.id);

    const tree = await projects.loadProjectTree(result.project.id, ownerId);
    expect(tree?.configurations).toHaveLength(1);
    expect(tree?.configurations[0]?.id).toBe(result.configuration.id);
  });

  it("rejects an unreleased market profile key without writing anything", async () => {
    const ownerId = await newUser();

    const result = await createMachineProject(
      { name: "Bad profile", marketProfileKey: "EU-Nonexistent-Profile@1" },
      ownerId,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unknown_market_profile");
    expect(await projects.listProjectsByOwner(ownerId)).toHaveLength(0);
  });

  it("rejects a blank project name", async () => {
    const ownerId = await newUser();

    const result = await createMachineProject(
      { name: "   ", marketProfileKey: "US-General-Industrial-Machinery@1" },
      ownerId,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_input");
  });
});
