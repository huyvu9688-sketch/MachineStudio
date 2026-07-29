// Typed errors for building and querying the source/market registry (Unit 1.4).
// Callers and tests distinguish invariant violations by `code`.

/** Machine-readable classification of a source-registry failure. */
export type SourceRegistryErrorCode =
  // Build-time invariant violations
  | "duplicate_document_id"
  | "duplicate_revision_id"
  | "duplicate_profile_id"
  | "invalid_shape"
  | "unknown_document"
  | "missing_edition"
  | "unknown_supersession"
  | "self_supersession"
  | "supersession_cycle"
  | "licensed_excerpt"
  | "unknown_profile_source"
  // Lookup-time failures
  | "unknown_document_lookup"
  | "unknown_revision"
  | "unknown_profile"
  | "invalid_clause_reference";

/**
 * Thrown when a source/market definition set violates a registry invariant, or
 * when a lookup or reference resolution fails. `subjectId` identifies the
 * offending record where known.
 */
export class SourceRegistryError extends Error {
  readonly code: SourceRegistryErrorCode;
  readonly subjectId?: string;

  constructor(
    code: SourceRegistryErrorCode,
    message: string,
    subjectId?: string,
  ) {
    super(message);
    this.name = "SourceRegistryError";
    this.code = code;
    this.subjectId = subjectId;
  }
}
