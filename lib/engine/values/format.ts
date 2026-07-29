// Serialization format version for engineering values. See
// context/architecture.md ("All value types are serializable and versioned")
// and context/implementation-map.md Unit 1.1.

/**
 * Serialization format version carried by every {@link EngineeringValue}
 * payload in its `v` field.
 *
 * Persisted engineering values live in versioned JSONB and are validated on
 * both write and read (see context/code-standards.md "Validation"). The
 * embedded version lets a read reject a payload written under a different
 * format version instead of silently misinterpreting it.
 *
 * Bump this only alongside a migration path. Released calculation runs and
 * baselines are immutable and must keep reproducing under the version they
 * were written with, so a new version never rewrites old payloads in place.
 */
export const SERIALIZATION_FORMAT_VERSION = 1 as const;

/** The literal type of the current {@link SERIALIZATION_FORMAT_VERSION}. */
export type SerializationFormatVersion = typeof SERIALIZATION_FORMAT_VERSION;
