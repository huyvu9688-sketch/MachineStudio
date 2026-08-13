// Live-database tests for the module-instance rename/archive/preview use
// cases (module-instance-management design, 2026-08-13). Same real-DB
// pattern as rename-project.test.ts.

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type {
  AssemblyId,
  MachineConfigurationId,
  ModuleInstanceId,
  UserId,
} from "@/lib/db";

describe.skipIf(!liveDatabaseAvailable)(
  "manage-module-instances (live database)",
  () => {
    let manage: typeof import("./manage-module-instances");
    let projects: typeof import("../../db/repositories/project-repository");
    let workflows: typeof import("../../db/repositories/workflow-repository");
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

    async function newModule(
      s: Scaffold,
      label: string,
    ): Promise<ModuleInstanceId> {
      const mi = await projects.createModuleInstance({
        assemblyId: s.assemblyId,
        configurationId: s.configId,
        modulePackageId: "example-relay",
        moduleVersion: "0.1.0",
        label,
      });
      return mi.id;
    }

    beforeAll(async () => {
      manage = await import("./manage-module-instances");
      projects = await import("../../db/repositories/project-repository");
      workflows = await import("../../db/repositories/workflow-repository");
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

    it("rejects a blank label without updating the row", async () => {
      const s = await scaffold();
      const moduleId = await newModule(s, "Original");

      const result = await manage.renameModuleInstanceLabel(
        moduleId,
        "   ",
        s.ownerId,
      );

      expect(result).toEqual({
        ok: false,
        error: { code: "invalid_input", message: "Module label is required." },
      });
    });

    it("renames a module instance and rejects a stranger", async () => {
      const s = await scaffold();
      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);
      const moduleId = await newModule(s, "Original");

      const renamed = await manage.renameModuleInstanceLabel(
        moduleId,
        "Belt & Pulley Drive",
        s.ownerId,
      );
      expect(renamed).toEqual({ ok: true });

      const hijack = await manage.renameModuleInstanceLabel(
        moduleId,
        "Hijacked",
        stranger.id,
      );
      expect(hijack).toEqual({
        ok: false,
        error: {
          code: "not_found",
          message: "Module instance not found or not owned by this user.",
        },
      });
    });

    it("archives a module instance and rejects re-archiving", async () => {
      const s = await scaffold();
      const moduleId = await newModule(s, "Belt drive");

      const archived = await manage.archiveModuleInstance(moduleId, s.ownerId);
      expect(archived).toEqual({ ok: true });

      const again = await manage.archiveModuleInstance(moduleId, s.ownerId);
      expect(again).toEqual({
        ok: false,
        error: {
          code: "not_found",
          message:
            "Module instance not found, not owned by this user, or already archived.",
        },
      });
    });

    it("previews dependents and workflow attachment before archiving", async () => {
      const s = await scaffold();
      const workflowInstance = await workflows.createWorkflowInstance({
        configurationId: s.configId,
        workflowId: "linear-axis",
        workflowVersion: "1.0.0",
      });
      const source = await projects.createModuleInstance({
        assemblyId: s.assemblyId,
        configurationId: s.configId,
        modulePackageId: "example-relay",
        moduleVersion: "0.1.0",
        label: "Source",
        workflowInstanceId: workflowInstance.id,
      });
      const target = await newModule(s, "Downstream relay");
      // example-relay declares "motion.axis.thrust_force" on both its input
      // and output (see suggest-link-sources.test.ts's own THRUST_FORCE
      // fixture note), so this is a semantically valid source-output ->
      // target-input link.
      await graph.createParameterLink({
        configurationId: s.configId,
        targetModuleInstanceId: target,
        targetParameterId: "motion.axis.thrust_force",
        sourceKind: "module_output",
        sourceModuleInstanceId: source.id,
        sourceParameterId: "motion.axis.thrust_force",
      });

      const preview = await manage.previewArchiveModuleInstanceImpact(
        source.id,
        s.ownerId,
      );

      expect(preview).toEqual({
        ok: true,
        preview: {
          dependentModuleInstanceLabels: ["Downstream relay"],
          attachedToWorkflow: true,
        },
      });
    });

    it("returns unauthorized when previewing an instance not owned by the caller", async () => {
      const s = await scaffold();
      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);
      const moduleId = await newModule(s, "Belt drive");

      const preview = await manage.previewArchiveModuleInstanceImpact(
        moduleId,
        stranger.id,
      );

      expect(preview).toEqual({
        ok: false,
        error: {
          code: "unauthorized",
          message: "Module instance not found or not owned by this user.",
        },
      });
    });
  },
);
