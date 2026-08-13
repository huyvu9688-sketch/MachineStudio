// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GlobalError from "./global-error";

const { mockReportClientErrorAction } = vi.hoisted(() => ({
  mockReportClientErrorAction: vi.fn(),
}));

vi.mock("@/app/report-client-error", () => ({
  reportClientErrorAction: mockReportClientErrorAction,
}));

describe("GlobalError", () => {
  it("reports the caught error for server-side visibility", () => {
    mockReportClientErrorAction.mockResolvedValue(undefined);
    const error = Object.assign(new Error("root boom"), { digest: "xyz" });

    render(<GlobalError error={error} reset={() => {}} />);

    expect(mockReportClientErrorAction).toHaveBeenCalledWith(
      expect.objectContaining({ message: "root boom", digest: "xyz" }),
    );
  });

  it("calls reset when Try again is clicked", async () => {
    mockReportClientErrorAction.mockResolvedValue(undefined);
    const reset = vi.fn();
    const user = userEvent.setup();

    render(<GlobalError error={new Error("boom")} reset={reset} />);
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(reset).toHaveBeenCalled();
  });
});
