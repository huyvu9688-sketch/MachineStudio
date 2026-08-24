# Pneumatic Cylinder Sizing Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and release `pneumatic-cylinder-sizing@0.1.0` — a new, self-contained module that takes application/load inputs (mass, incline, friction, optional process force, pressure, speed, cushion type, mounting style, required stroke) and outputs a required specification evaluated against a real seeded SMC CM2/CA2 catalog to produce a ranked list of candidate cylinder models. This also wires the project's first real `CatalogAdapter` end to end, closing the `requiredSpec -> MatchCriterion` gap `lib/application/catalogs/load-component-assignment-view.ts` has deferred since Unit 2.8.

**Architecture:** Follows this repo's six-stage New Module Workflow (`context/ai-workflow-rules.md`). The module's own `compute()` resolves required extend/retract force (reproducing `ball-screw-motor-sizing@0.2.0`'s forward/return gravity-sign convention, the real precedent — not `rack-pinion`/`belt-pulley-drive-motor-sizing`, which have no directional split at all), required kinetic energy, and echoes the catalog-relevant resolved inputs as outputs (`CatalogAdapter.requiredSpec()` only sees `ModuleComputation.outputs`). Catalog matching is a **hybrid**: the generic `rankCandidates`/`MatchCriterion` engine (`lib/catalog`) handles criteria that are true single-attribute comparisons (stroke range, mounting style, cushion energy); a new application-layer evaluator (`lib/application/catalogs/pneumatic-cylinder-matching.ts`) handles force-capacity and buckling, which need a real per-candidate formula (bore/rod-dependent), not a static threshold — the existing `MatchCriterion` contract cannot express that, and this plan does not change `lib/catalog`'s generic engine or the `CatalogAdapter` SDK contract to make it. `pneumatic-cylinder@0.1.0` (the existing "check a given cylinder" module) stays released, immutable, and untouched; it is hidden from the default "Add module" picker once this module ships.

**Tech Stack:** TypeScript strict, Zod, Vitest, Next.js Server Components/Actions, Prisma/PostgreSQL (catalog seed only — the module's own `compute()` stays DB-free).

---

## Before you start: three real corrections to the design doc

The design doc (`docs/superpowers/specs/2026-08-24-pneumatic-cylinder-sizing-design.md`) is the starting brief, but implementation research (this session) found three things it got wrong or left underspecified. This plan implements the corrected version; Task 1 records these corrections in the module's own Stage 1 spec so they are not silently papered over (this project's own established culture — see e.g. `pneumatic-cylinder@0.1.0`'s own "two real evidence gaps" pattern).

1. **Wrong precedent module for the forward/return sign convention.** The design doc says to confirm the extend/retract gravity-sign convention against `rack-pinion-motor-sizing`'s and `belt-pulley-drive-motor-sizing`'s own `math.ts`. Neither module has a forward/return split at all — each has exactly one `resolveDriveForce`, called once, always in the conservative "gravity-opposing" direction. The real precedent is `ball-screw-motor-sizing@0.2.0` (`lib/modules/ball-screw-motor-sizing/0.2.0/math.ts`, `resolveDriveForce`, a `MoveDirection = "forward" | "return"` type): forward adds the gravity term, return subtracts it, friction always adds (direction-symmetric, since Coulomb friction opposes motion in both directions), and the result may legitimately go negative (the actuator must resist/brake rather than drive) — this project's own precedent explicitly forbids silently `Math.abs()`-ing that away.

2. **Several `pneumatic_sizing.*` parameters should reuse existing IDs, not mint new ones.** The design doc's own parameter list (`load_mass`, `incline_angle`, `friction_coefficient`) undersells how much is already released with an exact-matching meaning and direction:
   - `motion.axis.incline_angle`, `motion.axis.friction_coefficient`, `motion.axis.total_moving_mass` are the established generic "load on an incline with friction" trio — three of the five Motor Sizing Tool modules (`ball-screw-motor-sizing`, `rack-pinion-motor-sizing`, `belt-pulley-drive-motor-sizing`) already reuse these three unchanged. The one documented exception (`direct-drive-conveyor-motor-sizing`'s own `belt_friction_coefficient`) was justified by a genuinely different physical interface (rolling belt friction, not sliding Coulomb friction) — that exception does not apply here; a load sliding/lifting under a pneumatic actuator is the exact classic case these three parameters were defined for.
   - `pneumatic.operating_pressure`, `pneumatic.load_factor`, `pneumatic.cushion_type`, `pneumatic.mounting_style`, `pneumatic.buckling_safety_factor`, `pneumatic.max_piston_speed` are already released, engineer-supplied, same meaning, same direction in both modules (this module also asks the engineer to supply them — it does not compute or catalog-derive any of them). Reusing them is correct under this project's own Module Consistency Review ("Verify parameter IDs and meanings are reused correctly... Any inconsistency blocks release").
   - Genuinely new (no existing parameter matches): `pneumatic_sizing.process_force` (optional additive force, extend stroke only), `pneumatic_sizing.required_stroke` (an application requirement, not a catalog identity value — different direction from `pneumatic.stroke`), and the two computed outputs `pneumatic_sizing.required_extend_force` / `pneumatic_sizing.required_retract_force` (different direction from `pneumatic.required_extend_force`/`required_retract_force`, which are engineer-supplied inputs in `0.1.0`, not computed).
   - `pneumatic.kinetic_energy` is reused directly as an output — identical formula, identical direction (computed from load mass + max piston speed) in both modules.

3. **The generic catalog engine cannot express the force/buckling checks as flat `MatchCriterion`s.** `MatchCriterion` compares one candidate attribute to one fixed required value. Force capacity (`F = eta * A * P`) needs `A` from the *candidate's own* bore/rod diameter combined with the run's own pressure/eta — and buckling needs both bore (drives the governing compressive force) and rod diameter (drives buckling capacity) from that *same* candidate row. Neither reduces to a single static threshold. The design doc's own instruction — "evaluate real catalog rows directly," explicitly rejecting an unsourced "solve for minimum bore" inverse — is achievable, but only via a real per-candidate formula evaluator in the application layer (still not a `lib/catalog` engine change, still not a `CatalogAdapter` SDK change — both stay exactly as released, matching the design doc's own stated constraint). This plan builds that evaluator (Task 15) and reuses the *same* pure math functions the module's own `compute()` uses (both live in this module's own `math.ts`, reproduced independently from `pneumatic-cylinder@0.1.0`'s own kernel per ADR-0011's reuse policy — not imported cross-module).

## Final port list (both modules confirmed against real source files this session)

**Module ID:** `pneumatic-cylinder-sizing`. **Version:** `0.1.0`. **Category:** `cylinder-sizing.pneumatic`. **Registry bump:** `1.16.0` -> `1.17.0` (additive only).

Inputs (port key -> parameter ID -> reuse or new):

| Port key | Parameter ID | Status |
| --- | --- | --- |
| `incline_angle` | `motion.axis.incline_angle` | reused |
| `friction_coefficient` | `motion.axis.friction_coefficient` | reused |
| `load_mass` | `motion.axis.total_moving_mass` | reused |
| `process_force` | `pneumatic_sizing.process_force` | new, optional, default 0 N |
| `operating_pressure` | `pneumatic.operating_pressure` | reused |
| `load_factor` | `pneumatic.load_factor` | reused |
| `max_piston_speed` | `pneumatic.max_piston_speed` | reused |
| `cushion_type` | `pneumatic.cushion_type` | reused |
| `required_stroke` | `pneumatic_sizing.required_stroke` | new |
| `mounting_style` | `pneumatic.mounting_style` | reused |
| `buckling_safety_factor` | `pneumatic.buckling_safety_factor` | reused |

Outputs:

| Port key | Parameter ID | Status | Why |
| --- | --- | --- | --- |
| `required_extend_force` | `pneumatic_sizing.required_extend_force` | new (computed direction) | forward-direction resolved force |
| `required_retract_force` | `pneumatic_sizing.required_retract_force` | new (computed direction) | return-direction resolved force |
| `kinetic_energy` | `pneumatic.kinetic_energy` | reused | identical formula/direction to `0.1.0` |
| `required_stroke` | `pneumatic_sizing.required_stroke` | echoed | `requiredSpec()` only sees `.outputs`, not raw inputs |
| `operating_pressure` | `pneumatic.operating_pressure` | echoed | needed by the per-candidate force evaluator |
| `load_factor` | `pneumatic.load_factor` | echoed | needed by the per-candidate force evaluator |
| `buckling_safety_factor` | `pneumatic.buckling_safety_factor` | echoed | needed by the per-candidate buckling evaluator |
| `mounting_style` | `pneumatic.mounting_style` | echoed | needed for the mounting-style hard filter |
| `cushion_type` | `pneumatic.cushion_type` | echoed | needed to pick/skip the cushion-energy hard filter |

No new unit-registry dimension or unit is needed (mm, MPa, N, J, kg, m/s, deg, rad, ratio all already exist).

---

## Stage 1 — Engineering specification

### Task 1: Write `context/modules/pneumatic-cylinder-sizing/stage-1-spec.md`

**Files:**
- Create: `context/modules/pneumatic-cylinder-sizing/stage-1-spec.md`

- [ ] **Step 1: Create the directory and write the spec**

Write this exact content to `context/modules/pneumatic-cylinder-sizing/stage-1-spec.md`:

```markdown
# Pneumatic Cylinder Sizing Module — Stage 1 Engineering Specification

## Status

- Work unit: Milestone 7 (Phase 2, `context/roadmap.md`), Unit 7.2, Stage 1 —
  engineering specification
- Proposed module ID: `pneumatic-cylinder-sizing`
- Proposed first released version: `0.1.0`
- Founder-directed scope (2026-08-24): see
  `docs/superpowers/specs/2026-08-24-pneumatic-cylinder-sizing-design.md`
  for the full founder-confirmed decision record. This document formalizes
  that design into the project's own Stage 1 shape and records three
  corrections implementation research surfaced (below) that the design
  doc did not anticipate.
- Date: 2026-08-24

No released parameter, module version, calculation run, or validation
record is changed by this document.

## Purpose

Given a load (mass, incline angle, friction coefficient, optional process
force), a required stroke, and the engineer's own operating pressure,
load-sizing factor, cushion type, mounting style, and buckling safety
factor, compute the required extend/retract force and required
kinetic-energy absorption, then rank real SMC CM2/CA2 catalog cylinder
candidates against that requirement (theoretical force, cushion capacity,
stroke range, mounting style, and piston-rod buckling). It is the
load-in/catalog-match-out counterpart to `pneumatic-cylinder@0.1.0`'s own
check-a-given-cylinder scope — the same "self-contained, no upstream
module link" precedent ADR-0011 established for the Motor Sizing Tool
family, applied to a different mechanism.

It will not:

- invent a new, unsourced "solve for minimum bore" inverse formula.
  Candidate cylinders are evaluated directly, row by row, using the same
  formulas `pneumatic-cylinder@0.1.0` already validated (reproduced
  independently in this module's own `math.ts`, not imported).
- change `lib/catalog`'s generic matching engine or the `CatalogAdapter`
  SDK contract (`lib/engine/module-sdk/types.ts`). Both stay exactly as
  released. Where the generic `MatchCriterion` engine cannot express a
  check (force capacity, buckling — both depend on more than one
  candidate attribute plus run-specific inputs at once), this module's own
  application-layer matcher (`lib/application/catalogs/
  pneumatic-cylinder-matching.ts`) evaluates it directly, alongside the
  generic engine for the checks that are true single-attribute
  comparisons (stroke range, mounting style, cushion energy).
- provide a self-serve catalog upload UI. The SMC CM2/CA2 seed data is a
  one-time import via the existing generic CSV pipeline
  (`lib/catalog/csv-import.ts`), for the founder to review and trim to
  their real working set after this module ships.
- touch `pneumatic-cylinder@0.1.0` (formulas, ports, or validation
  record) in any way. It stays released, immutable, and hidden from the
  default "Add module" picker once this module ships (the same treatment
  the seven old linear-axis discipline modules received under ADR-0011).

## Corrections to the founder design doc found during implementation research

1. **Forward/return sign-convention precedent.** The design doc points at
   `rack-pinion-motor-sizing`'s and `belt-pulley-drive-motor-sizing`'s own
   `math.ts` to confirm which stroke direction carries the full
   gravity/friction term. Neither module has a directional split at all —
   each has exactly one `resolveDriveForce`, called once, always in the
   conservative gravity-opposing direction. The real precedent, confirmed
   by reading the actual source, is `ball-screw-motor-sizing@0.2.0`
   (`lib/modules/ball-screw-motor-sizing/0.2.0/math.ts`,
   `resolveDriveForce`, a real `MoveDirection = "forward" | "return"`
   type): forward adds the gravity term, return subtracts it, friction is
   direction-symmetric (always added, since Coulomb friction opposes
   motion regardless of direction), and the result may legitimately go
   negative for a strongly gravity-assisted return stroke (the actuator
   must resist/brake, not drive) — that project's own tests assert this
   is a real, meaningful output, never silently `Math.abs()`-ed away. This
   module reproduces that exact convention (see "Load Resolution" below).
2. **Parameter reuse.** The design doc's own "New parameter group" list
   undersells existing reuse. `motion.axis.incline_angle`,
   `motion.axis.friction_coefficient`, and `motion.axis.total_moving_mass`
   are already the established generic "load on an incline with friction"
   trio (three of the five Motor Sizing Tool modules already reuse them
   unchanged); `pneumatic.operating_pressure`, `pneumatic.load_factor`,
   `pneumatic.cushion_type`, `pneumatic.mounting_style`,
   `pneumatic.buckling_safety_factor`, `pneumatic.max_piston_speed`, and
   `pneumatic.kinetic_energy` are already released with an exact-matching
   meaning and direction (engineer-supplied input, or identically-derived
   output) in both modules. See `stage-2-contract.md` "Existing Parameter
   Review" for the full accounting. Only `process_force`,
   `required_stroke`, `required_extend_force`, and `required_retract_force`
   are genuinely new.
3. **The `MatchCriterion` engine cannot express force/buckling directly.**
   See "Purpose" above — this is a real, previously undiscovered
   architecture finding, not a design decision to relitigate at Stage 2.

## Load Resolution (new, reproduced physics — not imported, per ADR-0011)

Reproducing `ball-screw-motor-sizing@0.2.0`'s own forward/return
convention (correction 1 above), with process force applied only on the
extend (working) stroke — matching `pneumatic-cylinder@0.1.0`'s own
"buckling governs on the extend side" assumption, since the extend stroke
is this module's own "do work" direction and process force (a
clamping/pressing force) is a working-stroke concept:

```text
weight = load_mass * g                              (g = 9.80665 m/s^2, baked
                                                       constant, not a port --
                                                       matching every Motor
                                                       Sizing module's own
                                                       post-consistency-pass
                                                       convention)
gravity_term  = weight * sin(incline_angle)
friction_term = weight * friction_coefficient * cos(incline_angle)

required_extend_force  = process_force + gravity_term + friction_term
required_retract_force =                -gravity_term + friction_term
```

`incline_angle` is unsigned, `[0, 90] deg` (matches
`motion.axis.incline_angle`'s own released range); `friction_coefficient`
is unsigned, `>= 0`. Friction never flips sign with direction (it always
opposes motion); only the gravity term does. `required_retract_force` may
be negative for a strongly gravity-assisted return stroke on a heavy
unbalanced load — a real, physically meaningful result (the actuator must
resist/brake on retract, not drive), reported as computed, never clamped
or `Math.abs()`-ed inside `compute()`. The catalog matcher (Task 15)
floors it at 0 N only when building its own force-capacity criterion,
since a negative requirement is trivially satisfied by any candidate and
is not itself a catalog filter.

## Cushion Kinetic Energy

Identical formula and direction to `pneumatic.kinetic_energy`
(`E = (m/2) * V^2`, SMC's own formula (7), already validated in
`pneumatic-cylinder@0.1.0`) — reused directly, not re-derived, re-sourced,
or re-validated.

## Candidate Evaluation (per real catalog row — see stage-2-contract.md and Task 15)

For each SMC CM2/CA2 catalog candidate:

- **Stroke range** (`gte`/`lte` via the generic `MatchCriterion` engine):
  candidate's own `stroke_min`/`stroke_max` must bracket
  `required_stroke`.
- **Mounting style** (`eq` via the generic engine): candidate's own
  `mounting_style` attribute must equal the engineer's selection.
- **Cushion energy** (`gte` via the generic engine, skipped entirely when
  `cushion_type = "none"`): candidate's own
  `allowable_kinetic_energy_<cushion_type>` attribute must be `>=` the
  computed kinetic energy.
- **Force capacity, extend and retract** (custom application-layer
  evaluator, not the generic engine — see "Corrections" above): reproduces
  `pneumatic-cylinder@0.1.0`'s own `resolvePistonAreas` +
  `resolveTheoreticalForce` (SMC formulas (1)/(2)) using the *candidate's
  own* bore/rod diameter and the run's own `operating_pressure`/
  `load_factor`, checked against `required_extend_force`/
  `required_retract_force` (floored at 0 N).
- **Buckling** (custom application-layer evaluator): reproduces
  `pneumatic-cylinder@0.1.0`'s own `resolveBucklingLoad` +
  `resolvePermissibleCompressiveLoad` (generic Euler column formula, same
  four end-fixity cases) using the candidate's own rod diameter,
  `required_stroke` as the column length, and the run's own
  `buckling_safety_factor`, checked against the extend-side theoretical
  force (the same "governs on the extend/thrust stroke" assumption
  `pneumatic-cylinder@0.1.0` already carries, and the same disclosed
  "no pneumatic-manufacturer-sourced buckling formula" evidence gap that
  module already discloses — carried forward here unchanged, not silently
  resolved).

No lateral (side) rod-end load check — same out-of-scope reasoning as
`pneumatic-cylinder@0.1.0` (no reproducible formula found, catalog graphs
only).

## Checks (this module's own run, not per-candidate)

This module's own `compute()` produces a required specification, not a
pass/fail against one candidate — the per-candidate checks above run
later, once catalog candidates exist, inside
`lib/application/catalogs/pneumatic-cylinder-matching.ts`, not in this
module's own `checks` array. `compute()` reports one informational check
(`required-specification-computed`, always `pass` once inputs resolve)
confirming the specification was produced — the same "nothing to check
against a single candidate yet" shape a self-contained sizing module has
before catalog matching runs.

## Sources

Reuses `pneumatic-cylinder@0.1.0`'s own three registered source revisions
directly (no new formula content — the theoretical-force, cushion, and
buckling formulas are identical, only the direction of use differs):

- `jp.smc.air_cylinders_model_selection@web-2026-08-24` (SMC Corporation,
  theoretical force, cushion kinetic energy)
- `us.milwaukee_cylinder.design_engineering_guide@web-2026-08-24`
  (Milwaukee Cylinder, corroborating context, unchanged from `0.1.0`)
- `us.norgren.m1000_heavy_duty_cylinders@web-2026-08-24` (Norgren,
  independent-benchmark substitute, unchanged from `0.1.0` — reused by
  citation, not re-run, since the formulas are identical)

One new source is needed for the catalog seed data itself: SMC's own
published CM2/CA2 dimensional/cushion catalog tables (bore/rod/stroke
ranges, standard mounting styles, allowable cushion energy by bore) — see
Task 16 for the fetch and Task 17 for the registered source revision.

## Existing Parameter Review

See "Corrections" item 2 above and `stage-2-contract.md`'s own full
accounting — this module reuses seven existing parameter IDs
(`motion.axis.incline_angle`, `motion.axis.friction_coefficient`,
`motion.axis.total_moving_mass`, `pneumatic.operating_pressure`,
`pneumatic.load_factor`, `pneumatic.cushion_type`,
`pneumatic.mounting_style`, `pneumatic.buckling_safety_factor`,
`pneumatic.max_piston_speed`, `pneumatic.kinetic_energy` — ten, not
seven; corrected count) and mints four new ones
(`pneumatic_sizing.process_force`, `pneumatic_sizing.required_stroke`,
`pneumatic_sizing.required_extend_force`,
`pneumatic_sizing.required_retract_force`).

## Status

Stage 1 done as a draft, formalizing the founder-approved design doc plus
three implementation-research corrections. Stage 2 (parameter contract)
is next.
```

- [ ] **Step 2: Commit**

```bash
git add context/modules/pneumatic-cylinder-sizing/stage-1-spec.md
git commit -m "docs: pneumatic-cylinder-sizing Stage 1 engineering specification"
```

---

## Stage 2 — Parameter contract

### Task 2: Write `context/modules/pneumatic-cylinder-sizing/stage-2-contract.md`

**Files:**
- Create: `context/modules/pneumatic-cylinder-sizing/stage-2-contract.md`

- [ ] **Step 1: Write the contract**

```markdown
# Pneumatic Cylinder Sizing Module — Stage 2 Parameter Contract

## Status

- Work unit: Unit 7.2, Stage 2 — parameter contract
- Date: 2026-08-24
- Released registry change: parameter registry `1.17.0` (additive only;
  no existing definition edited)
- Module status: not yet built. Stage 3 (compute and trace) is next.

## Existing Parameter Review

`grep` of `lib/engine/parameters/definitions.ts` for the concepts this
module needs, before minting anything new:

| Concept | Existing parameter | Reuse decision |
| --- | --- | --- |
| Incline angle | `motion.axis.incline_angle` | **Reuse.** Identical meaning/direction; three of five Motor Sizing Tool modules already reuse it unchanged. |
| Friction coefficient | `motion.axis.friction_coefficient` | **Reuse.** Classic Coulomb sliding friction — the exact case this parameter was defined for; the one documented non-reuse precedent (`direct-drive-conveyor-motor-sizing`'s own `belt_friction_coefficient`) does not apply (that is rolling belt friction, a different physical interface). |
| Moved mass | `motion.axis.total_moving_mass` | **Reuse.** Same meaning/direction as every Motor Sizing module's own mass input. |
| Operating pressure | `pneumatic.operating_pressure` | **Reuse.** Engineer-supplied in both modules, identical meaning. |
| Force sizing load factor | `pneumatic.load_factor` | **Reuse.** Engineer-supplied in both modules, identical meaning (SMC's own `eta`). |
| Cushion type | `pneumatic.cushion_type` | **Reuse.** Engineer-supplied in both modules, identical meaning. |
| Mounting style | `pneumatic.mounting_style` | **Reuse.** Engineer-supplied in both modules, identical meaning (the desired mounting for the cylinder to be selected here, vs. an already-selected cylinder's own mounting in `0.1.0` — same physical concept, same direction: the engineer chooses it either way). |
| Buckling safety factor | `pneumatic.buckling_safety_factor` | **Reuse.** Engineer-supplied in both modules, identical meaning. |
| Max piston speed | `pneumatic.max_piston_speed` | **Reuse.** Engineer-supplied in both modules, identical meaning. |
| Kinetic energy (computed) | `pneumatic.kinetic_energy` | **Reuse.** Identical formula (`E=(m/2)V^2`) and identical direction (computed output) in both modules. |
| Process force | none | **New** — `pneumatic_sizing.process_force`. No existing parameter models an additive working-stroke force. |
| Required stroke | `pneumatic.stroke` exists but is a **catalog identity value** of an already-selected cylinder (`0.1.0`'s own direction) — this module needs the opposite direction, an application *requirement* the catalog must satisfy. | **New** — `pneumatic_sizing.required_stroke`. |
| Required extend force | `pneumatic.required_extend_force` exists but is **engineer-supplied input** in `0.1.0` — this module *computes* it. | **New** — `pneumatic_sizing.required_extend_force`. |
| Required retract force | Same reasoning. | **New** — `pneumatic_sizing.required_retract_force`. |
| Gravity | `motion.axis.gravity` existed in early (pre-consistency-pass) Motor Sizing module versions, since removed from every current release in favor of a baked `STANDARD_GRAVITY_M_PER_S2 = 9.80665` constant. | **Not a port.** Matches every current Motor Sizing module's own convention (`docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md`). |

Zero new unit-registry dimensions or units needed — `mm`, `MPa`, `N`, `J`,
`kg`, `m/s`, `deg`/`rad`, `ratio` all already exist.

## Decisions

### 1. Forward/return sign convention

Reproduces `ball-screw-motor-sizing@0.2.0`'s own `resolveDriveForce`
convention exactly (see `stage-1-spec.md` "Load Resolution" and
"Corrections" item 1) — friction direction-symmetric (always added),
gravity sign flips with direction, `required_retract_force` may be
negative and is reported as computed, never floored inside `compute()`.

### 2. `pneumatic_sizing.required_extend_force` / `required_retract_force` range

`required_extend_force` is algebraically always `>= 0` given this
module's own formula (a sum of non-negative terms: `process_force >= 0`,
and the forward-direction gravity/friction terms are both `>= 0` for
`incline_angle` in `[0, 90] deg`) — released with `range: { min: 0,
unit: "N" }`. `required_retract_force` can be legitimately negative (see
Decision 1) — released with **no** `range` (the field is optional;
omitting it declares no bound, matching the real physics rather than
forcing an artificial floor at the registry level).

### 3. `pneumatic_sizing.process_force` applies to the extend stroke only

Matches `pneumatic-cylinder@0.1.0`'s own "buckling governs on the extend
(thrust) stroke" assumption: the extend stroke is this module's own
"do work" direction, and a clamping/pressing process force is a
working-stroke concept. A disclosed `0.1.0` simplification, not a
resolved general case (a real installation could need a process force on
retract too — out of scope for this version, the same "explicit,
disclosed limitation" treatment every other module's own scope
narrowing gets).

### 4. Catalog matching stays outside this registry's own contract

`stage-1-spec.md`'s "Candidate Evaluation" section is a Stage 5
(generic surfaces / catalog integration) concern, not a Stage 2 one — no
`ComponentSchemaVersion` field is a canonical parameter, and
`MatchCriterion`/`rankCandidates` never touch `lib/engine/parameters`
directly (catalog attributes are their own, separately versioned schema,
per `context/architecture.md` "lib/catalog/").

## Released Additive Contract

Registry `1.17.0` adds, in `lib/engine/parameters/definitions.ts`
(`pneumaticCylinderSizing` block):

| Parameter | Shape | Note |
| --- | --- | --- |
| `pneumatic_sizing.process_force` | quantity, `N`, `>= 0`, default `0` | Extend stroke only — Decision 3 |
| `pneumatic_sizing.required_stroke` | quantity, `mm`, `> 0`, required | Application requirement, not a catalog identity value |
| `pneumatic_sizing.required_extend_force` | quantity, `N`, `>= 0`, computed | Always non-negative by construction — Decision 2 |
| `pneumatic_sizing.required_retract_force` | quantity, `N`, no declared bound, computed | May be negative — Decision 2 |

## Verification

`npx tsc --noEmit`, `npx vitest run` (full non-DB suite), and
`npm run lint` (0 errors) all pass after this change.
`lib/engine/parameters/registry.test.ts` and
`lib/engine/parameters/hash.test.ts` have their pinned version/hash
fixtures updated to `1.17.0` / the newly computed content hash — the
expected update on every registry version bump, not a defect.

## Stage 3 Entry Criteria

1. Scaffold `lib/modules/pneumatic-cylinder-sizing/0.1.0/` (manifest,
   ports, `math.ts`, `compute.ts`, `checks.ts`, `trace.ts`, generic
   UI/report schema, draft validation).
2. No `input-schema.ts` cross-field rule is needed (no "at least one
   of"/conditional requirement exists in this module's own scope, unlike
   `pneumatic-cylinder@0.1.0`) — matches `ball-screw-motor-sizing`'s and
   `rack-pinion-motor-sizing`'s own precedent of relying on the generic
   `ModuleInputSchema` alone.
3. `math.ts` reproduces (not imports) `pneumatic-cylinder@0.1.0`'s own
   `resolvePistonAreas`, `resolveTheoreticalForce`,
   `resolveCushionKineticEnergy`, `resolveBucklingLoad`,
   `resolvePermissibleCompressiveLoad`, plus a new
   `resolveRequiredForce` implementing the forward/return convention
   (Decision 1).
```

- [ ] **Step 2: Commit**

```bash
git add context/modules/pneumatic-cylinder-sizing/stage-2-contract.md
git commit -m "docs: pneumatic-cylinder-sizing Stage 2 parameter contract"
```

### Task 3: Add the `pneumatic_sizing.*` group to the parameter registry (`1.17.0`)

**Files:**
- Modify: `lib/engine/parameters/definitions.ts:96` (version bump), `:3680-3699` (append new group)

- [ ] **Step 1: Bump the version and extend the header comment**

In `lib/engine/parameters/definitions.ts`, change line 96:

```typescript
export const PARAMETER_REGISTRY_VERSION = "1.16.0";
```

to:

```typescript
export const PARAMETER_REGISTRY_VERSION = "1.17.0";
```

Append to the top-of-file header comment block (after the existing "v1.16
adds..." paragraph, before the `import` statements):

```typescript
//
// v1.17 adds the full pneumatic_sizing.* group (4 new parameters) for the
// pneumatic-cylinder-sizing module (context/modules/pneumatic-cylinder-
// sizing/stage-2-contract.md), Milestone 7's second module. Reuses ten
// existing parameters directly (motion.axis.incline_angle,
// motion.axis.friction_coefficient, motion.axis.total_moving_mass,
// pneumatic.operating_pressure, pneumatic.load_factor,
// pneumatic.cushion_type, pneumatic.mounting_style,
// pneumatic.buckling_safety_factor, pneumatic.max_piston_speed,
// pneumatic.kinetic_energy) rather than minting duplicates -- see
// stage-2-contract.md "Existing Parameter Review". No new unit-registry
// dimension or unit is needed.
```

- [ ] **Step 2: Append the new parameter group**

Insert immediately before the closing `];` of the `PARAMETER_DEFINITIONS`
array (after the `...pneumaticCylinder,` line, i.e. after line 3697 in the
pre-edit file), first defining the new block just above
`PARAMETER_DEFINITIONS` (i.e. right after the `pneumaticCylinder` array's
closing `];` at line 3680):

```typescript
const pneumaticCylinderSizing: readonly ParameterDefinition[] = [
  defineParameter({
    id: "pneumatic_sizing.process_force",
    displayName: "Process force (extend stroke)",
    symbol: "F_proc",
    definition:
      "Additive working force the cylinder must supply on top of the mass-derived load, on the extend (working) stroke only -- e.g. a clamping or pressing force. Zero (the default) is a structural 'no process force' statement, not a guessed physical value -- the same category as pneumatic.piping_length = 0.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    defaultPolicy: { kind: "constant", value: makeQuantity(0, "N") },
  }),
  defineParameter({
    id: "pneumatic_sizing.required_stroke",
    displayName: "Required stroke",
    symbol: "L_req",
    definition:
      "Travel distance the application needs. An application requirement the catalog-matched candidate's own stroke range must cover -- not a catalog identity value the way pneumatic.stroke is in pneumatic-cylinder@0.1.0 (an already-selected cylinder's own printed stroke).",
    valueType: "quantity",
    canonicalUnit: "mm",
    displayUnits: ["mm", "in"],
    range: { min: 0, unit: "mm" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "pneumatic_sizing.required_extend_force",
    displayName: "Required extend-side force (computed)",
    symbol: "F_req,ext",
    definition:
      "process_force + load_mass*g*sin(incline_angle) + load_mass*g*friction_coefficient*cos(incline_angle) (this module's own forward-direction convention, reproducing ball-screw-motor-sizing@0.2.0's own resolveDriveForce sign pattern -- stage-2-contract.md Decision 1). Always non-negative by construction, unlike its retract-side counterpart.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    qualifiers: { bound: "required" },
  }),
  defineParameter({
    id: "pneumatic_sizing.required_retract_force",
    displayName: "Required retract-side force (computed)",
    symbol: "F_req,ret",
    definition:
      "load_mass*g*friction_coefficient*cos(incline_angle) - load_mass*g*sin(incline_angle) (this module's own return-direction convention -- stage-2-contract.md Decision 1). May be negative for a strongly gravity-assisted return stroke on a heavy unbalanced load, meaning the actuator must resist/brake rather than drive -- reported as computed, never floored here (the catalog matcher floors it at 0 N only when building its own force-capacity criterion, since a negative requirement is not itself a catalog filter).",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    qualifiers: { bound: "required" },
  }),
];

```

Then change the `PARAMETER_DEFINITIONS` array's closing lines from:

```typescript
  ...motorSizingIndexTable,
  ...pneumaticCylinder,
];
```

to:

```typescript
  ...motorSizingIndexTable,
  ...pneumaticCylinder,
  ...pneumaticCylinderSizing,
];
```

Also update the comment directly above `PARAMETER_DEFINITIONS`
(`/** All released parameter definitions for registry v1.16, in authored
order. */`) to say `v1.17`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors (the four new `defineParameter` calls typecheck
against the existing `ParameterSpec` shape).

- [ ] **Step 4: Commit**

```bash
git add lib/engine/parameters/definitions.ts
git commit -m "feat: release pneumatic_sizing.* parameter group (registry 1.17.0)"
```

### Task 4: Register `1.17.0` as supported and update the pinned registry test fixtures

**Files:**
- Modify: `lib/engine/parameters/registered.ts:19-37`
- Modify: `lib/engine/parameters/registry.test.ts` (pinned version fixture)
- Modify: `lib/engine/parameters/hash.test.ts` (pinned hash fixture)

- [ ] **Step 1: Add `1.17.0` to the supported-versions list**

In `lib/engine/parameters/registered.ts`, change:

```typescript
export const PARAMETER_REGISTRY_SUPPORTED_VERSIONS = [
  "1.0.0",
  "1.1.0",
  "1.2.0",
  "1.3.0",
  "1.4.0",
  "1.5.0",
  "1.6.0",
  "1.7.0",
  "1.8.0",
  "1.9.0",
  "1.10.0",
  "1.11.0",
  "1.12.0",
  "1.13.0",
  "1.14.0",
  "1.15.0",
  "1.16.0",
] as const;
```

to:

```typescript
export const PARAMETER_REGISTRY_SUPPORTED_VERSIONS = [
  "1.0.0",
  "1.1.0",
  "1.2.0",
  "1.3.0",
  "1.4.0",
  "1.5.0",
  "1.6.0",
  "1.7.0",
  "1.8.0",
  "1.9.0",
  "1.10.0",
  "1.11.0",
  "1.12.0",
  "1.13.0",
  "1.14.0",
  "1.15.0",
  "1.16.0",
  "1.17.0",
] as const;
```

- [ ] **Step 2: Run the test suite and read the failing diffs**

Run: `npx vitest run lib/engine/parameters`
Expected: `registry.test.ts` and `hash.test.ts` fail, each printing the
actual current version string and/or content hash the test expected vs.
what the code now produces (this is the same mechanical, expected-failure
pattern every prior registry version bump in this project's history has
hit — see `context/modules/pneumatic-cylinder/stage-2-contract.md`
"Verification" for the identical prior occurrence).

- [ ] **Step 3: Update the pinned fixtures to match**

Open `lib/engine/parameters/registry.test.ts` and
`lib/engine/parameters/hash.test.ts`. Find the literal pinned version
string (`"1.16.0"`) and/or content-hash string the failing assertions
named in Step 2's output, and replace each with the new value the test
runner just printed (the real current version `"1.17.0"` and the real
computed hash — copy them verbatim from the failure output, do not
hand-compute a hash).

- [ ] **Step 4: Re-run and confirm green**

Run: `npx vitest run lib/engine/parameters`
Expected: PASS, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add lib/engine/parameters/registered.ts lib/engine/parameters/registry.test.ts lib/engine/parameters/hash.test.ts
git commit -m "feat: support parameter registry 1.17.0"
```

---

## Stage 3 — Compute and trace

### Task 5: Write `math.ts` (the pure kernel)

**Files:**
- Create: `lib/modules/pneumatic-cylinder-sizing/0.1.0/math.ts`
- Test: `lib/modules/pneumatic-cylinder-sizing/0.1.0/math.test.ts`

- [ ] **Step 1: Write the kernel**

```typescript
/**
 * Pure SI/mm-number kernel for the pneumatic-cylinder-sizing module
 * (Unit 7.2). Resolves required extend/retract force (new physics, this
 * module's own forward/return convention -- see stage-2-contract.md
 * Decision 1) and reproduces (independently, not imported --
 * ADR-0011's reuse policy) pneumatic-cylinder@0.1.0's own piston-area,
 * theoretical-force, cushion-kinetic-energy, and Euler buckling formulas,
 * since the catalog matcher (lib/application/catalogs/
 * pneumatic-cylinder-matching.ts) evaluates every candidate row through
 * these same functions.
 *
 * Same mm/MPa/N unit-system choice as pneumatic-cylinder@0.1.0's own
 * math.ts, for the same reason: 1 MPa = 1 N/mm^2 exactly, so
 * force[N] = loadFactor * area[mm^2] * pressure[MPa] needs no conversion
 * constant.
 */

/** Thrown when an input falls outside this kernel's explicit validity envelope. */
export class PneumaticCylinderSizingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PneumaticCylinderSizingInputError";
  }
}

