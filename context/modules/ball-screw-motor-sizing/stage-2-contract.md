# Ball-Screw Motor Sizing Module — Stage 2 Parameter Contract

## Status

- Work unit: Milestone 6, Unit 6.2, Stage 2 — parameter contract
- Date: 2026-08-12
- Released registry change: parameter registry `1.9.0`
- Stage 2 status: **resolved.** See "Decisions" below for the four items
  `stage-1-spec.md` "Stage 2 Entry Criteria" left open.
- Module status: no kernel or package exists yet. Stage 3 (compute and
  trace) is next.

## Decisions

### 1. Parameter-group naming — per-mechanism prefix, `motor_sizing.ball_screw.*`

**Resolved: a per-mechanism prefix, not a shared `motor_sizing.*` bucket
across every future mechanism module.** Every other Milestone 4/6
discipline group uses a short domain-specific prefix (`screw`, `guide`,
`bearing`, `drive`) rather than a shared umbrella (`drive-train`'s own
Stage 2 contract explicitly reused this exact precedent: "the same
'short domain noun, not the full module ID' precedent"). This module's
own geometry terms (screw diameter, screw mass) will not overlap in
meaning with a belt/pulley drive's, a rack-and-pinion's, or an
index-table's own geometry terms, so a shared bucket buys nothing (no
code anywhere iterates "every `motor_sizing.*` parameter" generically —
each mechanism module needs its own distinct kernel and port mapping
regardless of prefix) and risks a future symbol collision (e.g. two
different mechanisms both wanting a plain "diameter" symbol for two
physically different diameters). `motor_sizing.ball_screw` is a two-level
dotted scope, the same pattern `motion.axis`/`motion.profile` already
establish.

### 2. The round-trip motion-input shape — distinct named parameter IDs per phase slot, not an index

**Resolved: `forward_*`/`return_*`/`dwell_time`, six distinct new
parameter IDs (three per direction) plus one dwell parameter — never a
`move_{1..5}_*`-style indexed family sharing one canonical ID across
ports.** This is the specific fix `stage-1-spec.md` "Candidate Methods"
item 3 flagged as needed: `motion-profile@0.1.0`'s own `move_distance`
canonical ID is shared by all five of its own `move_1_distance`...
`move_5_distance` ports, distinguished only by port *key*, not by
parameter *identity* — and `lib/db/repositories/graph-repository.ts`'s
`resolveModuleInputs` resolves a stored value by `(parameterId,
loadCase)` only, never by port key, so every port sharing that one ID
collides at the database layer (`context/progress-tracker.md` "Open
decisions", found by Unit 5.4 Scenario 1). Minting `forward_move_distance`
and `return_move_distance` as two genuinely distinct parameter IDs makes
this collision structurally impossible for this module, not just
avoided by convention — each has its own row in the parameter-value
storage layer. This module's own motion shape is small and fixed (at
most one forward move, one return move, one dwell — `stage-1-spec.md`
"Validity Envelope"), so minting distinct IDs costs six parameters, not
an unbounded family; `motion-profile@0.1.0`'s own indexed-and-shared
design was itself a deliberate tradeoff for its own much larger
"up to 5 moves" scope, not a mistake this module needs to repeat at a
much smaller scale.

