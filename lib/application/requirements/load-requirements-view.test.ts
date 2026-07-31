// Live-database tests for `loadRequirementsView` (Unit 3.7) — same
// "null for unowned/unknown, empty lists for a fresh configuration is a
// normal render" shape as `loadComponentAssignmentView` (Unit 3.6) and
// `loadModuleResultView` (Unit 3.5).

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

describe.skipIf(!liveDatabaseAvailable)("load-requirements-view (live database)", () => {
  let loadRequirementsView: typeof import("./load-requirements-view").loadRequirementsView;
  let createMachineRequirement: typeof import("./manage-requirements").createMachineRequirement;
  let createRequirementAcceptanceCriterion: typeof import("./manage-requirements").createRequirementAcceptanceCriterion;
  let createMachineLoadCase: typeof import("./manage-load-cases").createMachineLoadCase;
  let createMachineDesignAssumption: typeof import("./manage-design-assumptions").createMachineDesignAssumption;
  let projects: typeof import("../../db/repositories/project-repository");
  let client: typeof import("../../db/client");
  const createdUserIds: string[] = [];

  interface Fixture {
    readonly ownerId: import("../../db/repositories/types").UserId;
    readonly configurationId: import("../../db/repositories/types").MachineConfigurationId;
  }

  async function newUser(): Promise<import("../../db/repositories/types").UserId> {
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
    return { ownerId, configurationId: configuration.id };
  }

  beforeAll(async () => {
    ({ loadRequirementsView } = await import("./load-requirements-view"));
    ({ createMachineRequirement, createRequirementAcceptanceCriterion } = await import(
      "./manage-requirements"
    ));
    ({ createMachineLoadCase } = await import("./manage-load-cases"));
    ({ createMachineDesignAssumption } = await import("./manage-design-assumptions"));
    projects = await import("../../db/repositories/project-repository");
    client = await import("../../db/client");
  });

  afterEach(async () => {
    if (createdUserIds.length > 0) {
      await client.prisma.user.deleteMany({
        where: { id: { in: createdUserIds.splice(0) } },
      });
    }
  });

  it("returns null for an unknown or unowned configuration", async () => {
    const { ownerId, configurationId } = await fixture();
    const strangerId = await newUser();

    expect(await loadRequirementsView(configurationId, strangerId)).toBeNull();
    expect(
      await loadRequirementsView(
        "not-a-real-configuration" as typeof configurationId,
        ownerId,
      ),
    ).toBeNull();
  });

  it("returns every list empty for a fresh, owned configuration", async () => {
    const { ownerId, configurationId } = await fixture();

    const view = await loadRequirementsView(configurationId, ownerId);

    expect(view).not.toBeNull();
    expect(view?.requirements).toHaveLength(0);
    expect(view?.designAssumptions).toHaveLength(0);
    expect(view?.loadCases).toHaveLength(0);
  });

  it("reports a requirement's verification status by whether acceptance criteria are recorded", async () => {
    const { ownerId, configurationId } = await fixture();
    const withCriteria = await createMachineRequirement(
      { configurationId, code: "REQ-01", statement: "Has criteria." },
      ownerId,
    );
    const withoutCriteria = await createMachineRequirement(
      { configurationId, code: "REQ-02", statement: "No criteria yet." },
      ownerId,
    );
    if (!withCriteria.ok || !withoutCriteria.ok) throw new Error("fixture setup failed");
    await createRequirementAcceptanceCriterion(
      { requirementId: withCriteria.requirement.id, statement: "Measured within tolerance." },
      ownerId,
    );

    const view = await loadRequirementsView(configurationId, ownerId);

    const req1 = view?.requirements.find((r) => r.code === "REQ-01");
    const req2 = view?.requirements.find((r) => r.code === "REQ-02");
    expect(req1?.verificationStatus).toBe("criteria_defined");
    expect(req1?.acceptanceCriteria).toHaveLength(1);
    expect(req2?.verificationStatus).toBe("no_criteria_yet");
    expect(req2?.acceptanceCriteria).toHaveLength(0);
  });

  it("returns design assumptions and load cases", async () => {
    const { ownerId, configurationId } = await fixture();
    await createMachineDesignAssumption(
      { configurationId, statement: "Friction coefficient 0.005." },
      ownerId,
    );
    await createMachineLoadCase(
      { configurationId, category: "peak", label: "Peak acceleration" },
      ownerId,
    );

    const view = await loadRequirementsView(configurationId, ownerId);

    expect(view?.designAssumptions).toHaveLength(1);
    expect(view?.loadCases).toHaveLength(1);
    expect(view?.loadCases[0]?.category).toBe("peak");
  });
});
