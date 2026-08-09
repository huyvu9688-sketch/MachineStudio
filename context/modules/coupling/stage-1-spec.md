# Coupling Module — Stage 1 Engineering Specification

## Status

- Work unit: Unit 4.5, Stage 1 — engineering specification and source intake
- Proposed module ID: `coupling`
- Proposed first released version: `0.1.0`
- Status: **Stage 1 draft.** Written as the next module in the roadmap's own
  Phase 1B order (Ball screw → Linear guide → Coupling → Support bearings),
  in parallel with Unit 4.1's continued evidence wait, per
  `context/ai-workflow-rules.md` ("Specification and source research may
  occur in parallel, but production release remains sequentially
  validation-gated") and `context/implementation-map.md` Milestone 4
  header — the same allowance already used for `motion-profile` (Unit 4.2),
  `ball-screw` (Unit 4.3), and `linear-guide` (Unit 4.4). Production release
  for Unit 4.5 remains sequentially gated behind Unit 4.1's Definition of
  Done regardless of how far this document or a future package gets.
- Date: 2026-08-09

No released parameter, module version, calculation run, or validation record
is changed by this document.

## Purpose

Given a candidate flexible shaft coupling's own catalog rating data (rated
torque, maximum/shock torque, allowable rotational speed, torsional
stiffness, moment of inertia, bore diameter range, allowable misalignment)
plus the drive torque and rotational speed already resolved by `ball-screw`
(Unit 4.3), check whether that specific coupling is mechanically viable for
the axis: torque capacity under steady and shock load (with service
factors), speed limit, misalignment capability against the installation's
actual offset, and bore/shaft-diameter compatibility. It reports a
required-spec / pass-fail-with-margin result for a coupling the engineer has
already identified by model — it does not search a catalog and rank
candidates, matching the same scope restriction `ball-screw 0.1.0` and
`linear-guide 0.1.0` already established (catalog matching is optional item
12 in `context/roadmap.md`'s Module Definition of Done).

It will **not**:

- select a servo motor, gearbox, or drive/amplifier (Unit 4.7);
- select a ball screw (Unit 4.3) or distribute load among linear-guide
  blocks (Unit 4.4);
- select a support-bearing part number (Unit 4.6);
- perform a full periodic torsional-vibration analysis. KTR's own selection
  guide (item 1 below) explicitly splits coupling selection into "drives
  without periodical torsional vibrations" (its own operating-factor method,
  covered here) and "drives with periodical torsional vibrations" (which it
  says needs a dedicated torsional-vibration calculation, referring
  customers to its own in-house tool and "KTR standard 20004" — not
  reproduced or attempted here). R+W's simpler single-frequency resonance
  check (item 2 below, `f_e`) is a candidate for a future version, not
  `0.1.0` — see "Validity Envelope" and "Evidence Gaps" below for why it
  cannot be implemented yet regardless;
- specify bore/keyway machining tolerances or a specific bore size — it
  checks a candidate coupling's printed bore range against engineer-supplied
  shaft diameters, not machining fit classes.

## Candidate Sources

Three sources were read directly this session (2026-08-09), two
independent selection-methodology sources and one catalog-data source:

1. **KTR Systems GmbH**, *Coupling Selection Based on Operating Factors* —
   read directly from KTR's own domain (`ktr.com`), no mirror needed. Gives
   a required-torque formula, four named correction-factor tables
   (operating, temperature, starting, direction), two torque checks (steady
   and shock), and one full worked numerical example. See
   `lib/standards/engineering-sources.ts`
   `"us.ktr.coupling_selection_operating_factors@web-2026-08-09"`.
2. **R+W America LLC**, *Sizing and Selection* (a "Safety Couplings" catalog
   chapter, explicitly headed "According to DIN 740 part 2") — found via a
   third-party Canadian distributor mirror (`drivecentre.ca`, branded
   throughout as `RW-AMERICA.COM`); `rw-america.com`'s own catalog-download
   page was not independently attempted this session, so no direct-domain
   block is claimed. A second, structurally similar but independently
   branded method to KTR's: same required-torque base formula, its own
   factor tables, plus an inertia/acceleration-based torque formula and a
   torsional-resonant-frequency check neither KTR's document nor a catalog
   data sheet gives. Two full worked numerical examples at different power
   levels. See `lib/standards/engineering-sources.ts`
   `"us.rw_america.coupling_sizing_selection@web-2026-08-09"`.
