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
- Module status: Stage 1 kernel exists
  (`lib/modules/linear-guide/0.1.0/math.ts`), extended the same day with
  the general `resolveBlockLoadsFromResultant` form the resolution calls
  for (34 tests). No package yet. This document does not release a
  `ModulePackage`, register a module, or create a calculation run.

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
| Installation orientation (selects horizontal vs. vertical block-load formula) | `motion.axis.orientation` |
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
