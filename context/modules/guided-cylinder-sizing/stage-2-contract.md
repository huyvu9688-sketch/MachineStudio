# Guided Cylinder Sizing Module — Stage 2 Parameter Contract

## Status

- Work unit: Unit 7.3, Stage 2 — parameter contract
- Date: 2026-08-26
- Released registry change: parameter registry `1.18.0` (additive only; no
  existing definition edited)
- Module status: not yet built. Stage 3 (compute and trace) is next.

## Existing Parameter Review

`grep` of `lib/engine/parameters/definitions.ts` for the concepts this
module needs, before minting anything new — the same ten
`pneumatic-cylinder-sizing@0.1.0` already reuses:

| Concept | Existing parameter | Reuse decision |
| --- | --- | --- |
| Incline angle | `motion.axis.incline_angle` | **Reuse.** Unchanged meaning/direction. |
| Friction coefficient | `motion.axis.friction_coefficient` | **Reuse.** Unchanged. |
| Moved mass | `motion.axis.total_moving_mass` | **Reuse.** Unchanged. |
| Operating pressure | `pneumatic.operating_pressure` | **Reuse.** Unchanged. |
| Force sizing load factor | `pneumatic.load_factor` | **Reuse.** Unchanged — both fetched MGQ/MGP catalogs' own Theoretical Output tables show no separate eta, confirming eta is applied as the engineer's own sizing margin on top, the same relationship established for CM2/CA2 (stage-1-spec.md correction 1). |
| Cushion type | `pneumatic.cushion_type` | **Reuse, reported only in 0.1.0.** No discrete allowable-kinetic-energy catalog figure exists for either series (stage-1-spec.md correction 5) — kept as an input so the engineer's own mounting/ordering choice is recorded and echoed to the report, but not checked against any candidate attribute this version. |
| Mounting style | `pneumatic.mounting_style` | **Reuse, buckling formula only.** Feeds the Euler end-fixity buckling calculation exactly as in `pneumatic-cylinder-sizing@0.1.0`; not added as a catalog `MatchCriterion` in this module (stage-1-spec.md correction 6 — neither series publishes the rod-end-fixity mounting taxonomy that check assumes). |
| Buckling safety factor | `pneumatic.buckling_safety_factor` | **Reuse.** Unchanged. |
| Max piston speed | `pneumatic.max_piston_speed` | **Reuse.** Unchanged. |
| Kinetic energy (computed) | `pneumatic.kinetic_energy` | **Reuse, reported only in 0.1.0.** Same reasoning as cushion_type above — computed and echoed, not checked against a candidate. |
| Process force | none | **New** — `pneumatic_guided_sizing.process_force`. Same concept as `pneumatic_sizing.process_force`, minted as a new ID rather than reused, matching that module's own "different direction, mint new" convention for this whole family of ports (a module-scoped required-force computation, not a cross-module-shared value). |
| Required stroke | `pneumatic.stroke` is a catalog identity value (wrong direction); `pneumatic_sizing.required_stroke` exists but is scoped to the round-body sizing module. | **New** — `pneumatic_guided_sizing.required_stroke`. |
| Required extend/retract force | `pneumatic_sizing.required_extend_force`/`required_retract_force` exist but are that module's own computed outputs. | **New** — `pneumatic_guided_sizing.required_extend_force`/`required_retract_force`. |
| Roll/pitch/yaw offset | none | **New** — `pneumatic_guided_sizing.roll_offset`/`pitch_offset`/`yaw_offset`. No existing parameter models a guide-plate lever-arm distance for any mechanism. |
| Required moment | none | **New** — `pneumatic_guided_sizing.required_moment`. No existing parameter models a combined resultant moment from three independently-computed components. |
| Gravity | `motion.axis.gravity` | **Not a port** — baked `STANDARD_GRAVITY_M_PER_S2` constant, same as every current Motor Sizing module and `pneumatic-cylinder-sizing@0.1.0`. |

Zero new unit-registry dimensions or units needed — `mm`, `MPa`, `N`,
`N*m` (`torqueDisplay` already defined), `J`, `kg`, `m/s`, `deg`/`rad`,
`ratio` all already exist.

## Decisions

### 1. Why a new `pneumatic_guided_sizing.*` group rather than reusing `pneumatic_sizing.*`

Six of `pneumatic_sizing.*`'s own four parameters would be identical in
shape, but this registry's own established convention — every Motor Sizing
module choosing a new ID over a cross-mechanism reuse even for an
identical-shaped value (`motor_sizing.rack_pinion.gear_ratio` vs.
`screw.gear_ratio`; `pneumatic.mounting_style` vs.
`screw.end_support_arrangement`) — treats a shared value shape on a
different module/mechanism as a new parameter, not a cross-module reuse,
specifically so a resolved value for one module can never be mistaken as a
compatible link source for an unrelated one. `pneumatic_sizing.*` and
`pneumatic_guided_sizing.*` are two different modules with two different
catalog targets (round-body CM2/CA2 vs. guided MGQ/MGP); a
`pneumatic_sizing.required_extend_force` output must never be silently
linkable into a `guided-cylinder-sizing` instance's own force input even
though the physical quantity happens to compute identically.

