// Manufacturer-catalog persistence adapter (Unit 2.6).
//
// A `lib/db` repository — the only boundary allowed to import Prisma
// (context/architecture.md "lib/db/"). Catalog data (Manufacturer,
// ComponentType, ComponentSchemaVersion, CatalogImportBatch,
// ManufacturerPartRevision, DatasheetAttachment) is shared reference data, not
// project-owned, so reads here carry no owner filter — unlike the
// project/graph/run repositories (see prisma/schema.prisma "Unit 2.6" comment).
//
// Two JSONB payloads are validated on write AND read with lib/catalog's
// schemas — "never trust JSONB only because the application originally wrote
// it" (context/code-standards.md "Validation"):
//   - `ComponentSchemaVersion.fields`: a `ComponentAttributeFieldDefinition[]`
//   - `ManufacturerPartRevision.attributes`: a `ComponentAttributes` record
// Both are generic-shape validation only. Matching a part revision's
// `attributes` against its declared schema version's field list is deferred
// to the catalog CSV import (Unit 2.7) and matching (Unit 2.8) services.

import "server-only";
import { z } from "zod";
import {
  ComponentAttributeFieldListSchema,
  ComponentAttributesSchema,
} from "../../catalog";
import type { ComponentAttributeFieldDefinition, ComponentAttributes } from "../../catalog";
import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../client";
import type { DbClient } from "./db-client";
import { asUserId } from "./types";
import type {
  CatalogImportBatchId,
  CatalogImportBatchRecord,
  ComponentSchemaVersionId,
  ComponentSchemaVersionRecord,
  ComponentTypeId,
  ComponentTypeRecord,
  CreateCatalogImportBatchInput,
  CreateComponentSchemaVersionInput,
  CreateComponentTypeInput,
  CreateDatasheetAttachmentInput,
  CreateManufacturerInput,
  CreateManufacturerPartRevisionInput,
  DataQualityStatus,
  DatasheetAttachmentRecord,
  ManufacturerId,
  ManufacturerPartRevisionId,
  ManufacturerPartRevisionRecord,
  ManufacturerRecord,
  PartLifecycleStatus,
} from "./catalog-types";
import {
  asCatalogImportBatchId,
  asComponentSchemaVersionId,
  asComponentTypeId,
  asDatasheetAttachmentId,
  asManufacturerId,
  asManufacturerPartRevisionId,
} from "./catalog-types";

/** Machine-readable classification of a catalog-repository failure. */
export type CatalogRepositoryErrorCode = "invalid_input" | "invalid_snapshot";

/** Thrown by the catalog repository for validation failures. */
export class CatalogRepositoryError extends Error {
  readonly code: CatalogRepositoryErrorCode;

  constructor(message: string, code: CatalogRepositoryErrorCode = "invalid_input") {
    super(message);
    this.name = "CatalogRepositoryError";
    this.code = code;
  }
}

const nonEmpty = z.string().trim().min(1);

const lifecycleStatusSchema: z.ZodType<PartLifecycleStatus> = z.enum([
  "active",
  "not_recommended_for_new_design",
  "obsolete",
  "discontinued",
]);
const dataQualityStatusSchema: z.ZodType<DataQualityStatus> = z.enum([
  "valid",
  "warning",
  "error",
]);

const createManufacturerSchema = z.object({ name: nonEmpty });
const createComponentTypeSchema = z.object({
  id: nonEmpty,
  name: nonEmpty,
  description: nonEmpty.optional(),
});
const createComponentSchemaVersionSchema = z.object({
  componentTypeId: nonEmpty,
  version: nonEmpty,
});
const createCatalogImportBatchSchema = z.object({
  componentTypeId: nonEmpty,
  manufacturerId: nonEmpty,
  sourceLabel: nonEmpty,
  importedByUserId: nonEmpty.optional(),
});
const createManufacturerPartRevisionSchema = z.object({
  manufacturerId: nonEmpty,
  componentTypeId: nonEmpty,
  componentSchemaVersionId: nonEmpty,
  partNumber: nonEmpty,
  sourceRevision: nonEmpty,
  sourceLink: nonEmpty.optional(),
  lifecycleStatus: lifecycleStatusSchema.optional(),
  dataQualityStatus: dataQualityStatusSchema.optional(),
  validationErrors: z.array(z.string()).optional(),
  importBatchId: nonEmpty.optional(),
});
const createDatasheetAttachmentSchema = z.object({
  manufacturerPartRevisionId: nonEmpty,
  fileName: nonEmpty,
  mimeType: nonEmpty,
  sizeBytes: z.number().int().nonnegative(),
  checksum: nonEmpty,
  storageKey: nonEmpty,
  uploadSource: nonEmpty,
  uploadedByUserId: nonEmpty.optional(),
});

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new CatalogRepositoryError(
      `Invalid repository input: ${result.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")}`,
      "invalid_input",
    );
  }
  return result.data;
}