3. **NBK (Nabeya Bi-tech Kaisha)**, a co-branded "ORIM VEXTA / NBK" flexible
   coupling catalog — found via a Japanese distributor mirror
   (`orimvexta.co.jp`) after NBK's own domain (`nbk1560.com`) returned HTTP
   403 on every page attempted this session, including non-catalog pages (a
   selection-procedure article, a terminology glossary). Real per-model
   catalog data across five coupling series (rated/max torque, allowable
   speed, moment of inertia, torsional stiffness, misalignment limits by
   axis), no selection-methodology prose. See `lib/standards/
   engineering-sources.ts` `"jp.nbk.coupling_catalog@orim-vexta-1908ov78"`.

**A real asymmetry, recorded rather than glossed over:** this project's
other Milestone 4 modules each found one US-market and one JP-market
*methodology* source (THK/Atlanta; Rockford/THK; PMI/IKO). Here, both
methodology sources (KTR, R+W) are German manufacturers reached through
their English/US-market sites — the same treatment `ball-screw`'s own
Steinmeyer source already received (`us.steinmeyer.ball_screw_technology`'s
own note: "Reached via the US/English steinmeyer.com site; no separate
JP-market edition was found"). The one JP-market source found (NBK) supplies
catalog data, not a competing selection method — `nbk1560.com`'s own
selection-guide pages could not be read this session (see item 3 above and
"Evidence Gaps" below). Whether a JP-market coupling selection *methodology*
source exists and is reachable is unresolved, not ruled out.

### 1. Required torque from power and speed — agreed shape

Both KTR and R+W give the identical formula, in the identical unit system
(the classic "9550" constant, from `9550 ≈ 60,000 / (2*pi)`, converting
kilowatt power and rpm speed directly to newton-metre torque):

```text
KTR:  T_N [Nm] = 9550 * P [kW] / n [1/min]
R+W:  T_AN [Nm] = 9550 * P_Drive [kW] / n [1/min]
```

**This module does not need this formula as an internal step.** Unlike a
selection workflow starting from a motor's nameplate power and speed, this
project already resolves a drive-side torque directly — `ball-screw 0.1.0`
exposes `screw.drive_torque` (`normal`/`peak`, N·m) as a released output
port. The formula above only matters for reproducing KTR's and R+W's own
worked examples in Stage 4, and as a documented alternative entry point a
future version could expose for a motor-first workflow. See "Existing
Parameter Review" below.

### 2. Torque capacity — agreed shape, independently branded factors

Both sources check a *steady* torque and a *shock/peak* torque separately,
each against the coupling's own rated and maximum torque ratings, each
scaled up by the source's own named correction factors:

```text
KTR (steady):  T_KN >= T_N * S_B * S_t * S_R
KTR (shock):   T_Kmax >= (T_N + T_S) * S_Z * S_t * S_R

R+W (steady):  T_KN >= T_AN * S_A * S_v * S_z
R+W (shock, safety-coupling-specific form):
               T_AR >= K * T_max
```

where `T_KN`/`T_Kmax` (KTR) and `T_KN` (R+W) are the coupling's own catalog
rated/maximum torque; `S_B`/`S_A` are an operating/shock-load factor keyed
to driven-machine type (large application tables, both sources — KTR's
spans two full pages of named machine types, R+W's a shorter one); `S_t`/
`S_v` a temperature factor; `S_Z`/`S_z` a starting-frequency factor; `S_R` a
same-vs-alternating torsional-direction factor. **The two sources agree on
shape — a required torque multiplied up by several independent correction
factors, checked against catalog capacity — and disagree on the exact
factor values and category boundaries**, the same "two sources agree on
shape, differ on specifics" relationship this project's other equivalent-
load and static-safety-factor items already treat as normal (see e.g.
`context/modules/linear-guide/stage-1-spec.md` item 3).

Sample factor values (not exhaustive — see the sources directly before
implementing):

| Factor | KTR | R+W |
| --- | --- | --- |
| Operating/shock, smooth uniform load | not itemized this narrowly | 1.25 (electric motor) |
| Operating/shock, heavy shock | up to 3.00 (piston compressors) | 2.0-2.5 (internal combustion) |
| Temperature, room temperature | `S_t = 1.0` | `S_v = 1.0` |
| Temperature, elevated (~+60°C class) | `S_t = 1.0-1.4` (coupling-type-dependent) | `S_v = 1.4` |
| Starting frequency, low (<25-30/hour) | `S_Z = 1.0-1.2` | `S_z = 1.0-1.1` |
| Direction, alternating vs. same | `S_R = 1.0` (same) / `1.7` (alternating) | not given in the pages read |

### 3. Inertia/acceleration-based torque and torsional resonance — R+W only

R+W's own document gives two formulas neither KTR's page nor a catalog data
sheet provides:

```text
Acceleration torque (start-up, no load):
  T_AR >= J_L/(J_A+J_L) * T_AS * S_A >= alpha * J_L      (Nm)
  alpha = omega/n = pi*n / (t*30)                        (rad/s^2)

Torsional resonant frequency:
  f_e = 1/(2*pi) * sqrt(C_T * (J_Masch+J_Mot) / (J_Masch*J_Mot))   (Hz)
```

where `J_L`/`J_A` are load-side/drive-side moment of inertia, `T_AS` the
motor's peak (starting) torque, `C_T` the coupling's own torsional
stiffness (a catalog value — NBK's own data gives this per model, item 4
below), and `J_Masch`/`J_Mot` the total driven/driving inertia (each stated
as "e.g. shaft + sprocket + chain + roller + 1/2 of coupling" / "e.g. motor
shaft + 1/2 of coupling" — i.e. a lumped two-mass approximation, not a
full driveline model). **Not implementable in `0.1.0` for a reason
independent of the formula itself:** this project has no released parameter
for motor rotor inertia or reflected load inertia yet — that is Unit 4.7
(servo drive-train) territory, which does not exist. Recorded as a
documented, sourced formula for a later version once those inputs exist,
the same "reserved, not guessed" treatment `linear-guide`'s mean-load
duty-cycle aggregation received before its own inputs existed.

### 4. Torsional stiffness, moment of inertia, misalignment, speed limit — catalog data

NBK's catalog gives, per specific coupling model across five series (`XGT2`,
`XGT`, `XHW`, `MST`, `MCS`): rated torque, maximum (momentary) torque,
allowable rotational speed (r/min), moment of inertia (`kg*m^2`), torsional
stiffness (`N*m/rad`), and three misalignment limits — parallel
(`mm`), angular (`deg`), axial (`mm`). These are catalog/data-sheet values
for the specific coupling, not derived by this module — the same treatment
`ball-screw` gives `Ca`/`C0a` and `linear-guide` gives `C`/`C0`/`T0`. No
selection-methodology prose accompanies them in the pages read (see
"Candidate Sources" item 3); NBK's own selection-guide pages could not be
read this session.

### 5. Bore/shaft compatibility

Both NBK's catalog (per-model bore-diameter tables, `D1`/`D2` in mm) and
KTR's/R+W's own worked examples (which state motor- and load-shaft
diameters as selection inputs, even though neither source's own formulas
consume them directly) treat bore compatibility as a simple range check: the
engineer's own driving- and driven-shaft diameters must each fall within the
candidate coupling's printed bore range for that side. No manufacturer
source read this session gives a fit-tolerance (h6/h7-class) formula beyond
printing the tolerance class as a table footnote (NBK: "●h6 ●h7").

## Validity Envelope (Proposed)

- **One coupling connecting two shaft ends** (the ball screw's own drive
  shaft and its upstream driving shaft) — not a multi-coupling driveline, and
  not the coupling's own internal element count or type (jaw, bellows, disc,
  gear, lamina, etc.), which is an engineer/catalog selection input, not a
  formula this module derives.
