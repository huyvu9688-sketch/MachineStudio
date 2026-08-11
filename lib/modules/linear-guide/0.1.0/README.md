# Linear Guide 0.1.0 — Draft Package (Stages 3-4)

> **Stage 4 found two real defects in this module and corrected them.** The
> yawing moment's lever arm was the rail spacing when it should be the
> carriage spacing along travel, and the four lateral block loads were given
> one shared magnitude when they form a signed, zero-sum distribution. Both
> trace to a single root cause: the Stage 1 spec read PMI's `l1` as the rail
> spacing and `l2` as the carriage spacing, when they are reversed. See
> "Stage 4" below and `validation/linear-guide/0.1.0.md`.

`math.ts` is a pure SI-number kernel for the fourth production engineering
module (Unit 4.4), covering the `0.1.0` proposed scope from
`context/modules/linear-guide/stage-1-spec.md`: a two-rail, two-block-per-
rail arrangement (four total load-bearing points), horizontal or vertical
installation, uniform motion or a single axial inertia phase, ball-type
rolling elements only.

- `resolveHorizontalUniformBlockLoads` / `resolveVerticalUniformBlockLoads`
  / `resolveHorizontalInertiaBlockLoads` / `resolveVerticalInertiaBlockLoads`
  — one function per PMI installation diagram (Linear Guideway catalog,
  Section 6), each keeping that diagram's own `l1`/`l2`/`l3`/`l4` parameter
  names rather than a shared "physical" naming, since the spec found these
  letters are locally scoped per diagram, not consistent across them.
- `resolveBlockLoadsFromResultant` — the general form of the same
  distribution, taking a resolved force and moment rather than a force at
  a geometric offset. **This is the integration path** (see "Stage 2"
  below); the four functions above are its source-faithful reference.
- `resolveEquivalentLoad` — PMI's simpler `PE = |PR| + |PT|` form (Section
  7's "two or more guideways" case), matching this module's fixed
  four-block scope where the moment is already captured by differential
  per-block loading.
- `resolveStaticSafetyFactor`, `resolveNominalLife` (ball-type only,
  distance-basis), `resolveServiceLifeHours`, `resolveMeanLoad` — PMI
  Sections 4 and 8, corroborated by IKO's structurally identical formulas
  (see the Stage 1 spec's "Candidate Sources" item 4).

## Stage 3 package (2026-08-09)

A full `ModulePackage` now wraps the kernel:

| File                     | Role                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `manifest.ts`            | Identity, validity envelope, source revisions, and ports.                                                                   |
| `frame.ts`               | The `axis.v1` → guide-frame mapping. **Read this first** — it is the one piece of engineering judgement Stage 3 had to add. |
| `blocks.ts`              | The four blocks in PMI's own P1-P4 order, and governing-block selection.                                                    |
| `input-schema.ts`        | Rejects a roller-type guide and an inclined axis.                                                                           |
| `compute.ts`             | Pure compute over the two supported load cases.                                                                             |
| `trace.ts` / `checks.ts` | Trace steps and acceptance checks.                                                                                          |
| `ui.ts` / `report.ts`    | Generic UI and report schemas.                                                                                              |
| `validation.ts`          | Draft validation record — **Stage 4 has not started**, and it says so.                                                      |
| `package.ts`             | Sealed package. Named `package.ts`, not `index.ts`, so `npm run registry:generate` cannot discover it.                      |

Registry `1.5.0` (released with this stage) adds the `guide.*` group the ports
speak. The Stage 2 contract had decided those parameters but never wrote them
into `lib/engine/parameters/definitions.ts`, so Stage 2's own last step —
"Release the required parameter-registry version" — was outstanding until now.

### What Stage 3 had to decide, and how confident each part is

Everything above `frame.ts` is ordinary wiring. `frame.ts` is not. The Stage 2
contract settled _that_ this module consumes `axis-load-cases`' resolved
`resultant_force` / `resultant_moment`; it did not settle how a three-component
`axis.v1` force and moment map onto the kernel's guide-frame terms. That
mapping is five sign and axis choices, and a wrong one would quietly move load
onto the wrong block.

- **Confirmed against the source.** Routing the moment about the travel axis to
  the rail pair and the moment about the transverse axis to the block pair is
  exactly what PMI's printed page B17 does — the formula set this project
  re-verified against the source image twice. `frame.test.ts` reconstructs
  B17's own scenario as a force at a position, resolves the moment with a cross
  product, runs it through the mapping, and asserts the result equals B17's
  printed formulas written out longhand. The directional guards
  ("more load on the rail the load sits over") exist because a flipped sign
  still conserves total force and still passes a symmetry check.
- **Reproduced as printed, not endorsed.** The lateral term divides the yawing
  moment by twice the _rail_ spacing, because that is what PMI prints — even
  though a yaw reaction would physically act over the block spacing, and even
  though four equal same-signed lateral forces do not balance a yawing moment.
  Unchanged from the kernel; still an open Stage 4 question.
- **Stated as an assumption, because it cannot be checked.** For a vertical
  installation this module needs the engineer's free choice of `+Y` (which
  `axis.v1` leaves open for a vertical axis) to be the in-plane transverse
  direction. Nothing in the resolved input can detect a different choice, so it
  is reported as an assumption rather than validated.

