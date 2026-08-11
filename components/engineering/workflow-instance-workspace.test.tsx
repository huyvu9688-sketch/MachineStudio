// @vitest-environment jsdom
import { describe, expect, vi, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkflowInstanceWorkspace } from "./workflow-instance-workspace";
import { confirmSuggestedLinkAction } from "@/app/(workspace)/workspace/actions";
import type { WorkflowInstanceView } from "@/lib/application";
import type { ParameterId } from "@/lib/engine";
import type { ModuleInstanceId } from "@/lib/db";

vi.mock("@/app/(workspace)/workspace/actions", () => ({
  confirmSuggestedLinkAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/workspace",
}));

// motion.axis.thrust_force is a real released parameter
// (lib/engine/parameters/definitions.ts) with displayName "Required thrust
// force" — used here to confirm the link-proposal row renders the
// registry's own human label, not the raw parameter id.
const BASE_VIEW: WorkflowInstanceView = {
  workflowInstance: {
    id: "wf1" as WorkflowInstanceView["workflowInstance"]["id"],
    configurationId:
      "c1" as WorkflowInstanceView["workflowInstance"]["configurationId"],
    workflowId: "linear-axis",
    workflowVersion: "1.0.0",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  definition: {
    id: "linear-axis",
    version: "1.0.0",
    title: "Linear Axis",
    description: "Guides a linear-axis machine build.",
  },
  roles: [
    {
      id: "linear-axis.screw",
      label: "Ball screw",
      moduleIds: ["ball-screw"],
      cardinality: { min: 1, max: 1 },
    },
    {
      id: "linear-axis.coupling",
      label: "Coupling",
      moduleIds: ["coupling"],
      cardinality: { min: 0, max: 1 },
    },
  ],
  roleInstances: [
    {
      instanceId: "m1",
      roleId: "linear-axis.screw",
      moduleId: "ball-screw",
      ports: { inputs: [], outputs: [] },
      inputValues: {},
    },
  ],
  instanceLabels: { m1: "X axis screw" },
  linkProposals: [
    {
      ruleId: "screw-thrust-to-coupling",
      fromInstanceId: "m1",
      fromPortKey: "drive_torque",
      toInstanceId: "m2",
      toPortKey: "drive_torque",
      parameterId: "motion.axis.thrust_force" as ParameterId,
    },
  ],
  confirmedLinkKeys: [],
  completion: {
    satisfied: false,
    results: [
      {
        ruleId: "screw-cardinality",
        kind: "role_cardinality",
        satisfied: true,
        message: "Ball screw: 1 of 1 required instance present.",
      },
      {
        ruleId: "coupling-link-confirmed",
        kind: "link_confirmed",
        satisfied: false,
        message: "The proposed screw-to-coupling link is not confirmed yet.",
      },
    ],
  },
  status: "active",
  checks: [
    {
      id: "shared-orientation",
      status: "not_applicable",
      message: "Fewer than two present instances share this parameter.",
    },
  ],
  excludedModuleInstances: [
    {
      moduleInstanceId: "m3" as ModuleInstanceId,
      reason:
        'No role in "linear-axis@1.0.0" accepts module "example-scaffold".',
    },
  ],
};

describe("WorkflowInstanceWorkspace", () => {
  it("renders the definition header with title, status, and id@version", () => {
    render(<WorkflowInstanceWorkspace view={BASE_VIEW} projectId="p1" />);

    expect(
      screen.getByRole("heading", { name: "Linear Axis" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("linear-axis@1.0.0")).toBeInTheDocument();
  });

  it("renders every role with its cardinality and filled-instance count, including unfilled roles", () => {
    render(<WorkflowInstanceWorkspace view={BASE_VIEW} projectId="p1" />);

    expect(screen.getByText("Ball screw")).toBeInTheDocument();
    expect(screen.getByText("1 of 1 filled")).toBeInTheDocument();
    expect(screen.getByText("X axis screw")).toBeInTheDocument();

    expect(screen.getByText("Coupling")).toBeInTheDocument();
    expect(screen.getByText("0 of 0-1 filled")).toBeInTheDocument();
  });

  it("renders a link proposal with the registry's human parameter label and a Confirm action", async () => {
    vi.mocked(confirmSuggestedLinkAction).mockResolvedValue({
      status: "success",
    });
    const user = userEvent.setup();
    render(<WorkflowInstanceWorkspace view={BASE_VIEW} projectId="p1" />);

    expect(
      screen.getByText("Required thrust force: X axis screw → m2"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(confirmSuggestedLinkAction).toHaveBeenCalled();
    const formData = vi.mocked(confirmSuggestedLinkAction).mock
      .calls[0]?.[1] as FormData;
    expect(formData.get("sourceKind")).toBe("module_output");
    expect(formData.get("sourceModuleInstanceId")).toBe("m1");
    expect(formData.get("targetModuleInstanceId")).toBe("m2");
    expect(formData.get("targetParameterId")).toBe("motion.axis.thrust_force");
  });

  it("shows a confirmed badge instead of a Confirm button once the proposal's key is in confirmedLinkKeys", () => {
    const view: WorkflowInstanceView = {
      ...BASE_VIEW,
      confirmedLinkKeys: [
        "screw-thrust-to-coupling::m1.drive_torque->m2.drive_torque",
      ],
    };
    render(<WorkflowInstanceWorkspace view={view} projectId="p1" />);

    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Confirm" }),
    ).not.toBeInTheDocument();
  });

  it("renders completion results with satisfied/unsatisfied state", () => {
    render(<WorkflowInstanceWorkspace view={BASE_VIEW} projectId="p1" />);

    expect(
      screen.getByText("Ball screw: 1 of 1 required instance present."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The proposed screw-to-coupling link is not confirmed yet.",
      ),
    ).toBeInTheDocument();
  });

  it("renders workflow-level checks", () => {
    render(<WorkflowInstanceWorkspace view={BASE_VIEW} projectId="p1" />);

    expect(
      screen.getByText(
        "Fewer than two present instances share this parameter.",
      ),
    ).toBeInTheDocument();
  });

  it("renders excluded module instances with their reason", () => {
    render(<WorkflowInstanceWorkspace view={BASE_VIEW} projectId="p1" />);

    expect(
      screen.getByText(
        'No role in "linear-axis@1.0.0" accepts module "example-scaffold".',
      ),
    ).toBeInTheDocument();
  });

  it("omits the excluded-instances section entirely when there are none", () => {
    const view: WorkflowInstanceView = {
      ...BASE_VIEW,
      excludedModuleInstances: [],
    };
    render(<WorkflowInstanceWorkspace view={view} projectId="p1" />);

    expect(
      screen.queryByText("Excluded module instances"),
    ).not.toBeInTheDocument();
  });
});
