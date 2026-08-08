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
invalid-input, dimensional-output, and cycle (move-plus-dwell) tests.

The package models **one move, optionally followed by one dwell**, as the
whole motion cycle — not an arbitrary N-segment sequence.
`context/modules/motion-profile/stage-2-contract.md` explicitly left the
package's exact port cardinality unresolved ("how a multi-move sequence's
per-move inputs are authored in the generic UI is a Stage 3/5 concern, not
resolved here"): a variable-length sequence of moves and dwells has no fixed
set of ports to bind, and a fixed maximum move count (e.g. "always exactly
two moves") would be inventing product scope, not implementing a resolved
contract. One optional dwell sidesteps that: it reuses the already-released
`motion.profile.dwell_time` parameter as a single extra optional port — the
same "per-instance port" pattern `axis-load-cases` used for its normal/peak
ports — so it needs no new registry version and no arbitrary cardinality
choice. `dwell_time`'s absence means the cycle is the move alone; its
presence adds exactly one dwell phase. `compute.ts` calls both kernels:
`resolveTrapezoidalMove` for the move's own `move_time` and phase detail,
and `resolveMotionCycle` (fed exactly one move segment, plus the dwell
segment when supplied) for the cycle-level `cycle_time`, `peak_velocity`,
`peak_acceleration`, `peak_deceleration`, and `rms_acceleration` outputs.

More than one move per cycle remains unsupported by this package — that
still needs either a `table`-valued parameter (a generic-platform capability
the registry does not have yet) or a deliberate, evidence-backed maximum
segment count, neither of which this Stage 3 pass invents.

This directory intentionally has **no `index.ts`**. The module-registry
generator (`scripts/generate-registry.mts`) only discovers
`lib/modules/<id>/<version>/index.ts`, so naming the assembling file
`package.ts` instead keeps this draft out of the user-facing module
registry. Registration remains gated behind Unit 4.1's Definition of Done
regardless of how far this package gets
(`context/implementation-map.md` Milestone 4 header).
