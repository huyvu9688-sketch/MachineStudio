// Serialization boundary for engineering values. Persisted values are stored
// as JSONB and must serialize/deserialize without semantic loss, validated on
// both write and read (context/code-standards.md).

import type { z } from "zod";
import { EngineeringValueSchema } from "./schemas";
import type { EngineeringValue } from "./types";

/**
 * Validates an unknown, untrusted value (e.g. a JSONB read or an API body) as
 * an {@link EngineeringValue}, throwing a `ZodError` on failure. Never trust a
 * stored payload just because the application originally wrote it.
 */
export function parseEngineeringValue(input: unknown): EngineeringValue {
  return EngineeringValueSchema.parse(input);
}

/**
 * Non-throwing variant of {@link parseEngineeringValue}, returning Zod's
 * discriminated success/error result for callers that handle invalid stored
 * data explicitly.
 */
export function safeParseEngineeringValue(
  input: unknown,
): z.ZodSafeParseResult<EngineeringValue> {
  return EngineeringValueSchema.safeParse(input);
}

/**
 * Serializes an {@link EngineeringValue} to a canonical JSON string. The value
 * is assumed already valid (it is a typed `EngineeringValue`); round-tripping
 * through {@link deserializeEngineeringValue} re-validates it.
 */
export function serializeEngineeringValue(value: EngineeringValue): string {
  return JSON.stringify(value);
}

/**
 * Parses a JSON string produced by {@link serializeEngineeringValue} back into
 * a validated {@link EngineeringValue}. Throws on malformed JSON or on a
 * payload that fails validation (including a format-version mismatch).
 */
export function deserializeEngineeringValue(json: string): EngineeringValue {
  return parseEngineeringValue(JSON.parse(json));
}