function fail(message: string): never {
  throw new PneumaticCylinderSizingInputError(message);
}

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) fail(`${name} must be finite.`);
}

function assertPositive(name: string, value: number): void {
  assertFinite(name, value);
  if (value <= 0) fail(`${name} must be positive.`);
}

function assertNonNegative(name: string, value: number): void {
  assertFinite(name, value);
  if (value < 0) fail(`${name} must not be negative.`);
}

/**
 * Standard gravity, in m/s^2. Baked into the kernel, not a port --
 * matches every current Motor Sizing Tool module's own post-
 * consistency-pass convention (docs/superpowers/specs/
 * 2026-08-18-motor-sizing-consistency-pass-design.md), not the older
 * gravity-as-input pattern.
 */
export const STANDARD_GRAVITY_M_PER_S2 = 9.80665;

// --- 1. Required force (new; forward/return convention) -------------------

export type PneumaticSizingDirection = "extend" | "retract";

export interface RequiredForceInput {
  /** Additive process force, in N. Applied only for direction === "extend". Must be >= 0. */
  readonly processForceN: number;
  /** Moved load mass, in kg. Must be > 0. */
  readonly loadMassKg: number;
  /** Installation incline angle, in rad. Must be in [0, pi/2]. */
  readonly inclineAngleRad: number;
  /** Coulomb friction coefficient, unsigned. Must be >= 0. */
  readonly frictionCoefficient: number;
  readonly direction: PneumaticSizingDirection;
}

