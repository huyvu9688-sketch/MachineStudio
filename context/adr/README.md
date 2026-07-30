# Architecture Decision Records (Unit 0.5)

This directory records cross-cutting or difficult-to-reverse technical
decisions for MachineStudio, per `context/ai-workflow-rules.md` ("Record
cross-cutting or difficult-to-reverse decisions as ADRs") and
`context/roadmap.md` Phase 0A ("Create architecture decision records for
unresolved technical choices").

An ADR is not a design proposal. It documents a decision that has already
been made, the context that produced it, and the consequences the team
accepted. Product scope and roadmap decisions that are not architectural
stay in `context/progress-tracker.md` ("Resolved Product Decisions")
unless they also fix a technical boundary — in that case both are updated
and the ADR is the durable record.

## When to write an ADR

Write a new ADR when a decision:

- Establishes or changes a system boundary in `context/architecture.md`
- Fixes a data model or storage choice that is expensive to reverse
- Introduces or changes a core contract (for example the `ModulePackage`
  SDK boundary) that modules, the generic UI, or persistence depend on
- Is explicitly required elsewhere as an ADR — for example
  `context/code-standards.md` requires an ADR before a module ships a
  custom UI component instead of the generic schema-driven UI
- Would otherwise be re-litigated from scratch by a future contributor
  without the original reasoning

Do not write an ADR for routine implementation choices already covered by
`context/code-standards.md`, ordinary module work covered by the
per-module validation record in `validation/`, or reversible decisions
better tracked as an open question in `context/progress-tracker.md`.

## Process

1. Copy `TEMPLATE.md` to `NNNN-short-title.md`, where `NNNN` is the next
   four-digit sequence number. Numbers are never reused, even if a later
   ADR supersedes an earlier one.
2. Fill in every section. Do not invent rationale that was not actually
   used to make the decision — pull it from the specification that
   motivated it (`context/project-overview.md`, `context/architecture.md`,
   `context/roadmap.md`) or from the discussion recorded in
   `context/progress-tracker.md`.
3. Set `Status` to `Accepted` once the decision is in effect. Use
   `Proposed` only while a decision is still open (an open ADR should also
   have a matching entry in `context/progress-tracker.md` "Open
   Questions").
4. List the record in the index below.
5. Commit the ADR together with, or immediately after, the change it
   documents.

## Immutability

An accepted ADR is not edited to reflect a later reversal. Its content
describes the decision and reasoning at the time it was made — the same
immutability rule the codebase applies to released parameters and source
revisions (`context/code-standards.md` "Canonical Parameters", "Standards
and Sources"). When circumstances change:

- Minor clarifications that do not change the decision may be appended
  under a dated note.
- A decision reversal or replacement is written as a **new** ADR that
  states, in its Context section, which ADR it supersedes. The superseded
  ADR gets a one-line `Status: Superseded by ADR-NNNN` update; its body is
  otherwise left intact as the historical record.

## Index

| ID | Title | Status |
| --- | --- | --- |
| [ADR-0001](0001-modular-typescript-monolith.md) | Modular TypeScript monolith for the MVP | Accepted |
| [ADR-0002](0002-immutable-calculation-runs.md) | Immutable calculation runs and baselines | Accepted |
| [ADR-0003](0003-versioned-module-package-contract.md) | Versioned module package contract (`ModulePackage` SDK boundary) | Accepted |
| [ADR-0004](0004-canonical-si-storage-with-display-units.md) | Canonical SI storage with flexible engineering display units | Accepted |
| [ADR-0005](0005-manufacturer-specs-lightweight-assignment.md) | Manufacturer specifications plus lightweight component assignment | Accepted |
| [ADR-0006](0006-immutable-manufacturer-part-revisions.md) | Immutable manufacturer part revisions | Accepted |
