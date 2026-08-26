# Guided Cylinder Sizing — First of Four New Pneumatic Actuator Families

## Decision

Build a new, self-contained module, `guided-cylinder-sizing@0.1.0`,
category `cylinder-sizing.pneumatic-guided`, following the full New Module
Workflow (`context/ai-workflow-rules.md`) as one unit of work. It is the
same load-in/catalog-match-out shape as `pneumatic-cylinder-sizing@0.1.0`
(load mass, incline angle, friction coefficient, optional process force,
operating pressure, piston speed, cushion type, required stroke) plus three
new load-offset inputs for the moment check a guided cylinder's built-in
guide plate makes possible, matched against a new SMC MGQ catalog
(`ComponentSchemaVersion`, component type `pneumatic_cylinder_guided`).
Neither `pneumatic-cylinder@0.1.0` nor `pneumatic-cylinder-sizing@0.1.0`/
`0.1.1` is touched — both stay released, immutable, exactly as they are.

This is the first of four planned new pneumatic actuator families (Dual
Rod, Guided Cylinder, Table Cylinder, Rodless), built one at a time as
separate modules and separate design docs — see "Sequencing" below.

## Context

The founder's ask: expand pneumatic cylinder sizing beyond the standard
round-body CM2/CA2 model `pneumatic-cylinder-sizing@0.1.0` already
supports, to also cover Dual Rod, Guided Cylinder, Table Cylinder, and
Rodless cylinders — all SMC product families. Investigating found:

1. **No existing plan covers this.** `docs/`, `context/modules/`, and every
   ADR were searched; nothing proposes these four families. Both existing
   pneumatic modules explicitly scope guided/rodless variants *out* —
   `context/modules/pneumatic-cylinder/stage-1-spec.md` "Validity Envelope"
   treats them as "an engineer/catalog selection input, not a formula this
   module derives," the same treatment `coupling@0.1.0` gives its own
   coupling element type. This is real new scope, not a gap-fill.
2. **Each family has genuinely different physics**, not just different
   catalog dimensions — a dual-rod cylinder shares its buckling load across
   two rods and carries no net side moment; a guided cylinder is rated for
   lateral load and moment through its built-in guide (a check neither
   existing module has at all); a table cylinder is a linear-guide-
   integrated slide, closer to `linear-guide@0.1.0`'s own radial/moment-load
   domain than to a rod-buckling check; a rodless cylinder has no rod to
   buckle, but a belt/band or magnetic force-transmission limit instead.
   Per ADR-0011's own explicitly-rejected alternative (a `mechanism` enum
   branching one module internally, rejected because it would combine
   independent formula sets and validation records into one release gate),
   these become **one module per family**, not one module with a
   family-selector input.

## Sequencing

Given the scope (each family is roughly the size of one Motor Sizing Tool
module — its own source research, parameter contract, kernel, catalog
schema, and validation record), the founder chose to build one family at a
time rather than planning all four up front. **Guided Cylinder is first**
— SMC's MGP/MGQ series, the most-requested type for machine-building work,
since a guided cylinder replaces a standard cylinder plus an external
linear guide in one part. Dual Rod, Table Cylinder, and Rodless each get
their own design doc later, sequenced after this module ships.

## Source Research (2026-08-26)

SMC's own MGQ Series catalog (`smcpneumatics.com/pdfs/MGQ.pdf`, fetched and
read in full — `smcworld.com`'s own MGQ/MGP pages return HTTP 403 in this
environment, the same block prior sessions recorded) and MGP Series catalog
(`datasheet.octopart.com` mirror, fetched and read in full) were both
read directly, not summarized from search results.

