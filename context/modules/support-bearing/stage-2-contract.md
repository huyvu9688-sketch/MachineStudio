# Support-Bearing Module — Stage 2 Parameter Contract

## Status

- Work unit: Unit 4.6, Stage 2 — parameter contract
- Date: 2026-08-09
- Released registry change: parameter registry `1.7.0`
- Stage 2 status: **resolved for a `0.1.0` scope matching `axis-load-cases`'
  and `ball-screw`'s own `normal`/`peak`-only restriction.** See "Decisions"
  below for the six items `stage-1-spec.md` "Stage 2 Entry Criteria" left
  open.
- Module status: **Stage 3 draft package built 2026-08-10** (the day after
  this contract). A full `ModulePackage` — manifest, ports, input schema,
  compute, calculation trace, checks, generic UI schema, report schema,
  and a draft validation record — wraps a new `math.ts` kernel in
  `lib/modules/support-bearing/0.1.0/` (assembled in `package.ts`, not
  `index.ts` — see that directory's `README.md` "Stage 3 package"). It
  registers no module and creates no calculation run. Production release
  remains sequentially gated behind Unit 4.1's Definition of Done
  regardless (`context/implementation-map.md` Milestone 4 header).

## Decisions

### 1. Whether `0.1.0` models one support bearing per run or both locations combined

**Resolved: one support bearing per calculation run, selected by a new
required enum, `bearing.location` (`fixed` | `supported`).**

`stage-1-spec.md` proposed this as the pragmatic default because the two
bearing locations are physically different components with different
catalog data shapes and different applicable checks: THK's own Support
Unit chapter gives the fixed-side bearing an axial dynamic load rating
(`Ca`) and the supported-side bearing only a radial one (`C`) — the
floating side has no axial rating to check against at all, since by
design it does not react axial thrust. Modeling both in one calculation
would mean either inventing a "not applicable" state for half the ports
on every run, or silently zeroing an axial check that should not exist
for that bearing — both worse than the same "one candidate component,
engineer identifies it by model" scope every other Milestone 4 module
already uses (`ball-screw`, `linear-guide`, `coupling`). An engineer with
both a fixed-side and a supported-side bearing to verify runs the module
twice, once per location, the same way a two-block linear guide is
conceptually two bearing locations too but is handled as one module
because its own blocks share load interdependently — the fixed/supported
pair here does not (the fixed side alone reacts 100% of the axial load;
the supported side never does).

### 2. How the support bearing's own radial load is determined

**Resolved: a new required engineer-supplied input,
`bearing.actual_radial_load` — not derived from any released upstream
parameter.**

Unlike axial load (item 3 below), no released parameter cleanly
represents the radial load a ball-screw shaft's own support bearing sees.
The physically correct derivation — screw shaft self-weight, gear-mesh
reaction forces for a geared drive, or a coupling-misalignment-induced
side load — would need a released screw-mass parameter and/or a released
coupling-reaction-force output, neither of which exists in this project
yet. Inventing a formula from unreleased inputs would be exactly the kind
of guessed behavior `context/ai-workflow-rules.md` "Handling Missing
Requirements" forbids ("Do not invent product behavior"). The pragmatic
`0.1.0` choice is the same one `coupling 0.1.0` already made for actual
misalignment: the engineer supplies the number directly, sourced from
their own project's mechanical design (e.g., a static analysis of the
shaft/bearing arrangement performed outside this project). A future
version may derive it once the relevant upstream parameters exist.

### 3. Whether axial load reuses `motion.axis.thrust_force` directly

**Resolved: yes. The `normal`/`peak` per-case axial-load input ports map
to `motion.axis.thrust_force` directly — the same port `ball-screw 0.1.0`
itself already consumes, not a new output `ball-screw` would need to
expose.**

This was close to settled already by `stage-1-spec.md`'s own reasoning,
formalized here as a real Stage 2 decision rather than assumed: for
`0.1.0`'s in-scope arrangement (a support bearing directly at a
ball-screw shaft end, item "Validity Envelope" below), the fixed-side
bearing reacts the full screw-shaft axial thrust — the same load
`ball-screw`'s own kernel already resists internally. Reusing
`motion.axis.thrust_force` directly, rather than proposing a new
`screw.*` "axial load transmitted to the support bearing" output, is
exactly the roadmap's own Unit 4.6 gate: "Support-bearing output
integrates with the ball-screw module without a custom link mapping"
(`context/implementation-map.md`). This port is only meaningful for a
`bearing.location = "fixed"` calculation (item 1 above) — a
`"supported"`-location run does not consume it, since the floating side
does not react axial load at all.

