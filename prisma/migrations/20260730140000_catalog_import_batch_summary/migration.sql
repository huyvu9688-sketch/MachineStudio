-- AlterTable
ALTER TABLE "catalog_import_batches" ADD COLUMN     "importMappingId" TEXT,
ADD COLUMN     "importMappingVersion" TEXT,
ADD COLUMN     "totalRowCount" INTEGER,
ADD COLUMN     "validRowCount" INTEGER,
ADD COLUMN     "invalidRowCount" INTEGER;
