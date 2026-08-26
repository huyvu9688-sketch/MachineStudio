// @vitest-environment jsdom
import { describe, expect, vi, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteModuleInstanceDialog } from "./delete-module-instance-dialog";
import { previewDeleteModuleInstanceImpactAction } from "@/app/(workspace)/workspace/actions";

vi.mock("@/app/(workspace)/workspace/actions", () => ({
  deleteModuleInstanceAction: vi.fn(),
  previewDeleteModuleInstanceImpactAction: vi.fn(),
}));

const TRIGGER_LABEL = "Open delete dialog";

describe("DeleteModuleInstanceDialog", () => {
  it("loads and shows the impact preview when opened", async () => {
    vi.mocked(previewDeleteModuleInstanceImpactAction).mockResolvedValueOnce({
      ok: true,
      dependentModuleInstanceLabels: ["Index Table"],
      attachedToWorkflow: false,
    });
    const user = userEvent.setup();
    render(
      <DeleteModuleInstanceDialog
        moduleInstanceId="mi_1"
        moduleInstanceLabel="Belt & Pulley Drive"
        trigger={<button type="button">{TRIGGER_LABEL}</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));

    await waitFor(() => {
      expect(screen.getByText(/Index Table/)).toBeInTheDocument();
    });
    expect(previewDeleteModuleInstanceImpactAction).toHaveBeenCalledWith(
      "mi_1",
    );
  });

  it("shows no-dependents text when nothing links from this instance", async () => {
    vi.mocked(previewDeleteModuleInstanceImpactAction).mockResolvedValueOnce({
      ok: true,
      dependentModuleInstanceLabels: [],
      attachedToWorkflow: false,
    });
    const user = userEvent.setup();
    render(
      <DeleteModuleInstanceDialog
        moduleInstanceId="mi_1"
        moduleInstanceLabel="Belt & Pulley Drive"
        trigger={<button type="button">{TRIGGER_LABEL}</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));

    await waitFor(() => {
      expect(
        screen.getByText("No other module links from this one's outputs."),
      ).toBeInTheDocument();
    });
  });

  it("warns that links will break when dependents exist", async () => {
    vi.mocked(previewDeleteModuleInstanceImpactAction).mockResolvedValueOnce({
      ok: true,
      dependentModuleInstanceLabels: ["Index Table"],
      attachedToWorkflow: false,
    });
    const user = userEvent.setup();
    render(
      <DeleteModuleInstanceDialog
        moduleInstanceId="mi_1"
        moduleInstanceLabel="Belt & Pulley Drive"
        trigger={<button type="button">{TRIGGER_LABEL}</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));

    await waitFor(() => {
      expect(screen.getByText(/Those links will break\./)).toBeInTheDocument();
    });
  });
});
