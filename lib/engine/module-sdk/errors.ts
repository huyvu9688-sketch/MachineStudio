// Typed errors for validating and executing a module package (Unit 1.6).
// Callers and tests distinguish failures by `code`.

/** Machine-readable classification of a module SDK failure. */
export type ModuleSdkErrorCode =
  // --- Package/manifest validation (static) ---
  /** Manifest, UI schema, report schema, or validation record failed shape validation. */
  | "invalid_manifest"
  /** UI schema references a port key that is not a declared input port. */
  | "invalid_ui_schema"
  /** Report schema is structurally invalid or has duplicate section IDs. */
  | "invalid_report_schema"
  /** Validation record failed shape validation. */
  | "invalid_validation_record"
  /** Two ports share a key within inputs or within outputs. */
  | "duplicate_port_key"
  /** A port references a parameter ID not in the registry. */
  | "unknown_parameter"
  /** A port's declared load case is not admitted by its canonical parameter. */
  | "invalid_port_load_case"
  /** The manifest's parameter-registry version does not match the registry. */
  | "registry_version_mismatch"
  /** The manifest's declared content hash does not match the package content. */
  | "content_hash_mismatch"
  /** The manifest's SDK range is malformed. */
  | "invalid_sdk_range"
  /** The catalog adapter is present but malformed. */
  | "invalid_catalog_adapter"
  // --- Execution (runtime) ---
  /** The running engine SDK version is outside the manifest's compatibility range. */
  | "incompatible_sdk"
  /** The raw input failed the module's input schema. */
  | "input_schema_mismatch"
  /** A required input port had no resolved value and no constant default. */
  | "missing_required_input"
  /** An input value's kind or unit dimension does not match its parameter. */
  | "input_value_mismatch"
  /** An input value's magnitude falls outside its parameter's declared valid range. */
  | "input_value_out_of_range"
  /** Outputs are missing, undeclared, or of the wrong kind/dimension. */
  | "output_schema_mismatch"
  /** The computation's trace/checks/warnings/validity failed shape validation. */
  | "invalid_computation"
  /** A trace/check citation references a source not declared in the manifest. */
  | "missing_trace_source";

/**
 * Thrown when a module package is invalid or a module execution fails a contract
 * check. `subjectId` identifies the offending module, port, parameter, or output
 * where known.
 */
export class ModuleSdkError extends Error {
  readonly code: ModuleSdkErrorCode;
  readonly subjectId?: string;

  constructor(code: ModuleSdkErrorCode, message: string, subjectId?: string) {
    super(message);
    this.name = "ModuleSdkError";
    this.code = code;
    this.subjectId = subjectId;
  }
}
