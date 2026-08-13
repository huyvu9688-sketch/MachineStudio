# Rack-and-Pinion Motor Sizing Module — Stage 1 Engineering Specification

## Status

- Work unit: Milestone 6, Unit 6.4 (`context/implementation-map.md` "Units
  6.4 and later"), the third mechanism module in the Motor Sizing Tool
  family (`context/adr/0011-motor-sizing-tool-architecture.md`), after
  `ball-screw-motor-sizing@0.1.0` and
  `direct-drive-conveyor-motor-sizing@0.1.0` (both released 2026-08-13).
- Proposed module ID: `rack-pinion-motor-sizing`.
- Proposed category: `motor-sizing.rack-pinion` (ADR-0011 "Phase scope").
- Proposed first released version: `0.1.0`.
- Status: **Stage 1 in progress.** Founder-directed pick (2026-08-13):
  build the remaining ADR-0011 mechanisms in order, starting with
  rack-and-pinion because a real, redistribution-restricted reference PDF
  (`reference/source-material/Atlanta_Rack and Pinion Drive Calculations
  and Selection.pdf`, already registered as
  `us.atlanta_drive_systems.rack_pinion_calculations`, `access: "licensed"`)
  was already on hand from Unit 4.1's own validation work, giving this
  module a head start no other remaining mechanism has.
- Date: 2026-08-13.

No released parameter, module version, calculation run, or validation
record is changed by this document.

## Purpose

Given a rack-and-pinion linear axis's own pinion geometry and mass, total
moving mass, friction, orientation (horizontal, vertical, or inclined),
and a commanded single accelerate-to-speed motion event, compute the
**required** motor specifications a motor for that axis must meet: load
torque, acceleration torque, maximum momentary (starting) torque, required
torque with an engineer-supplied safety factor, operating speed, required
power, total reflected system inertia, and inertia ratio. Like
`ball-screw-motor-sizing@0.1.0` and
`direct-drive-conveyor-motor-sizing@0.1.0`, it reports required-spec
values and pass/fail checks against engineer-supplied margins — "the
engineer takes the number to the catalog" (ADR-0011 "Output scope"). **No
motor catalog matching, no rack/pinion gear-tooth strength check (root
bending fatigue, Hertzian pitting fatigue), and no part selection ships in
`0.1.0`.**

It will **not**:

- select a gearbox, coupling, drive/amplifier, or holding brake — those
  stay `coupling@0.1.0`'s, `support-bearing@0.1.0`'s, and
  `drive-train@0.1.0`'s own separate, already-released, optional
  post-motor-sizing steps (same scope note the two prior Motor Sizing Tool
  modules already make);
- check whether a specific rack/pinion module and tooth count can
  mechanically survive the computed tangential force (Atlanta's and
  Andantex's own torque-rating tables, "Candidate Methods and Sources"
  item 3 below) — that is a hardware-selection question, symmetric with
  `ball-screw@0.1.0`'s own separate screw-strength responsibility, not
  this module's;
- compute an effective (RMS) torque over a repeating duty cycle, or model
  a return/lowering move distinct from the one modeled move. Every source
  found this session for this specific mechanism (below) computes a
  single accelerate-to-speed event's own peak torque, never an RMS cycle
  — the same evidence-driven scope
  `direct-drive-conveyor-motor-sizing@0.1.0` already established, for the
  same reason (no source, not an assumption).

## Relationship to Existing and Planned Modules (Reuse Policy)

Per ADR-0011 "Reuse policy": this module reproduces, not imports, physics
already available in this codebase, and calls `lib/engine/mechanics`
directly for the one genuinely shared, source-independent piece (moment
of inertia, `alpha = delta_omega/t`, `Ta = J*alpha`) — the same treatment
both prior Motor Sizing Tool modules already established.

**This module is architecturally closer to `ball-screw-motor-sizing@
0.1.0` than to `direct-drive-conveyor-motor-sizing@0.1.0`, and the reuse
decisions below follow from that, not from copying either module's own
choices by default.** A rack-and-pinion axis is physically the same class
of mechanism as a ball-screw axis: one rigid carriage/table, rigidly
attached to the drive (a pinion meshing a fixed rack, instead of a nut
riding a screw), running on a linear guide. It is emphatically **not**
the conveyor's own mechanism class — nothing rides loose on top of a
moving surface. This has two direct, source-backed consequences:

1. **The general force-balance formula is identical in shape to
   `ball-screw-motor-sizing@0.1.0`'s own `resolveDriveForce`, and comes
   from the exact same primary source.** The already-registered
   `jp.oriental_motor.general_catalog_motor_fan_sizing` document (Section
   F, p. F-3, already fully read for Unit 6.3) prints, side by side on the
   same page: `Ball Screw: F = FA + m(sinα + μcosα) [oz.]` and `Wire Belt
   Mechanism, Rack and Pinion Mechanism: F = FA + m(sinα + μcosα) [oz.]`
   — the **same formula**, reused verbatim by the source itself for both
   mechanisms. `ball-screw-motor-sizing@0.1.0`'s own `resolveDriveForce`
   already reproduces this exact shape (`F = F_A + m*g*(sin(theta) +
   mu*cos(theta))`, SI mass/gravity form of the same weight-based
   formula). This module reproduces the identical relationship again
   (ADR-0011 "Reuse policy" — calculation code is never shared across
   mechanism modules, only the parameter IDs and the validated shape),
   not a new derivation.
2. **Therefore, the physical interface for friction, mass, orientation,
   and gravity is the same interface `ball-screw-motor-sizing@0.1.0`
   already reuses (`motion.axis.*`), not a new one.** This is the
   opposite conclusion from `direct-drive-conveyor-motor-sizing@0.1.0`'s
   own deliberate non-reuse of `motion.axis.friction_coefficient` — and
   for a documented, source-backed reason, not an inconsistency: a
   conveyor's friction is belt-surface-to-loose-load friction (measured
   at `mu=0.3` in both of that module's own worked examples); a
   rack-and-pinion axis's friction is carriage-to-guide sliding friction
   — the same physical interface `motion.axis.friction_coefficient`
   already models (`range: 0-1`, no source found this session for this
   mechanism exceeds that range). See "Existing Parameter Review" below.

**What genuinely differs from `ball-screw-motor-sizing@0.1.0`, evidence-driven, not assumed:**

| | `ball-screw-motor-sizing@0.1.0` | `rack-pinion-motor-sizing` (this module) |
| --- | --- | --- |
| Transmission element | Ball screw, lead `P`, ball-nut preload + internal friction | Pinion, pitch diameter `D`, no preload/internal-friction concept — a gear mesh has no equivalent to a ball-nut's own preload torque, and no source found this session models one |
| Motion | Full point-to-point cycle: forward move (always), optional return move, optional dwell | One accelerate-to-speed event only (below) — no source found for this mechanism specifically shows a return/dwell/RMS cycle, mirroring `direct-drive-conveyor-motor-sizing@0.1.0`'s own finding |
| Orientation | Horizontal / vertical / inclined | Horizontal / vertical / inclined — **unlike** the conveyor module (horizontal only); both Atlanta's and Andantex's own sources give a dedicated vertical-lifting formula variant, real evidence this mechanism needs orientation support |

This module does not reuse or depend on `ball-screw-motor-sizing@0.1.0`,
`direct-drive-conveyor-motor-sizing@0.1.0`, or any Milestone-4 discipline
module at the calculation-code level; like both, it is fully
self-contained. It reuses `motion.axis.*` parameter **IDs** the same way
`ball-screw-motor-sizing@0.1.0` already does — a graph-level fact
`cross-module-links.test.ts` will confirm and record honestly (Stage 5),
not a new dependency.

## Candidate Methods and Sources

### 1. Force and load torque — `jp.oriental_motor.general_catalog_motor_fan_sizing` (primary, public, already registered)

Section F, p. F-3, "Formulas for Calculating Load Torque," "Wire Belt
Mechanism, Rack and Pinion Mechanism":

```
TL = F/(2*pi*eta) * (pi*D/i) = F*D/(2*eta*i)   [oz-in]
F  = FA + m*(sin(alpha) + mu*cos(alpha))         [oz.]
```

where `D` is the pinion's own pitch diameter, `i` is the gear ratio
between motor and pinion, `eta` is mechanical efficiency, `FA` is an
external force, `m` is the moving weight, `mu` is the coefficient of
friction, `alpha` is the incline angle. Identical in shape to the same
page's own ball-screw formula (see "Relationship to Existing and Planned
Modules" above) with the screw's `P/(2*pi)` lead-to-radius conversion
replaced by the pinion's own `D/2` pitch radius — confirmed by inspection,
not assumed.

The already-registered `jp.oriental_motor.motor_sizing_calculations` web
page (used by `ball-screw-motor-sizing@0.1.0`) states the same formula
shape as a live, currently-hosted page, corroborating the printed catalog
chapter is not a stale or superseded formulation.

Neither Oriental Motor source contains a full worked numerical example
for rack-and-pinion specifically (both documents' own worked examples are
for ball screw, belt conveyor, and index table — confirmed by a full
read of the catalog document, Unit 6.3) — see "Reference Examples" below
for the resulting evidence gap.

### 2. Inertia — reused directly from `lib/engine/mechanics` (Unit 6.1)

Same treatment both prior Motor Sizing Tool modules already established:

- Pinion's own rotating inertia: `solidCylinderInertia` — `J = (1/8)*M*D^2`
  (Section F, p. F-3, "Inertia of a Cylinder," `Jx = (1/8)*m*D1^2`).
- The moving carriage's own linear-motion-equivalent inertia, reflected to
  the pinion shaft: `linearMotionInertia` with `travelPerRevolutionM =
  pi*D` (Section F, p. F-3, "Inertia of an Object in Linear Motion," `J =
  m*(A/(2*pi))^2`, the same general relationship already reused for the
  ball screw's lead and the conveyor's roller circumference).

### 3. Andantex USA, Inc. (Redex) — `us.andantex.modular_rack_pinion_system` (secondary, public, newly registered this session)

*Modular Rack & Pinion System*, "Selection & Calculations" (p. 62),
"Rack & Pinion Calculations & Selection" — a full symbolic
horizontal-translation/vertical-lifting procedure, independently
corroborating the same force shape:

```
Acceleration:        a = V/ta
Application force:   Fr = mu*M*g + M*a + F   (HORIZONTAL translation)
                      Fr = M*g + M*a + F      (VERTICAL lifting)
Application torque:  Tp = Fr*d/2000           [Nm, d in mm]
Design torque:       Td = Tp * S.F.
Max pinion speed:    Np = V*19100/d           [RPM, d in mm]
```

Verified by hand this session: `Fr` is algebraically identical to
Oriental Motor's own `F` (both reduce to `mu*M*g + M*a` horizontal /
`M*g + M*a` vertical, once `FA`/`F` external-force terms are matched and
Oriental Motor's own weight-based `m` is converted to Andantex's own
mass-based `M*g`), and `Tp = Fr*d/2` is the same `F*D/2` torque-at-radius
relationship (Andantex's own `eta` is folded into the rack/pinion
torque-rating table it compares `Td` against, rather than appearing as an
explicit divisor the way Oriental Motor's own formula states it —
recorded as a real, minor structural difference between the two sources'
own presentations, not a disagreement about the physics). `Tp/Fr` and the
`a=V/ta` single-ramp acceleration model both independently corroborate
`direct-drive-conveyor-motor-sizing@0.1.0`'s own finding that this class
of source treats acceleration as one ramp event, not a multi-phase cycle.
**No worked numerical example with real numbers** — this page is a
symbolic procedure/form, not a completed calculation (unlike Atlanta,
below).

