// Live-database tests for `loadBomView` (Unit 5.1). Real PostgreSQL round
// trips, skipped when no `DATABASE_URL` is configured (tests/live-database.ts).
//
// Builds fixtures through the real `assignComponent` service (the same
// fixture-building convention assign-component.test.ts already
// establishes) rather than writing `ComponentAssignment` rows directly, so
// this exercises the real persisted shape `loadBomView` actually reads.

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { makeQuantity } from "@/lib/engine";
import type { CalculationRunId } from "../../db/repositories/run-types";
import type {
  AssemblyId,
  MachineConfigurationId,
  ModuleInstanceId,
  UserId,
} from "../../db/repositories/types";
import type { ManufacturerPartRevisionId } from "../../db/repositories/catalog-types";

const MODULE_ID = "example-scaffold";
const MODULE_VERSION = "0.1.0";
const PAYLOAD_MASS = "motion.axis.payload_mass";

describe.skipIf(!liveDatabaseAvailable)("loadBomView (live database)", () => {
  let loadBomView: typeof import("./load-bom-view").loadBomView;
  let assignComponent: typeof import("../catalogs/assign-component").assignComponent;
  let setParameterValue: typeof import("../parameters/stale-propagation").setParameterValue;
  let projects: typeof import("../../db/repositories/project-repository");
  let graph: typeof import("../../db/repositories/graph-repository");
  let catalog: typeof import("../../db/repositories/catalog-repository");
  let executeModuleInstance: typeof import("../calculations/execute-module-instance").executeModuleInstance;
  let client: typeof import("../../db/client");
  const createdUserIds: string[] = [];
  const createdManufacturerIds: string[] = [];
  const createdComponentTypeIds: string[] = [];
  const createdPartRevisionIds: string[] = [];

  interface Fixture {
    readonly ownerId: UserId;
    readonly configId: MachineConfigurationId;
    readonly rootAssemblyId: AssemblyId;
    readonly childAssemblyId: AssemblyId;
    readonly moduleInstanceId: ModuleInstanceId;
    readonly moduleLabel: string;
    readonly runId: CalculationRunId;
    readonly partRevisionId: ManufacturerPartRevisionId;
    readonly manufacturerName: string;
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
      name: "Baseline",
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
    const moduleLabel = "Screw sizing";
    const moduleInstance = await projects.createModuleInstance({
      assemblyId: childAssembly.id,
      configurationId: config.id,
      modulePackageId: MODULE_ID,
      moduleVersion: MODULE_VERSION,
      label: moduleLabel,
    });
    await graph.createParameterValue({
      configurationId: config.id,
      moduleInstanceId: moduleInstance.id,
      nodeKind: "module_input",
      parameterId: PAYLOAD_MASS,
      source: "manual",
      value: makeQuantity(10, "kg"),
    });
    const runResult = await executeModuleInstance({
      moduleInstanceId: moduleInstance.id,
      ownerId: user.id,
    });
    if (!runResult.ok) {
      throw new Error(`seed execution failed: ${runResult.error.message}`);
    }

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

    return {
      ownerId: user.id,
      configId: config.id,
      rootAssemblyId: rootAssembly.id,
      childAssemblyId: childAssembly.id,
      moduleInstanceId: moduleInstance.id,
      moduleLabel,
      runId: runResult.run.id,
      partRevisionId: partRevision.id,
      manufacturerName,
    };
  }

  beforeAll(async () => {
    ({ loadBomView } = await import("./load-bom-view"));
    ({ assignComponent } = await import("../catalogs/assign-component"));
    ({ setParameterValue } = await import("../parameters/stale-propagation"));
    projects = await import("../../db/repositories/project-repository");
    graph = await import("../../db/repositories/graph-repository");
    catalog = await import("../../db/repositories/catalog-repository");
    ({ executeModuleInstance } =
      await import("../calculations/execute-module-instance"));
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
    const { ownerId } = await fixture();
    const result = await loadBomView(
      randomUUID() as MachineConfigurationId,
      ownerId,
    );
    expect(result).toBeNull();
  });

  it("returns null for a configuration owned by another user", async () => {
    const f = await fixture();
    const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
    createdUserIds.push(stranger.id);
    const result = await loadBomView(f.configId, stranger.id);
    expect(result).toBeNull();
  });

  it("returns an empty BOM for a configuration with no component assignments", async () => {
    const f = await fixture();
    const result = await loadBomView(f.configId, f.ownerId);
    expect(result).not.toBeNull();
    if (result === null) return;
    expect(result.configurationName).toBe("Baseline");
    expect(result.machineLevelItems).toEqual([]);
    expect(result.totalLineCount).toBe(0);
    expect(result.staleLineCount).toBe(0);
    // Both assemblies still appear in the tree, empty, mirroring
    // AssemblyNode's own "present regardless of content" convention.
    expect(result.assemblies).toHaveLength(1);
    expect(result.assemblies[0].assemblyName).toBe("X axis");
    expect(result.assemblies[0].items).toEqual([]);
    expect(result.assemblies[0].children).toHaveLength(1);
    expect(result.assemblies[0].children[0].assemblyName).toBe("Drive train");
  });

  it("nests a calculated (catalog) component under its module instance's own assembly, with full traceability", async () => {
    const f = await fixture();
    const assigned = await assignComponent(
      {
        configurationId: f.configId,
        target: {
          kind: "module_instance",
          moduleInstanceId: f.moduleInstanceId,
        },
        partSource: "catalog",
        manufacturerPartRevisionId: f.partRevisionId,
        calculationRunId: f.runId,
        quantity: 2,
      },
      f.ownerId,
    );
    expect(assigned.ok).toBe(true);

    const result = await loadBomView(f.configId, f.ownerId);
    expect(result).not.toBeNull();
    if (result === null) return;

    // Nested two levels deep: root "X axis" -> child "Drive train" -> item.
    const child = result.assemblies[0].children[0];
    expect(child.items).toHaveLength(1);
    const item = child.items[0];
    expect(item.targetKind).toBe("module_instance");
    expect(item.targetLabel).toBe(f.moduleLabel);
    expect(item.partSource).toBe("catalog");
    expect(item.manufacturerName).toBe(f.manufacturerName);
    expect(item.partNumber).toBe("BSS1520-914");
    expect(item.sourceRevision).toBe("2026-catalog");
    expect(item.description).toBe(`${f.manufacturerName} BSS1520-914`);
    expect(item.quantity).toBe(2);
    expect(item.stale).toBe(false);
    expect(item.calculationRunId).toBe(f.runId);
    expect(item.calculationRunCreatedAt).toBeInstanceOf(Date);

    expect(result.totalLineCount).toBe(1);
    expect(result.staleLineCount).toBe(0);
  });

  it("nests a manual assembly-level item under the named assembly, with no run traceability", async () => {
    const f = await fixture();
    const assigned = await assignComponent(
      {
        configurationId: f.configId,
        target: { kind: "assembly", assemblyId: f.rootAssemblyId },
        partSource: "manual",
        manualPartDetails: {
          description: "Custom bracket",
          manufacturerName: "Acme",
          partNumber: "BRK-1",
          notes: "Cut to length on site",
        },
        quantity: 4,
      },
      f.ownerId,
    );
    expect(assigned.ok).toBe(true);

    const result = await loadBomView(f.configId, f.ownerId);
    expect(result).not.toBeNull();
    if (result === null) return;

    expect(result.assemblies[0].items).toHaveLength(1);
    const item = result.assemblies[0].items[0];
    expect(item.targetKind).toBe("assembly");
    expect(item.targetLabel).toBeNull();
    expect(item.partSource).toBe("manual");
    expect(item.description).toBe("Custom bracket");
    expect(item.manufacturerName).toBe("Acme");
    expect(item.partNumber).toBe("BRK-1");
    expect(item.notes).toBe("Cut to length on site");
    expect(item.quantity).toBe(4);
    expect(item.calculationRunId).toBeNull();
    expect(item.calculationRunCreatedAt).toBeNull();
  });

  it("places a machine-level manual item (no assembly) outside the assembly tree", async () => {
    const f = await fixture();
    const assigned = await assignComponent(
      {
        configurationId: f.configId,
        target: { kind: "assembly" },
        partSource: "manual",
        manualPartDetails: { description: "Machine nameplate" },
      },
      f.ownerId,
    );
    expect(assigned.ok).toBe(true);

    const result = await loadBomView(f.configId, f.ownerId);
    expect(result).not.toBeNull();
    if (result === null) return;

    expect(result.machineLevelItems).toHaveLength(1);
    expect(result.machineLevelItems[0].description).toBe("Machine nameplate");
    expect(result.assemblies[0].items).toEqual([]);
    expect(result.totalLineCount).toBe(1);
  });

  it("counts a stale line correctly", async () => {
    const f = await fixture();
    const assigned = await assignComponent(
      {
        configurationId: f.configId,
        target: {
          kind: "module_instance",
          moduleInstanceId: f.moduleInstanceId,
        },
        partSource: "catalog",
        manufacturerPartRevisionId: f.partRevisionId,
        calculationRunId: f.runId,
      },
      f.ownerId,
    );
    expect(assigned.ok).toBe(true);

    // Changing the input through the real setParameterValue service (not
    // the raw repository) marks the run, and this assignment, stale via the
    // existing transactional stale-propagation mechanism
    // (component-assignment-repository.ts's own `ComponentAssignment.stale`
    // doc comment) — exercised here only to observe loadBomView's own
    // counting, not to re-test stale propagation itself.
    await setParameterValue(
      {
        configurationId: f.configId,
        moduleInstanceId: f.moduleInstanceId,
        nodeKind: "module_input",
        parameterId: PAYLOAD_MASS,
        source: "manual",
        value: makeQuantity(15, "kg"),
      },
      f.ownerId,
    );

    const result = await loadBomView(f.configId, f.ownerId);
    expect(result).not.toBeNull();
    if (result === null) return;
    expect(result.totalLineCount).toBe(1);
    expect(result.staleLineCount).toBe(1);
    const child = result.assemblies[0].children[0];
    expect(child.items[0].stale).toBe(true);
  });
});
