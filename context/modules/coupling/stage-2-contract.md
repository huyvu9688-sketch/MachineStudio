# Coupling Module — Stage 2 Parameter Contract

## Status

- Work unit: Unit 4.5, Stage 2 — parameter contract
- Date: 2026-08-09
- Released registry change: parameter registry `1.6.0`
- Stage 2 status: **resolved for a `0.1.0` scope matching `axis-load-cases`'
  and `ball-screw`'s own `normal`/`peak`-only restriction.** See "Decisions"
  below for the six items `stage-1-spec.md` "Stage 2 Entry Criteria" left
  open.
- Module status: **no kernel or package exists yet.** Unlike `ball-screw`
  and `linear-guide`, this Stage 2 record precedes Stage 3 rather than
  following a same-day draft package — there is no `math.ts` this record
  needs to reconcile against. Stage 3 (compute and trace) has not started.
  Production release remains sequentially gated behind Unit 4.1's Definition
  of Done regardless (`context/implementation-map.md` Milestone 4 header).

## Decisions

### 1. Which rotational-speed port this module consumes

**Resolved: neither of Stage 1's two candidates. This module derives its
own per-case rotational speed from `motion.axis.case_linear_velocity`,
`screw.lead`, and `screw.gear_ratio` — the same conversion `ball-screw`'s
own kernel already does internally (`resolveRotationalSpeed`, `n = v /
lead`), not exposed as one of that module's own ports.**

`stage-1-spec.md` flagged a real mismatch: `screw.mean_rotational_speed` is
a duty-cycle-weighted *mean* across whatever cases a screw computes, not the
steady/rated speed KTR's and R+W's own `n` conceptually means. Two
alternatives were considered:

- **Propose a new `screw.*` per-case rotational-speed output port.** Rejected
  — it would mean `ball-screw 0.1.0`'s own manifest changes to serve a
  downstream module it does not know about, and `screw.*`'s own Stage 2
  contract already made a deliberate choice not to expose one (it derives
  and immediately consumes the conversion internally for its own
  duty-cycle equivalent-load calculation, `context/modules/ball-screw/
  stage-2-contract.md` "Decisions" item 3).
- **Derive it locally, from ports already released.** `motion.axis.
  case_linear_velocity` (per-case: `normal`/`peak`/`emergency_stop`,
  released in registry `1.3.0` for exactly this purpose — see the
  `ball-screw` contract cited above) combined with `screw.lead` and
  `screw.gear_ratio` (both released in `1.3.0`) reproduces the identical
  physics `ball-screw`'s own kernel already trusts, without a new upstream
  port. **Adopted.**

This keeps the derivation per-case (`normal`, `peak`), not a mean — closing
the mismatch `stage-1-spec.md` flagged, and keeping this module's own two
outputs (`coupling.torque_safety_factor`, `coupling.speed_safety_factor`)
consistently case-shaped. The derived speed itself is not released as a
new port — it is an internal/trace-only computed value, the same treatment
`ball-screw`'s own internal rotational-speed conversion already receives.

### 2. Whether `screw.drive_torque` is the right upstream torque source

**Resolved: yes, for `0.1.0`. `screw.drive_torque` (per case: `normal`,
`peak`) is this module's required-torque input, with the case mapping
recorded explicitly (see item 4 below) rather than left implicit.**

`stage-1-spec.md` flagged that a coupling could in principle sit on either
side of a future gearbox (Unit 4.7) rather than only adjacent to the ball
screw's own drive shaft. That module does not exist, so there is no
alternative torque source to choose between yet — `screw.drive_torque` is
the only released "required torque at a driven shaft" port in this
project. Revisit when Unit 4.7 exists and a coupling on the motor side of a
gearbox becomes a real scenario, not a hypothetical one.

### 3. Which shock-torque check form `0.1.0` adopts

**Resolved: KTR's summed-and-scaled form
(`T_Kmax >= (T_N + T_S) * S_Z * S_t * S_R`), simplified to
`coupling.max_torque >= peak-case required torque * coupling.service_factor`
via the consolidated service factor (item 4). R+W's disengagement-multiplier
form (`T_AR >= K * T_max`) is recorded as a documented alternative, not
implemented.**

The two are not an arbitrary coin flip: R+W's own document frames the
`K`-factor form specifically for its **ST-series safety couplings**
(torque-limiters that mechanically disengage on overload) —
`stage-1-spec.md` item 2's own source note already flags this. KTR's
operating-factor method is stated for couplings generally (its own document
covers lamina, pin-and-bush, and gear couplings, none of which are
torque-limiting). Since this module's `0.1.0` scope is "a candidate
coupling the engineer has already identified by model," not specifically a
safety coupling, KTR's general form is the better-scoped default. A future
version could add R+W's `K`-factor form as a safety-coupling-specific
alternative check, the same way a future `linear-guide` version could adopt
IKO's more elaborate equivalent-load form for a mono-rail arrangement.

