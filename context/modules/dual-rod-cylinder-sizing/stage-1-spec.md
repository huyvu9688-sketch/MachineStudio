# Dual Rod Cylinder Sizing Module — Stage 1 Engineering Specification

## Status

- Work unit: Milestone 7 (Phase 2, `context/roadmap.md`), Unit 7.4, Stage 1 —
  engineering specification
- Proposed module ID: `dual-rod-cylinder-sizing`
- Proposed first released version: `0.1.0`
- Founder-directed scope (2026-08-26): see
  `docs/superpowers/specs/2026-08-26-dual-rod-cylinder-sizing-design.md`
  for the full founder-confirmed decision record, including source
  research, the marketing-claim correction, and the founder's own
  redirection of the load-bearing check from a hidden worst-case margin to
  a real-operating-condition band lookup.
- Date: 2026-08-26

No released parameter, module version, calculation run, or validation
record is changed by this document.

## Purpose

Given a load (mass, incline angle, friction coefficient, optional process
force), a required stroke, an overhang length, and the engineer's own
operating pressure, force-sizing load factor, cushion type, and mounting
orientation, compute the required extend/retract force and required
cushion kinetic-energy absorption, then rank real SMC CXS2 series
(CXS2M/CXS2L) dual-rod catalog candidates against that requirement
(theoretical force, cushion capacity, stroke range, and a load-mass-vs-
overhang-length structural check unique to this twin-guide-rod
mechanism). It is the third of four planned new pneumatic actuator family
sizing modules — after `pneumatic-cylinder-sizing@0.1.0` (round-body) and
`guided-cylinder-sizing@0.1.0` (guide plate) — each a new, standalone,
self-contained family under the same "no upstream module link" precedent
ADR-0011 established for the Motor Sizing Tool family.

It will not:

- add a buckling check. Unlike every other pneumatic sizing module in
  this project, `dual-rod-cylinder-sizing@0.1.0` has no Euler column
  buckling formula anywhere in `math.ts`. Founder-directed
  (2026-08-26): SMC's own CXS2 catalog gives no buckling formula (same
  as every pneumatic catalog this project has read), and this
  mechanism's own governing structural check is SMC's own directly-
  published load-mass-vs-overhang rating — a disclosed scope
  difference, not a gap.
- support the older CXSJ/CXS/CXSW dual-rod sub-families. Scope is CXS2L
  (ball-bushing)/CXS2M (slide-bearing) only — SMC's current replacement
  series. The older sub-families are out of scope for `0.1.0`, not
  deleted or deprecated from future consideration.
