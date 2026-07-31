// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeQuantity } from "@/lib/engine";
import type { CheckResult } from "@/lib/engine/trace";
import type {
  BaselineComparisonView,
  BaselineWorkspaceView,
} from "@/lib/application";
import { createBaselineAction } from "@/app/(workspace)/workspace/actions";
import { BaselineWorkspace } from "./baseline-workspace";

vi.mock("@/app/(workspace)/workspace/actions", () => ({
  createBaselineAction: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(createBaselineAction).mockReset();
  vi.mocked(createBaselineAction).mockResolvedValue({ status: "success" });
});

function baseline(id: string, label: string, createdAt: string) {
  return {
    id,
    label,
    createdByUserId: "owner",
    createdAt: new Date(createdAt),
  };
}

function check(
  status: CheckResult["status"],
  observed: number,
  sourceRevisionId?: string,
): CheckResult {
  return {
    id: "load-capability",
    status,
    message: "Load capability",
    criterion: "Force must remain below the allowable limit",
    observed: makeQuantity(observed, "N"),
    allowable: makeQuantity(20, "N"),
    margin: makeQuantity(20 - observed, "N"),
    ...(sourceRevisionId === undefined
      ? {}
      : {
          sources: [
            {
              sourceRevisionId: sourceRevisionId as NonNullable<
                CheckResult["sources"]
              >[number]["sourceRevisionId"],
              clause: "6.1",
            },
          ],
        }),
  };
}

function comparison(): BaselineComparisonView {
  const before = baseline(
    "baseline-1",
    "Initial design",
    "2026-07-01T10:00:00.000Z",
  );
  const after = baseline(
    "baseline-2",
    "Design review",
    "2026-07-02T10:00:00.000Z",
  );
  return {
    before,
    after,
    comparison: {
      requirements: {
        added: [],
        removed: [],
        changed: [
          {
            id: "req-1",
            before: {
              id: "req-1",
              assemblyId: null,
              code: "REQ-01",
              statement: "Move the payload accurately.",
              acceptanceCriteria: [],
            },
            after: {
              id: "req-1",
              assemblyId: null,
              code: "REQ-01",
              statement: "Move the payload accurately.",
              acceptanceCriteria: [
                {
                  id: "criterion-1",
                  statement: "Position error is at most 0.1 mm.",
                },
              ],
            },
          },
        ],
      },
      designAssumptions: { added: [], removed: [], changed: [] },
      loadCases: { added: [], removed: [], changed: [] },
      assemblies: { added: [], removed: [], changed: [] },
      moduleInstances: { added: [], removed: [], changed: [] },
      parameterValues: {
        added: [],
        removed: [],
        changed: [
          {
            id: "module_input|m:module-1|motion.axis.payload_mass|",
            before: {
              id: "value-1",
              assemblyId: null,
              moduleInstanceId: "module-1",
              nodeKind: "module_input",
              parameterId: "motion.axis.payload_mass",
              loadCase: null,
              source: "manual",
              value: makeQuantity(10, "kg"),
            },
            after: {
              id: "value-2",
              assemblyId: null,
              moduleInstanceId: "module-1",
              nodeKind: "module_input",
              parameterId: "motion.axis.payload_mass",
              loadCase: null,
              source: "manual",
              value: makeQuantity(12, "kg"),
            },
          },
        ],
      },
      parameterLinks: { added: [], removed: [], changed: [] },
      calculationRuns: { added: [], removed: [], changed: [] },
      componentAssignments: {
        added: [],
        removed: [],
        changed: [
          {
            id: "assignment-1",
            before: {
              id: "assignment-1",
              targetKind: "module_instance",
              moduleInstanceId: "module-1",
              assemblyId: null,
              partSource: "catalog",
              manufacturerPartRevisionId: "part-revision-1",
              manualPartDetails: null,
              quantity: 1,
              calculationRunId: "run-1",
              stale: false,
            },
            after: {
              id: "assignment-1",
              targetKind: "module_instance",
              moduleInstanceId: "module-1",
              assemblyId: null,
              partSource: "catalog",
              manufacturerPartRevisionId: "part-revision-2",
              manualPartDetails: null,
              quantity: 1,
              calculationRunId: "run-2",
              stale: true,
            },
          },
          {
            id: "assignment-manual",
            before: {
              id: "assignment-manual",
              targetKind: "assembly",
              moduleInstanceId: null,
              assemblyId: "assembly-1",
              partSource: "manual",
              manufacturerPartRevisionId: null,
              manualPartDetails: {
                description: "Cable carrier",
                manufacturerName: "Example supplier",
                partNumber: "MAN-1",
                notes: "Original selection",
              },
              quantity: 1,
              calculationRunId: null,
              stale: false,
            },
            after: {
              id: "assignment-manual",
              targetKind: "assembly",
              moduleInstanceId: null,
              assemblyId: "assembly-1",
              partSource: "manual",
              manufacturerPartRevisionId: null,
              manualPartDetails: {
                description: "Cable carrier",
                manufacturerName: "Example supplier",
                partNumber: "MAN-2",
                notes: "Replacement selection",
              },
              quantity: 1,
              calculationRunId: null,
              stale: false,
            },
          },
        ],
      },
    },
    changedOutputs: [
      {
        moduleInstanceId: "module-1",
        moduleLabel: "Axis sizing",
        portKey: "actuator_force",
        before: makeQuantity(10, "N"),
        after: makeQuantity(12, "N"),
      },
    ],
    changedChecks: [
      {
        moduleInstanceId: "module-1",
        moduleLabel: "Axis sizing",
        id: "load-capability",
        message: "Load capability",
        before: check("pass", 10, "source@1"),
        after: check("warning", 12, "source@2"),
      },
    ],
    unavailableRunDetails: [],
  };
}

function view(
  overrides: Partial<BaselineWorkspaceView> = {},
): BaselineWorkspaceView {
  return {
    projectId: "project-1",
    configurationId:
      "configuration-1" as BaselineWorkspaceView["configurationId"],
    blockers: [],
    baselines: [],
    selectedBeforeBaselineId: null,
    selectedAfterBaselineId: null,
    comparison: null,
    comparisonError: null,
    ...overrides,
  };
}

describe("BaselineWorkspace", () => {
  it("renders the current readiness review and an empty baseline history", () => {
    render(<BaselineWorkspace view={view()} />);

    expect(
      screen.getByRole("heading", { name: "Baselines & comparison" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "No stale, failed, or invalid calculation items currently block a baseline.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No baselines have been recorded yet."),
    ).toBeInTheDocument();
  });

  it("requires an explicit acknowledgement when current readiness has blockers", () => {
    render(
      <BaselineWorkspace
        view={view({
          blockers: [
            {
              kind: "stale_run",
              id: "run-1",
              message: "Axis sizing has a stale calculation run.",
            },
          ],
        })}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Axis sizing has a stale calculation run.",
    );
    expect(
      screen.getByRole("checkbox", {
        name: /I acknowledge the current readiness items/i,
      }),
    ).toBeRequired();
  });

  it("submits a baseline label through the Server Action", async () => {
    const user = userEvent.setup();
    render(<BaselineWorkspace view={view()} />);

    await user.type(
      screen.getByLabelText("Baseline label"),
      "Design review 01",
    );
    await user.click(screen.getByRole("button", { name: "Create baseline" }));

    expect(createBaselineAction).toHaveBeenCalled();
  });

  it("renders changed requirements, inputs, outputs, checks, and parts from immutable snapshots", () => {
    const before = baseline(
      "baseline-1",
      "Initial design",
      "2026-07-01T10:00:00.000Z",
    );
    const after = baseline(
      "baseline-2",
      "Design review",
      "2026-07-02T10:00:00.000Z",
    );
    render(
      <BaselineWorkspace
        view={view({
          baselines: [before, after],
          selectedBeforeBaselineId: before.id,
          selectedAfterBaselineId: after.id,
          comparison: comparison(),
        })}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Baseline comparison" }),
    ).toBeInTheDocument();
    expect(screen.getByText("REQ-01")).toBeInTheDocument();
    expect(screen.getByText("motion.axis.payload_mass")).toBeInTheDocument();
    expect(
      screen.getByText("Axis sizing · actuator_force"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Load capability/)).toBeInTheDocument();
    expect(screen.getByText(/Sources source@2 6\.1/)).toBeInTheDocument();
    expect(
      screen.getByText(/part-revision-2 × 1 on module-1 \(stale\)/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Part number: MAN-2/)).toBeInTheDocument();
  });
});
