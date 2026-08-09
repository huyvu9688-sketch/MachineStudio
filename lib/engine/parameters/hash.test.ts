import { describe, expect, it } from "vitest";
import { contentHash, stableStringify } from "./hash";
import { PARAMETER_REGISTRY, PARAMETER_REGISTRY_HASH } from "./registered";

// Pinned content fixture: any change to a released parameter changes this hash.
// If this fails after an intentional, reviewed registry change, update the value
// AND bump PARAMETER_REGISTRY_VERSION.
const EXPECTED_REGISTRY_HASH = "6aab387e771908f4";

describe("contentHash", () => {
  it("is deterministic for the same input", () => {
    expect(contentHash("hello")).toBe(contentHash("hello"));
  });

  it("is a 16-character hex string", () => {
    expect(contentHash("anything")).toMatch(/^[0-9a-f]{16}$/);
  });

  it("differs for different inputs", () => {
    expect(contentHash("a")).not.toBe(contentHash("b"));
  });
});

describe("stableStringify", () => {
  it("is independent of object key insertion order", () => {
    expect(stableStringify({ a: 1, b: 2 })).toBe(
      stableStringify({ b: 2, a: 1 }),
    );
  });

  it("preserves array order", () => {
    expect(stableStringify([1, 2])).not.toBe(stableStringify([2, 1]));
  });

  it("omits undefined-valued keys", () => {
    expect(stableStringify({ a: 1, b: undefined })).toBe(
      stableStringify({ a: 1 }),
    );
  });
});

describe("released registry hash", () => {
  it("exposes a 16-character hex fingerprint", () => {
    expect(PARAMETER_REGISTRY_HASH).toMatch(/^[0-9a-f]{16}$/);
    expect(PARAMETER_REGISTRY.hash).toBe(PARAMETER_REGISTRY_HASH);
  });

  it("recomputes from the sorted definition list", () => {
    const recomputed = contentHash(stableStringify(PARAMETER_REGISTRY.list()));
    expect(recomputed).toBe(PARAMETER_REGISTRY_HASH);
  });

  it("matches the pinned content fixture", () => {
    expect(PARAMETER_REGISTRY_HASH).toBe(EXPECTED_REGISTRY_HASH);
  });
});
