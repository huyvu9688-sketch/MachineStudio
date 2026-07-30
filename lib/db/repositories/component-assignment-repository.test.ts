// Live-database tests for the ComponentAssignment repository (Unit 2.8 part
// 2). Real PostgreSQL round trips; skips when the generated Prisma client is
// absent (see context/progress-tracker.md).
//
// Covers: catalog- and manual-sourced assignments round-tripping (including
// "exact part revision retained"), the three target/part-source shapes
// ("target project/assembly/module"), the discriminator refine rules
// (target/part-source mismatch, missing calculationRunId for a calculated
// component), manualPartDetails JSONB validation on write and corrupt-payload
// rejection on read, ownership isolation, and the bulk stale-marking
// primitive `markComponentAssignmentsStaleForModuleInstances`.

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { makeQuantity } from "@/lib/engine";
import type { CalculationRunId } from "./run-types";
import type {
  AssemblyId,
  MachineConfigurationId,
  ModuleInstanceId,
  UserId,
} from "./types";
import type { ManufacturerPartRevisionId } from "./catalog-types";

const here = dirname(fileURLToPath(import.meta.url));
const generatedClientAvailable = existsSync(join(here, "..", "generated", "prisma"));

const MODULE_ID = "example-scaffold";
const MODULE_VERSION = "0.1.0";
const PAYLOAD_MASS = "motion.axis.payload_mass";

