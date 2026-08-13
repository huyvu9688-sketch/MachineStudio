-- Module instance archiving (module-instance-management design,
-- docs/superpowers/specs/2026-08-13-module-instance-management-design.md).
--
-- Archiving hides a module instance from the machine navigator without
-- deleting anything -- parameter values, parameter links, and calculation
-- run history for the instance are left completely untouched, respecting
-- the "calculation runs ... are immutable" invariant (CLAUDE.md) literally:
-- removal must not delete run rows, not even indirectly through the
-- instance that produced them.
--
-- Hand-authored (not `prisma migrate dev`-generated): this project has no
-- local PostgreSQL/Docker to run `prisma migrate dev`'s shadow-database
-- diff against, so this SQL is hand-written to match the shape Prisma's own
-- generator produces for a single nullable-column addition, the same
-- constraint recorded in
-- 20260730180000_same_configuration_constraints/migration.sql.

ALTER TABLE "module_instances" ADD COLUMN "archivedAt" TIMESTAMPTZ(6);
