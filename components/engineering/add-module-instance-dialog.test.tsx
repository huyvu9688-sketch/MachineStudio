// @vitest-environment jsdom
import { describe, expect, vi, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AddModuleInstanceDialog,
  type ModulePackageOption,
} from "./add-module-instance-dialog";
import { addModuleInstanceAction } from "@/app/(workspace)/workspace/actions";

vi.mock("@/app/(workspace)/workspace/actions", () => ({
  addModuleInstanceAction: vi.fn(),
}));

const MODULE_PACKAGES: ModulePackageOption[] = [
  {
    modulePackageId: "example-scaffold",
    moduleVersion: "0.1.0",
    category: "example",
  },
];

// Distinct from the dialog's own "Add module" submit button, which would
// otherwise collide with this trigger by accessible name once the dialog
// is open.
const TRIGGER_LABEL = "Open add-module dialog";

describe("AddModuleInstanceDialog", () => {
  it("lists every registered module package as a selectable option", async () => {
    const user = userEvent.setup();
    render(
      <AddModuleInstanceDialog
        assemblyId="a1"
        configurationId="c1"
        modulePackages={MODULE_PACKAGES}
        trigger={<button type="button">{TRIGGER_LABEL}</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));

    expect(
      screen.getByRole("option", { name: "example-scaffold@0.1.0 (example)" }),
    ).toBeInTheDocument();
  });

  it("disables submission when no module packages are registered", async () => {
    const user = userEvent.setup();
    render(
      <AddModuleInstanceDialog
        assemblyId="a1"
        configurationId="c1"
        modulePackages={[]}
        trigger={<button type="button">{TRIGGER_LABEL}</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));

    expect(screen.getByText("No modules registered yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add module" })).toBeDisabled();
  });

  it("does not render the workflow picker when the configuration has no workflow instances", async () => {
    const user = userEvent.setup();
    render(
      <AddModuleInstanceDialog
        assemblyId="a1"
        configurationId="c1"
        modulePackages={MODULE_PACKAGES}
        trigger={<button type="button">{TRIGGER_LABEL}</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));

    expect(
      screen.queryByLabelText("Attach to workflow (optional)"),
    ).not.toBeInTheDocument();
  });

  it("offers an optional workflow-attach picker and submits the selected workflowInstanceId (Unit 4.9)", async () => {
    vi.mocked(addModuleInstanceAction).mockResolvedValue({ status: "success" });
    const user = userEvent.setup();
    render(
      <AddModuleInstanceDialog
        assemblyId="a1"
        configurationId="c1"
        modulePackages={MODULE_PACKAGES}
        workflowInstances={[
          { id: "wf1", workflowId: "linear-axis", workflowVersion: "1.0.0" },
        ]}
        trigger={<button type="button">{TRIGGER_LABEL}</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));
    await user.selectOptions(
      screen.getByLabelText("Module package"),
      "example-scaffold@0.1.0",
    );
    await user.type(screen.getByLabelText("Instance label"), "Thrust check");
    await user.selectOptions(
      screen.getByLabelText("Attach to workflow (optional)"),
      "wf1",
    );
    await user.click(screen.getByRole("button", { name: "Add module" }));

    expect(addModuleInstanceAction).toHaveBeenCalled();
    const formData = vi.mocked(addModuleInstanceAction).mock
      .calls[0]?.[1] as FormData;
    expect(formData.get("workflowInstanceId")).toBe("wf1");
  });

  it("gains a Motor Sizing Tools category step when both a motor-sizing and a non-motor-sizing module are registered (ADR-0011)", async () => {
    const user = userEvent.setup();
    const packages: ModulePackageOption[] = [
      ...MODULE_PACKAGES,
      {
        modulePackageId: "ball-screw-motor-sizing",
        moduleVersion: "0.1.0",
        category: "motor-sizing.ball-screw",
      },
      {
        modulePackageId: "rack-pinion-motor-sizing",
        moduleVersion: "0.1.0",
        category: "motor-sizing.rack-pinion",
      },
    ];
    render(
      <AddModuleInstanceDialog
        assemblyId="a1"
        configurationId="c1"
        modulePackages={packages}
        trigger={<button type="button">{TRIGGER_LABEL}</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));

    // Defaults to the Motor Sizing Tools mechanism picker, with friendly
    // mechanism names, not raw category ids.
    expect(screen.getByLabelText("Mechanism")).toBeInTheDocument();
    expect(
      screen.getByRole("option", {
        name: "Ball Screw (ball-screw-motor-sizing@0.1.0)",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", {
        name: "Rack & Pinion (rack-pinion-motor-sizing@0.1.0)",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", {
        name: "example-scaffold@0.1.0 (example)",
      }),
    ).not.toBeInTheDocument();

    // Switching to "Other modules" swaps in the original flat picker.
    await user.click(screen.getByRole("button", { name: "Other modules" }));

    expect(screen.getByLabelText("Module package")).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "example-scaffold@0.1.0 (example)" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", {
        name: "Ball Screw (ball-screw-motor-sizing@0.1.0)",
      }),
    ).not.toBeInTheDocument();
  });

  it("skips the category step and labels the picker Mechanism when every registered module is motor-sizing", async () => {
    const user = userEvent.setup();
    const packages: ModulePackageOption[] = [
      {
        modulePackageId: "index-table-motor-sizing",
        moduleVersion: "0.1.0",
        category: "motor-sizing.index-table",
      },
    ];
    render(
      <AddModuleInstanceDialog
        assemblyId="a1"
        configurationId="c1"
        modulePackages={packages}
        trigger={<button type="button">{TRIGGER_LABEL}</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));

    expect(
      screen.queryByRole("button", { name: "Motor Sizing Tools" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Mechanism")).toBeInTheDocument();
  });

  it("submits the selected mechanism's modulePackageKey from the mechanism picker", async () => {
    vi.mocked(addModuleInstanceAction).mockResolvedValue({ status: "success" });
    const user = userEvent.setup();
    const packages: ModulePackageOption[] = [
      ...MODULE_PACKAGES,
      {
        modulePackageId: "ball-screw-motor-sizing",
        moduleVersion: "0.1.0",
        category: "motor-sizing.ball-screw",
      },
    ];
    render(
      <AddModuleInstanceDialog
        assemblyId="a1"
        configurationId="c1"
        modulePackages={packages}
        trigger={<button type="button">{TRIGGER_LABEL}</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));
    await user.selectOptions(
      screen.getByLabelText("Mechanism"),
      "ball-screw-motor-sizing@0.1.0",
    );
    await user.type(screen.getByLabelText("Instance label"), "Motor sizing");
    await user.click(screen.getByRole("button", { name: "Add module" }));

    expect(addModuleInstanceAction).toHaveBeenCalled();
    // Index from the end, not `.mock.calls[0]` — the mocked action is shared
    // across every test in this file, and an earlier test's own submission
    // (the workflow-attach test above) already occupies call index 0.
    const formData = vi
      .mocked(addModuleInstanceAction)
      .mock.calls.at(-1)?.[1] as FormData;
    expect(formData.get("modulePackageKey")).toBe(
      "ball-screw-motor-sizing@0.1.0",
    );
  });

  it("shows the action's error message inline on failure", async () => {
    vi.mocked(addModuleInstanceAction).mockResolvedValue({
      status: "error",
      message: 'Module package "bad@1.0.0" is not registered.',
    });
    const user = userEvent.setup();
    render(
      <AddModuleInstanceDialog
        assemblyId="a1"
        configurationId="c1"
        modulePackages={MODULE_PACKAGES}
        trigger={<button type="button">{TRIGGER_LABEL}</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));
    await user.selectOptions(
      screen.getByLabelText("Module package"),
      "example-scaffold@0.1.0",
    );
    await user.type(screen.getByLabelText("Instance label"), "Thrust check");
    await user.click(screen.getByRole("button", { name: "Add module" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      'Module package "bad@1.0.0" is not registered.',
    );
  });

  it("prefills the instance label with the friendly mechanism name on selection", async () => {
    const user = userEvent.setup();
    const packages: ModulePackageOption[] = [
      {
        modulePackageId: "belt-pulley-drive-motor-sizing",
        moduleVersion: "0.1.0",
        category: "motor-sizing.belt-pulley-drive",
      },
    ];
    render(
      <AddModuleInstanceDialog
        assemblyId="a1"
        configurationId="c1"
        modulePackages={packages}
        trigger={<button type="button">{TRIGGER_LABEL}</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));
    await user.selectOptions(
      screen.getByLabelText("Mechanism"),
      "belt-pulley-drive-motor-sizing@0.1.0",
    );

    expect(screen.getByLabelText("Instance label")).toHaveValue(
      "Belt & Pulley Drive",
    );
  });

  it("does not overwrite a label the founder already typed", async () => {
    const user = userEvent.setup();
    const packages: ModulePackageOption[] = [
      {
        modulePackageId: "belt-pulley-drive-motor-sizing",
        moduleVersion: "0.1.0",
        category: "motor-sizing.belt-pulley-drive",
      },
      {
        modulePackageId: "index-table-motor-sizing",
        moduleVersion: "0.1.0",
        category: "motor-sizing.index-table",
      },
    ];
    render(
      <AddModuleInstanceDialog
        assemblyId="a1"
        configurationId="c1"
        modulePackages={packages}
        trigger={<button type="button">{TRIGGER_LABEL}</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));
    await user.selectOptions(
      screen.getByLabelText("Mechanism"),
      "belt-pulley-drive-motor-sizing@0.1.0",
    );
    await user.clear(screen.getByLabelText("Instance label"));
    await user.type(screen.getByLabelText("Instance label"), "X-axis drive");
    await user.selectOptions(
      screen.getByLabelText("Mechanism"),
      "index-table-motor-sizing@0.1.0",
    );

    expect(screen.getByLabelText("Instance label")).toHaveValue("X-axis drive");
  });
});
