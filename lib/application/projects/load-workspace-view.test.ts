// Live-database tests for `loadWorkspaceView` (Unit 3.1). Proves the unit's
// literal exit criterion — "Database-backed project tree renders for the
// authenticated owner" — at the data layer: an owner with no projects gets
// the empty case, an owner with projects gets their list plus one full
// tree, project selection defaults sensibly, and ownership stays scoped.
//
// Real PostgreSQL round trips; skips when the generated Prisma client or
// DATABASE_URL is absent (see context/progress-tracker.md).

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

describe.skipIf(!liveDatabaseAvailable)(
  "loadWorkspaceView (live database)",
  () => {
    let loadWorkspaceView: typeof import("./load-workspace-view").loadWorkspaceView;
    let repo: typeof import("../../db/repositories/project-repository");
    let client: typeof import("../../db/client");
    const createdUserIds: string[] = [];

    async function newUser(): Promise<
      import("../../db/repositories/types").UserId
    > {
      const user = await repo.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(user.id);
      return user.id;
    }

    beforeAll(async () => {
      ({ loadWorkspaceView } = await import("./load-workspace-view"));
      repo = await import("../../db/repositories/project-repository");
      client = await import("../../db/client");
    });

    afterEach(async () => {
      if (createdUserIds.length > 0) {
        await client.prisma.user.deleteMany({
          where: { id: { in: createdUserIds.splice(0) } },
        });
      }
    });

    it("returns an empty view for an owner with no projects", async () => {
      const ownerId = await newUser();

      const view = await loadWorkspaceView(ownerId);

      expect(view.projects).toEqual([]);
      expect(view.selectedProject).toBeNull();
    });

    it("returns the project list and a full tree for the default (most recent) project", async () => {
      const ownerId = await newUser();
      const older = await repo.createProject({
        ownerId,
        name: "Older axis",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const newer = await repo.createProject({
        ownerId,
        name: "Newer axis",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const config = await repo.createConfiguration({
        projectId: newer.id,
        name: "Baseline configuration",
      });
      const assembly = await repo.createAssembly({
        configurationId: config.id,
        name: "X axis",
      });
      await repo.createModuleInstance({
        assemblyId: assembly.id,
        configurationId: config.id,
        modulePackageId: "example-scaffold",
        moduleVersion: "0.1.0",
        label: "Thrust check",
      });

      const view = await loadWorkspaceView(ownerId);

      // listProjectsByOwner orders newest first, so with no explicit
      // requestedProjectId the newest project is the default selection.
      expect(view.projects.map((p) => p.id).sort()).toEqual(
        [older.id, newer.id].sort(),
      );
      expect(view.selectedProject).not.toBeNull();
      expect(view.selectedProject?.id).toBe(newer.id);
      expect(view.selectedProject?.configurations).toHaveLength(1);
      expect(view.selectedProject?.configurations[0].assemblies).toHaveLength(
        1,
      );
      expect(
        view.selectedProject?.configurations[0].assemblies[0].moduleInstances,
      ).toHaveLength(1);
    });

    it("loads the explicitly requested project when it is owned by the caller", async () => {
      const ownerId = await newUser();
      const first = await repo.createProject({
        ownerId,
        name: "First",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const second = await repo.createProject({
        ownerId,
        name: "Second",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });

      const view = await loadWorkspaceView(ownerId, first.id);

      expect(view.selectedProject?.id).toBe(first.id);
      expect(view.projects).toHaveLength(2);
      void second;
    });

    it("falls back to the first project when the requested id is unknown or not owned", async () => {
      const ownerId = await newUser();
      const otherOwnerId = await newUser();
      const own = await repo.createProject({
        ownerId,
        name: "Own project",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const foreign = await repo.createProject({
        ownerId: otherOwnerId,
        name: "Someone else's project",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });

      const unknownIdView = await loadWorkspaceView(
        ownerId,
        "00000000-0000-0000-0000-000000000000" as typeof own.id,
      );
      expect(unknownIdView.selectedProject?.id).toBe(own.id);

      const foreignIdView = await loadWorkspaceView(ownerId, foreign.id);
      expect(foreignIdView.selectedProject?.id).toBe(own.id);
      // The foreign project never appears in this owner's project list either.
      expect(foreignIdView.projects.map((p) => p.id)).not.toContain(foreign.id);
    });
  },
);
