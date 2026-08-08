# Motion Profile 0.1.0 — Draft Package (Stage 3)

`math.ts` is a pure SI-number kernel for the second production engineering
module (Unit 4.2). `resolveTrapezoidalMove` resolves a single symmetric
trapezoidal (or triangular, when the move distance is too short to reach the
declared velocity ceiling) move — elementary constant-acceleration
kinematics, not a manufacturer-specific method. See
`context/modules/motion-profile/stage-1-spec.md` "Candidate Method — Single
Trapezoidal Move".

`math.test.ts` tests the kernel against its own internal consistency
(distance conservation, phase symmetry, the trapezoidal/triangular boundary,
monotonicity, boundary/invalid input) rather than an external published
example: neither verified candidate source publishes a worked numeric
example for this method, so no reference-example reproduction is claimed
here.

`cycle.ts` (`resolveMotionCycle`) extends the kernel with multi-segment
move/dwell sequencing and the cycle-level RMS acceleration aggregate
(`stage-2-contract.md` "Decisions" items 1-2): it sums cycle time across
every move and dwell, takes the maximum peak velocity/acceleration/
deceleration across move segments, and computes the time-weighted RMS
acceleration across every phase (each move's accel/cruise/decel, each
dwell). It is a pure aggregator over `resolveTrapezoidalMove` results, not a
new kinematics method. `cycle.test.ts` tests it the same way `math.test.ts`
tests the single-move kernel: internal consistency (a one-move cycle reduces
to that move's own values, a pure-triangular cycle's RMS collapses exactly to
the acceleration ceiling, adding dwell time lowers RMS without changing peak
values, repeating an identical move is RMS-scale-invariant), plus boundary/
invalid-input tests.

`oriental-motor-benchmark.ts` reproduces Oriental Motor's general
trapezoidal/triangular positioning-time method (General Catalog 2015/2016,
p. H-23) — independent acceleration/deceleration rates and a non-zero
starting/ending speed, a strictly more general case than `math.ts` covers.
`oriental-motor-benchmark.test.ts` cross-checks it against
`resolveTrapezoidalMove`, reduced to the one case both methods can express
(`a1 = a2`, `startingVelocityMps = 0`), satisfying the independent-benchmark
comparison `context/code-standards.md` "Module Testing" requires. Both
candidate sources named in the spec's "Evidence Gaps" — ABB AN00115 and
Oriental Motor's H-18/H-23 selection-calculations chapter — are now
page-verified; the Oriental Motor RMS-torque blog post is not (its formula
renders as an image, not text, in the source).

## Stage 3 package

`manifest.ts`, `input-schema.ts`, `values.ts`, `checks.ts`, `trace.ts`,
`compute.ts`, `ui.ts`, `report.ts`, `validation.ts`, and `package.ts` wrap
`math.ts` and `cycle.ts` in a full `ModulePackage`, the same shape
`lib/modules/axis-load-cases/0.1.0/` used for its own Stage 3 draft.
`package.test.ts` runs the module conformance suite plus boundary/
invalid-input, dimensional-output, and multi-move cycle tests.

The package models **up to `MAX_MOVES` (5) moves, each optionally followed
by its own dwell**, as the whole motion cycle — a bounded sequence, not an
arbitrary N-segment one. `context/modules/motion-profile/
stage-2-contract.md` explicitly left the package's exact port cardinality
unresolved: a variable-length sequence has no fixed set of ports to bind,
and either a `table`-valued parameter (a generic-platform capability the
registry does not have yet) or a fixed maximum move count would be needed.
**Resolved 2026-08-08 (Decisions item 4 in that document): the founder
chose a fixed maximum of 5 moves directly** — no published source or
in-repo fixture fixes a "correct" segment count for this founder's own
machines, so this is a deliberate product decision, not evidence-backed
research, and is recorded as such rather than invented silently.

Each move gets its own `move_{index}_distance` / `move_{index}_max_velocity`
/ `move_{index}_max_acceleration` port trio (only move 1's trio is
required; moves 2-5 are optional) plus an optional `dwell_{index}_time`
trailing it, reusing the already-released `motion.profile.move_distance`,
`max_velocity`, `max_acceleration`, and `dwell_time` parameters as repeated
per-move-index ports — the same "per-instance port" pattern `axis-load-cases`
used for its normal/peak ports, applied to a move index instead of a load
case. No new registry version was needed. `./input-schema.ts` enforces that
supplied moves are contiguous starting at move 1, that a move's three
fields are all-present or all-absent, and that a dwell's own move is
present — a gap, a partial move, or an orphaned dwell is a hard input
error, not silently reinterpreted.

`compute.ts` reads the ordered move segments (`./values.ts`,
`readMoveSegments`), resolves each independently via
`resolveTrapezoidalMove` (for its own move-time and phase detail, reported
in the trace), and feeds the full ordered move-plus-dwell sequence to
`resolveMotionCycle` for the cycle-level `cycle_time`, `peak_velocity`,
`peak_acceleration`, `peak_deceleration`, and `rms_acceleration` outputs.
Per-move detail (each move's own move time, peak velocity, phase times) is
reported only in the calculation trace, not as a canonical output port: an
output port cannot be conditionally absent (every declared output must be
produced on every run — `lib/engine/module-sdk/execute.ts`), so a per-move
port cannot express "this run only used 2 of the 5 possible moves." The
single-move package's own `move_time` output port was removed for the same
reason — it stopped having an unambiguous single meaning once more than one
move could be present.

This directory intentionally has **no `index.ts`**. The module-registry
generator (`scripts/generate-registry.mts`) only discovers
`lib/modules/<id>/<version>/index.ts`, so naming the assembling file
`package.ts` instead keeps this draft out of the user-facing module
registry. Registration remains gated behind Unit 4.1's Definition of Done
regardless of how far this package gets
(`context/implementation-map.md` Milestone 4 header).
