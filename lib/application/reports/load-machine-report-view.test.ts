// Live-database tests for `loadMachineReportView` (Unit 5.3). Real
// PostgreSQL round trips, skipped when no `DATABASE_URL` is configured
// (tests/live-database.ts). Composes the same fixture conventions
// `load-bom-view.test.ts` (catalog assignment), `load-module-report-
// view.test.ts` (example-relay, load cases), and `create-baseline.test.ts`
// (baseline creation) already establish, since this unit's own read model
// is a composition of exactly those pieces.

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
  "loadMachineReportView (live database)",
  () => {
    let loadMachineReportView: typeof import("./load-machine-report-view").loadMachineReportView;
    let assignComponent: typeof import("../catalogs/assign-component").assignComponent;
    let executeModuleInstance: typeof import("../calculations/execute-module-instance").executeModuleInstance;
    let createBaseline: typeof import("../configurations/create-baseline").createBaseline;
    let projects: typeof import("../../db/repositories/project-repository");
    let graph: typeof import("../../db/repositories/graph-repository");
    let requirements: typeof import("../../db/repositories/requirements-repository");
    let catalog: typeof import("../../db/repositories/catalog-repository");
    let client: typeof import("../../db/client");
    const createdUserIds: string[] = [];
    const createdManufacturerIds: string[] = [];
    const createdComponentTypeIds: string[] = [];
    const createdPartRevisionIds: string[] = [];

    interface Fixture {
      readonly ownerId: UserId;
      readonly projectId: string;
      readonly configId: MachineConfigurationId;
      readonly rootAssemblyId: AssemblyId;
      readonly childAssemblyId: AssemblyId;
      readonly moduleInstanceId: ModuleInstanceId;
      readonly moduleLabel: string;
    }

    async function fixture(): Promise<Fixture> {
      const user = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(user.id);
      const project = await projects.createProject({
        ownerId: user.id,
        name: "Axis",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const config = await projects.createConfiguration({
        projectId: project.id,
        name: "Baseline config",
      });
      const rootAssembly = await projects.createAssembly({
        configurationId: config.id,
        name: "X axis",
      });
      const childAssembly = await projects.createAssembly({
        configurationId: config.id,
        parentId: rootAssembly.id,
        name: "Drive train",
      });
      const moduleLabel = "Relay";
      const moduleInstance = await projects.createModuleInstance({
        assemblyId: childAssembly.id,
        configurationId: config.id,
        modulePackageId: "example-relay",
        moduleVersion: "0.1.0",
        label: moduleLabel,
      });
      return {
        ownerId: user.id,
        projectId: project.id,
        configId: config.id,
        rootAssemblyId: rootAssembly.id,
        childAssemblyId: childAssembly.id,
        moduleInstanceId: moduleInstance.id,
        moduleLabel,
      };
    }

    beforeAll(async () => {
      ({ loadMachineReportView } = await import("./load-machine-report-view"));
      ({ assignComponent } = await import("../catalogs/assign-component"));
      ({ executeModuleInstance } =
        await import("../calculations/execute-module-instance"));
      ({ createBaseline } = await import("../configurations/create-baseline"));
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

    it("returns null for a configuration that does not exist", async () => {
      const f = await fixture();
      const result = await loadMachineReportView(
        randomUUID() as MachineConfigurationId,
        f.ownerId,
      );
      expect(result).toBeNull();
    });

    it("returns null for a configuration owned by another user", async () => {
      const f = await fixture();
      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);
      const result = await loadMachineReportView(f.configId, stranger.id);
      expect(result).toBeNull();
    });

    it("returns honest empty defaults for a freshly created configuration", async () => {
      const f = await fixture();
      const result = await loadMachineReportView(f.configId, f.ownerId);
      expect(result).not.toBeNull();
      if (result === null) return;

      expect(result.project.name).toBe("Axis");
      expect(result.configuration.name).toBe("Baseline config");
      expect(result.marketProfile?.id).toBe("US-General-Industrial-Machinery");
      expect(result.requirements.requirements).toEqual([]);
      expect(result.bom.totalLineCount).toBe(0);
      expect(result.openWarnings).toEqual([]);
      expect(result.openAssumptions).toEqual([]);
      expect(result.latestBaseline).toBeNull();
      // Both assemblies still appear, empty, mirroring AssemblyNode's own
      // "present regardless of content" convention.
      expect(result.assemblies).toHaveLength(1);
      expect(result.assemblies[0].assemblyName).toBe("X axis");
      expect(result.assemblies[0].modules).toEqual([]);
      expect(result.assemblies[0].children).toHaveLength(1);
      expect(result.assemblies[0].children[0].assemblyName).toBe(
        "Drive train",
      );
    });

    it("assembles the full package: requirements, module summaries, BOM, and the latest baseline", async () => {
      const f = await fixture();

      await requirements.createRequirement({
        configurationId: f.configId,
        code: "R-1",
        statement: "The axis shall move the rated payload at rated speed.",
      });
      const req = (await requirements.listRequirements(f.configId, f.ownerId))[0];
      await requirements.createAcceptanceCriterion({
        requirementId: req.id,
        statement: "Static safety factor >= 2.0 at rated load.",
      });
      await requirements.createDesignAssumption({
        configurationId: f.configId,
        statement: "Ambient temperature stays within 10-40 C.",
      });
      const loadCase = await requirements.createLoadCase({
        configurationId: f.configId,
        category: "peak",
        label: "Rapid traverse",
      });

      await graph.createParameterValue({
        configurationId: f.configId,
        moduleInstanceId: f.moduleInstanceId,
        nodeKind: "module_input",
        parameterId: "motion.axis.thrust_force",
        source: "manual",
        value: makeQuantity(100, "N"),
      });
      const runResult = await executeModuleInstance({
        moduleInstanceId: f.moduleInstanceId,
        ownerId: f.ownerId,
        loadCaseId: loadCase.id,
      });
      if (!runResult.ok) throw new Error("seed execution failed");

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
      const assigned = await assignComponent(
        {
          configurationId: f.configId,
          target: {
            kind: "module_instance",
            moduleInstanceId: f.moduleInstanceId,
          },
          partSource: "catalog",
          manufacturerPartRevisionId: partRevision.id,
          calculationRunId: runResult.run.id,
          quantity: 1,
        },
        f.ownerId,
      );
      expect(assigned.ok).toBe(true);

      const baselineResult = await createBaseline(
        { configurationId: f.configId, label: "Design review 1" },
        f.ownerId,
      );
      expect(baselineResult.ok).toBe(true);

      const result = await loadMachineReportView(f.configId, f.ownerId);
      expect(result).not.toBeNull();
      if (result === null) return;

      // Requirements verification matrix: authoring completeness only.
      expect(result.requirements.requirements).toHaveLength(1);
      expect(result.requirements.requirements[0].code).toBe("R-1");
      expect(result.requirements.requirements[0].verificationStatus).toBe(
        "criteria_defined",
      );
      expect(result.requirements.designAssumptions).toHaveLength(1);
      expect(result.requirements.loadCases).toHaveLength(1);

      // Module summaries / detailed calculations.
      const child = result.assemblies[0].children[0];
      expect(child.modules).toHaveLength(1);
      expect(child.modules[0].moduleInstance.label).toBe(f.moduleLabel);
      expect(child.modules[0].outputs[0].value).toEqual(makeQuantity(100, "N"));
      expect(child.modules[0].activeLoadCase?.label).toBe("Rapid traverse");

      // BOM.
      expect(result.bom.totalLineCount).toBe(1);

      // Latest baseline: ID plus every frozen module's own package hash.
      expect(result.latestBaseline).not.toBeNull();
      expect(result.latestBaseline?.label).toBe("Design review 1");
      expect(result.latestBaseline?.moduleRefs).toHaveLength(1);
      const ref = result.latestBaseline?.moduleRefs[0];
      expect(ref?.moduleInstanceLabel).toBe(f.moduleLabel);
      expect(ref?.modulePackageId).toBe("example-relay");
      expect(ref?.moduleVersion).toBe("0.1.0");
      expect(ref?.modulePackageHash.length).toBeGreaterThan(0);
      expect(ref?.status).toBe("pass");
      expect(ref?.stale).toBe(false);

      // example-relay is a development fixture that raises no warnings and
      // cites no sources (see its own manifest.ts header) — asserted honest
      // and empty, not that the aggregation itself is untested; a real
      // production module's own report already exercises this shape
      // (`load-module-report-view.test.ts`).
      expect(result.openWarnings).toEqual([]);
      expect(result.sources).toEqual([]);
    });
  },
);
