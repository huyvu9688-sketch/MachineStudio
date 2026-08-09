# Axis Application and Load-Case Module - Stage 2 Contract

## Status

- Work unit: Unit 4.1, Stage 2 parameter contract
- Date: 2026-07-31; scope-resolution update 2026-08-07
- Coordinate convention: `axis.v1`, defined in
  `context/modules/axis-load-cases/stage-1-spec.md`
- Released registry change: parameter registry `1.1.0`
- Stage 2 status: **resolved for a `normal`/`peak`-only `0.1.0` scope** (see
  "Deferred Decisions and Release Gates" below). `holding` and
  `emergency_stop` support is deferred to a future version.
- Module status: a draft `ModulePackage` exists as of 2026-08-07
  (`lib/modules/axis-load-cases/0.1.0/package.ts` — see that directory's
  `README.md`), but it is not registered, has no calculation run, no
  completed validation record, and no release. Stage 4 (validation) is
  partly done: `thk-reference-examples.test.ts` reproduces the three
  published THK worked examples from `stage-1-spec.md` within ±1 N, and
  `validation.ts` records them as real `referenceExamples` — satisfying that
  item independent of the still-blocked ID39/ID42 release-grade evidence and
  independent-benchmark items in `stage-1-spec.md` "Validation Gate and
  Evidence Intake".

This record freezes only the parts of the contract supported by the recovered
historical evidence and the published method intake. It does not convert a
source motion phase into one of the product load-case categories merely because
their names are similar.

## Released Additive Contract

Registry `1.1.0` adds these released canonical parameters. It does not edit a
released `1.0.0` definition.

| Parameter | Value and units | Frame and cases | Meaning |
| --- | --- | --- | --- |
| `motion.axis.case_travel_direction` | enum: `positive` or `negative` | `axis`; `normal`, `peak`, `emergency_stop` | Direction of velocity relative to `axis.v1` +X. |
| `motion.axis.case_axial_acceleration` | signed quantity, `m/s^2` | `axis`; `normal`, `peak`, `emergency_stop`; `required`/`dynamic` | Translational acceleration along +X. Its sign is independent of travel direction. |
| `motion.axis.guide_resistance_force` | non-negative quantity, `N` | `axis`; `normal`, `peak`, `emergency_stop` | Additional documented running resistance, excluding `mu * normal load`; it opposes travel and zero is explicit. |

The module-SDK registration gate now rejects a port that declares a load case
not admitted by its canonical parameter. It remains backward compatible for
unpinned ports. This prevents a module from, for example, binding the existing
normal/peak-only `motion.axis.external_force` to a `holding` port.

The current registry explicitly supports immutable module manifests authored
against `1.0.0` and `1.1.0`; it does not infer compatibility from semver alone.
The two registered development fixtures were corrected to literal `1.0.0`
targets and re-pinned with their source hashes, restoring their pre-v1.1 package
contract rather than silently rewriting a `0.1.0` package when the registry
changes. This is fixture-contract hardening, not a production-module release.

## Existing Parameter Mapping

The future package will reuse the following definitions without changing their
meaning:

| Purpose | Canonical parameter |
| --- | --- |
| Axis geometry and frame declaration | `motion.axis.orientation`, `motion.axis.incline_angle` |
| Moving mass | either `motion.axis.total_moving_mass`, or all of `motion.axis.payload_mass`, `motion.axis.carriage_mass`, and `motion.axis.additional_moving_mass` |
| Centre-of-mass offset | `motion.axis.center_of_mass_offset` |
| Gravity and friction | `motion.axis.gravity`, `motion.axis.friction_coefficient` |
| Usage context | `motion.axis.duty_cycle`, `env.ambient_temperature` |
| Existing normal/peak applied vectors | `motion.axis.external_force`, `motion.axis.external_moment` |

The package schema must require exactly one mass route: an explicit total, or
the complete component-mass breakdown. It must not silently sum an optional
total with a breakdown or select one based on field presence.

## Load-Case Semantics

