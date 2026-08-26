# Guided Cylinder Sizing Module — Stage 1 Engineering Specification

## Status

- Work unit: Milestone 7 (Phase 2, `context/roadmap.md`), Unit 7.3, Stage 1 —
  engineering specification
- Proposed module ID: `guided-cylinder-sizing`
- Proposed first released version: `0.1.0`
- Founder-directed scope: see
  `docs/superpowers/specs/2026-08-26-guided-cylinder-sizing-design.md` for
  the full founder-confirmed decision record (first of four new pneumatic
  actuator families). This document formalizes that design into the
  project's own Stage 1 shape and records the corrections implementation
  research surfaced (below) that the design doc did not anticipate.
- Date: 2026-08-26

No released parameter, module version, calculation run, or validation
record is changed by this document.

## Purpose

Given a load (mass, incline angle, friction coefficient, optional process
force), a required stroke, three load-offset lever arms (roll/pitch/yaw),
and the engineer's own operating pressure, load-sizing factor, cushion
type, and buckling safety factor, compute the required extend/retract
force and required resultant moment, then rank real SMC MGQ/MGP catalog
guided-cylinder candidates against that requirement (theoretical force,
cushion capacity where a discrete rating exists, stroke range, allowable
lateral load where a discrete rating exists, allowable rotational torque of
the guide plate, and piston-rod buckling). It is the guided-cylinder
counterpart to `pneumatic-cylinder-sizing@0.1.0`'s own round-body scope —
reusing that module's own reasoning and formula bodies (reproduced
independently, not imported, per ADR-0011's reuse policy) plus a new
lateral-load/moment check neither existing pneumatic module has at all,
since a standard round-body cylinder has no built-in guide plate to rate.

It will not:

- invent an unsourced formula for allowable lateral load or allowable
  rotational torque. Both are SMC's own published per-candidate catalog
  ratings (a lookup, not a derived formula) — see "Source Research" below.
- change `lib/catalog`'s generic matching engine or the `CatalogAdapter`
  SDK contract, matching `pneumatic-cylinder-sizing@0.1.0`'s own precedent
  and for the identical reason: force, buckling, lateral load, and moment
  checks all depend on more than one candidate attribute plus run-specific
  inputs at once, which the generic `MatchCriterion` engine cannot express.
  A dedicated application-layer evaluator
  (`lib/application/catalogs/guided-cylinder-matching.ts`) handles these,
  alongside the generic engine for true single-attribute comparisons
  (stroke range).
- provide a self-serve catalog upload UI. The SMC MGQ/MGP seed data is a
  one-time import via the existing generic CSV pipeline, for the founder
  to review and trim to their real working set after this module ships.
- touch `pneumatic-cylinder@0.1.0` or `pneumatic-cylinder-sizing@0.1.0`/
  `0.1.1` (formulas, ports, or validation records) in any way. All stay
  released, immutable, and unchanged.
- model Dual Rod, Table Cylinder, or Rodless families — each is a separate,
  later module and design doc (design doc "Sequencing").

## Source Research (2026-08-26)

Both catalogs were fetched directly this session (`smcpneumatics.com` and
`smcworld.com` both returned HTTP 403, the same block the design doc's own
research session and `pneumatic-cylinder@0.1.0`'s own Stage 1 recorded) via
the same `content2.smcetech.com` mirror pattern the design doc's own Task
13 fetch record established for CM2/CA2: `WebFetch` downloaded both PDFs'
raw bytes successfully (1.3 MB MGQ, 4.9 MB MGP) but its own text-extraction
model could not parse either PDF's content stream (reported as
corrupted/encoded binary) — a `WebFetch`-side parse limitation on an HTTP
200 response, not a source block, the identical situation the design doc's
own Task 13 record already disclosed for the CM2/CA2 catalog chapters. Real
text was extracted from the saved PDF bytes locally with `pdftotext`
(poppler-utils), the same disclosed workaround Task 13 used.

- `https://content2.smcetech.com/pdf/mgq.pdf` — SMC's own "Compact Guide
  Cylinder Series MGQ" catalog (dimensional/rating chapter, printed pages
  ~519-533 of SMC's Best Pneumatics catalog), fetched and read in full.
- `https://content2.smcetech.com/pdf/MGP.pdf` — SMC's own broader "Guided
  Actuators" family catalog chapter, which bundles MGP alongside several
  sibling series (MGJ, MGG, MGC, MGF, MGZ, MGT, MGPS, MGPW). The MGP-
  specific dimensional/rating pages (bore 12-100, slide bearing MGPM and
  ball-bushing MGPL/MGPA variants) were read in full; sibling-series pages
  were not examined (out of scope — this module targets MGQ and MGP only,
  design doc "Out of Scope").

## Corrections to the founder design doc found during implementation research

