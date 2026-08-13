# Index-Table Motor Sizing Module — Stage 1 Engineering Specification

## Status

- Work unit: Milestone 6, Unit 6.6, the fifth and last mechanism module in
  the Motor Sizing Tool family
  (`context/adr/0011-motor-sizing-tool-architecture.md`), after
  `ball-screw-motor-sizing@0.1.0`,
  `direct-drive-conveyor-motor-sizing@0.1.0`,
  `rack-pinion-motor-sizing@0.1.0`, and
  `belt-pulley-drive-motor-sizing@0.1.0`.
- Proposed module ID: `index-table-motor-sizing`.
- Proposed category: `motor-sizing.index-table` (ADR-0011 "Phase scope").
- Proposed first released version: `0.1.0`.
- Date: 2026-08-13.

No released parameter, module version, calculation run, or validation
record is changed by this document.

## Purpose

Given a rotary index table's own table geometry and mass, any additional
mounted-load inertia, gear ratio, and a commanded single index move (a
fixed angle rotated in a fixed time from standstill back to standstill),
compute the **required** motor specifications: acceleration torque,
momentary (starting) torque, required torque with an engineer-supplied
safety factor, operating speed, required power, total reflected system
inertia, and inertia ratio. Required-spec values and pass/fail checks
against engineer-supplied margins only (ADR-0011 "Output scope"); no motor
catalog matching.

## Genuinely different in kind from every prior Motor Sizing Tool module

ADR-0011 "Phase scope" flagged this in advance: an index table is
**rotary/angular motion**, not a carriage translating along a linear axis.
Confirmed by both sources read this session, not merely assumed:

- **No `motion.axis.*` reuse.** `orientation`, `incline_angle`, `gravity`,
  `friction_coefficient`, and `total_moving_mass` all describe a linear
  carriage under gravity and Coulomb friction — a physical interface an
  index table does not have (the same "does not share a physical
  interface" reasoning `direct-drive-conveyor-motor-sizing@0.1.0` already
  established for its own non-reuse of `friction_coefficient`). This
  module's own parameter group is therefore entirely new, with no
  `motion.axis.*` inputs at all.
- **No linear-to-rotary radius conversion anywhere.** Every prior sibling
  converts a linear target velocity to an angular speed via a pulley/pinion
  radius (`omega = V/(D/2)`). An index table commands its motion **already
  in angular terms** — `index_angle` (rad) over `index_time` (s) — so no
  such conversion exists in this module's own motion step at all.
- **`load_torque` is an engineer-supplied INPUT, not a computed OUTPUT** —
  the one structural difference every other field in this spec otherwise
  keeps identical to the sibling family's own shape. See "The central
  finding" below.

## The central finding: two independent manufacturers both treat index-table load torque as zero, for the same reason

**Source 1 — Oriental Motor Co., Ltd.**, General Catalog *Technical
Reference* (`jp.oriental_motor.general_catalog_motor_fan_sizing@
f-tecref-2003-2004` — already registered for
`direct-drive-conveyor-motor-sizing@0.1.0`'s own belt-conveyor examples on
the same two pages), pp. F-8-F-9, "Index Table — Using Stepping Motors."
Read directly this session via a text-layer mirror
(`alaakhamis.org/teaching/SPC418/reading/Motor Sizing Calculations.pdf`,
the same printed document at a different host, since the officially
registered PDF cached in this repo is image-only and this environment has
no PDF-image renderer installed). Step (1) of its own "Calculate the
Required Torque TM" procedure states, verbatim:

> "Frictional load is omitted because it is negligible. Load torque is
> considered 0."

**Source 2 — AutomationDirect**, *SureServo Selection Appendix*
(`us.automationdirect.sureservo_selection_appendix@2nd-ed-rev-b-08-2011` —
already registered for `belt-pulley-drive-motor-sizing@0.1.0`'s own
reference example), pp. B-14-B-16, "Index Table - Example Calculations."
Its own Step 4 computes `Tmotor = Taccel + Trun = 12.38 + 0 = 12.38 lb-in`
— `Trun` (running/load torque) is set to `0` outright, with no formula
given for it anywhere in the document's own Table 1 (which does give
explicit running-torque formulas for a leadscrew, belt drive, and
rack-and-pinion).

**Neither source gives a load-torque formula for this mechanism at all** —
this is not two sources agreeing on a value, it is two independent
manufacturers each omitting the term entirely, for the same stated reason
(negligible bearing/rolling friction at an index table's own support
interface, corroborated by the pattern already visible across every other
mechanism in this project's own source material — see ADR-0011 "Phase
scope," which predicted exactly this evidence gap before either source was
read in full). This closes the "genuine evidence gap this module's own
Stage 1 spec must close against a second source before Stage 2" ADR-0011
itself flagged. **Resolution:** `load_torque` becomes a required-input
port with a `0 N*m` structural default (the same "default degrades
gracefully, engineer can override, not a guessed physical value" treatment
`belt_mass` already received in `belt-pulley-drive-motor-sizing@0.1.0`),
not a computed output — the one shape difference from every sibling
module's own `load_torque` output.

