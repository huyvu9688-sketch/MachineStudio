// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkspaceShell } from "./workspace-shell";
import { summarizeModuleStatuses } from "./module-status-summary";
import { previewModuleComputationAction } from "@/app/(workspace)/workspace/actions";
import type { MarketProfileOption } from "./create-project-dialog";
import type { ModulePackageOption } from "./add-module-instance-dialog";
import type { WorkflowDefinitionOption } from "./start-workflow-instance-dialog";
import type { MachineProjectRecord, ProjectTree } from "@/lib/db";
import type {
  BaselineWorkspaceView,
  CatalogMatchingView,
  ComponentAssignmentPanelView,
  ModulePreviewView,
  ModuleResultView,
  ModuleWorkspaceView,
  RequirementsView,
  WorkflowInstanceView,
} from "@/lib/application";

// `ModulePreviewView.componentAssignment` isn't most of this file's
// concern — a valid, "no adapter" placeholder is enough so the type checks
// (component-assignment-panel.test.tsx covers the real merge behavior).
const noMatchingComponentAssignment: CatalogMatchingView = {
  componentType: null,
  requiredSpec: [],
  matchingAvailable: false,
  matchingUnavailableReason: "This module does not define catalog matching.",
  accepted: [],
  rejected: [],
};

vi.mock("next/navigation", () => ({
  usePathname: () => "/workspace",
}));
vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <div data-testid="user-button" />,
}));
// The whole shell's mutation forms bottom out in the "use server" actions
// file — mocked for the same reason app-bar.test.tsx mocks it.
vi.mock("@/app/(workspace)/workspace/actions", () => ({
  createProjectAction: vi.fn(),
  renameProjectAction: vi.fn(),
  createAssemblyAction: vi.fn(),
  renameAssemblyAction: vi.fn(),
  renameModuleInstanceAction: vi.fn(),
  archiveModuleInstanceAction: vi.fn(),
  previewArchiveModuleInstanceImpactAction: vi.fn(),
  deleteModuleInstanceAction: vi.fn(),
  previewDeleteModuleInstanceImpactAction: vi.fn(),
  addModuleInstanceAction: vi.fn(),
  saveModuleInputsAction: vi.fn(),
  previewModuleComputationAction: vi.fn(),
  confirmSuggestedLinkAction: vi.fn(),
  removeParameterLinkAction: vi.fn(),
  assignComponentAction: vi.fn(),
  createRequirementAction: vi.fn(),
  createAcceptanceCriterionAction: vi.fn(),
  createDesignAssumptionAction: vi.fn(),
  createLoadCaseAction: vi.fn(),
  createBaselineAction: vi.fn(),
  startWorkflowInstanceAction: vi.fn(),
  deleteAccountAction: vi.fn(),
}));

const MARKET_PROFILES: MarketProfileOption[] = [
  { key: "US-General-Industrial-Machinery@1", displayName: "United States" },
];
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

