# ADR-0008: BOM is a generated view, not a stored `BomItem` table

- Status: Accepted
- Date: 2026-08-11
- Related: `context/architecture.md` "Catalog and BOM" and "Reports" (Stack
  table: "HTML + print CSS | Calculation packages and BOM output");
  `context/implementation-map.md` Unit 5.1; `context/roadmap.md` Phase 1D;
  `context/ui-context.md` "Reports and Baselines" (the frozen-BOM-quantities
  note); `context/archive/history.md`'s Unit 2.9 part 2 baseline-snapshot
  entry ("BOM scope decision"); ADR-0005 (manufacturer specs plus
  lightweight component assignment)

## Context

`context/architecture.md`'s "Catalog and BOM" domain-model list names
`BomItem` alongside real Prisma models (`ComponentType`, `Manufacturer`,
`ManufacturerPartRevision`, `ComponentAssignment`, ...), implying a
dedicated persisted table. By the time Unit 5.1 ("BOM model and generator")
was actually reached, no such table existed, and two other decisions had
already been made around it without one:

- ADR-0005 already decided `ComponentAssignment` is "required for BOM
  generation and stale detection" — it already carries everything one BOM
  line needs: target (module instance or assembly), quantity, part identity
  (catalog revision or manual details), and the justifying calculation run.
- The Unit 2.9 part 2 baseline-snapshot work (`context/archive/history.md`)
  explicitly declined to invent a `BomItem` shape ahead of this unit,
  freezing `componentAssignments` into `MachineBaselineSnapshot` instead
  and recording: "a literal frozen `BomItem[]` is deferred to Unit 5.1,
  which can extend the snapshot (a new format version) once that model
  exists." `context/ui-context.md`'s baseline-comparison note repeats the
  same deferral.
- `project-overview.md`'s own Core User Flows generates the BOM (step 8)
  *before* the user creates a baseline (step 9) — a live, read-time
  operation over already-persisted state, not something authored and
  stored in its own right ahead of that.

So the fork this ADR resolves: does Unit 5.1 introduce a new
`ComponentAssignment`-duplicating Prisma table (`BomItem`) to persist BOM
line items, or generate the BOM view directly from data that is already
fully persisted?

## Decision

**`BomItem` is a pure, computed TypeScript shape — one flattened BOM
line — not a Prisma model.** No `bom_items` table, no migration. A
configuration's BOM is generated at read time by walking its assembly tree
(already modeled: `Assembly` parent/child) and attaching each assembly's
and module instance's `ComponentAssignment` rows as line items, resolving
each into a `BomItem` (assembly path, description, part identity, quantity,
source, and calculation-run reference) via the application layer
(`lib/application/reports/`), the same "assemble a read view from live
repositories" pattern `loadWorkspaceView`/`loadBaselineWorkspaceView`
already use.

This does **not** cover freezing a BOM into an immutable baseline. That
stays exactly where the Unit 2.9 part 2 decision left it: a baseline
freezes `componentAssignments`, and a future baseline-snapshot format
version can embed a frozen `BomItem[]`, generated from this unit's own
`BomItem` shape, once a real need for point-in-time BOM comparison (as
opposed to point-in-time component-assignment comparison) is demonstrated.
That is a separate, later decision — this ADR only resolves the *live* BOM
generator's own storage question.

Explicitly rejected alternative: a new `BomItem` Prisma model populated
either (a) redundantly alongside `ComponentAssignment` (two sources of
truth for the same quantity/part-reference data, with no defined
reconciliation rule), or (b) as the *sole* record of a BOM line, replacing
`ComponentAssignment`'s own quantity/part fields (which would break Unit
2.8's existing stale-propagation and assignment-panel UI, both built
directly against `ComponentAssignment`). Neither was pursued.

## Consequences

- No migration, no new persistence boundary, no new stale-propagation
  rule: a BOM line is exactly as current as the `ComponentAssignment` it is
  generated from, with no separate copy to keep in sync or mark stale.
- `context/architecture.md`'s "Catalog and BOM" list is corrected: `BomItem`
  is described as a computed shape, not a stored entity, alongside the
  Prisma models it used to sit among undistinguished.
- A manual/custom BOM line (e.g. hardware with no calculation behind it) is
  exactly a `ComponentAssignment` with `partSource: "manual"` and
  `targetKind: "assembly"` — no separate "manual BOM item" concept is
  introduced; Unit 5.1 does not add a new way to author a BOM line outside
  the existing assignment flow (Unit 3.6).
- CSV export and the HTML print report (`context/architecture.md`'s
  "Reports" stack row) both render from the same generated `BomItem[]`,
  never a stored table — reproducing a report from a stored, immutable
  baseline snapshot instead follows the existing `CalculationRun`/
  `MachineBaselineSnapshot` pattern (ADR-0002), not this one.
- Follow-on work this implies, not done here: extending
  `MachineBaselineSnapshot` (`lib/configuration`) with a frozen `BomItem[]`
  and bumping its format version, once a baseline needs to reproduce its
  own BOM rather than only its component assignments.