1. **Force, cushion, and buckling physics are unchanged — confirmed, not
   merely assumed.** Both catalogs' own "Theoretical Output" tables state
   `Theoretical output [N] = Pressure [MPa] x Piston area [mm2]` — the
   identical `F = P*A` shape `pneumatic-cylinder-sizing@0.1.0` already
   reproduces (with `pneumatic.load_factor` applied as the engineer's own
   sizing margin on top, since neither dimensional catalog's own printed
   table shows a load factor — matching the fact that CM2/CA2's own
   dimensional catalog table did not show one either; `eta` comes from
   SMC's separate general Model Selection guide in both cases). Confirmed
   directly, not assumed from the design doc's own reasoning.
2. **MGQ and MGP do not publish equivalent lateral-load data — a real
   cross-series inconsistency the design doc did not anticipate.** MGQ
   publishes a genuine "Allowable Lateral Load" table: force `F (N)` by
   bore size (12-100 mm), bearing type (MGQM slide / MGQL ball bushing),
   and stroke length — a real per-candidate rating, directly readable.
   **MGP does not.** MGP's own "lateral load" section (high-precision ball
   bushing `MGPA` variant only) is a *plate-displacement-vs-load stiffness
   graph* (mm of deflection vs. N of lateral force, per bore/stroke), not
   an allowable-load limit — there is no MGP figure to seed as a discrete
   `allowable_lateral_load` catalog attribute the way there is for MGQ.
   **Decision: the allowable-lateral-load check runs only for MGQ
   candidates in `0.1.0`; MGP candidates skip it** (the generic per-
   candidate evaluator treats a missing attribute as "not applicable," not
   a hard rejection — see "Candidate Evaluation" below) — a disclosed
   `0.1.0` scope limitation, not silently normalized away by inventing an
   MGP figure that does not exist in the source.
3. **Allowable rotational torque of the plate: confirmed as one combined
   figure for both series — the design doc's own finding holds for MGP
   too, not just MGQ.** Both catalogs' own "Allowable Rotational Torque of
   Plate" tables are a single `T (N*m)` figure per bore/bearing-type/stroke
   cell. Full-text search of both fetched catalogs for "roll"/"pitch"/
   "yaw" found zero matches in either (the handful of "pitch" hits in MGP
   are pin-hole-pitch tolerance notes, unrelated). Confirmed directly for
   both series, not assumed by analogy from MGQ alone.
4. **MGQ and MGP each have their own bearing-type naming and rod-diameter
   table — reused directly, not re-derived.** MGQ: `MGQM` (slide bearing),
   `MGQL` (ball bushing); bore(mm)->rod(mm): 12->6, 16->8, 20->10, 25->12,
   32->16, 40->16, 50->20, 63->20, 80->25, 100->30 (directly read from
   MGQ's own Theoretical Output table, cross-checked against its own
   Weight tables). MGP: `MGPM` (slide bearing), `MGPL`/`MGPA` (ball
   bushing / high-precision ball bushing); bore(mm)->rod(mm): 12->6,
   16->8, 20->10, 25->10, 32->14, 40->14, 50->18, 63->18, 80->22, 100->26
   (directly read from MGP's own Theoretical Output table). The two series
   use genuinely different rod-diameter progressions at several shared
   bore sizes (e.g. bore 25: MGQ 12 mm vs. MGP 10 mm) — a real, confirmed
   difference between series, not a transcription risk to reconcile.
5. **Cushion kinetic energy: MGQ publishes a graph, not a table — a real
   gap the design doc did not anticipate at all.** MGQ's own "Allowable
   Kinetic Energy" section is a log-log graph (load mass vs. maximum
   piston speed, one curve per bore size, separate charts for rubber-
   bumper and cushion-less variants) — not the discrete per-bore
   `allowable_kinetic_energy_<cushion_type>` figure CM2/CA2's own catalog
   table gave `pneumatic-cylinder-sizing@0.1.0`, and not found for MGP
   either in this session's own reading. **Decision: `0.1.0` does not seed
   a discrete allowable-kinetic-energy catalog attribute for either
   series.** The cushion-energy check
   `pneumatic-cylinder-sizing@0.1.0`'s own catalog matcher runs (`gte`
   against a seeded allowable figure) is *not* carried into this module —
   `pneumatic.cushion_type` stays a reused input (an engineer's mounting/
   ordering choice, echoed to the report) but this module's own required
   `pneumatic.kinetic_energy` output is reported only, not checked against
   any candidate attribute, in `0.1.0`. A disclosed limitation, not a
   silently dropped one — see "Validation Plan".
