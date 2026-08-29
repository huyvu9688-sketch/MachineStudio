# Dual Rod Cylinder Sizing Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and release `dual-rod-cylinder-sizing@0.1.0` — a new, self-contained, load-in/catalog-match-out module for SMC CXS2 series dual-rod (twin-guide-rod) pneumatic cylinders. Given a load, a required stroke, an overhang length, and a mounting orientation, it computes required extend/retract force and required cushion kinetic energy, then ranks real seeded SMC CXS2 catalog candidates against theoretical force, cushion energy, stroke range, and a new load-mass-vs-overhang-length structural check unique to this mechanism. No buckling check (disclosed scope difference — see design doc).

**Architecture:** Follows this repo's six-stage New Module Workflow (`context/ai-workflow-rules.md`), the same shape `pneumatic-cylinder-sizing@0.1.0` (Unit 7.2) and `guided-cylinder-sizing@0.1.0` (Unit 7.3) already established: reproduce (independently, not imported — ADR-0011's reuse policy) the shared required-force/piston-area/theoretical-force/cushion-kinetic-energy formulas in a new `math.ts`, add one new mechanism-specific check (here: log-log interpolated load-mass-vs-overhang-length lookup, keyed by mounting orientation × speed band × stroke band, replacing guided-cylinder-sizing's own moment check), wire a new `CatalogAdapter` and a dedicated hybrid catalog matcher (`lib/application/catalogs/dual-rod-cylinder-matching.ts`) combining the generic `MatchCriterion` engine (stroke range) with a custom per-candidate evaluator (force, cushion energy, load-mass-vs-overhang band lookup), and seed a new `pneumatic_cylinder_dual_rod` component type from a founder-supplied digitized dataset. `pneumatic-cylinder@0.1.0`, `pneumatic-cylinder-sizing@0.1.0`/`0.1.1`, and `guided-cylinder-sizing@0.1.0` stay released, immutable, and untouched.

**Tech Stack:** TypeScript strict, Zod, Vitest, Next.js Server Components/Actions, Prisma/PostgreSQL (catalog seed only — the module's own `compute()` stays DB-free).

---

## Before you start: what's different from the two prior sizing modules

The design doc (`docs/superpowers/specs/2026-08-26-dual-rod-cylinder-sizing-design.md`) is the starting brief. Read it in full before starting Task 1 — this plan does not repeat its "Load-Bearing Check" digitized-dataset table (60+ rows) inline; Task 13 references it directly by section.

Three things make this module structurally different from `guided-cylinder-sizing@0.1.0`, not just a bore/rod swap:

1. **No buckling check at all** (design doc "No buckling check for this family"). Every other pneumatic sizing module in this project (`pneumatic-cylinder@0.1.0`, `pneumatic-cylinder-sizing@0.1.0`, `guided-cylinder-sizing@0.1.0`) carries a reproduced generic Euler buckling check as a disclosed assumption. This module omits `resolveBucklingLoad`/`resolvePermissibleCompressiveLoad` entirely — there is no `math.ts` buckling section, no `pneumatic.buckling_safety_factor` port, and no buckling check in the catalog matcher. Do not carry it forward out of habit; the design doc's own founder-directed reasoning is that SMC's own directly-published load-mass-vs-overhang rating is this mechanism's real governing structural check, and stacking an unsourced Euler formula on top would not add real coverage the way it did for the round-body module (which has no SMC-published lateral-load limit of any kind).

2. **A new mechanism-specific check backed by a digitized graph dataset, not a formula.** `guided-cylinder-sizing@0.1.0`'s own new check (`resolveRequiredMoment`) is a closed-form formula (statics, `M = F*d`). This module's own new check (load mass vs. overhang length) has no formula at all — SMC publishes it only as 21 log-log graphs. The kernel function (`resolveAllowableLoadMass`, Task 8) does log-log interpolation between digitized (overhang, load-mass) points, keyed by a compound band lookup (mounting orientation, speed band, and — horizontal only — stroke band). This is meaningfully more complex than any interpolation this project has built before; read Task 8 carefully before implementing it, and do not simplify it into a linear interpolation (the design doc is explicit that log-log is the natural default given the graphs' own log-log axes).

3. **A new required enum port, `mounting_orientation`, that is NOT a reuse of `motion.axis.orientation`.** `motion.axis.orientation` has three values (`horizontal`/`vertical`/`inclined`); CXS2's own selection graphs are strictly binary (vertical/horizontal only) with no "inclined" bucket to match against. Reusing the three-value enum would let an engineer pick `"inclined"` with no seeded band behind it. Task 5 mints a fresh `dual_rod_sizing.mounting_orientation` parameter with `enumOptions: ["vertical", "horizontal"]` — the same "deliberately not the same parameter ID even for a similar-sounding quantity" precedent `pneumatic.mounting_style` already set relative to `screw.end_support_arrangement`.

## Final port list

**Module ID:** `dual-rod-cylinder-sizing`. **Version:** `0.1.0`. **Category:** `cylinder-sizing.pneumatic-dual-rod`. **Registry bump:** `1.18.0` -> `1.19.0` (additive only).

Inputs (port key -> parameter ID -> reuse or new):

| Port key | Parameter ID | Status |
| --- | --- | --- |
| `incline_angle` | `motion.axis.incline_angle` | reused |
| `friction_coefficient` | `motion.axis.friction_coefficient` | reused |
| `load_mass` | `motion.axis.total_moving_mass` | reused |
| `process_force` | `dual_rod_sizing.process_force` | new, optional, default 0 N |
| `operating_pressure` | `pneumatic.operating_pressure` | reused |
| `load_factor` | `pneumatic.load_factor` | reused |
| `max_piston_speed` | `pneumatic.max_piston_speed` | reused |
| `cushion_type` | `pneumatic.cushion_type` | reused |
| `required_stroke` | `dual_rod_sizing.required_stroke` | new |
| `overhang_length` | `dual_rod_sizing.overhang_length` | new, required |
| `mounting_orientation` | `dual_rod_sizing.mounting_orientation` | new, required, binary enum |

No `mounting_style` port and no `buckling_safety_factor` port — this module has no buckling check (see point 1 above), so neither `pneumatic.mounting_style` nor `pneumatic.buckling_safety_factor` is reused here.

Outputs:

| Port key | Parameter ID | Status | Why |
| --- | --- | --- | --- |
| `required_extend_force` | `dual_rod_sizing.required_extend_force` | new (computed direction) | forward-direction resolved force |
| `required_retract_force` | `dual_rod_sizing.required_retract_force` | new (computed direction) | return-direction resolved force |
| `kinetic_energy` | `pneumatic.kinetic_energy` | reused | identical formula/direction to prior modules |
| `required_stroke_out` | `dual_rod_sizing.required_stroke` | echoed | `requiredSpec()` only sees `.outputs`, not raw inputs |
| `overhang_length_out` | `dual_rod_sizing.overhang_length` | echoed | needed by the per-candidate load-mass-vs-overhang evaluator |
| `mounting_orientation_out` | `dual_rod_sizing.mounting_orientation` | echoed | needed to select the correct seeded band |
| `operating_pressure_out` | `pneumatic.operating_pressure` | echoed | needed by the per-candidate force evaluator |
| `load_factor_out` | `pneumatic.load_factor` | echoed | needed by the per-candidate force evaluator |
| `max_piston_speed_out` | `pneumatic.max_piston_speed` | echoed | needed to select the speed band |
| `cushion_type_out` | `pneumatic.cushion_type` | echoed | needed by the matcher's cushion-energy criterion |

No new unit-registry dimension or unit is needed (mm, MPa, N, J, kg, m/s, deg, rad, ratio all already exist).

---

## Stage 1 — Engineering specification

### Task 1: Write `context/modules/dual-rod-cylinder-sizing/stage-1-spec.md`

**Files:**
- Create: `context/modules/dual-rod-cylinder-sizing/stage-1-spec.md`

- [ ] **Step 1: Create the directory and write the spec**

Write this exact content to `context/modules/dual-rod-cylinder-sizing/stage-1-spec.md`:

```markdown
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
```

- [ ] **Step 2: Verify the file was written correctly**

Read back `context/modules/dual-rod-cylinder-sizing/stage-1-spec.md` and confirm it matches the content above exactly (no truncation).

- [ ] **Step 3: Commit**

```bash
git add context/modules/dual-rod-cylinder-sizing/stage-1-spec.md
git commit -m "docs: dual-rod-cylinder-sizing Stage 1 engineering specification"
```

---

## Stage 2 — Parameter contract

### Task 2: Write `context/modules/dual-rod-cylinder-sizing/stage-2-contract.md`

**Files:**
- Create: `context/modules/dual-rod-cylinder-sizing/stage-2-contract.md`

- [ ] **Step 1: Write the contract**

Write this exact content:

```markdown
# Dual Rod Cylinder Sizing Module — Stage 2 Parameter Contract

## Status

Work unit: Milestone 7, Unit 7.4, Stage 2. Date: 2026-08-26.

## Decisions

1. **Required-force sign convention** reproduces
   `pneumatic-cylinder-sizing@0.1.0`'s own `resolveRequiredForce` exactly
   (itself reproducing `ball-screw-motor-sizing@0.2.0`'s own
   forward/return convention): extend adds the gravity term, retract
   subtracts it; friction is direction-symmetric (always added); process
   force applies to extend only. No new decision here — confirmed
   unchanged from the two prior pneumatic sizing modules.
2. **No buckling-related parameters are reused or minted.** This module
   has no buckling check (stage-1-spec.md). `pneumatic.mounting_style` and
   `pneumatic.buckling_safety_factor` are not ports on this module.
3. **`dual_rod_sizing.process_force` mints a new ID** rather than reusing
   `pneumatic_sizing.process_force` or `pneumatic_guided_sizing.
   process_force` — this registry's own established "never let a resolved
   value from one module look like a compatible link source for an
   unrelated one" convention, the same reasoning `pneumatic_guided_sizing.
   process_force` already gives for not reusing `pneumatic_sizing.
   process_force`.
4. **`dual_rod_sizing.mounting_orientation` is a new binary enum**
   (`vertical`/`horizontal`), deliberately not a reuse of the three-value
   `motion.axis.orientation` (`horizontal`/`vertical`/`inclined`). CXS2's
   own selection graphs have no "inclined" bucket; reusing the three-value
   enum would admit a value with no seeded band behind it. Mirrors the
   `pneumatic.mounting_style` precedent (minted fresh rather than forcing
   an ill-fitting reuse of an existing enum with different cardinality).
5. **`dual_rod_sizing.overhang_length` is a new required quantity, no
   built-in default.** SMC's own "Overhang L" lever arm has no natural
   zero-default (a zero overhang is a real, valid, but unusual
   configuration) — required, matching `dual_rod_sizing.required_stroke`'s
   own no-default treatment.
6. **Band-selection logic (stroke/speed rounded up to the nearest seeded
   band) is disclosed as an engineering judgment call**, not a value SMC's
   own catalog states directly as a rule — SMC publishes the bands as
   graph titles, not as an explicit "round up" instruction. Recorded in
   `validation.ts`'s own `deviations` at Stage 4.

## Final parameter list

See the implementation plan's own "Final port list" section for the full
port table. New parameters (all under a fresh `dual_rod_sizing.*`
namespace): `process_force`, `required_stroke`, `required_extend_force`,
`required_retract_force`, `overhang_length`, `mounting_orientation`.
Reused unchanged: `motion.axis.incline_angle`, `motion.axis.
friction_coefficient`, `motion.axis.total_moving_mass`, `pneumatic.
operating_pressure`, `pneumatic.load_factor`, `pneumatic.cushion_type`,
`pneumatic.max_piston_speed`, `pneumatic.kinetic_energy`.

## Registry version

`1.18.0` -> `1.19.0`, additive only (six new `dual_rod_sizing.*`
parameters). No new unit-registry dimension or unit needed.
```

- [ ] **Step 2: Commit**

```bash
git add context/modules/dual-rod-cylinder-sizing/stage-2-contract.md
git commit -m "docs: dual-rod-cylinder-sizing Stage 2 parameter contract"
```

### Task 3: Add the `dual_rod_sizing.*` parameter group to the registry

**Files:**
- Modify: `lib/engine/parameters/definitions.ts`

- [ ] **Step 1: Find the insertion point**

Open `lib/engine/parameters/definitions.ts` and find the end of the
`pneumaticGuidedCylinderSizing` array (the `pneumatic_guided_sizing.*`
group added for Unit 7.3 — search for `"pneumatic_guided_sizing.
required_moment"`, the last parameter in that group). Insert the new
group immediately after that array's closing `];`, before the array is
spread into `PARAMETER_DEFINITIONS`. `forceDisplay` (line 129,
`["N", "kN", "lbf"] as const`) already exists as a shared constant — do
not redefine it.

- [ ] **Step 2: Add the header comment and parameter group**

Insert this block after the `pneumaticGuidedSizing` array's closing `];`:

```ts
// --- Dual rod cylinder sizing (Unit 7.4 Stage 2) ----------------------------
// See context/modules/dual-rod-cylinder-sizing/stage-2-contract.md. The
// third of four planned new pneumatic actuator family sizing modules
// (after pneumatic-cylinder-sizing@0.1.0 round-body, guided-cylinder-
// sizing@0.1.0 guide plate). Reuses the same base trio and pneumatic ports
// pneumatic_sizing.*/pneumatic_guided_sizing.* already reuse
// (motion.axis.incline_angle/friction_coefficient/total_moving_mass,
// pneumatic.operating_pressure/load_factor/cushion_type/max_piston_speed/
// kinetic_energy). Mints new IDs for process_force/required_stroke/
// required_extend_force/required_retract_force rather than reusing either
// sibling module's own analogous parameters -- this registry's own "never
// let a resolved value from one module look like a compatible link
// source for an unrelated one" convention. No pneumatic.mounting_style or
// pneumatic.buckling_safety_factor port: this module has no buckling
// check (stage-1-spec.md "No buckling check for this family"), the one
// genuine scope difference from both sibling modules.
const dualRodSizing: readonly ParameterDefinition[] = [
  defineParameter({
    id: "dual_rod_sizing.process_force",
    displayName: "Process force (extend stroke)",
    symbol: "F_proc",
    definition:
      "Additive working force the cylinder must supply on top of the mass-derived load, on the extend (working) stroke only -- e.g. a clamping or pressing force. Zero (the default) is a structural 'no process force' statement, not a guessed physical value. Mints a new ID rather than reusing pneumatic_sizing.process_force or pneumatic_guided_sizing.process_force -- stage-2-contract.md Decision 3.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
    defaultPolicy: { kind: "constant", value: makeQuantity(0, "N") },
  }),
  defineParameter({
    id: "dual_rod_sizing.required_stroke",
    displayName: "Required stroke",
    symbol: "L_req",
    definition:
      "Travel distance the application needs. An application requirement the catalog-matched CXS2 candidate's own stroke range must cover, and one of the two inputs (with max_piston_speed) that selects which seeded load-mass-vs-overhang band applies.",
    valueType: "quantity",
    canonicalUnit: "mm",
    displayUnits: ["mm", "in"],
    range: { min: 0, unit: "mm" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "dual_rod_sizing.required_extend_force",
    displayName: "Required extend-side force (computed)",
    symbol: "F_req,ext",
    definition:
      "Required cylinder force on the extend (working) stroke: additive process force plus the incline/friction-resolved load force. Computed by this module from load_mass, incline_angle, friction_coefficient, and process_force -- not engineer-supplied.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
    range: { min: 0, unit: "N" },
  }),
  defineParameter({
    id: "dual_rod_sizing.required_retract_force",
    displayName: "Required retract-side force (computed)",
    symbol: "F_req,ret",
    definition:
      "Required cylinder force on the retract (return) stroke: the incline/friction-resolved load force only (no process force). May be negative for a strongly gravity-assisted return stroke, meaning the actuator must resist/brake rather than drive -- reported as computed, not floored. Computed by this module, not engineer-supplied.",
    valueType: "quantity",
    canonicalUnit: "N",
    displayUnits: [...forceDisplay],
  }),
  defineParameter({
    id: "dual_rod_sizing.overhang_length",
    displayName: "Overhang length",
    symbol: "L_oh",
    definition:
      "Lever arm from the dual-rod cylinder's own end-plate load-reference point to the load's center of gravity (SMC's own 'Overhang L'). Governs the load-mass-vs-overhang-length structural check unique to this twin-guide-rod mechanism -- no natural zero-default, required (stage-2-contract.md Decision 5).",
    valueType: "quantity",
    canonicalUnit: "mm",
    displayUnits: ["mm", "in"],
    range: { min: 0, unit: "mm" },
    defaultPolicy: { kind: "required" },
  }),
  defineParameter({
    id: "dual_rod_sizing.mounting_orientation",
    displayName: "Mounting orientation",
    symbol: "orient",
    definition:
      "Installation orientation relative to gravity, restricted to the two values SMC's own CXS2 'Model Selection' load-mass-vs-overhang graphs are keyed by. Deliberately not a reuse of motion.axis.orientation (horizontal/vertical/inclined): CXS2's own selection graphs have no 'inclined' bucket, so reusing the three-value enum would admit a value with no seeded band behind it (stage-2-contract.md Decision 4).",
    valueType: "enum",
    enumId: "dual_rod_mounting_orientation",
    enumOptions: ["vertical", "horizontal"],
    defaultPolicy: { kind: "required" },
  }),
];
```

- [ ] **Step 3: Wire the new group into `PARAMETER_DEFINITIONS` and bump the doc comment**

Find:

```ts
/** All released parameter definitions for registry v1.18, in authored order. */
export const PARAMETER_DEFINITIONS: readonly ParameterDefinition[] = [
  ...projectAndEnvironment,
  ...axisApplication,
  ...motionProfile,
  ...ballScrew,
  ...linearGuide,
  ...coupling,
  ...supportBearing,
  ...driveTrain,
  ...motorSizingBallScrew,
  ...motorSizingDirectDriveConveyor,
  ...motorSizingRackPinion,
  ...motorSizingBeltPulley,
  ...motorSizingIndexTable,
  ...pneumaticCylinder,
  ...pneumaticCylinderSizing,
  ...pneumaticGuidedCylinderSizing,
];
```

Replace with:

```ts
/** All released parameter definitions for registry v1.19, in authored order. */
export const PARAMETER_DEFINITIONS: readonly ParameterDefinition[] = [
  ...projectAndEnvironment,
  ...axisApplication,
  ...motionProfile,
  ...ballScrew,
  ...linearGuide,
  ...coupling,
  ...supportBearing,
  ...driveTrain,
  ...motorSizingBallScrew,
  ...motorSizingDirectDriveConveyor,
  ...motorSizingRackPinion,
  ...motorSizingBeltPulley,
  ...motorSizingIndexTable,
  ...pneumaticCylinder,
  ...pneumaticCylinderSizing,
  ...pneumaticGuidedCylinderSizing,
  ...dualRodSizing,
];
```

- [ ] **Step 4: Bump `PARAMETER_REGISTRY_VERSION`**

In the same file, find:

```ts
export const PARAMETER_REGISTRY_VERSION = "1.18.0";
```

Replace with:

```ts
export const PARAMETER_REGISTRY_VERSION = "1.19.0";
```

Immediately above the existing `// v1.18 adds...` comment block (search
for `// v1.18 adds the full pneumatic_guided_sizing.* group`), add a new
paragraph documenting this bump:

```ts
// v1.19 adds the full dual_rod_sizing.* group (6 new parameters) for the
// dual-rod-cylinder-sizing module (context/modules/
// dual-rod-cylinder-sizing/stage-2-contract.md), Milestone 7's fourth
// module and the second of four planned new pneumatic actuator families
// (dual rod; docs/superpowers/specs/
// 2026-08-26-dual-rod-cylinder-sizing-design.md). Reuses the same base
// trio and pneumatic ports pneumatic_sizing.*/pneumatic_guided_sizing.*
// already reuse; mints new IDs rather than reusing either sibling
// module's own analogous parameters. No pneumatic.mounting_style or
// pneumatic.buckling_safety_factor port -- this module has no buckling
// check, the one genuine port-level scope difference from both sibling
// modules.
//
```

- [ ] **Step 5: Run typecheck to confirm the new group compiles**

Run: `npx tsc --noEmit`
Expected: no new errors (the two registry-consistency fixture tests below
will fail until Task 4 updates them — that is expected at this step).

- [ ] **Step 6: Commit**

```bash
git add lib/engine/parameters/definitions.ts
git commit -m "feat: add dual_rod_sizing.* parameter group, registry 1.19.0"
```

### Task 4: Add `1.19.0` to `PARAMETER_REGISTRY_SUPPORTED_VERSIONS` and update pinned fixtures

**Files:**
- Modify: `lib/engine/parameters/registered.ts`
- Modify: `lib/engine/parameters/registry.test.ts` (pinned version/hash fixture)
- Modify: `lib/engine/parameters/hash.test.ts` (pinned hash fixture)

- [ ] **Step 1: Add the new version to the supported list**

In `lib/engine/parameters/registered.ts`, find:

```ts
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
  "1.18.0",
] as const;
```

Replace with:

```ts
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
  "1.18.0",
  "1.19.0",
] as const;
```

This step is the exact fix the tracker's own history records twice before
(1.4.0 and 1.7.0 each once stranded a prior module's manifest by being
skipped here) — do not skip it.

- [ ] **Step 2: Run the registry test suite to find every fixture that pins the old version or hash**

Run: `npx vitest run lib/engine/parameters --no-coverage`
Expected: `registry.test.ts` and/or `hash.test.ts` fail, naming the exact
pinned literal (old version string or old content hash) that needs
updating. This project's own registry tests pin an exact expected hash
recomputed from the full definitions array — there is no way to predict
the new hash without running the build once, so this step's failure output
is the source of truth, not a guess.

- [ ] **Step 3: Update each failing fixture to the new printed expected value**

Open whichever of `lib/engine/parameters/registry.test.ts` /
`lib/engine/parameters/hash.test.ts` failed, and replace the old pinned
literal with the exact value the test failure printed (typically an
`expected "..." but got "..."` message, or a `toMatchInlineSnapshot`
auto-update). Do not hand-compute a hash — always take it from the test's
own failure output.

- [ ] **Step 4: Re-run to confirm green**

Run: `npx vitest run lib/engine/parameters --no-coverage`
Expected: all pass.

- [ ] **Step 5: Run the full non-DB suite, typecheck, and lint**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: all clean/pass. Record the exact pass count for the progress
tracker update at the end of this plan (Task 24).

- [ ] **Step 6: Commit**

```bash
git add lib/engine/parameters/registered.ts lib/engine/parameters/registry.test.ts lib/engine/parameters/hash.test.ts
git commit -m "feat: release parameter registry 1.19.0"
```

---

## Stage 3 — Compute and trace

### Task 5: Scaffold the module package directory

**Files:**
- Create: `lib/modules/dual-rod-cylinder-sizing/0.1.0/` (directory)

- [ ] **Step 1: Run the module scaffolder**

Run: `npm run module:new -- dual-rod-cylinder-sizing 0.1.0`

Expected: creates `lib/modules/dual-rod-cylinder-sizing/0.1.0/` with
scaffold stubs (`manifest.ts`, `compute.ts`, `checks.ts`, `trace.ts`,
`ui.ts`, `report.ts`, `validation.ts`, `index.ts`, and a test file). Every
subsequent task in this stage replaces one scaffold stub's content — none
of the scaffold's own placeholder logic survives into the release.

- [ ] **Step 2: Commit the raw scaffold**

```bash
git add lib/modules/dual-rod-cylinder-sizing/
git commit -m "chore: scaffold dual-rod-cylinder-sizing@0.1.0 module package"
```

### Task 6: Write `manifest.ts`

**Files:**
- Modify: `lib/modules/dual-rod-cylinder-sizing/0.1.0/manifest.ts`

- [ ] **Step 1: Replace the scaffolded manifest with the real one**

Write this exact content:

```ts
// Manifest and ports for the dual-rod-cylinder-sizing module (Unit 7.4,
// Milestone 7 / roadmap Phase 2). Self-contained, no linear-axis@1 role,
// no Motor Sizing Tool family relationship -- see context/modules/
// dual-rod-cylinder-sizing/stage-1-spec.md.
//
// Reuses eight existing parameters directly (motion.axis.incline_angle,
// motion.axis.friction_coefficient, motion.axis.total_moving_mass,
// pneumatic.operating_pressure, pneumatic.load_factor,
// pneumatic.cushion_type, pneumatic.max_piston_speed,
// pneumatic.kinetic_energy) -- see stage-2-contract.md. No
// pneumatic.mounting_style or pneumatic.buckling_safety_factor port: this
// module has no buckling check (stage-1-spec.md "No buckling check for
// this family"). Several inputs are also echoed as outputs
// (operating_pressure, load_factor, max_piston_speed, cushion_type,
// required_stroke, overhang_length, mounting_orientation):
// CatalogAdapter.requiredSpec() (./index.ts) only receives
// ModuleComputation.outputs, not raw resolved inputs, and
// lib/application/catalogs/dual-rod-cylinder-matching.ts needs these
// resolved values to run its own per-candidate formula/band-lookup
// evaluation.

import {
  asParameterId,
  type ModuleManifest,
  type ModulePorts,
} from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const manifest: Omit<ModuleManifest, "contentHash"> = {
  id: "dual-rod-cylinder-sizing",
  version: "0.1.0",
  sdkRange: { min: "1.0.0" },
  // Draft-authored against registry 1.19.0. Keep this literal -- never
  // import the mutable current-version constant
  // (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.19.0",
  category: "cylinder-sizing.pneumatic-dual-rod",
  tags: ["dual-rod-cylinder-sizing", "pneumatics", "actuator", "catalog-matching"],
  workflowRoles: [],
  validityEnvelopeSummary:
    "Given a load (mass, incline angle, friction coefficient, optional extend-stroke process force), a required stroke, an overhang length, and the engineer's own operating pressure, force-sizing load factor, cushion type, and mounting orientation (vertical/horizontal), computes the required extend/retract force and required cushion kinetic energy for catalog matching against real SMC CXS2 (CXS2M/CXS2L) dual-rod cylinder candidates. No buckling check -- a disclosed scope difference from pneumatic-cylinder-sizing@0.1.0 and guided-cylinder-sizing@0.1.0: SMC's own CXS2 catalog gives no buckling formula, and this mechanism's own governing structural check is SMC's own directly-published load-mass-vs-overhang-length rating instead. That check selects the matching seeded band from the engineer's own real required_stroke/max_piston_speed/mounting_orientation and log-log-interpolates the allowable load mass at overhang_length -- it does not extrapolate past SMC's own published envelope. No load-case (normal/peak/etc.) semantics: every input is a single engineer-supplied value per run. Process force is applied on the extend stroke only. Required retract force may be negative for a strongly gravity-assisted return stroke, reported as computed.",
  sourceRevisionIds: [
    asSourceRevisionId("jp.smc.cxs2_series_catalog@web-2026-08-26"),
    asSourceRevisionId(
      "jp.smc.air_cylinders_model_selection@web-2026-08-24",
    ),
    asSourceRevisionId(
      "us.milwaukee_cylinder.design_engineering_guide@web-2026-08-24",
    ),
    asSourceRevisionId("us.norgren.m1000_heavy_duty_cylinders@web-2026-08-24"),
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
      parameterId: asParameterId("dual_rod_sizing.process_force"),
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
      parameterId: asParameterId("dual_rod_sizing.required_stroke"),
      required: true,
    },
    {
      key: "overhang_length",
      parameterId: asParameterId("dual_rod_sizing.overhang_length"),
      required: true,
    },
    {
      key: "mounting_orientation",
      parameterId: asParameterId("dual_rod_sizing.mounting_orientation"),
      required: true,
    },
  ],
  outputs: [
    {
      key: "required_extend_force",
      parameterId: asParameterId("dual_rod_sizing.required_extend_force"),
    },
    {
      key: "required_retract_force",
      parameterId: asParameterId("dual_rod_sizing.required_retract_force"),
    },
    {
      key: "kinetic_energy",
      parameterId: asParameterId("pneumatic.kinetic_energy"),
    },
    {
      key: "required_stroke_out",
      parameterId: asParameterId("dual_rod_sizing.required_stroke"),
    },
    {
      key: "overhang_length_out",
      parameterId: asParameterId("dual_rod_sizing.overhang_length"),
    },
    {
      key: "mounting_orientation_out",
      parameterId: asParameterId("dual_rod_sizing.mounting_orientation"),
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
      key: "max_piston_speed_out",
      parameterId: asParameterId("pneumatic.max_piston_speed"),
    },
    {
      key: "cushion_type_out",
      parameterId: asParameterId("pneumatic.cushion_type"),
    },
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/modules/dual-rod-cylinder-sizing/0.1.0/manifest.ts
git commit -m "feat: dual-rod-cylinder-sizing manifest and ports"
```

### Task 7: Write `values.ts`

**Files:**
- Create: `lib/modules/dual-rod-cylinder-sizing/0.1.0/values.ts`

- [ ] **Step 1: Write the file**

Identical pattern to both prior sizing modules' own `values.ts` — copy
verbatim:

```ts
// Local EngineeringValue helpers for the dual-rod-cylinder-sizing module.
// Identical pattern to lib/modules/pneumatic-cylinder-sizing/0.1.0/values.ts.

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

- [ ] **Step 2: Commit**

```bash
git add lib/modules/dual-rod-cylinder-sizing/0.1.0/values.ts
git commit -m "feat: dual-rod-cylinder-sizing values helpers"
```

### Task 8: Write `math.ts` — the pure SI-number kernel, including the new load-mass-vs-overhang interpolation

**Files:**
- Create: `lib/modules/dual-rod-cylinder-sizing/0.1.0/math.ts`

This is the module's most novel piece. Read this task fully before
writing code.

**The interpolation model.** Every one of the 21 digitized SMC curves
(design doc "Digitized dataset" table) has the same two-segment shape: a
flat plateau (`loadMassKg` constant) from `overhangMm = 0` up to a
plateau-end overhang, then a downward-sloping line in log-log space out to
the chart's own right edge. That means each curve is fully described by
exactly two anchor points: `(plateauEndOverhangMm, plateauLoadMassKg)` and
`(edgeOverhangMm, edgeLoadMassKg)`. For a query `overhangMm`:

- `overhangMm <= plateauEndOverhangMm` -> return `plateauLoadMassKg` (flat).
- `overhangMm > edgeOverhangMm` -> out of envelope (beyond the chart's own
  published range — the query is not interpolated or extrapolated).
- Otherwise -> geometric (log-log-linear) interpolation between the two
  anchor points: `log(m) = log(m1) + (log(L) - log(L1)) / (log(L2) -
  log(L1)) * (log(m2) - log(m1))`, i.e. `m = m1 * (m2/m1)^((log(L) -
  log(L1)) / (log(L2) - log(L1)))`.

A curve with `plateauEndOverhangMm === edgeOverhangMm` (a few rows in the
design doc's own table have no flat segment at all, sloped from their
very first digitized point — e.g. vertical graph 1, bore 6) still works
under this same formula: the plateau check happens first, so an exact
match at that single point returns the plateau value directly rather than
dividing by a zero-width log interval.

**The band-selection model.** Given `mountingOrientation`, `boreDiameterMm`,
`bearingType` ("slide" = CXS2M or "ball_bushing" = CXS2L),
`maxPistonSpeedMps`, and (horizontal only) `requiredStrokeMm`, select:

- **Vertical**: the narrowest seeded speed band with
  `speedBandMaxMps >= maxPistonSpeedMps` (bands: 200, 400, 600, 700, 800
  mm/s — note bore-10/16/20 use a 700 mm/s band at the top per the design
  doc's own "≤700mm/s (≤800 for ø10)" annotation, not a uniform 800 mm/s
  ceiling for every bore). No stroke band.
- **Horizontal**: the narrowest seeded stroke band with
  `strokeBandMaxMm >= requiredStrokeMm` (bands: 10, 30, 50, 75, 100 mm),
  then within that stroke band the matching speed band (bands vary by
  stroke band — see the design doc's own per-graph table; several are a
  binary "≤400" vs ">400" split).
- If no seeded band covers the query (stroke > 100 mm, or speed above the
  highest seeded band for that orientation/bore), the lookup reports
  out-of-envelope rather than picking the nearest band or extrapolating.

**Data representation.** Represent the digitized dataset as a flat
`readonly LoadMassCurve[]` array (one entry per curve — 21 vertical rows +
40 horizontal rows, both bearing types per row per the design doc's own
table columns), not a nested lookup object — this keeps `resolve
AllowableLoadMass` a single linear scan with early-exit matching, and
keeps the dataset trivially reviewable/diffable against the design doc's
own table row by row (the founder's own review of this table, referenced
in the design doc's "founder review... expected" note, is against exactly
this kind of flat, one-row-per-curve representation).

- [ ] **Step 1: Write the full kernel file**

Write this exact content:

```ts
/**
 * Pure SI/mm-number kernel for the dual-rod-cylinder-sizing module
 * (Unit 7.4). Reproduces (independently, not imported -- ADR-0011's reuse
 * policy) pneumatic-cylinder-sizing@0.1.0's own resolveRequiredForce,
 * resolvePistonAreas, resolveTheoreticalForce, and
 * resolveCushionKineticEnergy unchanged, and adds a new
 * resolveAllowableLoadMass for the load-mass-vs-overhang-length structural
 * check unique to this twin-guide-rod mechanism. Unlike every other
 * pneumatic sizing module in this project, there is NO buckling section
 * here -- SMC's own CXS2 catalog gives no buckling formula, and this
 * mechanism's own governing structural check is the load-mass-vs-overhang
 * lookup instead (context/modules/dual-rod-cylinder-sizing/
 * stage-1-spec.md "No buckling check for this family").
 *
 * Same mm/MPa/N unit-system choice as pneumatic-cylinder-sizing@0.1.0's
 * own math.ts, for the same reason: 1 MPa = 1 N/mm^2 exactly, so
 * force[N] = loadFactor * area[mm^2] * pressure[MPa] needs no conversion
 * constant.
 */

/** Thrown when an input falls outside this kernel's explicit validity envelope. */
export class DualRodCylinderSizingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DualRodCylinderSizingInputError";
  }
}

function fail(message: string): never {
  throw new DualRodCylinderSizingInputError(message);
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
 * Standard gravity, in m/s^2. Baked into the kernel, not a port -- matches
 * every current Motor Sizing module's own convention and
 * pneumatic-cylinder-sizing@0.1.0's own precedent.
 */
export const STANDARD_GRAVITY_M_PER_S2 = 9.80665;

// --- 1. Required force (reproduced from pneumatic-cylinder-sizing@0.1.0) --

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
 * Reproduces pneumatic-cylinder-sizing@0.1.0's own resolveRequiredForce
 * exactly: forward (extend) adds the gravity term, return (retract)
 * subtracts it; friction is direction-symmetric (always added); process
 * force is added only for "extend". The result may be negative for
 * "retract" on a strongly gravity-assisted return stroke -- a real,
 * physically meaningful output, never floored here.
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

// --- 2. Piston areas (reproduced from pneumatic-cylinder-sizing@0.1.0) ----

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

/**
 * `A1 = pi*D^2/4`, `A2 = pi*(D^2-d^2)/4`. Single bore-dependent area pair,
 * not doubled -- confirmed directly against CXS2's own "Theoretical
 * Output" table, which is numerically identical to the older CXSJ
 * catalog's own table (stage-1-spec.md "A marketing claim... found not to
 * hold").
 */
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

// --- 3. Theoretical force (reproduced from pneumatic-cylinder-sizing@0.1.0) -

export interface TheoreticalForceInput {
  readonly areaMm2: number;
  readonly pressureMPa: number;
  readonly loadFactor: number;
}

export interface TheoreticalForceResult {
  readonly forceN: number;
}

/** `F = eta * A * P` (SMC's own formula shape, confirmed against CXS2's own Theoretical Output table). */
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

// --- 4. Cushion kinetic energy (reproduced from pneumatic-cylinder-sizing@0.1.0) -

export interface CushionKineticEnergyInput {
  readonly loadMassKg: number;
  readonly maxPistonSpeedMps: number;
}

export interface CushionKineticEnergyResult {
  readonly kineticEnergyJ: number;
}

/** `E = (m/2) * V^2` (SMC's own formula (7)). Reported only in this module's own 0.1.0 -- CXS2's own catalog gives no per-model allowable-kinetic-energy table this module has digitized. */
export function resolveCushionKineticEnergy(
  input: CushionKineticEnergyInput,
): CushionKineticEnergyResult {
  assertPositive("loadMassKg", input.loadMassKg);
  assertPositive("maxPistonSpeedMps", input.maxPistonSpeedMps);

  return {
    kineticEnergyJ: (input.loadMassKg / 2) * input.maxPistonSpeedMps ** 2,
  };
}

// --- 5. Load mass vs. overhang length (new) --------------------------------

export type DualRodMountingOrientation = "vertical" | "horizontal";
export type DualRodBearingType = "slide" | "ball_bushing";

/**
 * One digitized SMC "Model Selection" curve, described by its own two
 * anchor points (design doc "Digitized dataset"): a flat plateau up to
 * `plateauEndOverhangMm`, then a log-log-linear slope out to
 * `edgeOverhangMm`. A curve with no flat segment (sloped from its very
 * first digitized point) sets `plateauEndOverhangMm` equal to that first
 * point's own overhang -- the plateau branch then degenerates to an exact
 * match at that single point, not a divide-by-zero.
 */
export interface LoadMassCurve {
  readonly mountingOrientation: DualRodMountingOrientation;
  /** Present only for horizontal curves; vertical has no stroke-band split. */
  readonly strokeBandMaxMm: number | null;
  readonly speedBandMaxMps: number;
  readonly boreDiameterMm: number;
  readonly bearingType: DualRodBearingType;
  readonly plateauEndOverhangMm: number;
  readonly plateauLoadMassKg: number;
  readonly edgeOverhangMm: number;
  readonly edgeLoadMassKg: number;
}

export interface AllowableLoadMassInput {
  readonly mountingOrientation: DualRodMountingOrientation;
  readonly boreDiameterMm: number;
  readonly bearingType: DualRodBearingType;
  readonly maxPistonSpeedMps: number;
  /** Required for horizontal mounting (selects the stroke band); ignored for vertical. */
  readonly requiredStrokeMm: number;
  readonly overhangLengthMm: number;
  readonly curves: readonly LoadMassCurve[];
}

export type AllowableLoadMassResult =
  | {
      readonly inEnvelope: true;
      readonly allowableLoadMassKg: number;
      readonly matchedCurve: LoadMassCurve;
    }
  | {
      readonly inEnvelope: false;
      readonly reason: string;
    };

/**
 * Selects the narrowest seeded band covering the run's own real
 * mounting_orientation/max_piston_speed/(required_stroke for horizontal
 * only)/bore/bearing_type, then log-log-interpolates the allowable load
 * mass at overhang_length between that curve's own two digitized anchor
 * points (design doc "Band selection at compute time"). Reports
 * out-of-envelope, never extrapolating, when no seeded band covers the
 * query or overhang_length exceeds the matched curve's own edge.
 */
export function resolveAllowableLoadMass(
  input: AllowableLoadMassInput,
): AllowableLoadMassResult {
  assertPositive("boreDiameterMm", input.boreDiameterMm);
  assertNonNegative("maxPistonSpeedMps", input.maxPistonSpeedMps);
  assertNonNegative("requiredStrokeMm", input.requiredStrokeMm);
  assertNonNegative("overhangLengthMm", input.overhangLengthMm);

  const candidates = input.curves.filter(
    (curve) =>
      curve.mountingOrientation === input.mountingOrientation &&
      curve.boreDiameterMm === input.boreDiameterMm &&
      curve.bearingType === input.bearingType,
  );

  const strokeFiltered =
    input.mountingOrientation === "horizontal"
      ? candidates.filter((curve) => curve.strokeBandMaxMm !== null)
      : candidates;

  let strokeNarrowed = strokeFiltered;
  if (input.mountingOrientation === "horizontal") {
    const coveringStrokeBands = strokeFiltered
      .map((curve) => curve.strokeBandMaxMm as number)
      .filter((max) => max >= input.requiredStrokeMm);
    if (coveringStrokeBands.length === 0) {
      return {
        inEnvelope: false,
        reason: `No seeded stroke band covers a required stroke of ${input.requiredStrokeMm} mm for this bore/bearing-type/orientation.`,
      };
    }
    const narrowestStrokeBandMm = Math.min(...coveringStrokeBands);
    strokeNarrowed = strokeFiltered.filter(
      (curve) => curve.strokeBandMaxMm === narrowestStrokeBandMm,
    );
  }

  const coveringSpeedBands = strokeNarrowed
    .map((curve) => curve.speedBandMaxMps)
    .filter((max) => max >= input.maxPistonSpeedMps);
  if (coveringSpeedBands.length === 0) {
    return {
      inEnvelope: false,
      reason: `No seeded speed band covers a maximum piston speed of ${input.maxPistonSpeedMps} m/s for this bore/bearing-type/orientation${input.mountingOrientation === "horizontal" ? "/stroke-band" : ""}.`,
    };
  }
  const narrowestSpeedBandMps = Math.min(...coveringSpeedBands);
  const matched = strokeNarrowed.find(
    (curve) => curve.speedBandMaxMps === narrowestSpeedBandMps,
  );
  if (matched === undefined) {
    return {
      inEnvelope: false,
      reason: "No seeded curve matched after band narrowing (unexpected data gap).",
    };
  }

  if (input.overhangLengthMm <= matched.plateauEndOverhangMm) {
    return {
      inEnvelope: true,
      allowableLoadMassKg: matched.plateauLoadMassKg,
      matchedCurve: matched,
    };
  }
  if (input.overhangLengthMm > matched.edgeOverhangMm) {
    return {
      inEnvelope: false,
      reason: `Overhang length ${input.overhangLengthMm} mm exceeds the matched curve's own published range (edge at ${matched.edgeOverhangMm} mm).`,
    };
  }

  const logL1 = Math.log(matched.plateauEndOverhangMm);
  const logL2 = Math.log(matched.edgeOverhangMm);
  const logM1 = Math.log(matched.plateauLoadMassKg);
  const logM2 = Math.log(matched.edgeLoadMassKg);
  const logL = Math.log(input.overhangLengthMm);

  const fraction = (logL - logL1) / (logL2 - logL1);
  const allowableLoadMassKg = Math.exp(logM1 + fraction * (logM2 - logM1));

  return { inEnvelope: true, allowableLoadMassKg, matchedCurve: matched };
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/modules/dual-rod-cylinder-sizing/0.1.0/math.ts
git commit -m "feat: dual-rod-cylinder-sizing math kernel with load-mass-vs-overhang interpolation"
```

### Task 9: Write `math.test.ts`

**Files:**
- Create: `lib/modules/dual-rod-cylinder-sizing/0.1.0/math.test.ts`

- [ ] **Step 1: Write property/boundary tests for the reused formulas and the new interpolation**

Write this exact content:

```ts
import { describe, expect, it } from "vitest";
import {
  DualRodCylinderSizingInputError,
  resolveAllowableLoadMass,
  resolveCushionKineticEnergy,
  resolvePistonAreas,
  resolveRequiredForce,
  resolveTheoreticalForce,
  type LoadMassCurve,
} from "./math";

describe("resolveRequiredForce", () => {
  it("adds the gravity and friction terms on extend", () => {
    const g = 9.80665;
    const { forceN } = resolveRequiredForce({
      processForceN: 0,
      loadMassKg: 10,
      inclineAngleRad: Math.PI / 2,
      frictionCoefficient: 0,
      direction: "extend",
    });
    expect(forceN).toBeCloseTo(10 * g, 3);
  });

  it("subtracts the gravity term on retract, keeping friction added", () => {
    const g = 9.80665;
    const thetaRad = (80 * Math.PI) / 180;
    const { forceN } = resolveRequiredForce({
      processForceN: 0,
      loadMassKg: 10,
      inclineAngleRad: thetaRad,
      frictionCoefficient: 0.05,
      direction: "retract",
    });
    const expected =
      10 * g * 0.05 * Math.cos(thetaRad) - 10 * g * Math.sin(thetaRad);
    expect(forceN).toBeCloseTo(expected, 3);
    expect(forceN).toBeLessThan(0);
  });

  it("applies process force on extend only", () => {
    const extend = resolveRequiredForce({
      processForceN: 500,
      loadMassKg: 10,
      inclineAngleRad: 0,
      frictionCoefficient: 0,
      direction: "extend",
    });
    const retract = resolveRequiredForce({
      processForceN: 500,
      loadMassKg: 10,
      inclineAngleRad: 0,
      frictionCoefficient: 0,
      direction: "retract",
    });
    expect(extend.forceN).toBeCloseTo(500, 6);
    expect(retract.forceN).toBeCloseTo(0, 6);
  });

  it("rejects a non-positive load mass", () => {
    expect(() =>
      resolveRequiredForce({
        processForceN: 0,
        loadMassKg: 0,
        inclineAngleRad: 0,
        frictionCoefficient: 0,
        direction: "extend",
      }),
    ).toThrow(DualRodCylinderSizingInputError);
  });
});

describe("resolvePistonAreas", () => {
  it("computes A1 = pi*D^2/4 and A2 = pi*(D^2-d^2)/4", () => {
    const { extendAreaMm2, retractAreaMm2 } = resolvePistonAreas({
      boreDiameterMm: 20,
      rodDiameterMm: 10,
    });
    expect(extendAreaMm2).toBeCloseTo((Math.PI * 20 ** 2) / 4, 6);
    expect(retractAreaMm2).toBeCloseTo((Math.PI * (400 - 100)) / 4, 6);
  });

  it("rejects a rod diameter not less than the bore diameter", () => {
    expect(() =>
      resolvePistonAreas({ boreDiameterMm: 10, rodDiameterMm: 10 }),
    ).toThrow(DualRodCylinderSizingInputError);
  });
});

describe("resolveTheoreticalForce", () => {
  it("computes F = eta*A*P", () => {
    const { forceN } = resolveTheoreticalForce({
      areaMm2: 100,
      pressureMPa: 0.5,
      loadFactor: 0.7,
    });
    expect(forceN).toBeCloseTo(35, 6);
  });

  it("rejects a load factor outside [0, 1]", () => {
    expect(() =>
      resolveTheoreticalForce({ areaMm2: 100, pressureMPa: 0.5, loadFactor: 1.5 }),
    ).toThrow(DualRodCylinderSizingInputError);
  });
});

describe("resolveCushionKineticEnergy", () => {
  it("computes E = (m/2)*V^2", () => {
    const { kineticEnergyJ } = resolveCushionKineticEnergy({
      loadMassKg: 8,
      maxPistonSpeedMps: 0.5,
    });
    expect(kineticEnergyJ).toBeCloseTo(1, 6);
  });
});

describe("resolveAllowableLoadMass", () => {
  /** Vertical graph 5, bore 16, ≤200 mm/s: plateau 5.0 kg @ L<=8, 0.43 kg @ L=100 (design doc table). */
  const verticalBore16: LoadMassCurve = {
    mountingOrientation: "vertical",
    strokeBandMaxMm: null,
    speedBandMaxMps: 0.2,
    boreDiameterMm: 16,
    bearingType: "slide",
    plateauEndOverhangMm: 8,
    plateauLoadMassKg: 5.0,
    edgeOverhangMm: 100,
    edgeLoadMassKg: 0.43,
  };
  /** Vertical graph 1, bore 6, ≤200 mm/s: no flat plateau, sloped from L=5 (0.9 kg) to L=100 (0.04 kg). */
  const verticalBore6NoPlateau: LoadMassCurve = {
    mountingOrientation: "vertical",
    strokeBandMaxMm: null,
    speedBandMaxMps: 0.2,
    boreDiameterMm: 6,
    bearingType: "slide",
    plateauEndOverhangMm: 5,
    plateauLoadMassKg: 0.9,
    edgeOverhangMm: 100,
    edgeLoadMassKg: 0.04,
  };
  /** Horizontal graph 14 (<=10mm stroke, <=400mm/s), bore 16, CXS2M: plateau 1.5 kg @ L<=4, 0.04 kg @ L=100. */
  const horizontalBore16Stroke10: LoadMassCurve = {
    mountingOrientation: "horizontal",
    strokeBandMaxMm: 10,
    speedBandMaxMps: 0.4,
    boreDiameterMm: 16,
    bearingType: "slide",
    plateauEndOverhangMm: 4,
    plateauLoadMassKg: 1.5,
    edgeOverhangMm: 100,
    edgeLoadMassKg: 0.04,
  };
  /** Horizontal graph 16 (<=30mm stroke, <=400mm/s), bore 16, CXS2M: plateau 0.35 kg @ L<=8, 0.03 kg @ L=100. */
  const horizontalBore16Stroke30: LoadMassCurve = {
    mountingOrientation: "horizontal",
    strokeBandMaxMm: 30,
    speedBandMaxMps: 0.4,
    boreDiameterMm: 16,
    bearingType: "slide",
    plateauEndOverhangMm: 8,
    plateauLoadMassKg: 0.35,
    edgeOverhangMm: 100,
    edgeLoadMassKg: 0.03,
  };

  const curves = [
    verticalBore16,
    verticalBore6NoPlateau,
    horizontalBore16Stroke10,
    horizontalBore16Stroke30,
  ];

  it("returns the flat plateau value at or below the plateau threshold", () => {
    const result = resolveAllowableLoadMass({
      mountingOrientation: "vertical",
      boreDiameterMm: 16,
      bearingType: "slide",
      maxPistonSpeedMps: 0.15,
      requiredStrokeMm: 0,
      overhangLengthMm: 5,
      curves,
    });
    expect(result.inEnvelope).toBe(true);
    if (result.inEnvelope) expect(result.allowableLoadMassKg).toBeCloseTo(5.0, 6);
  });

  it("log-log interpolates strictly between the two anchor points", () => {
    const result = resolveAllowableLoadMass({
      mountingOrientation: "vertical",
      boreDiameterMm: 16,
      bearingType: "slide",
      maxPistonSpeedMps: 0.15,
      requiredStrokeMm: 0,
      overhangLengthMm: 50,
      curves,
    });
    expect(result.inEnvelope).toBe(true);
    if (result.inEnvelope) {
      // Hand-computed geometric interpolation between (8, 5.0) and (100, 0.43) at L=50.
      const expected = Math.exp(
        Math.log(5.0) +
          ((Math.log(50) - Math.log(8)) / (Math.log(100) - Math.log(8))) *
            (Math.log(0.43) - Math.log(5.0)),
      );
      expect(result.allowableLoadMassKg).toBeCloseTo(expected, 6);
      expect(result.allowableLoadMassKg).toBeLessThan(5.0);
      expect(result.allowableLoadMassKg).toBeGreaterThan(0.43);
    }
  });

  it("matches the exact anchor point for a curve with no flat plateau", () => {
    const result = resolveAllowableLoadMass({
      mountingOrientation: "vertical",
      boreDiameterMm: 6,
      bearingType: "slide",
      maxPistonSpeedMps: 0.15,
      requiredStrokeMm: 0,
      overhangLengthMm: 5,
      curves,
    });
    expect(result.inEnvelope).toBe(true);
    if (result.inEnvelope) expect(result.allowableLoadMassKg).toBeCloseTo(0.9, 6);
  });

  it("reports out-of-envelope beyond the matched curve's own edge overhang", () => {
    const result = resolveAllowableLoadMass({
      mountingOrientation: "vertical",
      boreDiameterMm: 16,
      bearingType: "slide",
      maxPistonSpeedMps: 0.15,
      requiredStrokeMm: 0,
      overhangLengthMm: 150,
      curves,
    });
    expect(result.inEnvelope).toBe(false);
  });

  it("reports out-of-envelope when no seeded speed band covers the query", () => {
    const result = resolveAllowableLoadMass({
      mountingOrientation: "vertical",
      boreDiameterMm: 16,
      bearingType: "slide",
      maxPistonSpeedMps: 5,
      requiredStrokeMm: 0,
      overhangLengthMm: 10,
      curves,
    });
    expect(result.inEnvelope).toBe(false);
  });

  it("selects the narrowest covering stroke band for horizontal mounting", () => {
    const result = resolveAllowableLoadMass({
      mountingOrientation: "horizontal",
      boreDiameterMm: 16,
      bearingType: "slide",
      maxPistonSpeedMps: 0.3,
      requiredStrokeMm: 9,
      overhangLengthMm: 4,
      curves,
    });
    expect(result.inEnvelope).toBe(true);
    if (result.inEnvelope) {
      expect(result.matchedCurve.strokeBandMaxMm).toBe(10);
      expect(result.allowableLoadMassKg).toBeCloseTo(1.5, 6);
    }
  });

  it("selects the next wider stroke band when the narrower one does not cover the required stroke", () => {
    const result = resolveAllowableLoadMass({
      mountingOrientation: "horizontal",
      boreDiameterMm: 16,
      bearingType: "slide",
      maxPistonSpeedMps: 0.3,
      requiredStrokeMm: 25,
      overhangLengthMm: 8,
      curves,
    });
    expect(result.inEnvelope).toBe(true);
    if (result.inEnvelope) {
      expect(result.matchedCurve.strokeBandMaxMm).toBe(30);
      expect(result.allowableLoadMassKg).toBeCloseTo(0.35, 6);
    }
  });

  it("reports out-of-envelope when no seeded stroke band covers the required stroke", () => {
    const result = resolveAllowableLoadMass({
      mountingOrientation: "horizontal",
      boreDiameterMm: 16,
      bearingType: "slide",
      maxPistonSpeedMps: 0.3,
      requiredStrokeMm: 500,
      overhangLengthMm: 4,
      curves,
    });
    expect(result.inEnvelope).toBe(false);
  });

  it("rejects a negative overhang length", () => {
    expect(() =>
      resolveAllowableLoadMass({
        mountingOrientation: "vertical",
        boreDiameterMm: 16,
        bearingType: "slide",
        maxPistonSpeedMps: 0.15,
        requiredStrokeMm: 0,
        overhangLengthMm: -1,
        curves,
      }),
    ).toThrow(DualRodCylinderSizingInputError);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run lib/modules/dual-rod-cylinder-sizing/0.1.0/math.test.ts --no-coverage`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add lib/modules/dual-rod-cylinder-sizing/0.1.0/math.test.ts
git commit -m "test: dual-rod-cylinder-sizing math kernel property and boundary tests"
```

### Task 10: Write `checks.ts`

**Files:**
- Create: `lib/modules/dual-rod-cylinder-sizing/0.1.0/checks.ts`

- [ ] **Step 1: Write the file**

Same "one informational check" pattern both prior sizing modules use —
this module also computes a required specification, not a pass/fail
against one candidate:

```ts
// Acceptance checks for the dual-rod-cylinder-sizing module. This module
// computes a required specification for catalog matching, not a pass/fail
// against one candidate part -- see ./index.ts's own catalogAdapter and
// lib/application/catalogs/dual-rod-cylinder-matching.ts for where the
// real per-candidate force/cushion/load-mass-vs-overhang checks run, once
// a catalog candidate exists. One informational check confirms the
// specification was produced.

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

- [ ] **Step 2: Commit**

```bash
git add lib/modules/dual-rod-cylinder-sizing/0.1.0/checks.ts
git commit -m "feat: dual-rod-cylinder-sizing checks"
```

### Task 11: Write `trace.ts`

**Files:**
- Create: `lib/modules/dual-rod-cylinder-sizing/0.1.0/trace.ts`

- [ ] **Step 1: Write the file**

Three formula sections (required force, cushion kinetic energy, and a
closing validity/assumptions section) — one section fewer than
`guided-cylinder-sizing@0.1.0`'s own trace (no moment section here; the
load-mass-vs-overhang check is evaluated by the catalog matcher against a
real candidate, not by this module's own run, exactly the same treatment
`guided-cylinder-sizing@0.1.0`'s own trace already gives its lateral-load
and torque checks):

```ts
// Calculation trace for the dual-rod-cylinder-sizing module. Two formula
// sections (required force, cushion kinetic energy) plus a closing
// validity-and-assumptions section -- the same shape
// pneumatic-cylinder-sizing@0.1.0's own trace uses. The required-force
// step cites no source revision: it is general Newtonian statics, not a
// manufacturer-specific formula. No moment/buckling section: this module
// has no buckling check, and the load-mass-vs-overhang-length check runs
// per-candidate in lib/application/catalogs/dual-rod-cylinder-matching.ts,
// not in this module's own run (the same treatment
// guided-cylinder-sizing@0.1.0's own trace gives its lateral-load and
// torque checks).

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
  readonly overhangLength: Quantity;
  readonly mountingOrientation: string;
  readonly operatingPressure: Quantity;
  readonly loadFactor: Quantity;
  readonly cushionType: string;
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
          methodId: "dual_rod_cylinder_sizing.required_force_extend",
          expression:
            "F_req,ext = process_force + m*g*sin(incline_angle) + m*g*mu*cos(incline_angle)",
          inputs: [
            {
              label: "F_proc",
              value: input.processForce,
              ref: "dual_rod_sizing.process_force",
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
              ref: "dual_rod_sizing.required_extend_force",
            },
          ],
          notes: [
            "General Newtonian statics (mass, standard gravity 9.80665 m/s^2, incline, Coulomb friction), not a manufacturer-specific formula -- reproduces pneumatic-cylinder-sizing@0.1.0's own forward-direction sign convention.",
            "Process force is applied on the extend stroke only -- a disclosed 0.1.0 simplification.",
          ],
        },
        {
          node: "step",
          id: "required-force-retract",
          title: "Required retract-side force",
          methodId: "dual_rod_cylinder_sizing.required_force_retract",
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
              ref: "dual_rod_sizing.required_retract_force",
            },
          ],
          notes: [
            "Reproduces pneumatic-cylinder-sizing@0.1.0's own return-direction sign convention: friction stays added (direction-symmetric), gravity's term subtracts.",
            input.requiredRetractForceN < 0
              ? "This run's own required retract force is negative: gravity assistance exceeds friction on this stroke, so the actuator must resist/brake rather than drive. Reported as computed, not floored."
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
          methodId: "dual_rod_cylinder_sizing.kinetic_energy",
          expression: "E = (m/2) * V^2",
          inputs: [
            { label: "m", value: input.loadMass, ref: "motion.axis.total_moving_mass" },
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
            `Cushion type: ${input.cushionType}. Reported only in this module's own 0.1.0, not checked against a candidate: CXS2's own catalog gives no per-model allowable-kinetic-energy table this module has digitized -- a disclosed 0.1.0 evidence gap.`,
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
          methodId: "dual_rod_cylinder_sizing.scope_notes",
          inputs: [],
          outputs: [],
          notes: [
            `Required stroke: ${input.requiredStroke.value} mm; overhang length: ${input.overhangLength.value} mm; mounting orientation: ${input.mountingOrientation}; operating pressure: ${input.operatingPressure.value} MPa; load factor (eta): ${input.loadFactor.value}. Echoed as outputs for the catalog matcher, not evaluated as a pass/fail here.`,
            "No load case (normal/peak/etc.) semantics: every input is a single engineer-supplied value per run.",
            "Force capacity, cushion energy, and the load-mass-vs-overhang-length structural check against a specific catalog candidate are evaluated once catalog matching runs (lib/application/catalogs/dual-rod-cylinder-matching.ts), not by this module's own checks.",
            "No buckling check: unlike pneumatic-cylinder-sizing@0.1.0 and guided-cylinder-sizing@0.1.0, this module has no Euler column buckling formula. SMC's own CXS2 catalog gives no buckling formula, and this mechanism's own governing structural check is SMC's own directly-published load-mass-vs-overhang-length rating instead -- a disclosed scope difference, not a gap.",
            "The load-mass-vs-overhang-length check selects the matching seeded band from this run's own real required_stroke/max_piston_speed/mounting_orientation, then log-log-interpolates between SMC's own digitized graph points -- it reports out-of-envelope rather than extrapolating past SMC's own published range.",
          ],
        },
      ],
    },
  ]);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/modules/dual-rod-cylinder-sizing/0.1.0/trace.ts
git commit -m "feat: dual-rod-cylinder-sizing calculation trace"
```

### Task 12: Write `load-mass-curves.ts` — the digitized dataset

**Files:**
- Create: `lib/modules/dual-rod-cylinder-sizing/0.1.0/load-mass-curves.ts`

The digitized dataset (design doc "Digitized dataset" table) is consumed
by both the catalog matcher (Task 17, per-candidate lookup) and this
module's own reference example (Task 20) — it lives in its own file, not
inlined into `math.ts` (which stays a pure, data-free formula kernel) or
duplicated between callers.

- [ ] **Step 1: Transcribe the full 61-curve dataset**

Write this exact content (transcribing every row of the design doc's own
two tables — vertical: 21 rows across graphs 1-8; horizontal: 40 rows
across graphs 9-21 — one `LoadMassCurve` entry per CXS2M/CXS2L column
pair per row, `plateauEndOverhangMm`/`edgeOverhangMm` read from each row's
own "@ L<=" and "@ L=100"/"@ chart edge" columns):

```ts
// Digitized SMC CXS2 "Model Selection" load-mass-vs-overhang-length
// dataset (Unit 7.4). Every (overhang, load mass) point below is read
// directly off the founder-supplied graph images
// (reference/source-material/dual-rod-cylinder/) to 2 significant
// figures -- the precision ceiling of reading a printed log-log chart by
// eye. See context/modules/dual-rod-cylinder-sizing/stage-1-spec.md
// "Load-bearing check" and docs/superpowers/specs/
// 2026-08-26-dual-rod-cylinder-sizing-design.md "Digitized dataset" for
// the full source table this file transcribes row for row. Founder
// review of this table against the source graphs is expected before
// catalog seeding (Task 14) -- the same "founder review/trim pending"
// treatment every prior catalog seed in this project received, given the
// added risk of eye-reading log-log curves versus transcribing a printed
// table.
//
// A row with no flat plateau (sloped from its very first digitized
// point, e.g. vertical bore 6 at every speed band) sets
// plateauEndOverhangMm equal to that first point's own overhang --
// resolveAllowableLoadMass's own plateau branch then returns an exact
// match at that single point, not a divide-by-zero (see math.ts).

import type { LoadMassCurve } from "./math";

export const DUAL_ROD_LOAD_MASS_CURVES: readonly LoadMassCurve[] = [
  // --- Vertical mounting (graphs 1-8; no stroke-band split) -----------------
  // Graph 1, <=200mm/s, bore 6.
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 6, bearingType: "slide", plateauEndOverhangMm: 5, plateauLoadMassKg: 0.9, edgeOverhangMm: 100, edgeLoadMassKg: 0.04 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 6, bearingType: "ball_bushing", plateauEndOverhangMm: 7, plateauLoadMassKg: 0.95, edgeOverhangMm: 100, edgeLoadMassKg: 0.055 },
  // Graph 2, <=400mm/s, bore 6.
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 6, bearingType: "slide", plateauEndOverhangMm: 20, plateauLoadMassKg: 0.2, edgeOverhangMm: 100, edgeLoadMassKg: 0.038 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 6, bearingType: "ball_bushing", plateauEndOverhangMm: 22, plateauLoadMassKg: 0.2, edgeOverhangMm: 100, edgeLoadMassKg: 0.05 },
  // Graph 3, <=600mm/s, bore 6.
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 6, bearingType: "slide", plateauEndOverhangMm: 38, plateauLoadMassKg: 0.085, edgeOverhangMm: 100, edgeLoadMassKg: 0.035 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 6, bearingType: "ball_bushing", plateauEndOverhangMm: 45, plateauLoadMassKg: 0.085, edgeOverhangMm: 100, edgeLoadMassKg: 0.045 },
  // Graph 4, <=800mm/s, bore 6.
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.8, boreDiameterMm: 6, bearingType: "slide", plateauEndOverhangMm: 80, plateauLoadMassKg: 0.038, edgeOverhangMm: 100, edgeLoadMassKg: 0.033 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.8, boreDiameterMm: 6, bearingType: "ball_bushing", plateauEndOverhangMm: 100, plateauLoadMassKg: 0.038, edgeOverhangMm: 100, edgeLoadMassKg: 0.038 },
  // Graph 5, <=200mm/s, bores 10/16/20/25/32.
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 5, plateauLoadMassKg: 2.7, edgeOverhangMm: 100, edgeLoadMassKg: 0.095 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 10, bearingType: "ball_bushing", plateauEndOverhangMm: 7, plateauLoadMassKg: 3.7, edgeOverhangMm: 100, edgeLoadMassKg: 0.19 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 5.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.43 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 5.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.57 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 8.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.70 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 10, plateauLoadMassKg: 8.5, edgeOverhangMm: 100, edgeLoadMassKg: 0.95 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 25, bearingType: "slide", plateauEndOverhangMm: 12, plateauLoadMassKg: 10.5, edgeOverhangMm: 100, edgeLoadMassKg: 1.05 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 25, bearingType: "ball_bushing", plateauEndOverhangMm: 12, plateauLoadMassKg: 10.5, edgeOverhangMm: 100, edgeLoadMassKg: 1.30 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 32, bearingType: "slide", plateauEndOverhangMm: 19, plateauLoadMassKg: 13.0, edgeOverhangMm: 100, edgeLoadMassKg: 2.70 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.2, boreDiameterMm: 32, bearingType: "ball_bushing", plateauEndOverhangMm: 19, plateauLoadMassKg: 13.0, edgeOverhangMm: 100, edgeLoadMassKg: 2.70 },
  // Graph 6, <=400mm/s, bores 10/16/20/25/32.
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 15, plateauLoadMassKg: 0.2, edgeOverhangMm: 100, edgeLoadMassKg: 0.10 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 10, bearingType: "ball_bushing", plateauEndOverhangMm: 30, plateauLoadMassKg: 0.2, edgeOverhangMm: 100, edgeLoadMassKg: 0.17 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 33, plateauLoadMassKg: 0.8, edgeOverhangMm: 100, edgeLoadMassKg: 0.42 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 42, plateauLoadMassKg: 0.8, edgeOverhangMm: 100, edgeLoadMassKg: 0.58 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 33, plateauLoadMassKg: 1.1, edgeOverhangMm: 100, edgeLoadMassKg: 0.72 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 33, plateauLoadMassKg: 1.1, edgeOverhangMm: 100, edgeLoadMassKg: 1.0 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 25, bearingType: "slide", plateauEndOverhangMm: 33, plateauLoadMassKg: 2.0, edgeOverhangMm: 100, edgeLoadMassKg: 1.35 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 25, bearingType: "ball_bushing", plateauEndOverhangMm: 50, plateauLoadMassKg: 2.0, edgeOverhangMm: 100, edgeLoadMassKg: 1.6 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 32, bearingType: "slide", plateauEndOverhangMm: 55, plateauLoadMassKg: 3.1, edgeOverhangMm: 100, edgeLoadMassKg: 2.4 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.4, boreDiameterMm: 32, bearingType: "ball_bushing", plateauEndOverhangMm: 55, plateauLoadMassKg: 3.1, edgeOverhangMm: 100, edgeLoadMassKg: 2.7 },
  // Graph 7, <=600mm/s, bores 10/16/20/25/32.
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 35, plateauLoadMassKg: 0.38, edgeOverhangMm: 100, edgeLoadMassKg: 0.105 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 10, bearingType: "ball_bushing", plateauEndOverhangMm: 55, plateauLoadMassKg: 0.38, edgeOverhangMm: 100, edgeLoadMassKg: 0.16 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 100, plateauLoadMassKg: 0.53, edgeOverhangMm: 100, edgeLoadMassKg: 0.53 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 100, plateauLoadMassKg: 0.53, edgeOverhangMm: 100, edgeLoadMassKg: 0.53 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 65, plateauLoadMassKg: 0.9, edgeOverhangMm: 100, edgeLoadMassKg: 0.70 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 65, plateauLoadMassKg: 0.9, edgeOverhangMm: 100, edgeLoadMassKg: 0.85 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 25, bearingType: "slide", plateauEndOverhangMm: 100, plateauLoadMassKg: 1.1, edgeOverhangMm: 100, edgeLoadMassKg: 1.1 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 25, bearingType: "ball_bushing", plateauEndOverhangMm: 100, plateauLoadMassKg: 1.1, edgeOverhangMm: 100, edgeLoadMassKg: 1.1 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 32, bearingType: "slide", plateauEndOverhangMm: 100, plateauLoadMassKg: 1.4, edgeOverhangMm: 100, edgeLoadMassKg: 1.4 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.6, boreDiameterMm: 32, bearingType: "ball_bushing", plateauEndOverhangMm: 100, plateauLoadMassKg: 1.4, edgeOverhangMm: 100, edgeLoadMassKg: 1.4 },
  // Graph 8, <=700mm/s (<=800 for bore 10), bores 10/16/20.
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.8, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 55, plateauLoadMassKg: 0.2, edgeOverhangMm: 100, edgeLoadMassKg: 0.115 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.8, boreDiameterMm: 10, bearingType: "ball_bushing", plateauEndOverhangMm: 100, plateauLoadMassKg: 0.2, edgeOverhangMm: 100, edgeLoadMassKg: 0.2 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.7, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 100, plateauLoadMassKg: 0.39, edgeOverhangMm: 100, edgeLoadMassKg: 0.39 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.7, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 100, plateauLoadMassKg: 0.39, edgeOverhangMm: 100, edgeLoadMassKg: 0.39 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.7, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 100, plateauLoadMassKg: 0.58, edgeOverhangMm: 100, edgeLoadMassKg: 0.58 },
  { mountingOrientation: "vertical", strokeBandMaxMm: null, speedBandMaxMps: 0.7, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 100, plateauLoadMassKg: 0.58, edgeOverhangMm: 100, edgeLoadMassKg: 0.58 },

  // --- Horizontal mounting (graphs 9-21) ------------------------------------
  // Graph 9, <=10mm stroke, bore 6 (CXS2M only per the design doc's own "dashed = <=400 line only" note -- no CXS2L row seeded for graph 9).
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.8, boreDiameterMm: 6, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.045, edgeOverhangMm: 33, edgeLoadMassKg: 0.01 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.4, boreDiameterMm: 6, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.08, edgeOverhangMm: 44, edgeLoadMassKg: 0.01 },
  // Graph 10, <=30mm stroke, bore 6.
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.8, boreDiameterMm: 6, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.038, edgeOverhangMm: 20, edgeLoadMassKg: 0.01 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.8, boreDiameterMm: 6, bearingType: "ball_bushing", plateauEndOverhangMm: 5, plateauLoadMassKg: 0.07, edgeOverhangMm: 28, edgeLoadMassKg: 0.01 },
  // Graph 11, <=50mm stroke, bore 6.
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.8, boreDiameterMm: 6, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.03, edgeOverhangMm: 13, edgeLoadMassKg: 0.01 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.8, boreDiameterMm: 6, bearingType: "ball_bushing", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.038, edgeOverhangMm: 19, edgeLoadMassKg: 0.01 },
  // Graph 12, <=75mm stroke, bore 6.
  { mountingOrientation: "horizontal", strokeBandMaxMm: 75, speedBandMaxMps: 0.8, boreDiameterMm: 6, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.028, edgeOverhangMm: 15, edgeLoadMassKg: 0.005 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 75, speedBandMaxMps: 0.8, boreDiameterMm: 6, bearingType: "ball_bushing", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.038, edgeOverhangMm: 24, edgeLoadMassKg: 0.005 },
  // Graph 13, <=100mm stroke, bore 6.
  { mountingOrientation: "horizontal", strokeBandMaxMm: 100, speedBandMaxMps: 0.8, boreDiameterMm: 6, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.028, edgeOverhangMm: 8, edgeLoadMassKg: 0.005 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 100, speedBandMaxMps: 0.8, boreDiameterMm: 6, bearingType: "ball_bushing", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.038, edgeOverhangMm: 15, edgeLoadMassKg: 0.005 },
  // Graph 14, <=10mm stroke, <=400mm/s, bores 10/16/20/25/32.
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.4, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.6, edgeOverhangMm: 100, edgeLoadMassKg: 0.01 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.4, boreDiameterMm: 10, bearingType: "ball_bushing", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.4, edgeOverhangMm: 100, edgeLoadMassKg: 0.02 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.4, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 1.5, edgeOverhangMm: 100, edgeLoadMassKg: 0.04 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.4, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 4, plateauLoadMassKg: 1.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.06 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.4, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 1.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.07 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.4, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 4, plateauLoadMassKg: 1.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.11 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.4, boreDiameterMm: 25, bearingType: "slide", plateauEndOverhangMm: 9, plateauLoadMassKg: 3.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.18 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.4, boreDiameterMm: 25, bearingType: "ball_bushing", plateauEndOverhangMm: 9, plateauLoadMassKg: 3.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.23 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.4, boreDiameterMm: 32, bearingType: "slide", plateauEndOverhangMm: 9, plateauLoadMassKg: 3.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.30 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.4, boreDiameterMm: 32, bearingType: "ball_bushing", plateauEndOverhangMm: 9, plateauLoadMassKg: 3.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.40 },
  // Graph 15, <=10mm stroke, >400mm/s, bores 10/16/20/25/32.
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.8, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.2, edgeOverhangMm: 100, edgeLoadMassKg: 0.01 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.8, boreDiameterMm: 10, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.2, edgeOverhangMm: 100, edgeLoadMassKg: 0.017 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.8, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.7, edgeOverhangMm: 100, edgeLoadMassKg: 0.04 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.8, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.7, edgeOverhangMm: 100, edgeLoadMassKg: 0.055 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.8, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.065 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.8, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.10 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.8, boreDiameterMm: 25, bearingType: "slide", plateauEndOverhangMm: 18, plateauLoadMassKg: 1.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.16 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.8, boreDiameterMm: 25, bearingType: "ball_bushing", plateauEndOverhangMm: 18, plateauLoadMassKg: 1.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.21 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.8, boreDiameterMm: 32, bearingType: "slide", plateauEndOverhangMm: 18, plateauLoadMassKg: 1.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.28 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 10, speedBandMaxMps: 0.8, boreDiameterMm: 32, bearingType: "ball_bushing", plateauEndOverhangMm: 18, plateauLoadMassKg: 1.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.35 },
  // Graph 16, <=30mm stroke, <=400mm/s, bores 10/16/20/25/32.
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.4, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.15, edgeOverhangMm: 100, edgeLoadMassKg: 0.01 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.4, boreDiameterMm: 10, bearingType: "ball_bushing", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.28, edgeOverhangMm: 100, edgeLoadMassKg: 0.013 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.4, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.35, edgeOverhangMm: 100, edgeLoadMassKg: 0.03 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.4, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.35, edgeOverhangMm: 100, edgeLoadMassKg: 0.045 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.4, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.65, edgeOverhangMm: 100, edgeLoadMassKg: 0.045 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.4, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.65, edgeOverhangMm: 100, edgeLoadMassKg: 0.10 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.4, boreDiameterMm: 25, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.1, edgeOverhangMm: 100, edgeLoadMassKg: 0.10 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.4, boreDiameterMm: 25, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.1, edgeOverhangMm: 100, edgeLoadMassKg: 0.19 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.4, boreDiameterMm: 32, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 2.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.19 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.4, boreDiameterMm: 32, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 2.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.30 },
  // Graph 17, <=30mm stroke, >400mm/s, bores 10/16/20/25/32.
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.8, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.12, edgeOverhangMm: 100, edgeLoadMassKg: 0.01 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.8, boreDiameterMm: 10, bearingType: "ball_bushing", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.20, edgeOverhangMm: 100, edgeLoadMassKg: 0.012 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.8, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.42, edgeOverhangMm: 100, edgeLoadMassKg: 0.028 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.8, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.42, edgeOverhangMm: 100, edgeLoadMassKg: 0.04 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.8, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.65, edgeOverhangMm: 100, edgeLoadMassKg: 0.045 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.8, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.65, edgeOverhangMm: 100, edgeLoadMassKg: 0.06 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.8, boreDiameterMm: 25, bearingType: "slide", plateauEndOverhangMm: 13, plateauLoadMassKg: 1.1, edgeOverhangMm: 100, edgeLoadMassKg: 0.10 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.8, boreDiameterMm: 25, bearingType: "ball_bushing", plateauEndOverhangMm: 13, plateauLoadMassKg: 1.1, edgeOverhangMm: 100, edgeLoadMassKg: 0.20 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.8, boreDiameterMm: 32, bearingType: "slide", plateauEndOverhangMm: 13, plateauLoadMassKg: 1.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.20 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 30, speedBandMaxMps: 0.8, boreDiameterMm: 32, bearingType: "ball_bushing", plateauEndOverhangMm: 13, plateauLoadMassKg: 1.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.30 },
  // Graph 18, <=50mm stroke, <=400mm/s, bores 10/16/20/25/32.
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.4, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.1, edgeOverhangMm: 100, edgeLoadMassKg: 0.01 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.4, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.35, edgeOverhangMm: 100, edgeLoadMassKg: 0.02 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.4, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.35, edgeOverhangMm: 100, edgeLoadMassKg: 0.045 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.4, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.6, edgeOverhangMm: 100, edgeLoadMassKg: 0.04 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.4, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.6, edgeOverhangMm: 100, edgeLoadMassKg: 0.08 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.4, boreDiameterMm: 25, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.9, edgeOverhangMm: 100, edgeLoadMassKg: 0.08 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.4, boreDiameterMm: 25, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.9, edgeOverhangMm: 100, edgeLoadMassKg: 0.15 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.4, boreDiameterMm: 32, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.17 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.4, boreDiameterMm: 32, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.25 },
  // Graph 19, <=50mm stroke, >400mm/s, bores 10/16/20/25/32.
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.8, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.1, edgeOverhangMm: 100, edgeLoadMassKg: 0.01 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.8, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.35, edgeOverhangMm: 100, edgeLoadMassKg: 0.018 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.8, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.35, edgeOverhangMm: 100, edgeLoadMassKg: 0.04 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.8, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.55, edgeOverhangMm: 100, edgeLoadMassKg: 0.038 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.8, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.55, edgeOverhangMm: 100, edgeLoadMassKg: 0.07 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.8, boreDiameterMm: 25, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.9, edgeOverhangMm: 100, edgeLoadMassKg: 0.075 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.8, boreDiameterMm: 25, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.9, edgeOverhangMm: 100, edgeLoadMassKg: 0.14 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.8, boreDiameterMm: 32, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.16 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 50, speedBandMaxMps: 0.8, boreDiameterMm: 32, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.24 },
  // Graph 20, <=75mm stroke, >400mm/s, bores 10/16/20/25/32 (bore 10 has no CXS2L row -- design doc shows "--").
  { mountingOrientation: "horizontal", strokeBandMaxMm: 75, speedBandMaxMps: 0.8, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 4, plateauLoadMassKg: 0.28, edgeOverhangMm: 33, edgeLoadMassKg: 0.01 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 75, speedBandMaxMps: 0.8, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.28, edgeOverhangMm: 100, edgeLoadMassKg: 0.014 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 75, speedBandMaxMps: 0.8, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.42, edgeOverhangMm: 100, edgeLoadMassKg: 0.02 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 75, speedBandMaxMps: 0.8, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.42, edgeOverhangMm: 100, edgeLoadMassKg: 0.032 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 75, speedBandMaxMps: 0.8, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.55, edgeOverhangMm: 100, edgeLoadMassKg: 0.06 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 75, speedBandMaxMps: 0.8, boreDiameterMm: 25, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.65, edgeOverhangMm: 100, edgeLoadMassKg: 0.06 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 75, speedBandMaxMps: 0.8, boreDiameterMm: 25, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.85, edgeOverhangMm: 100, edgeLoadMassKg: 0.12 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 75, speedBandMaxMps: 0.8, boreDiameterMm: 32, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.1, edgeOverhangMm: 100, edgeLoadMassKg: 0.11 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 75, speedBandMaxMps: 0.8, boreDiameterMm: 32, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.1, edgeOverhangMm: 100, edgeLoadMassKg: 0.20 },
  // Graph 21, <=100mm stroke, >400mm/s, bores 10/16/20/25/32 (bore 10 has no CXS2L row -- design doc shows "--").
  { mountingOrientation: "horizontal", strokeBandMaxMm: 100, speedBandMaxMps: 0.8, boreDiameterMm: 10, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.22, edgeOverhangMm: 20, edgeLoadMassKg: 0.01 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 100, speedBandMaxMps: 0.8, boreDiameterMm: 16, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.22, edgeOverhangMm: 100, edgeLoadMassKg: 0.011 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 100, speedBandMaxMps: 0.8, boreDiameterMm: 16, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.55, edgeOverhangMm: 100, edgeLoadMassKg: 0.02 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 100, speedBandMaxMps: 0.8, boreDiameterMm: 20, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.35, edgeOverhangMm: 100, edgeLoadMassKg: 0.023 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 100, speedBandMaxMps: 0.8, boreDiameterMm: 20, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.55, edgeOverhangMm: 100, edgeLoadMassKg: 0.045 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 100, speedBandMaxMps: 0.8, boreDiameterMm: 25, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.55, edgeOverhangMm: 100, edgeLoadMassKg: 0.043 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 100, speedBandMaxMps: 0.8, boreDiameterMm: 25, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 0.75, edgeOverhangMm: 100, edgeLoadMassKg: 0.10 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 100, speedBandMaxMps: 0.8, boreDiameterMm: 32, bearingType: "slide", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.10 },
  { mountingOrientation: "horizontal", strokeBandMaxMm: 100, speedBandMaxMps: 0.8, boreDiameterMm: 32, bearingType: "ball_bushing", plateauEndOverhangMm: 8, plateauLoadMassKg: 1.0, edgeOverhangMm: 100, edgeLoadMassKg: 0.17 },
];
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. If any row is missing a field, TypeScript's own
`LoadMassCurve` interface will report exactly which literal is incomplete
— fix from the design doc's own table before proceeding, do not guess a
value.

