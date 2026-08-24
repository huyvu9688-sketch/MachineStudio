# Pneumatic Cylinder Sizing — Load-In, Real-Catalog-Match-Out

## Decision

Build a new, self-contained module, `pneumatic-cylinder-sizing@0.1.0`,
category `cylinder-sizing.pneumatic`, following the full New Module Workflow
(`context/ai-workflow-rules.md`) as one unit of work, full scope in the first
release (not split across two versions). It takes application/load inputs
(load mass, incline angle, friction coefficient, an optional process force,
operating pressure, piston speed, cushion type, mounting style) and outputs a
required specification, evaluated directly against a real SMC CM2/CA2
catalog to produce a ranked list of candidate models — not a raw bore number.
`pneumatic-cylinder@0.1.0` (the existing "check a given cylinder" module) is
released, immutable, and stays exactly as it is; it is hidden from the
default "Add module" picker, the same treatment the seven old linear-axis
discipline modules already received under ADR-0011.

This is also the first module in this project to wire a real
`CatalogAdapter` end to end: no released module today declares one, and the
piece that turns a module's `requiredSpec()` into real hard-filter
`MatchCriterion`s (comparison operators: `gte`/`lte`/`eq`) was deliberately
deferred in `lib/application/catalogs/load-component-assignment-view.ts` to
"whichever later unit first wires a real production module's catalog
adapter to this engine." This module is that unit.

## Context

The founder's original ask: change the pneumatic-cylinder module so the
engineer enters *application* specs (load mass, travel speed) instead of
*cylinder* specs (bore, rod diameter), and have the tool suggest an
appropriate real SMC cylinder model — mirroring how the Motor Sizing Tool
family (ADR-0011) already takes load/motion inputs and outputs required
specs, self-contained, with no cross-module link. `pneumatic-cylinder@0.1.0`
cannot be edited toward this in place (it is released and immutable), and
ADR-0011 already rejected combining "verify a given part" and "size from
load" into one module via an enum, so this has to be a new, separate module,
the same way the Motor Sizing Tool modules sit alongside (not instead of) the
seven old linear-axis discipline modules.

Investigating the request surfaced two things not obvious from the ask
itself:

1. Neither of `pneumatic-cylinder@0.1.0`'s own two sources (Milwaukee
   Cylinder, SMC) give a formula that computes required force from load mass
   and travel speed directly. Pneumatic force sizing is driven by load mass
   x orientation (Milwaukee's load-type percentages: friction for sliding,
   gravity for lifting), with SMC's own `eta` load-factor table already
   providing an orientation-aware safety margin. Travel/piston speed feeds
   only the existing cushion (kinetic-energy) check, unchanged.
2. This project's own generic catalog-matching infrastructure
   (`lib/catalog/`: `ComponentSchemaVersion`, CSV import, `rankCandidates`)
   already exists and is generic and tested, but has never been exercised by
   a real module — the `requiredSpec -> MatchCriterion` mapping is a real,
   scoped, previously-identified gap, not a design decision invented here.

