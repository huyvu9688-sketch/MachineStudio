# Axis Application and Load-Case Module - Stage 2 Contract

## Status

- Work unit: Unit 4.1, first Stage 2 parameter-contract increment
- Date: 2026-07-31
- Coordinate convention: `axis.v1`, defined in
  `context/axis-load-cases-stage-1-spec.md`
- Released registry change: parameter registry `1.1.0`
- Module status: draft pure kernel only; no `ModulePackage`, registry entry,
  calculation run, validation record, or release

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
brake/screw/support demand, and external process load treatment.

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

1. Add per-case vector parameters for external force/moment where `holding` and
   `emergency_stop` need them, and add canonical resolved force/moment outputs
   if downstream modules consume them.
2. Decide whether a future input record supplies external load vectors per case
   or whether a separate generic load-case container is needed. Do not overload
   an unpinned existing port to evade load-case validation.
3. Define emergency-stop deceleration/process-force evidence and holding static
   resistance/brake semantics.
4. Add generic vector-input authoring and result load-case labels before the
   package exposes those fields in the workspace.
5. Strengthen generic parameter-graph compatibility so an unpinned source port
   cannot silently link into a load-case-pinned target.

The module cannot progress to a released Stage 3 package until the final port
map is complete. It cannot progress to Stage 4 or Stage 6 until the Stage 1
validation gate is met: release-grade ID39/ID42 records, a third long-stroke
fixture, published worked examples, an independent benchmark, reviewer or
documented substitute, source-index rows, conformance, and full verification.
