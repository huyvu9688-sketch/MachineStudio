// @vitest-environment jsdom
import { describe, expect, vi, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MachineNavigator } from "./machine-navigator";
import type { ModulePackageOption } from "./add-module-instance-dialog";
import type { WorkflowDefinitionOption } from "./start-workflow-instance-dialog";
import type {
  AssemblyNode,
  ConfigurationNode,
  ModuleInstanceRecord,
  WorkflowInstanceRecord,
} from "@/lib/db";

// MachineNavigator's row actions import Server Actions from the "use
// server" actions file (transitively, via CreateAssemblyDialog/
// AddModuleInstanceDialog/RenameDialog/StartWorkflowInstanceDialog's bound
// action), which pulls in the full lib/application → lib/db chain — mocked
// so this stays a fast, isolated render test (see app-bar.test.tsx for the
// same reasoning).
vi.mock("@/app/(workspace)/workspace/actions", () => ({
  renameAssemblyAction: vi.fn(),
  createAssemblyAction: vi.fn(),
  addModuleInstanceAction: vi.fn(),
  startWorkflowInstanceAction: vi.fn(),
}));
// Module rows are real `<Link>`s (Unit 3.3) built from `usePathname()`, the
// same mocking approach app-bar.test.tsx already uses for its project/
// configuration picker links.
vi.mock("next/navigation", () => ({
  usePathname: () => "/workspace",
}));

const MODULE_PACKAGES: ModulePackageOption[] = [
  {
    modulePackageId: "example-scaffold",
    moduleVersion: "0.1.0",
    category: "example",
  },
];

const WORKFLOW_DEFINITIONS: WorkflowDefinitionOption[] = [
  {
    workflowId: "linear-axis",
    workflowVersion: "1.0.0",
    title: "Linear Axis",
  },
];