### 4. How the `normal`/`peak` cases map onto KTR's/R+W's own torque concepts

**Resolved: `normal` is the steady-state case (KTR's `T_N`, R+W's `T_AN`);
`peak` is the shock case (KTR's `T_S`, R+W's `T_AS`) — a documented
adaptation, not a clean conceptual match, and recorded as such.**

`axis-load-cases`' own `peak` case means a peak *operating* condition (e.g.
a machining force spike within the duty cycle) — a genuinely different
concept from a motor's electrical starting-torque transient, which is what
KTR's/R+W's own worked examples mean by `T_S`/`T_AS` (KTR's own example:
"Peak torque (starting torque) `T_AS = 2 * T_AN`"). No better upstream
signal exists in this project for a start-up transient specifically, so
`screw.drive_torque[peak]` is reused for both — the same kind of documented,
non-perfect adaptation `ball-screw`'s own THK equivalent-load benchmark
already accepted for a structurally different concept
(`context/modules/ball-screw/stage-1-spec.md`).

### 5. Whether correction factors are one consolidated input or KTR's/R+W's own multi-factor structure

**Resolved: one consolidated required input, `coupling.service_factor` —
not KTR's four named factors (`S_B`, `S_t`, `S_Z`, `S_R`) or R+W's own three
(`S_A`, `S_v`, `S_z`), and not either source's own multi-page
application-type lookup table.**

Reproducing either source's full application table as a registry enum would
mean encoding a large, source-specific, effectively proprietary
classification scheme (KTR's spans two full pages of named machine types
with disagreeing numeric ranges against R+W's own shorter table for
nominally the same purpose) into this project's own generic UI — a much
bigger scope commitment than a first release needs, and the two sources
disagree on category boundaries as well as values, so neither table can be
adopted wholesale without inventing a reconciliation this project has no
evidence for. **The same treatment `guide.static_safety_factor_minimum`
already received**: the engineer supplies one required number from their
own project/company policy (or reads it off KTR's or R+W's own published
table directly — both are cited by source revision, not reproduced), and
`coupling.service_factor`'s own definition text records both sources' ranges
as reference points, the same way `guide.static_safety_factor_minimum`'s
definition records PMI's and IKO's.

**A real simplification, stated plainly rather than hidden:** both sources
use a *different* factor for the steady check than the shock check (KTR:
`S_B` vs. `S_Z`; R+W: `S_A` vs. its own `K`). `0.1.0` applies the same
`coupling.service_factor` to both `coupling.torque_safety_factor[normal]`
and `coupling.torque_safety_factor[peak]` — a deliberate simplification for
a first release, recorded in the parameter's own definition text, not
silently conflated.

### 6. Whether misalignment and bore compatibility are checks or informational-only

**Resolved: checks (pass/fail), matching `stage-1-spec.md`'s own proposal.
No new decision was needed** — nothing surfaced this session that would
argue for treating a printed catalog bore range or misalignment limit as
merely informational (unlike, say, `linear-guide`'s preload grade, which is
a selection fact with no numeric bound to check against). Both are simple
bound checks: an engineer-supplied actual value against a catalog-supplied
allowable value, implemented in a future `checks.ts` — no new registry
parameter this decision itself required beyond the ones "Released Additive
Contract" already lists for that purpose.

## Released Additive Contract

Registry `1.6.0` adds these released canonical parameters. It does not edit
a released `1.0.0`-`1.5.0` definition.

### New `coupling.*` parameters

Catalog/rating inputs:

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `coupling.rated_torque` | quantity, `N*m`, `> 0` | Continuous rated torque, `T_KN`. |
| `coupling.max_torque` | quantity, `N*m`, `> 0` | Maximum (shock) torque, `T_Kmax`. |
| `coupling.allowable_speed` | quantity, `rad/s`, `> 0` | Catalog maximum rotational speed, `n_max`. |
| `coupling.torsional_stiffness` | quantity, `N*m/rad`, `> 0` | Catalog torsional stiffness, `C_T` — reported, not evaluated (item "Decisions" note on the deferred resonant-frequency check). |
| `coupling.moment_of_inertia` | quantity, `kg*m^2`, `> 0` | Catalog moment of inertia, `J_C` — reported, not evaluated. |
| `coupling.driving_bore_min` / `coupling.driving_bore_max` | quantity, `m`, `> 0` | Driving-side (motor-side) catalog bore range. |
| `coupling.driven_bore_min` / `coupling.driven_bore_max` | quantity, `m`, `> 0` | Driven-side (load-side) catalog bore range. |
| `coupling.allowable_parallel_misalignment` | quantity, `m`, `> 0` | Catalog parallel (radial offset) misalignment limit. |
| `coupling.allowable_angular_misalignment` | quantity, `rad` (display `deg`), `> 0` | Catalog angular misalignment limit. |
| `coupling.allowable_axial_misalignment` | quantity, `m`, `> 0` | Catalog axial (end-play) misalignment limit. |
| `coupling.service_factor` | quantity, ratio, `> 0`, **required, no default** | Consolidated correction factor (see "Decisions" item 5). |

