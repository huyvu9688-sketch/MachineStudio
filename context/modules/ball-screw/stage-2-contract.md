# Ball Screw and Support Module — Stage 2 Parameter Contract

## Status

- Work unit: Unit 4.3, Stage 2 — parameter contract
- Date: 2026-08-08
- Released registry change: parameter registry `1.3.0`
- Stage 2 status: **resolved for a `0.1.0` scope matching `axis-load-cases`'
  own `normal`/`peak`-only restriction.** `holding` and `emergency_stop` are
  out of scope, for the same reason `axis-load-cases 0.1.0` is: there is no
  supported upstream case to consume (`motion.axis.thrust_force` for those
  two cases is a registry-level-only allowance today, not something any
  released module actually populates yet). See "Decisions" below for the
  three items `stage-1-spec.md` "Stage 2 Entry Criteria" left open (items 2,
  3, and 6 of that list; items 1 and 5 there were already resolved in Stage
  1 and are not reopened here).
- Module status: **Stage 3 draft package built 2026-08-08** (same day as
  this contract). A full `ModulePackage` — manifest, ports, input schema,
  compute, calculation trace, checks, generic UI schema, report schema, and
  a draft validation record — wraps `math.ts` in
  `lib/modules/ball-screw/0.1.0/` (assembled in `package.ts`, not
  `index.ts` — see that directory's `README.md` "Stage 3 package"). It
  registers no module and creates no calculation run. Production release
  remains sequentially gated behind Unit 4.1's Definition of Done regardless
  (`context/implementation-map.md` Milestone 4 header).

This record does not edit `lib/modules/ball-screw/0.1.0/math.ts` — the
Stage 1 kernel's formulas are unchanged. It fixes what the future package's
ports mean and adds two new registry-required inputs
(`screw.static_safety_factor_minimum`, `screw.buckling_safety_margin`) that
the kernel's existing `resolveStaticSafetyFactor` and `resolveBucklingLoad`
callers will need to supply once a `checks.ts` is written.

## Decisions

### 1. Static safety factor minimum

**Resolved: the minimum is a required module input
(`screw.static_safety_factor_minimum`), not a built-in constant.**

`stage-1-spec.md` left this open after failing to independently read a THK
catalog table (blocked by this environment's PDF page-range limitation) and
finding two WebSearch syntheses of "the same" THK table disagree with each
other. This session tried again, from different sources:

- **[MITcalc, *Ball screws, design, calculation and
  check*](https://www.mitcalc.com/doc/ballscrew/help/en/BallScrew.htm)**
  — fetched and read directly (2026-08-08), not a WebSearch paraphrase. Its
  own section [8.29] states, verbatim: "Values should be greater than the
  following recommendations. It is estimated based on the specified load
  factor [3.15]." — followed by a table:

  | Machine type | Without vibration/impact | With vibration/impact |
  | --- | --- | --- |
  | General industrial machinery | 1.0 - 3.5 | 2.0 - 5.0 |
  | Machine tool | 1.0 - 4.0 | 2.5 - 7.0 |

  A follow-up fetch specifically asked whether this table cites a
  manufacturer, ISO, DIN, or JIS source. It does not: the page presents this
  as MITcalc's own estimate ("It is estimated..."), not a reproduction of a
  named manufacturer's or standards body's table, despite the page citing
  ISO/DIN/JIS elsewhere for other formulas. This is a **handbook/calculation-
  software source, not a manufacturer or standards-body source**
  (`context/ai-workflow-rules.md` "Market Standards and Source Workflow"
  distinguishes these tiers explicitly) — useful as a documented reference
  point, not as an authoritative minimum.
- **Two other numeric ranges surfaced by WebSearch, neither independently
  read, both left unrecorded as evidence per this project's existing
  practice of not upgrading an unverified secondhand summary** (the same
  discipline `stage-1-spec.md` already applied to its own unread THK table
  and to the unverified Oriental Motor RMS blog post in
  `motion-profile/stage-1-spec.md`): one WebSearch summary claimed "1.0-1.3
  general industrial / 2.0-3.0 with vibration" (a range that does not match
  MITcalc's own table); another claimed "1.0-2.0 normal operation / 2.0-3.0
  with impact/vibration," apparently traceable to a University of Utah
  precision-machine-design lecture PDF
  (`my.mech.utah.edu/~me7960/lectures/Topic4-BallscrewCalculations.pdf`) that
  was fetched but could not actually be read this session — a 14-page PDF
  that hit the same `pdftoppm`-not-installed page-range limitation already
  recorded in `context/progress-tracker.md` "Environment notes" (confirmed
  again here as a genuine per-document limit, not merely a >19-page one: a
  14-page document also failed).
- **THK's own catalog remains blocked.** A direct fetch of
  `tech.thk.com/en/products/pdf/en_a15_030.pdf` ("A15-30 Permissible Axial
  Load — Buckling Load on the Screw Shaft," found via WebSearch this
  session) returned HTTP 403, consistent with `stage-1-spec.md`'s prior
  finding for this host. Nook Industries' PMBS catalog PDF also returned 403
  on direct fetch.

**Given no manufacturer or standards-body minimum was ever confirmed by
direct reading — across two full sessions of searching — `0.1.0` does not
hardcode one.** `screw.static_safety_factor_minimum` is a required input:
the engineer supplies the minimum their own project/company policy or
customer specification demands, and the module's future `checks.ts` compares
the computed `screw.static_safety_factor` against it. This is not a weaker
resolution than picking a number — it is the more honest one: MITcalc's own
table shows the "correct" minimum genuinely depends on machine type and
vibration/impact condition (a 1.0-7.0 spread across just four rows), so a
single embedded constant would misrepresent a judgment call as a computed
fact. This is the same category of decision `context/code-standards.md`
"Standards and Sources" calls a company rule, distinct from a regulatory
requirement or consensus standard, and the registry records it as an
explicit input for that reason.

### 2. Buckling safety margin

**Resolved: also a required module input (`screw.buckling_safety_margin`),
not a built-in constant — for the same reason as item 1, applied to a
different disagreement.**

`stage-1-spec.md` already found a direct, source-confirmed conflict:
Steinmeyer states a `0.5` multiplier on the theoretical buckling load;
Rockford Ball Screw's own worked numerical example applies `Fs = 0.8` to the
identical formula. This session looked for a tiebreaker and did not find
one that meets this project's evidence bar:

- A WebSearch synthesis claimed "THK multiplies buckling load calculations
  by a safety factor of 0.5" (agreeing with Steinmeyer) — but THK's own
  buckling-specific page (`en_a15_030.pdf`, found by URL this session) was
  not reachable (see item 1), so this is an unverified secondhand claim, not
  independent corroboration. It is recorded here as a data point for a
  future session that regains THK access, not as evidence that resolves the
  discrepancy now.
- `linearmotiontips.com`'s "How to avoid ball screw buckling" and
  `toco.tw`'s ball-screw sizing guide (both found via WebSearch as candidate
  tiebreakers) both returned HTTP 403 on direct fetch.

Rather than silently pick Steinmeyer's more conservative `0.5` (as the
Stage 1 kernel currently does as an explicitly-flagged placeholder) or
Rockford's `0.8`, `0.1.0` requires the engineer to state which convention
governs their project — `screw.buckling_safety_margin`, range `0-1`, no
default. A released calculation run then always records which value was
actually used, rather than leaving that choice implicit in which
manufacturer's convention happened to be hardcoded. This also directly
implements `stage-1-spec.md`'s own suggested alternative ("expose both as
distinct outputs rather than picking one") in the input-side form: instead
of two output ports for the same physical quantity (confusing for a
canonical parameter, and for the parameter graph's link-compatibility
rules), the module asks for the choice once and reports one clean
`screw.permissible_compressive_load` output computed from it.

The critical-speed operating margin (`0.8`) is **not** made configurable the
same way, because there is no discrepancy to resolve there: Rockford's own
`Fs = 0.8` and Steinmeyer's "approximately 80%" agree
(`stage-1-spec.md` item 8). `resolveCriticalSpeed`'s fixed `0.8` stays a
kernel constant, not a registry parameter.

### 3. Equivalent-load duty-cycle port shape

**Resolved: the two per-phase inputs the equivalent-dynamic-load formula
needs (`q_i`, per-phase time fraction; `n_i`, per-phase rotational speed —
derived from linear velocity) are modeled as new `motion.axis.*` parameters,
not `screw.*` parameters, reusing the module's already-scoped `normal`/`peak`
load cases as the duty-cycle phases.**

`stage-1-spec.md` "Existing Parameter Review" offered this "reuse the
existing named load cases as duty-cycle phases" approach as a candidate,
explicitly not decided. Two things needed resolving to turn it into an
actual contract:

- **Which load cases.** `ball-screw 0.1.0` computes only `normal` and
  `peak`, mirroring `axis-load-cases 0.1.0`'s own scope (see "Status"
  above and `context/modules/axis-load-cases/stage-2-contract.md`
  "Load-Case Semantics"). There is no `holding` or `emergency_stop` thrust
  force to consume yet, so there is nothing for those cases' duty-cycle
  phases to carry.