- [ ] **Step 3: Write a data-integrity test**

Create `lib/modules/dual-rod-cylinder-sizing/0.1.0/load-mass-curves.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DUAL_ROD_LOAD_MASS_CURVES } from "./load-mass-curves";

describe("DUAL_ROD_LOAD_MASS_CURVES data integrity", () => {
  it("has 61 digitized curves (21 vertical + 40 horizontal, per the design doc's own table)", () => {
    expect(DUAL_ROD_LOAD_MASS_CURVES.length).toBe(61);
  });

  it("every curve has a non-negative plateau overhang at or below its own edge overhang", () => {
    for (const curve of DUAL_ROD_LOAD_MASS_CURVES) {
      expect(curve.plateauEndOverhangMm).toBeGreaterThanOrEqual(0);
      expect(curve.plateauEndOverhangMm).toBeLessThanOrEqual(curve.edgeOverhangMm);
    }
  });

  it("every curve's plateau load mass is at or above its own edge load mass (monotonically non-increasing)", () => {
    for (const curve of DUAL_ROD_LOAD_MASS_CURVES) {
      expect(curve.plateauLoadMassKg).toBeGreaterThanOrEqual(curve.edgeLoadMassKg);
    }
  });

  it("every horizontal curve has a stroke band; every vertical curve does not", () => {
    for (const curve of DUAL_ROD_LOAD_MASS_CURVES) {
      if (curve.mountingOrientation === "horizontal") {
        expect(curve.strokeBandMaxMm).not.toBeNull();
      } else {
        expect(curve.strokeBandMaxMm).toBeNull();
      }
    }
  });

  it("has no duplicate (orientation, stroke band, speed band, bore, bearing type) key", () => {
    const keys = DUAL_ROD_LOAD_MASS_CURVES.map(
      (c) =>
        `${c.mountingOrientation}|${c.strokeBandMaxMm}|${c.speedBandMaxMps}|${c.boreDiameterMm}|${c.bearingType}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});