A cross-cutting workspace-width UI change was raised in the same request
(making every module's input workspace as wide as
`belt-pulley-drive-motor-sizing`'s bento layout) but is explicitly out of
scope for this design — the founder chose to sequence the cylinder-sizing
work first, and this is a materially different generic-UI change, not a
module change (`code-standards.md` "Split Rules": "A new module and a new
generic UI pattern" should be split). It gets its own design once this one
ships.

## Decisions Made With the Founder (2026-08-24)

- Old `pneumatic-cylinder@0.1.0` is hidden from the default "Add module"
  picker once this module ships (kept registered, immutable, reachable the
  way the seven old linear-axis modules still are).
- Target SMC series: **CM2/CA2 (standard)**, ISO 6431/VDMA-compatible. Other
  series are out of scope for `0.1.0`.
- Force basis includes an **optional process force** input in addition to
  the mass-derived force, for clamping/pressing applications where the
  cylinder does more than just move a mass.
- Both horizontal and vertical (and anything between) installations are
  in scope from the start, via a continuous `incline_angle` input — not a
  two-way enum — matching the formula shape the Motor Sizing Tool family
  (rack-pinion, belt-pulley) already established:
  `F_required = process_force + load_mass * gravity * (sin(incline_angle) +
  friction_coefficient * cos(incline_angle))`.
- Catalog data: pull SMC's own published CM2/CA2 catalog tables as the seed
  import (this session's job), then the founder reviews/trims it to the real
  working set. No self-serve catalog-upload UI is being built for this —
  the import is a one-time seed operation using the existing generic CSV
  import path (`lib/catalog/csv-import.ts`).
- Match presentation: a **ranked list** of candidates that pass all hard
  filters (force, cushion, buckling), tightest fit first, founder picks —
  reusing the existing `ComponentAssignmentPanel` UI exactly as built, not a
  single auto-selected "the answer" recommendation.
- Full scope in one release (chosen over deferring catalog matching to a
  `0.2.0`) — the load-resolution and catalog-matching halves are one
  coherent Stage 3 compute path, not an independent system boundary worth
  splitting across releases.

## Module Shape

### 1. New parameter group: `pneumatic_sizing.*`

Mints its own group rather than reusing `pneumatic.*` (the existing
check-a-given-cylinder group) — the same "deliberately not the same
parameter ID even for the same physical quantity" convention every Motor
Sizing module already follows (e.g. `motor_sizing.direct_drive_conveyor.
belt_friction_coefficient` instead of reusing `motion.axis.
friction_coefficient`), since these are a different direction (computed
catalog-matching input vs. engineer-supplied check input) even where the
underlying physical quantity looks the same.

New parameters (exact IDs, units, and required/default status are a Stage 2
decision, not fixed here): `load_mass`, `incline_angle`, `friction_
coefficient`, `process_force` (optional), `operating_pressure`, `max_piston_
speed`, `cushion_type`, `mounting_style`, plus `load_factor` (SMC's `eta`)
and `buckling_safety_factor` carried forward from `pneumatic-cylinder@0.1.0`'s
own precedent — required, no built-in default, for the same reason (no
source gives a single settled value for either).

### 2. Compute flow

**Load resolution** (new, reproduced physics — not imported from any other
module, per ADR-0011's "Reuse policy"):

```
F_required = process_force + load_mass * gravity *
             (sin(incline_angle) + friction_coefficient * cos(incline_angle))
```

Extend/return direction handling (which stroke carries the full load-mass
term vs. which one gets gravity assistance) reproduces whatever convention
`rack-pinion-motor-sizing`/`belt-pulley-drive-motor-sizing` already
established for their own forward/return move pair — confirmed against
their actual `math.ts` at Stage 1/3, not re-derived from scratch here.

**Candidate evaluation** (per real catalog row, not a closed-form inverse):
for each SMC CM2/CA2 catalog candidate, evaluate `pneumatic-cylinder@0.1.0`'s
own already-validated formulas, reproduced independently:

- Theoretical force (`F = eta * A * P`, SMC formula (1)/(2)) vs.
  `F_required`, extend and retract sides.
- Cushion kinetic energy (`E = (m/2) * V^2`, SMC formula (7)) vs. that
  candidate's own catalog allowable-energy figure, by cushion type.
- Buckling (`Fk = factor * pi^2 * E_steel * J / L^2`, the same generic Euler
  column formula and end-fixity cases 0.1.0's own kernel already
  established) vs. that candidate's own rod diameter and the requested
  stroke.

No new, unsourced "solve for minimum bore" inverse formula is invented —
evaluating real catalog rows directly avoids needing one, and keeps every
formula traceable to the same sources `pneumatic-cylinder@0.1.0` already
cites. The buckling evidence gap `0.1.0` already discloses (no
pneumatic-specific closed-form source, Euler shape confirmed only by a
non-pneumatic hydraulic-industry reference) carries forward honestly here
too, not silently resolved.

**Output**: a required-specification record (`CatalogAdapter.requiredSpec()`)
carrying required force (extend/retract), the cushion energy limit implied
by the load, and the stroke the buckling check needs — plus, for direct
in-module display, the full pass/fail detail per catalog candidate the same
way `pneumatic-cylinder@0.1.0`'s own checks are reported today.

### 3. Catalog schema and seed data

New `ComponentSchemaVersion`, component type `pneumatic_cylinder`: bore
diameter, rod diameter, stroke range (min/max), cushion type(s) supported
and their allowable kinetic energy, mounting styles supported, series/model
number. Seeded via the existing generic CSV import
(`lib/catalog/csv-import.ts`, `lib/application/catalogs/import-catalog.ts`)
from SMC's own published CM2/CA2 catalog tables, fetched the same way
`pneumatic-cylinder@0.1.0`'s own Stage 1/3 research already reached
`smcworld.com` (browser User-Agent workaround for the local TLS-interception
proxy — not an SMC-side block, see `context/progress-tracker.md`
"Environment notes"). The founder reviews and trims the seeded set to their
real working models after import; this is not a self-serve upload UI.

### 4. Closing the `requiredSpec -> MatchCriterion` gap

`load-component-assignment-view.ts` currently returns `matchingAvailable:
false` for every module (none declares a `catalogAdapter`, and even if one
did, the operator-mapping step is unbuilt). This module adds the first real
`componentType === "pneumatic_cylinder"`-specific mapping: which
`requiredSpec()` keys become `gte` (bore/rod capacity floors), which become
`lte` (a size or energy ceiling), following `MatchCriterion`'s existing
shape (`lib/catalog/matching-types.ts`). This is scoped, anticipated
application-layer judgment, not a change to `lib/catalog`'s generic engine
or the `CatalogAdapter` SDK contract itself (both stay exactly as released).
Once wired, `ComponentAssignmentPanel` (ranked list, rejection reasons,
assign action) needs no changes — it already renders whatever
`loadComponentAssignmentView` gives it.

### 5. Generic UI

Standard `ModuleUiSchema`/report schema, same as every other module — no
custom UI. The workspace-width question raised in the original request is
explicitly deferred to its own follow-on design (see "Out of Scope").

## Validation Plan

- Load-resolution formula: reproduces already-sourced physics (the same
  formula shape used and implicitly validated by the rack-pinion/belt-pulley
  motor-sizing modules) — no new source needed for this half.
- Force/cushion/buckling formulas: identical to `pneumatic-cylinder@0.1.0`'s
  own already-validated formulas (SMC's own worked examples, the Norgren
  M/1000 independent benchmark for theoretical force and air consumption) —
  no new independent-benchmark work needed for those; cited by reference,
  not re-derived.
- New to this module: reference-example reproduction of at least one real
  SMC CM2/CA2 catalog bore selection end to end through the real compute
  path (load mass + orientation -> required force -> a specific real model
  clearing the check), and boundary/invalid-input tests for the new
  `pneumatic_sizing.*` inputs.
- The buckling evidence gap `pneumatic-cylinder@0.1.0` already discloses
  stays open here too — not silently fixed by this module.

## Open Questions (for Stage 1/2, not resolved here)

- Exact new parameter IDs, units, and required/default status under
  `pneumatic_sizing.*`.
- The precise extend/return sign convention, confirmed against
  rack-pinion-motor-sizing's/belt-pulley-drive-motor-sizing's own `math.ts`
  rather than re-derived.
- Exact `ComponentSchemaVersion` field list for `pneumatic_cylinder`,
  finalized once SMC's own CM2/CA2 catalog tables are actually fetched.
- Exact `MatchCriterion` operator assignment per `requiredSpec()` key.
- Registry version number (next available after the current released
  version at implementation time).

## Out of Scope

- The workspace-width/bento-layout change requested alongside this ask —
  separate design, separate work unit, sequenced after this module ships.
- Any change to `pneumatic-cylinder@0.1.0`'s own formulas, ports, or
  validation record (immutable, untouched).
- SMC series other than CM2/CA2.
- A self-serve catalog CSV upload UI — the seed import is a one-time
  operation for this release.
- Lateral (side) rod-end load — out of scope for the same reason it is out
  of scope in `pneumatic-cylinder@0.1.0` (no reproducible formula found,
  graphs only).
