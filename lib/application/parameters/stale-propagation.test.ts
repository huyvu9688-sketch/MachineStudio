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
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { makeQuantity, type EngineeringValue } from "@/lib/engine";
import type { ComponentAssignmentId } from "../../db/repositories/component-assignment-types";
import type { CalculationRunId } from "../../db/repositories/run-types";
import type {
  AssemblyId,
  MachineConfigurationId,
  ModuleInstanceId,
  UserId,
} from "../../db/repositories/types";

// Chains are built from the relay fixture, whose declared input and output are
// the same canonical parameter (lib/modules/example-relay/0.1.0/manifest.ts).
// `confirmParameterLink` enforces semantic compatibility, so a chain of
// example-scaffold instances (mass in, force out) is not expressible — by
// design: that link is genuinely unsafe, and one test below asserts it is
// rejected.
const MODULE_ID = "example-relay";
const MODULE_VERSION = "0.1.0";
const SCAFFOLD_ID = "example-scaffold";
const SCAFFOLD_VERSION = "0.1.0";
const PAYLOAD_MASS = "motion.axis.payload_mass";
const THRUST_FORCE = "motion.axis.thrust_force";

describe.skipIf(!liveDatabaseAvailable)(
  "stale-propagation use cases (live database)",
  () => {
    let stalePropagation: typeof import("./stale-propagation");
    let executeModuleInstance: typeof import("../calculations/execute-module-instance").executeModuleInstance;
    let projects: typeof import("../../db/repositories/project-repository");
    let graph: typeof import("../../db/repositories/graph-repository");
    let runs: typeof import("../../db/repositories/run-repository");
    let assignments: typeof import("../../db/repositories/component-assignment-repository");
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
    ): Promise<{
      moduleInstanceId: ModuleInstanceId;
      runId: CalculationRunId;
    }> {
      const mi = await projects.createModuleInstance({
        assemblyId: s.assemblyId,
        configurationId: s.configId,
        modulePackageId: MODULE_ID,
        moduleVersion: MODULE_VERSION,
        label,
      });
      await graph.createParameterValue({
        configurationId: s.configId,
        moduleInstanceId: mi.id,
        nodeKind: "module_input",
        parameterId: THRUST_FORCE,
        source: "manual",
        value: makeQuantity(274, "N"),
      });
      const result = await executeModuleInstance({
        moduleInstanceId: mi.id,
        ownerId: s.ownerId,
      });
      if (!result.ok)
        throw new Error(`seed execution failed: ${result.error.message}`);
      return { moduleInstanceId: mi.id, runId: result.run.id };
    }

    /**
     * A second configuration (with an assembly) under the *same* owner — the
     * case ownership checks alone cannot catch.
     */
    async function otherConfiguration(
      s: Scaffold,
    ): Promise<{ configId: MachineConfigurationId; assemblyId: AssemblyId }> {
      const project = await projects.createProject({
        ownerId: s.ownerId,
        name: "Other machine",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const config = await projects.createConfiguration({
        projectId: project.id,
        name: "Other baseline",
      });
      const assembly = await projects.createAssembly({
        configurationId: config.id,
        name: "Y axis",
      });
      return { configId: config.id, assemblyId: assembly.id };
    }

    /** An example-scaffold instance (mass in, force out) — for the incompatible-link case. */
    async function newScaffoldModule(
      s: Scaffold,
      label: string,
    ): Promise<ModuleInstanceId> {
      const mi = await projects.createModuleInstance({
        assemblyId: s.assemblyId,
        configurationId: s.configId,
        modulePackageId: SCAFFOLD_ID,
        moduleVersion: SCAFFOLD_VERSION,
        label,
      });
      return mi.id;
    }

    function linkInput(
      s: Scaffold,
      sourceModuleInstanceId: ModuleInstanceId,
      targetModuleInstanceId: ModuleInstanceId,
    ) {
      return {
        configurationId: s.configId,
        targetModuleInstanceId,
        targetParameterId: THRUST_FORCE,
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

    async function isAssignmentStale(
      id: ComponentAssignmentId,
    ): Promise<boolean> {
      const row = await client.prisma.componentAssignment.findUniqueOrThrow({
        where: { id },
      });
      return row.stale;
    }

    /** A manual-sourced assignment targeting a module instance's calculated run (Unit 2.8). */
    async function assignToModule(
      s: Scaffold,
      m: { moduleInstanceId: ModuleInstanceId; runId: CalculationRunId },
    ): Promise<ComponentAssignmentId> {
      const created = await assignments.createComponentAssignment({
        configurationId: s.configId,
        targetKind: "module_instance",
        moduleInstanceId: m.moduleInstanceId,
        partSource: "manual",
        manualPartDetails: {
          description: "Stand-in part for stale-propagation tests",
        },
        calculationRunId: m.runId,
      });
      return created.id;
    }

    /**
     * Clears a run's stale flag, simulating "this run is the current one" for
     * test setup. Confirming a link already stales its target's existing run
     * (a behavior asserted directly elsewhere), so a test that needs a *fresh*
     * run to then re-stale resets the flag here rather than re-executing —
     * keeping each assertion about one propagation event. `markRunStale` is
     * the real, public primitive for toggling this flag either direction.
     */
    async function resetRunFresh(runId: CalculationRunId): Promise<void> {
      await runs.markRunStale(runId, false);
    }

    beforeAll(async () => {
      stalePropagation = await import("./stale-propagation");
      executeModuleInstance = (
        await import("../calculations/execute-module-instance")
      ).executeModuleInstance;
      projects = await import("../../db/repositories/project-repository");
      graph = await import("../../db/repositories/graph-repository");
      runs = await import("../../db/repositories/run-repository");
      assignments =
        await import("../../db/repositories/component-assignment-repository");
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
          parameterId: THRUST_FORCE,
          source: "manual",
          value: makeQuantity(300, "N"),
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
          parameterId: THRUST_FORCE,
          source: "manual",
          value: makeQuantity(320, "N"),
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
          parameterId: THRUST_FORCE,
          source: "manual",
          value: makeQuantity(340, "N"),
        },
        s.ownerId,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.staleModuleInstanceIds).not.toContain(
        unrelated.moduleInstanceId,
      );
      expect(await isRunStale(unrelated.runId)).toBe(false);
    });

    // --- No-op guard (Unit 3.9 follow-up) -------------------------------

    it("performs no write and propagates no stale state when re-saving the same manual value", async () => {
      const s = await scaffold();
      const a = await newModuleWithRun(s, "A");
      const b = await newModuleWithRun(s, "B");
      const ab = await stalePropagation.confirmParameterLink(
        linkInput(s, a.moduleInstanceId, b.moduleInstanceId),
        s.ownerId,
      );
      expect(ab.ok).toBe(true);
      await resetRunFresh(b.runId);

      // newModuleWithRun seeds THRUST_FORCE at exactly 274 N (manual).
      const rowCountBefore = await client.prisma.parameterValue.count({
        where: {
          moduleInstanceId: a.moduleInstanceId,
          parameterId: THRUST_FORCE,
        },
      });

      const result = await stalePropagation.setParameterValue(
        {
          configurationId: s.configId,
          moduleInstanceId: a.moduleInstanceId,
          nodeKind: "module_input",
          parameterId: THRUST_FORCE,
          source: "manual",
          value: makeQuantity(274, "N"),
        },
        s.ownerId,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.staleModuleInstanceIds).toEqual([]);
      expect(await isRunStale(a.runId)).toBe(false);
      expect(await isRunStale(b.runId)).toBe(false);

      const rowCountAfter = await client.prisma.parameterValue.count({
        where: {
          moduleInstanceId: a.moduleInstanceId,
          parameterId: THRUST_FORCE,
        },
      });
      expect(rowCountAfter).toBe(rowCountBefore);
    });

    it("still writes and propagates stale state when the source changes at an identical magnitude", async () => {
      const s = await scaffold();
      const a = await newModuleWithRun(s, "A");
      // a's THRUST_FORCE input already holds a "manual" 274 N value
      // (newModuleWithRun); switching its source to "workflow" at the same
      // magnitude is a real provenance change, not a no-op.
      const result = await stalePropagation.setParameterValue(
        {
          configurationId: s.configId,
          moduleInstanceId: a.moduleInstanceId,
          nodeKind: "module_input",
          parameterId: THRUST_FORCE,
          source: "workflow",
          value: makeQuantity(274, "N"),
        },
        s.ownerId,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.source).toBe("workflow");
      expect(result.staleModuleInstanceIds).toContain(a.moduleInstanceId);
      expect(await isRunStale(a.runId)).toBe(true);
    });

    it("still writes when the magnitude genuinely differs, even within float noise of a round-trip conversion", async () => {
      const s = await scaffold();
      const a = await newModuleWithRun(s, "A");

      const result = await stalePropagation.setParameterValue(
        {
          configurationId: s.configId,
          moduleInstanceId: a.moduleInstanceId,
          nodeKind: "module_input",
          parameterId: THRUST_FORCE,
          source: "manual",
          value: makeQuantity(274.5, "N"),
        },
        s.ownerId,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.staleModuleInstanceIds).toContain(a.moduleInstanceId);
      expect(await isRunStale(a.runId)).toBe(true);
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

      const invalidValue = {
        kind: "not_a_real_kind",
      } as unknown as EngineeringValue;
      const result = await stalePropagation.setParameterValue(
        {
          configurationId: s.configId,
          moduleInstanceId: a.moduleInstanceId,
          nodeKind: "module_input",
          parameterId: THRUST_FORCE,
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

    it("never lets two concurrently confirmed links close a cycle together (2026-08-20 release audit)", async () => {
      // A -> B is confirmed first and settles, so this reproduces a genuine
      // race only on the second pair: B -> C and C -> A are launched
      // concurrently. Each alone is acyclic against the graph as committed
      // when it started; if both were allowed to commit, A -> B -> C -> A
      // would close a cycle neither transaction alone would have seen. The
      // Serializable isolation confirmParameterLink now runs under must make
      // Postgres abort one of the two with a "conflict" outcome instead of
      // silently allowing both — this is the write-skew case READ COMMITTED
      // (the previous default) could never catch, since the two writes touch
      // different ParameterLink rows.
      const s = await scaffold();
      const a = await newModuleWithRun(s, "A");
      const b = await newModuleWithRun(s, "B");
      const c = await newModuleWithRun(s, "C");

      const ab = await stalePropagation.confirmParameterLink(
        linkInput(s, a.moduleInstanceId, b.moduleInstanceId),
        s.ownerId,
      );
      expect(ab.ok).toBe(true);

      const [bc, ca] = await Promise.all([
        stalePropagation.confirmParameterLink(
          linkInput(s, b.moduleInstanceId, c.moduleInstanceId),
          s.ownerId,
        ),
        stalePropagation.confirmParameterLink(
          linkInput(s, c.moduleInstanceId, a.moduleInstanceId),
          s.ownerId,
        ),
      ]);

      // At most one of the two racing confirmations may have succeeded.
      const outcomes = [bc, ca];
      const succeeded = outcomes.filter((r) => r.ok);
      expect(succeeded.length).toBeLessThanOrEqual(1);
      // Whichever failed did so for a reason that is actually about the
      // race, not an unrelated bug swallowing the assertion above.
      for (const r of outcomes) {
        if (!r.ok) {
          expect(["cycle", "conflict"]).toContain(r.error.code);
        }
      }

      const links = await client.prisma.parameterLink.findMany({
        where: { configurationId: s.configId },
      });
      expect(links.length).toBeLessThanOrEqual(2);
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

      const removed = await stalePropagation.removeParameterLink(
        confirmed.link.id,
        s.ownerId,
      );
      expect(removed.ok).toBe(true);
      if (!removed.ok) return;
      expect(removed.staleModuleInstanceIds).toContain(b.moduleInstanceId);
      expect(await isRunStale(b.runId)).toBe(true);

      const linkRow = await client.prisma.parameterLink.findUnique({
        where: { id: confirmed.link.id },
      });
      expect(linkRow).toBeNull();
    });

    // --- previewRemoveParameterLinkImpact (Unit 3.4) --------------------------

    it("previews the same downstream impact removeParameterLink would actually cause, without deleting the link", async () => {
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

      const preview = await stalePropagation.previewRemoveParameterLinkImpact(
        confirmed.link.id,
        s.ownerId,
      );
      expect(preview.ok).toBe(true);
      if (!preview.ok) return;
      expect(preview.staleModuleInstanceIds).toContain(b.moduleInstanceId);

      // The preview must not have written anything: the link still exists,
      // and the run it would stale is still marked fresh from the reset above.
      const linkRow = await client.prisma.parameterLink.findUnique({
        where: { id: confirmed.link.id },
      });
      expect(linkRow).not.toBeNull();
      expect(await isRunStale(b.runId)).toBe(false);

      // Actually removing it now causes exactly the previewed impact.
      const removed = await stalePropagation.removeParameterLink(
        confirmed.link.id,
        s.ownerId,
      );
      expect(removed.ok).toBe(true);
      if (!removed.ok) return;
      expect(new Set(removed.staleModuleInstanceIds)).toEqual(
        new Set(preview.staleModuleInstanceIds),
      );
    });

    it("reports unauthorized for previewRemoveParameterLinkImpact on another owner's link", async () => {
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

      const preview = await stalePropagation.previewRemoveParameterLinkImpact(
        confirmed.link.id,
        stranger.id,
      );
      expect(preview.ok).toBe(false);
      if (preview.ok) return;
      expect(preview.error.code).toBe("unauthorized");
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

      const result = await stalePropagation.removeParameterLink(
        confirmed.link.id,
        stranger.id,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");

      // The link still exists — nothing was removed.
      const linkRow = await client.prisma.parameterLink.findUnique({
        where: { id: confirmed.link.id },
      });
      expect(linkRow).not.toBeNull();
    });

    it("marks a component assignment stale when its target module instance's value changes (Unit 2.8)", async () => {
      const s = await scaffold();
      const a = await newModuleWithRun(s, "A");
      const assignmentId = await assignToModule(s, a);
      expect(await isAssignmentStale(assignmentId)).toBe(false);

      const result = await stalePropagation.setParameterValue(
        {
          configurationId: s.configId,
          moduleInstanceId: a.moduleInstanceId,
          nodeKind: "module_input",
          parameterId: THRUST_FORCE,
          source: "manual",
          value: makeQuantity(360, "N"),
        },
        s.ownerId,
      );
      expect(result.ok).toBe(true);
      expect(await isAssignmentStale(assignmentId)).toBe(true);
    });

    it("marks a component assignment stale when a link to its target module instance is confirmed or removed (Unit 2.8)", async () => {
      const s = await scaffold();
      const a = await newModuleWithRun(s, "A");
      const b = await newModuleWithRun(s, "B");
      const assignmentId = await assignToModule(s, b);
      expect(await isAssignmentStale(assignmentId)).toBe(false);

      const confirmed = await stalePropagation.confirmParameterLink(
        linkInput(s, a.moduleInstanceId, b.moduleInstanceId),
        s.ownerId,
      );
      expect(confirmed.ok).toBe(true);
      expect(await isAssignmentStale(assignmentId)).toBe(true);

      // Reset (both the run and the assignment) to isolate removal's effect.
      await resetRunFresh(b.runId);
      await client.prisma.componentAssignment.update({
        where: { id: assignmentId },
        data: { stale: false, staleReason: null },
      });
      if (!confirmed.ok) return;

      const removed = await stalePropagation.removeParameterLink(
        confirmed.link.id,
        s.ownerId,
      );
      expect(removed.ok).toBe(true);
      expect(await isAssignmentStale(assignmentId)).toBe(true);
    });

    // --- Semantic link safety (enforced here, not only in a suggestion UI) ---

    it("rejects a semantically incompatible link between two different parameters", async () => {
      const s = await scaffold();
      const source = await newScaffoldModule(s, "Upstream scaffold");
      const target = await newScaffoldModule(s, "Downstream scaffold");

      // Both ports are declared by their packages — example-scaffold outputs a
      // thrust force and consumes a payload mass — so this reaches the
      // compatibility gate rather than failing the port check. Both are
      // registered parameters, and unit compatibility is irrelevant here (kg
      // vs N differ anyway); what rejects it is that they are not the same
      // canonical parameter and no approved mapping joins them.
      const result = await stalePropagation.confirmParameterLink(
        {
          configurationId: s.configId,
          targetModuleInstanceId: target,
          targetParameterId: PAYLOAD_MASS,
          sourceKind: "module_output",
          sourceModuleInstanceId: source,
          sourceParameterId: THRUST_FORCE,
        },
        s.ownerId,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("incompatible");
      expect(result.error.message).toContain("parameter_identity");

      const links = await client.prisma.parameterLink.findMany({
        where: { configurationId: s.configId },
      });
      expect(links).toHaveLength(0);
    });

    it("rejects a link to a port the target module does not declare", async () => {
      const s = await scaffold();
      const a = await newModuleWithRun(s, "A");
      const b = await newModuleWithRun(s, "B");

      const result = await stalePropagation.confirmParameterLink(
        {
          ...linkInput(s, a.moduleInstanceId, b.moduleInstanceId),
          // The relay declares one input port, for THRUST_FORCE.
          targetParameterId: PAYLOAD_MASS,
        },
        s.ownerId,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("invalid_input");
      expect(result.error.message).toContain("declares no input port");
    });

    it("rejects a link whose source output the source module does not declare", async () => {
      const s = await scaffold();
      const a = await newModuleWithRun(s, "A");
      const b = await newModuleWithRun(s, "B");

      const result = await stalePropagation.confirmParameterLink(
        {
          ...linkInput(s, a.moduleInstanceId, b.moduleInstanceId),
          sourceParameterId: PAYLOAD_MASS,
        },
        s.ownerId,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("invalid_input");
      expect(result.error.message).toContain("declares no output port");
    });

    // --- Configuration scoping (ownership alone is not enough) ---------------

    it("rejects a value change whose configurationId is not the module instance's own", async () => {
      const s = await scaffold();
      const a = await newModuleWithRun(s, "A");
      const other = await otherConfiguration(s);

      const result = await stalePropagation.setParameterValue(
        {
          configurationId: other.configId,
          moduleInstanceId: a.moduleInstanceId,
          nodeKind: "module_input",
          parameterId: THRUST_FORCE,
          source: "manual",
          value: makeQuantity(280, "N"),
        },
        s.ownerId,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");

      // Nothing was filed under the foreign configuration.
      const values = await client.prisma.parameterValue.findMany({
        where: { configurationId: other.configId },
      });
      expect(values).toHaveLength(0);
    });

    it("rejects a provider value whose assembly belongs to another configuration", async () => {
      const s = await scaffold();
      const other = await otherConfiguration(s);

      const result = await stalePropagation.setParameterValue(
        {
          configurationId: s.configId,
          assemblyId: other.assemblyId,
          nodeKind: "assembly_parameter",
          parameterId: PAYLOAD_MASS,
          source: "manual",
          value: makeQuantity(15, "kg"),
        },
        s.ownerId,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");
    });

    it("rejects a link whose source module instance belongs to another configuration", async () => {
      const s = await scaffold();
      const target = await newModuleWithRun(s, "Target");
      const other = await otherConfiguration(s);
      const foreignSource = await projects.createModuleInstance({
        assemblyId: other.assemblyId,
        configurationId: other.configId,
        modulePackageId: MODULE_ID,
        moduleVersion: MODULE_VERSION,
        label: "Source in another configuration",
      });

      const result = await stalePropagation.confirmParameterLink(
        {
          configurationId: s.configId,
          targetModuleInstanceId: target.moduleInstanceId,
          targetParameterId: THRUST_FORCE,
          sourceKind: "module_output",
          sourceModuleInstanceId: foreignSource.id,
          sourceParameterId: THRUST_FORCE,
        },
        s.ownerId,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");
    });
  },
);
