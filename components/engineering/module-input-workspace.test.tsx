// @vitest-environment jsdom
import { describe, expect, vi, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModuleInputWorkspace } from "./module-input-workspace";
import {
  confirmSuggestedLinkAction,
  removeParameterLinkAction,
  setModuleInputValueAction,
} from "@/app/(workspace)/workspace/actions";
import type {
  LinkSuggestionSourceView,
  ModuleInputFieldView,
  ModuleWorkspaceView,
} from "@/lib/application";

// module-input-workspace.tsx (and the link-suggestion-panel.tsx it renders)
// import these Server Actions directly (inline forms, unlike the dialogs) —
// mocked for the same reason every other component test in this directory
// mocks the "use server" file (see app-bar.test.tsx).
vi.mock("@/app/(workspace)/workspace/actions", () => ({
  setModuleInputValueAction: vi.fn(),
  confirmSuggestedLinkAction: vi.fn(),
  removeParameterLinkAction: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(setModuleInputValueAction).mockReset();
  vi.mocked(setModuleInputValueAction).mockResolvedValue({ status: "success" });
  vi.mocked(confirmSuggestedLinkAction).mockReset();
  vi.mocked(confirmSuggestedLinkAction).mockResolvedValue({ status: "success" });
  vi.mocked(removeParameterLinkAction).mockReset();
  vi.mocked(removeParameterLinkAction).mockResolvedValue({ status: "success" });
});

const quantityDefaultField: ModuleInputFieldView = {
  portKey: "payload_mass",
  parameterId: "motion.axis.payload_mass",
  label: "Payload mass",
  help: "Total moving mass carried by the axis.",
  required: true,
  loadCase: null,
  field: { kind: "quantity", canonicalUnit: "kg", displayUnits: ["kg", "g", "lbm"] },
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
    value: { v: 1, kind: "quantity", value: 298.15, unit: "K", displayUnit: "degC" },
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
  field: { kind: "enum", enumId: "axis_orientation", options: ["horizontal", "vertical", "inclined"] },
  resolved: {
    source: "manual",
    value: { v: 1, kind: "enum", enumId: "axis_orientation", value: "vertical" },
  },
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
  resolved: { source: "workflow", value: { v: 1, kind: "boolean", value: true } },
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
  field: { kind: "quantity", canonicalUnit: "N", displayUnits: ["N", "kN", "lbf"] },
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
      />,
    );

    expect(screen.getByRole("heading", { name: "Thrust check" })).toBeInTheDocument();
    expect(screen.getByText("example-scaffold@0.1.0")).toBeInTheDocument();
    expect(screen.getByText("Inputs")).toBeInTheDocument();

    // Quantity: label, help text, unit selector, "Default" source badge.
    // (Both the quantity field and the unsupported field resolve to
    // "default" here, so two badges are expected.)
    expect(screen.getByLabelText("Payload mass")).toBeInTheDocument();
    expect(screen.getByText("Total moving mass carried by the axis.")).toBeInTheDocument();
    expect(screen.getByLabelText("Payload mass unit")).toBeInTheDocument();
    expect(screen.getAllByText("Default")).toHaveLength(2);

    // Enum: pre-selected current value, "Manual" badge, load-case chip.
    expect(screen.getByLabelText("Axis orientation")).toHaveValue("vertical");
    expect(screen.getByText("Manual")).toBeInTheDocument();
    expect(screen.getByText("Normal load case")).toBeInTheDocument();

    // Boolean: pre-checked from a workflow-provided value, "Workflow" badge.
    expect(screen.getByLabelText("Holding brake present")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.getByText("Workflow")).toBeInTheDocument();

    // Linked: read-only notice instead of an editable control, "Linked" badge.
    expect(screen.getByText("Linked")).toBeInTheDocument();
    expect(screen.getByText(/Linked from a module output/)).toBeInTheDocument();

    // Unsupported (vector_quantity, non-axis frame): honest deferral notice, not a crash or invented editor.
    expect(
      screen.getByText(/Editing vector quantity values is not supported yet/),
    ).toBeInTheDocument();
  });

  it("renders a structurally different module (different port/parameter/unit) through the same component", () => {
    const relayField: ModuleInputFieldView = {
      portKey: "thrust_force_in",
      parameterId: "motion.axis.thrust_force",
      label: "Thrust force",
      help: null,
      required: true,
      loadCase: null,
      field: { kind: "quantity", canonicalUnit: "N", displayUnits: ["N", "kN", "lbf"] },
      resolved: { source: "default" },
      suggestions: [],
      linkRemovalImpact: null,
    };

    render(<ModuleInputWorkspace view={view([relayField])} />);

    expect(screen.getByLabelText("Thrust force")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "N" })).toBeInTheDocument();
  });
  it("renders a stored canonical length in its selected display unit", () => {
    render(<ModuleInputWorkspace view={view([lengthManualField])} />);

    expect(screen.getByLabelText("Stroke")).toHaveValue(500);
    expect(screen.getByLabelText("Stroke unit")).toHaveValue("mm");
  });

  it("does not round a stored quantity while preparing its display magnitude", () => {
    render(<ModuleInputWorkspace view={view([fractionalLengthManualField])} />);

    expect(screen.getByLabelText("Stroke")).toHaveValue(123.456789);
    expect(screen.getByLabelText("Stroke unit")).toHaveValue("mm");
  });

  it("renders a stored canonical temperature in its selected affine display unit", () => {
    render(<ModuleInputWorkspace view={view([temperatureManualField])} />);

    expect(screen.getByLabelText("Ambient temperature")).toHaveValue(25);
    expect(screen.getByLabelText("Ambient temperature unit")).toHaveValue("degC");
  });

  it("submits a quantity field's manual value and clears the field-level error on success", async () => {
    const user = userEvent.setup();
    render(<ModuleInputWorkspace view={view([quantityDefaultField])} />);

    await user.type(screen.getByLabelText("Payload mass"), "12");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(setModuleInputValueAction).toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the action's error message beside the field on failure", async () => {
    vi.mocked(setModuleInputValueAction).mockResolvedValueOnce({
      status: "error",
      message: "Enter a numeric value.",
    });
    const user = userEvent.setup();
    render(<ModuleInputWorkspace view={view([quantityDefaultField])} />);

    await user.type(screen.getByLabelText("Payload mass"), "12");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a numeric value.");
  });

  it("shows a link suggestion (parameter, value, origin, load case) and confirms it on request", async () => {
    const user = userEvent.setup();
    render(<ModuleInputWorkspace view={view([fieldWithSuggestion])} />);

    expect(
      screen.getByText("Use Payload mass 12 kg from Machine — Normal load case?"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View source" }));
    expect(screen.getByText("motion.axis.payload_mass")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(confirmSuggestedLinkAction).toHaveBeenCalled();
  });

  it("dismisses a suggestion without calling the confirm action", async () => {
    const user = userEvent.setup();
    render(<ModuleInputWorkspace view={view([fieldWithSuggestion])} />);

    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByText("Suggested source")).not.toBeInTheDocument();
    expect(confirmSuggestedLinkAction).not.toHaveBeenCalled();
  });

  it("states the downstream stale-impact count before removing a confirmed link", async () => {
    const user = userEvent.setup();
    render(<ModuleInputWorkspace view={view([linkedField])} />);

    expect(screen.queryByText(/will mark/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove link" }));

    expect(
      screen.getByText("Removing this link will mark 2 other modules stale."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm removal" }));
    expect(removeParameterLinkAction).toHaveBeenCalled();
  });

  it("renders a stored axis-frame vector in its selected display unit, per component", () => {
    render(<ModuleInputWorkspace view={view([vectorManualField])} />);

    expect(screen.getByLabelText("Center-of-mass offset X (travel direction)")).toHaveValue(50);
    expect(screen.getByLabelText("Center-of-mass offset Y (transverse)")).toHaveValue(0);
    expect(screen.getByLabelText("Center-of-mass offset Z")).toHaveValue(-20);
    expect(screen.getByLabelText("Center-of-mass offset unit")).toHaveValue("mm");

    // Short visible captions ("X"/"Y"/"Z") for sighted users, distinct from
    // the full aria-label text screen readers get — a persistent caption,
    // not a placeholder that vanishes once a value is entered.
    expect(screen.getByText("X")).toBeInTheDocument();
    expect(screen.getByText("Y")).toBeInTheDocument();
    expect(screen.getByText("Z")).toBeInTheDocument();
  });

  it("renders empty component inputs for a vector field with no current value", () => {
    render(<ModuleInputWorkspace view={view([vectorDefaultField])} />);

    expect(screen.getByLabelText("External process force X (travel direction)")).toHaveValue(
      null,
    );
    expect(screen.getByLabelText("External process force Y (transverse)")).toHaveValue(null);
    expect(screen.getByLabelText("External process force Z")).toHaveValue(null);
  });

  it("submits a vector field's three components and the shared unit", async () => {
    const user = userEvent.setup();
    render(<ModuleInputWorkspace view={view([vectorManualField])} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(setModuleInputValueAction).toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not submit a required vector field while a component is left blank (native validation)", async () => {
    const user = userEvent.setup();
    render(<ModuleInputWorkspace view={view([vectorDefaultField])} />);

    await user.type(
      screen.getByLabelText("External process force X (travel direction)"),
      "10",
    );
    // Y and Z stay blank; the field is required, so the browser blocks
    // submission before the Server Action is ever called.
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(setModuleInputValueAction).not.toHaveBeenCalled();
  });
});
