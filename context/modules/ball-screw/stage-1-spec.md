# Ball Screw and Support Module — Stage 1 Engineering Specification

## Status

- Work unit: Unit 4.3, Stage 1 — engineering specification and source intake
- Proposed module ID: `ball-screw`
- Proposed first released version: `0.1.0`
- Status: **Stage 1 draft.** Written in parallel with `axis-load-cases`' Stage 4
  evidence wait, per `context/ai-workflow-rules.md` ("Specification and
  source research may occur in parallel, but production release remains
  sequentially validation-gated") and `context/implementation-map.md`
  Milestone 4 header — the same allowance already used for `motion-profile`
  (Unit 4.2). Production release for Unit 4.3 remains sequentially gated
  behind Unit 4.1's Definition of Done regardless of how far this document or
  a future package gets.
- Date: 2026-08-08
- **Update (2026-08-08):** a draft kernel now exists —
  `lib/modules/ball-screw/0.1.0/math.ts` — covering lead/speed, drive torque,
  duty-cycle equivalent load, nominal life, buckling, and critical speed.
  Buckling and critical speed were originally deferred pending the
  diameter-convention question below; that question is now resolved with
  direct evidence (Rockford Ball Screw's explicit "Minor Diameter (root) of
  Screw" labeling plus a full worked numerical example, reproduced by the
  kernel), so both are implemented. See "Candidate Methods and Sources"
  items 5, 7, and 8 below and `lib/modules/ball-screw/0.1.0/README.md`.
- **Update (2026-08-08, cont'd):** the static safety factor formula is also
  now implemented (`resolveStaticSafetyFactor`, `fs = C0 / Fas_max`,
  sourced from WY Ball Screw). No recommended minimum `fs` value has been
  confirmed, so the function returns the computed factor only, with no
  built-in pass/fail threshold — see item 6 below. 39 kernel tests total.
- **Update (2026-08-08, Stage 2):** Stage 2 is now resolved. The follow-on
  record is `context/modules/ball-screw/stage-2-contract.md` — registry
  `1.3.0` releases the full `screw.*` parameter group plus two new
  `motion.axis.*` per-case parameters. The two items this document left open
  (the static safety factor minimum, item 6; the buckling safety margin,
  item 7/"Stage 2 Entry Criteria" item 6) are both resolved as **required
  module inputs with no built-in default**, not as a single hardcoded
  number — neither survived a second session's sourcing attempt with enough
  confidence to embed as a constant. See the Stage 2 record's "Decisions"
  for exactly what was tried and why. The module is still not registered or
  released; Stage 3 (compute and trace) has not started.
- **Update (2026-08-08, Stage 3):** a draft `ModulePackage` now exists —
  `lib/modules/ball-screw/0.1.0/package.ts` — wrapping this kernel with a
  manifest, ports, input schema, calculation trace, checks, generic UI/report
  schemas, and a draft validation record. See
  `lib/modules/ball-screw/0.1.0/README.md` "Stage 3 package". The module is
  still not registered (`package.ts`, not `index.ts`) or released; Stage 4
  (validation) has not started.
- **Update (2026-08-09, Stage 4 in progress):** a THK Ball Screw General
  Catalog mirror was read directly (via a third-party distributor host,
  `thk.com` remains blocked in this environment) and yielded THK's own
  "High-speed Transfer Equipment" worked example (model WTF2040-2) — the
  same example a prior session had only seen through unverified WebSearch
  synthesis. Three of its printed numbers now reproduce cleanly against
  already-implemented kernel formulas and are recorded as new, genuinely
  independent (different-manufacturer) reference examples in
  `validation.ts`: `thk-drive-torque`, `thk-nominal-life`,
  `thk-static-safety-factor`. The same page also surfaced two new,
  unresolved discrepancies (a third buckling-margin constant; a different
  equivalent-dynamic-load methodology for reversing duty cycles) — see
  "Evidence Gaps and Verification Confidence" below and
  `lib/modules/ball-screw/0.1.0/README.md`.
- **Update (2026-08-09, cont'd — independent benchmark implemented):**
  buckling and critical speed previously had no second-source computation at
  all (only Rockford's own formula, implemented directly, with no
  alternative implementation to compare against). THK's own catalog page
  supplied enough — formula, coefficients for two distinct mounting
  conditions, and three worked numbers — to implement it as a genuine
  second, independent computation:
  `lib/modules/ball-screw/0.1.0/thk-benchmark.ts` (new file), tested in its
  own sibling test file. It reproduces THK's own three worked numbers
  exactly and cross-checks against `math.ts`'s Rockford-based functions for
  the equivalent geometry, agreeing within a bounded ratio (same order of
  magnitude) but not floating-point precision — expected, since the two
  sources' mounting-factor constants for nominally identical end conditions
  differ by roughly 10-15%, a third data point alongside the already-known
  Steinmeyer/Rockford disagreement. This closes the roadmap's "at least one
  independent benchmark" item (Definition of Done item 9) for every check in
  this module.
- **Update (2026-08-09, cont'd — Stage 4 record completed):**
  `validation/ball-screw/0.1.0.md` is written, using the solo-validation
  reviewer-substitute policy (`context/ai-workflow-rules.md` "Stage 4 —
  Validation") — the THK-vs-Rockford buckling/critical-speed comparison and
  the three-manufacturer drive-torque agreement serve as the review
  substitute, since no second engineer is available. `validation/
  source-index.md` is updated with all five source revisions used. This
  completes Stage 4 for `ball-screw` 0.1.0 as a documentation matter; it
  does not register or release the module — that stays sequentially gated
  behind Unit 4.1 regardless. The record is honest about its remaining
  limitation: six reference examples exceed the roadmap's "at least three"
  by count, but come from only two independent worked scenarios (Rockford,
  THK), not three.
- **Update (2026-08-09, cont'd — cross-module link compatibility closed):**
  `lib/modules/ball-screw/0.1.0/cross-module-links.test.ts` (new) is the
  first per-module-pair link-compatibility test in this codebase, closing
  roadmap Module Definition of Done item 13 for this module. It runs the
  real engine evaluator (`evaluateLinkCompatibility`,
  `lib/engine/graph/compatibility.ts`) against `axis-load-cases` 0.1.0's and
  this module's actual `manifest.ts` ports — confirming the
  `normal_thrust_force`/`peak_thrust_force` links work (including correctly
  rejecting a load-case mismatch), and confirming, rather than assuming,
  that no `axis-load-cases` output currently satisfies
  `case_time_fraction`/`case_linear_velocity` (a real, already-documented
  gap in `stage-2-contract.md`, now also asserted against the real manifest
  rather than left as a spec-only claim). `validation/ball-screw/0.1.0.md`
  is updated to record this. Remaining Stage 5 items (workflow role
  integration, workflow integration tests) stay not-applicable until Unit
  4.8 exists.
- **Update (2026-08-09, cont'd — equivalent-dynamic-load discrepancy given a
  real second implementation, and a documentation error corrected):**
  `thk-benchmark.ts`'s `resolveThkDirectionalEquivalentLoad` (new) implements
  THK's own bidirectional/reversing-duty-cycle equivalent-load method as a
  genuinely separate computation from `math.ts`'s Steinmeyer-based
  `resolveEquivalentDynamicLoad` — reproducing THK's own printed `225 N` for
  both directions of its six-phase scenario in `thk-benchmark.test.ts`, and
  cross-checked there against `math.ts`'s formula fed the mathematically
  equivalent per-phase inputs, with a test that explicitly asserts the two
  results are NOT close (a real, substantial, machine-checked disagreement,
  not a comment that could silently go stale). **In the course of deriving
  that cross-check precisely, a hand-arithmetic error in this document's own
  earlier account was found and corrected: the kernel's own formula gives
  `~283.5 N` for THK's six-phase scenario, not the previously-recorded
  `~296 N`** (an addition slip — `14,860,695,490` misread as
  `16,860,695,490` — caught by re-deriving the figure through the actual
  `resolveEquivalentDynamicLoad` function rather than trusting hand
  arithmetic a second time). The discrepancy itself is unchanged in kind
  (a real, unresolved methodological disagreement) and only modestly
  smaller in magnitude (~26%, not ~32%) — the correction affects the exact
  number cited, not the conclusion. Every place this document, the module
  README, `validation.ts`, and `validation/ball-screw/0.1.0.md` cited the
  wrong figure has been corrected in the same change. Neither
  implementation is changed to match the other; the open question of what
  to combine `positiveDirectionLoadN`/`negativeDirectionLoadN` into when
  they disagree (THK's own example never needs to answer this, since its
  scenario is direction-symmetric) remains genuinely open, recorded in
  `resolveThkDirectionalEquivalentLoad`'s own doc comment.

No released parameter, module version, calculation run, or validation record
is changed by this document.

## Purpose

Given a candidate ball-screw shaft's own geometry and catalog rating data,
plus the axial load cases and motion timing already resolved by
`axis-load-cases` (Unit 4.1) and `motion-profile` (Unit 4.2), check whether
that specific screw is mechanically viable for the axis: static safety under
the required load, fatigue (nominal) life against the duty cycle, clearance
from buckling under compressive load, and clearance from critical (whip)
speed. It reports a required-spec / pass-fail-with-margin result for a screw
the engineer has already identified by size, lead, and end-support
arrangement — it does not search a catalog and rank candidates. Catalog
matching is explicitly item 12 ("optional") in `context/roadmap.md`'s Module
Definition of Done and is not attempted by `0.1.0`.

It will **not**:

- select a servo motor, gearbox, or drive/amplifier (Unit 4.7);
- distribute load among linear-guide blocks (Unit 4.4);
- size a coupling (Unit 4.5); or
- specify an actual support-bearing part number (Unit 4.6). "Support" in this
  module's own name (`implementation-map.md` "Unit 4.3 — Ball screw and
  support module") refers to the screw shaft's own end-fixity arrangement —
  an input describing how the shaft ends are mounted (e.g. fixed-fixed,
  fixed-supported, fixed-free), needed by the buckling and critical-speed
  formulas below — not a bearing catalog selection. That is Unit 4.6's
  separate responsibility, per `context/roadmap.md` Phase 1B listing "Ball
  screw and screw support" and "Support bearings" as two distinct modules.

## Candidate Methods and Sources

Every source below was fetched and read directly this session
(2026-08-08); where a source's formula rendered as an image rather than
text, the image itself was read (not a secondhand text summary of it) before
being recorded here — see "Evidence Gaps and Verification Confidence" for
which items that applies to, since one earlier secondhand extraction of the
buckling formula (`dN^2`, no leading constant) was caught as **wrong** against
the primary source (`dN^4 * 10^4`) by doing this.

### 1. Lead and rotational-speed relationship

Definitional screw-thread geometry, not a manufacturer-specific method — the
same "no citation needed" treatment `motion-profile/stage-1-spec.md` gives
elementary trapezoidal kinematics:

```text
v = N * P        (N = v / P)
```

`v` = linear feed rate, `N` = screw rotational speed, `P` = lead (linear
travel per revolution).

### 2. Applied axial load per case — reused, not re-derived

`axis-load-cases` already resolves `motion.axis.thrust_force` per load case
(`normal`, `peak`, `holding`, `emergency_stop` — `0.1.0` of that module
currently only populates `normal`/`peak`). This module takes that resolved
force directly as the screw's applied axial load per case; it does not
re-derive gravity, friction, or external-force terms.

### 3. Drive torque (ball-screw drive)

[Oriental Motor, *Motor Sizing Calculations*](https://www.orientalmotor.com/technology/motor-sizing-calculations.html)
— already in `reference/source-material/Oriental_Motor Sizing Calculators.pdf`
(page-verified 2026-08-08, page 4, "Load Torque Calculation - Ball Screw
Drive"), the same source family already used for `axis-load-cases`' load
resolution and cited by precedent in `context/modules/motion-profile/
stage-1-spec.md`. As printed:

```text
T_L = ( F*P_B / (2*pi*eta) + mu0*F0*P_B / (2*pi) ) * (1/i)
```

`T_L` = load torque, `F` = force of moving direction (this module reuses the
already-resolved `motion.axis.thrust_force` here instead of the source's own
`F = F_A + m*g*(sin(theta) + mu*cos(theta))`, since that resolution is
`axis-load-cases`' job, not this module's), `P_B` = ball screw lead, `eta` =
efficiency (source states typical range `0.85-0.95`), `F0` = preload
(source states `~= 1/3 * F`), `mu0` = internal friction coefficient of the
preload nut (source states typical range `0.1-0.3`), `i` = gear ratio between
screw and motor (`i = 1` for a direct-connected screw with no Unit-4.7
gearbox in between).

**Cross-checked (2026-08-08):** [Rockford Ball Screw, *How To Size A Ball
Screw*](https://rockfordballscrew.com/download/RBS_HowToSizeaBallScrew_Update2018.pdf)
step 10 gives the same `F*P/(2*pi*eta)` term independently (`Td = Sl*Pt /
(2*pi*Eff)`, no preload term in its own worked example) with a full worked
number (`Pt = 500 lbf`, `Sl = .250 in`, `Eff = 90%` → the source prints `23
in-lbs`, though its own shown arithmetic — `.177 * 500 * .250` — computes to
`22.125`, not `23`; the source's own final rounding is internally
inconsistent, not evidence against the formula). `resolveDriveTorque`
reproduces `22.1` from the more precise `1/(2*pi*0.9)`, matching the
source's own shown arithmetic to within its own rounding.

### 4. Equivalent dynamic axial load and mean rotational speed

[Steinmeyer, *Equivalent Load for Ball Screws*](https://www.steinmeyer.com/en/technology/service-life-calculations/equivalent-load/) —
formula images read directly (2026-08-08):

```text
F_m = cbrt( (q1*n1*F1^3 + q2*n2*F2^3 + ... + qn*nn*Fn^3)
            / (q1*n1 + q2*n2 + ... + qn*nn) )

n_m = (q1*n1 + q2*n2 + ... + qn*nn) / (q1 + q2 + ... + qn)
```

`F_m` = equivalent (mean) dynamic axial load, `n_m` = mean rotational speed,
and for each duty-cycle phase `i`: `q_i` = time fraction, `n_i` = rotational
speed, `F_i` = applied axial load (thrust, adjusted for preload per the
source's own caveat).

This is structurally identical (weighted-cube-mean shape) to the formula a
WebSearch summary attributed to **ISO 3408-5** (*Ball screws — Part 5: Static
and dynamic axial load ratings and operational life*, confirmed to exist and
its exact title via [iso.org's standard listing](https://www.iso.org/standard/34618.html);
its own clause text was not independently accessible this session — see
"Evidence Gaps"): `Fm = (sum(Fej^3 * (nj/nm) * qj))^(1/3)`. Two independently
reached sources agreeing on structure is treated the same way the project
already treats a confirmatory independent source elsewhere (e.g. ABB AN00115
for `motion-profile`'s base kinematics) — supportive, not itself a
substitute for reading the primary standard.

### 5. Nominal (fatigue) life

[Steinmeyer, *Ball Screw Fatigue Life*](https://www.steinmeyer.com/en/technology/service-life-calculations/fatigue-life/) —
formula images read directly (2026-08-08):

```text
L10 = (C_a / F_m)^3 * 10^6        [revolutions]
F_m = C_a / (L10 / 10^6)^(1/3)    [permissible mean load for a target life]
```

`C_a` = basic dynamic axial load rating (a catalog/data-sheet value for the
specific screw), `F_m` = equivalent dynamic axial load (item 4 above). The
page states "the useful life L10 can be expected to be reached by 90% of a
sufficiently large number of identical ball screws having a load capacity
Ca, when subjected to the mean load Fm" and cites "ISO / DIN standards" by
name without quoting clause text. An hours conversion (`L10h = L10 / (60 *
n_m)`) appears in the independent
[UNC Charlotte Industrial Solutions Lab, *Ball Screw Selection Guide*](https://isl.charlotte.edu/ball-screw-selection-guide/)
page, which explicitly cites Bosch Rexroth's *Linear Motion Technology
Handbook* as its own source and gives the identical `L = (C/FM)^3 * 10^6`
structure independently — a second source agreeing on the life-law shape.

**New finding (2026-08-08):** [Rockford Ball Screw, *How To Size A Ball
Screw*](https://rockfordballscrew.com/download/RBS_HowToSizeaBallScrew_Update2018.pdf)
(fetched and read directly) gives a complete worked numerical example of the
same life-law shape, but expresses life in **inches of travel**, not
revolutions: `(Pr/Pt)^3 * 1,000,000 = Life [inches]` (worked: `Pr = 1561
lbf`, `Pt = 500 lbf` gives `30,400,000` inches, reproduced exactly by this
kernel's `resolveNominalLife`/`resolvePermissibleMeanLoad` algebra). Plugging
Rockford's own `Pr` rating directly into the revolution-basis formula above
instead gives `(1561/500)^3 * 10^6 ≈ 30,450,000` — a **different, and wrong,
quantity** unless converted (the two differ by the screw's lead: `life[in] =
life[rev] * lead[in]`). This means a manufacturer's dynamic-load-rating
figure is **not automatically compatible** with this section's revolution-
basis formula without confirming which life-basis convention that specific
manufacturer's catalog uses first. Not resolved here — flagged as a new
Stage 2 item (see "Stage 2 Entry Criteria"); `lib/modules/ball-screw/0.1.0/
math.ts`'s `resolveNominalLife` doc comment carries the same warning so a
future caller cannot miss it at the point of use.

### 6. Static safety factor

**Formula resolved (2026-08-08), recommended minimum still open.**
[WY Ball Screw, *Understanding Load in Ball Screw
Applications*](https://www.wyballscrew.com/post/understanding-load-in-ball-screw-applications) —
fetched and read directly — states the check as `Fas_max < C0 / fs`,
i.e. `fs = C0 / Fas_max` (implemented as `resolveStaticSafetyFactor`).
[Steinmeyer, *Ball Screw Maximum Load
Guidelines*](https://www.steinmeyer.com/en/technology/maximum-load/)
corroborates the underlying `C0`/static-capacity concept ("the highest
permissible load is the minimum of static capacity C0a... and fracture
load"), and a WebSearch summary of ISO 3408-5's own scope states `C0` "is
based on a maximum deformation of 0.0001 * Dw" (`Dw` = ball diameter).

**No recommended minimum `fs` value was confirmed this session.** A large
THK catalog excerpt (`Precision_ball_screw_and_spline_THK.pdf`, reached via
a Contentful CDN mirror rather than the blocked `tech.thk.com`) very likely
contains THK's own minimum-`fs`-by-operating-condition table — cached
locally after a successful fetch — but exceeds this environment's PDF
page-range reading limit (`pdftoppm` not installed; see
`context/progress-tracker.md` "Environment notes") and was not read. Two
WebSearch summaries produced materially *different* numeric ranges for the
same claimed THK table on the same query (e.g. one said "1.0-1.3 general
industrial / 2.0-3.0 with vibration," another said "1.0-3.5 general
industrial / 2.0-5.0 with vibration") — an inconsistency across the
search tool's own syntheses, not a confirmed reading, so **neither range is
recorded here**. `resolveStaticSafetyFactor` computes the factor only, with
no built-in minimum, exactly reflecting this gap rather than guessing.

### 7. Buckling (critical axial compressive load)

**Diameter convention resolved (2026-08-08)** — see below. Two formulas are
now on record:

[Steinmeyer, *Buckling Resistance in Ball Screws*](https://www.steinmeyer.com/en/technology/maximum-load/buckling/) —
formula image read directly (2026-08-08), **correcting** an initial secondhand
text-extraction of the same page that misreported the diameter exponent as
`dN^2` with no leading constant:

```text
P_B = m * dN^4 / lS^2 * 10^4     [N, dN and lS in mm]
F_max = 0.5 * P_B                (permissible axial load)
```

Bearing/end-support coefficient table (`m`), as printed:

| Support arrangement | `m` |
| --- | --- |
| Fixed - fixed | 22.4 |
| Fixed - supported | 11.2 |
| Supported - supported | 5.6 |
| Fixed - free | 1.4 |

[Rockford Ball Screw, *How To Size A Ball Screw*](https://rockfordballscrew.com/download/RBS_HowToSizeaBallScrew_Update2018.pdf) —
read directly (2026-08-08), step 9, with a complete worked numerical example
(`Dmin = .84 in`, `L = 41.347 in`, Fixed-Simple, `Fs = 0.8` → `Pc = 6,537
lbf`, reproduced by `resolveBucklingLoad` in the kernel to within whole-
pound-force catalog rounding):

```text
Pc = Fe * 14,030,000 * Fs * (Dmin^4 / L^2)     [lbf, Dmin and L in inches]
```

**`Dmin` is explicitly labeled "Minor Diameter (root) of Screw"** — this is
the direct confirmation the two sources' diameter conventions needed. It
matches the UNC Charlotte ISL guide's `d2` ("screw core diameter") from
Bosch Rexroth's *Linear Motion Technology Handbook*, not Steinmeyer's own
`dN` ("nominal-o") label — meaning **root/minor diameter, not nominal/major
diameter, is the correct input**, confirmed by an unambiguous, explicit
statement plus a full worked example, not inferred. Steinmeyer's own
labeling of its "dN" variable as "nominal" is now a known point of tension
with this conclusion (see "Evidence Gaps and Verification Confidence"); the
kernel uses Rockford's own formula and coefficients directly rather than
attempting to reconcile the two, both because Rockford's diameter labeling
is unambiguous and because only Rockford's page supplied a worked numeric
example to validate against.

Rockford's end-fixity coefficients (`Fe`, `0.25 / 1.00 / 2.00 / 4.00` for
fixed-free / supported-supported / fixed-supported / fixed-fixed) are the
classic Euler effective-length-factor values (`1/K^2` for `K = 2, 1, 0.7,
0.5`) — textbook physics, not a manufacturer-proprietary fit — and their
*ratios* match Steinmeyer's own table closely (`16:8:4:1` in both), even
though the absolute constants differ. That's expected corroboration of the
same underlying physics from two differently-calibrated sources, not a
contradiction.

**Newly found discrepancy, not resolved:** Rockford applies `Fs = 0.8` to
buckling load (the same margin its critical-speed formula uses), while
Steinmeyer states "a factor of 0.5 should be applied" for buckling
specifically. These do not agree, and neither source is definitively
authoritative here. The kernel's `resolveBucklingLoad` uses `0.5`
(Steinmeyer's) as the more conservative choice pending resolution — an
explicit, documented decision, not a silent pick — see that function's own
doc comment.

### 8. Critical speed

[Steinmeyer, *Critical Speed in Ball Screws*](https://www.steinmeyer.com/en/technology/speed-limits/critical-speed/) —
formula image read directly (2026-08-08):

```text
n_k = k * dN / lS^2 * 10^7        [1/min, dN and lS in mm]
```

Recommended operating margin, as printed: "operating a ball screw only up to
a maximum speed not to exceed approximately 80% of the critical speed" (`n_op
<= 0.8 * n_k`), with an explicit caveat that a rotating-*nut* arrangement
with tight run-out tolerance may tolerate more — `0.1.0`'s validity envelope
(below) assumes the more common rotating-screw/translating-nut arrangement
and defers the rotating-nut case.

Bearing/end-support coefficient table (`k`), as printed:

| Support arrangement | `k` |
| --- | --- |
| Fixed - fixed | 25.5 |
| Fixed - supported | 17.7 |
| Supported - supported | 11.5 |
| Fixed - free | 3.9 |

[Rockford Ball Screw, *How To Size A Ball Screw*](https://rockfordballscrew.com/download/RBS_HowToSizeaBallScrew_Update2018.pdf),
step 6, gives the same relationship for the screw's own rotational speed
(before converting to the linear speed the source's own worked example
carries forward): `nk = Fe * 4,760,000 * (Dmin / L^2)` `[rev/min, Dmin and L
in inches]`, again explicitly on the root/minor diameter — see item 7. Both
this source's `Fs = 0.8` and Steinmeyer's "approximately 80%" **agree** on
the operating margin, unlike the buckling factor-of-safety discrepancy in
item 7 — the kernel's `resolveCriticalSpeed` applies `0.8` with no
cross-source conflict to document. Rockford's own end-fixity coefficients
(`0.36 / 1.00 / 1.47 / 2.23`) are used directly in the kernel, for the same
worked-example-availability reason given in item 7; the full worked example
(`687 in/min` permissible linear speed) is reproduced by
`resolveCriticalSpeed` to within whole-unit catalog rounding.

### 9. DN (speed) limit

Not a universal formula — a manufacturer/series-specific data-sheet limit
(a WebSearch summary found NSK stating its own screws "achieve high dN
values of 150,000-160,000," a claim about NSK's specific product line, not a
general physical law). `implementation-map.md` Unit 4.3 already phrases this
as "Manufacturer speed/DN limits **when data exists**" — `0.1.0` treats it as
an optional check gated on the specific screw's own catalog data being
supplied, not a formula this module derives.

**Update (2026-08-09):** THK's own "Examples of Selecting a Ball Screw"
worked example (see "Evidence Gaps and Verification Confidence") does print
an explicit formula, not just a data-sheet number: `N2 = 70,000 / D`
(`min^-1`, `D` = ball center-to-center diameter in mm), applied to a
large-lead rolled ball screw. `70,000` still reads as a THK/series-specific
constant (the same kind of manufacturer figure NSK's `150,000-160,000` claim
already illustrated, just with an actual formula shape attached this time),
not evidence of a universal DN law — the conclusion above is unchanged, this
just upgrades "a claim exists" to "a formula with one worked number exists,"
still not implemented in `0.1.0`.

## Validity Envelope (Proposed)

- One straight ball-screw shaft on one linear axis, consuming exactly one
  resolved axial-load case at a time from `axis-load-cases`.
- Rotating-screw / translating-nut arrangement. The rotating-nut arrangement
  (source item 8's own caveat) is out of scope for `0.1.0`.
- One of four end-support arrangements only: fixed-fixed, fixed-supported,
  supported-supported, fixed-free — the four the coefficient tables above
  cover. An intermediate-support (multi-span) arrangement is out of scope.
- No preload-dependent stiffness modeling beyond the internal-friction-
  coefficient and efficiency terms in the torque formula (item 3).
- No thermal derating beyond the ambient-temperature context
  `axis-load-cases` already carries.
- No structural compliance, backlash, or lubrication-regime modeling.

## Existing Parameter Review

Reused without change from already-released definitions:

| Purpose | Parameter |
| --- | --- |
| Applied axial load per case (input) | `motion.axis.thrust_force` |
| Feed rate, used to derive screw rotational speed (input) | `motion.profile.peak_velocity` |
| Cycle time context for duty aggregation | `motion.profile.cycle_time` |

**Gap already flagged once by `motion-profile`, and hit again here:** the
equivalent-dynamic-load formula (item 4) needs a set of `(q_i, n_i, F_i)`
duty-cycle phases. `motion.axis.duty_cycle` is a single axis-level ratio
("fraction of the total cycle time during which the axis is in motion"), not
indexed per load case, and the registry has no `table`-valued parameter type
(`context/modules/motion-profile/stage-2-contract.md` "Decisions" item 2
already documents this same limitation for its own multi-segment output).
A candidate way to avoid inventing a `table` parameter here — not decided,
offered for Stage 2 to evaluate — is to reuse the existing discrete named
load cases (`normal`, `peak`, `holding`, `emergency_stop`) as the duty-cycle
phases directly, each carrying its own new per-case time-fraction and
characteristic-speed input, the same "per-instance port on an existing case
enum" pattern `axis-load-cases` already established rather than a generic
`table` type. Whether that captures real operating duty cycles well enough
is a Stage 2 question, not resolved here.

Everything else this module needs is new. No `screw.*` parameter namespace
exists yet (`grep` of `lib/engine/parameters/definitions.ts` confirms zero
`id: "screw.*"` entries as of this document). A Stage 2 registry proposal
would need at least:

- Screw geometry/rating inputs: minor (root) diameter — **not** nominal/major
  diameter, per items 7-8's resolution — lead, unsupported length,
  end-support arrangement (enum), dynamic load rating (with its life-basis
  — revolutions or distance — explicitly recorded, per the new item-5
  finding above, since the two are not interchangeable), static load
  rating, preload, internal friction coefficient, efficiency.
- Outputs: required torque, equivalent dynamic load, mean rotational speed,
  nominal life (revolutions and/or hours), static safety factor, buckling
  load and margin, critical speed and margin.

## Checks (Proposed)

The kernel (`lib/modules/ball-screw/0.1.0/math.ts`) already computes every
value below; "proposed" here refers to wiring these into a package's
`checks.ts` pass/fail/warning surface, which does not exist yet (no package
exists — see "Status").

- Invalid input: non-positive lead, diameter, or unsupported length; an
  end-support arrangement outside the four covered by the coefficient
  tables.
- Static safety: applied load per case against static safety factor
  (`resolveStaticSafetyFactor`, `fs = C0 / Fas_max`): fail (not merely a
  warning) below whatever minimum Stage 2 adopts — the minimum itself is
  an evidence gap (see below), not invented here. The factor itself is now
  computable; only the pass/fail threshold is missing.
- Buckling: applied compressive load per case against
  `permissibleCompressiveLoadN` (`0.5 * P_B`, `resolveBucklingLoad`).
- Critical speed: derived rotational speed against `permissibleSpeedRevPerMin`
  (`0.8 * n_k`, `resolveCriticalSpeed`).
- DN limit: only evaluated when the specific screw's own catalog DN rating
  is supplied — otherwise traced as "not checked, no manufacturer data,"
  distinct from a pass.
- Nominal life: informational unless/until Stage 2 defines a required
  minimum life the check can fail against.

## Trace Contract (Proposed)

Mirroring the established pattern
(`context/modules/axis-load-cases/stage-1-spec.md` "Trace and Report
Contract", `context/modules/motion-profile/stage-1-spec.md` "Trace Contract
(Proposed)"):

1. `kinematics` — `lead-speed-relationship`
2. `applied-load-<case>` — the reused thrust force, traced back to its
   source run
3. `drive-torque-<case>`
4. `duty-aggregation` — `equivalent-dynamic-load`, `mean-rotational-speed`
5. `life` — `nominal-life`
6. `static-safety-<case>`
7. `buckling-<case>`
8. `critical-speed`
9. `validity-and-assumptions` — end-support arrangement, rotating-screw
   assumption, diameter-convention choice, omitted DN check when
   unavailable

Each formula step cites its registered source revision and exact
page/section, the same way `axis-load-cases` and `motion-profile` already
do; it must not repeat the formula in UI/report code.

## Evidence Gaps and Verification Confidence

Distinguishing what was actually read this session from what was inferred,
per this project's existing practice of not silently upgrading an
unverified secondhand summary into an implemented formula (see
`motion-profile/stage-1-spec.md`'s treatment of its still-unread RMS blog
post):

- **Directly image-verified this session (highest confidence):** the
  equivalent-load and life formulas (items 4-5, Steinmeyer) and the
  buckling/critical-speed formulas and coefficient tables (items 7-8) — the
  latter now cross-verified against a second source with an explicit
  diameter label and a full worked numerical example (Rockford Ball Screw).
  One secondhand paraphrase of the buckling formula (`dN^2`, no `10^4`
  factor) was caught as wrong this way before being recorded.
- **Diameter convention (dN vs. d2): resolved with direct evidence, not
  inferred.** Rockford Ball Screw's page states, unambiguously, "Dmin=Minor
  Diameter (root) of Screw" for both its buckling and critical-speed
  formulas, and its worked example reproduces correctly using that
  diameter. Steinmeyer's own page still literally labels its equivalent
  variable "dN" / "Nominal-o" — that tension is not fully explained (does
  Steinmeyer's own catalog quietly define "nominal diameter" as something
  closer to root diameter for this specific formula, or is it a genuine
  difference from Rockford's convention?), but is no longer blocking:
  Rockford's formula, coefficients, and worked example are used directly in
  the kernel instead of attempting to reconcile the two.
- **New discrepancy found, not resolved:** the buckling permissible-load
  safety margin. Steinmeyer states `0.5`; Rockford's own worked example uses
  `Fs = 0.8` for the identical buckling formula. The kernel uses `0.5`
  (more conservative) as a documented, deliberate choice — see item 7 and
  `resolveBucklingLoad`'s doc comment.
- **New discrepancy found, not resolved:** the dynamic-load-rating life
  basis. Rockford's own catalog rates screws against `10^6` **inches** of
  travel; the Steinmeyer/ISO-attributed formula this kernel's
  `resolveNominalLife` implements is `10^6` **revolutions**. The two are not
  interchangeable without converting by the screw's lead — see item 5.
  Discovered by reproducing Rockford's own worked numbers and finding they
  disagree with what the revolution-basis formula gives for the same
  catalog `Pr` figure, not by assumption.
- **Formula confirmed, minimum-value table not:** the static safety factor
  (item 6) — WY Ball Screw's page gives the formula directly (`fs = C0 /
  Fas_max`), read directly, not a secondhand summary. No minimum-`fs`-by-
  operating-condition table was confirmed: a THK catalog excerpt that
  likely has one was successfully fetched and cached (reached via a
  Contentful CDN mirror, not the blocked `tech.thk.com`) but its 20 pages
  exceed this environment's PDF page-range reading limit (`pdftoppm` not
  installed). Two WebSearch syntheses of the same underlying query gave
  *materially different* numeric ranges for what both claimed was the same
  THK table — treated as unreliable and not recorded, rather than picking
  either. Rockford's document does not cover static safety at all (only
  life, critical speed, buckling, torque, and horsepower).
- **Not independently read at all:** ISO 3408-5:2006 itself. Its title,
  scope area, and standard number are confirmed via `iso.org`'s own listing;
  its clause text is behind the standards body's paywall and was not
  purchased or otherwise accessed this session. Nothing above cites a
  specific ISO 3408-5 clause number — only the WebSearch-summarized
  paraphrase already flagged as such above.
- **THK's own ball-screw catalog** (515-1E, already cited by
  `axis-load-cases/stage-1-spec.md` for the axial-load method) returned HTTP
  403 on every attempted chapter/page URL both when first tried and on a
  same-session retry, including the specific "A15-32 Permissible Rotational
  Speed" chapter PDF — consistent with a bot-protection block on
  `tech.thk.com`, not the documented TLS-interception proxy issue
  (`context/progress-tracker.md` "Environment notes"): several *other*
  hosts failed with TLS/certificate errors instead of a clean HTTP 403,
  which does look like that proxy issue. No longer a blocker (Rockford
  supplied the evidence THK's catalog was expected to), but THK's own
  figures would still be a valuable independent third cross-check if the
  catalog becomes reachable another way later.
- **Update (2026-08-08, Stage 4 evidence search):** a second session
  specifically searched for a published worked example of the equivalent-
  dynamic-load duty-cycle calculation and the static safety factor
  calculation, to strengthen the reference-example set beyond the three
  Rockford-sourced examples in `lib/modules/ball-screw/0.1.0/validation.ts`
  (all three of which share one Rockford scenario, not three independent
  ones). No worked example was found for either formula from a source this
  session could actually read directly. A WebSearch synthesis surfaced a
  real, specific THK example — model WTF2040-2, `C0a = 13.6 kN`, high-speed
  transfer equipment with impact load during deceleration, static safety
  factor `fs = 2.5`, from the same `en_b15_069.pdf` ("Example Ball Screw
  Selections") already registered as `jp.thk.example_ball_screw_selection`
  in `lib/standards` — but the document itself returned HTTP 403 on direct
  fetch, so only these headline numbers are known, not the full input
  scenario (applied loads, speeds) needed to reproduce it. Per this
  project's practice of not upgrading an unverified secondhand summary into
  recorded evidence, this is **not** added to `validation.ts` as a reference
  example. **New finding this session: the block is not limited to
  `tech.thk.com`** — `www.thk.com` (a different subdomain, THK's own
  selection-guide site) also returned HTTP 403 this session, so the
  `context/progress-tracker.md` "Environment notes" THK entry should be read
  as "thk.com generally," not just its `tech.` subdomain. MISUMI's technical
  PDF and web page (`us.misumi-ec.com`) and Rockford's own PDF (re-checked
  specifically for these two formulas) were also tried and did not yield a
  worked example either.
- **Update (2026-08-09, THK example verified directly):** the WTF2040-2
  example flagged above as WebSearch-synthesis-only is now directly read and
  verified. `thk.com` remains blocked (confirmed again this session, on top
  of the two prior confirmations), but a third-party distributor's mirror of
  the full THK Ball Screw General Catalog
  (`https://bondy.dk/wp-content/uploads/THK-spindler.pdf`, 3.4 MB, ~172
  pages of this compiled catalog's "A" technical-description book) rendered
  page-by-page without hitting the `pdftoppm` page-range limitation
  documented in `context/progress-tracker.md` "Environment notes" — that
  limitation is evidently about the size of the *rendered range requested*
  per `Read` call (worked here at 15 pages per call, within the tool's own
  20-page cap), not the total document length, contrary to how the note had
  been read after the 2026-08-08 University of Utah PDF failure. The
  catalog's own printed page numbers (`A-679` through roughly `A-849`) map
  to physical PDF pages by a constant offset (`physical = printed − 677`,
  confirmed against the front-matter table of contents), which located the
  "Examples of Selecting a Ball Screw" chapter directly at printed pages
  `A-740`–`A-754` without a blind search. The full "High-speed Transfer
  Equipment (Horizontal Use)" example was read: selection conditions,
  screw-shaft sizing, axial-load-per-phase table (6 phases), buckling and
  critical-speed checks (a different, Steinmeyer-shaped formula — see
  below), nut selection (`WTF2040-2`, `Ca = 5.4 kN`, `C0a = 13.6 kN`),
  average axial load (`Fm = 225 N`), nominal life (`L = 4.1e9 rev`, using a
  `fw = 1.5` "load factor" this kernel does not implement), static safety
  factor (`fs = 2.5` assumed, permissible load `5440 N` derived), and drive
  torque (`T1 = 120 N.mm`). Three of these numbers reproduce cleanly against
  already-implemented kernel formulas and are now `thk-drive-torque`,
  `thk-nominal-life`, and `thk-static-safety-factor` in `validation.ts` —
  see `lib/modules/ball-screw/0.1.0/README.md` "Stage 4 evidence
  (2026-08-09)" for the full account, including two findings **not**
  resolved by this update:
  - THK's own buckling/critical-speed formula on this same page
    (`P1 = factor * d1^4/ls^2 * 10^4`; critical speed linear in `d1`, not
    quartic) is structurally identical to Steinmeyer's, not Rockford's
    (which this kernel implements), and uses a third distinct
    mounting-factor constant (`20` for fixed-fixed buckling, `15.1` for
    fixed-supported critical speed, vs. Steinmeyer's `22.4`/`17.7` for the
    same nominal conditions) — a new three-way discrepancy. **Now
    implemented as a separate independent computation** (not folded into
    `math.ts`, which is unchanged): `thk-benchmark.ts`, reproducing all
    three of THK's own worked numbers exactly, cross-checked against
    `math.ts`'s Rockford-based functions in `thk-benchmark.test.ts` (bounded-
    ratio, not exact, agreement — see item 7's "Update (2026-08-09, cont'd"
    entry above and `lib/modules/ball-screw/0.1.0/README.md`).
  - THK's own equivalent-dynamic-load worked calculation uses a direction-
    split methodology (positive/negative-direction averages, each
    normalized against the full round-trip distance) that differs
    procedurally from the single weighted-cube-mean this kernel's
    `resolveEquivalentDynamicLoad` implements (Steinmeyer's own formula,
    evaluated directly) — feeding THK's own six phases through the kernel's
    formula gives ~283.5 N, not THK's own printed 225 N. Recorded as a new,
    real discrepancy in `validation.ts`'s `deviations`, not resolved.

This session's PDF-reading tool cannot render page ranges from any PDF
longer than what it can read in one pass (`pdftoppm`, needed for ranged
rendering, is not installed) — confirmed against both a cached `WebFetch`
download and a local `reference/source-material/` file, and now recorded in
`context/progress-tracker.md` "Environment notes". Short PDFs (single-pass
length) read fine, as they already did in the sessions that verified the ABB
and Oriental Motor sources; this only blocked longer documents such as the
ISO 3408-5 preview (11 pages) and a candidate calculation-software vendor's
PDF (32 pages), both left unread this session for that reason.

## Stage 2 Entry Criteria

Stage 2 must resolve, with real sources where a manufacturer-specific
convention is involved (not invented here):

1. ~~The `dN`-vs-`d2` (nominal vs. core diameter) question~~ — **resolved
   2026-08-08**: root/minor diameter, per Rockford Ball Screw's explicit
   labeling and worked example (see "Evidence Gaps and Verification
   Confidence"). The buckling permissible-load safety-margin discrepancy
   this same source surfaced (`0.5` vs. `0.8`) is a new, separate open item
   — see item 6 below.
2. The equivalent-dynamic-load duty-cycle input shape — the discrete-
   named-load-case proposal in "Existing Parameter Review" above, versus
   waiting on generic `table`-valued parameter support, versus a documented
   evidence-backed alternative.
3. ~~A verified static safety factor formula~~ — **formula resolved
   2026-08-08** (`fs = C0 / Fas_max`, WY Ball Screw). A source-backed
   minimum recommended value remains open: `0.1.0` reports the factor
   without a pass/fail threshold, pending that evidence (see "Evidence
   Gaps and Verification Confidence").
4. New `screw.*` registry parameters per "Existing Parameter Review" above,
   through the normal registry-proposal checklist — including recording
   which life-basis (revolutions vs. distance) a supplied dynamic load
   rating uses, per item 5's finding, so the registry itself cannot silently
   accept an incompatible catalog figure.
5. Whether THK's catalog, or another manufacturer source, becomes reachable
   (this environment's PDF-reading limitation, not a network block, is now
   the specific obstacle for THK's own precision-ball-screw-and-spline PDF
   — see "Evidence Gaps and Verification Confidence") to independently
   triple-check the now-resolved diameter convention, the buckling
   safety-margin discrepancy, and supply the still-missing static-safety
   minimum-value table — valuable corroboration, no longer a release
   blocker.
6. Which buckling safety margin (`0.5`, Steinmeyer; `0.8`, Rockford) to
   adopt, or whether to expose both as distinct outputs rather than picking
   one. The kernel currently ships `0.5` as a conservative placeholder, not
   a resolved answer.

The kernel (`lib/modules/ball-screw/0.1.0/math.ts`) already computes every
value this module needs, including a static safety factor with no built-in
threshold (item 3) and buckling/critical speed using Rockford's coefficients
as a working default (explicitly flagged in code comments as pending item
6). What's left for Stage 2 is registry/contract work (items 2, 4) and
sourcing the two still-open recommended values (items 3's minimum, item 6's
margin choice) — not more kernel-level arithmetic. No package
(`manifest.ts`/`compute.ts`/etc.) exists yet, and none of this is
registered — production release stays gated behind Unit 4.1 regardless
(`context/implementation-map.md` Milestone 4 header).
