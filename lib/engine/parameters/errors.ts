// Typed errors for building and querying the canonical parameter registry
// (Unit 1.3). Callers and tests distinguish invariant violations by `code`
// rather than by matching message strings.

/** Machine-readable classification of a parameter-registry failure. */
export type ParameterRegistryErrorCode =
  // Build-time invariant violations
  | "duplicate_id"
  | "duplicate_symbol"
  | "invalid_shape"
  | "missing_physical_metadata"
  | "unexpected_physical_metadata"
  | "unknown_unit"
  | "dimension_mismatch"
  | "invalid_range"
  | "invalid_enum"
  | "invalid_default"
  | "invalid_deprecation"
  | "unknown_replacement"
  | "deprecation_cycle"
  // Lookup-time failures
  | "unknown_parameter";

/**
 * Thrown when a parameter definition set violates a registry invariant, or when
 * a lookup fails. `parameterId` identifies the offending parameter where known.
 */
export class ParameterRegistryError extends Error {
  readonly code: ParameterRegistryErrorCode;
  readonly parameterId?: string;

  constructor(
    code: ParameterRegistryErrorCode,
    message: string,
    parameterId?: string,
  ) {
    super(message);
    this.name = "ParameterRegistryError";
    this.code = code;
    this.parameterId = parameterId;
  }
}
