// Serialization format version for the calculation-trace envelope (Unit 1.5).
// Independent of the EngineeringValue serialization version (see
// context/architecture.md "All value types are serializable and versioned";
// context/implementation-map.md Unit 1.5).

/**
 * Serialization format version carried by every {@link CalculationTrace}
 * envelope in its `v` field.
 *
 * Stored calculation traces live inside the immutable run snapshot and are
 * validated on read (context/code-standards.md "Validation"; "Calculation
 * Trace"). The embedded version lets a read reject a trace written under a
 * different format version instead of silently misinterpreting it.
 *
 * This is deliberately distinct from the EngineeringValue
 * `SERIALIZATION_FORMAT_VERSION`: the trace envelope and the value payloads it
 * embeds can evolve independently. Bump this only alongside a migration path;
 * released runs and baselines are immutable and must keep reproducing under the
 * version they were written with.
 */
export const TRACE_FORMAT_VERSION = 1 as const;

/** The literal type of the current {@link TRACE_FORMAT_VERSION}. */
export type TraceFormatVersion = typeof TRACE_FORMAT_VERSION;
