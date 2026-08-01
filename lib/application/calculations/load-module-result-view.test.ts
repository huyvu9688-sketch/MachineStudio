// Live-database tests for `loadModuleResultView` (Unit 3.5) — the read
// model the generic result and trace renderer needs. Covers this unit's own
// exit criterion at the data layer: a run's outputs, checks, trace, and
// stale state all come back fully described from the stored snapshot alone
// (no module compute call happens here — every assertion below reads the
// same snapshot `executeModuleInstance` already persisted).
//
// Real PostgreSQL round trips; skips when the generated Prisma client or
// DATABASE_URL is absent (see context/progress-tracker.md).

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

describe.skipIf(!liveDatabaseAvailable)("loadModuleResultView (live database)", () => {
  let loadModuleResultView: typeof import("./load-module-result-view").loadModuleResultView;
  let executeModuleInstance: typeof import("./execute-module-instance").executeModuleInstance;
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
    modulePackageId: string,
    moduleVersion: string,
    label: string,
  ): Promise<Scaffold> {
    const user = await projects.upsertUser(`test-user-${randomUUID()}`);
    createdUserIds.push(user.id);
    const project = await projects.createProject({
      ownerId: user.id,
      name: "Axis",
      marketProfileKey: "US-General-Industrial-Machinery@1",
    });
    const config = await projects.createConfiguration({ projectId: project.id, name: "Baseline" });
    const assembly = await projects.createAssembly({ configurationId: config.id, name: "X axis" });
    const mi = await projects.createModuleInstance({
      assemblyId: assembly.id,
      configurationId: config.id,
      modulePackageId,
      moduleVersion,
      label,
    });
    return {
      ownerId: user.id,
      configId: config.id,
      assemblyId: assembly.id,
      moduleInstanceId: mi.id,
    };
  }

  async function authorThrustForceIn(s: Scaffold, magnitudeNewtons: number): Promise<void> {
    await graph.createParameterValue({
      configurationId: s.configId,
      moduleInstanceId: s.moduleInstanceId,
      nodeKind: "module_input",
      parameterId: "motion.axis.thrust_force",
      source: "manual",
      value: makeQuantity(magnitudeNewtons, "N"),
    });
  }

  beforeAll(async () => {
    ({ loadModuleResultView } = await import("./load-module-result-view"));
    ({ executeModuleInstance } = await import("./execute-module-instance"));
    projects = await import("../../db/repositories/project-repository");
    graph = await import("../../db/repositories/graph-repository");
    runs = await import("../../db/repositories/run-repository");
    client = await import("../../db/client");
  });

  afterEach(async () => {
    if (createdUserIds.length > 0) {
      await client.prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
    }
  });

  it("returns null for an unknown or unowned module instance", async () => {
    const s = await scaffold("example-relay", "0.1.0", "Relay");
    const otherOwner = await projects.upsertUser(`test-user-${randomUUID()}`);
    createdUserIds.push(otherOwner.id);

    expect(await loadModuleResultView(s.moduleInstanceId, otherOwner.id)).toBeNull();
  });

  it("returns an empty view when the module instance has never been run", async () => {
    const s = await scaffold("example-relay", "0.1.0", "Relay");

    const view = await loadModuleResultView(s.moduleInstanceId, s.ownerId);

    expect(view).not.toBeNull();
    expect(view?.run).toBeNull();
    expect(view?.outputs).toEqual([]);
    expect(view?.checks).toEqual([]);
    expect(view?.trace).toBeNull();
    expect(view?.comparison).toBeNull();
  });

  it("describes the latest run's outputs, checks, trace, and sources from the stored snapshot", async () => {
    const s = await scaffold("example-relay", "0.1.0", "Relay");
    await authorThrustForceIn(s, 12);
    const executed = await executeModuleInstance({
      moduleInstanceId: s.moduleInstanceId,
      ownerId: s.ownerId,
    });
    expect(executed.ok).toBe(true);

    const view = await loadModuleResultView(s.moduleInstanceId, s.ownerId);

    expect(view?.run).not.toBeNull();
    expect(view?.run?.status).toBe("pass");
    expect(view?.run?.stale).toBe(false);
    expect(view?.outputs).toHaveLength(1);
    expect(view?.outputs[0]).toMatchObject({
      portKey: "thrust_force_out",
      parameterId: "motion.axis.thrust_force",
      value: makeQuantity(12, "N"),
      // example-relay's output port declares no load case (the common case
      // today — no registered module pins one yet).
      loadCase: null,
    });
    expect(view?.checks).toHaveLength(1);
    expect(view?.checks[0].id).toBe("relay-preserves-value");
    expect(view?.checks[0].status).toBe("pass");
    expect(view?.trace?.sections.length).toBeGreaterThan(0);
    // example-relay is a development fixture that cites no sources (see its
    // manifest); this proves the read model handles that honestly rather
    // than fabricating a citation.
    expect(view?.sources).toEqual([]);
    expect(view?.comparison).toBeNull();
  });

  it("surfaces a stale run through the same summary", async () => {
    const s = await scaffold("example-relay", "0.1.0", "Relay");
    await authorThrustForceIn(s, 5);
    const executed = await executeModuleInstance({
      moduleInstanceId: s.moduleInstanceId,
      ownerId: s.ownerId,
    });
    expect(executed.ok).toBe(true);
    if (!executed.ok) return;
    await runs.markRunStale(executed.run.id, true, "Upstream input changed.");

    const view = await loadModuleResultView(s.moduleInstanceId, s.ownerId);

    expect(view?.run?.stale).toBe(true);
    expect(view?.run?.staleReason).toBe("Upstream input changed.");
  });

  it("compares the latest run against the previous one for the same module instance", async () => {
    const s = await scaffold("example-relay", "0.1.0", "Relay");
    await authorThrustForceIn(s, 12);
    const first = await executeModuleInstance({
      moduleInstanceId: s.moduleInstanceId,
      ownerId: s.ownerId,
    });
    expect(first.ok).toBe(true);

    await authorThrustForceIn(s, 20);
    const second = await executeModuleInstance({
      moduleInstanceId: s.moduleInstanceId,
      ownerId: s.ownerId,
    });
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    const view = await loadModuleResultView(s.moduleInstanceId, s.ownerId);

    expect(view?.run?.id).toBe(second.run.id);
    expect(view?.comparison).not.toBeNull();
    expect(view?.comparison?.previousRunId).toBe(first.run.id);
    expect(view?.comparison?.changedOutputs).toHaveLength(1);
    expect(view?.comparison?.changedOutputs[0]).toMatchObject({
      portKey: "thrust_force_out",
      before: makeQuantity(12, "N"),
      after: makeQuantity(20, "N"),
      loadCase: null,
    });
    // The relay's only check is tautologically true on every run (it always
    // relays its input unchanged), so its status never differs between runs.
    expect(view?.comparison?.changedChecks).toEqual([]);
  });
});
