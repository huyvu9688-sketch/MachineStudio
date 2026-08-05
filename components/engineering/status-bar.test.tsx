// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBar } from "./status-bar";
import type { ModuleStatusSummary } from "./module-status-summary";

const SUMMARY: ModuleStatusSummary = {
  total: 3,
  pass: 1,
  fail: 2,
  warning: 0,
  notConfigured: 0,
  invalidInput: 0,
  notApplicable: 0,
  overallStatus: "fail",
};

describe("StatusBar", () => {
  it("renders placeholders when there is no active project", () => {
    render(<StatusBar marketProfileKey={null} summary={null} />);

    // Failed checks and market profile both fall back to an em dash.
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  it("renders real counts and the active market profile when a project is selected", () => {
    render(
      <StatusBar
        marketProfileKey="US-General-Industrial-Machinery@1"
        summary={SUMMARY}
      />,
    );

    expect(screen.getByText("2")).toBeInTheDocument(); // failed checks
    expect(
      screen.getByText("US-General-Industrial-Machinery@1"),
    ).toBeInTheDocument();
    expect(screen.getByText("Fail")).toBeInTheDocument(); // overall run-status badge
  });
});
