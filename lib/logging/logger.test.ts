import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

function lastLoggedEntry(
  spy: ReturnType<typeof vi.spyOn>,
): Record<string, unknown> {
  const [line] = spy.mock.calls.at(-1) as [string];
  return JSON.parse(line) as Record<string, unknown>;
}

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits one JSON line per level, on the matching console method", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.info("info message");
    logger.warn("warn message");
    logger.error("error message");

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);

    expect(lastLoggedEntry(infoSpy)).toMatchObject({
      level: "info",
      message: "info message",
    });
    expect(lastLoggedEntry(warnSpy)).toMatchObject({
      level: "warn",
      message: "warn message",
    });
    expect(lastLoggedEntry(errorSpy)).toMatchObject({
      level: "error",
      message: "error message",
    });
  });

  it("stamps a valid ISO 8601 timestamp on every entry", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    logger.info("timestamped");

    const entry = lastLoggedEntry(infoSpy);
    expect(typeof entry.timestamp).toBe("string");
    expect(new Date(entry.timestamp as string).toISOString()).toBe(
      entry.timestamp,
    );
  });

  it("includes context when given, and omits the field entirely when not", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    logger.info("with context", { userId: "user_123", route: "/workspace" });
    expect(lastLoggedEntry(infoSpy)).toMatchObject({
      context: { userId: "user_123", route: "/workspace" },
    });

    logger.info("without context");
    expect(lastLoggedEntry(infoSpy)).not.toHaveProperty("context");
  });
});
