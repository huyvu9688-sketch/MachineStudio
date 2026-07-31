// @vitest-environment jsdom
import { describe, expect, vi, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequirementsWorkspace } from "./requirements-workspace";
import {
  createAcceptanceCriterionAction,
  createDesignAssumptionAction,
  createLoadCaseAction,
  createRequirementAction,
} from "@/app/(workspace)/workspace/actions";
import type { RequirementsView, RequirementView } from "@/lib/application";
import type { AssemblyNode } from "@/lib/db";

// requirements-workspace.tsx imports these Server Actions directly (inline
// forms) — mocked the same way component-assignment-panel.test.tsx mocks
// assignComponentAction.
vi.mock("@/app/(workspace)/workspace/actions", () => ({
  createRequirementAction: vi.fn(),
  createAcceptanceCriterionAction: vi.fn(),
  createDesignAssumptionAction: vi.fn(),
  createLoadCaseAction: vi.fn(),
}));

beforeEach(() => {
  for (const action of [
    createRequirementAction,
    createAcceptanceCriterionAction,
    createDesignAssumptionAction,
    createLoadCaseAction,
  ]) {
    vi.mocked(action).mockReset();
    vi.mocked(action).mockResolvedValue({ status: "success" });
  }
});

function requirement(overrides: Partial<RequirementView> = {}): RequirementView {
  return {
    id: "req-1" as RequirementView["id"],
    configurationId: "cfg-1" as RequirementView["configurationId"],
    assemblyId: null,
    code: "REQ-01",
    statement: "Axis positions the payload within 0.1 mm.",
    acceptanceCriteria: [],
    verificationStatus: "no_criteria_yet",
    createdAt: new Date(),
    ...overrides,
  };
}

function view(overrides: Partial<RequirementsView> = {}): RequirementsView {
  return {
    configurationId: "cfg-1" as RequirementsView["configurationId"],
    requirements: [],
    designAssumptions: [],
    loadCases: [],
    ...overrides,
  };
}

const childAssembly: AssemblyNode = {
  id: "asm-child" as AssemblyNode["id"],
  configurationId: "cfg-1" as AssemblyNode["configurationId"],
  parentId: "asm-root" as AssemblyNode["parentId"],
  name: "Drive train",
  createdAt: new Date(),
  updatedAt: new Date(),
  moduleInstances: [],
  children: [],
};
const rootAssembly: AssemblyNode = {
  id: "asm-root" as AssemblyNode["id"],
  configurationId: "cfg-1" as AssemblyNode["configurationId"],
  parentId: null,
  name: "X axis",
  createdAt: new Date(),
  updatedAt: new Date(),
  moduleInstances: [],
  children: [childAssembly],
};