- **Torque capacity check only** — both the steady-torque and shock-torque
  forms above (item 2), using engineer-supplied correction factors. Matching
  `ball-screw`'s and `linear-guide`'s own treatment of their disagreeing
  safety-factor tables, the exact factor values are **required inputs with
  no built-in default** — KTR's and R+W's tables disagree in both category
  boundaries and numeric ranges, and neither source's table is adopted
  wholesale.
- **No torsional-resonance or periodic-vibration check.** Item 3's formula
  is sourced and recorded but not implemented — this project has no
  released motor/load inertia parameter yet (see item 3's own note).
- **Misalignment is a bound check, not a stiffness/life derating model.**
  The engineer supplies the installation's actual parallel, angular, and
  axial misalignment; the module checks each against the candidate
  coupling's own catalog limit. No coupling life or torsional-stiffness
  derating as a function of misalignment is modeled (R+W's own document
  does not give one in the pages read either).
- **Bore/shaft compatibility is a simple range check** (item 5) — no fit
  tolerance (h6/h7-class) verification.
- **Only the `normal` and `peak` load cases**, matching `axis-load-cases
  0.1.0`'s and `ball-screw 0.1.0`'s own scope restriction — there is no
  supported upstream `holding`/`emergency_stop` drive torque to consume yet.
- Torsional stiffness and moment of inertia are **reported outputs, not
  evaluated pass/fail** — informational, for a future module (or a later
  version of this one) to consume, the same "reported, not evaluated"
  treatment `linear-guide` gives its own preload-grade input.

## Existing Parameter Review

Already released and reusable, pending a real Stage 2 design decision (see
"Stage 2 Entry Criteria" below):

| Purpose | Parameter | Note |
| --- | --- | --- |
| Required torque at the driven shaft, per case | `screw.drive_torque` | `ball-screw 0.1.0`'s own output — this module's most direct candidate "required torque" input, avoiding a re-derivation from motor power/speed |
| Rotational speed | `screw.mean_rotational_speed` | **A real mismatch, not a clean fit:** this is a duty-cycle-weighted *mean*, not the peak or per-case speed KTR's/R+W's own `n` (a single rated/nameplate speed) most closely resembles. No peak/per-case rotational-speed port is released yet. |
| Gear ratio context | `screw.gear_ratio` | Its own definition already anticipates reuse: "A future drive-train module (Unit 4.7) may reuse or supersede this parameter once its own contract exists" — relevant if a coupling sits between a gearbox and the screw rather than directly on the screw's own drive shaft. |

Everything else this module needs is new — no `coupling.*` parameter
namespace exists yet (`grep` of `lib/engine/parameters/definitions.ts`
confirms zero `id: "coupling.*"` entries as of this document). A Stage 2
registry proposal would need at least:

- Catalog/rating inputs: rated torque, maximum (shock) torque, allowable
  rotational speed, torsional stiffness, moment of inertia, bore diameter
  range (driving side, driven side).
- Installation inputs: actual parallel/angular/axial misalignment, actual
  driving/driven shaft diameters.
- Correction-factor inputs: operating/shock factor, temperature factor,
  starting factor, direction factor — required, no built-in default, per
  item 2's own disagreement between sources (the same treatment `ball-screw`
  gives its own static-safety-factor minimum and buckling margin).
