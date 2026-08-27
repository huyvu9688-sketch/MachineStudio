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

    it("returns real ranked/rejected candidates for a guided-cylinder-sizing module instance with catalog rows", async () => {
      const user = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(user.id);
      const project = await projects.createProject({
        ownerId: user.id,
        name: "Guided lift station",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const config = await projects.createConfiguration({
        projectId: project.id,
        name: "Baseline",
      });
      const assembly = await projects.createAssembly({
        configurationId: config.id,
        name: "Guided cylinder",
      });
      const mi = await projects.createModuleInstance({
        assemblyId: assembly.id,
        configurationId: config.id,
        modulePackageId: "guided-cylinder-sizing",
        moduleVersion: "0.1.0",
        label: "Guided lift sizing",
      });

      // Same MGQM40 reference scenario this module's own Stage 4 reference
      // example reproduces (lib/modules/guided-cylinder-sizing/0.1.0/
      // smc-reference-example.ts): 10 kg vertical lift, zero friction, zero
      // process force, 10/5/0 mm roll/pitch/yaw offsets -- required extend
      // force ~98.07 N, required moment ~1.096 N*m.
      const inputs: Array<{
        parameterId: string;
        value: ReturnType<typeof makeQuantity> | EnumValue;
      }> = [
        { parameterId: "motion.axis.incline_angle", value: makeQuantity(Math.PI / 2, "rad") },
        { parameterId: "motion.axis.friction_coefficient", value: makeQuantity(0, "ratio") },
        { parameterId: "motion.axis.total_moving_mass", value: makeQuantity(10, "kg") },
        { parameterId: "pneumatic.operating_pressure", value: makeQuantity(0.5, "MPa") },
        { parameterId: "pneumatic.load_factor", value: makeQuantity(0.7, "ratio") },
        { parameterId: "pneumatic.max_piston_speed", value: makeQuantity(0.3, "m/s") },
        { parameterId: "pneumatic.cushion_type", value: enumValue("pneumatic_cushion_type", "none") },
        { parameterId: "pneumatic_guided_sizing.required_stroke", value: makeQuantity(50, "mm") },
        { parameterId: "pneumatic.mounting_style", value: enumValue("pneumatic_mounting_style", "fixed-supported") },
        { parameterId: "pneumatic.buckling_safety_factor", value: makeQuantity(4, "ratio") },
        { parameterId: "pneumatic_guided_sizing.roll_offset", value: makeQuantity(10, "mm") },
        { parameterId: "pneumatic_guided_sizing.pitch_offset", value: makeQuantity(5, "mm") },
        { parameterId: "pneumatic_guided_sizing.yaw_offset", value: makeQuantity(0, "mm") },
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

      // Catalog fixture: a real MGQM40 (accepts on every check -- bore 40,
      // rod 16 mm, 167 N allowable lateral load, 3.43 N*m allowable
      // torque, all directly read from the fetched MGQ catalog -- see
      // lib/modules/guided-cylinder-sizing/0.1.0/smc-reference-example.ts)
      // and a deliberately undersized MGQM12 (rejects on theoretical
      // force and allowable lateral load/torque). Uses the real
      // "pneumatic_cylinder_guided" ComponentType id, the same
      // idempotent load-or-create pattern the pneumatic_cylinder fixture
      // above uses.
      const manufacturer = await catalog.createManufacturer({
        name: `Test SMC ${randomUUID()}`,
      });
      const componentTypeId = asComponentTypeId("pneumatic_cylinder_guided");
      const existingType = await client.prisma.componentType.findUnique({
        where: { id: componentTypeId },
      });
      if (existingType === null) {
        await catalog.createComponentType({
          id: componentTypeId,
          name: "Pneumatic guided cylinder",
        });
      }
      const schemaFields = [
        { key: "bore_diameter", label: "Bore diameter", valueKind: "quantity" as const, required: true, unit: "mm" },
        { key: "rod_diameter", label: "Rod diameter", valueKind: "quantity" as const, required: true, unit: "mm" },
        { key: "stroke_min", label: "Minimum standard stroke", valueKind: "quantity" as const, required: true, unit: "mm" },
        { key: "stroke_max", label: "Maximum standard stroke", valueKind: "quantity" as const, required: true, unit: "mm" },
        { key: "allowable_lateral_load", label: "Allowable lateral load", valueKind: "quantity" as const, required: false, unit: "N" },
        { key: "allowable_torque", label: "Allowable rotational torque of plate", valueKind: "quantity" as const, required: true, unit: "N*m" },
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
        partNumber: `MGQM40-test-${randomUUID()}`,
        sourceRevision: "test-fixture",
        attributes: {
          bore_diameter: makeQuantity(40, "mm"),
          rod_diameter: makeQuantity(16, "mm"),
          stroke_min: makeQuantity(25, "mm"),
          stroke_max: makeQuantity(125, "mm"),
          allowable_lateral_load: makeQuantity(167, "N"),
          allowable_torque: makeQuantity(3.43, "N*m"),
        },
      });
      const rejectedRevision = await catalog.createManufacturerPartRevision({
        manufacturerId: manufacturer.id,
        componentTypeId,
        componentSchemaVersionId: schemaVersion.id,
        partNumber: `MGQM12-test-${randomUUID()}`,
        sourceRevision: "test-fixture",
        attributes: {
          bore_diameter: makeQuantity(12, "mm"),
          rod_diameter: makeQuantity(6, "mm"),
          stroke_min: makeQuantity(10, "mm"),
          stroke_max: makeQuantity(100, "mm"),
          allowable_lateral_load: makeQuantity(8, "N"),
          allowable_torque: makeQuantity(0.1, "N*m"),
        },
      });

      const view = await loadComponentAssignmentView(mi.id, user.id);

      expect(view).not.toBeNull();
      expect(view?.componentType).toBe("pneumatic_cylinder_guided");
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

    // Disclosed gap (Unit 7.4 / plan task 23 of 27): this test cannot pass
    // until plan task 25 runs `npm run registry:generate` and commits
    // lib/modules/registry.generated.ts -- `dual-rod-cylinder-sizing` is
    // not yet a registered module package, so `executeModuleInstance`
    // below would return `module_not_found` even with a live database.
    // Written and typechecked now (task 23), not executed against a live
    // database in this session -- DATABASE_URL is also unset here, so
    // `describe.skipIf(!liveDatabaseAvailable)` above skips this whole
    // block regardless. Expected to pass unmodified once task 25 lands,
    // the same order-of-operations gap this plan's own task list creates.
    it("returns real ranked/rejected candidates for a dual-rod-cylinder-sizing module instance with catalog rows", async () => {
      const user = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(user.id);
      const project = await projects.createProject({
        ownerId: user.id,
        name: "Dual rod station",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const config = await projects.createConfiguration({
        projectId: project.id,
        name: "Baseline",
      });
      const assembly = await projects.createAssembly({
        configurationId: config.id,
        name: "Dual rod cylinder",
      });
      const mi = await projects.createModuleInstance({
        assemblyId: assembly.id,
        configurationId: config.id,
        modulePackageId: "dual-rod-cylinder-sizing",
        moduleVersion: "0.1.0",
        label: "Dual rod cylinder sizing",
      });

      // Same CXS2M20 reference scenario this module's own Stage 4 reference
      // example reproduces (lib/modules/dual-rod-cylinder-sizing/0.1.0/
      // smc-reference-example.ts): horizontal mounting, 0.5 kg load, 0.1
      // friction coefficient, 0 incline, 0 process force, 0.5 MPa
      // pressure, 0.7 load factor, 0.3 m/s speed, 8mm required stroke,
      // 4mm overhang.
      const inputs: Array<{
        parameterId: string;
        value: ReturnType<typeof makeQuantity> | EnumValue;
      }> = [
        { parameterId: "motion.axis.incline_angle", value: makeQuantity(0, "rad") },
        { parameterId: "motion.axis.friction_coefficient", value: makeQuantity(0.1, "ratio") },
        { parameterId: "motion.axis.total_moving_mass", value: makeQuantity(0.5, "kg") },
        { parameterId: "dual_rod_sizing.process_force", value: makeQuantity(0, "N") },
        { parameterId: "pneumatic.operating_pressure", value: makeQuantity(0.5, "MPa") },
        { parameterId: "pneumatic.load_factor", value: makeQuantity(0.7, "ratio") },
        { parameterId: "pneumatic.max_piston_speed", value: makeQuantity(0.3, "m/s") },
        { parameterId: "pneumatic.cushion_type", value: enumValue("pneumatic_cushion_type", "none") },
        { parameterId: "dual_rod_sizing.required_stroke", value: makeQuantity(8, "mm") },
        { parameterId: "dual_rod_sizing.overhang_length", value: makeQuantity(4, "mm") },
        {
          parameterId: "dual_rod_sizing.mounting_orientation",
          value: enumValue("dual_rod_mounting_orientation", "horizontal"),
        },
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

      // Catalog fixture: a real CXS2M20-like part (accepts on every check --
      // bore 20mm, rod 10mm, slide bearing, an 8mm required stroke inside a
      // synthetic 5-100mm stroke range -- the same "real bore/rod, synthetic
      // stroke range pending the catalog-seed task" fixture
      // dual-rod-cylinder-matching.test.ts's own accepting smoke test
      // already uses) and a deliberately undersized bore-6 part (rejects on
      // the load-mass-vs-overhang-length check -- the same synthetic
      // candidate that test file's own rejecting smoke test already uses).
      // Uses the real "pneumatic_cylinder_dual_rod" ComponentType id, the
      // same idempotent load-or-create pattern the
      // pneumatic_cylinder/pneumatic_cylinder_guided fixtures above use.
      const manufacturer = await catalog.createManufacturer({
        name: `Test SMC ${randomUUID()}`,
      });
      const componentTypeId = asComponentTypeId("pneumatic_cylinder_dual_rod");
      const existingType = await client.prisma.componentType.findUnique({
        where: { id: componentTypeId },
      });
      if (existingType === null) {
        await catalog.createComponentType({
          id: componentTypeId,
          name: "Pneumatic dual-rod cylinder",
        });
      }
      const schemaFields = [
        { key: "bore_diameter", label: "Bore diameter", valueKind: "quantity" as const, required: true, unit: "mm" },
        { key: "rod_diameter", label: "Rod diameter", valueKind: "quantity" as const, required: true, unit: "mm" },
        { key: "stroke_min", label: "Minimum standard stroke", valueKind: "quantity" as const, required: true, unit: "mm" },
        { key: "stroke_max", label: "Maximum standard stroke", valueKind: "quantity" as const, required: true, unit: "mm" },
        { key: "bearing_type", label: "Bearing type", valueKind: "enum" as const, required: true, enumId: "dual_rod_bearing_type" },
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
        partNumber: `CXS2M20-test-${randomUUID()}`,
        sourceRevision: "test-fixture",
        attributes: {
          bore_diameter: makeQuantity(20, "mm"),
          rod_diameter: makeQuantity(10, "mm"),
          bearing_type: enumValue("dual_rod_bearing_type", "slide"),
          stroke_min: makeQuantity(5, "mm"),
          stroke_max: makeQuantity(100, "mm"),
        },
      });
      const rejectedRevision = await catalog.createManufacturerPartRevision({
        manufacturerId: manufacturer.id,
        componentTypeId,
        componentSchemaVersionId: schemaVersion.id,
        partNumber: `CXS2M6-test-${randomUUID()}`,
        sourceRevision: "test-fixture",
        attributes: {
          bore_diameter: makeQuantity(6, "mm"),
          rod_diameter: makeQuantity(3, "mm"),
          bearing_type: enumValue("dual_rod_bearing_type", "slide"),
          stroke_min: makeQuantity(1, "mm"),
          stroke_max: makeQuantity(50, "mm"),
        },
      });

      const view = await loadComponentAssignmentView(mi.id, user.id);

      expect(view).not.toBeNull();
      expect(view?.componentType).toBe("pneumatic_cylinder_dual_rod");
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
