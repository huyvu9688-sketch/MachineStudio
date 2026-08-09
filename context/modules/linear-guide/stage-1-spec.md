# Linear Guide Module — Stage 1 Engineering Specification

## Status

- Work unit: Unit 4.4, Stage 1 — engineering specification and source intake
- Proposed module ID: `linear-guide`
- Proposed first released version: `0.1.0`
- Status: **Stage 1 draft.** Written as the next module in the roadmap's own
  Phase 1B order (Ball screw → Linear guide → Coupling → Support bearings),
  in parallel with Unit 4.1's continued evidence wait, per
  `context/ai-workflow-rules.md` ("Specification and source research may
  occur in parallel, but production release remains sequentially
  validation-gated") and `context/implementation-map.md` Milestone 4
  header — the same allowance already used for `motion-profile` (Unit 4.2)
  and `ball-screw` (Unit 4.3). Production release for Unit 4.4 remains
  sequentially gated behind Unit 4.1's Definition of Done regardless of how
  far this document or a future package gets.
- Date: 2026-08-09

No released parameter, module version, calculation run, or validation record
is changed by this document.

## Purpose

Given a candidate linear guide's own catalog rating data (basic dynamic and
static load ratings, static moment ratings) plus the axial/lateral load
cases and installation geometry, check whether that specific guide is
mechanically viable for the axis: distribute an applied force/moment across
the guide's rolling-element blocks, compute each block's equivalent load,
check static safety under the required load, and compute fatigue (nominal)
life against the duty cycle. It reports a required-spec / pass-fail-with-
margin result for a guide the engineer has already identified by rail size
and block arrangement — it does not search a catalog and rank candidates,
matching the same scope restriction `ball-screw 0.1.0` already established
(`context/modules/ball-screw/stage-1-spec.md` "Purpose"; catalog matching is
optional item 12 in `context/roadmap.md`'s Module Definition of Done).

It will **not**:

- select a ball-screw, coupling, support bearing, servo motor, gearbox, or
  drive/amplifier (Units 4.3, 4.5, 4.6, 4.7);
- resolve the axis-level applied force/moment from payload mass, motion
  timing, and external process loads — that is `axis-load-cases`' (Unit
  4.1) job. This module takes a resolved force/moment at the guide
  reference point as its input, the same way `ball-screw 0.1.0` takes a
  resolved `motion.axis.thrust_force` rather than re-deriving gravity and
  friction (`context/modules/ball-screw/stage-1-spec.md` "Purpose").

## A Real, Already-Documented Dependency Gap — RESOLVED 2026-08-09