6. **No flange/clevis/trunnion mounting-style variants apply to a guided
   cylinder — `pneumatic.mounting_style`'s own Euler end-fixity enum is
   reused only for the buckling check, not as a candidate catalog
   attribute.** A guided cylinder's guide plate (not the piston rod) is
   its primary mechanical mounting interface; MGQ's own "How to Order"
   offers only a basic body mount plus a bottom-mounting variant, and MGP
   is similar — neither publishes the fixed-fixed/fixed-supported/
   supported-supported/fixed-free rod-end taxonomy
   `pneumatic-cylinder-sizing@0.1.0`'s own MatchCriterion checks against a
   seeded `mounting_style` catalog attribute. **Decision: this module
   keeps `pneumatic.mounting_style` as a required input feeding the
   buckling end-fixity formula only (unchanged physics, same four cases)
   and does not add a `mounting_style` catalog attribute or MatchCriterion
   for it** — a real, confirmed scope difference from
   `pneumatic-cylinder-sizing@0.1.0`'s own candidate evaluation, not an
   oversight.

## Load Resolution (reused unchanged from `pneumatic-cylinder-sizing@0.1.0`)

Identical formula, reproduced independently (not imported, per ADR-0011):

```text
weight = load_mass * g                              (g = 9.80665 m/s^2, baked
                                                       constant, not a port)
gravity_term  = weight * sin(incline_angle)
friction_term = weight * friction_coefficient * cos(incline_angle)

required_extend_force  = process_force + gravity_term + friction_term
required_retract_force =                -gravity_term + friction_term
```

Same conventions as `pneumatic-cylinder-sizing@0.1.0`: `incline_angle`
unsigned `[0, 90] deg`, `friction_coefficient` unsigned `>= 0`, process
force applied on the extend stroke only, `required_retract_force` may be
negative and is reported as computed, never floored inside `compute()`.

## Moment Resolution (new)

Reusing the "lateral force" concept already present in the design doc: the
lateral force component the guide plate's own load must resist is the
required extend-side force resolved above (the same force the theoretical-
force check already sizes the cylinder body for) — there is no separate
"lateral load" input; the moment arms convert that force into a moment
about each of three axes:

```text
M_roll  = required_extend_force * roll_offset
M_pitch = required_extend_force * pitch_offset
M_yaw   = required_extend_force * yaw_offset

required_moment = sqrt(M_roll^2 + M_pitch^2 + M_yaw^2)
```

This is ordinary statics (`M = F * d`), not a sourced manufacturer formula
— the same "textbook physics, not fabricated as sourced" treatment
`pneumatic-cylinder-sizing@0.1.0`'s own required-force resolution already
received. **The Euclidean-sum combination method is this module's own
engineering assumption, not SMC's own documented guidance** — neither
fetched catalog gives any instruction for combining separately-computed
moments against its one published torque figure (design doc "Moment-
offset inputs, and a disclosed limitation"). Recorded as an explicit
assumption in `validation.ts` and the calculation trace, not silently
presented as sourced.

## Candidate Evaluation (per real catalog row)

For each SMC MGQ/MGP catalog candidate:

- **Stroke range** (`gte`/`lte` via the generic `MatchCriterion` engine):
  candidate's own `stroke_min`/`stroke_max` must bracket
  `required_stroke`. (No per-bore standard-stroke-set enumeration in
  `0.1.0` — reusing `pneumatic-cylinder-sizing@0.1.0`'s own min/max-bound
  simplification rather than the discrete standard-stroke list each bore
  actually offers.)
- **Force capacity, extend and retract** (custom application-layer
  evaluator): reproduces `resolvePistonAreas` + `resolveTheoreticalForce`
  using the candidate's own bore/rod diameter and the run's own
  `operating_pressure`/`load_factor`, checked against
  `required_extend_force`/`required_retract_force` (floored at 0 N) —
  identical to `pneumatic-cylinder-sizing@0.1.0`.
- **Buckling** (custom application-layer evaluator): reproduces
  `resolveBucklingLoad` + `resolvePermissibleCompressiveLoad` using the
  candidate's own rod diameter, `required_stroke` as column length, and
  the run's own `buckling_safety_factor` and `mounting_style`, checked
  against the extend-side theoretical force — identical assumption and
  identical disclosed evidence gap (no pneumatic-manufacturer-sourced
  buckling formula) as `pneumatic-cylinder-sizing@0.1.0`.
- **Allowable lateral load** (custom application-layer evaluator, new):
  candidate's own seeded `allowable_lateral_load` attribute (present for
  MGQ candidates only — correction 2 above) at the required stroke,
  checked `gte` the computed lateral force (`required_extend_force`).
  **Skipped, not failed, for a candidate with no seeded value** (MGP) —
  an `not_applicable`-style pass-through, not a rejection, since the
  absence reflects a real catalog-data gap, not a candidate that fails
  the check.
- **Allowable rotational torque** (custom application-layer evaluator,
  new): candidate's own seeded `allowable_torque` attribute at the
  required stroke, checked `gte` `required_moment`. Present for every
  candidate in both series (correction 3 above), so this check always
  runs.

