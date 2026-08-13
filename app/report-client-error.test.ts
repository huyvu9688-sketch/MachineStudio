import { afterEach, describe, expect, it, vi } from "vitest";
import { reportClientErrorAction } from "./report-client-error";

describe("reportClientErrorAction", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the client error through the structured server logger", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await reportClientErrorAction({
      message: "boom",
      stack: "Error: boom\n  at x",
      digest: "abc123",
      url: "https://example.com/workspace",
    });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [line] = errorSpy.mock.calls[0] as [string];
    const entry = JSON.parse(line) as Record<string, unknown>;
    expect(entry).toMatchObject({
      level: "error",
      message: "Unhandled client error",
      context: {
        source: "client",
        message: "boom",
        stack: "Error: boom\n  at x",
        digest: "abc123",
        url: "https://example.com/workspace",
      },
    });
  });
});
