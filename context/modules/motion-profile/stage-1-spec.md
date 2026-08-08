# Motion Profile Module — Stage 1 Engineering Specification

## Status

- Work unit: Unit 4.2, Stage 1 — engineering specification and source intake
- Proposed module ID: `motion-profile`
- Proposed first released version: `0.1.0`
- Status: **Stage 1 draft.** Written in parallel with `axis-load-cases`'
  evidence wait, per `context/ai-workflow-rules.md` ("Specification and
  source research may occur in parallel, but production release remains
  sequentially validation-gated") and `context/implementation-map.md`
  Milestone 4 header. Production release for Unit 4.2 remains
  sequentially gated behind Unit 4.1's Definition of Done regardless of how
  far this document gets.
- Date: 2026-08-07
- **Update (2026-08-07):** the single-move trapezoidal/triangular kernel is
  now built and tested, ahead of the RMS/multi-segment/S-curve Stage 2
  questions below — see `lib/modules/motion-profile/0.1.0/math.ts` and its
  README, and "Stage 2 Entry Criteria" at the end of this document.
- **Update (2026-08-07, cont'd):** the ABB and Oriental Motor candidate
  sources below are now page-verified (full text read via a PDF-capable
  tool; the prior session's extraction failure was a tooling limitation,
  not a dead source). Oriental Motor's general asymmetric/non-zero-
  starting-speed method (p. H-23) is now reproduced as a genuine
  independent benchmark of `resolveTrapezoidalMove` — see
  `lib/modules/motion-profile/0.1.0/oriental-motor-benchmark.ts` and its
  test. Stage 2 Entry Criteria item 4 is satisfied. The Oriental Motor RMS
  torque blog post remains unverified: its formula is embedded as an image
  in the source and still did not extract as text on retry.
- **Update (2026-08-07, cont'd):** Stage 2 Entry Criteria items 1-2 (RMS
  ownership, multi-segment port shape) are now resolved — see
  `context/modules/motion-profile/stage-2-contract.md`. Registry `1.2.0`
  adds `motion.profile.rms_acceleration`; `lib/modules/motion-profile/0.1.0/
  cycle.ts` (`resolveMotionCycle`) extends the kernel with multi-segment
  sequencing and cycle-level RMS aggregation. Item 3 (jerk/S-curve scope)
  needed no new decision — the roadmap's existing "where source method is
  validated" language already answers it. No `ModulePackage` exists yet;
  Stage 3 (assembling manifest/compute/trace/checks) is separate future
  work.

No released parameter, module version, calculation run, or validation record
is changed by this document.

## Purpose

Resolve the move timing and kinematic profile of a single linear-axis
positioning move — move time, peak velocity, peak acceleration/deceleration —
and the duty-cycle aggregation values downstream modules need, from a
declared move distance and velocity/acceleration limits. Later modules (ball
screw, guide, coupling, support bearing, servo drive train) consume this
timing and dynamics evidence instead of re-deriving it.

It will not size any component, select a servo/drive, decide machine-level
cycle time, or resolve interlocks between mechanisms. Those remain Unit
4.3-4.7 and Phase 3 ("Multi-mechanism timing chart") responsibilities.

## Supported MVP Profiles

Per `context/implementation-map.md` Unit 4.2:

- **Trapezoidal** — constant acceleration, constant velocity, constant
  deceleration. In scope for `0.1.0`.
- **Symmetric S-curve** (jerk-limited) — "where source method is validated"
  per `context/roadmap.md` Phase 1A. **Deferred**: no source method is
  verified yet (see "Evidence Gaps" below). Not in `0.1.0` scope.
- **Multi-segment move/dwell sequence** — a chain of independently-resolved
  trapezoidal moves and dwells sharing one duty cycle. In scope for `0.1.0`
  as a repeated application of the single-move method below; the multi-move
  sequencing/linking contract itself is a Stage 2 decision, not resolved
  here.

## Direction Already Fixed by the Released Registry

`motion.profile.max_velocity` and `motion.profile.max_acceleration` are
already released (registry `1.0`/`1.1`) with `qualifiers: { bound:
"allowable" }`; `motion.profile.peak_velocity`, `peak_acceleration`, and
`peak_deceleration` are released with `qualifiers: { bound: "required",
aggregation: "peak" }`. That qualifier split already fixes the module's
input/output direction: `max_velocity`/`max_acceleration` (ceilings) are
**inputs**, `move_time`/`peak_velocity`/`peak_acceleration`/
`peak_deceleration` (the move's actual achieved kinematics) are **outputs**.
`0.1.0` does not take a target move time and solve backward for required
acceleration — that would be a different port direction requiring its own
Stage 2 decision, deferred rather than invented here.

## Candidate Method — Single Trapezoidal Move

Elementary constant-acceleration kinematics. This is standard mechanics
(`v = a*t`, `x = v0*t + 1/2*a*t^2`), not a manufacturer-specific engineering
convention the way `axis-load-cases`' Coulomb-friction-plus-guide-resistance
treatment needed THK's specific method — no manufacturer page/clause citation
is meaningful for the base equations themselves. `v0.1.0` assumes symmetric
acceleration and deceleration magnitude (`a_lim` used for both); asymmetric
accel/decel is a later-version scope decision, not assumed here.

[ABB, *Application Note AN00115 — Trapezoidal Move Calculations*, Rev. C
(EN)](https://library.e.abb.com/public/502bd29feb0349cfaa9558537a9d62fd/AN00115-Trapezoidal_Move_Calculations_Rev_C_EN.pdf),
pp. 1-5, is now page-verified (2026-08-07) and derives the same symmetric
trapezoidal/triangular result via the area-under-the-velocity-time-graph
method (`Accel = Sp / Ta`, `Distance = Sp * (Ta + Ts)`, worked exercise on
p. 6-7). It is cited here as a confirmatory manufacturer treatment of public-
domain mechanics, not as the source of an otherwise-unverifiable formula —
consistent with the "no manufacturer page/clause citation is meaningful"
statement above.

Given move distance `d`, velocity limit `v_lim`, and acceleration limit
`a_lim` (both `> 0`):

1. Candidate peak velocity if the move reaches `v_lim` (trapezoidal case):
   accelerate for `t1 = v_lim / a_lim`, covering `d1 = v_lim^2 / (2*a_lim)`;
   decelerate symmetrically over the same time/distance. If `2*d1 <= d`, the
   move is trapezoidal: `v_peak = v_lim`, constant-speed distance
   `d2 = d - 2*d1`, constant-speed time `t2 = d2 / v_lim`,
   `move_time = 2*t1 + t2`.
2. Otherwise the move never reaches `v_lim` (**triangular case**): solve
   `v_peak = sqrt(a_lim * d)` (from `d = v_peak^2 / a_lim`, the sum of the
   accel and decel distances at that reduced peak), `t1 = v_peak / a_lim`,
   `move_time = 2*t1`. `peak_velocity` in this case is a resolved output
   strictly less than `max_velocity`, not a validity failure — it must be
   distinguished from "exceeds the limit," which is the actual failure case.
3. `peak_acceleration = peak_deceleration = a_lim` in both cases (symmetric,
   `0.1.0` scope); a future asymmetric-profile version would resolve these
   independently.

## Candidate Method — Multi-Segment Move/Dwell Sequence

A cycle is a chain of segments, each either a resolved move (method above) or
an explicit `motion.profile.dwell_time`. `cycle_time` sums every segment's
duration. `peak_velocity`/`peak_acceleration`/`peak_deceleration` for the
cycle are the maxima across its move segments — this needs its own port/trace
design (per-segment values vs. cycle-level aggregates) that Stage 2 must
define explicitly, not infer from the single-move case.

## Candidate Method — RMS/Duty Aggregation ("Peak and RMS demand values")

`context/implementation-map.md` Unit 4.2 lists "Peak and RMS demand values
used downstream" as an output. The general shape (time-weighted RMS over a
duty cycle's phases,
`X_rms = sqrt(sum(X_i^2 * t_i) / sum(t_i))`) is a standard motor/duty-cycle
sizing approach used broadly across the servo/motor industry — Oriental
Motor's own "Motor Sizing Basics" guidance on RMS torque uses this same
time-weighted-RMS shape (see "Evidence Gaps"; exact page text not yet
independently verified in this session). Whether this module resolves an RMS
*velocity/acceleration* aggregate itself, or only supplies the per-segment
peak values a later module (e.g. the servo drive-train module, which needs
RMS **torque**, not RMS velocity) aggregates into its own RMS, is an
unresolved Stage 2 scope question — not decided here.

## Independent Benchmark — Oriental Motor General Method

[Oriental Motor, *Linear & Rotary Actuators Selection Calculations*, General
Catalog 2015/2016,
H-23](https://www.orientalmotor.com/products/pdfs/2015-2016/H/Linear_&_Rotary_Actuators_Selection_Calculations.pdf)
("Selecting Electric Linear Slides and Cylinders (Using formula
calculations)", "Calculate the Positioning Time") is page-verified
(2026-08-07) and gives a general trapezoidal/triangular positioning-time
method: independent acceleration/deceleration rates `a1`/`a2`, and a
non-zero starting/ending speed `Vs` (the low speed a stepper/servo indexer
ramps from and back down to — a different assumption than
`resolveTrapezoidalMove`'s implicit start/end at rest). In SI units
throughout (the catalog's own mm/ms unit-conversion factors are specific to
its mixed-unit convention, not the physics):

```text
VRmax = sqrt( 2*a1*a2*L / (a1+a2) + Vs^2 )
VRmax <= VR -> triangular drive; VRmax > VR -> trapezoidal drive
Triangular:  T = (VRmax-Vs)/a1 + (VRmax-Vs)/a2
Trapezoidal: T = (VR-Vs)/a1 + (VR-Vs)/a2
             + [ L/VR - (a1+a2)*(VR^2-Vs^2) / (2*a1*a2*VR) ]
```

Reduced to `a1 = a2 = a_lim` and `Vs = 0` — the only case `v0.1.0`'s
narrower scope can express — this method is algebraically identical to
"Candidate Method — Single Trapezoidal Move" above (`VRmax` reduces to
`sqrt(a_lim * L)`, `T` reduces to `2*t1 + t2`). It is reproduced as a
distinct implementation in
`lib/modules/motion-profile/0.1.0/oriental-motor-benchmark.ts` and cross-
checked against `resolveTrapezoidalMove` in the sibling test file — this is
the "independent benchmark comparison" `context/code-standards.md` "Module
Testing" requires, satisfied ahead of a registered package the same way the
kernel itself was. A future asymmetric/non-zero-start-speed version of this
module would use the general form directly rather than re-deriving it.

## Validity Envelope (Proposed)

- One single-axis positioning move, or a multi-segment move/dwell sequence
  on one axis.
- Symmetric trapezoidal acceleration/deceleration only; asymmetric and
  jerk-limited (S-curve) profiles are out of scope for `0.1.0`.
- `move_distance > 0`, `max_velocity > 0`, `max_acceleration > 0`.
- No structural compliance, resonance/bandwidth limiting, or encoder/servo
  loop dynamics — this module resolves commanded kinematics, not achieved
  closed-loop response.

## Inputs, Outputs, and Registry Gaps

Already released (registry `1.1.0`), reusable without change:

| Purpose | Parameter |
| --- | --- |
| Move distance (input) | `motion.profile.move_distance` |
| Velocity ceiling (input) | `motion.profile.max_velocity` |
| Acceleration ceiling (input) | `motion.profile.max_acceleration` |
| Dwell duration (input, multi-segment) | `motion.profile.dwell_time` |
| Move time (output) | `motion.profile.move_time` |
| Cycle time (output, multi-segment) | `motion.profile.cycle_time` |
| Peak velocity (output) | `motion.profile.peak_velocity` |
| Peak acceleration (output) | `motion.profile.peak_acceleration` |
| Peak deceleration (output) | `motion.profile.peak_deceleration` |

Gaps a Stage 2 registry proposal must resolve — **not** invented here:

1. **Jerk.** No `motion.profile.*` parameter exists. Only relevant once
   S-curve is in scope; deferred alongside S-curve itself.
2. **Sampled position/velocity/acceleration curves.** The engine's generic
   `curve` value family exists (`lib/engine/values`), but no
   `motion.profile.*` parameter of `valueType: "curve"` is registered. Needed
   only if the module emits a plottable profile for the UI/report, not for
   the numeric outputs above.
3. **RMS velocity/acceleration aggregate.** No `motion.profile.*_rms`
   parameter exists yet, though the `aggregation: "rms"` qualifier value
   already exists in the registry's `ParameterQualifiers` type. Whether this
   module or a downstream module owns this output is the open scope question
   above.
4. **Multi-segment port shape.** Per-segment output ports (repeated per move
   in a sequence) vs. a single cycle-level aggregate is undecided.

## Checks (Proposed)

- Invalid input: `move_distance <= 0`, `max_velocity <= 0`, or
  `max_acceleration <= 0`.
- Triangular-profile note (not a failure): resolved `peak_velocity <
  max_velocity` because the distance is too short to reach the velocity
  ceiling under the given acceleration ceiling — must be traced and
  distinguished from an error.
- Multi-segment: non-negative `dwell_time`; at least one segment.

## Trace Contract (Proposed)

Mirroring the `axis-load-cases` trace pattern
(`context/modules/axis-load-cases/stage-1-spec.md` "Trace and Report
Contract"): a `profile-classification` section recording trapezoidal vs.
triangular and why; a `kinematics` section with the resolved `t1`/`t2`/
`v_peak`/`a_lim` steps; a `cycle` section for multi-segment sums when
applicable. Each formula step cites its basis; the elementary-kinematics
steps note they are standard mechanics rather than citing an unverified
manufacturer page (see below).

## Evidence Gaps

Candidate sources located this session:

- [ABB, *Application Note AN00115 — Trapezoidal Move Calculations*, Rev.
  C](https://library.e.abb.com/public/502bd29feb0349cfaa9558537a9d62fd/AN00115-Trapezoidal_Move_Calculations_Rev_C_EN.pdf) —
  **page-verified 2026-08-07** (full 7-page text read via a PDF-capable
  tool; the original extraction failure was a tooling limitation in that
  session, not a dead or unreadable source). See "Candidate Method — Single
  Trapezoidal Move" above for its citation.
- [Oriental Motor, *Linear & Rotary Actuators Selection Calculations*,
  General Catalog 2015/2016, H-18 through
  H-28](https://www.orientalmotor.com/products/pdfs/2015-2016/H/Linear_&_Rotary_Actuators_Selection_Calculations.pdf) —
  **page-verified 2026-08-07** (full text read the same way). p. H-23's
  general trapezoidal/triangular method is cited in "Independent Benchmark —
  Oriental Motor General Method" above. The rest of this document (load
  moment on pp. H-20-22 and H-25, DG-series inertia/torque sizing on
  pp. H-26-28) is out of scope for this module and not cited here.
- [Oriental Motor, "Motor Sizing Basics Part 3: How to Calculate Speed,
  Acceleration Torque, and RMS
  Torque"](https://blog.orientalmotor.com/motor-sizing-basics-part-3-acceleration-torque-and-rms-torque) —
  **still not page-verified.** Retried 2026-08-07: the surrounding text is
  readable (confirms the time-weighted-RMS concept and the `t1`/`t2`/`t3`
  phase-time terminology used above), but "Effective Load (RMS) Torque
  Formula" is embedded as an image in the source and still does not extract
  as text. The RMS aggregate's exact formula remains unverified from any
  source; do not assume the generic time-weighted-RMS shape stated in
  "Candidate Method — RMS/Duty Aggregation" above is this specific source's
  formula until it is actually read (e.g. a legible screenshot of the
  formula image, or an alternative source).

The elementary trapezoidal-kinematics steps do not depend on any of these
sources (public-domain mechanics) but may now cite ABB AN00115 as a
confirmatory manufacturer treatment. The Oriental Motor H-23 general method
may be cited as the independent-benchmark source. No formula step may cite
the RMS blog post until its formula is actually read.

## Stage 2 Entry Criteria

Stage 2 must resolve, with real sources where a manufacturer-specific
convention is involved (the RMS aggregate shape, the multi-segment port
design) rather than the base kinematics (public domain mechanics):

1. Whether this module or a downstream module owns the RMS aggregate output.
   **Resolved (2026-08-07):** `motion-profile` owns a cycle-level RMS
   *acceleration* output; RMS *torque* stays a Unit 4.7 output. See
   `context/modules/motion-profile/stage-2-contract.md` "Decisions" item 1.
2. The multi-segment port/output shape (per-segment vs. cycle-level).
   **Resolved (2026-08-07):** cycle-level aggregates only for `0.1.0` — see
   `stage-2-contract.md` "Decisions" item 2 (the registry has no `table`-typed
   parameter support yet, and adding that is a separate generic-platform
   capability the Split Rules keep out of this module unit).
3. Whether jerk/S-curve support is deferred to a later version (the working
   assumption above) or explicitly out of MVP scope entirely — a roadmap-level
   call, not a Stage 2 one. **Not actually open** — the roadmap's own
   "where source method is validated" language already answers this; see
   `stage-2-contract.md` "Decisions" item 3.
4. A verified reading of at least one of the candidate sources above, or an
   alternative verified source, before any trace step cites a specific page.
   **Done (2026-08-07)** — both ABB AN00115 and Oriental Motor H-18/H-23 are
   page-verified; see "Evidence Gaps".

It may build and test a pure, unregistered kernel against the elementary
trapezoidal-kinematics method (uncontroversial, non-source-dependent) without
waiting on the RMS/multi-segment/S-curve resolutions, the same way
`axis-load-cases`' Stage 2 built and tested a draft kernel before its
load-case contract was fully resolved.

**Done (2026-08-07):** `lib/modules/motion-profile/0.1.0/math.ts`
(`resolveTrapezoidalMove`) and its test suite. Tested against internal
consistency (distance conservation, phase symmetry, the trapezoidal/
triangular boundary, monotonicity, boundary/invalid input) rather than an
external published example, since items 1-2 were (and remain) open.

**Done (2026-08-07, cont'd):** item 4 above. Also added
`lib/modules/motion-profile/0.1.0/oriental-motor-benchmark.ts`, an
independent reproduction of Oriental Motor's general trapezoidal method,
cross-checked against `resolveTrapezoidalMove` in its sibling test file —
satisfying the "independent benchmark comparison" module-testing
requirement ahead of a registered package.

**Done (2026-08-07, cont'd again):** items 1-3 are resolved — see
`context/modules/motion-profile/stage-2-contract.md`. `motion-profile` owns a
cycle-level RMS acceleration output (registry `1.2.0`,
`motion.profile.rms_acceleration`); the multi-segment port shape is
cycle-level aggregates only for `0.1.0`; jerk/S-curve scope needed no new
decision. `lib/modules/motion-profile/0.1.0/cycle.ts` (`resolveMotionCycle`)
extends the kernel with multi-segment sequencing and the RMS aggregation.

**Done (2026-08-07, cont'd once more):** a Stage 3 draft `ModulePackage`
exists, scoped to the single-move kernel only — see
`lib/modules/motion-profile/0.1.0/README.md` "Stage 3 package" and
`stage-2-contract.md` "Stage 3 update". `cycle.ts`'s multi-segment kernel
remains unwrapped: the package's port cardinality for a variable-length
move/dwell sequence is a separate, still-open design question, not invented
here. No module is registered (`package.ts`, not `index.ts`); production
release stays gated behind Unit 4.1 regardless
(`context/implementation-map.md` Milestone 4 header).
