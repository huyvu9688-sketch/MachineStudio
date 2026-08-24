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
Task 13 for the fetch and registered source revision
(`jp.smc.cm2_ca2_catalog@web-2026-08-24`).

### Task 13 fetch record (2026-08-24): CM2/CA2 catalog dimensions

**What was fetched and how.** `WebFetch` reached `smcworld.com` directly
this session (301/302 redirects to `ca01.smcworld.com`, no HTTP 403 the way
`pneumatic-cylinder@0.1.0`'s own Stage 1/3 sessions hit) — but two full-size
official dimensional-catalog PDFs (CM2's own
`.../CM2-CDM2-Z-E/6-2-1-p0167-0267-cm2_en/data/...pdf`, ~100 printed pages,
and the `BEST-Guide-en/2-m27-49_en.pdf` selection guide) exceeded
`WebFetch`'s own 10 MB read limit before any content came back — a tool-side
limit, not a server block. Two smaller, real, current (non-`discon`/non-
`-old-`) SMC catalog-chapter mirrors succeeded in downloading
(`content.smcetech.com`, 1.1-5.8 MB) but `WebFetch`'s own text-extraction
model could not parse their PDF content stream (reported as
"encoded/binary data"); the raw PDF bytes were saved locally regardless, and
this session extracted real text from them with the locally available
`pdftotext` (poppler-utils) binary rather than a further network fetch — a
real, disclosed workaround distinct in kind from `pneumatic-cylinder@0.1.0`'s
own browser-User-Agent/`--ssl-no-revoke` workaround (that project hit HTTP
403; this session hit a `WebFetch`-side size/parse limit on HTTP 200
responses), in the same "resolve a real tooling gap without fabricating
data" spirit. `smcpneumatics.com` and `content2.smcetech.com` mirrors
returned HTTP 403 or the same 10 MB ceiling, consistent with
`pneumatic-cylinder@0.1.0`'s own recorded `smcpneumatics.com` block.
`r.jina.ai` (the text-extraction proxy that project's own Stage 3 session
used successfully) returned a connection reset on every attempt this
session — not usable this session, unlike its own precedent.

Real content directly read this session (`pdftotext` extraction of the
saved PDF bytes, cross-checked against internal formula consistency and,
where possible, against a second independent document):

- `https://www.smcworld.com/catalog/BEST-technical-data-en/pdf/6-2-1-m21-43-tech_en.pdf`
  (the already-registered `jp.smc.air_cylinders_model_selection` revision) —
  re-read this session for its own "Technical Data 1: Kinetic Energy
  Absorbable by the Cushion Mechanism" table (CM2's own rubber-bumper/
  air-cushion columns, and the combined CA2/CS1/CS2 air-cushion column) and
  "Table (1) Cylinder Piston Area" (bore/rod/piston-area), not previously
  extracted to this depth.
- `https://content.smcetech.com/pdf/CM2_EU.pdf` — SMC's own CM2 series
  "Standard: Double Acting Single Rod" catalog chapter (page codes 1.4-1
  onward): Specifications/How-to-Order page (bore, cushion type and
  allowable kinetic energy, pressure ratings, piston speed, standard/long
  stroke table) and Component Parts/Replacement Parts page (rod-seal part
  numbers, which encode rod diameter directly in SMC's own numbering, e.g.
  `PDU-8Z` = 8 mm rod).
- `https://content.smcetech.com/pdf/CA2_EU.pdf` — SMC's own CA2 series
  "Standard: Double Acting Single Rod, ISO 6431/VDMA Compatible" catalog
  chapter: the same page types (Specifications/How-to-Order, Standard
  Stroke table, Weight/Mounting Bracket page).

**A real correction to this task's own framing: CM2 and CA2 are not one
bore-continuous series.** CM2 covers bore 20/25/32/40 mm only; CA2 (a
separate, ISO 6431/VDMA-compatible tie-rod cylinder line) covers bore
40/50/63/80/100 mm, with 40 mm the only bore both series offer, as two
distinct model lines, not one. Confirmed directly from both series' own
catalog chapters and independently corroborated by three separate web
searches. The combined CM2+CA2 range matches this task's requested 20-100 mm
span exactly, but only as the union of two series.

**Real corrections to this task's own assumed "well-known ISO 6431 standard
pairing"** (20->8, 25->10, 32->12, 40->16, 50->20, 63->20, 80->25,
100->25):

- Bore 40 (CM2): CM2's own catalog gives a **14 mm** rod, not 16 mm —
  directly read from the Component Parts page's own rod-seal part numbers
  (`PDU-14LZ`/`HDU-14`, the same digit-per-mm convention that gives
  `PDU-8Z`/`PDU-10Z`/`PDU-12LZ` for bore 20/25/32 — internally consistent,
  high confidence). CM2 is SMC's own compact/JIS-based cylinder, not itself
  ISO 6431-compliant (unlike CA2), so it is not bound to the ISO 6431
  rod-diameter progression and does not follow it at this bore.
- Bore 100 (CA2/CG1/MB/CS1/CS2, shared table): **30 mm**, not 25 mm —
  directly read from `jp.smc.air_cylinders_model_selection`'s own Table (1)
  (a single, unambiguous entry at this bore), independently corroborated by
  a second, unrelated web-search summary citing the same 30 mm figure for
  CA2 bore 100 specifically.
