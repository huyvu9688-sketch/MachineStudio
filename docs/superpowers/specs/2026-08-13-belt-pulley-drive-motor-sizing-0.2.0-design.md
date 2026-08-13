# Belt-Pulley Drive Motor Sizing 0.2.0 — Native Motion Profile and Duty-Cycle Torque

## Decision

Release `belt-pulley-drive-motor-sizing@0.2.0`, a new module version alongside
the existing immutable `0.1.0`. `0.2.0` replaces the single
accelerate-to-target-velocity event with a native, repeating trapezoidal
motion cycle (accelerate / run / decelerate / dwell) computed inside the
module itself — never linked in from a separate `motion-profile` module
instance — and adds a true per-phase effective (RMS) torque output. This is
the follow-on work ADR-0011 itself named but did not build: that ADR
explicitly rejected connecting motion profile to motor sizing through a
cross-module link, after finding that `drive-train@0.1.0`'s own closed-form
RMS-torque approximation (derived from a single aggregated
`motion.profile.rms_acceleration` scalar) overstates a published vertical
worked example's torque by ~21% when per-phase load torque is asymmetric.
The founder's own recorded reasoning: "the motion profile module should stay
inside each Mechanism tool, which make it more precise."

This also resolves the original request that started this design: a way to
enter travel distance instead of target velocity. A trapezoidal cycle is
defined by distance, velocity, and phase durations together, so distance-first
entry falls out of the same model rather than needing a separate mechanism.

## Context

Discovered while debugging a Run failure on a `belt-pulley-drive-motor-sizing@0.1.0`
instance (missing `incline_angle`, unrelated to this design). In the same
session: (1) `MECHANISM_LABELS` already gives motor-sizing modules friendly
picker names, but instance labels and module-instance removal are handled in
a separate design
(`docs/superpowers/specs/2026-08-13-module-instance-management-design.md`);
(2) the founder wants a travel-distance input mode, "a motion profile is good
tho." Investigating the second request surfaced ADR-0011, which had already
evaluated and rejected literal cross-module linking for a sourced, quantified
accuracy reason, and prescribed embedding motion-profile math natively inside
each mechanism module instead. This design follows that prescription for
`belt-pulley-drive-motor-sizing` specifically, confirmed as the first module
to receive it.

## Motion Profile Model

One repeating trapezoidal cycle, matching Oriental Motor's own per-phase
formula shape (`reference/source-material/Oriental_Motor Sizing Calculators.pdf`,
cited directly in ADR-0011) rather than `motion-profile@0.1.0`'s own
arbitrary-multi-move-with-dwells shape:

1. **Accelerate** (`t1`) — standstill to target velocity `V`.
2. **Run** (`t2`) — constant velocity `V`.
3. **Decelerate** (`t3`) — target velocity `V` to standstill.
4. **Dwell** (`t4`, optional, default `0 s`) — idle before the cycle repeats.

Total cycle time `tf = t1 + t2 + t3 + t4`. Load torque `TL` is assumed
constant across all four phases (orientation/mass/friction do not change
mid-cycle in this module's own force-balance model — the same constant-load
assumption `drive-train@0.1.0`'s own formula requires, but here it is
actually true for this mechanism's own physics, not an approximation across a
module boundary). This assumption is recorded on every trace, the same
"assumption, not a settled fact" treatment `drive-train@0.1.0` already uses
for its own closed-form Trms.

## Input Mode: Velocity-First vs Distance-First

A new `motion_mode` enum input (`"velocity"` | `"distance"`) selects which
two of `{target_velocity, travel_distance, constant_velocity_time,
cycle_time}` are supplied directly and which two the kernel derives —
enforced by a Zod `superRefine` rule, the same conditional-requirement
pattern `support-bearing@0.1.0`'s `bearing.location` split already
establishes (ports stay `required: false` at the manifest level; the input
schema enforces the real requirement per mode).

