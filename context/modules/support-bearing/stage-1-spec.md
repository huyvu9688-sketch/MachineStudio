# Support-Bearing Module — Stage 1 Engineering Specification

## Status

- Work unit: Unit 4.6, Stage 1 — engineering specification and source intake
- Proposed module ID: `support-bearing`
- Proposed first released version: `0.1.0`
- Status: **Stage 1 draft.** Written as the next module in the roadmap's own
  Phase 1B order (Ball screw → Linear guide → Coupling → Support bearings,
  `context/roadmap.md` "Phase 1B — Mechanical Transmission"), in parallel
  with Unit 4.1's continued evidence wait, per
  `context/ai-workflow-rules.md` ("Specification and source research may
  occur in parallel, but production release remains sequentially
  validation-gated") and `context/implementation-map.md` Milestone 4
  header — the same allowance already used for `motion-profile` (Unit 4.2),
  `ball-screw` (Unit 4.3), `linear-guide` (Unit 4.4), and `coupling`
  (Unit 4.5). Production release for Unit 4.6 remains sequentially gated
  behind Unit 4.1's Definition of Done regardless of how far this document
  or a future package gets.
- Date: 2026-08-09

No released parameter, module version, calculation run, or validation
record is changed by this document.

## Purpose

Given a candidate ball-screw support bearing's own catalog rating data
(basic dynamic load rating, basic static load rating, allowable rotational
speed, preload amount) plus the axial thrust force and rotational speed
already resolved by `axis-load-cases` (Unit 4.1) and `ball-screw` (Unit
4.3), check whether that specific support bearing is mechanically viable
for the axis: basic rating life (dynamic capacity) under the applied load,
static safety factor, and allowable-speed margin. It reports a
required-spec / pass-fail-with-margin result for a support bearing the
engineer has already identified by model — it does not search a catalog
and rank candidates, matching the same scope restriction `ball-screw
0.1.0`, `linear-guide 0.1.0`, and `coupling 0.1.0` already established
(catalog matching is optional item 12 in `context/roadmap.md`'s Module
Definition of Done).

It will **not**:

- select a ball screw (Unit 4.3), linear guide (Unit 4.4), or coupling
  (Unit 4.5);
- select a servo motor, gearbox, or drive/amplifier (Unit 4.7);
- evaluate a statically-indeterminate multi-bearing (three or more
  support points) arrangement — NTN's own handbook gives the reaction
  formulas for a 3-point-support shaft (item 3 below) but its own text
  calls a specific worked calculation "extremely complicated" and gives
  only the reaction-force equations, not a life/capacity worked example;
  out of scope for the same "engineer supplies the load, this module does
  not derive it" reason `linear-guide 0.1.0` restricts itself to a fixed
  two-rail/four-block arrangement;
- check torsional resonance or vibration of the bearing/shaft system
  (no released motor/load inertia parameter exists yet — the same gap
  that keeps `coupling 0.1.0` from implementing R+W's own resonant-
  frequency check);
- verify a specific shaft/housing fit tolerance class (h6/h7, etc.) beyond
  a bound check against the bearing's own printed bore/OD, the same
  treatment `coupling 0.1.0` gives bore compatibility.

## Candidate Sources

Two sources were read directly this session (2026-08-09):

1. **THK Co., Ltd.**, *Ball Screw General Catalog* — already a registered
   source in this project (`jp.thk.ball_screw_general_catalog`, first cited
   by `axis-load-cases`), re-read this session for its own "Ball Screw
   Peripherals — Support Unit" chapter (printed pages A15-313 through
   A15-322; models EK, BK, FK, EF, BF, FF), via the same `technico.com`
   mirror already used elsewhere in this project after `tech.thk.com`
   itself returned HTTP 403 (`context/progress-tracker.md` "Environment
   notes"). See `lib/standards/engineering-sources.ts`
   `"jp.thk.ball_screw_general_catalog@technico-mirror-2026-08-09"`. Gives
   the physical structure (fixed side = one JIS Class 5 angular contact
   bearing, 30-degree contact angle, DF/face-to-face duplex configuration,
   factory-adjusted preload; supported/floating side = a deep-groove ball
   bearing) and, per specific support-unit model number, catalog/data-sheet
   values: fixed-side bearing model number, basic dynamic load rating
   `Ca`, static permissible load, and rigidity; supported-side bearing
   model number and basic dynamic/static load rating `C`/`C0`. **No
   bearing-life, equivalent-load, or safety-factor formula of its own** —
   the chapter covers structure, types, model numbers, installation, and
   mounting procedure only, not a selection calculation.
2. **NTN Corporation**, *Rolling Bearings Handbook* (CAT. No. 9012-@/E) —
   read directly from NTN's own domain (`ntnglobal.com`), no mirror
   needed; cross-checked against an identical copy on `ntnamericas.com`
   the same session. See `lib/standards/engineering-sources.ts`
   `"jp.ntn.rolling_bearings_handbook@cat-9012e"`. The general rolling-
   bearing selection *methodology* THK's own catalog does not give:
   basic rating life (`L10 = (C/P)^p`, the catalogue/ISO 281 method),
   dynamic equivalent load (`P = X*Fr + Y*Fa`), adjusted rating life
   (reliability/material/operating-condition factors `a1`/`a2`/`a3`),
   basic static load rating and allowable static equivalent load (safety
   factor `S0 = C0/P0`, with a lower-limit-value table by operating
   condition and bearing type — **Table 6.4**, see item 2 below),
   preload (fixed-position vs. fixed-pressure methods, standard preload
   amounts for duplex angular contact ball bearings — matching THK's own
   "adjusted preload" language for its fixed-side bearing), allowable
   speed (correction factors by load and by combined radial/axial load),
   and shaft/housing interface requirements (fixing methods, shoulder
   height and fillet radius tables, shaft/housing precision grades,
   allowable misalignment by bearing type).

**A real asymmetry, recorded rather than glossed over:** both sources
found and read this session are Japanese manufacturers. This project's
other Milestone 4 modules each paired a US-market and a JP-market source
(THK/Atlanta for `axis-load-cases`; Rockford/THK for `ball-screw`;
PMI/IKO for `linear-guide`) or documented a real gap when they could not
(`coupling 0.1.0`: KTR and R+W both reached via their English/US-market
sites, NBK JP-catalog-only). Here the asymmetry runs the other way — no
US-market bearing-selection methodology source was successfully read this
session. NSK's own "Rolling Bearings" catalog (`e1102m.pdf`, JP
manufacturer, English/US-market edition) and NTN's own catalog were both
found; NSK's full catalog and a second NTN catalog (`CAT.No.2203/E`) both
exceeded this environment's 10 MB `WebFetch` fetch limit and were not
read. Two short NSK "Technical Insight" bulletins (`TI Bearing Life.pdf`,
`P_TI-0102_EN.pdf`) were read successfully and corroborate the same
`L10 = (C/P)^p` formula and `P = X*Fr + Y*Fa` equivalent-load shape NTN's
handbook gives, with no numeric disagreement found — real corroboration,
not yet a genuinely independent US-market source. Timken's and SKF's own
sites were searched but no full worked example was found accessible this
session (see "Evidence Gaps" below).

