// Live-database tests for the stale-propagation use cases (Unit 2.5).
// Real PostgreSQL round trips; skips when the generated Prisma client is
// absent (see context/progress-tracker.md).
//
// Covers the Unit 2.5 test plan: multi-level dependency chain, multiple
// branches, no unrelated stale records, and transaction rollback — plus the
// individual behavior of each implemented use case (confirm marks the
// target's existing run stale, remove marks it stale and deletes the row,
// unauthorized access) and provider-value authorization (no owning module
// instance).

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { makeQuantity, type EngineeringValue } from "@/lib/engine";
import type { CalculationRunId } from "../../db/repositories/run-types";
import type {
  AssemblyId,
  MachineConfigurationId,
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
const THRUST_FORCE = "motion.axis.thrust_force";

describe.skipIf(!generatedClientAvailable)(
  "stale-propagation use cases (live database)",
  () => {
    let stalePropagation: typeof import("./stale-propagation");
    let executeModuleInstance: typeof import("../calculations/execute-module-instance").executeModuleInstance;
    let projects: typeof import("../../db/repositories/project-repository");
    let graph: typeof import("../../db/repositories/graph-repository");
    let runs: typeof import("../../db/repositories/run-repository");
    let client: typeof import("../../db/client");
    const createdUserIds: string[] = [];

    interface Scaffold {
      readonly ownerId: UserId;
      readonly configId: MachineConfigurationId;
      readonly assemblyId: AssemblyId;
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
      return { ownerId: user.id, configId: config.id, assemblyId: assembly.id };
    }

    async function newModuleWithRun(
      s: Scaffold,
      label: string,
    ): Promise<{ moduleInstanceId: ModuleInstanceId; runId: CalculationRunId }> {
      const mi = await projects.createModuleInstance({
        assemblyId: s.assemblyId,
        modulePackageId: MODULE_ID,
        moduleVersion: MODULE_VERSION,
        label,
      });
      await graph.createParameterValue({
        configurationId: s.configId,
        moduleInstanceId: mi.id,
        nodeKind: "module_input",
        parameterId: PAYLOAD_MASS,
        source: "manual",
        value: makeQuantity(10, "kg"),
      });
      const result = await executeModuleInstance({
        moduleInstanceId: mi.id,
        ownerId: s.ownerId,
      });
      if (!result.ok) throw new Error(`seed execution failed: ${result.error.message}`);
      return { moduleInstanceId: mi.id, runId: result.run.id };
    }

    function linkInput(s: Scaffold, sourceModuleInstanceId: ModuleInstanceId, targetModuleInstanceId: ModuleInstanceId) {
      return {
        configurationId: s.configId,
        targetModuleInstanceId,
        targetParameterId: PAYLOAD_MASS,
        sourceKind: "module_output" as const,
        sourceModuleInstanceId,
        sourceParameterId: THRUST_FORCE,
      };
    }

    async function isRunStale(runId: CalculationRunId): Promise<boolean> {
      const row = await client.prisma.calculationRun.findUniqueOrThrow({
        where: { id: runId },
      });
      return row.stale;
    }

    /**
     * Clears a run's stale flag, simulating "this run is the current one" for
     * test setup. Confirming a link already stales its target's existing run
     * (a behavior asserted directly elsewhere) — tests that need a *fresh*
     * run to then re-stale can't get one by re-executing through this suite's
     * example-scaffold link, since its one input/output pair is deliberately
     * dimension-mismatched (mass in, force out) precisely so linked-value
     * resolution is exercised; re-executing through it fails validation
     * rather than producing a new run. `markRunStale` is the real,
     * public primitive for toggling this flag either direction.
     */
    async function resetRunFresh(runId: CalculationRunId): Promise<void> {
      await runs.markRunStale(runId, false);
    }

    beforeAll(async () => {
      stalePropagation = await import("./stale-propagation");
      executeModuleInstance = (await import("../calculations/execute-module-instance"))
        .executeModuleInstance;
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

    it("marks a multi-level dependency chain stale", async () => {
      const s = await scaffold();
      const a = await newModuleWithRun(s, "A");
      const b = await newModuleWithRun(s, "B");
      const c = await newModuleWithRun(s, "C");

      const ab = await stalePropagation.confirmParameterLink(
        linkInput(s, a.moduleInstanceId, b.moduleInstanceId),
        s.ownerId,
      );
      const bc = await stalePropagation.confirmParameterLink(
        linkInput(s, b.moduleInstanceId, c.moduleInstanceId),
        s.ownerId,
      );
      expect(ab.ok && bc.ok).toBe(true);

      // Confirming each link already staled B's and C's existing run
      // (asserted directly elsewhere); reset both to "fresh" so this test
      // isolates the effect of changing A's value specifically.
      await resetRunFresh(b.runId);
      await resetRunFresh(c.runId);

      const result = await stalePropagation.setParameterValue(
        {
          configurationId: s.configId,
          moduleInstanceId: a.moduleInstanceId,
          nodeKind: "module_input",
          parameterId: PAYLOAD_MASS,
          source: "manual",
          value: makeQuantity(20, "kg"),
        },
        s.ownerId,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(new Set(result.staleModuleInstanceIds)).toEqual(
        new Set([a.moduleInstanceId, b.moduleInstanceId, c.moduleInstanceId]),
      );
      expect(await isRunStale(a.runId)).toBe(true);
      expect(await isRunStale(b.runId)).toBe(true);
      expect(await isRunStale(c.runId)).toBe(true);
    });

    it("marks multiple branches stale from one shared source", async () => {
      const s = await scaffold();
      const a = await newModuleWithRun(s, "A");
      const b = await newModuleWithRun(s, "B");
      const c = await newModuleWithRun(s, "C");

      const ab = await stalePropagation.confirmParameterLink(
        linkInput(s, a.moduleInstanceId, b.moduleInstanceId),
        s.ownerId,
      );
      const ac = await stalePropagation.confirmParameterLink(
        linkInput(s, a.moduleInstanceId, c.moduleInstanceId),
        s.ownerId,
      );
      expect(ab.ok && ac.ok).toBe(true);

      await resetRunFresh(b.runId);
      await resetRunFresh(c.runId);

      const result = await stalePropagation.setParameterValue(
        {
          configurationId: s.configId,
          moduleInstanceId: a.moduleInstanceId,
          nodeKind: "module_input",
          parameterId: PAYLOAD_MASS,
          source: "manual",
          value: makeQuantity(25, "kg"),
        },
        s.ownerId,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(new Set(result.staleModuleInstanceIds)).toEqual(
        new Set([a.moduleInstanceId, b.moduleInstanceId, c.moduleInstanceId]),
      );
      expect(await isRunStale(b.runId)).toBe(true);
      expect(await isRunStale(c.runId)).toBe(true);
    });

    it("does not mark unrelated module instances stale", async () => {
      const s = await scaffold();
      const a = await newModuleWithRun(s, "A");
      const b = await newModuleWithRun(s, "B");
      const unrelated = await newModuleWithRun(s, "Unrelated");

      const ab = await stalePropagation.confirmParameterLink(
        linkInput(s, a.moduleInstanceId, b.moduleInstanceId),
        s.ownerId,
      );
      expect(ab.ok).toBe(true);

      const result = await stalePropagation.setParameterValue(
        {
          configurationId: s.configId,
          moduleInstanceId: a.moduleInstanceId,
          nodeKind: "module_input",
          parameterId: PAYLOAD_MASS,
          source: "manual",
          value: makeQuantity(30, "kg"),
        },
        s.ownerId,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.staleModuleInstanceIds).not.toContain(unrelated.moduleInstanceId);
      expect(await isRunStale(unrelated.runId)).toBe(false);
    });

    it("rolls back the whole transaction when the write fails, including the stale marks", async () => {
      const s = await scaffold();
      const a = await newModuleWithRun(s, "A");
      const b = await newModuleWithRun(s, "B");
      const ab = await stalePropagation.confirmParameterLink(
        linkInput(s, a.moduleInstanceId, b.moduleInstanceId),
        s.ownerId,
      );
      expect(ab.ok).toBe(true);
      await resetRunFresh(b.runId);

      const invalidValue = { kind: "not_a_real_kind" } as unknown as EngineeringValue;
      const result = await stalePropagation.setParameterValue(
        {
          configurationId: s.configId,
          moduleInstanceId: a.moduleInstanceId,
          nodeKind: "module_input",
          parameterId: PAYLOAD_MASS,
          source: "manual",
          value: invalidValue,
        },
        s.ownerId,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("invalid_input");

      // The transaction rolled back entirely: B's run — which would have
      // been marked stale first, inside the same transaction as the failed
      // write — remains untouched.
      expect(await isRunStale(b.runId)).toBe(false);
    });

    it("confirming a link marks the target module's existing run stale", async () => {
      const s = await scaffold();
      const a = await newModuleWithRun(s, "A");
      const b = await newModuleWithRun(s, "B");
      expect(await isRunStale(b.runId)).toBe(false);

      const result = await stalePropagation.confirmParameterLink(
        linkInput(s, a.moduleInstanceId, b.moduleInstanceId),
        s.ownerId,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.staleModuleInstanceIds).toContain(b.moduleInstanceId);
      expect(await isRunStale(b.runId)).toBe(true);
    });

    it("removing a link marks the target module's run stale and deletes the link", async () => {
      const s = await scaffold();
      const a = await newModuleWithRun(s, "A");
      const b = await newModuleWithRun(s, "B");
      const confirmed = await stalePropagation.confirmParameterLink(
        linkInput(s, a.moduleInstanceId, b.moduleInstanceId),
        s.ownerId,
      );
      expect(confirmed.ok).toBe(true);
      if (!confirmed.ok) return;
      await resetRunFresh(b.runId);

      const removed = await stalePropagation.removeParameterLink(confirmed.link.id, s.ownerId);
      expect(removed.ok).toBe(true);
      if (!removed.ok) return;
      expect(removed.staleModuleInstanceIds).toContain(b.moduleInstanceId);
      expect(await isRunStale(b.runId)).toBe(true);

      const linkRow = await client.prisma.parameterLink.findUnique({
        where: { id: confirmed.link.id },
      });
      expect(linkRow).toBeNull();
    });

    it("authorizes a provider (machine_requirement) value change via configuration ownership", async () => {
      const s = await scaffold();
      const result = await stalePropagation.setParameterValue(
        {
          configurationId: s.configId,
          nodeKind: "machine_requirement",
          parameterId: PAYLOAD_MASS,
          source: "manual",
          value: makeQuantity(15, "kg"),
        },
        s.ownerId,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.staleModuleInstanceIds).toEqual([]);
    });

    it("reports unauthorized for setParameterValue on another owner's configuration", async () => {
      const s = await scaffold();
      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);

      const result = await stalePropagation.setParameterValue(
        {
          configurationId: s.configId,
          nodeKind: "machine_requirement",
          parameterId: PAYLOAD_MASS,
          source: "manual",
          value: makeQuantity(5, "kg"),
        },
        stranger.id,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");
    });

    it("reports unauthorized for confirmParameterLink on another owner's module instance", async () => {
      const s = await scaffold();
      const a = await newModuleWithRun(s, "A");
      const b = await newModuleWithRun(s, "B");
      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);

      const result = await stalePropagation.confirmParameterLink(
        linkInput(s, a.moduleInstanceId, b.moduleInstanceId),
        stranger.id,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");
    });

    it("reports unauthorized for removeParameterLink on another owner's link", async () => {
      const s = await scaffold();
      const a = await newModuleWithRun(s, "A");
      const b = await newModuleWithRun(s, "B");
      const confirmed = await stalePropagation.confirmParameterLink(
        linkInput(s, a.moduleInstanceId, b.moduleInstanceId),
        s.ownerId,
      );
      expect(confirmed.ok).toBe(true);
      if (!confirmed.ok) return;

      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);

      const result = await stalePropagation.removeParameterLink(confirmed.link.id, stranger.id);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");

      // The link still exists — nothing was removed.
      const linkRow = await client.prisma.parameterLink.findUnique({
        where: { id: confirmed.link.id },
      });
      expect(linkRow).not.toBeNull();
    });
  },
);
