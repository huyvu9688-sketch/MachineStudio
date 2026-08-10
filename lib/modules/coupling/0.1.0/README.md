# Coupling 0.1.0 — Draft Package (Stages 3-5)

`math.ts` is a pure SI-number kernel for the fifth production engineering
module (Unit 4.5), covering the `0.1.0` proposed scope from
`context/modules/coupling/stage-1-spec.md`: one coupling connecting a ball
screw's own drive shaft to its upstream driving shaft, torque capacity under
steady and shock load, speed limit, misalignment, and bore compatibility.

- `resolveRequiredTorqueFromPower` — `T = P / omega`, elementary physics
  (both KTR's and R+W's own `9550 * P[kW] / n[1/min]` formulas evaluated in
  SI). **Not called by this module's own compute path** — see its own doc
  comment. Kept as a source-faithful reference, tested against both KTR's
  and R+W's own worked examples in `math.test.ts`.
- `resolveScaledRequiredTorque` / `resolveTorqueSafetyFactor` — the required-
  torque-times-service-factor capacity check both sources agree on the shape
  of (`T_KN >= T_required * S`), collapsed to one consolidated
  `coupling.service_factor` rather than either source's own disagreeing
  multi-factor tables.
- `resolveOperatingSpeed` — the driving-shaft rotational speed, derived
  locally from `motion.axis.case_linear_velocity`, `screw.lead`, and
  `screw.gear_ratio` rather than a released `screw.*` speed port (see
  "Stage 2" below).
- `resolveSpeedSafetyFactor` — `coupling.allowable_speed / operating speed`.
  Requires a strictly positive operating speed; a true zero-speed case
  throws rather than reporting an infinite safety factor (the same "throw
  rather than report infinity" treatment `linear-guide`'s own zero-
  equivalent-load case receives).

## Stage 3 package (2026-08-09)

A full `ModulePackage` wraps the kernel:

| File                     | Role                                                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manifest.ts`            | Identity, validity envelope, source revisions, and ports.                                                                                            |
| `input-schema.ts`        | Rejects a bore range whose minimum exceeds its maximum (either side).                                                                                |
| `compute.ts`             | Pure compute over the two supported load cases.                                                                                                      |
| `trace.ts` / `checks.ts` | Trace steps and acceptance checks.                                                                                                                   |
| `ui.ts` / `report.ts`    | Generic UI and report schemas.                                                                                                                       |
| `validation.ts`          | Draft validation record — Stage 4 evidence (reference examples, independent benchmark) is complete; reviewer/reviewDate stay `TODO` pending Stage 6. |
| `package.ts`             | Sealed package. Named `package.ts`, not `index.ts`, so `npm run registry:generate` cannot discover it.                                               |

No registry version is released by this package — `coupling.*` and the new
`N*m/rad` unit were already released at Stage 2
(`context/modules/coupling/stage-2-contract.md`, registry `1.6.0`).

### Why this module's own compute path does not call `resolveRequiredTorqueFromPower`

Stage 2 resolved this deliberately
(`context/modules/coupling/stage-2-contract.md` "Decisions" item 2): the
module consumes `screw.drive_torque` (already resolved by `ball-screw`, per
case) directly, rather than re-deriving torque from a motor's power and
speed the way KTR's and R+W's own worked examples do. The formula still
matters — it is what both sources' own worked numbers verify — so it stays
in `math.ts` as a tested, source-faithful function, the same "kept as a
reference, not the intended entry point" treatment `linear-guide`'s own
four installation-specific functions receive alongside
`resolveBlockLoadsFromResultant`.

### The `normal`/`peak` case mapping is a documented adaptation, not a clean match

`axis-load-cases`' own `peak` case means a peak _operating_ condition (e.g.
a machining force spike), not the motor electrical starting-torque
transient KTR's and R+W's own `T_S`/`T_AS` mean by that term. `0.1.0` reuses
`screw.drive_torque[peak]` for the shock-torque check anyway, because no
better upstream signal for a start-up transient exists in this project yet
— recorded as a real, sourced adaptation
(`context/modules/coupling/stage-2-contract.md` "Decisions" item 4), not
silently treated as equivalent.

### The shock-torque check adopts KTR's form, not R+W's

KTR's own form sums a peak and rated torque before scaling
(`T_Kmax >= (T_N + T_S) * S_Z * S_t * S_R`); R+W's own safety-coupling-
specific form instead scales a single maximum system torque by a
disengagement multiplier (`T_AR >= K * T_max`). `0.1.0` reuses the same
required-torque-times-service-factor shape as its own steady check for both
cases — not a literal implementation of either source's own shock-check
formula, but closer to KTR's general-coupling framing than to R+W's
safety-coupling-specific one (`stage-2-contract.md` "Decisions" item 3).

### What the package deliberately leaves out

- **No torsional-resonance or periodic-vibration check.** R+W's own
  `f_e = 1/(2*pi) * sqrt(C_T * (J_Masch+J_Mot)/(J_Masch*J_Mot))` formula is
  sourced (`context/modules/coupling/stage-1-spec.md` item 3) but not
  implemented — this project has no released motor-rotor or reflected-load
  inertia parameter yet (Unit 4.7 territory).
  `coupling.torsional_stiffness`/`coupling.moment_of_inertia` are reported
  catalog values only.
- **No per-check-specific correction factors.** `coupling.service_factor` is
  one consolidated required input applied identically to both the normal
  and peak cases, not KTR's/R+W's own separate operating/temperature/
  starting/direction factors (`stage-2-contract.md` "Decisions" item 5).
- **No fit-tolerance (h6/h7-class) verification.** Bore compatibility is a
  simple range check (`driving_bore_min <= driving_shaft_diameter <=
