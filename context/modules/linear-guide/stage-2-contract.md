# Linear Guide Module — Stage 2 Parameter Contract

## Status

- Work unit: Unit 4.4, Stage 2 — parameter contract
- Date: 2026-08-09
- Stage 2 status: **resolved.** New `guide.*` registry parameters and the
  reused `motion.axis.*` applied-load ports are decided below. The one real
  question this contract's first draft left open — whether the kernel's
  offset-based block-load functions can be reformulated in moment terms to
  match what `axis-load-cases` actually resolves — is now **resolved the
  same day** by re-reading all four PMI diagrams together instead of one at
  a time. See "The Open Question — RESOLVED" below.
- Module status: **Stage 3 done** (2026-08-09). A full `ModulePackage` wraps
  the kernel in `lib/modules/linear-guide/0.1.0/` — see that directory's
  `README.md` "Stage 3 package". Registry `1.5.0` released the `guide.*`
  parameters this document decided. No module is registered
  (`package.ts`, not `index.ts`), and Stage 4 has not started.
- **Stage 2's own last step was outstanding until Stage 3.** This document
  decided the `guide.*` parameters but nothing wrote them into
  `lib/engine/parameters/definitions.ts`, so the registry version the New
  Module Workflow's Stage 2 requires ("Release the required
  parameter-registry version") had not actually been released. Stage 3 did
  it as `1.5.0`. Two Stage 3 refinements to the table below came out of
  that release and are recorded in "Stage 3 refinements" at the end.

## A Finding From Trying To Wire This Contract, Not Assumed In Advance

While drafting this contract, reusing `axis-load-cases`' new
`motion.axis.resultant_force`/`resultant_moment` ports (registry `1.4.0`,
added the same day specifically for this module) turned out to conflict
with how the Stage 1 kernel is shaped, not just slot in cleanly. Recorded
here because it changes what Stage 2 can actually decide today.

PMI's own "subjected to inertia" formulas (`resolveHorizontalInertiaBlockLoads`,
`resolveVerticalInertiaBlockLoads`) take mass, gravity, and acceleration
directly and re-derive gravity's and inertia's separate contributions —
because PMI's own worked example is a **self-contained calculation with no
upstream module**. This project already has one: `axis-load-cases` resolves
gravity, friction, guide resistance, and external force/moment into a
single `resultant_force`/`resultant_moment` snapshot per load case. Feeding
that resolved snapshot into `resolveHorizontalInertiaBlockLoads` would mean
re-deriving gravity and acceleration effects a second time from raw
mass/acceleration inputs this module would have to duplicate from
`axis-load-cases`' own input surface — the exact kind of redundant,
independently-drifting computation `context/architecture.md`'s "Module
Consistency Mechanisms" and this project's shared-parameter goal
(`context/project-overview.md` goal 4) argue against. **The two inertia
functions are very likely not needed at the package level when this module
is fed by `axis-load-cases`**, since a `normal`/`peak` case's resolved
force already *is* whatever combination of gravity and inertia that case
represents.

