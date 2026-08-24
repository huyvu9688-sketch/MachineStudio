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
