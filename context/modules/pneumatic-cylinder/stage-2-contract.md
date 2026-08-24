# Pneumatic Cylinder Module — Stage 2 Parameter Contract

## Status

- Work unit: Unit 7.1, Stage 2 — parameter contract
- Date: 2026-08-24
- Released registry change: parameter registry `1.16.0`
- Stage 2 status: **resolved.** All five `stage-1-spec.md` "Stage 2 Entry
  Criteria" items are closed below. `1.16.0` adds the full `pneumatic.*`
  group (22 parameters, `lib/engine/parameters/definitions.ts`) and two new
  unit-registry dimensions, `volume` and `volumetricFlowRate`
  (`lib/engine/units/registry.ts`), needed for the reported (not evaluated)
  air-consumption/required-air-volume outputs — no prior module needed
  either. No existing parameter, unit, or dimension was edited.
- Module status: **not yet built.** No kernel, package, or test exists yet.
  Stage 3 (compute and trace) is next.

This record does not edit any released module. It fixes what
`pneumatic-cylinder`'s future package ports mean.

## Decisions

### 1. Force-sizing-margin convention: SMC's `eta`, not Milwaukee's percentages — because they answer different questions

`stage-1-spec.md` framed this as a "real methodology disagreement... not a
restatement under a different label." Re-examined at Stage 2, that framing
holds, but the two methods turn out to sit on different sides of the
sizing inequality rather than genuinely competing for the same registry
slot:

- **SMC's `eta`** is applied *to the cylinder's own theoretical output*:
  `F1 = eta * A1 * P`. It answers "how much of this cylinder's theoretical
  force can I actually rely on," keyed to how the cylinder is operated
  (static/guided/unguided-dynamic). This is a genuine cylinder-side
  derating factor — the same role `screw.static_safety_factor_minimum` or
  `guide.static_safety_factor_minimum` plays for their own modules.
- **Milwaukee's percentages** ("50-75% of actual load" for a sliding load
  at breakaway, "10%" for a rolling load, etc.) answer a different question
  entirely: "given this load and an assumed friction coefficient, what
  force does the application actually require." This is a load-side
  *estimation heuristic* for arriving at a required-force figure in the
  first place — not a check this module performs at all.

**Resolved:** `pneumatic.required_extend_force` /
`pneumatic.required_retract_force` are direct engineer-supplied inputs, the
same "the engineer already knows the load" treatment `coupling 0.1.0` gives
`screw.drive_torque` (it does not re-derive required torque from motor
power). Milwaukee's own percentage method is documented as upstream
engineering guidance in the registry definition text, never implemented as
a module formula. `pneumatic.load_factor` (`eta`) is the one convention
this module's own compute path actually applies, checked as
`eta * theoretical_force >= required_force`. It is a **required input, no
built-in default** — SMC is the only source with a usable table, the same
"required input, only one source's own numbers exist to record, not two
disagreeing ones" treatment `bearing.static_safety_factor_minimum` already
established (`context/modules/support-bearing/stage-2-contract.md`).

### 2. Cushioning: SMC's formula, no change needed

No disagreement to resolve — Milwaukee's own pages corroborate the concept
without a competing formula (`stage-1-spec.md` item 2). `pneumatic.
kinetic_energy` (`E = (m/2)*V^2`) and `pneumatic.allowable_kinetic_energy`
(a catalog input, per `pneumatic.cushion_type`) are both released as
proposed.

### 3. Buckling ships as a real check in `0.1.0` — using the same textbook Euler physics `ball-screw` already established, sourced independently

`stage-1-spec.md` left this open pending Stage 2: implement using a
generic closed-form Euler formula, or defer as a documented gap (the
`drive-train 0.1.0` "`not_applicable`" precedent).

**Resolved: implement it**, mirroring `ball-screw@0.1.0`'s own precedent
exactly rather than inventing a new pattern:

- `pneumatic.mounting_style` reuses the identical four-case enum shape
  `screw.end_support_arrangement` already established
  (`fixed-fixed`/`fixed-supported`/`supported-supported`/`fixed-free`) —
  `ball-screw`'s own spec already confirms these are "the classic Euler
  effective-length-factor values... textbook physics, not a
  manufacturer-proprietary fit," so the same non-manufacturer-specific
  justification applies here without needing Milwaukee's own unfetched
  Table 1 or SMC's own precomputed lookup table to confirm it independently
  — Milwaukee's own 8-case mounting diagram (`stage-1-spec.md` item 4) is
  visibly built from combinations of these same four fundamental cases,
  consistent with, not contradicting, this choice.
