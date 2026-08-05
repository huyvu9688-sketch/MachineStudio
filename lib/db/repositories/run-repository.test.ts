// Live-database tests for the calculation-run repository (Unit 2.3).
//
// Real PostgreSQL round trips; skips when the generated Prisma client is absent
// (see context/progress-tracker.md). Covers the Unit 2.3 test plan: snapshot
// immutability (the DB trigger blocks any engineering-field update; only stale
// state may change), reproduction from stored inputs and versions, invalid
// stored snapshot rejection, plus ownership isolation and summary derivation.

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  ENGINE_SDK_VERSION,
  engineeringValuesEqual,
  executeModule,
  makeQuantity,
  resolveModuleInput,
  type ModuleComputation,
  type ModulePackage,
} from "@/lib/engine";
import { getModulePackage } from "@/lib/modules";
import { RUN_SNAPSHOT_FORMAT_VERSION } from "./run-types";
import type { CalculationRunSnapshot } from "./run-types";
import type { AssemblyId, ModuleInstanceId, UserId } from "./types";

const MODULE_ID = "example-scaffold";
const MODULE_VERSION = "0.1.0";
const RAW_INPUT = { values: { payload_mass: makeQuantity(10, "kg") } };

function pkgOrThrow(): ModulePackage {
  const pkg = getModulePackage(MODULE_ID, MODULE_VERSION);
  if (pkg === undefined)
    throw new Error(`${MODULE_ID}@${MODULE_VERSION} not registered`);
  return pkg;
}

/** Builds a valid run snapshot by executing the example module. */
function buildSnapshot(
  overrides: { computation?: ModuleComputation } = {},
): CalculationRunSnapshot {
  const pkg = pkgOrThrow();
  const input = resolveModuleInput(pkg, RAW_INPUT);
  const computation = overrides.computation ?? executeModule(pkg, RAW_INPUT);
  return {
    snapshotVersion: RUN_SNAPSHOT_FORMAT_VERSION,
    input,
    computation,
    versions: {
      engineSdkVersion: ENGINE_SDK_VERSION,
      modulePackageId: pkg.manifest.id,
      moduleVersion: pkg.manifest.version,
      modulePackageHash: pkg.manifest.contentHash,
      parameterRegistryVersion: pkg.manifest.parameterRegistryVersion,
      sourceRevisionIds: [...pkg.manifest.sourceRevisionIds],
    },
    ranAt: new Date().toISOString(),
  };
}

