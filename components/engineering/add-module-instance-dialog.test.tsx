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
});
