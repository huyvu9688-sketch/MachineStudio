# Axis Load Cases 0.1.0 — Released

`axis-load-cases@0.1.0` is registered and released (Unit 4.1,
`docs/superpowers/plans/2026-08-11-unit-4.1-release.md`) — the project's
first production engineering module release. It resolves through
`getModulePackage("axis-load-cases", "0.1.0")`
(`lib/modules/registry.generated.ts`), and its conformance suite
(`package.test.ts`) reports `import-boundary` and `source-immutability` as
real, passing checks — not skipped. The complete validation record is
`validation/axis-load-cases/0.1.0.md`.

`index.ts` is the package entry point: it assembles `manifest.ts`,
`input-schema.ts`, `compute.ts`, `trace.ts`, `checks.ts`, `ui.ts`,
`report.ts`, and `validation.ts` around the pure `math.ts` kernel into a
sealed `ModulePackage` (`sealModulePackage`, stamping
`manifest.contentHash`). This is the only file `npm run
registry:generate` (`scripts/generate-registry.mts`) discovers, and the
only object the engine executes and reports on.

`math.ts` is the pure SI-number kernel: it freezes the `axis.v1` gravity,
resistance, moment, and signed-drive-force arithmetic. `compute.ts` reads
canonical input magnitudes, delegates the physics to `math.ts`'s
`resolveAxisLoadPhase`, and returns a structured `ModuleComputation`
(outputs, trace, checks, warnings, assumptions, validity). Performs no
I/O and imports only the engine's public surface and this module's own
files.

## Scope: `normal` and `peak` cases only

This version resolves only the `normal` and `peak` load cases. `holding`
and `emergency_stop` are valid `LoadCase` values elsewhere in the engine
but are **not implemented in `0.1.0`** and are deferred to a future
version (`context/modules/axis-load-cases/stage-2-contract.md`,
"Deferred Decisions and Release Gates" item 1): neither of this module's
two accepted historical fixtures (ID39, ID42) records a holding/brake
case or an emergency-stop case, so there is no evidence to source that
semantics from yet.

## Trace-only usage/environment context

`duty_cycle` (`motion.axis.duty_cycle`) and `ambient_temperature`
(`env.ambient_temperature`) are optional input ports recorded in the
calculation trace's `usage-context` step (`trace.ts`) when supplied.
**Neither is ever consumed by a load-case force/moment equation.**
`package.test.ts`'s "usage and environment context" tests prove this
directly: every normal/peak force and moment output is asserted
byte-for-byte identical between a run with both values supplied and a
run with neither. If a future version needs duty-cycle-based force
averaging or temperature-based derating, that is a deliberate new
capability, not an implicit effect of supplying these two ports today.

## Historical evidence: ID39/ID42, and the deferred third fixture

The historical ID39 (horizontal, `tests/fixtures/axes/axis-horizontal-
basic/`) and ID42 (vertical, `tests/fixtures/axes/axis-vertical/`)
sanitized project fixtures are accepted as `0.1.0-release-candidate`
regression evidence for this release — **not release-grade vendor-sizing
validation.** Neither fixture's original document revision nor a
confirmed as-built installation record is available, and those gaps
(plus ID42's own printed `75 N`/`45 N` acceleration-force discrepancy and
its Keyence/HIWIN motor-manufacturer attribution conflict) are recorded
rather than hidden — see `validation/axis-load-cases/0.1.0.md` and each
fixture's own README for the full detail. `package.test.ts`'s "historical
regression (full module)" tests reproduce both fixtures' reported source-
phase force magnitudes through the real compute path while keeping their
phase-to-load-case mapping explicitly `unclassified`; `axis-load-
cases.test.ts` does the same at the bare-kernel level.

A third long-stroke/high-speed real-project fixture, needed for the
broader Unit 0.1 and Phase 1B linear-axis validation goals, remains
absent from `reference/source-material/`. Its absence is **not** a
`0.1.0` supported-case claim and is **not** a blocker for this release:
it is deferred evidence for later validation work, and it will be added
when a real project exists — never fabricated or replaced by a synthetic
fixture.

