# Ball Screw 0.1.0 — Draft Package (Stage 3)

`math.ts` is a pure SI-number kernel for the third production engineering
module (Unit 4.3). It covers every check in
`context/modules/ball-screw/stage-1-spec.md`, including the static safety
factor (formula only — no recommended minimum value found yet):

- **Lead / rotational-speed relationship** (`resolveRotationalSpeed`) —
  definitional screw-thread geometry, `v = N * P`.
- **Ball-screw drive torque** (`resolveDriveTorque`) — Oriental Motor's
  published load-torque formula for a ball-screw drive, reusing
  `axis-load-cases`' already-resolved axial thrust rather than re-deriving
  gravity/friction. Cross-checked against a second, independent worked
  example (Rockford Ball Screw).
- **Duty-cycle equivalent dynamic load and mean rotational speed**
  (`resolveEquivalentDynamicLoad`) — Steinmeyer's published formula, image-
  verified directly against the source.
- **Nominal (fatigue) life** (`resolveNominalLife`,
  `resolvePermissibleMeanLoad`, `resolveLifeHours`) — the standard cubic
  life law, also image-verified directly. **Do not** feed this a
  distance-basis dynamic load rating (see `resolveNominalLife`'s own doc
  comment) — a real cross-catalog incompatibility found this session, not a
  hypothetical.
- **Buckling load** (`resolveBucklingLoad`) and **critical speed**
  (`resolveCriticalSpeed`) — Rockford Ball Screw's published formulas,
  which explicitly use the screw's minor (root) diameter, not its
  nominal/major diameter. Both reproduce Rockford's own full worked
  numerical example to within whole-unit catalog rounding.
- **Static safety factor** (`resolveStaticSafetyFactor`) — `fs = C0 /
Fas_max`, sourced from WY Ball Screw. Returns the computed factor only;
  no recommended minimum is built in (see below).

`math.test.ts` (42 tests) tests most functions against their own internal
consistency (inversion identities, boundary behavior, monotonicity, the
documented "a stationary phase does not accumulate fatigue" property of the
equivalent-load formula), plus genuine published-worked-example
reproductions for drive torque, buckling, critical speed, nominal life, and
static safety factor, from two independent manufacturers (Rockford, THK) —
see "Stage 4 evidence (2026-08-09)" below.

## Two discrepancies found and deliberately not silently resolved

- **Buckling safety margin.** Steinmeyer states a `0.5` factor should be
  applied to the raw buckling load; Rockford's own worked example applies
  `Fs = 0.8` to the identical formula. `resolveBucklingLoad` uses `0.5` (the
  more conservative choice) as a documented placeholder — see its own doc
  comment and stage-1-spec.md item 7 / "Stage 2 Entry Criteria" item 6.
- **Dynamic-load-rating life basis.** Rockford's own catalog dynamic load
  ratings are calibrated against `10^6` inches of travel, not `10^6`
  revolutions the way the Steinmeyer/ISO-attributed life formula this
  kernel implements assumes. Confirmed by reproducing Rockford's own worked
  numbers and finding they disagree with the revolution-basis formula for
  the same catalog figure — see `resolveNominalLife`'s doc comment and
  stage-1-spec.md item 5.

## What the kernel alone did not cover — resolved at the package boundary

**A recommended minimum static safety factor, and the buckling safety
margin, as built-in constants.** Both remain genuinely unresolved by any
source that met this project's evidence bar, across two sessions of
sourcing attempts — see `context/modules/ball-screw/stage-2-contract.md`
"Decisions" items 1-2. Stage 2 resolved this by making both a required
module input instead of a hardcoded number
(`screw.static_safety_factor_minimum`, `screw.buckling_safety_margin`), not
by finding the missing evidence. `resolveBucklingLoad`'s internal `0.5`
constant is a kernel-level default only — `compute.ts` ignores it and
recomputes the permissible compressive load from the registry-supplied
`buckling_safety_margin` input instead, so the kernel itself is unchanged
from Stage 1/2.

## Stage 3 package