**Force, cushion, and buckling physics are unchanged from
`pneumatic-cylinder-sizing@0.1.0`.** MGQ's own "Theoretical Output" section
gives the identical `F = eta * A * P` shape (though its printed table
folds `eta` into pre-multiplied columns rather than showing it as a
separate factor); nothing in either catalog suggests a different force,
cushion-energy, or buckling formula for a guided cylinder's own cylinder
body — the guide mechanism is a separate structural element bolted to the
same round-body cylinder. This module reuses (independently, not imported,
matching ADR-0011's reuse policy) `pneumatic-cylinder-sizing@0.1.0`'s own
`resolveRequiredForce`, `resolvePistonAreas`, `resolveTheoreticalForce`,
`resolveCushionKineticEnergy`, `resolveBucklingLoad`, and
`resolvePermissibleCompressiveLoad` kernel functions unchanged.

**The lateral-load and moment check is new — and SMC's own data is a
lookup table, not a formula.** Both MGQ and MGP publish:

- **"Allowable Lateral Load"** (MGQ) / an equivalent lateral-load rating —
  a table of allowable force `F (N)` by bore size, bearing type
  (slide/ball-bushing), and stroke length.
- **"Allowable Rotational Torque of Plate"** — a table of allowable torque
  `T (N·m)` by the same axes. **Critically, this is one combined figure per
  bore/stroke/bearing-type cell, not three separate roll/pitch/yaw
  ratings** — confirmed by full-text search of the fetched MGQ catalog
  (no "roll"/"pitch"/"yaw" terminology appears anywhere in it). SMC's own
  "Operating Range when Used as Lifter" section additionally presents load
  mass vs. eccentric distance as a graph, not a formula, for the specific
  case of a cylinder mounted as a lifter.

This is the same "catalog curve, no formula to reproduce" situation
`pneumatic-cylinder@0.1.0`'s own Stage 1 spec already found and disclosed
for lateral rod-end load on a *standard* cylinder — except here it is the
module's own primary new check, not a documented out-of-scope item, so it
cannot be waved off the same way. **Decision: seed the allowable-lateral-
load and allowable-torque tables as new per-candidate catalog attributes**
(the same treatment bore/rod diameter already get), looked up per candidate
at the required stroke, and compared against this module's own computed
*applied* load/moment — ordinary statics (`M = F * d`), not a sourced
formula requiring its own validation, the same "ordinary physics" category
`lib/engine/mechanics/`'s own doc comment already uses for `Ta = J*alpha`.
No second manufacturer source was checked for this specific
table-vs-formula question — general pneumatic-actuator literature (Machine
Design, Fluid Power World, both fetched via search) independently confirms
"manufacturer catalogs give detailed charts... frequently as a function of
stroke length," corroborating that this is normal industry practice, not a
gap specific to SMC.

**Moment-offset inputs, and a disclosed limitation.** The founder chose
three separate offset inputs (roll/pitch/yaw lever arms) over one combined
offset, for clearer engineer reasoning about load geometry — but because
SMC's own data gives only one combined allowable-torque figure, all three
computed applied moments are combined into one resultant checked against
that single figure. **This is a disclosed `0.1.0` limitation, not a
resolved one**: the module cannot tell the engineer *which* of roll,
pitch, or yaw is closer to the limit, only whether the combined resultant
clears SMC's own single published rating. Carried forward honestly, the
same way `pneumatic-cylinder-sizing@0.1.0` already carries forward
`pneumatic-cylinder@0.1.0`'s own disclosed buckling-evidence gap.

## Module Shape

### 1. New parameter group: `pneumatic_guided_sizing.*`

Reuses the same ten parameters `pneumatic_sizing.*` already reuses
(`motion.axis.incline_angle`, `motion.axis.friction_coefficient`,
`motion.axis.total_moving_mass`, `pneumatic.operating_pressure`,
`pneumatic.load_factor`, `pneumatic.cushion_type`,
`pneumatic.buckling_safety_factor`, `pneumatic.max_piston_speed`,
`pneumatic.kinetic_energy`, `pneumatic.mounting_style` if retained — final
list is a Stage 2 decision), plus:

- `pneumatic_guided_sizing.process_force` (optional) — mirrors
  `pneumatic_sizing.process_force`; a new parameter, not a reuse of it,
  matching the established "different direction, mint new" convention
  `pneumatic_sizing.*` itself already set against `pneumatic.*`.
- `pneumatic_guided_sizing.required_stroke`,
  `required_extend_force`, `required_retract_force` — mirror the
  `pneumatic_sizing.*` equivalents, new for the same reason.
- `pneumatic_guided_sizing.roll_offset`, `pitch_offset`, `yaw_offset`
  (new, required, `mm`) — the three lever-arm distances from the guide
  plate's own load-reference point to the load's effective center of
  application, one per moment axis.
- `pneumatic_guided_sizing.required_moment` (new, computed output, `N*m`)
  — the combined resultant moment checked against each candidate's own
  seeded allowable-torque table.

Exact IDs, units, and required/default status are a Stage 2 decision, not
fixed here — matching every prior module's own "Stage 2 decides the
contract" convention.

### 2. Compute flow

**Load resolution**: identical to `pneumatic-cylinder-sizing@0.1.0`'s own
`resolveRequiredForce` — reused unchanged.

**Moment resolution** (new): `M_roll = F_lateral * roll_offset`,
`M_pitch = F_lateral * pitch_offset`, `M_yaw = F_lateral * yaw_offset`,
combined into one resultant (Euclidean sum, `M_required =
sqrt(M_roll^2 + M_pitch^2 + M_yaw^2)` — the exact combination method is a
Stage 1/2 detail to pin down against how SMC's own single figure is
actually meant to be applied, since the fetched catalog gives no guidance
on combining separately-computed moments against its one published limit;
recorded as an assumption either way, not silently chosen).

**Candidate evaluation** (per real catalog row): reuses
`pneumatic-cylinder-sizing@0.1.0`'s own theoretical-force, cushion, and
buckling evaluation unchanged, plus two new checks:

- Allowable lateral load (candidate's own seeded table value at the
  required stroke) vs. the computed lateral force component.
- Allowable rotational torque (candidate's own seeded table value at the
  required stroke) vs. `M_required`.

### 3. Catalog schema and seed data

New `ComponentSchemaVersion`, component type `pneumatic_cylinder_guided`:
bore diameter, rod diameter, stroke range, bearing type (slide/ball-
bushing), mounting styles, allowable lateral load (by stroke), allowable
rotational torque (by stroke), series/model number. Seeded from SMC's own
published MGQ (and MGP, if the founder wants both series in `0.1.0`) tables
via the existing generic CSV import pipeline — the same one-time,
founder-reviewed seed pattern `scripts/seed-pneumatic-cylinder-catalog.mts`
already established, not a self-serve upload UI.

### 4. Catalog matching

A new `lib/application/catalogs/guided-cylinder-matching.ts`, structurally
identical to the existing `pneumatic-cylinder-matching.ts` (generic
`MatchCriterion` engine for stroke/mounting/cushion-energy, a dedicated
per-candidate evaluator for force/buckling/lateral-load/torque, since none
of those four checks reduces to a flat attribute comparison against this
run's own resolved force/moment).

### 5. Generic UI

Standard `ModuleUiSchema`/report schema — no custom UI, matching every
other module's own convention.

## Validation Plan

- Force/cushion/buckling formulas: identical to already-validated
  `pneumatic-cylinder-sizing@0.1.0` formulas — no new source needed.
- Lateral-load/torque table lookups: no formula to validate (the check
  *is* the lookup) — validation instead confirms the seeded table values
  match SMC's own printed catalog figures exactly, and that at least one
  full reference example (load mass + offsets -> required force/moment ->
  a specific real MGQ model passing every check) reproduces correctly
  through the real compute path.
- The combined-moment assumption (Euclidean sum of three independently
  computed moments, checked against SMC's one published figure) is a new,
  undisclosed-by-SMC engineering judgment call unique to this module — it
  gets its own explicit "deviations"/assumptions entry in `validation.ts`,
  not silently presented as sourced.
- The buckling evidence gap `pneumatic-cylinder@0.1.0` already discloses
  (no pneumatic-specific closed-form buckling source) stays open here too.

## Open Questions (for Stage 1/2, not resolved here)

- Exact new parameter IDs, units, and required/default status.
- Whether `0.1.0` seeds MGQ only, or both MGQ and MGP (two series with
  different bore-size/torque tables).
- The exact resultant-moment combination method (Euclidean sum assumed
  above; confirm or correct at Stage 1).
- Whether bearing type (slide vs. ball bushing) becomes an engineer input
  or is left to catalog-candidate variation only.
- Registry version number (next available after the current released
  version at implementation time).

## Out of Scope

- Dual Rod, Table Cylinder, and Rodless families — each gets its own
  design doc and module, sequenced after this one ships.
- Any change to `pneumatic-cylinder@0.1.0`'s or
  `pneumatic-cylinder-sizing@0.1.0`/`0.1.1`'s own formulas, ports, or
  validation records (immutable, untouched).
- SMC series other than MGP/MGQ.
- A self-serve catalog CSV upload UI.
- Per-axis (separate roll/pitch/yaw) pass/fail reporting — SMC's own data
  supports only a combined check (see "Source Research" above).
