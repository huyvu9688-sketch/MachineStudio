// Live-database tests for `exportAccountData` (Unit 5.5, "Data export and
// account deletion path"). Real PostgreSQL round trips, skipped when no
// `DATABASE_URL` is configured (tests/live-database.ts). Fixture pattern
// mirrors load-bom-view.test.ts.

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { makeQuantity } from "@/lib/engine";
import type { UserId } from "../../db/repositories/types";

const MODULE_ID = "example-scaffold";
const MODULE_VERSION = "0.1.0";
const PAYLOAD_MASS = "motion.axis.payload_mass";

describe.skipIf(!liveDatabaseAvailable)(
  "exportAccountData (live database)",
  () => {
    let exportAccountData: typeof import("./export-account-data").exportAccountData;
    let projects: typeof import("../../db/repositories/project-repository");
    let graph: typeof import("../../db/repositories/graph-repository");
    let requirements: typeof import("../../db/repositories/requirements-repository");
    let executeModuleInstance: typeof import("../calculations/execute-module-instance").executeModuleInstance;
    let client: typeof import("../../db/client");
    const createdUserIds: string[] = [];

    beforeAll(async () => {
      exportAccountData = (await import("./export-account-data"))
        .exportAccountData;
      projects = await import("../../db/repositories/project-repository");
      graph = await import("../../db/repositories/graph-repository");
      requirements =
        await import("../../db/repositories/requirements-repository");
      executeModuleInstance = (
        await import("../calculations/execute-module-instance")
      ).executeModuleInstance;
      client = await import("../../db/client");
    });

    afterEach(async () => {
      if (createdUserIds.length > 0) {
        await client.prisma.user.deleteMany({
          where: { id: { in: createdUserIds.splice(0) } },
        });
      }
    });

    async function newUser(): Promise<UserId> {
      const user = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(user.id);
      return user.id;
    }

    it("returns an empty project list for an account with no projects", async () => {
      const ownerId = await newUser();
      const result = await exportAccountData(ownerId);
      expect(result.userId).toBe(ownerId);
      expect(result.projects).toEqual([]);
      expect(new Date(result.exportedAt).getTime()).not.toBeNaN();
    });

    it("includes a full project's own structure, requirement, parameter value, and calculation run snapshot", async () => {
      const ownerId = await newUser();
      const project = await projects.createProject({
        ownerId,
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
      await requirements.createRequirement({
        configurationId: config.id,
        code: "REQ-1",
        statement: "Must reach 2 m/s",
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
        ownerId,
      });
      if (!runResult.ok) {
        throw new Error(`seed execution failed: ${runResult.error.message}`);
      }

      const result = await exportAccountData(ownerId);

      expect(result.projects).toHaveLength(1);
      const exportedProject = result.projects[0]!;
      expect(exportedProject.tree.id).toBe(project.id);
      expect(exportedProject.tree.configurations).toHaveLength(1);
      expect(exportedProject.tree.configurations[0]!.assemblies[0]!.name).toBe(
        "X axis",
      );

      const exportedConfig = exportedProject.configurations[0]!;
      expect(exportedConfig.requirements).toHaveLength(1);
      expect(exportedConfig.requirements[0]!.statement).toBe(
        "Must reach 2 m/s",
      );
      expect(exportedConfig.parameterValues.length).toBeGreaterThanOrEqual(1);
      expect(
        exportedConfig.parameterValues.some(
          (value) => value.parameterId === PAYLOAD_MASS,
        ),
      ).toBe(true);

      expect(exportedConfig.moduleRuns).toHaveLength(1);
      const moduleRun = exportedConfig.moduleRuns[0]!;
      expect(moduleRun.moduleInstance.id).toBe(moduleInstance.id);
      expect(moduleRun.runs).toHaveLength(1);
      expect(moduleRun.runs[0]!.id).toBe(runResult.run.id);
      expect(moduleRun.runs[0]!.snapshot.computation).toBeDefined();
    });

    it("never includes another user's project", async () => {
      const ownerId = await newUser();
      const strangerId = await newUser();
      await projects.createProject({
        ownerId: strangerId,
        name: "Stranger's axis",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });

      const result = await exportAccountData(ownerId);
      expect(result.projects).toEqual([]);
    });
  },
);
