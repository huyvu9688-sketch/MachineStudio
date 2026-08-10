# Servo Drive-Train Module — Stage 2 Parameter Contract

## Status

- Work unit: Unit 4.7, Stage 2 — parameter contract
- Date: 2026-08-10
- Released registry change: parameter registry `1.8.0`
- Stage 2 status: **resolved for a `0.1.0` scope matching every other
  Milestone 4 module's own `normal`/`peak`-only restriction.** See
  "Decisions" below for the six items `stage-1-spec.md` "Stage 2 Entry
  Criteria" left open.
- Module status: no kernel or package exists yet. Stage 3 (compute and
  trace) is next. Production release remains sequentially gated behind
  Unit 4.1's Definition of Done regardless
  (`context/implementation-map.md` Milestone 4 header).

## Decisions

### 1. New `drive.*` registry parameters

**Resolved: `drive.*`, following the same "short domain noun, not the full
module ID" precedent every other Milestone 4 module already set** (`screw`,
`guide`, `bearing`, not `ball_screw`/`linear_guide`/`support_bearing`). See
"Released Additive Contract" below for the full group.

### 2. Whether this module reuses `screw.gear_ratio` directly or proposes a new parameter

**Resolved: reuse `screw.gear_ratio` directly. No `drive.gear_ratio` is
added.**

`screw.gear_ratio`'s own definition already anticipates exactly this reuse
("A future drive-train module (Unit 4.7) may reuse or supersede this
parameter once its own contract exists") and its own physical meaning —
"gear ratio between the ball screw and its driving shaft" — is precisely
what a gearbox between the motor and the screw is. Adding a second,
separate `drive.gear_ratio` would double-count the same physical ratio and
create exactly the kind of near-duplicate parameter
`context/code-standards.md`'s own "Canonical Parameters" step 1 ("search
existing definitions... reuse an existing ID rather than creating a near
duplicate") warns against. `screw.gear_ratio`'s own default (`constant`,
value `1`) already models "no gearbox" as a structural fact, not a guessed
physical value — this module inherits that same default automatically by
reusing the port.

### 3. The RMS-torque margin, peak-torque margin, and inertia-ratio limit — required inputs, no default, kept separate

**Resolved: three separate required parameters with no built-in default —
`drive.rms_torque_margin`, `drive.peak_torque_margin`,
`drive.inertia_ratio_maximum`.**

`stage-1-spec.md` items 3-5 found real, sourced, multi-way disagreement on
all three numbers (a three-way margin disagreement for items 3/4, a
five-way disagreement spanning 2:1 to 100:1 for item 5) — the same
"required input, neither table adopted" treatment `guide.static_safety_
factor_minimum`, `bearing.static_safety_factor_minimum`, `screw.buckling_
safety_margin`, and `coupling.service_factor` already received.