### 1. Basic rating life and equivalent load — one formula, textbook physics

NTN's handbook (Ch. 6-7) gives the standard rolling-bearing life method:

```text
L10 = (C / P)^p                          (10^6 revolutions)
P = X * Fr + Y * Fa                      (dynamic equivalent load, N)
```

where `C` is the bearing's own basic dynamic load rating (`Ca` for THK's
fixed-side angular contact bearing, `C` for its supported-side deep-groove
bearing — THK's own catalog dimension table), `P` the dynamic equivalent
load, `p = 3` for ball bearings, and `X`/`Y` the radial/axial load factors
"given in the dimensions table of the catalog" (i.e., bearing-model-
specific, printed by the bearing's own manufacturer — not reproduced in
NTN's handbook itself, the same "catalog prints the factor, this document
does not" treatment `linear-guide`'s own IKO source gives `kr`/`ka`). This
is elementary rolling-contact-fatigue theory (ISO 281's "catalogue
method"), not a manufacturer-specific method in the way KTR's/R+W's own
correction-factor tables are — NSK's two short bulletins corroborate the
identical formula shape with no numeric disagreement.

### 2. Static safety factor — one formula, a lower-limit table with only one source's own numbers

```text
S0 = C0 / P0                             (static safety factor)
```

`C0` is the bearing's own basic static load rating (THK's own "static
permissible load" for its fixed-side bearing is a related but distinctly
named figure — see "Evidence Gaps" below for why these are not yet
confirmed to be the same quantity); `P0` the static equivalent load.
NTN's own Table 6.4 gives lower-limit values of `S0` by bearing type and
"high rolling precision required" vs. "normal rolling precision required"
operating condition (ball bearings: `2` / `1`). **Unlike `ball-screw`'s,
`linear-guide`'s, and `coupling`'s own static-safety-factor items, this is
not (yet) a two-source disagreement** — only one source's own numbers
were read this session, so there is nothing to compare them against. This
project's own established treatment of an un-corroborated required
minimum (`screw.static_safety_factor_minimum`,
`guide.static_safety_factor_minimum`, `coupling.service_factor`) is to
make it a required input with no built-in default regardless of whether a
second source agrees or disagrees; see "Existing Parameter Review" below
for why that treatment is proposed here too, for the same "no source read
so far meets this project's evidence bar for a default" reason.

### 3. Bearing load from shaft reactions — sourced, not implemented in `0.1.0`

NTN's own Table 7.3 gives the reaction-force equations for a
three-point-support shaft (fixed + two floating, or similar arrangements),
and its own text explicitly flags this as complicated: "When one shaft is
supported by three bearings, and there is a lot of distance between
bearings, bearing load is calculated as 3-point support. A specific
calculation example is extremely complicated, so the bearing load equation
is given for a simple load example only." A ball-screw shaft's own
standard support arrangement (`screw.end_support_arrangement`, already
released: fixed-fixed, fixed-supported, supported-supported, fixed-free)
is a **two-point** arrangement in the common case, not three, so this
formula set may not even be the relevant one — recorded as sourced context
for a possible later version, not adopted or needed for `0.1.0`'s own
scope (see "Validity Envelope" below).

### 4. Preload — sourced, reported not evaluated in `0.1.0`

NTN's own Ch. 9.3 gives two preload methods (fixed-position, fixed-
pressure) and states standard preload amounts are set for duplex angular
contact ball bearings, with a reference to "NTN catalog" for the specific
table (not itself printed in the handbook chapter read). THK's own catalog
confirms its fixed-side support-unit bearing ships with "an adjusted
preload" but does not print the specific preload force per model in the
pages read. Consistent with `linear-guide 0.1.0`'s own treatment of
preload grade ("reported outputs, not evaluated pass/fail... for a future
module... to consume"), `0.1.0` proposes to report the bearing's own
preload amount as an informational catalog value, not evaluate it against
a check — no source read this session gives a pass/fail criterion for
preload amount, only that duplex angular contact bearings are preloaded
by design.

### 5. Allowable speed — one formula, correction factors by load

NTN's own Ch. 10 gives allowable-speed correction: a catalog allowable
speed applies without correction when `P <= 0.09*Cr` and `Fa/Fr <= 0.3`;
otherwise a correction factor `fL` (by load ratio `Cr/P`) and `fC` (by
combined-load ratio `Fa/Fr`, with a distinct curve for angular contact
ball bearings vs. deep-groove ball bearings vs. tapered roller bearings)
apply. THK's own catalog does not print a support-unit-specific allowable
speed table in the pages read (its own screw-shaft DN-value permissible-
speed formula, `N = 70000/D`, is a *different* quantity — the ball
screw's own permissible speed, already implemented by `ball-screw 0.1.0`,
not the support bearing's own).

## Existing Parameter Review

Already released and reusable, pending a real Stage 2 design decision (see
"Stage 2 Entry Criteria" below):

| Purpose | Parameter | Note |
| --- | --- | --- |
| Axial load on the fixed-side bearing, per case | `motion.axis.thrust_force` | Already `ball-screw 0.1.0`'s own input port — reusing it directly here, rather than asking `ball-screw` to expose a new "axial load on the support bearing" output, is exactly the roadmap's own Unit 4.6 gate: "Support-bearing output integrates with the ball-screw module without a custom link mapping" (`context/implementation-map.md`). Physically sound for `0.1.0`'s in-scope arrangement: the fixed-side bearing reacts the full screw-shaft axial thrust, the same load the screw itself resists. |
| Rotational speed, per case | `screw.lead` + `motion.axis.case_linear_velocity` | The support bearing mounts directly on the screw shaft itself (not a driving/motor shaft through a gearbox), so its rotational speed is the screw shaft's own `n = v / lead` — no `screw.gear_ratio` term, unlike `coupling 0.1.0`'s own driving-shaft speed. Reproduces the same physics `ball-screw`'s own kernel already trusts internally (`resolveRotationalSpeed`), mirrored rather than imported, the same "own internal trust, not a package dependency" pattern `coupling 0.1.0` already established against `ball-screw`. |
| End-support arrangement context | `screw.end_support_arrangement` | Already released by `ball-screw 0.1.0` (fixed-fixed / fixed-supported / supported-supported / fixed-free) — relevant context for which bearing (fixed-side or supported-side) a given calculation run represents, though not consumed as a computational input in `0.1.0`'s own proposed scope (see "Stage 2 Entry Criteria" item 3). |

Everything else this module needs is new — no `bearing.*` (or equivalent)
parameter namespace exists yet (`grep` of
`lib/engine/parameters/definitions.ts` confirms zero entries for any
support-bearing-specific ID as of this document). A Stage 2 registry
proposal would need at least:

- Catalog/rating inputs: basic dynamic load rating, basic static load
  rating, allowable rotational speed, preload amount (reported), bore and
  outside diameter (for a bound-check shaft/housing fit).
- Installation inputs: actual radial load (see "Stage 2 Entry Criteria"
  item 2 below — no existing upstream parameter cleanly supplies this),
  actual shaft diameter, actual housing bore diameter.
- Factor inputs: dynamic equivalent-load factors `X`/`Y` (bearing-model-
  specific, printed by the bearing's own manufacturer catalog — an
  engineer-supplied catalog lookup, the same treatment `linear-guide`
  gives IKO's own `kr`/`ka`), static safety factor minimum (required, no
  built-in default — see item 2 above).
- Outputs: basic rating life (revolutions and hours), dynamic equivalent
  load (reported), static safety factor, allowable-speed check result,
  preload amount (reported).

## Checks (Proposed)

- Invalid input: non-positive dynamic load rating, static load rating,
  allowable speed, bore, or outside diameter; non-finite radial or axial
  load.
- Basic rating life: `L10 = (C/P)^3` against the required life derived
  from the axis's own duty-cycle context (mirroring `ball-screw`'s own
  `nominal_life`/`nominal_life_hours` shape) — reported, and optionally
  checked against an engineer-supplied minimum required life, the same
  "reported life, engineer judges against their own requirement" treatment
  `linear-guide 0.1.0` gives its own per-case nominal life (no duty-cycle
  minimum-life check is implemented there either).
- Static safety factor: `S0 = C0/P0 >= (engineer-supplied minimum)` —
  fail if below.
- Speed limit: operating speed (with NTN's own `fL`/`fC` correction
  applied when the uncorrected condition does not hold) against the
  bearing's own allowable speed — fail if exceeded.
- Bore/housing compatibility: actual shaft diameter and actual housing
  bore diameter each within the bearing's own printed bore/OD — fail if
  out of range, the same simple bound-check treatment `coupling 0.1.0`
  gives shaft/bore compatibility.

## Trace Contract (Proposed)

Mirroring the established pattern (`context/modules/ball-screw/
stage-1-spec.md`, `context/modules/coupling/stage-1-spec.md`):

1. `applied-load-<case>` — the resolved axial (and engineer-supplied
   radial) load per case, traced back to its source run, and the dynamic
   equivalent load actually computed from it
2. `rating-life-<case>` — basic rating life against the required life
3. `static-safety-check` — governing case's static equivalent load against
   the bearing's own static load rating
4. `speed-check` — operating speed (with correction factor applied when
   triggered) against the bearing's own allowable speed
5. `fit-compatibility` — shaft and housing bound checks
6. `validity-and-assumptions` — which bearing location (fixed-side or
   supported-side) this calculation represents, load-case scope, preload
   amount (reported, not evaluated)

Each formula step cites its registered source revision and exact
page/section; it must not repeat the formula in UI/report code.

## Validity Envelope (Proposed)

- **One support bearing at a time** — the engineer runs this module once
  per bearing location (fixed-side, or supported/floating-side), each with
  its own catalog data and its own applicable check set (the floating-side
  deep-groove bearing has no axial-capacity check; THK's own catalog does
  not print an axial rating for it). Not a combined fixed+floating
  calculation in one run — see "Stage 2 Entry Criteria" item 1.
- **Two-point shaft support only** (matching `screw.end_support_
  arrangement`'s own four values, all two-point). NTN's own three-point
  reaction formulas (item 3 above) are sourced but not implemented.
- **Ball bearings only** (`p = 3` in the life formula) — THK's own support
  units use angular contact and deep-groove ball bearings exclusively in
  the pages read; a roller-type support bearing is out of scope, the same
  restriction `linear-guide 0.1.0` places on roller-type guides.
- **Preload is reported, not evaluated** — see item 4 above.
- **No torsional-resonance check, no 3-point statically-indeterminate
  load derivation, no fit-tolerance-class (h6/h7) verification** beyond a
  simple bound check — see "Purpose" above.
- **Only the `normal` and `peak` load cases**, matching `axis-load-cases
  0.1.0`'s and `ball-screw 0.1.0`'s own scope restriction.

## Evidence Gaps and Verification Confidence

- **Directly read this session, high confidence:** THK's own "Support
  Unit" chapter (printed pages A15-313 through A15-322, via the
  `technico.com` mirror — `tech.thk.com` itself returns HTTP 403 in this
  environment, confirmed again this session) and NTN's own Rolling
  Bearings Handbook chapters 6, 7, 9, 10, and 15 (printed pages 27-38,
  45-53, 67-69), both read directly page-image by page-image.
- **Both gaps closed 2026-08-10.** A full published worked numerical
  example was not found in the 2026-08-09 session: NTN's own handbook
  table of contents lists a dedicated "Bearing Life Calculation Examples"
  section at printed page 84, immediately after the chapters read — but
  both copies fetched that session (`ntnglobal.com` and `ntnamericas.com`,
  the same catalog No. 9012-@/E) are identically truncated after
  "Reference material" (printed page 82/blank 83) and do not contain it.
  THK's own "Examples of Selecting a Ball Screw" chapter (already read and
  reproduced by `ball-screw 0.1.0`'s own `thk-benchmark.ts`) selects a
  screw shaft, nut, and motor but **does not select or size a support
  unit** — confirmed by re-reading that chapter's full text that session
  (`jp.thk.example_ball_screw_selection@bondy-mirror-2026-08-09`, printed
  pages A-740 through A-754). A third NTN Group edition (`ntn-snr.com`)
  was retried 2026-08-10 and is truncated at the identical point (page 83
  is a blank name/address/phone card; page 84 does not exist in this copy
  either) — three independent editions now agree, evidence this is a
  persistent omission from the handbook's own printing, not a one-off
  fetch failure. The search then turned to a different manufacturer: NSK
  Ltd.'s own "Rolling Bearings" catalog (CAT. No. E1102a) has the section
  NTN's is missing — Section 5.7 "Examples of Bearing Calculations"
  (printed pages A34-A36). Examples 1 and 3 both use single-row deep-groove
  ball bearing 6208 (pure radial load, then the same bearing with an added
  axial load) — reproduced through `executeModule` in
  `lib/modules/support-bearing/0.1.0/nsk-reference-examples.ts`/`.test.ts`.
  See `lib/standards/engineering-sources.ts`
  `"jp.nsk.rolling_bearings_catalog@e1102a-2005"`.
- **Independent-benchmark candidate found 2026-08-10, same source.** NSK's
  own worked examples use a formula packaging distinct from NTN's own
  direct `L10 = (C/P)^p` form — a speed factor `fn` and fatigue life
  factor `fh = fn*C/P`, with life read from `Lh = 500*fh^3` (ball bearings)
  — reproduced as a genuinely separate computation in
  `lib/modules/support-bearing/0.1.0/nsk-fh-benchmark.ts`/`.test.ts`, then
  proved algebraically identical to this module's own `resolveNominalLife`/
  `resolveLifeHours` (`(C/P)^3 * 10^6/(60n)`) and asserted to agree to
  floating-point precision — the same "proved identity, not a curve fit"
  treatment `linear-guide`'s own PMI/IKO benchmark comparison received.
  NSK's own two short "Technical Insight" bulletins (`TI Bearing Life.pdf`,
  `P_TI-0102_EN.pdf`), read in the 2026-08-09 session, had already
  corroborated the same formula shape with no numeric disagreement, but
  without a full worked example to reproduce independently — this closes
  that gap with NSK's own full catalog instead.
