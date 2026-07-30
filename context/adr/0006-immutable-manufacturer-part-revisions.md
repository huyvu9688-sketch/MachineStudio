# ADR-0006: Immutable manufacturer part revisions

- Status: Accepted
- Date: 2026-07-30
- Related: `context/architecture.md` "Catalog and BOM" and "Invariants";
  `context/code-standards.md` "Catalog"; ADR-0002

## Context

Component assignments and immutable machine baselines retain the exact
`ManufacturerPartRevision` id used for a decision. The original catalog
upsert updated attributes, lifecycle, data-quality state, source link, and
import provenance in place when a later import reused the same manufacturer,
part number, and source revision. That made an already-released baseline mean
something different without changing its snapshot.

The project already requires released engineering behavior and calculation
runs to be immutable. Manufacturer specifications used by those calculations
need the same write-once guarantee.

## Decision

A manufacturer part revision is immutable after creation. An exact repeat
import returns the existing row; changed content under the same
`(manufacturer, part number, source revision)` identity is a conflict and must
be imported with a new source revision.

The first import batch remains the revision's provenance. Later exact-repeat
batches may record that an import ran, but do not re-parent the existing
revision. A database trigger protects the record even when a write bypasses
the application repository.

## Consequences

- Assignments and baselines that pin a part revision remain reproducible.
- Corrected manufacturer data requires an explicit new source-revision
  identity instead of a silent overwrite.
- Importing identical content remains idempotent and does not create duplicate
  part revisions.
- Import batches referenced by a part revision cannot be deleted; provenance
  is retained.
- Mapping changes that alter parsed engineering content surface as conflicts,
  making the correction visible instead of rewriting history.

## Notes

A conflict is reported per row, not as a failure of the whole import: the other
rows in the file are still valid manufacturer data, and the conflict is detected
before any write is issued, so the import transaction stays intact.
`importCatalog` returns the conflicting rows in its outcome report.
