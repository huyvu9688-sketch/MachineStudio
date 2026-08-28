// Live-database tests for `previewModuleComputation` — mirrors
// execute-module-instance.test.ts's fixture style, minus persistence
// assertions, plus explicit "nothing was written" assertions (the entire
// point of this service). Skips when the generated Prisma client is absent
// (see context/progress-tracker.md).

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { makeQuantity } from "@/lib/engine";
import type {
  AssemblyId,
  MachineConfigurationId,
  ModuleInstanceId,
  UserId,
} from "../../db/repositories/types";

const RELAY_ID = "example-relay";
const RELAY_VERSION = "0.1.0";
const THRUST_FORCE = "motion.axis.thrust_force";

describe.skipIf(!liveDatabaseAvailable)(
  "previewModuleComputation (live database)",
  () => {
    let application: typeof import("./preview-module-computation");
    let projects: typeof import("../../db/repositories/project-repository");
    let graph: typeof import("../../db/repositories/graph-repository");
    let runs: typeof import("../../db/repositories/run-repository");
    let client: typeof import("../../db/client");
    let executeModuleInstance: typeof import("./execute-module-instance").executeModuleInstance;
    const createdUserIds: string[] = [];

    interface Scaffold {
      readonly ownerId: UserId;
      readonly configId: MachineConfigurationId;
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
        modulePackageId: RELAY_ID,
        moduleVersion: RELAY_VERSION,
        label: "Relay",
      });
      return {
        ownerId: user.id,
        configId: config.id,
        assemblyId: assembly.id,
        moduleInstanceId: mi.id,
      };
    }

    async function authorThrustForceIn(
      s: Scaffold,
      newtons: number,
    ): Promise<void> {
      await graph.createParameterValue({
        configurationId: s.configId,
        moduleInstanceId: s.moduleInstanceId,
        nodeKind: "module_input",
        parameterId: THRUST_FORCE,
        source: "manual",
        value: makeQuantity(newtons, "N"),
      });
    }

    beforeAll(async () => {
      application = await import("./preview-module-computation");
      projects = await import("../../db/repositories/project-repository");
      graph = await import("../../db/repositories/graph-repository");
      runs = await import("../../db/repositories/run-repository");
      client = await import("../../db/client");
      ({ executeModuleInstance } = await import("./execute-module-instance"));
    });

    afterEach(async () => {
      if (createdUserIds.length > 0) {
        await client.prisma.user.deleteMany({
          where: { id: { in: createdUserIds.splice(0) } },
        });
      }
    });

    it("computes a fresh result from currently-saved inputs without persisting anything", async () => {
      const s = await scaffold();
      await authorThrustForceIn(s, 100);

      const result = await application.previewModuleComputation({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: s.ownerId,
        overrides: {},
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.preview.outputs).toEqual([
        expect.objectContaining({
          portKey: "thrust_force_out",
          value: makeQuantity(100, "N"),
        }),
      ]);

      const persistedRuns = await client.prisma.calculationRun.findMany({
        where: { moduleInstanceId: s.moduleInstanceId },
      });
      expect(persistedRuns).toHaveLength(0);
      const reloaded = await client.prisma.moduleInstance.findUnique({
        where: { id: s.moduleInstanceId },
      });
      expect(reloaded?.lastCalculationRunId).toBeNull();
    });

    it("uses a submitted override instead of the saved value, still without persisting", async () => {
      const s = await scaffold();
      await authorThrustForceIn(s, 100);

      const result = await application.previewModuleComputation({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: s.ownerId,
        overrides: { thrust_force_in: makeQuantity(250, "N") },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.preview.outputs).toEqual([
        expect.objectContaining({
          portKey: "thrust_force_out",
          value: makeQuantity(250, "N"),
        }),
      ]);

      const persistedRuns = await client.prisma.calculationRun.findMany({
        where: { moduleInstanceId: s.moduleInstanceId },
      });
      expect(persistedRuns).toHaveLength(0);
      const savedValues = await client.prisma.parameterValue.findMany({
        where: { moduleInstanceId: s.moduleInstanceId, parameterId: THRUST_FORCE },
      });
      expect(savedValues).toHaveLength(1);
      expect(savedValues[0].value).toEqual(makeQuantity(100, "N"));
    });

    it("ignores a submitted override for a linked port, resolving from the link instead", async () => {
      const upstream = await scaffold();
      await authorThrustForceIn(upstream, 42);
      const upstreamRun = await executeModuleInstance({
        moduleInstanceId: upstream.moduleInstanceId,
        ownerId: upstream.ownerId,
      });
      expect(upstreamRun.ok).toBe(true);

      const downstream = await projects.createModuleInstance({
        assemblyId: upstream.assemblyId,
        configurationId: upstream.configId,
        modulePackageId: RELAY_ID,
        moduleVersion: RELAY_VERSION,
        label: "Downstream relay",
      });
      await graph.createParameterLink({
        configurationId: upstream.configId,
        targetModuleInstanceId: downstream.id,
        targetParameterId: THRUST_FORCE,
        sourceKind: "module_output",
        sourceModuleInstanceId: upstream.moduleInstanceId,
        sourceParameterId: THRUST_FORCE,
      });

      const result = await application.previewModuleComputation({
        moduleInstanceId: downstream.id,
        ownerId: upstream.ownerId,
        overrides: { thrust_force_in: makeQuantity(999, "N") },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.preview.outputs).toEqual([
        expect.objectContaining({
          portKey: "thrust_force_out",
          value: makeQuantity(42, "N"),
        }),
      ]);

      const persistedRuns = await client.prisma.calculationRun.findMany({
        where: { moduleInstanceId: downstream.id },
      });
      expect(persistedRuns).toHaveLength(0);
    });

    it("refuses with stale_upstream when a linked source's latest run is stale, identical wording to executeModuleInstance", async () => {
      const s = await scaffold();
      await authorThrustForceIn(s, 274);
      const upstreamRun = await executeModuleInstance({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: s.ownerId,
      });
      expect(upstreamRun.ok).toBe(true);
      if (!upstreamRun.ok) return;

      const downstream = await projects.createModuleInstance({
        assemblyId: s.assemblyId,
        configurationId: s.configId,
        modulePackageId: RELAY_ID,
        moduleVersion: RELAY_VERSION,
        label: "Downstream relay",
      });
      await graph.createParameterLink({
        configurationId: s.configId,
        targetModuleInstanceId: downstream.id,
        targetParameterId: THRUST_FORCE,
        sourceKind: "module_output",
        sourceModuleInstanceId: s.moduleInstanceId,
        sourceParameterId: THRUST_FORCE,
      });

      await runs.markRunStale(upstreamRun.run.id, true, "An upstream value changed.");

      const result = await application.previewModuleComputation({
        moduleInstanceId: downstream.id,
        ownerId: s.ownerId,
        overrides: {},
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("stale_upstream");
      expect(result.error.message).toContain("An upstream value changed.");
    });

    it("reports invalid_input for an override with the wrong dimension, without persisting", async () => {
      const s = await scaffold();
      await authorThrustForceIn(s, 100);

      const result = await application.previewModuleComputation({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: s.ownerId,
        overrides: { thrust_force_in: makeQuantity(5, "kg") },
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("invalid_input");

      const persistedRuns = await client.prisma.calculationRun.findMany({
        where: { moduleInstanceId: s.moduleInstanceId },
      });
      expect(persistedRuns).toHaveLength(0);
    });

    it("reports unauthorized for another owner's module instance", async () => {
      const s = await scaffold();
      await authorThrustForceIn(s, 100);
      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);

      const result = await application.previewModuleComputation({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: stranger.id,
        overrides: {},
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");
    });
  },
);