const projectTree: ProjectTree = {
  id: "p1" as ProjectTree["id"],
  ownerId: "owner" as ProjectTree["ownerId"],
  name: "Palletizer axis",
  marketProfileKey: "US-General-Industrial-Machinery@1",
  createdAt: new Date(),
  updatedAt: new Date(),
  configurations: [
    {
      id: "c1" as ProjectTree["configurations"][number]["id"],
      projectId: "p1" as ProjectTree["configurations"][number]["projectId"],
      name: "Baseline configuration",
      createdAt: new Date(),
      updatedAt: new Date(),
      workflowInstances: [],
      assemblies: [
        {
          id: "a1" as ProjectTree["configurations"][number]["assemblies"][number]["id"],
          configurationId: "c1" as ProjectTree["configurations"][number]["id"],
          parentId: null,
          name: "X axis",
          createdAt: new Date(),
          updatedAt: new Date(),
          children: [],
          moduleInstances: [
            {
              id: "m1" as ProjectTree["configurations"][number]["assemblies"][number]["moduleInstances"][number]["id"],
              assemblyId:
                "a1" as ProjectTree["configurations"][number]["assemblies"][number]["id"],
              configurationId:
                "c1" as ProjectTree["configurations"][number]["id"],
              workflowInstanceId: null,
              modulePackageId: "example-scaffold",
              moduleVersion: "0.1.0",
              label: "Thrust check",
              lastCalculationRunId: null,
              lastRunStatus: "pass",
              archivedAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
      ],
    },
  ],
};

const projects: MachineProjectRecord[] = [projectTree];

describe("WorkspaceShell", () => {
  it("renders the empty state end to end when the owner has no projects", () => {
    render(
      <WorkspaceShell
        status="empty"
        marketProfiles={MARKET_PROFILES}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
      />,
    );

    expect(screen.getByText("MachineStudio")).toBeInTheDocument();
    expect(screen.getByText("No project selected")).toBeInTheDocument();
    // Both the navigator slot and the canvas render the empty message.
    expect(
      screen.getAllByText("No machine projects yet").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders the full shell for a loaded project", () => {
    render(
      <WorkspaceShell
        status="loaded"
        projects={projects}
        selectedProject={projectTree}
        selectedConfigurationId="c1"
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId={null}
        moduleWorkspace={null}
        moduleResult={null}
        componentAssignment={null}
        bom={null}
        workflowInstance={null}
        requirements={null}
        baselines={null}
        summary={summarizeModuleStatuses(
          projectTree.configurations[0].assemblies,
        )}
        marketProfiles={MARKET_PROFILES}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Palletizer axis/ }),
    ).toBeInTheDocument();
    // Appears in both the context action bar and the app bar's configuration picker.
    expect(
      screen.getAllByText("Baseline configuration").length,
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("X axis")).toBeInTheDocument();
    expect(screen.getByText("Thrust check")).toBeInTheDocument();
    expect(
      screen.getByText("Select an item in the navigator"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("US-General-Industrial-Machinery@1"),
    ).toBeInTheDocument();
  });

  it("renders the module input workspace in the canvas when ?module= resolves", () => {
    const moduleWorkspace: ModuleWorkspaceView = {
      moduleInstance: {
        id: "m1" as ModuleWorkspaceView["moduleInstance"]["id"],
        assemblyId: "a1" as ModuleWorkspaceView["moduleInstance"]["assemblyId"],
        configurationId:
          "c1" as ModuleWorkspaceView["moduleInstance"]["configurationId"],
        label: "Thrust check",
        modulePackageId: "example-scaffold",
        moduleVersion: "0.1.0",
        category: "example",
        lastRunStatus: "pass",
      },
      groups: [
        {
          id: "inputs",
          title: "Inputs",
          fields: [
            {
              portKey: "payload_mass",
              parameterId: "motion.axis.payload_mass",
              label: "Payload mass",
              help: null,
              required: true,
              loadCase: null,
              field: {
                kind: "quantity",
                canonicalUnit: "kg",
                displayUnits: ["kg", "g", "lbm"],
              },
              resolved: { source: "default" },
              suggestions: [],
              linkRemovalImpact: null,
            },
          ],
        },
      ],
    };

    const moduleResult: ModuleResultView = {
      moduleInstance: {
        id: "m1" as ModuleResultView["moduleInstance"]["id"],
        assemblyId: "a1" as ModuleResultView["moduleInstance"]["assemblyId"],
        configurationId:
          "c1" as ModuleResultView["moduleInstance"]["configurationId"],
        label: "Thrust check",
      },
      run: null,
      outputs: [],
      checks: [],
      warnings: [],
      validity: [],
      trace: null,
      sources: [],
      comparison: null,
    };

    render(
      <WorkspaceShell
        status="loaded"
        projects={projects}
        selectedProject={projectTree}
        selectedConfigurationId="c1"
        selectedModuleInstanceId="m1"
        selectedWorkflowInstanceId={null}
        moduleWorkspace={moduleWorkspace}
        moduleResult={moduleResult}
        componentAssignment={null}
        bom={null}
        workflowInstance={null}
        requirements={null}
        baselines={null}
        summary={summarizeModuleStatuses(
          projectTree.configurations[0].assemblies,
        )}
        marketProfiles={MARKET_PROFILES}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
      />,
    );

    // The renderer's own heading, not the navigator's identically-labeled row.
    expect(
      screen.getByRole("heading", { name: "Thrust check" }),
    ).toBeInTheDocument();
    expect(screen.getByText("example-scaffold@0.1.0")).toBeInTheDocument();
    // The result panel renders alongside the input panel (Unit 3.5).
    expect(screen.getByText("Not run yet")).toBeInTheDocument();
    expect(screen.getByText("Payload mass")).toBeInTheDocument();
    expect(
      screen.queryByText("Select an item in the navigator"),
    ).not.toBeInTheDocument();
  });

  it("renders the requirements workspace in the canvas when ?panel=requirements resolves", () => {
    const requirements: RequirementsView = {
      configurationId: "c1" as RequirementsView["configurationId"],
      requirements: [],
      designAssumptions: [],
      loadCases: [],
    };

    render(
      <WorkspaceShell
        status="loaded"
        projects={projects}
        selectedProject={projectTree}
        selectedConfigurationId="c1"
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId={null}
        moduleWorkspace={null}
        moduleResult={null}
        componentAssignment={null}
        bom={null}
        workflowInstance={null}
        requirements={requirements}
        baselines={null}
        summary={summarizeModuleStatuses(
          projectTree.configurations[0].assemblies,
        )}
        marketProfiles={MARKET_PROFILES}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Requirements & design intent" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Select an item in the navigator"),
    ).not.toBeInTheDocument();
  });

  it("renders the baseline workspace in the canvas when ?panel=baselines resolves", () => {
    const baselines: BaselineWorkspaceView = {
      projectId: "p1",
      configurationId: "c1" as BaselineWorkspaceView["configurationId"],
      blockers: [],
      baselines: [],
      selectedBeforeBaselineId: null,
      selectedAfterBaselineId: null,
      comparison: null,
      comparisonError: null,
    };

    render(
      <WorkspaceShell
        status="loaded"
        projects={projects}
        selectedProject={projectTree}
        selectedConfigurationId="c1"
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId={null}
        moduleWorkspace={null}
        moduleResult={null}
        componentAssignment={null}
        bom={null}
        workflowInstance={null}
        requirements={null}
        baselines={baselines}
        summary={summarizeModuleStatuses(
          projectTree.configurations[0].assemblies,
        )}
        marketProfiles={MARKET_PROFILES}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Baselines & comparison" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Select an item in the navigator"),
    ).not.toBeInTheDocument();
  });

  it("renders the workflow instance workspace in the canvas when ?workflow= resolves", () => {
    const workflowInstance: WorkflowInstanceView = {
      workflowInstance: {
        id: "wf1" as WorkflowInstanceView["workflowInstance"]["id"],
        configurationId:
          "c1" as WorkflowInstanceView["workflowInstance"]["configurationId"],
        workflowId: "linear-axis",
        workflowVersion: "1.0.0",
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      definition: {
        id: "linear-axis",
        version: "1.0.0",
        title: "Linear Axis",
        description: "Guides a linear-axis machine build.",
      },
      roles: [],
      roleInstances: [],
      instanceLabels: {},
      linkProposals: [],
      confirmedLinkKeys: [],
      completion: { satisfied: false, results: [] },
      status: "draft",
      checks: [],
      excludedModuleInstances: [],
    };

    render(
      <WorkspaceShell
        status="loaded"
        projects={projects}
        selectedProject={projectTree}
        selectedConfigurationId="c1"
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId="wf1"
        moduleWorkspace={null}
        moduleResult={null}
        componentAssignment={null}
        bom={null}
        workflowInstance={workflowInstance}
        requirements={null}
        baselines={null}
        summary={summarizeModuleStatuses(
          projectTree.configurations[0].assemblies,
        )}
        marketProfiles={MARKET_PROFILES}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Linear Axis" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Select an item in the navigator"),
    ).not.toBeInTheDocument();
  });

  it("hides the navigator panel when the collapse toggle is clicked", async () => {
    const user = userEvent.setup();
    render(
      <WorkspaceShell
        status="loaded"
        projects={projects}
        selectedProject={projectTree}
        selectedConfigurationId="c1"
        selectedModuleInstanceId={null}
        selectedWorkflowInstanceId={null}
        moduleWorkspace={null}
        moduleResult={null}
        componentAssignment={null}
        bom={null}
        workflowInstance={null}
        requirements={null}
        baselines={null}
        summary={summarizeModuleStatuses(
          projectTree.configurations[0].assemblies,
        )}
        marketProfiles={MARKET_PROFILES}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
      />,
    );

    expect(screen.getByText("X axis")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Hide machine navigator" }),
    );
    expect(screen.queryByText("X axis")).not.toBeInTheDocument();
  });

  // Covers WorkspaceShell's own preview-lifting wiring (onPreviewChange ->
  // setPreview -> the `preview` prop passed to ModuleResultPanel), not
  // ModuleInputWorkspace's callback in isolation (already covered by
  // module-input-workspace.test.tsx's "previews via Run without calling
  // Save" test) or ModuleResultPanel's own rendering of a non-null `preview`
  // prop (covered by module-result-panel.test.tsx). A field with
  // resolved.source "manual" is used, not "default" like the fixture in the
  // "renders the module input workspace" test above, so the Run button
  // starts enabled (isFieldInitiallyComplete only seeds a "default" field as
  // complete when it also has a built-in default, which this fixture omits).
  it("lifts a Run preview from ModuleInputWorkspace into the rendered ModuleResultPanel", async () => {
    const moduleWorkspace: ModuleWorkspaceView = {
      moduleInstance: {
        id: "m1" as ModuleWorkspaceView["moduleInstance"]["id"],
        assemblyId: "a1" as ModuleWorkspaceView["moduleInstance"]["assemblyId"],
        configurationId:
          "c1" as ModuleWorkspaceView["moduleInstance"]["configurationId"],
        label: "Thrust check",
        modulePackageId: "example-scaffold",
        moduleVersion: "0.1.0",
        category: "example",
        lastRunStatus: "pass",
      },
      groups: [
        {
          id: "inputs",
          title: "Inputs",
          fields: [
            {
              portKey: "stroke",
              parameterId: "motion.axis.stroke",
              label: "Stroke",
              help: null,
              required: true,
              loadCase: null,
              field: {
                kind: "quantity",
                canonicalUnit: "m",
                displayUnits: ["m", "mm"],
              },
              resolved: {
                source: "manual",
                value: {
                  v: 1,
                  kind: "quantity",
                  value: 0.5,
                  unit: "m",
                  displayUnit: "mm",
                },
              },
              suggestions: [],
              linkRemovalImpact: null,
            },
          ],
        },
      ],
    };

    const moduleResult: ModuleResultView = {
      moduleInstance: {
        id: "m1" as ModuleResultView["moduleInstance"]["id"],
        assemblyId: "a1" as ModuleResultView["moduleInstance"]["assemblyId"],
        configurationId:
          "c1" as ModuleResultView["moduleInstance"]["configurationId"],
        label: "Thrust check",
      },
      run: null,
      outputs: [],
      checks: [],
      warnings: [],
      validity: [],
      trace: null,
      sources: [],
      comparison: null,
    };

    const preview: ModulePreviewView = {
      outputs: [
        {
          portKey: "result",
          parameterId: "motion.axis.thrust_force",
          label: "Thrust force",
          value: { v: 1, kind: "quantity", value: 12, unit: "N" },
          loadCase: null,
        },
      ],
      checks: [],
      warnings: [],
      validity: [],
      trace: null,
      sources: [],
      componentAssignment: noMatchingComponentAssignment,
    };
    vi.mocked(previewModuleComputationAction).mockResolvedValueOnce({
      status: "success",
      preview,
    });

    const user = userEvent.setup();
    const shellProps = {
      status: "loaded" as const,
      projects,
      selectedProject: projectTree,
      selectedConfigurationId: "c1",
      selectedModuleInstanceId: "m1",
      selectedWorkflowInstanceId: null,
      moduleWorkspace,
      moduleResult,
      componentAssignment: null,
      bom: null,
      workflowInstance: null,
      requirements: null,
      baselines: null,
      summary: summarizeModuleStatuses(projectTree.configurations[0].assemblies),
      marketProfiles: MARKET_PROFILES,
      modulePackages: MODULE_PACKAGES,
      workflowDefinitions: WORKFLOW_DEFINITIONS,
    };
    const { rerender } = render(<WorkspaceShell {...shellProps} />);

    expect(screen.getByText("Not run yet")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Run" }));

    expect(
      await screen.findByText(
        "Preview — not saved. Click Save to keep this result.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Thrust force")).toBeInTheDocument();
    expect(screen.queryByText("Not run yet")).not.toBeInTheDocument();

    // Switching to a different module instance must not carry the stale
    // preview over onto whatever renders next for it (the
    // seenModuleInstanceId "adjust state during render" guard in
    // workspace-shell.tsx). A minimal second-module fixture (no input
    // fields, no result) is enough here — this assertion only cares that
    // the preview banner is gone, not about that module's own content.
    const otherModuleWorkspace: ModuleWorkspaceView = {
      moduleInstance: {
        id: "m2" as ModuleWorkspaceView["moduleInstance"]["id"],
        assemblyId: "a1" as ModuleWorkspaceView["moduleInstance"]["assemblyId"],
        configurationId:
          "c1" as ModuleWorkspaceView["moduleInstance"]["configurationId"],
        label: "Other check",
        modulePackageId: "example-scaffold",
        moduleVersion: "0.1.0",
        category: "example",
        lastRunStatus: null,
      },
      groups: [],
    };
    const otherModuleResult: ModuleResultView = {
      moduleInstance: {
        id: "m2" as ModuleResultView["moduleInstance"]["id"],
        assemblyId: "a1" as ModuleResultView["moduleInstance"]["assemblyId"],
        configurationId:
          "c1" as ModuleResultView["moduleInstance"]["configurationId"],
        label: "Other check",
      },
      run: null,
      outputs: [],
      checks: [],
      warnings: [],
      validity: [],
      trace: null,
      sources: [],
      comparison: null,
    };

    rerender(
      <WorkspaceShell
        {...shellProps}
        selectedModuleInstanceId="m2"
        moduleWorkspace={otherModuleWorkspace}
        moduleResult={otherModuleResult}
      />,
    );

    expect(
      screen.queryByText("Preview — not saved. Click Save to keep this result."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Thrust force")).not.toBeInTheDocument();
    expect(screen.getByText("Not run yet")).toBeInTheDocument();
  });

  // Covers the sibling half of the wiring above
  // (`preview={preview?.componentAssignment ?? null}` in workspace-shell.tsx)
  // — a Run preview's own catalog matching must reach the rendered
  // `ComponentAssignmentPanel`, not just `ModuleResultPanel`, so a
  // recommended part can show up right after Run without requiring Save
  // first.
  it("lifts a Run preview's catalog matching into the rendered ComponentAssignmentPanel", async () => {
    const moduleWorkspace: ModuleWorkspaceView = {
      moduleInstance: {
        id: "m1" as ModuleWorkspaceView["moduleInstance"]["id"],
        assemblyId: "a1" as ModuleWorkspaceView["moduleInstance"]["assemblyId"],
        configurationId:
          "c1" as ModuleWorkspaceView["moduleInstance"]["configurationId"],
        label: "Thrust check",
        modulePackageId: "example-scaffold",
        moduleVersion: "0.1.0",
        category: "example",
        lastRunStatus: "pass",
      },
      groups: [],
    };
    const moduleResult: ModuleResultView = {
      moduleInstance: {
        id: "m1" as ModuleResultView["moduleInstance"]["id"],
        assemblyId: "a1" as ModuleResultView["moduleInstance"]["assemblyId"],
        configurationId:
          "c1" as ModuleResultView["moduleInstance"]["configurationId"],
        label: "Thrust check",
      },
      run: null,
      outputs: [],
      checks: [],
      warnings: [],
      validity: [],
      trace: null,
      sources: [],
      comparison: null,
    };
    const componentAssignment: ComponentAssignmentPanelView = {
      moduleInstance: {
        id: "m1" as ComponentAssignmentPanelView["moduleInstance"]["id"],
        configurationId:
          "c1" as ComponentAssignmentPanelView["moduleInstance"]["configurationId"],
        label: "Thrust check",
      },
      latestRunId: null,
      componentType: null,
      requiredSpec: [],
      matchingAvailable: false,
      matchingUnavailableReason: "This module does not define catalog matching.",
      accepted: [],
      rejected: [],
      assignments: [],
    };
    const preview: ModulePreviewView = {
      outputs: [],
      checks: [],
      warnings: [],
      validity: [],
      trace: null,
      sources: [],
      componentAssignment: {
        componentType: "example_component",
        requiredSpec: [],
        matchingAvailable: true,
        matchingUnavailableReason: null,
        accepted: [
          {
            part: {
              id: "rev-1" as never,
              manufacturerName: "Acme",
              partNumber: "AC-100",
              sourceRevision: "2026-A",
              sourceLink: null,
              lifecycleStatus: null,
              dataQualityStatus: "valid",
            },
            score: 1,
            rankingReasons: [],
          },
        ],
        rejected: [],
      },
    };
    vi.mocked(previewModuleComputationAction).mockResolvedValueOnce({
      status: "success",
      preview,
    });

    const user = userEvent.setup();
    render(
      <WorkspaceShell
        status="loaded"
        projects={projects}
        selectedProject={projectTree}
        selectedConfigurationId="c1"
        selectedModuleInstanceId="m1"
        selectedWorkflowInstanceId={null}
        moduleWorkspace={moduleWorkspace}
        moduleResult={moduleResult}
        componentAssignment={componentAssignment}
        bom={null}
        workflowInstance={null}
        requirements={null}
        baselines={null}
        summary={summarizeModuleStatuses(
          projectTree.configurations[0].assemblies,
        )}
        marketProfiles={MARKET_PROFILES}
        modulePackages={MODULE_PACKAGES}
        workflowDefinitions={WORKFLOW_DEFINITIONS}
      />,
    );

    expect(
      screen.getByText("This module does not define catalog matching."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Run" }));

    expect(await screen.findByText("AC-100")).toBeInTheDocument();
    expect(
      screen.getByText(/Preview — from the unsaved Run/i),
    ).toBeInTheDocument();
  });
});
