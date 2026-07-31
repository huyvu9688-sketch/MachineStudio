// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FolderOpen } from "lucide-react";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders the title and, when given, the description", () => {
    render(
      <EmptyState
        icon={FolderOpen}
        title="No machine projects yet"
        description="Machine projects will appear here once one is created."
      />,
    );

    expect(screen.getByText("No machine projects yet")).toBeInTheDocument();
    expect(
      screen.getByText("Machine projects will appear here once one is created."),
    ).toBeInTheDocument();
  });

  it("renders without a description when none is given", () => {
    render(<EmptyState icon={FolderOpen} title="No configurations yet" />);

    expect(screen.getByText("No configurations yet")).toBeInTheDocument();
  });
});
