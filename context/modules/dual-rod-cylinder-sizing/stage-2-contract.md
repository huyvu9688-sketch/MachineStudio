# Dual Rod Cylinder Sizing Module — Stage 2 Parameter Contract

## Status

Work unit: Milestone 7, Unit 7.4, Stage 2. Date: 2026-08-26.

## Decisions

1. **Required-force sign convention** reproduces
   `pneumatic-cylinder-sizing@0.1.0`'s own `resolveRequiredForce` exactly
   (itself reproducing `ball-screw-motor-sizing@0.2.0`'s own
   forward/return convention): extend adds the gravity term, retract
   subtracts it; friction is direction-symmetric (always added); process
   force applies to extend only. No new decision here — confirmed
   unchanged from the two prior pneumatic sizing modules.
2. **No buckling-related parameters are reused or minted.** This module
   has no buckling check (stage-1-spec.md). `pneumatic.mounting_style` and
   `pneumatic.buckling_safety_factor` are not ports on this module.
3. **`dual_rod_sizing.process_force` mints a new ID** rather than reusing
   `pneumatic_sizing.process_force` or `pneumatic_guided_sizing.
   process_force` — this registry's own established "never let a resolved
   value from one module look like a compatible link source for an
   unrelated one" convention, the same reasoning `pneumatic_guided_sizing.
   process_force` already gives for not reusing `pneumatic_sizing.
   process_force`.
4. **`dual_rod_sizing.mounting_orientation` is a new binary enum**
   (`vertical`/`horizontal`), deliberately not a reuse of the three-value
   `motion.axis.orientation` (`horizontal`/`vertical`/`inclined`). CXS2's
   own selection graphs have no "inclined" bucket; reusing the three-value
   enum would admit a value with no seeded band behind it. Mirrors the
   `pneumatic.mounting_style` precedent (minted fresh rather than forcing
   an ill-fitting reuse of an existing enum with different cardinality).
5. **`dual_rod_sizing.overhang_length` is a new required quantity, no
   built-in default.** SMC's own "Overhang L" lever arm has no natural
   zero-default (a zero overhang is a real, valid, but unusual
   configuration) — required, matching `dual_rod_sizing.required_stroke`'s
   own no-default treatment.
6. **Band-selection logic (stroke/speed rounded up to the nearest seeded
   band) is disclosed as an engineering judgment call**, not a value SMC's
   own catalog states directly as a rule — SMC publishes the bands as
   graph titles, not as an explicit "round up" instruction. Recorded in
   `validation.ts`'s own `deviations` at Stage 4.

## Final parameter list

See the implementation plan's own "Final port list" section for the full
port table. New parameters (all under a fresh `dual_rod_sizing.*`
namespace): `process_force`, `required_stroke`, `required_extend_force`,
`required_retract_force`, `overhang_length`, `mounting_orientation`.
Reused unchanged: `motion.axis.incline_angle`, `motion.axis.
friction_coefficient`, `motion.axis.total_moving_mass`, `pneumatic.
operating_pressure`, `pneumatic.load_factor`, `pneumatic.cushion_type`,
`pneumatic.max_piston_speed`, `pneumatic.kinetic_energy`.

## Registry version

`1.18.0` -> `1.19.0`, additive only (six new `dual_rod_sizing.*`
parameters). No new unit-registry dimension or unit needed.
