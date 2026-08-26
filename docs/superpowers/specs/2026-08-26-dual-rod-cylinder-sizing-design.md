# Dual Rod Cylinder Sizing — Second of Four New Pneumatic Actuator Families

## Decision

Build a new, self-contained module, `dual-rod-cylinder-sizing@0.1.0`,
category `cylinder-sizing.pneumatic-dual-rod`, following the full New
Module Workflow (`context/ai-workflow-rules.md`) as one unit of work. Same
load-in/catalog-match-out shape as `pneumatic-cylinder-sizing@0.1.0` and
`guided-cylinder-sizing@0.1.0` — load mass, incline angle, friction
coefficient, optional process force, operating pressure, piston speed,
cushion type, required stroke — plus two new inputs (overhang length,
mounting orientation) for the load-bearing check specific to this
mechanism, matched against a new SMC CXS2 catalog (`ComponentSchemaVersion`,
component type `pneumatic_cylinder_dual_rod`). Neither `pneumatic-cylinder
@0.1.0`, `pneumatic-cylinder-sizing@0.1.0`/`0.1.1`, nor
`guided-cylinder-sizing@0.1.0` is touched — all three stay released,
immutable, exactly as they are.

This is the second of four planned new pneumatic actuator families (Dual
Rod, Guided Cylinder [done, 2026-08-26], Table Cylinder, Rodless), built
one at a time as separate modules and separate design docs — see
`docs/superpowers/specs/2026-08-26-guided-cylinder-sizing-design.md`
"Sequencing" for the same pattern.

## Source Research (2026-08-26)

SMC's own CXS2 Series catalog (`ES20-275-CXS2.pdf`, fetched via
`content2.smcetech.com` — the same working mirror prior sessions used
after `smcworld.com`/`smcpneumatics.com` returned HTTP 403 — text-extracted
locally with `pdftotext` since WebFetch's own text-extraction model could
not parse this PDF either) was fetched and read directly, alongside the
older CXSJ/CXS/CXSW catalog (`content2.smcetech.com/pdf/CXS.pdf`) for
comparison. The founder then supplied 21 full-page, high-resolution
screenshots of every "Model Selection" graph in the CXS2 catalog
(`reference/source-material/dual-rod-cylinder/`), read directly for this
design doc's own digitized dataset (see "Load-Bearing Check" below) after
this session's own PDF-to-image tooling (`pdftoppm`, Ghostscript,
ImageMagick, Python) turned out to be unavailable in this environment —
text extraction alone cannot reliably read log-log curve shapes, and no
data in this document was fabricated to fill that gap.

### Scope: CXS2 only, not the older CXSJ/CXS/CXSW family

SMC's "Dual Rod Cylinder" line spans three historical sub-families:

1. **CXSJ** (compact) / **CXS** (basic, plus air-cushion and end-lock
   variants) — one force-producing rod plus one parallel guide rod for
   anti-rotation (±0.1° non-rotating accuracy); asymmetric IN/OUT piston
   areas, same shape as a normal single-rod cylinder.
2. **CXSW** ("double rod type") — rod protrudes both ends via a shared
   A+A' piston; genuinely different force symmetry from CXSJ/CXS.
3. **CXS2** (`CXS2L` ball-bushing / `CXS2M` slide-bearing) — SMC's current
   replacement series for CXSJ/CXS, mounting-dimension-compatible,
   7× the allowable kinetic energy and 2.6× the max piston speed of the
   series it replaces.

**Founder-directed scope (2026-08-26): CXS2L/CXS2M only.** The older
CXSJ/CXS/CXSW family is out of scope for `0.1.0` — not deleted or
deprecated from consideration, simply not built.

### A marketing claim checked against SMC's own engineering table and found not to hold

SMC's own product pages describe CXS2 as "double piston construction"
providing "twice the output force" versus the older CXSJ/CXS. Reading
CXS2's own "Theoretical Output" table (`ES20-275-CXS2.pdf` p.12) against
the older CXSJ catalog's own table (`CXS.pdf` p.738) directly: **the two
tables are numerically identical** — same bore/rod/area/force figures for
every bore size (e.g. CXS2m10: OUT 157mm²/IN 100mm², matching CXSJ10's own
OUT 157mm²/IN 100mm² exactly; CXS2m32: OUT 1608mm²/IN 1206mm², matching
CXSJ32 exactly). The formula is the same single-piston `F = P × A` shape
this project's other two pneumatic modules already use, with one
bore-dependent area pair, not a doubled area. CXS2's real, confirmed
improvements are allowable kinetic energy (7×) and max piston speed
(2.6×), not force. This gets recorded here as a corrected assumption, the
same way `guided-cylinder-sizing`'s own design doc recorded corrections to
its founder brief — SMC's own marketing language does not always match
its own engineering tables, and this project's policy is to check the
primary source, not the summary.

