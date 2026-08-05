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
import { makeQuantity } from "@/lib/engine";
import type {
  MachineConfigurationId,
  ModuleInstanceId,
  UserId,
} from "../../db/repositories/types";
import type { CalculationRunId } from "../../db/repositories/run-types";

describe.skipIf(!liveDatabaseAvailable)(
  "loadComponentAssignmentView (live database)",
  () => {
    let loadComponentAssignmentView: typeof import("./load-component-assignment-view").loadComponentAssignmentView;
    let assignComponent: typeof import("./assign-component").assignComponent;
    let executeModuleInstance: typeof import("../calculations/execute-module-instance").executeModuleInstance;
    let projects: typeof import("../../db/repositories/project-repository");
    let graph: typeof import("../../db/repositories/graph-repository");
    let client: typeof import("../../db/client");
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
  },
);
