import { describe, expect, it } from "vitest";
import { summarizeModuleStatuses } from "./module-status-summary";
import type { AssemblyNode, ModuleInstanceRecord } from "@/lib/db";

function moduleInstance(
  id: string,
  lastRunStatus: ModuleInstanceRecord["lastRunStatus"],
): ModuleInstanceRecord {
  return {
    id: id as ModuleInstanceRecord["id"],
    assemblyId: "assembly-1" as ModuleInstanceRecord["assemblyId"],
    configurationId: "config-1" as ModuleInstanceRecord["configurationId"],
    workflowInstanceId: null,
    modulePackageId: "example-scaffold",
    moduleVersion: "0.1.0",
    label: id,
    lastCalculationRunId: null,
    lastRunStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function assembly(
  id: string,
  moduleInstances: ModuleInstanceRecord[],
  children: AssemblyNode[] = [],
): AssemblyNode {
  return {
    id: id as AssemblyNode["id"],
    configurationId: "config-1" as AssemblyNode["configurationId"],
    parentId: null,
    name: id,
    createdAt: new Date(),
    updatedAt: new Date(),
    moduleInstances,
    children,
  };
}

describe("summarizeModuleStatuses", () => {
  it("returns an all-zero, not_configured summary for an empty tree", () => {
    const summary = summarizeModuleStatuses([]);
    expect(summary).toEqual({
      total: 0,
      pass: 0,
      fail: 0,
      warning: 0,
      notConfigured: 0,
      invalidInput: 0,
      notApplicable: 0,
      overallStatus: "not_configured",
    });
  });

  it("counts an un-run module as not_configured, not not_applicable", () => {
    const summary = summarizeModuleStatuses([assembly("a", [moduleInstance("m1", null)])]);
    expect(summary.total).toBe(1);
    expect(summary.notConfigured).toBe(1);
    expect(summary.overallStatus).toBe("not_configured");
  });

  it("tallies statuses across nested assemblies", () => {
    const tree = [
      assembly(
        "root",
        [moduleInstance("m1", "pass")],
        [assembly("child", [moduleInstance("m2", "fail"), moduleInstance("m3", "warning")])],
      ),
    ];

    const summary = summarizeModuleStatuses(tree);

    expect(summary.total).toBe(3);
    expect(summary.pass).toBe(1);
    expect(summary.fail).toBe(1);
    expect(summary.warning).toBe(1);
    // Severity ordering reused from lib/engine/trace's overallCheckStatus:
    // fail outranks warning and pass.
    expect(summary.overallStatus).toBe("fail");
  });

  it("ignores not-yet-run modules when computing the overall status", () => {
    const tree = [assembly("a", [moduleInstance("m1", "pass"), moduleInstance("m2", null)])];

    const summary = summarizeModuleStatuses(tree);

    expect(summary.notConfigured).toBe(1);
    expect(summary.overallStatus).toBe("pass");
  });
});