### Orientation selects no formula — a real consequence, asserted in a test

PMI needs separate horizontal and vertical formula sets because its own method
re-derives gravity from mass, so which way the guide faces changes the
arithmetic. This module consumes a load in which gravity, friction, guide
resistance, and external loads are _already_ resolved, so the block-load
distribution is identical for both installations.
`motion.axis.orientation` stays a required input for two other reasons —
rejecting the out-of-scope `inclined` case, and recording the installation on
the report — and `package.test.ts` asserts the two orientations produce
identical outputs under the same resolved load rather than leaving that
implicit.

A related consequence, also tested: a purely axial force produces no block
share at all (the drive reacts it), which is why PMI's own vertical diagram has
no `F/4` term. A vertical axis' weight reaches the guide only through the
moment its centre-of-mass offset creates.

### What the package deliberately leaves out

- **No mean load, and no duty-cycle life aggregation.** The kernel implements
  PMI's mean-load formula, but it weights phases by running _distance_, and
  neither a distance weighting nor a mean-load output is in the Stage 2
  contract. Nominal life is reported per case from that case's own equivalent
  load. Deferred rather than invented.
- **No moment-rating input, no per-block output ports.** Both are Stage 2
  decisions, not Stage 3 omissions.
- **No `expectedSourceHash`.** Source-immutability pinning is a Stage 6 step
  and this version is not released, so `package.test.ts` runs conformance
  without it (that check reports as `skipped`).

## Stage 4 (2026-08-09): PMI's Chapter 9, reproduced

`pmi-chapter-9.ts` reproduces PMI's own worked example end to end — all
twenty per-carriage radial loads across five motion phases, all twenty
lateral loads with their signs, all twenty equivalent loads, the governing
static safety factor, and all four mean loads and nominal lives, each to
within the ±0.1 N the source itself prints. It feeds a force and moment
resolved from PMI's given data through `resolveBlockLoadsFromResultant` —
the module's **real integration path** — rather than calling the
installation-specific functions that merely restate PMI's printed formulas.
Restating a formula proves nothing; running twenty printed numbers through
the code the module actually executes does.

### What it settled, and what it broke

- **The carriage-numbering map**, which Stage 1 explicitly declined to
  guess: `No.1`-`No.4` are `block3`, `block4`, `block1`, `block2`. Derived
  from printed sign patterns; any other assignment fails the twenty load
  assertions.
- **Which spacing is which.** PMI's `l1` is the carriage spacing along
  travel, `l2` the transverse rail spacing — the reverse of what Stage 1
  recorded. Three independent lines of evidence agree; the strongest is that
  Chapter 9's lateral loads alternate sign across the same pairs its
  `/(2·l1)` radial term separates and sum to zero, and only pairs separated
  along travel can balance a yawing moment.
