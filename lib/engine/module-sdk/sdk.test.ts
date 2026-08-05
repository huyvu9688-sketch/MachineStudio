import { describe, expect, it } from "vitest";
import {
  ENGINE_SDK_VERSION,
  compareSemver,
  isSdkCompatible,
  isValidSdkRange,
  isValidSemver,
  parseSemver,
} from "./sdk";

describe("semver parsing and comparison", () => {
  it("parses well-formed versions and rejects malformed ones", () => {
    expect(parseSemver("1.2.3")).toEqual([1, 2, 3]);
    expect(parseSemver("1.2")).toBeUndefined();
    expect(parseSemver("1.2.x")).toBeUndefined();
    expect(parseSemver("v1.2.3")).toBeUndefined();
    expect(isValidSemver("0.0.0")).toBe(true);
    expect(isValidSemver("1.2.3.4")).toBe(false);
  });

  it("orders versions by major, minor, then patch", () => {
    expect(compareSemver("1.0.0", "1.0.0")).toBe(0);
    expect(compareSemver("1.0.0", "1.0.1")).toBe(-1);
    expect(compareSemver("1.2.0", "1.1.9")).toBe(1);
    expect(compareSemver("2.0.0", "1.9.9")).toBe(1);
    expect(() => compareSemver("1.0", "1.0.0")).toThrow(RangeError);
  });
});

describe("SDK range validity", () => {
  it("accepts an open-ended and a bounded range", () => {
    expect(isValidSdkRange({ min: "1.0.0" })).toBe(true);
    expect(isValidSdkRange({ min: "1.0.0", maxExclusive: "2.0.0" })).toBe(true);
  });

  it("rejects a malformed or inverted range", () => {
    expect(isValidSdkRange({ min: "abc" })).toBe(false);
    expect(isValidSdkRange({ min: "2.0.0", maxExclusive: "1.0.0" })).toBe(
      false,
    );
    expect(isValidSdkRange({ min: "1.0.0", maxExclusive: "1.0.0" })).toBe(
      false,
    );
  });
});

describe("SDK compatibility", () => {
  it("the current engine version satisfies an open range at its own version", () => {
    expect(isSdkCompatible({ min: ENGINE_SDK_VERSION })).toBe(true);
  });

  it("includes min and excludes maxExclusive", () => {
    expect(isSdkCompatible({ min: "1.0.0" }, "1.0.0")).toBe(true);
    expect(isSdkCompatible({ min: "1.0.0" }, "0.9.9")).toBe(false);
    expect(
      isSdkCompatible({ min: "1.0.0", maxExclusive: "2.0.0" }, "1.5.0"),
    ).toBe(true);
    expect(
      isSdkCompatible({ min: "1.0.0", maxExclusive: "2.0.0" }, "2.0.0"),
    ).toBe(false);
  });

  it("a malformed range is never compatible", () => {
    expect(isSdkCompatible({ min: "nope" }, "1.0.0")).toBe(false);
  });
});