export interface RequiredForceResult {
  readonly forceN: number;
}

/**
 * Reproduces ball-screw-motor-sizing@0.2.0's own resolveDriveForce sign
 * convention (stage-2-contract.md Decision 1): forward (extend) adds the
 * gravity term, return (retract) subtracts it; friction is direction-
 * symmetric (always added, since Coulomb friction opposes motion
 * regardless of direction). Process force is added only for "extend"
 * (stage-2-contract.md Decision 3). The result may be negative for
 * "retract" on a strongly gravity-assisted return stroke -- a real,
 * physically meaningful output (the actuator must resist/brake rather
 * than drive), never floored here.
 */
export function resolveRequiredForce(
  input: RequiredForceInput,
): RequiredForceResult {
  assertNonNegative("processForceN", input.processForceN);
  assertPositive("loadMassKg", input.loadMassKg);
  assertFinite("inclineAngleRad", input.inclineAngleRad);
  if (input.inclineAngleRad < 0 || input.inclineAngleRad > Math.PI / 2) {
    fail("inclineAngleRad must be within [0, pi/2].");
  }
  assertNonNegative("frictionCoefficient", input.frictionCoefficient);

  const weightN = input.loadMassKg * STANDARD_GRAVITY_M_PER_S2;
  const gravityTermN = weightN * Math.sin(input.inclineAngleRad);
  const frictionTermN =
    weightN * input.frictionCoefficient * Math.cos(input.inclineAngleRad);

  const directionalGravityTermN =
    input.direction === "extend" ? gravityTermN : -gravityTermN;
  const processForceN = input.direction === "extend" ? input.processForceN : 0;

  return {
    forceN: processForceN + directionalGravityTermN + frictionTermN,
  };
}

// --- 2. Piston areas (reproduced from pneumatic-cylinder@0.1.0) -----------

export interface PistonAreasInput {
  /** Candidate cylinder bore (piston) diameter, in mm. Must be > 0. */
  readonly boreDiameterMm: number;
  /** Candidate cylinder piston rod diameter, in mm. Must be > 0 and less than boreDiameterMm. */
  readonly rodDiameterMm: number;
}

export interface PistonAreasResult {
  readonly extendAreaMm2: number;
  readonly retractAreaMm2: number;
}

/** `A1 = pi*D^2/4`, `A2 = pi*(D^2-d^2)/4` -- see pneumatic-cylinder@0.1.0's own math.ts for the source citation (SMC's own Table (1), agreed by both candidate sources). */
export function resolvePistonAreas(input: PistonAreasInput): PistonAreasResult {
  assertPositive("boreDiameterMm", input.boreDiameterMm);
  assertPositive("rodDiameterMm", input.rodDiameterMm);
  if (input.rodDiameterMm >= input.boreDiameterMm) {
    fail("rodDiameterMm must be less than boreDiameterMm.");
  }

  const extendAreaMm2 = (Math.PI * input.boreDiameterMm ** 2) / 4;
  const retractAreaMm2 =
    (Math.PI * (input.boreDiameterMm ** 2 - input.rodDiameterMm ** 2)) / 4;

  return { extendAreaMm2, retractAreaMm2 };
}

// --- 3. Theoretical force (reproduced from pneumatic-cylinder@0.1.0) ------

export interface TheoreticalForceInput {
  readonly areaMm2: number;
  readonly pressureMPa: number;
  readonly loadFactor: number;
}

export interface TheoreticalForceResult {
  readonly forceN: number;
}

/** `F = eta * A * P` (SMC's own formulas (1)/(2)). */
export function resolveTheoreticalForce(
  input: TheoreticalForceInput,
): TheoreticalForceResult {
  assertPositive("areaMm2", input.areaMm2);
  assertPositive("pressureMPa", input.pressureMPa);
  assertFinite("loadFactor", input.loadFactor);
  if (input.loadFactor < 0 || input.loadFactor > 1) {
    fail("loadFactor must be between 0 and 1.");
  }

  return { forceN: input.loadFactor * input.areaMm2 * input.pressureMPa };
}

// --- 4. Cushion kinetic energy (reproduced from pneumatic-cylinder@0.1.0) -

export interface CushionKineticEnergyInput {
  readonly loadMassKg: number;
  readonly maxPistonSpeedMps: number;
}

export interface CushionKineticEnergyResult {
  readonly kineticEnergyJ: number;
}

/** `E = (m/2) * V^2` (SMC's own formula (7)). */
export function resolveCushionKineticEnergy(
  input: CushionKineticEnergyInput,
): CushionKineticEnergyResult {
  assertPositive("loadMassKg", input.loadMassKg);
  assertPositive("maxPistonSpeedMps", input.maxPistonSpeedMps);

  return {
    kineticEnergyJ: (input.loadMassKg / 2) * input.maxPistonSpeedMps ** 2,
  };
}

// --- 5. Piston-rod buckling (reproduced from pneumatic-cylinder@0.1.0) ----

export type PneumaticMountingStyle =
  "fixed-fixed" | "fixed-supported" | "supported-supported" | "fixed-free";

const BUCKLING_END_FIXITY_FACTOR: Record<PneumaticMountingStyle, number> = {
  "fixed-free": 0.25,
  "supported-supported": 1.0,
  "fixed-supported": 2.0,
  "fixed-fixed": 4.0,
};

/** Elastic modulus of steel, in N/mm^2 (210 GPa) -- see pneumatic-cylinder@0.1.0's own math.ts for the source citation (Hänchen). Not an exposed port. */
const STEEL_ELASTIC_MODULUS_N_PER_MM2 = 210_000;

function endFixityFactor(arrangement: PneumaticMountingStyle): number {
  const factor = BUCKLING_END_FIXITY_FACTOR[arrangement];
  if (factor === undefined) {
    fail(`Unknown mountingStyle: "${String(arrangement)}".`);
  }
  return factor;
}

export interface BucklingLoadInput {
  /** Candidate cylinder's own rod diameter, in mm. Must be > 0. */
  readonly rodDiameterMm: number;
  /** Unsupported column length -- this module uses required_stroke, not a candidate's own catalog stroke (see compute.ts). Must be > 0. */
  readonly columnLengthMm: number;
  readonly mountingStyle: PneumaticMountingStyle;
}

export interface BucklingLoadResult {
  readonly bucklingLoadN: number;
}

/** `Fk = factor * pi^2 * E * J / L^2`, `J = pi*d^4/64`. */
export function resolveBucklingLoad(
  input: BucklingLoadInput,
): BucklingLoadResult {
  assertPositive("rodDiameterMm", input.rodDiameterMm);
  assertPositive("columnLengthMm", input.columnLengthMm);

  const factor = endFixityFactor(input.mountingStyle);
  const rodMomentOfInertiaMm4 = (Math.PI * input.rodDiameterMm ** 4) / 64;

  const bucklingLoadN =
    (factor *
      Math.PI ** 2 *
      STEEL_ELASTIC_MODULUS_N_PER_MM2 *
      rodMomentOfInertiaMm4) /
    input.columnLengthMm ** 2;

  return { bucklingLoadN };
}

export interface PermissibleCompressiveLoadInput {
  readonly bucklingLoadN: number;
  readonly bucklingSafetyFactor: number;
}

export interface PermissibleCompressiveLoadResult {
  readonly permissibleCompressiveLoadN: number;
}

/** `F_perm = Fk / S` -- a divisor, matching pneumatic-cylinder@0.1.0's own convention. */
export function resolvePermissibleCompressiveLoad(
  input: PermissibleCompressiveLoadInput,
): PermissibleCompressiveLoadResult {
  assertPositive("bucklingLoadN", input.bucklingLoadN);
  assertFinite("bucklingSafetyFactor", input.bucklingSafetyFactor);
  if (input.bucklingSafetyFactor < 1) {
    fail("bucklingSafetyFactor must be at least 1.");
  }

  return {
    permissibleCompressiveLoadN:
      input.bucklingLoadN / input.bucklingSafetyFactor,
  };
}
```

- [ ] **Step 2: Write `math.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import {
  PneumaticCylinderSizingInputError,
  resolveBucklingLoad,
  resolveCushionKineticEnergy,
  resolvePermissibleCompressiveLoad,
  resolvePistonAreas,
  resolveRequiredForce,
  resolveTheoreticalForce,
  STANDARD_GRAVITY_M_PER_S2,
} from "./math";

describe("resolveRequiredForce", () => {
  it("adds gravity and friction for the extend direction on a vertical lift", () => {
    const { forceN } = resolveRequiredForce({
      processForceN: 0,
      loadMassKg: 10,
      inclineAngleRad: Math.PI / 2,
      frictionCoefficient: 0,
      direction: "extend",
    });
    expect(forceN).toBeCloseTo(10 * STANDARD_GRAVITY_M_PER_S2, 9);
  });

  it("subtracts gravity for the retract direction on a vertical lift", () => {
    const { forceN } = resolveRequiredForce({
      processForceN: 0,
      loadMassKg: 10,
      inclineAngleRad: Math.PI / 2,
      frictionCoefficient: 0,
      direction: "retract",
    });
    expect(forceN).toBeCloseTo(-10 * STANDARD_GRAVITY_M_PER_S2, 9);
  });

  it("can go negative on retract for a strongly gravity-assisted heavy load", () => {
    const { forceN } = resolveRequiredForce({
      processForceN: 0,
      loadMassKg: 50,
      inclineAngleRad: Math.PI / 2,
      frictionCoefficient: 0.02,
      direction: "retract",
    });
    expect(forceN).toBeLessThan(0);
  });

  it("applies process force only on the extend direction", () => {
    const extend = resolveRequiredForce({
      processForceN: 500,
      loadMassKg: 1,
      inclineAngleRad: 0,
      frictionCoefficient: 0,
      direction: "extend",
    });
    const retract = resolveRequiredForce({
      processForceN: 500,
      loadMassKg: 1,
      inclineAngleRad: 0,
      frictionCoefficient: 0,
      direction: "retract",
    });
    expect(extend.forceN).toBeCloseTo(500, 9);
    expect(retract.forceN).toBeCloseTo(0, 9);
  });

  it("keeps friction direction-symmetric (always added)", () => {
    const extend = resolveRequiredForce({
      processForceN: 0,
      loadMassKg: 10,
      inclineAngleRad: 0,
      frictionCoefficient: 0.3,
      direction: "extend",
    });
    const retract = resolveRequiredForce({
      processForceN: 0,
      loadMassKg: 10,
      inclineAngleRad: 0,
      frictionCoefficient: 0.3,
      direction: "retract",
    });
    expect(extend.forceN).toBeCloseTo(retract.forceN, 9);
    expect(extend.forceN).toBeGreaterThan(0);
  });

  it("rejects an incline angle outside [0, pi/2]", () => {
    expect(() =>
      resolveRequiredForce({
        processForceN: 0,
        loadMassKg: 1,
        inclineAngleRad: Math.PI,
        frictionCoefficient: 0,
        direction: "extend",
      }),
    ).toThrow(PneumaticCylinderSizingInputError);
  });

  it("rejects a negative process force", () => {
    expect(() =>
      resolveRequiredForce({
        processForceN: -1,
        loadMassKg: 1,
        inclineAngleRad: 0,
        frictionCoefficient: 0,
        direction: "extend",
      }),
    ).toThrow(PneumaticCylinderSizingInputError);
  });
});

describe("resolvePistonAreas", () => {
  it("computes A1 = pi*D^2/4 and A2 = pi*(D^2-d^2)/4", () => {
    const { extendAreaMm2, retractAreaMm2 } = resolvePistonAreas({
      boreDiameterMm: 50,
      rodDiameterMm: 16,
    });
    expect(extendAreaMm2).toBeCloseTo((Math.PI * 50 ** 2) / 4, 6);
    expect(retractAreaMm2).toBeCloseTo(
      (Math.PI * (50 ** 2 - 16 ** 2)) / 4,
      6,
    );
  });

  it("rejects a rod diameter not smaller than the bore diameter", () => {
    expect(() =>
      resolvePistonAreas({ boreDiameterMm: 50, rodDiameterMm: 50 }),
    ).toThrow(PneumaticCylinderSizingInputError);
  });
});

describe("resolveTheoreticalForce", () => {
  it("computes F = eta * A * P", () => {
    const { forceN } = resolveTheoreticalForce({
      areaMm2: 1963.5,
      pressureMPa: 0.5,
      loadFactor: 0.7,
    });
    expect(forceN).toBeCloseTo(0.7 * 1963.5 * 0.5, 6);
  });

  it("rejects a load factor outside [0, 1]", () => {
    expect(() =>
      resolveTheoreticalForce({ areaMm2: 100, pressureMPa: 0.5, loadFactor: 1.5 }),
    ).toThrow(PneumaticCylinderSizingInputError);
  });
});

describe("resolveCushionKineticEnergy", () => {
  it("computes E = (m/2) * V^2", () => {
    const { kineticEnergyJ } = resolveCushionKineticEnergy({
      loadMassKg: 50,
      maxPistonSpeedMps: 0.3,
    });
    expect(kineticEnergyJ).toBeCloseTo(2.25, 6);
  });
});

describe("resolveBucklingLoad / resolvePermissibleCompressiveLoad", () => {
  it("computes a smaller buckling load for a longer column", () => {
    const short = resolveBucklingLoad({
      rodDiameterMm: 16,
      columnLengthMm: 200,
      mountingStyle: "fixed-supported",
    });
    const long = resolveBucklingLoad({
      rodDiameterMm: 16,
      columnLengthMm: 800,
      mountingStyle: "fixed-supported",
    });
    expect(long.bucklingLoadN).toBeLessThan(short.bucklingLoadN);
  });

  it("computes permissible load as buckling load / safety factor", () => {
    const { bucklingLoadN } = resolveBucklingLoad({
      rodDiameterMm: 16,
      columnLengthMm: 400,
      mountingStyle: "fixed-free",
    });
    const { permissibleCompressiveLoadN } = resolvePermissibleCompressiveLoad({
      bucklingLoadN,
      bucklingSafetyFactor: 4,
    });
    expect(permissibleCompressiveLoadN).toBeCloseTo(bucklingLoadN / 4, 6);
  });

  it("rejects a safety factor below 1", () => {
    expect(() =>
      resolvePermissibleCompressiveLoad({
        bucklingLoadN: 1000,
        bucklingSafetyFactor: 0.5,
      }),
    ).toThrow(PneumaticCylinderSizingInputError);
  });
});
```

- [ ] **Step 3: Run the new tests**

Run: `npx vitest run lib/modules/pneumatic-cylinder-sizing/0.1.0/math.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 4: Commit**

```bash
git add lib/modules/pneumatic-cylinder-sizing/0.1.0/math.ts lib/modules/pneumatic-cylinder-sizing/0.1.0/math.test.ts
git commit -m "feat: pneumatic-cylinder-sizing kernel (required force, reproduced force/cushion/buckling formulas)"
```

### Task 6: Write `manifest.ts` and `values.ts`

**Files:**
- Create: `lib/modules/pneumatic-cylinder-sizing/0.1.0/manifest.ts`
- Create: `lib/modules/pneumatic-cylinder-sizing/0.1.0/values.ts`

- [ ] **Step 1: Write `manifest.ts`**

```typescript
// Manifest and ports for the pneumatic-cylinder-sizing module (Unit 7.2,
// Milestone 7 / roadmap Phase 2). Self-contained, no linear-axis@1 role,
// no Motor Sizing Tool family relationship (same "new, standalone family"
// treatment pneumatic-cylinder@0.1.0 itself received) -- see
// context/modules/pneumatic-cylinder-sizing/stage-1-spec.md.
//
// Reuses ten existing parameters directly (motion.axis.incline_angle,
// motion.axis.friction_coefficient, motion.axis.total_moving_mass,
// pneumatic.operating_pressure, pneumatic.load_factor,
// pneumatic.cushion_type, pneumatic.mounting_style,
// pneumatic.buckling_safety_factor, pneumatic.max_piston_speed,
// pneumatic.kinetic_energy) -- see stage-2-contract.md "Existing
// Parameter Review". Several inputs are also echoed as outputs
// (operating_pressure, load_factor, buckling_safety_factor,
// mounting_style, cushion_type, required_stroke): CatalogAdapter.
// requiredSpec() (./index.ts) only receives ModuleComputation.outputs,
// not raw resolved inputs, and lib/application/catalogs/
// pneumatic-cylinder-matching.ts needs these resolved values to run its
// own per-candidate formula evaluation.

import {
  asParameterId,
  type ModuleManifest,
  type ModulePorts,
} from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const manifest: Omit<ModuleManifest, "contentHash"> = {
  id: "pneumatic-cylinder-sizing",
  version: "0.1.0",
  sdkRange: { min: "1.0.0" },
  // Draft-authored against registry 1.17.0. Keep this literal -- never
  // import the mutable current-version constant
  // (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.17.0",
  category: "cylinder-sizing.pneumatic",
  tags: ["pneumatic-cylinder-sizing", "pneumatics", "actuator", "catalog-matching"],
  workflowRoles: [],
  validityEnvelopeSummary:
    "Given a load (mass, incline angle, friction coefficient, optional extend-stroke process force), a required stroke, and the engineer's own operating pressure, force-sizing load factor, cushion type, mounting style, and buckling safety factor, computes the required extend/retract force and required cushion kinetic energy for catalog matching against real SMC CM2/CA2 cylinder candidates -- it does not check one already-selected cylinder (that is pneumatic-cylinder@0.1.0's own scope). No load-case (normal/peak/etc.) semantics: every input is a single engineer-supplied value per run. Reproduces (independently, not imported) pneumatic-cylinder@0.1.0's own theoretical-force, cushion-kinetic-energy, and generic Euler buckling formulas -- the same disclosed evidence gaps that module carries (no pneumatic-manufacturer-sourced buckling formula; buckling governs on the extend/thrust stroke only) apply here unchanged. Process force is applied on the extend stroke only, a disclosed 0.1.0 simplification. Required retract force may be negative for a strongly gravity-assisted return stroke, reported as computed. Lateral (side) rod-end load is out of scope, matching pneumatic-cylinder@0.1.0.",
  sourceRevisionIds: [
    asSourceRevisionId(
      "us.milwaukee_cylinder.design_engineering_guide@web-2026-08-24",
    ),
    asSourceRevisionId("jp.smc.air_cylinders_model_selection@web-2026-08-24"),
    asSourceRevisionId("us.norgren.m1000_heavy_duty_cylinders@web-2026-08-24"),
    asSourceRevisionId("jp.smc.cm2_ca2_catalog@web-2026-08-24"),
  ],
};

export const ports: ModulePorts = {
  inputs: [
    {
      key: "incline_angle",
      parameterId: asParameterId("motion.axis.incline_angle"),
      required: true,
    },
    {
      key: "friction_coefficient",
      parameterId: asParameterId("motion.axis.friction_coefficient"),
      required: true,
    },
    {
      key: "load_mass",
      parameterId: asParameterId("motion.axis.total_moving_mass"),
      required: true,
    },
    {
      key: "process_force",
      parameterId: asParameterId("pneumatic_sizing.process_force"),
      required: false,
    },
    {
      key: "operating_pressure",
      parameterId: asParameterId("pneumatic.operating_pressure"),
      required: true,
    },
    {
      key: "load_factor",
      parameterId: asParameterId("pneumatic.load_factor"),
      required: true,
    },
    {
      key: "max_piston_speed",
      parameterId: asParameterId("pneumatic.max_piston_speed"),
      required: true,
    },
    {
      key: "cushion_type",
      parameterId: asParameterId("pneumatic.cushion_type"),
      required: true,
    },
    {
      key: "required_stroke",
      parameterId: asParameterId("pneumatic_sizing.required_stroke"),
      required: true,
    },
    {
      key: "mounting_style",
      parameterId: asParameterId("pneumatic.mounting_style"),
      required: true,
    },
    {
      key: "buckling_safety_factor",
      parameterId: asParameterId("pneumatic.buckling_safety_factor"),
      required: true,
    },
  ],
  outputs: [
    {
      key: "required_extend_force",
      parameterId: asParameterId("pneumatic_sizing.required_extend_force"),
    },
    {
      key: "required_retract_force",
      parameterId: asParameterId("pneumatic_sizing.required_retract_force"),
    },
    {
      key: "kinetic_energy",
      parameterId: asParameterId("pneumatic.kinetic_energy"),
    },
    {
      key: "required_stroke_out",
      parameterId: asParameterId("pneumatic_sizing.required_stroke"),
    },
    {
      key: "operating_pressure_out",
      parameterId: asParameterId("pneumatic.operating_pressure"),
    },
    {
      key: "load_factor_out",
      parameterId: asParameterId("pneumatic.load_factor"),
    },
    {
      key: "buckling_safety_factor_out",
      parameterId: asParameterId("pneumatic.buckling_safety_factor"),
    },
    {
      key: "mounting_style_out",
      parameterId: asParameterId("pneumatic.mounting_style"),
    },
    {
      key: "cushion_type_out",
      parameterId: asParameterId("pneumatic.cushion_type"),
    },
  ],
};
```

