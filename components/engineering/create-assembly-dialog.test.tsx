// @vitest-environment jsdom
import { describe, expect, vi, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateAssemblyDialog } from "./create-assembly-dialog";
import { createAssemblyAction } from "@/app/(workspace)/workspace/actions";

vi.mock("@/app/(workspace)/workspace/actions", () => ({
  createAssemblyAction: vi.fn(),
}));

describe("CreateAssemblyDialog", () => {
  it("titles the dialog for a root assembly when parentId is omitted", async () => {
    const user = userEvent.setup();
    render(
      <CreateAssemblyDialog
        configurationId="c1"
        trigger={<button type="button">Add</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByRole("heading", { name: "New assembly" })).toBeInTheDocument();
  });

  it("titles the dialog for a sub-assembly when parentId is given", async () => {
    const user = userEvent.setup();
    render(
      <CreateAssemblyDialog
        configurationId="c1"
        parentId="a1"
        trigger={<button type="button">Add</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByRole("heading", { name: "New sub-assembly" })).toBeInTheDocument();
  });

  it("shows the action's error message inline on failure", async () => {
    vi.mocked(createAssemblyAction).mockResolvedValue({
      status: "error",
      message: "Assembly name is required.",
    });
    const user = userEvent.setup();
    render(
      <CreateAssemblyDialog
        configurationId="c1"
        trigger={<button type="button">Add</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add" }));
    // The name field is required; the browser blocks submission before
    // React's action ever runs unless it has a value.
    await user.type(screen.getByLabelText("Assembly name"), "Drive train");
    await user.click(screen.getByRole("button", { name: "Add assembly" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Assembly name is required.");
  });
});
