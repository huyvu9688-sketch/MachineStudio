# ADR-0004: Canonical SI storage with flexible engineering display units

- Status: Accepted
- Date: 2026-07-27
- Related: `context/project-overview.md` "In Scope for MVP"; `context/
  architecture.md` "Canonical Parameter Registry" and "Engineering Value
  Model"; `context/implementation-map.md` Unit 1.2 (delivered in
  `lib/engine/units/`)

## Context

MachineStudio's users move between unit conventions within a single
project: a US machine typically works in inch/lbf/hp catalog data next to
SI-derived motion formulas, and a Japan-market project mixes SI mechanical
units with manufacturer datasheets that are also SI but with different
preferred display forms (for example N·mm vs. N·m for small torques).
Every module boundary and every stored parameter value has to pick one
convention for *storage* and *arithmetic*, independent of what a user
prefers to *see* or *type*, or unit bugs (a force treated as a mass, a
degree treated as a radian) become a correctness risk in engineering
calculations that size real hardware.

## Decision

All physical quantities are stored and computed internally in canonical,
SI-coherent units, defined per physical dimension by the unit registry in
`lib/engine/units/` (five base dimensions: length, mass, time,
temperature, and angle — angle is deliberately its own base dimension so
`rad` is distinct from a dimensionless ratio and `rad/s` is distinct from
`Hz`). Every canonical parameter definition
(`context/architecture.md` "Canonical Parameter Registry") fixes one
canonical storage unit and a set of allowed **display** units that must
be dimension-compatible with it. Display-unit conversion happens only
through the unit package (`context/code-standards.md` "Engineering Values
and Units": "Display-unit conversion occurs only through the unit
package"); module `compute` functions read and return canonical-unit
magnitudes directly, enforced at the SDK boundary
(`lib/engine/module-sdk` `executeModule`).

This is paired with the `EngineeringValue` model
(`context/architecture.md` "Engineering Value Model"): module ports never
accept or return a bare `number` — every physical value carries its unit
and value-family metadata (`Quantity`, `VectorQuantity`, `Curve`, etc.),
so a value cannot cross a module boundary without its unit attached.

Explicitly rejected: storing values in whatever unit the user last typed
(a "last unit wins" model), and inferring one physical quantity from
another by assumed convention (`context/code-standards.md`: "Never infer
force from mass or mass from force").

## Consequences

- Cross-module arithmetic and comparison (for example combining a payload
  mass from one module with an external force from another) never
  requires ad hoc conversion constants in module or application code — the
  unit registry's dimension-checked arithmetic
  (`lib/engine/units/arithmetic.ts`) does it once, correctly, including
  affine handling for temperature.
- The parameter graph can reject a unit-compatible but semantically wrong
  link (for example connecting two different `kg` quantities that mean
  different things) because dimension is only one of several link-
  compatibility criteria (`context/architecture.md` "Link Compatibility";
  Invariant #5 "Semantic link safety" — "unit compatibility alone cannot
  authorize a link").
- The UI and reports can display any registered, dimension-compatible
  unit (inch or mm, hp or kW, US or Japan-conventional forms) without
  touching stored data or module logic, satisfying `context/project-
  overview.md` "In Scope for MVP": "Canonical SI storage with common
  engineering input/display units."
- Cost: every physical parameter definition must explicitly declare its
  canonical unit and its allowed display units up front
  (`context/code-standards.md` "Canonical Parameters"), and the unit table
  itself is closed for the MVP — adding a new unit is a reviewed engine
  change, not something a module can do at runtime
  (`context/progress-tracker.md` Architecture Decisions, Unit 1.2 entry).
