# Direct-Drive Conveyor Motor Sizing Module — Stage 1 Engineering Specification

## Status

- Work unit: Milestone 6, Unit 6.3 (`context/implementation-map.md` "Units 6.3
  and later"), the second mechanism module in the Motor Sizing Tool family
  (`context/adr/0011-motor-sizing-tool-architecture.md`), after
  `ball-screw-motor-sizing@0.1.0` (released 2026-08-13).
- Proposed module ID: `direct-drive-conveyor-motor-sizing` (folder name
  matches, per this project's existing convention —
  `context/modules/ball-screw-motor-sizing/` for module ID
  `ball-screw-motor-sizing`).
- Proposed category: `motor-sizing.direct-drive-conveyor` (ADR-0011 "Phase
  scope").
- Proposed first released version: `0.1.0`.
- Status: **Stage 1 in progress.** Founder-directed pick among ADR-0011's
  four remaining mechanisms, chosen over `belt-pulley-drive`/`rack-pinion`
  (both exploratory-only per this project's own validation-case history) and
  `index-table` (blocked on a missing load-torque source per ADR-0011 "Phase
  scope") because it closes a real, previously reported gap: the founder's
  own Oriental Motor sizing tool
  (`https://sizing.orientalmotor.co.jp/top/next`) has fixed mechanism
  templates for a ball screw, rack-and-pinion, index table, and a
  pulley-reduced belt conveyor, but **no template for a conveyor with the
  motor directly on the drive-roller shaft** — the founder has hit this
  gap on a real project and had to improvise.
- Date: 2026-08-13.

No released parameter, module version, calculation run, or validation
record is changed by this document.

## Purpose

Given a belt conveyor's own roller geometry, belt and carried-load mass,
friction, and a commanded start/run/stop speed profile, compute the
**required** motor specifications a motor for that conveyor must meet:
breakaway (static-friction) torque, acceleration torque, maximum momentary
(starting) torque, continuous running torque, required torque with an
engineer-supplied safety margin, operating speed, total reflected system
inertia, and inertia ratio. Like `ball-screw-motor-sizing@0.1.0`, it reports
required-spec values and pass/fail checks against engineer-supplied
margins — "the engineer takes the number to the catalog" (ADR-0011 "Output
scope"). **No motor catalog matching or part selection ships in `0.1.0`.**

It will **not**:

- select a gearbox, coupling, drive/amplifier, or holding brake — those stay
  `coupling@0.1.0`'s, `support-bearing@0.1.0`'s, and `drive-train@0.1.0`'s
  own separate, already-released, optional post-motor-sizing steps (same
  scope note `ball-screw-motor-sizing/stage-1-spec.md` "Purpose" already
  makes);
- support any mechanism other than a belt conveyor driven directly by the
  motor. A geared/pulley-reduced belt or wire drive of a *rigid* load (a
  table or carriage, not loose material riding a moving belt surface) is a
  physically different mechanism — see "Relationship to Existing and
  Planned Modules" below — and gets its own module
  (`motor-sizing.belt-pulley-drive`), not this one;
- model an inclined conveyor. Every source found this session (see
  "Candidate Methods and Sources" below) models a horizontal conveyor only;
  no worked example or formula for an inclined belt conveyor's own
  additional gravity-component term was found. Deferred to a future version
  (see "Validity Envelope");
- compute an effective (RMS) torque over a repeating duty cycle. This is a
  genuine, evidence-driven scope difference from `ball-screw-motor-sizing@
  0.1.0` — see "Candidate Methods and Sources" item 3 below for why no
  source found this session frames a conveyor's own duty cycle this way.

## Relationship to Existing and Planned Modules (Reuse Policy)

Per ADR-0011 "Reuse policy": this module reproduces, not imports, physics
already available in this codebase, and calls `lib/engine/mechanics`
directly for the one genuinely shared, source-independent piece (moment of
inertia, `Ta = J*alpha`) — the same treatment `ball-screw-motor-sizing@
0.1.0` already established.

**The key distinction this document makes precise: a belt conveyor is not
a geared/pulley-reduced drive of a rigid load.** ADR-0011 "Phase scope"
separately lists `motor-sizing.belt-pulley-drive` ("geared/pulley-reduced
belt or wire drive... `i != 1`") alongside this module
(`motor-sizing.direct-drive-conveyor`, "`i = 1`"). Reading the actual
sources this session shows the distinction is not just the gear ratio —
it is a different physical mechanism entirely:

| | `motor-sizing.belt-pulley-drive` (not this module) | `motor-sizing.direct-drive-conveyor` (this module) |
| --- | --- | --- |
| What moves | A rigid table/carriage, rigidly attached to a wire or belt looped around a pulley — mechanically the same "one attachment point pulls one rigid load along a fixed path" shape as a ball screw, just swapping the screw's lead for the pulley's `pi*D` | Loose material (a package, a part) resting freely on top of a moving belt surface, carried along by friction between the load and the belt — nothing rigidly attaches the load to the drive |
| Source formula | Already-registered `jp.oriental_motor.motor_sizing_calculations` (web page), p. 4, "Load Torque Calculation - Pulley Drive" / "...Wire or Belt Drive, Rack and Pinion Drive": `T_L = (mu*F_A + m*g)*D/(2*i)` — algebraically the same shape as the ball-screw formula `ball-screw-motor-sizing@0.1.0` already reproduces, with `D` (pulley diameter) substituting for the screw's lead-derived term | New sources found this session (below): `T_L = mu*m*D/(2*eta)`, plus a belt-mass inertia term and a second (idler) roller inertia term neither the pulley-drive nor the ball-screw formula has |
| Idler/second roller | Not applicable — a pulley drive has one pulley the wire/belt loops over | A conveyor always has at least two rollers (drive + idler); the idler roller's own inertia is part of the reflected load even though it carries no torque |
| Belt's own mass | Not applicable (a wire or timing belt pulling a rigid load is not itself carrying the load's own weight along its own belt run the way a conveyor belt does) | A conveyor's belt itself has mass and contributes its own inertia term (Omron's own `J4`, item 1 below) |

This module does not reuse or depend on `motor-sizing.belt-pulley-drive`
(not yet built) or on any Milestone-4 discipline module; like
`ball-screw-motor-sizing@0.1.0`, it is fully self-contained.

## Candidate Methods and Sources

### 1. Moment of inertia — reused directly from `lib/engine/mechanics` (Unit 6.1)

`lib/engine/mechanics` already provides every inertia form this module
needs, and its own `linearMotionInertia` doc comment already names this
exact reuse ahead of this module existing: *"a ball screw's lead, or
`pi*D` for a pulley **or pinion** of pitch diameter `D`"* — a conveyor's
drive roller is the same case, one this document makes explicit rather than
assumed:

- `solidCylinderInertia` / `...FromDensity` — the drive roller's and idler
  roller's own rotating inertia.
- `linearMotionInertia` with `travelPerRevolutionM = pi * D_drive` — the
  belt's own mass and the carried load's own mass, both converted to an
  equivalent shaft-side inertia the same way a table-and-load mass is for a
  ball screw, substituting the roller's own circumference (`pi*D`, the
  belt's travel per drive-roller revolution) for the screw's lead.
- `offsetAxisInertia` — not needed at `0.1.0` (no off-axis load modeled).

Two manufacturer sources, read directly this session, agree on the general
shape (a drive-roller term, an idler-roller term reflected by `(D_drive/
D_idler)^2`, a belt-mass term, and a carried-load term, all summed):

- **Omron Corporation**, *Technical Guide for Servo Motor Selection*
  (`jp.omron.servo_motor_selection_guide@csm-tg-e-3-1`, already registered
  for `drive-train@0.1.0` and `ball-screw-motor-sizing@0.1.0`; re-read this
  session at pp. 7-9, not previously read past p. 6 for those modules'
  own narrower ball-screw scope). Two conveyor-specific forms, both printed:

  ```text
  "Inertia when Carrying Object via Conveyor Belt" (p. 8):
  JW = J1 + J2 + J3 + J4
     = ( M1*D1^2/8 + M2*D2^2/8*(D1/D2)^2 + M3*D1^2/4 + M4*D1^2/4 ) * 1e-6  [kg*m^2, mm inputs]
  M1/D1: drive-roller mass/diameter, M2/D2: idler-roller mass/diameter,
  M3: carried-object mass, M4: belt mass.

  "Torque of an object on the conveyor belt to which the external force is
  applied" (p. 9):
  TW = F * D/2 * 1e-3  [N*m, mm input]     (F = external/friction force, N)
  ```

  The `M3*D1^2/4` and `M4*D1^2/4` terms are each algebraically identical to
  `linearMotionInertia({massKg: M, travelPerRevolutionM: pi*D1})` —
  `m*(pi*D1/(2*pi))^2 = m*D1^2/4` — confirmed by hand this session. The
  `M2*D2^2/8*(D1/D2)^2` idler term simplifies to `M2*D1^2/8` (reflecting the
  idler's own inertia to the drive-roller shaft at the belt's shared linear
  speed), the same parallel-shaft reflection shape
  `drive-train@0.1.0`'s own gear-ratio-squared reflection already uses,
  here with `(D1/D2)` playing the role of a gear ratio between the two
  rollers.

- **Oriental Motor Co., Ltd.**, *Technical Reference — Motor Sizing
  Calculations (Section F)*
  (`jp.oriental_motor.general_catalog_motor_fan_sizing@f-tecref-2003-2004`,
  a newly registered source this session — an imperial-unit printed General
  Catalog chapter, a different document from the already-registered current
  web page). Gives the identical formula shape restated in imperial units
  and, unlike Omron's guide, includes **two full worked numerical
  examples with a real motor selected at the end** — see "Reference
  Examples" below.

**A real, disclosed idler-roller-inertia inconsistency between the two
Oriental Motor worked examples in the same source document.** p. F-8's own
worked example includes both rollers' own inertia explicitly (`J1 =
(1/8)*m2*D^2*2`, the `*2` for two identical-diameter rollers). p. F-9's own
worked example computes only `Jm1 = (1/8)*m1*D^2` for a single roller, with
no second term for the idler roller at all — a real scope narrowing (or
omission) in that specific worked example, not a different formula being
taught; this module's own kernel follows Omron's general form (both
rollers, reflected by diameter ratio) rather than p. F-9's own narrower
arithmetic. See the source revision's own registry note
(`lib/standards/engineering-sources.ts`) for the full reconciliation,
including a separate, unresolved arithmetic inconsistency in p. F-9's own
printed belt-and-load inertia term.

### 2. Load torque — friction against the belt, converted to roller torque

Both sources above agree on the same two-step shape, and it is genuinely
simpler than the ball-screw module's own (no preload-nut term — a conveyor
has no preload nut):

```text
F = mu * m_total          (mu: coefficient of friction between belt and load *and* the general "sliding resistance" of the belt/roller system; m_total: belt + carried-load mass)
T_L = F * D_drive / (2 * eta)      (eta: belt/roller mechanical efficiency)
```

Both worked examples (p. F-8, p. F-9 below) use `mu = 0.3` — notably higher
than the `0.05` "sliding surface" default the already-registered
`jp.oriental_motor.motor_sizing_calculations` web page states for a table
sliding on a linear guide. **This is a real, disclosed reason not to reuse
any already-released friction-coefficient parameter without checking its
exact meaning first** — see "Existing Parameter Review" below. Neither
source states a general-purpose default `mu` for an arbitrary belt/load
material pair; both simply state the input value their own worked scenario
uses. This module's own `0.1.0` therefore has no built-in default for this
parameter either, following the same "no source gives a defensible general
value, so it becomes a required engineer-supplied input" precedent
`ball-screw@0.1.0`'s static-safety-factor-minimum and
`support-bearing@0.1.0`'s several catalog inputs already established.

### 3. Motion profile and duty-cycle shape — a genuine scope difference from `ball-screw-motor-sizing@0.1.0`

**Finding: no source read this session frames a conveyor's own required
motor sizing as a repeating point-to-point duty cycle with an effective
(RMS) torque check.** All three conveyor-specific sources found this
session (p. F-8, p. F-9, and the Oriental Motor blog's own "Variable Speed
Belt Conveyor" example, `jp.oriental_motor.
variable_speed_belt_conveyor_sizing_example`) instead check a single
breakaway/acceleration event's own peak torque against the motor's maximum
momentary rating, and (implicitly, via the selected motor's own rated
torque exceeding the computed load torque) a continuous running torque —
never a `Trms` sum over repeated phases the way
`ball-screw-motor-sizing@0.1.0`'s own THK vertical example required. p. F-8
states this directly: *"On a belt conveyor, the greatest torque is needed
when starting the belt."* This matches the mechanism's own real character:
a material-handling conveyor is not a repeating back-and-forth shuttle —
it starts (once, or infrequently), runs continuously at a commanded speed
(possibly changing between speeds, per the blog's own two-speed example),
and stops (once, or infrequently). Reusing `ball-screw-motor-sizing@
0.1.0`'s own round-trip/`Trms`-over-N-phases shape here would be inventing
scope no source supports — the same "do not invent product behavior"
discipline this project already applies elsewhere
(`context/ai-workflow-rules.md` "Handling Missing Requirements").

**Proposed `0.1.0` motion shape:** a single accelerate-to-speed / run-at-
speed / decelerate-to-stop profile (trapezoidal, matching
`motion-profile@0.1.0`'s own single-move symmetry assumption), reusing
`motion-profile@0.1.0`'s own `resolveTrapezoidalMove` kinematics
(elementary constant-acceleration formulas, the same "no citation needed
beyond confirmatory manufacturer treatment" status
`ball-screw-motor-sizing/stage-1-spec.md` item 3 already gives this same
kinematics) computed internally, not linked from that module (ADR-0011
"Module shape" step 2). A repeating-cycle/servo-RMS variant for a
servo-driven indexing or shuttle conveyor is explicitly **out of scope**
for `0.1.0` — no evidence supports it yet; a future module version can add
it if a real project needs one (the same treatment `axis-load-cases@
0.1.0`'s own deferred `holding`/`emergency_stop` cases already received).

### 4. Acceleration torque, maximum momentary torque, total system inertia, inertia ratio

Reused directly, the same formulas `ball-screw-motor-sizing@0.1.0`'s own
kernel already implements against `lib/engine/mechanics`:

```text
J_total = J_motor + J_drive_roller + (J_idler_reflected + J_belt + J_load) / i^2
Ta = J_total * alpha                          (lib/engine/mechanics accelerationTorque)
T1 = Ta + TL                                  (maximum momentary/starting torque)
```

`i` is this module's own gear ratio between motor and drive-roller shaft —
see "Validity Envelope" below for why `0.1.0` fixes it at `1` (direct
drive) despite both worked examples below being geared. Inertia ratio
(`J_total / (J_motor * i^2)` against an engineer-supplied maximum) reuses
the same required-input-no-default precedent
`ball-screw-motor-sizing/stage-1-spec.md` item 4 already established —
both p. F-8 and p. F-9 below perform this exact check (`J < J_G`) with a
manufacturer-stated maximum for their own selected gearhead, confirming the
check itself is standard practice for this mechanism, not just for a ball
screw.

### 5. Required torque with safety factor — a single combined check, not two separate margins

**Finding: neither conveyor worked example computes an RMS torque, so
neither needs `ball-screw-motor-sizing@0.1.0`'s own two-separate-margins
design** (one for RMS, one for momentary). Both p. F-8 and p. F-9 instead
use the single combined form the already-registered `jp.oriental_motor.
motor_sizing_calculations` web page states generally on its own p. 6
(`TM = (TL + Ta) * Sf`) — the same "general method for all motors" form
`ball-screw-motor-sizing/stage-1-spec.md` item 6 already noted Oriental
Motor's own documentation offers as an alternative to the RMS-based check
it chose not to use for a ball screw. Both worked examples use `Sf = 2`, a
worked value, not a stated general default (the same "recorded, not
adopted as a built-in default" treatment every other required-margin
parameter in this project already receives).

## Validity Envelope (Proposed)

- One belt conveyor: a drive roller and one idler roller, direct-connected
  to the motor (`i = 1`, no gearbox) — **not** the general geared case both
  reference examples below happen to use. This is a deliberate `0.1.0`
  scope narrowing to the founder's own actual reported gap (a *direct*-drive
  conveyor has no template in the founder's existing tool), not a claim
  that the underlying formula only works for `i = 1` — item 4 above keeps
  `i` in the kernel's own general formula so Stage 3/4 can validate against
  the geared reference examples, while this module's own manifest/input
  schema fixes `i = 1` (or omits a gear-ratio input entirely) for `0.1.0`.
  This exact resolution path is the one ADR-0011 "Phase scope" itself
  anticipated for this module.
- Horizontal only. No source found this session gives an inclined-conveyor
  formula or worked example (see "Purpose" above).
- One accelerate / run / decelerate motion event, not a repeating cycle
  (item 3 above). Symmetric accel/decel magnitude, matching
  `motion-profile@0.1.0`'s own trapezoidal-move symmetry.
- Drive and idler rollers may differ in diameter (Omron's own general form
  supports this); both worked examples below happen to use equal
  diameters.
- No screw, guide, or coupling mechanical-strength check — out of scope, the
  same "engineer takes the number to the catalog" boundary
  `ball-screw-motor-sizing@0.1.0` already established.
- No thermal derating, no belt-slip check, no belt-tension/tracking design.

## Existing Parameter Review

Reused without change from already-released definitions — deliberately a
short list, since most of this module's own inputs are new (see "Load
torque" above for why the friction coefficient specifically is *not*
reused):

| Purpose | Parameter |
| --- | --- |
| Gravitational acceleration | `motion.axis.gravity` |

Everything else is new. Candidate new parameters (working prefix
`motor_sizing.direct_drive_conveyor.*`, following
`ball-screw-motor-sizing@0.1.0`'s own per-mechanism-prefix precedent,
already decided at that module's own Stage 2 as the family-wide
convention):

- Geometry/mass inputs: drive-roller diameter and mass (or material density
  and dimensions), idler-roller diameter and mass, belt mass, carried-load
  mass, belt/load friction coefficient (no reused default — see item 2
  above), belt/roller mechanical efficiency.
- Motion inputs: target belt speed, acceleration/deceleration time (or
  rate), run duration (informational/trace-only — does not change any
  torque or inertia output, the same role `duty_cycle`/
  `ambient_temperature` play for `axis-load-cases@0.1.0`).
- Motor/drive catalog-adjacent inputs the engineer supplies directly: motor
  rotor inertia.
- Required-margin inputs with no built-in default: a single combined
  required-torque safety factor (item 5 above), inertia-ratio maximum.

## Checks and Warnings (Proposed)

Following `ball-screw-motor-sizing@0.1.0`'s own precedent for a module with
no candidate motor's own catalog rated torque as an input:

- Invalid input: non-positive mass, diameter, efficiency outside `(0, 1]`,
  speed, or acceleration/deceleration time.
- Inertia ratio against the engineer-supplied maximum — a real pass/fail
  check, the same shape both worked examples below perform.
- Required torque (item 5 above) is reported as an **output value**, not
  checked pass/fail against anything in `0.1.0`, the same honest
  consequence of ADR-0011's own "required specs only" scope
  `ball-screw-motor-sizing/stage-1-spec.md` "Checks and Warnings" already
  states.

## Trace Contract (Proposed)

Mirroring `ball-screw-motor-sizing@0.1.0`'s own established pattern:

1. `geometry-and-inertia` — `drive-roller-inertia`, `idler-roller-inertia`
   (reflected), `belt-inertia`, `load-inertia`, `total-system-inertia`,
   `inertia-ratio`
2. `motion-profile` — the single accelerate/run/decelerate move
3. `drive-force` — `friction-force`, `load-torque`
4. `acceleration-torque`
5. `momentary-torque` — the governing starting/breakaway maximum
6. `required-torque` — with the applied combined margin
7. `validity-and-assumptions` — horizontal-only, direct-drive-only
   (`i = 1`), single-event (not repeating-cycle) motion assumptions

Each formula step cites its registered source revision and exact
page/section; it must not repeat the formula in UI/report code.

## Reference Examples and Independent Benchmark (Proposed)

### 1. Oriental Motor Co., Ltd. — "Belt and Pully" worked example (p. F-8) — primary reference example

`jp.oriental_motor.general_catalog_motor_fan_sizing@f-tecref-2003-2004`.
Directly re-verified by hand this session (see the source revision's own
registry note for the full arithmetic): `m1 = 30 lb` (belt + work),
`mu = 0.3`, `D = 4 in` (drum diameter — printed as "drum radius," a
labeling inconsistency in the source itself, used as a diameter throughout
its own arithmetic), `m2 = 35.27 oz` (drum/roller mass, both rollers
identical), `eta = 0.9`, `V = 7 in/s +/-10%`, geared `i = 50` (this
module's own `0.1.0` scope fixes `i = 1` instead — see "Validity Envelope"
above; the reference example itself validates the general formula, not
this module's own narrower scope).

Printed and hand-confirmed: `F = mu*m1 = 9 lb = 144 oz`,
`TL = F*D/(2*eta) = 320 oz-in`, `J1 (both rollers) = 141 oz-in^2`,
`J2 (belt+work) = 1920 oz-in^2` (`m1` converted to `480 oz` before
substitution — confirmed consistent with the document's own oz-based
convention, not an error). This is the stronger of the two worked examples
in this same source document (see item 2 below for the weaker one) and is
this module's own primary Stage 4 reference-example candidate.

### 2. Oriental Motor Co., Ltd. — "Conveyor" worked example (p. F-9) — secondary reference example, one unresolved figure

Same source, geared `i = 15`, brushless DC motor. `D = 4 in`,
`m1 = 2.2 lb` (roller mass), `m2 = 33 lb` (belt + work), `mu = 0.3`,
`eta = 0.9`. `Jm1 = 70.4 oz-in^2` hand-confirmed (same lb-to-oz conversion
as item 1, applied explicitly in this example's own printed arithmetic).
`Jm2 = 132 oz-in^2` as printed does **not** apply that same conversion
(`33` used directly rather than `528 oz`) — an unresolved inconsistency
against this example's own `Jm1` line and against item 1's own analogous
`J2` term; not resolved this session (this environment cannot render this
specific dense PDF page as an image to check directly — no `pdftoppm`, see
`context/progress-tracker.md` "Environment notes"). This example also
omits the idler roller's own inertia term entirely (see "Candidate Methods"
item 1 above) — kept as a secondary reference candidate specifically
*because* of that difference (useful for confirming the single-roller
special case separately from item 1's own two-roller general case), not
for its own unresolved `Jm2` figure, which Stage 3/4 should re-derive from
the formula and inputs directly rather than trust as printed.

### 3. Oriental Motor Co., Ltd. — "Variable Speed Belt Conveyor" blog example — final-answer cross-check only

`jp.oriental_motor.
variable_speed_belt_conveyor_sizing_example@web-2026-08-13`. States every
input (`100 lb` belt+load, `mu = 0.1`, `D = 12 in`, 4 pulleys, `eta = 0.9`,
two-speed `12`/`24 in/s` profile, `1 s` accel/decel, `Sf = 2`) and the
final results (`Load Inertia = 58,752 oz-in^2`, `Required Torque =
209.4 lb-in`) but not the intermediate formula steps — read via `WebFetch`
summarization, not a direct page image, the lowest-confidence of the three
(see the source revision's own registry note). Useful only to confirm this
module's own kernel produces a load inertia and required torque in the
right neighborhood for a fourth, independently-sourced scenario; not
precise enough to serve as a primary reference-example fixture the way item
1 is.

### 4. Independent benchmark

Cross-check this module's own kernel against Omron's own general conveyor
inertia/load-torque formulas (`jp.omron.
servo_motor_selection_guide@csm-tg-e-3-1`, pp. 8-9) — a structurally
independent second manufacturer source stating the identical formula
shape, the same "two sources agree on shape" independent-benchmark
treatment `ball-screw-motor-sizing@0.1.0`'s own `axis-load-cases`
comparison already used for its drive-force term. Both Oriental Motor
worked examples above (items 1-2) are themselves evidence this shape and
Omron's own restatement of it agree, since they are structurally the same
formula.

## Evidence Gaps and Verification Confidence

- **Directly read this session, high confidence:** Omron's own pp. 7-9
  (already-registered source, re-read at previously-unread pages) and the
  full 9-page Oriental Motor catalog Technical Reference document
  (newly registered this session, `jp.oriental_motor.
  general_catalog_motor_fan_sizing`), including hand-verifying every figure
  in item 1's own reference example.
- **p. F-9's own printed `Jm2` figure is an open, unresolved arithmetic
  question** (item 2 above) — needs a cleaner page render (blocked on this
  environment's missing `pdftoppm`) or a second independent copy of this
  same catalog document before Stage 4 can trust it as printed. Does not
  block Stage 2 — item 1's own fully-reconciled example is sufficient
  reference-example evidence to proceed.
- **The blog example (item 3) is read via `WebFetch` summarization only**,
  the same lower-confidence category `jp.oriental_motor.
  motor_sizing_basics_rms_torque` and `us.celera_motion.
  shunt_resistor_regenerative_braking` already carry in this project's
  source registry.
- **No source gives an inclined-conveyor formula or a repeating-cycle/RMS
  conveyor duty-cycle worked example.** Both are recorded as genuine,
  disclosed `0.1.0` scope exclusions (see "Purpose" and "Validity
  Envelope"), not gaps this document tried and failed to close — no search
  effort was spent hunting for either, since neither is needed to match the
  founder's own reported real-world gap (a horizontal, single-event,
  direct-drive conveyor).
- **This module's own `i = 1` scope narrowing relative to its own reference
  examples' `i = 50`/`i = 15`** is the specific resolution path ADR-0011
  itself anticipated, not an improvisation — see "Validity Envelope" above.

## Stage 2 Entry Criteria

1. Confirm the parameter-group prefix (`motor_sizing.direct_drive_
   conveyor.*`, following `ball-screw-motor-sizing@0.1.0`'s own
   per-mechanism-prefix precedent) and define each new parameter's exact
   value type, unit, and valid range — "Existing Parameter Review" above
   proposes the set but does not finalize IDs, symbols, or ranges.
2. Confirm the friction-coefficient parameter is genuinely new, not a reuse
   of `motion.axis.friction_coefficient` — item 2 above gives the reasoning
   (a different physical interface, a different typical value) but Stage 2
   is where this project's own "Confirm the exact engineering meaning"
   canonical-parameter rule (`context/code-standards.md`) formally applies
   it.
3. Confirm the `0.1.0` motion-input shape (item 3 above: a single
   accelerate/run/decelerate event) against a released parameter contract,
   and confirm the required-torque shape (item 5: one combined
   safety-factor check, not two separate margins).
4. Decide whether `i` (gear ratio) appears in the input schema fixed at `1`,
   or is simply absent from the schema entirely with the kernel's own
   internal formula hardcoding `i = 1` — both satisfy "Validity Envelope"
   above; Stage 2 picks one and records why.
5. New parameter-registry version release for whatever Stage 2 resolves
   above — no registry version is proposed by this document.

This module's own Stage 1 is now sourced and scoped enough to enter Stage 2;
the one open item that does not block that entry is p. F-9's own unresolved
`Jm2` figure (see "Evidence Gaps"), which is a Stage 4 reference-example
question, not a Stage 2 parameter-contract question.