Note the `_out` suffix on echoed output port keys: input and output ports
share one namespace check inside `runModuleConformance` in some SDK
versions, so give each echoed output a distinct local key from its input
counterpart even though both bind the same `parameterId` — confirmed
against `lib/engine/module-sdk/validate.ts` in Task 9's own conformance
run; if that file's own port-key-uniqueness check is scoped separately
per inputs/outputs (not shared), this suffix is still harmless and kept
for clarity either way.

- [ ] **Step 2: Write `values.ts`**

```typescript
// Local EngineeringValue helpers for the pneumatic-cylinder-sizing
// module. Identical pattern to lib/modules/pneumatic-cylinder/0.1.0/values.ts.

import type { EngineeringValue, ModuleInput, Quantity } from "@/lib/engine";

type ModuleValues = ModuleInput["values"];

/** Reads a port value as a `Quantity`, or `undefined` when absent/mismatched. */
export function quantityAt(
  values: ModuleValues,
  key: string,
): Quantity | undefined {
  const value: EngineeringValue | undefined = values[key];
  return value?.kind === "quantity" ? value : undefined;
}

/** Reads a port value's enum option string, or `undefined` when absent/mismatched. */
export function enumValueAt(
  values: ModuleValues,
  key: string,
): string | undefined {
  const value: EngineeringValue | undefined = values[key];
  return value?.kind === "enum" ? value.value : undefined;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add lib/modules/pneumatic-cylinder-sizing/0.1.0/manifest.ts lib/modules/pneumatic-cylinder-sizing/0.1.0/values.ts
git commit -m "feat: pneumatic-cylinder-sizing manifest and ports"
```

### Task 7: Write `checks.ts` and `trace.ts`

**Files:**
- Create: `lib/modules/pneumatic-cylinder-sizing/0.1.0/checks.ts`
- Create: `lib/modules/pneumatic-cylinder-sizing/0.1.0/trace.ts`

- [ ] **Step 1: Write `checks.ts`**

```typescript
// Acceptance checks for the pneumatic-cylinder-sizing module. This module
// computes a required specification for catalog matching, not a pass/fail
// against one candidate part -- see ./index.ts's own catalogAdapter and
// lib/application/catalogs/pneumatic-cylinder-matching.ts for where the
// real per-candidate force/cushion/buckling checks run, once a catalog
// candidate exists. One informational check confirms the specification
// was produced.

import type { CheckResult } from "@/lib/engine";

export function buildChecks(): CheckResult[] {
  return [
    {
      id: "required-specification-computed",
      status: "pass",
      message:
        "Required extend/retract force and required cushion kinetic energy computed for catalog matching.",
      criterion: "all required inputs resolved",
    },
  ];
}
```

- [ ] **Step 2: Write `trace.ts`**

```typescript
// Calculation trace for the pneumatic-cylinder-sizing module. Two
// formula sections (required force, cushion kinetic energy) plus a
// closing validity-and-assumptions section -- the same shape
// pneumatic-cylinder@0.1.0's own trace uses. The required-force step
// cites no source revision: it is general Newtonian statics (mass,
// gravity, incline, friction), the same "textbook physics, not a
// manufacturer-specific formula" treatment ball-screw-motor-sizing's own
// resolveDriveForce trace step already established -- not a fabricated
// citation to a source that does not supply this specific formula.

import { asSourceRevisionId } from "@/lib/standards";
import {
  buildCalculationTrace,
  makeQuantity,
  type CalculationTrace,
  type Quantity,
} from "@/lib/engine";

const SMC_CUSHION_KINETIC_ENERGY = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.smc.air_cylinders_model_selection@web-2026-08-24",
    ),
    clause: "Technical Data 1-4, formula (7)",
    label: "E = (m/2) * V^2",
  },
];

export interface TraceInput {
  readonly processForce: Quantity;
  readonly loadMass: Quantity;
  readonly inclineAngle: Quantity;
  readonly frictionCoefficient: Quantity;
  readonly requiredExtendForceN: number;
  readonly requiredRetractForceN: number;
  readonly maxPistonSpeed: Quantity;
  readonly kineticEnergyJ: number;
  readonly requiredStroke: Quantity;
  readonly operatingPressure: Quantity;
  readonly loadFactor: Quantity;
  readonly cushionType: string;
  readonly mountingStyle: string;
  readonly bucklingSafetyFactor: Quantity;
}

export function buildTrace(input: TraceInput): CalculationTrace {
  return buildCalculationTrace([
    {
      node: "section",
      id: "required-force",
      title: "Required extend/retract force",
      children: [
        {
          node: "step",
          id: "required-force-extend",
          title: "Required extend-side force",
          methodId: "pneumatic_cylinder_sizing.required_force_extend",
          expression:
            "F_req,ext = process_force + m*g*sin(incline_angle) + m*g*mu*cos(incline_angle)",
          inputs: [
            {
              label: "F_proc",
              value: input.processForce,
              ref: "pneumatic_sizing.process_force",
            },
            {
              label: "m",
              value: input.loadMass,
              ref: "motion.axis.total_moving_mass",
            },
            {
              label: "theta",
              value: input.inclineAngle,
              ref: "motion.axis.incline_angle",
            },
            {
              label: "mu",
              value: input.frictionCoefficient,
              ref: "motion.axis.friction_coefficient",
            },
          ],
          outputs: [
            {
              label: "F_req,ext",
              value: makeQuantity(input.requiredExtendForceN, "N"),
              ref: "pneumatic_sizing.required_extend_force",
            },
          ],
          notes: [
            "General Newtonian statics (mass, standard gravity 9.80665 m/s^2, incline, Coulomb friction), not a manufacturer-specific formula -- reproduces ball-screw-motor-sizing@0.2.0's own forward-direction sign convention (context/modules/pneumatic-cylinder-sizing/stage-2-contract.md Decision 1).",
            "Process force is applied on the extend stroke only (Decision 3) -- a disclosed 0.1.0 simplification.",
          ],
        },
        {
          node: "step",
          id: "required-force-retract",
          title: "Required retract-side force",
          methodId: "pneumatic_cylinder_sizing.required_force_retract",
          expression: "F_req,ret = m*g*mu*cos(incline_angle) - m*g*sin(incline_angle)",
          inputs: [
            {
              label: "m",
              value: input.loadMass,
              ref: "motion.axis.total_moving_mass",
            },
            {
              label: "theta",
              value: input.inclineAngle,
              ref: "motion.axis.incline_angle",
            },
            {
              label: "mu",
              value: input.frictionCoefficient,
              ref: "motion.axis.friction_coefficient",
            },
          ],
          outputs: [
            {
              label: "F_req,ret",
              value: makeQuantity(input.requiredRetractForceN, "N"),
              ref: "pneumatic_sizing.required_retract_force",
            },
          ],
          notes: [
            "Reproduces ball-screw-motor-sizing@0.2.0's own return-direction sign convention: friction stays added (direction-symmetric), gravity's term subtracts.",
            input.requiredRetractForceN < 0
              ? "This run's own required retract force is negative: gravity assistance exceeds friction on this stroke, so the actuator must resist/brake rather than drive. Reported as computed, not floored -- the catalog matcher floors it at 0 N only when building its own force-capacity criterion."
              : "This run's own required retract force is non-negative.",
          ],
        },
      ],
    },
    {
      node: "section",
      id: "cushion-kinetic-energy",
      title: "Cushion kinetic energy",
      children: [
        {
          node: "step",
          id: "kinetic-energy",
          title: "Required end-of-stroke kinetic energy",
          methodId: "pneumatic_cylinder_sizing.kinetic_energy",
          expression: "E = (m/2) * V^2",
          inputs: [
            {
              label: "m",
              value: input.loadMass,
              ref: "motion.axis.total_moving_mass",
            },
            {
              label: "V",
              value: input.maxPistonSpeed,
              ref: "pneumatic.max_piston_speed",
            },
          ],
          outputs: [
            {
              label: "E",
              value: makeQuantity(input.kineticEnergyJ, "J"),
              ref: "pneumatic.kinetic_energy",
            },
          ],
          sources: SMC_CUSHION_KINETIC_ENERGY,
          notes: [
            `Cushion type: ${input.cushionType}. Checked against each catalog candidate's own allowable kinetic energy for this cushion type by the catalog matcher (lib/application/catalogs/pneumatic-cylinder-matching.ts), not by this module's own run.`,
          ],
        },
      ],
    },
    {
      node: "section",
      id: "validity-and-assumptions",
      title: "Validity and assumptions",
      children: [
        {
          node: "step",
          id: "scope-notes",
          title: "Scope and assumptions",
          methodId: "pneumatic_cylinder_sizing.scope_notes",
          inputs: [],
          outputs: [],
          notes: [
            `Required stroke: ${input.requiredStroke.value} mm; operating pressure: ${input.operatingPressure.value} MPa; load factor (eta): ${input.loadFactor.value}; mounting style: ${input.mountingStyle}; buckling safety factor: ${input.bucklingSafetyFactor.value}. Echoed as outputs for the catalog matcher, not evaluated as a pass/fail here.`,
            "No load case (normal/peak/etc.) semantics: every input is a single engineer-supplied value per run.",
            "Force capacity, cushion energy, and buckling against a specific catalog candidate are evaluated once catalog matching runs (lib/application/catalogs/pneumatic-cylinder-matching.ts), not by this module's own checks.",
            "Reproduces pneumatic-cylinder@0.1.0's own disclosed evidence gap: no pneumatic-cylinder-manufacturer source supplies a closed-form buckling formula; a generic Euler column formula is used instead, and buckling is assumed to govern on the extend (thrust) stroke only.",
            "Lateral (side) rod-end load is out of scope, matching pneumatic-cylinder@0.1.0.",
          ],
        },
      ],
    },
  ]);
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add lib/modules/pneumatic-cylinder-sizing/0.1.0/checks.ts lib/modules/pneumatic-cylinder-sizing/0.1.0/trace.ts
git commit -m "feat: pneumatic-cylinder-sizing checks and trace"
```

### Task 8: Write `compute.ts`

**Files:**
- Create: `lib/modules/pneumatic-cylinder-sizing/0.1.0/compute.ts`

- [ ] **Step 1: Write it**

```typescript
// Pure, deterministic compute function for the pneumatic-cylinder-sizing
// module (v0.1.0, Stage 3). Resolves required extend/retract force and
// required cushion kinetic energy, echoes catalog-relevant resolved
// inputs as outputs (see ./manifest.ts's own top comment for why), and
// returns a structured computation. Performs no I/O and imports only the
// engine's public surface and this module's own files.

import type { ModuleComputation, ModuleInput, Quantity } from "@/lib/engine";
import { makeQuantity } from "@/lib/engine";
import {
  resolveCushionKineticEnergy,
  resolveRequiredForce,
} from "./math";
import { buildChecks } from "./checks";
import { buildTrace } from "./trace";
import { enumValueAt, quantityAt } from "./values";

export function compute(input: ModuleInput): ModuleComputation {
  const values = input.values;

  const inclineAngle = quantityAt(values, "incline_angle");
  const frictionCoefficient = quantityAt(values, "friction_coefficient");
  const loadMass = quantityAt(values, "load_mass");
  const processForce = quantityAt(values, "process_force");
  const operatingPressure = quantityAt(values, "operating_pressure");
  const loadFactor = quantityAt(values, "load_factor");
  const maxPistonSpeed = quantityAt(values, "max_piston_speed");
  const cushionType = enumValueAt(values, "cushion_type");
  const requiredStroke = quantityAt(values, "required_stroke");
  const mountingStyle = enumValueAt(values, "mounting_style");
  const bucklingSafetyFactor = quantityAt(values, "buckling_safety_factor");

  if (
    inclineAngle === undefined ||
    frictionCoefficient === undefined ||
    loadMass === undefined ||
    operatingPressure === undefined ||
    loadFactor === undefined ||
    maxPistonSpeed === undefined ||
    cushionType === undefined ||
    requiredStroke === undefined ||
    mountingStyle === undefined ||
    bucklingSafetyFactor === undefined
  ) {
    throw new Error(
      "pneumatic-cylinder-sizing requires its full set of load, pressure, load-factor, speed, cushion-type, stroke, mounting-style, and buckling-safety-factor inputs.",
    );
  }

  // process_force is optional at the port level; the registry's own
  // constant default (0 N) auto-fills an absent value
  // (lib/engine/module-sdk/execute.ts resolveModuleInput), matching
  // pneumatic.piping_length's own established pattern -- resolved here
  // defensively in case a caller executes compute() directly with a
  // partially-resolved input.
  const resolvedProcessForce = processForce ?? makeQuantity(0, "N");

  const { forceN: requiredExtendForceN } = resolveRequiredForce({
    processForceN: resolvedProcessForce.value,
    loadMassKg: loadMass.value,
    inclineAngleRad: inclineAngle.value,
    frictionCoefficient: frictionCoefficient.value,
    direction: "extend",
  });
  const { forceN: requiredRetractForceN } = resolveRequiredForce({
    processForceN: resolvedProcessForce.value,
    loadMassKg: loadMass.value,
    inclineAngleRad: inclineAngle.value,
    frictionCoefficient: frictionCoefficient.value,
    direction: "retract",
  });

  const { kineticEnergyJ } = resolveCushionKineticEnergy({
    loadMassKg: loadMass.value,
    maxPistonSpeedMps: maxPistonSpeed.value,
  });

  const outputs: Record<string, Quantity | ReturnType<typeof makeEnumOutput>> = {
    required_extend_force: makeQuantity(requiredExtendForceN, "N"),
    required_retract_force: makeQuantity(requiredRetractForceN, "N"),
    kinetic_energy: makeQuantity(kineticEnergyJ, "J"),
    required_stroke_out: requiredStroke,
    operating_pressure_out: operatingPressure,
    load_factor_out: loadFactor,
    buckling_safety_factor_out: bucklingSafetyFactor,
    mounting_style_out: makeEnumOutput("pneumatic_mounting_style", mountingStyle),
    cushion_type_out: makeEnumOutput("pneumatic_cushion_type", cushionType),
  };

  return {
    outputs,
    trace: buildTrace({
      processForce: resolvedProcessForce,
      loadMass,
      inclineAngle,
      frictionCoefficient,
      requiredExtendForceN,
      requiredRetractForceN,
      maxPistonSpeed,
      kineticEnergyJ,
      requiredStroke,
      operatingPressure,
      loadFactor,
      cushionType,
      mountingStyle,
      bucklingSafetyFactor,
    }),
    checks: buildChecks(),
    warnings: [],
    assumptions: [
      {
        id: "no-per-candidate-check-in-this-run",
        statement:
          "This run computes a required specification for catalog matching; it does not check one specific candidate cylinder. Force capacity, cushion energy, and buckling against a real catalog candidate are evaluated by lib/application/catalogs/pneumatic-cylinder-matching.ts once catalog candidates exist.",
      },
      {
        id: "process-force-extend-only",
        statement:
          "The optional process force is applied on the extend stroke only, a disclosed 0.1.0 simplification (context/modules/pneumatic-cylinder-sizing/stage-2-contract.md Decision 3).",
        value: resolvedProcessForce,
      },
      {
        id: "retract-force-may-be-negative",
        statement:
          "Required retract force may be negative for a strongly gravity-assisted return stroke on a heavy unbalanced load, meaning the actuator must resist/brake rather than drive. Reported as computed, not floored.",
      },
      {
        id: "buckling-governs-extend-disclosed-gap",
        statement:
          "Reproduces pneumatic-cylinder@0.1.0's own disclosed evidence gap: no pneumatic-cylinder-manufacturer source supplies a closed-form buckling formula; a generic Euler column formula is used, and buckling is assumed to govern on the extend (thrust) stroke only.",
      },
      {
        id: "no-load-case-semantics",
        statement:
          "No load case (normal/peak/etc.) semantics: every input is a single engineer-supplied value per calculation run.",
      },
    ],
    validity: [],
  };
}

function makeEnumOutput(enumId: string, value: string) {
  return { kind: "enum" as const, enumId, value };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. If `Record<string, Quantity | ReturnType<typeof makeEnumOutput>>` does not satisfy `ModuleComputation["outputs"]` (`Readonly<Record<string, EngineeringValue>>`), widen the type annotation to `Record<string, EngineeringValue>` and import `EngineeringValue` from `@/lib/engine` instead — check `pneumatic-cylinder/0.1.0/compute.ts`'s own `outputs: Record<string, Quantity>` for the working pattern when every output is the same kind; this module's own outputs mix `Quantity` and `EnumValue`, so `Record<string, EngineeringValue>` is the correct, more general annotation to use directly rather than the union shown above (the union is shown here only to make the two output kinds explicit while drafting — replace it with `EngineeringValue` when writing the real file).

- [ ] **Step 3: Commit**

```bash
git add lib/modules/pneumatic-cylinder-sizing/0.1.0/compute.ts
git commit -m "feat: pneumatic-cylinder-sizing compute function"
```

### Task 9: Write `ui.ts`, `report.ts`, and a draft `validation.ts`

**Files:**
- Create: `lib/modules/pneumatic-cylinder-sizing/0.1.0/ui.ts`
- Create: `lib/modules/pneumatic-cylinder-sizing/0.1.0/report.ts`
- Create: `lib/modules/pneumatic-cylinder-sizing/0.1.0/validation.ts`

- [ ] **Step 1: Write `ui.ts`**

```typescript
// Generic UI schema for the pneumatic-cylinder-sizing module. Selects and
// groups input ports for the generic module workspace; encodes no
// computation.

