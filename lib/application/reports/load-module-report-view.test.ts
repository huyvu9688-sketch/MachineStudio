// Live-database tests for `loadModuleReportView` (Unit 5.2). Real PostgreSQL
// round trips, skipped when no `DATABASE_URL` is configured
// (tests/live-database.ts). Mirrors `load-module-result-view.test.ts`'s own
// fixture conventions (example-relay, a real-checks/no-sources development
// fixture) plus `load-bom-view.test.ts`'s own catalog-assignment fixture, so
// this exercises the report view's own new fields — inputs, active load
// case, assigned parts — that `loadModuleResultView` does not need.

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
import type { ManufacturerPartRevisionId } from "../../db/repositories/catalog-types";

describe.skipIf(!liveDatabaseAvailable)(
  "loadModuleReportView (live database)",
  () => {
    let loadModuleReportView: typeof import("./load-module-report-view").loadModuleReportView;
    let assignComponent: typeof import("../catalogs/assign-component").assignComponent;
    let executeModuleInstance: typeof import("../calculations/execute-module-instance").executeModuleInstance;
    let projects: typeof import("../../db/repositories/project-repository");
    let graph: typeof import("../../db/repositories/graph-repository");
    let requirements: typeof import("../../db/repositories/requirements-repository");
    let catalog: typeof import("../../db/repositories/catalog-repository");
    let client: typeof import("../../db/client");
    const createdUserIds: string[] = [];
    const createdManufacturerIds: string[] = [];
    const createdComponentTypeIds: string[] = [];
    const createdPartRevisionIds: string[] = [];

    interface Scaffold {
      readonly ownerId: UserId;
      readonly configId: MachineConfigurationId;
      readonly assemblyId: AssemblyId;
      readonly moduleInstanceId: ModuleInstanceId;
      readonly moduleLabel: string;
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
      const moduleLabel = "Relay";
      const mi = await projects.createModuleInstance({
        assemblyId: assembly.id,
        configurationId: config.id,
        modulePackageId: "example-relay",
        moduleVersion: "0.1.0",
        label: moduleLabel,
      });
      return {
        ownerId: user.id,
        configId: config.id,
        assemblyId: assembly.id,
        moduleInstanceId: mi.id,
        moduleLabel,
      };
    }

    async function authorThrustForceIn(
      s: Scaffold,
      magnitudeNewtons: number,
    ): Promise<void> {
      await graph.createParameterValue({
        configurationId: s.configId,
        moduleInstanceId: s.moduleInstanceId,
        nodeKind: "module_input",
        parameterId: "motion.axis.thrust_force",
        source: "manual",
        value: makeQuantity(magnitudeNewtons, "N"),
      });
    }

    async function createPartRevision(): Promise<{
      readonly id: ManufacturerPartRevisionId;
      readonly manufacturerName: string;
    }> {
      const manufacturerName = `Test Manufacturer ${randomUUID()}`;
      const manufacturer = await catalog.createManufacturer({
        name: manufacturerName,
      });
      createdManufacturerIds.push(manufacturer.id);
      const componentType = await catalog.createComponentType({
        id: `ball-screw-${randomUUID()}`,
        name: "Ball screw",
      });
      createdComponentTypeIds.push(componentType.id);
      const schemaVersion = await catalog.createComponentSchemaVersion({
        componentTypeId: componentType.id,
        version: "1.0.0",
        fields: [
          {
            key: "lead",
            label: "Lead",
            valueKind: "quantity",
            required: true,
            unit: "mm",
          },
        ],
      });
      const partRevision = await catalog.createManufacturerPartRevision({
        manufacturerId: manufacturer.id,
        componentTypeId: componentType.id,
        componentSchemaVersionId: schemaVersion.id,
        partNumber: "BSS1520-914",
        sourceRevision: "2026-catalog",
        attributes: { lead: makeQuantity(20, "mm") },
      });
      createdPartRevisionIds.push(partRevision.id);
      return { id: partRevision.id, manufacturerName };
    }

    beforeAll(async () => {
      ({ loadModuleReportView } = await import("./load-module-report-view"));
      ({ assignComponent } = await import("../catalogs/assign-component"));
      ({ executeModuleInstance } =
        await import("../calculations/execute-module-instance"));
      projects = await import("../../db/repositories/project-repository");
      graph = await import("../../db/repositories/graph-repository");
      requirements = await import("../../db/repositories/requirements-repository");
      catalog = await import("../../db/repositories/catalog-repository");
      client = await import("../../db/client");
    });

    afterEach(async () => {
      if (createdPartRevisionIds.length > 0) {
        const ids = createdPartRevisionIds.splice(0);
        await client.prisma.componentAssignment.deleteMany({
          where: { manufacturerPartRevisionId: { in: ids } },
        });
        await client.prisma.manufacturerPartRevision.deleteMany({
          where: { id: { in: ids } },
        });
      }
      if (createdComponentTypeIds.length > 0) {
        await client.prisma.componentType.deleteMany({
          where: { id: { in: createdComponentTypeIds.splice(0) } },
        });
      }
      if (createdManufacturerIds.length > 0) {
        await client.prisma.manufacturer.deleteMany({
          where: { id: { in: createdManufacturerIds.splice(0) } },
        });
      }
      if (createdUserIds.length > 0) {
        await client.prisma.user.deleteMany({
          where: { id: { in: createdUserIds.splice(0) } },
        });
      }
    });

    it("returns null for a module instance that does not exist", async () => {
      const s = await scaffold();
      const result = await loadModuleReportView(
        randomUUID() as ModuleInstanceId,
        s.ownerId,
      );
      expect(result).toBeNull();
    });

    it("returns null for a module instance owned by another user", async () => {
      const s = await scaffold();
      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);
      const result = await loadModuleReportView(s.moduleInstanceId, stranger.id);
      expect(result).toBeNull();
    });

    it("returns an empty report before the module has ever been run", async () => {
      const s = await scaffold();
      const result = await loadModuleReportView(s.moduleInstanceId, s.ownerId);
      expect(result).not.toBeNull();
      if (result === null) return;
      expect(result.moduleInstance.label).toBe(s.moduleLabel);
      expect(result.moduleInstance.modulePackageId).toBe("example-relay");
      expect(result.run).toBeNull();
      expect(result.inputs).toEqual([]);
      expect(result.outputs).toEqual([]);
      expect(result.checks).toEqual([]);
      expect(result.assumptions).toEqual([]);
      expect(result.activeLoadCase).toBeNull();
      expect(result.sources).toEqual([]);
      expect(result.assignedParts).toEqual([]);
    });

    it("describes the latest run's inputs, outputs, checks, and version pins from the stored snapshot", async () => {
      const s = await scaffold();
      await authorThrustForceIn(s, 120);
      const runResult = await executeModuleInstance({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: s.ownerId,
      });
      expect(runResult.ok).toBe(true);

      const result = await loadModuleReportView(s.moduleInstanceId, s.ownerId);
      expect(result).not.toBeNull();
      if (result === null) return;

      expect(result.run).not.toBeNull();
      expect(result.run?.status).toBe("pass");
      expect(result.run?.engineSdkVersion.length).toBeGreaterThan(0);
      expect(result.run?.modulePackageHash.length).toBeGreaterThan(0);
      expect(result.run?.parameterRegistryVersion).toBe("1.0.0");

      expect(result.inputs).toHaveLength(1);
      expect(result.inputs[0].portKey).toBe("thrust_force_in");
      expect(result.inputs[0].value).toEqual(makeQuantity(120, "N"));

      expect(result.outputs).toHaveLength(1);
      expect(result.outputs[0].portKey).toBe("thrust_force_out");
      expect(result.outputs[0].value).toEqual(makeQuantity(120, "N"));

      expect(result.checks).toHaveLength(1);
      expect(result.checks[0].id).toBe("relay-preserves-value");
      expect(result.checks[0].status).toBe("pass");

      expect(result.trace).not.toBeNull();
      expect(result.trace?.sections).toHaveLength(1);
      expect(result.trace?.sections[0].title).toBe("Pass-through");

      // example-relay is a development fixture that declares no assumptions
      // and cites no sources (see its own manifest.ts header) — this asserts
      // the report renders that honestly as empty, not that the wiring is
      // untested; `run-view-helpers.ts`'s resolution logic is exercised
      // directly by `load-module-result-view.test.ts`.
      expect(result.assumptions).toEqual([]);
      expect(result.sources).toEqual([]);
      expect(result.activeLoadCase).toBeNull();
    });

    it("does not resolve an active load case when the run carries none", async () => {
      const s = await scaffold();
      await requirements.createLoadCase({
        configurationId: s.configId,
        category: "peak",
        label: "Rapid traverse",
      });
      await authorThrustForceIn(s, 50);
      await executeModuleInstance({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: s.ownerId,
      });

      const result = await loadModuleReportView(s.moduleInstanceId, s.ownerId);
      expect(result?.activeLoadCase).toBeNull();
    });

    it("resolves the run's own active load case when one was set", async () => {
      const s = await scaffold();
      const loadCase = await requirements.createLoadCase({
        configurationId: s.configId,
        category: "peak",
        label: "Rapid traverse",
        description: "Maximum-acceleration move",
      });
      await authorThrustForceIn(s, 50);
      const runResult = await executeModuleInstance({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: s.ownerId,
        loadCaseId: loadCase.id,
      });
      expect(runResult.ok).toBe(true);

      const result = await loadModuleReportView(s.moduleInstanceId, s.ownerId);
      expect(result?.activeLoadCase).toEqual({
        id: loadCase.id,
        category: "peak",
        label: "Rapid traverse",
        description: "Maximum-acceleration move",
      });
    });

    it("describes an assigned part on this module instance, with no target label duplicated", async () => {
      const s = await scaffold();
      await authorThrustForceIn(s, 75);
      const runResult = await executeModuleInstance({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: s.ownerId,
      });
      if (!runResult.ok) throw new Error("seed execution failed");

      const part = await createPartRevision();
      const assigned = await assignComponent(
        {
          configurationId: s.configId,
          target: { kind: "module_instance", moduleInstanceId: s.moduleInstanceId },
          partSource: "catalog",
          manufacturerPartRevisionId: part.id,
          calculationRunId: runResult.run.id,
          quantity: 3,
        },
        s.ownerId,
      );
      expect(assigned.ok).toBe(true);

      const result = await loadModuleReportView(s.moduleInstanceId, s.ownerId);
      expect(result).not.toBeNull();
      if (result === null) return;
      expect(result.assignedParts).toHaveLength(1);
      const assignedPart = result.assignedParts[0];
      expect(assignedPart.partSource).toBe("catalog");
      expect(assignedPart.manufacturerName).toBe(part.manufacturerName);
      expect(assignedPart.partNumber).toBe("BSS1520-914");
      expect(assignedPart.sourceRevision).toBe("2026-catalog");
      expect(assignedPart.quantity).toBe(3);
      expect(assignedPart.stale).toBe(false);
    });

    it("carries a stale run's reason through unchanged", async () => {
      const s = await scaffold();
      await authorThrustForceIn(s, 10);
      const first = await executeModuleInstance({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: s.ownerId,
      });
      if (!first.ok) throw new Error("seed execution failed");
      // Changing the input marks this run stale via the existing
      // transactional stale-propagation mechanism — exercised only to
      // observe loadModuleReportView's own passthrough, not to re-test
      // stale propagation itself.
      const { setParameterValue } = await import("../parameters/stale-propagation");
      await setParameterValue(
        {
          configurationId: s.configId,
          moduleInstanceId: s.moduleInstanceId,
          nodeKind: "module_input",
          parameterId: "motion.axis.thrust_force",
          source: "manual",
          value: makeQuantity(20, "N"),
        },
        s.ownerId,
      );

      const result = await loadModuleReportView(s.moduleInstanceId, s.ownerId);
      expect(result?.run?.stale).toBe(true);
      expect(result?.run?.id).toBe(first.run.id as string);
    });
  },
);