No cushion-energy check in `0.1.0` (correction 5). No mounting-style
catalog attribute or MatchCriterion (correction 6).

## Checks (this module's own run, not per-candidate)

Same shape as `pneumatic-cylinder-sizing@0.1.0`: `compute()` produces a
required specification, not a pass/fail against one candidate. One
informational check (`required-specification-computed`) confirms the
specification was produced once inputs resolve.

## Sources

- `jp.smc.mgq_series_catalog@web-2026-08-26` (SMC Corporation, MGQ
  dimensional/rating catalog — theoretical output, allowable lateral
  load, allowable rotational torque of plate, standard stroke, weight)
- `jp.smc.mgp_series_catalog@web-2026-08-26` (SMC Corporation, MGP/guided-
  actuator family catalog — theoretical output, allowable rotational
  torque of plate, plate displacement/stiffness reference data, standard
  stroke, weight)
- Reuses `pneumatic-cylinder-sizing@0.1.0`'s own three registered source
  revisions for the unchanged force/cushion/buckling formula bodies
  (`jp.smc.air_cylinders_model_selection@web-2026-08-24`,
  `us.milwaukee_cylinder.design_engineering_guide@web-2026-08-24`,
  `us.norgren.m1000_heavy_duty_cylinders@web-2026-08-24`) — no new formula
  content for those areas, only new sources for the new lateral-load/
  torque check and the catalog seed data.

### Fetch record (2026-08-26): MGQ/MGP dimensional and rating tables

**MGQ — directly read, high confidence** (bore mm / rod mm / bearing types
MGQM+MGQL / theoretical output table cross-checked against `F=P*A`):

| Bore (mm) | Rod (mm) | Standard stroke range (mm) |
| --- | --- | --- |
| 12 | 6 | 10-100 |
| 16 | 8 | 10-100 |
| 20 | 10 | 20-200 |
| 25 | 12 | 20-200 |
| 32 | 16 | 25-125 |
| 40 | 16 | 25-125 |
| 50 | 20 | 40-200 |
| 63 | 20 | 40-200 |
| 80 | 25 | 10-200 |
| 100 | 30 | 10-200 |

Allowable lateral load `F (N)` (MGQM / MGQL, by bore and stroke) and
allowable rotational torque `T (N*m)` (same axes): both tables fully
present in the fetched catalog (pages ~522-523), transcribed into the
Task-equivalent seed CSV at Stage 5 directly from the extracted text,
cross-checked for internal consistency (torque increasing with bore at a
fixed stroke, decreasing with stroke at a fixed bore — both patterns hold
throughout).

**MGP — directly read, high confidence** (bore mm / rod mm / bearing types
MGPM slide + MGPL/MGPA ball bushing):

| Bore (mm) | Rod (mm) |
| --- | --- |
| 12 | 6 |
| 16 | 8 |
| 20 | 10 |
| 25 | 10 |
| 32 | 14 |
| 40 | 14 |
| 50 | 18 |
| 63 | 18 |
| 80 | 22 |
| 100 | 26 |

Allowable rotational torque `T (N*m)` fully present (strokes 10-400 mm
depending on bore, page ~542) — transcribed at Stage 5. **No allowable
lateral load table exists for MGP** (correction 2) — not seeded for this
series.

## Existing Parameter Review

Reuses the same eleven existing parameter IDs `pneumatic-cylinder-
sizing@0.1.0` already reuses (`motion.axis.incline_angle`,
`motion.axis.friction_coefficient`, `motion.axis.total_moving_mass`,
`pneumatic.operating_pressure`, `pneumatic.load_factor`,
`pneumatic.cushion_type`, `pneumatic.mounting_style`,
`pneumatic.buckling_safety_factor`, `pneumatic.max_piston_speed`,
`pneumatic.kinetic_energy`) minus none — every one of that module's
reused parameters still applies here (cushion_type/kinetic_energy stay as
reused, reported-only fields per correction 5; mounting_style stays
reused for the buckling formula only per correction 6) — and mints six new
ones: `pneumatic_guided_sizing.process_force`,
`required_stroke`, `required_extend_force`, `required_retract_force`
(mirroring `pneumatic_sizing.*`'s own four, new IDs per that module's own
"different direction, mint new" convention), plus
`pneumatic_guided_sizing.roll_offset`, `pitch_offset`, `yaw_offset`, and
`pneumatic_guided_sizing.required_moment` — genuinely new concepts with no
existing parameter of any kind. See `stage-2-contract.md` for the full
accounting.

## Status

Stage 1 done as a draft, formalizing the founder-approved design doc plus
six implementation-research corrections (two of them real, previously
undisclosed catalog-data gaps: MGP's own missing lateral-load table, and
both series' own kinetic-energy graph rather than table). Stage 2
(parameter contract) is next.
