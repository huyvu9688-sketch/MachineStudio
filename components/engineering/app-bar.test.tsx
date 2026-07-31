// @vitest-environment jsdom
import { describe, expect, vi, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppBar } from "./app-bar";
import type { MarketProfileOption } from "./create-project-dialog";
import type { MachineConfigurationRecord, MachineProjectRecord } from "@/lib/db";

vi.mock("next/navigation", () => ({
  usePathname: () => "/workspace",
}));
vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <div data-testid="user-button" />,
}));
// AppBar imports renameProjectAction/createProjectAction (transitively, via
// CreateProjectDialog) from the "use server" actions file, which itself
// imports the full lib/application → lib/db chain and
// "@clerk/nextjs/server". None of that is meaningful in a component test —
// mocked so this stays a fast, isolated render test.
vi.mock("@/app/(workspace)/workspace/actions", () => ({
  renameProjectAction: vi.fn(),
  createProjectAction: vi.fn(),
}));

const MARKET_PROFILES: MarketProfileOption[] = [
  { key: "US-General-Industrial-Machinery@1", displayName: "United States" },
];

const projects: MachineProjectRecord[] = [
  {
    id: "p1" as MachineProjectRecord["id"],
    ownerId: "owner" as MachineProjectRecord["ownerId"],
    name: "Palletizer axis",
    marketProfileKey: "US-General-Industrial-Machinery@1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const configurations: MachineConfigurationRecord[] = [
  {
    id: "c1" as MachineConfigurationRecord["id"],
    projectId: "p1" as MachineConfigurationRecord["projectId"],
    name: "Baseline configuration",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("AppBar", () => {
  it("renders the product name, a New project action, and the user button with no project selected", () => {
    render(
      <AppBar
        projects={[]}
        selectedProject={null}
        selectedConfigurationId={null}
        marketProfiles={MARKET_PROFILES}
        navigatorCollapsed={false}
        onToggleNavigator={() => {}}
      />,
    );

    expect(screen.getByText("MachineStudio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New project" })).toBeInTheDocument();
    expect(screen.getByTestId("user-button")).toBeInTheDocument();
  });

  it("shows the project and configuration pickers when a project is selected", () => {
    render(
      <AppBar
        projects={projects}
        selectedProject={{ id: "p1", name: "Palletizer axis", configurations }}
        selectedConfigurationId="c1"
        marketProfiles={MARKET_PROFILES}
        navigatorCollapsed={false}
        onToggleNavigator={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: /Palletizer axis/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Baseline configuration/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rename project" })).toBeInTheDocument();
  });

  it("lists every project as a real link inside the project picker", async () => {
    const user = userEvent.setup();
    render(
      <AppBar
        projects={projects}
        selectedProject={{ id: "p1", name: "Palletizer axis", configurations }}
        selectedConfigurationId="c1"
        marketProfiles={MARKET_PROFILES}
        navigatorCollapsed={false}
        onToggleNavigator={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Palletizer axis/ }));

    const link = await screen.findByRole("menuitem", { name: "Palletizer axis" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/workspace?project=p1");
  });

  it("calls onToggleNavigator when the collapse button is clicked", async () => {
    const user = userEvent.setup();
    const onToggleNavigator = vi.fn();
    render(
      <AppBar
        projects={[]}
        selectedProject={null}
        selectedConfigurationId={null}
        marketProfiles={MARKET_PROFILES}
        navigatorCollapsed={false}
        onToggleNavigator={onToggleNavigator}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Hide machine navigator" }));
    expect(onToggleNavigator).toHaveBeenCalledOnce();
  });
});
