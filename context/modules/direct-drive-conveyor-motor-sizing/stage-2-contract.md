# Direct-Drive Conveyor Motor Sizing Module — Stage 2 Parameter Contract

## Status

- Work unit: Milestone 6, Unit 6.3, Stage 2 — parameter contract
- Date: 2026-08-13
- Released registry change: parameter registry `1.10.0`
- Stage 2 status: **resolved.** See "Decisions" below for the five items
  `stage-1-spec.md` "Stage 2 Entry Criteria" left open.
- Module status: no kernel or package exists yet. Stage 3 (compute and
  trace) is next.

## Decisions

### 1. Parameter-group naming — per-mechanism prefix, `motor_sizing.direct_drive_conveyor.*`

**Resolved: a per-mechanism prefix, matching `motor_sizing.ball_screw.*`'s
own established precedent** (`ball-screw-motor-sizing/stage-2-contract.md`
"Decisions" item 1) — a two-level dotted scope, the same shape
`motion.axis`/`motion.profile` already establish. No shared
`motor_sizing.*` bucket: this module's own geometry terms (roller
diameters, belt mass) share no meaning with a ball screw's.

### 2. The belt/load friction coefficient is a genuinely new parameter, not a reuse of `motion.axis.friction_coefficient`

**Resolved: new, `motor_sizing.direct_drive_conveyor.belt_friction_coefficient`.**
`stage-1-spec.md` "Candidate Methods" item 2 already found the reason:
both worked reference examples use `mu = 0.3` for belt-to-carried-load
friction, materially different from `motion.axis.friction_coefficient`'s
own `0.05` typical value for a table sliding on a linear guide — a
different physical interface (static/kinetic friction between a package
and a moving belt surface, not a lubricated linear-guide sliding
interface), following this project's own "Confirm the exact engineering
meaning" canonical-parameter rule
(`context/code-standards.md` "Canonical Parameters"). Its own range is
`min: 0` with **no upper cap** — unlike `motion.axis.friction_coefficient`'s
own `max: 1`, since a belt/package material pair (e.g. rubber-on-rubber)
can genuinely exceed a coefficient of `1`, and no source read this session
states a general upper bound for this specific interface.

### 3. The motion-input shape narrows further than `stage-1-spec.md` proposed: acceleration only, not a full accelerate/run/decelerate cycle

**Resolved, and a real refinement of `stage-1-spec.md`'s own proposal.**
Re-reading the two fully-verified reference examples while writing this
contract confirms neither computes, or needs, a deceleration-phase torque
at all — both check only a single breakaway/acceleration event's own peak
torque (p. F-8's own words: *"the greatest torque is needed when starting
the belt"*) plus the selected motor's own continuous rated torque exceeding
the steady-state load torque. A conveyor's own stop event (coasting, or a
separate mechanical/friction brake, not modeled by this project's
mechanism-agnostic drive-train scope either) does not need a *required
motor* deceleration torque the way a servo-driven point-to-point axis does.
`0.1.0`'s own motion input is therefore: `target_belt_speed` and a single
`acceleration_time` (the ramp from `0` to `target_belt_speed`) — no
`deceleration_time`, no dwell, and no per-phase list. This is a narrower,
more evidence-matched scope than `stage-1-spec.md` item 3's own
"accelerate/run/decelerate" framing, corrected here the same way
`ball-screw-motor-sizing/stage-2-contract.md`'s own "Stage 3 corrections"
and `drive-train/stage-2-contract.md`'s own Stage 3 corrections already
modeled — a real gap found while resolving the actual parameter contract,
fixed directly rather than carried forward unexamined. `run_duration`
remains a genuinely optional, trace-only context input (does not change
any torque or inertia output) — the same role `axis-load-cases@0.1.0`'s own
`duty_cycle`/`ambient_temperature` already play — but is not required for
`0.1.0`'s own checks to be meaningful, so it is **not** added as a
registered parameter this release; nothing downstream needs it yet (the
same "do not invent scope" restraint this project applies elsewhere). If a
future version needs it (e.g. a thermal/duty-cycle check), it can be added
additively then.

### 4. The required-torque/safety-factor shape — a single combined factor, not `ball-screw-motor-sizing@0.1.0`'s own two separate margins

