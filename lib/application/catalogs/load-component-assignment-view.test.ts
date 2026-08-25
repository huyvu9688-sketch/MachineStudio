// Live-database tests for `loadComponentAssignmentView` (Unit 3.6) — the
// read model the catalog matching and assignment UI needs. Covers this
// unit's exit criterion at the data layer ("An engineer can assign a
// manufacturer part and see its supporting run"): an assignment created by
// `assignComponent` comes back described, with its supporting run resolved.
//
// Also pins the standing `matchingAvailable: false` behavior: no registered
// module declares a `catalogAdapter` today, so the panel reports why rather
// than rendering an empty candidate table (see the read model's header for
// the Milestone 4 deferral this encodes).
//
// Real PostgreSQL round trips; skips when the generated Prisma client or
// DATABASE_URL is absent (see context/progress-tracker.md).

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  makeQuantity,
  SERIALIZATION_FORMAT_VERSION,
  type EnumValue,
} from "@/lib/engine";
import { asComponentSchemaVersionId, asComponentTypeId } from "../../db/repositories/catalog-types";
import type {
  MachineConfigurationId,
  ModuleInstanceId,
  UserId,
} from "../../db/repositories/types";
import type { CalculationRunId } from "../../db/repositories/run-types";

/** Mirrors lib/modules/pneumatic-cylinder-sizing/0.1.0/test-helpers.ts's own `enumValue`. */
function enumValue(enumId: string, value: string): EnumValue {
  return { v: SERIALIZATION_FORMAT_VERSION, kind: "enum", enumId, value };
}