import type { ModuleUiSchema } from "@/lib/engine";

export const uiSchema: ModuleUiSchema = {
  groups: [
    {
      id: "load",
      title: "Load and installation",
      fields: [
        { portKey: "load_mass" },
        { portKey: "incline_angle" },
        { portKey: "friction_coefficient" },
        {
          portKey: "process_force",
          help: "Optional additive working force on the extend stroke only (e.g. clamping or pressing). Zero if the cylinder only needs to move the load.",
        },
      ],
    },
    {
      id: "cylinder-requirements",
      title: "Cylinder requirements",
      fields: [
        { portKey: "required_stroke" },
        { portKey: "operating_pressure" },
        {
          portKey: "load_factor",
          help: "Required. No built-in default -- SMC's own load-factor table keys it to operation type.",
        },
        { portKey: "max_piston_speed" },
        { portKey: "cushion_type" },
        { portKey: "mounting_style" },
        {
          portKey: "buckling_safety_factor",
          help: "Required. No built-in default -- no pneumatic-cylinder-manufacturer source gives a specific value.",
        },
      ],
    },
  ],
};
```

- [ ] **Step 2: Write `report.ts`**

```typescript
// Generic report schema for the pneumatic-cylinder-sizing module.
// Declares the sections a report renders from the stored trace and
// computation; it never reimplements formulas.

import type { ModuleReportSchema } from "@/lib/engine";

export const reportSchema: ModuleReportSchema = {
  sections: [
    { id: "inputs", title: "Inputs", include: "inputs" },
    { id: "calc", title: "Calculation", include: "trace" },
    { id: "results", title: "Required specification", include: "outputs" },
    { id: "assumptions", title: "Assumptions", include: "assumptions" },
  ],
};
```

- [ ] **Step 3: Write a draft `validation.ts`**

This is a draft — Task 12 (Stage 4) replaces `referenceExamples`,
`independentBenchmark`, `reviewer`, and `reviewDate` with the real,
verified content. Write this placeholder-free draft now so the package
assembles and typechecks; it is not the final validation record.

```typescript
// Validation record for the pneumatic-cylinder-sizing module (roadmap
// module definition of done, item 10). Stage 3 draft -- Task 12 (Stage 4)
// replaces referenceExamples/independentBenchmark/reviewer/reviewDate
// with the real, verified content once the reference-example
// reproduction and catalog-matching integration are built.

import type { ValidationRecord } from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const validation: ValidationRecord = {
  moduleId: "pneumatic-cylinder-sizing",
  moduleVersion: "0.1.0",
  methods: [
    "Required-force resolution: general Newtonian statics (mass, standard gravity, incline, Coulomb friction), reproducing ball-screw-motor-sizing@0.2.0's own forward/return sign convention -- not a manufacturer-specific formula.",
    "SMC Corporation theoretical force method (F = eta * A * P), reproduced from pneumatic-cylinder@0.1.0.",
    "SMC Corporation cushion kinetic-energy method (E = (m/2) * V^2), reused directly from pneumatic-cylinder@0.1.0.",
    "Generic Euler column buckling, reproduced from pneumatic-cylinder@0.1.0 (itself reproduced from ball-screw@0.1.0's own end-fixity cases).",
  ],
  sourceRevisionIds: [
    asSourceRevisionId(
      "us.milwaukee_cylinder.design_engineering_guide@web-2026-08-24",
    ),
    asSourceRevisionId("jp.smc.air_cylinders_model_selection@web-2026-08-24"),
    asSourceRevisionId("us.norgren.m1000_heavy_duty_cylinders@web-2026-08-24"),
    asSourceRevisionId("jp.smc.cm2_ca2_catalog@web-2026-08-24"),
  ],
  referenceExamples: [],
  independentBenchmark:
    "Not yet completed -- Stage 4 (Task 12) fills this in. The force/cushion/buckling formulas are reused/reproduced unchanged from pneumatic-cylinder@0.1.0, which already has a completed independent benchmark (Norgren M/1000) for the theoretical-force and air-consumption formula areas; this record cites that prior work rather than re-running it, once Task 12 confirms the citation is accurate.",
  reviewer: "Not yet assigned -- Stage 4 (Task 12).",
  reviewDate: "not yet reviewed",
  supportedUseLimits: [
    "Computes a required specification for catalog matching; does not check one already-selected cylinder (see pneumatic-cylinder@0.1.0 for that scope).",
    "No load case (normal/peak/etc.) semantics; every input is a single engineer-supplied value per run.",
    "Process force is applied on the extend stroke only.",
    "Piston-rod buckling uses a generic (non-pneumatic-manufacturer-sourced) Euler column formula; buckling is assumed to govern on the extend stroke only.",
    "Lateral (side) rod-end load is out of scope.",
  ],
  deviations: [
    "Reproduces every disclosed evidence gap pneumatic-cylinder@0.1.0 already carries for the force/cushion/buckling formula areas (see that module's own validation.ts) -- not silently resolved here.",
  ],
};
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add lib/modules/pneumatic-cylinder-sizing/0.1.0/ui.ts lib/modules/pneumatic-cylinder-sizing/0.1.0/report.ts lib/modules/pneumatic-cylinder-sizing/0.1.0/validation.ts
git commit -m "feat: pneumatic-cylinder-sizing UI/report schema and draft validation record"
```

### Task 10: Write `index.ts`, `test-helpers.ts`, and `package.test.ts`

**Files:**
- Create: `lib/modules/pneumatic-cylinder-sizing/0.1.0/index.ts`
- Create: `lib/modules/pneumatic-cylinder-sizing/0.1.0/test-helpers.ts`
- Create: `lib/modules/pneumatic-cylinder-sizing/0.1.0/package.test.ts`

- [ ] **Step 1: Write `index.ts` (without `catalogAdapter` yet — Task 14 adds it)**

```typescript
// The pneumatic-cylinder-sizing module package (Unit 7.2). Assembles the
// manifest, ports, compute, UI, report, and validation record into a
// single ModulePackage and seals it. catalogAdapter is added in Task 14
// (Stage 5), once the catalog schema and matcher exist.
//
// Named `index.ts` so `npm run registry:generate` discovers this
// package, matching every other released module's own convention.

import { sealModulePackage, type ModulePackage } from "@/lib/engine";
import { manifest, ports } from "./manifest";
import { compute } from "./compute";
import { uiSchema } from "./ui";
import { reportSchema } from "./report";
import { validation } from "./validation";

export const pneumaticCylinderSizingModule: ModulePackage = sealModulePackage({
  manifest,
  ports,
  compute,
  uiSchema,
  reportSchema,
  validation,
});

export default pneumaticCylinderSizingModule;
```

Check `sealModulePackage`'s own parameter type against
`lib/modules/pneumatic-cylinder/0.1.0/index.ts` (which also passes
`inputSchema`) — if `ModulePackage`/`sealModulePackage` requires an
`inputSchema` field (it does, per `context/architecture.md`'s own
`ModulePackage` contract: `inputSchema: ZodSchema`), add:

```typescript
import { ModuleInputSchema } from "@/lib/engine";
```

and pass `inputSchema: ModuleInputSchema` (the generic schema, unmodified
— this module needs no `superRefine` cross-field rule, per
`stage-2-contract.md` Stage 3 Entry Criteria item 2) in the
`sealModulePackage({...})` call.

- [ ] **Step 2: Write `test-helpers.ts`**

```typescript
// Shared test fixtures for the pneumatic-cylinder-sizing module's own
// test files. Mirrors lib/modules/pneumatic-cylinder/0.1.0/test-helpers.ts.

import { makeQuantity, type ModuleInput, type Quantity } from "@/lib/engine";

export type RawInput = { values: Record<string, ReturnType<typeof makeQuantity> | ReturnType<typeof enumValue>> };

export function enumValue(enumId: string, value: string) {
  return { kind: "enum" as const, enumId, value };
}

export function cushionTypeValue(value: "none" | "rubber_bumper" | "air_cushion") {
  return enumValue("pneumatic_cushion_type", value);
}

export function mountingStyleValue(
  value: "fixed-fixed" | "fixed-supported" | "supported-supported" | "fixed-free" | string,
) {
  return enumValue("pneumatic_mounting_style", value);
}

export function asQuantity(value: unknown): Quantity {
  if (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    (value as { kind: unknown }).kind === "quantity"
  ) {
    return value as Quantity;
  }
  throw new Error("Expected a Quantity value.");
}
```

- [ ] **Step 3: Write `package.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
} from "@/lib/engine";
import { readModuleSources } from "../../test-support";
import { pneumaticCylinderSizingModule } from "./index";
import {
  asQuantity,
  cushionTypeValue,
  mountingStyleValue,
  type RawInput,
} from "./test-helpers";

/**
 * A minimal, valid scenario exercising every port. Round engineering
 * numbers, hand-checked before writing this fixture: a 20 kg load on a
 * 30 degree incline, mu = 0.15, no process force -- required_extend_force
 * and required_retract_force are both straightforward to hand-verify.
 */
function baselineInput(): RawInput {
  return {
    values: {
      incline_angle: makeQuantity(30, "deg"),
      friction_coefficient: makeQuantity(0.15, "ratio"),
      load_mass: makeQuantity(20, "kg"),
      process_force: makeQuantity(0, "N"),
      operating_pressure: makeQuantity(0.5, "MPa"),
      load_factor: makeQuantity(0.7, "ratio"),
      max_piston_speed: makeQuantity(0.3, "m/s"),
      cushion_type: cushionTypeValue("rubber_bumper"),
      required_stroke: makeQuantity(400, "mm"),
      mounting_style: mountingStyleValue("fixed-supported"),
      buckling_safety_factor: makeQuantity(4, "ratio"),
    },
  };
}

// Placeholder -- Task 20 (Stage 6) replaces this with the real value from
// `npm run module:source-hash -- pneumatic-cylinder-sizing 0.1.0`.
const EXPECTED_SOURCE_HASH = "0000000000000000";

describe("pneumatic-cylinder-sizing 0.1.0 module conformance", () => {
  const report = runModuleConformance(pneumaticCylinderSizingModule, {
    sampleInputs: [baselineInput()],
    sources: readModuleSources(import.meta.dirname),
    expectedSourceHash: EXPECTED_SOURCE_HASH,
  });

  for (const check of report.checks) {
    if (check.id === "source-immutability") continue; // asserted separately below, expected to fail until Task 20 pins the real hash
    it(`${check.id} (${check.status})`, () => {
      expect(check.status, check.detail).toBe("pass");
    });
  }

  it("runs the import-boundary check and it passes (not skipped)", () => {
    const check = report.checks.find((c) => c.id === "import-boundary");
    expect(check).toBeDefined();
    expect(check?.status, check?.detail).toBe("pass");
  });
});

describe("pneumatic-cylinder-sizing 0.1.0 boundary and invalid input", () => {
  it("requires the full set of load/pressure/speed/stroke/mounting/safety-factor inputs", () => {
    const input = baselineInput();
    delete input.values.load_mass;
    expect(() => executeModule(pneumaticCylinderSizingModule, input)).toThrow();
  });

  it("defaults an absent process_force to 0 N", () => {
    const input = baselineInput();
    delete input.values.process_force;
    expect(() => executeModule(pneumaticCylinderSizingModule, input)).not.toThrow();
  });

  it("rejects an incline angle above 90 degrees via the registry's own declared range", () => {
    const input = baselineInput();
    input.values.incline_angle = makeQuantity(120, "deg");
    expect(() => executeModule(pneumaticCylinderSizingModule, input)).toThrow();
  });

  it("rejects an unknown mounting style", () => {
    const input = baselineInput();
    input.values.mounting_style = mountingStyleValue("cantilevered");
    expect(() => executeModule(pneumaticCylinderSizingModule, input)).toThrow();
  });

  it("rejects a buckling safety factor below 1", () => {
    const input = baselineInput();
    input.values.buckling_safety_factor = makeQuantity(0.5, "ratio");
    expect(() => executeModule(pneumaticCylinderSizingModule, input)).toThrow();
  });
});

describe("pneumatic-cylinder-sizing 0.1.0 outputs", () => {
  it("produces dimensionally correct output units", () => {
    const computation = executeModule(pneumaticCylinderSizingModule, baselineInput());
    expect(computation.outputs.required_extend_force).toMatchObject({ unit: "N" });
    expect(computation.outputs.required_retract_force).toMatchObject({ unit: "N" });
    expect(computation.outputs.kinetic_energy).toMatchObject({ unit: "J" });
  });

  it("computes required_extend_force as process_force + m*g*sin(theta) + m*g*mu*cos(theta)", () => {
    const computation = executeModule(pneumaticCylinderSizingModule, baselineInput());
    const g = 9.80665;
    const thetaRad = (30 * Math.PI) / 180;
    const expected = 20 * g * Math.sin(thetaRad) + 20 * g * 0.15 * Math.cos(thetaRad);
    expect(asQuantity(computation.outputs.required_extend_force).value).toBeCloseTo(expected, 3);
  });

  it("computes required_retract_force as m*g*mu*cos(theta) - m*g*sin(theta)", () => {
    const computation = executeModule(pneumaticCylinderSizingModule, baselineInput());
    const g = 9.80665;
    const thetaRad = (30 * Math.PI) / 180;
    const expected = 20 * g * 0.15 * Math.cos(thetaRad) - 20 * g * Math.sin(thetaRad);
    expect(asQuantity(computation.outputs.required_retract_force).value).toBeCloseTo(expected, 3);
  });

  it("produces a negative required_retract_force on a steep enough incline with low friction", () => {
    const input = baselineInput();
    input.values.incline_angle = makeQuantity(80, "deg");
    input.values.friction_coefficient = makeQuantity(0.05, "ratio");
    const computation = executeModule(pneumaticCylinderSizingModule, input);
    expect(asQuantity(computation.outputs.required_retract_force).value).toBeLessThan(0);
  });

  it("applies process_force only to required_extend_force, not required_retract_force", () => {
    const input = baselineInput();
    input.values.process_force = makeQuantity(500, "N");
    const withForce = executeModule(pneumaticCylinderSizingModule, input);
    const without = executeModule(pneumaticCylinderSizingModule, baselineInput());
    expect(
      asQuantity(withForce.outputs.required_extend_force).value -
        asQuantity(without.outputs.required_extend_force).value,
    ).toBeCloseTo(500, 6);
    expect(
      asQuantity(withForce.outputs.required_retract_force).value,
    ).toBeCloseTo(asQuantity(without.outputs.required_retract_force).value, 6);
  });

  it("echoes required_stroke, operating_pressure, load_factor, buckling_safety_factor, mounting_style, and cushion_type as outputs", () => {
    const computation = executeModule(pneumaticCylinderSizingModule, baselineInput());
    expect(asQuantity(computation.outputs.required_stroke_out).value).toBe(400);
    expect(asQuantity(computation.outputs.operating_pressure_out).value).toBe(0.5);
    expect(asQuantity(computation.outputs.load_factor_out).value).toBe(0.7);
    expect(asQuantity(computation.outputs.buckling_safety_factor_out).value).toBe(4);
    expect(computation.outputs.mounting_style_out).toMatchObject({ value: "fixed-supported" });
    expect(computation.outputs.cushion_type_out).toMatchObject({ value: "rubber_bumper" });
  });
});
```

- [ ] **Step 4: Run the module's own test suite**

Run: `npx vitest run lib/modules/pneumatic-cylinder-sizing/0.1.0`
Expected: every test passes **except** the `source-immutability` check
(deliberately skipped above with a placeholder hash — Task 20 fixes this
at Stage 6, matching the exact mechanical process `pneumatic-cylinder@0.1.0`'s
own Stage 6 used). If any *other* test fails, fix the failing file before
proceeding — do not carry a real defect into later tasks.

- [ ] **Step 5: Typecheck, lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 errors, 0 warnings on every new file.

- [ ] **Step 6: Commit**

```bash
git add lib/modules/pneumatic-cylinder-sizing/0.1.0/index.ts lib/modules/pneumatic-cylinder-sizing/0.1.0/test-helpers.ts lib/modules/pneumatic-cylinder-sizing/0.1.0/package.test.ts
git commit -m "feat: assemble pneumatic-cylinder-sizing 0.1.0 module package"
```

### Task 11: Write the module's own `README.md`

**Files:**
- Create: `lib/modules/pneumatic-cylinder-sizing/0.1.0/README.md`

- [ ] **Step 1: Write it**

```markdown
# pneumatic-cylinder-sizing 0.1.0

Load-in, catalog-match-out pneumatic cylinder sizing. Given a load (mass,
incline angle, friction coefficient, optional extend-stroke process
force), a required stroke, and the engineer's own operating pressure,
force-sizing load factor, cushion type, mounting style, and buckling
safety factor, computes the required extend/retract force and required
cushion kinetic energy, then (via `lib/application/catalogs/
pneumatic-cylinder-matching.ts`) ranks real SMC CM2/CA2 catalog
candidates against that requirement.

Sibling of `pneumatic-cylinder@0.1.0` (which checks one already-selected
cylinder); this module never touches that release. See
`context/modules/pneumatic-cylinder-sizing/stage-1-spec.md` and
`stage-2-contract.md` for the full engineering record, and
`docs/superpowers/specs/2026-08-24-pneumatic-cylinder-sizing-design.md`
for the founder-directed design brief.

## Stage 3 package (2026-08-24)

`manifest.ts`, `math.ts`, `compute.ts`, `checks.ts`, `trace.ts`,
`values.ts`, `ui.ts`, `report.ts`, a draft `validation.ts`, assembled in
`index.ts`. `math.ts` reproduces (independently, not imported)
`pneumatic-cylinder@0.1.0`'s own theoretical-force, cushion-kinetic-
energy, and Euler buckling formulas, and adds a new `resolveRequiredForce`
reproducing `ball-screw-motor-sizing@0.2.0`'s own forward/return sign
convention.

## Stage 4 (validation) — see `validation.ts` and
`validation/pneumatic-cylinder-sizing/0.1.0.md` once Task 12 completes.

## Stage 5 (catalog integration) — see `lib/application/catalogs/
pneumatic-cylinder-matching.ts` once Task 15 completes.
```

- [ ] **Step 2: Commit**

```bash
git add lib/modules/pneumatic-cylinder-sizing/0.1.0/README.md
git commit -m "docs: pneumatic-cylinder-sizing module README"
```

---

## Stage 4 — Validation

### Task 12: Reference-example reproduction and finalized `validation.ts`

**Files:**
- Create: `lib/modules/pneumatic-cylinder-sizing/0.1.0/smc-reference-example.ts`
- Create: `lib/modules/pneumatic-cylinder-sizing/0.1.0/smc-reference-example.test.ts`
- Modify: `lib/modules/pneumatic-cylinder-sizing/0.1.0/validation.ts`

