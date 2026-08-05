// Deterministic content fingerprint for the parameter registry (Unit 1.3
// "Registry version and content hash"). This is a non-cryptographic hash used to
// detect drift: any change to released parameter content changes the hash, so a
// pinned fixture catches accidental edits to what is meant to be immutable
// (context/architecture.md; context/code-standards.md "Canonical Parameters").
//
// It is intentionally pure and dependency-free (no node:crypto, no BigInt) so
// the parameters package stays importable in any runtime, server or browser.

/**
 * Produces a stable JSON string for `value` with object keys sorted
 * recursively, so two structurally equal values always stringify identically
 * regardless of key insertion order. Array order is preserved (it is meaningful
 * for ordered fields such as display units).
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const entries = keys
    .filter((key) => record[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
  return `{${entries.join(",")}}`;
}

// FNV-1a over the UTF-8 bytes of the input, run twice with distinct offset
// bases and combined into a 16-hex-character digest. Uses Math.imul for 32-bit
// integer multiplication so it is exact and portable without BigInt.
const FNV_PRIME = 0x01000193;
const FNV_OFFSET_A = 0x811c9dc5;
const FNV_OFFSET_B = 0x1000193b;

function fnv1a(bytes: Uint8Array, offset: number): number {
  let hash = offset >>> 0;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
}

function toHex8(value: number): string {
  return (value >>> 0).toString(16).padStart(8, "0");
}

/**
 * A 16-character hexadecimal content fingerprint of `text`. Deterministic and
 * stable across runtimes; not a security hash.
 */
export function contentHash(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return (
    toHex8(fnv1a(bytes, FNV_OFFSET_A)) + toHex8(fnv1a(bytes, FNV_OFFSET_B))
  );
}
