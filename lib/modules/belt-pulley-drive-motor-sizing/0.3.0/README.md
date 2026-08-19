# Belt-Pulley Drive Motor Sizing Module `0.3.0` (`belt-pulley-drive-motor-sizing`)

## 0.3.0 — Consistency-Pass Addendum (Gravity, disabledWhen, Recommended Inertia-Ratio Default)

Follow-on to `0.2.0`, per
`docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md`
and `docs/superpowers/plans/2026-08-19-belt-pulley-drive-motor-sizing-0.3.0.md`
-- the last of the five Motor Sizing Tool module-version bumps, and the
only one carrying all three consistency-pass changes at once, since this
is the design's own only `disabledWhen` consumer. None of the three
changes touches the underlying physics (every reference example below
still passes unchanged):

1. **Gravity is no longer an input.** `math.ts` hardcodes
   `STANDARD_GRAVITY_M_PER_S2 = 9.80665` where the removed `gravity` port
   used to flow in. Behavior-neutral: the removed port's own registry
   constant default was already exactly this value, and no reference
   example or benchmark in this module's own validation record ever
   overrode it.
2. **`inertia_ratio_maximum` now resolves to a founder-directed recommended
   default of 10:1** (`motor_sizing.belt_pulley.
   inertia_ratio_recommended_maximum`, parameter registry `1.15.0`),
   editable, rather than `0.2.0`'s own required-no-default value. The
   inertia-ratio check's own exceeded-case status changed from `fail` to
   `warning` to match.
3. **`ui.ts` wires the new `disabledWhen` UI capability** -- this module is
   the only consumer of it in this project. `target_velocity`/
   `constant_velocity_time` render disabled whenever `motion_mode` is
   `"distance"`; `travel_distance`/`cycle_time` render disabled whenever
   `motion_mode` is `"velocity"`. Presentation only --
   `input-schema.ts`'s own required/optional enforcement per mode is
   unchanged.

`0.1.0` and `0.2.0` both stay released, registered, and byte-for-byte
untouched (`lib/modules/belt-pulley-drive-motor-sizing/0.1.0/`,
`lib/modules/belt-pulley-drive-motor-sizing/0.2.0/`) -- an engineer who
wants `0.3.0`'s behavior on an existing instance archives it and adds a
fresh `0.3.0` instance, the same migration story every prior Motor Sizing
`0.2.0` release already established. Full record:
`validation/belt-pulley-drive-motor-sizing/0.3.0.md`.

Completes ADR-0011's own Motor Sizing Tool consistency pass: all five
mechanism modules (`ball-screw-motor-sizing@0.2.0`,
`direct-drive-conveyor-motor-sizing@0.2.0`,
`rack-pinion-motor-sizing@0.2.0`, `index-table-motor-sizing@0.2.0`, and
this module at `0.3.0`) now consume the shared parameter-registry `1.15.0`
recommended inertia-ratio default.

## 0.2.0 — First Module-Version Bump

The first module-version bump in this project, following
`docs/superpowers/specs/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0-design.md`
and ADR-0011's own "follow-on work" note. `0.1.0` stays released,
registered, and untouched (`lib/modules/belt-pulley-drive-motor-sizing/0.1.0/`).

Adds, on top of everything `0.1.0` already computes: a native repeating
trapezoidal motion cycle (accelerate/run/decelerate/dwell), entered either
velocity-first (`target_velocity` + `constant_velocity_time`) or
distance-first (`travel_distance` + `cycle_time`) via `motion_mode`, plus
`deceleration_torque` (symmetric to `acceleration_torque`) and
`effective_torque` (Trms, for continuous/thermal motor rating).
`required_torque` stays governed by the acceleration phase alone;
`effective_torque` is additive, not a replacement.

Full specification: `context/modules/belt-pulley-drive-motor-sizing/
stage-2-contract.md` "0.2.0 Addendum".

## Status

- Stage 1: **done** (this session — Oriental Motor's own Trms formula
  confirmed against the cached PDF, pp. 5-6; generic, not belt/pulley-
  specific; no worked example).
- Stage 2 (parameter contract): **done** — registry `1.14.0` releases 8
  new `motor_sizing.belt_pulley.*` parameters.
- Stage 3 (compute and trace): **done** — self-contained; duplicates
  0.1.0's own unchanged kernel functions rather than importing them
  (`stage-2-contract.md` "0.2.0 Addendum" cross-version reuse policy).
- Stage 4 (validation): **done** — see `validation/belt-pulley-drive-
  motor-sizing/0.2.0.md`. `effective_torque` has a disclosed, open gap
  (no published worked example), validated via algebraic-identity
  independent benchmark only.
- Stage 5 (generic surfaces, workflow role/link integration,
  conformance): **done**.
- Stage 6 (release): **done** — registered as
  `belt-pulley-drive-motor-sizing@0.2.0`
  (`lib/modules/registry.generated.ts`).

## Cross-version reuse policy

`0.2.0`'s own kernel duplicates every unchanged pure function from
`0.1.0`'s own `math.ts` rather than importing across version directories
— module conformance's own `import-boundary` check restricts a module
package to its own files plus the engine's public surface, and this
project's "reproduce, don't import" reuse policy (ADR-0011) is treated as
extending to a version bump, conservatively, since nothing in that
check's own design carves out an exception for "a different version of
the same module ID."

## Not in scope for `0.2.0`

- Unequal drive/idler pulley diameters, belt tension/width/pitch,
  tooth-shear, or wrap-angle selection, motor catalog matching — same as
  `0.1.0`.
- A pass/fail check on `effective_torque` — no source found gives a
  universal continuous-torque acceptance criterion for this mechanism
  family.
- Any change to `0.1.0`, any other Motor Sizing Tool module, or
  `motion-profile@0.1.0`/`drive-train@0.1.0` (design doc's own "Out of
  Scope").