- gate every candidate against one hidden conservative worst-case
  load-mass-vs-overhang curve. The original plan (superseded by founder
  correction 2026-08-26) would have selected the single worst-case band
  (max speed, longest stroke, horizontal mounting) and applied a hidden
  safety margin — the founder rejected this as systematically
  over-rejecting ordinary designs ("usually when design, engineer not
  gonna use max speed 800mm/s and use longest stroke in horizon mounting
  without linear support"). Instead this module selects the matching
  band from the engineer's own real `required_stroke`/`max_piston_speed`/
  `mounting_orientation` inputs, mirroring SMC's own two-step "pick your
  graph, then read your curve" process.
- invent a new, unsourced "solve for minimum bore" inverse formula.
  Candidate cylinders are evaluated directly, row by row, using formulas
  this module's own `math.ts` reproduces (independently, not imported)
  from `pneumatic-cylinder-sizing@0.1.0`'s own kernel.
- change `lib/catalog`'s generic matching engine or the `CatalogAdapter`
  SDK contract (`lib/engine/module-sdk/types.ts`). Both stay exactly as
  released. Force capacity, cushion energy, and stroke range are true
  single-attribute comparisons handled by the generic `MatchCriterion`
  engine; the load-mass-vs-overhang band lookup needs a real per-candidate
  interpolation over the run's own operating condition plus the
  candidate's own bore/bearing-type, so it is evaluated by this module's
  own application-layer matcher (`lib/application/catalogs/
  dual-rod-cylinder-matching.ts`), the same hybrid-matcher shape
  `guided-cylinder-matching.ts` already established.
- provide a self-serve catalog upload UI. The SMC CXS2 seed data (Task 14)
  is a one-time import via the existing generic CSV pipeline, for the
  founder to review and trim after this module ships — an explicitly
  heightened review need here, since the seed data is digitized by eye
  from log-log graph images, not transcribed from a printed table (see
  Task 13's own disclosure).
- touch `pneumatic-cylinder@0.1.0`'s, `pneumatic-cylinder-sizing
  @0.1.0`/`0.1.1`'s, or `guided-cylinder-sizing@0.1.0`'s own formulas,
  ports, or validation records in any way. All three stay released,
  immutable, and reachable exactly as before.

## Source research (already done, 2026-08-26 — recorded here for Stage 1 completeness)

SMC's own CXS2 Series catalog (`ES20-275-CXS2.pdf`, fetched via
`content2.smcetech.com`, the same working mirror
`pneumatic-cylinder-sizing@0.1.0`'s and `guided-cylinder-sizing@0.1.0`'s
own sessions already used) was fetched and read directly, alongside the
older CXSJ/CXS/CXSW catalog (`content2.smcetech.com/pdf/CXS.pdf`) for
comparison — text-extracted locally with `pdftotext` since WebFetch's own
text-extraction model could not parse this PDF either (the same recurring
limitation prior sessions already recorded). The founder then supplied 21
full-page, high-resolution screenshots of every "Model Selection" graph in
the CXS2 catalog (`reference/source-material/dual-rod-cylinder/`), read
directly for this module's own digitized dataset (see "Load-bearing check"
below) — this session's own PDF-to-image tooling (`pdftoppm`, Ghostscript,
ImageMagick, Python) was unavailable in this environment, and no data was
fabricated to fill that gap.

**A marketing claim checked against SMC's own engineering table and found
not to hold:** SMC's own product pages describe CXS2 as "double piston
construction" providing "twice the output force" versus the older
CXSJ/CXS. Reading CXS2's own "Theoretical Output" table
(`ES20-275-CXS2.pdf` p.12) against the older CXSJ catalog's own table
(`CXS.pdf` p.738) directly: the two tables are numerically identical —
same bore/rod/area/force figures for every bore size (e.g. CXS2m10: OUT
157mm²/IN 100mm², matching CXSJ10's own OUT 157mm²/IN 100mm² exactly).
The formula is the same single-piston `F = P × A` shape this project's
other two pneumatic sizing modules already use, with one bore-dependent
area pair, not a doubled area. CXS2's real, confirmed improvements are
allowable kinetic energy (7x) and max piston speed (2.6x) versus the
CXSJ/CXS series it replaces, not force. Recorded here as a corrected
assumption per this project's own "check the primary source, not the
summary" policy.

## Load-bearing check: load mass vs. overhang length

SMC's own CXS2 "Model Selection" section publishes 21 separate log-log
graphs (load mass `m` [kg] vs. overhang length `L` [mm]), keyed by
mounting orientation (vertical/horizontal), max piston speed band
(vertical: 4 bands; horizontal: up to 4 bands per stroke length), and —
horizontal only — stroke-length band (≤10/≤30/≤50/≤75/≤100 mm). Each graph
plots one curve per bore (6/10/16/20/25/32mm) for each of CXS2M (solid)
and CXS2L (dashed). The full digitized dataset (3-4 (overhang, load mass)
points per curve, read directly off the founder-supplied graph images) is
recorded in `docs/superpowers/specs/
2026-08-26-dual-rod-cylinder-sizing-design.md` "Digitized dataset" — not
duplicated here; that document is the authoritative source for Task 13's
own CSV seed data.

Every curve has the same two-segment shape: a flat plateau (constant max
load mass) up to some overhang threshold, then a downward-sloping line to
the right edge of the chart. Log-log interpolation between the digitized
points is the natural default given the graphs' own log-log axes (see
Task 8's own `resolveAllowableLoadMass`).

Given the engineer's own `required_stroke` and `max_piston_speed`, the
module selects the narrowest matching stroke band (rounding up) and the
matching speed band, then reads the seeded (overhang, load mass) curve for
the selected bore candidate at `mounting_orientation`. Vertical mounting
has no stroke-band split (all strokes, per the catalog's own selection
table); only horizontal mounting bands by both stroke and speed. If
`required_stroke` or `max_piston_speed` exceeds every seeded band, the
check reports out-of-envelope rather than extrapolating past SMC's own
published range.

## Existing Parameter Review

`motion.axis.incline_angle`, `motion.axis.friction_coefficient`,
`motion.axis.total_moving_mass` reuse unchanged — the same established
"load on an incline with friction" trio every Motor Sizing Tool module and
both prior pneumatic sizing modules already reuse. `pneumatic.
operating_pressure`, `pneumatic.load_factor`, `pneumatic.cushion_type`,
`pneumatic.max_piston_speed`, `pneumatic.kinetic_energy` reuse unchanged —
identical meaning, identical direction (engineer-supplied) in every prior
pneumatic module. `pneumatic.mounting_style` and `pneumatic.
buckling_safety_factor` are NOT reused: this module has no buckling check,
so neither the rod end-fixity enum nor the buckling safety divisor
applies. Genuinely new: `dual_rod_sizing.process_force`, `dual_rod_sizing.
required_stroke`, `dual_rod_sizing.required_extend_force`, `dual_rod_
sizing.required_retract_force` (mirroring the `pneumatic_sizing.*`/
`pneumatic_guided_sizing.*` equivalents exactly, minted under a fresh
`dual_rod_sizing.*` namespace per this registry's own "never let a
resolved value from one module look like a compatible link source for an
unrelated one" convention — the same reasoning `pneumatic_guided_sizing.*`
already gives for not reusing `pneumatic_sizing.*`'s own four analogous
IDs); `dual_rod_sizing.overhang_length` (new physical quantity, no
existing parameter matches — SMC's own "Overhang L" lever arm from the
plate's own load-reference point to the load's center of gravity);
`dual_rod_sizing.mounting_orientation` (new binary enum, deliberately not
a reuse of the three-value `motion.axis.orientation` — see this plan's own
"Before you start" point 3).

## Validation plan

- Force/kinetic-energy formulas: identical to already-validated
  `pneumatic-cylinder-sizing@0.1.0` formulas — the independent-benchmark
  item is satisfied by reference (that module's own Norgren M/1000
  benchmark, via `pneumatic-cylinder@0.1.0`), not re-derived, since the
  formula bodies are confirmed byte-for-byte identical.
- Load-mass-vs-overhang digitized data: a real reference example (load
  mass + overhang + orientation -> required force -> a specific real CXS2
  model passing every applicable check) reproduced through the real
  compute path (Stage 4, Task 12).
- The band-selection logic (rounding a real stroke/speed up to the nearest
  seeded band) is a new, undisclosed-by-SMC engineering judgment call
  unique to this module — its own explicit "deviations" entry in
  `validation.ts`.
- No buckling check to validate (intentionally out of scope).

## Relationship to existing and planned modules

Sibling of `pneumatic-cylinder-sizing@0.1.0` (round-body) and
`guided-cylinder-sizing@0.1.0` (guide plate) — none of the three is
touched by this module. Table Cylinder and Rodless families remain, each
its own future design doc and Stage 1 spec, sequenced after this module
ships.
