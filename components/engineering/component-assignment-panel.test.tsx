// @vitest-environment jsdom
import { describe, expect, vi, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComponentAssignmentPanel } from "./component-assignment-panel";
import { assignComponentAction } from "@/app/(workspace)/workspace/actions";
import type { ComponentAssignmentPanelView } from "@/lib/application";

// component-assignment-panel.tsx imports this Server Action directly (inline
// assign forms) — mocked the same way every other component test in this
// directory mocks the "use server" file.
vi.mock("@/app/(workspace)/workspace/actions", () => ({
  assignComponentAction: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(assignComponentAction).mockReset();
  vi.mocked(assignComponentAction).mockResolvedValue({ status: "success" });
});

function view(
  overrides: Partial<ComponentAssignmentPanelView> = {},
): ComponentAssignmentPanelView {
  return {
    moduleInstance: {
      id: "mi-1" as ComponentAssignmentPanelView["moduleInstance"]["id"],
      configurationId: "cfg-1" as ComponentAssignmentPanelView["moduleInstance"]["configurationId"],
      label: "Ball screw",
    },
    latestRunId: "run-1" as NonNullable<ComponentAssignmentPanelView["latestRunId"]>,
    componentType: null,
    requiredSpec: [],
    matchingAvailable: false,
    matchingUnavailableReason:
      "This module does not define catalog matching, so there is no required specification to filter parts against. A manual or custom part can still be assigned.",
    accepted: [],
    rejected: [],
    assignments: [],
    ...overrides,
  };
}

const part = {
  id: "rev-1" as never,
  manufacturerName: "THK",
  partNumber: "BNK1520",
  sourceRevision: "2024-A",
  sourceLink: "https://example.test/bnk1520.pdf",
  lifecycleStatus: "active",
  dataQualityStatus: "validated",
};

describe("ComponentAssignmentPanel", () => {
  it("states why matching is unavailable instead of rendering an empty candidate table", () => {
    render(<ComponentAssignmentPanel view={view()} />);

    expect(screen.getByText(/does not define catalog matching/i)).toBeInTheDocument();
    expect(
      screen.getByText(/No required specification has been calculated/i),
    ).toBeInTheDocument();
  });

  it("renders the required specification, ranked candidates, and their ranking reasons", () => {
    render(
      <ComponentAssignmentPanel
        view={view({
          componentType: "ball_screw",
          matchingAvailable: true,
          matchingUnavailableReason: null,
          requiredSpec: [
            { key: "dynamic_load", label: "Dynamic load", operator: "gte", displayValue: "3660 N" },
          ],
          accepted: [
            {
              part,
              score: 0.12,
              rankingReasons: ['"Dynamic load" 4100 N meets the required minimum 3660 N'],
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("Dynamic load")).toBeInTheDocument();
    expect(screen.getByText("3660 N")).toBeInTheDocument();
    expect(screen.getByText("BNK1520")).toBeInTheDocument();
    expect(screen.getByText(/meets the required minimum/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /datasheet/i })).toHaveAttribute(
      "href",
      "https://example.test/bnk1520.pdf",
    );
  });

  it("reveals rejection reasons on demand", async () => {
    const user = userEvent.setup();
    render(
      <ComponentAssignmentPanel
        view={view({
          matchingAvailable: true,
          matchingUnavailableReason: null,
          rejected: [
            {
              part,
              rejectionReasons: ['"Dynamic load" 2100 N is below the required minimum 3660 N'],
            },
          ],
        })}
      />,
    );

    expect(screen.queryByText(/is below the required minimum/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /show 1 rejected part/i }));
    expect(screen.getByText(/is below the required minimum/i)).toBeInTheDocument();
  });

  it("submits a catalog part assignment", async () => {
    const user = userEvent.setup();
    render(
      <ComponentAssignmentPanel
        view={view({
          matchingAvailable: true,
          matchingUnavailableReason: null,
          accepted: [{ part, score: 0, rankingReasons: [] }],
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Assign" }));

    expect(assignComponentAction).toHaveBeenCalled();
  });

  it("submits a manual part assignment", async () => {
    const user = userEvent.setup();
    render(<ComponentAssignmentPanel view={view()} />);

    await user.type(screen.getByLabelText(/description/i), "Custom bracket");
    await user.click(screen.getByRole("button", { name: /assign manual part/i }));

    expect(assignComponentAction).toHaveBeenCalled();
  });

  it("blocks assignment and explains why when the module has never been run", () => {
    render(<ComponentAssignmentPanel view={view({ latestRunId: null })} />);

    expect(screen.getByRole("button", { name: /assign manual part/i })).toBeDisabled();
    expect(screen.getAllByText(/Run this module first/i).length).toBeGreaterThan(0);
  });

  it("renders an assigned part with its supporting run", () => {
    render(
      <ComponentAssignmentPanel
        view={view({
          assignments: [
            {
              id: "asg-1",
              partSource: "catalog",
              part,
              manualDescription: null,
              manualManufacturerName: null,
              manualPartNumber: null,
              quantity: 2,
              stale: false,
              staleReason: null,
              supportingRun: {
                id: "run-1" as never,
                status: "pass",
                createdAt: new Date("2026-07-31T10:00:00Z"),
              },
              createdAt: new Date("2026-07-31T10:05:00Z"),
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("BNK1520")).toBeInTheDocument();
    expect(screen.getByText("qty 2")).toBeInTheDocument();
    expect(screen.getByText(/Supporting run:/i)).toBeInTheDocument();
    expect(screen.getByText("run-1")).toBeInTheDocument();
  });

  it("shows a stale assignment's reason", () => {
    render(
      <ComponentAssignmentPanel
        view={view({
          assignments: [
            {
              id: "asg-1",
              partSource: "manual",
              part: null,
              manualDescription: "Custom bracket",
              manualManufacturerName: null,
              manualPartNumber: null,
              quantity: 1,
              stale: true,
              staleReason: "Upstream input changed.",
              supportingRun: null,
              createdAt: new Date("2026-07-31T10:05:00Z"),
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("Custom bracket")).toBeInTheDocument();
    expect(screen.getByText("Upstream input changed.")).toBeInTheDocument();
    expect(screen.getByText(/No supporting run recorded/i)).toBeInTheDocument();
  });

  it("reports the empty state when nothing is assigned yet", () => {
    render(<ComponentAssignmentPanel view={view()} />);

    expect(screen.getByText(/No part is assigned to this module yet/i)).toBeInTheDocument();
  });
});