### 2. Forward/return sign convention and force range

Identical to `pneumatic-cylinder-sizing@0.1.0`'s own Decision 1/2:
`required_extend_force` is algebraically always `>= 0` (sum of
non-negative terms for `incline_angle` in `[0, 90] deg`) — released with
`range: { min: 0, unit: "N" }`. `required_retract_force` can be
legitimately negative — released with no `range`.

### 3. `process_force` applies to the extend stroke only

Identical reasoning and identical disclosed `0.1.0` simplification as
`pneumatic-cylinder-sizing@0.1.0`'s own Decision 3.

### 4. Moment offsets are unsigned lever-arm distances, not signed positions

`roll_offset`/`pitch_offset`/`yaw_offset` are magnitudes (`>= 0`, `mm`) —
the distance from the guide plate's own load-reference point to the load's
effective center of application along each axis, matching the design
doc's own "three lever-arm distances" framing. A future version that needs
the load's actual signed offset (to report which side of center the load
sits on, not just the moment magnitude) would need a different value
type — out of scope for `0.1.0`, since `required_moment`'s own Euclidean-
sum combination already discards sign (see Decision 5).

### 5. `required_moment` range and the Euclidean-sum assumption

`required_moment` is always `>= 0` by construction (a Euclidean norm) —
released with `range: { min: 0, unit: "N*m" }`. The combination method
itself (`sqrt(M_roll^2 + M_pitch^2 + M_yaw^2)`) is this module's own
engineering judgment, not a value SMC's own catalog documents — see
stage-1-spec.md "Moment Resolution." Recorded as an explicit assumption in
the parameter's own `definition` text, not silently presented as sourced.

### 6. Catalog matching stays outside this registry's own contract

Same as `pneumatic-cylinder-sizing@0.1.0`'s own Decision 4 — allowable
lateral load and allowable rotational torque are `ComponentSchemaVersion`
catalog attributes (Stage 5), not canonical parameters; `MatchCriterion`/
`rankCandidates` never touch `lib/engine/parameters` directly.

## Released Additive Contract

Registry `1.18.0` adds, in `lib/engine/parameters/definitions.ts`
(`pneumaticGuidedCylinderSizing` block):

| Parameter | Shape | Note |
| --- | --- | --- |
| `pneumatic_guided_sizing.process_force` | quantity, `N`, `>= 0`, default `0` | Extend stroke only — Decision 3 |
| `pneumatic_guided_sizing.required_stroke` | quantity, `mm`, `> 0`, required | Application requirement |
| `pneumatic_guided_sizing.required_extend_force` | quantity, `N`, `>= 0`, computed | Always non-negative by construction |
| `pneumatic_guided_sizing.required_retract_force` | quantity, `N`, no declared bound, computed | May be negative — Decision 2 |
| `pneumatic_guided_sizing.roll_offset` | quantity, `mm`, `>= 0`, required | Unsigned lever arm — Decision 4 |
| `pneumatic_guided_sizing.pitch_offset` | quantity, `mm`, `>= 0`, required | Unsigned lever arm |
| `pneumatic_guided_sizing.yaw_offset` | quantity, `mm`, `>= 0`, required | Unsigned lever arm |
| `pneumatic_guided_sizing.required_moment` | quantity, `N*m`, `>= 0`, computed | Euclidean sum of three components — Decision 5, a disclosed assumption |

## Verification

`npx tsc --noEmit`, `npx vitest run` (full non-DB suite), and
`npm run lint` (0 errors) all pass after this change.
`lib/engine/parameters/registry.test.ts` and
`lib/engine/parameters/hash.test.ts` have their pinned version/hash
fixtures updated to `1.18.0` / the newly computed content hash.

## Stage 3 Entry Criteria

1. Scaffold `lib/modules/guided-cylinder-sizing/0.1.0/` (manifest, ports,
   `math.ts`, `compute.ts`, `checks.ts`, `trace.ts`, generic UI/report
   schema, draft validation).
2. No `input-schema.ts` cross-field rule is needed — every input is either
   unconditionally required at the port level or unconditionally optional
   with a registry-level constant default (`process_force` -> 0 N),
   matching `pneumatic-cylinder-sizing@0.1.0`'s own precedent.
3. `math.ts` reproduces (not imports) `pneumatic-cylinder-sizing@0.1.0`'s
   own `resolveRequiredForce`, `resolvePistonAreas`,
   `resolveTheoreticalForce`, `resolveCushionKineticEnergy`,
   `resolveBucklingLoad`, `resolvePermissibleCompressiveLoad` unchanged,
   plus a new `resolveRequiredMoment` implementing the Euclidean-sum
   combination (Decision 5).

## Addendum (Stage 5, catalog seed data): see `stage-1-spec.md` "Fetch
record" for the full MGQ/MGP dimensional and rating tables. Seed CSV and
disclosure notes recorded in `reference/catalog-seed/smc-mgq-mgp.csv` and
`scripts/seed-guided-cylinder-catalog.mts` once Stage 5 completes.
