// @vitest-environment jsdom
import { describe, expect, vi, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MachineNavigator } from "./machine-navigator";
import type { ModulePackageOption } from "./add-module-instance-dialog";
import type {
  AssemblyNode,
  ConfigurationNode,
  ModuleInstanceRecord,
  WorkflowInstanceRecord,
} from "@/lib/db";

// MachineNavigator's row actions import Server Actions from the "use
// server" actions file (transitively, via CreateAssemblyDialog/
// AddModuleInstanceDialog/RenameDialog's bound action), which pulls in the
// full lib/application → lib/db chain — mocked so this stays a fast,
// isolated render test (see app-bar.test.tsx for the same reasoning).
vi.mock("@/app/(workspace)/workspace/actions", () => ({
  renameAssemblyAction: vi.fn(),
  createAssemblyAction: vi.fn(),
  addModuleInstanceAction: vi.fn(),
}));
// Module rows are real `<Link>`s (Unit 3.3) built from `usePathname()`, the
// same mocking approach app-bar.test.tsx already uses for its project/
// configuration picker links.
vi.mock("next/navigation", () => ({
  usePathname: () => "/workspace",
}));

const MODULE_PACKAGES: ModulePackageOption[] = [
  { modulePackageId: "example-scaffold", moduleVersion: "0.1.0", category: "example" },
];

function moduleInstance(
  id: string,
  label: string,
  lastRunStatus: ModuleInstanceRecord["lastRunStatus"],
): ModuleInstanceRecord {
  return {
    id: id as ModuleInstanceRecord["id"],
    assemblyId: "assembly" as ModuleInstanceRecord["assemblyId"],
    configurationId: "config" as ModuleInstanceRecord["configurationId"],
    workflowInstanceId: null,
    modulePackageId: "example-scaffold",
    moduleVersion: "0.1.0",
    label,
    lastCalculationRunId: null,
    lastRunStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const childAssembly: AssemblyNode = {
  id: "child" as AssemblyNode["id"],
  configurationId: "config" as AssemblyNode["configurationId"],
  parentId: "root" as AssemblyNode["parentId"],
  name: "Drive train",
  createdAt: new Date(),
  updatedAt: new Date(),
  moduleInstances: [moduleInstance("m2", "Coupling check", "fail")],
  children: [],
};

const rootAssembly: AssemblyNode = {
  id: "root" as AssemblyNode["id"],
  configurationId: "config" as AssemblyNode["configurationId"],
  parentId: null,
  name: "X axis",
  createdAt: new Date(),
  updatedAt: new Date(),
  moduleInstances: [moduleInstance("m1", "Thrust check", "pass")],
  children: [childAssembly],
};

const workflowInstance: WorkflowInstanceRecord = {
  id: "wf1" as WorkflowInstanceRecord["id"],
  configurationId: "config" as WorkflowInstanceRecord["configurationId"],
  workflowId: "linear-axis",
  workflowVersion: "1.0.0",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const configuration: ConfigurationNode = {
  id: "config" as ConfigurationNode["id"],
  projectId: "project" as ConfigurationNode["projectId"],
  name: "Baseline configuration",
  createdAt: new Date(),
  updatedAt: new Date(),
  assemblies: [rootAssembly],
  workflowInstances: [workflowInstance],
};

describe("MachineNavigator", () => {
  it("renders the project name and a no-configurations message when there is none", () => {
    render(
      <MachineNavigator
        projectName="Palletizer axis"
        configuration={null}
        modulePackages={MODULE_PACKAGES}
        selectedModuleInstanceId={null}
      />,
    );

    expect(screen.getByText("Palletizer axis")).toBeInTheDocument();
    expect(screen.getByText("No configurations yet")).toBeInTheDocument();
  });

  it("renders assemblies, their module instances with status, and workflow instances", () => {
    render(
      <MachineNavigator
        projectName="Palletizer axis"
        configuration={configuration}
        modulePackages={MODULE_PACKAGES}
        selectedModuleInstanceId={null}
      />,
    );

    expect(screen.getByText("X axis")).toBeInTheDocument();
    expect(screen.getByText("Drive train")).toBeInTheDocument();
    expect(screen.getByText("Thrust check")).toBeInTheDocument();
    expect(screen.getByText("Coupling check")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Pass" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Fail" })).toBeInTheDocument();

    expect(screen.getByText("linear-axis@1.0.0")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("expands by default and collapses an assembly on click", async () => {
    const user = userEvent.setup();
    render(
      <MachineNavigator
        projectName="Palletizer axis"
        configuration={configuration}
        modulePackages={MODULE_PACKAGES}
        selectedModuleInstanceId={null}
      />,
    );

    const trigger = screen.getByRole("button", { name: "X axis" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Thrust check")).toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("exposes add-sub-assembly, add-module, and rename actions on every assembly row", () => {
    render(
      <MachineNavigator
        projectName="Palletizer axis"
        configuration={configuration}
        modulePackages={MODULE_PACKAGES}
        selectedModuleInstanceId={null}
      />,
    );

    expect(screen.getByRole("button", { name: "Add root assembly" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add sub-assembly to X axis" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add module to X axis" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rename X axis" })).toBeInTheDocument();
  });

  it("renders the Requirements/BOM/Reports sections as non-interactive placeholders", () => {
    render(
      <MachineNavigator
        projectName="Palletizer axis"
        configuration={configuration}
        modulePackages={MODULE_PACKAGES}
        selectedModuleInstanceId={null}
      />,
    );

    for (const label of ["Requirements", "BOM", "Reports"]) {
      const row = screen.getByText(label);
      expect(row).toHaveAttribute("aria-disabled", "true");
    }
  });
});
