// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContextActionBar } from "./context-action-bar";

describe("ContextActionBar", () => {
  it("shows a neutral message when no project is selected", () => {
    render(<ContextActionBar projectName={null} configurationName={null} />);
    expect(screen.getByText("No project selected")).toBeInTheDocument();
  });

  it("shows the project name alone when there is no configuration yet", () => {
    render(
      <ContextActionBar
        projectName="Palletizer axis"
        configurationName={null}
      />,
    );
    expect(screen.getByText("Palletizer axis")).toBeInTheDocument();
  });

  it("shows the project / configuration path", () => {
    render(
      <ContextActionBar
        projectName="Palletizer axis"
        configurationName="Baseline configuration"
      />,
    );
    expect(screen.getByText("Palletizer axis")).toBeInTheDocument();
    expect(screen.getByText("Baseline configuration")).toBeInTheDocument();
  });
});