### No buckling check for this family — a disclosed scope difference, not a gap

Unlike `pneumatic-cylinder-sizing@0.1.0` and `guided-cylinder-sizing
@0.1.0`, both of which carry forward an independently-reproduced Euler
column buckling check as a disclosed assumption despite no direct
pneumatic-manufacturer source, **`dual-rod-cylinder-sizing@0.1.0` omits a
buckling check entirely.** Founder-directed (2026-08-26): SMC's own CXS2
catalog gives no buckling formula anywhere (same as every other pneumatic
catalog this project has read), and unlike the round-body and guided
families, this module's own governing structural check (see below) is
SMC's own directly-published load-mass-vs-overhang rating for this exact
twin-guide-rod geometry — extending an independently-reproduced Euler
formula on top of that would not add real coverage the way it did for the
round-body module (which has no SMC-published structural limit of any
kind for lateral load).

## Load-Bearing Check: Load Mass vs. Overhang Length

### The check is a graph, not a table — and the founder redirected how it should be used

SMC's own CXS2 "Model Selection" section publishes 21 separate log-log
graphs (load mass `m` [kg] vs. overhang length `L` [mm]), keyed by:

- **Mounting orientation**: vertical or horizontal
- **Max piston speed band**: vertical has 4 bands (200/400/600/800 mm/s);
  horizontal has up to 4 bands per stroke length, further split by stroke
- **Stroke-length band** (horizontal only): ≤10/≤30/≤50/≤75/≤100 mm

Each graph plots one curve per bore (6/10/16/20/25/32mm) for each of
CXS2M (solid) and CXS2L (dashed) — up to 10 curves on one chart for the
bore-10-to-32 graphs.

**Original plan (superseded):** seed one conservative worst-case curve per
bore (highest speed, longest stroke, horizontal mounting) and gate every
candidate against it via a hidden safety factor. **Founder correction
(2026-08-26):** this overstates real-world risk — "usually when design,
engineer [is] not gonna use max speed 800mm/s and use longest stroke in
horizon mounting without linear support." A blanket worst-case curve would
silently over-reject valid, ordinary designs. Instead: **the module uses
the engineer's own actual operating conditions** (`required_stroke` and
`max_piston_speed`, both already-reused ports, plus a new
`mounting_orientation` input) to select the matching graph/band
automatically, and reports a clear in-spec / out-of-spec recommendation at
that real condition — mirroring SMC's own two-step "pick your graph, then
read your curve" selection process, not a single hidden margin.

If the computed condition falls outside every seeded band (e.g. a stroke
longer than any graph covers), the module reports that plainly so the
engineer can reconsider — larger bore, added external linear support, a
lower duty speed — rather than silently passing or extrapolating past
SMC's own published envelope.

### New input: `mounting_orientation`

A new enum parameter, **not** a reuse of the existing
`motion.axis.orientation` (three values: horizontal/vertical/inclined).
CXS2's own selection graphs are strictly binary (vertical/horizontal) —
there is no "inclined" bucket to match against, so reusing the three-value
enum would let an engineer select a value with no seeded row behind it.
This mirrors the precedent `pneumatic.mounting_style` already set
(deliberately minted fresh rather than forcing an ill-fitting reuse of
`motion.axis.orientation` — see `lib/engine/parameters/definitions.ts`
"Existing Parameter Review" comment above the `pneumatic.mounting_style`
definition).

### Digitized dataset