### 4. New `bearing.*` registry parameters and the naming decision

**Resolved: `bearing.*`, not `support_bearing.*`.**

Every other Milestone 4 module uses a short domain-noun prefix drawn from
the module's own central physical entity, not its full module ID:
`ball-screw` uses `screw.*`, not `ball_screw.*`; `linear-guide` uses
`guide.*`, not `linear_guide.*`. Following that precedent exactly,
`support-bearing` uses `bearing.*`. `stage-1-spec.md` flagged a future
collision risk (an eventual motor- or gearbox-bearing concept), but
Unit 4.7's own required-checks list (`context/roadmap.md` "Phase 1C") does
not include a bearing-life check for the servo motor or gearbox
themselves — only rotor/load/reflected inertia, gearbox input/output
torque and speed, and gearbox efficiency/life "where data exists." No
other module in this project's roadmap needs the word `bearing` for a
different component, so the collision risk is real in principle but not
imminent enough to justify a longer, less consistent prefix now. See
"Released Additive Contract" below for the full group.

### 5. Whether the static-safety-factor minimum has a built-in default

**Resolved: required input, no built-in default — the same treatment
`screw.static_safety_factor_minimum`, `guide.static_safety_factor_minimum`,
and `coupling.service_factor` already received, extended here even though
(unlike those three) only one source's own numbers were read this
session, not two disagreeing ones.**

`jp.ntn.rolling_bearings_handbook`'s own Table 6.4 gives lower-limit
reference values (`2` for "high rolling precision required," `1` for
"normal rolling precision required," ball bearings) — a real, sourced
number, unlike the three other modules' own situations where two sources
actively disagreed. Adopting it as a built-in default would be a
departure from every other module's own precedent in this project, and
this document does not see a strong enough reason to make that departure:
one source's own "lower limit" guidance is still a floor, not a
recommended design value, and this project's own established pattern
treats safety-factor-style thresholds as an engineering-judgment call the
tool surfaces rather than silently supplies. `bearing.static_safety_
factor_minimum`'s own definition text records NTN's own Table 6.4 values
as reference text, the same way `coupling.service_factor`'s definition
records KTR's and R+W's own ranges.

### 6. Whether the missing worked-example and independent-benchmark gaps block Stage 2

**Resolved: no. Stage 2 and Stage 3 may proceed; Stage 4 (validation) is
what the evidence gate actually applies to.**

`context/ai-workflow-rules.md`'s own New Module Workflow gates release on
Stage 4, not on Stage 2/3, and this project's roadmap already grants
specification and kernel work the same "may proceed in parallel with
continued evidence search" allowance every other Milestone 4 module used
while `axis-load-cases`' own Stage 4 evidence wait was (and remains)
open. The two gaps `stage-1-spec.md` "Evidence Gaps" records — a missing
worked numerical example and no independent-benchmark candidate — are
real and unresolved, but they block this module's own Stage 4 validation
record, not its parameter contract or compute kernel.

## Released Additive Contract

Registry `1.7.0` adds these released canonical parameters. It does not
edit a released `1.0.0`-`1.6.0` definition.

### New `bearing.*` parameters

Selection input:

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `bearing.location` | enum (`fixed`, `supported`) | Which support-bearing location this calculation represents (see "Decisions" item 1). |

Catalog/rating inputs:

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `bearing.dynamic_load_rating` | quantity, `N`, `> 0` | Basic dynamic load rating, `C` (`Ca` for the fixed side, `C` for the supported side). |
| `bearing.static_load_rating` | quantity, `N`, `> 0` | Basic static load rating, `C0`. |
| `bearing.allowable_speed` | quantity, `rad/s`, `> 0` | Catalog allowable rotational speed. |
| `bearing.dynamic_load_factor_x` | quantity, ratio, `>= 0` | Dynamic equivalent load radial factor, `X`. |
| `bearing.dynamic_load_factor_y` | quantity, ratio, `>= 0` | Dynamic equivalent load axial factor, `Y`. Not meaningful for `bearing.location = "supported"`. |
| `bearing.static_load_factor_x` | quantity, ratio, `>= 0` | Static equivalent load radial factor, `X0`. |
| `bearing.static_load_factor_y` | quantity, ratio, `>= 0` | Static equivalent load axial factor, `Y0`. Not meaningful for `bearing.location = "supported"`. |
| `bearing.bore_diameter` | quantity, `m`, `> 0` | Catalog bore diameter — reported only, not evaluated (see "Decisions" preamble note). |
| `bearing.outside_diameter` | quantity, `m`, `> 0` | Catalog outside diameter — reported only. |
| `bearing.preload` | quantity, `N`, `>= 0`, **optional, no default** | Factory-set preload, where the manufacturer publishes it — reported only. |
| `bearing.static_safety_factor_minimum` | quantity, ratio, `> 0`, **required, no default** | See "Decisions" item 5. |

