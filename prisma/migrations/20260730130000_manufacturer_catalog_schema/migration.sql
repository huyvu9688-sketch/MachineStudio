-- CreateEnum
CREATE TYPE "PartLifecycleStatus" AS ENUM ('active', 'not_recommended_for_new_design', 'obsolete', 'discontinued');

-- CreateEnum
CREATE TYPE "DataQualityStatus" AS ENUM ('valid', 'warning', 'error');

-- CreateTable
CREATE TABLE "manufacturers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "manufacturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "component_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "component_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "component_schema_versions" (
    "id" TEXT NOT NULL,
    "componentTypeId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "component_schema_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_import_batches" (
    "id" TEXT NOT NULL,
    "componentTypeId" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "importedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturer_part_revisions" (
    "id" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "componentTypeId" TEXT NOT NULL,
    "componentSchemaVersionId" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "sourceRevision" TEXT NOT NULL,
    "sourceLink" TEXT,
    "lifecycleStatus" "PartLifecycleStatus",
    "dataQualityStatus" "DataQualityStatus" NOT NULL DEFAULT 'valid',
    "validationErrors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "attributes" JSONB NOT NULL,
    "importBatchId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "manufacturer_part_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datasheet_attachments" (
    "id" TEXT NOT NULL,
    "manufacturerPartRevisionId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadSource" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "datasheet_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "manufacturers_name_key" ON "manufacturers"("name");

-- CreateIndex
CREATE INDEX "component_schema_versions_componentTypeId_idx" ON "component_schema_versions"("componentTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "component_schema_versions_componentTypeId_version_key" ON "component_schema_versions"("componentTypeId", "version");

-- CreateIndex
CREATE INDEX "catalog_import_batches_componentTypeId_idx" ON "catalog_import_batches"("componentTypeId");

-- CreateIndex
CREATE INDEX "catalog_import_batches_manufacturerId_idx" ON "catalog_import_batches"("manufacturerId");

-- CreateIndex
CREATE INDEX "manufacturer_part_revisions_componentTypeId_idx" ON "manufacturer_part_revisions"("componentTypeId");

-- CreateIndex
CREATE INDEX "manufacturer_part_revisions_componentSchemaVersionId_idx" ON "manufacturer_part_revisions"("componentSchemaVersionId");

-- CreateIndex
CREATE INDEX "manufacturer_part_revisions_importBatchId_idx" ON "manufacturer_part_revisions"("importBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "manufacturer_part_revisions_manufacturerId_partNumber_sourc_key" ON "manufacturer_part_revisions"("manufacturerId", "partNumber", "sourceRevision");

-- CreateIndex
CREATE INDEX "datasheet_attachments_manufacturerPartRevisionId_idx" ON "datasheet_attachments"("manufacturerPartRevisionId");

-- AddForeignKey
ALTER TABLE "component_schema_versions" ADD CONSTRAINT "component_schema_versions_componentTypeId_fkey" FOREIGN KEY ("componentTypeId") REFERENCES "component_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_import_batches" ADD CONSTRAINT "catalog_import_batches_componentTypeId_fkey" FOREIGN KEY ("componentTypeId") REFERENCES "component_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_import_batches" ADD CONSTRAINT "catalog_import_batches_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_part_revisions" ADD CONSTRAINT "manufacturer_part_revisions_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_part_revisions" ADD CONSTRAINT "manufacturer_part_revisions_componentTypeId_fkey" FOREIGN KEY ("componentTypeId") REFERENCES "component_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_part_revisions" ADD CONSTRAINT "manufacturer_part_revisions_componentSchemaVersionId_fkey" FOREIGN KEY ("componentSchemaVersionId") REFERENCES "component_schema_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_part_revisions" ADD CONSTRAINT "manufacturer_part_revisions_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "catalog_import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datasheet_attachments" ADD CONSTRAINT "datasheet_attachments_manufacturerPartRevisionId_fkey" FOREIGN KEY ("manufacturerPartRevisionId") REFERENCES "manufacturer_part_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
