// Catalog CSV parsing, row validation, and unit normalization (Unit 2.7 part
// 1; context/architecture.md "lib/catalog/": "CSV import mapping").
//
// This module is deliberately pure and DB-free — it never imports `lib/db` or
// touches persistence, matching the module-purity spirit of
// context/code-standards.md ("Module code cannot import app, database,
// authentication, file storage, or network packages") applied to catalog
// import logic. `parseCatalogCsv` alone *is* dry-run mode: calling it never
// writes anything, so the same function backs both a preview and — once a
// caller (a `lib/application/catalogs/` service, not yet built — see
// context/progress-tracker.md "Next Up") persists its valid rows — a real
// import.
//
// This also implements the Unit 2.6-deferred cross-validation: every parsed
// row's `attributes` is checked against its target `ComponentSchemaVersion`'s
// declared field list (required keys present, value kind/unit consistent) —
// see context/architecture.md decisions in progress-tracker.md.

import {
  convert,
  DimensionMismatchError,
  hasUnit,
  makeQuantity,
  UnknownUnitError,
} from "../engine/units";
import { SERIALIZATION_FORMAT_VERSION } from "../engine/values";
import type { EngineeringValue } from "../engine/values";
import {
  isImportIdentityTarget,
  isCsvSupportedValueKind,
  type ImportMapping,
  type ImportMappingField,
} from "./import-mapping";
import type {
  ComponentAttributeFieldDefinition,
  ComponentAttributes,
  PartLifecycleStatus,
} from "./types";
import { ComponentAttributesSchema } from "./schemas";

/** Thrown for a malformed import setup (mapping/CSV mismatch), not a bad data row. */
export class CsvImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvImportError";
  }
}

/** A single field-level problem on one CSV data row. */
export interface CsvFieldError {
  /** The mapping target that failed (an identity field name or attribute key). */
  readonly target: string;
  readonly message: string;
}

/**
 * The parsed, normalized, and validated result of one CSV data row.
 * `rowNumber` is 1-based and counts data rows only (the header is not row 1).
 */
export interface ImportRowResult {
  readonly rowNumber: number;
  readonly ok: boolean;
  readonly errors: readonly CsvFieldError[];
  readonly partNumber?: string;
  readonly sourceRevision?: string;
  readonly sourceLink?: string;
  readonly lifecycleStatus?: PartLifecycleStatus;
  readonly attributes?: ComponentAttributes;
}

/** The full report of a `parseCatalogCsv` run: every row's outcome plus a summary. */
export interface CsvImportReport {
  readonly totalRows: number;
  readonly validRowCount: number;
  readonly invalidRowCount: number;
  readonly rows: readonly ImportRowResult[];
}

const LIFECYCLE_STATUS_VALUES: readonly PartLifecycleStatus[] = [
  "active",
  "not_recommended_for_new_design",
  "obsolete",
  "discontinued",
];

// --- CSV tokenizer (RFC 4180-style: quoted fields, "" escape, CRLF/LF) ------

/**
 * Parses raw CSV text into a header row and data rows. Quoted fields may
 * contain commas, newlines, and escaped quotes (`""`). Blank lines are
 * skipped. A data row with fewer cells than the header is padded with empty
 * strings (tolerates trailing-cell omission); a row with *more* cells than
 * the header is returned as-is — `parseCatalogCsv` flags that as a row error
 * rather than silently truncating, since it usually signals an unescaped
 * delimiter.
 */
