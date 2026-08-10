// Static conformance of example-workflow@1.0.0 against the two real example
// modules' own manifest.ts ports — same discipline linear-axis@1.0.0's own
// definition.test.ts follows.

import { describe, expect, it } from "vitest";
import {
  runWorkflowConformance,
  type WorkflowRoleInstance,
} from "@/lib/workflows/workflow-sdk";
import { exampleWorkflowDefinition } from "./definition";

import { ports as scaffoldPorts } from "@/lib/modules/example-scaffold/0.1.0/manifest";
import { ports as relayPorts } from "@/lib/modules/example-relay/0.1.0/manifest";

const REPRESENTATIVE_INSTANCES: readonly WorkflowRoleInstance[] = [
  {
    instanceId: "source-1",
    roleId: "example-workflow.source",
    moduleId: "example-scaffold",
    ports: scaffoldPorts,
  },
  {
    instanceId: "relay-1",
    roleId: "example-workflow.relay",
    moduleId: "example-relay",
    ports: relayPorts,
  },
];

describe("example-workflow@1.0.0 conformance", () => {
  it("passes every conformance check against a full representative instance set", () => {
    const report = runWorkflowConformance(exampleWorkflowDefinition, {
      instances: REPRESENTATIVE_INSTANCES,
    });
    const failing = report.checks.filter((c) => c.status === "fail");
    expect(failing).toEqual([]);
    expect(report.ok).toBe(true);
  });
});