`axis-load-cases 0.1.0`'s own Stage 1 spec already anticipated this module
by name. Its coordinate-convention item 6 states: "The center-of-mass
offset is `[rx, ry, rz]` from the guide/carriage reference point. The
gravity-induced moment is `M_g = r_cm x F_g`; an external moment is then
added in the same frame. **The module reports the resulting moment but does
not distribute it to guide blocks.**" (`context/modules/axis-load-cases/
stage-1-spec.md` "Proposed Coordinate and Sign Convention" item 6, emphasis
added.) Its Stage 2 contract's "Deferred Decisions and Release Gates" item 1
was even more direct: "no downstream module consumes a resolved moment yet
(**the guide module, Unit 4.4, is not built**), so `0.1.0` reports resolved
force/moment in the calculation trace only... and defers a canonical output
parameter to whichever later module first needs to consume it as a
machine-readable port" (`context/modules/axis-load-cases/
stage-2-contract.md`, emphasis added).

That module is now this one, and the gap is now closed. `axis-load-cases
0.1.0`'s kernel (`lib/modules/axis-load-cases/0.1.0/math.ts`) already
computed `resultantAppliedForceN` and `resultantAppliedMomentNm` (full
3-component `axis.v1` vectors, per case) internally and reported them in
the calculation trace, but exposed neither as a released output port — only
the axial (`+X`) component reached a port, as `motion.axis.thrust_force`.
Registry `1.4.0` (2026-08-09) adds `motion.axis.resultant_force` and
`motion.axis.resultant_moment` (both `vector_quantity`, per case) as new
output ports on `axis-load-cases 0.1.0`'s still-unregistered draft, built
from the same already-computed kernel values — see
`lib/modules/axis-load-cases/0.1.0/README.md` "Resultant force/moment
output ports (2026-08-09)" and `context/modules/axis-load-cases/
stage-2-contract.md` "Deferred Decisions and Release Gates" item 1. This
module can now link to those two ports directly, the same way `ball-screw`
already links to `motion.axis.thrust_force`, instead of re-deriving the
resolution itself (option 2 in the original "Existing Parameter Review"
below is no longer needed).

Note precisely what `resultant_force` includes: gravity, friction,
guide-resistance, **and** external force — not gravity and external force
alone. The friction and guide-resistance terms are purely axial (`+/-X`,
opposing travel; `axis-load-cases 0.1.0`'s own `resistanceForce` helper
never produces a `Y`/`Z` component), so this module's own use of the
transverse (`Y`, `Z`) load components is unaffected either way — but a
future kernel must not assume the `X` component is axial thrust alone.

## Candidate Sources

Two independent linear-guide manufacturer catalogs were read directly this
session (2026-08-09):

1. **PMI (Precision Motion Industries, Inc.)**, *Linear Guideway* catalog —
   found via a third-party Australian distributor mirror
   (`bearing.net.au`; not independently attempted against `pmi-amt.com`'s
   own domain this session, so no direct-domain block is claimed the way
   `thk.com` is elsewhere in this project). A single, internally consistent
   ~40-page technical chapter (printed pages B4-B40) covering load rating,
   nominal life, working-load-per-block distribution for five installation
   types, equivalent load, mean load under varying loads, a full worked
   numerical example with a real model, accuracy grades, and preload
   selection. See `lib/standards/engineering-sources.ts`
   `"us.pmi.linear_guideway_catalog@bearing-net-au-mirror-2026-08-09"`.
2. **IKO (Nippon Thompson Co., Ltd.)**, *Linear Way / Linear Roller Way*
   catalog 1560E (excerpt) — read directly from IKO's own domain
   (`ikont.com`), no mirror needed. Explicitly states compliance with **ISO
   14728-1** (basic dynamic load rating) and **ISO 14728-2** (basic static
   load rating) — the first time this project has found a direct, printed
   ISO citation for a load-rating/life standard rather than only a
   WebSearch-synthesized paraphrase (contrast
   `context/modules/ball-screw/stage-1-spec.md` item 4's ISO 3408-5
   treatment, never directly read). See `lib/standards/
   engineering-sources.ts` `"jp.iko.linear_way_catalog@1560e"`.

Both sources agree on the life-formula shape and the distance-km life
basis (not revolutions — unlike `ball-screw`'s screw-life-basis ambiguity,
this is not a point of disagreement here); they disagree on the equivalent-
load formula's exact complexity and on the static-safety-factor standard
value ranges. Both disagreements are recorded below, not resolved — the
same treatment `ball-screw`'s buckling-constant and equivalent-load
discrepancies received.

### 1. Basic dynamic and static load ratings (`C`, `C0`) — definitional

Both sources define these identically in substance: `C0` (basic static
load rating) is the static load in a given direction at which the sum of
permanent deformation between raceway and rolling elements reaches
`0.0001` times the rolling-element diameter, at the most-stressed contact
point. `C` (basic dynamic load rating) is the load a group of identical
guides can withstand for the rated life. IKO states these comply with ISO
14728-2 and ISO 14728-1 respectively; PMI does not cite ISO by number but
describes the identical `0.0001`-times-diameter criterion for `C0`
(PMI Section 4.1) and an analogous life-based definition for `C`
(PMI Section 4.4). These are catalog/data-sheet values for the specific
guide, not derived by this module — the same treatment `ball-screw` gives
`Ca`/`C0a`.

### 2. Static permissible/rated moment (`M0`, or `T0`/`Tx`/`Ty`)

Both sources define an analogous static moment rating in three directions
— PMI calls them `MP`/`MY`/`MR` (pitching/yawing/rolling, matching the same
three-direction convention `context/modules/motion-profile/
stage-1-spec.md`'s cited Oriental Motor moment-load material already uses
for a different module); IKO calls them `T0`/`TX`/`TY`. Both are catalog
values for the specific guide, at the same `0.0001`-times-rolling-element-
diameter deformation criterion as the static load rating.

### 3. Static safety factor (`fs`)

Both sources: `fs = C0 / P0` (or the moment equivalent, `fs = M0/M` or
`fs = T0/M0`), where `P0`/`M0` is the applied static (or static-equivalent)
load. **Both publish a standard-values table by operating condition — a
real, sourced minimum, unlike `ball-screw`'s unresolved static-safety-
factor-minimum gap** (`context/modules/ball-screw/stage-1-spec.md` item 6).
The two tables disagree in exact range but agree in order of magnitude and
shape (higher for shock/vibration than for smooth operation):

| Source | Condition | `fs` range |
| --- | --- | --- |
| PMI (regular industrial machine) | Normal loading | `1.0 - 1.3` |
| PMI (regular industrial machine) | Impact and vibration | `2.0 - 3.0` |
| PMI (machine tool) | Normal loading | `1.0 - 1.5` |
| PMI (machine tool) | Impact and vibration | `2.5 - 7.0` |
| IKO (Linear Way / ball type) | Normal operating conditions | `1 - 3` |
| IKO (Linear Way / ball type) | High operating performance | `2 - 4` |
| IKO (Linear Way / ball type) | Operation with vibration/shock | `3 - 5` |
| IKO (Linear Roller Way / roller type) | Normal operating conditions | `2.5 - 3` |
| IKO (Linear Roller Way / roller type) | High operating performance | `3 - 5` |
| IKO (Linear Roller Way / roller type) | Operation with vibration/shock | `4 - 6` |

Not reconciled into one number here — a future package would either accept
this as an engineer-supplied required input (the same resolution
`ball-screw 0.1.0` used when no single confirmed minimum existed) or expose
both tables for the engineer to choose from. IKO's table additionally
splits ball-type and roller-type guides into separate ranges (roller
consistently higher), which PMI's table does not do explicitly.

### 4. Basic dynamic load rating and nominal life (`L`)

Both sources agree on formula shape and life basis (**distance in km, not
revolutions**):

```text
PMI:  Ball   L = (fH*fT/fW * C/P)^3   * 50     [km]
      Roller L = (fH*fT/fW * C/P)^(10/3) * 100 [km]

