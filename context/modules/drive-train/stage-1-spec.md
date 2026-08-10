# Servo Drive-Train Module — Stage 1 Engineering Specification

## Status

- Work unit: Unit 4.7, Stage 1 — engineering specification and source intake
- Proposed module ID: `drive-train`
- Proposed first released version: `0.1.0`
- Status: **Stage 1 draft.** Every Phase 1B module (`ball-screw`, `linear-guide`,
  `coupling`, `support-bearing`) is now done through Stage 5, so this begins
  Phase 1C (`context/roadmap.md`) under the same parallel-specification
  allowance `context/ai-workflow-rules.md` already used for Units 4.2-4.6 —
  production release remains sequentially gated behind Unit 4.1's Definition
  of Done regardless of how far this document or a future package gets
  (`context/implementation-map.md` Milestone 4 header).
- Date: 2026-08-10

No released parameter, module version, calculation run, or validation record
is changed by this document.

## Purpose

Given a candidate servo motor's own catalog rating data (rated torque, peak/
maximum momentary torque, rated speed, rotor inertia) plus the drive torque,
rotational speed, and RMS-acceleration duty already resolved upstream
(`ball-screw`'s `screw.drive_torque`, `motion-profile`'s
`motion.profile.rms_acceleration`), check whether that specific motor is
viable for the axis over one full duty cycle: RMS ("effective") torque
against the motor's rated torque, peak (maximum momentary) torque against the
motor's own peak rating, required rotational speed against the motor's rated
speed, and reflected load-to-rotor inertia ratio against an engineer-supplied
limit. It also resolves the regenerative energy released during the duty
cycle's deceleration phases and checks it against a candidate drive's own
catalog absorption capacity. It reports required-spec / pass-fail-with-margin
results for a motor (and, optionally, a gearbox, drive, and holding brake)
the engineer has already identified by model — it does not search a catalog
and rank candidates, the same scope restriction every other Milestone 4
module already established (catalog matching is optional item 12 in
`context/roadmap.md`'s Module Definition of Done).

It will **not**, in `0.1.0`:

- select a servo motor, gearbox, drive, or brake from a catalog;
- check drive/amplifier current or voltage compatibility as a first-class
  `EngineeringValue` — this project's unit registry has no electrical-current
  base dimension yet, so Amperes cannot be expressed as a `Quantity` at all.
  See "A Generic-Engine Gap, Not a Module Decision" below;
- evaluate gearbox backlash, transmission error, torsional rigidity, or a
  computed mechanical life — every source read this session gives only
  typical catalog ranges by gearbox family (item 7), not a formula;
- evaluate a standalone holding-brake torque-capacity check (rated brake
  torque versus required holding torque with a safety margin) — no source
  read this session gives one; every source that treats a brake at all folds
  it into the RMS-torque duty cycle instead (item 9);
- perform environmental derating (ambient temperature, altitude, duty
  class) — no source read this session gives a formula, the same "reported,
  not evaluated" treatment other modules give quantities no source formalizes;
- model multiple axes sharing one DC bus or one regenerative resistor —
  every regenerative-energy source read models one axis's own deceleration
  event in isolation (item 10);
- reproduce a torque/speed performance curve (a motor's available torque as a
  function of operating speed, which several sources warn differs sharply
  from the flat rated-torque figure on a data sheet) — this module checks
  scalar rated/peak torque and rated speed against scalar requirements, not a
  curve-valued comparison. This project's parameter registry has no
  curve-valued parameter type in use yet (`ParameterValueType` in
  `lib/engine/parameters/types.ts` includes `curve`, but no released module
  uses it — the same "not bundled into a single module's parameter contract"
  treatment `lib/engine/parameters/README.md` v1.2 already gives table-valued
  parameters).

## Candidate Sources

Five sources were read this session (2026-08-10). Two attempted sources
(Kollmorgen, Yaskawa) returned HTTP 403 to every access method tried and are
recorded as blocked, not silently dropped.

1. **Omron Corporation**, *Technical Guide for Servo Motor Selection*
   (`CSM_Servo Selection_TG_E_3_1`) — already present in this repository as
   `reference/source-material/Servo Selection.pdf` (13 pages, read directly,
   page-image by page-image, all pages). Gives inertia formulas (including
   the ball-screw and gear-ratio-reflected forms), load-torque formulas
   (friction, external force, gear-ratio conversion), an
   acceleration/deceleration torque formula, a maximum-momentary/effective
   (RMS) torque formula, a full six-item "Result of Examination" check table
   (load inertia, effective torque, maximum momentary torque, maximum
   rotation speed, regenerative energy, encoder resolution), and **one
   complete worked numerical example** (a direct-connected ball-screw axis,
   OMNUC U-series motor R88M-U20030) reproducing every formula end to end.
   Explicitly states regenerative energy "please see the user manual of each
   product for the details" — no formula given, a documented source gap, not
   an oversight on this project's part. A live-hosted mirror of what appears
   to be the same guide family (same worked example, model R88M-U20030) exists
   at `ia.omron.com/data_pdf/guide/14/servo_selection_tg_e_1_1_3-13
   (further_info).pdf` under a different internal revision label (`1_1`
   versus the cached copy's own `3_1`) — direct fetch of that URL returned
   HTTP 403 this session; content instead read from the already-cached local
   copy. See `lib/standards/engineering-sources.ts`
   `"jp.omron.servo_motor_selection_guide@csm-tg-e-3-1"`.
2. **HMK** (a UK-based motion-control training/systems-integration company),
   *The HMK Guide to Sizing of Servo Motors and Amplifier*, Edition 2 -
   08/02, author C. Krajewski — fetched directly (`hmkdirect.com`, 23 pages,
   read in full, page-image by page-image, re-confirmed 2026-08-10 in a
   later session). Gives load-torque, friction-torque (including a "spring
   balance test" empirical measurement method), acceleration-torque, and
   RMS-torque formulas structurally identical to Omron's own; a dedicated
   section on RMS/peak **current** sizing for the amplifier (via the
   motor's own torque constant, Nm/Amp, including the Siemens 1FK6
   torque-curve worked illustration item 8 below cites); and a mechanical-
   transmission chapter with a **qualitative gearbox comparison table**
   (backlash, transmission error, torsional rigidity, efficiency, inertia,
   typical mechanical life by gearbox family — planetary/worm/helical).
   **Correction (2026-08-10):** an earlier draft of this document
   attributed a dedicated "Holding Brake and Motor Torque Requirements"
   section with two worked numerical examples to HMK. Re-reading HMK's own
   23-page PDF in full this session (page-image by page-image, every page)
   confirms **HMK's own table of contents has no holding-brake section at
   all**, and the document contains no worked numerical example of any
   kind — only the Siemens 1FK6 torque-curve figure (item 8) and formulas.
   That holding-brake content, with its two worked examples, belongs to
   Voss's own book, section 3.5.2 — already correctly attributed there in
   item 9 below; this entry's own prior text duplicated it in error. See
   `lib/standards/engineering-sources.ts`
   `"us.hmk.servo_motor_amplifier_sizing_guide@edition-2-0802"`.
3. **Wilfried Voss / Copperhill Technologies Corporation**, *A Comprehensible
   Guide to Servo Motor Sizing* (ISBN 978-0-9765116-1-8, Copyright 2007) — an
   independently authored technical book (not a single manufacturer's own
   branded method; the author built motor-sizing software and credits
   engineers from Baldor, GE Fanuc, Siemens, AC Tech/Lenze, Parker Hannifin,
   and Oriental Motor U.S.A. in the acknowledgments), fetched directly (154+
   pages; the RMS-torque, inertia-matching, and holding-brake sections read
   in full, page-image by page-image). Gives the same RMS-torque formula
   shape as Omron's and HMK's own, generalized with an explicit holding-
   torque/holding-time term; a **partial worked numerical example**
   confirming the formula (`T_RMS = sqrt((T_a²+T_d²)/(t_a+t_c+t_d+t_h)) =
   0.164 in-lb`, hand-verified against its own printed inputs); and cites
   **Bosch Rexroth's own inertia-mismatch guidance** as a third distinct
   numeric convention (`< 2:1` quick positioning, `< 5:1` moderate
   positioning, `< 10:1` quick velocity changes; the book's own general rule
   is `<= 6:1`, "some manufacturers state a maximum ratio of 10:1"). See
   `lib/standards/engineering-sources.ts`
   `"us.voss.comprehensible_guide_servo_motor_sizing@2007"`.
4. **Oriental Motor Co., Ltd.**, "Motor Sizing Basics Part 3: How to
   Calculate Speed, Acceleration Torque, and RMS Torque" (`blog.
   orientalmotor.com`, posted 2020-02-27, updated 2022-04-27) — read via
   `WebFetch`'s own text summarization, not direct page images (**lower
   confidence than items 1-3**; see "Evidence Gaps"). Gives the same RMS-
   torque formula shape again (a fourth independent confirmation of the
   shape), a **fourth distinct inertia-ratio convention** tiered by control
   technology (stepper 10:1 / closed-loop stepper 30:1 / auto-tuned servo
   50:1 / manual-tuned servo 100:1 — sharply looser than Voss's/Bosch
   Rexroth's own 6:1-10:1), and an "effective load safety factor" concept
   (`Trms/T_rated >= 1.5-2`) distinct from Omron's own flat 0.8 margin.
   Explicitly states it does not cover regenerative energy or holding-brake
   torque. Already the same manufacturer as the registered
   `jp.oriental_motor.motor_sizing_calculations` source (a different
   document/URL — this is a new `SourceDocument`). See
   `lib/standards/engineering-sources.ts`
   `"jp.oriental_motor.motor_sizing_basics_rms_torque@web-2026-08-10"`.
5. **Celera Motion (a Novanta company)**, "Sizing a Shunt Resistor for
   Regenerative Braking" (`novanta.com`, published 2020-05-05) — read via
   `WebFetch`'s own text summarization (**lower confidence**; see "Evidence
   Gaps"). Gives a resistor-sizing methodology (`R ~= 1.1*V_max/i_shunt`,
   average/peak power dissipation from total mechanical energy and
   deceleration frequency) built on an implicit, not explicitly restated,
   kinetic-energy term and an explicit "100% of deceleration energy goes to
   the shunt resistor" simplifying assumption — no efficiency or capacitor-
   absorption term, no worked numerical example. A second, independently
   phrased form of the same underlying kinetic-energy relationship
   (`E_RE = J_system * (N1^2 - N2^2) / 182`, Joules from `kg*m^2` and rpm)
   surfaced repeatedly across unattributed aggregator pages during the same
   search and was not traced to one specific manufacturer document this
   session — recorded as a widely-used industry form, not cited as a single
   source. See `lib/standards/engineering-sources.ts`
   `"us.celera_motion.shunt_resistor_regenerative_braking@web-2026-08-10"`.

**Blocked this session:** Kollmorgen's own *Application Sizing Guide*
(`kollmorgen.com/sites/default/files/public_downloads/
Application_Sizing_Guide_en-US.pdf`) and Yaskawa's own *Servo Motor Sizing
Concepts* (`yaskawa.com/delegate/getAttachment?documentId=PR.DN.01`) both
returned HTTP 403 to every access method tried this session (`WebFetch` and a
direct `curl` with a browser user agent) — bot protection returning an HTML
block page in place of the PDF, the same failure signature `tech.thk.com`
gave earlier in this project (`context/progress-tracker.md` "Environment
notes"). Neither has a confirmed working mirror yet; retry before assuming
either is permanently blocked, and prefer these two specifically if either
becomes reachable — both are established servo-drive manufacturers this
project has not yet cited, unlike Omron/Oriental Motor which this project
already has partial coverage of.

**A real asymmetry, recorded rather than glossed over:** unlike every other
Milestone 4 module, this session found *no* JP-market source with an
independent selection methodology distinct from Omron's own — Oriental
Motor's own blog post (item 4) confirms Omron's formula shape rather than
offering a structurally different one. Omron and Oriental Motor are both
Japanese manufacturers; HMK, Voss, and Celera Motion are all read via
English/US-facing presentation, the same "reached via the US/English site,
tagged US market as the pragmatic non-JP default" treatment `coupling`'s own
Stage 1 already gives Steinmeyer/KTR/R+W (`context/modules/coupling/
stage-1-spec.md` "Candidate Sources"). Whether a second, structurally
different JP-market servo-sizing methodology exists and is reachable is
unresolved, not ruled out — Mitsubishi Electric's own servo-amplifier PDF
(`us.mitsubishielectric.com`) was fetched this session but turned out to be a
torque/speed-curve data sheet, not a selection-methodology document.

### 1. Load torque at the motor shaft — already resolved upstream, no new formula needed

Every source's own "load torque converted to the motor shaft" formula is the
same shape: `T_L = T_W * G / eta` (Omron), where `T_W` is the torque at the
load (screw, pulley, etc.), `G` a gear/reduction ratio, and `eta` a gearbox
transmission efficiency. **This module does not need this formula as an
internal step.** `ball-screw 0.1.0` already exposes `screw.drive_torque`
(`normal`/`peak`, N*m) as a released output port, and its own kernel
(`lib/modules/ball-screw/0.1.0/math.ts` `resolveDriveTorque`) already divides
by `screw.gear_ratio` — the same reflection this item's formula performs.
See "A Real Gap Found in an Already-Released Kernel" below for a real,
previously undocumented consequence of exactly how it does this.

### 2. Acceleration/deceleration torque and total system inertia — three-source agreement

Omron, HMK, and Voss all give the identical shape:

```text
Omron:  T_A = (2*pi*N)/(60*t_A) * (J_M + J_L/eta)         (Nm)
HMK:    T = J * alpha                                      (Nm)
Voss:   T_a = J_system * alpha                              (Nm)
```

where `J_M`/`J_system` is the total inertia reflected to the motor shaft
(motor rotor + load, through any gearbox), and `alpha` the angular
acceleration. Reflected inertia through a gear ratio divides by the ratio
squared (HMK item 2.3.4: "the referred load inertia should not be more than
10 times the motor inertia... the reflected inertia is the load inertia
divided by the ratio squared" — the same `J_L/G^2` relationship Omron's own
`J_L = G^2*(J_W+J_2)+J_1` and this project's existing `coupling`
cross-module-link scope note already anticipate). All three sources agree
this is straightforward; no disagreement recorded.

### 3. RMS ("effective") torque over one duty cycle — four-source agreement on shape, real disagreement on margin

Omron, HMK, Voss, and Oriental Motor's own blog post all give the same shape
— square each phase's torque, weight by that phase's time, sum, divide by
total cycle time, take the square root:

```text
Omron:            Trms = sqrt((T1^2*t1 + T2^2*t2 + T3^2*t3) / (t1+t2+t3+t4))
HMK / Voss:        T_RMS = sqrt(((Ta+Tc)^2*ta + Tc^2*tc + (Td+Tc)^2*td + Th^2*th) / (ta+tc+td+th))
Oriental Motor:    Trms = sqrt((Ta^2*t1 + Tl^2*t2 + Td^2*t3) / (t1+t2+t3))
```

Omron's own form and Oriental Motor's own form are the same three-phase
shape (accelerate / constant / decelerate), with Omron folding a fourth,
zero-torque dwell segment (`t4`) into the denominator only. HMK's and Voss's
own form is a genuine, benign generalization: it separates a constant
"friction/gravity" torque `Tc` from each phase's inertial torque and adds an
explicit holding-torque/holding-time term (`Th`, `th`) for a standstill
period where a **motor**, not a brake, maintains position — the three-term
forms are the special case of the four-term form when `Th = 0`. **Genuine
disagreement: the safety margin applied to the check itself.** Omron's own
worked example checks `Trms < T_M * 0.8` (a flat 20% margin baked into the
check, applied identically to the maximum-momentary-torque check); Oriental
Motor's own blog states a distinct "effective load safety factor"
`Trms/T_M >= 1.5` to `2` (a 33-50%+ margin) as a *recommendation*, not a
pass/fail bound; HMK and Voss state no margin at all for this specific
check (HMK's own separate "Selection tip" instead recommends oversizing the
whole motor/drive package by 30% globally). Three genuinely different
numbers for what "enough margin" means, the same "agree on shape, disagree
on the exact factor" relationship this project's other modules already
treat as normal (e.g. `context/modules/linear-guide/stage-1-spec.md` item 3).

### 4. Peak (maximum momentary) torque — sourced, same margin disagreement as item 3

```text
Omron:  T1 = T_A + T_L    (Nm, the highest single-phase torque, algebraically summed)
```

checked against `T1 < T_M(max) * 0.8` in Omron's own worked example — the
identical 0.8 margin item 3 uses. HMK states "the short time peak torque of
a brushless motor may be between 3 and 6 times that of the rated torque...
it is usually safe to assume the motor can deliver two times rated torque at
rated speed" — a statement about how to *read a motor's own peak-capability
data*, not a required-versus-capability margin. No source gives a numeric
margin for this specific check distinct from item 3's own disagreement.

### 5. Inertia ratio — a real, five-way numeric disagreement

| Source | Convention |
| --- | --- |
| Omron (worked example) | `J_L <= J_M * 30` — but the "30" is itself a **per-motor-series catalog value**, footnoted "this value changes according to the Series," not a universal constant |
| Oriental Motor blog | Tiered by control technology: stepper 10:1 (5:1 for faster/smaller frames), closed-loop stepper 30:1, auto-tuned servo 50:1, manual-tuned servo 100:1 |
| HMK | "The referred load inertia should not be more than 10 times the motor inertia for high performance control" |
| Voss (general rule) | `<= 6:1`, footnoted "some manufacturers state a maximum ratio of 10:1" |
| Voss, citing Bosch Rexroth | Tiered by control objective: `< 2:1` quick positioning, `< 5:1` moderate positioning, `< 10:1` quick velocity changes |

Five sources, five different numeric conventions, spanning a 100x range
(2:1 to 100:1 for a "servo" motor specifically, ignoring the stepper-only
figures) depending on control technology, tuning method, and positioning
objective — a sharper disagreement than any prior module's own factor-table
mismatch found in this project. The strong candidate resolution, following
this project's own established precedent (`guide.static_safety_factor_
minimum`, `bearing.static_safety_factor_minimum`, `screw.buckling_safety_
margin`, `coupling.service_factor`), is a **required engineer-supplied
input with no built-in default** — not resolved here; a Stage 2 decision.

### 6. Rotational speed check — the same derivation pattern `coupling` already resolved

None of the sources read this session give a new formula here beyond
`N = 60*V/(P*G)` (Omron), which this project already implements —
`coupling 0.1.0` derives its own per-case rotational speed from
`motion.axis.case_linear_velocity`, `screw.lead`, and `screw.gear_ratio`
rather than reusing `screw.mean_rotational_speed` (a duty-cycle mean,
`context/modules/coupling/stage-2-contract.md` "Decisions" item 1). This
module needs the identical derivation for the identical reason (a per-case
peak/required speed, not a mean) — a strong candidate to reuse verbatim,
not resolved here.

### 7. Gearbox — reflected-inertia/torque pass-through already covered; efficiency and life are qualitative catalog data, not a formula

Item 2's reflected-inertia formula and item 1's `T_L = T_W*G/eta` formula are
the only formulas any source gives for a gearbox. Beyond that, HMK's own
table gives *typical, qualitative* ranges by gearbox family — not a
computable life or efficiency formula:

| Gearbox type | Backlash | Efficiency | Typical life (max. continuous load) |
| --- | --- | --- | --- |
| Planetary | 1-25 arcmin | 90-98% | ~20,000 hours |
| Worm | 20-30 arcmin | 80-90% (60% common when new) | ~2,000 hours |
| Helical | 20-30 arcmin | 80-90% | ~2,000 hours |

HMK: "we would advise the use of planetary gearboxes for high dynamic
applications," "gearbox life can vary between designs" (i.e., these are
illustrative, not authoritative, figures). No source gives a formula
relating gearbox life to applied torque, speed, or duty cycle the way
`screw.nominal_life`'s own L10 formula does for a ball screw. See item 7's
own overlap finding under "A Real Gap Found in an Already-Released Kernel."

### 8. Drive/amplifier current sizing — sourced formula, blocked by a missing generic-engine dimension

HMK gives the identical RMS/peak pattern as torque, applied to current:

```text
I_rms = sqrt((I1^2*t1 + I2^2*t2 + I3^2*t3) / C)      (Amps)
I = T / K_t                                            (Amps, K_t = torque constant, Nm/Amp)
```

with a worked illustration (torque constant `1.28 Nm/Amp`, `3 Nm` rated
torque needs `3.84 Amps`) that does **not** arithmetically reconcile with
the stated `Nm/Amp` unit (`3 Nm / 1.28 Nm/Amp` = `2.34 A`, not `3.84 A`; the
printed arithmetic instead multiplies, `3 * 1.28 = 3.84`) — recorded as an
apparent unit-label inconsistency in HMK's own document, not silently
corrected, the same "state the source's own numbers, flag the
inconsistency, do not invent a resolution" treatment this project gave
PMI's own printing error (`context/progress-tracker.md`, `linear-guide`
Stage 4 entry, "PMI's section 9.1.3 contains a printing error"). Also gives
amplifier peak-current headroom conventions ("most amplifiers have a
current limit which is twice that of the RMS current," specific Siemens/IRT
examples: "3x rated current for 250ms, cycle 1s," "2x rated current for
0.5s"). **Not implementable in `0.1.0` for a reason independent of the
formula itself:** this project's unit registry (`lib/engine/units/
dimension.ts`) fixes exactly five base dimensions — length, mass, time,
temperature, angle — with no electrical-current dimension. See "A
Generic-Engine Gap, Not a Module Decision" below.

### 9. Holding brake — no source gives a standalone catalog-torque check; the sourced treatment folds it into item 3's own RMS torque instead

Voss's own dedicated section (3.5.2, two full worked examples, hand-verified
this session) treats a holding brake purely as a **motor-torque-reduction
decision**: without a brake, the motor itself must maintain a nonzero
holding torque during every dwell period of a vertical/inclined axis
(gravity-driven), which raises `Trms` per item 3's own formula; with a
brake applied at standstill, that dwell segment's torque drops to zero,
lowering `Trms` (Voss's own example: 0.016 -> 0.014 in-lb, a 12.5%
reduction) — "the final decision to apply a holding brake should only be
based on calculating the torque requirements... of all possible motor/brake
combinations and then select the motor according to the lowest torque
requirements." **No source read this session gives a "rated static brake
torque >= required holding torque * safety factor" catalog-comparison
formula** the way a coupling's torque-capacity check or a bearing's static
safety factor works — Omron's own six-item check table has no brake-torque
line at all (only encoder resolution, inertia, effective torque, momentary
torque, rotation speed, regenerative energy); HMK's brake coverage (item 7's
own table row) is limited to gearbox-adjacent mechanical properties, not a
motor brake. A real, sourced, honest gap — not a skipped step.

### 10. Regenerative energy — a standard physics formula, sourced resistor-sizing extension, and Omron's own explicit deferral

The underlying relationship is ordinary kinetic energy, `E = (1/2)*J*omega^2`,
applied to the *change* in speed during a deceleration phase — restated
independently across sources in rpm-based form as
`E_RE = J_system * (N1^2 - N2^2) / 182` (item 5 of "Candidate Sources").
Celera Motion's own resistor-sizing extension (item 5) adds an explicit,
stated simplifying assumption ("100% of deceleration energy goes to the
shunt resistor" — no drive-electronics efficiency loss or DC-bus capacitor
absorption term) and a resistor/power-rating methodology on top:
`R ~= 1.1*V_max/i_shunt`, `P_avg = E_mechanical * (decel cycles/second)`,
`P_peak = max(E_mechanical/t_decel, V_max^2/R)`. **Omron's own guide, read
directly and in full, explicitly declines to give a formula at all**: its
own six-item check table lists "Regenerative Energy <= Regenerative Energy
Absorption of a motor," with the reference column reading "please see the
user manual of each product for the details on calculation of the
regenerative energy" — a documented source gap in the primary manufacturer
document itself, not this project's own omission.

## A Real Gap Found in an Already-Released Kernel

Reading `ball-screw 0.1.0`'s own `resolveDriveTorque`
(`lib/modules/ball-screw/0.1.0/math.ts`) against item 1's own `T_L = T_W*G/
eta` formula found a real, previously undocumented consequence of how it is
implemented:

```ts
const driveTermNm = (axialForceN * leadM) / (2 * Math.PI * efficiency);
const preloadFrictionTermNm = (internalFrictionCoefficient * preloadN * leadM) / (2 * Math.PI);
loadTorqueNm = (driveTermNm + preloadFrictionTermNm) / gearRatio;
```

`efficiency` here is `screw.mechanical_efficiency` — the **ball screw's own**
internal mechanical efficiency (nut/screw friction converting rotary motion
to linear thrust; source: "typically 0.85-0.95"). `gearRatio` is `screw.
gear_ratio` — "gear ratio between the screw and the driving shaft... 1 for a
direct-connected screw with no reduction in between." **No separate
efficiency factor is applied to the gear-ratio reduction itself.** This
means: whenever `screw.gear_ratio != 1` (a gearbox is declared between the
motor and the screw), `screw.drive_torque` is computed as if that gearbox
were 100% efficient — HMK's own catalog data (item 7 above) states real
gearbox efficiency ranges from 60% (a new worm gearbox) to 98% (a planetary
gearbox), never 100%. This is not a defect in `ball-screw 0.1.0` — its own
Stage 1/2 never claimed to model a gearbox's own transmission loss, only the
ball screw's — but it is a real, concrete gap this module inherits directly:
`screw.drive_torque` alone cannot be treated as "the true required motor-
shaft torque including gearbox losses" without an additional derating factor
this project has never released a parameter for. **Not resolved here** —
Stage 2 must decide whether `drive-train` applies its own gearbox-efficiency
divisor on top of the already-resolved `screw.drive_torque` (double-checking
against `screw.gear_ratio`'s own value, or reusing it directly with a new
efficiency-only parameter), or whether this is instead a future amendment
to `ball-screw` itself. Either way, the two efficiency factors — ball-screw
internal efficiency and gearbox transmission efficiency — are physically
distinct and must not be conflated into one parameter, the same "never infer
force from mass or mass from force" rigor `context/code-standards.md`
already requires generally.

## A Generic-Engine Gap, Not a Module Decision

Item 8's own current-sizing formulas are real and sourced, but this
project's unit registry (`lib/engine/units/dimension.ts`) models physical
dimensions as exponents over exactly five fixed base dimensions — length,
mass, time, temperature, angle. Electrical current (the SI base quantity
Ampere) is not among them, and none of the existing dimensions (`torque`,
`power`, `force`, etc.) can substitute for it dimensionally. This means
Amperes cannot be expressed as a `Quantity` today, and `context/code-
standards.md`'s own rule ("Module interfaces accept and return
`EngineeringValue`, never a bare physical number") forbids working around
this with a plain number. **Adding a sixth base dimension is a generic
calculation-infrastructure change** (`lib/engine/`), not a module-specific
decision — `context/ai-workflow-rules.md`'s own Split Rules already name
almost this exact situation ("A new generic framework capability and
production module behavior" must be split into separate work units), and
`lib/engine/parameters/README.md`'s own v1.2 note records the identical
pattern for a different missing capability: "the registry has no
`table`-valued parameter support yet... adding that is a separate
generic-platform capability, not bundled into a single module's parameter
contract." Drive/amplifier current sizing stays out of `0.1.0` until that
prerequisite exists, tracked here rather than silently dropped.

## The RMS-Acceleration Dependency Question

`motion.profile.rms_acceleration` (registry v1.2) was added specifically so
"a downstream module (the servo drive-train module, Unit 4.7) scales
[it] by its own inertia/friction model into RMS torque" (`lib/engine/
parameters/README.md`). Checking that claim against item 3's own sourced
formula surfaces a real question, not just a unit conversion:

If motor-shaft torque decomposes as `T(t) = J_total*a(t)/k + T_load` (`a(t)`
the signed motor-shaft angular acceleration profile, `T_load` a torque
component — friction, gravity, external force — held **constant** across
the whole cycle, matching `screw.drive_torque`'s own per-case, not
per-phase, granularity), then:

```text
Trms^2 = mean(T(t)^2) = (J_total/k)^2 * mean(a(t)^2) + 2*(J_total/k)*T_load*mean(a(t)) + T_load^2
```

`mean(a(t)^2)` is exactly `a_rms^2` — the port that already exists. But the
cross term needs `mean(a(t))`, the **signed time-average** of acceleration —
a different quantity than an RMS magnitude, and not a released port. The
cross term is **not generally zero** — except that for any complete,
repeating duty cycle (velocity returns to its starting value at the cycle's
end, which is what "one motion cycle" already means by definition), the
time-average of acceleration over that cycle is exactly zero: `mean(a(t)) =
(1/T)*integral(a(t)dt) = (1/T)*(v(T) - v(0)) = 0`. Under that condition (plus
`J_total` and `T_load` both staying constant across the cycle — the second
of which `screw.drive_torque`'s own per-case granularity already
guarantees), the cross term vanishes and `Trms^2 = (J_total/k)^2*a_rms^2 +
T_load^2` exactly — meaning `motion.profile.rms_acceleration` genuinely is
sufficient, with no missing port. **This derivation is this document's own
reasoning, not stated by any source read this session** — it is offered as
a candidate resolution to record and verify (ideally with a property test
against the actual kernel once one exists), not as an already-confirmed
fact, the same caution this project already applies to its own derived
claims elsewhere. If a future duty-cycle shape breaks the "returns to its
starting velocity" premise (unlikely for a repeating cycle by definition,
but worth stating explicitly), this identity would need re-deriving.

**Verified 2026-08-10, both as a property and against a real counter-case.**
`lib/modules/drive-train/0.1.0/closed-cycle-benchmark.ts` confirms the
identity holds to floating-point precision across synthetic repeating
cycles (and diverges on a non-repeating one, proving the "returns to its
starting velocity" precondition is load-bearing). Separately, THK Co.,
Ltd.'s own "Vertical Conveyance System" worked example (see "Evidence Gaps
and Verification Confidence" below) is a real, sourced case where the
*other* precondition this derivation states — `T_load` constant across the
whole cycle — genuinely fails: its own load torque differs between the
upward (900 N*mm) and downward (830 N*mm) halves of the duty cycle, and its
stationary phase carries a nonzero holding torque (658 N*mm) rather than
`T_load` or zero. Feeding that example's own real inputs through the actual
closed-form kernel overstates the true effective torque by roughly 21% —
confirming this derivation's own stated precondition is not just a
technicality: a vertical/asymmetric-holding duty cycle is a real case where
it does not hold, not a hypothetical one. `0.1.0` does not attempt to model
this; it is a documented scope limit (`lib/modules/drive-train/0.1.0/
validation.ts` "deviations"), a candidate for a future version once a
per-phase (rather than per-case) load-torque input exists.

## Validity Envelope (Proposed)

- **One motor, on one axis, per declared load case** (`normal`/`peak`,
  matching every other Milestone 4 module's own scope restriction — no
  supported upstream `holding`/`emergency_stop` drive torque exists yet).
- **RMS torque, peak torque, speed, and inertia ratio are evaluated checks.**
  The RMS-torque and peak-torque margins (item 3/4) and the inertia-ratio
  limit (item 5) are **required inputs with no built-in default** — the
  same "required input, neither table adopted" treatment `guide.static_
  safety_factor_minimum`, `bearing.static_safety_factor_minimum`, and
  `coupling.service_factor` already received, now for a sharper disagreement
  than any of those three found.
- **Regenerative energy is an evaluated check** against a candidate drive's
  own catalog absorption-capacity value, using the standard kinetic-energy
  relationship (item 10) — no efficiency or capacitor-absorption loss term,
  matching Celera Motion's own stated simplifying assumption, recorded as an
  assumption on every calculation, not silently applied.
- **Gearbox ratio and reflected inertia are computed** (item 2); gearbox
  efficiency, backlash, transmission error, torsional rigidity, and life are
  **reported catalog values, not evaluated checks** (item 7) — the same
  "reported, not evaluated" treatment `linear-guide` gives preload grade and
  `coupling` gives torsional stiffness and moment of inertia.
- **Holding-brake rated torque is a reported catalog value, not an evaluated
  check** (item 9) — no source gives a standalone comparison formula; its
  effect on the motor is already captured through item 3's own RMS-torque
  duty cycle (the `Th`/`th` terms), which is where a future version could
  wire it in as an input, not a separate pass/fail check.
- **Drive/amplifier current and voltage compatibility are out of scope
  entirely** in `0.1.0` — blocked on a missing unit-registry base dimension,
  not a module design choice (see "A Generic-Engine Gap, Not a Module
  Decision").
- **No environmental derating, no torque/speed-curve comparison, no
  multi-axis shared-bus regenerative modeling** — see "Purpose" above.

## Existing Parameter Review

Already released and directly reusable, pending a real Stage 2 design
decision (see "Stage 2 Entry Criteria"):

| Purpose | Parameter | Note |
| --- | --- | --- |
| Required torque at the motor shaft, per case | `screw.drive_torque` | Already the fully motor-shaft-converted value (item 1) — no re-derivation needed. Does not account for a gearbox's own transmission efficiency (see "A Real Gap Found in an Already-Released Kernel"). |
| Gear ratio between motor and screw | `screw.gear_ratio` | Its own definition already anticipates this reuse: "A future drive-train module (Unit 4.7) may reuse or supersede this parameter." Reusing it directly (rather than a new `drive.gear_ratio`) avoids double-counting the same physical ratio. |
| Cycle-level RMS torque demand, acceleration component | `motion.profile.rms_acceleration` | Sufficient for item 3's own RMS-torque formula under the closed-cycle argument above — not yet independently verified against a kernel. |
| Per-case rotational speed derivation inputs | `motion.axis.case_linear_velocity`, `screw.lead`, `screw.gear_ratio` | The exact combination `coupling 0.1.0` already resolved for the identical need (item 6) — a strong candidate to reuse verbatim. |
| Peak/max acceleration and deceleration | `motion.profile.peak_acceleration`, `motion.profile.peak_deceleration` | Candidate inputs for item 4's own peak-torque formula (`T_A = J*alpha`), alongside a resolved total system inertia. |

**A real overlap question, not resolved here:** `screw.mechanical_
efficiency` ("mechanical efficiency of the ball-screw drive") and a future
gearbox-efficiency parameter this module would need are physically distinct
quantities that happen to share a dimension (`ratio`) and a similar name —
Stage 2 must give the new parameter a name and definition that cannot be
confused with the existing one, per `context/code-standards.md`'s own
overlap-analysis requirement.

Everything else this module needs is new — no `drive.*` parameter namespace
exists yet (`grep` of `lib/engine/parameters/definitions.ts` confirms zero
`id: "drive.*"` entries as of this document; `lib/engine/parameters/
definitions.ts`'s own top-of-file comment already calls out "the drive-train
parameter group" as deliberately not yet released). A Stage 2 registry
proposal would need at least:

- Catalog/rating inputs: motor rated torque, motor peak (maximum momentary)
  torque, motor rated speed, motor rotor inertia; optional gearbox ratio
  and efficiency (distinct from `screw.gear_ratio`/`screw.mechanical_
  efficiency` per the overlap question above, or a decision to reuse them);
  optional holding-brake rated static torque (reported only); optional
  drive regenerative-energy absorption capacity.
- Margin/limit inputs, required with no built-in default: RMS-torque safety
  margin, peak-torque safety margin, maximum inertia ratio (items 3-5).
- Outputs: RMS torque and its check result, peak torque and its check
  result, inertia ratio and its check result, speed check result, total
  reflected system inertia (reported), regenerative energy and its check
  result.

## Checks (Proposed)

- Invalid input: non-positive motor rated torque, peak torque, rated speed,
  or rotor inertia; non-finite gear ratio, efficiency, or margin input;
  margin/limit inputs outside their physically meaningful range (e.g. a
  safety margin `<= 0`).
- RMS torque: item 3's formula against the motor's own rated torque, scaled
  by the engineer-supplied margin — fail if exceeded.
- Peak torque: item 4's formula against the motor's own peak (maximum
  momentary) torque, scaled by the engineer-supplied margin — fail if
  exceeded.
- Inertia ratio: reflected load inertia divided by motor rotor inertia,
  against the engineer-supplied maximum ratio — fail if exceeded.
- Speed: the resolved per-case rotational speed (item 6) against the motor's
  own rated speed — fail if exceeded.
- Regenerative energy: item 10's formula against the drive's own catalog
  absorption capacity — fail if exceeded, when a drive is declared.

## Trace Contract (Proposed)

Mirroring the established pattern (`context/modules/ball-screw/
stage-1-spec.md`, `context/modules/coupling/stage-1-spec.md`):

1. `reflected-inertia` — motor rotor inertia, load inertia reflected through
   the gear ratio, and the total (item 2)
2. `acceleration-torque-<case>` — item 2's formula, per case
3. `rms-torque-<case>` — item 3's formula and its margin-scaled check
4. `peak-torque-<case>` — item 4's formula and its margin-scaled check
5. `inertia-ratio-check` — item 5's ratio and its check
6. `speed-check-<case>` — item 6's resolved speed and its check
7. `regenerative-energy-<case>` — item 10's formula and its check, when a
   drive is declared
8. `gearbox-properties` — reported gearbox ratio, efficiency, and catalog
   life/backlash data (informational; item 7)
9. `brake-properties` — reported holding-brake rated torque (informational;
   item 9)
10. `validity-and-assumptions` — motor/gearbox/drive/brake model identity,
    load-case scope, the closed-cycle assumption behind the RMS-torque
    derivation above, the 100%-efficient-regenerative-path assumption

Each formula step cites its registered source revision and exact
page/section; it must not repeat the formula in UI/report code.

## Evidence Gaps and Verification Confidence

- **Directly read this session, high confidence:** Omron's own 13-page PDF
  (all pages) and HMK's own 23-page PDF (all pages) — both read page-image
  by page-image, the same "a multi-term formula set is exactly the kind of
  content a first-pass read can get subtly wrong" concern already recorded
  elsewhere in this project. Omron's own worked example (R88M-U20030) was
  hand-verified this session: `J_B`, `J_L`, and the final `Trms = 0.0828
  N*m` figure were independently recomputed from the source's own printed
  inputs and matched to the printed precision.
- **Directly read this session, high confidence:** Voss's own book, the
  sections covering RMS torque, inertia matching, and the holding-brake
  worked examples (roughly 30 pages across three ranges) — read page-image
  by page-image. Its own partial worked example (`T_RMS = 0.164 in-lb`) was
  hand-verified this session and matched.
- **Read via `WebFetch` text summarization, lower confidence:** Oriental
  Motor's own blog post (item 4) and Celera Motion's own technical paper
  (item 5) — an intermediary model's summary of the page content, not
  directly viewed page images. The formulas quoted are consistent with the
  higher-confidence sources' own shapes (a corroborating signal), but
  neither has been independently re-verified against the original page the
  way Omron's and Voss's own worked examples were. Re-fetch and read
  directly before a released module cites either for a formula this
  project has not already confirmed elsewhere.
- **Not attempted successfully this session:** Kollmorgen's own *Application
  Sizing Guide* and Yaskawa's own *Servo Motor Sizing Concepts* — both
  blocked (see "Candidate Sources"). Neither Mitsubishi Electric's own PDF
  (a torque/speed-curve data sheet, not a methodology document) nor a
  second genuinely JP-market selection-methodology source (as opposed to
  Omron's own, already covered) was found this session.
- **Re-verified in a later session (2026-08-10), a real finding, not a
  research gap:** none of Voss's, HMK's, or Oriental Motor's own worked/
  partial examples can supply a second Stage 4 reference example
  (`context/ai-workflow-rules.md`'s own executeModule-level standard, the
  same one `omron-reference-example.ts` meets). Voss's own disk-load RMS-
  torque example (item 3) never selects or checks against a real catalog
  motor — Section 3.4 "Motor Selection" that follows it stays qualitative
  (torque/speed-curve figures, no worked numbers), and Voss's own
  holding-brake examples (item 9) are stated by the book itself to be
  "admittedly fabricated" for demonstration and explicitly exclude motor
  inertia. HMK's own document has no worked numerical example anywhere
  (re-confirmed reading all 23 pages this session) beyond the Siemens 1FK6
  torque-curve figure item 8 already cites. Oriental Motor's own blog post
  (item 4) stops short in the identical way Voss's does: "tentatively
  select a motor" without ever naming one or stating its rotor inertia,
  rated torque, or rated speed. Kollmorgen's and Yaskawa's own guides
  remain blocked (HTTP 403, retried this session, and via a Wayback Machine
  attempt this environment's `WebFetch` cannot reach at all).
- **A sixth source found and directly read this same later session, ruled
  out for a sharper reason than "incomplete":** Oriental Motor's own
  official *Technical Reference: Motor Sizing Calculations*
  (`orientalmotor.com/products/pdfs/F_TecRef/TecMtrSiz.pdf`, pages F-2
  through F-10, read directly, page-image by page-image) — a different,
  far richer document than the blog post already cited (item 4), with
  several genuinely catalog-tied worked examples (real part numbers: motor
  `5RK40GN-AWMU` + gearhead `5GN9KA` for a vertical ball-screw axis; motor
  `5IK40GN-AWU` + gearhead `5GN50KA` for a belt conveyor; motor
  `BX5120A-15` for another conveyor). Chasing `5RK40GN-AWMU`'s own full
  catalog spec sheet (`orientalmotor.com/products/pdfs/A_OM/EBrk40.pdf`)
  found its real rated torque (38 oz-in / 270 mN*m), starting torque
  (36 oz-in / 260 mN*m), and rated speed (1450 r/min). **The starting
  torque is lower than the rated torque** — normal for this motor class (a
  single-phase AC induction motor with an electromagnetic brake), but it
  means this source's own "safety margin 2x on required torque vs.
  starting torque" convention is not the same physical check as this
  module's `peak_torque_margin` (a servo's short-term overload capability,
  typically 2-6x rated per HMK/Voss — Omron's own example: peak 1.91 N*m
  vs. rated 0.637 N*m, a ~3x ratio). Every worked example in this document
  uses the identical induction/stepper-motor sizing convention (a single
  accel/decel move plus a flat safety factor, not an RMS torque computed
  over a multi-phase duty cycle the way item 3's own formula and this
  module's `resolveEffectiveTorque` require) for a fundamentally different
  motor technology than the servo motors this module's own validity
  envelope targets. Reusing one of these examples would mean conflating
  two physically distinct torque-margin conventions across motor classes —
  the same "must not be confused" overlap-analysis rigor this document's
  own "Existing Parameter Review" already applies to `screw.mechanical_
  efficiency` versus a future gearbox-efficiency parameter. Not a data gap
  this time; a genuine methodology mismatch.
- **Resolved (2026-08-10, a later session still): a seventh source closed
  the reference-example gap, and it was already on file for a different
  reason.** `jp.thk.example_ball_screw_selection` — the THK Ball Screw
  General Catalog document `axis-load-cases 0.1.0` and `ball-screw 0.1.0`
  already cite for its own mechanical (screw/life) sections — has its own
  "Studying the Driving Motor" subsection immediately following each of its
  two worked examples, which those two modules' own scope never needed to
  read. Both examples explicitly name "AC servo motor" throughout (not the
  induction/stepper convention item above ruled out) and decompose required
  torque into the identical two-term shape (friction/load-only torque plus
  a separate inertial acceleration torque, summed for the maximum momentary
  torque) this module's own `math.ts` kernel already uses. Read directly
  2026-08-10 via a technico.com mirror (`tech.thk.com` itself returns
  HTTP 403, see `context/progress-tracker.md` "Environment notes") after
  `WebFetch` failed to extract readable text from the same mirror directly;
  the binary it cached was instead read locally with `pdftotext -layout`.
  See `lib/modules/drive-train/0.1.0/thk-reference-examples.ts` for the two
  fixtures and `lib/standards/engineering-sources.ts`'s
  `jp.thk.example_ball_screw_selection@technico-mirror-2026-08-10` for the
  full citation. Neither THK example names a specific catalog motor SKU
  (unlike Omron's own `R88M-U20030`) — both fixtures supply a plausible
  motor with headroom above THK's own stated minimum, disclosed as such
  rather than presented as a THK-selected part. The vertical example's own
  effective-torque figure is a genuine, quantified ~21% deviation from this
  module's own closed-cycle assumption, not reproduced — see "The RMS-
  Acceleration Dependency Question" above, now updated with a real
  counter-case.
- **Not resolved:** the RMS-torque safety margin, peak-torque safety margin,
  and maximum inertia ratio (items 3, 4, 5) — three genuine, sourced,
  multi-way disagreements, not a research gap.
- **Resolved (2026-08-10):** whether the closed-cycle RMS-acceleration
  argument ("The RMS-Acceleration Dependency Question" above) actually
  holds once a real kernel exists to test it against — confirmed as a
  property (`closed-cycle-benchmark.ts`) and against THK's own real vertical
  worked example, which is a genuine counter-case (~21% deviation) where the
  argument's own stated precondition fails, not a hypothetical one.
- **Not resolved:** how gearbox transmission efficiency (as opposed to the
  ball screw's own internal efficiency, already modeled) should be applied,
  given the gap found in `ball-screw 0.1.0`'s own released kernel (see "A
  Real Gap Found in an Already-Released Kernel") — a real design question
  spanning two modules, not something this document decides unilaterally.
- **Not resolved:** whether/how holding-brake torque and drive/amplifier
  current sizing enter a future version — the first is a genuine sourced
  gap (item 9), the second is blocked on a generic-engine capability that
  does not exist yet (see "A Generic-Engine Gap, Not a Module Decision").

## Stage 2 Entry Criteria

Stage 2 must resolve, with real sources where a manufacturer-specific
convention is involved (not invented here):

1. New `drive.*` (proposed prefix) registry parameters, per "Existing
   Parameter Review" above, including the gearbox-efficiency overlap
   question against `screw.mechanical_efficiency`.
2. Whether this module reuses `screw.gear_ratio` directly for its own
   reflected-inertia/torque formulas, or proposes a new, separate parameter
   — and if the latter, how the two stay reconciled rather than silently
   diverging.
3. The RMS-torque safety margin, peak-torque safety margin, and maximum
   inertia-ratio input — required, no default, per items 3-5's own
   three-to-five-way disagreements.
4. Whether the closed-cycle RMS-acceleration argument is adopted as stated,
   revised, or replaced with a per-phase input port instead (which would
   itself need a new parameter shape this registry does not have yet — see
   "The RMS-Acceleration Dependency Question").
5. Whether `drive-train 0.1.0` applies its own gearbox-efficiency derating
   on top of `screw.drive_torque`, or whether that belongs in a future
   `ball-screw` amendment instead (see "A Real Gap Found in an
   Already-Released Kernel") — a decision that may need coordination beyond
   this module's own Stage 2 contract.
6. Whether regenerative energy and its absorption-capacity check are
   in scope for `0.1.0` given the "100% efficient" simplifying assumption
   is this project's own recorded choice, not a manufacturer-endorsed one.

## Status

Stage 1 (engineering specification) is done as a draft. No kernel, package,
or registry change exists yet. Production release for Unit 4.7 remains
sequentially gated behind Unit 4.1's Definition of Done regardless of how
far this document or a future package gets
(`context/implementation-map.md` Milestone 4 header).
