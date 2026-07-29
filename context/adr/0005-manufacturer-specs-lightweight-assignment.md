# ADR-0005: Manufacturer specifications plus lightweight component assignment

- Status: Accepted
- Date: 2026-07-27
- Related: `context/project-overview.md` "Manufacturer Part Data" and "Out
  of Scope for MVP"; `context/architecture.md` "`lib/catalog`" and
  `ComponentAssignment`; `context/code-standards.md` "Catalog";
  `context/implementation-map.md` Units 2.6–2.8

## Context

A machine BOM needs to trace every calculated component back to the
manufacturer part that was actually specified and the calculation run
that justified it (`context/project-overview.md` Success Criteria #5).
That requires *some* representation of manufacturer part data and *some*
way to record which part was chosen for which module instance.

A full procurement/PLM-style system would add a company-approved-part
master, supplier and pricing records, inventory, and a multi-step
approval workflow around every part selection. That scope is explicitly a
non-goal for the MVP (`context/project-overview.md` "Out of Scope for
MVP": "Procurement, inventory, pricing, or supplier management"; "Company-
approved-part governance") and would compete directly with the MVP's real
goal, which is replacing an Excel sizing workflow with traceable
engineering calculations — not replacing ERP/PLM.

## Decision

The MVP stores manufacturer part **specifications** and their source
provenance — manufacturer, part number, component type and schema
version, specification attributes and units, datasheet/catalog source and
revision, import batch and timestamp, lifecycle status when known, and
data-quality status (`context/project-overview.md` "Manufacturer Part
Data"). Component-specific attributes are versioned JSONB validated
against a component schema version, so two component types with
different attributes coexist without a Prisma schema change
(`context/implementation-map.md` Unit 2.6 exit criterion).

A single, intentionally lightweight `ComponentAssignment` links one
manufacturer part **or** a manual/custom part record to a module instance
and the calculation run that supports it
(`context/architecture.md` "`ComponentAssignment` is intentionally
lightweight. It records the assigned manufacturer/manual part, target
module or assembly, quantity, and justifying calculation run. It is not
an approval workflow."). This is required for BOM generation and stale
detection; it is explicitly not a company-approved-part master, a
supplier/procurement workflow, or a project-selection review process
(`context/code-standards.md` "Catalog": "The MVP has no company-approved-
part workflow").

## Consequences

- The BOM can identify the assigned part, its assignment source, and its
  justifying calculation run for every calculated component
  (`context/project-overview.md` Success Criteria #5) without building an
  approval/supplier/inventory subsystem first.
- Catalog matching stays a deterministic, transparent hard-filter-then-
  rank pipeline (`context/code-standards.md` "Catalog": "Hard constraints
  run before ranking"; "Ranking is deterministic and exposes score
  reasons") rather than a stateful selection workflow with review states.
- An assignment becomes stale exactly when its supporting calculation run
  becomes stale, via the same transactional stale-propagation mechanism
  used for runs (`context/architecture.md` Invariant #8), keeping catalog
  assignment consistent with the rest of the traceability chain without
  extra machinery.
- What this explicitly forecloses for the MVP: there is no company-
  approved-part status, no supplier or pricing data, no inventory
  tracking, and no purchasing workflow anywhere in the schema or UI
  (`context/project-overview.md` "Out of Scope for MVP"; `context/ui-
  context.md` "Catalog and Assignment UI": "The MVP does not expose
  approval, supplier, purchasing, or inventory states"). Adding any of
  those later is a scope decision that needs its own roadmap entry, not an
  incremental addition to `ComponentAssignment`.
- Manual/custom parts are a first-class alternative to a catalog match
  (not a fallback hack), because real designs sometimes use a part that
  is not yet in the catalog — the assignment schema accepts either a
  manufacturer part revision or an explicit manual/custom part payload.