- **Not a reuse of `screw.end_support_arrangement` itself.** This registry
  namespaces by module/component for a reason: a resolved value describing
  a ball-screw shaft's own end-fixity must never be mistaken for a
  compatible source on an unrelated component (a pneumatic piston rod).
  `motor_sizing.rack_pinion.gear_ratio` already declined to reuse
  `screw.gear_ratio` on comparable grounds ("different physical interface...
  no established shared typical-value precedent"); the same reasoning
  applies here even though the *underlying physics happens to be identical*
  rather than merely analogous — physics reuse and parameter-ID reuse are
  separate questions, and this project's own precedent already treats them
  separately.
- Elastic modulus is **not** an exposed input — `ball-screw`'s own kernel
  bakes a steel modulus into Rockford's pre-baked constant rather than
  taking `E` as a port, and no source read for this module (nor Hänchen's
  own generic reference) suggests a pneumatic cylinder rod is anything but
  standard steel. `0.1.0`'s own kernel will do the same (Stage 3 concern,
  not a registry port).
- `pneumatic.buckling_safety_factor` is a **required input, no built-in
  default** — the same shape `screw.buckling_safety_margin` established for
  a real two-source disagreement (Steinmeyer `0.5` vs. Rockford `0.8`), but
  the case is stronger here: no pneumatic-cylinder manufacturer source
  gives *any* number, only Hänchen's generic, non-pneumatic `S = 3...5`
  range. **Deliberately not the same port shape as `screw.
  buckling_safety_margin`** (a `0-1` multiplier): Hänchen's own source
  states this as a divide-by factor (`Fk_allowable = Fk / S`), the
  universal "factor of safety" convention, and forcing it into ball-screw's
  own inverse multiplier shape just for surface-level consistency would
  misrepresent the one source this project actually has for the number's
  magnitude. Each module's port shape follows its own source's convention;
  the underlying Euler *load* formula, not the safety-factor packaging, is
  what's shared.
- **Not resolved, carried forward as an explicit `0.1.0` limitation**:
  Milwaukee's own per-series Table 1 and a genuine second
  independent-benchmark computation for the buckling load itself remain
  unread/unbuilt — Stage 4 territory, flagged here so it is not silently
  dropped.

### 4. Independent-benchmark source: open, not resolved here