This reproduces the same SMC "bore-size-selection Example 1" scenario
`pneumatic-cylinder@0.1.0`'s own validation record already cites (1000 N
extend-side force required, load factor eta = 0.7 static/clamping,
pressure P = 0.5 MPa, SMC's own selection is a 63 mm bore) — but reached
through *this* module's own compute path from a load, not supplied
directly as a required force. A vertical lift with zero friction and zero
process force makes the algebra exact: `required_extend_force =
load_mass * g * sin(90deg) = load_mass * g`, so `load_mass = 1000 / g`
reproduces the identical 1000 N figure.

- [ ] **Step 1: Write `smc-reference-example.ts`**

```typescript
// Reference-example reproduction (Stage 4) for the pneumatic-cylinder-
// sizing module. Reproduces the same SMC Air Cylinders Model Selection
// bore-size-selection Example 1 pneumatic-cylinder@0.1.0's own validation
// record cites (1000 N extend-side force required, eta = 0.7
// static/clamping, P = 0.5 MPa, SMC's own selection is a 63 mm bore) --
// reached here through this module's own compute path from a load (a
// vertical lift, zero friction, zero process force, load_mass = 1000/g)
// rather than a directly-supplied required force, then checked against
// the same 63 mm bore candidate via this module's own reproduced
// resolvePistonAreas/resolveTheoreticalForce (math.ts).

import { executeModule, makeQuantity } from "@/lib/engine";
import { pneumaticCylinderSizingModule } from "./index";
import { resolvePistonAreas, resolveTheoreticalForce, STANDARD_GRAVITY_M_PER_S2 } from "./math";
import { asQuantity, cushionTypeValue, mountingStyleValue } from "./test-helpers";

export function runSmcBoreSelectionExample() {
  const loadMassKg = 1000 / STANDARD_GRAVITY_M_PER_S2;

  const computation = executeModule(pneumaticCylinderSizingModule, {
    values: {
      incline_angle: makeQuantity(90, "deg"),
      friction_coefficient: makeQuantity(0, "ratio"),
      load_mass: makeQuantity(loadMassKg, "kg"),
      process_force: makeQuantity(0, "N"),
      operating_pressure: makeQuantity(0.5, "MPa"),
      load_factor: makeQuantity(0.7, "ratio"),
      max_piston_speed: makeQuantity(0.3, "m/s"),
      cushion_type: cushionTypeValue("none"),
      required_stroke: makeQuantity(200, "mm"),
      mounting_style: mountingStyleValue("fixed-supported"),
      buckling_safety_factor: makeQuantity(4, "ratio"),
    },
  });

  const requiredExtendForceN = asQuantity(computation.outputs.required_extend_force).value;

  // SMC's own selection for this exact requirement: a 63 mm bore.
  const { extendAreaMm2 } = resolvePistonAreas({
    boreDiameterMm: 63,
    rodDiameterMm: 20, // a standard CM2-63 rod size, per SMC's own catalog dimension table
  });
  const { forceN: theoreticalExtendForceN } = resolveTheoreticalForce({
    areaMm2: extendAreaMm2,
    pressureMPa: 0.5,
    loadFactor: 0.7,
  });

  return { requiredExtendForceN, theoreticalExtendForceN };
}
```

- [ ] **Step 2: Write `smc-reference-example.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { runSmcBoreSelectionExample } from "./smc-reference-example";

describe("SMC bore-size-selection Example 1, reached via this module's own compute path", () => {
  it("reproduces the 1000 N requirement from a vertical-lift load", () => {
    const { requiredExtendForceN } = runSmcBoreSelectionExample();
    expect(requiredExtendForceN).toBeCloseTo(1000, 3);
  });

  it("confirms SMC's own 63 mm bore selection clears the requirement", () => {
    const { requiredExtendForceN, theoreticalExtendForceN } = runSmcBoreSelectionExample();
    expect(theoreticalExtendForceN).toBeGreaterThanOrEqual(requiredExtendForceN);
    // F1 = 0.7 * (pi*63^2/4) * 0.5 ~= 1091.0 N, the same figure
    // pneumatic-cylinder@0.1.0's own validation record already confirms
    // clears this exact requirement.
    expect(theoreticalExtendForceN).toBeCloseTo(1091.0, 0);
  });
});
```

- [ ] **Step 3: Run it**

Run: `npx vitest run lib/modules/pneumatic-cylinder-sizing/0.1.0/smc-reference-example.test.ts`
Expected: PASS, both tests green.

- [ ] **Step 4: Finalize `validation.ts`**

In `lib/modules/pneumatic-cylinder-sizing/0.1.0/validation.ts`, replace
the `referenceExamples: []` line with:

```typescript
  referenceExamples: [
    {
      id: "smc-bore-selection-vertical-lift",
      description:
        "SMC Air Cylinders Model Selection, bore-size-selection Example 1 (1000 N extend-side force required, load factor eta = 0.7 static/clamping, pressure P = 0.5 MPa, SMC's own selection is a 63 mm bore) -- the same scenario pneumatic-cylinder@0.1.0's own validation record cites, reached here through this module's own compute path: a vertical lift (incline_angle = 90 deg), zero friction, zero process force, load_mass = 1000/9.80665 kg reproduces the identical 1000 N requirement (./smc-reference-example.ts). The candidate 63 mm bore (20 mm rod, a standard CM2-63 dimension) clears it at F1 ~= 1091.0 N through this module's own reproduced resolvePistonAreas/resolveTheoreticalForce -- the same figure pneumatic-cylinder@0.1.0's own validation record already confirms for this exact scenario.",
      tolerance: "qualitative: theoretical force clears the required force, matching SMC's own bore selection (same as pneumatic-cylinder@0.1.0's own reference example for this scenario)",
    },
  ],
```

Replace `independentBenchmark`, `reviewer`, and `reviewDate` with:

```typescript
  independentBenchmark:
    "The theoretical-force, cushion-kinetic-energy, and buckling formulas are reused/reproduced unchanged from pneumatic-cylinder@0.1.0, which already has a completed independent benchmark (Norgren M/1000, 7 bore sizes, agreement within 2% on 21 figures) for the theoretical-force formula area, and a disclosed, carried-forward evidence gap for cushion-kinetic-energy-allowable and buckling (no second independent source of any kind) -- see validation/pneumatic-cylinder/0.1.0.md. This record cites that prior work by reference rather than re-running it, since the formulas themselves are byte-for-byte identical (confirmed by this module's own math.test.ts against pneumatic-cylinder@0.1.0's own math.test.ts). The required-force resolution itself (new physics, general Newtonian statics) has no manufacturer method to benchmark against -- the same 'textbook physics, not sourced from a manufacturer' treatment ball-screw-motor-sizing@0.2.0's own resolveDriveForce received, verified instead by the sign-convention property tests in ./math.test.ts (adds gravity forward, subtracts it on return, friction direction-symmetric, can go negative).",
  reviewer:
    "Solo validation -- cites pneumatic-cylinder@0.1.0's own Norgren M/1000 independent-benchmark substitute for the reused force/cushion/buckling formula areas; the new required-force resolution is verified by property tests against ball-screw-motor-sizing@0.2.0's own established sign convention, not a manufacturer benchmark (no manufacturer source publishes this exact resolved-load derivation).",
  reviewDate: "2026-08-24",
```

- [ ] **Step 5: Typecheck, lint, run the full module test suite**

Run: `npx tsc --noEmit && npm run lint && npx vitest run lib/modules/pneumatic-cylinder-sizing/0.1.0`
Expected: 0 type errors, 0 lint errors, all tests pass (source-immutability
still excluded per Task 10's own note, until Task 20).

- [ ] **Step 6: Commit**

```bash
git add lib/modules/pneumatic-cylinder-sizing/0.1.0/smc-reference-example.ts lib/modules/pneumatic-cylinder-sizing/0.1.0/smc-reference-example.test.ts lib/modules/pneumatic-cylinder-sizing/0.1.0/validation.ts
git commit -m "feat: pneumatic-cylinder-sizing Stage 4 reference example and validation record"
```

---

## Stage 5 — Generic surfaces and catalog integration

### Task 13: Fetch real SMC CM2/CA2 catalog dimensions and register the source revision

**Files:**
- Modify: `lib/standards/engineering-sources.ts`

- [ ] **Step 1: Fetch SMC's own CM2/CA2 catalog dimensional data**

Use the `WebFetch` tool against SMC's own CM2 series catalog page/PDF
(start from `https://www.smcworld.com/products/en-jp/` or search for
"SMC CM2 series catalog PDF site:smcworld.com" — the same domain
`pneumatic-cylinder@0.1.0`'s own Stage 1 research already reached; if
`WebFetch` returns HTTP 403, retry with the same browser-User-Agent
workaround `pneumatic-cylinder@0.1.0`'s own Stage 1 notes describe, or
fall back to a distributor mirror the way that module's own Stage 4
recovered `smcpneumatics.com`/text-extraction-proxy access).

Extract, for the CM2 (and CA2, if the same table covers both) series,
across at least these bore sizes — `20, 25, 32, 40, 50, 63, 80, 100` mm
(SMC's own standard CM2 bore range) — and standard mounting variants
`basic` (no dedicated mount, i.e. `fixed-free` end-fixity when body-mounted
with no rod support — actually a basic-mount cylinder is closest to this
project's own `mounting_style` enum's `fixed-free` case), `foot`
(`fixed-supported`), `flange` (`fixed-fixed`), and `clevis`
(`supported-supported`) — the standard mapping catalog mounting styles
use onto Euler end-fixity cases, the same mapping
`pneumatic-cylinder@0.1.0`'s own Stage 2 contract already confirms
Milwaukee's own 8-case mounting diagram reduces to:

- Standard rod diameter per bore size (ISO 6431/VDMA-standard, published
  directly in SMC's own dimension tables — cross-check against the
  well-known ISO 6431 standard pairing before finalizing: 20mm bore -> 8mm
  rod, 25 -> 10mm, 32 -> 12mm, 40 -> 16mm, 50 -> 20mm, 63 -> 20mm,
  80 -> 25mm, 100 -> 25mm — verify each against the real fetched catalog
  and correct any discrepancy; do not ship an unverified guess).
- Standard stroke range per bore (SMC's own CM2 series typically spans
  25-1000+ mm depending on bore and mounting — record the real printed
  min/max for each bore/mounting combination fetched, not a guessed
  round number).
- Allowable cushion kinetic energy by bore, for both `rubber_bumper`
  (standard cushion) and `air_cushion` (air cushion option) — SMC's own
  per-bore table, the same table `pneumatic-cylinder@0.1.0`'s own
  validation record already partially cites (CM2 20-40 bore family:
  0.54-2.35 J range) — extend that citation to the full 20-100 mm bore
  range fetched here.

Record exactly what was fetched, what HTTP status/workaround was needed,
and which figures are directly read vs. inferred, the same evidence-
confidence discipline `pneumatic-cylinder@0.1.0`'s own Stage 1 spec
"Evidence Gaps" section already established — write this into
`context/modules/pneumatic-cylinder-sizing/stage-1-spec.md`'s own
"Sources" section (append a subsection, do not silently overwrite Task 1's
own content) once the fetch completes.

- [ ] **Step 2: Register the new source revision**

Add to `lib/standards/engineering-sources.ts`'s source-document list (near
the existing `jp.smc.air_cylinders_model_selection` entry):

```typescript
{
  id: asSourceDocumentId("jp.smc.cm2_ca2_catalog"),
  classification: "manufacturer_method",
  title: "CM2/CA2 Series Air Cylinders: Standard Type, Double Acting, ISO 6431/VDMA Compatible",
  authority: "SMC Corporation",
  market: "JP",
  access: "public",
  officialUrl: "<the real URL fetched in Step 1>",
  // ... match the surrounding entries' own remaining required fields exactly
},
```

and to the source-revision list:

```typescript
{
  id: asSourceRevisionId("jp.smc.cm2_ca2_catalog@web-2026-08-24"),
  documentId: asSourceDocumentId("jp.smc.cm2_ca2_catalog"),
  edition: "<the real edition/date printed on the fetched catalog page, e.g. 'CM2 series catalog, accessed 2026-08-24'>",
  officialUrl: "<the same URL as above>",
  // ... match the surrounding entries' own remaining required fields exactly
},
```

Read the immediately surrounding entries in the file first (the
`jp.smc.air_cylinders_model_selection` pair, already read in full this
session) to copy every required field this project's own
`SourceDocument`/`SourceRevision` type demands — do not guess a field
shape from this plan's own abbreviated snippet.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add lib/standards/engineering-sources.ts context/modules/pneumatic-cylinder-sizing/stage-1-spec.md
git commit -m "docs: register SMC CM2/CA2 catalog source revision"
```

### Task 14: Catalog schema, seed CSV, and seed script

**Files:**
- Create: `reference/catalog-seed/smc-cm2-ca2.csv`
- Create: `scripts/seed-pneumatic-cylinder-catalog.mts`

- [ ] **Step 1: Define the `pneumatic_cylinder` component schema fields**

Seven attributes, matching Task 13's own fetched data and this module's
own catalog-matching needs (Task 15):

```typescript
const pneumaticCylinderSchemaFields: ComponentAttributeFieldDefinition[] = [
  { key: "bore_diameter", label: "Bore diameter", valueKind: "quantity", required: true, unit: "mm" },
  { key: "rod_diameter", label: "Rod diameter", valueKind: "quantity", required: true, unit: "mm" },
  { key: "stroke_min", label: "Minimum standard stroke", valueKind: "quantity", required: true, unit: "mm" },
  { key: "stroke_max", label: "Maximum standard stroke", valueKind: "quantity", required: true, unit: "mm" },
  { key: "mounting_style", label: "Mounting style", valueKind: "enum", required: true, enumId: "pneumatic_mounting_style" },
  { key: "allowable_kinetic_energy_rubber_bumper", label: "Allowable cushion energy (rubber bumper)", valueKind: "quantity", required: false, unit: "J" },
  { key: "allowable_kinetic_energy_air_cushion", label: "Allowable cushion energy (air cushion)", valueKind: "quantity", required: false, unit: "J" },
];
```

`mounting_style` reuses the identical `pneumatic_mounting_style` enum ID
the registry's own `pneumatic.mounting_style`/
`pneumatic_sizing`-reused-`pneumatic.mounting_style` parameter already
declares (`fixed-fixed`/`fixed-supported`/`supported-supported`/
`fixed-free`) — each catalog row represents one bore + one mounting-style
model variant, matching how SMC's own catalog actually orders these as
distinct model-number configurations.

- [ ] **Step 2: Write `reference/catalog-seed/smc-cm2-ca2.csv`**

One row per bore/mounting combination, using Task 13's own verified
figures. Header and an example row (the executor fills in the remaining
rows — 8 bore sizes x 4 mounting styles = 32 rows — from Task 13's own
recorded data, not fabricated):

```csv
Model,Bore (mm),Rod (mm),Stroke Min (mm),Stroke Max (mm),Mounting,Cushion Energy Rubber Bumper (J),Cushion Energy Air Cushion (J)
CM2B20-basic,20,8,25,300,fixed-free,0.54,1.1
CM2B20-foot,20,8,25,300,fixed-supported,0.54,1.1
CM2B20-flange,20,8,25,300,fixed-fixed,0.54,1.1
CM2B20-clevis,20,8,25,300,supported-supported,0.54,1.1
```

Every row's `Model` column value must be unique (it becomes `partNumber`
on import). Label each mounting variant with a real SMC model-number
suffix convention if Task 13's own fetch found one (e.g. `-Z` for
foot-mount); otherwise use the descriptive suffixes shown above and note
in the CSV's own leading comment line that these are placeholder model
suffixes pending the founder's own real part-number convention.

Add a leading comment (outside the CSV, in the commit message and in
`context/modules/pneumatic-cylinder-sizing/stage-2-contract.md`'s own
addendum) stating plainly: **this is a representative seed dataset from
SMC's own published catalog dimensions, for the founder to review and
trim to their real working set after this module ships — matching the
design doc's own explicit decision, not a claim that every row is a part
the founder actually stocks or specifies.**

- [ ] **Step 3: Write the seed script**

```typescript
// scripts/seed-pneumatic-cylinder-catalog.mts
//
// One-time catalog seed for the pneumatic_cylinder component type
// (Unit 7.2, Task 14). Creates the Manufacturer, ComponentType,
// ComponentSchemaVersion, and imports reference/catalog-seed/
// smc-cm2-ca2.csv via the existing generic CSV import pipeline
// (lib/catalog/csv-import.ts, lib/application/catalogs/import-catalog.ts)
// -- no new catalog-engine code, matching context/architecture.md
// "lib/catalog/": manufacturer part data has no self-serve upload UI in
// the MVP. Run manually, once, against a real database:
//
//   npx tsx scripts/seed-pneumatic-cylinder-catalog.mts
//
// Idempotent: importCatalog's own upsertManufacturerPartRevision
// (ADR-0006) makes a re-run a no-op for unchanged rows.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createComponentSchemaVersion,
  createComponentType,
  createManufacturer,
  loadComponentSchemaVersion,
  loadManufacturer,
  prisma,
  type ComponentAttributeFieldDefinition,
} from "@/lib/db";
import { importCatalog, type ImportMapping } from "@/lib/application";

const PNEUMATIC_CYLINDER_SCHEMA_FIELDS: ComponentAttributeFieldDefinition[] = [
  { key: "bore_diameter", label: "Bore diameter", valueKind: "quantity", required: true, unit: "mm" },
  { key: "rod_diameter", label: "Rod diameter", valueKind: "quantity", required: true, unit: "mm" },
  { key: "stroke_min", label: "Minimum standard stroke", valueKind: "quantity", required: true, unit: "mm" },
  { key: "stroke_max", label: "Maximum standard stroke", valueKind: "quantity", required: true, unit: "mm" },
  { key: "mounting_style", label: "Mounting style", valueKind: "enum", required: true, enumId: "pneumatic_mounting_style" },
  { key: "allowable_kinetic_energy_rubber_bumper", label: "Allowable cushion energy (rubber bumper)", valueKind: "quantity", required: false, unit: "J" },
  { key: "allowable_kinetic_energy_air_cushion", label: "Allowable cushion energy (air cushion)", valueKind: "quantity", required: false, unit: "J" },
];

