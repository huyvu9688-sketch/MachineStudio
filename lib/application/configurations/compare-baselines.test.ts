// Live-database tests for the `compareBaselines` application service (Unit
// 2.9 part 2). Real PostgreSQL round trips; skips when the generated Prisma
// client is absent (see context/progress-tracker.md).
//
// Covers the implementation map's Unit 2.9 test intent ("Comparison of
// changed values, results, and parts") end to end: two real baselines of the
// same configuration, taken before and after a value change and a new run,
// diffed through the full stack (repository load → lib/configuration's pure
// `compareBaselineSnapshots`) — the category-level diff semantics themselves
// are already covered exhaustively in lib/configuration/comparison.test.ts
// (Unit 2.9 part 1); this file proves the wiring, not the diff logic again.

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { makeQuantity } from "@/lib/engine";
import type {
  MachineConfigurationId,
  ModuleInstanceId,
  UserId,
} from "../../db/repositories/types";
import type { MachineBaselineId } from "../../db/repositories/baseline-types";

const MODULE_ID = "example-scaffold";
const MODULE_VERSION = "0.1.0";
const PAYLOAD_MASS = "motion.axis.payload_mass";

describe.skipIf(!liveDatabaseAvailable)(
  "compareBaselines (live database)",
  () => {
    let createBaseline: typeof import("./create-baseline").createBaseline;
    let compareBaselines: typeof import("./compare-baselines").compareBaselines;
    let setParameterValue: typeof import("../parameters/stale-propagation").setParameterValue;
    let projects: typeof import("../../db/repositories/project-repository");
    let graph: typeof import("../../db/repositories/graph-repository");
    let executeModuleInstance: typeof import("../calculations/execute-module-instance").executeModuleInstance;
    let client: typeof import("../../db/client");
    const createdUserIds: string[] = [];

    interface Fixture {
      readonly ownerId: UserId;
      readonly configId: MachineConfigurationId;
      readonly moduleInstanceId: ModuleInstanceId;
    }

    async function fixture(): Promise<Fixture> {
      const user = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(user.id);
      const project = await projects.createProject({
        ownerId: user.id,
        name: "Axis",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const config = await projects.createConfiguration({ projectId: project.id, name: "Baseline" });
      const assembly = await projects.createAssembly({ configurationId: config.id, name: "X axis" });
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
      if (!runResult.ok) throw new Error(`seed execution failed: ${runResult.error.message}`);

      return { ownerId: user.id, configId: config.id, moduleInstanceId: moduleInstance.id };
    }

    beforeAll(async () => {
      createBaseline = (await import("./create-baseline")).createBaseline;
      compareBaselines = (await import("./compare-baselines")).compareBaselines;
      setParameterValue = (await import("../parameters/stale-propagation")).setParameterValue;
      projects = await import("../../db/repositories/project-repository");
      graph = await import("../../db/repositories/graph-repository");
      executeModuleInstance = (
        await import("../calculations/execute-module-instance")
      ).executeModuleInstance;
      client = await import("../../db/client");
    });

    afterEach(async () => {
      if (createdUserIds.length > 0) {
        await client.prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
      }
    });

    it("shows a changed parameter value and a changed run between two real baselines", async () => {
      const f = await fixture();
      const before = await createBaseline({ configurationId: f.configId, label: "Before" }, f.ownerId);
      expect(before.ok).toBe(true);
      if (!before.ok) return;

      // Change the value (marks the existing run stale), acknowledge, run
      // again (a fresh, non-stale run for the same module instance), then
      // take a second baseline.
      const changed = await setParameterValue(
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
      expect(changed.ok).toBe(true);
      const rerun = await executeModuleInstance({
        moduleInstanceId: f.moduleInstanceId,
        ownerId: f.ownerId,
      });
      expect(rerun.ok).toBe(true);

      const after = await createBaseline({ configurationId: f.configId, label: "After" }, f.ownerId);
      expect(after.ok).toBe(true);
      if (!after.ok) return;

      const result = await compareBaselines(before.baseline.id, after.baseline.id, f.ownerId);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const valueChange = result.comparison.parameterValues.changed.find(
        (c) => c.after.parameterId === PAYLOAD_MASS,
      );
      expect(valueChange).toBeDefined();
      expect(valueChange?.before.value).toEqual(makeQuantity(10, "kg"));
      expect(valueChange?.after.value).toEqual(makeQuantity(15, "kg"));

      const runChange = result.comparison.calculationRuns.changed.find(
        (c) => c.id === f.moduleInstanceId,
      );
      expect(runChange).toBeDefined();
      expect(runChange?.before.id).not.toBe(runChange?.after.id);
    });

    it("reports not_found when the first baseline does not exist", async () => {
      const f = await fixture();
      const baseline = await createBaseline({ configurationId: f.configId, label: "Only" }, f.ownerId);
      expect(baseline.ok).toBe(true);
      if (!baseline.ok) return;

      const result = await compareBaselines(
        "does-not-exist" as MachineBaselineId,
        baseline.baseline.id,
        f.ownerId,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("not_found");
    });

    it("reports not_found for a baseline owned by a different user", async () => {
      const f = await fixture();
      const baseline = await createBaseline({ configurationId: f.configId, label: "Owned" }, f.ownerId);
      expect(baseline.ok).toBe(true);
      if (!baseline.ok) return;

      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);

      const result = await compareBaselines(baseline.baseline.id, baseline.baseline.id, stranger.id);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("not_found");
    });
  },
);
