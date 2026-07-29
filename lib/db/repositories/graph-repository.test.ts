// Live-database tests for the parameter-graph repository (Unit 2.2).
//
// Real PostgreSQL round trips; skips when the generated Prisma client is absent
// (see context/progress-tracker.md). Covers the Unit 2.2 graph test plan: JSONB
// validation on write and read, cycle rejection at the persistence boundary, and
// resolving a module instance's manual / default / workflow / linked inputs
// (the unit's exit criterion), plus ownership isolation.

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { SERIALIZATION_FORMAT_VERSION } from "../../engine/values";
import type { EngineeringValue, Quantity } from "../../engine/values";
import type {
  AssemblyId,
  MachineConfigurationId,
  ModuleInstanceId,
  UserId,
} from "./types";

const here = dirname(fileURLToPath(import.meta.url));
const generatedClientAvailable = existsSync(join(here, "..", "generated", "prisma"));

function kg(value: number): Quantity {
  return { v: SERIALIZATION_FORMAT_VERSION, kind: "quantity", value, unit: "kg" };
}

describe.skipIf(!generatedClientAvailable)(
  "graph-repository (live database)",
  () => {
    let graph: typeof import("./graph-repository");
    let projects: typeof import("./project-repository");
    let client: typeof import("../client");
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

    async function newModule(
      s: Scaffold,
      label: string,
    ): Promise<ModuleInstanceId> {
      const mi = await projects.createModuleInstance({
        assemblyId: s.assemblyId,
        modulePackageId: "example-linear-thrust",
        moduleVersion: "0.1.0",
        label,
      });
      return mi.id;
    }

    beforeAll(async () => {
      graph = await import("./graph-repository");
      projects = await import("./project-repository");
      client = await import("../client");
    });

    afterEach(async () => {
      if (createdUserIds.length > 0) {
        await client.prisma.user.deleteMany({
          where: { id: { in: createdUserIds.splice(0) } },
        });
      }
    });

    it("round-trips an EngineeringValue through JSONB (write then read)", async () => {
      const s = await scaffold();
      const moduleId = await newModule(s, "Thrust");
      await graph.createParameterValue({
        configurationId: s.configId,
        moduleInstanceId: moduleId,
        nodeKind: "module_input",
        parameterId: "motion.axis.payload_mass",
        source: "manual",
        value: kg(12),
      });

      const resolved = await graph.resolveModuleInputs(moduleId, s.ownerId, [
        { parameterId: "motion.axis.payload_mass" },
      ]);
      expect(resolved).not.toBeNull();
      if (resolved === null) return;
      expect(resolved[0].resolved.source).toBe("manual");
      const value = sourceValue(resolved[0].resolved);
      expect(value).toEqual(kg(12));
    });

    it("rejects an invalid EngineeringValue on write", async () => {
      const s = await scaffold();
      const moduleId = await newModule(s, "Thrust");
      const bad = { kind: "quantity", v: 1, value: "not-a-number", unit: "kg" };
      await expect(
        graph.createParameterValue({
          configurationId: s.configId,
          moduleInstanceId: moduleId,
          nodeKind: "module_input",
          parameterId: "motion.axis.payload_mass",
          source: "manual",
          value: bad as unknown as EngineeringValue,
        }),
      ).rejects.toMatchObject({ code: "invalid_input" });
    });

    it("rejects a corrupt stored JSONB payload on read (never trust JSONB)", async () => {
      const s = await scaffold();
      const moduleId = await newModule(s, "Thrust");
      // Bypass the repository to plant a corrupt payload the app never should
      // have written, then prove the read path re-validates it.
      await client.prisma.parameterValue.create({
        data: {
          configurationId: s.configId,
          moduleInstanceId: moduleId,
          nodeKind: "module_input",
          parameterId: "motion.axis.payload_mass",
          source: "manual",
          value: { kind: "quantity", v: 1, value: "corrupt", unit: "kg" },
        },
      });
      await expect(
        graph.resolveModuleInputs(moduleId, s.ownerId, [
          { parameterId: "motion.axis.payload_mass" },
        ]),
      ).rejects.toMatchObject({ code: "invalid_snapshot" });
    });

    it("resolves manual, workflow, linked, and default input sources", async () => {
      const s = await scaffold();
      const moduleId = await newModule(s, "Thrust");

      // manual
      await graph.createParameterValue({
        configurationId: s.configId,
        moduleInstanceId: moduleId,
        nodeKind: "module_input",
        parameterId: "p.manual",
        source: "manual",
        value: kg(1),
      });
      // workflow
      await graph.createParameterValue({
        configurationId: s.configId,
        moduleInstanceId: moduleId,
        nodeKind: "module_input",
        parameterId: "p.workflow",
        source: "workflow",
        value: kg(2),
      });
      // linked: a machine-root provider value + a confirmed link to the port
      await graph.createParameterValue({
        configurationId: s.configId,
        nodeKind: "machine_requirement",
        parameterId: "p.provider",
        source: "manual",
        value: kg(3),
      });
      await graph.createParameterLink({
        configurationId: s.configId,
        targetModuleInstanceId: moduleId,
        targetParameterId: "p.linked",
        sourceKind: "machine_requirement",
        sourceParameterId: "p.provider",
      });

      const resolved = await graph.resolveModuleInputs(moduleId, s.ownerId, [
        { parameterId: "p.manual" },
        { parameterId: "p.workflow" },
        { parameterId: "p.linked" },
        { parameterId: "p.default" },
      ]);
      expect(resolved).not.toBeNull();
      if (resolved === null) return;

      const byParam = new Map(resolved.map((r) => [r.parameterId, r.resolved]));
      expect(byParam.get("p.manual")).toMatchObject({ source: "manual" });
      expect(sourceValue(byParam.get("p.manual"))).toEqual(kg(1));
      expect(byParam.get("p.workflow")).toMatchObject({ source: "workflow" });
      expect(sourceValue(byParam.get("p.workflow"))).toEqual(kg(2));

      const linked = byParam.get("p.linked");
      expect(linked?.source).toBe("linked");
      // The linked value resolves to the provider's authored value.
      expect(sourceValue(linked)).toEqual(kg(3));

      expect(byParam.get("p.default")).toEqual({ source: "default" });
    });

    it("resolves a module-output link with a null value (run supplies it later)", async () => {
      const s = await scaffold();
      const upstream = await newModule(s, "Upstream");
      const downstream = await newModule(s, "Downstream");
      await graph.createParameterLink({
        configurationId: s.configId,
        targetModuleInstanceId: downstream,
        targetParameterId: "d.in",
        sourceKind: "module_output",
        sourceModuleInstanceId: upstream,
        sourceParameterId: "u.out",
      });
      const resolved = await graph.resolveModuleInputs(downstream, s.ownerId, [
        { parameterId: "d.in" },
      ]);
      expect(resolved).not.toBeNull();
      if (resolved === null) return;
      const r = resolved[0].resolved;
      expect(r.source).toBe("linked");
      expect(sourceValue(r)).toBeNull();
    });

    it("rejects a self-cycle (a module's output linked to its own input)", async () => {
      const s = await scaffold();
      const moduleId = await newModule(s, "Loop");
      await expect(
        graph.createParameterLink({
          configurationId: s.configId,
          targetModuleInstanceId: moduleId,
          targetParameterId: "x.in",
          sourceKind: "module_output",
          sourceModuleInstanceId: moduleId,
          sourceParameterId: "x.out",
        }),
      ).rejects.toMatchObject({ code: "cycle" });
    });

    it("rejects a cross-module cycle but allows the acyclic link", async () => {
      const s = await scaffold();
      const a = await newModule(s, "A");
      const b = await newModule(s, "B");

      // Acyclic: A.out -> B.in succeeds.
      await graph.createParameterLink({
        configurationId: s.configId,
        targetModuleInstanceId: b,
        targetParameterId: "b.in",
        sourceKind: "module_output",
        sourceModuleInstanceId: a,
        sourceParameterId: "a.out",
      });

      // Closing the loop: B.out -> A.in would cycle (a.in→a.out→b.in→b.out).
      await expect(
        graph.createParameterLink({
          configurationId: s.configId,
          targetModuleInstanceId: a,
          targetParameterId: "a.in",
          sourceKind: "module_output",
          sourceModuleInstanceId: b,
          sourceParameterId: "b.out",
        }),
      ).rejects.toMatchObject({ code: "cycle" });
    });

    it("rejects a second confirmed link to the same input port", async () => {
      const s = await scaffold();
      const moduleId = await newModule(s, "Thrust");
      await graph.createParameterValue({
        configurationId: s.configId,
        nodeKind: "machine_requirement",
        parameterId: "p.provider",
        source: "manual",
        value: kg(3),
      });
      const linkInput = {
        configurationId: s.configId,
        targetModuleInstanceId: moduleId,
        targetParameterId: "p.linked",
        sourceKind: "machine_requirement" as const,
        sourceParameterId: "p.provider",
      };
      await graph.createParameterLink(linkInput);
      await expect(graph.createParameterLink(linkInput)).rejects.toMatchObject({
        code: "duplicate_link",
      });
    });

    it("enforces ownership isolation on resolveModuleInputs", async () => {
      const s = await scaffold();
      const moduleId = await newModule(s, "Thrust");
      const strangerId = asUserId(`test-user-${randomUUID()}`);
      const resolved = await graph.resolveModuleInputs(moduleId, strangerId, [
        { parameterId: "p.manual" },
      ]);
      expect(resolved).toBeNull();
    });
  },
);

/** Extracts the resolved value from a resolution outcome, or null if none. */
function sourceValue(
  resolved:
    | import("./graph-types").ResolvedInputSource
    | undefined,
): EngineeringValue | null {
  if (resolved === undefined) return null;
  if (resolved.source === "manual" || resolved.source === "workflow") {
    return resolved.value;
  }
  if (resolved.source === "linked") {
    return resolved.value;
  }
  return null;
}

function asUserId(id: string): UserId {
  return id as UserId;
}