describe.skipIf(!liveDatabaseAvailable)(
  "loadComponentAssignmentView (live database)",
  () => {
    let loadComponentAssignmentView: typeof import("./load-component-assignment-view").loadComponentAssignmentView;
    let assignComponent: typeof import("./assign-component").assignComponent;
    let executeModuleInstance: typeof import("../calculations/execute-module-instance").executeModuleInstance;
    let projects: typeof import("../../db/repositories/project-repository");
    let graph: typeof import("../../db/repositories/graph-repository");
    let client: typeof import("../../db/client");
    let catalog: typeof import("../../db/repositories/catalog-repository");
    const createdUserIds: string[] = [];

    interface Scaffold {
      readonly ownerId: UserId;
      readonly configId: MachineConfigurationId;
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
        modulePackageId: "example-relay",
        moduleVersion: "0.1.0",
        label: "Relay",
      });
      return { ownerId: user.id, configId: config.id, moduleInstanceId: mi.id };
    }

    /** Authors an input and runs the module, returning the resulting run id. */
    async function run(s: Scaffold): Promise<CalculationRunId> {
      await graph.createParameterValue({
        configurationId: s.configId,
        moduleInstanceId: s.moduleInstanceId,
        nodeKind: "module_input",
        parameterId: "motion.axis.thrust_force",
        source: "manual",
        value: makeQuantity(12, "N"),
      });
      const executed = await executeModuleInstance({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: s.ownerId,
      });
      if (!executed.ok)
        throw new Error(`fixture run failed: ${executed.error.message}`);
      return executed.run.id;
    }

    beforeAll(async () => {
      ({ loadComponentAssignmentView } =
        await import("./load-component-assignment-view"));
      ({ assignComponent } = await import("./assign-component"));
      ({ executeModuleInstance } =
        await import("../calculations/execute-module-instance"));
      projects = await import("../../db/repositories/project-repository");
      graph = await import("../../db/repositories/graph-repository");
      client = await import("../../db/client");
      catalog = await import("../../db/repositories/catalog-repository");
    });

    afterEach(async () => {
      if (createdUserIds.length > 0) {
        await client.prisma.user.deleteMany({
          where: { id: { in: createdUserIds.splice(0) } },
        });
      }
    });

    it("returns null for an unknown or unowned module instance", async () => {
      const s = await scaffold();
      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);

      expect(
        await loadComponentAssignmentView(s.moduleInstanceId, stranger.id),
      ).toBeNull();
    });

    it("reports matching unavailable for a module with no catalog adapter, and still renders", async () => {
      const s = await scaffold();

      const view = await loadComponentAssignmentView(
        s.moduleInstanceId,
        s.ownerId,
      );

      expect(view).not.toBeNull();
      expect(view?.matchingAvailable).toBe(false);
      expect(view?.componentType).toBeNull();
      expect(view?.matchingUnavailableReason).toContain(
        "does not define catalog matching",
      );
      expect(view?.accepted).toEqual([]);
      expect(view?.rejected).toEqual([]);
      expect(view?.assignments).toEqual([]);
      // A manual part can still be assigned once the module has a run.
      expect(view?.latestRunId).toBeNull();
    });

    it("exposes the latest run id once the module has been run", async () => {
      const s = await scaffold();
      const runId = await run(s);

      const view = await loadComponentAssignmentView(
        s.moduleInstanceId,
        s.ownerId,
      );

      expect(view?.latestRunId).toBe(runId);
    });

    it("describes a manual part assignment with its supporting run (exit criterion)", async () => {
      const s = await scaffold();
      const runId = await run(s);

      const assigned = await assignComponent(
        {
          configurationId: s.configId,
          target: {
            kind: "module_instance",
            moduleInstanceId: s.moduleInstanceId,
          },
          partSource: "manual",
          manualPartDetails: {
            description: "Custom machined bracket",
            manufacturerName: "In-house",
            partNumber: "BRK-001",
          },
          quantity: 2,
          calculationRunId: runId,
        },
        s.ownerId,
      );
      expect(assigned.ok).toBe(true);

      const view = await loadComponentAssignmentView(
        s.moduleInstanceId,
        s.ownerId,
      );

      expect(view?.assignments).toHaveLength(1);
      const assignment = view?.assignments[0];
      expect(assignment).toMatchObject({
        partSource: "manual",
        part: null,
        manualDescription: "Custom machined bracket",
        manualManufacturerName: "In-house",
        manualPartNumber: "BRK-001",
        quantity: 2,
        stale: false,
      });
      expect(assignment?.supportingRun?.id).toBe(runId);
      expect(assignment?.supportingRun?.status).toBe("pass");
    });

    it("surfaces an assignment's stale state after an upstream input changes", async () => {
      const s = await scaffold();
      const runId = await run(s);
      const assigned = await assignComponent(
        {
          configurationId: s.configId,
          target: {
            kind: "module_instance",
            moduleInstanceId: s.moduleInstanceId,
          },
          partSource: "manual",
          manualPartDetails: { description: "Bracket" },
          calculationRunId: runId,
        },
        s.ownerId,
      );
      expect(assigned.ok).toBe(true);

      // Unit 2.5 marks runs AND assignments stale in the same transaction.
      const { setParameterValue } =
        await import("../parameters/stale-propagation");
      const changed = await setParameterValue(
        {
          configurationId: s.configId,
          moduleInstanceId: s.moduleInstanceId,
          nodeKind: "module_input",
          parameterId: "motion.axis.thrust_force",
          source: "manual",
          value: makeQuantity(30, "N"),
        },
        s.ownerId,
      );
      expect(changed.ok).toBe(true);

      const view = await loadComponentAssignmentView(
        s.moduleInstanceId,
        s.ownerId,
      );

      expect(view?.assignments[0]?.stale).toBe(true);
      expect(view?.assignments[0]?.staleReason).not.toBeNull();
    });

    it("does not list another module instance's assignments", async () => {
      const s = await scaffold();
      const runId = await run(s);
      await assignComponent(
        {
          configurationId: s.configId,
          target: {
            kind: "module_instance",
            moduleInstanceId: s.moduleInstanceId,
          },
          partSource: "manual",
          manualPartDetails: { description: "Bracket" },
          calculationRunId: runId,
        },
        s.ownerId,
      );

      const other = await projects.createModuleInstance({
        assemblyId: (
          await projects.createAssembly({
            configurationId: s.configId,
            name: "Y axis",
          })
        ).id,
        configurationId: s.configId,
        modulePackageId: "example-relay",
        moduleVersion: "0.1.0",
        label: "Other relay",
      });

      const view = await loadComponentAssignmentView(other.id, s.ownerId);

      expect(view?.assignments).toEqual([]);
    });

    it("returns real ranked/rejected candidates for a pneumatic-cylinder-sizing module instance with catalog rows", async () => {
      const user = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(user.id);
      const project = await projects.createProject({
        ownerId: user.id,
        name: "Clamp station",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const config = await projects.createConfiguration({
        projectId: project.id,
        name: "Baseline",
      });
      const assembly = await projects.createAssembly({
        configurationId: config.id,
        name: "Clamp cylinder",
      });
      const mi = await projects.createModuleInstance({
        assemblyId: assembly.id,
        configurationId: config.id,
        modulePackageId: "pneumatic-cylinder-sizing",
        moduleVersion: "0.1.0",
        label: "Clamp cylinder sizing",
      });

      const inputs: Array<{
        parameterId: string;
        value: ReturnType<typeof makeQuantity> | EnumValue;
      }> = [
        { parameterId: "motion.axis.incline_angle", value: makeQuantity(Math.PI / 2, "rad") },
        { parameterId: "motion.axis.friction_coefficient", value: makeQuantity(0, "ratio") },
        { parameterId: "motion.axis.total_moving_mass", value: makeQuantity(1000 / 9.80665, "kg") },
        { parameterId: "pneumatic.operating_pressure", value: makeQuantity(0.5, "MPa") },
        { parameterId: "pneumatic.load_factor", value: makeQuantity(0.7, "ratio") },
        { parameterId: "pneumatic.max_piston_speed", value: makeQuantity(0.3, "m/s") },
        { parameterId: "pneumatic.cushion_type", value: enumValue("pneumatic_cushion_type", "none") },
        { parameterId: "pneumatic_sizing.required_stroke", value: makeQuantity(200, "mm") },
        { parameterId: "pneumatic.mounting_style", value: enumValue("pneumatic_mounting_style", "fixed-supported") },
        { parameterId: "pneumatic.buckling_safety_factor", value: makeQuantity(4, "ratio") },
      ];
      for (const input of inputs) {
        await graph.createParameterValue({
          configurationId: config.id,
          moduleInstanceId: mi.id,
          nodeKind: "module_input",
          parameterId: input.parameterId,
          source: "manual",
          value: input.value,
        });
      }

      const executed = await executeModuleInstance({
        moduleInstanceId: mi.id,
        ownerId: user.id,
      });
      if (!executed.ok) {
        throw new Error(`fixture run failed: ${executed.error.message}`);
      }

      // Catalog fixture: a real 63 mm bore (accepts -- the same SMC
      // bore-selection worked example this module's own Stage 4 reference
      // example reproduces) and a deliberately undersized 10 mm bore
      // (rejects on theoretical force). loadComponentAssignmentView routes
      // on the module's declared catalogAdapter.componentType, always the
      // real "pneumatic_cylinder" id -- so this fixture loads-or-creates
      // that real ComponentType/ComponentSchemaVersion (idempotent, the
      // same pattern scripts/seed-pneumatic-cylinder-catalog.mts already
      // uses) rather than a private test-only type id.
      const manufacturer = await catalog.createManufacturer({
        name: `Test SMC ${randomUUID()}`,
      });
      const componentTypeId = asComponentTypeId("pneumatic_cylinder");
      const existingType = await client.prisma.componentType.findUnique({
        where: { id: componentTypeId },
      });
      if (existingType === null) {
        await catalog.createComponentType({
          id: componentTypeId,
          name: "Pneumatic cylinder",
        });
      }
      const schemaFields = [
        { key: "bore_diameter", label: "Bore diameter", valueKind: "quantity" as const, required: true, unit: "mm" },
        { key: "rod_diameter", label: "Rod diameter", valueKind: "quantity" as const, required: true, unit: "mm" },
        { key: "stroke_min", label: "Minimum standard stroke", valueKind: "quantity" as const, required: true, unit: "mm" },
        { key: "stroke_max", label: "Maximum standard stroke", valueKind: "quantity" as const, required: true, unit: "mm" },
        { key: "mounting_style", label: "Mounting style", valueKind: "enum" as const, required: true, enumId: "pneumatic_mounting_style" },
      ];
      const schemaVersionString = "1.0.0";
      const existingSchemaVersion = await client.prisma.componentSchemaVersion.findUnique({
        where: {
          componentTypeId_version: {
            componentTypeId,
            version: schemaVersionString,
          },
        },
      });
      const schemaVersion =
        existingSchemaVersion !== null
          ? { id: asComponentSchemaVersionId(existingSchemaVersion.id) }
          : await catalog.createComponentSchemaVersion({
              componentTypeId,
              version: schemaVersionString,
              fields: schemaFields,
            });

      const passingRevision = await catalog.createManufacturerPartRevision({
        manufacturerId: manufacturer.id,
        componentTypeId,
        componentSchemaVersionId: schemaVersion.id,
        partNumber: `CM2B63-test-${randomUUID()}`,
        sourceRevision: "test-fixture",
        attributes: {
          bore_diameter: makeQuantity(63, "mm"),
          rod_diameter: makeQuantity(20, "mm"),
          stroke_min: makeQuantity(25, "mm"),
          stroke_max: makeQuantity(400, "mm"),
          mounting_style: enumValue("pneumatic_mounting_style", "fixed-supported"),
        },
      });
      const rejectedRevision = await catalog.createManufacturerPartRevision({
        manufacturerId: manufacturer.id,
        componentTypeId,
        componentSchemaVersionId: schemaVersion.id,
        partNumber: `CM2B10-test-${randomUUID()}`,
        sourceRevision: "test-fixture",
        attributes: {
          bore_diameter: makeQuantity(10, "mm"),
          rod_diameter: makeQuantity(4, "mm"),
          stroke_min: makeQuantity(25, "mm"),
          stroke_max: makeQuantity(400, "mm"),
          mounting_style: enumValue("pneumatic_mounting_style", "fixed-supported"),
        },
      });

      const view = await loadComponentAssignmentView(mi.id, user.id);

      expect(view).not.toBeNull();
      expect(view?.componentType).toBe("pneumatic_cylinder");
      expect(view?.matchingAvailable).toBe(true);
      expect(view?.matchingUnavailableReason).toBeNull();
      expect(view?.requiredSpec.length).toBeGreaterThan(0);

      const acceptedIds = (view?.accepted ?? []).map((c) => c.part.id);
      const rejectedIds = (view?.rejected ?? []).map((c) => c.part.id);
      expect(acceptedIds).toContain(passingRevision.id);
      expect(rejectedIds).toContain(rejectedRevision.id);
      expect(
        (view?.accepted.length ?? 0) + (view?.rejected.length ?? 0),
      ).toBeGreaterThanOrEqual(2);

      await client.prisma.manufacturerPartRevision.deleteMany({
        where: { id: { in: [passingRevision.id, rejectedRevision.id] } },
      });
      await client.prisma.manufacturer.delete({ where: { id: manufacturer.id } });
    });
  },
);
