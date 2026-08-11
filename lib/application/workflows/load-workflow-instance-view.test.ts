// Live-database tests for `loadWorkflowInstanceView` (Unit 4.9): assembles a
// workflow instance's full state from real persisted data. Uses
// `example-workflow@1.0.0` (a development fixture pairing the two registered
// example modules, lib/workflows/example-workflow/1.0.0/) for the "attached
// and linked" scenarios, since none of linear-axis@1's own seven modules are
// registered yet (context/progress-tracker.md "Unit 4.1") — plus a
// zero-instance real `linear-axis@1` scenario, and a role-mismatch scenario
// that also uses the real production definition, to prove it resolves and
// evaluates correctly even though none of its own modules are registered.

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { quantity } from "@/lib/workflows/workflow-sdk/test-support";

describe.skipIf(!liveDatabaseAvailable)(
  "loadWorkflowInstanceView (live database)",
  () => {
    let loadWorkflowInstanceView: typeof import("./load-workflow-instance-view").loadWorkflowInstanceView;
    let startWorkflowInstance: typeof import("./start-workflow-instance").startWorkflowInstance;
    let addModuleInstance: typeof import("../projects/add-module-instance").addModuleInstance;
    let executeModuleInstance: typeof import("../calculations/execute-module-instance").executeModuleInstance;
    let setParameterValue: typeof import("../parameters/stale-propagation").setParameterValue;
    let confirmParameterLink: typeof import("../parameters/stale-propagation").confirmParameterLink;
    let projects: typeof import("../../db/repositories/project-repository");
    let workflows: typeof import("../../db/repositories/workflow-repository");
    let client: typeof import("../../db/client");
    let asWorkflowInstanceId: typeof import("../../db/repositories/types").asWorkflowInstanceId;
    const createdUserIds: string[] = [];

    interface Fixture {
      readonly ownerId: import("../../db/repositories/types").UserId;
      readonly configurationId: import("../../db/repositories/types").MachineConfigurationId;
      readonly assemblyId: import("../../db/repositories/types").AssemblyId;
    }

    async function newUser(): Promise<
      import("../../db/repositories/types").UserId
    > {
      const user = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(user.id);
      return user.id;
    }

    async function fixture(): Promise<Fixture> {
      const ownerId = await newUser();
      const project = await projects.createProject({
        ownerId,
        name: "Axis",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const configuration = await projects.createConfiguration({
        projectId: project.id,
        name: "cfg",
      });
      const assembly = await projects.createAssembly({
        configurationId: configuration.id,
        name: "X axis",
      });
      return {
        ownerId,
        configurationId: configuration.id,
        assemblyId: assembly.id,
      };
    }

    beforeAll(async () => {
      ({ loadWorkflowInstanceView } =
        await import("./load-workflow-instance-view"));
      ({ startWorkflowInstance } = await import("./start-workflow-instance"));
      ({ addModuleInstance } = await import("../projects/add-module-instance"));
      ({ executeModuleInstance } =
        await import("../calculations/execute-module-instance"));
      ({ setParameterValue, confirmParameterLink } =
        await import("../parameters/stale-propagation"));
      projects = await import("../../db/repositories/project-repository");
      workflows = await import("../../db/repositories/workflow-repository");
      client = await import("../../db/client");
      ({ asWorkflowInstanceId } = await import("../../db/repositories/types"));
    });

    afterEach(async () => {
      if (createdUserIds.length > 0) {
        await client.prisma.user.deleteMany({
          where: { id: { in: createdUserIds.splice(0) } },
        });
      }
    });

    it("returns unauthorized for a workflow instance that does not exist", async () => {
      const { ownerId } = await fixture();

      const result = await loadWorkflowInstanceView(
        asWorkflowInstanceId(randomUUID()),
        ownerId,
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");
    });

    it("is a draft with unsatisfied completion for a freshly started real linear-axis@1 instance", async () => {
      const { ownerId, configurationId } = await fixture();
      const started = await startWorkflowInstance(
        {
          configurationId,
          workflowId: "linear-axis",
          workflowVersion: "1.0.0",
        },
        ownerId,
      );
      expect(started.ok).toBe(true);
      if (!started.ok) return;

      const result = await loadWorkflowInstanceView(
        started.workflowInstance.id,
        ownerId,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const { view } = result;
      expect(view.definition.id).toBe("linear-axis");
      expect(view.roles.length).toBeGreaterThan(0);
      expect(view.roles.map((r) => r.id)).toContain("linear-axis.screw");
      expect(view.roleInstances).toEqual([]);
      expect(view.instanceLabels).toEqual({});
      expect(view.linkProposals).toEqual([]);
      expect(view.completion.satisfied).toBe(false);
      expect(view.status).toBe("draft");
      expect(view.workflowInstance.status).toBe("draft");
      expect(view.excludedModuleInstances).toEqual([]);
      // Every shared_value_topology checkRule reports not_applicable with
      // fewer than two present instances — real, sourced checkRules
      // (context/adr/0007-workflow-definition-contract.md), correctly
      // evaluated even though none of linear-axis@1's own modules are
      // registered yet.
      expect(view.checks.length).toBeGreaterThan(0);
      for (const check of view.checks) {
        expect(check.status).toBe("not_applicable");
      }
    });

    it("excludes a registered module instance no role in the resolved definition accepts", async () => {
      const { ownerId, configurationId, assemblyId } = await fixture();
      const started = await startWorkflowInstance(
        {
          configurationId,
          workflowId: "linear-axis",
          workflowVersion: "1.0.0",
        },
        ownerId,
      );
      expect(started.ok).toBe(true);
      if (!started.ok) return;

      // example-scaffold is registered, but no linear-axis@1 role names it.
      const added = await addModuleInstance(
        {
          assemblyId,
          configurationId,
          modulePackageId: "example-scaffold",
          moduleVersion: "0.1.0",
          label: "Not a real axis role",
          workflowInstanceId: started.workflowInstance.id,
        },
        ownerId,
      );
      expect(added.ok).toBe(true);
      if (!added.ok) return;

      const result = await loadWorkflowInstanceView(
        started.workflowInstance.id,
        ownerId,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.view.roleInstances).toEqual([]);
      expect(result.view.excludedModuleInstances).toEqual([
        {
          moduleInstanceId: added.moduleInstance.id,
          reason: expect.stringContaining("No role"),
        },
      ]);
    });

    it("excludes an attached module instance whose package is not registered", async () => {
      const { ownerId, configurationId, assemblyId } = await fixture();
      const started = await startWorkflowInstance(
        {
          configurationId,
          workflowId: "example-workflow",
          workflowVersion: "1.0.0",
        },
        ownerId,
      );
      expect(started.ok).toBe(true);
      if (!started.ok) return;

      // Bypasses addModuleInstance's own registration check on purpose, to
      // simulate a module instance whose package was since unregistered.
      const orphaned = await projects.createModuleInstance({
        assemblyId,
        configurationId,
        workflowInstanceId: started.workflowInstance.id,
        modulePackageId: "not-a-real-module",
        moduleVersion: "9.9.9",
        label: "Orphaned",
      });

      const result = await loadWorkflowInstanceView(
        started.workflowInstance.id,
        ownerId,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.view.roleInstances).toEqual([]);
      expect(result.view.excludedModuleInstances).toEqual([
        {
          moduleInstanceId: orphaned.id,
          reason: expect.stringContaining("not registered"),
        },
      ]);
    });

    it("assembles a full view once example-workflow's two roles are attached, one is run, and they are linked", async () => {
      const { ownerId, configurationId, assemblyId } = await fixture();
      const started = await startWorkflowInstance(
        {
          configurationId,
          workflowId: "example-workflow",
          workflowVersion: "1.0.0",
        },
        ownerId,
      );
      expect(started.ok).toBe(true);
      if (!started.ok) return;
      const workflowInstanceId = started.workflowInstance.id;

      const source = await addModuleInstance(
        {
          assemblyId,
          configurationId,
          modulePackageId: "example-scaffold",
          moduleVersion: "0.1.0",
          label: "Source",
          workflowInstanceId,
        },
        ownerId,
      );
      const relay = await addModuleInstance(
        {
          assemblyId,
          configurationId,
          modulePackageId: "example-relay",
          moduleVersion: "0.1.0",
          label: "Relay",
          workflowInstanceId,
        },
        ownerId,
      );
      expect(source.ok).toBe(true);
      expect(relay.ok).toBe(true);
      if (!source.ok || !relay.ok) return;

      // Before linking or running: two role instances, one link proposal,
      // nothing confirmed yet, completion unsatisfied.
      const beforeLink = await loadWorkflowInstanceView(
        workflowInstanceId,
        ownerId,
      );
      expect(beforeLink.ok).toBe(true);
      if (!beforeLink.ok) return;
      expect(beforeLink.view.roleInstances).toHaveLength(2);
      expect(beforeLink.view.linkProposals).toHaveLength(1);
      expect(beforeLink.view.confirmedLinkKeys).toEqual([]);
      expect(beforeLink.view.completion.satisfied).toBe(false);
      expect(beforeLink.view.status).toBe("active");

      await setParameterValue(
        {
          configurationId,
          moduleInstanceId: source.moduleInstance.id,
          nodeKind: "module_input",
          parameterId: "motion.axis.payload_mass",
          source: "manual",
          value: quantity(10, "kg"),
        },
        ownerId,
      );
      const run = await executeModuleInstance({
        moduleInstanceId: source.moduleInstance.id,
        ownerId,
      });
      expect(run.ok).toBe(true);

      const proposal = beforeLink.view.linkProposals[0];
      const confirmed = await confirmParameterLink(
        {
          configurationId,
          targetModuleInstanceId: relay.moduleInstance.id,
          targetParameterId: proposal.parameterId,
          sourceKind: "module_output",
          sourceModuleInstanceId: source.moduleInstance.id,
          sourceParameterId: proposal.parameterId,
        },
        ownerId,
      );
      expect(confirmed.ok).toBe(true);

      const result = await loadWorkflowInstanceView(
        workflowInstanceId,
        ownerId,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const { view } = result;
      expect(view.excludedModuleInstances).toEqual([]);
      expect(view.roles.map((r) => r.id)).toEqual([
        "example-workflow.source",
        "example-workflow.relay",
      ]);
      expect(view.roleInstances).toHaveLength(2);
      expect(view.instanceLabels).toEqual({
        [source.moduleInstance.id]: "Source",
        [relay.moduleInstance.id]: "Relay",
      });
      expect(view.linkProposals).toHaveLength(1);
      expect(view.confirmedLinkKeys).toHaveLength(1);
      expect(view.completion.satisfied).toBe(true);
      expect(view.status).toBe("completed");
      expect(view.workflowInstance.status).toBe("completed");

      const sourceContext = view.roleInstances.find(
        (i) => i.roleId === "example-workflow.source",
      );
      expect(sourceContext?.inputValues.payload_mass).toEqual(
        quantity(10, "kg"),
      );
      expect(sourceContext?.computation?.outputs.result).toBeDefined();

      // The status persisted on re-load matches what was just computed.
      const reloaded = await workflows.loadWorkflowInstanceForOwner(
        workflowInstanceId,
        ownerId,
      );
      expect(reloaded?.status).toBe("completed");
    });
  },
);