Read directly off the founder-supplied graph images (21 full-page crops,
`reference/source-material/dual-rod-cylinder/`), 3-4 (overhang, load mass)
points per curve, log-log interpolated between them at Stage 3. Every
curve has the same two-segment shape: a flat plateau (constant max load
mass) up to some overhang threshold, then a downward-sloping line to the
right edge of the chart (`L = 100mm` vertical graphs bore 10-32 and
horizontal graphs; `L = 60mm` bore-6 horizontal graphs where the curve
reaches the chart's own kg floor before 60mm).

**Vertical mounting** (`mounting_orientation = "vertical"`):

| Graph | Speed band | Bore | CXS2M plateau (kg) @ L≤ | CXS2M @ L=100 | CXS2L plateau (kg) @ L≤ | CXS2L @ L=100 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | ≤200mm/s | 6 | 0.9 @ 5 (no flat plateau, sloped from L=5) | 0.04 | 0.95 @ 7 | 0.055 |
| 2 | ≤400mm/s | 6 | 0.2 @ 20 | 0.038 | 0.2 @ 22 | 0.05 |
| 3 | ≤600mm/s | 6 | 0.085 @ 38 | 0.035 | 0.085 @ 45 | 0.045 |
| 4 | ≤800mm/s | 6 | 0.038 @ 80 | 0.033 (barely sloped) | 0.038 @ 100 (flat to edge) | 0.038 |
| 5 | ≤200mm/s | 10 | 2.7 @ 5 (sloped from L=5) | 0.095 | 3.7 @ 7 | 0.19 |
| 5 | ≤200mm/s | 16 | 5.0 @ 8 | 0.43 | 5.0 @ 8 | 0.57 |
| 5 | ≤200mm/s | 20 | 8.0 @ 8 | 0.70 | 8.5 @ 10 | 0.95 |
| 5 | ≤200mm/s | 25 | 10.5 @ 12 | 1.05 | 10.5 @ 12 | 1.30 |
| 5 | ≤200mm/s | 32 | 13.0 @ 19 | 2.70 | 13.0 @ 19 | 2.70 |
| 6 | ≤400mm/s | 10 | 0.2 @ 15 | 0.10 | 0.2 @ 30 | 0.17 |
| 6 | ≤400mm/s | 16 | 0.8 @ 33 | 0.42 | 0.8 @ 42 | 0.58 |
| 6 | ≤400mm/s | 20 | 1.1 @ 33 | 0.72 | 1.1 @ 33 | 1.0 |
| 6 | ≤400mm/s | 25 | 2.0 @ 33 | 1.35 | 2.0 @ 50 | 1.6 |
| 6 | ≤400mm/s | 32 | 3.1 @ 55 | 2.4 | 3.1 @ 55 | 2.7 |
| 7 | ≤600mm/s | 10 | 0.38 @ 35 | 0.105 | 0.38 @ 55 | 0.16 |
| 7 | ≤600mm/s | 16 | 0.53 (flat to edge) | 0.53 | 0.53 (flat to edge) | 0.53 |
| 7 | ≤600mm/s | 20 | 0.9 @ 65 | 0.70 | 0.9 @ 65 | 0.85 |
| 7 | ≤600mm/s | 25 | 1.1 (flat to edge) | 1.1 | 1.1 (flat to edge) | 1.1 |
| 7 | ≤600mm/s | 32 | 1.4 (flat to edge) | 1.4 | 1.4 (flat to edge) | 1.4 |
| 8 | ≤700mm/s (≤800 for ø10) | 10 | 0.2 @ 55 | 0.115 | 0.2 (flat to edge) | 0.2 |
| 8 | ≤700mm/s | 16 | 0.39 (flat to edge) | 0.39 | 0.39 (flat to edge) | 0.39 |
| 8 | ≤700mm/s | 20 | 0.58 (flat to edge) | 0.58 | 0.58 (flat to edge) | 0.58 |

**Horizontal mounting** (`mounting_orientation = "horizontal"`):

| Graph | Speed band | Stroke band | Bore | CXS2M6 plateau (kg) @ L≤ | CXS2M6 @ chart edge | CXS2L6 plateau (kg) @ L≤ | CXS2L6 @ chart edge |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 9 | ≤400 / ≤800mm/s | ≤10 | 6 | 0.045 (≤800) / 0.08 (≤400) @ ~4 | 0.01 @ 33 (≤800) / 0.01 @ 44 (≤400) | (dashed = ≤400 line only) | — |
| 10 | ≤400 (L) / ≤800mm/s | ≤30 | 6 | 0.038 @ 4 | 0.01 @ 20 | 0.07 @ 5 | 0.01 @ 28 |
| 11 | ≤800mm/s | ≤50 | 6 | 0.03 @ 4 | 0.01 @ 13 | 0.038 @ 4 | 0.01 @ 19 |
| 12 | ≤800mm/s | ≤75 | 6 | 0.028 @ 4 | 0.005 @ 15 | 0.038 @ 4 | 0.005 @ 24 |
| 13 | ≤800mm/s | ≤100 | 6 | 0.028 @ 4 | 0.005 @ 8 | 0.038 @ 4 | 0.005 @ 15 |

| Graph | Speed band | Stroke band | Bore | CXS2M plateau (kg) @ L≤ | CXS2M @ L=100 | CXS2L plateau (kg) @ L≤ | CXS2L @ L=100 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 14 | ≤400mm/s | ≤10 | 10 | 0.6 @ 4 | 0.01 | 0.4 @ 4 (lower start, crosses) | 0.02 |
| 14 | ≤400mm/s | ≤10 | 16 | 1.5 @ 4 | 0.04 | 1.75 @ 4 | 0.06 |
| 14 | ≤400mm/s | ≤10 | 20 | 1.0 @ 4 | 0.07 | 1.0 @ 4 | 0.11 |
| 14 | ≤400mm/s | ≤10 | 25 | 3.0 @ 9 | 0.18 | 3.0 @ 9 | 0.23 |
| 14 | ≤400mm/s | ≤10 | 32 | 3.0 @ 9 | 0.30 | 3.0 @ 9 | 0.40 |
| 15 | >400mm/s | ≤10 | 10 | 0.2 @ 4 | 0.01 | 0.2 @ 8 (lower start, crosses) | 0.017 |
| 15 | >400mm/s | ≤10 | 16 | 0.7 @ 8 | 0.04 | 0.7 @ 8 | 0.055 |
| 15 | >400mm/s | ≤10 | 20 | 1.0 @ 8 | 0.065 | 1.0 @ 8 | 0.10 |
| 15 | >400mm/s | ≤10 | 25 | 1.75 @ 18 | 0.16 | 1.75 @ 18 | 0.21 |
| 15 | >400mm/s | ≤10 | 32 | 1.75 @ 18 | 0.28 | 1.75 @ 18 | 0.35 |
| 16 | ≤400mm/s | ≤30 | 10 | 0.15 @ 4 | 0.01 | 0.28 @ 4 | 0.013 |
| 16 | ≤400mm/s | ≤30 | 16 | 0.35 @ 8 | 0.03 | 0.35 @ 8 | 0.045 |
| 16 | ≤400mm/s | ≤30 | 20 | 0.65 @ 8 | 0.045 | 0.65 @ 8 | 0.10 |
| 16 | ≤400mm/s | ≤30 | 25 | 1.1 @ 8 | 0.10 | 1.1 @ 8 | 0.19 |
| 16 | ≤400mm/s | ≤30 | 32 | 2.0 @ 8 | 0.19 | 2.0 @ 8 | 0.30 |
| 17 | >400mm/s | ≤30 | 10 | 0.12 @ 4 | 0.01 | 0.20 @ 4 | 0.012 |
| 17 | >400mm/s | ≤30 | 16 | 0.42 @ 8 | 0.028 | 0.42 @ 8 | 0.04 |
| 17 | >400mm/s | ≤30 | 20 | 0.65 @ 8 | 0.045 | 0.65 @ 8 | 0.06 |
| 17 | >400mm/s | ≤30 | 25 | 1.1 @ 13 | 0.10 | 1.1 @ 13 | 0.20 |
| 17 | >400mm/s | ≤30 | 32 | 1.75 @ 13 | 0.20 | 1.75 @ 13 | 0.30 |
| 18 | ≤400mm/s | ≤50 | 10 | 0.1 @ 4 | 0.01 | 0.2 @ 4 | — |
| 18 | ≤400mm/s | ≤50 | 16 | 0.35 @ 4 | 0.02 | 0.35 @ 4 | 0.045 |
| 18 | ≤400mm/s | ≤50 | 20 | 0.6 @ 8 | 0.04 | 0.6 @ 8 | 0.08 |
| 18 | ≤400mm/s | ≤50 | 25 | 0.9 @ 8 | 0.08 | 0.9 @ 8 | 0.15 |
| 18 | ≤400mm/s | ≤50 | 32 | 1.75 @ 8 | 0.17 | 1.75 @ 8 | 0.25 |
| 19 | >400mm/s | ≤50 | 10 | 0.1 @ 4 | 0.01 | 0.2 @ 4 | — |
| 19 | >400mm/s | ≤50 | 16 | 0.35 @ 4 | 0.018 | 0.35 @ 4 | 0.04 |
| 19 | >400mm/s | ≤50 | 20 | 0.55 @ 8 | 0.038 | 0.55 @ 8 | 0.07 |
| 19 | >400mm/s | ≤50 | 25 | 0.9 @ 8 | 0.075 | 0.9 @ 8 | 0.14 |
| 19 | >400mm/s | ≤50 | 32 | 1.75 @ 8 | 0.16 | 1.75 @ 8 | 0.24 |
| 20 | >400mm/s | ≤75 | 10 | 0.28 @ 4 | 0.01 (curve ends L≈33) | — | — |
| 20 | >400mm/s | ≤75 | 16 | 0.28 @ 8 | 0.014 | 0.42 @ 8 | 0.02 |
| 20 | >400mm/s | ≤75 | 20 | 0.42 @ 8 | 0.032 | 0.55 @ 8 | 0.06 |
| 20 | >400mm/s | ≤75 | 25 | 0.65 @ 8 | 0.06 | 0.85 @ 8 | 0.12 |
| 20 | >400mm/s | ≤75 | 32 | 1.1 @ 8 | 0.11 | 1.1 @ 8 | 0.20 |
| 21 | >400mm/s | ≤100 | 10 | 0.22 @ 8 | 0.01 (curve ends L≈20) | — | — |
| 21 | >400mm/s | ≤100 | 16 | 0.22 @ 8 | 0.011 | 0.55 @ 8 | 0.02 |
| 21 | >400mm/s | ≤100 | 20 | 0.35 @ 8 | 0.023 | 0.55 @ 8 | 0.045 |
| 21 | >400mm/s | ≤100 | 25 | 0.55 @ 8 | 0.043 | 0.75 @ 8 | 0.10 |
| 21 | >400mm/s | ≤100 | 32 | 1.0 @ 8 | 0.10 | 1.0 @ 8 | 0.17 |

All figures read directly off the founder-supplied graph images to 2
significant figures — the same precision ceiling reading any printed
log-log chart by eye has. **Founder review of this digitized table against
the source graphs before it is seeded is expected**, the same "founder
review/trim pending" treatment every prior catalog seed in this project
received, given the added risk of eye-reading log-log curves versus
transcribing a printed table.

### Band selection at compute time

Given the engineer's own `required_stroke` and `max_piston_speed`, the
module selects the narrowest matching stroke band (rounding up: e.g.
`required_stroke = 45mm` selects the "≤50 stroke" graph) and the matching
speed band, then reads the seeded (overhang, load mass) curve for the
selected bore candidate at `mounting_orientation`. Vertical mounting has
no stroke-band split (`all strokes` per the catalog's own selection
table); only horizontal mounting bands by both stroke and speed. If
`required_stroke` exceeds every seeded band (>100mm) or `max_piston_speed`
exceeds every seeded band (>800mm/s vertical, >above the graphs'
own speed splits for horizontal), the check reports out-of-envelope rather
than extrapolating.

## Module Shape

### 1. New parameter group: `dual_rod_sizing.*`

Reuses the same base trio and pneumatic ports every sizing module reuses:
`motion.axis.incline_angle`, `motion.axis.friction_coefficient`,
`motion.axis.total_moving_mass`, `pneumatic.operating_pressure`,
`pneumatic.load_factor`, `pneumatic.cushion_type`,
`pneumatic.max_piston_speed`. New parameters:

- `dual_rod_sizing.process_force` (optional) — mirrors
  `pneumatic_sizing.process_force`.
- `dual_rod_sizing.required_stroke`, `required_extend_force`,
  `required_retract_force` — mirror the `pneumatic_sizing.*` equivalents.
- `dual_rod_sizing.overhang_length` (new, required, `mm`) — the lever arm
  from the plate's own load-reference point to the load's center of
  gravity (SMC's own "Overhang L").
- `dual_rod_sizing.mounting_orientation` (new, required enum,
  `vertical`/`horizontal`) — selects the matching seeded graph band; not a
  reuse of `motion.axis.orientation` (see "New input" above).

No buckling-safety-factor input (no buckling check in this module — see
above). Exact IDs, defaults, and full contract are a Stage 2 decision.

### 2. Compute flow

**Load resolution**: identical to `pneumatic-cylinder-sizing@0.1.0`'s own
`resolveRequiredForce` (forward/return sign convention), reused
independently.

**Theoretical force / kinetic energy**: identical `F = P × A` /
`E = (m/2)V²` formulas, reproduced independently, single bore-dependent
area pair (not doubled — see "marketing claim" correction above).

**Load-bearing resolution** (new): given `overhang_length`,
`mounting_orientation`, `required_stroke`, and `max_piston_speed`, select
the matching seeded band and interpolate the allowable load mass at
`overhang_length` (log-log interpolation between the digitized points);
compare against `load_mass`. No buckling term.

**Candidate evaluation** (per real catalog row): reuses
`pneumatic-cylinder-sizing@0.1.0`'s own theoretical-force and cushion
evaluation unchanged (bore/rod from the candidate row), plus the new
load-mass-vs-overhang check using the candidate's own bore to select which
digitized curve applies. No buckling check.

### 3. Catalog schema and seed data

New `ComponentSchemaVersion`, component type `pneumatic_cylinder_dual_rod`:
bore diameter, rod diameter, stroke range, bearing type (CXS2M
slide/CXS2L ball-bushing), and the digitized load-mass-vs-overhang table
(per mounting orientation × speed band × stroke band, as points to
interpolate) as seeded attributes. Seeded from the table above via the
existing generic CSV import pipeline, one-time founder-reviewed seed,
matching `scripts/seed-guided-cylinder-catalog.mts`'s own pattern.

### 4. Catalog matching

A new `lib/application/catalogs/dual-rod-cylinder-matching.ts`,
structurally identical to `guided-cylinder-matching.ts` (generic
`MatchCriterion` engine for stroke/cushion-energy; a dedicated
per-candidate evaluator for force and the load-mass-vs-overhang band
lookup, since neither reduces to a flat attribute comparison).

### 5. Generic UI

Standard `ModuleUiSchema`/report schema — no custom UI, matching every
other module's own convention. The load-bearing check result reports the
selected band (mounting orientation, speed band, stroke band) alongside
the pass/fail, so the engineer can see which real-world condition was
matched — not just a bare pass/fail number.

## Validation Plan

- Force/kinetic-energy formulas: identical to already-validated
  `pneumatic-cylinder-sizing@0.1.0` formulas — no new source needed beyond
  confirming CXS2's own theoretical-output table matches (done above).
- Load-mass-vs-overhang digitized data: validation confirms the seeded
  points match the founder-supplied graph images at the anchor points
  recorded in this document, and that at least one full reference example
  (load mass + overhang + orientation → required force → a specific real
  CXS2 model passing every check) reproduces correctly through the real
  compute path.
- The band-selection logic (rounding a real stroke/speed up to the nearest
  seeded band) is a new, undisclosed-by-SMC engineering judgment call
  unique to this module — gets its own explicit "deviations"/assumptions
  entry in `validation.ts`.
- No buckling check to validate (intentionally out of scope — see above).

## Open Questions (for Stage 1/2, not resolved here)

- Exact new parameter IDs, units, and required/default status.
- Exact log-log interpolation method between digitized points (straight
  line in log-log space, i.e. geometric interpolation, is the natural
  default given the graphs' own axes — confirm at Stage 1).
- Whether out-of-envelope (stroke/speed beyond every seeded band) blocks
  candidate evaluation entirely or reports a specific warning while still
  evaluating force/cushion checks.
- Registry version number (next available after the current released
  version at implementation time).

## Out of Scope

- CXSJ, CXS, and CXSW (the older dual-rod sub-families) — not built in
  `0.1.0`, no design doc committed to building them later.
- Table Cylinder and Rodless families — each gets its own design doc,
  sequenced after this one ships.
- Any change to `pneumatic-cylinder@0.1.0`'s, `pneumatic-cylinder-sizing
  @0.1.0`/`0.1.1`'s, or `guided-cylinder-sizing@0.1.0`'s own formulas,
  ports, or validation records (immutable, untouched).
- A buckling check for this family (disclosed scope difference, not a
  gap — see "No buckling check" above).
- A self-serve catalog CSV upload UI.
