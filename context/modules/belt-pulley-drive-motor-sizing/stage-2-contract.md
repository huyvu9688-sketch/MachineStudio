# Belt-Pulley Drive Motor Sizing Module — Stage 2 Parameter Contract

## Status

- Work unit: Milestone 6, Unit 6.5, following Stage 1
  (`stage-1-spec.md`, done 2026-08-13).
- Status: **Done, 2026-08-13.** Registry `1.12.0` releases the full
  `motor_sizing.belt_pulley.*` group (24 new parameters).

## Decisions

### 1. Per-mechanism prefix, `motor_sizing.belt_pulley.*`

The convention every Motor Sizing Tool module already established.

### 2. Reuse `motion.axis.*` for orientation, incline, gravity, friction, and mass

Identical reasoning to `rack-pinion-motor-sizing@0.1.0`, and backed by the
same evidence: all three sources reviewed state the belt-drive and
rack-and-pinion force/load-torque equations as **one combined set**
(`stage-1-spec.md` "The central finding"), so the physical interface is
the same one `motion.axis.*` already models. Reused: `orientation`,
`incline_angle`, `gravity`, `friction_coefficient`, `total_moving_mass`.

### 3. Mechanical efficiency is applied to LOAD TORQUE, not to inertia

The two primary sources disagree, genuinely and not by rounding
(`stage-1-spec.md` "A real disagreement between sources"): Oriental Motor
divides load torque by `eta`; AutomationDirect divides the inertia by `e`
and leaves running torque underated. **This module follows Oriental
Motor**, because all three already-released sibling modules
(`ball-screw`, `direct-drive-conveyor`, `rack-pinion` motor sizing) take
an explicit `mechanical_efficiency` and apply it to load torque —
adopting the other convention here would make this module silently
inconsistent with its own family. Disclosed in `stage-1-spec.md`, in this
module's own validation record, and in its trace notes, not absorbed
silently.

### 4. `idler_pulley_mass` is a separate input, not `pulley_mass` doubled

AutomationDirect's own worked example multiplies one pulley's inertia by
2 (*"remember, there are two pulleys"*) only because both pulleys are
identical **in that example**. Doubling is not a general truth, so the
contract takes both masses. Both pulleys do share one
`pulley_pitch_diameter` — every source's own worked example assumes equal
diameters, and no source found gives an unequal-diameter belt-drive
formula (recorded as a validity-envelope limit, not silently assumed
away).

### 5. `belt_mass` defaults to `0`, unlike every other mass input

A structural "belt mass not tracked" default, the same category as
`gear_ratio = 1` and `external_force = 0` — not a guessed physical value.
Rationale: the belt's own mass is the one input an engineer most often
does not have to hand early in sizing, and setting it to zero degrades
the result gracefully and conservatively-low in a way the engineer can
see in the trace. Every other mass input stays required.

### 6. Single accelerate-to-speed event; one combined safety factor

The same two decisions `direct-drive-conveyor-motor-sizing@0.1.0` and
`rack-pinion-motor-sizing@0.1.0` each reached independently, reconfirmed
here for a third mechanism: no source reviewed computes a
deceleration-phase or RMS-cycle torque for a belt drive, so there is one
computed torque figure and therefore one safety factor.

## Released Additive Contract

Registry version: `1.12.0` (bumped from `1.11.0`; `1.11.0` added to
`PARAMETER_REGISTRY_SUPPORTED_VERSIONS` so
`rack-pinion-motor-sizing@0.1.0`'s own pinned manifest target stays
served — the same displaced-current-version step every prior registry
bump followed).

**Reused without change:** `motion.axis.orientation`,
`motion.axis.incline_angle`, `motion.axis.gravity`,
`motion.axis.friction_coefficient`, `motion.axis.total_moving_mass`.

**New `motor_sizing.belt_pulley.*` (24).** Inputs:
`pulley_pitch_diameter`, `pulley_mass`, `idler_pulley_mass`, `belt_mass`,
`gear_ratio`, `mechanical_efficiency`, `external_force`,
`target_velocity`, `acceleration_time`, `motor_rotor_inertia`,
`required_torque_safety_factor`, `inertia_ratio_maximum`. Outputs:
`pulley_inertia`, `belt_inertia`, `load_inertia`,
`reflected_load_inertia`, `total_system_inertia`, `inertia_ratio`,
`load_torque`, `acceleration_torque`, `momentary_torque`,
`required_torque`, `operating_speed`, `required_power`.

Full definitions: `lib/engine/parameters/definitions.ts`
`motorSizingBeltPulley`.

## Method Sources

- `jp.oriental_motor.general_catalog_motor_fan_sizing@f-tecref-2003-2004`
  — primary formula source (p. F-3, "Wire Belt Mechanism, Rack and Pinion
  Mechanism").
- `us.automationdirect.sureservo_selection_appendix@2nd-ed-rev-b-08-2011`
  — the reference example (pp. B-11-B-13) and a second independent
  statement of the same combined equation set (Table 1, p. B-6).

## Stage 2 Entry Criteria — Resolution Status

All five `stage-1-spec.md` "Stage 2 Entry Criteria" items resolved as
recorded above. Stage 3 (compute and trace) is next.