Installation inputs (engineer-supplied, not catalog data):

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `coupling.actual_parallel_misalignment` | quantity, `m`, `>= 0` | Actual installation parallel misalignment. |
| `coupling.actual_angular_misalignment` | quantity, `rad` (display `deg`), `>= 0` | Actual installation angular misalignment. |
| `coupling.actual_axial_misalignment` | quantity, `m`, `>= 0` | Actual installation axial misalignment. |
| `coupling.driving_shaft_diameter` | quantity, `m`, `> 0` | Actual driving-side shaft diameter. |
| `coupling.driven_shaft_diameter` | quantity, `m`, `> 0` | Actual driven-side shaft diameter. |

Outputs:

| Parameter | Value and units | Cases | Meaning |
| --- | --- | --- | --- |
| `coupling.torque_safety_factor` | quantity, ratio, `>= 0` | `normal`, `peak` | Rated/max torque divided by required torque (`screw.drive_torque`) times `coupling.service_factor`. |
| `coupling.speed_safety_factor` | quantity, ratio, `>= 0` | `normal`, `peak` | `coupling.allowable_speed` divided by the derived per-case operating speed (see "Decisions" item 1). |

### New unit

`N*m/rad` (torsional stiffness) added to `lib/engine/units/registry.ts`,
with a new dimension (`Dimensions.torsionalStiffness =
dimension({mass:1, length:2, time:-2, angle:-1})`) — the first new
dimension added since the registry's initial `1.0.0` set, not merely a new
display unit on an existing dimension the way `km` was for `1.5.0`.

## Existing Parameter Mapping

The future package reuses these already-released definitions without
changing their meaning:

| Purpose | Canonical parameter | Note |
| --- | --- | --- |
| Required torque, per case | `screw.drive_torque` | See "Decisions" items 2 and 4. |
| Rotational speed input, per case | `motion.axis.case_linear_velocity` | Converted locally via `screw.lead`/`screw.gear_ratio` — see "Decisions" item 1. |
| Lead (for speed conversion) | `screw.lead` | |
| Gear ratio (for speed conversion) | `screw.gear_ratio` | Its own definition already anticipated this reuse ("A future drive-train module... may reuse or supersede this parameter"), which has not happened; this module reuses it as-is instead. |

## Method Sources

No new source-registry entry is added by this record. The three sources
`stage-1-spec.md` registered (`us.ktr.coupling_selection_operating_factors`,
`us.rw_america.coupling_sizing_selection`, `jp.nbk.coupling_catalog`) remain
the method sources for this module; this record's own contribution is the
port mapping and the four Stage-2-only decisions above (items 1, 3, 4, 5),
none of which needed new source evidence — they are design choices among
already-sourced, already-disagreeing alternatives, the same category
`context/modules/ball-screw/stage-2-contract.md`'s own "Decisions" section
resolves for its static-safety-factor minimum and buckling margin.

## Stage 2 Entry Criteria — Resolution Status

Mapped against `stage-1-spec.md` "Stage 2 Entry Criteria":

1. New `coupling.*` registry parameters — **resolved**, "Released Additive
   Contract" above.
2. Which rotational-speed port to consume — **resolved**, "Decisions" item 1.
3. Whether `screw.drive_torque` is the right upstream torque source —
   **resolved (yes, for `0.1.0`)**, "Decisions" item 2.
4. Which shock-torque check form to adopt — **resolved (KTR's)**,
   "Decisions" item 3.
5. Whether correction factors are one consolidated input or the sources' own
   multi-factor structure — **resolved (one consolidated input)**,
   "Decisions" item 5.
6. Whether misalignment and bore compatibility are checks or
   informational-only — **resolved (checks)**, "Decisions" item 6.

Stage 2 is complete for `0.1.0`'s scope. Stage 3 (a kernel and package) has
not started.
