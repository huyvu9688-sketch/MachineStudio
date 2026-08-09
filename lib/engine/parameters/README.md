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
above already serve as those modules' shared input ports. Two of the five have
since been released on exactly that schedule — `screw.*` in v1.3 and `guide.*`
in v1.5, each at its own module's Stage-2 contract; coupling, support-bearing,
and drive-train remain pending.

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

## Parameter proposal checklist

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
