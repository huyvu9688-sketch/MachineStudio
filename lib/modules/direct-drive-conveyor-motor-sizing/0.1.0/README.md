# Direct-Drive Conveyor Motor Sizing Module (`direct-drive-conveyor-motor-sizing`)

Milestone 6, Unit 6.3 — the second module in the Motor Sizing Tool family
(`context/adr/0011-motor-sizing-tool-architecture.md`), after
`ball-screw-motor-sizing@0.1.0`. Given a horizontal belt conveyor's own
roller geometry, belt and carried-load mass, friction, and a commanded
single accelerate-to-speed motion event, computes the required motor
specifications a motor directly connected to the drive-roller shaft (no
gearbox) must meet: friction-driven load torque, acceleration torque,
momentary (starting) torque, required torque with an engineer-supplied
safety factor, operating speed, required power, total reflected system
inertia, and inertia ratio.

Full specification: `context/modules/direct-drive-conveyor-motor-sizing/
stage-1-spec.md` (Stage 1) and `stage-2-contract.md` (Stage 2).

## Status

- Stage 1 (engineering specification): **done**, 2026-08-13.
- Stage 2 (parameter contract): **done**, 2026-08-13 — registry `1.10.0`
  releases the `motor_sizing.direct_drive_conveyor.*` group.
- Stage 3 (compute and trace): **done**, 2026-08-13 — this directory.
- Stage 4 (validation): **done**, 2026-08-13 — see "Stage 4" below.
- Stage 5 (generic surfaces, workflow role/link integration, catalog
  adapter, conformance): **done**, 2026-08-13 — see "Stage 5" below.
- Stage 6 (release): **done**, 2026-08-13 — registered as
  `direct-drive-conveyor-motor-sizing@0.1.0`
  (`lib/modules/registry.generated.ts`). See "Stage 6" below.

## Self-contained, not linked (ADR-0011 "Reuse policy")

This module reproduces, rather than imports or links to, Omron
Corporation's and Oriental Motor Co., Ltd.'s own conveyor sizing methods —
see `math.ts`'s own module doc comment. The genuine imports are
`lib/engine/mechanics` (Unit 6.1) for `solidCylinderInertia`,
`linearMotionInertia`, `angularAccelerationFromSpeedRamp`, and
`accelerationTorque` — the shared, source-independent physics package this
family depends on. This module is the first in the family to reuse
`angularAccelerationFromSpeedRamp` directly (`ball-screw-motor-sizing@
0.1.0` computes its own `alpha` from lead/gear-ratio terms that package
does not model); `resolveOperatingSpeed` converts belt speed to angular
velocity, and the shared `delta_omega/t` relationship handles the rest.

No calculation-level dependency on any Milestone-4 discipline module or on
`ball-screw-motor-sizing@0.1.0`. This module reuses only one already-
released parameter (`motion.axis.gravity`) — an exhaustive
cross-module-link sweep (`cross-module-links.test.ts`, every input port
against every output port of all seven Milestone-4 modules plus
`ball-screw-motor-sizing@0.1.0`) confirms zero compatible pairs, unlike
`ball-screw-motor-sizing@0.1.0`'s own sweep, which found one incidental
`total_moving_mass` pair — this module's own geometry/mass/friction terms
share no meaning with any released group (`stage-2-contract.md` "Reused
without change").

## A real finding: neither reference example computes an acceleration-torque term

Both of Oriental Motor Co., Ltd.'s own conveyor worked examples (General
Catalog Technical Reference pp. F-8 "Belt and Pully" and F-9 "Conveyor")
derive their own final required-torque figure from load (friction) torque
alone, with a safety factor — neither computes an inertial acceleration
torque at all. p. F-8's own text, *"On a belt conveyor, the greatest
torque is needed when starting the belt,"* refers to static-friction
breakaway, not `Ta = J*alpha`. This module's own already-released
parameter contract (registry `1.10.0`) nonetheless defines
`acceleration_torque`, `momentary_torque = acceleration_torque+
load_torque`, and `required_torque = momentary_torque*Sf`, mirroring the
already-registered `jp.oriental_motor.motor_sizing_calculations` web
page's own general `TM=(TL+Ta)*Sf` shape (the same general method every
stepping-motor/index-table example in this same source document uses).
This module's own kernel computes a real, nonzero `acceleration_torque`
for both reference scenarios, but — honestly — using an engineer-supplied
`acceleration_time` neither source states. See "Stage 4" and
`validation.ts` "deviations" for the full account: `load_torque`, the
on-shaft inertia sum, and `operating_speed` are validated against real
printed figures; `acceleration_torque`/`momentary_torque`/
`required_torque` are not, though the underlying `Ta = J*alpha`
relationship is independently validated elsewhere (`lib/engine/mechanics`'
own `torque.test.ts`, and `ball-screw-motor-sizing@0.1.0`'s own worked
examples, which do include a real acceleration phase).

## A second real finding: p. F-9's own printed inertia figure is internally inconsistent

p. F-9's own `Jm2` (belt+work inertia, `132 oz-in^2`) does not apply the
same `lb`-to-`oz` conversion its own `Jm1` (single-roller inertia,
`70.4 oz-in^2`) correctly applies three lines earlier in the same worked
example — recorded as a source-internal printing/arithmetic error
(`stage-1-spec.md` "Evidence Gaps," confirmed rather than resolved this
session against the full 9-page source document). This module's own
kernel implements the physically correct, internally consistent formula
throughout and does not reproduce the printed `132` figure — see
`validation.ts` "deviations."