IKO:  Linear Way        L = 50 * (C/P)^3       [10^3 m = km]
      Linear Roller Way L = 50 * (C/P)^(10/3)  [km]
```

Structurally identical (cubic exponent for ball, `10/3` for roller;
`50`/`100`x`10^3 m` basis) — PMI's version additionally applies hardness
(`fH`), temperature (`fT`), and load (`fW`) correction factors to `C`/`P`
before the exponent; IKO applies only a load factor (`fW`) directly to `P`
in its own equivalent-load computation upstream (see item 6 below) rather
than as a separate multiplier here. This is the same kind of "two sources
agree on the base shape, differ on which correction factors they fold in
where" relationship `axis-load-cases` already treats as normal (see that
module's own THK-vs-Atlanta benchmark treatment). Both express life in
distance (km), matching how a linear guide physically wears (rolling
distance along the rail), not revolutions — this makes the `ball-screw`
life-basis conversion problem inapplicable here, not merely undocumented.

Time-based life follows directly from stroke length and reciprocation
rate — both sources give algebraically identical conversions:

```text
PMI: Lh = L * 10^3 / (2 * ls * n1 * 60)   [hours; ls = stroke length (m), n1 = cycles/min]
IKO: Lh = 10^6 * L / (2 * S * n1 * 60)    [hours; S = stroke length (mm), L in 10^3 m]
```

(The apparent `10^3` vs `10^6` difference is a unit-of-`S`-and-`L`
bookkeeping difference, not a formula disagreement — PMI's `ls` is in
meters, IKO's `S` is in millimeters, and both `L` figures are already in
the same km-equivalent basis.)

Correction-factor tables (PMI): hardness factor `fH` (`1.0` when raceway
hardness meets the guide's own spec — the PMI catalog states its own
guideways meet this, so `fH = 1.0` for PMI parts); temperature factor `fT`
(degrades above 100°C, `1.0` at or below); load factor `fW` (`1.0-1.2`
smooth, `1.2-1.5` normal, `1.5-2.0` moderate impact, `2.0-3.5` strong
impact/vibration, keyed to operating speed). IKO's own load-factor table
(its Table 1) uses the same three-tier shape (`1-1.2` smooth, `1.2-1.5`
normal, `1.5-3` shock) without PMI's speed-keyed thresholds.

### 5. Mean load under a varying duty cycle (`Pm`)

Both sources give the same weighted-load formula, matching the shape
`ball-screw`'s Steinmeyer-sourced equivalent-dynamic-load formula already
uses for a different mechanism:

```text
Pm = ( (1/L) * sum(Pn^e * Ln) )^(1/e)     e = 3 (ball), 10/3 (roller)
```

PMI additionally gives closed-form approximations for two common load-vs-
distance shapes without needing the full phase-by-phase sum: monotonically
changing load (`Pm ~= (1/3)*(Pmin + 2*Pmax)`) and sinusoidally changing load
(`Pm ~= 0.65*Pmax` or `~= 0.75*Pmax`, depending on whether the load starts
at zero or at a nonzero minimum). These are convenience approximations for
a continuously varying load, not the discrete per-phase case this module's
`0.1.0` scope below actually needs (a bounded set of load cases, the same
"normal/peak" shape `axis-load-cases` and `ball-screw` already use) — noted
for completeness, not adopted in `0.1.0`.

### 6. Load distribution among blocks ("Calculation of Working Load")

**This is where the two sources differ most, and where `0.1.0`'s validity
envelope narrows the most.**

PMI's Section 6 gives closed-form per-block load formulas for five
installation geometries (a rectangular four-block arrangement: two rails,
two blocks per rail, labeled 1-4), each derived for a specific applied-force
direction and mounting orientation, re-verified directly against the source
images (not a first-pass transcription) given how easy a sign error would
be here:

```text
Horizontal, uniform motion or at rest (force F normal to the mounting
plane, offset l3/l4 from the geometric center, rail spacing l1, block
spacing l2):
  P1 = F/4 + F*l3/(2*l1) - F*l4/(2*l2)
  P2 = F/4 - F*l3/(2*l1) - F*l4/(2*l2)
  P3 = F/4 - F*l3/(2*l1) + F*l4/(2*l2)
  P4 = F/4 + F*l3/(2*l1) + F*l4/(2*l2)