```

- [ ] **Step 4: Run the data-integrity test**

Run: `npx vitest run lib/modules/dual-rod-cylinder-sizing/0.1.0/load-mass-curves.test.ts --no-coverage`
Expected: all pass. If the duplicate-key test fails, re-check the
transcription against the design doc's own table for a row copied to the
wrong bore/speed-band cell before proceeding — do not delete the test to
make it pass.

- [ ] **Step 5: Commit**

```bash
git add lib/modules/dual-rod-cylinder-sizing/0.1.0/load-mass-curves.ts lib/modules/dual-rod-cylinder-sizing/0.1.0/load-mass-curves.test.ts
git commit -m "feat: dual-rod-cylinder-sizing digitized load-mass-vs-overhang dataset"
```

### Task 13: Write `compute.ts`

**Files:**
- Create: `lib/modules/dual-rod-cylinder-sizing/0.1.0/compute.ts`

Note: `compute()` does NOT call `resolveAllowableLoadMass` — that check
runs per-candidate in the catalog matcher (Task 17), exactly the way
`guided-cylinder-sizing@0.1.0`'s own `compute()` never calls
`resolveBucklingLoad` either (both are per-candidate checks, not run-level
outputs). `compute()` only resolves force and kinetic energy, and echoes
the resolved inputs the matcher needs.

- [ ] **Step 1: Write the file**

```ts
// Pure, deterministic compute function for the dual-rod-cylinder-sizing
// module (v0.1.0, Stage 3). Resolves required extend/retract force and
// required cushion kinetic energy, echoes catalog-relevant resolved
// inputs as outputs (see ./manifest.ts's own top comment for why), and
// returns a structured computation. Performs no I/O and imports only the
// engine's public surface and this module's own files.
//
// Does NOT call resolveAllowableLoadMass: the load-mass-vs-overhang-length
// check needs a specific candidate's own bore/bearing-type, which does not
// exist at this module's own run level -- it runs per-candidate in
// lib/application/catalogs/dual-rod-cylinder-matching.ts instead, the
// same treatment guided-cylinder-sizing@0.1.0's own compute() already
// gives resolveBucklingLoad.