- **Therefore the two lateral defects**, now fixed. Note what this means
  about the earlier open item: the recorded suspicion that "PMI reacts a
  yawing moment across the rails, which is physically impossible" was
  correct about the physics and wrong about PMI. The source was right; this
  project's reading of its letters was not. Keeping it open rather than
  "correcting" PMI was the right call for the wrong reason.
- **`g = 9.8 m/s²`**, which PMI computes with. Established by arithmetic:
  standard gravity misses the printed figures by ~2.7 N, well outside the
  tolerance band.

### A printing error in the source

PMI's section 9.1.3 prints `Pt3la3` and `Pt4la3` with values whose signs
oppose its own stated formulas on the same page. The other three phases are
self-consistent and group carriages `{No.1, No.4}` against `{No.2, No.3}` in
every phase; reading 9.1.3 by its formulas fits, reading it by its values
would make it the only phase whose lateral reactions regroup — which no
rigid-body arrangement can do. This module follows the formulas. Nothing
downstream depends on it (equivalent load takes `|PT|`, and both magnitudes
are 161.5 N), which is presumably why it survived printing.
`pmi-chapter-9.test.ts` asserts the disagreement is confined to those two
carriages and is a sign flip only.

### The independent benchmark Stage 4 was missing (closed 2026-08-09)

`iko-benchmark.ts` now implements IKO's own dynamic/static equivalent-load
method as a genuine second computation, reproducing IKO's own worked
"Example 1" (catalog printed pages 15-16, model `ME 25 C2 R640 H`) end to
end: `P1`-`P4`, `P01`-`P04`, `fs = 6.3`, and the ~4410 km / ~73,500 h rating
life, all from IKO's own conversion-factor tables (`kr`, `ka`, `kOr`, `kOa`
— catalog Tables 3 and 5) and its own dominance-weighted combination rule
(`X`, `Y` — catalog Table 4). See `iko-benchmark.test.ts` and
`validation/linear-guide/0.1.0.md` "Independent Method or Tool Comparison".

**A correction to the earlier "series-specific" description.** Item 7 of
`context/modules/linear-guide/stage-1-spec.md` described IKO's `X`/`Y`
factor as coming from "a per-series dynamic-equivalent-load-factor table."
Reading the actual table shows this was wrong: `X`/`Y` is a universal
two-row table keyed only on which of the (already-converted) radial or
lateral load dominates — the same two rows for every series. Only `kr`/`ka`
(and their static counterparts `kOr`/`kOa`) are series/size-specific, and
the catalog prints those directly.

