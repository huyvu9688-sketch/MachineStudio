// Live-database tests for `createMachineAssembly`/`renameMachineAssembly`
// (Unit 3.2), including the cross-configuration write rejection that
// mirrors the 2026-07-30 hardening pass's rule for every other write
// (context/progress-tracker.md Architecture Decisions: "target ownership
// plus configuration membership").

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

describe.skipIf(!liveDatabaseAvailable)("manage-assemblies (live database)", () => {
  let createMachineAssembly: typeof import("./manage-assemblies").createMachineAssembly;
  let renameMachineAssembly: typeof import("./manage-assemblies").renameMachineAssembly;
  let projects: typeof import("../../db/repositories/project-repository");
  let client: typeof import("../../db/client");
  const createdUserIds: string[] = [];

  interface Fixture {
    readonly ownerId: import("../../db/repositories/types").UserId;
    readonly configurationId: import("../../db/repositories/types").MachineConfigurationId;
  }

  async function newUser(): Promise<import("../../db/repositories/types").UserId> {
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
    ({ createMachineAssembly, renameMachineAssembly } = await import("./manage-assemblies"));
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

  it("creates a root assembly", async () => {
    const { ownerId, configurationId } = await fixture();

    const result = await createMachineAssembly(
      { configurationId, name: "X axis" },
      ownerId,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.assembly.name).toBe("X axis");
    expect(result.assembly.parentId).toBeNull();
    expect(result.assembly.configurationId).toBe(configurationId);
  });

  it("creates a nested assembly under a real parent in the same configuration", async () => {
    const { ownerId, configurationId } = await fixture();
    const root = await createMachineAssembly({ configurationId, name: "X axis" }, ownerId);
    if (!root.ok) throw new Error("fixture setup failed");

    const child = await createMachineAssembly(
      { configurationId, parentId: root.assembly.id, name: "Drive train" },
      ownerId,
    );

    expect(child.ok).toBe(true);
    if (!child.ok) return;
    expect(child.assembly.parentId).toBe(root.assembly.id);
  });

  it("rejects a parent assembly from a different configuration", async () => {
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
    const foreignParent = await createMachineAssembly(
      { configurationId: otherConfig.id, name: "Foreign root" },
      ownerId,
    );
    if (!foreignParent.ok) throw new Error("fixture setup failed");

    const result = await createMachineAssembly(
      { configurationId, parentId: foreignParent.assembly.id, name: "Should fail" },
      ownerId,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unauthorized");
  });

  it("rejects a configuration the caller does not own", async () => {
    const { configurationId } = await fixture();
    const strangerId = await newUser();

    const result = await createMachineAssembly(
      { configurationId, name: "Should fail" },
      strangerId,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unauthorized");
  });

  it("rejects a blank assembly name", async () => {
    const { ownerId, configurationId } = await fixture();

    const result = await createMachineAssembly({ configurationId, name: "  " }, ownerId);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_input");
  });

  it("renames an assembly owned by the caller", async () => {
    const { ownerId, configurationId } = await fixture();
    const created = await createMachineAssembly({ configurationId, name: "Original" }, ownerId);
    if (!created.ok) throw new Error("fixture setup failed");

    const result = await renameMachineAssembly(created.assembly.id, "Renamed", ownerId);

    expect(result.ok).toBe(true);
    const tree = await projects.loadConfigurationTree(configurationId, ownerId);
    expect(tree?.assemblies[0]?.name).toBe("Renamed");
  });

  it("rejects renaming an assembly by someone other than the owner", async () => {
    const { ownerId, configurationId } = await fixture();
    const strangerId = await newUser();
    const created = await createMachineAssembly({ configurationId, name: "Original" }, ownerId);
    if (!created.ok) throw new Error("fixture setup failed");

    const result = await renameMachineAssembly(created.assembly.id, "Hijacked", strangerId);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("not_found");
  });
});