- **Not resolved: how `C0` (NTN's "basic static load rating") relates to
  THK's own "static permissible load" figure** for the fixed-side support
  unit's own angular contact bearing — THK's own catalog table (A15-318)
  prints "Permissible load (Note: 'Permissible load' indicates the static
  permissible load)" alongside `Ca`, not a value explicitly labeled `C0`.
  These may be the same quantity under different table headings, or THK's
  own "permissible load" may already have a safety margin baked in (the
  way `screw.static_load_rating` and a raw `C0a` differ conceptually
  elsewhere in this project) — needs direct confirmation against THK's own
  terminology-definition pages before a Stage 2 contract can safely treat
  them as interchangeable.
- **Not resolved: whether a US-market source with a full worked example
  exists and is reachable.** NSK's and NTN's own larger catalogs
  (`e1102m.pdf`, `CAT.No.2203/E`) both exceeded this environment's 10 MB
  `WebFetch` fetch limit; Timken's and SKF's own sites were searched
  without finding an accessible full worked example this session. Retry
  with a downloaded-then-locally-read approach (the same workaround that
  succeeded for the two THK catalog PDFs and the NTN handbook in this
  session) before concluding no accessible US-market source exists.

## Stage 2 Entry Criteria

Stage 2 must resolve, with real sources where a manufacturer-specific
convention is involved (not invented here):

