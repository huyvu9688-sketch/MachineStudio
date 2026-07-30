// Live-database tests for the `executeModuleInstance` application service
// (Unit 2.4) — the first `lib/application` boundary. Real PostgreSQL round
// trips; skips when the generated Prisma client is absent (see
// context/progress-tracker.md).
//
// Covers the Unit 2.4 test plan: successful execution, invalid inputs,
// missing module version, unauthorized access, and repeated execution
// creating a new run each time — plus the module-output link wiring this
// unit adds (context/implementation-map.md Unit 2.4).

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

const MODULE_ID = "example-scaffold";
const MODULE_VERSION = "0.1.0";
// The relay fixture declares the same canonical parameter in and out
// (see lib/modules/example-relay/0.1.0/manifest.ts), which is what makes a
// valid module-to-module link possible.
const RELAY_ID = "example-relay";
const RELAY_VERSION = "0.1.0";
const THRUST_FORCE = "motion.axis.thrust_force";

describe.skipIf(!liveDatabaseAvailable)(
  "executeModuleInstance (live database)",
  () => {
    let application: typeof import("./execute-module-instance");
    let projects: typeof import("../../db/repositories/project-repository");
    let graph: typeof import("../../db/repositories/graph-repository");
    let runs: typeof import("../../db/repositories/run-repository");
    let client: typeof import("../../db/client");
    const createdUserIds: string[] = [];

    interface Scaffold {
      readonly ownerId: UserId;
      readonly configId: MachineConfigurationId;
      readonly assemblyId: AssemblyId;
      readonly moduleInstanceId: ModuleInstanceId;
    }

    async function scaffold(
      overrides: { modulePackageId?: string; moduleVersion?: string } = {},
    ): Promise<Scaffold> {
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
        modulePackageId: overrides.modulePackageId ?? MODULE_ID,
        moduleVersion: overrides.moduleVersion ?? MODULE_VERSION,
        label: "Thrust",
      });
      return {
        ownerId: user.id,
        configId: config.id,
        assemblyId: assembly.id,
        moduleInstanceId: mi.id,
      };
    }

    async function authorPayloadMass(
      s: Scaffold,
      value: ReturnType<typeof makeQuantity>,
    ): Promise<void> {
      await graph.createParameterValue({
        configurationId: s.configId,
        moduleInstanceId: s.moduleInstanceId,
        nodeKind: "module_input",
        parameterId: "motion.axis.payload_mass",
        source: "manual",
        value,
      });
    }

    beforeAll(async () => {
      application = await import("./execute-module-instance");
      projects = await import("../../db/repositories/project-repository");
      graph = await import("../../db/repositories/graph-repository");
      runs = await import("../../db/repositories/run-repository");
      client = await import("../../db/client");
    });

    afterEach(async () => {
      if (createdUserIds.length > 0) {
        await client.prisma.user.deleteMany({
          where: { id: { in: createdUserIds.splice(0) } },
        });
      }
    });

    it("executes a module instance end to end and persists an immutable run", async () => {
      const s = await scaffold();
      await authorPayloadMass(s, makeQuantity(12, "kg"));

      const result = await application.executeModuleInstance({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: s.ownerId,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.run.status).toBe("pass");
      expect(result.run.modulePackageId).toBe(MODULE_ID);
      expect(result.run.moduleVersion).toBe(MODULE_VERSION);

      // Step 6: the module instance's status summary was updated atomically
      // with run persistence.
      const reloaded = await client.prisma.moduleInstance.findUnique({
        where: { id: s.moduleInstanceId },
      });
      expect(reloaded?.lastCalculationRunId).toBe(result.run.id);
      expect(reloaded?.lastRunStatus).toBe("pass");

      // Step 7: an audit event was appended in the same transaction.
      const events = await client.prisma.auditEvent.findMany({
        where: { entityId: result.run.id },
      });
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe("calculation_run.created");
      expect(events[0].userId).toBe(s.ownerId);
    });

    it("creates a new run each time, without deduplicating repeated execution", async () => {
      const s = await scaffold();
      await authorPayloadMass(s, makeQuantity(12, "kg"));

      const first = await application.executeModuleInstance({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: s.ownerId,
      });
      const second = await application.executeModuleInstance({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: s.ownerId,
      });
      expect(first.ok && second.ok).toBe(true);
      if (!first.ok || !second.ok) return;
      expect(first.run.id).not.toBe(second.run.id);

      const runs = await client.prisma.calculationRun.findMany({
        where: { moduleInstanceId: s.moduleInstanceId },
      });
      expect(runs).toHaveLength(2);

      // The module instance's status summary reflects the latest run.
      const reloaded = await client.prisma.moduleInstance.findUnique({
        where: { id: s.moduleInstanceId },
      });
      expect(reloaded?.lastCalculationRunId).toBe(second.run.id);
    });

    it("reports invalid_input when a resolved value fails the module's own validation", async () => {
      const s = await scaffold();
      // Wrong dimension for "motion.axis.payload_mass" (expects kg, a mass).
      await authorPayloadMass(s, makeQuantity(50, "N"));

      const result = await application.executeModuleInstance({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: s.ownerId,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("invalid_input");
    });

    it("reports module_not_found for an unregistered module package/version", async () => {
      const s = await scaffold({ modulePackageId: "does-not-exist", moduleVersion: "9.9.9" });

      const result = await application.executeModuleInstance({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: s.ownerId,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("module_not_found");
    });

    it("reports unauthorized for another owner's module instance", async () => {
      const s = await scaffold();
      await authorPayloadMass(s, makeQuantity(12, "kg"));
      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);

      const result = await application.executeModuleInstance({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: stranger.id,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");

      // No run was created against the owner's module instance.
      const runs = await client.prisma.calculationRun.findMany({
        where: { moduleInstanceId: s.moduleInstanceId },
      });
      expect(runs).toHaveLength(0);
    });

    it("resolves a linked module-output value from the source module's latest run", async () => {
      const upstream = await scaffold();
      await authorPayloadMass(upstream, makeQuantity(12, "kg"));
      const upstreamRun = await application.executeModuleInstance({
        moduleInstanceId: upstream.moduleInstanceId,
        ownerId: upstream.ownerId,
      });
      expect(upstreamRun.ok).toBe(true);

      // A second module instance in the same configuration, with its
      // "payload_mass" input linked to the upstream module's "result" output
      // (motion.axis.thrust_force) — semantically mismatched on purpose,
      // proving the value is actually pulled from the upstream run rather
      // than left unresolved (which would instead report "missing required
      // input").
      const downstream = await projects.createModuleInstance({
        assemblyId: upstream.assemblyId,
        configurationId: upstream.configId,
        modulePackageId: MODULE_ID,
        moduleVersion: MODULE_VERSION,
        label: "Downstream",
      });
      await graph.createParameterLink({
        configurationId: upstream.configId,
        targetModuleInstanceId: downstream.id,
        targetParameterId: "motion.axis.payload_mass",
        sourceKind: "module_output",
        sourceModuleInstanceId: upstream.moduleInstanceId,
        sourceParameterId: "motion.axis.thrust_force",
      });

      const result = await application.executeModuleInstance({
        moduleInstanceId: downstream.id,
        ownerId: upstream.ownerId,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      // Dimension mismatch (force fed into a mass port), not an absent value.
      expect(result.error.code).toBe("invalid_input");
      expect(result.error.message).not.toContain("Missing required input");
    });

    it("refuses to execute against a stale upstream run", async () => {
      // Two relay instances chained: the upstream's output feeds the
      // downstream's input, same canonical parameter, so the link is valid.
      const s = await scaffold({
        modulePackageId: RELAY_ID,
        moduleVersion: RELAY_VERSION,
      });
      await graph.createParameterValue({
        configurationId: s.configId,
        moduleInstanceId: s.moduleInstanceId,
        nodeKind: "module_input",
        parameterId: THRUST_FORCE,
        source: "manual",
        value: makeQuantity(274, "N"),
      });
      const upstreamRun = await application.executeModuleInstance({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: s.ownerId,
      });
      expect(upstreamRun.ok).toBe(true);
      if (!upstreamRun.ok) return;

      const downstream = await projects.createModuleInstance({
        assemblyId: s.assemblyId,
        configurationId: s.configId,
        modulePackageId: RELAY_ID,
        moduleVersion: RELAY_VERSION,
        label: "Downstream relay",
      });
      await graph.createParameterLink({
        configurationId: s.configId,
        targetModuleInstanceId: downstream.id,
        targetParameterId: THRUST_FORCE,
        sourceKind: "module_output",
        sourceModuleInstanceId: s.moduleInstanceId,
        sourceParameterId: THRUST_FORCE,
      });

      // While the upstream run is current, the downstream module executes and
      // consumes the relayed value.
      const fresh = await application.executeModuleInstance({
        moduleInstanceId: downstream.id,
        ownerId: s.ownerId,
      });
      expect(fresh.ok).toBe(true);
      if (!fresh.ok) return;
      expect(fresh.run.snapshot.input.values.thrust_force_in).toEqual(
        makeQuantity(274, "N"),
      );

      // Once the upstream run is stale, its outputs no longer follow from the
      // current design, so executing the downstream module would persist a
      // fresh-looking run built on superseded numbers.
      await runs.markRunStale(upstreamRun.run.id, true, "An upstream value changed.");
      const stale = await application.executeModuleInstance({
        moduleInstanceId: downstream.id,
        ownerId: s.ownerId,
      });
      expect(stale.ok).toBe(false);
      if (stale.ok) return;
      expect(stale.error.code).toBe("stale_upstream");
      expect(stale.error.message).toContain("An upstream value changed.");

      // Nothing was persisted for the refused execution.
      const downstreamRuns = await client.prisma.calculationRun.findMany({
        where: { moduleInstanceId: downstream.id },
      });
      expect(downstreamRuns).toHaveLength(1);
    });
  },
);
