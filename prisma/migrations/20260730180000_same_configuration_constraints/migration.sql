-- DB-level same-configuration constraints (design-risk follow-up, 2026-07-30
-- — see context/progress-tracker.md).
--
-- The 2026-07-30 hardening pass closed cross-configuration writes at the
-- service boundary: setParameterValue, confirmParameterLink, and
-- assignComponent now cross-check the target's real configuration before
-- writing. But the database itself would still accept a ParameterValue,
-- ParameterLink, or ComponentAssignment whose configurationId disagreed with
-- its assembly/module-instance target — nothing enforced consistency below
-- the application layer. This migration closes that gap with composite
-- foreign keys (defense in depth, not a replacement for the service-level
-- checks, which still produce a typed application error for a well-behaved
-- caller instead of a raw FK-violation).
--
-- module_instances gains a denormalized configurationId column (its
-- assembly's own configurationId, backfilled below), so parameter_values,
-- parameter_links, and component_assignments can composite-FK against it the
-- same way they already reference assemblies. Every relation this migration
-- touches is dropped and recreated as a composite FK under the identical
-- constraint name Prisma's own naming convention would generate (same
-- drop-then-recreate-under-the-same-name shape as
-- 20260730170000_immutable_part_revisions).
--
-- Postgres composite foreign keys use MATCH SIMPLE by default: when any
-- column in the key is NULL, the constraint is not checked. Every nullable
-- column here (parameter_values.assemblyId/moduleInstanceId,
-- parameter_links.sourceModuleInstanceId/sourceAssemblyId,
-- component_assignments.moduleInstanceId/assemblyId) already means "not
-- applicable" when null (machine-root scope, no linked source, etc.), so
-- this is the correct behavior, not a gap: the constraint fires exactly when
-- there is a real target to check consistency against.
--
-- Hand-authored (not `prisma migrate dev`-generated): this session's network
-- can reach binaries.prisma.sh (`prisma generate`/`validate` both ran
-- successfully against this exact schema), but there is still no local
-- PostgreSQL/Docker to run `prisma migrate dev`'s shadow-database diff
-- against, so this SQL is hand-written to match the shape Prisma's own
-- generator produces, the same as every other schema-touching unit this
-- project has shipped.

-- Denormalized column on module_instances, backfilled from the owning
-- assembly, then made required.
ALTER TABLE "module_instances" ADD COLUMN "configurationId" TEXT;

UPDATE "module_instances" AS mi
SET "configurationId" = a."configurationId"
FROM "assemblies" AS a
WHERE a."id" = mi."assemblyId";

ALTER TABLE "module_instances" ALTER COLUMN "configurationId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "module_instances_configurationId_idx" ON "module_instances"("configurationId");

-- Unique targets the composite foreign keys below reference. `id` alone is
-- already unique on both tables, so these add no new real constraint —
-- Postgres just requires a unique index on the referenced column set for a
-- foreign key to point at it.
CREATE UNIQUE INDEX "assemblies_id_configurationId_key" ON "assemblies"("id", "configurationId");
CREATE UNIQUE INDEX "module_instances_id_configurationId_key" ON "module_instances"("id", "configurationId");

-- module_instances.assembly -> composite FK
ALTER TABLE "module_instances" DROP CONSTRAINT "module_instances_assemblyId_fkey";
ALTER TABLE "module_instances" ADD CONSTRAINT "module_instances_assemblyId_fkey"
  FOREIGN KEY ("assemblyId", "configurationId") REFERENCES "assemblies"("id", "configurationId")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- parameter_values.assembly / .moduleInstance -> composite FKs
ALTER TABLE "parameter_values" DROP CONSTRAINT "parameter_values_assemblyId_fkey";
ALTER TABLE "parameter_values" ADD CONSTRAINT "parameter_values_assemblyId_fkey"
  FOREIGN KEY ("assemblyId", "configurationId") REFERENCES "assemblies"("id", "configurationId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "parameter_values" DROP CONSTRAINT "parameter_values_moduleInstanceId_fkey";
ALTER TABLE "parameter_values" ADD CONSTRAINT "parameter_values_moduleInstanceId_fkey"
  FOREIGN KEY ("moduleInstanceId", "configurationId") REFERENCES "module_instances"("id", "configurationId")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- parameter_links.targetModuleInstance / .sourceModuleInstance / .sourceAssembly -> composite FKs
ALTER TABLE "parameter_links" DROP CONSTRAINT "parameter_links_targetModuleInstanceId_fkey";
ALTER TABLE "parameter_links" ADD CONSTRAINT "parameter_links_targetModuleInstanceId_fkey"
  FOREIGN KEY ("targetModuleInstanceId", "configurationId") REFERENCES "module_instances"("id", "configurationId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "parameter_links" DROP CONSTRAINT "parameter_links_sourceModuleInstanceId_fkey";
ALTER TABLE "parameter_links" ADD CONSTRAINT "parameter_links_sourceModuleInstanceId_fkey"
  FOREIGN KEY ("sourceModuleInstanceId", "configurationId") REFERENCES "module_instances"("id", "configurationId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "parameter_links" DROP CONSTRAINT "parameter_links_sourceAssemblyId_fkey";
ALTER TABLE "parameter_links" ADD CONSTRAINT "parameter_links_sourceAssemblyId_fkey"
  FOREIGN KEY ("sourceAssemblyId", "configurationId") REFERENCES "assemblies"("id", "configurationId")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- component_assignments.moduleInstance / .assembly -> composite FKs
ALTER TABLE "component_assignments" DROP CONSTRAINT "component_assignments_moduleInstanceId_fkey";
ALTER TABLE "component_assignments" ADD CONSTRAINT "component_assignments_moduleInstanceId_fkey"
  FOREIGN KEY ("moduleInstanceId", "configurationId") REFERENCES "module_instances"("id", "configurationId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "component_assignments" DROP CONSTRAINT "component_assignments_assemblyId_fkey";
ALTER TABLE "component_assignments" ADD CONSTRAINT "component_assignments_assemblyId_fkey"
  FOREIGN KEY ("assemblyId", "configurationId") REFERENCES "assemblies"("id", "configurationId")
  ON DELETE CASCADE ON UPDATE CASCADE;
