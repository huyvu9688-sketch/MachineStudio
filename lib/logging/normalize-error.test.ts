import { describe, expect, it } from "vitest";
import { normalizeError } from "./normalize-error";

describe("normalizeError", () => {
  it("extracts name, message, and stack from a real Error", () => {
    const error = new TypeError("boom");
    const normalized = normalizeError(error);

    expect(normalized).toMatchObject({ name: "TypeError", message: "boom" });
    expect(typeof normalized.stack).toBe("string");
  });

  it("wraps a non-Error thrown value instead of dropping it", () => {
    expect(normalizeError("plain string")).toEqual({ value: "plain string" });
    expect(normalizeError(42)).toEqual({ value: 42 });
    expect(normalizeError(null)).toEqual({ value: null });
  });
});
