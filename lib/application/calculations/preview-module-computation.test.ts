// Live-database tests for `previewModuleComputation` — mirrors
// execute-module-instance.test.ts's fixture style, minus persistence
// assertions, plus explicit "nothing was written" assertions (the entire
// point of this service). Skips when the generated Prisma client is absent
// (see context/progress-tracker.md).

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { makeQuantity } from "@/lib/engine";
import { applicationCaseValue } from "@/lib/modules/guided-cylinder-sizing/0.2.0/test-helpers";
import type {
  AssemblyId,
  MachineConfigurationId,
  ModuleInstanceId,
  UserId,
} from "../../db/repositories/types";

const RELAY_ID = "example-relay";
const RELAY_VERSION = "0.1.0";
const THRUST_FORCE = "motion.axis.thrust_force";

const MGP_ID = "guided-cylinder-sizing";
const MGP_VERSION = "0.2.0";

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

    async function scaffold(
      modulePackageId: string = RELAY_ID,
      moduleVersion: string = RELAY_VERSION,
    ): Promise<Scaffold> {
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
        modulePackageId,
        moduleVersion,
        label: "Relay",
      });
      return {
        ownerId: user.id,
        configId: config.id,
        assemblyId: assembly.id,
        moduleInstanceId: mi.id,
      };
    }

    async function authorThrustForceIn(s: Scaffold, newtons: number): Promise<void> {
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
      // The saved value itself is untouched by the override.
      const savedValues = await client.prisma.parameterValue.findMany({
        where: { moduleInstanceId: s.moduleInstanceId, parameterId: THRUST_FORCE },
      });
      expect(savedValues).toHaveLength(1);
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
        // A bogus override for the linked port -- must be ignored.
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
        // Wrong dimension for "thrust_force_in" (expects N, a force).
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

    // guided-cylinder-sizing@0.2.0 declares a real `catalogAdapter`
    // (componentType "pneumatic_cylinder_guided_mgp"), unlike example-relay
    // above — the only way to actually exercise `previewModuleComputation`'s
    // own new `componentAssignment` field against a real, seeded catalog
    // (reference/catalog-seed/smc-mgp.csv via
    // scripts/seed-mgp-guided-cylinder-catalog.mts) instead of a fixture.
    // Inputs mirror mgp-guided-cylinder-smc-examples.ts's own
    // runMgpVerticalLifterExample (SMC's published page-545 "Selection
    // Example 1"), which this module's own compute resolves to a factored
    // load the seeded MGP catalog's real graphs can match against.
    it("matches real seeded MGP catalog candidates against a live preview, without persisting anything", async () => {
      const s = await scaffold(MGP_ID, MGP_VERSION);
      await Promise.all([
        graph.createParameterValue({
          configurationId: s.configId,
          moduleInstanceId: s.moduleInstanceId,
          nodeKind: "module_input",
          parameterId: "pneumatic_guided_mgp_sizing.application_case",
          source: "manual",
          value: applicationCaseValue("vertical_lifter"),
        }),
        graph.createParameterValue({
          configurationId: s.configId,
          moduleInstanceId: s.moduleInstanceId,
          nodeKind: "module_input",
          parameterId: "motion.axis.total_moving_mass",
          source: "manual",
          value: makeQuantity(3, "kg"),
        }),
        graph.createParameterValue({
          configurationId: s.configId,
          moduleInstanceId: s.moduleInstanceId,
          nodeKind: "module_input",
          parameterId: "pneumatic_guided_mgp_sizing.load_safety_factor",
          source: "manual",
          value: makeQuantity(1, "ratio"),
        }),
        graph.createParameterValue({
          configurationId: s.configId,
          moduleInstanceId: s.moduleInstanceId,
          nodeKind: "module_input",
          parameterId: "pneumatic_guided_sizing.required_stroke",
          source: "manual",
          value: makeQuantity(30, "mm"),
        }),
        graph.createParameterValue({
          configurationId: s.configId,
          moduleInstanceId: s.moduleInstanceId,
          nodeKind: "module_input",
          parameterId: "pneumatic.operating_pressure",
          source: "manual",
          value: makeQuantity(0.5, "MPa"),
        }),
        graph.createParameterValue({
          configurationId: s.configId,
          moduleInstanceId: s.moduleInstanceId,
          nodeKind: "module_input",
          parameterId: "pneumatic.max_piston_speed",
          source: "manual",
          value: makeQuantity(0.2, "m/s"),
        }),
        graph.createParameterValue({
          configurationId: s.configId,
          moduleInstanceId: s.moduleInstanceId,
          nodeKind: "module_input",
          parameterId: "pneumatic_guided_mgp_sizing.eccentric_distance",
          source: "manual",
          value: makeQuantity(90, "mm"),
        }),
      ]);

      const result = await application.previewModuleComputation({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: s.ownerId,
        overrides: {},
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.preview.componentAssignment.componentType).toBe(
        "pneumatic_cylinder_guided_mgp",
      );
      expect(result.preview.componentAssignment.matchingAvailable).toBe(true);
      // At least one real, seeded MGP part revision satisfies this scenario —
      // this is what actually answers "why doesn't Run recommend a bore":
      // it's non-empty once the catalog is seeded, and reachable from a
      // preview alone, no Save required.
      expect(
        result.preview.componentAssignment.accepted.length,
      ).toBeGreaterThan(0);
      for (const candidate of result.preview.componentAssignment.accepted) {
        expect(candidate.part.partNumber).toMatch(/^MGP/);
      }

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