describe("RequirementsWorkspace", () => {
  it("renders empty-state messages when nothing is recorded yet", () => {
    render(<RequirementsWorkspace view={view()} assemblies={[]} />);

    expect(screen.getByText("No requirements recorded yet.")).toBeInTheDocument();
    expect(screen.getByText("No load cases recorded yet.")).toBeInTheDocument();
    expect(screen.getByText("No design assumptions recorded yet.")).toBeInTheDocument();
    expect(screen.getByText(/does not yet check a requirement against a calculation run/i)).toBeInTheDocument();
  });

  it("shows 'No acceptance criteria yet' for a requirement with none, and defined once one exists", () => {
    render(
      <RequirementsWorkspace
        view={view({
          requirements: [
            requirement({ id: "req-1" as RequirementView["id"], code: "REQ-01" }),
            requirement({
              id: "req-2" as RequirementView["id"],
              code: "REQ-02",
              verificationStatus: "criteria_defined",
              acceptanceCriteria: [
                {
                  id: "ac-1" as RequirementView["acceptanceCriteria"][number]["id"],
                  requirementId: "req-2" as RequirementView["id"],
                  statement: "Measured within tolerance.",
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ],
            }),
          ],
        })}
        assemblies={[]}
      />,
    );

    expect(screen.getByText("REQ-01")).toBeInTheDocument();
    expect(screen.getByText("No acceptance criteria yet")).toBeInTheDocument();
    expect(screen.getByText("REQ-02")).toBeInTheDocument();
    expect(screen.getByText("Acceptance criteria defined")).toBeInTheDocument();
    expect(screen.getByText("Measured within tolerance.")).toBeInTheDocument();
  });

  it("renders load cases in the table with their category label", () => {
    render(
      <RequirementsWorkspace
        view={view({
          loadCases: [
            {
              id: "lc-1" as RequirementsView["loadCases"][number]["id"],
              configurationId: "cfg-1" as RequirementsView["configurationId"],
              category: "peak",
              label: "Peak acceleration",
              description: "Worst-case start of move.",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        })}
        assemblies={[]}
      />,
    );

    expect(screen.getByRole("cell", { name: "Peak" })).toBeInTheDocument();
    expect(screen.getByText("Peak acceleration")).toBeInTheDocument();
    expect(screen.getByText("Worst-case start of move.")).toBeInTheDocument();
  });

  it("renders design assumptions with their rationale and scope", () => {
    render(
      <RequirementsWorkspace
        view={view({
          designAssumptions: [
            {
              id: "da-1" as RequirementsView["designAssumptions"][number]["id"],
              configurationId: "cfg-1" as RequirementsView["configurationId"],
              assemblyId: null,
              statement: "Guideway friction coefficient 0.005.",
              rationale: "Manufacturer datasheet.",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        })}
        assemblies={[]}
      />,
    );

    expect(screen.getByText("Guideway friction coefficient 0.005.")).toBeInTheDocument();
    expect(screen.getByText("Manufacturer datasheet.")).toBeInTheDocument();
    expect(screen.getByText("Whole machine")).toBeInTheDocument();
  });

  it("lists nested assemblies in the scope picker as an indented path", () => {
    render(<RequirementsWorkspace view={view()} assemblies={[rootAssembly]} />);

    // Both the requirement and assumption forms have their own scope picker.
    expect(screen.getAllByRole("option", { name: "X axis" })).toHaveLength(2);
    expect(screen.getAllByRole("option", { name: "X axis / Drive train" })).toHaveLength(2);
  });

  it("submits the add-requirement form via createRequirementAction", async () => {
    const user = userEvent.setup();
    render(<RequirementsWorkspace view={view()} assemblies={[]} />);

    await user.type(screen.getByLabelText("Code"), "REQ-01");
    await user.type(screen.getByLabelText("Requirement statement"), "New requirement.");
    await user.click(screen.getByRole("button", { name: "Add requirement" }));

    expect(createRequirementAction).toHaveBeenCalled();
  });

  it("submits the add-acceptance-criterion form via createAcceptanceCriterionAction", async () => {
    const user = userEvent.setup();
    render(
      <RequirementsWorkspace
        view={view({ requirements: [requirement()] })}
        assemblies={[]}
      />,
    );

    await user.type(screen.getByLabelText("Add acceptance criterion"), "New criterion.");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(createAcceptanceCriterionAction).toHaveBeenCalled();
  });

  it("submits the add-load-case form via createLoadCaseAction", async () => {
    const user = userEvent.setup();
    render(<RequirementsWorkspace view={view()} assemblies={[]} />);

    await user.selectOptions(screen.getByLabelText("Category"), "normal");
    await user.type(screen.getByLabelText("Label"), "Normal running");
    await user.click(screen.getByRole("button", { name: "Add load case" }));

    expect(createLoadCaseAction).toHaveBeenCalled();
  });

  it("submits the add-assumption form via createDesignAssumptionAction", async () => {
    const user = userEvent.setup();
    render(<RequirementsWorkspace view={view()} assemblies={[]} />);

    await user.type(screen.getByLabelText("Assumption statement"), "An assumption.");
    await user.click(screen.getByRole("button", { name: "Add assumption" }));

    expect(createDesignAssumptionAction).toHaveBeenCalled();
  });
});
