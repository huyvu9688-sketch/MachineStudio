# Index-Table Motor Sizing Module — Stage 2 Parameter Contract

## Status

- Work unit: Milestone 6, Unit 6.6, following Stage 1
  (`stage-1-spec.md`, done 2026-08-13).
- Status: **Done, 2026-08-13.** Registry `1.13.0` releases the full
  `motor_sizing.index_table.*` group (18 new parameters).

## Decisions

### 1. Per-mechanism prefix, `motor_sizing.index_table.*`

The convention every Motor Sizing Tool module already established.

### 2. No `motion.axis.*` reuse — an entirely self-contained parameter group

The first Motor Sizing Tool module to reuse nothing from `motion.axis.*`.
`stage-1-spec.md` "Genuinely different in kind" records why: an index
table's own motion is rotary, commanded directly in angle/time, with no
linear carriage, gravity, or Coulomb-friction physics anywhere in either
source read this session — the identical "no shared physical interface"
reasoning `direct-drive-conveyor-motor-sizing@0.1.0` already applied to its
own non-reuse of `motion.axis.friction_coefficient`.

### 3. `load_torque` is a required INPUT with a `0 N*m` structural default, not a computed output

The one shape difference from every sibling module's own port list. Both
primary sources (`stage-1-spec.md` "The central finding") independently
omit a load-torque formula for this mechanism entirely, stating the
friction at an index table's own bearing/support interface is negligible
— not a value both sources happen to agree on, but a term neither source
computes at all. `0` is the same "degrades gracefully, engineer can
override, not a guessed physical value" treatment `belt_mass` already
received in `belt-pulley-drive-motor-sizing@0.1.0`.

### 4. Mounted-load inertia is one engineer-supplied figure, not modeled geometry

`attached_load_inertia` (optional, default `0 kg*m^2`) represents the
combined moment of inertia of any workpieces or fixtures mounted on the
table, about the table's own rotation axis. Oriental Motor's own worked
example arranges 12 discrete point loads around the table at a fixed
radius (parallel-axis theorem); AutomationDirect's own example has none at
all. A general point-load arrangement (count, radius, individual mass) is
not one mass/radius pair the way a belt's own translating mass is, so this
module does not model the geometry itself — the engineer resolves it
(with `lib/engine/mechanics`' own `pointMassInertia`/`offsetAxisInertia`,
or by hand) and supplies the total, the same "engineer supplies the
resolved figure" precedent `belt_mass` already established, extended one
step further here because the underlying geometry is genuinely more
varied than a single mass term can express.

### 5. Motion is angle/time directly — no radius-based linear-to-rotary conversion

Every sibling module converts a linear `target_velocity` to angular speed
via a pulley/pinion radius. An index table commands `index_angle` (rad)
over `index_time` (s) directly at the table shaft; `table_diameter` is
used only for the table's own moment of inertia, never for a speed
conversion. `acceleration_time` keeps the same meaning and required-input
treatment every sibling already gives it (the ramp portion of the move,
assumed symmetric between acceleration and deceleration) — reused by name
and role, not reused by parameter ID, since no `motor_sizing.*` group
shares an angle-based motion port with this one.

### 6. Single index event; one combined safety factor

The same decision every sibling module reached independently for its own
single accelerate-to-speed event, applied here to a single
accelerate-decelerate-to-stop index move: one computed torque figure
(`acceleration_torque + load_torque`), one required-torque safety factor.

## Released Additive Contract

Registry version: `1.13.0` (bumped from `1.12.0`; `1.12.0` added to
`PARAMETER_REGISTRY_SUPPORTED_VERSIONS` so
`belt-pulley-drive-motor-sizing@0.1.0`'s own pinned manifest target stays
served — the same displaced-current-version step every prior registry
bump followed).

**New `motor_sizing.index_table.*` (18).** Inputs: `table_mass`,
`table_diameter`, `attached_load_inertia`, `gear_ratio`, `index_angle`,
`index_time`, `acceleration_time`, `load_torque`, `motor_rotor_inertia`,
`required_torque_safety_factor`, `inertia_ratio_maximum`. Outputs:
`table_inertia`, `load_inertia`, `reflected_load_inertia`,
`total_system_inertia`, `inertia_ratio`, `acceleration_torque`,
`momentary_torque`, `required_torque`, `operating_speed`,
`required_power`.

Full definitions: `lib/engine/parameters/definitions.ts`
`motorSizingIndexTable`.

## Method Sources

- `jp.oriental_motor.general_catalog_motor_fan_sizing@f-tecref-2003-2004`
  — already registered; this module cites its own "Index Table" subsection
  (pp. F-8-F-9), distinct from the "Belt and Pully"/"Conveyor" subsections
  on the same two pages `direct-drive-conveyor-motor-sizing@0.1.0` already
  cites.
- `us.automationdirect.sureservo_selection_appendix@2nd-ed-rev-b-08-2011`
  — already registered; this module cites its own "Index Table - Example
  Calculations" section (pp. B-14-B-16), distinct from the "Belt Drive"
  section `belt-pulley-drive-motor-sizing@0.1.0` already cites.

No new source registration needed — both sources were already registered
by earlier Motor Sizing Tool modules for their own, different pages.

## Stage 2 Entry Criteria — Resolution Status

All five `stage-1-spec.md` "Stage 2 Entry Criteria" items resolved as
recorded above. Stage 3 (compute and trace) is next.