## Stage 4 (validation, done 2026-08-13)

**Reference examples.** Oriental Motor Co., Ltd.'s own "Belt and Pully"
worked example (p. F-8) is reproduced twice: at the kernel level
(`math.test.ts` "end-to-end") and through the real `executeModule` compute
path (`oriental-motor-reference-examples.ts`/`.test.ts`) — friction force,
load torque, the full on-shaft inertia sum (both rollers + belt + work,
`2061 oz-in^2`), and roller-shaft operating speed (`33.4 r/min`) all
reproduce within the source's own printed rounding. The "Conveyor" worked
example (p. F-9) is reproduced for `load_torque` only (`22 lb-in`), through
`executeModule` — its own printed inertia figure is not reproduced (see
"A second real finding" above); the single-roller inertia term it *does*
compute consistently (`Jm1=70.4 oz-in^2`) is confirmed separately at the
kernel level.

**Independent benchmark.** `omron-independent-benchmark.ts`/`.test.ts`
reimplements Omron Corporation's own combined `JW=J1+J2+J3+J4` inertia
formula as a genuinely separate, mm-based computation and cross-checks it
against this module's own decomposed kernel (four separate function
calls, summed by the caller) — not just the one scenario hand-verified in
`stage-1-spec.md`, but a deterministic property-based sweep over 200
random roller/belt/load scenarios (including unequal roller diameters),
confirming algebraic identity to floating-point precision in every case.
The solo-validation reviewer-substitute policy is invoked, this benchmark
serving as the review substitute.

Full validation record: `validation/direct-drive-conveyor-motor-sizing/
0.1.0.md`.

## Stage 5 (generic surfaces, done 2026-08-13)

- **Generic UI schema (`ui.ts`) and report schema (`report.ts`)**: built
  in Stage 3, unchanged here — `package.test.ts`'s own `package-validation`
  conformance check already exercises both and passes.
- **Workflow role and link integration**: `manifest.workflowRoles` stays
  `[]`, confirmed by a real test (`cross-module-links.test.ts`) — this
  module is not part of the `linear-axis@1` workflow, and no other guided
  workflow exists for the `motor-sizing.*` family yet.
- **Cross-module link tests**: an exhaustive sweep (every one of this
  module's own input ports against every output port of all seven
  Milestone-4 modules plus `ball-screw-motor-sizing@0.1.0`) confirms zero
  compatible pairs — see "Self-contained, not linked" above.
- **Catalog adapter**: not applicable — ADR-0011 "Output scope" explicitly
  excludes motor catalog/part matching from this phase.
- **Module conformance**: `package-validation`, `import-boundary`,
  `source-immutability`, and `execution`/`determinism` (via
  `runModuleConformance`) all pass. 57 tests total in this directory.

## Stage 6 (release, done 2026-08-13)

`index.ts` (renamed from `package.ts`) assembles the same manifest, ports,
compute, UI, report, and validation record into a single `ModulePackage`
and seals it, so `npm run registry:generate` now discovers it: the module
is registered as `direct-drive-conveyor-motor-sizing@0.1.0` in
`lib/modules/registry.generated.ts` — the second module in the Motor
Sizing Tool family (ADR-0011). `package.test.ts` pins the
source-immutability hash (`npm run module:source-hash --
direct-drive-conveyor-motor-sizing 0.1.0` → `3fa1417cf144229a`) and asserts
`import-boundary` and `source-immutability` both pass as real checks, not
skipped. Sealed package content hash: `bfc0a603d8c5e3a1`. `validation.ts`'s
`reviewer`/`reviewDate` were already finalized at Stage 4 ("Solo
validation — Omron Corporation independent-benchmark substitute",
`2026-08-13`) — no new evidence was needed at Stage 6.
`validation/direct-drive-conveyor-motor-sizing/0.1.0.md` and its
`validation/source-index.md` rows are written the same day Stage 4 closed,
not deferred. 57 tests total, all passing. Full validation record:
`validation/direct-drive-conveyor-motor-sizing/0.1.0.md`.

## Not in scope for `0.1.0`

- Any mechanism other than a direct-drive (`i = 1`), horizontal, two-roller
  (drive + idler) belt conveyor — a geared/pulley-reduced drive of a rigid
  load is a physically different mechanism
  (`motor-sizing.belt-pulley-drive`, not yet built), not this module's own
  scope narrowed (`stage-1-spec.md` "Relationship to Existing and Planned
  Modules").
- Inclined conveyors — no source found this session gives an
  inclined-conveyor formula or worked example.
- A repeating duty cycle or effective (RMS) torque check — every source
  read for this mechanism checks a single breakaway/acceleration event's
  own peak torque plus a continuous running torque, never a `Trms` sum
  over repeated phases.
- Motor catalog matching or part selection (ADR-0011 "Output scope") — no
  candidate motor's own rated/peak torque is an input; `required_torque`/
  `required_power` are reported required-spec values, not pass/fail
  checks.
- Thermal derating, belt-slip checks, belt-tension/tracking design.