## Two worked examples, one fully reproducible, one partially

### AutomationDirect's own example (pp. B-14-B-16) — primary reference example, reproduced in full

Read directly this session (`pdftotext -layout` against the cached PDF —
clean, machine-readable text, not a scan). Inputs: index table diameter
`12 in`, thickness `3.25 in`, steel (`rho = 0.28 lb/in^3`), gear reducer
`6:1`, index angle `45 deg`, index time `0.5 s`, accel/decel period `25%`
of index time (`0.125 s`, printed rounded to `0.13 s`). Selected motor
SVM-220, `Jmotor = 0.014 lb-in-sec^2`.

Every printed figure hand-verified this session:

| Figure | Printed | Hand-recomputed (SI) |
| --- | --- | --- |
| `Jtable = (pi*L*rho*r^4)/(2g)` | `4.80 lb-in-sec^2` | `0.5432 kg*m^2` (matches within `0.03%`) |
| `Jtable_to_motor = Jtable/i^2` | `0.133 lb-in-sec^2` | `0.01507 kg*m^2` (matches within `0.3%`) |
| Motor-shaft operating speed | `121 rpm` | `120.0 rpm` using the table's own stated `25%` accel fraction computed exactly rather than the source's own further-rounded `0.13 s` intermediate (`< 1%` difference — see "A source-internal rounding-constant finding" below) |
| `Taccel` (final, with selected motor) | `13.68 lb-in` (`1.546 N*m`) | `1.67 N*m` using exact physics — see below |
| `Tmotor = Taccel + Trun` | `13.68 lb-in` (`Trun = 0`) | — |
| Inertia ratio | `9.5` | `9.52` (matches within `0.25%`) |

**A source-internal rounding-constant finding, disclosed and quantified,
not silently absorbed.** Every worked example in this document (leadscrew,
belt drive, index table) computes acceleration torque as
`Taccel = Jtotal * (speed[rpm]/time[s]) * 0.1` — a **rounded** constant
standing in for the exact `2*pi/60 = 0.10472` (confirmed by hand against
this same document's own Example 7, `Taccel = 0.002 * (600/0.05) * (2/60)`,
which uses the unrounded form and reproduces its own printed `2.5 lb-in`
figure exactly). Using the source's own printed intermediate values
(`121 rpm`, `0.13 s`) and its own rounded `0.1` constant reproduces its
own final `13.68 lb-in` figure exactly — `0.147 * (121/0.13) * 0.1 =
13.68`. This module's own kernel uses exact physics throughout (via
`lib/engine/mechanics`, no rounded stand-in constants), consistent with
every other module in this codebase — so its own `acceleration_torque`,
`momentary_torque`, and `required_torque` outputs are **not** claimed to
reproduce this source's own printed torque figures directly; the
`~8%` difference is fully explained by this one disclosed, quantified,
reapplied-at-the-test-level rounding choice (`~4.7%` from the `0.1` vs
`2*pi/60` constant alone, the remainder from the source's own further
rounding of `121 rpm`/`0.13 s`), not an unexplained residual or a defect
in this module's own math.

### Oriental Motor's own example (pp. F-8-F-9) — secondary source, partially reproduced

