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

## v1 scope and deferred groups

Registry v1 releases the groups Phase 1A concretely needs:

- **Project and environment** — supply frequency/voltage class, ambient temperature.
- **Axis application and load cases** (`motion.axis.*`) — orientation, geometry,
  masses, center-of-mass offset, friction, gravity, duty cycle, external
  force/moment, and the resolved gravitational and thrust load outputs.
- **Motion profile** (`motion.profile.*`) — move/dwell/cycle timing, velocity and
  acceleration limits, and peak velocity/acceleration/deceleration outputs.

The **screw, guide, coupling, support-bearing, and drive-train** result groups
(named as initial groups in context/implementation-map.md Unit 1.3) are **not**
released in v1. Their exact ports depend on each module's Stage-1 engineering
specification, which does not exist yet; releasing immutable IDs before the
semantics are pinned would be inventing behavior. They are **approved pending
proposals**, released per module at its Stage-2 parameter contract (see
context/ai-workflow-rules.md "New Module Workflow"). The upstream motion outputs
above already serve as those modules' shared input ports.

The `curve`, `load_spectrum`, `table`, `material_ref`, and `component_ref` value
families are likewise modeled as parameters only when a module first needs them.

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
