// Domain-facing contracts for the manufacturer-catalog repository (Unit 2.6).
//
// Catalog data is shared reference data, not project-owned
// (prisma/schema.prisma "Unit 2.6: manufacturer catalog schema" — every
// project's component filtering reads from the same imported catalog), so
// records here carry no owner-scoped read the way project/graph/run records
// do (context/code-standards.md "Catalog": no company-approved-part,
// supplier, pricing, or inventory workflow in the MVP).

import type {
  ComponentAttributeFieldDefinition,
  ComponentAttributes,
  DataQualityStatus,
  PartLifecycleStatus,
} from "../../catalog";
import type { UserId } from "./types";

// Re-exported so existing importers of `PartLifecycleStatus`/`DataQualityStatus`
// from this module (or the `lib/db/repositories` barrel) are unaffected — the
// types are now owned by `lib/catalog` (see its `types.ts`), the same
// cross-package pattern `LoadCaseCategory` (`lib/engine/parameters`) already
// follows for `lib/db`.
export type { DataQualityStatus, PartLifecycleStatus };

// --- Branded IDs -----------------------------------------------------------

/** A `Manufacturer` ID. */
export type ManufacturerId = string & { readonly __brand: "ManufacturerId" };
/** Casts a raw string to a {@link ManufacturerId}. Identity at runtime. */
export function asManufacturerId(id: string): ManufacturerId {
  return id as ManufacturerId;
}

/** A `ComponentType` ID (a caller-chosen stable slug, e.g. `"ball_screw"`). */
export type ComponentTypeId = string & { readonly __brand: "ComponentTypeId" };
/** Casts a raw string to a {@link ComponentTypeId}. Identity at runtime. */
export function asComponentTypeId(id: string): ComponentTypeId {
  return id as ComponentTypeId;
}

/** A `ComponentSchemaVersion` ID. */
export type ComponentSchemaVersionId = string & {
  readonly __brand: "ComponentSchemaVersionId";
};
/** Casts a raw string to a {@link ComponentSchemaVersionId}. Identity at runtime. */
export function asComponentSchemaVersionId(
  id: string,
): ComponentSchemaVersionId {
  return id as ComponentSchemaVersionId;
}

/** A `CatalogImportBatch` ID. */
export type CatalogImportBatchId = string & {
  readonly __brand: "CatalogImportBatchId";
};
/** Casts a raw string to a {@link CatalogImportBatchId}. Identity at runtime. */
export function asCatalogImportBatchId(id: string): CatalogImportBatchId {
  return id as CatalogImportBatchId;
}

/** A `ManufacturerPartRevision` ID. */
export type ManufacturerPartRevisionId = string & {
  readonly __brand: "ManufacturerPartRevisionId";
};
/** Casts a raw string to a {@link ManufacturerPartRevisionId}. Identity at runtime. */
export function asManufacturerPartRevisionId(
  id: string,
): ManufacturerPartRevisionId {
  return id as ManufacturerPartRevisionId;
}

/** A `DatasheetAttachment` ID. */
export type DatasheetAttachmentId = string & {
  readonly __brand: "DatasheetAttachmentId";
};
/** Casts a raw string to a {@link DatasheetAttachmentId}. Identity at runtime. */
export function asDatasheetAttachmentId(id: string): DatasheetAttachmentId {
  return id as DatasheetAttachmentId;
}

// --- Records (a single row) -------------------------------------------------

