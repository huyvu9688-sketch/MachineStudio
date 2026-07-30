// Live-database tests for the `createBaseline` application service (Unit 2.9
// part 2). Real PostgreSQL round trips; skips when the generated Prisma
// client is absent (see context/progress-tracker.md).
//
// Covers: the snapshot actually freezes requirements, assumptions, load
// cases, the assembly/module tree, current parameter values, calculation
// runs, and component assignments; the audit event is appended atomically;
// unauthorized access; and the stale-acknowledgement gate (the implementation
// map's "Stale/failed acknowledgement requirements" test intent). The
// "failed_run" blocker is exercised exhaustively at the pure
// `evaluateBaselineReadiness` level (lib/configuration/readiness.test.ts,
// Unit 2.9 part 1) rather than here: `example-scaffold`'s placeholder compute
// (`result = mass * 0`) can never fail its own "result is non-negative"
// check, and forcing a fake `status: "fail"` onto a real run is impossible by
// design — `calculation_runs_immutable_guard` (Unit 2.3) rejects any change
// to a run's `status` column, the same protection this suite exercises
// directly for `machine_baselines` in baseline-repository.test.ts.

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { makeQuantity } from "@/lib/engine";
import type { CalculationRunId } from "../../db/repositories/run-types";
import type {
  AssemblyId,
  MachineConfigurationId,
  MachineProjectId,
  ModuleInstanceId,
  UserId,
} from "../../db/repositories/types";

const here = dirname(fileURLToPath(import.meta.url));
const generatedClientAvailable = existsSync(
  join(here, "..", "..", "db", "generated", "prisma"),
);

const MODULE_ID = "example-scaffold";
const MODULE_VERSION = "0.1.0";
const PAYLOAD_MASS = "motion.axis.payload_mass";

