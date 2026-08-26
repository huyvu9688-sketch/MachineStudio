// Live-database tests for `loadModuleWorkspaceView` (Unit 3.3) — the read
// model the generic module input renderer needs. Proves this unit's own
// literal exit criterion at the data layer: two structurally different
// registered modules (example-scaffold: a mass input; example-relay: a force
// input, chained downstream) both resolve to a fully-described field view
// through the same function, with no module-specific branching here.
//
// Real PostgreSQL round trips; skips when the generated Prisma client or
// DATABASE_URL is absent (see context/progress-tracker.md).

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

describe.skipIf(!liveDatabaseAvailable)(
  "loadModuleWorkspaceView (live database)",
  () => {
    let loadModuleWorkspaceView: typeof import("./load-module-workspace-view").loadModuleWorkspaceView;
    let executeModuleInstance: typeof import("./execute-module-instance").executeModuleInstance;
    let projects: typeof import("../../db/repositories/project-repository");
    let graph: typeof import("../../db/repositories/graph-repository");
    let runs: typeof import("../../db/repositories/run-repository");
    let client: typeof import("../../db/client");
    const createdUserIds: string[] = [];

    interface Scaffold {
      readonly ownerId: UserId;
      readonly configId: MachineConfigurationId;
      readonly assemblyId: AssemblyId;
      readonly moduleInstanceId: ModuleInstanceId;
    }

    async function scaffold(
      modulePackageId: string,
      moduleVersion: string,
      label: string,
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
        label,
      });
      return {
        ownerId: user.id,
        configId: config.id,
        assemblyId: assembly.id,
        moduleInstanceId: mi.id,
      };
    }

    beforeAll(async () => {
      ({ loadModuleWorkspaceView } =
        await import("./load-module-workspace-view"));
      ({ executeModuleInstance } = await import("./execute-module-instance"));
      projects = await import("../../db/repositories/project-repository");
      graph = await import("../../db/repositories/graph-repository");
      runs = await import("../../db/repositories/run-repository");
      client = await import("../../db/client");
    });

    afterEach(async () => {
      if (createdUserIds.length > 0) {
        await client.prisma.user.deleteMany({
          where: { id: { in: createdUserIds.splice(0) } },
        });
      }
    });

    it("returns null for an unknown or unowned module instance", async () => {
      const s = await scaffold("example-scaffold", "0.1.0", "Thrust check");
      const otherOwner = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(otherOwner.id);

      expect(
        await loadModuleWorkspaceView(s.moduleInstanceId, otherOwner.id),
      ).toBeNull();
    });

    it("resolves a quantity field to its 'default' source with no authored value", async () => {
      const s = await scaffold("example-scaffold", "0.1.0", "Thrust check");

      const view = await loadModuleWorkspaceView(s.moduleInstanceId, s.ownerId);

      expect(view).not.toBeNull();
      expect(view?.moduleInstance.label).toBe("Thrust check");
      expect(view?.moduleInstance.modulePackageId).toBe("example-scaffold");
      expect(view?.groups).toHaveLength(1);
      const field = view?.groups[0].fields[0];
      expect(field?.portKey).toBe("payload_mass");
      expect(field?.parameterId).toBe("motion.axis.payload_mass");
      expect(field?.required).toBe(true);
      expect(field?.field).toEqual({
        kind: "quantity",
        canonicalUnit: "kg",
        displayUnits: ["kg", "g", "lbm"],
      });
      expect(field?.resolved).toEqual({ source: "default" });
      // motion.axis.payload_mass has no registry-level constant default
      // (defaultPolicy: { kind: "required" }) — an unset "default"-source
      // field here is genuinely empty, not pre-filled.
      expect(field?.hasBuiltInDefault).toBe(false);
    });

    it("resolves a manually authored value as source 'manual' with its magnitude", async () => {
      const s = await scaffold("example-scaffold", "0.1.0", "Thrust check");
      await graph.createParameterValue({
        configurationId: s.configId,
        moduleInstanceId: s.moduleInstanceId,
        nodeKind: "module_input",
        parameterId: "motion.axis.payload_mass",
        source: "manual",
        value: makeQuantity(12, "kg"),
      });

      const view = await loadModuleWorkspaceView(s.moduleInstanceId, s.ownerId);

      const field = view?.groups[0].fields[0];
      expect(field?.resolved).toEqual({
        source: "manual",
        value: makeQuantity(12, "kg"),
      });
    });

    it("describes a structurally different module (different port key and parameter) through the same shape", async () => {
      const s = await scaffold("example-relay", "0.1.0", "Relay");

      const view = await loadModuleWorkspaceView(s.moduleInstanceId, s.ownerId);

      expect(view?.moduleInstance.modulePackageId).toBe("example-relay");
      const field = view?.groups[0].fields[0];
      expect(field?.portKey).toBe("thrust_force_in");
      expect(field?.parameterId).toBe("motion.axis.thrust_force");
      expect(field?.field.kind).toBe("quantity");
      if (field?.field.kind === "quantity") {
        expect(field.field.canonicalUnit).toBe("N");
      }
    });

    it("reports linkedSourceStatus 'not_run' when the linked module-output source has never been run", async () => {
      const upstream = await scaffold("example-relay", "0.1.0", "Upstream");
      const downstream = await projects.createModuleInstance({
        assemblyId: upstream.assemblyId,
        configurationId: upstream.configId,
        modulePackageId: "example-relay",
        moduleVersion: "0.1.0",
        label: "Downstream",
      });
      await graph.createParameterLink({
        configurationId: upstream.configId,
        targetModuleInstanceId: downstream.id,
        targetParameterId: "motion.axis.thrust_force",
        sourceKind: "module_output",
        sourceModuleInstanceId: upstream.moduleInstanceId,
        sourceParameterId: "motion.axis.thrust_force",
      });

      const view = await loadModuleWorkspaceView(downstream.id, upstream.ownerId);

      const field = view?.groups[0].fields[0];
      expect(field?.resolved.source).toBe("linked");
      expect(field?.linkedSourceStatus).toBe("not_run");
    });

    it("reports linkedSourceStatus 'ready' once the linked module-output source has a fresh run", async () => {
      const upstream = await scaffold("example-relay", "0.1.0", "Upstream");
      await graph.createParameterValue({
        configurationId: upstream.configId,
        moduleInstanceId: upstream.moduleInstanceId,
        nodeKind: "module_input",
        parameterId: "motion.axis.thrust_force",
        source: "manual",
        value: makeQuantity(274, "N"),
      });
      const upstreamRun = await executeModuleInstance({
        moduleInstanceId: upstream.moduleInstanceId,
        ownerId: upstream.ownerId,
      });
      expect(upstreamRun.ok).toBe(true);

      const downstream = await projects.createModuleInstance({
        assemblyId: upstream.assemblyId,
        configurationId: upstream.configId,
        modulePackageId: "example-relay",
        moduleVersion: "0.1.0",
        label: "Downstream",
      });
      await graph.createParameterLink({
        configurationId: upstream.configId,
        targetModuleInstanceId: downstream.id,
        targetParameterId: "motion.axis.thrust_force",
        sourceKind: "module_output",
        sourceModuleInstanceId: upstream.moduleInstanceId,
        sourceParameterId: "motion.axis.thrust_force",
      });

      const view = await loadModuleWorkspaceView(downstream.id, upstream.ownerId);

      const field = view?.groups[0].fields[0];
      expect(field?.linkedSourceStatus).toBe("ready");
    });

    it("reports linkedSourceStatus 'stale' once the linked module-output source's latest run is marked stale", async () => {
      const upstream = await scaffold("example-relay", "0.1.0", "Upstream");
      await graph.createParameterValue({
        configurationId: upstream.configId,
        moduleInstanceId: upstream.moduleInstanceId,
        nodeKind: "module_input",
        parameterId: "motion.axis.thrust_force",
        source: "manual",
        value: makeQuantity(274, "N"),
      });
      const upstreamRun = await executeModuleInstance({
        moduleInstanceId: upstream.moduleInstanceId,
        ownerId: upstream.ownerId,
      });
      expect(upstreamRun.ok).toBe(true);
      if (!upstreamRun.ok) return;
      await runs.markRunStale(
        upstreamRun.run.id,
        true,
        "An upstream value changed.",
      );

      const downstream = await projects.createModuleInstance({
        assemblyId: upstream.assemblyId,
        configurationId: upstream.configId,
        modulePackageId: "example-relay",
        moduleVersion: "0.1.0",
        label: "Downstream",
      });
      await graph.createParameterLink({
        configurationId: upstream.configId,
        targetModuleInstanceId: downstream.id,
        targetParameterId: "motion.axis.thrust_force",
        sourceKind: "module_output",
        sourceModuleInstanceId: upstream.moduleInstanceId,
        sourceParameterId: "motion.axis.thrust_force",
      });

      const view = await loadModuleWorkspaceView(downstream.id, upstream.ownerId);

      const field = view?.groups[0].fields[0];
      expect(field?.linkedSourceStatus).toBe("stale");
    });
  },
);