1. **Whether `0.1.0` models one support bearing per calculation run**
   (fixed-side or supported-side, engineer's choice) or both bearing
   locations in a single combined calculation. This document proposes the
   former (see "Validity Envelope") because the two bearing types have
   different catalog data shapes and different applicable checks (the
   floating-side bearing has no axial rating), but this is a real design
   choice, not settled by any source read this session.
2. **How the support bearing's own radial load is determined.** No
   released upstream parameter cleanly represents it (unlike axial load,
   which reuses `motion.axis.thrust_force` directly — see "Existing
   Parameter Review"). Candidates: a new required engineer-supplied direct
   input (the pragmatic `0.1.0` choice this document leans toward, the
   same treatment `coupling 0.1.0` gives actual misalignment); or a future
   derivation from the screw shaft's own self-weight and support geometry,
   which would need a released screw-mass parameter this project does not
   have yet.
3. **New `bearing.*` (or an alternative prefix) registry parameters** —
   the full group listed in "Existing Parameter Review" above, plus the
   naming decision itself (`bearing.*` risks future collision with an
   eventual motor-bearing or gearbox-bearing concept; `support_bearing.*`
   is more precise but longer — no released module has needed to choose
   between the two yet).
4. **Whether `X`/`Y` dynamic equivalent-load factors are engineer-supplied
   catalog lookups (this document's proposed default, matching how
   `linear-guide` treats IKO's own `kr`/`ka`) or computed from a contact-
   angle-keyed table this module reproduces itself** — no source read this
   session gives a universal `X`/`Y` table the way `linear-guide`'s own
   IKO source gives one for its own dynamic-equivalent-load factor
   (`context/modules/linear-guide/stage-1-spec.md` item 7's correction);
   NTN's own handbook states the values "are given in the dimensions table
   of the catalog," i.e., are bearing-model-specific and printed by the
   bearing's own manufacturer, not derivable from a general table.
5. **Whether the static-safety-factor minimum is a required input with no
   built-in default** (this document's proposed treatment, per item 2's
   own reasoning above) or whether NTN's own Table 6.4 lower-limit values
   are adopted as a built-in default, a break from every other module's
   own precedent in this project — needs explicit justification if chosen,
   since no second source's own values exist to corroborate NTN's here.
6. **Whether the missing worked-example and independent-benchmark gaps
   (see "Evidence Gaps" above) block Stage 2 from proceeding at all**, or
   whether Stage 2 (parameter contract) and even Stage 3 (compute and
   trace) may proceed in parallel with continued evidence search, the same
   allowance this project's own roadmap already grants at the module
   level (Stage 4 is validation-gated, not Stage 2/3).

## Status

Stage 1 (engineering specification) is done. Stages 2 and 3 followed
(`stage-2-contract.md`; `lib/modules/support-bearing/0.1.0/`, registry
`1.7.0`). The two evidence gaps this document originally recorded above (a
full worked numerical example, and an independent-benchmark candidate) are
both closed as of 2026-08-10 by NSK Ltd.'s own "Rolling Bearings" catalog
— see "Evidence Gaps and Verification Confidence" above and
`lib/modules/support-bearing/0.1.0/validation.ts` for the full Stage 4
record. Production release for Unit 4.6 remains sequentially gated behind
Unit 4.1's Definition of Done regardless of how far this document or a
future package gets (`context/implementation-map.md` Milestone 4 header).