/**
 * Validates a `ComponentSchemaVersion.fields` payload. `code` is `invalid_input`
 * for an inbound write and `invalid_snapshot` when re-validating a stored row.
 */
function parseFields(
  raw: unknown,
  context: string,
  code: "invalid_input" | "invalid_snapshot",
): ComponentAttributeFieldDefinition[] {
  const result = ComponentAttributeFieldListSchema.safeParse(raw);
  if (!result.success) {
    throw new CatalogRepositoryError(
      `Invalid component attribute field list (${context}): ${result.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")}`,
      code,
    );
  }
  return result.data;
}

/**
 * Validates a `ManufacturerPartRevision.attributes` payload. `code` is
 * `invalid_input` for an inbound write and `invalid_snapshot` when
 * re-validating a stored row.
 */
function parseAttributes(
  raw: unknown,
  context: string,
  code: "invalid_input" | "invalid_snapshot",
): ComponentAttributes {
  const result = ComponentAttributesSchema.safeParse(raw);
  if (!result.success) {
    throw new CatalogRepositoryError(
      `Invalid component attributes (${context}): ${result.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")}`,
      code,
    );
  }
  return result.data;
}

// --- Row → record mappers ---------------------------------------------------

interface ManufacturerRow {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
interface ComponentTypeRow {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}
interface ComponentSchemaVersionRow {
  id: string;
  componentTypeId: string;
  version: string;
  fields: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}
interface CatalogImportBatchRow {
  id: string;
  componentTypeId: string;
  manufacturerId: string;
  sourceLabel: string;
  importedByUserId: string | null;
  createdAt: Date;
}
interface ManufacturerPartRevisionRow {
  id: string;
  manufacturerId: string;
  componentTypeId: string;
  componentSchemaVersionId: string;
  partNumber: string;
  sourceRevision: string;
  sourceLink: string | null;
  lifecycleStatus: PartLifecycleStatus | null;
  dataQualityStatus: DataQualityStatus;
  validationErrors: string[];
  attributes: Prisma.JsonValue;
  importBatchId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
interface DatasheetAttachmentRow {
  id: string;
  manufacturerPartRevisionId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  storageKey: string;
  uploadSource: string;
  uploadedByUserId: string | null;
  createdAt: Date;
}

function toManufacturerRecord(row: ManufacturerRow): ManufacturerRecord {
  return {
    id: asManufacturerId(row.id),
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
function toComponentTypeRecord(row: ComponentTypeRow): ComponentTypeRecord {
  return {
    id: asComponentTypeId(row.id),
    name: row.name,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
function toComponentSchemaVersionRecord(
  row: ComponentSchemaVersionRow,
): ComponentSchemaVersionRecord {
  return {
    id: asComponentSchemaVersionId(row.id),
    componentTypeId: asComponentTypeId(row.componentTypeId),
    version: row.version,
    // Re-validate the JSONB on read (never trust stored payloads).
    fields: parseFields(row.fields, `component_schema_version ${row.id}`, "invalid_snapshot"),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
function toCatalogImportBatchRecord(row: CatalogImportBatchRow): CatalogImportBatchRecord {
  return {
    id: asCatalogImportBatchId(row.id),
    componentTypeId: asComponentTypeId(row.componentTypeId),
    manufacturerId: asManufacturerId(row.manufacturerId),
    sourceLabel: row.sourceLabel,
    importedByUserId: row.importedByUserId === null ? null : asUserId(row.importedByUserId),
    createdAt: row.createdAt,
  };
}
function toManufacturerPartRevisionRecord(
  row: ManufacturerPartRevisionRow,
): ManufacturerPartRevisionRecord {
  return {
    id: asManufacturerPartRevisionId(row.id),
    manufacturerId: asManufacturerId(row.manufacturerId),
    componentTypeId: asComponentTypeId(row.componentTypeId),
    componentSchemaVersionId: asComponentSchemaVersionId(row.componentSchemaVersionId),
    partNumber: row.partNumber,
    sourceRevision: row.sourceRevision,
    sourceLink: row.sourceLink,
    lifecycleStatus: row.lifecycleStatus,
    dataQualityStatus: row.dataQualityStatus,
    validationErrors: row.validationErrors,
    // Re-validate the JSONB on read (never trust stored payloads).
    attributes: parseAttributes(
      row.attributes,
      `manufacturer_part_revision ${row.id}`,
      "invalid_snapshot",
    ),
    importBatchId: row.importBatchId === null ? null : asCatalogImportBatchId(row.importBatchId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
function toDatasheetAttachmentRecord(row: DatasheetAttachmentRow): DatasheetAttachmentRecord {
  return {
    id: asDatasheetAttachmentId(row.id),
    manufacturerPartRevisionId: asManufacturerPartRevisionId(row.manufacturerPartRevisionId),
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    checksum: row.checksum,
    storageKey: row.storageKey,
    uploadSource: row.uploadSource,
    uploadedByUserId: row.uploadedByUserId === null ? null : asUserId(row.uploadedByUserId),
    createdAt: row.createdAt,
  };
}

// --- Creates -----------------------------------------------------------------

/** Creates a `Manufacturer`. */
export async function createManufacturer(
  input: CreateManufacturerInput,
  client: DbClient = prisma,
): Promise<ManufacturerRecord> {
  const data = parse(createManufacturerSchema, input);
  const row = await client.manufacturer.create({ data });
  return toManufacturerRecord(row);
}

/** Creates a `ComponentType`. `input.id` is the caller-chosen stable slug. */
export async function createComponentType(
  input: CreateComponentTypeInput,
  client: DbClient = prisma,
): Promise<ComponentTypeRecord> {
  const data = parse(createComponentTypeSchema, input);
  const row = await client.componentType.create({
    data: { id: data.id, name: data.name, description: data.description ?? null },
  });
  return toComponentTypeRecord(row);
}

/**
 * Creates a `ComponentSchemaVersion`. `input.fields` is validated as a
 * well-formed, unique-key {@link ComponentAttributeFieldDefinition} list before
 * it is written.
 */
export async function createComponentSchemaVersion(
  input: CreateComponentSchemaVersionInput,
  client: DbClient = prisma,
): Promise<ComponentSchemaVersionRecord> {
  const data = parse(createComponentSchemaVersionSchema, input);
  const fields = parseFields(input.fields, "createComponentSchemaVersion", "invalid_input");
  const row = await client.componentSchemaVersion.create({
    data: {
      componentTypeId: data.componentTypeId,
      version: data.version,
      fields: fields as unknown as Prisma.InputJsonValue,
    },
  });
  return toComponentSchemaVersionRecord(row);
}

/** Creates a `CatalogImportBatch` recording provenance for a later import. */
export async function createCatalogImportBatch(
  input: CreateCatalogImportBatchInput,
  client: DbClient = prisma,
): Promise<CatalogImportBatchRecord> {
  const data = parse(createCatalogImportBatchSchema, input);
  const row = await client.catalogImportBatch.create({
    data: {
      componentTypeId: data.componentTypeId,
      manufacturerId: data.manufacturerId,
      sourceLabel: data.sourceLabel,
      importedByUserId: data.importedByUserId ?? null,
    },
  });
  return toCatalogImportBatchRecord(row);
}

/**
 * Creates a `ManufacturerPartRevision`. `input.attributes` is validated as a
 * well-formed {@link ComponentAttributes} payload before it is written — every
 * value must be a well-formed `EngineeringValue`, regardless of component type
 * (Unit 2.6 exit criterion: two component types with different attributes
 * coexist in this one generic column without a Prisma schema change).
 */
export async function createManufacturerPartRevision(
  input: CreateManufacturerPartRevisionInput,
  client: DbClient = prisma,
): Promise<ManufacturerPartRevisionRecord> {
  const data = parse(createManufacturerPartRevisionSchema, input);
  const attributes = parseAttributes(
    input.attributes,
    "createManufacturerPartRevision",
    "invalid_input",
  );
  const row = await client.manufacturerPartRevision.create({
    data: {
      manufacturerId: data.manufacturerId,
      componentTypeId: data.componentTypeId,
      componentSchemaVersionId: data.componentSchemaVersionId,
      partNumber: data.partNumber,
      sourceRevision: data.sourceRevision,
      sourceLink: data.sourceLink ?? null,
      lifecycleStatus: data.lifecycleStatus ?? null,
      dataQualityStatus: data.dataQualityStatus ?? "valid",
      validationErrors: [...(data.validationErrors ?? [])],
      attributes: attributes as unknown as Prisma.InputJsonValue,
      importBatchId: data.importBatchId ?? null,
    },
  });
  return toManufacturerPartRevisionRecord(row);
}

/** Creates a `DatasheetAttachment` for a manufacturer part revision. */
export async function createDatasheetAttachment(
  input: CreateDatasheetAttachmentInput,
  client: DbClient = prisma,
): Promise<DatasheetAttachmentRecord> {
  const data = parse(createDatasheetAttachmentSchema, input);
  const row = await client.datasheetAttachment.create({
    data: {
      manufacturerPartRevisionId: data.manufacturerPartRevisionId,
      fileName: data.fileName,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      checksum: data.checksum,
      storageKey: data.storageKey,
      uploadSource: data.uploadSource,
      uploadedByUserId: data.uploadedByUserId ?? null,
    },
  });
  return toDatasheetAttachmentRecord(row);
}

// --- Reads (shared reference data — no owner scope) --------------------------

/** Loads a `Manufacturer` by id, or `null` when it does not exist. */
export async function loadManufacturer(id: ManufacturerId): Promise<ManufacturerRecord | null> {
  const parsedId = parse(nonEmpty, id);
  const row = await prisma.manufacturer.findUnique({ where: { id: parsedId } });
  return row === null ? null : toManufacturerRecord(row);
}

/** Loads a `CatalogImportBatch` by id, or `null` when it does not exist. */
export async function loadCatalogImportBatch(
  id: CatalogImportBatchId,
): Promise<CatalogImportBatchRecord | null> {
  const parsedId = parse(nonEmpty, id);
  const row = await prisma.catalogImportBatch.findUnique({ where: { id: parsedId } });
  return row === null ? null : toCatalogImportBatchRecord(row);
}

/** Loads a `ComponentSchemaVersion` by id, or `null` when it does not exist. */
export async function loadComponentSchemaVersion(
  id: ComponentSchemaVersionId,
): Promise<ComponentSchemaVersionRecord | null> {
  const parsedId = parse(nonEmpty, id);
  const row = await prisma.componentSchemaVersion.findUnique({ where: { id: parsedId } });
  return row === null ? null : toComponentSchemaVersionRecord(row);
}

/** Loads a `ManufacturerPartRevision` by id, or `null` when it does not exist. */
export async function loadManufacturerPartRevision(
  id: ManufacturerPartRevisionId,
): Promise<ManufacturerPartRevisionRecord | null> {
  const parsedId = parse(nonEmpty, id);
  const row = await prisma.manufacturerPartRevision.findUnique({ where: { id: parsedId } });
  return row === null ? null : toManufacturerPartRevisionRecord(row);
}

/**
 * Lists a component type's part revisions (newest first). Demonstrates the
 * Unit 2.6 exit criterion in practice: revisions of different component types
 * round-trip through this same generic query regardless of their `attributes`
 * shape.
 */
export async function listManufacturerPartRevisionsByComponentType(
  componentTypeId: ComponentTypeId,
): Promise<ManufacturerPartRevisionRecord[]> {
  const id = parse(nonEmpty, componentTypeId);
  const rows = await prisma.manufacturerPartRevision.findMany({
    where: { componentTypeId: id },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toManufacturerPartRevisionRecord);
}
