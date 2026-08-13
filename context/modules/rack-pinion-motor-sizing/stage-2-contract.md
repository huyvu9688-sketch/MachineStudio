# Rack-and-Pinion Motor Sizing Module — Stage 2 Parameter Contract

## Status

- Work unit: Milestone 6, Unit 6.4, following Stage 1
  (`stage-1-spec.md`, done 2026-08-13).
- Status: **Done, 2026-08-13.** Registry `1.11.0` releases the full
  `motor_sizing.rack_pinion.*` group (21 new parameters).

## Decisions

### 1. Parameter-group naming — per-mechanism prefix, `motor_sizing.rack_pinion.*`

Same convention both prior Motor Sizing Tool modules already established
(`motor_sizing.ball_screw.*`, `motor_sizing.direct_drive_conveyor.*`).

### 2. Reuse `motion.axis.*` directly for orientation, incline, gravity, friction, and mass — not a new parameter group

`stage-1-spec.md` "Relationship to Existing and Planned Modules" already
makes the case in full: a rack-and-pinion axis is the same "rigid
carriage on a guide" mechanism class as a ball screw, and the primary
source (`jp.oriental_motor.general_catalog_motor_fan_sizing`, p. F-3)
prints the identical force formula for both mechanisms verbatim. This is
the opposite reuse conclusion from `direct-drive-conveyor-motor-sizing@
0.1.0`'s own deliberate non-reuse of `friction_coefficient` — reached for
the opposite, equally source-backed reason: here the physical interface
(sliding-guide friction) and its typical range (`0-1`) genuinely match.
Reused: `motion.axis.orientation`, `motion.axis.incline_angle`,
`motion.axis.gravity`, `motion.axis.friction_coefficient`,
`motion.axis.total_moving_mass`.

### 3. `gear_ratio`, `mechanical_efficiency`, and `external_force` are new parameters, not reuses of `screw.*` / `motor_sizing.ball_screw.*`

Same quantity kind as `screw.gear_ratio` / `screw.mechanical_efficiency` /
`motor_sizing.ball_screw.external_force`, but a different meaning-scoped
namespace: `screw.*` is specifically a ball/lead-screw concept (a
ball-nut's own preload and internal friction have no rack-and-pinion
equivalent at all — there is no "preload nut" on a gear mesh), and each
mechanism module mints its own `external_force`/`motor_rotor_inertia` by
established precedent (code-standards.md "Canonical Parameters": confirm
exact meaning before reuse, not merely quantity kind).
`motor_sizing.rack_pinion.gear_ratio` keeps `screw.gear_ratio`'s own
"optional, constant default `1`" policy — a direct-connected pinion needs
no extra input, the same structural (not physical) default reasoning.

### 4. The motion-input shape is a single accelerate-to-speed event, not a full accelerate/run/decelerate cycle — independently reconfirmed, not assumed from the conveyor module

`stage-1-spec.md` "Candidate Methods and Sources" items 1, 3, and 4: all
three sources reviewed this session (Oriental Motor's own general
formula's lack of a rack-and-pinion-specific cycle example, Andantex's
own `a=V/ta` single-ramp model, Atlanta's own two single-event worked
examples) independently show no RMS-cycle or return-move treatment for
this specific mechanism — the same finding
`direct-drive-conveyor-motor-sizing@0.1.0` made for its own mechanism,
reached independently here rather than copied. `target_velocity` and
`acceleration_time` mirror that module's own
`target_belt_speed`/`acceleration_time` shape.

### 5. A single combined `required_torque_safety_factor`, not `ball-screw-motor-sizing@0.1.0`'s own two separate margins

Follows directly from Decision 4: no RMS/effective torque is computed, so
there is only one computed torque figure to apply a safety factor to —
the same shape `direct-drive-conveyor-motor-sizing@0.1.0` already
established for the identical reason.

### 6. Orientation and incline ARE supported, unlike `direct-drive-conveyor-motor-sizing@0.1.0`

A genuine scope difference from the conveyor module, evidence-driven, not
copied from the ball-screw module by default: both Atlanta's and
Andantex's own sources give a dedicated vertical-lifting force variant
(`stage-1-spec.md` "Relationship to Existing and Planned Modules" table),
real evidence this mechanism needs orientation support the conveyor's own
sources never showed.

## Released Additive Contract

Registry version: `1.11.0` (bumped from `1.10.0`; `1.10.0` added to
`PARAMETER_REGISTRY_SUPPORTED_VERSIONS` so
`direct-drive-conveyor-motor-sizing@0.1.0`'s own pinned manifest target
stays served, the same "add the displaced current version explicitly"
step every prior registry bump already followed).

### Reused without change

`motion.axis.orientation`, `motion.axis.incline_angle`,
`motion.axis.gravity`, `motion.axis.friction_coefficient`,
`motion.axis.total_moving_mass`.

### New `motor_sizing.rack_pinion.*` parameters (21)

Inputs: `pinion_pitch_diameter`, `pinion_mass`, `gear_ratio`,
`mechanical_efficiency`, `external_force`, `target_velocity`,
`acceleration_time`, `motor_rotor_inertia`,
`required_torque_safety_factor`, `inertia_ratio_maximum`.

Outputs: `pinion_inertia`, `load_inertia`, `reflected_load_inertia`,
`total_system_inertia`, `inertia_ratio`, `load_torque`,
`acceleration_torque`, `momentary_torque`, `required_torque`,
`operating_speed`, `required_power`.

Full definitions: `lib/engine/parameters/definitions.ts`
`motorSizingRackPinion`.

## Method Sources

- `jp.oriental_motor.general_catalog_motor_fan_sizing@f-tecref-2003-2004`
  — primary: force/load-torque formula, inertia formulas (via
  `lib/engine/mechanics`).
- `us.andantex.modular_rack_pinion_system@web-2026-08-13` — secondary,
  public: independently corroborates the same force/torque shape.
- `us.atlanta_drive_systems.rack_pinion_calculations@sha256-2bc6e48c2dce79dd`
  — internal benchmark only (licensed; never cited in `manifest.ts` or a
  trace — the `axis-load-cases@0.1.0` precedent, `stage-1-spec.md`
  "Candidate Methods" item 4).

## Stage 2 Entry Criteria — Resolution Status

All five `stage-1-spec.md` "Stage 2 Entry Criteria" items resolved as
recorded above. Stage 3 (compute and trace) is next.