- Outputs: torque-capacity check result (steady and shock), speed-limit
  check result, per-axis misalignment check result, bore-compatibility
  check result, torsional stiffness (reported), moment of inertia
  (reported).

## Checks (Proposed)

- Invalid input: non-positive rated torque, maximum torque, allowable
  speed, torsional stiffness, moment of inertia, or bore-range bound;
  non-finite misalignment or shaft-diameter input.
- Torque capacity, steady: required torque (per case) multiplied by the
  engineer-supplied correction factors, against the coupling's own rated
  torque — fail if exceeded.
- Torque capacity, shock: the sum/peak form (item 2) against the coupling's
  own maximum torque — fail if exceeded. **Not resolved here which of
  KTR's or R+W's shock-torque form `0.1.0` adopts** — KTR sums a peak and
  rated torque before scaling by a starting factor; R+W's own safety-
  coupling-specific form instead scales a single maximum system torque by a
  disengagement multiplier `K`. See "Stage 2 Entry Criteria".
- Speed limit: the driven-shaft rotational speed (whichever port Stage 2
  resolves — see "Existing Parameter Review") against the coupling's own
  allowable speed — fail if exceeded.
- Misalignment: each of parallel, angular, and axial actual misalignment
  against its own catalog limit — fail if any is exceeded.
- Bore compatibility: each of the driving- and driven-side actual shaft
  diameter against the coupling's own printed bore range for that side —
  fail if out of range.

## Trace Contract (Proposed)

Mirroring the established pattern (`context/modules/ball-screw/
stage-1-spec.md`, `context/modules/linear-guide/stage-1-spec.md`):

1. `applied-torque-<case>` — the resolved required torque, traced back to
   its source run, and the correction-factor-scaled figure actually checked
2. `torque-capacity-<case>` — steady and shock checks against catalog rated/
   maximum torque
3. `speed-check` — driven-shaft speed against the coupling's allowable speed
4. `misalignment-check` — per-axis (parallel/angular/axial)
5. `bore-compatibility` — per side (driving/driven)
6. `torsional-properties` — reported torsional stiffness and moment of
   inertia (informational; item 3's resonance formula is not evaluated in
   `0.1.0`)
7. `validity-and-assumptions` — coupling type/model identity, load-case
   scope, which rotational-speed port was consumed

Each formula step cites its registered source revision and exact
page/section; it must not repeat the formula in UI/report code.

## Evidence Gaps and Verification Confidence

