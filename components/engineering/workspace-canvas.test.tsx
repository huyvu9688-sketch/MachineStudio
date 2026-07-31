// @vitest-environment jsdom
import { describe, expect, vi, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkspaceCanvas } from "./workspace-canvas";
import type { MarketProfileOption } from "./create-project-dialog";

// WorkspaceCanvas's CTAs (CreateProjectDialog, CreateAssemblyDialog) import
// Server Actions from the "use server" actions file — mocked for the same
// reason app-bar.test.tsx mocks it (avoids pulling in lib/application →
// lib/db at import time in a component test).
vi.mock("@/app/(workspace)/workspace/actions", () => ({
  createProjectAction: vi.fn(),
  createAssemblyAction: vi.fn(),
}));

const MARKET_PROFILES: MarketProfileOption[] = [
  { key: "US-General-Industrial-Machinery@1", displayName: "United States" },
];

describe("WorkspaceCanvas", () => {
  it("shows the no-projects state with a real New project action", () => {
    render(
      <WorkspaceCanvas
        hasProjects={false}
        hasConfigurations={false}
        hasContent={false}
        marketProfiles={MARKET_PROFILES}
        configurationId={null}
      />,
    );
    expect(screen.getByText("No machine projects yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New project" })).toBeInTheDocument();
  });

  it("shows the no-configurations state once a project exists", () => {
    render(
      <WorkspaceCanvas
        hasProjects={true}
        hasConfigurations={false}
        hasContent={false}
        marketProfiles={MARKET_PROFILES}
        configurationId={null}
      />,
    );
    expect(screen.getByText("No configurations yet")).toBeInTheDocument();
  });

  it("shows the empty-configuration state with a real Add assembly action", () => {
    render(
      <WorkspaceCanvas
        hasProjects={true}
        hasConfigurations={true}
        hasContent={false}
        marketProfiles={MARKET_PROFILES}
        configurationId="c1"
      />,
    );
    expect(screen.getByText("This configuration is empty")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add assembly" })).toBeInTheDocument();
  });

  it("shows the select-an-item state once real content exists", () => {
    render(
      <WorkspaceCanvas
        hasProjects={true}
        hasConfigurations={true}
        hasContent={true}
        marketProfiles={MARKET_PROFILES}
        configurationId="c1"
      />,
    );
    expect(screen.getByText("Select an item in the navigator")).toBeInTheDocument();
  });
});