`normal`, `peak`, and `emergency_stop` are moving cases. They require a travel
direction and signed axial acceleration. `holding` is stationary: it has no
direction port and receives no untraced Coulomb-friction or running-resistance
credit. A future holding contract must explicitly define static resistance,
brake/screw/support demand, and external process load treatment. This is
registry-level semantics for all four cases; `axis-load-cases 0.1.0` itself
only implements `normal` and `peak` (see "Deferred Decisions and Release
Gates" item 1) — `emergency_stop`'s registry-level definition above is ready
for a future module version, not for `0.1.0`.

The recovered historical phases remain `unclassified` in their fixtures. In
particular, acceleration is not automatically `peak`, constant speed is not
automatically `normal`, and deceleration is not automatically
`emergency_stop`. The ID42 upward result likewise is not evidence of a
holding/brake load case.

## Method Sources

The source registry now contains method-source intake metadata for these
records:

- `us.nist.sp811@web-2026-07-31` - standard-gravity reference;
- `jp.thk.ball_screw_general_catalog@515-1e` - axial-load method;
- `jp.thk.example_ball_screw_selection@515-1e` - worked examples; and
- `jp.oriental_motor.linear_actuator_moment@web-2026-07-31` - independent
  centre-of-gravity/moment method intake.

These are module-method evidence, not new US or Japan market-profile baselines.
The two `@web-2026-07-31` records are access-dated intake only, not immutable
reproduction evidence: before a released module cites them, capture a fixed
edition, archived copy, or content hash. All four are deliberately absent from
`validation/source-index.md` until a released module cites them in a completed
validation record.

## Draft Kernel and Regression Boundary

`lib/modules/axis-load-cases/0.1.0/math.ts` is a pure SI-number kernel used by
tests only. It resolves the frozen `axis.v1` gravity vector, centre-of-mass
gravity moment, direction-opposed Coulomb friction, documented running
resistance, external loads, and the signed axial drive demand.

It has no `index.ts`, so the registry generator cannot discover or register it.
The ID39 horizontal and ID42 vertical fixture tests reproduce the reported
source-phase force magnitudes while asserting that their product load-case
mapping is unclassified. This is a regression aid, not a claim of completed
Stage 3, validation, or release.

## Deferred Decisions and Release Gates

The final package port map remains intentionally unresolved until these items
have a source-backed contract:

1. **RESOLVED (2026-08-07), scope decision:** `axis-load-cases 0.1.0` supports
   only the `normal` and `peak` load cases. `holding` and `emergency_stop` are
   valid `LoadCase` enum values elsewhere in the engine, but this module does
   not accept or emit them in `0.1.0`. The available evidence forces this:
   `tests/fixtures/axes/axis-horizontal-basic/fixture.ts` and
   `axis-vertical/fixture.ts` — the only real project evidence this module has
   — record `externalForces: []` / `externalMoments: []` throughout and list
   in their own `unknowns` that neither source case states a holding/brake
   case or an emergency-stop case. There is nothing to source per-case
   external force/moment vectors, or emergency-stop/holding semantics, from.
   Rather than invent that semantics, Unit 4.1 ships a smaller module whose
   supported envelope matches its evidence, and a later `0.2.0` adds `holding`
   and `emergency_stop` when real evidence for them exists (see
   `context/progress-tracker.md` Open decisions).

   **The canonical-resolved-force/moment-output question itself is now
   RESOLVED (2026-08-09):** the guide module (Unit 4.4) now exists in draft
   (`context/modules/linear-guide/stage-1-spec.md`) and needs exactly this.
   Registry `1.4.0` adds `motion.axis.resultant_force` and
   `motion.axis.resultant_moment` (both `vector_quantity`, per case) as new
   released output ports on this still-unregistered `0.1.0` draft, built from
   the same `resultantAppliedForceN`/`resultantAppliedMomentNm` values
   `math.ts` and `./trace.ts` already computed — see
   `lib/modules/axis-load-cases/0.1.0/README.md` "Resultant force/moment
   output ports (2026-08-09)". `motion.axis.thrust_force` is unchanged: it
   remains the axial-only scalar drive demand, now joined by a full-vector
   sibling rather than replaced.
2. **RESOLVED (2026-08-07):** per-case load vectors live as per-case
   parameters (`loadCases` on the parameter definition), the same pattern
   already released for `motion.axis.case_travel_direction`,
   `case_axial_acceleration`, and `guide_resistance_force` — not a separate
   generic load-case container. No unpinned existing port is overloaded: with
   scope item 1 above, `0.1.0` needs only the already-released
   `motion.axis.external_force` / `external_moment` (`normal`, `peak`), so no
   new registry version is required for `0.1.0`. A future `holding`/
   `emergency_stop` release extends this by adding new `loadCases` admission
   to new parameter IDs (or a new parameter version), never by editing the
   released `1.0.0`/`1.1.0` definitions in place.
3. **RESOLVED (2026-08-07), deferred to a future version:** emergency-stop
   deceleration/process-force evidence and holding static-resistance/brake
   semantics are out of scope for `0.1.0` (see item 1). They remain open
   items for a `0.2.0` proposal once sanitized evidence exists — see
   `context/progress-tracker.md` Open decisions.
4. Add generic vector-input authoring and result load-case labels before the
   package exposes those fields in the workspace.
   - **PARTIALLY CLOSED (2026-08-01)**: the result-load-case-labels half is
     done. `RunOutputView`/`ChangedOutputView`
     (`lib/application/calculations/load-module-result-view.ts`) now carry
     each output port's `loadCase` (already present on `ModuleOutputPort`,
     simply not read before), and `ModuleResultPanel` renders it via a new
     shared `LoadCaseChip` (`components/engineering/load-case-chip.tsx`,
     extracted from `module-input-workspace.tsx`'s existing input-side chip
     of the same name — the identical presentation the input side already
     established, applied to the output summary and previous-run comparison
     rows). This closes the literal "so a separate generic UI unit must add
     output load-case labels before four same-parameter thrust outputs are
     exposed to users" requirement from
     `context/modules/axis-load-cases/stage-1-spec.md`. No engine contract changed —
     `CheckResult`/`Warning`/`ValidityResult` stay unlabeled by load case,
     since they are not themselves port-scoped and Stage 1 only named
     *output* labels as the blocker. **The vector-input-authoring half
     remains open** — a materially larger generic-UI/value-type design
     decision (how a `vector_quantity` field is edited, not just displayed),
     deliberately not attempted alongside the smaller labeling fix. See
     `context/progress-tracker.md` Current Phase for verification detail.
   - **CLOSED (2026-08-05)**: the vector-input-authoring half is done too.
     The generic module-input renderer now edits any `frame: "axis"`
     vector — `describeField` in the new
     `lib/application/calculations/describe-field.ts` (extracted from
     `load-module-workspace-view.ts`, which still re-exports both it and
     `ModuleInputFieldDescriptor` unchanged) produces the new
     `"vector_quantity"` field-descriptor kind, and `FieldControl`
     (`components/engineering/module-input-workspace.tsx`) renders it —
     exactly the case `motion.axis.center_of_mass_offset`,
     `motion.axis.external_force`, and `motion.axis.external_moment` all
     need. See
     `docs/design/vector-quantity-input-editor.md`
     and `context/progress-tracker.md` Current Phase for full detail. Item 4
     is now fully closed — both halves (result-load-case labels,
     2026-08-01, and vector-input authoring, 2026-08-05) are done.