describe.skipIf(!generatedClientAvailable)(
  "createBaseline (live database)",
  () => {
    let createBaseline: typeof import("./create-baseline").createBaseline;
    let setParameterValue: typeof import("../parameters/stale-propagation").setParameterValue;
    let assignComponent: typeof import("../catalogs/assign-component").assignComponent;
    let projects: typeof import("../../db/repositories/project-repository");
    let graph: typeof import("../../db/repositories/graph-repository");
    let requirements: typeof import("../../db/repositories/requirements-repository");
    let executeModuleInstance: typeof import("../calculations/execute-module-instance").executeModuleInstance;
    let audit: typeof import("../../db/repositories/audit-repository");
    let client: typeof import("../../db/client");
    const createdUserIds: string[] = [];

    interface Fixture {
      readonly ownerId: UserId;
      readonly projectId: MachineProjectId;
      readonly configId: MachineConfigurationId;
      readonly assemblyId: AssemblyId;
      readonly moduleInstanceId: ModuleInstanceId;
      readonly runId: CalculationRunId;
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
        modulePackageId: MODULE_ID,
        moduleVersion: MODULE_VERSION,
        label: "Screw sizing",
      });

      await requirements.createRequirement({
        configurationId: config.id,
        code: "REQ-01",
        statement: "The axis shall move the payload without exceeding limits.",
      });
      await requirements.createDesignAssumption({
        configurationId: config.id,
        statement: "Ambient temperature is 25 C.",
      });
      await requirements.createLoadCase({
        configurationId: config.id,
        category: "normal",
        label: "Normal cycle",
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

      const assignmentResult = await assignComponent(
        {
          configurationId: config.id,
          target: { kind: "module_instance", moduleInstanceId: moduleInstance.id },
          partSource: "manual",
          manualPartDetails: { description: "Custom screw" },
          calculationRunId: runResult.run.id,
        },
        user.id,
      );
      if (!assignmentResult.ok) {
        throw new Error(`seed assignment failed: ${assignmentResult.error.message}`);
      }

      return {
        ownerId: user.id,
        projectId: project.id,
        configId: config.id,
        assemblyId: assembly.id,
        moduleInstanceId: moduleInstance.id,
        runId: runResult.run.id,
      };
    }

    beforeAll(async () => {
      createBaseline = (await import("./create-baseline")).createBaseline;
      setParameterValue = (await import("../parameters/stale-propagation")).setParameterValue;
      assignComponent = (await import("../catalogs/assign-component")).assignComponent;
      projects = await import("../../db/repositories/project-repository");
      graph = await import("../../db/repositories/graph-repository");
      requirements = await import("../../db/repositories/requirements-repository");
      executeModuleInstance = (
        await import("../calculations/execute-module-instance")
      ).executeModuleInstance;
      audit = await import("../../db/repositories/audit-repository");
      client = await import("../../db/client");
    });

    afterEach(async () => {
      if (createdUserIds.length > 0) {
        await client.prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
      }
    });

    it("creates a baseline that freezes requirements, assumptions, load cases, the module tree, parameter values, runs, and component assignments", async () => {
      const f = await fixture();
      const result = await createBaseline(
        { configurationId: f.configId, label: "Design review 1" },
        f.ownerId,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const snapshot = result.baseline.snapshot;
      expect(snapshot.projectId).toBe(f.projectId);
      expect(snapshot.configurationId).toBe(f.configId);
      expect(snapshot.marketProfileKey).toBe("US-General-Industrial-Machinery@1");
      expect(snapshot.requirements).toHaveLength(1);
      expect(snapshot.requirements[0].code).toBe("REQ-01");
      expect(snapshot.designAssumptions).toHaveLength(1);
      expect(snapshot.loadCases).toHaveLength(1);

      expect(snapshot.assemblies).toHaveLength(1);
      expect(snapshot.assemblies[0].moduleInstances).toHaveLength(1);
      expect(snapshot.assemblies[0].moduleInstances[0].id).toBe(f.moduleInstanceId);
      expect(snapshot.assemblies[0].moduleInstances[0].lastRunStatus).toBe("pass");

      expect(snapshot.parameterValues.some((v) => v.parameterId === PAYLOAD_MASS)).toBe(true);

      expect(snapshot.calculationRuns).toHaveLength(1);
      expect(snapshot.calculationRuns[0].id).toBe(f.runId);
      expect(snapshot.calculationRuns[0].stale).toBe(false);

      expect(snapshot.componentAssignments).toHaveLength(1);
      expect(snapshot.componentAssignments[0].moduleInstanceId).toBe(f.moduleInstanceId);
    });

    it("appends a machine_baseline.created audit event atomically with the write", async () => {
      const f = await fixture();
      const result = await createBaseline(
        { configurationId: f.configId, label: "Design review 1" },
        f.ownerId,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const events = await audit.listAuditEventsForProject(f.projectId, f.ownerId);
      const created = events.find(
        (e) => e.eventType === "machine_baseline.created" && e.entityId === result.baseline.id,
      );
      expect(created).toBeDefined();
      expect(created?.payload).toMatchObject({ label: "Design review 1" });
    });

    it("reports unauthorized for a configuration not owned by the caller", async () => {
      const f = await fixture();
      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);

      const result = await createBaseline(
        { configurationId: f.configId, label: "Not yours" },
        stranger.id,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");
    });

    it("blocks creation on a stale run and dependent assignment, then proceeds once acknowledged", async () => {
      const f = await fixture();

      // Re-authoring the module's own input marks its existing run — and the
      // component assignment justified by that run — stale in the same
      // transaction (invariant 8, Unit 2.5/2.8).
      const staleResult = await setParameterValue(
        {
          configurationId: f.configId,
          moduleInstanceId: f.moduleInstanceId,
          nodeKind: "module_input",
          parameterId: PAYLOAD_MASS,
          source: "manual",
          value: makeQuantity(12, "kg"),
        },
        f.ownerId,
      );
      expect(staleResult.ok).toBe(true);

      const blocked = await createBaseline(
        { configurationId: f.configId, label: "Blocked" },
        f.ownerId,
      );
      expect(blocked.ok).toBe(false);
      if (blocked.ok) return;
      expect(blocked.error.code).toBe("not_ready");
      const kinds = blocked.error.blockers?.map((b) => b.kind) ?? [];
      expect(kinds).toContain("stale_run");
      expect(kinds).toContain("stale_assignment");

      const acknowledged = await createBaseline(
        { configurationId: f.configId, label: "Acknowledged", acknowledgeWarnings: true },
        f.ownerId,
      );
      expect(acknowledged.ok).toBe(true);
      if (!acknowledged.ok) return;
      expect(acknowledged.baseline.snapshot.calculationRuns[0]?.stale).toBe(true);
    });
  },
);