async function main() {
  let manufacturer = await loadManufacturer("smc-corporation" as never).catch(() => null);
  if (manufacturer === null) {
    manufacturer = await createManufacturer({ name: "SMC Corporation" });
  }

  await createComponentType({
    id: "pneumatic_cylinder",
    name: "Pneumatic cylinder",
    description: "ISO 6431/VDMA-compatible double-acting pneumatic cylinder (SMC CM2/CA2 series and equivalents).",
  }).catch(() => undefined); // idempotent: ignore an already-exists error on re-run

  const schemaVersion = await loadComponentSchemaVersion(
    "pneumatic_cylinder@1.0.0" as never,
  ).catch(() => null) ?? await createComponentSchemaVersion({
    componentTypeId: "pneumatic_cylinder" as never,
    version: "1.0.0",
    fields: PNEUMATIC_CYLINDER_SCHEMA_FIELDS,
  });

  const mapping: ImportMapping = {
    id: "smc-cm2-ca2-basic",
    version: "1.0.0",
    componentTypeId: "pneumatic_cylinder",
    componentSchemaVersionId: schemaVersion.id,
    fields: [
      { target: "partNumber", source: { kind: "column", column: "Model" } },
      { target: "sourceRevision", source: { kind: "constant", value: "2026-08-24" } },
      { target: "bore_diameter", source: { kind: "column", column: "Bore (mm)" }, sourceUnit: "mm" },
      { target: "rod_diameter", source: { kind: "column", column: "Rod (mm)" }, sourceUnit: "mm" },
      { target: "stroke_min", source: { kind: "column", column: "Stroke Min (mm)" }, sourceUnit: "mm" },
      { target: "stroke_max", source: { kind: "column", column: "Stroke Max (mm)" }, sourceUnit: "mm" },
      { target: "mounting_style", source: { kind: "column", column: "Mounting" } },
      { target: "allowable_kinetic_energy_rubber_bumper", source: { kind: "column", column: "Cushion Energy Rubber Bumper (J)" }, sourceUnit: "J" },
      { target: "allowable_kinetic_energy_air_cushion", source: { kind: "column", column: "Cushion Energy Air Cushion (J)" }, sourceUnit: "J" },
    ],
  };

  const csvText = readFileSync(
    join(process.cwd(), "reference/catalog-seed/smc-cm2-ca2.csv"),
    "utf-8",
  );

  const result = await importCatalog(
    {
      manufacturerId: manufacturer.id,
      componentTypeId: "pneumatic_cylinder" as never,
      componentSchemaVersionId: schemaVersion.id,
      mapping,
      csvText,
      sourceLabel: "SMC CM2/CA2 catalog seed (representative, founder-review pending)",
    },
    "system-seed" as never, // replace with a real UserId when run interactively by an authenticated operator
  );

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Fix the `as never` casts and `loadManufacturer`/`loadComponentSchemaVersion`
lookup-by-name-or-throw pattern against the real exported signatures once
writing this file for real — `lib/db`'s branded ID types
(`ManufacturerId`, `ComponentTypeId`, `ComponentSchemaVersionId`) need the
real `as*Id` helper functions (`asManufacturerId`, etc. — grep
`lib/db/repositories/types.ts` for the exact exported name of each) rather
than an `as never` escape hatch; the sketch above prioritizes showing the
full seeding flow over exact branded-type plumbing, which the executor
resolves against the real type definitions at write time.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors once the branded-type casts above are resolved
for real.

- [ ] **Step 5: Commit (do not run the seed script against a live database yet)**

```bash
git add reference/catalog-seed/smc-cm2-ca2.csv scripts/seed-pneumatic-cylinder-catalog.mts
git commit -m "feat: SMC CM2/CA2 catalog seed data and import script"
```

**Do not run `npx tsx scripts/seed-pneumatic-cylinder-catalog.mts` against
the live Neon database without the user's explicit go-ahead** — it writes
shared, project-independent catalog reference data
(`context/architecture.md` "Auth and Access": catalog data has no owner,
but every write is still a real, shared-state mutation). Surface this as
a distinct confirmation step when the plan reaches execution, separate
from every other task in this plan (which only touch the working tree and
a local test/dev run).

### Task 15: The hybrid catalog matcher

**Files:**
- Create: `lib/application/catalogs/pneumatic-cylinder-matching.ts`
- Create: `lib/application/catalogs/pneumatic-cylinder-matching.test.ts`

This is the piece that resolves "Corrections" item 3: the generic
`MatchCriterion`/`rankCandidates` engine handles stroke range, mounting
style, and cushion energy (true single-attribute comparisons); a custom
per-candidate evaluator — reusing this module's own `math.ts` — handles
force capacity and buckling, which need the *same* candidate row's own
bore AND rod diameter combined with the run's own pressure/eta/safety
factor. Both `lib/catalog`'s generic engine and the `CatalogAdapter` SDK
contract stay exactly as released; this file is scoped application-layer
judgment, per the design doc's own explicit allowance.

- [ ] **Step 1: Write `pneumatic-cylinder-matching.ts`**

```typescript
// Hybrid catalog matcher for pneumatic-cylinder-sizing candidates
// (Unit 7.2, Task 15). Combines the generic MatchCriterion/rankCandidates
// engine (lib/catalog) for true single-attribute comparisons (stroke
// range, mounting style, cushion energy) with a custom per-candidate
// evaluator for force capacity and buckling, which need a real formula
// over that SAME candidate's own bore and rod diameter plus this run's
// own pressure/load-factor/safety-factor -- the existing MatchCriterion
// contract cannot express that (see docs/superpowers/plans/
// 2026-08-24-pneumatic-cylinder-sizing-implementation.md "Corrections"
// item 3). Neither lib/catalog's generic engine nor the CatalogAdapter
// SDK contract (lib/engine/module-sdk/types.ts) is changed by this file.

import "server-only";
import {
  describeRequiredSpec,
  rankCandidates,
  type CandidatePart,
  type ComponentAttributes,
  type MatchCriterion,
  type RequiredSpecEntry,
} from "@/lib/catalog";
import type { EngineeringValue, ModuleComputation, Quantity } from "@/lib/engine";
import { makeQuantity } from "@/lib/engine";
import {
  resolveBucklingLoad,
  resolvePermissibleCompressiveLoad,
  resolvePistonAreas,
  resolveTheoreticalForce,
  type PneumaticMountingStyle,
} from "@/lib/modules/pneumatic-cylinder-sizing/0.1.0/math";

export interface PneumaticCylinderMatchCandidate extends CandidatePart {
  readonly attributes: ComponentAttributes;
}

export interface PneumaticCylinderRankedCandidate {
  readonly candidate: PneumaticCylinderMatchCandidate;
  readonly score: number;
  readonly reasons: readonly string[];
}

export interface PneumaticCylinderRejectedCandidate {
  readonly candidate: PneumaticCylinderMatchCandidate;
  readonly reasons: readonly string[];
}

export interface PneumaticCylinderMatchOutcome {
  readonly requiredSpec: readonly RequiredSpecEntry[];
  readonly accepted: readonly PneumaticCylinderRankedCandidate[];
  readonly rejected: readonly PneumaticCylinderRejectedCandidate[];
}

function quantityOutput(
  outputs: ModuleComputation["outputs"],
  key: string,
): Quantity {
  const value = outputs[key];
  if (value === undefined || value.kind !== "quantity") {
    throw new Error(
      `pneumatic-cylinder-sizing computation is missing a quantity output "${key}".`,
    );
  }
  return value;
}

function enumOutput(outputs: ModuleComputation["outputs"], key: string): string {
  const value = outputs[key];
  if (value === undefined || value.kind !== "enum") {
    throw new Error(
      `pneumatic-cylinder-sizing computation is missing an enum output "${key}".`,
    );
  }
  return value.value;
}

function quantityAttribute(
  attributes: ComponentAttributes,
  key: string,
): number | undefined {
  const value: EngineeringValue | undefined = attributes[key];
  return value?.kind === "quantity" ? value.value : undefined;
}

/**
 * Builds the generic-engine criteria (stroke range, mounting style,
 * cushion energy) and runs the custom force/buckling evaluation for every
 * candidate, then combines both into one accepted/rejected result. A
 * candidate must pass every generic criterion AND the custom force and
 * buckling checks to be accepted.
 */
export function evaluatePneumaticCylinderCandidates(
  computation: ModuleComputation,
  candidates: readonly PneumaticCylinderMatchCandidate[],
): PneumaticCylinderMatchOutcome {
  const outputs = computation.outputs;

  const requiredExtendForceN = Math.max(
    0,
    quantityOutput(outputs, "required_extend_force").value,
  );
  const requiredRetractForceN = Math.max(
    0,
    quantityOutput(outputs, "required_retract_force").value,
  );
  const requiredKineticEnergyJ = quantityOutput(outputs, "kinetic_energy").value;
  const requiredStroke = quantityOutput(outputs, "required_stroke_out");
  const operatingPressureMPa = quantityOutput(outputs, "operating_pressure_out").value;
  const loadFactor = quantityOutput(outputs, "load_factor_out").value;
  const bucklingSafetyFactor = quantityOutput(outputs, "buckling_safety_factor_out").value;
  const mountingStyle = enumOutput(outputs, "mounting_style_out") as PneumaticMountingStyle;
  const cushionType = enumOutput(outputs, "cushion_type_out");

  const criteria: MatchCriterion[] = [
    {
      key: "stroke_max",
      label: "Maximum standard stroke",
      operator: "gte",
      value: requiredStroke,
    },
    {
      key: "stroke_min",
      label: "Minimum standard stroke",
      operator: "lte",
      value: requiredStroke,
    },
    {
      key: "mounting_style",
      label: "Mounting style",
      operator: "eq",
      value: { kind: "enum", enumId: "pneumatic_mounting_style", value: mountingStyle },
    },
  ];
  if (cushionType !== "none") {
    criteria.push({
      key: `allowable_kinetic_energy_${cushionType}`,
      label: "Allowable cushion kinetic energy",
      operator: "gte",
      value: makeQuantity(requiredKineticEnergyJ, "J"),
    });
  }

  const generic = rankCandidates(criteria, candidates);
  const genericById = new Map(
    [...generic.accepted, ...generic.rejected].map((evaluation) => [
      evaluation.candidate.id,
      evaluation,
    ]),
  );

  const accepted: PneumaticCylinderRankedCandidate[] = [];
  const rejected: PneumaticCylinderRejectedCandidate[] = [];

  for (const candidate of candidates) {
    const genericEvaluation = genericById.get(candidate.id);
    const genericPassed =
      genericEvaluation !== undefined &&
      generic.accepted.some((a) => a.candidate.id === candidate.id);
    const genericReasons =
      genericEvaluation?.criteria.map((c) => c.message) ?? [];
    const genericScore =
      generic.accepted.find((a) => a.candidate.id === candidate.id)?.score ?? 0;

    const boreDiameterMm = quantityAttribute(candidate.attributes, "bore_diameter");
    const rodDiameterMm = quantityAttribute(candidate.attributes, "rod_diameter");

    if (boreDiameterMm === undefined || rodDiameterMm === undefined) {
      rejected.push({
        candidate,
        reasons: [
          ...genericReasons,
          "\"Bore/rod diameter\" is not present on this part -- force capacity and buckling cannot be evaluated.",
        ],
      });
      continue;
    }

    let forceRodBucklingReasons: string[] = [];
    let forceRodBucklingPassed = true;
    let forceMarginFraction = 0;

    try {
      const { extendAreaMm2, retractAreaMm2 } = resolvePistonAreas({
        boreDiameterMm,
        rodDiameterMm,
      });
      const { forceN: theoreticalExtendForceN } = resolveTheoreticalForce({
        areaMm2: extendAreaMm2,
        pressureMPa: operatingPressureMPa,
        loadFactor,
      });
      const { forceN: theoreticalRetractForceN } = resolveTheoreticalForce({
        areaMm2: retractAreaMm2,
        pressureMPa: operatingPressureMPa,
        loadFactor,
      });

      const extendOk = theoreticalExtendForceN >= requiredExtendForceN;
      const retractOk = theoreticalRetractForceN >= requiredRetractForceN;
      forceRodBucklingReasons.push(
        extendOk
          ? `"Theoretical extend force" ${theoreticalExtendForceN.toFixed(1)} N meets the required minimum ${requiredExtendForceN.toFixed(1)} N`
          : `"Theoretical extend force" ${theoreticalExtendForceN.toFixed(1)} N is below the required minimum ${requiredExtendForceN.toFixed(1)} N`,
      );
      forceRodBucklingReasons.push(
        retractOk
          ? `"Theoretical retract force" ${theoreticalRetractForceN.toFixed(1)} N meets the required minimum ${requiredRetractForceN.toFixed(1)} N`
          : `"Theoretical retract force" ${theoreticalRetractForceN.toFixed(1)} N is below the required minimum ${requiredRetractForceN.toFixed(1)} N`,
      );
      forceRodBucklingPassed = forceRodBucklingPassed && extendOk && retractOk;
      const extendMargin =
        requiredExtendForceN > 0
          ? (theoreticalExtendForceN - requiredExtendForceN) / requiredExtendForceN
          : 0;
      forceMarginFraction += extendMargin;

      const { bucklingLoadN } = resolveBucklingLoad({
        rodDiameterMm,
        columnLengthMm: requiredStroke.value,
        mountingStyle,
      });
      const { permissibleCompressiveLoadN } = resolvePermissibleCompressiveLoad({
        bucklingLoadN,
        bucklingSafetyFactor,
      });
      // Buckling governs on the extend (thrust) stroke only -- the same
      // assumption pneumatic-cylinder@0.1.0 already carries.
      const bucklingOk = theoreticalExtendForceN <= permissibleCompressiveLoadN;
      forceRodBucklingReasons.push(
        bucklingOk
          ? `"Permissible compressive load" ${permissibleCompressiveLoadN.toFixed(1)} N meets the governing extend-side force ${theoreticalExtendForceN.toFixed(1)} N`
          : `"Permissible compressive load" ${permissibleCompressiveLoadN.toFixed(1)} N is below the governing extend-side force ${theoreticalExtendForceN.toFixed(1)} N`,
      );
      forceRodBucklingPassed = forceRodBucklingPassed && bucklingOk;
      const bucklingMargin =
        theoreticalExtendForceN > 0
          ? (permissibleCompressiveLoadN - theoreticalExtendForceN) / theoreticalExtendForceN
          : 0;
      forceMarginFraction += bucklingMargin;
    } catch (err) {
      forceRodBucklingPassed = false;
      forceRodBucklingReasons = [
        err instanceof Error ? err.message : "Force/buckling evaluation failed.",
      ];
    }

    const passed = genericPassed && forceRodBucklingPassed;
    const reasons = [...genericReasons, ...forceRodBucklingReasons];

    if (passed) {
      accepted.push({
        candidate,
        score: (genericScore + forceMarginFraction / 2) / 2,
        reasons,
      });
    } else {
      rejected.push({ candidate, reasons });
    }
  }

  accepted.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.candidate.id < b.candidate.id ? -1 : a.candidate.id > b.candidate.id ? 1 : 0;
  });

  const requiredSpec: RequiredSpecEntry[] = [
    ...describeRequiredSpec(criteria),
    {
      key: "required_extend_force",
      label: "Required extend force (evaluated per candidate, not a flat filter)",
      operator: "gte",
      displayValue: `${requiredExtendForceN.toFixed(1)} N`,
    },
    {
      key: "required_retract_force",
      label: "Required retract force (evaluated per candidate, not a flat filter)",
      operator: "gte",
      displayValue: `${requiredRetractForceN.toFixed(1)} N`,
    },
  ];

  return { requiredSpec, accepted, rejected };
}
```

- [ ] **Step 2: Write `pneumatic-cylinder-matching.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { makeQuantity, type ModuleComputation } from "@/lib/engine";
import { evaluatePneumaticCylinderCandidates } from "./pneumatic-cylinder-matching";

function fixtureComputation(overrides: Partial<Record<string, unknown>> = {}): ModuleComputation {
  return {
    outputs: {
      required_extend_force: makeQuantity(1000, "N"),
      required_retract_force: makeQuantity(200, "N"),
      kinetic_energy: makeQuantity(2, "J"),
      required_stroke_out: makeQuantity(200, "mm"),
      operating_pressure_out: makeQuantity(0.5, "MPa"),
      load_factor_out: makeQuantity(0.7, "ratio"),
      buckling_safety_factor_out: makeQuantity(4, "ratio"),
      mounting_style_out: { kind: "enum", enumId: "pneumatic_mounting_style", value: "fixed-supported" },
      cushion_type_out: { kind: "enum", enumId: "pneumatic_cushion_type", value: "rubber_bumper" },
      ...overrides,
    },
    trace: { nodes: [] } as never,
    checks: [],
    warnings: [],
    assumptions: [],
    validity: [],
  };
}

function candidate(
  id: string,
  attrs: Partial<{
    bore: number;
    rod: number;
    strokeMin: number;
    strokeMax: number;
    mounting: string;
    ke: number;
  }>,
) {
  return {
    id,
    attributes: {
      bore_diameter: makeQuantity(attrs.bore ?? 63, "mm"),
      rod_diameter: makeQuantity(attrs.rod ?? 20, "mm"),
      stroke_min: makeQuantity(attrs.strokeMin ?? 25, "mm"),
      stroke_max: makeQuantity(attrs.strokeMax ?? 500, "mm"),
      mounting_style: { kind: "enum" as const, enumId: "pneumatic_mounting_style", value: attrs.mounting ?? "fixed-supported" },
      allowable_kinetic_energy_rubber_bumper: makeQuantity(attrs.ke ?? 5, "J"),
    },
  };
}

describe("evaluatePneumaticCylinderCandidates", () => {
  it("accepts a candidate that clears every generic and custom check", () => {
    const result = evaluatePneumaticCylinderCandidates(fixtureComputation(), [
      candidate("CM2B63", {}),
    ]);
    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
  });

  it("rejects a candidate whose stroke range does not cover the requirement", () => {
    const result = evaluatePneumaticCylinderCandidates(fixtureComputation(), [
      candidate("CM2B63-short", { strokeMax: 100 }),
    ]);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]?.reasons.some((r) => r.includes("Maximum standard stroke"))).toBe(true);
  });

  it("rejects a candidate whose mounting style does not match", () => {
    const result = evaluatePneumaticCylinderCandidates(fixtureComputation(), [
      candidate("CM2B63-wrong-mount", { mounting: "fixed-free" }),
    ]);
    expect(result.rejected).toHaveLength(1);
  });

  it("rejects a candidate whose bore is too small for the required extend force", () => {
    const result = evaluatePneumaticCylinderCandidates(fixtureComputation(), [
      candidate("CM2B20-small", { bore: 20, rod: 8 }),
    ]);
    expect(result.rejected).toHaveLength(1);
    expect(
      result.rejected[0]?.reasons.some((r) => r.includes("Theoretical extend force")),
    ).toBe(true);
  });

  it("rejects a candidate whose cushion energy rating is too low", () => {
    const result = evaluatePneumaticCylinderCandidates(fixtureComputation(), [
      candidate("CM2B63-weak-cushion", { ke: 0.1 }),
    ]);
    expect(result.rejected).toHaveLength(1);
  });

  it("skips the cushion-energy criterion when cushion_type is none", () => {
    const result = evaluatePneumaticCylinderCandidates(
      fixtureComputation({
        cushion_type_out: { kind: "enum", enumId: "pneumatic_cushion_type", value: "none" },
      }),
      [candidate("CM2B63-no-cushion-rating", { ke: 0 })],
    );
    expect(result.accepted).toHaveLength(1);
  });

  it("ranks a tighter-fitting bore ahead of an oversized one", () => {
    const result = evaluatePneumaticCylinderCandidates(fixtureComputation(), [
      candidate("CM2B100-oversized", { bore: 100, rod: 25 }),
      candidate("CM2B63-tight", { bore: 63, rod: 20 }),
    ]);
    expect(result.accepted.map((a) => a.candidate.id)).toEqual([
      "CM2B63-tight",
      "CM2B100-oversized",
    ]);
  });

  it("floors a negative required_retract_force at 0 N rather than rejecting every candidate", () => {
    const result = evaluatePneumaticCylinderCandidates(
      fixtureComputation({ required_retract_force: makeQuantity(-300, "N") }),
      [candidate("CM2B63", {})],
    );
    expect(result.accepted).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run it**

Run: `npx vitest run lib/application/catalogs/pneumatic-cylinder-matching.test.ts`
Expected: PASS, all 8 tests green. If the `ComponentAttributes`/
`CandidatePart` import path or a `lib/catalog` export name differs from
what is written above, fix the import against the real exports (already
confirmed in this session's own research: `MatchCriterion`,
`CandidatePart`, `RequiredSpecEntry`, `rankCandidates`,
`describeRequiredSpec` all live in `lib/catalog`'s public barrel).

- [ ] **Step 4: Typecheck, lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add lib/application/catalogs/pneumatic-cylinder-matching.ts lib/application/catalogs/pneumatic-cylinder-matching.test.ts
git commit -m "feat: hybrid catalog matcher for pneumatic-cylinder-sizing"
```

### Task 16: Add `catalogAdapter` to the module package

**Files:**
- Modify: `lib/modules/pneumatic-cylinder-sizing/0.1.0/index.ts`

- [ ] **Step 1: Add the adapter**

In `lib/modules/pneumatic-cylinder-sizing/0.1.0/index.ts`, change:

```typescript
export const pneumaticCylinderSizingModule: ModulePackage = sealModulePackage({
  manifest,
  ports,
  compute,
  uiSchema,
  reportSchema,
  validation,
});
```

to:

```typescript
export const pneumaticCylinderSizingModule: ModulePackage = sealModulePackage({
  manifest,
  ports,
  compute,
  uiSchema,
  reportSchema,
  validation,
  catalogAdapter: {
    componentType: "pneumatic_cylinder",
    requiredSpec: (computation) => ({
      required_extend_force: computation.outputs.required_extend_force,
      required_retract_force: computation.outputs.required_retract_force,
      kinetic_energy: computation.outputs.kinetic_energy,
      required_stroke: computation.outputs.required_stroke_out,
      operating_pressure: computation.outputs.operating_pressure_out,
      load_factor: computation.outputs.load_factor_out,
      buckling_safety_factor: computation.outputs.buckling_safety_factor_out,
      mounting_style: computation.outputs.mounting_style_out,
      cushion_type: computation.outputs.cushion_type_out,
    }),
  },
});
```

- [ ] **Step 2: Update `package.test.ts`'s conformance assertions**

The `catalog-adapter` conformance check (`lib/engine/module-sdk/validate.ts`
only checks `componentType` is non-empty — confirmed in this session's own
research) should now report `pass` rather than being absent. Re-run:

Run: `npx vitest run lib/modules/pneumatic-cylinder-sizing/0.1.0/package.test.ts`
Expected: still green; if a new conformance check id appears in
`report.checks` that the existing loop does not yet assert on, confirm it
is `pass` (it iterates every check already, so this should be automatic —
just re-run and read the output).

- [ ] **Step 3: Typecheck, commit**

```bash
npx tsc --noEmit
git add lib/modules/pneumatic-cylinder-sizing/0.1.0/index.ts
git commit -m "feat: wire pneumatic-cylinder-sizing's catalogAdapter"
```

### Task 17: Wire `load-component-assignment-view.ts` for `pneumatic_cylinder`

**Files:**
- Modify: `lib/application/catalogs/load-component-assignment-view.ts`

- [ ] **Step 1: Add the imports**

At the top of `lib/application/catalogs/load-component-assignment-view.ts`,
add:

```typescript
import {
  evaluatePneumaticCylinderCandidates,
  type PneumaticCylinderMatchCandidate,
} from "./pneumatic-cylinder-matching";
import { listManufacturerPartRevisionsByComponentType, type ComponentTypeId } from "@/lib/db";
```

(Confirm the exact exported branded-type helper for constructing a
`ComponentTypeId` from the literal `"pneumatic_cylinder"` — grep
`lib/db/repositories/types.ts` for `asComponentTypeId` or equivalent, and
use it rather than a raw string cast.)

- [ ] **Step 2: Replace the final return branch**

Replace this block (the file's own final `return` statement, the "adapter
exists and the module has run" branch):

```typescript
  // An adapter exists and the module has run: the required specification is
  // real and is displayed. Filtering/ranking still needs the operator mapping
  // Milestone 4 owns (see this file's header), so the candidate tables stay
  // empty and the panel says why.
  return {
    ...base,
    componentType: adapter.componentType,
    matchingUnavailableReason: NO_CRITERIA_REASON,
  };
}
```

with:

```typescript
  // An adapter exists and the module has run. For "pneumatic_cylinder"
  // (Unit 7.2), the requiredSpec -> MatchCriterion mapping now has a real
  // implementation (lib/application/catalogs/pneumatic-cylinder-matching.ts)
  // -- see this file's own header for why every other component type
  // still reports matchingAvailable: false (Milestone 4's own still-open
  // deferral, not touched by this change).
  if (adapter.componentType !== "pneumatic_cylinder") {
    return {
      ...base,
      componentType: adapter.componentType,
      matchingUnavailableReason: NO_CRITERIA_REASON,
    };
  }

  const run = await loadCalculationRun(latestRunId, ownerId);
  if (run === null) {
    return {
      ...base,
      componentType: adapter.componentType,
      matchingUnavailableReason: NO_RUN_REASON,
    };
  }

  const revisions = await listManufacturerPartRevisionsByComponentType(
    "pneumatic_cylinder" as ComponentTypeId,
  );
  const matchCandidates: PneumaticCylinderMatchCandidate[] = revisions.map(
    (revision) => ({ id: revision.id, attributes: revision.attributes }),
  );

  const outcome = evaluatePneumaticCylinderCandidates(
    run.snapshot.computation,
    matchCandidates,
  );

  const revisionById = new Map(revisions.map((r) => [r.id, r]));
  const accepted: RankedCandidateView[] = [];
  for (const rankedCandidate of outcome.accepted) {
    const revision = revisionById.get(
      rankedCandidate.candidate.id as ManufacturerPartRevisionId,
    );
    if (revision === undefined) continue;
    accepted.push({
      part: await describePart(revision, manufacturerNames),
      score: rankedCandidate.score,
      rankingReasons: rankedCandidate.reasons,
    });
  }
  const rejected: RejectedCandidateView[] = [];
  for (const rejectedCandidate of outcome.rejected) {
    const revision = revisionById.get(
      rejectedCandidate.candidate.id as ManufacturerPartRevisionId,
    );
    if (revision === undefined) continue;
    rejected.push({
      part: await describePart(revision, manufacturerNames),
      rejectionReasons: rejectedCandidate.reasons,
    });
  }

  return {
    ...base,
    componentType: adapter.componentType,
    matchingUnavailableReason: null,
    requiredSpec: outcome.requiredSpec,
    matchingAvailable: true,
    accepted,
    rejected,
  };
}
```

Note this rewrite uses `await` inside `for...of` loops (not
`Array.prototype.map`, which cannot `await` sequentially without
`Promise.all` — either works; `Promise.all(outcome.accepted.map(...))` is
an equally valid, more idiomatic alternative if the executor prefers it,
matching whichever style `describeAssignment`'s own existing loop above in
this same file already uses — confirmed in this session's research: that
existing loop already uses a plain `for...of` with `await`, so this
change matches the file's own established style).

- [ ] **Step 3: Run the existing test suite for this file**

Run: `npx vitest run lib/application/catalogs/load-component-assignment-view.test.ts`
Expected: every *existing* test still passes (they exercise modules with
no adapter, or a different component type — untouched by this change,
per the file's own header note this session's research already
confirmed: "a new regression test races two closing links..." is
unrelated; the relevant existing fixture here is the `example-relay`
no-adapter case at that file's own lines 117-136, still `false` as
before). Add one new test:

```typescript
it("returns real ranked/rejected candidates for a pneumatic-cylinder-sizing module instance with catalog rows", async () => {
  // Arrange: a module instance running pneumatic-cylinder-sizing@0.1.0
  // with at least one real run, and at least one seeded
  // ManufacturerPartRevision under componentTypeId "pneumatic_cylinder"
  // (use this file's own existing DB-gated fixture-building helpers --
  // find the pattern an existing "with a run" test in this same file
  // already uses, and follow it exactly rather than inventing a new
  // fixture-setup style).
  // Act: call loadComponentAssignmentView(moduleInstanceId, ownerId).
  // Assert: view.matchingAvailable === true, view.requiredSpec.length > 0,
  // and view.accepted/view.rejected together cover every seeded
  // candidate (accepted.length + rejected.length === candidate count).
});
```

Write the real fixture setup by reading this same test file's own
existing "with a run" test case first (this session did not read this
test file in full — do so before writing the new test, to match its
established Prisma-fixture-building conventions exactly rather than
guessing).

- [ ] **Step 4: Typecheck, lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add lib/application/catalogs/load-component-assignment-view.ts lib/application/catalogs/load-component-assignment-view.test.ts
git commit -m "feat: wire real catalog matching for pneumatic_cylinder component type"
```

### Task 18: Hide `pneumatic-cylinder@0.1.0` from the default "Add module" picker

**Files:**
- Modify: `app/(workspace)/workspace/page.tsx`

- [ ] **Step 1: Add its category to the hidden set**

In `app/(workspace)/workspace/page.tsx`, change:

```typescript
const HIDDEN_MODULE_CATEGORIES: ReadonlySet<string> = new Set([
  "motion.axis",
  "motion.profile",
  "screw",
  // ... (existing entries)
]);
```

by adding `"pneumatic-cylinder"` (the exact `category` value
`pneumatic-cylinder@0.1.0`'s own manifest declares — confirmed this
session, `lib/modules/pneumatic-cylinder/0.1.0/manifest.ts:28`) to the
set. Do **not** add `"cylinder-sizing.pneumatic"` (the new module's own
category) — it must stay visible.

- [ ] **Step 2: Confirm the new module is visible and the old one is not**

Run: `npm run dev` (check the actual bound port per `CLAUDE.md`'s own
note before assuming 3000), open `/workspace`, open "Add module", and
confirm: `pneumatic-cylinder-sizing` appears in the module picker (the
Motor-Sizing-style flat list, or wherever a `cylinder-sizing.*` category
routes — check `AddModuleInstanceDialog`'s own category-to-step mapping
first if it does not appear where expected), and
`pneumatic-cylinder@0.1.0` does not appear anywhere in the default
picker.

- [ ] **Step 3: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add "app/(workspace)/workspace/page.tsx"
git commit -m "feat: hide pneumatic-cylinder@0.1.0 from the default module picker"
```

---

## Stage 6 — Release

### Task 19: Pin the source-immutability hash and finalize validation dates

**Files:**
- Modify: `lib/modules/pneumatic-cylinder-sizing/0.1.0/package.test.ts`

- [ ] **Step 1: Compute the real hash**

Run: `npm run module:source-hash -- pneumatic-cylinder-sizing 0.1.0`
Expected: prints an `expectedSourceHash` value.

- [ ] **Step 2: Pin it and re-enable the check**

In `package.test.ts`, replace:

```typescript
const EXPECTED_SOURCE_HASH = "0000000000000000";
```

with the real printed value, and remove the `if (check.id ===
"source-immutability") continue;` line from the conformance loop (Task 10
Step 3) so it re-joins the normal per-check assertion loop, plus add back
the explicit "runs the source-immutability check and it passes (not
skipped)" test, matching `pneumatic-cylinder@0.1.0`'s own
`package.test.ts` pattern exactly:

```typescript
it("runs the source-immutability check and it passes (not skipped)", () => {
  const check = report.checks.find((c) => c.id === "source-immutability");
  expect(check).toBeDefined();
  expect(check?.status, check?.detail).toBe("pass");
});
```

- [ ] **Step 3: Run the full module suite**

Run: `npx vitest run lib/modules/pneumatic-cylinder-sizing/0.1.0`
Expected: PASS, every check including `source-immutability` and
`catalog-adapter` green.

- [ ] **Step 4: Commit**

```bash
git add lib/modules/pneumatic-cylinder-sizing/0.1.0/package.test.ts
git commit -m "feat: pin pneumatic-cylinder-sizing 0.1.0 source-immutability hash"
```

### Task 20: Register the module

**Files:**
- Modify: `lib/modules/registry.generated.ts` (auto-generated, do not hand-edit)

- [ ] **Step 1: Regenerate the registry**

Run: `npm run registry:generate`
Expected: `lib/modules/registry.generated.ts` now includes
`pneumatic-cylinder-sizing@0.1.0` alongside every other registered
module (26 modules total, up from 25).

- [ ] **Step 2: Confirm it registered cleanly**

Run: `npx vitest run lib/modules/registry.generated.test.ts` (or whatever
the real registry-generation regression test file is named — grep
`lib/modules/*.test.ts` for one that asserts against
`registry.generated.ts` if the exact filename differs from this guess)
Expected: PASS.

- [ ] **Step 3: Typecheck, commit**

```bash
npx tsc --noEmit
git add lib/modules/registry.generated.ts
git commit -m "feat: register pneumatic-cylinder-sizing@0.1.0"
```

### Task 21: Sync documentation

**Files:**
- Modify: `context/progress-tracker.md`
- Modify: `context/roadmap.md`
- Modify: `context/implementation-map.md`

- [ ] **Step 1: Update `context/progress-tracker.md`**

Edit the top status paragraph in place (per `context/ai-workflow-rules.md`
"Documentation Synchronization": edit in place, never append a dated
narrative entry) to add, after the existing pneumatic-cylinder release
sentence: a new sentence recording that Unit 7.2
(`pneumatic-cylinder-sizing@0.1.0`) is released and registered, records
the three implementation corrections found (forward/return precedent,
parameter reuse, `MatchCriterion` architecture gap), and that this is the
project's first module with a real `catalogAdapter` wired end to end
(`lib/application/catalogs/pneumatic-cylinder-matching.ts`) plus a seeded
`pneumatic_cylinder` catalog (representative SMC CM2/CA2 data, pending
founder review/trim per the design doc's own decision). Update the "Where
the project is" table's Milestone 7 row if its own status text needs a
word change (it already reads "In progress" — leave as-is unless every
Phase 2 candidate is now done, which it is not).

- [ ] **Step 2: Update `context/roadmap.md`**

In the "Phase 2 — Common Automation Modules" section, add a new bullet
directly under the existing "Pneumatic cylinder families — done" line:

```markdown
- **Pneumatic cylinder sizing (load-in, catalog-match-out) — done.**
  `pneumatic-cylinder-sizing@0.1.0` released and registered
  (`validation/pneumatic-cylinder-sizing/0.1.0.md`) — the project's first
  module with a real `CatalogAdapter` wired end to end.
```

- [ ] **Step 3: Add Unit 7.2 to `context/implementation-map.md`**

Directly after Unit 7.1's own final Stage 6 section (the same location
Task 5 of this plan referenced when researching Unit 7.1's own structure
— search for `## Unit 7.1` and insert after its content, before the next
`# ` or `## ` heading), add a `## Unit 7.2 — Pneumatic cylinder sizing
module` section following the exact Stage 1 through Stage 6 subsection
structure Unit 7.1 itself uses, summarizing each task this plan completed
(the corrections found, the registry `1.17.0` additive contract, the
kernel, the reference example, the catalog schema/seed/matcher, the
`catalogAdapter` wiring, the hidden-picker change, the sealed content
hash from Task 19, and the registered module count from Task 20).

- [ ] **Step 4: Commit**

```bash
git add context/progress-tracker.md context/roadmap.md context/implementation-map.md
git commit -m "docs: record pneumatic-cylinder-sizing@0.1.0 release"
```

### Task 22: Final full verification

**Files:** none (verification only)

- [ ] **Step 1: Full non-DB test suite**

Run: `npx vitest run`
Expected: every test passes, including every file this plan touched.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: 0 errors, 0 warnings on every file this plan touched.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 5: DB-gated suite (if `DATABASE_URL`/`NODE_EXTRA_CA_CERTS` are set per `CLAUDE.md`)**

Run: `npx vitest run` with those two environment variables set (matching
`context/progress-tracker.md`'s own "Environment notes" for how this
project's DB-gated suite is normally run).
Expected: green, including Task 17's own new
`load-component-assignment-view.test.ts` DB-gated test.

- [ ] **Step 6: Manual smoke test**

Start the dev server (`npm run dev`, confirming the actual bound port),
sign in, create or open a machine project, add a
`pneumatic-cylinder-sizing` module instance, fill in every required
input, run it, confirm the required extend/retract force and kinetic
energy appear with a sensible calculation trace, then open its component
assignment panel and confirm it reports `matchingAvailable` honestly (it
will show **no** candidates and an appropriate message until Task 14's
own seed script is actually run against this dev database — that is
expected, not a bug; re-run this smoke test after seeding if verifying
the full ranked-candidate UI is also wanted).

- [ ] **Step 7: Report status**

Summarize: what's released (`pneumatic-cylinder-sizing@0.1.0`, registry
`1.17.0`, the sealed content hash and source-immutability hash from Task
19/20), what still needs the user's own action (running Task 14's seed
script against the live database, and reviewing/trimming the seeded CM2/
CA2 catalog rows per the design doc's own explicit decision), and any
test/lint/build issue found and fixed along the way that was not already
anticipated by this plan.

---

## Self-review notes (from the plan author, before handing this off)

**Spec coverage:** every decision item in the design doc's own "Decisions
Made With the Founder" section is implemented: old module hidden (Task
18), CM2/CA2 scope only (Task 13/14's own seed data), optional process
force (Task 3/5/8), continuous incline angle not a two-way enum (reused
`motion.axis.incline_angle`, already continuous), ranked-list presentation
via the existing `ComponentAssignmentPanel` with no UI changes (Task 17
populates the existing view shape only), full scope in one release (all
six stages in this one plan), catalog data via the existing generic CSV
path with no self-serve upload UI (Task 14's own script, not a route).
The one explicit "Out of Scope" item this plan does not touch: the
workspace-width/bento-layout change — correctly excluded, per the design
doc's own instruction.

**Placeholder scan:** the only two literal placeholder values in this
plan are `EXPECTED_SOURCE_HASH = "0000000000000000"` (Task 10) and the
real fetched-catalog figures in Task 13/14 (explicitly marked
"representative... pending founder review," matching the design doc's own
required treatment of this exact data, not a plan gap) — both are
resolved by their own later task (Task 19; Task 13's own fetch step) and
neither is silently left unresolved at the end of this plan.

**Type consistency:** `PneumaticCylinderMatchCandidate` (Task 15) is used
by name in Task 17's own import and usage; the module's output port keys
(`required_extend_force`, `required_retract_force`, `kinetic_energy`,
`required_stroke_out`, `operating_pressure_out`, `load_factor_out`,
`buckling_safety_factor_out`, `mounting_style_out`, `cushion_type_out`,
from Task 6's `manifest.ts`) are read by the identical keys in Task 8's
`compute.ts`, Task 16's `catalogAdapter.requiredSpec`, and Task 15's
`quantityOutput`/`enumOutput` calls — cross-checked while writing this
plan, not left to drift.

---

## Execution handoff

Plan complete and saved to
`docs/superpowers/plans/2026-08-24-pneumatic-cylinder-sizing-implementation.md`.
Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per
   task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using
   `executing-plans`, batch execution with checkpoints.

Given how tightly coupled the parameter IDs, formula conventions, and
port keys are across Tasks 1-20 (a mismatch anywhere breaks the chain
silently rather than loudly), Inline Execution in one continuous session
is the safer default here unless the user prefers the subagent review
cadence.