/** A persisted `Manufacturer` row. */
export interface ManufacturerRecord {
  readonly id: ManufacturerId;
  readonly name: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** A persisted `ComponentType` row. */
export interface ComponentTypeRecord {
  readonly id: ComponentTypeId;
  readonly name: string;
  readonly description: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** A persisted `ComponentSchemaVersion` row, its `fields` validated on read. */
export interface ComponentSchemaVersionRecord {
  readonly id: ComponentSchemaVersionId;
  readonly componentTypeId: ComponentTypeId;
  readonly version: string;
  readonly fields: readonly ComponentAttributeFieldDefinition[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * A persisted `CatalogImportBatch` row. The five summary fields are null
 * until an import service (`lib/application/catalogs/import-catalog.ts`)
 * computes and writes them at creation time.
 */
export interface CatalogImportBatchRecord {
  readonly id: CatalogImportBatchId;
  readonly componentTypeId: ComponentTypeId;
  readonly manufacturerId: ManufacturerId;
  readonly sourceLabel: string;
  readonly importedByUserId: UserId | null;
  readonly importMappingId: string | null;
  readonly importMappingVersion: string | null;
  readonly totalRowCount: number | null;
  readonly validRowCount: number | null;
  readonly invalidRowCount: number | null;
  readonly createdAt: Date;
}

/** A persisted `ManufacturerPartRevision` row, its `attributes` validated on read. */
export interface ManufacturerPartRevisionRecord {
  readonly id: ManufacturerPartRevisionId;
  readonly manufacturerId: ManufacturerId;
  readonly componentTypeId: ComponentTypeId;
  readonly componentSchemaVersionId: ComponentSchemaVersionId;
  readonly partNumber: string;
  readonly sourceRevision: string;
  readonly sourceLink: string | null;
  readonly lifecycleStatus: PartLifecycleStatus | null;
  readonly dataQualityStatus: DataQualityStatus;
  readonly validationErrors: readonly string[];
  readonly attributes: ComponentAttributes;
  readonly importBatchId: CatalogImportBatchId | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** A persisted `DatasheetAttachment` row. */
export interface DatasheetAttachmentRecord {
  readonly id: DatasheetAttachmentId;
  readonly manufacturerPartRevisionId: ManufacturerPartRevisionId;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly checksum: string;
  readonly storageKey: string;
  readonly uploadSource: string;
  readonly uploadedByUserId: UserId | null;
  readonly createdAt: Date;
}

// --- Create inputs -----------------------------------------------------------

/** Input to create a `Manufacturer`. */
export interface CreateManufacturerInput {
  readonly name: string;
}

/** Input to create a `ComponentType`. `id` is the caller-chosen stable slug. */
export interface CreateComponentTypeInput {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
}

/** Input to create a `ComponentSchemaVersion`. `fields` is validated before write. */
export interface CreateComponentSchemaVersionInput {
  readonly componentTypeId: ComponentTypeId;
  readonly version: string;
  readonly fields: readonly ComponentAttributeFieldDefinition[];
}

/**
 * Input to create a `CatalogImportBatch`. The summary fields are omitted for
 * a batch whose row outcomes are not yet known.
 */
export interface CreateCatalogImportBatchInput {
  readonly componentTypeId: ComponentTypeId;
  readonly manufacturerId: ManufacturerId;
  readonly sourceLabel: string;
  readonly importedByUserId?: UserId;
  readonly importMappingId?: string;
  readonly importMappingVersion?: string;
  readonly totalRowCount?: number;
  readonly validRowCount?: number;
  readonly invalidRowCount?: number;
}

/** Input to create a `ManufacturerPartRevision`. `attributes` is validated before write. */
export interface CreateManufacturerPartRevisionInput {
  readonly manufacturerId: ManufacturerId;
  readonly componentTypeId: ComponentTypeId;
  readonly componentSchemaVersionId: ComponentSchemaVersionId;
  readonly partNumber: string;
  readonly sourceRevision: string;
  readonly sourceLink?: string;
  readonly lifecycleStatus?: PartLifecycleStatus;
  readonly dataQualityStatus?: DataQualityStatus;
  readonly validationErrors?: readonly string[];
  readonly attributes: ComponentAttributes;
  readonly importBatchId?: CatalogImportBatchId;
}

/** Input to create a `DatasheetAttachment`. */
export interface CreateDatasheetAttachmentInput {
  readonly manufacturerPartRevisionId: ManufacturerPartRevisionId;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly checksum: string;
  readonly storageKey: string;
  readonly uploadSource: string;
  readonly uploadedByUserId?: UserId;
}
