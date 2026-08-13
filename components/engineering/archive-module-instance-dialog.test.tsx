// @vitest-environment jsdom
import { describe, expect, vi, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArchiveModuleInstanceDialog } from "./archive-module-instance-dialog";
import { previewArchiveModuleInstanceImpactAction } from "@/app/(workspace)/workspace/actions";

vi.mock("@/app/(workspace)/workspace/actions", () => ({
  archiveModuleInstanceAction: vi.fn(),
  previewArchiveModuleInstanceImpactAction: vi.fn(),
}));

const TRIGGER_LABEL = "Open archive dialog";

describe("ArchiveModuleInstanceDialog", () => {
  it("loads and shows the impact preview when opened", async () => {
    vi.mocked(previewArchiveModuleInstanceImpactAction).mockResolvedValueOnce({
      ok: true,
      dependentModuleInstanceLabels: ["Index Table"],
      attachedToWorkflow: false,
    });
    const user = userEvent.setup();
    render(
      <ArchiveModuleInstanceDialog
        moduleInstanceId="mi_1"
        moduleInstanceLabel="Belt & Pulley Drive"
        trigger={<button type="button">{TRIGGER_LABEL}</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));

    await waitFor(() => {
      expect(screen.getByText(/Index Table/)).toBeInTheDocument();
    });
    expect(previewArchiveModuleInstanceImpactAction).toHaveBeenCalledWith(
      "mi_1",
    );
  });

  it("shows no-dependents text when nothing links from this instance", async () => {
    vi.mocked(previewArchiveModuleInstanceImpactAction).mockResolvedValueOnce({
      ok: true,
      dependentModuleInstanceLabels: [],
      attachedToWorkflow: false,
    });
    const user = userEvent.setup();
    render(
      <ArchiveModuleInstanceDialog
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
});