**The RMS-torque margin and peak-torque margin are kept as two separate
parameters, not consolidated into one** (unlike `coupling.service_factor`,
which did consolidate several disagreeing factors into one input). Omron's
own worked example happens to reuse the identical value (`0.8`) for both
its effective-torque check and its maximum-momentary-torque check, but
nothing in Omron's own document states this as a design principle — it is
one example's own convenience, not a stated rule. RMS torque and peak
torque represent two physically distinct failure modes (continuous thermal
capacity versus instantaneous mechanical/magnetic capacity), and an
engineer may reasonably want different margins for each (e.g., tighter
thermal margin on a duty-cycle-heavy application, looser peak margin when
the motor's own peak rating already has generous headroom). Forcing one
shared value would silently remove that degree of freedom without any
sourced justification for doing so.

### 4. The closed-cycle RMS-acceleration argument — adopted as `0.1.0`'s working assumption, with a caveat and a Stage 4 action item

**Resolved: adopted.** `motion.profile.rms_acceleration` is consumed
directly as the acceleration term of `drive.effective_torque`'s own RMS
formula, under the two conditions `stage-1-spec.md` "The RMS-Acceleration
Dependency Question" already states precisely: total reflected system
inertia stays constant across the cycle (true — a fixed mechanical
configuration), and the per-case load torque (`screw.drive_torque`,
already a single value per case, not per-phase) stays constant across the
cycle. Given those two conditions, the identity `Trms^2 =
(J_total/k)^2*a_rms^2 + T_load^2` holds exactly for any cycle that returns
to its starting velocity — which is what "one motion cycle" (the scope
`motion.profile.rms_acceleration`'s own definition already declares)
means by construction.

This was chosen over the alternative — blocking `0.1.0` on a new,
per-phase torque/time port shape — because that alternative needs a
parameter shape this registry does not have yet (a table-valued
parameter; `lib/engine/parameters/README.md`'s own v1.2 note already
declines to add that "not bundled into a single module's parameter
contract"). Adopting the existing scalar port keeps this module buildable
now. **Not a closed question, though:** the identity is this project's own
derivation, not stated by any source read in Stage 1. It is recorded as an
explicit assumption in every calculation trace (`stage-1-spec.md`'s own
Trace Contract already reserves a line for it in
`validity-and-assumptions`), and Stage 4 (validation) must specifically
test it — e.g., a property test comparing the closed-form identity against
a brute-force numerical RMS computed from a synthetic per-phase torque
profile, for several duty-cycle shapes — before this module's own
validation record can rely on it without qualification.

### 5. Gearbox transmission efficiency — this module's own derating, not a `ball-screw` amendment

**Resolved: `drive-train 0.1.0` applies its own gearbox-efficiency
derating on top of `screw.drive_torque`, via a new required-when-declared
parameter, `drive.gearbox_efficiency`.**

`stage-1-spec.md`'s own "A Real Gap Found in an Already-Released Kernel"
found that `ball-screw 0.1.0`'s released `resolveDriveTorque` applies no
efficiency loss to its own `screw.gear_ratio` reduction — `screw.drive_
torque` implicitly assumes a 100%-efficient gearbox whenever a gearbox is
declared at all. `ball-screw 0.1.0` is a released version;
`context/ai-workflow-rules.md`'s own "Protected Files and Records" forbids
editing it in place, and nothing about `ball-screw`'s own Stage 1/2 ever
claimed to model a gearbox's own transmission loss (only the ball screw's
own internal mechanical efficiency, which it does model correctly). The
gearbox itself is squarely this module's own domain — `drive-train`'s
whole purpose is sizing the motor/gearbox/drive/brake chain — so the
derating belongs here: `T_L,motor = screw.drive_torque / drive.gearbox_
efficiency`, mirroring the exact shape Omron's own `T_L = T_W*G/eta`
formula already uses for a gearbox's own transmission efficiency.

**`drive.gearbox_efficiency` is optional at the registry level, with no
constant default — not `optional`-and-silently-1.0.** Unlike `screw.gear_
ratio = 1` (a structural fact — no gearbox physically present, a safe
default nobody would want overridden), a *lossless* gearbox is a real,
product-specific physical claim this project must not invent
(`context/ai-workflow-rules.md` "Handling Missing Requirements": "Do not
invent product behavior"). Stage 3's own `input-schema.ts` must instead
enforce, via a `superRefine` rule, the same "generic port shape can't
express this, so an author-provided schema rule does" pattern
`support-bearing 0.1.0`'s own conditional axial-load ports already
established: `drive.gearbox_efficiency` is required whenever `screw.gear_
ratio != 1`, and the compute path treats it as exactly `1` (no additional
derating) only when `screw.gear_ratio = 1` — a structural fact stated in
code, not a silent registry default.

**A genuine naming/overlap note, not fully resolved here:**
`screw.mechanical_efficiency` ("mechanical efficiency of the ball-screw
drive") and `drive.gearbox_efficiency` are physically distinct
multiplicative factors in the same motor-to-load chain that share a
dimension (`ratio`) and a similar-sounding name. Both definitions now
cross-reference each other's own scope explicitly (see "Released Additive
Contract" below) so a future reader cannot conflate them — the same
"never infer force from mass or mass from force" rigor
`context/code-standards.md` already requires generally, applied here to
two efficiency factors instead of two force-like quantities.

### 6. Regenerative energy — in scope for `0.1.0`, with the simplifying assumption recorded on every run

**Resolved: yes, included as an evaluated check** — `drive.regen_energy_
released` against `drive.regen_absorption_capacity`, when the latter is
supplied.

The underlying relationship (`E = J*omega^2/2`, the kinetic energy lost
during a deceleration phase) is ordinary, unambiguous physics, not a
manufacturer-specific convention this project would be guessing at — the
same kind of "genuine, sourced formula" standing every other evaluated
check in this project already has, distinct from a genuine multi-way
empirical disagreement (which items 3-5 above are, and which do get the
"required input, no default" treatment instead of being dropped
entirely). Celera Motion's own explicit "100% of deceleration energy goes
to the shunt resistor" simplifying assumption (no drive-electronics
efficiency loss, no DC-bus capacitor absorption credit) is adopted as
`0.1.0`'s own assumption too — not because it is claimed to be exactly
true, but because no source read in Stage 1 gives a sourced loss/
absorption factor to use instead, and recording an honest, stated
over-estimate is safer than inventing an unstated correction factor. This
assumption is recorded on every calculation trace
(`stage-1-spec.md`'s own Trace Contract `validity-and-assumptions` line),
not silently applied. `drive.regen_absorption_capacity` is **optional**
(a drive may not be declared, or its absorption capacity may be unknown);
when absent, the regen check reports `not_applicable`
(`context/code-standards.md` "Checks and Status") rather than failing or
guessing a capacity.

## Released Additive Contract

Registry `1.8.0` adds these released canonical parameters. It does not
edit a released `1.0.0`-`1.7.0` definition.

### New `drive.*` parameters

Catalog/rating inputs (motor, not per case):

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `drive.motor_rated_torque` | quantity, `N*m`, `> 0`, required | Continuous (rated) torque the candidate motor can sustain, from its own catalog data. |
| `drive.motor_peak_torque` | quantity, `N*m`, `> 0`, required | Peak (maximum momentary) torque the candidate motor can deliver, from its own catalog data. |
| `drive.motor_rated_speed` | quantity, `rad/s` (display `rpm`), `> 0`, required | Rated rotational speed of the candidate motor, from its own catalog data. |
| `drive.motor_rotor_inertia` | quantity, `kg*m^2`, `> 0`, required | Rotor moment of inertia of the candidate motor, from its own catalog data. |

Gearbox input, optional, conditionally required (see "Decisions" item 5):

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `drive.gearbox_efficiency` | quantity, ratio, `0 < x <= 1`, optional at the registry level | Transmission efficiency of the gearbox declared via `screw.gear_ratio`, distinct from `screw.mechanical_efficiency` (the ball screw's own internal efficiency, already applied inside `screw.drive_torque`). Required together with a declared `screw.gear_ratio != 1`, enforced by the package's own input schema, not a registry default (Decisions item 5). |

Regenerative-drive and holding-brake inputs, optional, reported/checked only when supplied:

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `drive.regen_absorption_capacity` | quantity, `J`, `>= 0`, optional | Regenerative energy absorption capacity of the candidate drive, from its own catalog data. When absent, the regenerative-energy check reports `not_applicable`. |
| `drive.brake_rated_torque` | quantity, `N*m`, `>= 0`, optional | Rated static holding torque of the candidate holding brake, from its own catalog data. Reported only — no source gives a standalone catalog-comparison formula (`stage-1-spec.md` item 9). |

Margin/limit inputs, required, no built-in default:

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `drive.rms_torque_margin` | quantity, ratio, `0 < x <= 1`, required | Allowed fraction of `drive.motor_rated_torque` the computed `drive.effective_torque` may reach (Decisions item 3). |
| `drive.peak_torque_margin` | quantity, ratio, `0 < x <= 1`, required | Allowed fraction of `drive.motor_peak_torque` the computed `drive.momentary_torque` may reach (Decisions item 3). |
| `drive.inertia_ratio_maximum` | quantity, ratio, `> 0`, required | Maximum acceptable `drive.inertia_ratio` (Decisions item 3). |

Outputs:

| Parameter | Value and units | Cases | Meaning |
| --- | --- | --- | --- |
| `drive.reflected_load_inertia` | quantity, `kg*m^2`, `>= 0` | — | Load inertia reflected to the motor shaft through `screw.gear_ratio`. |
| `drive.total_system_inertia` | quantity, `kg*m^2`, `>= 0` | — | `drive.motor_rotor_inertia + drive.reflected_load_inertia`. |
| `drive.inertia_ratio` | quantity, ratio, `>= 0` | — | `drive.reflected_load_inertia / drive.motor_rotor_inertia`. Checked against `drive.inertia_ratio_maximum`. |
| `drive.operating_speed` | quantity, `rad/s` (display `rpm`) | `normal`, `peak` | Per-case motor-shaft rotational speed, derived from `motion.axis.case_linear_velocity`, `screw.lead`, and `screw.gear_ratio` — the same derivation `coupling 0.1.0` already resolved for the identical need. Checked against `drive.motor_rated_speed`. |
| `drive.acceleration_torque` | quantity, `N*m` | `normal`, `peak` | Torque to accelerate/decelerate `drive.total_system_inertia` at the case's own peak acceleration/deceleration. |
| `drive.momentary_torque` | quantity, `N*m` | `normal`, `peak` | Highest single-phase torque (`drive.acceleration_torque + screw.drive_torque`, gearbox-derated per Decisions item 5). Checked against `drive.motor_peak_torque * drive.peak_torque_margin`. |
| `drive.effective_torque` | quantity, `N*m` | `normal`, `peak` | RMS torque over one duty cycle, from `motion.profile.rms_acceleration` and `screw.drive_torque` per Decisions item 4. Checked against `drive.motor_rated_torque * drive.rms_torque_margin`. |
| `drive.regen_energy_released` | quantity, `J`, `>= 0` | `normal`, `peak` | Kinetic energy released during the case's own deceleration phase(s), `E = J_total*(omega_1^2 - omega_2^2)/2`. Checked against `drive.regen_absorption_capacity` when supplied (Decisions item 6). |

### New unit

`J` (joule) is added to the unit registry (`lib/engine/units/registry.ts`),
mapped to the existing `Dimensions.torque` dimension (mass:1, length:2,
time:-2 — dimensionally identical to `N*m`, since this registry's own
torque dimension carries no angle exponent, `lib/engine/units/
arithmetic.ts` line ~140). **This is a deliberate reuse of an existing
dimension, not a new one** — energy and torque genuinely share the same
SI base-unit exponents in this registry's five-base-dimension model, so
adding a distinct named dimension purely for semantic labeling would not
match this project's own precedent (`context/architecture.md`'s "Link
Compatibility" already separates physical dimension from semantic meaning
via qualifiers and parameter identity, not via a proliferation of
dimensions for every distinct concept that happens to share one). The
graph's own link-compatibility rule (`context/architecture.md`: "parameter
identity or an explicit approved mapping" *and* compatible dimension *and*
qualifiers *and* load case *and* frame, all required together) means a
shared dimension alone cannot create an accidental link between a torque
output and an energy input — `drive.regen_energy_released` and (for
example) `screw.drive_torque` remain different parameter IDs with no
approved mapping between them. `J` is registered without the `siCoherent`
flag (`N*m` keeps sole ownership of that flag for the torque dimension);
its factor is `1`, the correct numerical identity (`1 J = 1 N*m`).

## Existing Parameter Mapping

The future package reuses these already-released definitions without
changing their meaning:

| Purpose | Canonical parameter | Note |
| --- | --- | --- |
| Required torque at the motor shaft, per case (before gearbox derating) | `screw.drive_torque` | See "Decisions" item 5 for the gearbox-efficiency derating this module applies on top. |
| Gear ratio between motor and screw | `screw.gear_ratio` | Reused directly, not duplicated — "Decisions" item 2. |
| Cycle-level RMS acceleration demand | `motion.profile.rms_acceleration` | Consumed under the closed-cycle argument — "Decisions" item 4. |
| Per-case rotational speed derivation inputs | `motion.axis.case_linear_velocity`, `screw.lead`, `screw.gear_ratio` | The same combination `coupling 0.1.0` already resolved. |
| Peak/max acceleration and deceleration | `motion.profile.peak_acceleration`, `motion.profile.peak_deceleration` | Inputs to `drive.acceleration_torque`. |

## Method Sources

No new source-registry entry is added by this record. The five sources
`stage-1-spec.md` registered remain the method sources for this module;
this record's own contribution is the port mapping and the six
Stage-2-only decisions above.

## Validity Envelope (Stage 2 refinement)

Unchanged from `stage-1-spec.md`'s own proposal, with items 3-6 above now
formalized as released parameters and decisions rather than proposals.

## Stage 2 Entry Criteria — Resolution Status

Mapped against `stage-1-spec.md` "Stage 2 Entry Criteria":

1. New `drive.*` registry parameters, including the gearbox-efficiency
   overlap question — **resolved**, "Decisions" item 1/5, "Released
   Additive Contract" above.
2. Whether this module reuses `screw.gear_ratio` directly — **resolved
   (yes)**, "Decisions" item 2.
3. The RMS-torque margin, peak-torque margin, and inertia-ratio limit —
   **resolved (three separate required inputs, no default)**, "Decisions"
   item 3.
4. Whether the closed-cycle RMS-acceleration argument is adopted as
   stated, revised, or replaced — **resolved (adopted as `0.1.0`'s working
   assumption, with a Stage 4 action item to verify)**, "Decisions" item 4.
5. Whether `drive-train 0.1.0` applies its own gearbox-efficiency derating
   or a future `ball-screw` amendment — **resolved (this module's own
   derating)**, "Decisions" item 5.
6. Whether regenerative energy is in scope for `0.1.0` — **resolved
   (yes, with the simplifying assumption recorded on every run)**,
   "Decisions" item 6.

Stage 2 is complete for `0.1.0`'s scope. Stage 3 (compute and trace) is
next. Production release remains sequentially gated behind Unit 4.1's
Definition of Done regardless (`context/implementation-map.md` Milestone 4
header).

## Stage 3 corrections (2026-08-10, same day)

Wiring the actual kernel found two real mistakes in this contract's own
original "Released Additive Contract" above, both fixed in
`lib/engine/parameters/definitions.ts` directly (registry `1.8.0` had no
external consumer yet, so this is a correction, not a deprecation) — the
same "Stage 2's own last step had not actually been done" honesty
`linear-guide`'s own Stage 3 already modeled:

1. **`drive.reflected_load_inertia` cannot be a computed output.** This
   contract originally framed it as one, "reflected through
   `screw.gear_ratio`" — but reflecting a load inertia needs a *raw*
   load-side inertia to reflect, and this project has no released
   ball-screw-inertia or payload-inertia-conversion parameter to supply
   one internally (mass exists via `motion.axis.total_moving_mass`, but
   converting linear mass into rotary inertia needs the ball screw's own
   inertia too — the same missing input `coupling`'s own stage-1-spec.md
   item 3 already flagged as "Unit 4.7 territory" without this module
   actually having filled it in yet). Corrected: `drive.reflected_load_
   inertia` is now a required engineer-supplied input, no default — the
   same treatment `bearing.actual_radial_load` already received for the
   identical reason (no released upstream parameter cleanly represents
   it).
2. **`drive.acceleration_torque` does not actually vary by load case** in
   this project's data model — it depends only on `motion.profile.peak_
   acceleration`/`peak_deceleration` (not load-case-scoped in this
   registry) and `drive.total_system_inertia` (not load-case-scoped
   either). Only `drive.momentary_torque` and `drive.effective_torque`
   (which combine this shared figure with a per-case `screw.drive_torque`)
   actually differ between `normal` and `peak`. Corrected: `drive.
   acceleration_torque`'s own `loadCases` qualifier is removed.

Both changes updated the pinned registry-hash fixture
(`lib/engine/parameters/hash.test.ts`) in the same commit-equivalent unit
of work; no separate registry version bump was needed since `1.8.0` had
not yet been built against.
