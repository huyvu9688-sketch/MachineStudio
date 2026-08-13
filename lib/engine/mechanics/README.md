# Rigid-Body Mechanics (Unit 6.1)

Generic, source-independent rigid-body dynamics: mass moment of inertia for
standard shapes, and `Ta = J*alpha`. This is the one piece of the Motor
Sizing Tool family (`context/adr/0011-motor-sizing-tool-architecture.md`)
that is a shared engine package rather than a per-module reproduction —
see that ADR's "Reuse policy" for why: no source disagrees on
`J = (1/8)*m*D^2` for a solid cylinder the way sources disagree on, say, a
coupling service factor, so every mechanism module depends on one audited
implementation instead of copying it.

## Why this exists now

`context/progress-tracker.md` "Next up" names `motor-sizing.ball-screw` as
the recommended first module in the new family. Every mechanism module in
that family needs inertia and acceleration-torque formulas internally
(ADR-0011 "Module shape", steps 2 and 4) — this package is the prerequisite
those modules' own Stage 3 will import, built ahead of the first consumer
because it is genuinely shared infrastructure, not speculative
(`context/ai-workflow-rules.md` "Generic Platform Workflow").

## Public surface

- `pointMassInertia`, `solidCylinderInertia`,
  `solidCylinderInertiaFromDensity`, `hollowCylinderInertia`,
  `hollowCylinderInertiaFromDensity`, `rectangularPillarInertia`,
  `offsetAxisInertia`, `linearMotionInertia` — `./inertia.ts`.
- `accelerationTorque`, `angularAccelerationFromSpeedRamp` — `./torque.ts`.
- `MechanicsInputError` — `./errors.ts`.

## Source

Oriental Motor Co., Ltd., _Motor Sizing Calculations_
(`jp.oriental_motor.motor_sizing_calculations@web-2026-08-08`, already
registered in `lib/standards/engineering-sources.ts` for the `ball-screw`
module; cached at `reference/source-material/Oriental_Motor Sizing
Calculators.pdf`, pp. 2-3 "Moment of Inertia" and p. 5 "Acceleration
Torque"). Every formula here is restated with that source's own symbols and
constants, not invented — but the underlying physics is textbook rigid-body
dynamics available in any mechanics reference, the same "ordinary physics,
not a sourced engineering method" category `drive-train@0.1.0`'s own
`resolveRegenEnergy` doc comment already established for
`E = J*omega^2/2` (`lib/modules/drive-train/0.1.0/math.ts`). Only the
rotation-axis (`Jx`) forms are implemented — the source also prints
transverse-axis (`Jy`) forms nothing in this codebase consumes yet; add them
when a real consumer needs them, not ahead of one.

`torque.test.ts` cross-checks `accelerationTorque` composed with
`angularAccelerationFromSpeedRamp` against the source's own rpm-packaged
form `Ta = J*N/(9.55*t1)` and confirms agreement to within the precision the
printed constant `9.55` (`= 30/pi`, rounded) allows.

## Contract

Every argument and result is a bare `number` in the SI-coherent unit named
by its field suffix (`Kg`, `M`, `KgM2`, `KgPerM3`, `RadPerS2`, `Nm`) — the
same "bare numbers internal, `EngineeringValue` only at the module-package
boundary" convention every `lib/modules/*` math kernel already follows
(see e.g. `lib/modules/drive-train/0.1.0/math.ts`'s own doc comment). This
package sits below that boundary: it has no dependency on `lib/engine/units`
or `lib/engine/values`, and no module imports its internals — only its
public functions, the same way every module already depends on
`lib/engine/units`.

**Not addressed here:** the `Quantity`-level `Ta = J*alpha` composition
(`lib/engine/units/arithmetic.ts` documents why the registry's own angle
dimension makes generic `multiplyQuantities` unable to express it, the same
issue already solved there for `P = T*omega`). No caller needs a
`Quantity`-level version yet; add one beside `rotationalPower` when one
does, not speculatively.

## What is deliberately not here

- Mechanism-specific load-torque formulas (ball screw, pulley, belt/rack)
  — ADR-0011 keeps those inside each mechanism module, reproduced per
  module rather than shared, since they are a manufacturer method sources
  can disagree on, not textbook physics.
- Motion-profile / trapezoidal-move kinematics — `motion-profile@0.1.0`'s
  own `resolveTrapezoidalMove`/`resolveMotionCycle` stay module-owned;
  ADR-0011 has each mechanism module reproduce that math internally rather
  than link to it or move it here.
- A `Quantity`-level wrapper (see above).
