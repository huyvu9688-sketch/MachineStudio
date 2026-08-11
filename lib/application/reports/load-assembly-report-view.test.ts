// Live-database tests for `loadAssemblyReportView` (Unit 5.2). Real
// PostgreSQL round trips, skipped when no `DATABASE_URL` is configured
// (tests/live-database.ts). Fixture shape mirrors `load-bom-view.test.ts`'s
// own two-level assembly tree.

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
  "loadAssemblyReportView (live database)",
  () => {
    let loadAssemblyReportView: typeof import("./load-assembly-report-view").loadAssemblyReportView;
    let executeModuleInstance: typeof import("../calculations/execute-module-instance").executeModuleInstance;
    let projects: typeof import("../../db/repositories/project-repository");
    let graph: typeof import("../../db/repositories/graph-repository");
    let client: typeof import("../../db/client");
    const createdUserIds: string[] = [];

    interface Fixture {
      readonly ownerId: UserId;
      readonly configId: MachineConfigurationId;
      readonly rootAssemblyId: AssemblyId;
      readonly childAssemblyId: AssemblyId;
      readonly rootModuleInstanceId: ModuleInstanceId;
      readonly childModuleInstanceId: ModuleInstanceId;
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
      const rootModuleInstance = await projects.createModuleInstance({
        assemblyId: rootAssembly.id,
        configurationId: config.id,
        modulePackageId: "example-relay",
        moduleVersion: "0.1.0",
        label: "Root relay",
      });
      const childModuleInstance = await projects.createModuleInstance({
        assemblyId: childAssembly.id,
        configurationId: config.id,
        modulePackageId: "example-relay",
        moduleVersion: "0.1.0",
        label: "Child relay",
      });
      return {
        ownerId: user.id,
        configId: config.id,
        rootAssemblyId: rootAssembly.id,
        childAssemblyId: childAssembly.id,
        rootModuleInstanceId: rootModuleInstance.id,
        childModuleInstanceId: childModuleInstance.id,
      };
    }

    async function runWithThrustForce(
      f: Fixture,
      moduleInstanceId: ModuleInstanceId,
      magnitudeNewtons: number,
    ): Promise<void> {
      await graph.createParameterValue({
        configurationId: f.configId,
        moduleInstanceId,
        nodeKind: "module_input",
        parameterId: "motion.axis.thrust_force",
        source: "manual",
        value: makeQuantity(magnitudeNewtons, "N"),
      });
      const result = await executeModuleInstance({
        moduleInstanceId,
        ownerId: f.ownerId,
      });
      if (!result.ok) {
        throw new Error(`seed execution failed: ${result.error.message}`);
      }
    }

    beforeAll(async () => {
      ({ loadAssemblyReportView } =
        await import("./load-assembly-report-view"));
      ({ executeModuleInstance } =
        await import("../calculations/execute-module-instance"));
      projects = await import("../../db/repositories/project-repository");
      graph = await import("../../db/repositories/graph-repository");
      client = await import("../../db/client");
    });

    afterEach(async () => {
      if (createdUserIds.length > 0) {
        await client.prisma.user.deleteMany({
          where: { id: { in: createdUserIds.splice(0) } },
        });
      }
    });

    it("returns null for an assembly that does not exist", async () => {
      const f = await fixture();
      const result = await loadAssemblyReportView(
        randomUUID() as AssemblyId,
        f.ownerId,
      );
      expect(result).toBeNull();
    });

    it("returns null for an assembly owned by another user", async () => {
      const f = await fixture();
      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);
      const result = await loadAssemblyReportView(
        f.rootAssemblyId,
        stranger.id,
      );
      expect(result).toBeNull();
    });

    it("rolls up an assembly's own module and its nested child assembly's module", async () => {
      const f = await fixture();
      await runWithThrustForce(f, f.rootModuleInstanceId, 100);
      await runWithThrustForce(f, f.childModuleInstanceId, 50);

      const result = await loadAssemblyReportView(
        f.rootAssemblyId,
        f.ownerId,
      );
      expect(result).not.toBeNull();
      if (result === null) return;

      expect(result.configurationName).toBe("Baseline");
      expect(result.root.assemblyName).toBe("X axis");
      expect(result.root.modules).toHaveLength(1);
      expect(result.root.modules[0].moduleInstance.label).toBe("Root relay");
      expect(result.root.modules[0].outputs[0].value).toEqual(
        makeQuantity(100, "N"),
      );

      expect(result.root.children).toHaveLength(1);
      const child = result.root.children[0];
      expect(child.assemblyName).toBe("Drive train");
      expect(child.modules).toHaveLength(1);
      expect(child.modules[0].moduleInstance.label).toBe("Child relay");
      expect(child.modules[0].outputs[0].value).toEqual(makeQuantity(50, "N"));
      expect(child.children).toEqual([]);
    });

    it("scopes to the requested assembly, excluding a sibling assembly's own module", async () => {
      const f = await fixture();
      await runWithThrustForce(f, f.childModuleInstanceId, 50);

      const result = await loadAssemblyReportView(
        f.childAssemblyId,
        f.ownerId,
      );
      expect(result).not.toBeNull();
      if (result === null) return;
      // Scoped to the child assembly alone: only its own module appears, not
      // the sibling root assembly's own module.
      expect(result.root.assemblyId).toBe(f.childAssemblyId);
      expect(result.root.modules).toHaveLength(1);
      expect(result.root.modules[0].moduleInstance.label).toBe("Child relay");
      expect(result.root.children).toEqual([]);
    });

    it("still returns an empty tree for an assembly with no module instances or children", async () => {
      const f = await fixture();
      const emptyAssembly = await projects.createAssembly({
        configurationId: f.configId,
        name: "Empty bay",
      });
      const result = await loadAssemblyReportView(emptyAssembly.id, f.ownerId);
      expect(result).not.toBeNull();
      if (result === null) return;
      expect(result.root.modules).toEqual([]);
      expect(result.root.children).toEqual([]);
    });
  },
);
