# Ball-Screw Motor Sizing Module (`ball-screw-motor-sizing`)

Milestone 6, Unit 6.2 — the first module in the Motor Sizing Tool family
(`context/adr/0011-motor-sizing-tool-architecture.md`). Given a ball-screw
axis's own geometry, mass, friction, orientation, and one full
point-to-point operating cycle, computes the required motor specifications
a servo motor for that axis must meet: acceleration torque, maximum
momentary torque, effective (RMS) torque, required torque with an
engineer-supplied safety factor, operating speed, required power, and
inertia ratio.

Full specification: `context/modules/ball-screw-motor-sizing/
stage-1-spec.md` (Stage 1) and `stage-2-contract.md` (Stage 2).

## Status

- Stage 1 (engineering specification): **done**, 2026-08-12.
- Stage 2 (parameter contract): **done**, 2026-08-12 — registry `1.9.0`
  releases the `motor_sizing.ball_screw.*` group.
- Stage 3 (compute and trace): **done**, 2026-08-12 — this directory.
- Stage 4 (validation): **done**, 2026-08-12 — `validation.ts` is a
  completed record. See "Stage 4 (validation, done 2026-08-12)" below for
  the full account.
- Stage 5 (generic surfaces, workflow role/link integration, catalog
  adapter, conformance): **done**, 2026-08-12. See "Stage 5 (generic
  surfaces, done 2026-08-12)" below.
- Stage 6 (release): **done**, 2026-08-13 — registered as
  `ball-screw-motor-sizing@0.1.0` (`lib/modules/registry.generated.ts`).
  See "Stage 6 (release, done 2026-08-13)" below.

## Self-contained, not linked (ADR-0011 "Reuse policy")

This module reproduces, rather than imports or links to, physics already
released in four other modules — see `math.ts`'s own module doc comment
and `stage-1-spec.md`'s "Relationship to Existing Released Modules" table
for the full account of what is reproduced from where and why. The one
genuine import is `lib/engine/mechanics` (Unit 6.1): `solidCylinderInertia`,
`linearMotionInertia`, and `accelerationTorque` are called directly, not
reproduced — the one shared, source-independent physics package this
family depends on.

No _calculation_-level dependency on `axis-load-cases`, `ball-screw`,
`motion-profile`, or `drive-train`. One incidental graph-level parameter
link does exist, confirmed (not hidden) by
`cross-module-links.test.ts` (Stage 5, 2026-08-12): `axis-load-cases@0.1.0`'s
own resolved `total_moving_mass` output is link-compatible with this
module's own `total_moving_mass` input, since both reuse the identical
`motion.axis.total_moving_mass` parameter ID. An exhaustive sweep (every
input port against every output port of all four modules) confirmed this
is the _only_ compatible pair. Nothing wires it today — this module has no
workflow role (below) — and no formula code is shared either way; see
`manifest.ts`'s own header comment for the full account. No `loadCases` on
any port: direction (forward/return) is encoded in the port key itself
(`forward_load_torque`/`return_load_torque`, etc.), not the registry's
`LoadCaseCategory` axis — a deliberate design decision, not an oversight
(stage-2-contract.md "Decisions" item 2).

## The structural fix this module makes