function moduleInstance(
  id: string,
  label: string,
  lastRunStatus: ModuleInstanceRecord["lastRunStatus"],
  archivedAt: Date | null = null,
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
    archivedAt,
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
        projectId="project"
        projectName="Palletizer axis"
        configuration={null}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId={null}
        selectedPanel={null}
      />,
    );

    expect(screen.getByText("Palletizer axis")).toBeInTheDocument();
    expect(screen.getByText("No configurations yet")).toBeInTheDocument();
  });

  it("renders assemblies, their module instances with status, and workflow instances", () => {
    render(
      <MachineNavigator
        projectId="project"
        projectName="Palletizer axis"
        configuration={configuration}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId={null}
        selectedPanel={null}
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

  it("renders a workflow instance as a real deep link to ?...&workflow=<id>", () => {
    render(
      <MachineNavigator
        projectId="project"
        projectName="Palletizer axis"
        configuration={configuration}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId={null}
        selectedPanel={null}
      />,
    );

    const link = screen.getByRole("link", { name: /linear-axis@1\.0\.0/ });
    expect(link).toHaveAttribute(
      "href",
      "/workspace?project=project&configuration=config&workflow=wf1",
    );
    expect(link).not.toHaveAttribute("aria-current");
  });

  it("marks the workflow link current when its id matches selectedWorkflowInstanceId", () => {
    render(
      <MachineNavigator
        projectId="project"
        projectName="Palletizer axis"
        configuration={configuration}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId="wf1"
        selectedPanel={null}
      />,
    );

    expect(
      screen.getByRole("link", { name: /linear-axis@1\.0\.0/ }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("exposes a Start workflow trigger that opens the start-workflow dialog", async () => {
    const user = userEvent.setup();
    render(
      <MachineNavigator
        projectId="project"
        projectName="Palletizer axis"
        configuration={configuration}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId={null}
        selectedPanel={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start workflow" }));
    expect(
      screen.getByRole("heading", { name: "Start guided workflow" }),
    ).toBeInTheDocument();
  });

  it("expands by default and collapses an assembly on click", async () => {
    const user = userEvent.setup();
    render(
      <MachineNavigator
        projectId="project"
        projectName="Palletizer axis"
        configuration={configuration}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId={null}
        selectedPanel={null}
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
        projectId="project"
        projectName="Palletizer axis"
        configuration={configuration}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId={null}
        selectedPanel={null}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Add root assembly" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add sub-assembly to X axis" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add module to X axis" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Rename X axis" }),
    ).toBeInTheDocument();
    const reportLink = screen.getByRole("link", {
      name: "Open report for X axis",
    });
    expect(reportLink).toHaveAttribute(
      "href",
      "/workspace/report?assembly=root",
    );
    expect(reportLink).toHaveAttribute("target", "_blank");
  });

  // Regression test for a real bug: every prior test above only asserted
  // these buttons exist, never that clicking one actually opens its dialog.
  // `IconButton` didn't forward the `onClick`/`ref`/aria-* props Radix's
  // `DialogTrigger asChild` clones onto it (it destructured only
  // `icon`/`label` and never spread the rest), so every icon button in the
  // navigator was inert in a real browser despite rendering correctly.
  it("actually opens the assembly actions' dialogs on click, not just renders the buttons", async () => {
    const user = userEvent.setup();
    render(
      <MachineNavigator
        projectId="project"
        projectName="Palletizer axis"
        configuration={configuration}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId={null}
        selectedPanel={null}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Add sub-assembly to X axis" }),
    );
    expect(
      screen.getByRole("heading", { name: "New sub-assembly" }),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await user.click(
      screen.getByRole("button", { name: "Add module to X axis" }),
    );
    expect(
      screen.getByRole("heading", { name: "Add module instance" }),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Rename X axis" }));
    expect(
      screen.getByRole("heading", { name: "Rename assembly" }),
    ).toBeInTheDocument();
  });

  it("links the machine report row at ?configuration=<id>, opened in a new tab", () => {
    render(
      <MachineNavigator
        projectId="project"
        projectName="Palletizer axis"
        configuration={configuration}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId={null}
        selectedPanel={null}
      />,
    );

    const link = screen.getByRole("link", { name: "Machine report" });
    expect(link).toHaveAttribute(
      "href",
      "/workspace/report?configuration=config",
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders the machine report row as a non-interactive placeholder when there is no configuration", () => {
    render(
      <MachineNavigator
        projectId="project"
        projectName="Palletizer axis"
        configuration={null}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId={null}
        selectedPanel={null}
      />,
    );

    expect(screen.getByText("Machine report")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("renders BOM as a disabled placeholder when there is no configuration", () => {
    render(
      <MachineNavigator
        projectId="project"
        projectName="Palletizer axis"
        configuration={null}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId={null}
        selectedPanel={null}
      />,
    );

    expect(screen.getByText("BOM")).toHaveAttribute("aria-disabled", "true");
  });

  it("renders BOM as a real deep link to ?...&panel=bom once a configuration exists", () => {
    render(
      <MachineNavigator
        projectId="project"
        projectName="Palletizer axis"
        configuration={configuration}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId={null}
        selectedPanel={null}
      />,
    );

    const link = screen.getByRole("link", { name: "BOM" });
    expect(link).toHaveAttribute(
      "href",
      "/workspace?project=project&configuration=config&panel=bom",
    );
    expect(link).not.toHaveAttribute("aria-current");
  });

  it("marks the BOM link current when ?panel=bom is selected", () => {
    render(
      <MachineNavigator
        projectId="project"
        projectName="Palletizer axis"
        configuration={configuration}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId={null}
        selectedPanel="bom"
      />,
    );

    expect(screen.getByRole("link", { name: "BOM" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("renders Requirements as a disabled placeholder when there is no configuration", () => {
    render(
      <MachineNavigator
        projectId="project"
        projectName="Palletizer axis"
        configuration={null}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId={null}
        selectedPanel={null}
      />,
    );

    expect(screen.getByText("Requirements")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("renders Requirements as a real deep link to ?...&panel=requirements once a configuration exists", () => {
    render(
      <MachineNavigator
        projectId="project"
        projectName="Palletizer axis"
        configuration={configuration}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId={null}
        selectedPanel={null}
      />,
    );

    const link = screen.getByRole("link", { name: "Requirements" });
    expect(link).toHaveAttribute(
      "href",
      "/workspace?project=project&configuration=config&panel=requirements",
    );
    expect(link).not.toHaveAttribute("aria-current");
  });

  it("renders Baselines as a real deep link to ?...&panel=baselines once a configuration exists", () => {
    render(
      <MachineNavigator
        projectId="project"
        projectName="Palletizer axis"
        configuration={configuration}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId={null}
        selectedPanel={null}
      />,
    );

    const link = screen.getByRole("link", { name: "Baselines" });
    expect(link).toHaveAttribute(
      "href",
      "/workspace?project=project&configuration=config&panel=baselines",
    );
    expect(link).not.toHaveAttribute("aria-current");
  });

  it("marks the Requirements link current when ?panel=requirements is selected", () => {
    render(
      <MachineNavigator
        projectId="project"
        projectName="Palletizer axis"
        configuration={configuration}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId={null}
        selectedPanel="requirements"
      />,
    );

    expect(screen.getByRole("link", { name: "Requirements" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("marks the Baselines link current when ?panel=baselines is selected", () => {
    render(
      <MachineNavigator
        projectId="project"
        projectName="Palletizer axis"
        configuration={configuration}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId={null}
        selectedPanel="baselines"
      />,
    );

    expect(screen.getByRole("link", { name: "Baselines" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });
});
