# Belt-Pulley Drive Motor Sizing Module — Stage 1 Engineering Specification

## Status

- Work unit: Milestone 6, Unit 6.5, the fourth mechanism module in the
  Motor Sizing Tool family (`context/adr/0011-motor-sizing-tool-
  architecture.md`), after `ball-screw-motor-sizing@0.1.0`,
  `direct-drive-conveyor-motor-sizing@0.1.0`, and
  `rack-pinion-motor-sizing@0.1.0`.
- Proposed module ID: `belt-pulley-drive-motor-sizing`.
- Proposed category: `motor-sizing.belt-pulley-drive` (ADR-0011 "Phase
  scope").
- Proposed first released version: `0.1.0`.
- Date: 2026-08-13.

No released parameter, module version, calculation run, or validation
record is changed by this document.

## Purpose

Given a belt-and-pulley linear drive's own pulley geometry and mass, total
moving mass (a **rigid** table/carriage attached to the belt), belt mass,
friction, orientation, gear ratio, and a commanded single
accelerate-to-speed motion event, compute the **required** motor
specifications: load torque, acceleration torque, momentary (starting)
torque, required torque with an engineer-supplied safety factor, operating
speed, required power, total reflected system inertia, and inertia ratio.
Required-spec values and pass/fail checks against engineer-supplied
margins only (ADR-0011 "Output scope"); no motor catalog matching, no belt
tension/width/tooth-shear selection.

## The central finding: this mechanism shares one formula set with rack-and-pinion, confirmed by three independent sources

**All three sources reviewed for this module state the belt-drive and
rack-and-pinion load-torque/inertia equations as one combined set, not
two:**

| Source | How it presents the two mechanisms |
| --- | --- |
| `jp.oriental_motor.general_catalog_motor_fan_sizing` (p. F-3) | One heading: **"Wire Belt Mechanism, Rack and Pinion Mechanism"** — a single formula `TL = F*D/(2*eta*i)`, `F = FA + m(sin(alpha)+mu*cos(alpha))`, serving both |
| `us.automationdirect.sureservo_selection_appendix` (Table 1, p. B-6) | One table: **"Belt Drive (or Rack & Pinion) Equations"** — a single set `T_run = (F_total*r)/i`, `F_total = F_ext+F_friction+F_gravity`, `J_total = J_motor+J_gear+((J_pinion+J_W)/i^2)` |
| `us.andantex.modular_rack_pinion_system` (p. 62) | Rack-and-pinion only, but its own `Fr = mu*M*g+M*a+F` / `Tp = Fr*d/2` is the same shape (already verified for `rack-pinion-motor-sizing@0.1.0`) |

**Consequence for this module's scope, stated plainly:** at the
**load-torque and drive-force** level, this module reproduces the same
relationships `rack-pinion-motor-sizing@0.1.0` already implements — the
pinion's pitch radius simply becomes the pulley's pitch radius. Per
ADR-0011 "Reuse policy," that code is reproduced, not imported.

**What genuinely differs, and why this is a separate module rather than a
parameter on the rack-pinion one** (the question ADR-0011 "Phase scope"
already answered by listing them separately, now backed by read evidence):

1. **Two pulleys, not one pinion.** Every belt drive has a drive pulley
   and at least one idler; the SureServo example's own inertia line reads
   *"Pulley inertia (remember, there are two pulleys)"* and multiplies by
   2. A rack-and-pinion has exactly one rotating element.
2. **The belt itself has mass.** A toothed belt looped around both pulleys
   contributes its own translating inertia; a fixed rack contributes none
   (`rack-pinion-motor-sizing@0.1.0`'s own validity envelope records the
   rack as massless/rigid, confirmed against every source).
3. **Different failure vocabulary downstream.** Belt tension, tooth shear,
   and pulley wrap angle have no rack-and-pinion analog. None is in
   `0.1.0`'s scope, but they are why the two mechanisms diverge as the
   family grows.

## A real disagreement between sources: where mechanical efficiency goes

The two primary sources place efficiency on **opposite sides** of the
calculation, and this is a genuine modeling difference, not a rounding
artifact:

- **Oriental Motor**: efficiency divides the **load torque** —
  `T_L = F*D/(2*eta*i)`. Inertia carries no efficiency term.
- **AutomationDirect SureServo**: efficiency divides the **inertia** —
  `J_W = (W/(g*e))*r^2` — while running torque carries none
  (`T_run = (F_total*r)/i`).

Verified by hand this session: the two give different answers for the same
scenario; they are not algebraically equivalent. **This module follows
Oriental Motor's convention** (efficiency in load torque), because that is
what every already-released Motor Sizing Tool module does —
`ball-screw-motor-sizing@0.1.0`, `direct-drive-conveyor-motor-sizing@
0.1.0`, and `rack-pinion-motor-sizing@0.1.0` all take an explicit
`mechanical_efficiency` and apply it to load torque. Choosing SureServo's
convention here would make this module silently inconsistent with its own
three siblings. The difference is disclosed, not hidden, and the reference
example below is reproduced with the convention difference stated
explicitly rather than absorbed.

## Reference Example (public, citable — a first for this family's newer modules)

`us.automationdirect.sureservo_selection_appendix@2nd-ed-rev-b-08-2011`,
"Belt Drive - Example Calculations," pp. B-11 through B-13. **This is the
first fully worked, publicly citable belt-drive motor-sizing example
located for this project** — it closes exactly the gap
`rack-pinion-motor-sizing@0.1.0` had to fill with a licensed internal-only
benchmark.

Inputs: table+workpiece `W=90 lb`, `F_ext=0`, `mu=0.05`, `theta=0`,
belt/pulley efficiency `e=0.8`, pulley diameter `2.0 in` (`r=1 in`),
pulley thickness `0.75 in`, aluminum (`rho=0.098 lb/in^3`), gear reducer
`10:1`, stroke `50 in`, move time `4.0 s`, accel/decel `1.0 s`.

Printed results, **all reproduced exactly by hand this session**:

| Figure | Printed | Recomputed |
| --- | --- | --- |
| `J_W = (W/(g*e))*r^2` | `0.291 lb-in-s^2` | `0.29145` |
| `J_pulleys = ((pi*L*rho*r^4)/(2g))*2` | `0.0006 lb-in-s^2` | `0.000598` |
| `J_(pulleys+load) to motor` | `0.0029 lb-in-s^2` | `0.002920` |
| motor speed | `1592 rpm` | — (given) |
| `T_accel` | `0.46 lb-in` | `0.4649` |
| inertia ratio | `9.6` | `9.6` |

**A confirmed arithmetic slip in this source, disclosed not reproduced:**
its own friction force is computed as `F_friction = 0.05 x 100 = 5.0 lb`,
but the stated table+workpiece weight is `90 lb` — the correct value is
`4.5 lb`. This module's own kernel computes friction from the actual
supplied mass and therefore does **not** reproduce the printed `5.0 lb`,
`T_run = 0.50 lb-in`, or the `T_motor = 0.96 lb-in` total that follows
from it. This is the third such source-internal slip this project has
found and recorded rather than silently matched (after
`direct-drive-conveyor-motor-sizing@0.1.0`'s p. F-9 inertia figure and
`rack-pinion-motor-sizing@0.1.0`'s Atlanta `Futab` inconsistency).

So the reference example validates **the inertia chain, the reflected-
inertia reduction, the acceleration torque, and the inertia ratio**
against printed figures — and explicitly does **not** claim the
load-torque/total-torque figures, for two independently disclosed reasons
(the source's own arithmetic slip, and the efficiency-convention
difference above).

## Independent benchmark

Oriental Motor's own combined "Wire Belt Mechanism, Rack and Pinion
Mechanism" formula (`T_L = F*D/(2*eta*i)`,
`F = FA + m*g*(sin(alpha)+mu*cos(alpha))`) is implemented as a separate,
independently written computation and cross-checked against this module's
own kernel — the same "structurally separate reimplementation, proved
identical" pattern `direct-drive-conveyor-motor-sizing@0.1.0`'s own Omron
benchmark already established, and a genuinely independent second
manufacturer from the reference example's own author.

## Validity Envelope (Proposed)

- One belt-and-pulley linear drive: one drive pulley plus one idler
  (equal diameter — every source's own worked example assumes this), one
  **rigid** carriage/table attached to the belt, direct-connected or
  through a single fixed gear ratio.
- One accelerate-to-speed motion event; no RMS/duty-cycle torque (the
  same evidence-driven scope every sibling module reached independently).
- Horizontal, vertical, or inclined (`0 <= theta <= 90 deg`) — both
  primary sources carry an explicit `F_gravity = W*sin(theta)` term.
- Not a conveyor: the load is rigidly attached to the belt, not riding
  loose on top of it (`direct-drive-conveyor-motor-sizing@0.1.0`'s own
  "Relationship to Existing and Planned Modules" table already draws this
  line precisely).
- No belt tension, belt width/pitch, tooth-shear, or wrap-angle
  selection; no motor catalog matching.

## Existing Parameter Review

Reused unchanged (`motion.axis.*`), exactly as
`rack-pinion-motor-sizing@0.1.0` does and for the same source-backed
reason (the identical force-balance formula): `orientation`,
`incline_angle`, `gravity`, `friction_coefficient`, `total_moving_mass`.

New `motor_sizing.belt_pulley.*`: `pulley_pitch_diameter`, `pulley_mass`,
`idler_pulley_mass`, `belt_mass`, `gear_ratio`, `mechanical_efficiency`,
`external_force`, `target_velocity`, `acceleration_time`,
`motor_rotor_inertia`, `required_torque_safety_factor`,
`inertia_ratio_maximum`. Outputs: `pulley_inertia`, `belt_inertia`,
`load_inertia`, `reflected_load_inertia`, `total_system_inertia`,
`inertia_ratio`, `load_torque`, `acceleration_torque`,
`momentary_torque`, `required_torque`, `operating_speed`,
`required_power`.

Minted new rather than reused from `motor_sizing.rack_pinion.*` for the
same meaning-scoping reason every sibling module already applies
(code-standards.md "Canonical Parameters"): a pulley pitch diameter and a
pinion pitch diameter are the same *kind* of quantity but not the same
parameter *meaning*.

## Also resolved this session: the index-table blocker is now characterized, not merely asserted

ADR-0011 "Phase scope" records `motor-sizing.index-table` as blocked on a
missing load-torque source. This session found a **second** independent
source with a full index-table worked example
(`us.automationdirect.sureservo_selection_appendix`, pp. B-14-B-16) — and
it, too, sets running torque to zero outright (`T_motor = T_accel + T_run
= 12.38 + 0`), exactly as Oriental Motor's own index-table example does
(*"Frictional load is omitted because it is negligible. Load torque is
considered 0"*). The blocker is therefore **confirmed and characterized**,
not merely inherited: two independent manufacturers both model an index
table as a pure-inertia problem. A future `index-table` module can
legitimately ship with `load_torque` as an engineer-supplied input
defaulting to zero, citing both sources — a real Stage 1 finding for that
unit, recorded here because it was found here.

## Stage 2 Entry Criteria

1. Primary formula identified and traced to two independent public
   sources — done.
2. The efficiency-convention disagreement identified, decided, and
   documented — done.
3. A publicly citable worked reference example located, hand-verified,
   and its own arithmetic slip disclosed — done.
4. Reuse-vs-new parameter decisions made — done.
5. Scope boundary against the conveyor and rack-pinion modules stated with
   evidence — done.