- **Which parameter scope.** The overlap-analysis step in the parameter
  proposal checklist (`lib/engine/parameters/README.md`) requires searching
  related modules before adding a near-duplicate. A per-case linear velocity
  and a per-case time fraction are not ball-screw-specific physics — they
  are axis-level kinematic/duty facts that a future module (e.g. a
  friction/heat check, or Unit 4.7's own duty-cycle-aware RMS torque
  aggregation) could equally need. `axis-load-cases` already established the
  "per-instance port on the existing case enum" pattern for
  `motion.axis.case_travel_direction` and `motion.axis.case_axial_acceleration`
  — this reuses that pattern rather than inventing a `screw`-scoped
  duplicate. Two new parameters were added to the existing `axisApplication`
  group instead of a new `ballScrew` group:

  | Parameter | Meaning |
  | --- | --- |
  | `motion.axis.case_time_fraction` | Fraction of the total duty cycle spent in this load case. Distinct from the existing `motion.axis.duty_cycle` (a single motion-vs-stationary ratio, not indexed per case). |
  | `motion.axis.case_linear_velocity` | Axis linear velocity magnitude during this load case. Distinct from `motion.profile.peak_velocity` (a motion-cycle-level maximum, not tied to axis-load-cases' own case labels — conflating the two would repeat the exact mistake `axis-load-cases/stage-2-contract.md` "Load-Case Semantics" already warns against: "acceleration is not automatically `peak`"). |

  Both are registered with `loadCases: ["normal", "peak", "emergency_stop"]`
  — the same registry-level readiness `case_travel_direction` and
  `case_axial_acceleration` already have — even though `ball-screw 0.1.0`
  itself will only wire up `normal`/`peak`, matching the "registry-level
  readiness vs. module-scope restriction" split
  `axis-load-cases/stage-2-contract.md` already established.

A future package converts each case's `motion.axis.case_linear_velocity`
into a rotational speed via the already-built `resolveRotationalSpeed`
(using `screw.lead`), then feeds `[{q: case_time_fraction, n: <converted>,
F: motion.axis.thrust_force}, ...]` into the already-built
`resolveEquivalentDynamicLoad` — no kernel change needed, only new inputs to
supply it with.

## Released Additive Contract

Registry `1.3.0` adds these released canonical parameters. It does not edit
a released `1.0.0`/`1.1.0`/`1.2.0` definition.

### New `motion.axis.*` parameters (see "Decisions" item 3)

| Parameter | Value and units | Cases | Meaning |
| --- | --- | --- | --- |
| `motion.axis.case_time_fraction` | quantity, ratio, `0-1` | `normal`, `peak`, `emergency_stop` | Fraction of the total duty cycle spent in this load case. |
| `motion.axis.case_linear_velocity` | quantity, `m/s`, `>= 0` | `normal`, `peak`, `emergency_stop` | Axis linear velocity magnitude during this load case. |

### New `screw.*` parameters

Screw geometry and catalog-rating inputs (not case-specific):

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `screw.minor_diameter` | quantity, `m`, `> 0` | Minor (root) diameter — not nominal/major (`stage-1-spec.md` items 7-8). |
| `screw.lead` | quantity, `m`, `> 0` | Linear travel per revolution. |
| `screw.unsupported_length` | quantity, `m`, `> 0` | Unsupported shaft length between bearing supports. |
| `screw.end_support_arrangement` | enum: `fixed-fixed` / `fixed-supported` / `supported-supported` / `fixed-free` | Buckling/critical-speed end-fixity arrangement. |
| `screw.dynamic_load_rating` | quantity, `N`, `> 0` | Basic dynamic axial load rating, `Ca`. |
| `screw.dynamic_load_rating_basis` | enum: `revolutions` / `distance` | Which life convention `dynamic_load_rating` uses — not interchangeable (`stage-1-spec.md` item 5). |
| `screw.static_load_rating` | quantity, `N`, `> 0` | Basic static axial load rating, `C0`. |
| `screw.preload` | quantity, `N`, `>= 0` | Ball-nut preload, `F0`. |
| `screw.internal_friction_coefficient` | quantity, ratio, `>= 0` | Preload-nut internal friction coefficient, `mu0`. |
| `screw.mechanical_efficiency` | quantity, ratio, `0 < x <= 1` | Drive mechanical efficiency, `eta`. |
| `screw.gear_ratio` | quantity, ratio, `> 0`, default `1` | Screw-to-driving-shaft gear ratio, `i`. Default `1` is a structural statement (no gearbox), not a guessed physical value. |
| `screw.static_safety_factor_minimum` | quantity, ratio, `> 0`, **required, no default** | Engineer-supplied minimum acceptable `fs` (see "Decisions" item 1). |
| `screw.buckling_safety_margin` | quantity, ratio, `0-1`, **required, no default** | Engineer-supplied buckling permissible-load multiplier (see "Decisions" item 2). |
| `screw.manufacturer_speed_limit` | quantity, `rad/s`, `>= 0`, optional | Catalog DN-derived speed limit, only when the specific screw's own data supplies it (`stage-1-spec.md` item 9). |

Outputs:

| Parameter | Value and units | Cases | Meaning |
| --- | --- | --- | --- |
| `screw.drive_torque` | quantity, `N*m`, `>= 0` | `normal`, `peak` | Required drive torque, `T_L`. |
| `screw.equivalent_dynamic_load` | quantity, `N`, `>= 0` | — | Duty-cycle-weighted equivalent dynamic load, `F_m`. |
| `screw.mean_rotational_speed` | quantity, `rad/s`, `>= 0` | — | Duty-cycle-weighted mean rotational speed, `n_m`. |
| `screw.nominal_life` | quantity, `rev`, `>= 0` | — | Nominal (L10) fatigue life in revolutions. |
| `screw.nominal_life_hours` | quantity, `s` (display `h`), `>= 0` | — | Nominal life converted to hours. |
| `screw.static_safety_factor` | quantity, ratio, `>= 0` | `normal`, `peak` | Computed `fs = C0 / applied load`. |
| `screw.buckling_load` | quantity, `N`, `>= 0` | — | Unfactored theoretical Euler buckling load. |
| `screw.permissible_compressive_load` | quantity, `N`, `>= 0`, `bound: allowable` | — | `buckling_load * buckling_safety_margin`. |
| `screw.critical_speed` | quantity, `rad/s`, `>= 0` | — | Unfactored theoretical critical (whip) speed. |
| `screw.permissible_speed` | quantity, `rad/s`, `>= 0`, `bound: allowable` | — | `critical_speed * 0.8` (fixed — see "Decisions" item 2). |

A new dimensionless unit, `rev` (revolutions), was added to
`lib/engine/units/registry.ts` for `screw.nominal_life` — the same treatment
already given to `efficiency` alongside `ratio`/`percent`: a distinct symbol
for the same `dimensionless` dimension, for display clarity, not a new
physical dimension or a new generic capability.

## Existing Parameter Mapping

The future package reuses these already-released definitions without
changing their meaning:

| Purpose | Canonical parameter |
| --- | --- |
| Applied axial load per case (input) | `motion.axis.thrust_force` (`normal`, `peak`) |
| Duty-cycle phase weighting (input, new) | `motion.axis.case_time_fraction` |
| Duty-cycle phase speed (input, new) | `motion.axis.case_linear_velocity` |

`motion.profile.peak_velocity` and `motion.profile.cycle_time` are
deliberately **not** reused for the duty-cycle aggregation, per "Decisions"
item 3's overlap analysis — they are cycle-level aggregates, not per-case
values, and using either here would silently blur "peak" in the motion-cycle
sense with "peak" in the axis-load-case sense.

## Method Sources

No new source-registry entry is added by this record in the sense
`axis-load-cases/stage-2-contract.md`'s "Method Sources" section means (a
formula citation). The two open items this record resolves (items 1 and 2
above) are resolved as **required inputs with no built-in default**
specifically because no source cleared this project's evidence bar for a
single authoritative number — see "Decisions" for the full account of what
was tried this session (MITcalc, THK's `en_a15_030.pdf`, Nook Industries,
linearmotiontips.com, toco.tw, and the Utah lecture PDF) and why each did or
did not count as evidence.