**Resolved: one `required_torque_safety_factor` (`>= 1`, no built-in
default), not two.** `ball-screw-motor-sizing@0.1.0`'s own two-factor split
(`effective_torque_safety_factor`/`momentary_torque_safety_factor`) exists
because that module computes a genuine effective (RMS) torque distinct from
its own momentary torque — two physically distinct failure modes needing
two separate checks. This module does not compute an RMS torque at all
(item 3 above and `stage-1-spec.md` item 3's own finding), so there is only
one computed torque figure (`momentary_torque = acceleration_torque +
load_torque`) to apply a margin to — exactly the single combined shape
both fully-verified reference examples use (`Sf = 2` in each), and the same
shape the already-registered `jp.oriental_motor.motor_sizing_calculations`
web page states generally (`TM = (TL+Ta)*Sf`). `inertia_ratio_maximum`
is reused by the same required-input-no-default precedent
`ball-screw-motor-sizing@0.1.0`'s own Decisions item 4 already established,
and `motor_rotor_inertia` is likewise required for the same reason (without
it, `0.1.0` has no real catalog-free pass/fail check at all).

### 5. The gear ratio does not appear in the input schema at all

**Resolved: no `motor_sizing.direct_drive_conveyor.gear_ratio` parameter,
in either form `stage-1-spec.md`'s own Stage 2 Entry Criteria item 4
proposed.** Neither "present, fixed at a constant `1`" nor "present,
free-valued" is adopted. This module's own purpose (`stage-1-spec.md`
"Purpose") is specifically the mechanism the founder's own existing tool
has no template for — a conveyor with **no gearbox at all**, not merely one
whose ratio happens to be `1`. Giving the input schema a `gear_ratio`
field (even one defaulted to `1`) would misrepresent that scope as
configurable when it structurally is not in `0.1.0` — the kernel's own
formula simply has no gear-ratio term (motor shaft and drive-roller shaft
are the same shaft). A future geared variant, if a real project needs one,
is new scope for a later version or for `motor-sizing.belt-pulley-drive`
(a physically different mechanism per `stage-1-spec.md` "Relationship to
Existing and Planned Modules" — that module's own load model, not this
one's, already carries a free `i`), not an extension of this module's own
`0.1.0` input schema.

## Released Additive Contract

Registry `1.10.0` adds these released canonical parameters. It does not
edit a released `1.0.0`-`1.9.0` definition.

### Reused without change

| Purpose | Parameter | Note |
| --- | --- | --- |
| Gravitational acceleration | `motion.axis.gravity` | Same physical constant every other module's own friction/weight term already uses. |

**Not reused, deliberately:** `motion.axis.friction_coefficient` (item 2
above), `motion.axis.total_moving_mass` (this module's own carried-load and
belt masses are separate terms with different roles in the inertia formula,
not one combined "total moving mass" the way an axis carriage's own mass
is), any `screw.*`/`guide.*`/`coupling.*`/`bearing.*`/`drive.*` parameter
(no shared mechanism), and `motor_sizing.ball_screw.motor_rotor_inertia`
(same physical concept, but parameters are scoped per mechanism prefix by
this project's own established convention — item 1 above — so this module
mints its own).

### New `motor_sizing.direct_drive_conveyor.*` parameters

Geometry and mass inputs:

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `motor_sizing.direct_drive_conveyor.drive_roller_diameter` | quantity, `m`, `> 0`, required | Diameter of the motor-driven roller (`D1`). |
| `motor_sizing.direct_drive_conveyor.drive_roller_mass` | quantity, `kg`, `> 0`, required | Mass of the drive roller (`M1`). |
| `motor_sizing.direct_drive_conveyor.idler_roller_diameter` | quantity, `m`, `> 0`, required | Diameter of the non-driven (idler) roller (`D2`); may differ from the drive roller's own diameter (Omron's own general formula supports this). |
| `motor_sizing.direct_drive_conveyor.idler_roller_mass` | quantity, `kg`, `> 0`, required | Mass of the idler roller (`M2`). |
| `motor_sizing.direct_drive_conveyor.belt_mass` | quantity, `kg`, `>= 0`, required | Mass of the conveyor belt itself (`M4`, Omron's own distinct belt-mass inertia term — `stage-1-spec.md` "Candidate Methods" item 1). |
| `motor_sizing.direct_drive_conveyor.carried_load_mass` | quantity, `kg`, `>= 0`, required | Mass of the object(s) riding the belt (`M3`). |

Friction and efficiency inputs, required, no built-in default (item 2
above and the same "no source gives a defensible general value"
precedent `ball-screw@0.1.0`'s static-safety-factor-minimum already
established):

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `motor_sizing.direct_drive_conveyor.belt_friction_coefficient` | quantity, ratio, `>= 0`, required | Coefficient of friction between the belt and the carried load (`mu`). No upper cap — item 2 above. |
| `motor_sizing.direct_drive_conveyor.mechanical_efficiency` | quantity, ratio, `(0, 1]`, required | Belt/roller mechanical efficiency (`eta`), the same `(0,1]` range convention `screw.mechanical_efficiency` already uses. |

Motion inputs (item 3 above):

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `motor_sizing.direct_drive_conveyor.target_belt_speed` | quantity, `m/s`, `> 0`, required | Commanded steady-state belt speed. |
| `motor_sizing.direct_drive_conveyor.acceleration_time` | quantity, `s`, `> 0`, required | Ramp time from standstill to `target_belt_speed` — the single event this module's own torque checks are governed by (item 3 above). |

Motor input:

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `motor_sizing.direct_drive_conveyor.motor_rotor_inertia` | quantity, `kg*m^2`, `> 0`, required | Rotor moment of inertia of the candidate motor, from its own catalog data — the same "engineer types in one number" role `motor_sizing.ball_screw.motor_rotor_inertia` already plays (item 4 above). |

Safety-factor and limit inputs, required, no built-in default (item 4
above):

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `motor_sizing.direct_drive_conveyor.required_torque_safety_factor` | quantity, ratio, `>= 1`, required | Multiplier applied to `momentary_torque` to obtain `required_torque` — the single combined margin, both reference examples' own `Sf = 2`. |
| `motor_sizing.direct_drive_conveyor.inertia_ratio_maximum` | quantity, ratio, `> 0`, required | Maximum acceptable `inertia_ratio`, the same required-input-no-default precedent `motor_sizing.ball_screw.inertia_ratio_maximum` already established, reused by citation, not re-researched. |

Outputs:

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `motor_sizing.direct_drive_conveyor.reflected_load_inertia` | quantity, `kg*m^2`, `>= 0` | Total inertia of the idler roller (reflected by `(drive_roller_diameter/idler_roller_diameter)^2`), the belt, and the carried load, all already on the drive-roller/motor shaft in `0.1.0`'s own direct-drive scope (Omron's own `JW = J1+J2+J3+J4`, minus `J1` — see "Method Sources" below for why `J1`, the drive roller's own inertia, is folded into `total_system_inertia` directly instead of exposed separately). |
| `motor_sizing.direct_drive_conveyor.total_system_inertia` | quantity, `kg*m^2`, `>= 0` | `motor_rotor_inertia + drive_roller_inertia (internal) + reflected_load_inertia`. |
| `motor_sizing.direct_drive_conveyor.inertia_ratio` | quantity, ratio, `>= 0` | `reflected_load_inertia / motor_rotor_inertia`. Checked against `inertia_ratio_maximum` — the one real catalog-free pass/fail check in `0.1.0`, the same role `motor_sizing.ball_screw.inertia_ratio` already plays. |
| `motor_sizing.direct_drive_conveyor.load_torque` | quantity, `N*m`, `>= 0` | Steady-state friction-driven load torque (`T_L = mu*(belt_mass+carried_load_mass)*gravity*drive_roller_diameter / (2*mechanical_efficiency)`). |
| `motor_sizing.direct_drive_conveyor.acceleration_torque` | quantity, `N*m`, `>= 0` | Torque to accelerate `total_system_inertia` over `acceleration_time` up to `target_belt_speed` (`Ta = J_total*alpha`, `lib/engine/mechanics`). Always positive in `0.1.0`'s own accelerate-only scope (item 3 above). |
| `motor_sizing.direct_drive_conveyor.momentary_torque` | quantity, `N*m`, `>= 0` | `acceleration_torque + load_torque` — the governing peak/starting torque. |
| `motor_sizing.direct_drive_conveyor.required_torque` | quantity, `N*m`, `>= 0` | `momentary_torque * required_torque_safety_factor` — the minimum torque rating a candidate motor must have, reported as an output value, not checked pass/fail against anything in `0.1.0` (the same "required specs only" honesty `ball-screw-motor-sizing@0.1.0`'s own Checks and Warnings already state). |
| `motor_sizing.direct_drive_conveyor.operating_speed` | quantity, `rad/s` (display `rpm`), `>= 0` | Motor/drive-roller shaft rotational speed at `target_belt_speed` (`omega = target_belt_speed / (drive_roller_diameter/2)`). |
| `motor_sizing.direct_drive_conveyor.required_power` | quantity, `W`, `>= 0` | `rotationalPower(required_torque, operating_speed)` (`lib/engine/units`' already-released `P = T*omega`), the same output ADR-0011 "Output scope" names and `motor_sizing.ball_screw.required_power` already provides. |

No new unit or dimension is needed: every canonical unit above (`m`, `kg`,
`ratio`, `m/s`, `s`, `kg*m^2`, `N*m`, `rad/s`, `W`) is already registered.

## Existing Parameter Mapping

See "Reused without change" above — a short list, since almost every input
this module needs is new (geometry, friction, and motion terms specific to
a conveyor, none of which overlap in meaning with any already-released
group).

## Method Sources

No new source-registry entry is added by this record. The sources
`stage-1-spec.md` already registered this session (Omron Corporation's
*Technical Guide for Servo Motor Selection*, pp. 7-9; Oriental Motor's
newly registered General Catalog Technical Reference, pp. F-2 through
F-10; the lower-confidence blog example) remain this module's own method
sources, plus `lib/engine/mechanics` (Unit 6.1) for `linearMotionInertia`
and `accelerationTorque`, reused directly, not reproduced (ADR-0011 "Reuse
policy" — the same treatment `ball-screw-motor-sizing@0.1.0` already gives
that package).

**On `reflected_load_inertia` excluding `J1` (the drive roller's own
inertia):** Omron's own `JW` sums all four terms including `J1`. This
contract instead folds `J1` directly into `total_system_inertia`
(`motor_rotor_inertia + J1 + reflected_load_inertia`) rather than including
it inside `reflected_load_inertia` itself, so that `reflected_load_inertia`
means the same thing across a future geared mechanism module too (a term
that is actually reflected by a ratio, unlike the drive roller, which is
always on the motor's own shaft regardless of gearing) — a naming
consistency choice, not a physics difference from Omron's own `JW`; the two
sum to the identical total either way. Recorded here since Stage 3 must
implement the kernel to match this exact split, not Omron's own single-`JW`
grouping.

## Validity Envelope (Stage 2 refinement)

Narrower than `stage-1-spec.md`'s own proposal in one respect (item 3
above: acceleration-only, not accelerate/run/decelerate) — otherwise
unchanged: one direct-drive (`i = 1`) horizontal belt conveyor, drive and
idler rollers of possibly different diameters, no incline, no thermal
derating, no belt-slip check.

## Stage 2 Entry Criteria — Resolution Status

Mapped against `stage-1-spec.md` "Stage 2 Entry Criteria":

1. Parameter-group prefix — **resolved
   (`motor_sizing.direct_drive_conveyor.*`)**, "Decisions" item 1.
2. Friction coefficient genuinely new, not a reuse — **resolved (confirmed
   new, with its own no-upper-cap range)**, "Decisions" item 2.
3. `0.1.0` motion-input shape and required-torque shape — **resolved, and
   narrower than `stage-1-spec.md` itself proposed (acceleration-only, one
   combined safety factor)**, "Decisions" items 3-4.
4. Whether `i` appears in the schema — **resolved (absent entirely, not
   fixed at a constant `1`)**, "Decisions" item 5.
5. New parameter-registry version release — **done, registry `1.10.0`.**

Stage 2 is complete. Stage 3 (compute and trace) is next.