`Tp = Fr*d/2` (a torque-at-pinion-radius relationship, no separate
inertia/acceleration-torque split) folds the carriage's own linear
acceleration force (`M*a`) directly into the tangential force before
converting to torque — verified by hand this session to be exactly
equivalent to this module's own `reflected linear inertia * angular
acceleration` relationship: `(M*r^2)*(a/r) = M*a*r`, algebraically
identical to `(M*a)*r`. Andantex's and Atlanta's own combined `Fr`/`Fu`
therefore correspond to this module's own `load_torque +
acceleration_torque` **sum** (the "load-only" and "acceleration-only"
split itself is this module's own decomposition, following the general
Oriental Motor `TM=(TL+Ta)*Sf` shape both prior modules already use, not
independently confirmed by Andantex's own combined figure) — see
"Reference Examples and Independent Benchmark" below.

### 4. Atlanta Drive Systems — `us.atlanta_drive_systems.rack_pinion_calculations` (internal benchmark only, licensed, already registered)

`reference/source-material/Atlanta_Rack and Pinion Drive Calculations and
Selection.pdf`, pp. C-53 through C-55. **Per the precedent
`axis-load-cases@0.1.0` already established for this exact document
(`validation/axis-load-cases/0.1.0.md`, `lib/modules/axis-load-cases/
0.1.0/atlanta-benchmark.ts`): used only as an internal, non-customer-facing
numerical benchmark. Never cited in `manifest.ts`'s own `sourceRevisionIds`,
never quoted in a trace or report, never redistributed** — its
`access: "licensed"` / "redistribution status is unresolved" registration
stands.

Two full worked numerical examples, hand-verified this session (exact
arithmetic reproduction, see below):

- **Travelling (horizontal, driving axle):** `m=820 kg`, `v=2 m/s`,
  `tb=1 s`, `mu=0.1`, `g=9.81 m/s^2` -> `a=2 m/s^2`, `Fu = (m*g*mu +
  m*a)/1000 = 2.44 kN` (hand-verified: `2.44442` kN, matches to printed
  rounding). `Fu_perm = Futab/(KA*SB*fn*LKHb) = 11.5/(1.5*1.2*1.05*1.5) =
  4.05 kN` (hardware-selection derating factors — out of this module's
  own scope, "Purpose" above).
- **Lifting (vertical):** `m=300 kg`, `v=1.08 m/s`, `tb=0.27 s`, `g=9.81
  m/s^2` -> `a=4 m/s^2`, `Fu = (m*g + m*a)/1000 = 4.1 kN` (hand-verified:
  `4.143` kN, matches to printed rounding). A genuine, disclosed
  source-internal inconsistency found this session: the printed
  `Fu_perm` calculation states `Futab=11.5 kN` in its own formula line but
  the preceding sentence states `Futab=12 kN`; hand-verifying both,
  `11.5/(1.2*1.2*1.1*1.2)=6.05 kN` and `12/(1.2*1.2*1.1*1.2)=6.31 kN`,
  neither matches the document's own two different printed results
  (`5.9 kN` in the formula line, `6.0 kN` in the condition line two lines
  later) exactly — a genuine internal rounding/transcription inconsistency
  in Atlanta's own document, not something this module needs to resolve
  (this figure is a hardware-selection derating check, out of scope
  regardless — "Purpose" above). Recorded for completeness, the same
  "confirm rather than silently trust" discipline
  `direct-drive-conveyor-motor-sizing@0.1.0`'s own p. F-9 finding already
  established.

Neither example computes a torque or an inertia figure at all — both stop
at the tangential force `Fu`, then move directly to a hardware-selection
derating check against a catalog `Futab` rating (module/tooth-count
torque-capacity tables, pp. C-53, C-64, C-40 etc.) — confirming, like
Andantex, that this document's own purpose is rack/pinion **hardware**
selection, not **motor** sizing (see "Purpose" above for why that check
stays out of `0.1.0`'s own scope). This module's own kernel converts
Atlanta's `Fu` to a pinion torque (`Fu*D/2`) for its own internal
benchmark comparison — a transform Atlanta's own document does not print,
verified by hand this session against Andantex's own `Tp=Fr*d/2`
relationship (same physics, independently corroborated).

## Validity Envelope (Proposed)

- One rack-and-pinion linear axis: one pinion (rack treated as
  infinitely rigid/massless — no source found this session gives the
  rack's own mass or inertia a term in any load-torque or inertia
  formula, unlike the conveyor's own idler roller and belt mass terms),
  one rigid carriage/load, direct-connected or through a single fixed
  gear ratio.
- One accelerate-to-speed motion event (below) — not a repeating duty
  cycle, not a return/lowering move.
- Horizontal, vertical, or inclined orientation
  (`0 <= incline_angle <= 90 deg`, reusing `motion.axis.orientation` /
  `motion.axis.incline_angle` directly).
- Self-contained per ADR-0011 "Reuse policy": reproduces, rather than
  imports, Oriental Motor Co., Ltd.'s and Andantex USA, Inc.'s own
  rack-and-pinion sizing methods. The one genuine import is
  `lib/engine/mechanics` (Unit 6.1).
- No rack/pinion gear-tooth mechanical-strength check (root bending
  fatigue, Hertzian pitting fatigue, permissible load inertia against a
  specific catalog gearhead) — a hardware-selection question symmetric
  with `ball-screw@0.1.0`'s own separate, already-released responsibility
  for the ball screw shaft itself; no equivalent `rack-pinion@0.1.0`
  module exists yet or is in this module's own scope.
- No motor catalog matching — `required_torque` and `required_power` are
  reported required-spec values, not pass/fail checks against a candidate
  motor.

## Existing Parameter Review

Reused directly, unchanged (`motion.axis.*`, the same interface
`ball-screw-motor-sizing@0.1.0` already reuses — see "Relationship to
Existing and Planned Modules" above for why this module's own physical
interface genuinely matches, unlike the conveyor's own belt-friction
case):

- `motion.axis.orientation` (enum: `horizontal`/`vertical`/`inclined`)
- `motion.axis.incline_angle` (`0-90 deg`)
- `motion.axis.gravity` (constant default `9.80665 m/s^2`)
- `motion.axis.friction_coefficient` (`0-1`, guide/seal sliding friction —
  the same physical interface, the same typical range; no source found
  this session for this mechanism exceeds `1`)
- `motion.axis.total_moving_mass` (carriage + payload + additional)

New, `motor_sizing.rack_pinion.*` (no existing parameter shares these
meanings — confirmed by search, the same discipline every released
parameter in this codebase already follows):

- `pinion_pitch_diameter` (`D`) — new; `screw.*`'s own diameter parameters
  are ball-screw-shaft-specific (a different geometric object), and no
  generic "drive-element pitch diameter" parameter exists yet.
- `pinion_mass` (`M_pinion`) — new, for the pinion's own rotating inertia
  (the `motor_sizing.ball_screw.screw_mass` analog).
- `gear_ratio` (`i`) — new. **Not** a reuse of `screw.gear_ratio`: that
  ID's own namespace and definition are scoped to ball/lead-screw
  mechanisms (`ball-screw-motor-sizing@0.1.0`'s own manifest reuses it
  specifically because the mechanism *is* a screw); a rack-and-pinion's
  own gear ratio is the same *kind* of quantity (a dimensionless
  motor-to-output speed ratio) but not the same parameter *meaning*
  (code-standards.md "Canonical Parameters": "confirm the exact
  engineering meaning" before reuse) — minted new, following the same
  "optional, constant default `1`" policy `screw.gear_ratio` already
  established, so a direct-drive rack-and-pinion (no gearbox) needs no
  extra input.
- `mechanical_efficiency` (`eta`) — new. Not a reuse of
  `screw.mechanical_efficiency` (ball-nut/screw-specific meaning); a
  rack-and-pinion gear mesh's own efficiency is a different physical
  interface with no established typical-value precedent shared with a
  ball screw's.
- `external_force` (`F_A`) — new, mirroring
  `motor_sizing.ball_screw.external_force`'s own "optional, constant
  default `0 N`" policy exactly (not a reuse of that ID itself — same
  meaning-scoping reasoning as `gear_ratio` above).
- `target_velocity` (`V`) — new, the conveyor's own `target_belt_speed`
  analog (single accelerate-to-speed event, "Candidate Methods" item 1/3
  above).
- `acceleration_time` (`t_A`) — new, the conveyor's own `acceleration_time`
  analog.
- `motor_rotor_inertia` (`J_M`) — new, the same role both prior modules'
  own `motor_rotor_inertia` already plays; not a reuse (each mechanism
  module mints its own, by established precedent — a motor rotor
  inertia's own meaning is generic, but code-standards.md's own "search
  existing definitions... confirm exact meaning" step, applied
  consistently, treats each mechanism's own catalog-figure input as a
  distinct parameter, matching `ball-screw-motor-sizing@0.1.0`'s own
  choice not to reuse `direct-drive-conveyor-motor-sizing@0.1.0`'s
  `motor_rotor_inertia` either).
- `required_torque_safety_factor` (`Sf`) — new, the conveyor's own single
  combined safety-factor analog (`>= 1`, no built-in default) — not two
  separate margins, since this module computes no RMS torque distinct
  from its own momentary torque (same "Candidate Methods" item 1/3
  finding as the conveyor).
- `inertia_ratio_maximum` (`R_Jmax`) — new, the same "required, no
  built-in default" precedent both prior modules already established.

Outputs, new `motor_sizing.rack_pinion.*` (mirroring
`motor_sizing.ball_screw.*`'s own naming exactly, since the composition
is the same — see "Candidate Methods" item 2 and the worked design below):

`pinion_inertia`, `load_inertia`, `reflected_load_inertia`,
`total_system_inertia`, `inertia_ratio`, `load_torque`,
`acceleration_torque`, `momentary_torque`, `required_torque`,
`operating_speed`, `required_power`.

## Checks and Warnings (Proposed)

One real check, mirroring both prior modules exactly: `inertia_ratio <=
inertia_ratio_maximum`. No motor-catalog check exists in `0.1.0` (ADR-0011
"Output scope").

## Trace Contract (Proposed)

Same section shape as `direct-drive-conveyor-motor-sizing@0.1.0`'s own
trace: inertia (pinion + reflected load + total + ratio); drive force and
load torque; motion and acceleration torque (single accelerate event);
momentary and required torque, plus the inertia-ratio check; a closing
validity-and-assumptions section. Cites `jp.oriental_motor.
general_catalog_motor_fan_sizing` and `us.andantex.
modular_rack_pinion_system` — never Atlanta (internal benchmark only, see
"Candidate Methods" item 4).

## Reference Examples and Independent Benchmark (Proposed)

**A genuine, disclosed evidence gap, the same kind of honest gap this
project already has precedent for handling (`direct-drive-conveyor-
motor-sizing@0.1.0`'s own p. F-9 inertia figure, `axis-load-cases@0.1.0`'s
own Atlanta-as-benchmark-not-reference-example treatment): no publicly
citable, redistributable worked numerical example specific to
rack-and-pinion motor sizing was found this session**, despite a real
search across Oriental Motor's own two rack-and-pinion-formula documents
(neither has a worked example for this specific mechanism — both give the
formula only), Andantex USA's own published selection procedure (formula
only, no worked numbers), and several additional web sources
(`linearmotiontips.com`, `insights.globalspec.com`, both returned HTTP 403;
`pages.rexelusa.com` covers screw and belt actuators, not rack-and-pinion,
with no worked numbers either; the already-registered Voss and HMK
engineering handbooks were checked for a rack-and-pinion/thrust-force
section and could not be rendered in this environment for this specific
section this session).

Proposed resolution, following the `axis-load-cases@0.1.0` precedent
directly:

1. **Independent benchmark (the primary Stage 4 evidence item this module
   can genuinely meet):** Atlanta's own two full worked numerical examples
   (travelling `m=820 kg`, lifting `m=300 kg`, "Candidate Methods" item 4
   above), reproduced through `executeModule` and checked against this
   module's own `load_torque + acceleration_torque` sum (converted from
   Atlanta's own `Fu` via `Fu*D/2`, algebraically justified by Andantex's
   own independently-published `Tp=Fr*d/2` relationship) — internal-only,
   never cited in `manifest.ts`/trace, matching how `axis-load-cases@
   0.1.0` already used this exact document.
2. **Formula-level corroboration (not a worked-example reproduction):**
   Oriental Motor's and Andantex's own published formulas, both publicly
   citable, independently agree on the force/torque shape (hand-verified
   this session — "Candidate Methods" items 1 and 3 above). This satisfies
   the "compare multiple independent sources" research goal even without
   a printed numerical example from either.
3. **No third reference-example item is claimed.** Stage 4's validation
   record will state this honestly, the same way `direct-drive-conveyor-
   motor-sizing@0.1.0`'s own validation record discloses which figures are
   and are not validated against a printed source, rather than silently
   presenting the Atlanta-benchmark reproduction as if it were an
   independently-citable published reference example.

## Evidence Gaps and Verification Confidence

- **No publicly-citable worked numerical example for rack-and-pinion
  motor sizing specifically** — disclosed above, resolved by treating
  Atlanta's own two examples as an internal benchmark (matching
  `axis-load-cases@0.1.0`'s own precedent) rather than overclaiming them
  as a citable reference example.
- **Andantex's own `Tp=Fr*d/2` formula does not show an explicit `eta`
  (efficiency) divisor** the way Oriental Motor's own `TL=F*D/(2*eta*i)`
  does — Andantex's own procedure instead compares the un-derated `Tp`
  directly against a catalog torque rating that presumably already
  accounts for mesh losses. This module's own kernel follows Oriental
  Motor's own explicit-efficiency form (consistent with both prior Motor
  Sizing Tool modules, which both require an explicit `mechanical_
  efficiency` input) — recorded as a real, minor structural difference
  between the two corroborating sources, not silently resolved by
  assuming they agree on every detail.
- **No inclined-axis worked example found** for this mechanism (Atlanta
  and Andantex both give horizontal/vertical only; Oriental Motor's own
  formula is general but demonstrates neither) — `0 < incline_angle <
  90 deg` will be supported by the general formula (validated at
  `theta=0` and `theta=90` only) but not validated end-to-end at an
  intermediate angle, the same disclosed limit
  `ball-screw-motor-sizing@0.1.0`'s own validation record already
  carries.
- **No rack mass/inertia term found in any source** — confirmed, not
  assumed: the rack itself is fixed (does not rotate or translate
  relative to the ground in the pinion's own reference frame the way an
  idler roller or a conveyor belt does), so it contributes no kinetic
  energy/inertia term to any formula in any of the four sources reviewed
  this session. Recorded as a confirmed absence, not an unexamined gap.

## Stage 2 Entry Criteria

All resolved:

1. Primary load-torque/force formula identified and traced to a public,
   already-registered source, cross-checked against a second independent
   public source (Oriental Motor, Andantex) — done.
2. Reuse-vs-new parameter decisions made and justified for every input,
   with the physical-interface reasoning stated explicitly (not merely
   "the prior module did X") — done ("Existing Parameter Review" above).
3. Motion/duty-cycle scope resolved with evidence, not assumption (single
   accelerate event, no RMS cycle, no return move) — done.
4. Orientation/incline scope resolved (supported, unlike the conveyor
   module, because two independent sources give a dedicated vertical
   formula) — done.
5. Independent-benchmark and reference-example evidence gap disclosed
   honestly with a concrete resolution plan, following an established
   project precedent rather than inventing a new one — done.

Stage 2 (parameter contract) is next.