## Draft Kernel Impact

`lib/modules/ball-screw/0.1.0/math.ts` is unchanged. `resolveBucklingLoad`
still computes `permissibleCompressiveLoadN` using its own internal `0.5`
constant — a future `compute.ts` will need to call it with the
registry-supplied `screw.buckling_safety_margin` instead (or the kernel
function gains a margin parameter at that point; not decided here, since it
is a Stage 3 wiring detail, not a Stage 2 contract question).
`resolveStaticSafetyFactor` already returns the factor only, with no
built-in threshold, which already matches this record's resolution — a
future `checks.ts` compares its result against
`screw.static_safety_factor_minimum`.

## Stage 2 Entry Criteria — Resolution Status

Mapped against `stage-1-spec.md` "Stage 2 Entry Criteria":

1. Diameter convention — already resolved in Stage 1 (root/minor diameter);
   not reopened here.
2. Equivalent-dynamic-load duty-cycle input shape — **resolved**, "Decisions"
   item 3.
3. Static safety factor formula — already resolved in Stage 1
   (`fs = C0 / Fas_max`); the **minimum** value is **resolved as a required
   input**, "Decisions" item 1.
4. New `screw.*` registry parameters — **resolved**, "Released Additive
   Contract" above.
5. THK catalog reachability — **still blocked** (this session's own retry of
   a THK buckling-specific PDF also returned HTTP 403; see "Decisions" item
   2). No longer a release blocker either way, since items 1 and 2 are now
   resolved as inputs rather than waiting on that source.
6. Buckling safety margin (`0.5` vs. `0.8`) — **resolved as a required
   input**, "Decisions" item 2.

Stage 2 is complete for `0.1.0`'s scope.

**Stage 3 update (2026-08-08):** the draft package built from this contract
wraps `math.ts` directly, with two package-level (not kernel-level) wiring
decisions: `input-schema.ts` rejects a `"distance"`-basis
`dynamic_load_rating_basis` outright (0.1.0 has no documented conversion),
and `compute.ts` ignores the kernel's own baked-in `0.5` buckling margin,
recomputing the permissible compressive load from the registry-supplied
`buckling_safety_margin` input instead — see
`lib/modules/ball-screw/0.1.0/README.md` "Stage 3 package". Production
release remains sequentially gated behind Unit 4.1's Definition of Done
regardless (`context/implementation-map.md` Milestone 4 header).
