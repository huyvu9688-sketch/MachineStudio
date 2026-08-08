# Motion Profile Module — Stage 2 Parameter Contract

## Status

- Work unit: Unit 4.2, Stage 2 — parameter contract
- Date: 2026-08-07
- Released registry change: parameter registry `1.2.0`
- Stage 2 status: **resolved for `0.1.0`'s scope** (single trapezoidal move,
  multi-segment move/dwell cycle, cycle-level RMS acceleration). Jerk/S-curve
  support stays deferred, unchanged from `stage-1-spec.md`'s working
  assumption. See "Decisions" below for the two items
  `stage-1-spec.md` "Stage 2 Entry Criteria" left open.
- Module status: **Stage 3 draft package built 2026-08-07**, extended the
  same day to wrap one move optionally followed by one dwell, then extended
  again 2026-08-08 to a bounded sequence of up to 5 moves (each optionally
  followed by its own dwell) once "Decisions" item 4 below resolved the
  port-cardinality question. A full `ModulePackage` (manifest, ports, input
  schema, compute, trace, checks, UI schema, report schema, draft validation
  record) wraps `math.ts` (`resolveTrapezoidalMove`) and `cycle.ts`
  (`resolveMotionCycle`) in `lib/modules/motion-profile/0.1.0/` — see that
  directory's `README.md` "Stage 3 package". Named `package.ts`, not
  `index.ts`, so `npm run registry:generate` still can't discover it — no
  module is registered. Production release remains sequentially gated behind
  Unit 4.1's Definition of Done regardless (`context/implementation-map.md`
  Milestone 4 header).

This record does not release a `ModulePackage`, register a module, or create a
calculation run. It only resolves the parameter contract and extends the pure
kernel that a future Stage 3 assembles into a package.

## Decisions

### 1. RMS aggregate ownership

**Resolved: `motion-profile` owns a single cycle-level RMS *acceleration*
output. It does not own RMS velocity or RMS torque.**

`context/implementation-map.md` Unit 4.2 already lists "Peak and RMS demand
values used downstream" as an output — this was not actually an open
question, just not cross-referenced from `stage-1-spec.md`'s "Candidate
Method — RMS/Duty Aggregation" section when that was written.

What "RMS demand value" means physically still needed resolving:

- **RMS velocity is not a meaningful duty quantity here.** Velocity is not
  piecewise-constant across a move's phases (it ramps linearly during
  accel/decel), so a phase-weighted RMS of velocity does not correspond to any
  standard sizing quantity. No candidate source (ABB AN00115, Oriental Motor
  H-18/H-23) computes one.
- **RMS acceleration is the standard duty-cycle demand quantity.** Every phase
  of a trapezoidal/triangular move (and every dwell) has a piecewise-constant
  acceleration: `+a_lim` during accel, `0` during cruise, `-a_lim` magnitude
  during decel, `0` during dwell. Time-weighted RMS over piecewise-constant
  phases (`sqrt(sum(a_i^2 * t_i) / sum(t_i))`) is exactly the shape Oriental
  Motor's RMS-torque guidance uses (see `stage-1-spec.md` "Candidate Method —
  RMS/Duty Aggregation" and "Evidence Gaps") and is standard, general
  motor/duty-cycle sizing practice — the same "elementary, not a
  manufacturer-specific convention" treatment `stage-1-spec.md` already gives
  the base trapezoidal kinematics. No citation to the unverified Oriental
  Motor RMS-torque blog post is needed or made; the formula stands on its own
  as general time-weighted-RMS arithmetic, not that source's specific
  contribution.