Installation input (engineer-supplied, not catalog data):

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `bearing.actual_radial_load` | quantity, `N`, `>= 0`, per case | See "Decisions" item 2. |

Outputs:

| Parameter | Value and units | Cases | Meaning |
| --- | --- | --- | --- |
| `bearing.dynamic_equivalent_load` | quantity, `N`, `>= 0` | `normal`, `peak` | `P = X*Fr + Y*Fa`. |
| `bearing.nominal_life` | quantity, `rev`, `>= 0` | `normal`, `peak` | `L10 = (C/P)^3`. |
| `bearing.nominal_life_hours` | quantity, `s` (display `h`/`min`/`s`), `>= 0` | `normal`, `peak` | `bearing.nominal_life` converted using the case rotational speed. |
| `bearing.static_safety_factor` | quantity, ratio, `>= 0` | `normal`, `peak` | `bearing.static_load_rating / (X0*Fr + Y0*Fa)`. Checked against `bearing.static_safety_factor_minimum`. |
| `bearing.speed_safety_factor` | quantity, ratio, `>= 0` | `normal`, `peak` | `bearing.allowable_speed` (correction-factor-adjusted where triggered) divided by operating speed. |

No new unit or dimension is added — every quantity above reuses an
already-registered unit (`N`, `rad/s`, `m`, `ratio`, `rev`, `s`).

## Existing Parameter Mapping

The future package reuses these already-released definitions without
changing their meaning:

| Purpose | Canonical parameter | Note |
| --- | --- | --- |
| Axial load, per case (fixed-location only) | `motion.axis.thrust_force` | See "Decisions" item 3. |
| Rotational speed input, per case | `motion.axis.case_linear_velocity` | Converted locally via `screw.lead` — the support bearing mounts directly on the screw shaft, not a driving/motor shaft, so no `screw.gear_ratio` term applies (unlike `coupling 0.1.0`'s own driving-shaft speed). |
| Lead (for speed conversion) | `screw.lead` | |
| End-support arrangement context | `screw.end_support_arrangement` | Reported context only — not consumed as a computational input in `0.1.0`'s own proposed scope. |

## Method Sources

No new source-registry entry is added by this record. The two sources
`stage-1-spec.md` registered
(`jp.thk.ball_screw_general_catalog@technico-mirror-2026-08-09`,
`jp.ntn.rolling_bearings_handbook@cat-9012e`) remain the method sources
for this module; this record's own contribution is the port mapping and
the six Stage-2-only decisions above, none of which needed new source
evidence beyond what Stage 1 already gathered.

## Validity Envelope (Stage 2 refinement)

Unchanged from `stage-1-spec.md`'s own proposal, with item 1 above now
formalized as the `bearing.location` enum rather than left as a proposed
default.

## Stage 2 Entry Criteria — Resolution Status

Mapped against `stage-1-spec.md` "Stage 2 Entry Criteria":

1. Whether `0.1.0` models one support bearing per run or a combined
   calculation — **resolved (one, via `bearing.location`)**, "Decisions"
   item 1.
2. How radial load is determined — **resolved (new required
   engineer-supplied input)**, "Decisions" item 2.
3. New `bearing.*` registry parameters and the naming decision —
   **resolved (`bearing.*`)**, "Decisions" item 4, "Released Additive
   Contract" above.
4. Whether `X`/`Y` factors are engineer-supplied catalog lookups or a
   reproduced table — **resolved (engineer-supplied catalog lookups, both
   dynamic and static forms)**, "Released Additive Contract" above.
5. Whether the static-safety-factor minimum has a built-in default —
   **resolved (no default)**, "Decisions" item 5.
6. Whether the missing worked-example/independent-benchmark gaps block
   Stage 2 — **resolved (no; Stage 4 is what they gate)**, "Decisions"
   item 6.

Stage 2 is complete for `0.1.0`'s scope.

**Stage 3 update (2026-08-10):** the draft package built from this
contract wraps a new `math.ts` kernel directly — see
`lib/modules/support-bearing/0.1.0/README.md` "Stage 3 package" for why
the axial-load and Y-factor ports are optional at the manifest level
(required together only when `bearing.location` is `"fixed"`, enforced by
`input-schema.ts`). Production release remains sequentially gated behind
Unit 4.1's Definition of Done regardless
(`context/implementation-map.md` Milestone 4 header).