The two "uniform" functions (`resolveHorizontalUniformBlockLoads`,
`resolveVerticalUniformBlockLoads`) are the ones that matter for real
integration — but they take a **force at a geometric offset** (`l3`, `l4`
meters), not a **force and moment** (`axis-load-cases`' actual output
shape). These are related algebraically (`moment = force x offset`, so
`offset = moment / force`), and for the one formula set re-verified twice
with highest confidence (`resolveHorizontalUniformBlockLoads`, printed page
B17), the substitution is exact: `P1 = F/4 + M_rail/(2*l1) - M_block/(2*l2)`
reproduces the printed formula precisely when `M_rail = F*l3` and
`M_block = F*l4`. But `offset = moment / force` is undefined when `force`
is zero and `moment` is not — a real case `axis-load-cases`' own
`external_moment` input can produce on its own, with no accompanying
force. A kernel written directly in terms of `(forceN, momentNm)` would not
have this problem; one written in terms of `(forceN, offsetM)` does. When
this section was first written, it was not confirmed whether the same
substitution holds for `resolveVerticalUniformBlockLoads` (its own `l2`/`l4`
variables were read from a different diagram, and stage-1-spec.md already
flags that these letters are not confirmed to mean the same physical thing
across PMI's different installation diagrams) — so reformulating was
deferred rather than risk an error with no worked example to catch it
against, per this project's practice of re-verifying before implementing
(`context/modules/ball-screw/stage-1-spec.md` "Evidence Gaps and
Verification Confidence").

**That deferral lasted about an hour.** Re-reading all four diagrams
together — rather than one at a time, which is what the diagram-by-diagram
approach had been doing — resolved it immediately. See the next section.

## The Open Question — RESOLVED 2026-08-09 (same day, by re-reading)

**Resolved: Stage 3 reformulates in moment terms directly. The
`moment = force x offset` substitution is exact for the radial
distribution, confirmed by re-reading all four PMI diagrams together
rather than one at a time.**

The re-read found something the diagram-by-diagram reading had missed:
**every load-position offset in every in-scope diagram appears only inside
a force-times-offset product** — `F*l3` and `F*l4` (B17), `F*l2` and `F*l4`
(B19), `m*a1*l3` and `m*a1*l4` (B23), `m*(g+a1)*l3` and `m*(g+a1)*l4`
(B24). That product *is* a moment. The spacings that appear as
denominators (`l1`, `l2`) are guide geometry, never load position. So the
substitution is not an approximation that happens to work for B17 — it is
exact everywhere, and the worry that it might not generalize past B17 was
unfounded.

This also resolves the question *without* needing to pin down what B19's
`l2`/`l4` represent physically (entry criterion 1 in the original list
above): whatever those distances mean, they enter only as `F*l2` and
`F*l4`, i.e. as moments, so a moment-based formulation consumes them
correctly regardless.

`lib/modules/linear-guide/0.1.0/math.ts`'s new
`resolveBlockLoadsFromResultant` implements the general form.
`math.test.ts` asserts it reproduces `resolveHorizontalUniformBlockLoads`
(B17) and `resolveHorizontalInertiaBlockLoads` (B23) exactly for their own
scenarios — the subsumption claim is machine-checked, not prose — and that
it resolves a pure moment with zero force (the case
`offset = moment / force` could not express, and which
`axis-load-cases`' own `external_moment` input can produce on its own),
with the four blocks' radial loads correctly cancelling to zero net force.

### One part that did NOT reduce as cleanly — recorded, not papered over

The *lateral* direction is reproduced as printed but is not on the same
footing as the radial:

- PMI prints an equal lateral magnitude on all four blocks
  (`P1T = P2T = P3T = P4T`) with no differential sign, in B19, B23, and
  B24 alike. Four equal, same-signed lateral forces do not balance a
  yawing moment, so this reads as a per-block **sizing magnitude**, not a
  signed equilibrium distribution.
- Every lateral formula divides by `2*l1` (rail spacing), even where a yaw
  reaction would physically act over the block spacing instead.

Neither is "corrected" in the kernel. Reproducing the source faithfully is
the right call where there is no worked example to check a correction
against — the same treatment `ball-screw`'s buckling-constant disagreement
received. `resolveBlockLoadsFromResultant` additionally accepts a direct
lateral force share (`F/4`), flagged in its own doc comment as elementary
statics rather than source-confirmed, since no in-scope PMI diagram shows
a net lateral force and so none prints that term; passing zero reproduces
any PMI diagram exactly.

**Still open for Stage 4, not Stage 3:** whether the lateral lever arm
should be block spacing rather than rail spacing for a yaw-induced
reaction. This does not block a package — the kernel reproduces the source
— but it is a real question to put to a second source or a worked example
before release.

## Decisions

### 1. Applied load: reuse `axis-load-cases`' resolved output, per case

**Resolved.** This module's applied-load input is
`motion.axis.resultant_force` and `motion.axis.resultant_moment` (registry
`1.4.0`), per case (`normal`, `peak`, matching `axis-load-cases 0.1.0`'s
own scope) — not a re-derivation from mass, gravity, or acceleration. The
two "inertia" kernel functions are not wired into the package (see "A
Finding" above); they remain in `math.ts` as a documented, tested,
source-faithful reproduction of PMI's own self-contained method, useful as
a reference and for any future standalone (non-`axis-load-cases`-fed) use,
but not part of this module's own compute path.

### 2. New `guide.*` registry parameters

**Resolved for the `0.1.0` scope** (two rails, two blocks per rail,
horizontal/vertical, ball-type only — `context/modules/linear-guide/
stage-1-spec.md` "Validity Envelope"):

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `guide.rail_spacing` | quantity, `m`, `> 0` | Distance between the two rails (PMI's `l1`). |
| `guide.block_spacing` | quantity, `m`, `> 0` | Distance between the two blocks on one rail (PMI's `l2`, horizontal installation only). |
| `guide.static_load_rating` | quantity, `N`, `> 0` | Catalog basic static load rating (`C0`). |
| `guide.dynamic_load_rating` | quantity, `N`, `> 0` | Catalog basic dynamic load rating (`C`). |
| `guide.rolling_element_type` | enum: `ball` \| `roller` | Only `ball` is implemented by `0.1.0`'s kernel; `roller` is a released enum value for a future version, the same "enum admits more than one version implements" pattern `axis-load-cases`' `LoadCaseCategory` already uses. |
| `guide.preload_grade` | enum: `clearance` \| `light` \| `medium` \| `heavy` \| `ultra_heavy` | PMI's `FZ`/`FC`/`F0`/`F1`/`F2` (stage-1-spec.md item 9). Reported, not evaluated pass/fail — a selection fact. |
| `guide.load_factor` | quantity, dimensionless (`ratio`), `> 0` | PMI/IKO's `fW`. Required input, no built-in default — both sources' tables are speed/impact-keyed guidance, not a single confirmed constant. |
| `guide.hardness_factor` | quantity, dimensionless (`ratio`), `> 0`, optional | PMI's `fH`. Defaults to `1.0` when omitted, matching the kernel's own default (PMI's own guideways meet the reference hardness). |
| `guide.temperature_factor` | quantity, dimensionless (`ratio`), `> 0`, optional | PMI's `fT`. Defaults to `1.0` when omitted (`<=100C` reference condition). |
| `guide.static_safety_factor_minimum` | quantity, dimensionless (`ratio`), `> 0`, required | No built-in default — PMI's and IKO's standard-value tables disagree in exact range (stage-1-spec.md item 3), the same treatment `ball-screw 0.1.0` gives its own static-safety-factor minimum. |

**Deliberately not registered for `0.1.0`:** a static/dynamic moment
rating (PMI's `M0`/`MP`/`MY`/`MR`, IKO's `T0`/`TX`/`TY`). `0.1.0`'s chosen
equivalent-load form (PMI's "two or more guideways" case,
`PE = |PR| + |PT|` — stage-1-spec.md item 7) does not consume a moment
rating; the moment is already captured by differential per-block loading
in the `resolve*BlockLoads` functions. A future version implementing the
single-rail ("mono rail") moment-inclusive equivalent-load form would need
one.

### 3. Output ports: governing block only, per case

**Resolved.** `guide.equivalent_load`, `guide.static_safety_factor`, and
`guide.nominal_life` report the **governing** (highest-equivalent-load)
block's value per case, not all four blocks individually — the same
"canonical port defers rich per-instance detail to the trace when not yet
needed" pattern `motion-profile 0.1.0` already established for its own
per-move detail (`context/modules/motion-profile/stage-2-contract.md`
"Decisions" item 2). Per-block working load, equivalent load, and which
block governs are reported in the calculation trace only.

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `guide.equivalent_load` | quantity, `N`, `>= 0` | Governing block's equivalent load, per case. |
| `guide.static_safety_factor` | quantity, dimensionless (`ratio`), `> 0` | Governing block's `fs = C0 / equivalent_load`, per case. |
| `guide.nominal_life` | quantity, `km`, `> 0` | Governing block's nominal life (ball-type, distance basis), per case. |

## Existing Parameter Mapping

Reused without change from already-released definitions:

| Purpose | Parameter |
| --- | --- |
| Installation orientation (scope check and reporting — **not** a formula selector; see "Stage 3 refinements") | `motion.axis.orientation` |
| Applied force at the guide reference point, per case | `motion.axis.resultant_force` |
| Applied moment at the guide reference point, per case | `motion.axis.resultant_moment` |

## Method Sources

No new source registry entry is added by this record. The formulas
themselves were already registered at Stage 1:
`us.pmi.linear_guideway_catalog@bearing-net-au-mirror-2026-08-09`,
`jp.iko.linear_way_catalog@1560e`
(`lib/standards/engineering-sources.ts`).

## Draft Kernel Status

`lib/modules/linear-guide/0.1.0/math.ts` (34 tests, `math.test.ts`)
implements all four PMI formula sets from Stage 1, plus
`resolveBlockLoadsFromResultant` — the general moment-based form added by
this document's own resolution above, and the one a future `compute.ts`
actually calls.

The four installation-specific functions stay in the kernel as a tested,
source-faithful reproduction of PMI's own method, and as the reference the
general form's equivalence tests check against. They are not the
integration path: `compute.ts` will link `axis-load-cases`'
`resultant_force`/`resultant_moment` into `resolveBlockLoadsFromResultant`
directly.

Stage 3 (a package) is no longer blocked on an unresolved question. What
it still needs is ordinary module-package work: manifest, ports, input
schema, compute, trace, checks, UI/report schemas.

## Stage 3 refinements (2026-08-09) — what building the package changed here

Three things this contract stated turned out to need correcting or
sharpening once the package existed. Recorded here rather than left as a
silent divergence between this document and the code.

### 1. Orientation selects no formula

This document's "Existing Parameter Mapping" table described
`motion.axis.orientation` as selecting the horizontal vs. vertical
block-load formula. It does not, and cannot: PMI needs two formula sets
only because its own method re-derives gravity from mass, so the
installation changes the arithmetic. Decision 1 above already committed
this module to consuming a load in which gravity, friction, guide
resistance, and external loads are *already* resolved — which makes the
block-load distribution identical for both installations. The parameter
stays a required input for two real reasons (rejecting the out-of-scope
`inclined` case, and recording the installation on the report), and the
table above is corrected. `package.test.ts` asserts the two orientations
produce identical outputs under the same resolved load, so this is
machine-checked rather than only argued.

### 2. `guide.nominal_life` is stored in metres and displayed in km

Decision 3's table gives this parameter's units as `km`, the unit both
sources print. The released definition stores it canonically in `m` with
`km` as its first display unit — the same canonical-SI/convenient-display
split `screw.nominal_life_hours` already uses (canonical `s`, displayed in
`h`). Nothing about the engineering changes; `km` was added to the unit
registry for the display side.

### 3. A new decision Stage 3 had to make: the frame mapping

Decision 1 settled *that* this module consumes a resolved
`(resultant_force, resultant_moment)` pair. It did not settle how a
three-component `axis.v1` force and moment map onto the kernel's
guide-frame terms — five sign and axis choices that this contract simply
did not reach. `lib/modules/linear-guide/0.1.0/frame.ts` makes them, with
the derivation written out per term, and `frame.test.ts` checks the whole
chain against PMI's printed B17 by reconstructing that diagram's own
scenario as a force at a position.

One part of that mapping is an assumption that cannot be validated from the
input: for a vertical installation, `axis.v1` leaves the `+Y` direction to
the engineer, and this module needs that choice to be the in-plane
transverse direction. It is reported as an assumption on every calculation
rather than checked, because nothing in a resolved force vector reveals
which transverse direction was picked.

### Still open for Stage 4, unchanged

The lateral lever arm (rail spacing vs. block spacing for a yaw-induced
reaction) is untouched by Stage 3 — the package reproduces PMI as printed.
Stage 3 did surface one more instance of the same pattern: PMI's *vertical*
diagram (B19) likewise prints an equal magnitude on all four blocks and
likewise divides by rail spacing, where the general form gives the
equilibrium-correct signed distribution over the physically-reacting pair.
The magnitudes agree, so the per-block equivalent load this module reports
is identical either way — `frame.test.ts` asserts exactly that, which is
why routing the vertical case through the general form is safe despite the
sign difference. Worth putting to a second source alongside the lateral
lever-arm question.

## Stage 4 (2026-08-09): the lever-arm question, answered — and this
## contract was wrong about which spacing PMI meant

**Resolved. The yaw lever arm is the carriage spacing along travel.** The
open item above is closed by reproducing PMI's own Chapter 9 worked example
end to end (`lib/modules/linear-guide/0.1.0/pmi-chapter-9.ts`;
`validation/linear-guide/0.1.0.md`).

The answer came with a correction this contract needs to carry, because it
invalidates the premise of the question as posed above. **PMI's `l1` is the
carriage spacing along the direction of travel and `l2` is the transverse
rail spacing — the reverse of what the Stage 1 spec recorded**, and the
kernel inherited that reversal in its `railSpacingM` / `blockSpacingM`
field names.

So the suspicious observation that "PMI always divides the lateral term by
rail spacing, even where a yaw reaction would physically act over the block
spacing" was not PMI doing something physically impossible. PMI divides by
`2*l1`, and `l1` is the carriage spacing — exactly the lever arm a yaw
reaction acts over. **The source was right; this project's reading of its
letters was wrong.** Keeping the item open rather than "correcting" PMI
turned out to be the right call for the wrong reason.

Evidence, strongest first:

1. Chapter 9's lateral loads alternate sign across the *same* block pairs
   its `/(2*l1)` radial term separates, and they sum to zero. Only pairs
   separated along the direction of travel can balance a yawing moment.
2. Chapter 9 divides the height-induced moments `m1*a1*l6` and `m2*a1*l5`
   by `2*l1`. An axial force acting at a height is a pitching moment, which
   only the fore/aft carriage pair can react.
3. B23 does the same with its own `m*a1*l3/(2*l1)`, where `l3` is a height.

### What changed in the code

- The kernel's yaw term now divides by `2 * blockSpacingM`. This changes
  computed results whenever the two spacings differ.
- The four lateral block loads are now a **signed, zero-sum** distribution
  rather than one shared magnitude. PMI's general diagrams print an unsigned
  magnitude; Chapter 9 prints alternating signs. Equivalent load takes
  `|PT|`, so this changes per-block sign reporting but not any output port.
- The offset-based kernel functions' invented physical field names are
  replaced with PMI's own letters (`spacingL1M`, `offsetL3M`, …), which is
  what `math.ts`'s header always claimed they used.
- The `guide.rail_spacing` and `guide.block_spacing` registry definitions
  had the PMI cross-reference backwards and are corrected. Their primary
  definitions — perpendicular-to-travel and along-travel — were always the
  physically meaningful ones and are unchanged, so no released meaning
  moved.

### Still open after Stage 4

The **independent benchmark** is not satisfied: IKO corroborates the
formulas but has not been implemented as a second computation. That, not
the lever arm, is now what blocks this module's release on its own merits.
See `validation/linear-guide/0.1.0.md` "Independent Method or Tool
Comparison".