Vertical, uniform motion or at rest (F lateral, offset l4 from center):
  P1 = P2 = P3 = P4 = F*l2 / (2*l1)
  P1T = P2T = P3T = P4T = F*l4 / (2*l1)

Horizontal, subjected to inertia (mass m, acceleration rate a1, distinct
deceleration rate a3 — matching PMI's own worked example's own a1/a3
naming, item 8 below; mg the static/gravity share):
  During acceleration: P1 = P4 = mg/4 - m*a1*l3/(2*l1);  P2 = P3 = mg/4 + m*a1*l3/(2*l1)
                        P1T=P2T=P3T=P4T = m*a1*l4/(2*l1)  (equal on all four, no differential sign)
  During deceleration: P1 = P4 = mg/4 + m*a3*l3/(2*l1);  P2 = P3 = mg/4 - m*a3*l3/(2*l1)
                        P1T=P2T=P3T=P4T = m*a3*l4/(2*l1)
  In uniform motion: P1 = P2 = P3 = P4 = mg/4

Vertical, subjected to inertia (same a1/a3 distinction):
  During acceleration: P1=P2=P3=P4 = m*(g+a1)*l3/(2*l1)
                        P1T=P2T=P3T=P4T = m*(g+a1)*l4/(2*l1)
  During deceleration: P1=P2=P3=P4 = m*(g-a3)*l3/(2*l1)
                        P1T=P2T=P3T=P4T = m*(g-a3)*l4/(2*l1)
  In uniform motion:   P1=P2=P3=P4 = m*g*l3/(2*l1)
                        P1T=P2T=P3T=P4T = m*g*l4/(2*l1)