`drive-train@0.1.0`'s own `resolveEffectiveTorque` derives a closed-form
RMS-torque approximation from a single scalar `motion.profile.
rms_acceleration`, valid only when total system inertia and per-case load
torque both stay constant across the cycle. This module instead computes
`Trms = sqrt(sum(T_i^2*t_i)/sum(t_i))` (`math.ts`'s `resolveEffectiveTorque`)
over the actual phases of a real cycle — including a vertical or inclined
axis's own genuinely different forward/return load torque
(`resolveDriveForce`'s own direction-signed formula). Validated end to end
against Omron Corporation's own worked example (below) and, at the kernel
level, against THK Co., Ltd.'s own vertical worked example — see "Stage 4
(validation, done 2026-08-12)" below: fed THK's own seven printed phases
directly, this module's own N-phase Trms reproduces THK's own printed
`743 N*mm` within 0.5%, where `drive-train@0.1.0`'s own closed-form
approximation overstates it by ~21% (`validation/drive-train/0.1.0.md`
"deviations").

## Reference-value confirmation already done (Stage 3)

Omron Corporation's own complete worked example
(`jp.omron.servo_motor_selection_guide@csm-tg-e-3-1`, `reference/
source-material/Servo Selection.pdf` pp. 12-13) is reproduced twice:

- `math.test.ts`'s own "end-to-end: Omron Corporation's own worked
  example" test, at the kernel level (`math.ts`'s own functions called
  directly).
- `package.test.ts`'s own "Omron Corporation's own worked example, through
  executeModule" test, through the real compute path — the higher bar this
  project's own other modules use for a genuine reference example, not
  just a kernel-level check.

Both reproduce every printed intermediate figure: screw inertia
(`JB=1.5e-4 kg*m^2`), reflected load inertia (`JW=1.63e-4 kg*m^2`), load
torque (`TW=7.8e-3 N*m`), motor-shaft speed (`N=1800 rpm`), acceleration
torque (`TA=0.165 N*m`), maximum momentary torque (`T1=0.173 N*m`), and
effective (RMS) torque (`Trms=0.0828 N*m`) — all within the source's own
3-significant-figure rounding, none force-fit.

## Round-trip motion (Decisions item 2) — the fix for a real, disclosed defect

`motion-profile@0.1.0`'s own `move_{1..5}_*`/`dwell_{1..5}_*` ports all
share one canonical parameter ID each, with no `loadCase` to disambiguate
— `lib/db/repositories/graph-repository.ts`'s `resolveModuleInputs`
(keyed by `(parameterId, loadCase)` only) cannot tell them apart, a real
defect Unit 5.4 found affecting live application use
(`context/progress-tracker.md` "Open decisions"). This module's own
motion inputs (`forward_move_distance`, `return_move_distance`, etc.) are
six genuinely distinct parameter IDs, not an indexed family — the
collision is structurally impossible here, not just avoided by
convention.

`return_load_torque` is always computed (pure statics — direction alone,
no move needed), even when no return move is declared; only its
_contribution to the RMS/momentary aggregates_ is conditional on a return
move actually being commanded, since the module-SDK contract requires
every declared output port to be produced on every run
(`lib/engine/module-sdk/execute.ts`'s own "every declared port produced"
rule) — `compute.ts`'s own header comments explain this in full.

## Stage 4 (validation, done 2026-08-12)

Both evidence items `validation.ts` previously recorded as outstanding are
now closed — see `validation.ts` itself for the full record; this section
gives the narrative.

**THK Co., Ltd.'s own two worked examples**
(`jp.thk.example_ball_screw_selection@technico-mirror-2026-08-10`) are both
reproduced through the real `executeModule` compute path
(`thk-reference-examples.ts`/`.test.ts`), read directly this session via
`pdftotext -layout` against the registered technico.com mirror (physical
PDF pages 449-467) — not recalled from `drive-train@0.1.0`'s own doc
comments, since this module needs the exact per-phase algebra those
comments never captured. The horizontal example (baseline confirmation)
reproduces THK's own screw+load inertia, friction torque, momentary
torque, and effective (RMS) torque all within 1%. The vertical example (the
key validation target for the structural fix) reproduces THK's own
upward/downward load torque, inertia, and governing momentary torque within
1% — but its own `effective_torque`, through `executeModule`, understates
THK's own printed `743 N*mm` by ~29%, because THK's own cycle includes a
real, nonzero `658 N*mm` stationary holding torque this module's own dwell
phase does not model (an already-disclosed scope gap, now quantified with a
real number rather than left abstract). Isolated from that gap, a dedicated
kernel-level test feeds `resolveEffectiveTorque` THK's own seven printed
phases directly (including the `658 N*mm` term) and reproduces THK's own
`743 N*mm` within 0.5% — direct confirmation that the N-phase Trms formula
itself, not just the overall pipeline, is correct.

**A real physics question was investigated and resolved without a code
change.** Reading THK's own primary-source algebra directly (rather than
relying on the earlier, unsourced "Direction dependence" derivation in
`stage-1-spec.md`) initially looked like it might expose a sign-convention
bug in `resolveDriveForce` (gravity flips sign between `forward`/`return`;
THK's own printed torques don't show that flip). Verified by hand this
session: THK's own printed torques are unsigned magnitudes (the correct
convention for a motor torque-_rating_ guide), and `resolveDriveForce`'s
own sign flip is the mathematically correct projection of a fixed-frame
force balance (the same one `axis-load-cases@0.1.0`'s own
`resolveAxisLoadPhase` already uses) onto a single travel-direction-relative
scalar. `resolveMomentaryTorque` (`Math.abs`) and `resolveEffectiveTorque`
(squares every term) are already sign-agnostic, so the difference has zero
effect on any output. Confirmed exactly: feeding THK's own "guide surface
resistance" figure as this module's existing `external_force` input
reproduces all six of THK's own signed/unsigned moving-phase torques to
within 1%. No bug; no fix needed — recorded in `validation.ts` as a finding,
not a deviation.

**The independent-benchmark item is now met**
(`independent-benchmark.test.ts`): this module's own N-phase Trms is
cross-checked against `drive-train@0.1.0`'s own structurally different
closed-form `resolveEffectiveTorque`, both run through their own module's
real `executeModule` path against THK's own two examples (reusing
`drive-train@0.1.0`'s own already-tested THK fixtures directly, the same
test-only cross-module-import pattern every `cross-module-links.test.ts`
file already establishes). Result: the two methods agree within 1% on the
horizontal case and diverge by ~21% on the vertical case — reproducing,
not just resembling, the exact gap `validation/drive-train/0.1.0.md`
already discloses. The solo-validation reviewer-substitute policy is
invoked, this benchmark serving as the review substitute.

