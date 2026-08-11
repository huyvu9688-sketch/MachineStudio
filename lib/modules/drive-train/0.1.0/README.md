# Drive Train 0.1.0 — Draft Package (Stages 3-5 done)

`math.ts` is a pure SI-number kernel for the seventh production engineering
module (Unit 4.7), covering the `0.1.0` proposed scope from
`context/modules/drive-train/stage-1-spec.md`: total reflected system
inertia and inertia ratio, motor-shaft operating speed, acceleration/
deceleration torque, maximum momentary torque, effective (RMS) torque, and
regenerative energy released.

- `resolveTotalSystemInertia` / `resolveInertiaRatio` — `J_total = J_M +
J_L`, `R_J = J_L / J_M` (Omron's own sample calculation).
- `resolveOperatingSpeed` — `n = (v/lead)*2*pi*gearRatio`, the identical
  shape `coupling 0.1.0`'s own kernel already uses for its own
  driving-shaft speed, mirrored rather than imported.
- `resolveAccelerationTorque` — `T_A = J_total*alpha`, using the
  larger-magnitude of `motion.profile.peak_acceleration`/`peak_deceleration`
  as a single conservative figure (proved, not just asserted, to bound the
  true worst-case single-phase torque — see the function's own doc
  comment).
- `resolveGearboxDeratedLoadTorque` — `T_L = screw.drive_torque / eta_g`,
  this module's own derating on top of `ball-screw 0.1.0`'s own released
  `screw.drive_torque`, which applies no gearbox-efficiency loss itself (a
  real gap found while wiring this kernel, not a `ball-screw` defect — see
  `context/modules/drive-train/stage-1-spec.md` "A Real Gap Found in an
  Already-Released Kernel").
- `resolveMomentaryTorque` — `T1 = T_A + T_L` (Omron's own formula).
- `resolveEffectiveTorque` — the closed-form `Trms^2 = (J_total*2*pi*
gearRatio/lead)^2*a_rms^2 + T_L^2`
  `context/modules/drive-train/stage-2-contract.md` "Decisions" item 4
  derives from Omron's/HMK's/Voss's own three-source-agreed RMS-torque
  shape — this project's own derivation, now numerically confirmed against
  Omron's own worked example (see "Stage 4" below).
- `resolveRegenEnergy` — `E = J_total*omega^2/2`, ordinary kinetic energy,
  corroborated in shape by Celera Motion's own resistor-sizing paper.

## Stage 3 package (2026-08-10)

A full `ModulePackage` wraps the kernel:

| File                     | Role                                                                                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manifest.ts`            | Identity, validity envelope, source revisions, and ports.                                                                                                       |
| `input-schema.ts`        | Requires `gearbox_efficiency` whenever `gear_ratio != 1`.                                                                                                       |
| `compute.ts`             | Pure compute over the two supported load cases.                                                                                                                 |
| `trace.ts` / `checks.ts` | Trace steps and acceptance checks.                                                                                                                              |
| `ui.ts` / `report.ts`    | Generic UI and report schemas.                                                                                                                                  |
| `validation.ts`          | Validation record — Stage 4 evidence is complete: three reference examples plus the independent benchmark. `reviewer`/`reviewDate` stay `TODO` pending Stage 6. |
| `package.ts`             | Sealed package. Named `package.ts`, not `index.ts`, so `npm run registry:generate` cannot discover it.                                                          |

No registry version is released by this package — `drive.*` was already
released at Stage 2 (`context/modules/drive-train/stage-2-contract.md`,
registry `1.8.0`).

### Two corrections Stage 3 found in Stage 2's own contract

Wiring the actual kernel found `drive.reflected_load_inertia` could not
stay a computed output (no released parameter supplies the raw load-side
inertia to reflect) and `drive.acceleration_torque` does not actually vary
by load case in this project's data model. Both fixed directly in the
released registry — see `context/modules/drive-train/stage-2-contract.md`
"Stage 3 corrections" for the full reasoning; `1.8.0` had no external
consumer yet, so this is a correction, not a deprecation.

### Why `gearbox_efficiency` is optional at the manifest level

A direct-connected axis (`screw.gear_ratio = 1`) has no gearbox to have a
transmission-efficiency loss, so requiring the port unconditionally would
force every direct-connected run to supply a meaningless "efficiency of
nothing." Instead the manifest marks it `required: false`, and
`input-schema.ts` requires it whenever `screw.gear_ratio != 1` — the same
"generic port shape can't express this, so an author-provided schema rule
does" pattern `support-bearing 0.1.0`'s own conditional axial-load ports
already established.

### What the package deliberately leaves out

- **No drive/amplifier current or voltage compatibility check.** This
  project's unit registry has no electrical-current dimension yet —
  blocked on a generic-engine prerequisite, not a module decision
  (`stage-1-spec.md` "A Generic-Engine Gap, Not a Module Decision").
- **No standalone holding-brake torque check.** No source gives a
  catalog-comparison formula; `drive.brake_rated_torque` is reported only
  (`stage-1-spec.md` item 9).
- **No gearbox backlash/transmission-error/life formula.** Only
  qualitative catalog ranges by gearbox family exist (`stage-1-spec.md`
  item 7) — not modeled as a check.
- **No torque/speed-curve comparison.** Checks compare scalar rated/peak
  torque and rated speed, not a curve-valued capability (`stage-1-spec.md`
  "Purpose").

## Stage 2 (2026-08-10): six decisions, all sourced from Stage 1's own open questions

`context/modules/drive-train/stage-2-contract.md` resolved all six Stage 2
entry criteria and released registry `1.8.0`. The two worth restating
here:

- **The RMS-torque margin and peak-torque margin stay two separate
  required inputs**, not consolidated into one — no source ties the two
  together, and they represent genuinely different failure modes
  (continuous thermal capacity vs. instantaneous mechanical/magnetic
  capacity).
- **The closed-cycle RMS-acceleration argument is adopted as `0.1.0`'s
  working assumption**, recorded on every trace, with a Stage 4 action
  item to verify it independently of the one worked example below (a
  synthetic per-phase torque profile property test).

## Stage 1 kernel, before the package existed

`math.test.ts` (29 tests) tests every function against Omron's own printed
intermediate figures (`T_A = 0.165 N*m`, `T1 = 0.173 N*m`, `Trms = 0.0828
N*m`) plus boundary/invalid input and elementary property checks (the
effective-torque formula reducing to its pure-inertial or pure-load-torque
term at the limits, gear-ratio scaling, etc.).

## Stage 4 (2026-08-10, partial): one reference example, hand-verified twice

`omron-reference-example.ts` / `.test.ts` run Omron Corporation's own
complete worked numerical example (`Servo Motor Selection Software` sample
calculation, printed pp. 12-13 — a direct-connected ball-screw axis, motor
R88M-U20030) through `executeModule(driveTrainModule, ...)`, not just the
kernel formula level `math.test.ts` already covers. Every applicable
figure matches within a documented tolerance, and every applicable check
(load inertia, effective torque, maximum momentary torque, maximum
rotation speed) passes, matching Omron's own "Result of Examination"
table; the regenerative-energy check reports `not_applicable`, matching
Omron's own explicit "this example omits calculations for the
regenerative energy."

**A real result, not assumed going in:** `rms_acceleration` is not printed
by Omron directly. It is derived here from Omron's own printed duty-cycle
segments (`a_rms = sqrt((1.5^2*0.2 + 1.5^2*0.2)/1.6) = 0.75 m/s^2`) and fed
through `resolveEffectiveTorque`'s own closed-cycle formula — the same
formula `context/modules/drive-train/stage-2-contract.md` "Decisions" item
4 derived from first principles, not from a source. The result matches
Omron's own printed `Trms = 0.0828 N*m` within `0.0003 N*m` (~0.25%), the
residual consistent with Omron's own 3-significant-figure intermediate
rounding. This is the first real numeric confirmation that the
closed-cycle identity actually holds, not just a plausible derivation.

**Independent benchmark: met (2026-08-10).**
`closed-cycle-benchmark.ts` / `.test.ts` cross-check
`resolveEffectiveTorque`'s closed-form Trms against a structurally
different, direct per-phase computation of the same RMS-torque physics
(`Trms = sqrt(sum(T_i^2*t_i)/sum(t_i))`, the general shape every Stage 1
source gives — `stage-1-spec.md` item 3), applied straight to synthetic
multi-phase torque profiles rather than derived from aggregate
`a_rms`/`T_L` statistics. The two match to floating-point precision (an
algebraic identity, the same "proved algebraic identity" treatment
`lib/modules/support-bearing/0.1.0/nsk-fh-benchmark.ts` already gives NSK's
own `fh` method) across four repeating-cycle shapes and four
`(J_total, T_load)` magnitude pairs, and a counter-example (a non-repeating
cycle) shows the two methods diverge by a large margin once the
repeating-cycle precondition is violated — proving the precondition this
project's own derivation depends on (`stage-1-spec.md` "The
RMS-Acceleration Dependency Question") is actually load-bearing, not just
plausible.

**Two more reference examples found and closed 2026-08-10.** Voss's, HMK's,
Oriental Motor's, Kollmorgen's, and Yaskawa's own guides were all
investigated and ruled out first (none ties required torque to a real
catalog _servo_ motor — see the ruled-out account preserved below). The
source that actually closed this gap was already on file for a different
reason: `jp.thk.example_ball_screw_selection` — the same THK Ball Screw
General Catalog document `axis-load-cases 0.1.0` and `ball-screw 0.1.0`
already cite for this document's own mechanical (screw/life) sections.
Re-reading its "Studying the Driving Motor" subsection (which those two
modules' own scope never needed) found both of THK's own worked examples
explicitly name "AC servo motor" throughout and decompose required torque
into the identical two-term shape (friction/load-only torque plus a
separate inertial acceleration torque) this module's own `math.ts` kernel
already uses.

- **Horizontal example** ("High-speed Transfer Equipment," the same scenario
  `ball-screw 0.1.0`'s own `thk-benchmark.ts` already reproduces
  mechanically): a full reference example. `thk-reference-examples.ts`/
  `.test.ts` reproduce THK's own printed maximum momentary torque
  (`Tk = 4730 N*mm`) within 0.05 N*m (~0.3%) and effective (RMS) torque
  (`Trms = 1305 N*mm`) within 0.005 N*m (~0.06%) through `executeModule` —
  both residuals traced precisely to THK's own printed 3-significant-figure
  angular-acceleration rounding (1050 rad/s^2 printed vs. 1047.2 rad/s^2
  exact), not slack introduced to pass the test. THK's own "motor inertia
  > = reflected load inertia / 10" rule also reproduces exactly as a passing
  > `inertia-ratio` check.
- **Vertical example** ("Vertical Conveyance System"): a _partial_ reference
  example, reproducing THK's own maximum momentary torque
  (`Tk1 = 1100 N*mm`, the governing upward direction) and inertia-ratio rule,
  but **deliberately not** its effective (RMS) torque. This example's own
  duty cycle has asymmetric per-direction load torque (900 N*mm upward vs.
  830 N*mm downward, from gravity) and a nonzero holding torque during the
  stationary phase (658 N*mm) — both violate this module's own closed-cycle
  assumption's precondition ("total system inertia and the per-case load
  torque both stay constant across a cycle"). Feeding this module's own real
  required inputs through the actual closed-form kernel gives an effective
  torque about 21% above THK's own printed figure — a real, quantified
  deviation (recorded in `validation.ts` "deviations"), not a rounding
  residual, and the first real counter-example to the closed-cycle
  assumption this project has found. This module also cannot express THK's
  own lower, gravity-assisted downward momentary torque (`Tk2 = 630 N*mm`)
  at all, since `resolveAccelerationTorque` always adds rather than
  subtracts — a deliberate, documented conservative choice, not a defect.

Neither THK example names a specific catalog motor SKU (unlike Omron's own
`R88M-U20030`) — both fixtures supply a plausible motor with headroom above
THK's own stated minimum, disclosed as such in the fixture's own module doc
comment rather than presented as a THK-selected part. A new source revision,
`jp.thk.example_ball_screw_selection@technico-mirror-2026-08-10`
(`lib/standards/engineering-sources.ts`), records exactly what was read and
where the direct `tech.thk.com` URL (blocked, HTTP 403) was substituted for
a third-party mirror already used elsewhere in this project.

**Stage 4 is now complete**: three reference examples plus the independent
benchmark. The solo-validation reviewer-substitute policy
(`context/ai-workflow-rules.md` "Stage 4 — Validation") is now invoked —
`reviewer`/`reviewDate` stay `TODO` in `validation.ts` pending Stage 6, the
same treatment every other Milestone 4 module's own `validation.ts` gives
that pair.

<details>
<summary>Ruled-out sources (investigated 2026-08-10, before THK was found)</summary>

Voss's own partial `T_RMS = 0.164 in-lb` disk example was previously
recorded here as "the strongest remaining candidate," but reading the
book's own following pages (Section 3.4 "Motor Selection" through
3.4.2.3) directly shows it never selects or checks against a real
catalog motor — the example stops at computing required torque, and the
section that would complete it stays qualitative (torque/speed-curve
figures, no worked numbers). Voss's own holding-brake examples (3.5.2)
are stated by the book itself to be "admittedly fabricated" and
explicitly exclude motor inertia. HMK's own 23-page PDF, read in full,
has no worked numerical example at all beyond the Siemens 1FK6
torque-curve figure `stage-1-spec.md` item 8 already cites — and no
holding-brake section exists in it either, despite this document's own
prior text (now corrected) attributing one to it. Oriental Motor's own
blog post stops in the identical place Voss's does: "tentatively select
a motor" without ever naming one or stating its rotor inertia. Kollmorgen's
and Yaskawa's own guides remain blocked (HTTP 403, retried this session,
including a Wayback Machine attempt this environment cannot reach).
A sixth source, Oriental Motor's own official _Technical Reference_
(distinct from its blog post, `orientalmotor.com/products/pdfs/F_TecRef/
TecMtrSiz.pdf`), does have real catalog-tied worked examples (motor
`5RK40GN-AWMU` + gearhead `5GN9KA`, among others) — but every one sizes
an AC induction or stepper motor, not a servo: chasing `5RK40GN-AWMU`'s
own spec sheet found its starting torque (36 oz-in) is _lower_ than its
rated torque (38 oz-in), the opposite of a servo's "peak 2-6x rated"
convention this module's own `peak_torque_margin` assumes (Omron's own
example: peak 1.91 N*m vs. rated 0.637 N*m). Using it would conflate two
physically distinct torque-margin conventions across motor classes, not
just fill in missing numbers.

</details>

## Stage 5 (2026-08-10): cross-module link compatibility done; generic UI/report schema already passing

`cross-module-links.test.ts` (11 tests, the same real-evaluator pattern every
other Milestone 4 module's own file uses) confirms `ball-screw`'s per-case
`screw.drive_torque` output links to this module's own per-case drive-torque
input (the same link `coupling`'s own file already consumes), and — new for
this module — that `motion-profile`'s own `peak_acceleration`/
`peak_deceleration`/`rms_acceleration` outputs link directly to this module's
own identically-named, identically-unscoped inputs. **This is the first real
downstream consumer of any `motion.profile.*` output in the codebase**,
reversing the documented gap `ball-screw`'s own
`cross-module-links.test.ts` records (true for `ball-screw` specifically,
not for `drive-train`). Also confirms: a load-case mismatch on the
drive-torque link is refused; `ball-screw`'s `mean_rotational_speed` does not
satisfy the linear-velocity sink (different parameter identity, the same
rejection `coupling`'s own file records); `axis-load-cases` has no output
this module consumes at all; `motion.axis.case_linear_velocity` still has no
producer anywhere in the registry (the same documented gap `ball-screw`'s,
`coupling`'s, and `support-bearing`'s own files already record); and no
`drive.*` catalog input accepts an upstream output. Generic UI/report schema
conformance was already passing (`package.test.ts`'s `package-validation`
check, unchanged by this work). Workflow role integration stays not
applicable pending Unit 4.8.

This module's own Stage 4 gate is now clear (see "Stage 4" above). What
remains: workflow role integration (not applicable until Unit 4.8 exists,
the same treatment every other Milestone 4 module gets) and Stage 6
(release) itself — no longer gated behind Unit 4.1's Definition of Done,
which released 2026-08-11 (`validation/axis-load-cases/0.1.0.md`), but not
yet started for this module.
