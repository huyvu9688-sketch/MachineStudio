// @vitest-environment jsdom
import { describe, expect, vi, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModuleInputWorkspace } from "./module-input-workspace";
import {
  confirmSuggestedLinkAction,
  previewModuleComputationAction,
  removeParameterLinkAction,
  saveModuleInputsAction,
} from "@/app/(workspace)/workspace/actions";
import type {
  CatalogMatchingView,
  LinkSuggestionSourceView,
  ModuleInputFieldView,
  ModulePreviewView,
  ModuleWorkspaceView,
} from "@/lib/application";

// `ModulePreviewView.componentAssignment` isn't this file's concern — every
// fixture here just needs a valid, "no adapter" placeholder so the type
// checks (component-assignment-panel.test.tsx covers the real behavior).
const noMatchingComponentAssignment: CatalogMatchingView = {
  componentType: null,
  requiredSpec: [],
  matchingAvailable: false,
  matchingUnavailableReason: "This module does not define catalog matching.",
  accepted: [],
  rejected: [],
};

// module-input-workspace.tsx (and the link-suggestion-panel.tsx it renders)
// import these Server Actions directly (inline forms, unlike the dialogs) —
// mocked for the same reason every other component test in this directory
// mocks the "use server" file (see app-bar.test.tsx).
vi.mock("@/app/(workspace)/workspace/actions", () => ({
  saveModuleInputsAction: vi.fn(),
  previewModuleComputationAction: vi.fn(),
  confirmSuggestedLinkAction: vi.fn(),
  removeParameterLinkAction: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(saveModuleInputsAction).mockReset();
  vi.mocked(saveModuleInputsAction).mockResolvedValue({ status: "success" });
  vi.mocked(previewModuleComputationAction).mockReset();
  vi.mocked(previewModuleComputationAction).mockResolvedValue({
    status: "success",
    preview: {
      outputs: [],
      checks: [],
      warnings: [],
      validity: [],
      trace: null,
      sources: [],
      componentAssignment: noMatchingComponentAssignment,
    },
  });
  vi.mocked(confirmSuggestedLinkAction).mockReset();
  vi.mocked(confirmSuggestedLinkAction).mockResolvedValue({
    status: "success",
  });
  vi.mocked(removeParameterLinkAction).mockReset();
  vi.mocked(removeParameterLinkAction).mockResolvedValue({ status: "success" });
});

function noopOnPreviewChange(): void {
  // The test's own assertions read the mock's calls when they care about
  // what was lifted, rather than reading state from this no-op.
}

const quantityDefaultField: ModuleInputFieldView = {
  portKey: "payload_mass",
  parameterId: "motion.axis.payload_mass",
  label: "Payload mass",
  help: "Total moving mass carried by the axis.",
  required: true,
  loadCase: null,
  field: {
    kind: "quantity",
    canonicalUnit: "kg",
    displayUnits: ["kg", "g", "lbm"],
  },
  resolved: { source: "default" },
  suggestions: [],
  linkRemovalImpact: null,
};
const lengthManualField: ModuleInputFieldView = {
  portKey: "stroke",
  parameterId: "motion.axis.stroke",
  label: "Stroke",
  help: null,
  required: true,
  loadCase: null,
  field: { kind: "quantity", canonicalUnit: "m", displayUnits: ["m", "mm"] },
  resolved: {
    source: "manual",
    value: { v: 1, kind: "quantity", value: 0.5, unit: "m", displayUnit: "mm" },
  },
  suggestions: [],
  linkRemovalImpact: null,
};

const fractionalLengthManualField: ModuleInputFieldView = {
  ...lengthManualField,
  resolved: {
    source: "manual",
    value: {
      v: 1,
      kind: "quantity",
      value: 0.123456789,
      unit: "m",
      displayUnit: "mm",
    },
  },
};

const temperatureManualField: ModuleInputFieldView = {
  portKey: "ambient_temperature",
  parameterId: "env.ambient_temperature",
  label: "Ambient temperature",
  help: null,
  required: true,
  loadCase: null,
  field: { kind: "quantity", canonicalUnit: "K", displayUnits: ["K", "degC"] },
  resolved: {
    source: "manual",
    value: {
      v: 1,
      kind: "quantity",
      value: 298.15,
      unit: "K",
      displayUnit: "degC",
    },
  },
  suggestions: [],
  linkRemovalImpact: null,
};

const enumManualField: ModuleInputFieldView = {
  portKey: "orientation",
  parameterId: "motion.axis.orientation",
  label: "Axis orientation",
  help: null,
  required: false,
  loadCase: "normal",
  field: {
    kind: "enum",
    enumId: "axis_orientation",
    options: ["horizontal", "vertical", "inclined"],
  },
  resolved: {
    source: "manual",
    value: {
      v: 1,
      kind: "enum",
      enumId: "axis_orientation",
      value: "vertical",
    },
  },
  suggestions: [],
  linkRemovalImpact: null,
};

const applicationCaseUnsetField: ModuleInputFieldView = {
  portKey: "application_case",
  parameterId: "pneumatic_guided_mgp_sizing.application_case",
  label: "Application case",
  help: null,
  required: true,
  loadCase: null,
  field: {
    kind: "enum",
    enumId: "pneumatic_guided_mgp_application_case",
    options: ["vertical_lifter", "horizontal_pusher", "stopper"],
  },
  resolved: { source: "default" },
  suggestions: [],
  linkRemovalImpact: null,
};

const booleanWorkflowField: ModuleInputFieldView = {
  portKey: "brake_present",
  parameterId: "drive.brake.present",
  label: "Holding brake present",
  help: null,
  required: false,
  loadCase: null,
  field: { kind: "boolean" },
  resolved: {
    source: "workflow",
    value: { v: 1, kind: "boolean", value: true },
  },
  suggestions: [],
  linkRemovalImpact: null,
};

const linkedField: ModuleInputFieldView = {
  portKey: "thrust_force_in",
  parameterId: "motion.axis.thrust_force",
  label: "Required thrust force",
  help: null,
  required: true,
  loadCase: null,
  field: {
    kind: "quantity",
    canonicalUnit: "N",
    displayUnits: ["N", "kN", "lbf"],
  },
  resolved: {
    source: "linked",
    link: {
      id: "link1" as never,
      configurationId: "c1" as never,
      targetModuleInstanceId: "m1" as never,
      targetParameterId: "motion.axis.thrust_force",
      targetLoadCase: null,
      sourceKind: "module_output",
      sourceModuleInstanceId: "m0" as never,
      sourceAssemblyId: null,
      sourceParameterId: "motion.axis.thrust_force",
      sourceLoadCase: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    value: null,
  },
  suggestions: [],
  linkRemovalImpact: 2,
};

const unsupportedField: ModuleInputFieldView = {
  portKey: "non_axis_vector",
  parameterId: "example.non_axis_vector",
  label: "Non-axis vector example",
  help: null,
  required: false,
  loadCase: null,
  field: { kind: "unsupported", valueType: "vector_quantity" },
  resolved: { source: "default" },
  suggestions: [],
  linkRemovalImpact: null,
};

const vectorManualField: ModuleInputFieldView = {
  portKey: "cg_offset",
  parameterId: "motion.axis.center_of_mass_offset",
  label: "Center-of-mass offset",
  help: null,
  required: false,
  loadCase: null,
  field: {
    kind: "vector_quantity",
    canonicalUnit: "m",
    displayUnits: ["mm", "cm", "m", "in"],
    frame: "axis",
  },
  resolved: {
    source: "manual",
    value: {
      v: 1,
      kind: "vector_quantity",
      components: [0.05, 0, -0.02],
      unit: "m",
      frame: "axis",
      displayUnit: "mm",
    },
  },
  suggestions: [],
  linkRemovalImpact: null,
};

const vectorDefaultField: ModuleInputFieldView = {
  portKey: "external_force",
  parameterId: "motion.axis.external_force",
  label: "External process force",
  help: null,
  required: true,
  loadCase: "normal",
  field: {
    kind: "vector_quantity",
    canonicalUnit: "N",
    displayUnits: ["N", "kN", "lbf"],
    frame: "axis",
  },
  resolved: { source: "default" },
  suggestions: [],
  linkRemovalImpact: null,
};

const requirementSuggestion: LinkSuggestionSourceView = {
  sourceKind: "machine_requirement",
  sourceModuleInstanceId: null,
  sourceAssemblyId: null,
  sourceParameterId: "motion.axis.payload_mass",
  sourceLoadCase: "normal",
  parameterLabel: "Payload mass",
  scopeLabel: "Machine",
  moduleLabel: null,
  origin: "scope",
  value: { v: 1, kind: "quantity", value: 12, unit: "kg" },
};

const fieldWithSuggestion: ModuleInputFieldView = {
  ...quantityDefaultField,
  suggestions: [requirementSuggestion],
};

const disabledFieldWithSuggestion: ModuleInputFieldView = {
  ...fieldWithSuggestion,
  disabled: true,
};

function view(fields: readonly ModuleInputFieldView[]): ModuleWorkspaceView {
  return {
    moduleInstance: {
      id: "m1" as never,
      assemblyId: "a1" as never,
      configurationId: "c1" as never,
      label: "Thrust check",
      modulePackageId: "example-scaffold",
      moduleVersion: "0.1.0",
      category: "example",
      lastRunStatus: "pass",
    },
    groups: [{ id: "inputs", title: "Inputs", fields }],
  };
}

describe("ModuleInputWorkspace", () => {
  it("renders an allowed module guide and its resolved case helper", () => {
    render(
      <ModuleInputWorkspace
        view={{
          ...view([enumManualField]),
          callouts: [
            {
              title: "Choose the MGP selection case",
              imagePath: "/module-guides/mgp-selection-cases.svg",
              alt: "MGP lifter, pusher, and stopper selection cases",
              text: "Use the stopper graph.",
            },
          ],
        }}
        onPreviewChange={noopOnPreviewChange}
      />,
    );
    expect(
      screen.getByRole("img", {
        name: "MGP lifter, pusher, and stopper selection cases",
      }),
    ).toHaveAttribute("src", "/module-guides/mgp-selection-cases.svg");
    expect(screen.getByText("Use the stopper graph.")).toBeInTheDocument();
  });

  it("does not render an external callout image", () => {
    render(
      <ModuleInputWorkspace
        view={{
          ...view([quantityDefaultField]),
          callouts: [
            {
              title: "Unsafe guide",
              imagePath: "https://example.test/guide.svg",
              alt: "External guide",
              text: null,
            },
          ],
        }}
        onPreviewChange={noopOnPreviewChange}
      />,
    );
    expect(screen.queryByRole("img", { name: "External guide" })).toBeNull();
    expect(screen.queryByText("Unsafe guide")).toBeNull();
  });

  it("selects an application case by clicking its region in the callout illustration, instead of requiring the paired dropdown", async () => {
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={{
          ...view([applicationCaseUnsetField]),
          callouts: [
            {
              title: "MGP selection cases",
              imagePath: "/module-guides/mgp-selection-cases.svg",
              alt: "Vertical lifter, horizontal pusher, and stopper MGP application diagrams",
              text: null,
              caseSelector: {
                portKey: "application_case",
                selectedValue: undefined,
                cases: [
                  {
                    value: "vertical_lifter",
                    text: "Vertical lifter guidance.",
                  },
                  {
                    value: "horizontal_pusher",
                    text: "Horizontal pusher guidance.",
                  },
                  { value: "stopper", text: "Stopper guidance." },
                ],
              },
            },
          ],
        }}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(screen.getByRole("button", { name: "Run" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Horizontal pusher" }));

    expect(screen.getByLabelText("Application case")).toHaveValue(
      "horizontal_pusher",
    );
    expect(
      screen.getByText("Horizontal pusher guidance."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run" })).not.toBeDisabled();
    expect(saveModuleInputsAction).not.toHaveBeenCalled();
  });

  it("does not add a guide when the module declares no callouts", () => {
    render(
      <ModuleInputWorkspace
        view={view([quantityDefaultField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );
    expect(screen.queryByRole("figure")).toBeNull();
  });

  it("renders the module header, group title, and every field kind generically", () => {
    render(
      <ModuleInputWorkspace
        view={view([
          quantityDefaultField,
          enumManualField,
          booleanWorkflowField,
          linkedField,
          unsupportedField,
        ])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Thrust check" }),
    ).toBeInTheDocument();
    expect(screen.getByText("example-scaffold@0.1.0")).toBeInTheDocument();
    expect(screen.getByText("Inputs")).toBeInTheDocument();

    expect(screen.getByLabelText("Payload mass")).toBeInTheDocument();
    expect(
      screen.getByText("Total moving mass carried by the axis."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Payload mass unit")).toBeInTheDocument();
    expect(screen.getAllByText("Not set")).toHaveLength(2);
    expect(screen.queryByText("Default")).not.toBeInTheDocument();

    expect(screen.getByLabelText("Axis orientation")).toHaveValue("vertical");
    expect(screen.getByText("Manual")).toBeInTheDocument();
    expect(screen.getByText("Normal load case")).toBeInTheDocument();

    expect(screen.getByLabelText("Holding brake present")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.getByText("Workflow")).toBeInTheDocument();

    expect(screen.getByText("Linked")).toBeInTheDocument();
    expect(screen.getByText(/Linked from a module output/)).toBeInTheDocument();

    expect(
      screen.getByText(/Editing vector quantity values is not supported yet/),
    ).toBeInTheDocument();

    // The header's own single Save/Run pair, not one per field.
    expect(screen.getAllByRole("button", { name: "Save" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Run" })).toHaveLength(1);
  });

  it("renders 'Default' (not 'Not set') for an unset field with a real registry constant", () => {
    const gravityField: ModuleInputFieldView = {
      ...quantityDefaultField,
      portKey: "gravity",
      parameterId: "motion.axis.gravity",
      label: "Gravitational acceleration",
      hasBuiltInDefault: true,
    };
    render(
      <ModuleInputWorkspace
        view={view([gravityField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(screen.getByText("Default")).toBeInTheDocument();
    expect(screen.queryByText("Not set")).not.toBeInTheDocument();
  });

  it("pre-fills a required field's control from its registry constant instead of rendering blank, and does not block Save/Run", async () => {
    // Regression test: a required port resolved to "default" with a real
    // registry constant behind it (e.g. motor_sizing.*.inertia_ratio_
    // recommended_maximum on every Motor Sizing Tool module) used to render
    // its control blank while still carrying HTML `required` — a fresh
    // instance of any of those five modules could never be saved or
    // previewed at all: the browser silently refused submission on a field
    // the app itself reported as "Default" and Run-ready.
    const user = userEvent.setup();
    const inertiaRatioField: ModuleInputFieldView = {
      ...quantityDefaultField,
      portKey: "inertia_ratio_maximum",
      parameterId: "motor_sizing.ball_screw.inertia_ratio_recommended_maximum",
      label: "Inertia ratio maximum",
      hasBuiltInDefault: true,
      builtInDefaultValue: {
        v: 1,
        kind: "quantity",
        value: 10,
        unit: "kg",
      },
    };
    render(
      <ModuleInputWorkspace
        view={view([inertiaRatioField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    const input = screen.getByLabelText(
      "Inertia ratio maximum",
    ) as HTMLInputElement;
    expect(input).toHaveValue(10);
    expect(input.validity.valueMissing).toBe(false);
    expect(screen.getByRole("button", { name: "Run" })).not.toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(saveModuleInputsAction).toHaveBeenCalled();
  });

  it("renders a stored canonical length in its selected display unit", () => {
    render(
      <ModuleInputWorkspace
        view={view([lengthManualField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(screen.getByLabelText("Stroke")).toHaveValue(500);
    expect(screen.getByLabelText("Stroke unit")).toHaveValue("mm");
  });

  it("does not round a stored quantity while preparing its display magnitude", () => {
    render(
      <ModuleInputWorkspace
        view={view([fractionalLengthManualField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(screen.getByLabelText("Stroke")).toHaveValue(123.456789);
    expect(screen.getByLabelText("Stroke unit")).toHaveValue("mm");
  });

  it("renders a stored canonical temperature in its selected affine display unit", () => {
    render(
      <ModuleInputWorkspace
        view={view([temperatureManualField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(screen.getByLabelText("Ambient temperature")).toHaveValue(25);
    expect(screen.getByLabelText("Ambient temperature unit")).toHaveValue(
      "degC",
    );
  });

  it("submits every field through the single Save button", async () => {
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={view([quantityDefaultField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    await user.type(screen.getByLabelText("Payload mass"), "12");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(saveModuleInputsAction).toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders a hidden required flag mirroring the field's own required-ness", () => {
    // The single-form Save/Run model submits every rendered editable field
    // together (module workspace save/run redesign, 2026-08-27); the server
    // action needs to know per-field whether a blank submission is a real
    // required-field omission or an untouched optional field it should
    // silently skip (isSkippableBlankField in
    // app/(workspace)/workspace/parse-submitted-field.ts). This hidden input
    // is how that required-ness crosses the client/server boundary.
    const { container } = render(
      <ModuleInputWorkspace
        view={view([
          quantityDefaultField,
          { ...lengthManualField, portKey: "optional_stroke", required: false },
        ])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(
      container.querySelector('input[name="fields.payload_mass.required"]'),
    ).toHaveValue("true");
    expect(
      container.querySelector('input[name="fields.optional_stroke.required"]'),
    ).toHaveValue("false");
  });

  it("shows Save's error message near the header on failure", async () => {
    vi.mocked(saveModuleInputsAction).mockResolvedValueOnce({
      status: "error",
      message: "Enter a numeric value.",
    });
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={view([quantityDefaultField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    await user.type(screen.getByLabelText("Payload mass"), "12");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter a numeric value.",
    );
  });

  it("previews via Run without calling Save, and lifts the successful computation", async () => {
    const preview: ModulePreviewView = {
      outputs: [
        {
          portKey: "result",
          parameterId: "motion.axis.thrust_force",
          label: "Thrust force",
          value: { v: 1, kind: "quantity", value: 12, unit: "N" },
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
    vi.mocked(previewModuleComputationAction).mockResolvedValueOnce({
      status: "success",
      preview,
    });
    const onPreviewChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={view([lengthManualField])}
        onPreviewChange={onPreviewChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Run" }));

    expect(previewModuleComputationAction).toHaveBeenCalled();
    expect(saveModuleInputsAction).not.toHaveBeenCalled();
    expect(onPreviewChange).toHaveBeenCalledWith(preview);
  });

  it("shows Run's error message near the header on a failed preview", async () => {
    vi.mocked(previewModuleComputationAction).mockResolvedValueOnce({
      status: "error",
      message: 'Input "thrust_force_in" is linked to a stale upstream result.',
    });
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={view([lengthManualField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Run" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "stale upstream result",
    );
  });

  it("clears the lifted preview once Save succeeds", async () => {
    const onPreviewChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={view([lengthManualField])}
        onPreviewChange={onPreviewChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onPreviewChange).toHaveBeenCalledWith(null);
  });

  it("disables Run while a required field is incomplete, and names it in the tooltip", () => {
    render(
      <ModuleInputWorkspace
        view={view([quantityDefaultField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    const runButton = screen.getByRole("button", { name: "Run" });
    expect(runButton).toBeDisabled();
    expect(runButton.closest("span")).toHaveAttribute(
      "title",
      "Missing required input: Payload mass",
    );
  });

  it("enables Run once every required field is complete", async () => {
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={view([quantityDefaultField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    await user.type(screen.getByLabelText("Payload mass"), "12");

    expect(screen.getByRole("button", { name: "Run" })).not.toBeDisabled();
  });

  it("treats an already-saved required field as complete immediately, without typing", () => {
    render(
      <ModuleInputWorkspace
        view={view([lengthManualField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(screen.getByRole("button", { name: "Run" })).not.toBeDisabled();
  });

  it("treats a required linked field as satisfying Run regardless of its own link's run status", () => {
    render(
      <ModuleInputWorkspace
        view={view([{ ...linkedField, linkedSourceStatus: "not_run" }])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(screen.getByRole("button", { name: "Run" })).not.toBeDisabled();
  });

  it("shows a link suggestion behind the meatball menu and confirms it on request", async () => {
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={view([fieldWithSuggestion])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(
      screen.queryByText(
        "Use Payload mass 12 kg from Machine — Normal load case?",
      ),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Suggested source for Payload mass/ }),
    );

    expect(
      screen.getByText(
        "Use Payload mass 12 kg from Machine — Normal load case?",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View source" }));
    expect(screen.getByText("motion.axis.payload_mass")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(confirmSuggestedLinkAction).toHaveBeenCalled();
  });

  it("dismisses a suggestion, disabling (not removing) the meatball trigger once none remain, without calling the confirm action", async () => {
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={view([fieldWithSuggestion])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /Suggested source for Payload mass/ }),
    );
    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    const trigger = screen.getByRole("button", {
      name: "No remaining suggestions for Payload mass",
    });
    expect(trigger).toHaveAttribute("aria-disabled", "true");
    expect(confirmSuggestedLinkAction).not.toHaveBeenCalled();

    // aria-disabled alone is cosmetic (the trigger is deliberately never
    // given the native `disabled` attribute, to preserve Radix's focus
    // restoration) -- the real guard is the popover refusing to reopen.
    // Confirm that guard, not just the attribute meant to communicate it.
    await user.click(trigger);
    expect(screen.queryByText("View source")).not.toBeInTheDocument();
  });

  it("states the downstream stale-impact count before removing a confirmed link", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ModuleInputWorkspace
        view={view([linkedField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(screen.queryByText(/will mark/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove link" }));

    expect(
      screen.getByText("Removing this link will mark 2 other modules stale."),
    ).toBeInTheDocument();

    // Regression check (F-04): "Confirm removal" used to render inside its
    // own <form>, nested inside ModuleInputWorkspace's own outer Save/Run
    // <form> -- invalid HTML a real browser's parser reparents onto the
    // outer form before hydration, submitting Save instead of removing the
    // link. Only the one outer form should exist in the rendered tree.
    expect(container.querySelectorAll("form")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Confirm removal" }));
    expect(removeParameterLinkAction).toHaveBeenCalled();
  });

  it("warns when a linked field's module-output source has not been run yet", () => {
    const notRunField: ModuleInputFieldView = {
      ...linkedField,
      linkedSourceStatus: "not_run",
    };
    render(
      <ModuleInputWorkspace
        view={view([notRunField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(
      screen.getByText(
        "Source module has not been run yet — run it, then run this module again.",
      ),
    ).toBeInTheDocument();
  });

  it("warns when a linked field's module-output source's latest run is stale", () => {
    const staleField: ModuleInputFieldView = {
      ...linkedField,
      linkedSourceStatus: "stale",
    };
    render(
      <ModuleInputWorkspace
        view={view([staleField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(
      screen.getByText(
        "Source module's latest run is stale — re-run it, then run this module again.",
      ),
    ).toBeInTheDocument();
  });

  it("shows no source warning for a linked field whose source is ready", () => {
    const readyField: ModuleInputFieldView = {
      ...linkedField,
      linkedSourceStatus: "ready",
    };
    render(
      <ModuleInputWorkspace
        view={view([readyField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(
      screen.queryByText(/has not been run yet|latest run is stale/),
    ).not.toBeInTheDocument();
  });

  it("renders a stored axis-frame vector in its selected display unit, per component", () => {
    render(
      <ModuleInputWorkspace
        view={view([vectorManualField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(
      screen.getByLabelText("Center-of-mass offset X (travel direction)"),
    ).toHaveValue(50);
    expect(
      screen.getByLabelText("Center-of-mass offset Y (transverse)"),
    ).toHaveValue(0);
    expect(screen.getByLabelText("Center-of-mass offset Z")).toHaveValue(-20);
    expect(screen.getByLabelText("Center-of-mass offset unit")).toHaveValue(
      "mm",
    );

    expect(screen.getByText("X")).toBeInTheDocument();
    expect(screen.getByText("Y")).toBeInTheDocument();
    expect(screen.getByText("Z")).toBeInTheDocument();
  });

  it("renders empty component inputs for a vector field with no current value", () => {
    render(
      <ModuleInputWorkspace
        view={view([vectorDefaultField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(
      screen.getByLabelText("External process force X (travel direction)"),
    ).toHaveValue(null);
    expect(
      screen.getByLabelText("External process force Y (transverse)"),
    ).toHaveValue(null);
    expect(screen.getByLabelText("External process force Z")).toHaveValue(null);
  });

  it("submits a vector field's three components and the shared unit", async () => {
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={view([vectorManualField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(saveModuleInputsAction).toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not submit a required vector field while a component is left blank (native validation)", async () => {
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={view([vectorDefaultField, lengthManualField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    await user.type(
      screen.getByLabelText("External process force X (travel direction)"),
      "10",
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(saveModuleInputsAction).not.toHaveBeenCalled();
  });

  it("keeps Run disabled while a required vector field has an incomplete component", async () => {
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={view([vectorDefaultField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    await user.type(
      screen.getByLabelText("External process force X (travel direction)"),
      "10",
    );
    await user.type(
      screen.getByLabelText("External process force Y (transverse)"),
      "20",
    );
    expect(screen.getByRole("button", { name: "Run" })).toBeDisabled();

    await user.type(screen.getByLabelText("External process force Z"), "30");
    expect(screen.getByRole("button", { name: "Run" })).not.toBeDisabled();
  });

  it("renders a disabled field's control non-interactive and omits its link-suggestion menu, without blocking the header's Save/Run", () => {
    render(
      <ModuleInputWorkspace
        view={view([disabledFieldWithSuggestion])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(screen.getByRole("spinbutton")).toBeDisabled();
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /Suggested source/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run" })).not.toBeDisabled();
  });

  it("renders a non-disabled field's control interactive", () => {
    render(
      <ModuleInputWorkspace
        view={view([enumManualField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(screen.getByRole("combobox")).not.toBeDisabled();
  });

  it("renders the bento grid when the module declares belt-pulley's exact four group ids, including a reserved motion-profile-chart placeholder", () => {
    const bentoView: ModuleWorkspaceView = {
      moduleInstance: {
        id: "m1" as never,
        assemblyId: "a1" as never,
        configurationId: "c1" as never,
        label: "Belt drive",
        modulePackageId: "belt-pulley-drive-motor-sizing",
        moduleVersion: "0.3.1",
        category: "motor-sizing.belt-pulley-drive",
        lastRunStatus: "pass",
      },
      groups: [
        {
          id: "geometry-and-environment",
          title: "Geometry and environment",
          fields: [quantityDefaultField],
        },
        {
          id: "pulleys-and-belt",
          title: "Pulleys, belt, and drive",
          fields: [lengthManualField],
        },
        { id: "motion", title: "Motion cycle", fields: [enumManualField] },
        {
          id: "motor-and-safety-factors",
          title: "Candidate motor and safety factors",
          fields: [booleanWorkflowField],
        },
      ],
    };

    render(
      <ModuleInputWorkspace
        view={bentoView}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Geometry and environment" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Pulleys, belt, and drive" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Motion cycle" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Candidate motor and safety factors",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Motion profile chart")).toBeInTheDocument();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });

  it("falls back to the plain stacked layout when a module's groups don't match belt-pulley's exact four ids", () => {
    render(
      <ModuleInputWorkspace
        view={view([quantityDefaultField, enumManualField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(screen.queryByText("Motion profile chart")).not.toBeInTheDocument();
  });
});
