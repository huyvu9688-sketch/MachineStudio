// @vitest-environment jsdom
import { describe, expect, vi, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountSettingsDialog } from "./account-settings-dialog";

vi.mock("@/app/(workspace)/workspace/actions", () => ({
  deleteAccountAction: vi.fn(),
}));

const TRIGGER_LABEL = "Open account settings";

describe("AccountSettingsDialog", () => {
  it("links the export button to the account export route", async () => {
    const user = userEvent.setup();
    render(
      <AccountSettingsDialog
        trigger={<button type="button">{TRIGGER_LABEL}</button>}
      />,
    );
    await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));

    expect(
      screen.getByRole("link", { name: "Download account data" }),
    ).toHaveAttribute("href", "/workspace/account/export");
  });

  it("keeps the delete button disabled until the exact confirmation phrase is typed", async () => {
    const user = userEvent.setup();
    render(
      <AccountSettingsDialog
        trigger={<button type="button">{TRIGGER_LABEL}</button>}
      />,
    );
    await user.click(screen.getByRole("button", { name: TRIGGER_LABEL }));

    const deleteButton = screen.getByRole("button", {
      name: "Delete my account",
    });
    const confirmationInput = screen.getByLabelText(
      'Type "DELETE MY ACCOUNT" to confirm',
    );

    expect(deleteButton).toBeDisabled();

    await user.type(confirmationInput, "delete my account");
    expect(deleteButton).toBeDisabled();

    await user.clear(confirmationInput);
    await user.type(confirmationInput, "DELETE MY ACCOUNT");
    expect(deleteButton).toBeEnabled();
  });
});
