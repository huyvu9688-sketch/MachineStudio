# ADR-0011: Motor Sizing Tool — mechanism-oriented module family, replacing the linear-axis discipline modules as the primary user-facing entry point

- Status: Accepted
- Date: 2026-08-12
- Related: `context/roadmap.md` Phase 1A-1D (linear-axis MVP); `context/
  implementation-map.md` Units 4.1-4.9 (the seven released linear-axis
  discipline modules and the `linear-axis@1` workflow); ADR-0003
  (versioned module package contract); ADR-0007 (workflow definition
  contract); `context/progress-tracker.md` Unit 5.4 ("A real,
  previously-undiscovered generic-engine defect ... in `motion-profile`'s
  per-move-index port resolution").

## Context

Milestone 4 shipped seven released, registered linear-axis modules
(`axis-load-cases`, `motion-profile`, `ball-screw`, `linear-guide`,
`coupling`, `support-bearing`, `drive-train`) plus a guided
`linear-axis@1` workflow (ADR-0007) that composes them. This is real,
validated engineering work — every module met the full Module Definition
of Done (`roadmap.md`) — but the founder's own direct feedback, after
using the running application, is that this shape does not answer the
question they actually have: **"I need to size the correct motor for a
given mechanism, and I don't know what most of these modules are for."**

Two concrete problems, not just a UX preference:

1. **The workflow is organized by mechanical discipline (axis loads,
   motion profile, screw, guide, coupling, bearing, drive train), not by
   the mechanism the founder is actually sizing** (ball screw, belt
   conveyor, rack-and-pinion, index table). A founder sizing a belt
   conveyor has no path through this module set at all — `ball-screw` and
   `linear-guide` are both linear-motion-specific and do not apply, yet
   `drive-train` (the one module that actually computes required motor
   torque) hard-requires `screw.lead` and `screw.gear_ratio` as arguments
   to every one of its math functions
   (`lib/modules/drive-train/0.1.0/math.ts`) — it cannot size a motor for
   any mechanism but a ball screw today, despite nothing in its own name
   or manifest saying so.
2. **A real, sourced formula gap, not just an organizational one.**
   Oriental Motor's own published method (`reference/source-material/
   Oriental_Motor Sizing Calculators.pdf`, read directly this session) computes
   effective (RMS) torque per motion phase:
   `Trms = sqrt(((Ta+TL)^2*t1 + TL^2*t2 + (Td-TL)^2*t3) / tf)`. This
   codebase's `drive-train@0.1.0` cannot do this — `motion-profile@0.1.0`
   exposes only a single scalar `rms_acceleration` output across a
   cross-module parameter link (`lib/workflows/linear-axis/1.0.0/
   definition.ts`), so `drive-train`'s own kernel
   (`resolveEffectiveTorque`) derives a closed-form approximation from
   that one number instead. `drive-train`'s own validation record already
   discloses this is not equivalent: it overstates THK's own published
   vertical worked example's effective torque by ~21% because that
   example's asymmetric per-phase load torque violates the closed-form's
   own constant-load-torque assumption (`validation/drive-train/0.1.0.md`
   "deviations"). This is not a bug to patch — it is a structural
   consequence of splitting motion profile and motor sizing into separate
   modules connected by one scalar port.

Both problems have the same fix: **stop connecting motion profile to
motor sizing through a cross-module link, and stop organizing by
discipline instead of by mechanism.**

## Decision

**Build a new module family, one immutable module per mechanism, under
`category: "motor-sizing.<mechanism>"`, each fully self-contained (motion
profile computed inside the module, not linked in from
`motion-profile@0.1.0`), outputting required motor specifications only —
no motor catalog matching in this phase. This family becomes the primary
"Add module" entry point; the seven existing linear-axis discipline
modules stay registered and immutable but are hidden from that picker.**

### Module shape

Each mechanism module owns, internally, in this order:

1. **Load resolution** — the mechanism's own required drive force/torque
   from geometry, mass, friction, and orientation. Reproduces (not
   imports — see "Reuse policy" below) the same physics
   `axis-load-cases@0.1.0` and Oriental Motor's own page already establish
   (`F = friction + gravity·(sinθ + μcosθ) + external`), specialized per
   mechanism's own load-torque conversion (Oriental Motor's own page gives
   ball-screw, pulley, and belt/rack-and-pinion each their own `T_L`
   formula — verified directly against the source this session, see the
   Stage 1 specs this ADR's own follow-on units will cite).
2. **Motion profile, computed per phase, not linked in** — reuses
   `motion-profile@0.1.0`'s own trapezoidal-move math (`resolveTrapezoidalMove`,
   `resolveMotionCycle`) at the *source-code* level (copied into the new
   module, `lib/modules` convention — see "Reuse policy"), but the motor-
   sizing module computes `Trms` from the *actual per-phase* `Ta`/`Td`/`t1`/
   `t2`/`t3` Oriental Motor's own formula uses, not from a single scalar
   `rms_acceleration` crossing a port boundary. This is what fixes the
   ~21% deviation, not a tuning change to the existing formula.
3. **Mechanism-specific transmission** — screw lead, pulley diameter,
   pinion pitch diameter, or gear ratio, per Oriental Motor's own
   per-mechanism `T_L` formula.
4. **Motor sizing** — inertia ratio, acceleration torque, maximum
   momentary torque, effective (RMS) torque, required torque with safety
   factor — reproducing `drive-train@0.1.0`'s own already-verified
   formulas (Omron-sourced, cross-checked against Oriental Motor's
   identical shape), generalized to accept the mechanism's own load
   torque/speed rather than hard-requiring `screw.lead`/`screw.gear_ratio`.

### Output scope: required specs only, ports left open for later

Every module in this family outputs **required** torque/speed/power/
inertia values and pass/fail checks against engineer-supplied margins —
the same "engineer takes the number to the catalog" scope
`support-bearing@0.1.0` and `coupling@0.1.0` already use for their own
required-input, no-built-in-table values. **No motor catalog or part
matching ships in this phase.** Ports are shaped so a future catalog
adapter (`context/code-standards.md` "Catalog": `CatalogAdapter` per
ADR-0005) can be added in a later module version without breaking this
one — an additive change, not a redesign.

### Reuse policy: reproduce verified formulas, do not cross-import modules

Every mechanism module reproduces, rather than imports, the physics
already verified in `axis-load-cases@0.1.0`, `motion-profile@0.1.0`,
`ball-screw@0.1.0`, and `drive-train@0.1.0`'s own kernels. This is not
new policy — `drive-train@0.1.0`'s own `resolveOperatingSpeed` doc comment
already states the precedent explicitly: "the same conversion
`coupling 0.1.0`'s own kernel already uses ... reproduced here rather than
imported: this module has no dependency on `coupling`'s own package
internals, only on the parameter ports both modules share"
(`lib/modules/drive-train/0.1.0/math.ts`). Applied here for the same
reason: each module version must stay fully self-contained and immutable
independent of any other module's own future version bump
(`code-standards.md` "Module Packages": "A released version is never
edited"; "Module code cannot import app, database, authentication, file
storage, or network packages" — the existing boundary already forecloses
cross-module imports of this kind).

**Exception: genuinely generic, source-independent physics moves to
`lib/engine`, not duplicated per module.** Moment-of-inertia formulas for
standard rigid-body shapes (solid cylinder/disk, hollow cylinder, off-axis
translation — Oriental Motor's own page section 1, `J = mL^2`,
`Jx = (1/8)mD1^2`, etc.) and `Ta = J*alpha` are not a domain-method choice
any source disagrees on — they are textbook rigid-body dynamics, the same
category of "ordinary physics, not a sourced engineering method"
`drive-train@0.1.0`'s own `resolveRegenEnergy` doc comment already treats
`E = J*omega^2/2` as (`math.ts` "ordinary kinetic-energy physics, restated
by Celera Motion's own resistor-sizing paper"). These belong in a new
`lib/engine/mechanics/` package — generic deterministic calculation
infrastructure, per `architecture.md`'s own boundary definition for
`lib/engine/` — so every mechanism module (and any future module) depends
on one audited implementation, the same way every module already depends
on `lib/engine/units` and `lib/engine/values`. This is the one piece of
this family that is a shared library, not a per-module reproduction.

### Existing modules: kept, immutable, hidden from the primary picker

`axis-load-cases@0.1.0` through `drive-train@0.1.0` and `linear-axis@1`
are **not deleted, edited, deprecated, or marked `replacedBy`.**
`context/progress-tracker.md`'s own invariant ("Released module versions
... are immutable") and this project's Protected Files rule
(`ai-workflow-rules.md`) apply regardless of whether the founder currently
has a use for a given module — Unit 5.4 Scenario 1's own real, reproduced
baseline depends on `linear-axis@1` and all seven modules staying exactly
as released. Instead, `app/(workspace)/workspace/page.tsx`'s
`modulePackageOptions()` (the function that already feeds
`AddModuleInstanceDialog`, `components/engineering/
add-module-instance-dialog.tsx`) gains a route-level filter, keyed on each
module's own `manifest.category`, hiding the seven discipline categories
(`motion.axis`, `motion.profile`, `screw`, `guide`, `coupling`, `bearing`,
`drive`) from the default "Add module" list. This is a UI-layer filter
over an unmodified registry, not a core-engine or module-SDK change
(`code-standards.md` "Module Packages" item 15's own "without core-engine,
generic UI, generic report, or database-schema modification" — this
filter lives in one route file, not the generic `AddModuleInstanceDialog`
component itself, which keeps rendering whatever list it is given).
`linear-axis@1`'s own `StartWorkflowInstanceDialog` trigger is hidden the
same way at the route level, not removed from `lib/workflows`.

### Add-module UI flow

`AddModuleInstanceDialog`'s existing flat module picker gains a
first-level category step for `motor-sizing.*` modules: "Motor Sizing
Tools" as one entry point, opening a mechanism picker (ball screw, belt
conveyor — pulley/geared and direct-drive as two separate tools per the
founder's own decision below — rack and pinion, index table), each
selection landing on that one mechanism module's own generic parameter
form. This mirrors Oriental Motor's own site structure
(`reference/source-material/Oriental_Motor Sizing Calculators.pdf`
"Selection Procedure": "determine the drive mechanism for your equipment
... a ball screw, a belt and pulley, or a rack and pinion") — the
reference this ADR's own context cites — closely enough to validate the
shape without copying its UI. Implementation is a new dialog/step in
`components/engineering/`, not a new route or generic-UI-schema change.

### Phase scope (this round)

Four mechanism modules, each its own Stage-1-through-6 module delivery
(`ai-workflow-rules.md` "New Module Workflow" — not combined into one
unit, per the Work-Unit Rule):

- `motor-sizing.ball-screw`
- `motor-sizing.belt-pulley-drive` (geared/pulley-reduced belt or wire
  drive — Oriental Motor's own page gives pulley drive and wire-or-belt
  drive each their own formula, `i` != 1)
- `motor-sizing.direct-drive-conveyor` (belt conveyor with the motor
  directly on the drive pulley shaft, `i` = 1 — explicitly a new
  derivation, not adapted from an existing Oriental Motor template: no
  direct-drive-conveyor worked example was found in the source material
  read this session, so this module's own Stage 1 spec must either find
  one or treat `i` = 1 as a documented special case of the geared-belt
  formula, disclosed either way, not silently assumed equivalent)
- `motor-sizing.rack-pinion`
- `motor-sizing.index-table` (rotary/angular motion — needs its own
  motion-profile variant in angular units, and Oriental Motor's own
  calculations page gives no index-table load-torque formula at all, a
  genuine evidence gap this module's own Stage 1 spec must close against
  a second source before Stage 2, the same "do not invent product
  behavior" rule every other module in this codebase has followed)

Explicitly rejected alternative: one module with a `mechanism` enum input
branching internally. Rejected because it would combine four independent,
differently-sourced formula sets and four independent validation records
into one module version, one content hash, and one source-immutability
pin — a single formula fix or new reference example for one mechanism
would force re-releasing all four, and `context/code-standards.md`
"Module Testing"'s own per-module evidence requirements (three reference
examples, an independent benchmark, a validation record) do not compose
across mechanisms that share no formula. One module per mechanism keeps
each mechanism's own release gate, evidence bar, and immutability
independent — the same reasoning that already produced seven separate
linear-axis modules instead of one.

## Consequences

- The founder can reach a motor-sizing answer for the mechanism they
  actually have, without first understanding what `axis-load-cases`,
  `linear-guide`, or `coupling` are for.
- Fixes the ~21% RMS-torque deviation at its structural root (the
  motion-profile/motor-sizing module boundary itself), not by tuning
  `drive-train@0.1.0`'s existing closed-form approximation — which stays
  exactly as released, since it is immutable.
- `coupling@0.1.0` and `support-bearing@0.1.0` remain available, optional,
  post-motor-sizing steps (per the founder's own scoping) — not hidden by
  category, since their own workflow role stays useful once a motor is
  sized; only the axis-load/motion-profile/screw/guide/drive discipline
  split that no longer matches the founder's own mental model is hidden.
- A new `lib/engine/mechanics/` package becomes a second reusable,
  source-verified physics library alongside `lib/engine/units` and
  `lib/engine/values` — available to any future module, not only this
  family.
- Rules out editing or superseding any of the seven released linear-axis
  modules or `linear-axis@1` as part of this work. `context/roadmap.md`
  Phase 1B/1C/1D's own gates (horizontal/vertical/long-stroke validation,
  the guided-workflow MVP) stay exactly as recorded — unaffected by, not
  advanced by, this new family.
- Follow-on work this implies but does not do here: Stage 1 specs for
  each of the four mechanisms (including closing the index-table
  load-torque source gap before Stage 2), the `lib/engine/mechanics/`
  package itself, the category-filter change to `page.tsx`, and the
  "Motor Sizing Tools" mechanism-picker dialog. None of these are decided
  by this ADR to be built in one combined unit — each follows the New
  Module Workflow's own stage gates separately.

## Notes

The founder's own words framing this decision (2026-08-12): "I want all
modules to support me to choose the right component... the motion profile
module should stay inside each Mechanism tool, which make it more
precise." Recorded verbatim here because it is the actual reasoning this
ADR turns into an architectural rule (embed motion profile, do not link
it), not a paraphrase reconstructed later.
