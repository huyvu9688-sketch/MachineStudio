// Live-database tests for the link-suggestion read model (Unit 3.4). Real
// PostgreSQL round trips; skips when the generated Prisma client is absent
// (see context/progress-tracker.md), matching every other lib/application
// live-DB suite (e.g. ./stale-propagation.test.ts).

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

// The relay fixture declares the same canonical parameter on both its input
// and output (lib/modules/example-relay/0.1.0/manifest.ts), so a chain of
// instances is a semantically valid link target/source pair without needing
// a second module package.
const MODULE_ID = "example-relay";
const MODULE_VERSION = "0.1.0";
const THRUST_FORCE = "motion.axis.thrust_force";

describe.skipIf(!liveDatabaseAvailable)(
  "link-suggestion read model (live database)",
  () => {
    let suggest: typeof import("./suggest-link-sources");
    let projects: typeof import("../../db/repositories/project-repository");
    let graph: typeof import("../../db/repositories/graph-repository");
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

    async function newRelay(
      s: Scaffold,
      assemblyId: AssemblyId,
      label: string,
    ): Promise<ModuleInstanceId> {
      const mi = await projects.createModuleInstance({
        assemblyId,
        configurationId: s.configId,
        modulePackageId: MODULE_ID,
        moduleVersion: MODULE_VERSION,
        label,
      });
      return mi.id;
    }

    function targetInputSinkId(moduleInstanceId: ModuleInstanceId) {
      return graph.parameterGraphNodeId({
        kind: "module_input",
        moduleInstanceId,
        assemblyId: null,
        parameterId: THRUST_FORCE,
        loadCase: null,
      });
    }

    beforeAll(async () => {
      suggest = await import("./suggest-link-sources");
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

    it("returns null for a configuration that is not owned by the caller", async () => {
      const s = await scaffold();
      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);

      const index = await suggest.buildConfigurationSuggestionIndex(
        s.configId,
        stranger.id,
      );
      expect(index).toBeNull();
    });

    it("suggests another module instance's output as a source, describing its module label and scope", async () => {
      const s = await scaffold();
      const source = await newRelay(s, s.assemblyId, "Upstream relay");
      const target = await newRelay(s, s.assemblyId, "Downstream relay");

      const index = await suggest.buildConfigurationSuggestionIndex(
        s.configId,
        s.ownerId,
      );
      expect(index).not.toBeNull();
      if (index === null) return;

      const suggestions = suggest.describeLinkSuggestions(
        index,
        targetInputSinkId(target),
      );
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toMatchObject({
        sourceKind: "module_output",
        sourceModuleInstanceId: source,
        sourceParameterId: THRUST_FORCE,
        moduleLabel: "Upstream relay",
        scopeLabel: "X axis",
        origin: "scope",
        // A module output's value is never known without loading a run
        // snapshot — deliberately not attempted here (see suggest-link-sources.ts).
        value: null,
      });
    });

    it("does not suggest a module's own input port as a source for another port", async () => {
      const s = await scaffold();
      const target = await newRelay(s, s.assemblyId, "Only relay");

      const index = await suggest.buildConfigurationSuggestionIndex(
        s.configId,
        s.ownerId,
      );
      expect(index).not.toBeNull();
      if (index === null) return;

      // With no other module instance and no authored provider value, there
      // is nothing to suggest — not even the sink's own input port.
      const suggestions = suggest.describeLinkSuggestions(
        index,
        targetInputSinkId(target),
      );
      expect(suggestions).toEqual([]);
    });

    it("ranks a same-scope provider before an ancestor-assembly one, before the machine root", async () => {
      const s = await scaffold();
      const child = await projects.createAssembly({
        configurationId: s.configId,
        parentId: s.assemblyId,
        name: "Sub-assembly",
      });
      const target = await newRelay(s, child.id, "Target relay");

      await graph.createParameterValue({
        configurationId: s.configId,
        assemblyId: child.id,
        nodeKind: "assembly_parameter",
        parameterId: THRUST_FORCE,
        source: "manual",
        value: makeQuantity(100, "N"),
      });
      await graph.createParameterValue({
        configurationId: s.configId,
        assemblyId: s.assemblyId,
        nodeKind: "assembly_parameter",
        parameterId: THRUST_FORCE,
        source: "manual",
        value: makeQuantity(200, "N"),
      });
      await graph.createParameterValue({
        configurationId: s.configId,
        nodeKind: "machine_requirement",
        parameterId: THRUST_FORCE,
        source: "manual",
        value: makeQuantity(300, "N"),
      });

      const index = await suggest.buildConfigurationSuggestionIndex(
        s.configId,
        s.ownerId,
      );
      expect(index).not.toBeNull();
      if (index === null) return;

      const suggestions = suggest.describeLinkSuggestions(
        index,
        targetInputSinkId(target),
      );
      expect(suggestions).toHaveLength(3);
      expect(
        suggestions.map((sg) =>
          sg.value?.kind === "quantity" ? sg.value.value : null,
        ),
      ).toEqual([100, 200, 300]);
      expect(suggestions.map((sg) => sg.sourceAssemblyId)).toEqual([
        child.id,
        s.assemblyId,
        null,
      ]);
      expect(suggestions.map((sg) => sg.scopeLabel)).toEqual([
        "Sub-assembly",
        "X axis",
        "Machine",
      ]);
    });

    it("does not suggest a source that would close a dependency cycle", async () => {
      const s = await scaffold();
      const a = await newRelay(s, s.assemblyId, "A");
      const b = await newRelay(s, s.assemblyId, "B");

      // Confirm A -> B, then check that B is not offered back to A (that
      // would close a cycle: A already feeds B).
      const confirmed = await graph.createParameterLink({
        configurationId: s.configId,
        targetModuleInstanceId: b,
        targetParameterId: THRUST_FORCE,
        sourceKind: "module_output",
        sourceModuleInstanceId: a,
        sourceParameterId: THRUST_FORCE,
      });
      expect(confirmed.id).toBeTruthy();

      const index = await suggest.buildConfigurationSuggestionIndex(
        s.configId,
        s.ownerId,
      );
      expect(index).not.toBeNull();
      if (index === null) return;

      // Both candidates are excluded: B's output would close the A → B → A
      // loop just confirmed, and A's own output would close the trivial
      // self-loop through its own input → output feed edge.
      const suggestions = suggest.describeLinkSuggestions(
        index,
        targetInputSinkId(a),
      );
      expect(suggestions).toEqual([]);
    });
  },
);