## Stage 5 (generic surfaces, done 2026-08-12)

- **Generic UI schema (`ui.ts`) and report schema (`report.ts`)**: built in
  Stage 3, unchanged here — `package.test.ts`'s own `package-validation`
  conformance check already exercises both and passes.
- **Workflow role and link integration**: `manifest.workflowRoles` stays
  `[]`, confirmed by a real test (`cross-module-links.test.ts`) rather than
  left as an unchecked comment — this module is not part of the
  `linear-axis@1` workflow (ADR-0011 hides the seven discipline categories
  from the default "Add module" picker but does not add this new family to
  that workflow), and no other guided workflow exists for the
  `motor-sizing.*` family yet.
- **Cross-module link tests**: an exhaustive sweep (every one of this
  module's own input ports against every output port of
  `axis-load-cases@0.1.0`, `ball-screw@0.1.0`, `motion-profile@0.1.0`, and
  `drive-train@0.1.0`, using the real `evaluateLinkCompatibility` evaluator
  — the same pattern every other module's own `cross-module-links.test.ts`
  already establishes) found and corrected a real inaccuracy in this
  module's own prior "no port links" claim: `axis-load-cases@0.1.0`'s own
  resolved `total_moving_mass` output (it accepts several input mass
  routes and re-exposes one canonical value) is genuinely link-compatible
  with this module's own `total_moving_mass` input, since both reuse the
  identical `motion.axis.total_moving_mass` parameter ID. This is the
  _only_ compatible pair found across the full sweep. It does not weaken
  ADR-0011's own "reproduce, don't import" policy (no calculation code is
  shared) and nothing wires it today (no workflow role exists to confirm
  it through) — recorded accurately in `manifest.ts`'s own header comment
  and the "Self-contained, not linked" section above, rather than left as
  a disproven blanket claim.
- **Catalog adapter**: not applicable — ADR-0011 "Output scope" explicitly
  excludes motor catalog/part matching from this phase; this module takes
  no candidate motor's own rated/peak torque as an input to match against.
- **Module conformance**: `package-validation`, `import-boundary`, and
  `execution`/`determinism` (via `runModuleConformance`) all already pass
  (Stage 3); `source-immutability` stayed `skipped` until Stage 6 pinned it
  (below). 63 tests total in this directory as of Stage 5 (57 from Stages
  3-4 plus 6 new in `cross-module-links.test.ts`), all passing.

## Stage 6 (release, done 2026-08-13)

`index.ts` (renamed from `package.ts`) assembles the same manifest, ports,
compute, UI, report, and validation record into a single `ModulePackage`
and seals it, so `npm run registry:generate` now discovers it: the module
is registered as `ball-screw-motor-sizing@0.1.0` in
`lib/modules/registry.generated.ts` — the first module in the Motor Sizing
Tool family (ADR-0011). `package.test.ts` pins the source-immutability
hash (`npm run module:source-hash -- ball-screw-motor-sizing 0.1.0` →
`18c8f078d2b91c8a`) and asserts `import-boundary` and
`source-immutability` both pass as real checks, not skipped — the same
rigor every other released module in this codebase uses. Sealed package
content hash: `1246d12939032577`. `validation.ts`'s `reviewer`/`reviewDate`
were already finalized at Stage 4 ("Solo validation — drive-train@0.1.0
independent-benchmark substitute", `2026-08-12`) — no new evidence was
needed at Stage 6. `validation/ball-screw-motor-sizing/0.1.0.md` and its
three `validation/source-index.md` rows were written the same day Stage 4
closed, not deferred to Stage 6 the way `support-bearing@0.1.0`'s and
`drive-train@0.1.0`'s own records had to be. 64 tests total (63 from
Stages 3-5 plus one new "passes overall conformance" assertion), all
passing. Full validation record:
`validation/ball-screw-motor-sizing/0.1.0.md`.

## Not in scope for `0.1.0`

- Screw mechanical-strength checks (buckling, critical speed, life,
  static safety factor) — `ball-screw@0.1.0`'s own separate,
  already-released responsibility.
- Motor catalog matching or part selection (ADR-0011 "Output scope") — no
  candidate motor's own rated/peak torque is an input; `required_motor_
rated_torque`/`required_motor_peak_torque`/`required_power` are
  reported required-spec values, not pass/fail checks.
- A servo-motor holding-torque formula for a stationary vertical/inclined
  dwell — the dwell phase contributes `0` torque to the RMS/momentary
  aggregates, matching Omron's own treatment of a stationary phase; no
  source read in Stage 1 gives a holding-torque formula (the same
  "reported catalog value, no formula" scope `drive-train@0.1.0` already
  uses for holding-brake torque).
