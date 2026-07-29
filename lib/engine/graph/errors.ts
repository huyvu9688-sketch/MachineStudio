// Typed errors for building and validating a parameter graph (Unit 1.8).
// Callers and tests distinguish failures by `code`.

/** Machine-readable classification of a parameter-graph integrity failure. */
export type ParameterGraphErrorCode =
  /** The graph shape failed schema validation. */
  | "invalid_shape"
  /** Two nodes, links, or scopes share an ID. */
  | "duplicate_id"
  /** A node references a scope that is not declared. */
  | "unknown_scope"
  /** A scope's parent is not declared. */
  | "unknown_scope_parent"
  /** The scope hierarchy contains a cycle. */
  | "scope_cycle"
  /** A link references a node that is not declared. */
  | "unknown_node"
  /** A link's target is not a consumable `module_input`. */
  | "invalid_link_target"
  /** A link's source is a `module_input` (a sink cannot provide a value). */
  | "invalid_link_source"
  /** A `module_input`/`module_output` node has no owning module instance. */
  | "missing_module_instance";

/**
 * Thrown when a parameter graph fails a structural or referential invariant.
 * `subjectId` identifies the offending node, link, or scope where known.
 */
export class ParameterGraphError extends Error {
  readonly code: ParameterGraphErrorCode;
  readonly subjectId?: string;

  constructor(code: ParameterGraphErrorCode, message: string, subjectId?: string) {
    super(message);
    this.name = "ParameterGraphError";
    this.code = code;
    this.subjectId = subjectId;
  }
}
