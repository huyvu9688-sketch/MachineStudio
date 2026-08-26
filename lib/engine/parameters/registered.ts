// The released canonical parameter registry singleton (Unit 1.3). Building it
// runs every registry invariant over the seed definitions, so an invalid
// released set fails fast at import time. Convenience lookups bind to this
// singleton; tests that need to exercise invariants with fixtures use
// `buildParameterRegistry` directly.

import {
  PARAMETER_DEFINITIONS,
  PARAMETER_REGISTRY_VERSION,
} from "./definitions";
import { buildParameterRegistry, type ParameterRegistry } from "./registry";
import type { ParameterDefinition } from "./types";

/**
 * Exact historical registry targets the current additive registry can serve to
 * immutable module packages. Add a version only after reviewing that every
 * referenced definition remains semantically compatible.
 */
export const PARAMETER_REGISTRY_SUPPORTED_VERSIONS = [
  "1.0.0",
  "1.1.0",
  "1.2.0",
  "1.3.0",
  "1.4.0",
  "1.5.0",
  "1.6.0",
  "1.7.0",
  "1.8.0",
  "1.9.0",
  "1.10.0",
  "1.11.0",
  "1.12.0",
  "1.13.0",
  "1.14.0",
  "1.15.0",
  "1.16.0",
  "1.17.0",
  "1.18.0",
] as const;

/** The released canonical parameter registry. */
export const PARAMETER_REGISTRY: ParameterRegistry = buildParameterRegistry(
  PARAMETER_DEFINITIONS,
  PARAMETER_REGISTRY_VERSION,
  PARAMETER_REGISTRY_SUPPORTED_VERSIONS,
);

/** Content fingerprint of the released registry (drift detection). */
export const PARAMETER_REGISTRY_HASH = PARAMETER_REGISTRY.hash;

/** Returns the released definition for `id`, or `undefined` when unknown. */
export function getParameter(id: string): ParameterDefinition | undefined {
  return PARAMETER_REGISTRY.get(id);
}

/** True when `id` is a released parameter. */
export function hasParameter(id: string): boolean {
  return PARAMETER_REGISTRY.has(id);
}

/** All released definitions, sorted by ID. */
export function listParameters(): readonly ParameterDefinition[] {
  return PARAMETER_REGISTRY.list();
}

/**
 * Resolves `id` to its active released definition, following the replacement
 * chain when deprecated.
 *
 * @throws {@link ParameterRegistryError} when `id` is not registered.
 */
export function resolveParameter(id: string): ParameterDefinition {
  return PARAMETER_REGISTRY.resolve(id);
}