- **Directly read this session, high confidence:** KTR's full 4-page PDF (all
  pages) and R+W's "Sizing and Selection" / "Safety Couplings" chapter
  (printed pages 9-17 of a larger catalog) — both read directly, page-image
  by page-image, given the same "a multi-term, multi-sign formula set is
  exactly the kind of content a first-pass read can get subtly wrong"
  concern that has already caught real transcription errors in this
  project's `ball-screw` and `linear-guide` work. Both worked examples in
  each source were reproduced by hand-arithmetic against the printed
  intermediate and final figures before being recorded above (KTR: `T_AN =
  1273 Nm`, `T_KN >= 1909.5 Nm`; R+W: `T_AN = 4385.2 Nm`, `T_KN >= 6029.7
  Nm` and `T_AN = 7796 Nm`, `T_KN >= 15,592 Nm`) — not merely transcribed.
- **Directly read this session, NBK:** pages 1-15 of the co-branded ORIM
  VEXTA/NBK catalog (via the `orimvexta.co.jp` mirror) — catalog spec
  tables only (item 4), read once, not independently cross-checked against
  a second NBK source, since no second NBK document was found.
- **Not attempted successfully this session:** `nbk1560.com`'s own
  selection-guide pages (a "Procedure of Selection" article, a terminology
  glossary, a "Design Documents" page) — all returned HTTP 403 to direct
  fetch. Unlike the confirmed, repeated `tech.thk.com` block elsewhere in
  this project (`context/progress-tracker.md` "Environment notes"), this is
  only a single session's evidence against `nbk1560.com` specifically — retry
  before assuming it is a persistent block.
- **Not attempted this session:** a genuinely JP-market coupling selection
  *methodology* source (as opposed to catalog data) — see "Candidate
  Sources"' own "real asymmetry" note. Tsubakimoto's own online selection
  tool (`tt-net.tsubakimoto.co.jp`) was reached and gave a usage-coefficient
  table (a service-factor range by load condition) but not the underlying
  torque formula or a worked example in the page fetched; not pursued
  further this session. MISUMI's own technical-data PDF
  (`jp.misumi-ec.com`) returned HTTP 404 to direct fetch, not attempted via
  a mirror.
- **Not resolved:** which rotational-speed port this module should actually
  consume (`screw.mean_rotational_speed`, an already-released mean, vs. a
  new peak/per-case port) — a real design question, not a research gap
  (see "Existing Parameter Review").
- **Not resolved:** how a future version would source the upstream/
  downstream inertia item 3's resonant-frequency check needs — blocked on
  Unit 4.7 (servo drive-train), which does not exist, not on missing
  sources.
- **Not resolved:** which of KTR's or R+W's shock-torque check form `0.1.0`
  adopts (see "Checks (Proposed)" above) — both are genuine, sourced, and
  structurally different, the same kind of open methodology question
  `linear-guide`'s own PMI-vs-IKO equivalent-load disagreement was before
  its own Stage 4 resolved it for one series bucket.

## Stage 2 Entry Criteria

Stage 2 must resolve, with real sources where a manufacturer-specific
convention is involved (not invented here):

1. New `coupling.*` registry parameters per "Existing Parameter Review"
   above, through the normal registry-proposal checklist.
2. Which rotational-speed port this module consumes — `screw.
   mean_rotational_speed` as-is (documenting the mean-vs-peak approximation
   this introduces), or a new port this module's own contract proposes.
3. Whether `screw.drive_torque` is the right — or only — upstream torque
   source for `0.1.0`, given a coupling could in principle sit on either
   side of a future gearbox (Unit 4.7) rather than only adjacent to the
   ball screw's own drive shaft.
4. Which shock-torque check form (KTR's summed-and-scaled form, or R+W's
   disengagement-multiplier form) `0.1.0` adopts, or whether both are
   exposed — item 2's open question above.
5. Whether the correction factors (operating/shock, temperature, starting,
   direction) are exposed as one consolidated required input or as KTR's/
   R+W's own separate multi-factor structure — the disagreement in exact
   category boundaries and values (item 2's table) means neither source's
   table can be adopted wholesale without a decision either way.
6. Whether misalignment and bore compatibility are checks (pass/fail) or
   informational-only reports, matching the "Checks (Proposed)" section's
   current proposal but not yet a settled decision.

## Status

Stage 1 (engineering specification) is done as a draft. A kernel has not
been started. Production release for Unit 4.5 remains sequentially gated
behind Unit 4.1's Definition of Done regardless of how far this document or
a future package gets (`context/implementation-map.md` Milestone 4 header).
