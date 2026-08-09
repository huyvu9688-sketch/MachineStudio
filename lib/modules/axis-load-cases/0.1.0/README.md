# Axis Load Cases 0.1.0 — Draft Package (Stage 3)

`math.ts` is a pure SI-number kernel for the first production engineering
module. It freezes the `axis.v1` gravity, resistance, moment, and
signed-drive-force arithmetic while keeping the historical ID39/ID42 phase
categories explicitly unclassified. `axis-load-cases.test.ts` regression-tests
the kernel directly against those fixtures.

`manifest.ts`, `input-schema.ts`, `compute.ts`, `trace.ts`, `checks.ts`,
`ui.ts`, `report.ts`, and `validation.ts` assemble a draft `ModulePackage`
(`package.ts`) around that kernel — Stage 3 of the New Module Workflow
(context/ai-workflow-rules.md). Scope: this version resolves only the
`normal` and `peak` load cases; `holding` and `emergency_stop` are deferred to
a future version (context/modules/axis-load-cases/stage-2-contract.md,
"Deferred Decisions and Release Gates" item 1). `package.test.ts` runs the
module conformance suite, mass-route and boundary/invalid-input tests, and a
full-module historical regression against ID39/ID42 (distinct from the
kernel-level regression in `axis-load-cases.test.ts` — same fixtures, exercised
through the assembled package instead of the bare kernel).

`thk-reference-examples.test.ts` reproduces the three published THK worked
examples recorded in `stage-1-spec.md` ("Candidate Sources and Published
Examples": B15-72 horizontal, B15-86 vertical, B2-22 vertical) within ±1 N,
using THK's own `g = 9.8 m/s^2` convention rather than the module's
NIST-derived default. `validation.ts` records them as real
`referenceExamples`, satisfying the roadmap's "at least three published
reference examples reproduced within stated tolerances" item on its own —
distinct from, and not a substitute for, the ID39/ID42 historical fixtures.
`test-helpers.ts` holds the small `EngineeringValue` builders shared by all
test files.

`atlanta-benchmark.ts` reproduces a rack-and-pinion drive manufacturer's
independent axial-force method (Atlanta, "Rack and Pinion Drive Calculations
and Selection," pp. C-53-C-55 — a different transmission mechanism than
THK's ball screw) as a distinct implementation, satisfying the roadmap's "at
least one independent benchmark source or tool comparison" item.
`atlanta-benchmark.test.ts` reproduces both of that source's published
worked examples and cross-checks the benchmark against `math.ts`'s
`resolveAxisLoadPhase` for the equivalent reduced scenario — the two
independently-authored formulas agree to floating-point precision. This
source's licensing status is unresolved (`context/progress-tracker.md` "Open
decisions"), so it is deliberately not registered in `lib/standards` or cited
via a `ClauseReference` anywhere; see the header comment in
`atlanta-benchmark.ts` and `validation.ts`'s `independentBenchmark` field for
the full caveat.

## Resultant force/moment output ports (2026-08-09)

`manifest.ts` adds four new output ports —
`normal_resultant_force`/`peak_resultant_force`
(`motion.axis.resultant_force`) and
`normal_resultant_moment`/`peak_resultant_moment`
(`motion.axis.resultant_moment`), registry `1.4.0` — exposing the full
`axis.v1` force and moment vectors `math.ts`'s `resolveAxisLoadPhase` (and
`./trace.ts`) already computed internally but this package previously kept
trace-only. `motion.axis.thrust_force` remains the axial-only (`+X`) scalar
drive demand; the new ports carry all three components, including the
transverse (`Y`, `Z`) loads a downstream module needs and the axial scalar
alone cannot express. Added because `linear-guide` (Unit 4.4) needs exactly
this — see `context/modules/linear-guide/stage-1-spec.md` "A Real,
Already-Documented Dependency Gap", which this module's own Stage 1 and
Stage 2 documents anticipated by name before that module existed.
`compute.ts` builds these from the same `cases.<case>.result` the trace
already uses (`./values.ts`'s `makeAxisVector`), not a recomputation.
`package.test.ts` adds a dedicated test with a nonzero center-of-mass
offset and lateral external force/moment, confirming the new ports' `Y`/`Z`
components against a hand-derived expectation (`thrust_force` alone cannot
be checked this way, since it has no transverse component to verify).

This directory intentionally has **no `index.ts`**. The module-registry
generator (`scripts/generate-registry.mts`) only discovers
`lib/modules/<id>/<version>/index.ts`, so naming the assembling file
`package.ts` instead keeps this draft out of the user-facing module registry.
Registering it — renaming `package.ts` to `index.ts` and running
`npm run registry:generate` — requires the rest of the Stage 1 validation
gate first: release-grade ID39/ID42 evidence, the third long-stroke/high-speed
fixture, and a completed validation record (see `context/progress-tracker.md`
"Blocked" and `stage-1-spec.md` "Validation Gate and Evidence Intake"). The
independent-benchmark item is now satisfied — see above.

The historical regression tests import the sanitized fixtures in
`tests/fixtures/axes/` and compare force magnitudes only. They do not infer
`normal`, `peak`, `holding`, or `emergency_stop` from a source
acceleration/steady/deceleration phase.