## Three THK reference examples, and the fixed NIST gravity source

`thk-reference-examples.test.ts` reproduces the three published THK worked
examples recorded in `stage-1-spec.md` ("Candidate Sources and Published
Examples": B15-72 horizontal, B15-86 vertical, B2-22 vertical) within
`±1 N`, through the real `executeModule` compute path, supplying THK's own
`g = 9.8 m/s^2` convention explicitly rather than the module's default. That
default — and every other active axis-load citation of NIST gravity, in
`manifest.ts` and `trace.ts` — now cites the fixed, immutable
`us.nist.sp811@2008-2nd-printing` revision (2008 Edition, second printing,
Appendix B.8, `g_n = 9.80665 m/s^2`), not the earlier access-dated
`us.nist.sp811@web-2026-07-31` intake record. `validation.ts` records the
three THK examples as real `referenceExamples`, satisfying the roadmap's "at
least three published reference examples reproduced within stated
tolerances" item on its own — distinct from, and not a substitute for, the
ID39/ID42 historical fixtures. `test-helpers.ts` holds the small
`EngineeringValue` builders shared by all test files.

`atlanta-benchmark.ts` reproduces a rack-and-pinion drive manufacturer's
independent axial-force method (Atlanta Drive Systems, "Rack and Pinion
Drive Calculations and Selection," pp. C-53-C-55 — a different transmission
mechanism than THK's ball screw) as a distinct implementation, satisfying
the roadmap's "at least one independent benchmark source or tool
comparison" item. `atlanta-benchmark.test.ts` reproduces both of that
source's published worked examples (horizontal `2444.42 N` vs. published
`2440 N`; vertical `4143 N` vs. published `4100 N`, both within the
source's own coarser catalog-rounding tolerance) and cross-checks the
benchmark against `math.ts`'s `resolveAxisLoadPhase` for the equivalent
reduced scenario — the two independently-authored formulas agree to
floating-point precision. This source is registered in `lib/standards`
(`us.atlanta_drive_systems.rack_pinion_calculations@sha256-
2bc6e48c2dce79dd`) as `access: "licensed"`, metadata-only, with
redistribution status unresolved: its content is never redistributed,
quoted, or linked from any customer-facing trace or report, only its
`SourceRevisionId` is cited. See the header comment in
`atlanta-benchmark.ts` and `validation.ts`'s `independentBenchmark` field,
plus `validation/axis-load-cases/0.1.0.md`, for the full detail.

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

## Registration and sealed hashes

This directory's assembling file is `index.ts` (renamed from the earlier
draft `package.ts` at Task 5 of the release plan), so `npm run
registry:generate` discovers and registers it —
`lib/modules/registry.generated.ts` imports `./axis-load-cases/0.1.0` and
keys it `"axis-load-cases@0.1.0"`. Two independent hashes are pinned as part
of this release, and both are re-verified stable after every edit in the
release task:

- The module **source-immutability hash** (`npm run module:source-hash --
axis-load-cases 0.1.0`) is pinned as `EXPECTED_SOURCE_HASH` in
  `package.test.ts` and checked by `runModuleConformance`'s
  `source-immutability` check — it covers `compute.ts` and its helpers,
  since a function is not stably serializable and nothing else catches an
  in-place edit to a released version's formula.
- The sealed **package content hash** (`ModuleManifest.contentHash`,
  stamped by `sealModulePackage` in `index.ts`) is recorded in
  `validation/axis-load-cases/0.1.0.md`'s identity table.

The historical regression tests import the sanitized fixtures in
`tests/fixtures/axes/` and compare force magnitudes only. They do not infer
`normal`, `peak`, `holding`, or `emergency_stop` from a source
acceleration/steady/deceleration phase.
