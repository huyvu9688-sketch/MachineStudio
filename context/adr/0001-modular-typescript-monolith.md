# ADR-0001: Modular TypeScript monolith for the MVP

- Status: Accepted
- Date: 2026-07-27
- Related: `context/architecture.md` "Stack" and "System Boundaries";
  `context/roadmap.md` Phase 0B "Repository and Quality Foundations"

## Context

MachineStudio's engineering core is a set of deterministic, closed-form
calculation modules (motion profile, ball screw, linear guide, coupling,
support bearings, servo drive train) coordinated by a generic engine,
parameter graph, and guided workflow layer, all backed by a relational
project/run/catalog data model. The product also needs a database-backed
web UI, authentication, manufacturer catalog import, and report
rendering.

A reasonable alternative for a numerically heavy engineering product is
to split calculation execution into a separate service (for example a
Python solver process) from day one, on the assumption that engineering
computation and a web application have different scaling and language
needs. That split adds a service boundary, a wire protocol, deployment
complexity, and cross-language contract duplication before the product
has proven the MVP linear-axis workflow end to end.

## Decision

Build MachineStudio as a single Next.js App Router TypeScript application
(`context/architecture.md` "Stack") — a **modular monolith**, not a
distributed system. Internal domain boundaries are explicit and enforced
by import discipline rather than network calls: `lib/engine` (generic
calculation infrastructure), `lib/modules` (versioned calculation
packages), `lib/workflows` (guided workflow coordination), `lib/
application` (use-case/transaction orchestration), `lib/catalog`, `lib/
requirements`, `lib/configuration`, `lib/standards`, `lib/reports`, `lib/
audit`, and `lib/db` (the only Prisma-importing boundary), per
`context/architecture.md` "Target File Structure" and "System
Boundaries".

This decision does not rule out extracting a specialized solver service
later. It requires that the boundary be kept clean enough to do so
without changing module contracts or stored run snapshots
(`context/architecture.md` "Stack": "Domain boundaries must remain
explicit so a specialized solver service can be introduced later without
changing module contracts or stored run snapshots").

## Consequences

- Single build, single CI pipeline, and a single deployable artifact for
  the MVP — no service-to-service auth, versioning, or network failure
  modes to design around before the core workflow is proven.
- Module compute functions stay pure and I/O-free by rule
  (`context/code-standards.md` "Engine purity" invariant), which is what
  keeps a future extraction possible; the constraint is enforced today by
  code review and the module conformance suite's import-boundary check
  (`lib/engine/module-sdk`), not by a process boundary.
- The generic engine (`lib/engine`) imports nothing from `app`, `lib/db`,
  network clients, or authentication, so the calculation core has no
  built-in dependency on the monolith's other parts.
- If a later phase needs a different execution environment (heavier
  numerical methods, a language better suited to a particular solver), the
  cost is a new extraction unit, not a rewrite of module contracts or a
  migration of stored calculation runs.
- Rejected alternative: a separate calculation/solver service at MVP
  start. Rejected because Phase 1 modules are deterministic closed-form
  formulas that do not require a different runtime, and a network
  boundary before the workflow is proven would add operational cost
  without a corresponding benefit.
