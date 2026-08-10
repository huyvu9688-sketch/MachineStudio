import { describe, expect, it } from "vitest";
import { evaluateWorkflowStatus } from "./status";
import type { WorkflowInstanceContext } from "./types";

const instance: WorkflowInstanceContext = {
  instanceId: "axis-1",
  roleId: "axis",
  moduleId: "axis-load-cases",
  ports: { inputs: [], outputs: [] },
  inputValues: {},
};

describe("evaluateWorkflowStatus", () => {
  it("is draft when no instance is present yet", () => {
    const status = evaluateWorkflowStatus({
      instances: [],
      completion: { satisfied: false, results: [] },
    });
    expect(status).toBe("draft");
  });

  it("is active when instances are present but completion is not satisfied", () => {
    const status = evaluateWorkflowStatus({
      instances: [instance],
      completion: { satisfied: false, results: [] },
    });
    expect(status).toBe("active");
  });

  it("is completed once every completion rule is satisfied", () => {
    const status = evaluateWorkflowStatus({
      instances: [instance],
      completion: { satisfied: true, results: [] },
    });
    expect(status).toBe("completed");
  });

  it("never returns abandoned", () => {
    const status = evaluateWorkflowStatus({
      instances: [instance],
      completion: { satisfied: true, results: [] },
    });
    expect(status).not.toBe("abandoned");
  });
});