SMC alone currently carries the complete formula set; Milwaukee corroborates
partially and disagrees on the sizing-margin method (item 1); a genuine
second full computation (comparable to `coupling`'s own KTR DIN 740
benchmark, or `linear-guide`'s own IKO benchmark) is not yet in hand for the
cushion, air-consumption, or buckling formulas. Parker's own literature and
a second SMC path both returned HTTP 403 this session even after the
TLS/User-Agent workaround that recovered `smcworld.com` itself
(`stage-1-spec.md` "Evidence Gaps"). **Not resolved at Stage 2** — this is
Stage 4 (validation) work, explicitly deferred, not silently skipped.

### 5. Lateral rod-end load: stays out of scope for `0.1.0`

No formula was found in either source, only per-model graphs
(`stage-1-spec.md` item 5). No `pneumatic.*` parameter for it is released
in `1.16.0`. Recorded as a candidate for a future version, matching the
"sourced formula found later, add then" treatment `coupling 0.1.0` gave its
own torsional-resonance check.

## Released Additive Contract

Registry `1.16.0` adds, in `lib/engine/parameters/definitions.ts`
(`pneumaticCylinder` block):

| Parameter | Shape | Note |
| --- | --- | --- |
| `pneumatic.bore_diameter` | quantity, `mm`, `> 0`, required | Catalog identity value |
| `pneumatic.rod_diameter` | quantity, `mm`, `> 0`, required | `< bore_diameter` enforced at Stage 3 |
| `pneumatic.operating_pressure` | quantity, `MPa`, `> 0`, required | Gauge, after regulator |
| `pneumatic.load_factor` | quantity, ratio, `0-1`, **required, no default** | SMC's own `eta` (Decisions item 1) |
| `pneumatic.required_extend_force` | quantity, `N`, `> 0`, optional, `bound: required` | At least one of extend/retract required at Stage 3 |
| `pneumatic.required_retract_force` | quantity, `N`, `> 0`, optional, `bound: required` | — |
| `pneumatic.load_mass` | quantity, `kg`, `> 0`, required | Cushion check |
| `pneumatic.max_piston_speed` | quantity, `m/s`, `> 0`, required | Engineer-supplied — never computed (`stage-1-spec.md` "Purpose") |
| `pneumatic.cushion_type` | enum: `none`/`rubber_bumper`/`air_cushion`, required | Selects which catalog energy figure applies |
| `pneumatic.allowable_kinetic_energy` | quantity, `J`, `>= 0`, optional, `bound: allowable` | Required together with a non-`none` cushion type at Stage 3 |
| `pneumatic.stroke` | quantity, `mm`, `> 0`, required | Buckling + air consumption |
| `pneumatic.mounting_style` | enum, same 4 cases as `screw.end_support_arrangement`, required | Not a reuse — see Decisions item 3 |
| `pneumatic.buckling_safety_factor` | quantity, ratio, `>= 1`, **required, no default** | Divisor form — see Decisions item 3 |
| `pneumatic.piping_length` | quantity, `mm`, `>= 0`, default `0` | Structural "no piping modeled," not a guess |
| `pneumatic.piping_bore` | quantity, `mm`, `> 0`, optional | Required together with nonzero `piping_length` at Stage 3 |
| `pneumatic.theoretical_extend_force` | quantity, `N`, `>= 0`, `bound: allowable` | `eta * A1 * P` |
| `pneumatic.theoretical_retract_force` | quantity, `N`, `>= 0`, `bound: allowable` | `eta * A2 * P` |
| `pneumatic.kinetic_energy` | quantity, `J`, `>= 0`, `bound: required` | `(m/2) * V^2` |
| `pneumatic.buckling_load` | quantity, `N`, `>= 0` | Unfactored Euler load |
| `pneumatic.permissible_compressive_load` | quantity, `N`, `>= 0`, `bound: allowable` | `buckling_load / buckling_safety_factor` |
| `pneumatic.air_consumption_per_cycle` | quantity, `L`, `>= 0` | Reported, not evaluated |
| `pneumatic.required_air_volume` | quantity, `L/min`, `>= 0` | Reported, not evaluated |

New unit-registry entries (`lib/engine/units/registry.ts`), no dimension or
unit edited:

- `Dimensions.volume` (`length^3`) — units `m^3` (SI-coherent), `L`
- `Dimensions.volumetricFlowRate` (`length^3 * time^-1`) — units `m^3/s`
  (SI-coherent), `L/min`

`PARAMETER_REGISTRY_SUPPORTED_VERSIONS` now also explicitly lists `1.15.0`
alongside the new `1.16.0` — `1.15.0` was released 2026-08-18 (the
Motor-Sizing-family `inertia_ratio_recommended_maximum` additions, six
released module versions pin `parameterRegistryVersion: "1.15.0"`
directly) but had never been added to that explicit list, relying only on
the builder's own "current version is implicitly supported" allowance —
the same stranding risk this project's own `linear-guide`/`drive-train`
sessions already caught and fixed twice before for `1.4.0` and `1.7.0`.
Caught and fixed here before it could strand those six manifests, with the
existing regression test (`lib/engine/parameters/registry.test.ts`)
continuing to pass unchanged.

## Verification

`npx tsc --noEmit`, `npx vitest run` (full non-DB suite, 2462/2462), and
`npm run lint` (0 errors) all pass after this change.
`lib/engine/parameters/registry.test.ts` and `lib/engine/parameters/
hash.test.ts` both had their pinned version/hash fixtures updated to
`1.16.0` / the new computed content hash — the expected update on every
registry version bump, not a defect.

## Stage 3 Entry Criteria

1. Scaffold `lib/modules/pneumatic-cylinder/0.1.0/` (manifest, ports, input
   schema, `math.ts`, trace, checks, generic UI/report schema, draft
   validation).
2. Input schema (Stage 3, not this document) must enforce: `rod_diameter <
   bore_diameter`; at least one of `required_extend_force`/
   `required_retract_force`; `allowable_kinetic_energy` required together
   with `cushion_type != "none"`; `piping_bore` required together with a
   nonzero `piping_length`.
3. Kernel needs SMC's own piston-area table (`Table (1) Cylinder Piston
   Area`) or the direct geometric formulas (`A1 = pi*D^2/4`,
   `A2 = pi*(D^2-d^2)/4`) — both agree, per `stage-1-spec.md`; no
   disagreement to resolve, a Stage 3 implementation detail.
4. Buckling kernel: implement the Euler column formula
   (`Fk = pi^2 * E_steel * J / (K*L)^2`, `J = pi*d^4/64`) using the same
   effective-length-factor constants (`1/K^2` for `K = 2, 1, 0.7, 0.5`)
   `ball-screw`'s own `resolveBucklingLoad` already uses for the same four
   enum cases — reproduced independently in this module's own kernel, not
   imported from `lib/modules/ball-screw`.
5. Reference-example reproduction (Stage 3's own workflow step includes
   this, per `context/ai-workflow-rules.md`) against SMC's own three
   bore-size-selection examples, one cushion example, and the air-
   consumption/required-air-volume examples in `stage-1-spec.md` item —
   not yet hand-verified against the source's own printed figures
   (`stage-1-spec.md` "Evidence Gaps").
