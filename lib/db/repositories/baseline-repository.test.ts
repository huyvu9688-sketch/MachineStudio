// Live-database tests for the machine-baseline repository (Unit 2.9 part 2).
//
// Real PostgreSQL round trips; skips when the generated Prisma client is
// absent (see context/progress-tracker.md). Covers the Unit 2.9 test plan's
// "Immutability" item directly at the repository/trigger level (the DB
// rejects every UPDATE, not only engineering-field ones — stricter than
// calculation_runs, which still allows its stale state to change), plus
// snapshot validation on write/read and ownership isolation.

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { BASELINE_SNAPSHOT_FORMAT_VERSION } from "../../configuration";
import type { MachineBaselineSnapshot } from "../../configuration";
import { asMachineBaselineId } from "./baseline-types";
import type { MachineConfigurationId, UserId } from "./types";

function minimalSnapshot(overrides: Partial<MachineBaselineSnapshot> = {}): MachineBaselineSnapshot {
  return {
    snapshotVersion: BASELINE_SNAPSHOT_FORMAT_VERSION,
    projectId: "project-x",
    projectName: "Axis Project",
    configurationId: "config-x",
    configurationName: "Baseline configuration",
    marketProfileKey: "US-General-Industrial-Machinery@1",
    requirements: [],
    designAssumptions: [],
    loadCases: [],
    assemblies: [],
    parameterValues: [],
    parameterLinks: [],
    calculationRuns: [],
    componentAssignments: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe.skipIf(!liveDatabaseAvailable)(
  "baseline-repository (live database)",
  () => {
    let baselines: typeof import("./baseline-repository");
    let projects: typeof import("./project-repository");
    let client: typeof import("../client");
    const createdUserIds: string[] = [];

    interface Scaffold {
      readonly ownerId: UserId;
      readonly configurationId: MachineConfigurationId;
    }

    async function scaffold(): Promise<Scaffold> {
      const user = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(user.id);
      const project = await projects.createProject({
        ownerId: user.id,
        name: "Axis",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const config = await projects.createConfiguration({ projectId: project.id, name: "Baseline" });
      return { ownerId: user.id, configurationId: config.id };
    }

    beforeAll(async () => {
      baselines = await import("./baseline-repository");
      projects = await import("./project-repository");
      client = await import("../client");
    });

    afterEach(async () => {
      if (createdUserIds.length > 0) {
        await client.prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
      }
    });

    it("creates a baseline and loads it back with the full snapshot", async () => {
      const s = await scaffold();
      const snapshot = minimalSnapshot({ configurationId: s.configurationId });
      const created = await baselines.createMachineBaseline({
        configurationId: s.configurationId,
        label: "Design review 1",
        snapshot,
        createdByUserId: s.ownerId,
      });
      expect(created.label).toBe("Design review 1");

      const loaded = await baselines.loadMachineBaseline(created.id, s.ownerId);
      expect(loaded?.snapshot).toEqual(snapshot);
      expect(loaded?.createdByUserId).toBe(s.ownerId);
    });

    it("rejects an invalid (malformed) snapshot on write", async () => {
      const s = await scaffold();
      await expect(
        baselines.createMachineBaseline({
          configurationId: s.configurationId,
          label: "Bad",
          // @ts-expect-error deliberately malformed for this test
          snapshot: { snapshotVersion: BASELINE_SNAPSHOT_FORMAT_VERSION },
        }),
      ).rejects.toMatchObject({ code: "invalid_input" });
    });

    it("rejects an empty label", async () => {
      const s = await scaffold();
      await expect(
        baselines.createMachineBaseline({
          configurationId: s.configurationId,
          label: "",
          snapshot: minimalSnapshot({ configurationId: s.configurationId }),
        }),
      ).rejects.toMatchObject({ code: "invalid_input" });
    });

    it("rejects a corrupt stored snapshot on read", async () => {
      const s = await scaffold();
      // machine_baselines' immutability trigger rejects every UPDATE
      // (verified by the next test), so corrupting an existing row the way
      // other repositories' tests do (an `.update()` bypassing the
      // repository) is not possible here — that is the point of the
      // trigger. Instead, insert a row with an already-invalid snapshot
      // directly, simulating data written before a stricter schema version,
      // the same scenario the trigger cannot protect against on its own.
      const id = randomUUID();
      await client.prisma.$executeRaw`
        INSERT INTO machine_baselines (id, "configurationId", label, snapshot, "createdAt")
        VALUES (${id}, ${s.configurationId}, 'Corrupt', '{"snapshotVersion": 999}'::jsonb, now())
      `;

      await expect(
        baselines.loadMachineBaseline(asMachineBaselineId(id), s.ownerId),
      ).rejects.toMatchObject({ code: "invalid_snapshot" });
    });

    it("rejects any UPDATE at the database level (immutability guard)", async () => {
      const s = await scaffold();
      const created = await baselines.createMachineBaseline({
        configurationId: s.configurationId,
        label: "Immutable",
        snapshot: minimalSnapshot({ configurationId: s.configurationId }),
      });
      await expect(
        client.prisma.$executeRaw`UPDATE machine_baselines SET label = 'changed' WHERE id = ${created.id}`,
      ).rejects.toThrow(/immutable/i);
    });

    it("isolates ownership: another owner cannot load or list the baseline", async () => {
      const s = await scaffold();
      const created = await baselines.createMachineBaseline({
        configurationId: s.configurationId,
        label: "Owned by s",
        snapshot: minimalSnapshot({ configurationId: s.configurationId }),
      });
      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);

      expect(await baselines.loadMachineBaseline(created.id, stranger.id)).toBeNull();
      expect(
        await baselines.listMachineBaselinesForConfiguration(s.configurationId, stranger.id),
      ).toEqual([]);
      expect(
        await baselines.listMachineBaselinesForConfiguration(s.configurationId, s.ownerId),
      ).toHaveLength(1);
    });

    it("lists baseline summaries newest first, without the snapshot payload", async () => {
      const s = await scaffold();
      const first = await baselines.createMachineBaseline({
        configurationId: s.configurationId,
        label: "First",
        snapshot: minimalSnapshot({ configurationId: s.configurationId }),
      });
      const second = await baselines.createMachineBaseline({
        configurationId: s.configurationId,
        label: "Second",
        snapshot: minimalSnapshot({ configurationId: s.configurationId }),
      });
      const listed = await baselines.listMachineBaselinesForConfiguration(
        s.configurationId,
        s.ownerId,
      );
      expect(listed.map((b) => b.id)).toEqual([second.id, first.id]);
      expect(listed[0]).not.toHaveProperty("snapshot");
    });

    it("cascades away when the owning configuration is deleted", async () => {
      const s = await scaffold();
      const created = await baselines.createMachineBaseline({
        configurationId: s.configurationId,
        label: "Will cascade",
        snapshot: minimalSnapshot({ configurationId: s.configurationId }),
      });
      await client.prisma.machineConfiguration.delete({ where: { id: s.configurationId } });
      const row = await client.prisma.machineBaseline.findUnique({ where: { id: created.id } });
      expect(row).toBeNull();
    });
  },
);
