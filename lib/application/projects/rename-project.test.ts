// Live-database tests for `renameMachineProject` (Unit 3.2).

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

describe.skipIf(!liveDatabaseAvailable)("renameMachineProject (live database)", () => {
  let renameMachineProject: typeof import("./rename-project").renameMachineProject;
  let projects: typeof import("../../db/repositories/project-repository");
  let client: typeof import("../../db/client");
  const createdUserIds: string[] = [];

  async function newUser(): Promise<import("../../db/repositories/types").UserId> {
    const user = await projects.upsertUser(`test-user-${randomUUID()}`);
    createdUserIds.push(user.id);
    return user.id;
  }

  beforeAll(async () => {
    ({ renameMachineProject } = await import("./rename-project"));
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

  it("renames a project owned by the caller", async () => {
    const ownerId = await newUser();
    const project = await projects.createProject({
      ownerId,
      name: "Original",
      marketProfileKey: "US-General-Industrial-Machinery@1",
    });

    const result = await renameMachineProject(project.id, "Renamed", ownerId);

    expect(result.ok).toBe(true);
    const tree = await projects.loadProjectTree(project.id, ownerId);
    expect(tree?.name).toBe("Renamed");
  });

  it("rejects a rename by someone other than the owner", async () => {
    const ownerId = await newUser();
    const strangerId = await newUser();
    const project = await projects.createProject({
      ownerId,
      name: "Original",
      marketProfileKey: "US-General-Industrial-Machinery@1",
    });

    const result = await renameMachineProject(project.id, "Hijacked", strangerId);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("not_found");
    expect((await projects.loadProjectTree(project.id, ownerId))?.name).toBe("Original");
  });

  it("rejects a blank name", async () => {
    const ownerId = await newUser();
    const project = await projects.createProject({
      ownerId,
      name: "Original",
      marketProfileKey: "US-General-Industrial-Machinery@1",
    });

    const result = await renameMachineProject(project.id, "   ", ownerId);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_input");
  });
});