**The open equivalent-load-methodology question is now resolved, for this
series bucket.** For `kr = ka = 1` (the `ME` size-15-30 bucket Example 1
uses), IKO's `P = X·Frw + Y·Faw` reduces algebraically to `PMI's PE −
0.4·min(|Fr|, |Fa|)` — a proved identity, not a curve fit. IKO's figure is
therefore always the lower of the two; on IKO's own four slide units the gap
runs 5%-20% of PMI's figure. Neither form is "corrected" toward the other —
both are genuine, sourced methods that disagree, the same treatment
`ball-screw`'s own Rockford/THK buckling and equivalent-load discrepancies
get. This module's own `compute.ts` still uses PMI's `PE = |PR| + |PT|`
form; `iko-benchmark.ts` is a benchmark, not an alternative offered to
callers.

IKO's own "Example 2" is not reproduced — it uses a one-rail/two-slide-unit
arrangement (catalog Table 6.2) with an added static-equivalent-load moment
term, IKO's own mono-rail case, out of this module's `0.1.0` scope for the
same reason PMI's own mono-rail variant is.

With this closed, the solo-validation reviewer-substitute policy is now
invokable for this module (`validation/linear-guide/0.1.0.md` "Reviewer") —
this module's own Stage 4 gate is clear. Release no longer waits on Unit
4.1's Definition of Done, which released as `axis-load-cases@0.1.0` on
2026-08-11 (`validation/axis-load-cases/0.1.0.md`); this module's own
Stage 6 has simply not started yet.

### The B19 gap the subsumption tests left open, now closed

`math.test.ts` proves the general form reproduces PMI's B17 and B23 formula
sets exactly, but not B19 (vertical uniform) — and it cannot, because B19
prints an identical radial magnitude on all four blocks where the general form
gives the equilibrium-correct signed distribution. `frame.test.ts` closes that
gap the way it actually matters: the per-block **equivalent loads** are
identical between the two, because `PE = |PR| + |PT|` takes magnitudes. The
signs differ; what this module reports does not. That is asserted, including an
explicit assertion that the signs genuinely do differ, rather than argued.

## Stage 1 kernel, before the package existed

`math.test.ts` (34 tests) tests every function against internal consistency
(force conservation across all four blocks, symmetry, monotonicity,
boundary/invalid input) rather than PMI's own full worked numerical example
(catalog Chapter 9): that example uses a bespoke two-mass, two-height
geometry with its own "No.1"-"No.4" carriage numbering, and this session
could not confirm with confidence that its numbering/sign convention maps
onto the generic Section 6 diagrams' `P1`-`P4` convention these functions
implement. Reproducing it needs either re-reading both diagrams side by
side to pin the mapping, or a confirmed superposition argument — reserved
for Stage 4, not guessed here (see `math.test.ts`'s own header comment).
This is the same "internal consistency first, published example once
confirmed" treatment `motion-profile`'s Stage 1 kernel received before its
own reference examples were found.

Twice-re-verified against the source images this session (see
`context/modules/linear-guide/stage-1-spec.md` "Evidence Gaps and
Verification Confidence"): the second read caught a real error in the
spec's own first draft — acceleration and deceleration use distinct rates
(`a1`/`a3`), not one shared rate, and the inertia-phase lateral load is
equal across all four blocks with no differential sign. Both are correct in
this kernel from the start (written after the correction).

The kernel was built ahead of the package, the same pattern
`axis-load-cases`, `motion-profile`, and `ball-screw` all used at their own
Stage 1/2. Production release no longer waits on Unit 4.1's Definition of
Done, which released as `axis-load-cases@0.1.0` on 2026-08-11
(`validation/axis-load-cases/0.1.0.md`); this module's own Stage 6 has not
started, and this module additionally has not started Stage 4.

## Stage 2 (2026-08-09): the integration path, and a question found then closed

`context/modules/linear-guide/stage-2-contract.md` registers the new
`guide.*` catalog/geometry parameters and confirms this module reuses
`axis-load-cases`' `motion.axis.resultant_force`/`resultant_moment` ports
(registry `1.4.0`) as its applied-load input, per case — not a
re-derivation from mass/gravity/acceleration.

Drafting that contract surfaced a real problem: the four
installation-specific functions above take a **force at a geometric
offset**, while `axis-load-cases` produces a **force and a moment**. They
are related by `moment = force * offset`, but `offset = moment / force` is
undefined for a pure moment with no accompanying force — a case
`axis-load-cases`' own `external_moment` input can produce. It was
initially unclear whether the substitution generalized past the one
diagram (B17) confirmed with highest confidence.

**Re-reading all four PMI diagrams together — rather than one at a time —
closed it.** Every load-position offset in every in-scope diagram appears
_only_ inside a force-times-offset product (`F*l3`, `F*l4`, `m*a1*l3`,
`m*(g+a1)*l3`), and that product is a moment; the spacings in the
denominators are guide geometry, never load position. So the substitution
is exact for the radial distribution everywhere, and it holds regardless
of what B19's `l2`/`l4` mean physically, since those enter only as
moments too.

`resolveBlockLoadsFromResultant` implements the general form, and
`math.test.ts` asserts it reproduces the B17 and B23 functions exactly
plus resolves the pure-moment case — the subsumption is machine-checked,
not asserted in prose. The four installation-specific functions stay as
the source-faithful reference those tests check against; they are not the
integration path.

One part did not reduce as cleanly and is recorded rather than papered
over: PMI prints an equal lateral magnitude on all four blocks with no
differential sign and always divides by rail spacing, which reads as a
per-block sizing magnitude rather than a signed equilibrium distribution.
Reproduced as printed; flagged for Stage 4. See the Stage 2 document.