Read via the text-layer mirror (image-only in the officially registered
PDF). A richer scenario than AutomationDirect's: a steel table (`D =
300 mm`, `L = 10 mm`) **plus 12 discrete workpieces** mounted at a `125 mm`
radius from the table center (`D_workpiece = 40 mm`, `L_workpiece =
30 mm`, same steel density), through a `7.2:1` stepping-motor gearhead,
indexing `30 deg` in `0.3 s` (`25%` accel fraction, `0.075 s` — a clean
value with no further source-internal rounding this time).

**A genuine unit-convention difference between the two sources, disclosed
rather than silently reconciled:** this document's own `oz-in^2` inertia
figures are **mass-based** (`oz` used as a mass unit throughout this
chapter, confirmed by cross-checking its own printed conversion —
`2300 oz-in^2 = 4.2e-2 kg*m^2` on the same page implies exactly
`1 oz-in^2 = 1.829e-5 kg*m^2`, the pure `oz(mass)*in^2` conversion, with no
additional `/g` factor) — unlike AutomationDirect's own `lb-in-sec^2`
figures, which are explicitly **weight-based**, requiring the `/g` its own
formula shows. Both are legitimate, internally-consistent conventions;
conflating them without checking would silently corrupt a reproduction.

Every inertia and speed figure hand-verified this session (all within
source's own `3`-significant-figure rounding):

| Figure | Printed | Hand-recomputed (SI) |
| --- | --- | --- |
| `J_T = (pi/32)*rho*L_T*D_T^4` (table alone) | `3442 oz-in^2` | `0.06385 kg*m^2` vs. printed `0.06297 kg*m^2` (`1.4%`) |
| `J_W` (12 workpieces, parallel-axis, `JC+m*l^2` each) | `3118 oz-in^2` | `0.05747 kg*m^2` vs. printed `0.05704 kg*m^2` (`0.7%`) |
| `J_L = J_T + J_W` (table shaft, unreflected) | `6560 oz-in^2` | `0.1213 kg*m^2` vs. printed `0.1200 kg*m^2` (`1.1%`) |
| Table-shaft operating speed, `N = (60*theta)/(360*(t0-t1))` | `22.2 r/min` | `22.23 r/min` (`< 0.2%`) |

**Not reproduced, a disclosed scope limitation, not an oversight:** the
final acceleration-torque and required-torque figures. This example sizes
a **stepping motor**, whose own pulse-speed-based acceleration-torque
formula (`Ta = (J0+i^2*JL)/g * (pi*Nm/180) * (f2-f1)/t1`) is a materially
different convention from the continuous rad/s `Ta = J*alpha` this module
and every sibling uses, and the source page's own printed formula for this
one step is OCR-degraded past reliable hand-verification in this
environment (the mirror is a scanned/image PDF; several terms are not
cleanly legible). Reproducing the inertia and speed figures above — which
are the two evidence items this module's own Stage 1 spec actually needed
from a second source (closing the load-torque gap, and confirming the
formula-shape agreement on operating speed) — does not require resolving
that one step.

## Validity Envelope (Proposed)

- One rotary index table: one rigid, disk-shaped table rotating about its
  own axis, direct-connected or through a single fixed gear ratio. Any
  mounted workpieces/fixtures are represented as one combined
  engineer-supplied inertia value, not modeled as discrete geometry inside
  the module (the same "engineer supplies the resolved figure" treatment
  `belt-pulley-drive-motor-sizing@0.1.0`'s own `belt_mass` already
  established, extended here because a general point-load arrangement
  cannot be captured by one mass/radius pair the way a belt's own
  translating mass can).
- One index move: a single accelerate-decelerate-to-stop event from
  standstill back to standstill, covering a commanded angle in a commanded
  time — not a repeating duty cycle or multi-move sequence.
- `load_torque` is a required, engineer-supplied input defaulting to `0`
  — not computed by this module, per "The central finding" above.
- No motor catalog matching, no stepping-motor-specific pulse/resolution
  modeling (this module works directly in angle/time, not encoder counts
  — see "Existing Parameter Review" below).

## Existing Parameter Review

No `motion.axis.*` reuse (see "Genuinely different in kind" above) — the
first Motor Sizing Tool module with an entirely self-contained parameter
group.

New `motor_sizing.index_table.*`: `table_mass`, `table_diameter`,
`attached_load_inertia` (optional, default `0 kg*m^2`), `gear_ratio`
(optional, default `1`), `index_angle`, `index_time`, `acceleration_time`,
`load_torque` (optional, default `0 N*m`), `motor_rotor_inertia`,
`required_torque_safety_factor`, `inertia_ratio_maximum`. Outputs:
`table_inertia`, `load_inertia`, `reflected_load_inertia`,
`total_system_inertia`, `inertia_ratio`, `acceleration_torque`,
`momentary_torque`, `required_torque`, `operating_speed`,
`required_power`.

Minted new rather than reused from any sibling `motor_sizing.*` group for
the same meaning-scoping reason every module in this family already
applies: a table's own moment of inertia and a pulley's or pinion's are
the same *kind* of quantity but not the same parameter *meaning*, and this
module's own motion parameters (`index_angle`, `index_time`) have no
sibling analog at all (angular, not linear).

## Independent Benchmark

AutomationDirect's own Table 1 "Belt (or Gear) Reducer Equations"
(`Jtotal = Jmotor + Jmotorpulley + ((Jloadpulley+JLoad)/i^2)`) — the
general gear-reduction combining formula this document applies to any
reduced rotary load, index tables included — is implemented as a separate,
independently written computation and cross-checked against this module's
own kernel across a randomized property sweep, the same "structurally
separate reimplementation, proved identical" pattern every sibling
module's own independent benchmark already establishes.

## Stage 2 Entry Criteria

1. Primary formula identified and traced to two independent public
   sources — done.
2. The load-torque evidence gap ADR-0011 flagged closed against a second
   source — done (both sources independently omit it).
3. A publicly citable worked reference example located, hand-verified,
   and its own source-internal rounding convention disclosed — done.
4. Reuse-vs-new parameter decisions made (no `motion.axis.*` reuse,
   evidence-backed) — done.
5. Scope boundary against the sibling modules stated with evidence (no
   linear-to-rotary conversion; `load_torque` as input, not output) —
   done.