describe.skipIf(!liveDatabaseAvailable)(
  "run-repository (live database)",
  () => {
    let runs: typeof import("./run-repository");
    let projects: typeof import("./project-repository");
    let client: typeof import("../client");
    const createdUserIds: string[] = [];

    interface Scaffold {
      readonly ownerId: UserId;
      readonly assemblyId: AssemblyId;
      readonly moduleInstanceId: ModuleInstanceId;
    }

    async function scaffold(): Promise<Scaffold> {
      const user = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(user.id);
      const project = await projects.createProject({
        ownerId: user.id,
        name: "Axis",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const config = await projects.createConfiguration({
        projectId: project.id,
        name: "Baseline",
      });
      const assembly = await projects.createAssembly({
        configurationId: config.id,
        name: "X axis",
      });
      const mi = await projects.createModuleInstance({
        assemblyId: assembly.id,
        configurationId: config.id,
        modulePackageId: MODULE_ID,
        moduleVersion: MODULE_VERSION,
        label: "Thrust",
      });
      return {
        ownerId: user.id,
        assemblyId: assembly.id,
        moduleInstanceId: mi.id,
      };
    }

    beforeAll(async () => {
      runs = await import("./run-repository");
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

    it("persists a run and loads its full snapshot back (render without re-executing)", async () => {
      const s = await scaffold();
      const snapshot = buildSnapshot();
      const created = await runs.createCalculationRun({
        moduleInstanceId: s.moduleInstanceId,
        snapshot,
      });
      expect(created.status).toBe("pass");
      expect(created.moduleVersion).toBe(MODULE_VERSION);

      const loaded = await runs.loadCalculationRun(created.id, s.ownerId);
      expect(loaded).not.toBeNull();
      if (loaded === null) return;
      // The stored snapshot round-trips exactly — a report can render from it
      // without importing or executing the module.
      expect(loaded.snapshot).toEqual(snapshot);
      expect(loaded.snapshot.versions.modulePackageHash).toBe(
        pkgOrThrow().manifest.contentHash,
      );
    });

    it("reproduces the stored outputs from the stored input and pinned version", async () => {
      const s = await scaffold();
      const created = await runs.createCalculationRun({
        moduleInstanceId: s.moduleInstanceId,
        snapshot: buildSnapshot(),
      });
      const loaded = await runs.loadCalculationRun(created.id, s.ownerId);
      if (loaded === null) throw new Error("run not loaded");

      // Re-execute the pinned module version against the stored resolved input.
      const pkg = getModulePackage(
        loaded.modulePackageId,
        loaded.moduleVersion,
      );
      if (pkg === undefined) throw new Error("pinned module version not found");
      const recomputed = executeModule(pkg, loaded.snapshot.input);

      const stored = loaded.snapshot.computation.outputs;
      for (const key of Object.keys(stored)) {
        expect(
          engineeringValuesEqual(recomputed.outputs[key], stored[key]),
        ).toBe(true);
      }
    });

    it("derives status and the smallest dimensionless margin as summaries", async () => {
      const s = await scaffold();
      const base = executeModule(pkgOrThrow(), RAW_INPUT);
      const computation: ModuleComputation = {
        ...base,
        checks: [
          {
            id: "sf-a",
            status: "pass",
            message: "SF a",
            margin: makeQuantity(2.5, "ratio"),
          },
          {
            id: "sf-b",
            status: "pass",
            message: "SF b",
            margin: makeQuantity(1.4, "ratio"),
          },
          // Physical (force) margin is ignored — not comparable across checks.
          {
            id: "force",
            status: "pass",
            message: "F",
            margin: makeQuantity(500, "N"),
          },
        ],
      };
      const created = await runs.createCalculationRun({
        moduleInstanceId: s.moduleInstanceId,
        snapshot: buildSnapshot({ computation }),
      });
      expect(created.status).toBe("pass");
      expect(created.criticalMargin).toBe(1.4);
    });

    it("rejects an invalid run snapshot on write", async () => {
      const s = await scaffold();
      const bad = { ...buildSnapshot(), snapshotVersion: 999 };
      await expect(
        runs.createCalculationRun({
          moduleInstanceId: s.moduleInstanceId,
          snapshot: bad as unknown as CalculationRunSnapshot,
        }),
      ).rejects.toMatchObject({ code: "invalid_input" });
    });

    it("rejects a corrupt stored snapshot on read (never trust JSONB)", async () => {
      const s = await scaffold();
      const row = await client.prisma.calculationRun.create({
        data: {
          moduleInstanceId: s.moduleInstanceId,
          engineSdkVersion: ENGINE_SDK_VERSION,
          modulePackageId: MODULE_ID,
          moduleVersion: MODULE_VERSION,
          modulePackageHash: "deadbeef",
          parameterRegistryVersion: "1.0.0",
          status: "pass",
          snapshot: { not: "a valid snapshot" },
        },
      });
      await expect(
        runs.loadCalculationRun(asRunId(row.id), s.ownerId),
      ).rejects.toMatchObject({ code: "invalid_snapshot" });
    });

    it("is immutable: the DB trigger blocks changing the snapshot", async () => {
      const s = await scaffold();
      const created = await runs.createCalculationRun({
        moduleInstanceId: s.moduleInstanceId,
        snapshot: buildSnapshot(),
      });
      // A direct snapshot (or version) update must be rejected by the trigger.
      await expect(
        client.prisma.calculationRun.update({
          where: { id: created.id },
          data: { snapshot: { tampered: true } },
        }),
      ).rejects.toThrow();
      await expect(
        client.prisma.calculationRun.update({
          where: { id: created.id },
          data: { moduleVersion: "9.9.9" },
        }),
      ).rejects.toThrow();
    });

    it("lets stale state change while the snapshot stays put", async () => {
      const s = await scaffold();
      const created = await runs.createCalculationRun({
        moduleInstanceId: s.moduleInstanceId,
        snapshot: buildSnapshot(),
      });
      expect(created.stale).toBe(false);

      const marked = await runs.markRunStale(
        created.id,
        true,
        "upstream value changed",
      );
      expect(marked?.stale).toBe(true);
      expect(marked?.staleReason).toBe("upstream value changed");

      const reloaded = await runs.loadCalculationRun(created.id, s.ownerId);
      expect(reloaded?.stale).toBe(true);
      // The engineering snapshot is untouched by the stale-state change.
      expect(reloaded?.snapshot).toEqual(created.snapshot);

      const cleared = await runs.markRunStale(created.id, false);
      expect(cleared?.stale).toBe(false);
      expect(cleared?.staleReason).toBeNull();
    });

    it("enforces ownership isolation on run reads", async () => {
      const s = await scaffold();
      const created = await runs.createCalculationRun({
        moduleInstanceId: s.moduleInstanceId,
        snapshot: buildSnapshot(),
      });
      const strangerId = asUserId(`test-user-${randomUUID()}`);
      expect(await runs.loadCalculationRun(created.id, strangerId)).toBeNull();
      expect(
        await runs.listRunsForModuleInstance(s.moduleInstanceId, strangerId),
      ).toHaveLength(0);
      // The owner sees the run in the module's run list.
      const owned = await runs.listRunsForModuleInstance(
        s.moduleInstanceId,
        s.ownerId,
      );
      expect(owned.map((r) => r.id)).toContain(created.id);
    });
  },
);

function asUserId(id: string): UserId {
  return id as UserId;
}
function asRunId(id: string): import("./run-types").CalculationRunId {
  return id as import("./run-types").CalculationRunId;
}