import {
  makeQuantity,
  SERIALIZATION_FORMAT_VERSION,
  type EngineeringValue,
  type EnumValue,
  type ModuleComputation,
  type ModuleInput,
} from "@/lib/engine";
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
  const overhangLength = quantityAt(values, "overhang_length");
  const mountingOrientation = enumValueAt(values, "mounting_orientation");

  if (
    inclineAngle === undefined ||
    frictionCoefficient === undefined ||
    loadMass === undefined ||
    operatingPressure === undefined ||
    loadFactor === undefined ||
    maxPistonSpeed === undefined ||
    cushionType === undefined ||
    requiredStroke === undefined ||
    overhangLength === undefined ||
    mountingOrientation === undefined
  ) {
    throw new Error(
      "dual-rod-cylinder-sizing requires its full set of load, pressure, load-factor, speed, cushion-type, stroke, overhang-length, and mounting-orientation inputs.",
    );
  }

  // process_force is optional at the port level; the registry's own
  // constant default (0 N) auto-fills an absent value
  // (lib/engine/module-sdk/execute.ts resolveModuleInput) -- resolved here
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

  const outputs: Record<string, EngineeringValue> = {
    required_extend_force: makeQuantity(requiredExtendForceN, "N"),
    required_retract_force: makeQuantity(requiredRetractForceN, "N"),
    kinetic_energy: makeQuantity(kineticEnergyJ, "J"),
    required_stroke_out: requiredStroke,
    overhang_length_out: overhangLength,
    mounting_orientation_out: makeEnumOutput(
      "dual_rod_mounting_orientation",
      mountingOrientation,
    ),
    operating_pressure_out: operatingPressure,
    load_factor_out: loadFactor,
    max_piston_speed_out: maxPistonSpeed,
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
      overhangLength,
      mountingOrientation,
      operatingPressure,
      loadFactor,
      cushionType,
    }),
    checks: buildChecks(),
    warnings: [],
    assumptions: [
      {
        id: "no-per-candidate-check-in-this-run",
        statement:
          "This run computes a required specification for catalog matching; it does not check one specific candidate cylinder. Force capacity, cushion energy, and the load-mass-vs-overhang-length structural check against a real catalog candidate are evaluated by lib/application/catalogs/dual-rod-cylinder-matching.ts once catalog candidates exist.",
      },
      {
        id: "process-force-extend-only",
        statement:
          "The optional process force is applied on the extend stroke only, a disclosed 0.1.0 simplification (context/modules/dual-rod-cylinder-sizing/stage-2-contract.md Decision 3).",
        value: resolvedProcessForce,
      },
      {
        id: "retract-force-may-be-negative",
        statement:
          "Required retract force may be negative for a strongly gravity-assisted return stroke on a heavy unbalanced load, meaning the actuator must resist/brake rather than drive. Reported as computed, not floored.",
      },
      {
        id: "no-buckling-check-disclosed-scope-difference",
        statement:
          "Unlike pneumatic-cylinder-sizing@0.1.0 and guided-cylinder-sizing@0.1.0, this module has no Euler column buckling check. SMC's own CXS2 catalog gives no buckling formula, and this mechanism's own governing structural check is SMC's own directly-published load-mass-vs-overhang-length rating instead (stage-1-spec.md 'No buckling check for this family') -- a disclosed scope difference, not a gap.",
      },
      {
        id: "cushion-energy-reported-only",
        statement:
          "Required cushion kinetic energy is reported, not checked against a candidate: CXS2's own catalog gives no per-model allowable-kinetic-energy table this module has digitized -- a disclosed 0.1.0 evidence gap.",
      },
      {
        id: "load-mass-vs-overhang-band-selection-is-a-judgment-call",
        statement:
          "The load-mass-vs-overhang-length check (evaluated per-candidate, not by this run) selects the narrowest seeded stroke/speed band covering this run's own real required_stroke/max_piston_speed, rounding up rather than gating on a fixed worst-case band -- a founder-directed engineering judgment call (context/modules/dual-rod-cylinder-sizing/stage-2-contract.md Decision 6), not a rule SMC's own catalog states directly.",
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

function makeEnumOutput(enumId: string, value: string): EnumValue {
  return {
    v: SERIALIZATION_FORMAT_VERSION,
    kind: "enum",
    enumId,
    value,
  };
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (the `TraceInput` shape in `trace.ts` must match the
object literal passed to `buildTrace` here exactly — if this fails, check
that Task 11's own `TraceInput` interface field names match this call
site).

- [ ] **Step 3: Commit**

```bash
git add lib/modules/dual-rod-cylinder-sizing/0.1.0/compute.ts
git commit -m "feat: dual-rod-cylinder-sizing compute function"
```

### Task 14: Write `test-helpers.ts`

**Files:**
- Create: `lib/modules/dual-rod-cylinder-sizing/0.1.0/test-helpers.ts`

- [ ] **Step 1: Write the file**

```ts
// Shared test-only helpers for the dual-rod-cylinder-sizing module test
// files. Mirrors lib/modules/guided-cylinder-sizing/0.1.0/test-helpers.ts.
// Not part of the module package itself (never imported by
// manifest/compute/trace/checks/ui/report/validation/index).

import {
  SERIALIZATION_FORMAT_VERSION,
  type EngineeringValue,
  type EnumValue,
  type Quantity,
} from "@/lib/engine";

/** A raw, untrusted module input shape, as authored in test fixtures. */
export type RawInput = {
  values: Record<string, Quantity | EnumValue>;
};

/**
 * `EnumValue` requires `v: SerializationFormatVersion`, not just
 * `kind`/`enumId`/`value` -- the same fix compute.ts's own
 * `makeEnumOutput` helper already applies.
 */
export function enumValue(enumId: string, value: string): EnumValue {
  return { v: SERIALIZATION_FORMAT_VERSION, kind: "enum", enumId, value };
}

export function cushionTypeValue(
  value: "none" | "rubber_bumper" | "air_cushion",
): EnumValue {
  return enumValue("pneumatic_cushion_type", value);
}

export function mountingOrientationValue(
  value: "vertical" | "horizontal" | string,
): EnumValue {
  return enumValue("dual_rod_mounting_orientation", value);
}

/** Narrows an `EngineeringValue` to a `Quantity`; throws otherwise (test-only). */
export function asQuantity(value: EngineeringValue): Quantity {
  if (value.kind !== "quantity") {
    throw new Error(`Expected a quantity output, got "${value.kind}".`);
  }
  return value;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/modules/dual-rod-cylinder-sizing/0.1.0/test-helpers.ts
git commit -m "test: dual-rod-cylinder-sizing shared test helpers"
```

### Task 15: Write `ui.ts` and `report.ts`

**Files:**
- Create: `lib/modules/dual-rod-cylinder-sizing/0.1.0/ui.ts`
- Create: `lib/modules/dual-rod-cylinder-sizing/0.1.0/report.ts`

- [ ] **Step 1: Write `ui.ts`**

```ts
// Generic UI schema for the dual-rod-cylinder-sizing module. Selects and
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
        {
          portKey: "overhang_length",
          help: "Lever arm from the cylinder's own end-plate load-reference point to the load's center of gravity (SMC's own 'Overhang L'). Governs the load-mass-vs-overhang-length structural check.",
        },
        {
          portKey: "mounting_orientation",
          help: "Vertical or horizontal only -- SMC's own CXS2 selection graphs have no inclined bucket.",
        },
      ],
    },
  ],
};
```

- [ ] **Step 2: Write `report.ts`**

```ts
// Generic report schema for the dual-rod-cylinder-sizing module.
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

- [ ] **Step 3: Commit**

```bash
git add lib/modules/dual-rod-cylinder-sizing/0.1.0/ui.ts lib/modules/dual-rod-cylinder-sizing/0.1.0/report.ts
git commit -m "feat: dual-rod-cylinder-sizing generic UI and report schema"
```

### Task 16: Write a draft `validation.ts` and assemble `index.ts`

**Files:**
- Create: `lib/modules/dual-rod-cylinder-sizing/0.1.0/validation.ts`
- Create: `lib/modules/dual-rod-cylinder-sizing/0.1.0/index.ts`

`validation.ts` is drafted now (Stage 3) and finalized at Stage 4 (Task 21)
— the same two-pass pattern both prior sizing modules used. `index.ts`
needs the `catalogAdapter` shape now because `package.test.ts` (Task 17)
exercises the whole assembled package.

- [ ] **Step 1: Write the Stage-3 draft `validation.ts`**

```ts
// Validation record for the dual-rod-cylinder-sizing module (roadmap
// module definition of done, item 10). Stage 3 draft: reviewer/reviewDate
// intentionally state Stage 4 has not yet been performed. Finalized at
// Stage 4 (Task 21 of this plan) once smc-reference-example.ts/.test.ts
// exists.

import type { ValidationRecord } from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const validation: ValidationRecord = {
  moduleId: "dual-rod-cylinder-sizing",
  moduleVersion: "0.1.0",
  methods: [
    "Required-force resolution: general Newtonian statics (mass, standard gravity, incline, Coulomb friction), reproducing pneumatic-cylinder-sizing@0.1.0's own forward/return sign convention -- not a manufacturer-specific formula.",
    "SMC Corporation theoretical force method (F = eta * A * P), reproduced from pneumatic-cylinder-sizing@0.1.0 -- confirmed directly against CXS2's own Theoretical Output table (numerically identical to the older CXSJ catalog's own table, stage-1-spec.md).",
    "SMC Corporation cushion kinetic-energy method (E = (m/2) * V^2), reused directly from pneumatic-cylinder-sizing@0.1.0 -- reported only in this module, not checked against a candidate (CXS2's own catalog gives no per-model allowable-kinetic-energy table this module has digitized).",
    "Load mass vs. overhang length (new): log-log interpolation between SMC's own digitized 'Model Selection' graph points, keyed by mounting orientation, speed band, and (horizontal only) stroke band. Not a closed-form manufacturer formula -- SMC publishes this relationship only as graphs.",
  ],
  sourceRevisionIds: [
    asSourceRevisionId("jp.smc.cxs2_series_catalog@web-2026-08-26"),
    asSourceRevisionId(
      "jp.smc.air_cylinders_model_selection@web-2026-08-24",
    ),
    asSourceRevisionId(
      "us.milwaukee_cylinder.design_engineering_guide@web-2026-08-24",
    ),
    asSourceRevisionId("us.norgren.m1000_heavy_duty_cylinders@web-2026-08-24"),
  ],
  referenceExamples: [],
  independentBenchmark:
    "Not yet performed -- Stage 3 draft. The theoretical-force formula is reused/reproduced unchanged from pneumatic-cylinder-sizing@0.1.0, which already has a completed independent-benchmark substitute (Norgren M/1000, via pneumatic-cylinder@0.1.0); this is expected to be cited by reference at Stage 4, not re-run, since the formula bodies are unchanged. The new load-mass-vs-overhang interpolation has no independent source of any kind -- Stage 4 will need to state this as a disclosed 0.1.0 limitation, not resolve it.",
  reviewer: "Not yet performed -- Stage 4 has not been completed.",
  reviewDate: "",
  supportedUseLimits: [
    "Computes a required specification for catalog matching; does not check one already-selected cylinder.",
    "No load case (normal/peak/etc.) semantics; every input is a single engineer-supplied value per run.",
    "Process force is applied on the extend stroke only.",
    "No buckling check -- SMC's own CXS2 catalog gives no buckling formula; the load-mass-vs-overhang-length rating is this mechanism's own governing structural check instead.",
    "Cushion kinetic energy is reported only, not checked against a candidate -- CXS2's own catalog gives no per-model allowable-kinetic-energy table.",
    "The load-mass-vs-overhang-length check reports out-of-envelope, never extrapolating, when the query falls outside every seeded band.",
  ],
  deviations: [
    "Reproduces every disclosed evidence gap pneumatic-cylinder-sizing@0.1.0 already carries for the force formula area (see that module's own validation.ts) -- not silently resolved here.",
    "The band-selection logic (rounding a real stroke/speed up to the nearest seeded band) is a new, undisclosed-by-SMC engineering judgment call unique to this module (stage-2-contract.md Decision 6).",
  ],
};
```

- [ ] **Step 2: Assemble `index.ts`**

```ts
// The dual-rod-cylinder-sizing module package (Unit 7.4). Assembles the
// manifest, ports, compute, UI, report, validation record, and catalog
// adapter into a single ModulePackage and seals it.
//
// Named `index.ts` so `npm run registry:generate` discovers this package,
// matching every other released module's own convention.
//
// No author-provided `superRefine` cross-field input-schema rule is
// needed here: every input this module declares is either unconditionally
// required at the port level (see ./manifest.ts) or unconditionally
// optional with a registry-level constant default (process_force -> 0 N),
// the same precedent both prior sizing modules already established.

import { sealModulePackage, ModuleInputSchema, type ModulePackage } from "@/lib/engine";
import { manifest, ports } from "./manifest";
import { compute } from "./compute";
import { uiSchema } from "./ui";
import { reportSchema } from "./report";
import { validation } from "./validation";

export const dualRodCylinderSizingModule: ModulePackage = sealModulePackage({
  manifest,
  ports,
  inputSchema: ModuleInputSchema,
  compute,
  uiSchema,
  reportSchema,
  validation,
  catalogAdapter: {
    componentType: "pneumatic_cylinder_dual_rod",
    requiredSpec: (computation) => ({
      required_extend_force: computation.outputs.required_extend_force,
      required_retract_force: computation.outputs.required_retract_force,
      kinetic_energy: computation.outputs.kinetic_energy,
      required_stroke: computation.outputs.required_stroke_out,
      overhang_length: computation.outputs.overhang_length_out,
      mounting_orientation: computation.outputs.mounting_orientation_out,
      operating_pressure: computation.outputs.operating_pressure_out,
      load_factor: computation.outputs.load_factor_out,
      max_piston_speed: computation.outputs.max_piston_speed_out,
      cushion_type: computation.outputs.cushion_type_out,
    }),
  },
});

export default dualRodCylinderSizingModule;
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/modules/dual-rod-cylinder-sizing/0.1.0/validation.ts lib/modules/dual-rod-cylinder-sizing/0.1.0/index.ts
git commit -m "feat: dual-rod-cylinder-sizing draft validation record and package assembly"
```

### Task 17: Write `package.test.ts` (module conformance + boundary/invalid-input + output tests)

**Files:**
- Create: `lib/modules/dual-rod-cylinder-sizing/0.1.0/package.test.ts`

This test file needs a real `expectedSourceHash`, computed by running
`npm run module:source-hash` — that command cannot be run until every
other Stage-3 file exists (it hashes the whole directory), so this task
comes last in Stage 3, after Tasks 5-16.

- [ ] **Step 1: Compute the source-immutability hash**

Run: `npm run module:source-hash -- dual-rod-cylinder-sizing 0.1.0`
Expected: prints an `expectedSourceHash` value (a short hex string, e.g.
`f3b829c92ae603a7`-shaped). Record the exact printed value — it is
unpredictable ahead of time and must come from this command's own output,
never guessed or copied from another module.

- [ ] **Step 2: Write the test file**

Write this content, substituting `<PRINTED_HASH>` with the exact value
Step 1 printed:

```ts
import { describe, expect, it } from "vitest";
import {
  executeModule,
  makeQuantity,
  runModuleConformance,
} from "@/lib/engine";
import { readModuleSources } from "../../test-support";
import { dualRodCylinderSizingModule } from "./index";
import {
  asQuantity,
  cushionTypeValue,
  mountingOrientationValue,
  type RawInput,
} from "./test-helpers";

function deg(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * A minimal, valid scenario exercising every port. Round engineering
 * numbers, hand-checked before writing this fixture: a 15 kg load on a
 * 20 degree incline, mu = 0.1, no process force, 400 mm required stroke,
 * horizontal mounting, 30 mm overhang -- every output is straightforward
 * to hand-verify.
 */
function baselineInput(): RawInput {
  return {
    values: {
      incline_angle: makeQuantity(deg(20), "rad"),
      friction_coefficient: makeQuantity(0.1, "ratio"),
      load_mass: makeQuantity(15, "kg"),
      process_force: makeQuantity(0, "N"),
      operating_pressure: makeQuantity(0.5, "MPa"),
      load_factor: makeQuantity(0.7, "ratio"),
      max_piston_speed: makeQuantity(0.3, "m/s"),
      cushion_type: cushionTypeValue("rubber_bumper"),
      required_stroke: makeQuantity(400, "mm"),
      overhang_length: makeQuantity(30, "mm"),
      mounting_orientation: mountingOrientationValue("horizontal"),
    },
  };
}

const EXPECTED_SOURCE_HASH = "<PRINTED_HASH>";

describe("dual-rod-cylinder-sizing 0.1.0 module conformance", () => {
  const report = runModuleConformance(dualRodCylinderSizingModule, {
    sampleInputs: [baselineInput()],
    sources: readModuleSources(import.meta.dirname),
    expectedSourceHash: EXPECTED_SOURCE_HASH,
  });

  for (const check of report.checks) {
    it(`${check.id} (${check.status})`, () => {
      expect(check.status, check.detail).toBe("pass");
    });
  }

  it("runs the import-boundary check and it passes (not skipped)", () => {
    const check = report.checks.find((c) => c.id === "import-boundary");
    expect(check).toBeDefined();
    expect(check?.status, check?.detail).toBe("pass");
  });

  it("runs the source-immutability check and it passes (not skipped)", () => {
    const check = report.checks.find((c) => c.id === "source-immutability");
    expect(check).toBeDefined();
    expect(check?.status, check?.detail).toBe("pass");
  });

  it("runs the catalog-adapter check and it passes", () => {
    const check = report.checks.find((c) => c.id === "catalog-adapter");
    expect(check).toBeDefined();
    expect(check?.status, check?.detail).toBe("pass");
  });
});

describe("dual-rod-cylinder-sizing 0.1.0 boundary and invalid input", () => {
  it("requires the full set of load/pressure/speed/stroke/overhang/orientation inputs", () => {
    const input = baselineInput();
    delete input.values.load_mass;
    expect(() => executeModule(dualRodCylinderSizingModule, input)).toThrow();
  });

  it("requires overhang_length", () => {
    const input = baselineInput();
    delete input.values.overhang_length;
    expect(() => executeModule(dualRodCylinderSizingModule, input)).toThrow();
  });

  it("requires mounting_orientation", () => {
    const input = baselineInput();
    delete input.values.mounting_orientation;
    expect(() => executeModule(dualRodCylinderSizingModule, input)).toThrow();
  });

  it("defaults an absent process_force to 0 N", () => {
    const input = baselineInput();
    delete input.values.process_force;
    const withoutProcessForce = executeModule(dualRodCylinderSizingModule, input);
    const withZeroProcessForce = executeModule(dualRodCylinderSizingModule, baselineInput());
    expect(
      asQuantity(withoutProcessForce.outputs.required_extend_force).value,
    ).toBeCloseTo(
      asQuantity(withZeroProcessForce.outputs.required_extend_force).value,
      9,
    );
  });

  it("rejects an incline angle above 90 degrees via the registry's own declared range", () => {
    const input = baselineInput();
    input.values.incline_angle = makeQuantity(deg(120), "rad");
    expect(() => executeModule(dualRodCylinderSizingModule, input)).toThrow();
  });

  it("rejects an unknown mounting orientation", () => {
    const input = baselineInput();
    input.values.mounting_orientation = mountingOrientationValue("inclined");
    expect(() => executeModule(dualRodCylinderSizingModule, input)).toThrow();
  });

  it("rejects a negative overhang length via the registry's own declared range", () => {
    const input = baselineInput();
    input.values.overhang_length = makeQuantity(-10, "mm");
    expect(() => executeModule(dualRodCylinderSizingModule, input)).toThrow();
  });
});

describe("dual-rod-cylinder-sizing 0.1.0 outputs", () => {
  it("produces dimensionally correct output units", () => {
    const computation = executeModule(dualRodCylinderSizingModule, baselineInput());
    expect(computation.outputs.required_extend_force).toMatchObject({ unit: "N" });
    expect(computation.outputs.required_retract_force).toMatchObject({ unit: "N" });
    expect(computation.outputs.kinetic_energy).toMatchObject({ unit: "J" });
    expect(computation.outputs.overhang_length_out).toMatchObject({ unit: "mm" });
  });

  it("computes required_extend_force as process_force + m*g*sin(theta) + m*g*mu*cos(theta)", () => {
    const computation = executeModule(dualRodCylinderSizingModule, baselineInput());
    const g = 9.80665;
    const thetaRad = (20 * Math.PI) / 180;
    const expected = 15 * g * Math.sin(thetaRad) + 15 * g * 0.1 * Math.cos(thetaRad);
    expect(asQuantity(computation.outputs.required_extend_force).value).toBeCloseTo(expected, 3);
  });

  it("computes required_retract_force as m*g*mu*cos(theta) - m*g*sin(theta)", () => {
    const computation = executeModule(dualRodCylinderSizingModule, baselineInput());
    const g = 9.80665;
    const thetaRad = (20 * Math.PI) / 180;
    const expected = 15 * g * 0.1 * Math.cos(thetaRad) - 15 * g * Math.sin(thetaRad);
    expect(asQuantity(computation.outputs.required_retract_force).value).toBeCloseTo(expected, 3);
  });

  it("produces a negative required_retract_force on a steep enough incline with low friction", () => {
    const input = baselineInput();
    input.values.incline_angle = makeQuantity(deg(80), "rad");
    input.values.friction_coefficient = makeQuantity(0.05, "ratio");
    const computation = executeModule(dualRodCylinderSizingModule, input);
    expect(asQuantity(computation.outputs.required_retract_force).value).toBeLessThan(0);
  });

  it("applies process_force only to required_extend_force, not required_retract_force", () => {
    const input = baselineInput();
    input.values.process_force = makeQuantity(200, "N");
    const withForce = executeModule(dualRodCylinderSizingModule, input);
    const without = executeModule(dualRodCylinderSizingModule, baselineInput());
    expect(
      asQuantity(withForce.outputs.required_extend_force).value -
        asQuantity(without.outputs.required_extend_force).value,
    ).toBeCloseTo(200, 6);
    expect(
      asQuantity(withForce.outputs.required_retract_force).value,
    ).toBeCloseTo(asQuantity(without.outputs.required_retract_force).value, 6);
  });

  it("echoes required_stroke, overhang_length, mounting_orientation, operating_pressure, load_factor, max_piston_speed, and cushion_type as outputs", () => {
    const computation = executeModule(dualRodCylinderSizingModule, baselineInput());
    expect(asQuantity(computation.outputs.required_stroke_out).value).toBe(400);
    expect(asQuantity(computation.outputs.overhang_length_out).value).toBe(30);
    expect(computation.outputs.mounting_orientation_out).toMatchObject({ value: "horizontal" });
    expect(asQuantity(computation.outputs.operating_pressure_out).value).toBe(0.5);
    expect(asQuantity(computation.outputs.load_factor_out).value).toBe(0.7);
    expect(asQuantity(computation.outputs.max_piston_speed_out).value).toBe(0.3);
    expect(computation.outputs.cushion_type_out).toMatchObject({ value: "rubber_bumper" });
  });
});
```

- [ ] **Step 3: Run the full module test suite**

Run: `npx vitest run lib/modules/dual-rod-cylinder-sizing --no-coverage`
Expected: all pass (across `math.test.ts`, `load-mass-curves.test.ts`,
`package.test.ts`).

- [ ] **Step 4: Run typecheck, lint, and the full non-DB suite**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: all clean/pass.

- [ ] **Step 5: Commit**

```bash
git add lib/modules/dual-rod-cylinder-sizing/0.1.0/package.test.ts
git commit -m "test: dual-rod-cylinder-sizing module conformance and boundary tests"
```

This closes Stage 3. The module is built and tested but not yet
registered (Stage 6) and not yet reviewed (Stage 4).

---

## Stage 4 — Validation

### Task 18: Register the CXS2 source revision

**Files:**
- Modify: `lib/standards/engineering-sources.ts`

- [ ] **Step 1: Check whether the source is already registered**

Run: `grep -n "cxs2" lib/standards/engineering-sources.ts`
Expected: no matches (this source has not been registered by any prior
module).

- [ ] **Step 2: Find the registration pattern for a prior SMC catalog source**

Open `lib/standards/engineering-sources.ts` and find the entry for
`jp.smc.mgq_series_catalog@web-2026-08-26` or
`jp.smc.cm2_ca2_catalog@web-2026-08-24` (both registered by the two
sibling modules) to copy the exact object shape.

- [ ] **Step 3: Add the new source revision**

Add an entry following that same shape:

```ts
{
  id: asSourceRevisionId("jp.smc.cxs2_series_catalog@web-2026-08-26"),
  sourceId: "jp.smc.cxs2_series_catalog",
  title: "CXS2 Series Compact Guide Cylinder (Dual Rod) -- Model Selection",
  publisher: "SMC Corporation",
  market: "JP",
  accessedAt: "2026-08-26",
  accessMethod: "web",
  url: "https://content2.smcetech.com/pdf/ES20-275-CXS2.pdf",
  license: "manufacturer-published, publicly accessible technical data",
  notes:
    "CXS2 (CXS2L ball-bushing / CXS2M slide-bearing) series only -- the older CXSJ/CXS/CXSW dual-rod sub-families are out of scope for dual-rod-cylinder-sizing@0.1.0. Theoretical Output table (p.12) confirmed numerically identical to the older CXSJ catalog's own table. The 'Model Selection' load-mass-vs-overhang-length graphs (21 charts) were not machine-readable by this session's own PDF-to-image tooling; the digitized dataset (lib/modules/dual-rod-cylinder-sizing/0.1.0/load-mass-curves.ts) was read directly off founder-supplied high-resolution graph screenshots instead -- see context/modules/dual-rod-cylinder-sizing/stage-1-spec.md.",
},
```

Match the exact field names the existing `SourceRevision`-shaped entries
in this file use — the object above may need field renames to match this
project's own current interface; use the sibling entry found in Step 2 as
the authoritative shape, not this plan's own literal field names, if they
differ.

- [ ] **Step 4: Run the source registry test**

Run: `npx vitest run lib/standards --no-coverage`
Expected: all pass (confirms the new entry's shape is valid and every
`sourceRevisionIds` reference in the module's own `manifest.ts`/
`validation.ts` resolves).

- [ ] **Step 5: Commit**

```bash
git add lib/standards/engineering-sources.ts
git commit -m "feat: register SMC CXS2 series catalog source revision"
```

### Task 19: Write the SMC CXS2 reference example

**Files:**
- Create: `lib/modules/dual-rod-cylinder-sizing/0.1.0/smc-reference-example.ts`
- Create: `lib/modules/dual-rod-cylinder-sizing/0.1.0/smc-reference-example.test.ts`

Pick a real CXS2 candidate and scenario where every checkable requirement
clears with a real, visible margin — not a coincidence, the same
"deliberately not a trivially large margin" precedent
`guided-cylinder-sizing@0.1.0`'s own MGQM40 example set. Use a **CXS2M20**
(20 mm bore, slide bearing) horizontal-mounting scenario, since
`DUAL_ROD_LOAD_MASS_CURVES` seeds a real horizontal bore-20 row (graph 14,
≤10 mm stroke, ≤400 mm/s: plateau 1.0 kg @ L≤4mm, 0.07 kg @ L=100mm).

- [ ] **Step 1: Confirm CXS2M20's own rod diameter and theoretical force**

Before writing the fixture, resolve the CXS2M20's own rod diameter from
`ES20-275-CXS2.pdf`'s own dimension table (bore 20 mm pairs with a 10 mm
rod on the CXS2 series, per the same ISO 6431-style bore/rod pairing
`pneumatic-cylinder-sizing@0.1.0`'s own Task 13 already confirmed for
CM2/CA2's bore-20 row) and record it in the reference-example file's own
top comment, citing where it was confirmed. Do not guess a rod diameter —
if the CXS2 catalog text extraction does not clearly resolve it, use
`Read` on the previously fetched/extracted CXS2 text (or refetch via the
`content2.smcetech.com` mirror + `pdftotext`, matching this module's own
Stage 1 research method) before writing the fixture.

- [ ] **Step 2: Write `smc-reference-example.ts`**

Write this content, substituting `<ROD_DIAMETER_MM>` with the value
confirmed in Step 1:

```ts
// Reference-example reproduction (Stage 4) for the dual-rod-cylinder-sizing
// module. Reproduces a real SMC CXS2M20 (20 mm bore, slide bearing)
// scenario: a load resolved by this module's own compute path, checked
// against the CXS2M20's own theoretical force and the seeded horizontal
// bore-20, <=10mm-stroke, <=400mm/s load-mass-vs-overhang-length band
// (graph 14 in the digitized dataset: plateau 1.0 kg @ L<=4mm, 0.07 kg @
// L=100mm).

import { executeModule, makeQuantity } from "@/lib/engine";
import { dualRodCylinderSizingModule } from "./index";
import { DUAL_ROD_LOAD_MASS_CURVES } from "./load-mass-curves";
import {
  resolveAllowableLoadMass,
  resolvePistonAreas,
  resolveTheoreticalForce,
} from "./math";
import { asQuantity, cushionTypeValue, mountingOrientationValue } from "./test-helpers";

/** CXS2M20 (20 mm bore, slide bearing). Rod diameter confirmed against ES20-275-CXS2.pdf's own dimension table. */
export const CXS2M20_BORE_MM = 20;
export const CXS2M20_ROD_MM = <ROD_DIAMETER_MM>;
export const CXS2M20_REQUIRED_STROKE_MM = 8;
export const CXS2M20_OVERHANG_MM = 4;

export function runCxs2m20Example() {
  const computation = executeModule(dualRodCylinderSizingModule, {
    values: {
      incline_angle: makeQuantity(0, "rad"),
      friction_coefficient: makeQuantity(0.1, "ratio"),
      load_mass: makeQuantity(0.5, "kg"),
      process_force: makeQuantity(0, "N"),
      operating_pressure: makeQuantity(0.5, "MPa"),
      load_factor: makeQuantity(0.7, "ratio"),
      max_piston_speed: makeQuantity(0.3, "m/s"),
      cushion_type: cushionTypeValue("none"),
      required_stroke: makeQuantity(CXS2M20_REQUIRED_STROKE_MM, "mm"),
      overhang_length: makeQuantity(CXS2M20_OVERHANG_MM, "mm"),
      mounting_orientation: mountingOrientationValue("horizontal"),
    },
  });

  const requiredExtendForceN = asQuantity(computation.outputs.required_extend_force).value;

  const { extendAreaMm2 } = resolvePistonAreas({
    boreDiameterMm: CXS2M20_BORE_MM,
    rodDiameterMm: CXS2M20_ROD_MM,
  });
  const { forceN: theoreticalExtendForceN } = resolveTheoreticalForce({
    areaMm2: extendAreaMm2,
    pressureMPa: 0.5,
    loadFactor: 0.7,
  });

  const loadMassCheck = resolveAllowableLoadMass({
    mountingOrientation: "horizontal",
    boreDiameterMm: CXS2M20_BORE_MM,
    bearingType: "slide",
    maxPistonSpeedMps: 0.3,
    requiredStrokeMm: CXS2M20_REQUIRED_STROKE_MM,
    overhangLengthMm: CXS2M20_OVERHANG_MM,
    curves: DUAL_ROD_LOAD_MASS_CURVES,
  });

  return {
    requiredExtendForceN,
    theoreticalExtendForceN,
    loadMassCheck,
    loadMassKg: 0.5,
  };
}
```

- [ ] **Step 3: Write `smc-reference-example.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { runCxs2m20Example } from "./smc-reference-example";

describe("SMC CXS2M20 (20 mm bore, slide bearing) reached via this module's own compute path", () => {
  it("reproduces a 0.49 N required extend force from a 0.5 kg horizontal, frictional load", () => {
    const { requiredExtendForceN } = runCxs2m20Example();
    // F = m*g*mu*cos(0) = 0.5 * 9.80665 * 0.1 = 0.4903 N (horizontal, zero incline, zero process force).
    expect(requiredExtendForceN).toBeCloseTo(0.4903, 3);
  });

  it("confirms the CXS2M20 candidate's own theoretical force clears the requirement", () => {
    const { requiredExtendForceN, theoreticalExtendForceN } = runCxs2m20Example();
    expect(theoreticalExtendForceN).toBeGreaterThanOrEqual(requiredExtendForceN);
  });

  it("confirms the load-mass-vs-overhang-length check clears the requirement at the seeded plateau", () => {
    const { loadMassCheck, loadMassKg } = runCxs2m20Example();
    expect(loadMassCheck.inEnvelope).toBe(true);
    if (loadMassCheck.inEnvelope) {
      // At overhang = 4mm (<= the plateau threshold of 4mm), the allowable
      // load mass is the flat 1.0 kg plateau value -- a real, visible
      // margin over this scenario's own 0.5 kg load, not a coincidence.
      expect(loadMassCheck.allowableLoadMassKg).toBeCloseTo(1.0, 6);
      expect(loadMassCheck.allowableLoadMassKg).toBeGreaterThan(loadMassKg);
    }
  });

  it("selects the correct seeded band (horizontal, <=10mm stroke, <=400mm/s, bore 20)", () => {
    const { loadMassCheck } = runCxs2m20Example();
    expect(loadMassCheck.inEnvelope).toBe(true);
    if (loadMassCheck.inEnvelope) {
      expect(loadMassCheck.matchedCurve.strokeBandMaxMm).toBe(10);
      expect(loadMassCheck.matchedCurve.speedBandMaxMps).toBe(0.4);
      expect(loadMassCheck.matchedCurve.boreDiameterMm).toBe(20);
    }
  });
});
```

- [ ] **Step 4: Run the reference-example test**

Run: `npx vitest run lib/modules/dual-rod-cylinder-sizing/0.1.0/smc-reference-example.test.ts --no-coverage`
Expected: all pass. If the required-force or theoretical-force
expectation does not match, double check `CXS2M20_ROD_MM` against the
real catalog value from Task 19 Step 1 before adjusting the test's own
expected numbers.

- [ ] **Step 5: Commit**

```bash
git add lib/modules/dual-rod-cylinder-sizing/0.1.0/smc-reference-example.ts lib/modules/dual-rod-cylinder-sizing/0.1.0/smc-reference-example.test.ts
git commit -m "test: dual-rod-cylinder-sizing SMC CXS2M20 reference example"
```

### Task 20: Finalize `validation.ts` (Stage 4 sign-off)

**Files:**
- Modify: `lib/modules/dual-rod-cylinder-sizing/0.1.0/validation.ts`

- [ ] **Step 1: Replace the draft record with the finalized one**

Replace the whole file content with:

```ts
// Validation record for the dual-rod-cylinder-sizing module (roadmap
// module definition of done, item 10). Stage 4: reference-example
// reproduction (smc-reference-example.ts/.test.ts) and reviewer/reviewDate
// finalized.

import type { ValidationRecord } from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const validation: ValidationRecord = {
  moduleId: "dual-rod-cylinder-sizing",
  moduleVersion: "0.1.0",
  methods: [
    "Required-force resolution: general Newtonian statics (mass, standard gravity, incline, Coulomb friction), reproducing pneumatic-cylinder-sizing@0.1.0's own forward/return sign convention -- not a manufacturer-specific formula.",
    "SMC Corporation theoretical force method (F = eta * A * P), reproduced from pneumatic-cylinder-sizing@0.1.0 -- confirmed directly against CXS2's own Theoretical Output table (numerically identical to the older CXSJ catalog's own table, stage-1-spec.md 'A marketing claim... found not to hold').",
    "SMC Corporation cushion kinetic-energy method (E = (m/2) * V^2), reused directly from pneumatic-cylinder-sizing@0.1.0 -- reported only in this module, not checked against a candidate (CXS2's own catalog gives no per-model allowable-kinetic-energy table this module has digitized).",
    "Load mass vs. overhang length (new): log-log interpolation between SMC's own digitized 'Model Selection' graph points, keyed by mounting orientation, speed band, and (horizontal only) stroke band. Not a closed-form manufacturer formula -- SMC publishes this relationship only as graphs.",
  ],
  sourceRevisionIds: [
    asSourceRevisionId("jp.smc.cxs2_series_catalog@web-2026-08-26"),
    asSourceRevisionId(
      "jp.smc.air_cylinders_model_selection@web-2026-08-24",
    ),
    asSourceRevisionId(
      "us.milwaukee_cylinder.design_engineering_guide@web-2026-08-24",
    ),
    asSourceRevisionId("us.norgren.m1000_heavy_duty_cylinders@web-2026-08-24"),
  ],
  referenceExamples: [
    {
      id: "smc-cxs2m20-horizontal",
      description:
        "SMC CXS2M20 (20 mm bore, slide bearing), horizontal mounting, 8 mm required stroke, 4 mm overhang -- directly read from SMC's own fetched CXS2 series catalog and the founder-supplied Model Selection graph images (context/modules/dual-rod-cylinder-sizing/stage-1-spec.md). Reached through this module's own compute path: a 0.5 kg horizontal load with friction coefficient 0.1, zero incline, zero process force (./smc-reference-example.ts) reproduces a 0.4903 N required extend force. The CXS2M20 candidate clears every checkable requirement: theoretical extend force (via this module's own reproduced resolvePistonAreas/resolveTheoreticalForce) vastly exceeds the required 0.4903 N; and the seeded horizontal/<=10mm-stroke/<=400mm-per-s/bore-20 load-mass-vs-overhang band (graph 14: 1.0 kg plateau at overhang <= 4mm) exceeds the scenario's own 0.5 kg load with a real, visible margin, not a coincidence.",
      tolerance:
        "quantitative: required extend force to within 1e-3 N of hand-calculated m*g*mu*cos(0deg); qualitative: theoretical force and the load-mass-vs-overhang-length check each individually clear the requirement, matching the real CXS2M20 catalog candidate.",
    },
  ],
  independentBenchmark:
    "The theoretical-force formula is reused/reproduced unchanged from pneumatic-cylinder-sizing@0.1.0, which already has a completed independent-benchmark substitute (citing pneumatic-cylinder@0.1.0's own Norgren M/1000 benchmark) for the theoretical-force formula area -- confirmed byte-for-byte identical by this module's own math.test.ts against pneumatic-cylinder-sizing@0.1.0's own math.test.ts fixtures. That prior work is cited by reference, not re-run, since the formula body is unchanged. Cushion kinetic energy is computed with the same reused formula but is reported only in this module (no candidate check exists to benchmark). The new load-mass-vs-overhang-length interpolation has NO independent source of any kind -- neither a second manufacturer's own equivalent graph nor an established general engineering method exists for this exact twin-guide-rod-plate structural relationship. This is a real, disclosed 0.1.0 evidence gap, not resolved by this validation pass -- verified instead by data-integrity property tests (load-mass-curves.test.ts: monotonic non-increasing load mass vs. overhang, no duplicate band keys) and by math.test.ts's own interpolation-correctness tests against hand-computed geometric-mean values, the same 'property tests substitute where no manufacturer benchmark exists' treatment this project's other genuinely-new-physics formulas (e.g. guided-cylinder-sizing@0.1.0's own required-moment resolution) already received.",
  reviewer:
    "Solo validation -- cites pneumatic-cylinder-sizing@0.1.0's own Norgren M/1000 independent-benchmark substitute (via pneumatic-cylinder@0.1.0) for the reused force formula area; the new load-mass-vs-overhang-length interpolation has no independent benchmark of any kind (a disclosed 0.1.0 limitation, not a sourced or property-verified-only substitute claim) -- verified only by data-integrity and interpolation-correctness property tests, not a manufacturer benchmark.",
  reviewDate: "2026-08-26",
  supportedUseLimits: [
    "Computes a required specification for catalog matching; does not check one already-selected cylinder.",
    "No load case (normal/peak/etc.) semantics; every input is a single engineer-supplied value per run.",
    "Process force is applied on the extend stroke only.",
    "No buckling check -- SMC's own CXS2 catalog gives no buckling formula; the load-mass-vs-overhang-length rating is this mechanism's own governing structural check instead.",
    "Cushion kinetic energy is reported only, not checked against a candidate -- CXS2's own catalog gives no per-model allowable-kinetic-energy table.",
    "The load-mass-vs-overhang-length check has no independent benchmark of any kind -- a real, disclosed 0.1.0 evidence gap, unlike every other formula area in this module.",
    "The digitized load-mass-vs-overhang dataset is read by eye off founder-supplied graph images to 2 significant figures -- founder review against the source graphs is expected before catalog seeding, and is a real, disclosed accuracy ceiling distinct from a printed-table transcription.",
    "The check reports out-of-envelope, never extrapolating, when the query falls outside every seeded band.",
  ],
  deviations: [
    "Reproduces every disclosed evidence gap pneumatic-cylinder-sizing@0.1.0 already carries for the force formula area (see that module's own validation.ts) -- not silently resolved here.",
    "The band-selection logic (rounding a real stroke/speed up to the nearest seeded band) is a new, undisclosed-by-SMC engineering judgment call unique to this module (stage-2-contract.md Decision 6).",
    "The load-mass-vs-overhang-length formula area has no independent benchmark of any kind (unlike every other Stage-4-closed formula area in this project's pneumatic modules) -- a real, disclosed gap carried into release, not glossed over.",
  ],
};
```

- [ ] **Step 2: Run typecheck and the module test suite**

Run: `npx tsc --noEmit && npx vitest run lib/modules/dual-rod-cylinder-sizing --no-coverage`
Expected: no errors, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/modules/dual-rod-cylinder-sizing/0.1.0/validation.ts
git commit -m "docs: finalize dual-rod-cylinder-sizing Stage 4 validation record"
```

---

## Stage 5 — Generic surfaces and catalog integration

### Task 21: Write `lib/application/catalogs/dual-rod-cylinder-matching.ts`

**Files:**
- Create: `lib/application/catalogs/dual-rod-cylinder-matching.ts`

Hybrid matcher mirroring `guided-cylinder-matching.ts`'s own shape: the
generic `MatchCriterion` engine handles stroke range (a true
single-attribute comparison); a custom per-candidate evaluator handles
theoretical force (bore/rod-dependent) and the load-mass-vs-overhang-length
lookup (bore/bearing-type-dependent, via `resolveAllowableLoadMass`). No
buckling evaluation — this module has none.

- [ ] **Step 1: Write the file**

```ts
// Hybrid catalog matcher for dual-rod-cylinder-sizing candidates
// (Unit 7.4). Combines the generic MatchCriterion/rankCandidates engine
// (lib/catalog) for a true single-attribute comparison (stroke range)
// with a custom per-candidate evaluator for theoretical force and the
// load-mass-vs-overhang-length structural check, which need a real
// formula/interpolation (or a seeded catalog attribute) over that SAME
// candidate's own bore/rod diameter/bearing type plus this run's own
// pressure/load-factor/overhang/orientation -- the same architecture
// finding pneumatic-cylinder-matching.ts and guided-cylinder-matching.ts
// already established. Neither lib/catalog's generic engine nor the
// CatalogAdapter SDK contract (lib/engine/module-sdk/types.ts) is changed
// by this file.
//
// No buckling evaluation: this module has no buckling check
// (context/modules/dual-rod-cylinder-sizing/stage-1-spec.md "No buckling
// check for this family").
//
// The load-mass-vs-overhang-length check is evaluated for every candidate
// (unlike guided-cylinder-matching.ts's own allowable-lateral-load check,
// which is skipped for MGP candidates with no seeded value) -- every
// CXS2 catalog row seeded in this module's own reference/catalog-seed/
// smc-cxs2.csv carries a bearing_type attribute the digitized dataset can
// always be looked up by (Task 22). A candidate whose bearing_type does
// not match "slide"/"ball_bushing" (a real seed-data problem, not a
// missing-attribute-is-fine case) is rejected as a data problem, not
// skipped.

import "server-only";
import {
  describeRequiredSpec,
  rankCandidates,
  type CandidatePart,
  type ComponentAttributes,
  type MatchCriterion,
  type RequiredSpecEntry,
} from "@/lib/catalog";
import {
  type ModuleComputation,
  type Quantity,
} from "@/lib/engine";
import {
  DualRodCylinderSizingInputError,
  resolveAllowableLoadMass,
  resolvePistonAreas,
  resolveTheoreticalForce,
  type DualRodBearingType,
  type DualRodMountingOrientation,
} from "@/lib/modules/dual-rod-cylinder-sizing/0.1.0/math";
import { DUAL_ROD_LOAD_MASS_CURVES } from "@/lib/modules/dual-rod-cylinder-sizing/0.1.0/load-mass-curves";

export interface DualRodCylinderMatchCandidate extends CandidatePart {
  readonly attributes: ComponentAttributes;
}

export interface DualRodCylinderRankedCandidate {
  readonly candidate: DualRodCylinderMatchCandidate;
  readonly score: number;
  readonly reasons: readonly string[];
}

export interface DualRodCylinderRejectedCandidate {
  readonly candidate: DualRodCylinderMatchCandidate;
  readonly reasons: readonly string[];
}

export interface DualRodCylinderMatchOutcome {
  readonly requiredSpec: readonly RequiredSpecEntry[];
  readonly accepted: readonly DualRodCylinderRankedCandidate[];
  readonly rejected: readonly DualRodCylinderRejectedCandidate[];
}

function quantityOutput(
  outputs: ModuleComputation["outputs"],
  key: string,
): Quantity {
  const value = outputs[key];
  if (value === undefined || value.kind !== "quantity") {
    throw new Error(
      `dual-rod-cylinder-sizing computation is missing a quantity output "${key}".`,
    );
  }
  return value;
}

function enumOutput(outputs: ModuleComputation["outputs"], key: string): string {
  const value = outputs[key];
  if (value === undefined || value.kind !== "enum") {
    throw new Error(
      `dual-rod-cylinder-sizing computation is missing an enum output "${key}".`,
    );
  }
  return value.value;
}

function quantityAttribute(
  attributes: ComponentAttributes,
  key: string,
): number | undefined {
  const value = attributes[key];
  return value?.kind === "quantity" ? value.value : undefined;
}

function enumAttribute(
  attributes: ComponentAttributes,
  key: string,
): string | undefined {
  const value = attributes[key];
  return value?.kind === "enum" ? value.value : undefined;
}

/**
 * Builds the generic-engine criteria (stroke range) and runs the custom
 * force/load-mass-vs-overhang evaluation for every candidate, then
 * combines both into one accepted/rejected result. A candidate must pass
 * every generic criterion AND every custom check to be accepted.
 */
export function evaluateDualRodCylinderCandidates(
  computation: ModuleComputation,
  candidates: readonly DualRodCylinderMatchCandidate[],
): DualRodCylinderMatchOutcome {
  const outputs = computation.outputs;

  const requiredExtendForceN = Math.max(
    0,
    quantityOutput(outputs, "required_extend_force").value,
  );
  const requiredRetractForceN = Math.max(
    0,
    quantityOutput(outputs, "required_retract_force").value,
  );
  const requiredStroke = quantityOutput(outputs, "required_stroke_out");
  const overhangLengthMm = quantityOutput(outputs, "overhang_length_out").value;
  const mountingOrientation = enumOutput(
    outputs,
    "mounting_orientation_out",
  ) as DualRodMountingOrientation;
  const operatingPressureMPa = quantityOutput(outputs, "operating_pressure_out").value;
  const loadFactor = quantityOutput(outputs, "load_factor_out").value;
  const maxPistonSpeedMps = quantityOutput(outputs, "max_piston_speed_out").value;

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
  ];

  const generic = rankCandidates(criteria, candidates);
  const genericScoreById = new Map(
    generic.accepted.map((ranked) => [ranked.candidate.id, ranked.score]),
  );
  const genericReasonsById = new Map(
    [...generic.accepted, ...generic.rejected].map((evaluation) => [
      evaluation.candidate.id,
      evaluation.criteria.map((c) => c.message),
    ]),
  );

  const accepted: DualRodCylinderRankedCandidate[] = [];
  const rejected: DualRodCylinderRejectedCandidate[] = [];

  for (const candidate of candidates) {
    const genericScore = genericScoreById.get(candidate.id);
    const genericPassed = genericScore !== undefined;
    const genericReasons = genericReasonsById.get(candidate.id) ?? [];

    const boreDiameterMm = quantityAttribute(candidate.attributes, "bore_diameter");
    const rodDiameterMm = quantityAttribute(candidate.attributes, "rod_diameter");
    const bearingType = enumAttribute(candidate.attributes, "bearing_type") as
      | DualRodBearingType
      | undefined;

    if (boreDiameterMm === undefined || rodDiameterMm === undefined || bearingType === undefined) {
      rejected.push({
        candidate,
        reasons: [
          ...genericReasons,
          "\"Bore/rod diameter or bearing type\" is not present on this part -- force capacity and the load-mass-vs-overhang-length check cannot be evaluated.",
        ],
      });
      continue;
    }

    let customReasons: string[] = [];
    let customPassed = true;
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
      customReasons.push(
        extendOk
          ? `"Theoretical extend force" ${theoreticalExtendForceN.toFixed(1)} N meets the required minimum ${requiredExtendForceN.toFixed(1)} N`
          : `"Theoretical extend force" ${theoreticalExtendForceN.toFixed(1)} N is below the required minimum ${requiredExtendForceN.toFixed(1)} N`,
      );
      customReasons.push(
        retractOk
          ? `"Theoretical retract force" ${theoreticalRetractForceN.toFixed(1)} N meets the required minimum ${requiredRetractForceN.toFixed(1)} N`
          : `"Theoretical retract force" ${theoreticalRetractForceN.toFixed(1)} N is below the required minimum ${requiredRetractForceN.toFixed(1)} N`,
      );
      customPassed = customPassed && extendOk && retractOk;
      const extendMargin =
        requiredExtendForceN > 0
          ? (theoreticalExtendForceN - requiredExtendForceN) / requiredExtendForceN
          : 0;
      const retractMargin =
        requiredRetractForceN > 0
          ? (theoreticalRetractForceN - requiredRetractForceN) / requiredRetractForceN
          : 0;
      forceMarginFraction += extendMargin + retractMargin;
    } catch (err) {
      if (!(err instanceof DualRodCylinderSizingInputError)) throw err;
      customPassed = false;
      customReasons = [err.message];
    }

    const loadMassResult = resolveAllowableLoadMass({
      mountingOrientation,
      boreDiameterMm,
      bearingType,
      maxPistonSpeedMps,
      requiredStrokeMm: requiredStroke.value,
      overhangLengthMm,
      curves: DUAL_ROD_LOAD_MASS_CURVES,
    });
    if (!loadMassResult.inEnvelope) {
      customPassed = false;
      customReasons.push(
        `"Load mass vs. overhang length" cannot be evaluated: ${loadMassResult.reason}`,
      );
    } else {
      // The scenario's own real load mass, not the (possibly floored)
      // required force -- the check compares against the actual moved
      // mass, matching SMC's own graph axis directly.
      const loadMassKg = quantityOutput(computation.outputs, "kinetic_energy").value > 0
        ? undefined
        : undefined;
      // kinetic_energy does not recover load mass uniquely (it also
      // depends on speed) -- load mass is read from the run's own
      // resolved input instead, echoed nowhere else on outputs. See
      // Task 21 Step 2 below for the required manifest/compute fix this
      // reveals.
      void loadMassKg;
      const loadMassOk = loadMassResult.allowableLoadMassKg >= 0; // placeholder, replaced in Step 2
      customReasons.push(
        loadMassOk
          ? `"Allowable load mass" ${loadMassResult.allowableLoadMassKg.toFixed(3)} kg at this overhang/band`
          : `"Allowable load mass" ${loadMassResult.allowableLoadMassKg.toFixed(3)} kg at this overhang/band`,
      );
    }

    const passed = genericPassed && customPassed;
    const reasons = [...genericReasons, ...customReasons];

    if (passed) {
      accepted.push({
        candidate,
        score: ((genericScore ?? 0) + forceMarginFraction / 2) / 2,
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
    {
      key: "load_mass_vs_overhang",
      label: "Load mass vs. overhang length (evaluated per candidate, not a flat filter)",
      operator: "gte",
      displayValue: `overhang ${overhangLengthMm.toFixed(1)} mm, ${mountingOrientation} mounting`,
    },
  ];

  return { requiredSpec, accepted, rejected };
}
```

**STOP before committing this file — Step 2 below fixes a real gap the
draft above deliberately leaves broken (the `loadMassOk` placeholder).**
The load-mass-vs-overhang check needs the run's own actual load mass
(`motion.axis.total_moving_mass`, an input port, currently not echoed on
`ModuleComputation.outputs` at all), not a value derivable from any
existing output. Do not skip Step 2 — the file as drafted above compiles
but always reports the check as passing regardless of the real load mass,
which is worse than not implementing it.

- [ ] **Step 2: Add a `load_mass_out` echoed output and use it for the real check**

Go back to three already-committed Stage 3 files and make one additive
change to each — echoing `load_mass` as an output, the same pattern every
other echoed input in this module already follows:

In `lib/modules/dual-rod-cylinder-sizing/0.1.0/manifest.ts`, add one new
output port (after the `cushion_type_out` entry):

```ts
    {
      key: "load_mass_out",
      parameterId: asParameterId("motion.axis.total_moving_mass"),
    },
```

In `lib/modules/dual-rod-cylinder-sizing/0.1.0/compute.ts`, add one new
line to the `outputs` object literal (after `cushion_type_out`):

```ts
    load_mass_out: loadMass,
```

In `lib/modules/dual-rod-cylinder-sizing/0.1.0/index.ts`, add one new
line to the `catalogAdapter.requiredSpec()` return object (after
`cushion_type`):

```ts
      load_mass: computation.outputs.load_mass_out,
```

Then fix `dual-rod-cylinder-matching.ts` itself: replace the placeholder
block in Step 1 above —

```ts
    if (!loadMassResult.inEnvelope) {
      customPassed = false;
      customReasons.push(
        `"Load mass vs. overhang length" cannot be evaluated: ${loadMassResult.reason}`,
      );
    } else {
      // The scenario's own real load mass, not the (possibly floored)
      // required force -- the check compares against the actual moved
      // mass, matching SMC's own graph axis directly.
      const loadMassKg = quantityOutput(computation.outputs, "kinetic_energy").value > 0
        ? undefined
        : undefined;
      // kinetic_energy does not recover load mass uniquely (it also
      // depends on speed) -- load mass is read from the run's own
      // resolved input instead, echoed nowhere else on outputs. See
      // Task 21 Step 2 below for the required manifest/compute fix this
      // reveals.
      void loadMassKg;
      const loadMassOk = loadMassResult.allowableLoadMassKg >= 0; // placeholder, replaced in Step 2
      customReasons.push(
        loadMassOk
          ? `"Allowable load mass" ${loadMassResult.allowableLoadMassKg.toFixed(3)} kg at this overhang/band`
          : `"Allowable load mass" ${loadMassResult.allowableLoadMassKg.toFixed(3)} kg at this overhang/band`,
      );
    }
```

— with the real check:

```ts
    if (!loadMassResult.inEnvelope) {
      customPassed = false;
      customReasons.push(
        `"Load mass vs. overhang length" cannot be evaluated: ${loadMassResult.reason}`,
      );
    } else {
      const loadMassOk = loadMassResult.allowableLoadMassKg >= loadMassKg;
      customReasons.push(
        loadMassOk
          ? `"Allowable load mass" ${loadMassResult.allowableLoadMassKg.toFixed(3)} kg at this overhang/band meets the actual load of ${loadMassKg.toFixed(3)} kg`
          : `"Allowable load mass" ${loadMassResult.allowableLoadMassKg.toFixed(3)} kg at this overhang/band is below the actual load of ${loadMassKg.toFixed(3)} kg`,
      );
      customPassed = customPassed && loadMassOk;
    }
```

And add one line near the top of the `for (const candidate of candidates)`
loop body (immediately after the `bearingType` lookup), reading
`load_mass_out` once, outside the loop (it is the same value for every
candidate — move it up next to `overhangLengthMm`/`mountingOrientation`
at the top of the function):

```ts
  const loadMassKg = quantityOutput(outputs, "load_mass_out").value;
```

- [ ] **Step 3: Update the three already-committed Stage 3 files' own tests**

Add one assertion to `package.test.ts`'s own "echoes ... as outputs" test
(from Task 17):

```ts
    expect(asQuantity(computation.outputs.load_mass_out).value).toBe(15);
```

(15 matches `baselineInput()`'s own `load_mass` value in that same test
file.)

- [ ] **Step 4: Run typecheck and the full module test suite**

Run: `npx tsc --noEmit && npx vitest run lib/modules/dual-rod-cylinder-sizing --no-coverage`
Expected: no errors, all pass (including the updated echo assertion).

- [ ] **Step 5: Commit everything from this task together**

```bash
git add lib/application/catalogs/dual-rod-cylinder-matching.ts lib/modules/dual-rod-cylinder-sizing/0.1.0/manifest.ts lib/modules/dual-rod-cylinder-sizing/0.1.0/compute.ts lib/modules/dual-rod-cylinder-sizing/0.1.0/index.ts lib/modules/dual-rod-cylinder-sizing/0.1.0/package.test.ts
git commit -m "feat: dual-rod-cylinder-sizing catalog matcher with load-mass-vs-overhang check"
```

### Task 22: Write the CXS2 catalog seed CSV and seed script

**Files:**
- Create: `reference/catalog-seed/smc-cxs2.csv`
- Create: `scripts/seed-dual-rod-cylinder-catalog.mts`

Bore/rod pairs and stroke ranges below are read from `ES20-275-CXS2.pdf`'s
own dimension tables (the same catalog Task 1/19 already fetched) — one
representative row per bore x bearing-type combination (12 rows: 6 bores x
2 bearing types), matching `smc-mgq-mgp.csv`'s own "one row per bore x
bearing type" precedent. `bearing_type` values are the enum this schema
declares (`slide` for CXS2M, `ball_bushing` for CXS2L) — the catalog
matcher's own `resolveAllowableLoadMass` call keys off this exact field.

- [ ] **Step 1: Confirm each bore's own rod diameter and standard stroke range**

Before writing the CSV, confirm every bore's own rod diameter from
`ES20-275-CXS2.pdf`'s own dimension table (bores 6/10/16/20/25/32 mm) —
do not assume a fixed bore-to-rod ratio; different bores in this series
may not share one ratio, the same caution `pneumatic-cylinder-sizing
@0.1.0`'s own Task 13 already applied to CM2/CA2's own bore-40 exception.
Record each confirmed pair before writing Step 2's own CSV rows. Use the
same standard stroke range for both bearing types at a given bore unless
the catalog states otherwise.

- [ ] **Step 2: Write `reference/catalog-seed/smc-cxs2.csv`**

Write a header row plus 12 data rows (one per bore x bearing-type
combination), using the confirmed rod diameters from Step 1:

```csv
Model,Bore (mm),Rod (mm),Bearing Type,Stroke Min (mm),Stroke Max (mm)
CXS2M6,6,<ROD>,slide,10,100
CXS2L6,6,<ROD>,ball_bushing,10,100
CXS2M10,10,<ROD>,slide,10,100
CXS2L10,10,<ROD>,ball_bushing,10,100
CXS2M16,16,<ROD>,slide,10,100
CXS2L16,16,<ROD>,ball_bushing,10,100
CXS2M20,20,<ROD>,slide,10,100
CXS2L20,20,<ROD>,ball_bushing,10,100
CXS2M25,25,<ROD>,slide,10,100
CXS2L25,25,<ROD>,ball_bushing,10,100
CXS2M32,32,<ROD>,slide,10,100
CXS2L32,32,<ROD>,ball_bushing,10,100
```

Replace every `<ROD>` with the bore's own confirmed rod diameter from Step
1 (the same rod diameter for both bearing types at a given bore, unless
the catalog states a difference). Replace `Stroke Min`/`Stroke Max` with
the catalog's own real standard stroke range per bore if it differs from
10-100 mm.

Add a header comment disclosure to the top of this task's own commit
message (Step 5) recording that this is a representative, founder-review-
pending seed — the same disclosure every prior catalog seed CSV in this
project carries in its own seed script header, not in the CSV file itself
(CSV files in this project carry no comment syntax).

- [ ] **Step 3: Write `scripts/seed-dual-rod-cylinder-catalog.mts`**

Mirrors `scripts/seed-guided-cylinder-catalog.mts`'s own structure and
runtime shim exactly:

```ts
// scripts/seed-dual-rod-cylinder-catalog.mts
//
// One-time catalog seed for the pneumatic_cylinder_dual_rod component type
// (Unit 7.4, Stage 5). Creates the Manufacturer, ComponentType, and
// ComponentSchemaVersion, then imports reference/catalog-seed/
// smc-cxs2.csv via the existing generic CSV import pipeline
// (lib/catalog/csv-import.ts, lib/application/catalogs/import-catalog.ts)
// -- no new catalog-engine code, matching context/architecture.md
// "lib/catalog/": manufacturer part data has no self-serve upload UI in
// the MVP. Mirrors scripts/seed-guided-cylinder-catalog.mts's own
// structure and runtime shim exactly.
//
// SEED DATA DISCLOSURE (see also context/modules/dual-rod-cylinder-sizing/
// stage-1-spec.md): the 12 rows in smc-cxs2.csv (6 bores x 2 bearing
// types) are directly read from SMC's own fetched CXS2 series catalog
// dimension tables, for the founder to review and trim to their real
// working set after this module ships -- not a claim that every row is a
// part the founder actually stocks or specifies. This seed does NOT
// include the load-mass-vs-overhang-length dataset -- that dataset is
// digitized from founder-supplied graph images directly into
// lib/modules/dual-rod-cylinder-sizing/0.1.0/load-mass-curves.ts (a
// module-package file, not a catalog attribute), since it is keyed by
// mounting orientation/speed band/stroke band -- a compound lookup the
// generic ComponentAttributes JSONB schema does not model -- rather than
// being one fixed per-part rating the way allowable_lateral_load and
// allowable_torque are in smc-mgq-mgp.csv's own schema.
//
// Run manually, once, against a real database:
//
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/seed-dual-rod-cylinder-catalog.mts

// --- Runtime shim --------------------------------------------------------
// See scripts/seed-pneumatic-cylinder-catalog.mts's own header for why
// this hook is needed (bundler-style extensionless imports, "@/*"
// tsconfig-path resolution, and the "server-only" package's throwing
// default export under plain Node) -- identical shim, copied rather than
// shared, matching that script's own standalone-file precedent.
import { register } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ComponentAttributeFieldDefinition } from "../lib/catalog/index.ts";
import type { ImportMapping } from "../lib/catalog/index.ts";

const REPO_ROOT = process.cwd();

const LOADER_SOURCE = `
import { existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = ${JSON.stringify(REPO_ROOT)};

function resolveTsFile(target) {
  if (existsSync(target) && statSync(target).isFile()) return target;
  const candidates = [
    target + ".ts",
    target + ".tsx",
    target + ".mts",
    join(target, "index.ts"),
    join(target, "index.tsx"),
    join(target, "index.mts"),
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return nextResolve(
      pathToFileURL(join(ROOT, "tests/stubs/server-only.ts")).href,
      context,
    );
  }

  let target;
  if (specifier.startsWith("@/")) {
    target = join(ROOT, specifier.slice(2));
  } else if (specifier.startsWith("./") || specifier.startsWith("../")) {
    if (context.parentURL) {
      target = join(dirname(fileURLToPath(context.parentURL)), specifier);
    }
  }

  if (target !== undefined) {
    const resolved = resolveTsFile(target);
    if (resolved !== undefined) {
      return nextResolve(pathToFileURL(resolved).href, context);
    }
  }
  return nextResolve(specifier, context);
}
`;

register(
  `data:text/javascript,${encodeURIComponent(LOADER_SOURCE)}`,
  import.meta.url,
);

// Dynamic imports, not static ones -- see the runtime-shim comment above.
const {
  createComponentSchemaVersion,
  createComponentType,
  createManufacturer,
  prisma,
  asComponentSchemaVersionId,
  asComponentTypeId,
  asManufacturerId,
  asUserId,
} = await import("../lib/db/index.ts");
const { importCatalog } =
  await import("../lib/application/catalogs/import-catalog.ts");

// --- Component schema (Stage 5 Step 1) -------------------------------------

const COMPONENT_TYPE_ID = "pneumatic_cylinder_dual_rod";
const SCHEMA_VERSION = "1.0.0";

const DUAL_ROD_CYLINDER_SCHEMA_FIELDS: ComponentAttributeFieldDefinition[] = [
  {
    key: "bore_diameter",
    label: "Bore diameter",
    valueKind: "quantity",
    required: true,
    unit: "mm",
  },
  {
    key: "rod_diameter",
    label: "Rod diameter",
    valueKind: "quantity",
    required: true,
    unit: "mm",
  },
  {
    key: "bearing_type",
    label: "Bearing type",
    valueKind: "enum",
    required: true,
    enumOptions: ["slide", "ball_bushing"],
  },
  {
    key: "stroke_min",
    label: "Minimum standard stroke",
    valueKind: "quantity",
    required: true,
    unit: "mm",
  },
  {
    key: "stroke_max",
    label: "Maximum standard stroke",
    valueKind: "quantity",
    required: true,
    unit: "mm",
  },
];

// --- Load-or-create setup (Step 3) -----------------------------------------

async function loadOrCreateManufacturer(name: string) {
  const existing = await prisma.manufacturer.findUnique({ where: { name } });
  if (existing !== null) {
    return { id: asManufacturerId(existing.id), name: existing.name };
  }
  return createManufacturer({ name });
}

async function ensureComponentType(input: {
  id: string;
  name: string;
  description: string;
}): Promise<void> {
  const existing = await prisma.componentType.findUnique({
    where: { id: input.id },
  });
  if (existing !== null) return;
  await createComponentType(input);
}

async function loadOrCreateComponentSchemaVersion(
  componentTypeId: string,
  version: string,
  fields: readonly ComponentAttributeFieldDefinition[],
) {
  const existing = await prisma.componentSchemaVersion.findUnique({
    where: { componentTypeId_version: { componentTypeId, version } },
  });
  if (existing !== null) {
    return { id: asComponentSchemaVersionId(existing.id) };
  }
  return createComponentSchemaVersion({
    componentTypeId: asComponentTypeId(componentTypeId),
    version,
    fields,
  });
}

async function main(): Promise<void> {
  const manufacturer = await loadOrCreateManufacturer("SMC Corporation");

  await ensureComponentType({
    id: COMPONENT_TYPE_ID,
    name: "Pneumatic dual rod cylinder",
    description:
      "Twin-guide-rod cylinder with a load-mass-vs-overhang-length structural rating in place of a buckling check (SMC CXS2 series and equivalents).",
  });

  const schemaVersion = await loadOrCreateComponentSchemaVersion(
    COMPONENT_TYPE_ID,
    SCHEMA_VERSION,
    DUAL_ROD_CYLINDER_SCHEMA_FIELDS,
  );

  const mapping: ImportMapping = {
    id: "smc-cxs2-basic",
    version: "1.0.0",
    componentTypeId: COMPONENT_TYPE_ID,
    componentSchemaVersionId: schemaVersion.id,
    fields: [
      { target: "partNumber", source: { kind: "column", column: "Model" } },
      {
        target: "sourceRevision",
        source: { kind: "constant", value: "2026-08-26" },
      },
      {
        target: "bore_diameter",
        source: { kind: "column", column: "Bore (mm)" },
        sourceUnit: "mm",
      },
      {
        target: "rod_diameter",
        source: { kind: "column", column: "Rod (mm)" },
        sourceUnit: "mm",
      },
      {
        target: "bearing_type",
        source: { kind: "column", column: "Bearing Type" },
      },
      {
        target: "stroke_min",
        source: { kind: "column", column: "Stroke Min (mm)" },
        sourceUnit: "mm",
      },
      {
        target: "stroke_max",
        source: { kind: "column", column: "Stroke Max (mm)" },
        sourceUnit: "mm",
      },
    ],
  };

  const csvText = readFileSync(
    join(REPO_ROOT, "reference/catalog-seed/smc-cxs2.csv"),
    "utf-8",
  );

  // A placeholder UserId: this runs outside any authenticated request
  // context. An operator running this interactively could substitute
  // their own real UserId (their Clerk id) here instead.
  const result = await importCatalog(
    {
      manufacturerId: manufacturer.id,
      componentTypeId: asComponentTypeId(COMPONENT_TYPE_ID),
      componentSchemaVersionId: schemaVersion.id,
      mapping,
      csvText,
      sourceLabel:
        "SMC CXS2 catalog seed (representative, founder-review pending)",
    },
    asUserId("system-seed"),
  );

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
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

- [ ] **Step 4: Confirm `ComponentAttributeFieldDefinition` supports an `enum` valueKind with `enumOptions`**

Run: `grep -n "valueKind" lib/catalog/*.ts`
Expected: confirms the exact field names this project's own
`ComponentAttributeFieldDefinition` type uses for an enum-valued catalog
attribute (used here for `bearing_type`) — `smc-mgq-mgp.csv`'s own schema
(Task-referenced `seed-guided-cylinder-catalog.mts`) has no enum field to
copy from, so check the type definition directly rather than assuming the
literal shape above is exactly right; adjust field names to match if they
differ.

- [ ] **Step 5: Typecheck the new script**

Run: `npx tsc --noEmit`
Expected: no errors (script files under `scripts/` are included in the
project's own `tsconfig.json` — confirm with `grep -n "scripts" tsconfig.json`
if this fails unexpectedly).

- [ ] **Step 6: Commit**

```bash
git add reference/catalog-seed/smc-cxs2.csv scripts/seed-dual-rod-cylinder-catalog.mts
git commit -m "feat: SMC CXS2 catalog seed data and import script"
```

### Task 23: Wire `load-component-assignment-view.ts`'s dispatch for a fourth component type

**Files:**
- Modify: `lib/application/catalogs/load-component-assignment-view.ts`
- Modify: `lib/application/catalogs/load-component-assignment-view.test.ts`

- [ ] **Step 1: Extend the componentType dispatch guard**

Find:

```ts
  if (
    adapter.componentType !== "pneumatic_cylinder" &&
    adapter.componentType !== "pneumatic_cylinder_guided"
  ) {
```

Replace with:

```ts
  if (
    adapter.componentType !== "pneumatic_cylinder" &&
    adapter.componentType !== "pneumatic_cylinder_guided" &&
    adapter.componentType !== "pneumatic_cylinder_dual_rod"
  ) {
```

Update the comment immediately above that guard (currently naming only
`"pneumatic_cylinder"` and `"pneumatic_cylinder_guided"`) to also name
`"pneumatic_cylinder_dual_rod"` (Unit 7.4).

- [ ] **Step 2: Extend the outcome dispatch**

Find:

```ts
  const outcome =
    adapter.componentType === "pneumatic_cylinder"
      ? evaluatePneumaticCylinderCandidates(
          run.snapshot.computation,
          matchCandidates as PneumaticCylinderMatchCandidate[],
        )
      : evaluateGuidedCylinderCandidates(
          run.snapshot.computation,
          matchCandidates as GuidedCylinderMatchCandidate[],
        );
```

Replace with:

```ts
  const outcome =
    adapter.componentType === "pneumatic_cylinder"
      ? evaluatePneumaticCylinderCandidates(
          run.snapshot.computation,
          matchCandidates as PneumaticCylinderMatchCandidate[],
        )
      : adapter.componentType === "pneumatic_cylinder_guided"
        ? evaluateGuidedCylinderCandidates(
            run.snapshot.computation,
            matchCandidates as GuidedCylinderMatchCandidate[],
          )
        : evaluateDualRodCylinderCandidates(
            run.snapshot.computation,
            matchCandidates as DualRodCylinderMatchCandidate[],
          );
```

- [ ] **Step 3: Add the new import**

At the top of the file, alongside the existing
`evaluateGuidedCylinderCandidates`/`GuidedCylinderMatchCandidate` import,
add:

```ts
import {
  evaluateDualRodCylinderCandidates,
  type DualRodCylinderMatchCandidate,
} from "./dual-rod-cylinder-matching";
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Add a DB-gated fixture test mirroring the MGQM40 one**

Open `lib/application/catalogs/load-component-assignment-view.test.ts` and
find the existing MGQM40/MGQM12 fixture test (guided-cylinder-sizing's
own accept/reject scenario). Add a parallel test block for
dual-rod-cylinder-sizing, reusing that test's own setup pattern (seed a
module instance, run it, seed two catalog rows via the DB directly, call
`loadComponentAssignmentView`, assert one accepts and one rejects):

```ts
describe("loadComponentAssignmentView for dual-rod-cylinder-sizing", () => {
  it("accepts a real CXS2M20 that clears every check and rejects an undersized CXS2M6", async () => {
    // Mirror the MGQM40/MGQM12 fixture's own setup pattern exactly:
    // create an owner, project, configuration, module instance for
    // dual-rod-cylinder-sizing@0.1.0, save the same input values
    // lib/modules/dual-rod-cylinder-sizing/0.1.0/smc-reference-example.ts
    // uses (horizontal, 0.5 kg, 8mm stroke, 4mm overhang), run it, then
    // seed two ManufacturerPartRevision rows for
    // "pneumatic_cylinder_dual_rod" directly via prisma: a CXS2M20 (bore
    // 20mm, matching rod, bearing_type "slide") and a CXS2M6 (bore 6mm,
    // matching rod, bearing_type "slide") -- the CXS2M6's own seeded
    // graph-9 band (<=10mm stroke, plateau 0.045 kg @ L<=4mm) is below
    // the scenario's own 0.5 kg load, so it must reject on the
    // load-mass-vs-overhang-length check specifically, not merely on
    // theoretical force.
    //
    // Fill in the exact create-and-run calls this file's own MGQM40 test
    // already demonstrates -- same repository functions, same
    // transaction pattern, different module id/component type/input
    // values/expected accept-reject split.
  });
});
```

This test's own body must be filled in against the real MGQM40 test's own
exact repository-call sequence (not reproduced here since it depends on
this file's own current fixture-setup helpers, which may have shifted
since `guided-cylinder-sizing@0.1.0` shipped) — copy that test's own setup
calls verbatim, then swap only the module id, input values, and the two
seeded catalog rows.

- [ ] **Step 6: Run the DB-gated test if a database is available**

If `DATABASE_URL` and `NODE_EXTRA_CA_CERTS` are set in this environment
(see `CLAUDE.md` "Environment notes" for how to check): run
`npx vitest run lib/application/catalogs/load-component-assignment-view.test.ts --no-coverage`
and confirm the new test passes. If neither variable is set, this is a
disclosed, expected gap — record it explicitly in Task 24's own tracker
update (do not claim this test passes without having run it, matching
`guided-cylinder-sizing@0.1.0`'s own honest disclosure of the identical
situation).

- [ ] **Step 7: Commit**

```bash
git add lib/application/catalogs/load-component-assignment-view.ts lib/application/catalogs/load-component-assignment-view.test.ts
git commit -m "feat: wire dual-rod-cylinder-sizing catalog matching into load-component-assignment-view"
```

---

## Stage 6 — Release

### Task 24: Re-pin the source-immutability hash (it changed after Task 21's own manifest/compute/index edits)

**Files:**
- Modify: `lib/modules/dual-rod-cylinder-sizing/0.1.0/package.test.ts`

Task 17 pinned `expectedSourceHash` before Task 21 Step 2 added
`load_mass_out` to `manifest.ts`/`compute.ts`/`index.ts` — those edits
changed the module's own source files, so the hash pinned at Task 17 is
now stale. This must be re-pinned before release, not left pointing at a
pre-Task-21 snapshot.

- [ ] **Step 1: Recompute the hash**

Run: `npm run module:source-hash -- dual-rod-cylinder-sizing 0.1.0`
Expected: prints a new `expectedSourceHash`, different from Task 17's own
printed value (since the source files changed).

- [ ] **Step 2: Update the pinned value**

In `package.test.ts`, replace the `EXPECTED_SOURCE_HASH` constant's value
with the new value Step 1 printed.

- [ ] **Step 3: Run the full module conformance suite**

Run: `npx vitest run lib/modules/dual-rod-cylinder-sizing --no-coverage`
Expected: all pass, including `source-immutability`.

- [ ] **Step 4: Commit**

```bash
git add lib/modules/dual-rod-cylinder-sizing/0.1.0/package.test.ts
git commit -m "fix: re-pin dual-rod-cylinder-sizing source-immutability hash after load_mass_out addition"
```

### Task 25: Register the module and confirm full verification

**Files:**
- Modify: `lib/modules/registry.generated.ts` (generated, not hand-edited)

- [ ] **Step 1: Run the registry generator**

Run: `npm run registry:generate`
Expected: adds `dual-rod-cylinder-sizing@0.1.0` to
`lib/modules/registry.generated.ts`. Note the new total module count
printed (expected 29, up from 28 — confirm against the actual printed
count, do not assume).

- [ ] **Step 2: Confirm the sealed package content hash**

The registry generator or `sealModulePackage` itself prints/stores a
content hash for the newly registered module — record the exact printed
value for the progress-tracker update (Task 27), the same way every prior
module's own Stage 6 recorded its own `packageContentHash`.

- [ ] **Step 3: Run full verification**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`
Expected: typecheck clean, lint 0 errors, full non-DB suite green (record
the exact pass count — e.g. "2703/2703" — do not round or approximate),
build clean.

- [ ] **Step 4: Run the DB-gated suite if a database is available**

If `DATABASE_URL` and `NODE_EXTRA_CA_CERTS` are set (see `CLAUDE.md`
"Environment notes"): run the DB-gated test suite (check `package.json`
for the exact script name, e.g. `npm run test:db` or equivalent) and
confirm green, including Task 23's own new fixture test. If neither
variable is available in this environment, this is a disclosed gap for
Task 27's own tracker update — do not claim it passes without running it.

- [ ] **Step 5: Commit**

```bash
git add lib/modules/registry.generated.ts
git commit -m "feat: release dual-rod-cylinder-sizing@0.1.0 (Milestone 7, Unit 7.4)"
```

### Task 26: Write the standalone validation record file

**Files:**
- Create: `validation/dual-rod-cylinder-sizing/0.1.0.md`
- Modify: `validation/source-index.md`

Per the roadmap's own Module Definition of Done item 10 (and the real gap
`pneumatic-cylinder-sizing@0.1.0`'s own Stage 6 found and closed
retroactively): a standalone `validation/<module-id>/<version>.md` record
is required in addition to the in-code `validation.ts`.

- [ ] **Step 1: Find the template**

Read `validation/module-validation-template.md` and
`validation/guided-cylinder-sizing/0.1.0.md` (the most recent sibling
module's own record) to match the exact section structure this project's
validation records use.

- [ ] **Step 2: Write `validation/dual-rod-cylinder-sizing/0.1.0.md`**

Populate every section the template requires directly from this module's
own finalized `validation.ts` (Task 20) — module ID/version, methods,
source revisions, reference examples (the CXS2M20 scenario), independent
benchmark (theoretical force: satisfied by reference to
`pneumatic-cylinder-sizing@0.1.0`'s own Norgren M/1000 substitute;
load-mass-vs-overhang-length: explicitly disclosed as having no
independent benchmark of any kind), reviewer/reviewDate, supported-use
limits, and deviations. Do not introduce any claim not already present in
`validation.ts` — this file restates the same finalized record in the
project's own standalone document format, it does not add new evidence.

- [ ] **Step 3: Add source-index rows**

Open `validation/source-index.md` and add one row per source revision
this module's own `sourceRevisionIds` lists (four total: CXS2 series
catalog — new; SMC air cylinders model selection, Milwaukee design
engineering guide, Norgren M/1000 — all three already indexed by prior
modules, so only the CXS2 row is genuinely new; confirm the other three
already have rows before adding, rather than duplicating them).

- [ ] **Step 4: Commit**

```bash
git add validation/dual-rod-cylinder-sizing/0.1.0.md validation/source-index.md
git commit -m "docs: dual-rod-cylinder-sizing standalone validation record"
```

### Task 27: Update `context/implementation-map.md` and `context/progress-tracker.md`

**Files:**
- Modify: `context/implementation-map.md`
- Modify: `context/progress-tracker.md`

- [ ] **Step 1: Add a "Unit 7.4 — Dual rod cylinder sizing module" section to `context/implementation-map.md`**

Find the end of the existing "Unit 7.3 — Guided cylinder sizing module"
section (immediately before the "# Initial Two-Week Start Sequence"
heading) and insert a new "## Unit 7.4 — Dual rod cylinder sizing module"
section, following the exact same Stage 1 through Stage 6 subsection
structure Unit 7.3's own section already uses (see this plan's own
research — the Read of `context/implementation-map.md` lines 2390-2538
done at the start of this planning session). Populate each stage's own
subsection from what was actually done in Tasks 1-26 above (not a
copy-paste of Unit 7.3's own text) — in particular:

- Stage 1: cite `context/modules/dual-rod-cylinder-sizing/stage-1-spec.md`,
  the CXS2-vs-CXSJ marketing-claim correction, and the founder's own
  band-selection redirection.
- Stage 2: registry `1.19.0`, six new `dual_rod_sizing.*` parameters, no
  buckling-related port.
- Stage 3: the `math.ts`/`load-mass-curves.ts` split, the exact test
  counts from Task 17 Step 3's own run, and the real `load_mass_out` gap
  Task 21 found and fixed (do not omit this — it is exactly the kind of
  "found and disclosed a real gap mid-implementation" item this tracker's
  own history consistently records for every module).
- Stage 4: the CXS2M20 reference example, and the explicit "no
  independent benchmark of any kind" disclosure for the load-mass-vs-
  overhang formula area.
- Stage 5: the catalog matcher, the 12-row CXS2 seed, and the DB-gated
  fixture test's actual run status from Task 23 Step 6 (pass, or
  disclosed-not-run).
- Stage 6: the two source-immutability hashes (Task 17's initial one, and
  Task 24's own re-pinned final one — record both, or just the final one
  with a note that it was re-pinned after the load_mass_out addition, matching
  how this tracker records real mid-implementation corrections elsewhere),
  the registered module count, the sealed package content hash, and the
  exact test-suite pass counts from Task 25.

- [ ] **Step 2: Update `context/progress-tracker.md`**

Edit the tracker's own top status paragraph in place (per
`context/ai-workflow-rules.md` "Documentation Synchronization": edit in
place, never append a dated narrative entry) to record:

- `dual-rod-cylinder-sizing@0.1.0` released and registered, Milestone 7's
  fourth module, the second of four planned new pneumatic actuator
  families (after guided-cylinder-sizing).
- The real `load_mass_out` gap found and fixed mid-implementation (Task
  21).
- The disclosed "no independent benchmark of any kind" evidence gap for
  the load-mass-vs-overhang-length formula area — this project's policy is
  to record every such gap explicitly, not fold it into a generic "some
  gaps remain" statement.
- Whether the DB-gated suite was actually run this session (per Task 23
  Step 6 / Task 25 Step 4's own real outcome) — state the true outcome,
  matching `guided-cylinder-sizing@0.1.0`'s own honest "not confirmed this
  session" precedent if a database was not available.
- What still needs the founder's own action: running
  `scripts/seed-dual-rod-cylinder-catalog.mts` against the live database,
  then reviewing/trimming both the 12-row catalog seed and the 61-row
  digitized load-mass-vs-overhang dataset (`load-mass-curves.ts`) against
  the source graph images — the latter is a real, distinct review item
  from every prior module's own catalog-seed review, since it was
  eye-read from graphs rather than transcribed from a printed table.

- [ ] **Step 3: Update the "Where the project is" milestone table if needed**

Milestone 7 is already marked "In progress" — confirm it stays that way
(Table Cylinder and Rodless families remain, per the design doc's own
"Out of Scope"). No table change should be needed; verify by reading the
current table row before assuming.

- [ ] **Step 4: Commit**

```bash
git add context/implementation-map.md context/progress-tracker.md
git commit -m "docs: sync implementation map and progress tracker for dual-rod-cylinder-sizing@0.1.0"
```

---

## Final self-review checklist

Before considering this plan complete, re-read the design doc
(`docs/superpowers/specs/2026-08-26-dual-rod-cylinder-sizing-design.md`)
section by section and confirm every decision it records has a
corresponding task above:

- "Decision" (module shape, category, no touching prior modules) → Tasks
  1, 6, 16.
- "Scope: CXS2 only" → Task 1 (stage-1-spec.md), Task 22 (seed data).
- "A marketing claim... found not to hold" → Task 8 (`math.ts` comment),
  Task 20 (`validation.ts`).
- "No buckling check for this family" → Tasks 1, 6, 8 (no buckling
  section), 11 (no moment/buckling trace section), 13 (no buckling
  assumption calls resolveBucklingLoad), 21 (no buckling evaluation in
  the matcher).
- "Load-Bearing Check" (band selection, founder correction 2) → Task 8
  (`resolveAllowableLoadMass`), Task 12 (digitized dataset), Task 21
  (per-candidate evaluation).
- "New input: mounting_orientation" → Task 3 (registry parameter), Task 6
  (port).
- "Digitized dataset" table → Task 12 (full transcription), Task 9/19
  (interpolation tests against it).
- "Band selection at compute time" → Task 8's own band-selection logic.
- "Module Shape" section 1 (parameter group) → Tasks 2, 3.
- "Module Shape" section 2 (compute flow) → Tasks 8, 13.
- "Module Shape" section 3 (catalog schema/seed) → Task 22.
- "Module Shape" section 4 (catalog matching) → Task 21.
- "Module Shape" section 5 (generic UI) → Task 15.
- "Validation Plan" → Tasks 19, 20.
- "Open Questions" (interpolation method, out-of-envelope behavior,
  registry version) → resolved directly in Task 8 (log-log, per the
  design doc's own stated default) and Task 3 (registry `1.19.0`); the
  out-of-envelope-blocks-evaluation question is resolved in Task 21 (a
  candidate is rejected, not silently passed, when
  `resolveAllowableLoadMass` reports `inEnvelope: false`) — this
  resolution should also be recorded explicitly in Task 26's own
  validation record deviations, since the design doc left it open rather
  than deciding it.
- "Out of Scope" → confirmed nowhere in this plan touches
  `pneumatic-cylinder@0.1.0`, `pneumatic-cylinder-sizing@0.1.0`/`0.1.1`,
  or `guided-cylinder-sizing@0.1.0`; no Table Cylinder/Rodless work; no
  self-serve catalog upload UI (Task 22 is a one-time script, matching
  every prior seed).

If any item above lacks a task, add one before starting execution.
