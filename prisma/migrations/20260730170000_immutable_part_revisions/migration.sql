-- Manufacturer part revisions become write-once engineering records (ADR-0006).
--
-- Component assignments and released machine baselines pin an exact
-- `manufacturer_part_revisions` row, so rewriting that row's attributes,
-- lifecycle, data-quality state, source link, or provenance would change what an
-- already-approved engineering decision means. Corrected manufacturer data is
-- imported under a new source revision instead; an exact repeat import reuses
-- the existing row.
--
-- Hand-authored (not `prisma migrate dev`-generated), matching the SQL shape of
-- the existing migrations in this directory. The trigger mirrors
-- `calculation_runs_immutable_guard` (20260729153159_immutable_runs), but here
-- no column is mutable at all except `updatedAt`, which Prisma's `@updatedAt`
-- writes on any UPDATE — there is no stale-state equivalent to allow through.

-- Provenance can no longer be detached: an import batch referenced as the
-- original provenance of a part revision cannot be deleted.
ALTER TABLE "manufacturer_part_revisions"
  DROP CONSTRAINT "manufacturer_part_revisions_importBatchId_fkey";

ALTER TABLE "manufacturer_part_revisions"
  ADD CONSTRAINT "manufacturer_part_revisions_importBatchId_fkey"
  FOREIGN KEY ("importBatchId") REFERENCES "catalog_import_batches"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "manufacturer_part_revisions_immutable_guard"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."manufacturerId" IS DISTINCT FROM OLD."manufacturerId"
     OR NEW."componentTypeId" IS DISTINCT FROM OLD."componentTypeId"
     OR NEW."componentSchemaVersionId" IS DISTINCT FROM OLD."componentSchemaVersionId"
     OR NEW."partNumber" IS DISTINCT FROM OLD."partNumber"
     OR NEW."sourceRevision" IS DISTINCT FROM OLD."sourceRevision"
     OR NEW."sourceLink" IS DISTINCT FROM OLD."sourceLink"
     OR NEW."lifecycleStatus" IS DISTINCT FROM OLD."lifecycleStatus"
     OR NEW."dataQualityStatus" IS DISTINCT FROM OLD."dataQualityStatus"
     OR NEW."validationErrors" IS DISTINCT FROM OLD."validationErrors"
     OR NEW."attributes" IS DISTINCT FROM OLD."attributes"
     OR NEW."importBatchId" IS DISTINCT FROM OLD."importBatchId"
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN
    RAISE EXCEPTION 'manufacturer_part_revisions is immutable (part revision %); import corrected data under a new source revision', OLD."id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "manufacturer_part_revisions_immutable_guard"
  BEFORE UPDATE ON "manufacturer_part_revisions"
  FOR EACH ROW EXECUTE FUNCTION "manufacturer_part_revisions_immutable_guard"();
