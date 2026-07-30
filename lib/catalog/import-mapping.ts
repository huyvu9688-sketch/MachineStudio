// Import mapping contracts (Unit 2.7 part 1; context/architecture.md
// "lib/catalog/": "CSV import mapping"). An `ImportMapping` is a versioned,
// declarative description of how a manufacturer's CSV column headers
// correspond to a `ManufacturerPartRevision`'s identity fields and a target
// `ComponentSchemaVersion`'s attribute fields — never executable code (module
// code and catalog import mapping both forbid running imported logic,
// context/code-standards.md "Security": "Never execute imported formulas or
// user-uploaded code").
//
// A mapping is versioned (`id` + `version`) because code-standards.md
// "Catalog" requires imports to be "idempotent by manufacturer, part number,
// source revision, and import mapping" — the mapping's identity is part of
// what makes a re-import reproducible.

import type { ComponentAttributeFieldDefinition } from "./types";

/**
 * Value kinds a CSV cell can be parsed into. A single flat cell cannot
 * represent {@link ComponentAttributeFieldDefinition}'s other `EngineeringValue`
 * kinds (`vector_quantity`, `curve`, `load_spectrum`, `table`,
 * `component_ref`) — mapping an attribute field of one of those kinds is
 * rejected as an unsupported mapping (see ./csv-import.ts).
 */
export type CsvSupportedValueKind =
  "quantity" | "boolean" | "enum" | "material_ref";

/** Where a mapped field's raw value comes from for every row of the import. */
export type ImportMappingFieldSource =
  | { readonly kind: "column"; readonly column: string }
  | { readonly kind: "constant"; readonly value: string };

/**
 * One mapped field: either a `ManufacturerPartRevision` identity field
 * (`partNumber`, `sourceRevision`, `sourceLink`, `lifecycleStatus`) or an
 * attribute key declared by the target `ComponentSchemaVersion`.
 */
export interface ImportMappingField {
  /** `"partNumber"` | `"sourceRevision"` | `"sourceLink"` | `"lifecycleStatus"`, or an attribute key. */
  readonly target: string;
  readonly source: ImportMappingFieldSource;
  /**
   * The CSV column's unit, when it differs from the attribute field's
   * canonical unit — normalized through `lib/engine/units` at parse time.
   * Meaningful only when the target is a `quantity` attribute field.
   */
  readonly sourceUnit?: string;
}

/**
 * A versioned, reusable CSV column mapping for one `ComponentSchemaVersion`.
 * `fields` must cover `partNumber` and `sourceRevision`, plus every field the
 * caller intends to import for that schema version.
 */
export interface ImportMapping {
  readonly id: string;
  readonly version: string;
  readonly componentTypeId: string;
  readonly componentSchemaVersionId: string;
  readonly fields: readonly ImportMappingField[];
}

/** The four `ManufacturerPartRevision` identity targets, not attribute keys. */
export const IMPORT_IDENTITY_TARGETS = [
  "partNumber",
  "sourceRevision",
  "sourceLink",
  "lifecycleStatus",
] as const;

/** An identity target name (see {@link IMPORT_IDENTITY_TARGETS}). */
export type ImportIdentityTarget = (typeof IMPORT_IDENTITY_TARGETS)[number];

/** Whether `target` names an identity field rather than an attribute key. */
export function isImportIdentityTarget(
  target: string,
): target is ImportIdentityTarget {
  return (IMPORT_IDENTITY_TARGETS as readonly string[]).includes(target);
}

/** The `CsvSupportedValueKind`s a CSV importer can populate from one cell. */
export const CSV_SUPPORTED_VALUE_KINDS: readonly CsvSupportedValueKind[] = [
  "quantity",
  "boolean",
  "enum",
  "material_ref",
];

/** Whether a `ComponentAttributeFieldDefinition`'s `valueKind` is CSV-importable. */
export function isCsvSupportedValueKind(
  valueKind: ComponentAttributeFieldDefinition["valueKind"],
): valueKind is CsvSupportedValueKind {
  return (CSV_SUPPORTED_VALUE_KINDS as readonly string[]).includes(valueKind);
}
