// @vitest-environment jsdom
import { describe, expect, vi, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateProjectDialog, type MarketProfileOption } from "./create-project-dialog";
import { createProjectAction } from "@/app/(workspace)/workspace/actions";

vi.mock("@/app/(workspace)/workspace/actions", () => ({
  createProjectAction: vi.fn(),
}));

const MARKET_PROFILES: MarketProfileOption[] = [
  { key: "US-General-Industrial-Machinery@1", displayName: "United States" },
  { key: "JP-General-Industrial-Machinery@1", displayName: "Japan" },
];

describe("CreateProjectDialog", () => {
  it("opens on trigger click and shows the name field and every market profile option", async () => {
    const user = userEvent.setup();
    render(<CreateProjectDialog marketProfiles={MARKET_PROFILES} />);

    await user.click(screen.getByRole("button", { name: "New project" }));

    expect(screen.getByLabelText("Project name")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "United States" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Japan" })).toBeInTheDocument();
  });

  it("shows the action's error message inline on failure", async () => {
    vi.mocked(createProjectAction).mockResolvedValue({
      status: "error",
      message: "Project name is required.",
    });
    const user = userEvent.setup();
    render(<CreateProjectDialog marketProfiles={MARKET_PROFILES} />);

    await user.click(screen.getByRole("button", { name: "New project" }));
    await user.type(screen.getByLabelText("Project name"), "Test project");
    await user.selectOptions(screen.getByLabelText("Market profile"), MARKET_PROFILES[0].key);
    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Project name is required.");
  });

  it("renders a custom trigger when given one", () => {
    render(
      <CreateProjectDialog
        marketProfiles={MARKET_PROFILES}
        trigger={<button type="button">Custom trigger</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Custom trigger" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New project" })).not.toBeInTheDocument();
  });
});