- **`velocity` mode** (closest to 0.1.0's own shape): engineer supplies
  `target_velocity`, `acceleration_time` (`t1`), `deceleration_time` (`t3`,
  new), and `constant_velocity_time` (`t2`, new). The kernel derives and
  reports `travel_distance` (`S = V*(t1+t3)/2 + V*t2`) and `cycle_time`.
- **`distance` mode**: engineer supplies `travel_distance`,
  `acceleration_time`, `deceleration_time`, and `cycle_time` (new — the total
  repeat period). The kernel derives `constant_velocity_time = cycle_time -
  t1 - t3 - dwell_time` and then `target_velocity = travel_distance / (t2 +
  (t1+t3)/2)`, and reports both.
- `dwell_time` (`t4`) is a new, optional input with a constant default of
  `0 s`, available in both modes.

**Feasibility check at compute time (not an acceptance check):** in
`distance` mode, if the derived `t2 < 0` — the requested cycle time is too
short for the given accel/decel times to cover the travel distance — the
kernel throws the same `BeltPulleyMotorSizingInputError` class 0.1.0 already
uses for infeasible inputs (e.g. `mechanicalEfficiency > 1`), not a pass/fail
check. `t2 = 0` is a valid boundary case (a triangular move, no constant-speed
phase) and is not an error.

Regardless of mode, the module always reports both the velocity-side and
distance-side values — an engineer working in `distance` mode still sees the
resulting `target_velocity`, and vice versa. Exact port keys for these
derived/reported values (e.g. whether a derived value is a full output port
reusing the same parameter ID as its input-mode counterpart, or a trace-only
reported value) are a Stage 2 contract decision, not fixed here.

## New Compute: Deceleration Torque and Effective (RMS) Torque

- **`deceleration_torque` (`Td`)**, new output, symmetric to the existing
  `acceleration_torque`: `alpha_decel = omega / t3`, `Td = J_total *
  alpha_decel` (magnitude), using the same `lib/engine/mechanics` functions
  0.1.0 already imports (`angularAccelerationFromSpeedRamp`,
  `accelerationTorque`).
- **`effective_torque` (`Trms`)**, new output, Oriental Motor's own per-phase
  formula, reproduced (not imported) per ADR-0011's "Reuse policy":

  ```
  Trms = sqrt( ((Ta + TL)^2 * t1 + TL^2 * t2 + (Td - TL)^2 * t3) / tf )
  ```

  where `Ta` is the existing `acceleration_torque` output, `TL` is the
  existing `load_torque` output, and `Td`/`t1`/`t2`/`t3`/`tf` are as defined
  above. Dwell time (`t4`) contributes zero torque but counts toward `tf`,
  matching how a servo's own thermal/RMS rating averages over idle time too.

This is **additive**, not a replacement: the existing `momentary_torque` /
`required_torque` calculation (peak starting torque, safety-factor checked)
stays exactly as it is in 0.1.0, unchanged in meaning. `effective_torque` is
a new, separately reported value for continuous/thermal motor rating.

## Checks

The existing `inertia-ratio` check (`checks.ts`) is unchanged. No new
pass/fail check is added for `effective_torque` in `0.2.0` — no source found
so far gives a universal continuous-torque acceptance criterion for this
mechanism family (the existing 0.1.0 precedent is to report most values, not
evaluate them, with `inertia-ratio` as the one exception). If Stage 1 research
finds a sourced criterion, add it as a real check rather than inventing one.

## Evidence Disposition

Stage 1 must confirm Oriental Motor's Sizing Calculators source
(`reference/source-material/Oriental_Motor Sizing Calculators.pdf`) states
this exact formula with the belt/pulley mechanism in view, and search for a
full worked numerical example with printed per-phase torque figures to
reproduce for Stage 4. **Per the founder's own direction, a missing worked
example does not block `0.2.0`'s release.** If no published example is
found, follow the precedent `axis-load-cases@0.1.0` already set for ID39/ID42
(`docs/superpowers/specs/2026-08-11-unit-4.1-release-design.md`): release
with the formula implemented and validated as an algebraic identity /
independent-benchmark comparison only (the same structurally-separate
reimplementation pattern `drive-train@0.1.0`'s own
`closed-cycle-benchmark.ts` already uses), record the missing published
example as a disclosed, open evidence gap in `validation/
belt-pulley-drive-motor-sizing/0.2.0.md`, and close it later against a real
project's own results — not a synthetic fixture.

## Versioning and Migration

`0.1.0` is not edited, deprecated, or hidden — it stays exactly as released
(`ai-workflow-rules.md` "Protected Files"). A `0.2.0` instance is a distinct
module the founder adds fresh via `AddModuleInstanceDialog`; there is no
in-place "upgrade this instance's version" action. An existing `0.1.0`
instance that should move to `0.2.0`'s capabilities is archived (see the
module-instance-management design) and replaced with a new `0.2.0` instance.

## Open Questions (for Stage 1/2, not resolved here)

- Exact new parameter IDs and port keys under `motor_sizing.belt_pulley.*`
  (this document fixes the physical quantities and behavior, not the final
  registry spelling).
- Whether a derived/reported value (e.g. `target_velocity` in `distance`
  mode) is modeled as a real output port reusing its input-mode counterpart's
  parameter ID, or as a trace-only reported value — needs confirmation
  against how the module SDK treats same-parameter-ID input/output pairs on
  one module, which has no exact precedent yet in this codebase.
- Registry version number (current is `1.13.0` per Unit 6.6; this needs the
  next available version once other in-flight registry work, if any, is
  accounted for at implementation time).

## Out of Scope

- The other four Motor Sizing Tool modules (ball-screw, direct-drive-conveyor,
  rack-pinion, index-table) — each gets this treatment as its own separate
  unit, if and when requested, per ADR-0011's own "Phase scope" (one module
  per mechanism, not combined).
- Motor catalog matching (unchanged from ADR-0011's own phase scope).
- Any change to `motion-profile@0.1.0`, `drive-train@0.1.0`, or any other
  released module.