describe.skipIf(!generatedClientAvailable)(
  "component-assignment-repository (live database)",
  () => {
    let assignments: typeof import("./component-assignment-repository");
    let projects: typeof import("./project-repository");
    let graph: typeof import("./graph-repository");
    let catalog: typeof import("./catalog-repository");
    let executeModuleInstance: typeof import("../../application/calculations/execute-module-instance").executeModuleInstance;
    let client: typeof import("../client");
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
          { key: "lead", label: "Lead", valueKind: "quantity", required: true, unit: "mm" },
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
      assignments = await import("./component-assignment-repository");
      projects = await import("./project-repository");
      graph = await import("./graph-repository");
      catalog = await import("./catalog-repository");
      executeModuleInstance = (
        await import("../../application/calculations/execute-module-instance")
      ).executeModuleInstance;
      client = await import("../client");
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

    it("creates a catalog-sourced assignment targeting a module instance, retaining the exact part revision", async () => {
      const f = await fixture();
      const created = await assignments.createComponentAssignment({
        configurationId: f.configId,
        targetKind: "module_instance",
        moduleInstanceId: f.moduleInstanceId,
        partSource: "catalog",
        manufacturerPartRevisionId: f.partRevisionId,
        calculationRunId: f.runId,
        quantity: 2,
        assignedByUserId: f.ownerId,
      });

      const loaded = await assignments.loadComponentAssignmentForOwner(created.id, f.ownerId);
      expect(loaded?.manufacturerPartRevisionId).toBe(f.partRevisionId);
      expect(loaded?.calculationRunId).toBe(f.runId);
      expect(loaded?.quantity).toBe(2);
      expect(loaded?.stale).toBe(false);
      expect(loaded?.manualPartDetails).toBeNull();
    });

    it("creates a manual-sourced assignment targeting a specific assembly, with no calculation run", async () => {
      const f = await fixture();
      const created = await assignments.createComponentAssignment({
        configurationId: f.configId,
        targetKind: "assembly",
        assemblyId: f.assemblyId,
        partSource: "manual",
        manualPartDetails: { description: "Custom mounting bracket" },
      });

      const loaded = await assignments.loadComponentAssignmentForOwner(created.id, f.ownerId);
      expect(loaded?.assemblyId).toBe(f.assemblyId);
      expect(loaded?.moduleInstanceId).toBeNull();
      expect(loaded?.manualPartDetails).toEqual({ description: "Custom mounting bracket" });
      expect(loaded?.calculationRunId).toBeNull();
      expect(loaded?.quantity).toBe(1);
    });

    it("creates a manual-sourced assignment at the configuration root (assemblyId omitted)", async () => {
      const f = await fixture();
      const created = await assignments.createComponentAssignment({
        configurationId: f.configId,
        targetKind: "assembly",
        partSource: "manual",
        manualPartDetails: { description: "Machine nameplate" },
      });
      expect(created.assemblyId).toBeNull();
      expect(created.moduleInstanceId).toBeNull();
    });

    it("rejects a module_instance target with no calculationRunId (supporting run required for calculated components)", async () => {
      const f = await fixture();
      await expect(
        assignments.createComponentAssignment({
          configurationId: f.configId,
          targetKind: "module_instance",
          moduleInstanceId: f.moduleInstanceId,
          partSource: "catalog",
          manufacturerPartRevisionId: f.partRevisionId,
        }),
      ).rejects.toThrow(assignments.ComponentAssignmentRepositoryError);
    });

    it("rejects a module_instance target with no moduleInstanceId", async () => {
      const f = await fixture();
      await expect(
        assignments.createComponentAssignment({
          configurationId: f.configId,
          targetKind: "module_instance",
          partSource: "catalog",
          manufacturerPartRevisionId: f.partRevisionId,
          calculationRunId: f.runId,
        }),
      ).rejects.toThrow(assignments.ComponentAssignmentRepositoryError);
    });

    it("rejects an assembly target that also sets moduleInstanceId", async () => {
      const f = await fixture();
      await expect(
        assignments.createComponentAssignment({
          configurationId: f.configId,
          targetKind: "assembly",
          moduleInstanceId: f.moduleInstanceId,
          partSource: "manual",
          manualPartDetails: { description: "Invalid combination" },
        }),
      ).rejects.toThrow(assignments.ComponentAssignmentRepositoryError);
    });

    it("rejects a catalog part source with no manufacturerPartRevisionId", async () => {
      const f = await fixture();
      await expect(
        assignments.createComponentAssignment({
          configurationId: f.configId,
          targetKind: "assembly",
          assemblyId: f.assemblyId,
          partSource: "catalog",
        }),
      ).rejects.toThrow(assignments.ComponentAssignmentRepositoryError);
    });

    it("rejects a manual part source with no manualPartDetails", async () => {
      const f = await fixture();
      await expect(
        assignments.createComponentAssignment({
          configurationId: f.configId,
          targetKind: "assembly",
          assemblyId: f.assemblyId,
          partSource: "manual",
        }),
      ).rejects.toThrow(assignments.ComponentAssignmentRepositoryError);
    });

    it("rejects malformed manualPartDetails (missing description)", async () => {
      const f = await fixture();
      await expect(
        assignments.createComponentAssignment({
          configurationId: f.configId,
          targetKind: "assembly",
          assemblyId: f.assemblyId,
          partSource: "manual",
          // @ts-expect-error intentionally missing required `description`
          manualPartDetails: { notes: "no description" },
        }),
      ).rejects.toThrow(assignments.ComponentAssignmentRepositoryError);
    });

    it("rejects a corrupt manualPartDetails payload on read", async () => {
      const f = await fixture();
      const created = await assignments.createComponentAssignment({
        configurationId: f.configId,
        targetKind: "assembly",
        assemblyId: f.assemblyId,
        partSource: "manual",
        manualPartDetails: { description: "Will be corrupted" },
      });
      // Bypass the repository to write an invalid payload directly, simulating
      // stored data that predates a stricter schema.
      await client.prisma.componentAssignment.update({
        where: { id: created.id },
        data: { manualPartDetails: { notes: "missing description" } },
      });

      await expect(
        assignments.loadComponentAssignmentForOwner(created.id, f.ownerId),
      ).rejects.toThrow(assignments.ComponentAssignmentRepositoryError);
    });

    it("isolates ownership: another owner cannot load or list the assignment", async () => {
      const f = await fixture();
      const created = await assignments.createComponentAssignment({
        configurationId: f.configId,
        targetKind: "assembly",
        assemblyId: f.assemblyId,
        partSource: "manual",
        manualPartDetails: { description: "Owned by f" },
      });
      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);

      expect(await assignments.loadComponentAssignmentForOwner(created.id, stranger.id)).toBeNull();
      expect(
        await assignments.listComponentAssignmentsForConfiguration(f.configId, stranger.id),
      ).toEqual([]);
      expect(
        await assignments.listComponentAssignmentsForConfiguration(f.configId, f.ownerId),
      ).toHaveLength(1);
    });

    it("marks every not-already-stale assignment for the given module instances", async () => {
      const f = await fixture();
      const created = await assignments.createComponentAssignment({
        configurationId: f.configId,
        targetKind: "module_instance",
        moduleInstanceId: f.moduleInstanceId,
        partSource: "catalog",
        manufacturerPartRevisionId: f.partRevisionId,
        calculationRunId: f.runId,
      });
      expect((await assignments.loadComponentAssignmentForOwner(created.id, f.ownerId))?.stale).toBe(
        false,
      );

      const updated = await assignments.markComponentAssignmentsStaleForModuleInstances(
        [f.moduleInstanceId],
        "The supporting calculation run changed.",
      );
      expect(updated).toBe(1);

      const loaded = await assignments.loadComponentAssignmentForOwner(created.id, f.ownerId);
      expect(loaded?.stale).toBe(true);
      expect(loaded?.staleReason).toBe("The supporting calculation run changed.");

      // Idempotent: already-stale rows are not counted again.
      expect(
        await assignments.markComponentAssignmentsStaleForModuleInstances(
          [f.moduleInstanceId],
          "again",
        ),
      ).toBe(0);
    });

    it("is a no-op for an empty module instance list", async () => {
      expect(await assignments.markComponentAssignmentsStaleForModuleInstances([], "n/a")).toBe(0);
    });
  },
);
