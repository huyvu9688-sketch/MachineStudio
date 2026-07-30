// The `importCatalog` use case (Unit 2.7 part 2) — the persistence and
// orchestration half of the catalog CSV import service (context/
// architecture.md "lib/application/": multi-step use-case and transaction
// orchestration). It composes:
//
//   - lib/catalog — `parseCatalogCsv` (Unit 2.7 part 1) does all parsing, row
//     validation, and unit normalization; this service never re-implements
//     that logic, only persists its output.
//   - lib/db — loads the manufacturer/schema version, then persists every
//     valid row with the idempotent `upsertManufacturerPartRevision`.
//
// Steps: (1) load and cross-check the manufacturer, target component schema
// version, and import mapping identity; (2) parse the CSV (dry-run mode stops
// here — `parseCatalogCsv` never writes anything); (3) create the
// `CatalogImportBatch` (with its row-count summary already known) and upsert
// every valid row, atomically (context/code-standards.md "Application
// Services": "Calculation execution, run storage, ... must be atomic when
// part of one use case" — the same rule applied to a catalog import batch).
//
// Deliberately NOT implemented here: persisting the full per-row error report
// (see prisma/schema.prisma "Unit 2.7 part 2" comment on `CatalogImportBatch`
// — no UI reads historical import errors yet, so this service returns the
// full report directly to its caller instead of a new table/column).

import "server-only";
import { CsvImportError, parseCatalogCsv } from "@/lib/catalog";
import type { CsvFieldError, ImportMapping } from "@/lib/catalog";
import {
  createCatalogImportBatch,
  loadComponentSchemaVersion,
  loadManufacturer,
  prisma,
  upsertManufacturerPartRevision,
  type CatalogImportBatchId,
  type ComponentSchemaVersionId,
  type ComponentTypeId,
  type ManufacturerId,
  type ManufacturerPartRevisionId,
  type UserId,
} from "@/lib/db";

/** Input to {@link importCatalog}. */
export interface ImportCatalogInput {
  readonly manufacturerId: ManufacturerId;
  readonly componentTypeId: ComponentTypeId;
  readonly componentSchemaVersionId: ComponentSchemaVersionId;
  readonly mapping: ImportMapping;
  readonly csvText: string;
  /** Human-readable batch provenance, e.g. an uploaded filename. */
  readonly sourceLabel: string;
  readonly importedByUserId?: UserId;
  /** When true, parses and validates but never writes to the database. */
  readonly dryRun?: boolean;
}

/** Machine-readable classification of an `importCatalog` setup failure. */
export type ImportCatalogErrorCode =
  | "manufacturer_not_found"
  | "component_schema_version_not_found"
  | "component_type_mismatch"
  | "mapping_mismatch"
  | "invalid_csv_setup";

/** A failed {@link importCatalog} outcome — a broken import setup, not a bad row. */
export interface ImportCatalogError {
  readonly code: ImportCatalogErrorCode;
  readonly message: string;
}

/** One row's persistence outcome, extending `parseCatalogCsv`'s row result. */
export interface ImportCatalogRowOutcome {
  readonly rowNumber: number;
  readonly ok: boolean;
  readonly errors: readonly CsvFieldError[];
  readonly partNumber?: string;
  readonly sourceRevision?: string;
  /** Set only when the row was successfully parsed and persisted. */
  readonly manufacturerPartRevisionId?: ManufacturerPartRevisionId;
}

/** Result of a dry run: parsed and validated, nothing written. */
export interface ImportCatalogDryRunResult {
  readonly ok: true;
  readonly dryRun: true;
  readonly totalRows: number;
  readonly validRowCount: number;
  readonly invalidRowCount: number;
  readonly rows: readonly ImportCatalogRowOutcome[];
}

/** Result of a real import: every valid row persisted, batch summary recorded. */
export interface ImportCatalogAppliedResult {
  readonly ok: true;
  readonly dryRun: false;
  readonly batchId: CatalogImportBatchId;
  readonly totalRows: number;
  readonly validRowCount: number;
  readonly invalidRowCount: number;
  readonly persistedCount: number;
  readonly rows: readonly ImportCatalogRowOutcome[];
}

/**
 * Result of {@link importCatalog} — a discriminated success/error result
 * (context/code-standards.md "Prefer discriminated unions ... for result
 * states"), not a throw, so a route handler renders any outcome without a
 * try/catch for expected domain failures.
 */
export type ImportCatalogResult =
  | ImportCatalogDryRunResult
  | ImportCatalogAppliedResult
  | { readonly ok: false; readonly error: ImportCatalogError };

/**
 * Parses a manufacturer catalog CSV against `mapping` and persists every
 * valid row, idempotently, as a `ManufacturerPartRevision` — re-running the
 * same import updates existing rows in place rather than duplicating or
 * rejecting them. Never throws for a bad data row (already resolved by
 * `parseCatalogCsv` into a per-row error) or a broken import setup (returned
 * as `{ ok: false }`); an unexpected repository error still throws — that is
 * a real bug, not a modeled outcome.
 */