```

Overhung-horizontal, wall-mount, and laterally/longitudinally-tilted
installations are also given (PMI Section 6, printed pages B18, B20-B22)
but are **not transcribed here** — see "Validity Envelope (Proposed)"
below for why `0.1.0` does not need them yet.

IKO's Section "Calculated Load" (its Tables 6.1-6.3) takes a more general
approach: rather than five fixed installation-geometry formula sets, it
derives the moment components directly from an arbitrary applied load
position `(X, Y, Z)` and force components `(Fx, Fy, Fz)`:

```text
Mr = Fy*Z - Fz*Y
Mp = Fx*(Z - Z0) - Fz*X       (Z0 = drive-position offset)
My = Fx*(Y - Y0) + Fz*X       (with a sign convention specific to its own
                                axis labeling, see the source directly
                                before implementing)
```

then distributes those moments and the direct forces across 1, 2, or 4
slide units using simple `/2` or `/L` (rail-spacing) splits — structurally
compatible with PMI's own per-block formulas for the equivalent
installations, but expressed generally rather than per-installation-type.
This is a strictly more general method than PMI's per-installation formula
set, the same "more general, reduces to the narrower case" relationship
`motion-profile`'s Oriental Motor benchmark already has with
`resolveTrapezoidalMove`.

### 7. Equivalent load (`PE`, combining radial/lateral/moment into one figure)

**A genuine, documented methodology discrepancy between the two sources —
not reconciled here:**

```text
PMI (two-or-more guideways, i.e. this module's own v0.1.0 scope — the
moment is already captured by differential per-block loading, item 6
above, so no separate moment term is needed):
  PE = |PR| + |PT|

PMI (mono-rail / single-rail arrangement — explicitly flagged by the
source as needing the moment effect added separately, since there is no
second block to differentially load):
  PE = |PR| + |PT| + C0 * |M| / MR

IKO (every arrangement — a full, multi-term ISO-style equivalent-load
formula with per-direction moment/rating ratios folded in directly, not
deferred to the per-block distribution step):
  Frw = kr*|Fr| + (C0/T0)*|M0| + (C0/Tx)*|Mx|      (downward conversion load)
  Faw = ka*|Fa| + (C0/Ty)*|My|                     (lateral conversion load)
  P   = X*Frw + Y*Faw                              (X, Y from a per-series
                                                      dynamic-equivalent-
                                                      load-factor table)