- Bore 50/63/80: confirmed as assumed (20/20/25 mm) — directly read from
  the same shared Table (1), each a single (non-dual) entry at that bore.
- Bore 40 (CA2 specifically): Table (1) lists two rod options at this bore
  (14 mm and 16 mm); 14 mm is confirmed as CM2's own value (above), so
  **16 mm is inferred, not directly confirmed, as CA2's own bore-40 rod
  diameter** — consistent with CA2's own ISO 6431 compliance claim and the
  ISO 6431 standard's own published 40->16 mm pairing, but no CA2-specific
  rod-seal part-number table (the kind of direct evidence CM2's own catalog
  gave) was found this session. Flagged as inferred, not fabricated.

**Standard stroke ranges (directly read**, each series' own "Standard
Stroke" table, excluding each table's own separately-listed
mounting-restricted "long stroke" option):

- CM2: min 25 mm, all bores. Max standard stroke: 20->400 mm, 25->450 mm,
  32->450 mm, 40->500 mm.
- CA2: min 25 mm, all bores. Max standard stroke: 40->500 mm, 50->600 mm,
  63->600 mm, 80->700 mm, 100->700 mm.

**Cushion kinetic energy (directly read**,
`jp.smc.air_cylinders_model_selection`'s own Technical Data 1 table,
cross-checked against CM2's own catalog spec-table rubber-bumper figures —
identical between the two independent real primary sources):

- CM2 (both `rubber_bumper` and `air_cushion` offered): 20 -> 0.27 J /
  0.54 J; 25 -> 0.4 J / 0.78 J; 32 -> 0.65 J / 1.27 J; 40 -> 1.2 J / 2.35 J
  (`rubber_bumper` / `air_cushion`).
- CA2 (`air_cushion` only — CA2's own catalog spec table lists a single
  "Cushion: Air cushion" attribute and a with/without-cushion order option,
  no rubber-bumper order option at all): 40 -> 2.8 J; 50 -> 4.6 J;
  63 -> 7.8 J; 80 -> 16 J; 100 -> 29 J. No rubber-bumper figure exists to
  record for CA2 — a real catalog gap, not an omission.

**Mounting styles (directly read**, both series' own catalogs; corrected
2026-08-24 after a spec-compliance review found the original wording
overstated CM2's own taxonomy as matching CA2's): CM2 and CA2 do **not**
offer the same taxonomy. `content.smcetech.com/pdf/CM2_EU.pdf` lists 10
mounting options for CM2 — Basic, Axial foot, Front flange, Rear flange,
Single clevis, Double clevis, Front trunnion, Rear trunnion, Integrated
clevis, Boss-cut (the last two are construction/style variants specific to
CM2's own "Series Variations" page, not offered on CA2).
`content.smcetech.com/pdf/CA2_EU.pdf`'s own "How to Order" page lists 7 —
Basic, Axial Foot, Front Flange, Rear Flange, Single Clevis, Double Clevis,
Centre Trunnion. Of the 7 both series share, this project's own 4-case
`pneumatic_mounting_style` enum uses: Basic -> `fixed-free`, Axial Foot ->
`fixed-supported`, Front/Rear Flange -> `fixed-fixed`, Single Clevis ->
`supported-supported` (trunnion, double clevis, and CM2's own two
extra construction variants are catalog options this project's own enum
does not model, matching `pneumatic-cylinder@0.1.0`'s own existing scope).
This correction changes only the reported mounting-taxonomy count for
CM2 — it does not change the four-case mounting-to-end-fixity mapping
above, which was already correctly scoped to the 4 shared, enum-relevant
styles.

**Final table for Task 14's own seed CSV** (bore mm / rod mm / cushion
energy J `rubber_bumper` / `air_cushion` / min-max standard stroke mm; a
"(inferred)" tag marks the one non-directly-read figure):

| Series | Bore (mm) | Rod (mm) | Rubber bumper (J) | Air cushion (J) | Stroke min-max (mm) |
| --- | --- | --- | --- | --- | --- |
| CM2 | 20 | 8 | 0.27 | 0.54 | 25-400 |
| CM2 | 25 | 10 | 0.4 | 0.78 | 25-450 |
| CM2 | 32 | 12 | 0.65 | 1.27 | 25-450 |
| CM2 | 40 | 14 | 1.2 | 2.35 | 25-500 |
| CA2 | 40 | 16 (inferred) | -- (not offered) | 2.8 | 25-500 |
| CA2 | 50 | 20 | -- (not offered) | 4.6 | 25-600 |
| CA2 | 63 | 20 | -- (not offered) | 7.8 | 25-600 |
| CA2 | 80 | 25 | -- (not offered) | 16 | 25-700 |
| CA2 | 100 | 30 | -- (not offered) | 29 | 25-700 |

This supersedes the plan document's own illustrative placeholder CSV
example row (`CM2B20-basic,20,8,25,300,fixed-free,0.54,1.1`) — that row's
own stroke max (300) and cushion-energy figures (0.54/1.1) do not match the
real fetched catalog (real CM2 bore-20 figures are stroke max 400 mm,
rubber bumper 0.27 J, air cushion 0.54 J — the placeholder's "0.54" is this
module's real air-cushion figure misplaced into the rubber-bumper column);
the plan's own example was illustrative only, not itself a fetched figure.

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
