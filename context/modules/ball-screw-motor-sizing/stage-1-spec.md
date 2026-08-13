# Ball-Screw Motor Sizing Module — Stage 1 Engineering Specification

## Status

- Work unit: Milestone 6 (`context/implementation-map.md` "Units 6.2 and
  later"), the first mechanism module in the Motor Sizing Tool family
- Proposed module ID: `ball-screw-motor-sizing` (folder name matches, per
  this project's existing convention — `context/modules/ball-screw/` for
  module ID `ball-screw`, `context/modules/drive-train/` for `drive-train`,
  etc.). Distinguished from the existing, unrelated `ball-screw` module
  (screw mechanical strength — buckling, critical speed, life, static
  safety factor), which this module does not replace, edit, or depend on.
- Proposed category: `motor-sizing.ball-screw` (`context/adr/
  0011-motor-sizing-tool-architecture.md` "Module shape")
- Proposed first released version: `0.1.0`
- Status: **Stage 1 in progress.** Founder-directed follow-on to ADR-0011,
  next after Unit 6.1 (`lib/engine/mechanics`, built and released
  2026-08-12) per `context/progress-tracker.md` "Next up" — the recommended
  first mechanism module because its physics is already validated end to
  end elsewhere in this codebase (`ball-screw@0.1.0`'s own
  `resolveDriveTorque`, `drive-train@0.1.0`'s own motor-sizing math).
- Date: 2026-08-12

No released parameter, module version, calculation run, or validation
record is changed by this document.

## Purpose

Given a ball-screw-driven linear axis's own geometry, mass, friction,
orientation, and a commanded point-to-point move (with an optional return
move and dwell), compute the **required** motor specifications a servo
motor for that axis must meet: acceleration torque, maximum momentary
torque, effective (RMS) torque over one full operating cycle, required
torque with an engineer-supplied safety margin, operating speed, total
reflected system inertia, and inertia ratio. It reports required-spec
values and pass/fail checks against engineer-supplied margins — "the
engineer takes the number to the catalog" (ADR-0011 "Output scope"), the
same scope `support-bearing@0.1.0`'s and `coupling@0.1.0`'s own
required-input, no-built-in-table values already use. **No motor catalog
matching or part selection ships in `0.1.0`** — this is a deliberate
ADR-0011 scope decision, not an oversight; unlike `drive-train@0.1.0`,
this module does not take a candidate motor's own rated/peak torque as an
input to check against (see "Checks and Warnings" below for exactly what
*is* checked without one).

It will **not**:

- check the ball screw shaft's own mechanical viability (buckling,
  critical speed, nominal life, static safety factor) — that is
  `ball-screw@0.1.0`'s own, separate, already-released responsibility;
- resolve the fuller vector/moment load model `axis-load-cases@0.1.0`
  supports (external moments, guide-resistance as a term distinct from
  Coulomb friction, `holding`/`emergency_stop` cases) — this module uses a
  narrower, self-contained scalar force model matching Oriental Motor's
  own published method exactly (see "Relationship to Existing Released
  Modules" and item 2 below);
- select a gearbox, coupling, drive/amplifier, or holding brake — those
  stay `coupling@0.1.0`'s, `support-bearing@0.1.0`'s, and
  `drive-train@0.1.0`'s own separate, already-released, optional
  post-motor-sizing steps (ADR-0011 "Consequences": "`coupling@0.1.0` and
  `support-bearing@0.1.0` remain available, optional, post-motor-sizing
  steps"); or
- support any mechanism other than a ball screw. Belt/pulley drive,
  direct-drive conveyor, rack-and-pinion, and index-table each get their
  own module and their own Stage 1 spec (ADR-0011 "Phase scope") —
  nothing here is shared code with those beyond `lib/engine/mechanics`.

## Relationship to Existing Released Modules (Reuse Policy)

Per ADR-0011 "Reuse policy": this module reproduces, not imports, physics
already verified in four already-released modules and one already-released
generic engine package. Every reproduction below is a deliberate,
documented choice, not an oversight:

| Physics | Reproduced from | Why not linked/imported |
| --- | --- | --- |
| Moment of inertia, `Ta = J*alpha` | `lib/engine/mechanics` (Unit 6.1) | Actually **imported**, not reproduced — this is the one genuinely shared, source-independent physics package (ADR-0011 "Reuse policy" exception). Every other row is reproduced. |
| Scalar drive-force resolution (`F = F_A + m*g*(sin(theta)+mu*cos(theta))`) | `axis-load-cases@0.1.0`'s own `resolveAxisLoadPhase`, narrowed to Oriental Motor's own published scalar form | `axis-load-cases`' own fuller vector/moment model is a separate released, immutable package; this module has no dependency on it and does not consume `motion.axis.thrust_force` as an upstream link (ADR-0011 step 1: "reproduces... the same physics `axis-load-cases@0.1.0` and Oriental Motor's own page already establish") |
| Ball-screw load torque (`T_L = (F*P/(2*pi*eta) + mu0*F0*P/(2*pi)) * (1/i)`) | `ball-screw@0.1.0`'s own `resolveDriveTorque` | Same formula, same source (Oriental Motor, *Motor Sizing Calculations*, p. 4), but `ball-screw@0.1.0`'s own function takes an already-resolved `axis-load-cases` thrust force as an argument; this module resolves its own force internally (previous row) and calls the identical arithmetic without a package-level dependency |
| Trapezoidal move kinematics | `motion-profile@0.1.0`'s own `resolveTrapezoidalMove` | ADR-0011 step 2: "computes `Trms` from the *actual per-phase* `Ta`/`Td`/`t1`/`t2`/`t3`... not from a single scalar `rms_acceleration` crossing a port boundary" — this module needs the per-phase intermediate values `resolveTrapezoidalMove` already computes internally, not `motion-profile`'s own module-boundary output ports |
| Total system inertia, inertia ratio, acceleration torque, maximum momentary torque | `drive-train@0.1.0`'s own `resolveTotalSystemInertia`/`resolveInertiaRatio`/`resolveAccelerationTorque`/`resolveMomentaryTorque` | Same formulas (Omron-sourced), generalized to accept this module's own internally-resolved load torque and speed rather than hard-requiring `screw.drive_torque`/`screw.gear_ratio` as upstream ports (ADR-0011 "Context" problem 1) |
| Effective (RMS) torque | **Not reproduced from `drive-train@0.1.0`** — replaced by a genuine multi-phase computation (see item 6) | This is the structural fix ADR-0011 exists to make: `drive-train@0.1.0`'s own `resolveEffectiveTorque` is a closed-form approximation from one scalar `rms_acceleration`, proven to overstate THK's own vertical worked example by ~21% when the closed-cycle precondition (constant load torque, no holding torque) does not hold (`validation/drive-train/0.1.0.md` "deviations") |

## Candidate Methods and Sources

### 1. Moment of inertia — already built and released

`lib/engine/mechanics` (Unit 6.1, released 2026-08-12) provides every
inertia form this module needs: `solidCylinderInertia`/
`solidCylinderInertiaFromDensity` for the screw shaft's own rotating mass,
`linearMotionInertia` for the table-and-load mass converted to an
equivalent shaft-side inertia (`J = m*(A/(2*pi))^2`, `A` = the shaft's own
travel per revolution — for a direct-connected ball screw, `A = lead/i`),
and `accelerationTorque` (`Ta = J*alpha`). Source: Oriental Motor,
*Motor Sizing Calculations* (`jp.oriental_motor.motor_sizing_calculations
@web-2026-08-08`, pp. 2-3). No new sourcing needed for this item — see
`lib/engine/mechanics/README.md`.

### 2. Drive force and ball-screw load torque

[Oriental Motor, *Motor Sizing Calculations*](https://www.orientalmotor.com/technology/motor-sizing-calculations.html)
(`jp.oriental_motor.motor_sizing_calculations@web-2026-08-08`, p. 4, "Forces"
and "Load Torque Calculation - Ball Screw Drive" — the same page
`ball-screw@0.1.0`'s own `stage-1-spec.md` item 3 already cites for the
torque half of this formula):

```text
F = F_A + m*g*(sin(theta) + mu*cos(theta))     [incline; horizontal: theta=0, gives F = F_A + mu*m*g; vertical: theta=pi/2, gives F = F_A + m*g]
T_L = ( F*P_B/(2*pi*eta) + mu0*F0*P_B/(2*pi) ) * (1/i)
```

`F_A` = external force, `m` = total moving mass, `g` = gravitational
acceleration, `theta` = tilt angle, `mu` = sliding-surface friction
coefficient (source: typically `0.05`), `P_B` = ball-screw lead, `eta` =
efficiency (source: typically `0.85-0.95`), `F0` = preload (source:
`~= 1/3*F`), `mu0` = internal friction coefficient of the preload nut
(source: typically `0.1-0.3`), `i` = gear ratio (`1` for direct connection).

**This is a narrower force model than `axis-load-cases@0.1.0`'s own.**
`axis-load-cases` resolves a full vector force and moment in the `axis.v1`
frame, with a separate guide/seal resistance term distinct from Coulomb
friction, explicit external force/moment vectors, and per-case (`normal`/
`peak`/`holding`/`emergency_stop`) semantics. Oriental Motor's own
published formula is exactly the scalar special case this module adopts:
one friction coefficient against the normal load (approximated here as the
vertical/perpendicular component of `m*g` plus any external force's own
normal component — Oriental Motor's own page does not separate a normal
load from `m*g*cos(theta)` the way `axis-load-cases`' own `normalLoadN`
input does), no separate guide resistance term, and no moment resolution
at all. This is a deliberate scope narrowing for a self-contained
motor-sizing tool, not a claim that it supersedes or is more accurate than
`axis-load-cases@0.1.0`'s own fuller model — the two stay independently
released and immutable per ADR-0011.

**Direction dependence for a vertical or inclined round trip.** For the
"up" (against gravity) direction, `sin(theta)` and `mu*cos(theta)` both
add to `F_A`. For the "down" (gravity-assisted) direction, gravity's own
contribution subtracts while friction still opposes motion (still adds):
`F_down = F_A - m*g*sin(theta) + m*g*mu*cos(theta)`. This sign split is
not stated explicitly on Oriental Motor's own page (which shows one
formula, implicitly for the direction gravity opposes) but is required to
reproduce THK's own vertical worked example correctly (see "Reference
Examples" item 2 below, where `T1 = 900 N*mm` upward and `T2 = 830 N*mm`
downward are printed as genuinely different values) and is textbook
statics, not a new manufacturer method — the same "ordinary physics, no
source disagrees" category `lib/engine/mechanics`'s own README already
uses for moment of inertia. Recorded here as this document's own
derivation since no source states it explicitly; Stage 3 must implement
both directions, not just the "up" case, whenever the axis is not
horizontal.

### 3. Motion profile — one full operating cycle, not a single one-way move

[Oriental Motor, *Motor Sizing Calculations*](https://www.orientalmotor.com/technology/motor-sizing-calculations.html)
p. 5-6 ("Acceleration Torque", "Common Formula for All Motors",
`Ta = (J0*i^2+JL)/9.55 * NM/t1`) and `motion-profile@0.1.0`'s own
`resolveTrapezoidalMove` (`lib/modules/motion-profile/0.1.0/math.ts`) —
elementary constant-acceleration kinematics, the same "no citation needed
beyond confirmatory manufacturer treatment" status
`motion-profile/stage-1-spec.md` already established.

**Scope decision: a full round trip (up to two trapezoidal moves plus a
dwell), not `motion-profile@0.1.0`'s own single one-way move.** This is
required by both key reference examples (see "Reference Examples" below):
Omron's own worked example is a repeating one-way-plus-dwell cycle (a
horizontal axis, so direction does not change the load torque and a single
move suffices); THK's own vertical worked example is an explicit
**seven-phase round trip** ("Studying the Driving Motor... over seven
phases: upward accel/uniform/decel, downward accel/uniform/decel,
stationary"), because gravity makes the up and down halves genuinely
different (item 2 above). `0.1.0`'s own validity envelope (below) is
bounded at exactly this shape — one move out, one move back, one dwell —
not `motion-profile@0.1.0`'s own bounded-5-move general sequence
(`context/modules/motion-profile/stage-2-contract.md` "a bounded max of 5
moves per cycle"). This module does not reuse or link to that bound; it is
a new, independently-scoped decision for exactly the cycle shape a
point-to-point ball-screw axis needs.

**Deliberately not reusing `motion-profile@0.1.0`'s own per-move-index
port shape.** `context/progress-tracker.md`'s "Open decisions" records a
real, undiscovered-until-Unit-5.4 generic-engine defect: `motion-profile`'s
`move_{1..5}_*`/`dwell_{1..5}_*` ports all share one canonical parameter ID
each with no `loadCase` to disambiguate, so the database-backed resolution
path cannot correctly drive more than one move today. This module's own
motion inputs (proposed in "Existing Parameter Review" below) mint a new,
small, fixed-shape parameter set (one forward move, one return move, one
dwell — not an indexed 1-through-5 family) specifically to avoid inheriting
that same defect, not because the defect is this document's own to fix.

### 4. Acceleration torque, maximum momentary torque, total system inertia, inertia ratio

Already-verified formulas, reproduced from `drive-train@0.1.0`'s own
`math.ts` (Omron-sourced, corroborated by HMK and Voss —
`context/modules/drive-train/stage-1-spec.md` items 2, 4, 5):

```text
J_total = J_motor + J_load                              (resolveTotalSystemInertia)
R_J = J_load / J_motor                                   (resolveInertiaRatio)
Ta = J_total * alpha                                      (lib/engine/mechanics accelerationTorque)
T1 = Ta + T_L                                             (resolveMomentaryTorque; Omron, "Maximum Momentary Torque")
```

`J_load` is this module's own internally-computed sum of the screw shaft's
own rotating inertia (`solidCylinderInertia`/`...FromDensity`) and the
table-and-load's own linear-motion-equivalent inertia
(`linearMotionInertia`), reflected through the gear ratio the same way
`drive-train@0.1.0`'s own doc comments already describe (`J_L/i^2` for a
gearbox reduction) — unlike `drive-train@0.1.0`, which takes
`drive.reflected_load_inertia` as a required, already-resolved engineer
input (its own Stage 2 correction, `stage-2-contract.md` "Stage 3
corrections": "had no upstream source and had to become a required
engineer-supplied input"). This module computes it directly from geometry
and mass instead, because it now has `lib/engine/mechanics` available —
the same capability gap that forced `drive-train@0.1.0`'s own Stage 2
correction no longer exists for this module.

Inertia ratio: the same five-way sourced disagreement
`drive-train/stage-1-spec.md` item 5 already documents (Omron
per-series 30:1, Oriental Motor blog tiered 10:1-100:1, HMK 10:1, Voss
6:1/10:1, Voss-citing-Rexroth tiered 2:1-10:1) — reused directly, not
re-researched. Required engineer-supplied input with no built-in default,
following that same precedent.

### 5. Effective (RMS) torque — the structural fix, computed from real per-phase values

[Oriental Motor, *Motor Sizing Calculations*](https://www.orientalmotor.com/technology/motor-sizing-calculations.html)
p. 6, "Calculation for the Effective Load Torque (Trms)":

```text
Trms = sqrt( ((Ta+TL)^2*t1 + TL^2*t2 + (Td-TL)^2*t3) / tf )
```

Generalizes cleanly to any number of phases — the same underlying
"sum of torque-squared-times-time, divide by total time, square root"
shape every source agrees on
(`context/modules/drive-train/stage-1-spec.md` item 3: Omron's 3-phase
form, HMK's/Voss's 4-phase form with an explicit holding-torque term,
Oriental Motor's own 3-phase form). This module implements the general
N-phase form directly —

```text
Trms = sqrt( sum(T_i^2 * t_i) / sum(t_i) )
```

— over however many phases the round trip in item 3 above actually has
(3 for a horizontal one-way-repeating cycle matching Omron's own example;
7 for a vertical round trip matching THK's own example; up to 8 if a
distinct dwell-with-holding-torque phase is also modeled, matching HMK's/
Voss's own 4-term generalization). **This is the literal fix ADR-0011
exists to make**: `drive-train@0.1.0`'s own `resolveEffectiveTorque`
derives a closed-form approximation from one scalar `rms_acceleration`
(valid only when total inertia and load torque both stay constant across
the cycle); this module instead sums the real per-phase torques the way
every source's own formula is actually written, so a vertical axis's
genuinely different up/down load torque and a nonzero holding-phase torque
are represented directly, not approximated away.

Per-phase torque `T_i` for a moving phase is the same `Ta + TL` (accel) /
`TL` (constant) / `Td - TL`-or-conservatively-`Ta + TL` (decel) combination
item 4 above already uses; `drive-train@0.1.0`'s own `resolveAccelerationTorque`
doc comment already documents a deliberate conservative choice (using
`max(peakAccel, peakDecel)` as one figure rather than true signed
per-phase values) — whether this module keeps that same conservative
simplification or computes true signed per-phase torque (needed to
reproduce THK's own `Td-TL` decel-phase term exactly) is **not resolved
here**; see "Stage 2 Entry Criteria" item 3.

### 6. Required torque with safety factor

Oriental Motor's own page 6 also states a simpler combined check,
`TM = (TL+Ta)*Sf` ("Calculation for Required Torque"), positioned in the
source's own document flow *before* the Trms section as a general method
"for all motors," with Trms introduced afterward as the refined method
"particularly important for operating patterns such as fast-cycle
operations" specifically for servo motors. Given this project's own
established precedent — `drive-train@0.1.0`'s own two-separate-margins
design (`drive.rms_torque_margin`, `drive.peak_torque_margin`), justified
in its own Stage 2 contract as "no source ties the two together" — this
module's own working design keeps that same dual-check shape (a required
momentary-torque margin and a required RMS-torque margin, each an
engineer-supplied input) rather than adopting Oriental Motor's own single
combined `TM` formula, which would fold the RMS/fatigue consideration this
whole document exists to fix back into a cruder combined figure. Recorded
as this document's own working decision, not settled until Stage 2 — see
"Stage 2 Entry Criteria" item 4. Both Omron's own worked example (a flat
`0.8` margin for both checks) and THK's own two examples (an implicit
`1.0` "at least" margin, no derating) are on record as real, disagreeing
precedents for what the margin should be — reused directly from
`drive-train/stage-1-spec.md` items 3-4, not re-researched.

## Validity Envelope (Proposed)

- One straight ball screw, one motor, direct-connected or through a single
  fixed gear ratio (`i`) — no multi-stage transmission.
- One full point-to-point operating cycle: a forward move, an optional
  return move (same distance, opposite direction), and an optional dwell —
  not `motion-profile@0.1.0`'s own general bounded-5-move sequence (item 3
  above).
- Horizontal, vertical, or inclined orientation (`0 <= theta <= pi/2`),
  reusing `motion.axis.orientation`/`motion.axis.incline_angle`'s existing
  enum/range semantics. A horizontal axis needs only the forward move (no
  direction-dependent load torque); vertical/inclined needs both directions
  modeled separately (item 2 above).
- Symmetric accel/decel magnitude within each one-way move (matching
  `motion-profile@0.1.0`'s own trapezoidal-move symmetry), though the
  forward and return moves may use different magnitudes from each other.
  S-curve/jerk-limited profiles are out of scope, matching
  `motion-profile@0.1.0`'s own `0.1.0` scope.
- Rotating-screw / translating-nut arrangement, matching `ball-screw@0.1.0`'s
  own validity envelope (not re-derived, just assumed consistent).
- No screw mechanical-strength check (buckling, critical speed, life,
  static safety factor) — out of scope per "Purpose" above.
- No thermal derating, no structural compliance, no backlash.

## Existing Parameter Review

Reused without change from already-released definitions:

| Purpose | Parameter |
| --- | --- |
| Orientation / incline angle | `motion.axis.orientation`, `motion.axis.incline_angle` |
| Gravitational acceleration | `motion.axis.gravity` |
| Sliding-surface friction coefficient | `motion.axis.friction_coefficient` |
| Ball-screw lead | `screw.lead` |
| Screw-to-motor gear ratio | `screw.gear_ratio` |

Everything else is new — this module does not consume `motion.axis.
thrust_force`, any `motion.profile.*` port, or `screw.drive_torque` (per
the "Relationship to Existing Released Modules" table above, it reproduces
these formulas rather than linking to their outputs). A Stage 2 registry
proposal needs at least a new parameter group (working prefix
`motor_sizing.ball_screw.*` or a shared `motor_sizing.*` prefix reused
across every mechanism module in the family — an open Stage 2 naming
question, not resolved here, since no other mechanism module's own Stage 1
exists yet to compare against):

- Geometry/mass inputs: total moving mass, screw root/nominal diameter and
  unsupported length (for the screw's own rotating inertia — reusing
  `solidCylinderInertia`, not the `ball-screw@0.1.0` module's own
  `rootDiameterM` buckling input, which this module does not depend on),
  screw material density or direct screw mass, preload, internal friction
  coefficient of the preload nut, mechanical efficiency, external force.
- Motion inputs: forward-move distance, max velocity, max acceleration/
  deceleration (forward and return, potentially distinct), dwell time.
- Motor/drive catalog-adjacent inputs the engineer supplies directly (not
  looked up): motor rotor inertia.
- Required-margin inputs with no built-in default (this module's own
  precedent from `drive-train@0.1.0`, `ball-screw@0.1.0`'s static safety
  factor, etc.): RMS-torque margin, momentary-torque margin, inertia-ratio
  maximum.

## Checks and Warnings (Proposed)

Without a candidate motor's own catalog rated/peak torque as an input
(ADR-0011's own "no catalog matching" scope), this module cannot check a
required torque against a specific motor's capability the way
`drive-train@0.1.0` does. What it *can* check without one:

- Invalid input: non-positive mass, lead, efficiency outside `(0, 1]`,
  velocity/acceleration, or an inconsistent orientation/incline-angle pair
  (reusing `axis-load-cases@0.1.0`'s own validation shape for the latter).
- Inertia ratio against the engineer-supplied `inertia_ratio_maximum` — a
  real pass/fail check with no motor selection needed, since it is a ratio
  of two already-known quantities (reflected load inertia and the
  engineer's own candidate motor rotor inertia, itself a required input —
  Stage 2 must confirm whether that candidate rotor inertia is required
  up front or the ratio check is instead reported informationally against
  a range).
- Required momentary torque and required RMS torque are reported as
  **output values** (`T1 * peak_torque_margin`-style figures — margin
  direction is a Stage 2 question, see "Stage 2 Entry Criteria" item 4),
  not checked pass/fail against anything in `0.1.0`, since there is no
  catalog figure to check them against. This is the honest consequence of
  ADR-0011's own "required specs only" scope, recorded here rather than
  inventing a check with nothing to check against.

## Trace Contract (Proposed)

Mirroring the established pattern (`axis-load-cases/stage-1-spec.md`,
`ball-screw/stage-1-spec.md`, `drive-train`'s own trace):

1. `geometry-and-inertia` — `screw-inertia`, `load-inertia`,
   `total-system-inertia`, `inertia-ratio`
2. `motion-profile-<direction>` — `trapezoidal-move` for forward and
   (when applicable) return
3. `drive-force-<direction>` — `resolved-force`, `load-torque`
4. `acceleration-torque-<direction>`
5. `momentary-torque` — the governing maximum across all phases
6. `effective-torque` — the full-cycle N-phase RMS computation, listing
   every phase's own duration and torque
7. `required-torque` — with the applied margin(s)
8. `validity-and-assumptions` — orientation, round-trip-vs-one-way
   modeling choice, the conservative accel/decel-torque summation choice
   (item 5 "Candidate Methods" above, if kept)

Each formula step cites its registered source revision and exact
page/section; it must not repeat the formula in UI/report code.

## Reference Examples and Independent Benchmark (Proposed)

### 1. Omron Corporation's own worked example — full reproduction, including geometry-derived inertia

`jp.omron.servo_motor_selection_guide@csm-tg-e-3-1`. **Directly re-read
this session at its own primary pages** (`reference/source-material/Servo
Selection.pdf`, pp. 12-13 — not just recalled from `drive-train@0.1.0`'s
own comment, since this document's own inertia claim below needed the
source's exact formula, not just its printed result) — direct-connected
ball screw (`i=1`, `G=1`), load mass `M=5 kg`, ball-screw pitch `P=10 mm`,
ball-screw diameter `D=20 mm`, ball-screw mass `MB=3 kg`, friction
coefficient `mu=0.1`, one speed change (`V=300 mm/s`, stroke `L=360 mm`),
cycle `accel(0.2s)+constant(1.0s)+decel(0.2s)+dwell(0.2s)=1.6s`.

The source's own printed inertia derivation, exactly as shown (step 3,
"Calculation of Motor Shaft Conversion Load Inertia"):

```text
JB = MB*D^2/8 * 10^-6                    [ball-screw shaft's own inertia]
JW = M*(P/(2*pi))^2 * 10^-6 + JB         [[screw + load] inertia, reflected to the screw shaft]
JL = G^2*(JW+J2) + J1 = JW               [reflected to the motor shaft; JL=JW since G=1, J1=J2=0]
```

Printed: `JB = 3*20^2/8 * 10^-6 = 1.5e-4 kg*m^2`, `JW = 5*(10/(2*pi))^2 *
10^-6 + 1.5e-4 = 1.63e-4 kg*m^2` (`P` in mm here, hence the `10^-6` factor —
the same `linearMotionInertia` shape `lib/engine/mechanics` already
implements in SI, `J = m*(A/(2*pi))^2`, just with `P` left in millimeters
before the source's own explicit unit-conversion constant). Also: `TW=TL=
7.8e-3 N*m`, `N=1800 rpm`, `TA=0.165 N*m` (source's own form,
`TA=(2*pi*N)/(60*tA)*(JM+JL)` — algebraically identical to
`lib/engine/mechanics`'s own already-cross-validated `Ta=J*N/(9.55*t1)`
form, `2*pi/60 = 1/9.55` to rounding, confirmed by direct arithmetic this
session: `(2*pi*1800/(60*0.2))*(1.23e-5+1.63e-4) = 0.1652 N*m`, matching
the printed `0.165`), `T1=0.173 N*m`, `Trms=0.0828 N*m`.

**This is a stronger reference example for this module than it was for
`drive-train@0.1.0`.** `drive-train@0.1.0` took `JW`'s value
(`reflected_load_inertia`) as a given, already-resolved input — it could
not check the inertia *calculation* itself. This module can: `JB` is a
direct `solidCylinderInertia` check against the printed screw geometry
(`solidCylinderInertia({massKg: 3, outerDiameterM: 0.02}).inertiaKgM2 =
1.5e-4`, confirmed by hand this session against `lib/engine/mechanics`'s
own formula), and `JW` is `JB` plus a direct `linearMotionInertia` check
against `M=5 kg`, `P=10 mm` (`linearMotionInertia({massKg: 5,
travelPerRevolutionM: 0.01}).inertiaKgM2 = 1.267e-5`, and
`1.5e-4 + 1.267e-5 = 1.6267e-4 ≈ 1.63e-4`, matching the source's own
3-significant-figure rounding). If Stage 3's own kernel reproduces this
same composition, it is new evidence `lib/engine/mechanics` itself is
correctly wired into a real motor-sizing computation, not just
unit-tested in isolation. **This module's own "load inertia" (feeding
`resolveTotalSystemInertia`, matching `drive-train@0.1.0`'s own `J_load`
naming) is therefore `JW` — the screw's own inertia already summed in —
not the linear-motion term alone.**

### 2. THK Co., Ltd.'s own two worked examples

`jp.thk.example_ball_screw_selection@technico-mirror-2026-08-10` — already
cached and used by `drive-train@0.1.0`'s own `thk-reference-examples.ts`.

- **Horizontal ("High-speed Transfer Equipment"):** `T1=120 N*mm` (load
  torque), `J=3.39e-3 kg*m^2` (reflected inertia), `alpha=1050 rad/s^2`,
  `T2=4.61 N*m` (acceleration torque), `Tk=4730 N*mm` (max momentary),
  `Trms` (rated) `=1305 N*mm`, over four printed phases (accel/uniform/
  decel/stationary). `drive-train@0.1.0` already fully reproduces this one
  (agreement within ~0.3%/0.06%) because its own closed-cycle assumption
  holds for a horizontal, direction-independent load torque — this module
  should reproduce it too, as a baseline confirming the generalization did
  not break the case the closed form already handled correctly.
- **Vertical ("Vertical Conveyance System") — the key validation
  target:** `T1=900 N*mm` (upward load torque), `T2=830 N*mm` (downward
  load torque — genuinely different from `T1`, item 2's "Direction
  dependence" above), `J=1.58e-4 kg*m^2`, `alpha=942 rad/s^2`,
  `Tk1=1100 N*mm` (upward accel, governing maximum), `Tk2=630 N*mm`
  (downward accel, gravity-assisted, lower), `Ts=658 N*mm` (stationary
  holding torque, non-zero), over **seven** printed phases. THK's own
  printed effective (RMS) torque requirement: **`743 N*mm`.**
  `drive-train@0.1.0` computes **`~901 N*mm`** for this same scenario
  through its own closed-form approximation — a documented ~21%
  overstatement (`validation/drive-train/0.1.0.md` "deviations") that is
  this ADR's own motivating example. **This module's own N-phase Trms
  computation (item 5 above), fed THK's own seven printed phases directly,
  is expected to reproduce `743 N*mm` closely** — the single most
  important Stage 4 confirmation this module needs, since it is a direct,
  quantified test of whether ADR-0011's own structural fix actually works,
  not just a plausible argument.

### 3. Independent benchmark

Cross-check this module's own general N-phase Trms function against
`drive-train@0.1.0`'s own closed-form `resolveEffectiveTorque` (a
structurally different computation, already partly built as
`drive-train@0.1.0`'s own `closed-cycle-benchmark.ts`) across both THK
scenarios: expect close agreement on the horizontal case (closed-cycle
precondition holds) and a reproduction of the documented ~21% divergence
on the vertical case (precondition violated) — proving the two methods
agree exactly where they are expected to and diverge exactly where they
are expected to, not merely computing a number and hoping it looks right.

## Evidence Gaps and Verification Confidence

- **Directly read this session, high confidence:** every Oriental Motor
  formula cited above (pp. 2-6, already read in full this session and in
  the sessions that built `ball-screw@0.1.0`, `motion-profile@0.1.0`, and
  `drive-train@0.1.0`).
- **The direction-dependent force-sign split (item 2's "Direction
  dependence") is this document's own derivation, not stated explicitly by
  Oriental Motor's own page.** It is ordinary statics (the same "no source
  disagrees" category as moment of inertia), and it is required to
  reproduce THK's own vertical example's `T1`/`T2` distinction — but it is
  flagged here as inferred, not sourced verbatim, following this project's
  own practice of distinguishing the two.
- **The exact per-phase signed-torque convention for the decel phase
  (`Td-TL` vs. a conservative `Ta+TL`) is not resolved** — see "Stage 2
  Entry Criteria" item 3. Reproducing THK's own `Tk2=630 N*mm`
  (gravity-assisted, lower than the load-torque-only figure) needs the
  true signed form; `drive-train@0.1.0`'s own conservative simplification
  cannot express it (documented in that module's own `thk-reference-
  examples.ts`: "cannot reproduce THK's own `Tk2=630 N*mm`... consistent
  with that conservative choice, not a defect"). This module's own
  purpose — reproducing THK's vertical example correctly — argues for
  adopting the true signed form, but that is a Stage 2/3 decision, not
  made here.
- **No new source research was done this session beyond re-reading
  already-cached, already-registered sources.** Every source cited above
  was already fetched, read, and registered by an earlier session for
  `axis-load-cases@0.1.0`, `ball-screw@0.1.0`, `motion-profile@0.1.0`, or
  `drive-train@0.1.0`. This is expected and disclosed, not a shortcut: this
  module's whole premise (ADR-0011 "Recommended first module") is that its
  physics is already validated end to end elsewhere in this codebase.

## Stage 2 Entry Criteria

1. Resolve the parameter-group naming question ("Existing Parameter
   Review" above): a shared `motor_sizing.*` prefix reused across every
   future mechanism module, or a per-mechanism prefix
   (`motor_sizing.ball_screw.*`). No other mechanism module's own Stage 1
   exists yet to compare against — recommend deciding this now, since it
   is much cheaper to fix before a second mechanism module exists than
   after.
2. Confirm the round-trip motion-input shape (item 3 above: one forward
   move, one optional return move, one optional dwell) against a released
   parameter contract, explicitly avoiding `motion-profile@0.1.0`'s own
   per-move-index port defect (`context/progress-tracker.md` "Open
   decisions").
3. Decide the per-phase signed-torque convention (conservative
   `Ta+TL`/`Ta-TL`-style summation vs. true signed per-direction values) —
   "Evidence Gaps" above. This is the one remaining physics question that
   changes a computed number, not just a naming or scope question.
4. Decide the required-torque/margin shape (item 6 above: two separate
   margins, following `drive-train@0.1.0`'s own precedent, vs. Oriental
   Motor's own single combined `TM=(TL+Ta)*Sf`) and whether an inertia-ratio
   check requires the engineer to supply a candidate motor's rotor inertia
   up front (a real motor-selection input) or stays purely informational
   until a later module version adds catalog matching.
5. New parameter-registry version release for whatever Stage 2 resolves
   above — no registry version is proposed by this document.

This module's own Stage 1 is now sourced and scoped enough to enter Stage 2;
no further source research is needed before that stage, per the "Evidence
Gaps" note above.