`return_move_distance`, `return_max_velocity`, and
`return_max_acceleration` are **optional at the registry level**
(a horizontal, direction-independent axis needs only the forward move,
matching Omron's own worked example — `stage-1-spec.md` "Reference
Examples" item 1). The package's own input schema must require all three
together whenever any one is supplied (a `superRefine` rule, the same
"generic port shape can't express this co-requirement, so an
author-provided schema rule does" pattern `drive-train@0.1.0`'s own
`gearbox_efficiency` requirement and `support-bearing@0.1.0`'s own
conditional axial-load ports already established) — not resolved further
here; a Stage 3 item. `dwell_time` defaults to a **constant `0 s`** — a
structural "no dwell modeled" statement, not a guessed physical value,
the same category of default `screw.gear_ratio`'s own constant `1`
already uses.

### 3. The per-phase signed-torque convention — true signed per-direction values, not `drive-train@0.1.0`'s conservative summation

**Resolved: this module computes true per-direction load torque
(`forward_load_torque`, `return_load_torque`, generally different when
gravity contributes) and true per-phase acceleration torque
(`forward_acceleration_torque`, `return_acceleration_torque`), summed
per-phase with the correct sign for that phase — not `drive-train@0.1.0`'s
own deliberate conservative simplification (always adding acceleration
and load torque, regardless of whether the true physical relationship
would subtract).** This is required to reproduce THK's own vertical
worked example correctly (`stage-1-spec.md` "Reference Examples" item 2:
`Tk1=1100 N*mm` upward, `Tk2=630 N*mm` downward gravity-assisted — a real
printed asymmetry `drive-train@0.1.0`'s own conservative summation cannot
express, confirmed directly in that module's own
`thk-reference-examples.ts` module comment). It is also the more
physically accurate choice for a module whose entire purpose is fixing
an approximation `drive-train@0.1.0` already discloses as a real,
quantified deviation. `drive-train@0.1.0` itself is unaffected — it stays
released and immutable with its own documented, deliberate conservative
choice; this is a different module making a different, better-suited
choice for its own different (round-trip, direction-asymmetric) scope,
not a correction to `drive-train@0.1.0`.

### 4. The required-torque/safety-factor shape — two safety factors (`>= 1`), not two margins (`<= 1`), because no candidate motor rating exists to take a fraction of

**Resolved: `effective_torque_safety_factor` and
`momentary_torque_safety_factor`, both required with no built-in
default, each `>= 1`, multiplied onto the computed torque to produce a
required minimum motor rating** — the mathematical inverse direction from
`drive-train@0.1.0`'s own `rms_torque_margin`/`peak_torque_margin`
(`0 < x <= 1`, an allowed *fraction of a known candidate motor's own
rated/peak torque*). The direction has to change because the input it
would multiply no longer exists: `stage-1-spec.md` "Purpose" already
states this module takes no candidate motor's own rated/peak torque as an
input (ADR-0011's own "no catalog matching" scope) — there is no
`motor_rated_torque` to compute "an allowed fraction of." Oriental Motor's
own page 6 gives exactly this shape for the combined case,
`TM = (TL+Ta)*Sf` (`Sf` = "Safety Factor," multiplying up, not a fraction
multiplying down) — reused here as two separate factors (one per computed
torque figure) for the same reasoning `drive-train@0.1.0`'s own Stage 2
contract already gave for keeping its two margins separate: RMS/continuous
and momentary/peak represent two physically distinct failure modes
(thermal capacity versus instantaneous mechanical/magnetic capacity), and
no source ties them to one shared number. Kept as two separate parameters
in this module too, not consolidated into Oriental Motor's own single
combined `TM`, per `stage-1-spec.md` item 6's own working decision.

**The inertia-ratio check needs a candidate motor's own rotor inertia as a
required input, resolving `stage-1-spec.md`'s remaining open sub-question.**
Without it, `0.1.0` would have zero real pass/fail checks at all (every
other output is a reported required-spec value, per ADR-0011's own scope)
— `motor_sizing.ball_screw.motor_rotor_inertia` is therefore **required**,
not deferred to a later, catalog-matching module version. This is a
narrow, deliberate exception to "no catalog matching in this phase": the
engineer types in one number from a motor they are evaluating (the same
"engineer takes the number to the catalog" scope `coupling@0.1.0`'s own
`rated_torque` input already uses), not an automated catalog search or
part selection.

## Released Additive Contract

Registry `1.9.0` adds these released canonical parameters. It does not
edit a released `1.0.0`-`1.8.0` definition.

### Reused without change

| Purpose | Parameter | Note |
| --- | --- | --- |
| Orientation | `motion.axis.orientation` | |
| Incline angle | `motion.axis.incline_angle` | |
| Gravitational acceleration | `motion.axis.gravity` | |
| Sliding-surface friction coefficient | `motion.axis.friction_coefficient` | |
| Total moving mass | `motion.axis.total_moving_mass` | Supplied directly as this module's own input, not linked from `axis-load-cases`' own sub-component resolution — same ID, same meaning, different (direct) supply path. |
| Ball-screw lead | `screw.lead` | |
| Screw-to-motor gear ratio | `screw.gear_ratio` | Constant default `1` already models "no gearbox," reused unchanged. |
| Ball-nut preload | `screw.preload` | Same drive-torque formula term `ball-screw@0.1.0` already uses. |
| Preload-nut internal friction coefficient | `screw.internal_friction_coefficient` | Same term. |
| Ball-screw mechanical efficiency | `screw.mechanical_efficiency` | Same term. |

**Not reused, deliberately:** `screw.minor_diameter` (a different,
buckling-specific root/minor diameter — this module needs the nominal
outer diameter for a solid-cylinder inertia estimate, a different
engineering purpose; reusing the ID would silently produce a
too-small inertia if a caller supplied a root diameter, or force a
buckling-purposed field to double as an inertia-purposed one). Also not
reused: `screw.drive_torque`, `drive.reflected_load_inertia`, `drive.
rms_torque_margin`/`peak_torque_margin`/`inertia_ratio_maximum` — see
"Decisions" items 2-4 above for why each needs its own, differently-scoped
parameter instead.

### New `motor_sizing.ball_screw.*` parameters

Geometry and mass inputs:

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `motor_sizing.ball_screw.screw_diameter` | quantity, `m`, `> 0`, required | Nominal (outer) diameter of the ball-screw shaft, for a solid-cylinder moment-of-inertia estimate (`lib/engine/mechanics`' `solidCylinderInertia`). Distinct from `screw.minor_diameter`'s own buckling-purposed root diameter. |
| `motor_sizing.ball_screw.screw_mass` | quantity, `kg`, `> 0`, required | Mass of the ball-screw shaft, matching Oriental Motor's own worked example's directly-stated `MB` rather than a density-derived value. |
| `motor_sizing.ball_screw.external_force` | quantity, `N`, constant default `0 N` | External force along the axis of travel (`F_A` in Oriental Motor's own formula), beyond gravity and friction. Zero is a structural "no additional external force" default, the same category as `screw.gear_ratio = 1`. |

Motion inputs (Decisions item 2):

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `motor_sizing.ball_screw.forward_move_distance` | quantity, `m`, `> 0`, required | Commanded travel distance of the forward (always-present) move. |
| `motor_sizing.ball_screw.forward_max_velocity` | quantity, `m/s`, `> 0`, required | Velocity ceiling for the forward move. |
| `motor_sizing.ball_screw.forward_max_acceleration` | quantity, `m/s^2`, `> 0`, required | Symmetric acceleration/deceleration ceiling for the forward move. |
| `motor_sizing.ball_screw.return_move_distance` | quantity, `m`, `> 0`, optional | Commanded travel distance of an optional return move. Required together with the next two whenever any one is supplied (Stage 3 input-schema rule). |
| `motor_sizing.ball_screw.return_max_velocity` | quantity, `m/s`, `> 0`, optional | Velocity ceiling for the return move. |
| `motor_sizing.ball_screw.return_max_acceleration` | quantity, `m/s^2`, `> 0`, optional | Symmetric acceleration/deceleration ceiling for the return move. |
| `motor_sizing.ball_screw.dwell_time` | quantity, `s`, `>= 0`, constant default `0 s` | Stationary dwell duration within one full cycle. |

Motor input:

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `motor_sizing.ball_screw.motor_rotor_inertia` | quantity, `kg*m^2`, `> 0`, required | Rotor moment of inertia of the candidate servo motor, from its own catalog data. The one real, engineer-typed catalog figure this module's `0.1.0` scope needs (Decisions item 4). |

Safety-factor and limit inputs, required, no built-in default (Decisions item 4):

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `motor_sizing.ball_screw.effective_torque_safety_factor` | quantity, ratio, `>= 1`, required | Multiplier applied to `effective_torque` to obtain `required_motor_rated_torque`. |
| `motor_sizing.ball_screw.momentary_torque_safety_factor` | quantity, ratio, `>= 1`, required | Multiplier applied to `momentary_torque` to obtain `required_motor_peak_torque`. |
| `motor_sizing.ball_screw.inertia_ratio_maximum` | quantity, ratio, `> 0`, required | Maximum acceptable `inertia_ratio`, the same five-way sourced disagreement `drive-train/stage-1-spec.md` item 5 already documents, reused by citation, not re-researched. |

Outputs:

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `motor_sizing.ball_screw.screw_inertia` | quantity, `kg*m^2`, `>= 0` | Ball-screw shaft's own rotating inertia (`J_B`, `solidCylinderInertia`). |
| `motor_sizing.ball_screw.load_inertia` | quantity, `kg*m^2`, `>= 0` | `screw_inertia` plus the table-and-load's own linear-motion-equivalent inertia (`J_W`, `lib/engine/mechanics`' `linearMotionInertia`), reflected to the screw shaft. |
| `motor_sizing.ball_screw.reflected_load_inertia` | quantity, `kg*m^2`, `>= 0` | `load_inertia` reflected to the motor shaft through `screw.gear_ratio` (`J_L`). |
| `motor_sizing.ball_screw.total_system_inertia` | quantity, `kg*m^2`, `>= 0` | `motor_rotor_inertia + reflected_load_inertia` (`J_total`). |
| `motor_sizing.ball_screw.inertia_ratio` | quantity, ratio, `>= 0` | `reflected_load_inertia / motor_rotor_inertia`. Checked against `inertia_ratio_maximum` — the one real catalog-free pass/fail check in `0.1.0`. |
| `motor_sizing.ball_screw.forward_load_torque` | quantity, `N*m`, `>= 0` | Load torque for the forward direction (`T_L`, Oriental Motor's ball-screw-drive formula). |
| `motor_sizing.ball_screw.return_load_torque` | quantity, `N*m`, `>= 0` | Load torque for the return direction — generally different from the forward value on a vertical or inclined axis (Decisions item 3). Meaningful only when a return move is declared. |
| `motor_sizing.ball_screw.forward_acceleration_torque` | quantity, `N*m` | Acceleration/deceleration torque during the forward move's own accel/decel phases (`T_A`, `Ta = J_total*alpha`). |
| `motor_sizing.ball_screw.return_acceleration_torque` | quantity, `N*m` | Acceleration/deceleration torque during the return move's own accel/decel phases. Meaningful only when a return move is declared. |
| `motor_sizing.ball_screw.momentary_torque` | quantity, `N*m`, `>= 0` | Highest single-phase torque across every phase in the full cycle (`T1 = Ta + TL`, taken at whichever phase governs). |
| `motor_sizing.ball_screw.effective_torque` | quantity, `N*m`, `>= 0` | RMS torque over the full cycle, `Trms = sqrt(sum(T_i^2*t_i)/sum(t_i))` over every real phase (`stage-1-spec.md` item 5) — not `drive-train@0.1.0`'s own closed-form approximation. |
| `motor_sizing.ball_screw.operating_speed` | quantity, `rad/s` (display `rpm`), `>= 0` | Peak motor-shaft rotational speed across the forward and return moves. |
| `motor_sizing.ball_screw.required_motor_rated_torque` | quantity, `N*m`, `>= 0` | `effective_torque * effective_torque_safety_factor` — the minimum continuous torque rating a candidate motor must have. |
| `motor_sizing.ball_screw.required_motor_peak_torque` | quantity, `N*m`, `>= 0` | `momentary_torque * momentary_torque_safety_factor` — the minimum peak torque rating a candidate motor must have. |
| `motor_sizing.ball_screw.required_power` | quantity, `W`, `>= 0` | `rotationalPower(required_motor_rated_torque, operating_speed)` (`lib/engine/units`' already-released `P = T*omega`) — the required-power figure ADR-0011 "Output scope" names alongside torque/speed/inertia. |

No new unit or dimension is needed: every canonical unit above (`m`,
`kg`, `N`, `m/s`, `m/s^2`, `s`, `kg*m^2`, `N*m`, `rad/s`, `ratio`, `W`) is
already registered.

## Existing Parameter Mapping

See "Reused without change" above — the full list, with the note on why
`screw.drive_torque`, `screw.minor_diameter`, and every `drive.*` margin/
inertia parameter are deliberately *not* reused.

## Method Sources

No new source-registry entry is added by this record. The sources
`stage-1-spec.md` already registered (Oriental Motor's *Motor Sizing
Calculations*, and — by reproduction — the physics already verified in
`axis-load-cases@0.1.0`, `ball-screw@0.1.0`, `motion-profile@0.1.0`, and
`drive-train@0.1.0`) remain this module's own method sources.

## Validity Envelope (Stage 2 refinement)

Unchanged from `stage-1-spec.md`'s own proposal, with the round-trip
motion shape, per-direction torque model, and safety-factor direction now
formalized as released parameters and decisions rather than open
questions.

## Stage 2 Entry Criteria — Resolution Status

Mapped against `stage-1-spec.md` "Stage 2 Entry Criteria":

1. Parameter-group naming — **resolved (per-mechanism prefix,
   `motor_sizing.ball_screw.*`)**, "Decisions" item 1.
2. The round-trip motion-input parameter shape — **resolved (six distinct
   `forward_*`/`return_*` parameter IDs plus one `dwell_time`, never an
   indexed shared-ID family)**, "Decisions" item 2.
3. The per-phase signed-torque convention — **resolved (true signed
   per-direction values, not `drive-train@0.1.0`'s own conservative
   summation)**, "Decisions" item 3.
4. The required-torque/margin shape, and whether the inertia-ratio check
   needs an up-front candidate motor rotor inertia — **resolved (two
   `>= 1` safety factors, the inverse direction from `drive-train@0.1.0`'s
   own `<= 1` margins, since no candidate motor rating exists to take a
   fraction of; `motor_rotor_inertia` is a required input)**, "Decisions"
   item 4.
5. New parameter-registry version release — **done, registry `1.9.0`.**

Stage 2 is complete. Stage 3 (compute and trace) is next.

## Stage 3 corrections (2026-08-12, same day)

Wiring the actual kernel found one real gap in this contract's own
original "Released Additive Contract," fixed directly in
`lib/engine/parameters/definitions.ts` (registry `1.9.0` had no external
consumer yet, so this is a correction, not a deprecation) — the same
"Stage 2's own last step had not actually been done" honesty
`drive-train@0.1.0`'s own Stage 3 corrections already modeled:

- **`forward_move_distance`'s and `return_move_distance`'s own definitions
  did not state which physical direction "forward" means on a vertical or
  inclined axis**, even though the sign of `forward_load_torque`/
  `return_load_torque`'s own gravity term depends on it (Decisions item 3:
  true signed per-direction torque). Corrected: both definitions now state
  the convention explicitly — "forward" is the direction that moves away
  from gravity (upward on a vertical axis); "return" is gravity-assisted
  (downward). Immaterial on a horizontal axis. A structural convention
  stated in the registry, not a guessed physical value or an unstated
  kernel assumption.

The pinned registry-hash fixture (`lib/engine/parameters/hash.test.ts`)
is updated in the same commit-equivalent unit of work; no separate
registry version bump was needed since `1.9.0` had not yet been built
against.
