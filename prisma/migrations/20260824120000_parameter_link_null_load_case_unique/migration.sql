-- Closes the nullable targetLoadCase unique-index gap (2026-08-20
-- release-readiness audit — see context/progress-tracker.md).
--
-- parameter_links' own @@unique([targetModuleInstanceId, targetParameterId,
-- targetLoadCase]) (prisma/schema.prisma) becomes toothless whenever
-- targetLoadCase is NULL: Postgres unique constraints treat every NULL as
-- distinct from every other NULL, so two confirmed links to the same
-- load-case-agnostic input port (the common case — most module input ports
-- carry no load case at all) can both be inserted at the DB level even
-- though the constraint exists. The application layer's own
-- createParameterLink already rejects this case with a typed
-- "duplicate_link" error for any caller going through it (see
-- lib/db/repositories/graph-repository.ts), but nothing below that layer
-- ever did — the same "defense in depth, not a replacement for the
-- service-level check" rationale as
-- 20260730180000_same_configuration_constraints.
--
-- Prisma's schema DSL has no way to express a filtered/partial unique index,
-- so this exists only here, not as a second `@@unique` in schema.prisma
-- (documented at the model's own @@unique line). The existing
-- @@unique([targetModuleInstanceId, targetParameterId, targetLoadCase])
-- stays as-is — it already does the right thing whenever targetLoadCase is
-- a real enum value; this index covers exactly the NULL case it misses.
--
-- Hand-authored (not `prisma migrate dev`-generated), the same as every
-- other schema-touching unit this project has shipped that could not run a
-- local shadow-database diff.

CREATE UNIQUE INDEX "parameter_links_target_null_load_case_key"
  ON "parameter_links" ("targetModuleInstanceId", "targetParameterId")
  WHERE "targetLoadCase" IS NULL;
