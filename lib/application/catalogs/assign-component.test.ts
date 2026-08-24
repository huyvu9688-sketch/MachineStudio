// Live-database tests for the `assignComponent` application service (Unit
// 2.8 part 2). Real PostgreSQL round trips; skips when the generated Prisma
// client is absent (see context/progress-tracker.md).
//
// The repository's own test file (component-assignment-repository.test.ts)
// covers the persistence shape rules directly; this file covers the
// orchestration this service adds on top: target authorization (module
// instance, named assembly, and configuration-root), cross-checking a
// supplied calculation run against its target module instance, and
// verifying a catalog part revision exists before assigning it.

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

describe.skipIf(!liveDatabaseAvailable)(
  "assignComponent (live database)",
  () => {
    let assignComponent: typeof import("./assign-component").assignComponent;
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
      readonly assemblyId: AssemblyId;
      readonly moduleInstanceId: ModuleInstanceId;
      readonly runId: CalculationRunId;
      readonly partRevisionId: ManufacturerPartRevisionId;
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
      const assembly = await projects.createAssembly({
        configurationId: config.id,
        name: "X axis",
      });
      const moduleInstance = await projects.createModuleInstance({
        assemblyId: assembly.id,
        configurationId: config.id,
        modulePackageId: MODULE_ID,
        moduleVersion: MODULE_VERSION,
        label: "Screw sizing",
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

      const manufacturer = await catalog.createManufacturer({
        name: `Test Manufacturer ${randomUUID()}`,
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
        assemblyId: assembly.id,
        moduleInstanceId: moduleInstance.id,
        runId: runResult.run.id,
        partRevisionId: partRevision.id,
      };
    }

    beforeAll(async () => {
      assignComponent = (await import("./assign-component")).assignComponent;
      projects = await import("../../db/repositories/project-repository");
      graph = await import("../../db/repositories/graph-repository");
      catalog = await import("../../db/repositories/catalog-repository");
      executeModuleInstance = (
        await import("../calculations/execute-module-instance")
      ).executeModuleInstance;
      client = await import("../../db/client");
    });

    afterEach(async () => {
      if (createdPartRevisionIds.length > 0) {
        const ids = createdPartRevisionIds.splice(0);
        // ComponentAssignment.manufacturerPartRevisionId is onDelete: Restrict
        // (Unit 2.8); a catalog-sourced assignment created by a test must be
        // removed before its part revision, and the part revision before its
        // ComponentType/Manufacturer (mirrors catalog-repository.test.ts's
        // established cleanup order).
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

    it("assigns a catalog part to a module instance with a valid supporting run", async () => {
      const f = await fixture();
      const result = await assignComponent(
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
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.assignment.manufacturerPartRevisionId).toBe(
        f.partRevisionId,
      );
      expect(result.assignment.assignedByUserId).toBe(f.ownerId);
    });

    it("assigns a manual part to a named assembly with no calculation run", async () => {
      const f = await fixture();
      const result = await assignComponent(
        {
          configurationId: f.configId,
          target: { kind: "assembly", assemblyId: f.assemblyId },
          partSource: "manual",
          manualPartDetails: { description: "Custom bracket" },
        },
        f.ownerId,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.assignment.assemblyId).toBe(f.assemblyId);
    });

    it("assigns a manual part at the configuration root when no assembly is given", async () => {
      const f = await fixture();
      const result = await assignComponent(
        {
          configurationId: f.configId,
          target: { kind: "assembly" },
          partSource: "manual",
          manualPartDetails: { description: "Machine nameplate" },
        },
        f.ownerId,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.assignment.assemblyId).toBeNull();
    });

    it("reports unauthorized for a module instance owned by another user", async () => {
      const f = await fixture();
      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);

      const result = await assignComponent(
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
        stranger.id,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");
    });

    it("reports unauthorized for an assembly owned by another user", async () => {
      const f = await fixture();
      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);

      const result = await assignComponent(
        {
          configurationId: f.configId,
          target: { kind: "assembly", assemblyId: f.assemblyId },
          partSource: "manual",
          manualPartDetails: { description: "Not yours" },
        },
        stranger.id,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");
    });

    it("reports unauthorized for a configuration-root target owned by another user", async () => {
      const f = await fixture();
      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);

      const result = await assignComponent(
        {
          configurationId: f.configId,
          target: { kind: "assembly" },
          partSource: "manual",
          manualPartDetails: { description: "Not yours either" },
        },
        stranger.id,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");
    });

    it("reports not_found for a calculation run that does not belong to the caller", async () => {
      const f = await fixture();
      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);
      const strangerProject = await projects.createProject({
        ownerId: stranger.id,
        name: "Other",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const strangerConfig = await projects.createConfiguration({
        projectId: strangerProject.id,
        name: "Baseline",
      });
      const strangerAssembly = await projects.createAssembly({
        configurationId: strangerConfig.id,
        name: "Y axis",
      });
      const strangerModule = await projects.createModuleInstance({
        assemblyId: strangerAssembly.id,
        configurationId: strangerConfig.id,
        modulePackageId: MODULE_ID,
        moduleVersion: MODULE_VERSION,
        label: "Stranger module",
      });
      await graph.createParameterValue({
        configurationId: strangerConfig.id,
        moduleInstanceId: strangerModule.id,
        nodeKind: "module_input",
        parameterId: PAYLOAD_MASS,
        source: "manual",
        value: makeQuantity(5, "kg"),
      });
      const strangerRun = await executeModuleInstance({
        moduleInstanceId: strangerModule.id,
        ownerId: stranger.id,
      });
      if (!strangerRun.ok) throw new Error("seed execution failed");

      const result = await assignComponent(
        {
          configurationId: f.configId,
          target: {
            kind: "module_instance",
            moduleInstanceId: f.moduleInstanceId,
          },
          partSource: "catalog",
          manufacturerPartRevisionId: f.partRevisionId,
          calculationRunId: strangerRun.run.id,
        },
        f.ownerId,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("not_found");
    });

    it("reports invalid_input when the calculation run belongs to a different module instance", async () => {
      const f = await fixture();
      const otherModule = await projects.createModuleInstance({
        assemblyId: f.assemblyId,
        configurationId: f.configId,
        modulePackageId: MODULE_ID,
        moduleVersion: MODULE_VERSION,
        label: "Other module",
      });
      await graph.createParameterValue({
        configurationId: f.configId,
        moduleInstanceId: otherModule.id,
        nodeKind: "module_input",
        parameterId: PAYLOAD_MASS,
        source: "manual",
        value: makeQuantity(7, "kg"),
      });
      const otherRun = await executeModuleInstance({
        moduleInstanceId: otherModule.id,
        ownerId: f.ownerId,
      });
      if (!otherRun.ok) throw new Error("seed execution failed");

      const result = await assignComponent(
        {
          configurationId: f.configId,
          target: {
            kind: "module_instance",
            moduleInstanceId: f.moduleInstanceId,
          },
          partSource: "catalog",
          manufacturerPartRevisionId: f.partRevisionId,
          calculationRunId: otherRun.run.id,
        },
        f.ownerId,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("invalid_input");
    });

    it("reports invalid_input for a stale calculation run", async () => {
      const f = await fixture();
      const stale = await import("../parameters/stale-propagation");
      const propagated = await stale.setParameterValue(
        {
          configurationId: f.configId,
          moduleInstanceId: f.moduleInstanceId,
          nodeKind: "module_input",
          parameterId: PAYLOAD_MASS,
          source: "manual",
          value: makeQuantity(20, "kg"),
        },
        f.ownerId,
      );
      if (!propagated.ok) {
        throw new Error("seed stale-propagation edit failed");
      }
      expect(propagated.staleModuleInstanceIds).toContain(f.moduleInstanceId);

      const result = await assignComponent(
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
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("invalid_input");
    });

    it("reports invalid_input when calculationRunId is given for an assembly target", async () => {
      const f = await fixture();
      const result = await assignComponent(
        {
          configurationId: f.configId,
          target: { kind: "assembly", assemblyId: f.assemblyId },
          partSource: "manual",
          manualPartDetails: { description: "Should not carry a run" },
          calculationRunId: f.runId,
        },
        f.ownerId,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("invalid_input");
    });

    it("reports not_found for a manufacturer part revision that does not exist", async () => {
      const f = await fixture();
      const result = await assignComponent(
        {
          configurationId: f.configId,
          target: {
            kind: "module_instance",
            moduleInstanceId: f.moduleInstanceId,
          },
          partSource: "catalog",
          manufacturerPartRevisionId:
            "does-not-exist" as ManufacturerPartRevisionId,
          calculationRunId: f.runId,
        },
        f.ownerId,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("not_found");
    });

    it("surfaces a repository validation failure as invalid_input rather than throwing", async () => {
      const f = await fixture();
      const result = await assignComponent(
        {
          configurationId: f.configId,
          target: {
            kind: "module_instance",
            moduleInstanceId: f.moduleInstanceId,
          },
          partSource: "catalog",
          manufacturerPartRevisionId: f.partRevisionId,
          // calculationRunId omitted: the repository's "supporting run
          // required for calculated components" rule should reject this.
        },
        f.ownerId,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("invalid_input");
    });

    it("reports unauthorized when the target does not belong to the given configuration", async () => {
      const f = await fixture();
      // A second configuration under the same owner: the caller owns both the
      // module instance and the configuration, so only a target-to-
      // configuration check can catch this.
      const otherProject = await projects.createProject({
        ownerId: f.ownerId,
        name: "Other machine",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const otherConfig = await projects.createConfiguration({
        projectId: otherProject.id,
        name: "Other baseline",
      });

      const result = await assignComponent(
        {
          configurationId: otherConfig.id,
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
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");

      const rows = await client.prisma.componentAssignment.findMany({
        where: { configurationId: otherConfig.id },
      });
      expect(rows).toHaveLength(0);
    });

    it("reports unauthorized when the target assembly belongs to another configuration", async () => {
      const f = await fixture();
      const otherProject = await projects.createProject({
        ownerId: f.ownerId,
        name: "Other machine",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const otherConfig = await projects.createConfiguration({
        projectId: otherProject.id,
        name: "Other baseline",
      });
      const otherAssembly = await projects.createAssembly({
        configurationId: otherConfig.id,
        name: "Y axis",
      });

      const result = await assignComponent(
        {
          configurationId: f.configId,
          target: { kind: "assembly", assemblyId: otherAssembly.id },
          partSource: "manual",
          manualPartDetails: { description: "Bracket" },
        },
        f.ownerId,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");
    });
  },
);
