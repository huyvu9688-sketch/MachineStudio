// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WorkspaceError from "./error";

const { mockReportClientErrorAction } = vi.hoisted(() => ({
  mockReportClientErrorAction: vi.fn(),
}));

vi.mock("@/app/report-client-error", () => ({
  reportClientErrorAction: mockReportClientErrorAction,
}));

describe("WorkspaceError", () => {
  it("reports the caught error's message, stack, and digest for server-side visibility", async () => {
    mockReportClientErrorAction.mockResolvedValue(undefined);
    const error = Object.assign(new Error("boom"), { digest: "abc123" });

    render(<WorkspaceError error={error} reset={() => {}} />);

    expect(mockReportClientErrorAction).toHaveBeenCalledWith(
      expect.objectContaining({ message: "boom", digest: "abc123" }),
    );
  });

  it("calls reset when Try again is clicked", async () => {
    mockReportClientErrorAction.mockResolvedValue(undefined);
    const reset = vi.fn();
    const user = userEvent.setup();

    render(<WorkspaceError error={new Error("boom")} reset={reset} />);
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(reset).toHaveBeenCalled();
  });

  it("does not throw when the report action itself rejects", async () => {
    mockReportClientErrorAction.mockRejectedValue(new Error("network down"));

    expect(() =>
      render(<WorkspaceError error={new Error("boom")} reset={() => {}} />),
    ).not.toThrow();
  });
});