- **RMS *torque* stays a Unit 4.7 (servo drive-train) output, not this
  module's.** `context/implementation-map.md` Unit 4.7 lists "RMS torque and
  thermal duty" as a required check. Computing torque from acceleration needs
  reflected inertia and friction/gravity load data this module has no access
  to (`motion-profile`'s purpose statement: "It will not size any
  component... those remain Unit 4.3-4.7... responsibilities"). `0.1.0`
  supplies `rms_acceleration` as the kinematic demand input a future
  drive-train module scales by its own inertia/friction model into RMS
  torque — it does not attempt that scaling itself.

### 2. Multi-segment port shape

**Resolved: every multi-segment output is a cycle-level aggregate (a maximum
across segments, or the cycle's overall RMS). `0.1.0` does not expose
per-segment or per-phase output ports.**

Two independent reasons converge on this:

- **The registry cannot express a per-segment port yet.** A per-segment shape
  needs either a repeatable port (one instance per segment in a sequence) or a
  single port carrying an array/table of rows. The module-port model does not
  support the former (ports are a fixed set declared in the manifest). The
  latter would need a `table`-valued parameter, but
  `lib/engine/parameters/types.ts`'s `ParameterValueType` is currently
  `quantity | vector_quantity | enum | boolean` only — `table` (and `curve`,
  `load_spectrum`) are validated `EngineeringValue` kinds
  (`lib/engine/values`) that the parameter registry does not yet model, per
  `lib/engine/parameters/README.md` ("modeled as parameters only when a
  module first needs them"). Adding `table` parameter support is a new
  generic-platform capability. Bundling it with this module's production
  behavior is exactly what `context/ai-workflow-rules.md` "Split Rules" forbids
  ("A new generic framework capability and production module behavior").
  It is out of scope here.
- **It matches the existing `axis-load-cases` precedent.** That module's
  Stage 2 contract deferred a canonical *resolved force/moment* output port
  "until whichever later module first needs to consume it as a machine-
  readable port," reporting the richer detail in the calculation trace only
  (`context/modules/axis-load-cases/stage-2-contract.md`, "Deferred Decisions
  and Release Gates" item 1). The same pattern applies here: a future Stage 3
  package's calculation trace can report every segment's and phase's
  individual values (duration, peak/RMS contribution) without any of them
  being a canonical port. If a downstream module later needs true per-segment
  machine-readable access (e.g. a duty-cycle-aware drive-train sizing that
  wants each phase's acceleration and duration individually rather than one
  pre-aggregated RMS number), that is a new Stage 2 decision for whichever
  module needs it, made together with the generic `table`-parameter capability
  it would require — not invented here.

Concretely, `0.1.0`'s multi-segment/cycle outputs are: `cycle_time` (sum of
every segment's duration — already released, unchanged meaning),
`peak_velocity` / `peak_acceleration` / `peak_deceleration` (the maximum
magnitude across every move segment in the cycle — already released,
extended in meaning from "one move" to "one cycle" the same way `cycle_time`'s
own definition already reads "moves plus dwells"), and the new
`rms_acceleration` (item 1 above).

### 3. Jerk / S-curve scope

**Not re-opened.** `stage-1-spec.md`'s working assumption already matches
`context/roadmap.md` Phase 1A ("Symmetric S-curve where source method is
validated") and `context/implementation-map.md` Unit 4.2 ("Symmetric S-curve
where source method is validated"): jerk-limited motion is in the MVP module
set *conditionally*, not unconditionally, and stays deferred until a source
method is verified (see `stage-1-spec.md` "Evidence Gaps" — no verified
source exists yet). This was already answered by the roadmap, not a Stage 2
question this contract needed to resolve.

### 4. Bounded segment count (resolved 2026-08-08, after Stage 3)

**Resolved: the package supports a fixed maximum of 5 moves per cycle
(`MAX_MOVES` in `lib/modules/motion-profile/0.1.0/manifest.ts`), each
optionally followed by its own dwell — a deliberate product decision made
directly by the founder, not derived from a published source or an in-repo
fixture.**

Decision item 2 above ("Multi-segment port shape") already resolved that
every multi-segment *output* is a cycle-level aggregate; it deliberately left
the package's exact *input* port cardinality open, offering two paths:
`table`-valued parameter support (a generic-platform capability the registry
still does not have) or "a deliberate, evidence-backed maximum segment
count." Neither this document nor `stage-1-spec.md` had evidence in hand for
what that maximum should be — no historical fixture in `tests/fixtures/axes/`
records a real multi-move cycle's segment count, and no published source
addresses it (it is a project-specific scoping choice, not an engineering
formula). Rather than invent a number or silently default to one move
forever, this was raised directly to the founder, who chose 5 as a
conservative-but-not-minimal ceiling covering more complex multi-station or
multi-axis-coordinated cycles.

This is recorded as a *scope* decision, not evidence: if a real project later
needs more than 5 moves in one cycle, that is a new Stage 2 decision (a
higher `MAX_MOVES`, or revisiting the `table`-valued-parameter path), not a
silent extension of this one. See `lib/modules/motion-profile/0.1.0/
README.md` "Stage 3 package" for the resulting port shape (`move_{index}_*`
/ `dwell_{index}_time`, `index` 1-5) and its input-schema contiguity rules.

## Released Additive Contract

Registry `1.2.0` adds one released canonical parameter. It does not edit a
released `1.0.0`/`1.1.0` definition.

| Parameter | Value and units | Qualifiers | Meaning |
| --- | --- | --- | --- |
| `motion.profile.rms_acceleration` | quantity, `m/s^2`, `>= 0` | `bound: required`, `aggregation: rms` | Time-weighted RMS acceleration magnitude across every phase (accel/cruise/decel of every move, plus every dwell) of one motion cycle. |

## Existing Parameter Mapping

The future package reuses these already-released (registry `1.1.0`)
definitions without changing their meaning:

| Purpose | Canonical parameter |
| --- | --- |
| Move distance (input, per move segment) | `motion.profile.move_distance` |
| Velocity ceiling (input) | `motion.profile.max_velocity` |
| Acceleration ceiling (input) | `motion.profile.max_acceleration` |
| Dwell duration (input, per dwell segment) | `motion.profile.dwell_time` |
| Move time (per move, trace-only — see "Decisions" item 4) | `motion.profile.move_time` |
| Cycle time (output, cycle-level sum) | `motion.profile.cycle_time` |
| Peak velocity (output, cycle-level max) | `motion.profile.peak_velocity` |
| Peak acceleration (output, cycle-level max) | `motion.profile.peak_acceleration` |
| Peak deceleration (output, cycle-level max) | `motion.profile.peak_deceleration` |

A future package's exact port cardinality (e.g. how a multi-move sequence's
per-move inputs are authored in the generic UI) is a Stage 3/5 concern, not
resolved here — this contract fixes parameter *meaning*, not the input
form.

**Stage 3 update (2026-08-07):** the draft package built from this contract
first wrapped the single-move kernel (`math.ts`) plus one optional dwell via
`cycle.ts`'s `resolveMotionCycle` — the smallest extension that exercised
the cycle kernel without inventing an N-segment port cardinality, since
`dwell_time` reuses an already-released parameter as one extra optional
port rather than needing a new cardinality decision at all.

**Stage 3 update (2026-08-08):** extended to a bounded sequence of up to 5
moves once "Decisions" item 4 resolved the port-cardinality question — see
`lib/modules/motion-profile/0.1.0/README.md` "Stage 3 package" for the
resulting `move_{index}_*` / `dwell_{index}_time` port shape.

## Method Sources

No new source registry entry is added by this record. The `rms_acceleration`
formula is general time-weighted-RMS arithmetic (see "Decisions" item 1
above) — the same "public-domain mechanics, no manufacturer citation needed"
treatment `stage-1-spec.md` already gives the base trapezoidal kinematics. It
does not cite the still-unverified Oriental Motor RMS-torque blog post
recorded in `stage-1-spec.md` "Evidence Gaps"; that source remains
unverified and uncited.

## Draft Kernel Extension

`lib/modules/motion-profile/0.1.0/cycle.ts` adds `resolveMotionCycle`, a pure
function over an ordered sequence of move (`resolveTrapezoidalMove` inputs)
and dwell segments. It sums cycle time, takes the maximum peak
velocity/acceleration/deceleration across move segments, and computes
`rmsAccelerationMps2` as the time-weighted RMS across every phase (each
move's accel/cruise/decel phases, each dwell) per "Decisions" item 1. It does
not alter `resolveTrapezoidalMove`'s per-move result — it is a pure aggregator
over independently-resolved moves, per `stage-1-spec.md` "Candidate Method —
Multi-Segment Move/Dwell Sequence."

It has no `manifest.ts`/`index.ts`, so the registry generator cannot discover
or register it — same draft posture as `math.ts`.