```

PMI's own worked example (item 8 below) uses the simple `PE = |PR| + |PT|`
form throughout, consistent with its "two-or-more guideways" case and its
own four-block arrangement — the moment is already fully expressed as
unequal `P1`-`P4` values (item 6), so adding a further moment term would
double-count it. IKO's formula folds a moment term directly into the
per-block equivalent load *in addition to* whatever differential loading
already exists, and requires series-specific conversion-factor tables
(`kr`, `ka`, `X`, `Y`) this project does not have for any specific PMI or
IKO product size — only the formula shape is confirmed, not a specific
guide's own coefficients. **Not resolved here:** whether IKO's more
elaborate formula would give a materially different answer than PMI's
simpler one for the same four-block scenario, or whether they are two
equally valid conventions for different guide-count arrangements the way
`ball-screw`'s Rockford/THK buckling formulas are. `0.1.0`'s proposed scope
(item 6, four-block arrangement) uses PMI's simpler, moment-already-
captured form, since that is the form its own full worked example
(item 8) verifies end to end.

### 8. Full worked numerical example (PMI, Chapter 9)

PMI's catalog includes a complete, internally consistent worked example —
model `MSA35LA2SSFC + R2520-20/20 P II`, `C = 63.6 kN`, `C0 = 100.6 kN`,
masses `m1 = 700 kg` / `m2 = 450 kg`, velocity `0.75 m/s`, accelerations
`a1 = 15 m/s^2` / `a3 = 5 m/s^2`, times `t1 = 0.05 s` / `t2 = 1.9 s` /
`t3 = 0.15 s`, stroke `1500 mm`, and six named geometric distances
(`l1`-`l6`). It carries the calculation all the way through: per-block
radial/lateral load for uniform motion and for acceleration/deceleration
in both travel directions (PMI Sections 9.1.1-9.1.5), equivalent load per
block per phase (9.2), static safety factor (`fs = 11.7`, governed by
carriage No. 2 during acceleration-to-the-left, 9.3), mean load per
carriage (9.4), and nominal life per carriage (assuming `fW = 1.5`,
`56,231 km` for the governing carriage, 9.5). This is the strongest single
candidate reference example this project has found for any module so
far — one source, one self-consistent scenario, covering every required
check end to end with a real (if now-superseded) product model. Reserved
for Stage 4 reproduction; not reproduced by a kernel yet (see "Status").

### 9. Preload and clearance ("Selection of Preload")

PMI Section 11 gives five preload grades: Clearance (`FZ`), Light preload
(`FC`), Medium preload (`F0`), Heavy preload (`F1`), Ultra heavy preload
(`F2`) — each with a fitted-condition description (vibration/impact level,
axis configuration, rigidity/precision need) and example applications. This
maps directly to `context/implementation-map.md` Unit 4.4's "Preload/
clearance options" required check. `0.1.0` treats preload grade as an
engineer-supplied selection input (which grade the specific candidate guide
carries), not a formula this module derives — matching the same treatment
`ball-screw` gives its own `preloadN` input (a catalog/selection fact, not
a computed value).

### 10. Rail/block arrangement compatibility

Both sources describe standard arrangements (PMI's own worked example uses
two rails, two blocks each; IKO's Tables 6.1-6.3 cover one-rail/one-block,
one-rail/two-block, and two-rail/one-block-each). Neither source states a
universal rule for which arrangement suits which application beyond
qualitative guidance (rigidity, moment capacity, cost). `0.1.0` fixes one
arrangement (two rails, two blocks per rail — item 6) as its entire scope
rather than attempting to generalize across arrangements; see "Validity
Envelope (Proposed)" below.

## Validity Envelope (Proposed)

- **Two parallel rails, two blocks per rail (four total load-bearing
  points)** — the arrangement PMI's own full worked example verifies end
  to end (item 8). One-rail and other multi-rail arrangements are out of
  scope for `0.1.0`.
- **Horizontal or vertical installation only**, uniform motion or with a
  single axial acceleration/deceleration phase (PMI's own Section 6
  horizontal/vertical formula sets, items 6). Overhung, wall-mount,
  laterally-tilted, and longitudinally-tilted installations are out of
  scope for `0.1.0` — PMI's catalog has their formulas (item 6), so this
  is a deliberate scope narrowing for a first release, not a missing
  formula, the same way `ball-screw 0.1.0` narrowed to four end-support
  arrangements out of more general possibilities.
- **Ball-type rolling elements only** (the `e=3` / `50 km` life-formula
  branch). Roller-type (`e=10/3` / `100 km`) is a documented, sourced
  alternative (item 4) but not implemented in `0.1.0` — deferred the same
  way `motion-profile 0.1.0` deferred asymmetric/S-curve profiles.
- **Equivalent load per block uses PMI's simpler `PE = |PR| + |PT|` form**
  (item 7), consistent with the fixed four-block arrangement above where
  the moment is already captured by differential per-block loading. IKO's
  more elaborate moment-inclusive equivalent-load formula is recorded as a
  documented alternative, not implemented.
- No preload-dependent stiffness modeling beyond selecting a preload grade
  as an input (item 9); no thermal derating beyond PMI's temperature
  factor `fT` (item 4); no lubrication-regime or seal-wear modeling.
- Static safety factor minimum and life-formula correction factors
  (`fH`/`fT`/`fW`) are required module inputs, not built-in constants — the
  same "required input, no silent default" treatment `ball-screw 0.1.0`
  gives its own static-safety-factor minimum and buckling margin, since two
  sources disagree on the exact standard values (item 3).

## Existing Parameter Review

**The central gap, already flagged above, is now RESOLVED (2026-08-09)** —
see "A Real, Already-Documented Dependency Gap." `axis-load-cases 0.1.0`
now exposes `motion.axis.resultant_force` and `motion.axis.resultant_moment`
(registry `1.4.0`) as released output ports, built from the same
`resultantAppliedForceN`/`resultantAppliedMomentNm` values its kernel
already computed. This module's own Stage 2 registry proposal links to
those two ports directly rather than re-deriving the resolution.

Already released and reusable without change:

| Purpose | Parameter |
| --- | --- |
| Installation orientation | `motion.axis.orientation` |
| Resolved applied force at the guide reference point, per case | `motion.axis.resultant_force` |
| Resolved applied moment at the guide reference point, per case | `motion.axis.resultant_moment` |
| Reference for a resolved axial-only force (contrast, not reuse) | `motion.axis.thrust_force` |

Everything else this module needs is new — no `guide.*` parameter namespace
exists yet (`grep` of `lib/engine/parameters/definitions.ts` confirms zero
`id: "guide.*"` entries as of this document). A Stage 2 registry proposal
would need at least:

- Guide/rail geometry inputs: rail spacing (`l1`), block spacing (`l2`),
  load-position offsets (`l3`/`l4` or a general position vector, per item 6
  above), basic dynamic load rating, basic static load rating, static
  moment rating(s), rolling-element type (ball/roller enum), preload grade
  (enum, per item 9).
- Outputs: per-block working load, equivalent load, static safety factor,
  nominal life (distance and/or time basis).

**An observation, not a decision:** PMI's own Section 5 ("Friction
Coefficient") describes the guide's *own* rolling friction
(`F = mu*P + f`) as a function of its own working load — the same
underlying phenomenon `axis-load-cases`' `motion.axis.guide_resistance_force`
input already represents as an opaque, engineer-supplied value. A future
workflow could in principle let this module's own friction estimate feed
back into `axis-load-cases`' input, but that is a circular cross-module
dependency (the guide's friction depends on its own working load, which
depends on `axis-load-cases`' resolved force, which needs the guide's
friction as an input) that neither this document nor any released
architecture decision resolves. Recorded for awareness; not a Stage 1 or
Stage 2 item to solve here.

## Checks (Proposed)

- Invalid input: non-positive rail spacing, block spacing, load rating, or
  moment rating.
- Static safety: applied load per case, per block, against the governing
  (minimum) static safety factor across all four blocks — fail below
  whatever minimum the engineer supplies (item 3's tables are references,
  not a built-in threshold, the same treatment `ball-screw` gives its own
  static-safety minimum).
- Nominal life: informational unless/until a required minimum life is
  supplied, the same treatment `ball-screw 0.1.0` gives its own life check.
- Preload/clearance: reported, not evaluated pass/fail — a selection fact
  (item 9), not a computed check.

## Trace Contract (Proposed)

Mirroring the established pattern (`context/modules/axis-load-cases/
stage-1-spec.md`, `context/modules/ball-screw/stage-1-spec.md`):

1. `applied-load-<case>` — the resolved force/moment, traced back to its
   source run (pending the Stage 2 gap above)
2. `block-load-distribution-<case>` — each of the four blocks' own
   radial/lateral working load (item 6)
3. `equivalent-load-<case>` — per block (item 7)
4. `mean-load` — duty-cycle aggregation across supplied cases (item 5)
5. `static-safety-<case>` — the governing block
6. `nominal-life` — governing block, distance and/or time basis
7. `validity-and-assumptions` — installation type, rolling-element type,
   arrangement, preload grade

Each formula step cites its registered source revision and exact
page/section; it must not repeat the formula in UI/report code.

## Evidence Gaps and Verification Confidence

Distinguishing what was actually read this session from what needs
re-checking before a kernel is built, per this project's existing practice
(`context/modules/ball-screw/stage-1-spec.md` "Evidence Gaps and
Verification Confidence"):

- **Directly read this session, high confidence:** PMI's load-rating, life,
  static-safety-factor, mean-load, and preload sections (items 1-5, 9), and
  its full worked numerical example (item 8) — re-read a second time this
  session specifically to catch a possible sign-transcription error in the
  per-block working-load formulas (item 6), since a 16-term multi-sign
  formula set is exactly the kind of content a first-pass read can get
  subtly wrong (the same concern that already caught a wrong buckling
  formula for `ball-screw`). **All four in-scope formula sets (horizontal-
  uniform, horizontal-inertia, vertical-uniform, vertical-inertia) are now
  re-verified twice** — the second read of the two inertia-adjusted sets
  caught a real transcription error in this document's own first draft: the
  acceleration and deceleration phases use *distinct* rates (`a1`, `a3`,
  matching PMI's own worked-example naming), not one shared `a1` as first
  written, and the lateral (`l4`) inertia component is equal across all
  four blocks with no differential sign, not "sign per block" as first
  (vaguely) written. Both are corrected in item 6 above. The overhung,
  wall-mount, and tilted formula sets remain read once only and are out of
  `0.1.0` scope, so no re-verification was needed for them this session.
- **Directly read this session, IKO:** the ISO 14728-1/14728-2 citation,
  life-formula shape, load-factor table, and general moment-from-load-
  position formulas (items 1, 3, 4, 6) — read once, not re-verified a
  second time. The exact sign convention in IKO's `Mp`/`My` formulas (item
  6) is noted as needing direct re-reading before implementation, not
  assumed correct from a single pass.
- **Not attempted this session:** confirming whether `pmi-amt.com`'s own
  domain is reachable directly (only the `bearing.net.au` mirror was
  tried) — unlike the confirmed, repeated `thk.com` block elsewhere in
  this project, no block is claimed here; the mirror was simply where a
  readable copy was found first, per `lib/standards/engineering-sources.ts`.
- **Not attempted this session:** a third manufacturer source (e.g. THK's
  own linear-guide catalog, `tech.thk.com/en/products/pdf/en_b18_*`,
  `en_b19_*` — found by WebSearch but not fetched, given the repeated,
  confirmed `thk.com` block already documented in
  `context/progress-tracker.md` "Environment notes" for a different
  module). Two independent sources (PMI, IKO) already corroborate the
  life-formula shape and life basis; a third would strengthen but is not
  required to proceed to Stage 2.
- **Not resolved:** the equivalent-load methodology discrepancy (item 7)
  and the static-safety-factor value-range discrepancy (item 3) — both
  recorded as genuine, unresolved disagreements between the two sources,
  the same treatment `ball-screw`'s own buckling-constant and equivalent-
  load discrepancies received rather than silently picking one.

## Stage 2 Entry Criteria

Stage 2 must resolve, with real sources where a manufacturer-specific
convention is involved (not invented here):

1. ~~The force/moment output-port gap~~ — **RESOLVED 2026-08-09**: registry
   `1.4.0` adds `motion.axis.resultant_force`/`resultant_moment` to
   `axis-load-cases 0.1.0` (see "A Real, Already-Documented Dependency
   Gap" above). This module's own registry proposal links to those ports.
2. New `guide.*` registry parameters per "Existing Parameter Review" above,
   through the normal registry-proposal checklist.
3. Which static-safety-factor standard-value table (PMI's or IKO's, or
   both, engineer-selectable) a future package exposes as guidance — item
   3's two tables are not reconciled here.
4. Whether to adopt PMI's simpler equivalent-load form or investigate
   IKO's more elaborate one further before committing — item 7's
   discrepancy is not resolved here, and `0.1.0`'s proposed scope already
   picks PMI's form (matching its own fully-worked example) as a
   documented, deliberate choice, not a forced one.
5. ~~Re-verify the inertia-adjusted formula sets~~ — **RESOLVED
   2026-08-09**: all four in-scope formula sets are now re-verified twice,
   catching and correcting a real `a1`/`a3` transcription error (see
   "Evidence Gaps and Verification Confidence" above). Nothing further
   blocks a kernel on this item.

## Status

Stage 1 (engineering specification) is done as a draft. **Update
(2026-08-09):** Stage 2 entry criteria 1 and 5 are both resolved the same
day — `axis-load-cases` now exposes the resultant force/moment ports this
module needs (registry `1.4.0`), and all four in-scope working-load
formula sets are re-verified twice against the source images. A Stage 1
kernel now exists (`lib/modules/linear-guide/0.1.0/math.ts`, 29 tests).

**Update (2026-08-09, cont'd — Stage 2 partially resolved, a real open
question found):** `context/modules/linear-guide/stage-2-contract.md`
registers the new `guide.*` parameters and confirms this module reuses
`axis-load-cases`' resolved force/moment ports rather than re-deriving
mass/gravity/acceleration. Drafting it found that the kernel's two
"inertia" functions are likely redundant once `axis-load-cases` has
already resolved a case's gravity+inertia+external combination, and that
the two "uniform" functions take a force-at-an-offset, not
`axis-load-cases`' actual force-and-moment shape — a real reformulation
question left open rather than guessed at (see the Stage 2 document's "A
Finding From Trying To Wire This Contract"). Stage 3 (a package wrapping
this kernel) is blocked on that question, not merely not-yet-started.
Production release stays gated behind Unit 4.1 regardless
(`context/implementation-map.md` Milestone 4 header).
