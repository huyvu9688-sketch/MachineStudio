# Pneumatic Cylinder Sizing Module — Stage 2 Parameter Contract

## Status

- Work unit: Unit 7.2, Stage 2 — parameter contract
- Date: 2026-08-24
- Released registry change: parameter registry `1.17.0` (additive only;
  no existing definition edited)
- Module status: not yet built. Stage 3 (compute and trace) is next.

## Existing Parameter Review

`grep` of `lib/engine/parameters/definitions.ts` for the concepts this
module needs, before minting anything new:

| Concept | Existing parameter | Reuse decision |
| --- | --- | --- |
| Incline angle | `motion.axis.incline_angle` | **Reuse.** Identical meaning/direction; three of five Motor Sizing Tool modules already reuse it unchanged. |
| Friction coefficient | `motion.axis.friction_coefficient` | **Reuse.** Classic Coulomb sliding friction — the exact case this parameter was defined for; the one documented non-reuse precedent (`direct-drive-conveyor-motor-sizing`'s own `belt_friction_coefficient`) does not apply (that is rolling belt friction, a different physical interface). |
| Moved mass | `motion.axis.total_moving_mass` | **Reuse.** Same meaning/direction as every Motor Sizing module's own mass input. |
| Operating pressure | `pneumatic.operating_pressure` | **Reuse.** Engineer-supplied in both modules, identical meaning. |
| Force sizing load factor | `pneumatic.load_factor` | **Reuse.** Engineer-supplied in both modules, identical meaning (SMC's own `eta`). |
| Cushion type | `pneumatic.cushion_type` | **Reuse.** Engineer-supplied in both modules, identical meaning. |
| Mounting style | `pneumatic.mounting_style` | **Reuse.** Engineer-supplied in both modules, identical meaning (the desired mounting for the cylinder to be selected here, vs. an already-selected cylinder's own mounting in `0.1.0` — same physical concept, same direction: the engineer chooses it either way). |
| Buckling safety factor | `pneumatic.buckling_safety_factor` | **Reuse.** Engineer-supplied in both modules, identical meaning. |
| Max piston speed | `pneumatic.max_piston_speed` | **Reuse.** Engineer-supplied in both modules, identical meaning. |
| Kinetic energy (computed) | `pneumatic.kinetic_energy` | **Reuse.** Identical formula (`E=(m/2)V^2`) and identical direction (computed output) in both modules. |
| Process force | none | **New** — `pneumatic_sizing.process_force`. No existing parameter models an additive working-stroke force. |
| Required stroke | `pneumatic.stroke` exists but is a **catalog identity value** of an already-selected cylinder (`0.1.0`'s own direction) — this module needs the opposite direction, an application *requirement* the catalog must satisfy. | **New** — `pneumatic_sizing.required_stroke`. |
| Required extend force | `pneumatic.required_extend_force` exists but is **engineer-supplied input** in `0.1.0` — this module *computes* it. | **New** — `pneumatic_sizing.required_extend_force`. |
| Required retract force | Same reasoning. | **New** — `pneumatic_sizing.required_retract_force`. |
| Gravity | `motion.axis.gravity` existed in early (pre-consistency-pass) Motor Sizing module versions, since removed from every current release in favor of a baked `STANDARD_GRAVITY_M_PER_S2 = 9.80665` constant. | **Not a port.** Matches every current Motor Sizing module's own convention (`docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md`). |

Zero new unit-registry dimensions or units needed — `mm`, `MPa`, `N`, `J`,
`kg`, `m/s`, `deg`/`rad`, `ratio` all already exist.

## Decisions

### 1. Forward/return sign convention

Reproduces `ball-screw-motor-sizing@0.2.0`'s own `resolveDriveForce`
convention exactly (see `stage-1-spec.md` "Load Resolution" and
"Corrections" item 1) — friction direction-symmetric (always added),
gravity sign flips with direction, `required_retract_force` may be
negative and is reported as computed, never floored inside `compute()`.

### 2. `pneumatic_sizing.required_extend_force` / `required_retract_force` range

`required_extend_force` is algebraically always `>= 0` given this
module's own formula (a sum of non-negative terms: `process_force >= 0`,
and the forward-direction gravity/friction terms are both `>= 0` for
`incline_angle` in `[0, 90] deg`) — released with `range: { min: 0,
unit: "N" }`. `required_retract_force` can be legitimately negative (see
Decision 1) — released with **no** `range` (the field is optional;
omitting it declares no bound, matching the real physics rather than
forcing an artificial floor at the registry level).

### 3. `pneumatic_sizing.process_force` applies to the extend stroke only

Matches `pneumatic-cylinder@0.1.0`'s own "buckling governs on the extend
(thrust) stroke" assumption: the extend stroke is this module's own
"do work" direction, and a clamping/pressing process force is a
working-stroke concept. A disclosed `0.1.0` simplification, not a
resolved general case (a real installation could need a process force on
retract too — out of scope for this version, the same "explicit,
disclosed limitation" treatment every other module's own scope
narrowing gets).

### 4. Catalog matching stays outside this registry's own contract

`stage-1-spec.md`'s "Candidate Evaluation" section is a Stage 5
(generic surfaces / catalog integration) concern, not a Stage 2 one — no
`ComponentSchemaVersion` field is a canonical parameter, and
`MatchCriterion`/`rankCandidates` never touch `lib/engine/parameters`
directly (catalog attributes are their own, separately versioned schema,
per `context/architecture.md` "lib/catalog/").

## Released Additive Contract

Registry `1.17.0` adds, in `lib/engine/parameters/definitions.ts`
(`pneumaticCylinderSizing` block):

| Parameter | Shape | Note |
| --- | --- | --- |
| `pneumatic_sizing.process_force` | quantity, `N`, `>= 0`, default `0` | Extend stroke only — Decision 3 |
| `pneumatic_sizing.required_stroke` | quantity, `mm`, `> 0`, required | Application requirement, not a catalog identity value |
| `pneumatic_sizing.required_extend_force` | quantity, `N`, `>= 0`, computed | Always non-negative by construction — Decision 2 |
| `pneumatic_sizing.required_retract_force` | quantity, `N`, no declared bound, computed | May be negative — Decision 2 |

## Verification

`npx tsc --noEmit`, `npx vitest run` (full non-DB suite), and
`npm run lint` (0 errors) all pass after this change.
`lib/engine/parameters/registry.test.ts` and
`lib/engine/parameters/hash.test.ts` have their pinned version/hash
fixtures updated to `1.17.0` / the newly computed content hash — the
expected update on every registry version bump, not a defect.

## Stage 3 Entry Criteria

1. Scaffold `lib/modules/pneumatic-cylinder-sizing/0.1.0/` (manifest,
   ports, `math.ts`, `compute.ts`, `checks.ts`, `trace.ts`, generic
   UI/report schema, draft validation).
2. No `input-schema.ts` cross-field rule is needed (no "at least one
   of"/conditional requirement exists in this module's own scope, unlike
   `pneumatic-cylinder@0.1.0`) — matches `ball-screw-motor-sizing`'s and
   `rack-pinion-motor-sizing`'s own precedent of relying on the generic
   `ModuleInputSchema` alone.
3. `math.ts` reproduces (not imports) `pneumatic-cylinder@0.1.0`'s own
   `resolvePistonAreas`, `resolveTheoreticalForce`,
   `resolveCushionKineticEnergy`, `resolveBucklingLoad`,
   `resolvePermissibleCompressiveLoad`, plus a new
   `resolveRequiredForce` implementing the forward/return convention
   (Decision 1).