A full `ModulePackage` — manifest, ports, input schema, compute, calculation
trace, checks, generic UI schema, report schema, and a draft validation
record — wraps `math.ts` in this directory (`manifest.ts`, `input-schema.ts`,
`values.ts`, `trace.ts`, `checks.ts`, `compute.ts`, `ui.ts`, `report.ts`,
`validation.ts`, assembled in `package.ts`, not `index.ts` — see "Status"
below). It supports only the `normal`/`peak` load cases, matching
`axis-load-cases 0.1.0`'s own scope restriction — there is no supported
`holding`/`emergency_stop` thrust force to consume yet.

Two Stage 3 wiring decisions worth noting:

- **`dynamic_load_rating_basis` must be `"revolutions"`.** `input-schema.ts`
  rejects a `"distance"`-basis rating outright — 0.1.0 has no documented
  distance-to-revolution conversion, so silently feeding one into
  `resolveNominalLife` would misstate life by a factor tied to the screw's
  lead (the real incompatibility Stage 1 found in Rockford's own catalog).
- **The duty-cycle equivalent-load formula reuses the `normal`/`peak` cases
  as its two phases**, fed by two new per-case `motion.axis.*` inputs
  (`case_time_fraction`, `case_linear_velocity`) rather than a
  screw-specific duplicate — `context/modules/ball-screw/stage-2-contract.md`
  "Decisions" item 3.

`package.test.ts` (19 tests) exercises the full module conformance suite
(package validation, execution, determinism) plus boundary/invalid-input and
output-correctness tests, on top of the 42 existing kernel-level tests in
`math.test.ts`.

## Stage 4 evidence (2026-08-09): a second independent manufacturer source

A THK Ball Screw General Catalog mirror (`bondy.dk` — `tech.thk.com` itself
returns HTTP 403 in this environment) was read directly, page-image by
page-image, turning up THK's own "Examples of Selecting a Ball Screw"
chapter — the same worked example (model WTF2040-2) a prior session had only
seen through unverified WebSearch synthesis. Three of its printed numbers
now reproduce cleanly against the already-implemented kernel formulas —
drive torque (120 N·mm), nominal life (4.1e9 rev, with a documented `fw`
load-factor adaptation), and static safety factor (`fs = 2.5`) — added to
`math.test.ts` and `validation.ts`'s `referenceExamples` as
`thk-drive-torque`, `thk-nominal-life`, and `thk-static-safety-factor`. See
`lib/standards/engineering-sources.ts`
`"jp.thk.example_ball_screw_selection@bondy-mirror-2026-08-09"`.

**THK buckling/critical-speed formula — now implemented as a separate
independent benchmark (`thk-benchmark.ts`), a new corroboration and a new
discrepancy.** The same catalog page also prints buckling and critical-speed
formulas structurally identical to Steinmeyer's own (`factor * d^4/L^2 *
10^4` for buckling, `factor * d/L^2 * 10^7` for critical speed — linear in
`d`, not quartic, confirmed against two of THK's own worked numbers), metric
(mm) units, rather than Rockford's inch/lbf `Fe * 14,030,000 * ...` shape
this module's `math.ts` implements. `thk-benchmark.ts` reproduces all three
of THK's own worked numbers exactly (`15,500 N` buckling, fixed-fixed,
mounting factor `20`; `2180` and `3294 min^-1` critical speed, fixed-
supported, mounting factor `15.1` — a **different** nominal mounting
condition than the buckling example, per THK's own printed text) and is
cross-checked in `thk-benchmark.test.ts` against `math.ts`'s Rockford-based
functions for the equivalent geometry: they agree within the same order of
magnitude (ratios of `0.52` and `0.85`) but not to floating-point precision.
THK's own mounting-factor constants (`20`, `15.1`) are a **third** distinct
value alongside Steinmeyer's table for the same nominal conditions (`22.4`,
`17.7`) and Rockford's own (different formula shape entirely) coefficients —
not reconciled, and `math.ts` itself is unchanged, since only Rockford's
page supplies a worked example `math.ts`'s own formula shape reproduces
exactly. This satisfies the roadmap's "independent benchmark" item for
buckling/critical speed the same way `axis-load-cases/atlanta-benchmark.ts`
does for that module.

**Equivalent-dynamic-load methodology discrepancy — now implemented on both
sides, not just documented in prose.** THK's own worked example computes a
bidirectional duty cycle's equivalent load by splitting it into a positive-
direction and a negative-direction average, each normalized against the
_full_ round-trip travel distance rather than its own phases' subtotal, and
reports both without further combining them. This kernel's
`resolveEquivalentDynamicLoad` instead sums one weighted-cube-mean across
every phase directly (Steinmeyer's own published formula, evaluated as
printed) — a real procedural difference, not an input-mapping detail.
`thk-benchmark.ts`'s `resolveThkDirectionalEquivalentLoad` (new) implements
THK's own method as a genuinely separate computation, reproducing THK's own
printed `225 N` in both directions for its six-phase scenario.
`thk-benchmark.test.ts` feeds the mathematically equivalent per-phase
`(time fraction, rotational speed, load)` triples through `math.ts`'s
`resolveEquivalentDynamicLoad` and confirms it gives `~283.5 N` for the
identical scenario — a machine-checked assertion that the two methods
disagree by a wide, non-rounding margin, not a number quoted only in a
comment that could silently go stale. (An earlier draft of this note stated
`~296 N`; that was a hand-arithmetic addition error, corrected here after
re-deriving the figure through the actual kernel function.) Neither method
is changed to match the other — a genuine, unresolved methodological
question, not a bug in either implementation; see
`resolveThkDirectionalEquivalentLoad`'s own doc comment for the specific
open question it does not resolve (what to do when the two directions'
equivalent loads disagree, which THK's own worked example does not need to
answer since its scenario is symmetric). See `validation.ts`'s `deviations`
entry and `context/modules/ball-screw/stage-1-spec.md` "Evidence Gaps and
Verification Confidence" for the full numeric account.

## Status

Stage 3 (compute and trace) is done as a draft. No package is registered:
this directory has no `index.ts` (`package.ts` only), so
`npm run registry:generate` cannot discover it.

**Stage 4 (validation) is done: `validation/ball-screw/0.1.0.md` is
complete** (2026-08-09), the first module in this project with a completed
Stage 4 record. It has six reference examples from two independent
manufacturers (three from one shared Rockford Ball Screw scenario, three
from one shared THK scenario — see above; honestly short of "three fully
independent scenarios," though it clears "at least three examples" by
count) and two independent-benchmark comparisons covering every check
(drive torque's three-manufacturer agreement; buckling/critical speed's
`thk-benchmark.ts` cross-check). No second engineer is available, so the
record uses the documented solo-validation reviewer-substitute policy
(`context/ai-workflow-rules.md` "Stage 4 — Validation"), citing those same
independent-benchmark comparisons as the review substitute.
`in-code` `validation.ts` still carries `reviewer`/`reviewDate` as `"TODO"`
— that field feeds a future sealed `ValidationRecord` at Stage 6 (release),
which has not started; it is not the same thing as the `validation/`
record's own completion.

**Stage 5 item closed same day: cross-module link compatibility.**
`cross-module-links.test.ts` (new) is the first per-module-pair link-
compatibility test in this codebase — it runs the real engine evaluator
(`evaluateLinkCompatibility`) against both `axis-load-cases` 0.1.0's and
this module's actual `manifest.ts` ports, confirming the `thrust_force`
link works correctly (including correctly rejecting a load-case mismatch)
and confirming, rather than assuming, that `case_time_fraction`/
`case_linear_velocity` have no current upstream producer (a documented gap,
`context/modules/ball-screw/stage-2-contract.md`). The remaining Stage 5
items — workflow role integration and workflow integration tests — stay
not-applicable until Unit 4.8 (`linear-axis@1`) exists; `manifest.ts`
`workflowRoles` is deliberately empty rather than inventing a workflow
vocabulary this module unit doesn't own.

Stage 4 completion is a documentation milestone, not a release: production
release no longer waits on Unit 4.1's Definition of Done —
`axis-load-cases@0.1.0` released 2026-08-11
(`validation/axis-load-cases/0.1.0.md`). This module's own Stage 6
(release) simply has not started.
