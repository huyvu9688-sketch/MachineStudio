// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModuleResultPanel } from "./module-result-panel";
import type {
  CalculationTrace,
  CheckResult,
  EngineeringValue,
  Warning,
} from "@/lib/engine";
import type {
  CatalogMatchingView,
  ModulePreviewView,
  ModuleResultView,
} from "@/lib/application";

// `ModulePreviewView.componentAssignment` isn't this file's concern (see
// component-assignment-panel.test.tsx for that) — every fixture here just
// needs a valid, "no adapter" placeholder so the type checks.
const noMatchingComponentAssignment: CatalogMatchingView = {
  componentType: null,
  requiredSpec: [],
  matchingAvailable: false,
  matchingUnavailableReason: "This module does not define catalog matching.",
  accepted: [],
  rejected: [],
};

const thrustForceOut: EngineeringValue = {
  v: 1,
  kind: "quantity",
  value: 12,
  unit: "N",
};
const thrustForceIn: EngineeringValue = {
  v: 1,
  kind: "quantity",
  value: 12,
  unit: "N",
};

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
        loadCase: null,
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
    render(
      <ModuleResultPanel
        view={view({ run: null, outputs: [], checks: [], trace: null })}
        preview={null}
      />,
    );

    expect(screen.getByText("Not run yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Click Run in the header above to preview this module's result from its current inputs.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Not configured")).toBeInTheDocument();
    expect(screen.queryByText("Output summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Checks")).not.toBeInTheDocument();
  });

  it("renders the output summary, check table, and trace from a stored run", () => {
    render(<ModuleResultPanel view={view()} preview={null} />);

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

  it("links the Report action at ?module=<id>, opened in a new tab", () => {
    render(<ModuleResultPanel view={view()} preview={null} />);
    const link = screen.getByRole("link", { name: /report/i });
    expect(link).toHaveAttribute("href", "/workspace/report?module=m1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("expands a trace step to reveal its inputs and outputs", async () => {
    const user = userEvent.setup();
    render(<ModuleResultPanel view={view()} preview={null} />);

    await user.click(
      screen.getByRole("button", { name: "Relay thrust force" }),
    );

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
        preview={null}
      />,
    );

    expect(screen.getByText("Upstream input changed.")).toBeInTheDocument();
  });

  it("does not show a stale banner for a fresh run", () => {
    render(<ModuleResultPanel view={view()} preview={null} />);
    expect(screen.queryByText(/upstream/i)).not.toBeInTheDocument();
  });

  it("renders warnings", () => {
    render(<ModuleResultPanel view={view({ warnings })} preview={null} />);
    expect(
      screen.getByText("Result is near the validated envelope limit."),
    ).toBeInTheDocument();
  });

  it("shows an honest empty note when no run cites a source", () => {
    render(<ModuleResultPanel view={view()} preview={null} />);
    expect(screen.getByText("No source references cited.")).toBeInTheDocument();
  });

  it("renders a resolved source reference", () => {
    render(
      <ModuleResultPanel
        view={view({
          sources: [
            {
              documentTitle: "ANSI B11.19",
              edition: "2019",
              clause: "5.2",
              page: null,
              label: null,
            },
          ],
        })}
        preview={null}
      />,
    );
    expect(
      screen.getByText(/ANSI B11\.19 \(2019\) — 5\.2/),
    ).toBeInTheDocument();
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
                loadCase: null,
              },
            ],
            changedChecks: [],
          },
        })}
        preview={null}
      />,
    );

    expect(screen.getByText("Previous-run comparison")).toBeInTheDocument();
    expect(screen.getByText("5 N")).toBeInTheDocument();
  });

  it("omits the previous-run comparison section when there is nothing to compare", () => {
    render(<ModuleResultPanel view={view()} preview={null} />);
    expect(
      screen.queryByText("Previous-run comparison"),
    ).not.toBeInTheDocument();
  });

  it("labels a load-case-pinned output so same-parameter outputs stay distinguishable", () => {
    render(
      <ModuleResultPanel
        view={view({
          outputs: [
            {
              portKey: "thrust_force_out_peak",
              parameterId: "motion.axis.thrust_force",
              label: "Thrust force",
              value: thrustForceOut,
              loadCase: "peak",
            },
          ],
        })}
        preview={null}
      />,
    );

    expect(screen.getByText("Peak load case")).toBeInTheDocument();
  });

  it("does not render a load-case label for an unpinned output", () => {
    render(<ModuleResultPanel view={view()} preview={null} />);
    expect(screen.queryByText(/load case$/)).not.toBeInTheDocument();
  });

  it("labels a load-case-pinned output in the previous-run comparison too", () => {
    render(
      <ModuleResultPanel
        view={view({
          comparison: {
            previousRunId: "run0" as never,
            previousRunCreatedAt: new Date("2026-07-31T11:00:00Z"),
            changedOutputs: [
              {
                portKey: "thrust_force_out_holding",
                label: "Thrust force",
                before: { v: 1, kind: "quantity", value: 5, unit: "N" },
                after: thrustForceOut,
                loadCase: "holding",
              },
            ],
            changedChecks: [],
          },
        })}
        preview={null}
      />,
    );

    expect(screen.getByText("Holding load case")).toBeInTheDocument();
  });

  it("renders the live preview instead of the persisted run, with its banner", () => {
    const preview: ModulePreviewView = {
      outputs: [
        {
          portKey: "thrust_force_out",
          parameterId: "motion.axis.thrust_force",
          label: "Thrust force",
          value: { v: 1, kind: "quantity", value: 99, unit: "N" },
          loadCase: null,
        },
      ],
      checks: [],
      warnings: [],
      validity: [],
      trace: null,
      sources: [],
      componentAssignment: noMatchingComponentAssignment,
    };

    render(<ModuleResultPanel view={view()} preview={preview} />);

    expect(
      screen.getByText("Preview — not saved. Click Save to keep this result."),
    ).toBeInTheDocument();
    expect(screen.getByText("99 N")).toBeInTheDocument();
    // The persisted run's own comparison section is hidden while previewing.
    expect(
      screen.queryByText("Previous-run comparison"),
    ).not.toBeInTheDocument();
  });

  it("shows a live preview even when the module instance has never been run", () => {
    const preview: ModulePreviewView = {
      outputs: [],
      checks: [],
      warnings: [],
      validity: [],
      trace: null,
      sources: [],
      componentAssignment: noMatchingComponentAssignment,
    };

    render(
      <ModuleResultPanel
        view={view({ run: null, outputs: [], checks: [], trace: null })}
        preview={preview}
      />,
    );

    expect(screen.queryByText("Not run yet")).not.toBeInTheDocument();
    expect(
      screen.getByText("Preview — not saved. Click Save to keep this result."),
    ).toBeInTheDocument();
  });

  it("suppresses the persisted run's stale banner while a live preview is showing", () => {
    render(
      <ModuleResultPanel
        view={{
          ...view(),
          run: {
            id: "run1" as never,
            status: "pass",
            criticalMargin: null,
            stale: true,
            staleReason: "Upstream input changed.",
            createdAt: new Date("2026-07-31T12:00:00Z"),
          },
        }}
        preview={{
          outputs: [],
          checks: [],
          warnings: [],
          validity: [],
          trace: null,
          sources: [],
          componentAssignment: noMatchingComponentAssignment,
        }}
      />,
    );

    expect(screen.queryByText("Upstream input changed.")).not.toBeInTheDocument();
  });

  it("shows the preview's own status and hides the persisted run's timestamp while previewing", () => {
    // Regression test for the code-review fix (commit 8f59e80): the header
    // badge and timestamp used to always reflect `view.run`, even while a
    // completely different `preview` was rendered below — e.g. a failing
    // persisted run's red "Fail" badge sitting above a passing live preview.
    render(
      <ModuleResultPanel
        view={view()} // view().run.status === "pass", with a timestamp
        preview={{
          outputs: [],
          checks: [], // overallCheckStatus([]) === "not_applicable"
          warnings: [],
          validity: [],
          trace: null,
          sources: [],
          componentAssignment: noMatchingComponentAssignment,
        }}
      />,
    );

    expect(screen.getByText("Not applicable")).toBeInTheDocument();
    expect(screen.queryByText("Pass")).not.toBeInTheDocument();
    // The persisted run's timestamp is hidden entirely while a preview shows.
    expect(
      screen.queryByText(view().run!.createdAt.toLocaleString()),
    ).not.toBeInTheDocument();
  });
});