export function parseCsvTable(text: string): {
  header: string[];
  rows: string[][];
} {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  const endField = (): void => {
    row.push(field);
    field = "";
  };
  const endRow = (): void => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < len) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      endField();
      i += 1;
      continue;
    }
    if (ch === "\r") {
      endRow();
      i += text[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    if (ch === "\n") {
      endRow();
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  if (field.length > 0 || row.length > 0) {
    endRow();
  }

  const nonBlankRows = rows.filter((r) => !(r.length === 1 && r[0] === ""));
  const [header, ...dataRows] = nonBlankRows;
  return { header: header ?? [], rows: dataRows };
}

// --- Mapping setup validation (throws — a broken import, not a bad row) ----

function validateMappingAgainstSchema(
  mapping: ImportMapping,
  schemaFields: readonly ComponentAttributeFieldDefinition[],
): void {
  const schemaByKey = new Map(schemaFields.map((f) => [f.key, f]));
  const mappedTargets = new Set(mapping.fields.map((f) => f.target));

  if (!mappedTargets.has("partNumber")) {
    throw new CsvImportError(
      'Import mapping must map the "partNumber" identity field',
    );
  }
  if (!mappedTargets.has("sourceRevision")) {
    throw new CsvImportError(
      'Import mapping must map the "sourceRevision" identity field',
    );
  }

  for (const field of mapping.fields) {
    if (isImportIdentityTarget(field.target)) continue;
    const schemaField = schemaByKey.get(field.target);
    if (schemaField === undefined) {
      throw new CsvImportError(
        `Import mapping targets unknown attribute key "${field.target}" for this component schema version`,
      );
    }
    if (!isCsvSupportedValueKind(schemaField.valueKind)) {
      throw new CsvImportError(
        `Attribute "${field.target}" has value kind "${schemaField.valueKind}", which CSV import cannot represent in a single cell`,
      );
    }
    if (
      schemaField.valueKind === "quantity" &&
      schemaField.unit === undefined
    ) {
      throw new CsvImportError(
        `Attribute "${field.target}" is a quantity field with no declared canonical unit`,
      );
    }
    if (schemaField.valueKind === "enum" && schemaField.enumId === undefined) {
      throw new CsvImportError(
        `Attribute "${field.target}" is an enum field with no declared enumId`,
      );
    }
    if (field.sourceUnit !== undefined && !hasUnit(field.sourceUnit)) {
      throw new CsvImportError(
        `Import mapping field "${field.target}" declares unknown sourceUnit "${field.sourceUnit}"`,
      );
    }
  }

  for (const schemaField of schemaFields) {
    if (schemaField.required && !mappedTargets.has(schemaField.key)) {
      throw new CsvImportError(
        `Import mapping is missing required attribute "${schemaField.key}"`,
      );
    }
  }
}

function validateMappedColumnsExist(
  mapping: ImportMapping,
  header: readonly string[],
): void {
  const headerSet = new Set(header);
  for (const field of mapping.fields) {
    if (field.source.kind === "column" && !headerSet.has(field.source.column)) {
      throw new CsvImportError(
        `CSV has no column "${field.source.column}" mapped to "${field.target}"`,
      );
    }
  }
}

// --- Per-row value resolution ------------------------------------------------

function resolveRawValue(
  field: ImportMappingField,
  cellsByHeader: ReadonlyMap<string, string>,
): string {
  if (field.source.kind === "constant") return field.source.value;
  return (cellsByHeader.get(field.source.column) ?? "").trim();
}

interface AttributeResolution {
  readonly value?: EngineeringValue;
  readonly error?: string;
}

function resolveAttributeValue(
  raw: string,
  schemaField: ComponentAttributeFieldDefinition,
  sourceUnit: string | undefined,
): AttributeResolution {
  switch (schemaField.valueKind) {
    case "quantity": {
      const numeric = Number(raw);
      if (!Number.isFinite(numeric)) {
        return { error: `invalid numeric value: "${raw}"` };
      }
      const targetUnit = schemaField.unit as string; // validated present at setup
      const fromUnit = sourceUnit ?? targetUnit;
      try {
        const converted = convert(numeric, fromUnit, targetUnit);
        return { value: makeQuantity(converted, targetUnit) };
      } catch (err) {
        if (
          err instanceof UnknownUnitError ||
          err instanceof DimensionMismatchError
        ) {
          return { error: err.message };
        }
        throw err;
      }
    }
    case "boolean": {
      const normalized = raw.trim().toLowerCase();
      if (["true", "1", "yes"].includes(normalized)) {
        return {
          value: {
            v: SERIALIZATION_FORMAT_VERSION,
            kind: "boolean",
            value: true,
          },
        };
      }
      if (["false", "0", "no"].includes(normalized)) {
        return {
          value: {
            v: SERIALIZATION_FORMAT_VERSION,
            kind: "boolean",
            value: false,
          },
        };
      }
      return { error: `invalid boolean value: "${raw}"` };
    }
    case "enum": {
      return {
        value: {
          v: SERIALIZATION_FORMAT_VERSION,
          kind: "enum",
          enumId: schemaField.enumId as string,
          value: raw,
        },
      };
    }
    case "material_ref": {
      return {
        value: {
          v: SERIALIZATION_FORMAT_VERSION,
          kind: "material_ref",
          materialId: raw,
        },
      };
    }
    default: {
      // Unreachable: validateMappingAgainstSchema rejects unsupported kinds at setup.
      return { error: `unsupported value kind: "${schemaField.valueKind}"` };
    }
  }
}

function resolveLifecycleStatus(raw: string): {
  value?: PartLifecycleStatus;
  error?: string;
} {
  if (raw === "") return {};
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const match = LIFECYCLE_STATUS_VALUES.find((v) => v === normalized);
  if (match === undefined) {
    return { error: `invalid lifecycle status: "${raw}"` };
  }
  return { value: match };
}

// --- Top-level entry point ----------------------------------------------------

/**
 * Parses, row-validates, and unit-normalizes a manufacturer catalog CSV
 * against `mapping` and its target component schema version's declared
 * `schemaFields`. Never writes anything — this *is* dry-run mode. Never
 * throws for a bad data row (collected as a per-row error instead); throws
 * {@link CsvImportError} only for a broken import setup (a mapping that
 * cannot possibly succeed against this CSV or schema version).
 */
export function parseCatalogCsv(
  csvText: string,
  mapping: ImportMapping,
  schemaFields: readonly ComponentAttributeFieldDefinition[],
): CsvImportReport {
  validateMappingAgainstSchema(mapping, schemaFields);

  const { header, rows: dataRows } = parseCsvTable(csvText);
  if (header.length === 0) {
    throw new CsvImportError("CSV has no header row");
  }
  validateMappedColumnsExist(mapping, header);

  const schemaByKey = new Map(schemaFields.map((f) => [f.key, f]));
  const seenIdentity = new Map<string, number>();
  const rowResults: ImportRowResult[] = [];

  dataRows.forEach((cells, index) => {
    const rowNumber = index + 1;
    const errors: CsvFieldError[] = [];

    if (cells.length > header.length) {
      errors.push({
        target: "(row)",
        message: `row has ${cells.length} cells but the header has ${header.length} — likely an unescaped delimiter`,
      });
    }

    const cellsByHeader = new Map<string, string>();
    header.forEach((columnName, columnIndex) => {
      cellsByHeader.set(columnName, cells[columnIndex] ?? "");
    });

    let partNumber: string | undefined;
    let sourceRevision: string | undefined;
    let sourceLink: string | undefined;
    let lifecycleStatus: PartLifecycleStatus | undefined;
    const attributes: Record<string, EngineeringValue> = {};

    for (const field of mapping.fields) {
      const raw = resolveRawValue(field, cellsByHeader);

      if (field.target === "partNumber") {
        if (raw === "")
          errors.push({
            target: field.target,
            message: "partNumber is required",
          });
        else partNumber = raw;
        continue;
      }
      if (field.target === "sourceRevision") {
        if (raw === "")
          errors.push({
            target: field.target,
            message: "sourceRevision is required",
          });
        else sourceRevision = raw;
        continue;
      }
      if (field.target === "sourceLink") {
        if (raw !== "") sourceLink = raw;
        continue;
      }
      if (field.target === "lifecycleStatus") {
        const resolved = resolveLifecycleStatus(raw);
        if (resolved.error !== undefined) {
          errors.push({ target: field.target, message: resolved.error });
        } else {
          lifecycleStatus = resolved.value;
        }
        continue;
      }

      // Otherwise, an attribute key (validated to exist at setup).
      const schemaField = schemaByKey.get(
        field.target,
      ) as ComponentAttributeFieldDefinition;
      if (raw === "") {
        if (schemaField.required) {
          errors.push({
            target: field.target,
            message: `attribute "${field.target}" is required`,
          });
        }
        continue;
      }
      const resolved = resolveAttributeValue(
        raw,
        schemaField,
        field.sourceUnit,
      );
      if (resolved.error !== undefined) {
        errors.push({ target: field.target, message: resolved.error });
      } else if (resolved.value !== undefined) {
        attributes[field.target] = resolved.value;
      }
    }

    if (
      errors.length === 0 &&
      partNumber !== undefined &&
      sourceRevision !== undefined
    ) {
      const identityKey = `${partNumber}|${sourceRevision}`;
      const firstSeenAt = seenIdentity.get(identityKey);
      if (firstSeenAt !== undefined) {
        errors.push({
          target: "(row)",
          message: `duplicate partNumber + sourceRevision already seen at row ${firstSeenAt}`,
        });
      } else {
        seenIdentity.set(identityKey, rowNumber);
      }
    }

    if (errors.length > 0) {
      rowResults.push({ rowNumber, ok: false, errors });
      return;
    }

    const attributesResult = ComponentAttributesSchema.safeParse(attributes);
    if (!attributesResult.success) {
      rowResults.push({
        rowNumber,
        ok: false,
        errors: [
          {
            target: "(row)",
            message: `resolved attributes failed validation: ${attributesResult.error.issues
              .map((iss) => `${iss.path.join(".") || "(root)"}: ${iss.message}`)
              .join("; ")}`,
          },
        ],
      });
      return;
    }

    rowResults.push({
      rowNumber,
      ok: true,
      errors: [],
      partNumber,
      sourceRevision,
      ...(sourceLink !== undefined ? { sourceLink } : {}),
      ...(lifecycleStatus !== undefined ? { lifecycleStatus } : {}),
      attributes: attributesResult.data,
    });
  });

  const validRowCount = rowResults.filter((r) => r.ok).length;
  return {
    totalRows: rowResults.length,
    validRowCount,
    invalidRowCount: rowResults.length - validRowCount,
    rows: rowResults,
  };
}
