# Support Bearing 0.1.0 — Draft Package (Stages 3-5)

`math.ts` is a pure SI-number kernel for the sixth production engineering
module (Unit 4.6), covering the `0.1.0` proposed scope from
`context/modules/support-bearing/stage-1-spec.md`: one ball-screw shaft
support bearing (fixed-side angular contact, or supported/floating-side
deep-groove — `bearing.location` selects which), dynamic and static
equivalent load, basic (L10) rating life, static safety factor, and speed
margin.

- `resolveDynamicEquivalentLoad` / `resolveStaticEquivalentLoad` — NTN's
  own `P = X*Fr + Y*Fa` and `P0 = max(X0*Fr + Y0*Fa, Fr)` formulas
  (jp.ntn.rolling_bearings_handbook eq. 7.10, 7.12/7.13).
- `resolveNominalLife` / `resolveLifeHours` — `L10 = (C/P)^3 * 10^6`,
  `L10h = L10/(60n)` (eq. 6.1, 6.2) — the identical shape `ball-screw`'s
  own kernel already uses for the screw itself, mirrored rather than
  imported (this module's own component, a different physical part).
- `resolveStaticSafetyFactor` — `S0 = C0/P0` (eq. 6.6).
- `resolveOperatingSpeed` — `n = v / lead`. No gear-ratio term: the
  support bearing mounts directly on the screw shaft, not a driving/motor
  shaft (unlike `coupling 0.1.0`'s own driving-shaft speed).
- `resolveSpeedSafetyFactor` — `fs_n = n_allowable / n`, using the
  catalog allowable speed uncorrected (NTN's own `fL`/`fC` correction
  factors are graphs, not closed-form equations — not implemented in
  `0.1.0`, see `math.ts`'s own module doc comment). Requires a strictly
  positive operating speed; a true zero-speed case throws rather than
  reporting an infinite safety factor, the same treatment `coupling`'s
  own zero-operating-speed case receives.

## Stage 3 package (2026-08-10)

A full `ModulePackage` wraps the kernel:

| File                     | Role                                                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `manifest.ts`            | Identity, validity envelope, source revisions, and ports.                                                                                      |
| `input-schema.ts`        | Requires `dynamic_load_factor_y`, `static_load_factor_y`, and per-case `thrust_force` together when `bearing.location` is `"fixed"`.           |
| `compute.ts`             | Pure compute over the two supported load cases, branching on `bearing.location`.                                                               |
| `trace.ts` / `checks.ts` | Trace steps and acceptance checks.                                                                                                             |
| `ui.ts` / `report.ts`    | Generic UI and report schemas.                                                                                                                 |
| `validation.ts`          | Validation record — Stage 4 evidence (reference examples, independent benchmark) is complete; reviewer/reviewDate stay `TODO` pending Stage 6. |
| `package.ts`             | Sealed package. Named `package.ts`, not `index.ts`, so `npm run registry:generate` cannot discover it.                                         |

No registry version is released by this package — `bearing.*` was already
released at Stage 2 (`context/modules/support-bearing/stage-2-contract.md`,
registry `1.7.0`).

### Why the axial-load and Y-factor ports are optional at the manifest level

`bearing.location = "supported"` (the floating side) does not react axial
thrust in THK's own Support Unit design (stage-1-spec.md "Candidate
Sources" item 1) — its own catalog table gives that bearing only a radial
dynamic/static rating, no axial one. Requiring `motion.axis.thrust_force`,
`bearing.dynamic_load_factor_y`, and `bearing.static_load_factor_y`
unconditionally would force a "supported"-location calculation to
fabricate meaningless axial numbers. Instead the manifest marks all four
`required: false`, and `input-schema.ts` requires them together only when
`bearing.location` is `"fixed"` — the same "generic port shape can't
express this, so an author-provided schema rule does" pattern
`coupling 0.1.0`'s own bore-range check already established.

### What the package deliberately leaves out

- **No speed correction factors (`fL`/`fC`).** NTN's own handbook prints
  these as graphs (Figs. 10.1-10.2), not closed-form equations — the
  catalog allowable speed is used uncorrected, a documented simplification
  (`stage-1-spec.md` item 5, `validation.ts`'s own `deviations`).
- **No bore/outside-diameter or preload check.** `bearing.bore_diameter`,
  `bearing.outside_diameter`, and `bearing.preload` are reported catalog
  values only — a support bearing's bore is manufactured to one matched
  shaft diameter, not a clamping range the way `coupling`'s own bore
  compatibility is (`stage-2-contract.md` "Decisions").
- **No 3-point statically-indeterminate load derivation.** NTN's own
  Table 7.3 reaction formulas are sourced but not implemented — this
  module's own `0.1.0` scope is two-point shaft support only
  (`stage-1-spec.md` "Validity Envelope").
- **No torsional-resonance check.** Same gap `coupling 0.1.0` has for the
  same reason: no released motor/load inertia parameter exists yet.

## Stage 2 (2026-08-09): six decisions, all sourced from Stage 1's own open questions

`context/modules/support-bearing/stage-2-contract.md` resolved all six
Stage 2 entry criteria and released registry `1.7.0`. The two worth
restating here:

- **One support bearing per calculation run**, selected by a new
  `bearing.location` enum (`fixed` | `supported`) — not a combined
  fixed+floating calculation. The two locations are physically different
  components (an angular contact bearing vs. a deep-groove bearing) with
  different applicable checks, the same "one candidate component per run"
  scope every other Milestone 4 module already uses.
- **Radial load has no clean upstream source.** Unlike axial load (which
  reuses `motion.axis.thrust_force` directly, satisfying the roadmap's own
  Unit 4.6 gate — "integrates with the ball-screw module without a custom
  link mapping"), no released parameter represents the support bearing's
  own radial load. `bearing.actual_radial_load` is a new required
  engineer-supplied input instead, the same treatment `coupling`'s own
  actual-misalignment inputs already received.

## Stage 1 kernel, before the package existed

`math.test.ts` (18 tests) tests every function against boundary/invalid
input and elementary property checks (the static-equivalent-load `max()`
form taking either branch, a zero axial load producing the pure-radial
dynamic equivalent load, etc.) rather than a published worked numerical
example — reserved for Stage 4 (below), not guessed here.

## Stage 4 (2026-08-10): NSK's own worked examples, found after NTN's stayed missing

The evidence gap `math.test.ts`'s own header comment and `stage-1-spec.md`
"Evidence Gaps" recorded — no full published worked numerical example —
stayed open through 2026-08-09: NTN's own handbook table of contents lists
a "Bearing Life Calculation Examples" section at printed page 84, but the
copies fetched that session (`ntnglobal.com`, `ntnamericas.com`) are
identically truncated right before it. **A third, independent NTN Group
edition (`ntn-snr.com`) was retried 2026-08-10 and is truncated at exactly
the same point** — page 83 is a blank name/address/phone card, page 84
does not exist in this copy either. Three independently-fetched editions
now agree, which is much stronger evidence this is a persistent omission
from the handbook's own printing than a one-off fetch failure — see
`lib/standards/engineering-sources.ts`'s own note on
`jp.ntn.rolling_bearings_handbook@cat-9012e`.

That retry redirected the search toward a different manufacturer instead of
a fourth NTN mirror. **NSK Ltd.'s own "Rolling Bearings" catalog (CAT. No.
E1102a) has exactly the section NTN's is missing**: Section 5.7 "Examples
of Bearing Calculations" (printed pages A34-A36), six full worked examples.
Examples 1 and 3 both use single-row deep-groove ball bearing 6208 —
Example 1 under a pure radial load, Example 3 the same bearing with an
added axial load — the exact scope split this module's own
`bearing.location` (`supported` vs. `fixed`) already models.

- `nsk-reference-examples.ts` / `.test.ts` run both examples through
  `executeModule(supportBearingModule, ...)` — the real, sealed-package
  compute path, not just the kernel formulas below — and confirm the
  computed dynamic equivalent load matches NSK's own exact printed figures
  (`P = 2500 N`, `P = 3070 N`) and the computed basic rating life matches
  NSK's own stated approximate service life (`~29,000 h`, `~15,800 h`)
  within a documented 2% chart-reading tolerance.
- `nsk-fh-benchmark.ts` / `.test.ts` close the independent-benchmark gap
  the same header comment recorded ("no independent-benchmark candidate
  exists yet"). NSK packages the identical ISO-281-catalogue physics
  `math.ts` already implements into a different form — a speed factor `fn`
  and a fatigue life factor `fh = fn*C/P`, read off a chart or computed as
  `Lh = 500*fh^3` for ball bearings — reproduced here as a genuinely
  separate computation, then proved (not just observed) to be algebraically
  identical to `resolveNominalLife`/`resolveLifeHours`'s own `(C/P)^3 *
10^6/(60n)` form. The two are asserted to agree to floating-point
  precision, the same "proved identity" treatment
  `lib/modules/linear-guide/0.1.0/iko-benchmark.ts` gives PMI's and IKO's
  own equivalent-load forms.

With both evidence items met, the solo-validation reviewer-substitute
policy (`context/ai-workflow-rules.md` "Stage 4 — Validation") is now
invokable for this module — see `validation.ts` for the full record.

## Stage 5 (2026-08-10): cross-module link compatibility

`cross-module-links.test.ts` (6 tests) confirms, against the real engine
link-compatibility evaluator and each module's real `manifest.ts` ports,
that `axis-load-cases`' per-case `motion.axis.thrust_force` output links to
this module's own per-case thrust-force input — direct evidence for the
roadmap's own Unit 4.6 gate wording ("integrates with the ball-screw module
without a custom link mapping"): `ball-screw` itself produces no output
this module can consume (only `screw.*` results), so the real upstream
producer is `axis-load-cases`, the same source `ball-screw`'s own thrust
force already comes from. Also confirms a load-case mismatch stays
refused, `motion.axis.case_linear_velocity` (this module's own speed
input) has no producer anywhere yet — the same documented gap
`ball-screw`'s and `coupling`'s own files already record — and no
`bearing.*` catalog input accepts an upstream output. Generic UI and
report schema (`ui.ts`/`report.ts`, drafted at Stage 3) were already
passing conformance through `package.test.ts`. Workflow role integration
stays not applicable pending Unit 4.8.

Production release no longer waits on Unit 4.1's Definition of Done —
`axis-load-cases@0.1.0` released 2026-08-11
(`validation/axis-load-cases/0.1.0.md`). This module's own Stage 6
(release) simply has not started.
