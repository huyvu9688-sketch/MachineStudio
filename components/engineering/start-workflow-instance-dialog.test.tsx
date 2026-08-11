// @vitest-environment jsdom
import { describe, expect, vi, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  StartWorkflowInstanceDialog,
  type WorkflowDefinitionOption,
} from "./start-workflow-instance-dialog";
import { startWorkflowInstanceAction } from "@/app/(workspace)/workspace/actions";

vi.mock("@/app/(workspace)/workspace/actions", () => ({
  startWorkflowInstanceAction: vi.fn(),
}));

const WORKFLOW_DEFINITIONS: WorkflowDefinitionOption[] = [
  {
    workflowId: "linear-axis",
    workflowVersion: "1.0.0",
    title: "Linear Axis",
  },
];

// Distinct from the dialog's own "Start workflow" submit button, which would
// otherwise collide with this trigger by accessible name once the dialog is
// open — the same "distinct trigger label" convention
// add-module-instance-dialog.test.tsx already uses.
const TRIGGER_LABEL = "Open start-workflow dialog";

describe("StartWorkflowInstanceDialog", () => {
  it("lists every registered workflow definition as a selectable option", async () => {
    const user = userEvent.setup();
    render(
      <StartWorkflowInstanceDialog
        projectId="p1"
        configurationId="c1"
        workflowDefinitions={WORKFLOW_DEFINITIONS}
        trigger={<button type="button">{TRIGGER_LABEL}</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));

    expect(
      screen.getByRole("option", {
        name: "Linear Axis (linear-axis@1.0.0)",
      }),
    ).toBeInTheDocument();
  });

  it("disables submission when no workflow definitions are registered", async () => {
    const user = userEvent.setup();
    render(
      <StartWorkflowInstanceDialog
        projectId="p1"
        configurationId="c1"
        workflowDefinitions={[]}
        trigger={<button type="button">{TRIGGER_LABEL}</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));

    expect(screen.getByText("No workflows registered yet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start workflow" }),
    ).toBeDisabled();
  });

  it("submits the configurationId, projectId, and selected workflowKey", async () => {
    vi.mocked(startWorkflowInstanceAction).mockResolvedValue({
      status: "success",
    });
    const user = userEvent.setup();
    render(
      <StartWorkflowInstanceDialog
        projectId="p1"
        configurationId="c1"
        workflowDefinitions={WORKFLOW_DEFINITIONS}
        trigger={<button type="button">{TRIGGER_LABEL}</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));
    await user.selectOptions(
      screen.getByLabelText("Workflow"),
      "linear-axis@1.0.0",
    );
    await user.click(screen.getByRole("button", { name: "Start workflow" }));

    expect(startWorkflowInstanceAction).toHaveBeenCalled();
    const formData = vi.mocked(startWorkflowInstanceAction).mock
      .calls[0]?.[1] as FormData;
    expect(formData.get("projectId")).toBe("p1");
    expect(formData.get("configurationId")).toBe("c1");
    expect(formData.get("workflowKey")).toBe("linear-axis@1.0.0");
  });

  it("shows the action's error message inline on failure", async () => {
    vi.mocked(startWorkflowInstanceAction).mockResolvedValue({
      status: "error",
      message: 'Workflow "bad@1.0.0" is not registered.',
    });
    const user = userEvent.setup();
    render(
      <StartWorkflowInstanceDialog
        projectId="p1"
        configurationId="c1"
        workflowDefinitions={WORKFLOW_DEFINITIONS}
        trigger={<button type="button">{TRIGGER_LABEL}</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));
    await user.selectOptions(
      screen.getByLabelText("Workflow"),
      "linear-axis@1.0.0",
    );
    await user.click(screen.getByRole("button", { name: "Start workflow" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      'Workflow "bad@1.0.0" is not registered.',
    );
  });
});
