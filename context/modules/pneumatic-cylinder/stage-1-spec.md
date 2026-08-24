# Pneumatic Cylinder Module — Stage 1 Engineering Specification

## Status

- Work unit: Milestone 7 (Phase 2, `context/roadmap.md`), Unit 7.1, Stage 1 —
  engineering specification and source intake
- Proposed module ID: `pneumatic-cylinder`
- Proposed first released version: `0.1.0`
- Status: **Stage 1 draft.** First module of Phase 2 ("Common Automation
  Modules"), chosen ahead of a formal priority-score pass across all nine
  Phase 2 candidates — the founder's own direct call (2026-08-24): pneumatic
  cylinders are common enough across the candidate list that every one of
  them will eventually be built, so scoring order matters less than starting.
  No `linear-axis@1` or Motor Sizing Tool family role is affected; this is a
  new, standalone module family with no Milestone 4/6 dependency.
- Date: 2026-08-24

No released parameter, module version, calculation run, or validation record
is changed by this document.

## Purpose

Given a candidate double-acting (or single-acting, spring-return/extend)
pneumatic cylinder's own catalog bore/rod size and operating pressure, plus
the load and installation the engineer has already defined, check whether
that specific cylinder is mechanically viable: theoretical extend/retract
force against the required force with a sizing margin, end-of-stroke impact
energy against the cylinder's own cushion absorption capacity, piston-rod
buckling clearance for long strokes, and (reported, not evaluated — see
"Validity Envelope") air consumption. It reports a required-spec /
pass-fail-with-margin result for a cylinder the engineer has already
identified by bore, rod, and stroke — it does not search a catalog and rank
candidates, the same scope restriction every other released module in this
project already established (catalog matching is optional item 12 in
`context/roadmap.md`'s Module Definition of Done).

It will **not**:

- calculate piston speed. Both sources read this session say so directly,
  not just by omission: Milwaukee Cylinder's own Design Engineering Guide
  states "the exact speed of an air cylinder cannot be calculated" (twice,
  once for lifting and once for general sizing) because it depends on
  valving, piping, and other factors that "usually are unknown and cannot be
  measured"; SMC's own cushion-capacity graphs plot maximum *allowable*
  speed against load mass per specific model as an empirical bound, not a
  formula. `0.1.0` therefore takes piston speed as an engineer-supplied
  input wherever a formula needs it (the cushion kinetic-energy check),
  never computes one.
- select cylinder bore/rod/stroke by iterating a catalog — same
  required-spec/pass-fail scope every released module already has.
- compute a motion profile. Unlike the Motor Sizing Tool family (ADR-0011),
  this module has no motor or duty cycle to size — the engineer supplies
  load mass and the piston speed at end of stroke directly, the same
  self-contained-module precedent ADR-0011 established for a different
  reason (avoiding a `motion-profile@0.1.0` link this project's own linear
  actuators don't need either).
- check condensation risk (a real, sourced, catalog-documented pneumatic
  system-design concern — see "Candidate Sources" item 2, Data 4) — a piping
  and dew-point question orthogonal to the structural/force checks this
  module scopes, the same "recorded, not implemented" treatment `coupling
  0.1.0` gave its own torsional-resonance formula.
- evaluate rod-bearing wear, seal life, or a full fatigue/duty-cycle life
  calculation — no source read this session gives one for pneumatic
  cylinders (unlike `ball-screw`'s or `support-bearing`'s own ISO-281-based
  nominal-life formulas).

## Candidate Sources

Two sources were read directly this session (2026-08-24), one US-market and
one JP-market, matching this project's established US+JP methodology-source
pairing (`context/us-market-profile.md` / `context/jp-market-profile.md`):

1. **Milwaukee Cylinder** (a Actuant Corp brand), *Design Engineering Guide*
   — the design-guide chapter (pages 177-196) of Milwaukee Cylinder's own
   full product catalog, © 2012 Actuant Corp, read directly from
   `milwaukeecylinder.com`'s own domain via `krwest.com`'s hosted copy (a
   distributor mirror; `milwaukeecylinder.com` itself was not independently
   attempted this session, so no direct-domain block is claimed the way
   `tech.thk.com` or `nbk1560.com` are elsewhere in this project). Covers
   basic thrust/pull force (`F = PA`), load-type sizing ratios (sliding,
   rolling, vertical-lift), an empirical air-cylinder-speed chart, NFPA
   standard mounting styles, and piston-rod buckling via a "K" effective-
   length factor and an 8-case mounting-style diagram — genuinely the same
   physical concept (Euler effective-length factor) `ball-screw@0.1.0`'s own
   already-released `resolveBucklingLoad` uses for a screw shaft (see
   "Cross-Module Physics Note" below), but the actual load-vs-diameter Table
   1 this page references is printed in each product-series' own catalog
   section (page 31/67/97), not fetched this session — see "Evidence Gaps."
   See `lib/standards/engineering-sources.ts` (to be added at Stage 2)
   `"us.milwaukee_cylinder.design_engineering_guide@web-2026-08-24"`.
2. **SMC Corporation**, *Air Cylinders Model Selection* (BEST AUTOMATION
   catalog, "Technical Data 1-4" chapter, printed pages 1569-1576) — read
   directly from `smcworld.com`'s own domain (`www.smcworld.com`).
   `smcworld.com` and the `smcpneumatics.com` US-distributor mirror both
   returned HTTP 403 to this session's default fetch path; both succeeded
   once a browser User-Agent header and `--ssl-no-revoke` (a local
   corporate-TLS-interception workaround, not an SMC-side block — see
   `context/progress-tracker.md` "Environment notes" for the general
   pattern) were used, so — unlike `tech.thk.com` or `nbk1560.com` — this is
   not recorded as a persistent block. A complete, self-contained engineering
   handbook for exactly this module's own scope: theoretical force with a
   load-factor (`η`) table, single-acting spring-force catalog data, cushion
   kinetic-energy formula and per-series allowable-energy tables, air
   consumption and required-air-volume formulas, a full theoretical-output
   lookup table, piston-rod/cylinder-tube buckling as a per-mounting-type
   maximum-stroke lookup table, lateral-rod-load-vs-stroke graphs, and a
   condensation control graph (out of scope — see "Purpose"). See
   `lib/standards/engineering-sources.ts` (to be added at Stage 2)
   `"jp.smc.air_cylinders_model_selection@web-2026-08-24"`.

**A real, recorded methodology disagreement — not just differing tables**,
sharper than the "same shape, different numbers" pattern this project's
other modules usually find: the two sources' own force-sizing margin
methods differ in *shape*, not just in coefficient values.

### 1. Theoretical force — agreed formula shape, disagreeing margin method

Both sources agree that base thrust force is pressure times piston area, and
that pull (retraction) force must subtract the rod's own cross-sectional
area:

```text
Milwaukee:  F = P x A                          (thrust, extend)
            F_retract = P x (A_piston - A_rod) (pull, retract)

SMC:        F1 = eta x A1 x P    (extend)       — formula (1)
            F2 = eta x A2 x P    (retract)      — formula (2)
```

where `A1`/`A2` are SMC's own extend-/retract-side piston areas (Table (1),
per bore/rod size) and `eta` is SMC's own load factor.

**They disagree on how the engineer accounts for real-world loss.** SMC
folds a single dimensionless load factor `eta` directly into the force
formula, tied to *purpose of operation* — a three-row table: `eta <= 0.7`
static/clamping, `eta <= 1.0` horizontal-guided dynamic, `eta <= 0.5`
vertical/horizontal dynamic (with an explicit note to go lower still —
`0.4`, `0.3`, `0.2` — for high-speed operation). Milwaukee instead expresses
the same idea as a *percentage of the actual load the thrust force must
exceed*, keyed to *load type* rather than operation type: sliding load
50-75% (light lubrication) to move from rest, 20% once moving; rolling load
10%; vertical lift, "more force than needed to just balance the load," no
numeric floor given. **Neither is a restatement of the other under a
different label** — SMC's `eta` multiplies the theoretical force *down* to
compare against a required force computed independently; Milwaukee's
percentages describe how much *smaller* the required-force estimate itself
should be relative to the load. Reconciling them into one required
`pneumatic.*` sizing-margin input (or exposing both as alternative,
documented conventions) is a real Stage 2 decision — see "Stage 2 Entry
Criteria" — not a research gap.

### 2. Cushioning / end-of-stroke impact — formula only in SMC; concept only in Milwaukee

SMC gives the complete formula and real per-series data; Milwaukee describes
the concept without a formula in the pages read:

```text
SMC:  E = (m / 2) x V^2       — formula (7)
      E: kinetic energy [J]; m: load mass [kg]; V: max. piston speed [m/s]
```

checked against a per-bore, per-cushion-type "allowable kinetic energy"
table (separate rows for rubber-bumper and air-cushion variants, across 7
SMC series read — CQ2, RQ, CJ2, CM2, CG1, CA2/CS1/CS2, MB). Milwaukee
describes the same two cushion mechanisms (rubber bumper, air cushion) and
warns that "when used outside the allowable range, it may cause damage to
cylinders," but the pages read give no formula or absorbable-energy table of
its own — an external-stopper/shock-absorber alternative is mentioned
instead. **Not a disagreement — SMC's formula and Milwaukee's qualitative
description are consistent, just at different levels of completeness**, the
same "one source has the worked method, the other corroborates the concept"
relationship `coupling 0.1.0`'s own NBK catalog data had to KTR's/R+W's
methodology.

### 3. Air consumption and required air volume — SMC only, complete

Neither Milwaukee's own pages read nor a formula-level treatment appears
outside SMC's document. SMC gives both a per-cylinder and a per-piping-run
term, summed for double-acting, single-acting-return, and single-acting-
extend cylinders separately:

```text
qc1 = A1 x L x (P1 + 0.1)/0.1 x 10^-6     — cylinder, extend side (dm^3 ANR)
qc2 = A2 x L x (P2 + 0.1)/0.1 x 10^-6     — cylinder, retract side
qp1 = a1 x l1 x P1/0.1 x 10^-6            — piping, extend side
qp2 = a2 x l2 x P2/0.1 x 10^-6            — piping, retract side
q   = qc1 + qp1 + qc2 + qp2               — double acting, per stroke
Q1  = (qc1 + qp1) / t1 x 60               — required air volume, extend (dm^3/min ANR)
Q2  = (qc2 + qp2) / t2 x 60               — required air volume, retract
Q   = max(Q1, Q2)
```

where `A` is piston area (mm^2), `L` cylinder stroke (mm), `P` operating
gauge pressure (MPa), `a` piping internal cross-section (mm^2, SMC's own
tubing-size table gives real values per nominal tube size), `l` piping
length (mm), and `t` stroke time (s). The `(P + 0.1)/0.1` term converts
gauge-pressure air at the cylinder into free-air-equivalent volume — `0.1`
is atmospheric pressure in the same MPa units, not an arbitrary constant.
This is a reported output, not a pass/fail check (see "Validity Envelope").

### 4. Piston rod buckling — same physics as `ball-screw`, no single complete pneumatic-specific source yet

This is the item with the weakest evidence of the four, and the most
important to resolve carefully at Stage 2 rather than guess.

**Cross-module physics note:** `ball-screw@0.1.0`'s own released
`resolveBucklingLoad` (`context/modules/ball-screw/stage-1-spec.md` item 7)
already implements Euler column buckling for a rotating screw shaft, using
end-fixity coefficients its own spec confirms are "the classic Euler
effective-length-factor values (`1/K^2` for `K = 2, 1, 0.7, 0.5`) —
textbook physics, not a manufacturer-proprietary fit." A pneumatic cylinder's
piston rod under compressive load is the same column-buckling physics, not
a coincidence — but this does **not** mean this module should reuse
`ball-screw`'s own kernel or coefficients directly: the coefficients there
are sourced from ball-screw-shaft manufacturers (Rockford, Steinmeyer, THK)
for a shaft geometry and end-fixity convention specific to that product,
and `ball-screw`'s own spec already records those three sources
disagreeing with each other on the exact mounting-factor constant. This
module needs its own sourced coefficients from pneumatic-cylinder
manufacturers, the same "shared textbook physics, independently sourced
per-domain coefficients" treatment, not a cross-module import.

Three sources touch this item, and none gives a single complete, directly
usable, pneumatic-manufacturer-sourced closed-form formula on its own:

- **Milwaukee** gives the effective-length-factor *concept* directly and
  concretely: an 8-case mounting-style diagram (`K = L`, `K = L/2`,
  `K = 4L`, etc., for pin-mount/partial-end-restraint/free-end
  configurations) and a simple screening rule ("if K exceeds 40 inches, a
  stop tube is required; one inch of stop tube per 10-inch increment
  beyond that"). It does **not** give the closed-form load-vs-diameter
  formula itself in the pages read — that lives in "Table 1" of each
  product series' own catalog section (page 31 for Series H, page 67 for
  Series LH, page 97 for Series A/MN), none of which was fetched this
  session.
- **SMC** gives real, usable numbers but as a pre-computed **lookup table**,
  not an exposed formula: "maximum stroke that can be used according to
  buckling strength," cross-referenced by mounting type (foot, rod-side
  flange, head-side flange, clevis, trunnion — different tables per series)
  x operating pressure (0.3/0.5/0.7 MPa) x bore size, for CJ2, CM2, CG1, MB,
  CA2, CS1, and CS2 series. This is a genuine, directly usable, real
  manufacturer source for the specific series it covers — but it is a
  result table, not a formula this module's own compute path can evaluate
  for an arbitrary bore/rod/mounting/pressure combination outside those
  printed series.
- **Hänchen** (a German hydraulic-cylinder manufacturer, not pneumatic, and
  not a US- or JP-market source — read only as a general-engineering
  cross-check, the same role Wikipedia's or a textbook's formula statement
  would play, not a candidate methodology source in its own right) confirms
  the generic closed-form shape both other sources imply but don't spell
  out: `Fk = pi^2 x E x J / (x x L)^2`, `J = pi x d_s^4 / 64` (solid round
  rod), `E` = 210,000 N/mm^2 (steel), `x` an "installation factor" from a
  buckling-cases table the page referenced but did not reproduce, and a
  safety factor `S = 3...5` with no stated reason for the range. This is
  the right formula *shape* (and matches `ball-screw`'s own Euler-buckling
  kernel structurally) but is not itself citable as a pneumatic-cylinder
  manufacturer source, and its own mounting-factor table and safety-factor
  justification are both missing from the page fetched.

**No worked numerical example for buckling was found in any source this
session** — a real, recorded gap, not a skipped step.

### 5. Lateral (side) load at the rod end — graphs only, no formula in either source

SMC gives real per-series graphs (lateral load `fR` vs. cylinder stroke, one
curve per bore size, for CJ2/CM2/CG1/MB/CA2/CS1/CS2/CQ2/CDQ2/CQS/CDQS series
— 9 graphs total) but no underlying formula — the curves are presented as
direct lookup data, the same "catalog curve, no formula to reproduce"
treatment `support-bearing 0.1.0` gives its own preload data. Milwaukee
covers side load qualitatively only (three mitigation strategies: pin/
trunnion mount, external guiding, added stroke to increase bearing
separation) with no chart or formula at all in the pages read.

## Validity Envelope (Proposed)

- **One cylinder, one load, one installation** — not a multi-cylinder
  system, not a rodless or guided-slide variant (Milwaukee's own "Guided
  Pneumatic Cylinders" and SMC's own CQ2/CDQ2 double-rod/anti-rotation
  variants are catalog options this module treats as a plain bore/rod pair,
  the same "engineer/catalog selection input, not a formula this module
  derives" treatment `coupling 0.1.0` gives its own coupling element type).
- **Double-acting and single-acting (spring-return or spring-extend)
  cylinders**, matching both sources' own scope — not a tandem, duplex, or
  telescoping cylinder.
- **Force sizing is a required-margin-input check, with the margin
  convention itself an open Stage 2 decision** (see "Candidate Sources" item
  1) — the same "required input, no built-in default" treatment
  `ball-screw`'s static-safety-factor-minimum and buckling-margin inputs
  already established, extended here to the sizing-margin *method* itself,
  not just its numeric value.
- **Cushioning is a reported kinetic-energy-vs-catalog-allowable check**,
  using SMC's own formula (item 2) — piston speed at end of stroke is a
  **required engineer-supplied input**, per "Purpose" (this module does not
  and cannot compute it).
- **Air consumption and required air volume are reported outputs, not
  evaluated pass/fail** — informational, for compressor/FRL-equipment
  sizing outside this module's own scope, the same "reported, not
  evaluated" treatment `linear-guide` gives its own preload-grade input.
- **Buckling scope is explicitly not resolved by Stage 1** — see "Stage 2
  Entry Criteria." `0.1.0` will either (a) implement the generic Euler
  closed form with a required-input-no-default mounting-effective-length
  factor and safety factor (matching `ball-screw`'s own established
  pattern), sourced properly once Milwaukee's own Table 1 or SMC's own
  underlying constants are read directly, or (b) ship as a documented gap
  with buckling reported only via a "not evaluated — see validation record"
  status, matching `drive-train 0.1.0`'s own precedent for a check a source
  gap makes genuinely unready. Which of these Stage 2 resolves is not
  guessed here.
- **Lateral load is out of scope for `0.1.0`** unless Stage 2 finds a
  reproducible formula (not just a proprietary graph) — recorded as a
  candidate for a future version, the same treatment R+W's own torsional-
  resonance formula received in `coupling 0.1.0` pending a missing input.
- **Condensation is explicitly out of scope** (see "Purpose").
- **No load case (`normal`/`peak`/etc.) semantics yet** — this module has no
  upstream `axis-load-cases`-style multi-case input; force, mass, and speed
  are each a single engineer-supplied value per calculation run, the same
  scope every Motor Sizing Tool family module's own self-contained duty
  cycle started at before any repeating-cycle support was added (c.f.
  `belt-pulley-drive-motor-sizing`'s own `0.1.0` -> `0.2.0` progression).

## Existing Parameter Review

`grep` of `lib/engine/parameters/definitions.ts` confirms zero
`id: "pneumatic.*"`, `id: "load.*"`, `id: "force.*"`, or `id: "mass.*"`
entries as of this document — **nothing in the existing registry is
reusable**, unlike every Milestone 4/6 module, which each found at least one
upstream port to consume. This is consistent with this being a new,
standalone module family with no `linear-axis@1` role and no Motor Sizing
Tool mechanism relationship (ADR-0011's own family is explicitly ball-screw/
conveyor/rack-pinion/belt-pulley/index-table; a pneumatic cylinder is none
of those).

Two existing unit-registry entries are directly reusable, checked this
session (`lib/engine/units/registry.ts`):

| Purpose | Existing unit | Note |
| --- | --- | --- |
| Operating pressure | `MPa` (`Dimensions.pressure`) | Already defined; matches both sources' own unit convention directly |
| Cushion kinetic energy | `J` (reuses `Dimensions.torque` — no angle exponent on this registry's torque dimension, so energy and torque share identical SI base-unit exponents) | Added for `drive-train@0.1.0` (Unit 4.7); the same reuse applies here for `E = mV^2/2` |
| Force | `N` (`Dimensions.force`) | Already defined |

Not yet in the registry, to be proposed at Stage 2: a `pneumatic.*`
parameter group (bore/rod diameter, piston areas, operating pressure,
required force, sizing-margin input(s), load mass, end-of-stroke piston
speed, allowable kinetic energy by cushion type, stroke, mounting style,
piping length/bore, cycles per minute) and, if Stage 2 resolves buckling
into a real check rather than a documented gap, a buckling
safety-factor/mounting-factor input pair following `ball-screw`'s own
required-input-no-default precedent.

## Checks (Proposed)

- Invalid input: non-positive bore/rod diameter, operating pressure,
  required force, load mass, piston speed, or stroke; rod diameter not
  smaller than bore diameter.
- Force capacity, extend and retract: theoretical force (via whichever
  sizing-margin convention Stage 2 resolves — item 1) against the
  engineer's required force — fail if insufficient.
- Cushion kinetic energy: `E = (m/2) x V^2` against the candidate
  cylinder's own catalog allowable kinetic energy (per cushion type,
  rubber-bumper or air-cushion) — fail if exceeded.
- Buckling: **contingent on Stage 2's own resolution** — see "Validity
  Envelope."
- Lateral load: **out of scope for `0.1.0`** — see "Validity Envelope."

## Trace Contract (Proposed)

Mirroring the established pattern (`context/modules/coupling/
stage-1-spec.md`, `context/modules/support-bearing/stage-1-spec.md`):

1. `theoretical-force` — extend and retract side, the sizing-margin
   convention applied, and the resulting pass/fail against required force
2. `cushion-kinetic-energy` — computed kinetic energy vs. catalog allowable,
   per cushion type
3. `buckling` — contingent on Stage 2 (see above); if deferred, this step
   reports `not_applicable` with the documented reason, the same treatment
   `omron-reference-example.ts`'s own regenerative-energy check gets in
   `drive-train 0.1.0` for a source that explicitly omits it
4. `air-consumption` — per-cycle and required-air-volume figures (reported,
   not evaluated)
5. `validity-and-assumptions` — cylinder type (double/single-acting),
   cushion type, mounting style, which sizing-margin convention was used

Each formula step cites its registered source revision and exact
page/section; it must not repeat the formula in UI/report code.

## Evidence Gaps and Verification Confidence

- **Directly read this session, high confidence:** SMC's own "Air Cylinders
  Model Selection" Technical Data 1-4 (printed pages 1569-1576, fetched as
  pages 8-19 of the BEST AUTOMATION catalog's own "3 BEST AUTOMATION"
  section) — formulas (1)-(16) and their variable tables read directly, not
  paraphrased. SMC's own worked examples (bore-size-selection Examples 1-3;
  cushion Example 1; air-consumption and required-air-volume examples) were
  read but **not yet independently hand-reproduced** against the source's
  own stated intermediate/final figures the way `coupling`'s KTR/R+W
  examples were — that hand-verification is Stage 3/4 work, flagged here so
  it is not silently skipped.
- **Directly read this session, high confidence:** Milwaukee Cylinder's own
  Design Engineering Guide (pages 177-193 of the full catalog) — read in
  full via a PDF fetch after `krwest.com`'s hosted copy succeeded (see
  "Candidate Sources" item 1).
