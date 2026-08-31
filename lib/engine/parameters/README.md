# Canonical Parameter Registry (Unit 1.3)

The canonical parameter registry gives every engineering quantity a stable
identity and precise semantics so module ports, requirements, and the parameter
graph all refer to the same thing. It is the source of truth referenced by
context/architecture.md ("Canonical Parameter Registry") and
context/code-standards.md ("Canonical Parameters").

## Public surface

- `PARAMETER_REGISTRY` — the released registry singleton (built and validated at
  import time).
- `PARAMETER_REGISTRY_VERSION` / `PARAMETER_REGISTRY_HASH` — semantic version and
  deterministic content fingerprint.
- `getParameter`, `hasParameter`, `listParameters`, `resolveParameter` —
  convenience lookups bound to the singleton. `resolveParameter` follows the
  replacement chain for deprecated parameters.
- `buildParameterRegistry(definitions, version)` — builds and validates an
  arbitrary definition set (used by tests and by future externally-sourced
  registries).
- `defineParameter(spec)` — authoring helper that applies conventional defaults.
- `ParameterDefinitionSchema` / `parseParameterDefinition` — structural (Zod)
  validation at external/persistence boundaries.

## Invariants enforced

- Unique parameter IDs.
- No two parameters share a symbol within the same scope (the ID's dotted prefix).
- Physical parameters (`quantity`, `vector_quantity`) carry a registered
  canonical unit, dimension-compatible display units, and a dimension-compatible
  range; enum and boolean parameters carry none of that.
- `constant` defaults match the parameter's value type and dimension.
- Deprecated parameters point at an existing, acyclic replacement; non-deprecated
  parameters declare no replacement.

Released parameter IDs are **immutable**. To change a meaning, deprecate the ID
and release a replacement — never edit a released definition in place.

## Registry versioning

Adding parameters (e.g. a new module's ports) releases a **new registry
version**: bump `PARAMETER_REGISTRY_VERSION`, add the definitions, and update the
pinned hash fixture in `hash.test.ts`. Old released calculation runs keep
referencing the registry version they were computed against.

An immutable module manifest records the exact registry version its ports were
authored against as a **literal**, never by importing the mutable current-version
constant. The module SDK accepts it only when the active registry explicitly
declares that historical target compatible; it does not infer compatibility from
same-major semver alone. Add a historical version to
`PARAMETER_REGISTRY_SUPPORTED_VERSIONS` only after reviewing that every referenced
parameter's meaning and ID remain compatible.

## v1.1 scope and deferred groups

Registry v1.0 releases the groups Phase 1A concretely needs:

- **Project and environment** — supply frequency/voltage class, ambient temperature.
- **Axis application and load cases** (`motion.axis.*`) — orientation, geometry,
  masses, center-of-mass offset, friction, gravity, duty cycle, external
  force/moment, and the resolved gravitational and thrust load outputs.
- **Motion profile** (`motion.profile.*`) — move/dwell/cycle timing, velocity and
  acceleration limits, and peak velocity/acceleration/deceleration outputs.

The **screw, guide, coupling, support-bearing, and drive-train** result groups
(named as initial groups in context/implementation-map.md Unit 1.3) are **not**
released in v1.0. Their exact ports depend on each module's Stage-1 engineering
specification, which does not exist yet; releasing immutable IDs before the
semantics are pinned would be inventing behavior. They are **approved pending
proposals**, released per module at its Stage-2 parameter contract (see
context/ai-workflow-rules.md "New Module Workflow"). The upstream motion outputs
above already serve as those modules' shared input ports. Three of the five have
since been released on exactly that schedule — `screw.*` in v1.3, `guide.*`
in v1.5, `coupling.*` in v1.6, `bearing.*` in v1.7, and `drive.*` in v1.8,
each at its own module's Stage-2 contract. All five are now released.

The `curve`, `load_spectrum`, `table`, `material_ref`, and `component_ref` value
families are likewise modeled as parameters only when a module first needs them.

Registry v1.1 adds the first axis-load-case contract refinements without
changing any released v1 definition: signed moving-case acceleration, explicit
travel direction, and guide/seal resistance distinct from Coulomb friction.
They apply only to `normal`, `peak`, and `emergency_stop`; a holding case is
stationary and must not receive an invented friction credit. The existing
external force/moment parameters remain normal/peak-only. Axis-frame external
vectors and resolved force/moment outputs are deferred until their source-backed
semantics are ready for a later registry release.

Registry v1.2 adds one motion-profile output,
`motion.profile.rms_acceleration` (`aggregation: rms`): a cycle-level
time-weighted RMS acceleration demand across every phase of a motion cycle
(see `context/modules/motion-profile/stage-2-contract.md`). It is a duty-cycle
demand quantity a downstream module (the servo drive-train module, Unit 4.7)
scales by its own inertia/friction model into RMS torque; `motion-profile`
does not compute torque, and does not release an RMS _velocity_ parameter
(not a piecewise-constant duty quantity, unlike acceleration). The
multi-segment/cycle outputs remain cycle-level aggregates only — no
per-segment port exists, because the registry has no `table`-valued parameter
support yet (`ParameterValueType` in `./types.ts` is `quantity |
vector_quantity | enum | boolean`); adding that is a separate generic-platform
capability, not bundled into a single module's parameter contract.

Registry v1.3 adds two axis-scope per-case inputs (`case_time_fraction`,
`case_linear_velocity`) and the full `screw.*` group
(`context/modules/ball-screw/stage-2-contract.md`).

Registry v1.4 adds `motion.axis.resultant_force` and
`motion.axis.resultant_moment` — the full three-component force and moment
vectors `axis-load-cases`' kernel already resolved internally but exposed only
as the axial `thrust_force` scalar. Added for `linear-guide`, the first
downstream consumer that needs the complete guide-reference-point load
(`context/modules/linear-guide/stage-1-spec.md` "A Real, Already-Documented
Dependency Gap").

Registry v1.5 adds the `guide.*` group for `linear-guide`
(`context/modules/linear-guide/stage-2-contract.md`): rail/block spacing,
static and dynamic load ratings, rolling-element type, preload grade, the
`fW`/`fH`/`fT` life correction factors, a required static-safety-factor
minimum, and three per-case outputs (equivalent load, static safety factor,
nominal life). Two deliberate omissions, each because the `0.1.0` scope does
not consume it: a static/dynamic **moment rating** (the two-rail arrangement
expresses moment as differential per-block loading instead), and a
**dynamic-load-rating basis** qualifier of the kind `screw.*` needs — PMI and
IKO both publish rolling-guide life as travel distance, so there is no
revolutions/distance ambiguity to record. `guide.nominal_life` is stored
canonically in metres and displayed in `km` (a unit this release adds to the
unit registry), the same canonical-SI/convenient-display split
`screw.nominal_life_hours` already uses.

Registry v1.6 adds the `coupling.*` group for `coupling`
(`context/modules/coupling/stage-2-contract.md`): rated/maximum torque,
allowable speed, torsional stiffness and moment of inertia (both catalog
values, reported not evaluated — no released motor/load inertia parameter
exists yet for a resonant-frequency check to consume), driving/driven bore
ranges, allowable and actual misalignment (parallel, angular, axial), actual
shaft diameters, a required consolidated `service_factor` (KTR's and R+W's
own operating/temperature/starting/direction factor tables disagree, the
same "required input, neither table adopted" treatment
`guide.static_safety_factor_minimum` already received), and two per-case
outputs (torque safety factor, speed safety factor). Adds `N*m/rad`
(torsional stiffness) to the unit registry — the first new dimension
(`Dimensions.torsionalStiffness`) added since v1.0's initial set, not just a
new unit on an existing one.

Registry v1.7 adds the `bearing.*` group for `support-bearing`
(`context/modules/support-bearing/stage-2-contract.md`): a `location` enum
selecting which of two physically different support-bearing positions a run
represents, catalog dynamic/static load ratings and equivalent-load factors,
a required `static_safety_factor_minimum` with no built-in default, an
engineer-supplied `actual_radial_load` (no released upstream parameter
represents it), and reuses `motion.axis.thrust_force` directly for axial
load — satisfying the roadmap's own Unit 4.6 gate ("integrates with the
ball-screw module without a custom link mapping") without a new `screw.*`
output.

Registry v1.8 adds the `drive.*` group for `drive-train`
(`context/modules/drive-train/stage-2-contract.md`), the last of the five
result groups this file's own v1.1 section named as initial groups —
motor/gearbox/drive/brake catalog inputs, three required margin/limit
inputs with no built-in default (RMS-torque margin, peak-torque margin,
maximum inertia ratio — a five-way sourced disagreement on the last one,
sharper than any prior module's own factor mismatch), and per-case
computed torque/speed/regenerative-energy outputs. Reuses `screw.gear_ratio`
directly rather than adding a duplicate; adds a new `gearbox_efficiency`
input distinct from the already-released `screw.mechanical_efficiency`,
since `ball-screw 0.1.0`'s own released kernel does not model a gearbox's
own transmission loss (a real gap found by reading the kernel, not a
defect — the derating is `drive-train`'s own, layered on top of
`screw.drive_torque`, since `ball-screw`'s released version cannot be
edited in place). Adds `J` (joule) to the unit registry as a new unit on
the _existing_ torque dimension, not a new dimension — this registry's own
torque dimension carries no angle exponent, so energy and torque share
identical SI base-unit exponents; `N*m` keeps sole ownership of the
`siCoherent` flag.

Registry v1.9 adds the `motor_sizing.ball_screw.*` group for the
`ball-screw-motor-sizing` module (context/modules/
ball-screw-motor-sizing/stage-2-contract.md), the first module in the new
Motor Sizing Tool family (ADR-0011, Milestone 6). Unlike every group
above, this module is deliberately self-contained: it reproduces, rather
than links to, the physics already released in `axis-load-cases`,
`ball-screw`, `motion-profile`, and `drive-train`, reusing only
`screw.lead`, `screw.gear_ratio`, `screw.preload`, `screw.internal_
friction_coefficient`, `screw.mechanical_efficiency`, and the
`motion.axis.*` orientation/mass/friction/gravity group directly -- not
`screw.drive_torque`, `drive.reflected_load_inertia`, or any `drive.*`
margin/limit parameter, each for its own documented reason
(stage-2-contract.md "Decisions"). Its own motion inputs use six distinct
`forward_*`/`return_*` parameter IDs plus one `dwell_time`, never an
indexed shared-ID family -- the specific fix for a real defect Unit 5.4
found in `motion-profile`'s own `move_{1..5}_*` ports (this file's own
v1.2 note; `context/progress-tracker.md` "Open decisions"): those five
ports all share one canonical `move_distance` ID, so the database layer
(keyed by `(parameterId, loadCase)` only) cannot tell them apart. Its own
`effective_torque_safety_factor`/`momentary_torque_safety_factor` are
`>= 1` multipliers applied to a computed torque to get a required minimum
motor rating -- the inverse direction from `drive.rms_torque_margin`/
`drive.peak_torque_margin` (`<= 1`, a fraction of a _known_ candidate
motor's own rated torque), because this module takes no candidate motor's
own rated/peak torque as an input at all (ADR-0011's own "no catalog
matching" scope). No new unit or dimension is needed.

Registry v1.10 adds the `motor_sizing.direct_drive_conveyor.*` group for the
`direct-drive-conveyor-motor-sizing` module (context/modules/
direct-drive-conveyor-motor-sizing/stage-2-contract.md), the second module
in the Motor Sizing Tool family (ADR-0011). Also self-contained, reusing
only `motion.axis.gravity` and calling `lib/engine/mechanics` (Unit 6.1)
directly. Its own `belt_friction_coefficient` is a deliberately new
parameter, not a reuse of `motion.axis.friction_coefficient` -- a different
physical interface (belt-to-load friction, ~0.3) with a materially
different typical value from a linear-guide's own sliding friction
(~0.05), and no upper cap (unlike `motion.axis.friction_coefficient`'s own
`max: 1`), since some belt/load material pairs genuinely exceed a
coefficient of 1. Scoped narrower than `motor_sizing.ball_screw.*` in two
ways found while writing this contract: a single acceleration event (no
deceleration phase, no dwell, no repeating cycle) rather than a round trip,
since no source for this mechanism computes or needs a deceleration-phase
or RMS torque; and one combined `required_torque_safety_factor` (`>= 1`)
rather than two separate margins, since there is only one computed torque
figure to apply a margin to. Has no gear-ratio parameter at all -- `0.1.0`'s
own purpose is specifically the direct-drive (no gearbox) case, not one
merely defaulted to a ratio of `1`. No new unit or dimension is needed.

Registry v1.15 adds one new parameter per Motor Sizing mechanism —
`motor_sizing.<mechanism>.inertia_ratio_recommended_maximum` (ball_screw,
direct_drive_conveyor, rack_pinion, belt_pulley, index_table) — a sibling
of each mechanism's own existing `*.inertia_ratio_maximum` (required, no
default, unedited by this release). Each new parameter carries a
founder-directed default of 10, disclosed in its own definition text as
founder judgment rather than a manufacturer-sourced figure — see
`docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md`
"Inertia-ratio recommended default" for the full account.

Registry v1.21 adds three new scopes -- shaft.\*, key.\*, bolt.\* (38
parameters) -- for the shaft-key-bolt-checks module (context/modules/
shaft-key-bolt-checks/stage-2-contract.md), Milestone 7's fifth module and
the first not scoped to any one mechanism family. Torque is a plain
required, direct-entry port sharing screw.drive_torque's own unit,
qualifiers, and load cases -- but it is NOT graph-link-compatible with it
(a Stage 5 finding, not the original claim: this project has no populated
ApprovedParameterMapping mechanism, so a link needs the identical
parameterId, and shaft.applied_torque was deliberately minted as its own
parameter, not a reuse of screw.drive_torque, since this module is not
scoped to ball screws -- see stage-2-contract.md "Decisions" item 5's own
Stage 5 correction). The module does not hard-depend on any upstream
source either way; bending moment stays
direct-entry only, since no released port represents a bending moment at
an arbitrary shaft cross-section. key.* reuses shaft.diameter and
shaft.applied_torque directly -- one module's own two scopes sharing ports,
a new kind of reuse distinct from every prior module's own cross-module
reuse. Stress reuses the pressure dimension (MPa/psi, already released for
pneumatic.operating_pressure) -- no new unit-registry dimension or unit is
needed.

Follow this before adding a parameter (mirrors context/code-standards.md
"Canonical Parameters"). Every item must be satisfied.

1. **Search first.** Search existing definitions and related modules for the same
   or an overlapping quantity. Reuse an existing ID rather than creating a near
   duplicate.
2. **Confirm the exact engineering meaning.** Write the precise definition,
   including what is included/excluded and the sign/direction convention.
3. **Choose a stable ID and scope.** Use `<scope>.<name>` (dotted). The scope is
   everything before the final segment and governs symbol uniqueness.
4. **Assign a symbol** unique within the scope.
5. **Pick the value type** (`quantity`, `vector_quantity`, `enum`, `boolean`).
6. **Physical parameters:** choose the canonical (SI-coherent) storage unit, the
   allowed display units (all dimension-compatible), and a valid range where
   meaningful.
7. **Enum parameters:** define the `enumId` and the complete option set.
8. **Semantics:** set the qualifiers (`bound` required/allowable, `aggregation`
   peak/rms/nominal/mean, `loadNature` static/dynamic), the coordinate `frame`,
   and the load-case categories where applicable.
9. **Default policy:** `required`, `optional`, or a `constant` engineering value.
10. **Overlap analysis:** document why no existing parameter fits (in the PR or
    the module's validation record).
11. **Tests:** add or extend registry tests covering the new parameter.
12. **Release a new registry version** and update the pinned hash fixture.

Never reuse a released parameter ID for a changed meaning — deprecate and replace.
