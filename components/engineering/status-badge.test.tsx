// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders a label for every status so color is never the only signal", () => {
    const cases: Array<[Parameters<typeof StatusBadge>[0]["status"], string]> = [
      ["not_configured", "Not configured"],
      ["pass", "Pass"],
      ["fail", "Fail"],
      ["warning", "Warning"],
      ["invalid_input", "Invalid input"],
      ["not_applicable", "Not applicable"],
    ];

    for (const [status, label] of cases) {
      const { unmount } = render(<StatusBadge status={status} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  it("iconOnly still exposes an accessible name via role=img", () => {
    render(<StatusBadge status="fail" iconOnly />);
    expect(screen.getByRole("img", { name: "Fail" })).toBeInTheDocument();
  });
});