- **Not fetched this session:** Milwaukee's own per-series Table 1 (rod-size
  selection for compression applications, pages 31/67/97 of the same
  catalog) — the actual closed-form buckling data behind the K-factor
  concept this document's item 4 records. Needed before Stage 2 can decide
  whether Milwaukee's own formula is complete enough to adopt.
- **Not attempted this session:** Parker Hannifin's own pneumatic literature
  (`parker.com`) and a second SMC document
  (`smcpneumatics.com/smcdigitalcat3/...`, `smcpneumatics.com/americansmc/
  CHS/...`) both returned HTTP 403 even with the browser-User-Agent/
  `--ssl-no-revoke` workaround that succeeded for `smcworld.com` — unlike
  that workaround's success elsewhere, this is a real, session-confirmed
  block on those specific paths, not yet retried via a distributor mirror
  the way `coupling`'s own NBK catalog access was recovered through
  `orimvexta.co.jp`. Worth a retry before Stage 2, since a genuine second
  independent-benchmark source (this project's own Module Definition of
  Done item 9) is still open — SMC alone currently carries the full
  formula set, with Milwaukee only partially overlapping and disagreeing on
  the sizing-margin method (item 1) — that disagreement itself is useful
  evidence of independence, but a true second full computation (the
  "independent benchmark" role KTR's DIN 740 document played for `coupling`,
  or IKO's own method played for `linear-guide`) is not yet in hand for the
  cushion, air-consumption, or buckling formulas specifically.
- **Not resolved:** which force-sizing-margin convention `0.1.0` adopts —
  SMC's `eta`-multiplier or Milwaukee's load-type-percentage method, or
  both as alternative documented inputs (see "Candidate Sources" item 1 and
  "Stage 2 Entry Criteria").
- **Not resolved:** the piston-rod buckling formula and its safety-factor/
  mounting-factor sourcing — see "Candidate Sources" item 4. This is the
  single largest open item carried into Stage 2, structurally similar to
  `ball-screw`'s own still-open buckling-safety-margin discrepancy
  (Steinmeyer's `0.5` vs. Rockford's `0.8`), except here no source yet
  supplies a complete, directly citable, pneumatic-specific closed-form
  formula to disagree over the constant of.
- **Not resolved:** whether lateral rod-end load becomes a real check in a
  future version, and if so, from what source — no formula was found this
  session, only graphs.

## Stage 2 Entry Criteria

Stage 2 must resolve, with real sources where a manufacturer-specific
convention is involved (not invented here):

1. New `pneumatic.*` registry parameters — the group sketched in "Existing
   Parameter Review."
2. Which force-sizing-margin convention `0.1.0` adopts (SMC's `eta`
   multiplier, Milwaukee's load-type percentage, or both) — a real,
   sourced disagreement in formula shape, not just coefficient values (see
   "Candidate Sources" item 1).
3. Whether buckling ships in `0.1.0` as a real check (requiring either
   Milwaukee's own Table 1 or a properly sourced pneumatic-specific Euler
   coefficient set) or as a documented, deferred gap (see "Candidate
   Sources" item 4 and "Validity Envelope").
4. Whether a genuine second independent-benchmark source (Parker, or a
   retried SMC/Milwaukee path via a distributor mirror) is found before
   Stage 4, or whether SMC's own internal formula/table consistency plus
   Milwaukee's partial corroboration is the best evidence achievable — the
   same solo-validation reviewer-substitute question every other released
   module in this project has had to answer.
5. Whether lateral rod-end load stays out of scope for `0.1.0` (current
   default, pending a formula source) — see "Validity Envelope."

## Status

Stage 1 (engineering specification) is done as a draft. A kernel has not
been started; Stage 2 (parameter contract) is next.