5. **CLOSED (2026-08-01)**: generic parameter-graph compatibility now rejects an
   unpinned source port linking into a load-case-pinned target.
   `lib/engine/graph/compatibility.ts`'s `evaluateLinkCompatibility` load-case
   criterion previously fired only when *both* nodes pinned a case and they
   differed, so an unpinned source (its true case unknown) could silently
   satisfy a pinned sink (e.g. a `holding`-only port). It now rejects whenever
   the sink pins a case and the source's case is not identical, including when
   the source declares none at all; an unpinned sink still imposes no
   constraint. This is a pure `lib/engine/graph` change with no schema or
   evidence dependency, so it closed independently of the other four items —
   `suggestSources` and `confirmParameterLink` both call
   `evaluateLinkCompatibility` directly, so the fix applies to suggestion
   ranking and server-side link confirmation without any call-site change. Not
   a module release; no module exercises this path yet. See
   `context/progress-tracker.md` Current Goal for verification detail.

All five deferred items above are now resolved for the `0.1.0` scope (items
1-3 resolved 2026-08-07 by narrowing to `normal`/`peak`; items 4 and 5 closed
2026-08-01/05). The final `0.1.0` port map is: the existing registry `1.1.0`
parameters listed under "Existing Parameter Mapping" above, plus
`motion.axis.external_force` / `external_moment` restricted to their already-
released `normal`/`peak` cases. No new registry version is required to start
Stage 3. `holding` and `emergency_stop` support is out of scope for `0.1.0`
and requires a separate future proposal once real evidence exists.

**Stage 3 (compute and trace) is done as a draft, 2026-08-07:** a full
`ModulePackage` — manifest, ports, input schema (enforcing the mass-route
rule), compute, calculation trace, checks, UI schema, report schema, and a
draft validation record — wraps the existing kernel in
`lib/modules/axis-load-cases/0.1.0/` (assembled in `package.ts`, not
`index.ts` — see that directory's `README.md`). The module conformance
suite, mass-route and boundary/invalid-input tests, and a full-module
regression against ID39/ID42 all pass (`package.test.ts`). The module still
cannot progress to a *released* Stage 3 package (i.e. renaming `package.ts`
to `index.ts` and registering it), or to Stage 4 or Stage 6, until the Stage
1 validation gate is met: release-grade ID39/ID42 records, a third
long-stroke fixture, published worked examples, an independent benchmark,
reviewer or documented substitute, source-index rows, conformance, and full
verification.
