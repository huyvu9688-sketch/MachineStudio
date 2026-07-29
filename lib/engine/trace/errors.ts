// Typed errors for constructing and validating a calculation trace (Unit 1.5).
// Callers and tests distinguish invariant violations by `code`.

/** Machine-readable classification of a trace validation failure. */
export type TraceErrorCode =
  /** A record failed structural (Zod) validation. */
  | "invalid_shape"
  /** Two nodes in one trace share an ID (step/section IDs must be unique). */
  | "duplicate_node_id"
  /** A step cites a source location with neither a clause nor a page. */
  | "invalid_source_reference";

/**
 * Thrown when a calculation trace violates a build/validation invariant.
 * `subjectId` identifies the offending node or step where known.
 */
export class TraceError extends Error {
  readonly code: TraceErrorCode;
  readonly subjectId?: string;

  constructor(code: TraceErrorCode, message: string, subjectId?: string) {
    super(message);
    this.name = "TraceError";
    this.code = code;
    this.subjectId = subjectId;
  }
}