driving_bore_max`, and the driven-side equivalent).

## Stage 2 (2026-08-09): the rotational-speed decision

`context/modules/coupling/stage-2-contract.md` resolved all six Stage 2
entry criteria and released registry `1.6.0`. The one worth restating here:
this module derives its own per-case rotational speed
(`resolveOperatingSpeed`) from `motion.axis.case_linear_velocity`,
`screw.lead`, and `screw.gear_ratio` — the exact same physics
`ball-screw`'s own kernel already trusts internally
(`resolveRotationalSpeed`, `n = v / lead`) — rather than consuming
`screw.mean_rotational_speed` (a duty-cycle _mean_, not the peak/nameplate
speed KTR's and R+W's own formulas expect) or asking `ball-screw` to expose
a new per-case speed port it does not currently need for itself.

## Stage 4 (validation), both evidence items now met (2026-08-09 through 2026-08-10)

`./rw-reference-examples.ts` / `.test.ts` reproduce both of R+W's own
"Sizing and Selection" worked examples through this module's own compute
path — the gap `validation.ts`'s own earlier header note and
`context/progress-tracker.md` both flagged. R+W's own printed `T_AN` is fed
in as the already-resolved `screw.drive_torque` this module's `compute()`
actually consumes, R+W's own printed combined correction factor as
`coupling.service_factor`, and R+W's own selected coupling's catalog rated
torque (`ST2/10` = 6030 Nm, `ST4/10` = 16,000 Nm) as `coupling.rated_torque`
— run through `executeModule(couplingModule, ...)`, the real sealed-package
boundary, not just the kernel functions `math.test.ts` already covered. Both
selections are confirmed to clear their own printed requirement through the
real compute path.

KTR's own worked example stays a kernel-level-only reference (`math.test.ts`)
— KTR's own text gives no specific selected-coupling rated torque to run
through `executeModule` the way R+W's two examples do.

**The independent-benchmark item is now met (2026-08-10).**
`./ktr-din740-benchmark.ts` / `.test.ts` reproduce a second, distinct KTR
document — "Coupling Selection According to DIN 740 Part II", found via
WebSearch while looking for a published shock-torque worked example (neither
KTR's other document's own example nor either of R+W's own two examples
exercises the shock-torque check with real numbers). This document gives a
genuinely different, more detailed shock-torque derivation than the one
`context/modules/coupling/stage-1-spec.md` item 2 recorded from KTR's other
document — `T_Kmax >= T_S*S_Z*S_t + T_N*S_t`, with `T_S = T_AS*M_A*S_A`
itself weighted by a mass-distribution coefficient `M_A = J_L/(J_A+J_L)`, and
no `S_R` term at all — a real disagreement between two KTR documents,
recorded rather than resolved. Its own worked example (a 160 kW/1485 rpm
motor driving a screw compressor through a ROTEX Size 90 coupling) is
reproduced end to end, and `compareModuleShockCheckToKtrDin740` quantifies
how this module's own simplified shock check relates to it: algebraically
identical when `coupling.service_factor` is the fully composed
`M_A*S_A*S_Z*S_t`; understating KTR's own requirement by ~1.2% when
`serviceFactor` is the catalog shock factor `S_A` alone; overstating it by
~43% (a false fail on a coupling KTR's own method accepts) when `S_A*S_Z*S_t`
is used without `M_A`. See `validation.ts`'s own `independentBenchmark` field
and `validation/coupling/0.1.0.md` for the full record.

**Still open:** reviewer/reviewDate — a Stage 6 (release) field, not a Stage
4 completeness gate (see `validation/coupling/0.1.0.md` "Reviewer" for the
now-available solo-validation independent-benchmark substitute). See
`validation.ts` for the full record.

## Stage 5 (2026-08-10): cross-module link compatibility

`./cross-module-links.test.ts` (6 tests) confirms, against the real engine
link-compatibility evaluator and each module's real `manifest.ts` ports —
not hand-typed parameter-id strings — that `ball-screw`'s per-case
`screw.drive_torque` output links to coupling's own per-case drive-torque
input, the only upstream link coupling has today. It also confirms three
things the graph must keep refusing: a load-case mismatch on that link;
`ball-screw`'s `mean_rotational_speed` output feeding the linear-velocity
sink (Stage 2 explicitly rejected that duty-cycle mean as coupling's speed
source — see "Stage 2" below); and any `coupling.*` catalog input accepting
an output from either `ball-screw` or `axis-load-cases` (none exists to
accept). `motion.axis.case_linear_velocity` — the port coupling actually
derives speed from — still has no producing module anywhere in the
registry; this is the same documented gap `ball-screw`'s own
`cross-module-links.test.ts` already records against its own consuming
port, confirmed here rather than assumed.

Generic UI and report schema (`ui.ts`/`report.ts`, drafted at Stage 3) were
already passing conformance validation through `package.test.ts`'s
`runModuleConformance` `package-validation` check — nothing new was needed
there. Workflow role integration stays not applicable: no
`linear-axis@1` workflow vocabulary exists yet (`manifest.ts`'s
`workflowRoles` stays empty pending Unit 4.8), the same treatment
`ball-screw` and `linear-guide` already get.

What remains for this module is Stage 6 (release), sequentially gated
behind Unit 4.1's Definition of Done regardless.

## Stage 1 kernel, before the package existed

`math.test.ts` (22 tests) tests every function against boundary/invalid
input, elementary property checks (e.g. speed scales linearly with gear
ratio), and — unusually for this project's usual "Stage 1 kernel, Stage 4
reference examples" split — **reference-example reproduction already at
Stage 3**: both KTR's own worked example and both of R+W's own worked
examples are reproduced at the formula level
(`resolveRequiredTorqueFromPower`, `resolveScaledRequiredTorque`), since
Stage 3's own workflow step explicitly includes "Add reference... tests"
(`context/ai-workflow-rules.md`). That gap (not yet a full published worked
example run through this module's own integration path) is closed by
`./rw-reference-examples.ts` — see "Stage 4" above.

Production release stays sequentially gated behind Unit 4.1's Definition of
Done regardless (`context/implementation-map.md` Milestone 4 header). This
module's own Stage 4 is otherwise complete; only reviewer/reviewDate (Stage
6 fields) remain.
