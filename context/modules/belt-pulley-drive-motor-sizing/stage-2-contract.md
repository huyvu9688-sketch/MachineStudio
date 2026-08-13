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

---

## 0.2.0 Addendum — Native Motion Profile and Duty-Cycle Torque

- Work unit: follow-on to `0.1.0`, per
  `docs/superpowers/specs/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0-design.md`
  and ADR-0011's own "follow-on work" note (embed motion-profile math
  natively inside each mechanism module rather than cross-module-linking
  it).
- Status: **Done, 2026-08-13.**

### Resolving the design doc's three open questions

1. **Exact new parameter IDs and port keys.** Eight new
   `motor_sizing.belt_pulley.*` parameters, extending the existing
   released group (additive, same array in `definitions.ts`, no existing
   entry edited): `motion_mode` (enum input), `deceleration_time`
   (quantity input, both modes), `dwell_time` (quantity input, optional,
   both modes), `constant_velocity_time` (quantity, dual role — see item
   2), `cycle_time` (quantity, dual role), `travel_distance` (quantity,
   dual role), `deceleration_torque` (quantity output only),
   `effective_torque` (quantity output only). `target_velocity` and
   `acceleration_time` are already-released `0.1.0` parameters, reused
   unchanged; `target_velocity` gains a new *output* port in `0.2.0` (see
   item 2), `acceleration_time` stays input-only, required in both modes.

2. **Real output port, not trace-only, for the derived side of
   `motion_mode`.** Confirmed feasible against this SDK's own precedent:
   `example-relay@0.1.0` already declares one canonical parameter ID on
   both its input and output ports of the same module
   (`lib/application/projects/manage-module-instances.test.ts`'s own
   comment on this fixture). `0.2.0` follows that precedent: `target_velocity`,
   `travel_distance`, `constant_velocity_time`, and `cycle_time` each get
   BOTH an input port (`required: false` at the manifest level; the real
   per-mode requirement is enforced by a new `input-schema.ts`
   `superRefine` rule, the same conditional-requirement pattern
   `support-bearing@0.1.0`'s own `bearing.location` split already
   established) AND an output port reusing the identical parameter ID —
   so "the module always reports both the velocity-side and
   distance-side values" (design doc) regardless of which two the
   engineer actually supplied.

3. **Registry version.** `1.14.0` (bumped from `1.13.0`; `1.13.0` added
   to `PARAMETER_REGISTRY_SUPPORTED_VERSIONS` so
   `index-table-motor-sizing@0.1.0`'s own pinned manifest target stays
   served — the same displaced-current-version step every prior registry
   bump followed, most recently `1.7.0` before `1.8.0`).

### A fourth decision the design doc left implicit: cross-version reuse policy

`0.2.0`'s own kernel (`math.ts`) duplicates every unchanged pure function
from `0.1.0`'s own `math.ts` (inertia, drive force/load torque, operating
speed, momentary/required torque) rather than importing across version
directories. Two reasons: module conformance's own `import-boundary`
check (`lib/engine/module-sdk/conformance.ts`) restricts a module package
to importing only the engine's public surface and its own files, the same
restriction that already forces every *other* module to reproduce rather
than import a sibling's formula (ADR-0011 "Reuse policy") — nothing in
that check's own design carves out an exception for "a different version
of the same module ID," so the same restriction is treated as applying
here too, conservatively; and `0.1.0` is released and immutable
(`CLAUDE.md`), so an import dependency from `0.2.0` back onto it would be
a real coupling this project's own "self-contained per version" module
history has never established as intentional. Recorded here as a real
judgment call, not asserted without reasoning.

### Released Additive Contract

Registry version: `1.14.0`. New `motor_sizing.belt_pulley.*` (8, on top
of the 24 already released in `1.12.0`): `motion_mode`,
`deceleration_time`, `dwell_time`, `constant_velocity_time`, `cycle_time`,
`travel_distance`, `deceleration_torque`, `effective_torque`. Full
definitions: `lib/engine/parameters/definitions.ts` `motorSizingBeltPulley`
(appended entries).

### Method Sources

Adds no new source: `jp.oriental_motor.motor_sizing_calculations@web-2026-08-08`
(already registered, `lib/standards/engineering-sources.ts`) is now also
cited for pp. 5-6 (acceleration/effective-torque common formulas), not
only p. 4 as before — its own intake note is extended to record this.
