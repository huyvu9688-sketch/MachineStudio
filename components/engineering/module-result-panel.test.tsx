// @vitest-environment jsdom
import { describe, expect, vi, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModuleResultPanel } from "./module-result-panel";
import { runModuleInstanceAction } from "@/app/(workspace)/workspace/actions";
import type { CalculationTrace, CheckResult, EngineeringValue, Warning } from "@/lib/engine";
import type { ModuleResultView } from "@/lib/application";

// module-result-panel.tsx imports this Server Action directly (an inline
// form, like module-input-workspace.tsx's field forms) — mocked for the same
// reason every other component test in this directory mocks the "use
// server" file (see module-input-workspace.test.tsx).
vi.mock("@/app/(workspace)/workspace/actions", () => ({
  runModuleInstanceAction: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(runModuleInstanceAction).mockReset();
  vi.mocked(runModuleInstanceAction).mockResolvedValue({ status: "success" });
});

const thrustForceOut: EngineeringValue = { v: 1, kind: "quantity", value: 12, unit: "N" };
const thrustForceIn: EngineeringValue = { v: 1, kind: "quantity", value: 12, unit: "N" };

const checks: CheckResult[] = [
  {
    id: "relay-preserves-value",
    status: "pass",
    message: "Relayed value equals the input value.",
    criterion: "F_out == F_in",
    observed: thrustForceOut,
    allowable: thrustForceIn,
  },
];

const warnings: Warning[] = [
  { id: "near-limit", message: "Result is near the validated envelope limit." },
];

const trace: CalculationTrace = {
  v: 1,
  sections: [
    {
      node: "section",
      id: "result",
      title: "Result",
      children: [
        {
          node: "step",
          id: "compute-result",
          title: "Relay thrust force",
          methodId: "relay.passthrough",
          inputs: [{ label: "F_in", value: thrustForceIn }],
          outputs: [{ label: "F_out", value: thrustForceOut }],
        },
      ],
    },
  ],
};

function baseModuleInstance(): ModuleResultView["moduleInstance"] {
  return {
    id: "m1" as never,
    assemblyId: "a1" as never,
    configurationId: "c1" as never,
    label: "Relay",
  };
}

function view(overrides: Partial<ModuleResultView> = {}): ModuleResultView {
  return {
    moduleInstance: baseModuleInstance(),
    run: {
      id: "run1" as never,
      status: "pass",
      criticalMargin: null,
      stale: false,
      staleReason: null,
      createdAt: new Date("2026-07-31T12:00:00Z"),
    },
    outputs: [
      {
        portKey: "thrust_force_out",
        parameterId: "motion.axis.thrust_force",
        label: "Thrust force",
        value: thrustForceOut,
      },
    ],
    checks,
    warnings: [],
    validity: [],
    trace,
    sources: [],
    comparison: null,
    ...overrides,
  };
}

describe("ModuleResultPanel", () => {
  it("renders the empty state and no output/check content when never run", () => {
    render(<ModuleResultPanel view={view({ run: null, outputs: [], checks: [], trace: null })} />);

    expect(screen.getByText("Not run yet")).toBeInTheDocument();
    expect(screen.getByText("Not configured")).toBeInTheDocument();
    expect(screen.queryByText("Output summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Checks")).not.toBeInTheDocument();
  });

  it("renders the output summary, check table, and trace from a stored run", () => {
    render(<ModuleResultPanel view={view()} />);

    // Overall status (header) and the check row's own status both read
    // "Pass" (`StatusBadge`); the header one carries the accessible run
    // timestamp text alongside it, which only one of the two badges has.
    expect(screen.getAllByText("Pass").length).toBe(2);
    expect(screen.getByText("Thrust force")).toBeInTheDocument();

    expect(screen.getByText("F_out == F_in")).toBeInTheDocument();
    // Three "12 N" cells: the output summary value, plus the check row's
    // observed and allowable cells — all read from the stored snapshot, not
    // a recomputation.
    expect(screen.getAllByText("12 N")).toHaveLength(3);

    expect(screen.getByText("Relay thrust force")).toBeInTheDocument();
    expect(screen.queryByText(/F_in = 12 N/)).not.toBeInTheDocument();
  });

  it("expands a trace step to reveal its inputs and outputs", async () => {
    const user = userEvent.setup();
    render(<ModuleResultPanel view={view()} />);

    await user.click(screen.getByRole("button", { name: "Relay thrust force" }));

    expect(screen.getByText(/F_in = 12 N/)).toBeInTheDocument();
    expect(screen.getByText(/F_out = 12 N/)).toBeInTheDocument();
    expect(screen.getByText("relay.passthrough")).toBeInTheDocument();
  });

  it("shows the stale banner and reason when the run is stale", () => {
    const staleView = view();
    render(
      <ModuleResultPanel
        view={{
          ...staleView,
          run: {
            id: "run1" as never,
            status: "pass",
            criticalMargin: null,
            stale: true,
            staleReason: "Upstream input changed.",
            createdAt: new Date("2026-07-31T12:00:00Z"),
          },
        }}
      />,
    );

    expect(screen.getByText("Upstream input changed.")).toBeInTheDocument();
  });

  it("does not show a stale banner for a fresh run", () => {
    render(<ModuleResultPanel view={view()} />);
    expect(screen.queryByText(/upstream/i)).not.toBeInTheDocument();
  });

  it("renders warnings", () => {
    render(<ModuleResultPanel view={view({ warnings })} />);
    expect(screen.getByText("Result is near the validated envelope limit.")).toBeInTheDocument();
  });

  it("shows an honest empty note when no run cites a source", () => {
    render(<ModuleResultPanel view={view()} />);
    expect(screen.getByText("No source references cited.")).toBeInTheDocument();
  });

  it("renders a resolved source reference", () => {
    render(
      <ModuleResultPanel
        view={view({
          sources: [
            { documentTitle: "ANSI B11.19", edition: "2019", clause: "5.2", page: null, label: null },
          ],
        })}
      />,
    );
    expect(screen.getByText(/ANSI B11\.19 \(2019\) — 5\.2/)).toBeInTheDocument();
  });

  it("renders a previous-run comparison when one is available", () => {
    render(
      <ModuleResultPanel
        view={view({
          comparison: {
            previousRunId: "run0" as never,
            previousRunCreatedAt: new Date("2026-07-31T11:00:00Z"),
            changedOutputs: [
              {
                portKey: "thrust_force_out",
                label: "Thrust force",
                before: { v: 1, kind: "quantity", value: 5, unit: "N" },
                after: thrustForceOut,
              },
            ],
            changedChecks: [],
          },
        })}
      />,
    );

    expect(screen.getByText("Previous-run comparison")).toBeInTheDocument();
    expect(screen.getByText("5 N")).toBeInTheDocument();
  });

  it("omits the previous-run comparison section when there is nothing to compare", () => {
    render(<ModuleResultPanel view={view()} />);
    expect(screen.queryByText("Previous-run comparison")).not.toBeInTheDocument();
  });

  it("runs the module instance when Run is clicked", async () => {
    const user = userEvent.setup();
    render(<ModuleResultPanel view={view()} />);

    await user.click(screen.getByRole("button", { name: "Run" }));

    expect(runModuleInstanceAction).toHaveBeenCalled();
  });

  it("shows the action's error message when running fails", async () => {
    vi.mocked(runModuleInstanceAction).mockResolvedValueOnce({
      status: "error",
      message: "Input \"thrust_force_in\" is linked to a stale upstream result.",
    });
    const user = userEvent.setup();
    render(<ModuleResultPanel view={view()} />);

    await user.click(screen.getByRole("button", { name: "Run" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("stale upstream result");
  });
});
