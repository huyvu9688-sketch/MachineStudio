// @vitest-environment jsdom
import { describe, expect, vi, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RenameDialog } from "./rename-dialog";
import type { ActionState } from "@/app/(workspace)/workspace/action-state";

describe("RenameDialog", () => {
  it("pre-fills the name field with the current name", async () => {
    const user = userEvent.setup();
    const action =
      vi.fn<(prev: ActionState, data: FormData) => Promise<ActionState>>();
    render(
      <RenameDialog
        title="Rename project"
        action={action}
        idFieldName="projectId"
        idValue="p1"
        currentName="Palletizer axis"
        trigger={<button type="button">Rename</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Rename" }));

    expect(screen.getByLabelText("Name")).toHaveValue("Palletizer axis");
  });

  it("shows the action's error message and stays open on failure", async () => {
    const user = userEvent.setup();
    const action = vi
      .fn<(prev: ActionState, data: FormData) => Promise<ActionState>>()
      .mockResolvedValue({
        status: "error",
        message: "Project name is required.",
      });
    render(
      <RenameDialog
        title="Rename project"
        action={action}
        idFieldName="projectId"
        idValue="p1"
        currentName="Palletizer axis"
        trigger={<button type="button">Rename</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Rename" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Project name is required.",
    );
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("closes the dialog once the action reports success", async () => {
    const user = userEvent.setup();
    const action = vi
      .fn<(prev: ActionState, data: FormData) => Promise<ActionState>>()
      .mockResolvedValue({ status: "success" });
    render(
      <RenameDialog
        title="Rename project"
        action={action}
        idFieldName="projectId"
        idValue="p1"
        currentName="Palletizer axis"
        trigger={<button type="button">Rename</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Rename" }));
    expect(screen.getByLabelText("Name")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    });
  });
});