export async function importCatalog(
  input: ImportCatalogInput,
): Promise<ImportCatalogResult> {
  const manufacturer = await loadManufacturer(input.manufacturerId);
  if (manufacturer === null) {
    return {
      ok: false,
      error: {
        code: "manufacturer_not_found",
        message: `Manufacturer "${input.manufacturerId}" does not exist.`,
      },
    };
  }

  const schemaVersion = await loadComponentSchemaVersion(
    input.componentSchemaVersionId,
  );
  if (schemaVersion === null) {
    return {
      ok: false,
      error: {
        code: "component_schema_version_not_found",
        message: `Component schema version "${input.componentSchemaVersionId}" does not exist.`,
      },
    };
  }
  if (schemaVersion.componentTypeId !== input.componentTypeId) {
    return {
      ok: false,
      error: {
        code: "component_type_mismatch",
        message: `Component schema version "${input.componentSchemaVersionId}" belongs to component type "${schemaVersion.componentTypeId}", not "${input.componentTypeId}".`,
      },
    };
  }
  if (
    input.mapping.componentTypeId !== input.componentTypeId ||
    input.mapping.componentSchemaVersionId !== input.componentSchemaVersionId
  ) {
    return {
      ok: false,
      error: {
        code: "mapping_mismatch",
        message: `Import mapping "${input.mapping.id}@${input.mapping.version}" targets a different component type or schema version than requested.`,
      },
    };
  }

  let report: ReturnType<typeof parseCatalogCsv>;
  try {
    report = parseCatalogCsv(
      input.csvText,
      input.mapping,
      schemaVersion.fields,
    );
  } catch (err) {
    if (err instanceof CsvImportError) {
      return {
        ok: false,
        error: { code: "invalid_csv_setup", message: err.message },
      };
    }
    throw err;
  }

  if (input.dryRun === true) {
    return {
      ok: true,
      dryRun: true,
      totalRows: report.totalRows,
      validRowCount: report.validRowCount,
      invalidRowCount: report.invalidRowCount,
      rows: report.rows.map((row) => ({
        rowNumber: row.rowNumber,
        ok: row.ok,
        errors: row.errors,
        ...(row.partNumber !== undefined ? { partNumber: row.partNumber } : {}),
        ...(row.sourceRevision !== undefined
          ? { sourceRevision: row.sourceRevision }
          : {}),
      })),
    };
  }

  // Batch creation and every valid row's upsert are atomic
  // (context/code-standards.md "Application Services").
  const { batchId, rowOutcomes, persistedCount } = await prisma.$transaction(
    async (tx) => {
      const batch = await createCatalogImportBatch(
        {
          componentTypeId: input.componentTypeId,
          manufacturerId: input.manufacturerId,
          sourceLabel: input.sourceLabel,
          ...(input.importedByUserId !== undefined
            ? { importedByUserId: input.importedByUserId }
            : {}),
          importMappingId: input.mapping.id,
          importMappingVersion: input.mapping.version,
          totalRowCount: report.totalRows,
          validRowCount: report.validRowCount,
          invalidRowCount: report.invalidRowCount,
        },
        tx,
      );

      const outcomes: ImportCatalogRowOutcome[] = [];
      let persisted = 0;
      for (const row of report.rows) {
        if (
          !row.ok ||
          row.partNumber === undefined ||
          row.sourceRevision === undefined ||
          row.attributes === undefined
        ) {
          outcomes.push({
            rowNumber: row.rowNumber,
            ok: false,
            errors: row.errors,
          });
          continue;
        }
        const persistedRow = await upsertManufacturerPartRevision(
          {
            manufacturerId: input.manufacturerId,
            componentTypeId: input.componentTypeId,
            componentSchemaVersionId: input.componentSchemaVersionId,
            partNumber: row.partNumber,
            sourceRevision: row.sourceRevision,
            ...(row.sourceLink !== undefined
              ? { sourceLink: row.sourceLink }
              : {}),
            ...(row.lifecycleStatus !== undefined
              ? { lifecycleStatus: row.lifecycleStatus }
              : {}),
            attributes: row.attributes,
            importBatchId: batch.id,
          },
          tx,
        );
        persisted += 1;
        outcomes.push({
          rowNumber: row.rowNumber,
          ok: true,
          errors: [],
          partNumber: row.partNumber,
          sourceRevision: row.sourceRevision,
          manufacturerPartRevisionId: persistedRow.id,
        });
      }

      return {
        batchId: batch.id,
        rowOutcomes: outcomes,
        persistedCount: persisted,
      };
    },
  );

  return {
    ok: true,
    dryRun: false,
    batchId,
    totalRows: report.totalRows,
    validRowCount: report.validRowCount,
    invalidRowCount: report.invalidRowCount,
    persistedCount,
    rows: rowOutcomes,
  };
}
