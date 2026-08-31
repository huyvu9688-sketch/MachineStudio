# Shaft, Key, and Bolted-Joint Checks Module — Stage 2 Parameter Contract

## Status

- Work unit: Unit 7.5, Stage 2 — parameter contract
- Date: 2026-08-31
- Released registry change: parameter registry `1.21.0`
- Stage 2 status: **resolved for a `0.1.0` scope.** See "Decisions" below for
  the six items `stage-1-spec.md` "Stage 2 Entry Criteria" left open, plus
  two further items Stage 2 itself found (items 6 and 7). **Decision 5 was
  corrected at Stage 5 (2026-08-31, same day)**: its own "link-compatible"
  claim does not hold against the real link-compatibility evaluator — see
  Decision 5's own correction note.

No released module version, calculation run, or validation record is
changed by this document. Registry versions `1.0.0`-`1.20.0` are unedited;
`1.21.0` is purely additive.

## Decisions

### 1. No axial-load term in the shaft check

**Resolved: `0.1.0` omits the axial-force (`F`, `alpha`) term from the
sourced combined-stress cubic (stage-1-spec.md "Formulas" item 1). The
released `shaft.*` group has no axial-force or column-factor port.**

`stage-1-spec.md`'s own "Existing Parameter Review" port sketch already
listed diameter, yield strength, torque, bending moment, shock/duty factor,
and bore diameter — no axial force or column factor — without stating this
as a deliberate choice. It is one: the Air Force Stress Manual's own worked
example (a pulley shaft) has `F = 0`, no other registered source's worked
example exercises a nonzero axial term, and every mechanism this project
already models resolves its own axial load through its own upstream output
(`screw.static_safety_factor`, `motion.axis.thrust_force`) rather than
through a generic shaft check. A future version could add the term if a
real scenario needs it — torque and bending moment alone cover the sourced
worked example and this project's own immediate need (`coupling@0.1.0`'s
own unchecked shaft-compatibility gap, `support-bearing@0.1.0`'s own
unchecked shaft/housing interface).

### 2. Shock/duty-factor convention: Air-Force/ASME-B106.1M (`Ks`/`Km`)

**Resolved: the Air-Force/ASME-B106.1M service-table tradition
(`shaft.torque_service_factor`, `shaft.bending_service_factor`), not the
Shigley/Reuven geometric stress-concentration-factor tradition
(`Kf`/`Kfs`).**

Two reasons, not one: the Air Force Stress Manual is this module's primary,
most-directly-sourced formula (a full worked numerical example reproduced
end to end, not just a formula shape), and its `Ks`/`Km` are empirical
service/duty factors selected from a machine-type table — a better fit for
a module that is explicitly static/yield-based only (`stage-1-spec.md`
"Validity Envelope") than the Shigley/Reuven tradition's `Kf`/`Kfs`, which
that same spec's own "Formulas" item 1 identifies as **geometric fatigue
stress-concentration factors** tied to a fillet or keyway radius — a
different physical meaning that would sit oddly in a module carrying no
fatigue analysis at all. `0.1.0`'s own parameter definitions name the
historical ASME Code term ("combined shock and fatigue factor") in their
definition text while flagging plainly that this is not a fatigue S-N
calculation, so the naming does not silently imply a scope the module does
not have.

### 3. Key bearing-stress check: `h/2` only, no exact effective-depth option

**Resolved: `0.1.0` exposes only the common `h/2` bearing-depth
approximation (`key.bearing_stress`), not a more exact geometry-dependent
effective-depth alternative.**

RoyMech's own registered source flags `h/2` as an approximation to a more
exact effective depth but gives no alternative formula of its own to adopt,
and every other registered source (instant.engineer, and by implication the
underlying shear/bearing derivation itself) uses `h/2` directly. Adding a
second, unsourced "exact" form would mean inventing a formula this session
found no source for — the same "report the approximation, don't invent
around it" treatment `linear-guide`'s own installation-offset assumption
already received.

### 4. Joint separation ships in `0.1.0`, as an optional engineer-supplied input

**Resolved: yes, ships in `0.1.0`. `bolt.joint_stiffness_ratio` (`C`) is
released as an *optional*, no-default input — when omitted, the
joint-separation check simply does not run (no `bolt.separation_safety_
factor` value for that load case); when supplied, it runs.**

`stage-1-spec.md`'s own "Formulas" item 5 found no source with a single
agreed `kb`/`km` estimation formula (two registered methods disagree by
roughly 8% on the same worked example, and RoyMech's own page states
plainly that "widely different stiffness values result from different
studies"). Deferring the whole check to a later version was the other real
option, but making the input **optional** rather than **required with an
invented default** gets nearly the same evidence-safety at a much lower
cost: the tensile-capacity and preload checks (which every registered
source does agree on) always run; joint separation only runs when the
engineer supplies a real number from their own knowledge of the joint's
own bolt/member stiffness, geometry-estimated or vendor-supplied. This is a
different treatment from every other "required, no default" value in this
module (`Ks`, `Km`, `K`, `bolt.proof_strength`) precisely because those are
all values a source-disputed *table* still bounds meaningfully — no source
here bounds `kb`/`km` at all.

### 5. Torque/moment inputs: link-*semantically-compatible* from the start (torque only) — corrected at Stage 5, see below

**Resolved: `shaft.applied_torque` is a plain required port like every
other required port in this project's registry — it accepts a manual
value or a workflow value with no special-casing needed. `shaft.
applied_bending_moment` remains direct-entry only in practice, since no
released port represents "bending moment at an arbitrary shaft
cross-section" for it to link from.**

This resolves `stage-1-spec.md` Stage 2 Entry Criteria item 5 without
adding any registry mechanism beyond what already exists: `screw.
drive_torque` and `shaft.applied_torque` share the same canonical unit
(`N*m`), the same `qualifiers: { bound: "required" }`, and the same
`loadCases` (`normal`, `peak`).

**Correction (Stage 5, 2026-08-31, same day): this record originally
claimed the two ports were "link-compatible by the existing rules... no new
port needed." That is wrong as the real system behaves today.**
`lib/modules/shaft-key-bolt-checks/0.1.0/cross-module-links.test.ts` runs
the real engine evaluator (`evaluateLinkCompatibility`,
`lib/engine/graph/compatibility.ts`) against both modules' real
`manifest.ts` ports and confirms `screw.drive_torque -> shaft.
applied_torque` is **not** compatible: `evaluateLinkCompatibility` only
authorizes a link when the source and sink share the identical registered
`parameterId`, or when an `ApprovedParameterMapping` explicitly joins two
different ones. `screw.drive_torque` and `shaft.applied_torque` are two
distinct registered parameter IDs (this module deliberately did not reuse
`screw.drive_torque` itself — see "Existing Parameter Review" — because
this module is mechanism-agnostic, not scoped to ball screws), and **no
`ApprovedParameterMapping` between any two parameters exists anywhere in
this codebase** — the type (`lib/engine/graph/types.ts`) is real, wired
scaffolding with zero populated data, and the real application call site
(`confirmParameterLink`, `lib/application/parameters/
stale-propagation.ts`) never passes a `mappings` argument. Every prior
"link-compatible" module pair in this project (e.g. `axis-load-cases` ->
`ball-screw`'s own `motion.axis.thrust_force`) achieves compatibility by
literally reusing the identical parameter ID, not by a cross-parameter
mapping — this module is the first case in the project that would actually
need one, and the mapping mechanism itself has never been exercised with
real data before now.

The shaft/key/bolt input set is still fully usable without this: `shaft.
applied_torque` is a plain required direct-entry field, exactly like every
other required input in this module, with no dependency on any link
existing. What is genuinely missing is only the auto-suggested
cross-module-link convenience (`link-suggestion-panel.tsx`) an engineer
might otherwise expect between a `ball-screw-motor-sizing`/`ball-screw`
instance and a `shaft-key-bolt-checks` instance in the same workflow.
Building a real `ApprovedParameterMapping` registry and wiring it into
`confirmParameterLink` is a cross-cutting generic-engine change — combining
it with this module's own release would violate `context/
ai-workflow-rules.md` "Split Rules" ("A new generic framework capability
and production module behavior"). Recorded as an open decision in
`context/progress-tracker.md`, not fixed here.

### 6. `key.*` reuses `shaft.diameter` and `shaft.applied_torque` directly

**Resolved: no `key.*` diameter or torque port is minted. The key check
consumes `shaft.diameter` and `shaft.applied_torque` directly — the same
physical shaft, whether or not the shaft-stress sub-check is also
invoked.**

This is a new kind of reuse for this project: every prior "Existing
Parameter Mapping" reused a port released by a *different, already-released
module* (e.g. `coupling` reusing `screw.drive_torque`). Here, two scopes
released by the *same* module and the *same* registry version reuse each
other. This is safe because both scopes are released together, in the same
version, with the same lifecycle — there is no risk of one being released
before the other's semantics are pinned, unlike a genuine cross-module
dependency. Registering a duplicate `key.shaft_diameter`/`key.applied_
torque` pair would violate the registry's own "search first, reuse an
existing ID" rule (`lib/engine/parameters/README.md` item 1) for no
benefit, since the physical quantity is identical.

### 7. A bolt bearing check is added, closing a real Stage 1 gap

**Resolved: `0.1.0` adds `bolt.bearing_allowable_stress` and `bolt.
bearing_safety_factor`, checking the bearing/crushing stress on the clamped
material at the shear plane — a check `stage-1-spec.md`'s own "Formulas"
item 6 sourced a formula for (`sigma_bearing = F/(d*t)`, under a section
titled "Bolt shear/bearing check") but whose own "Checks" section omitted
from its enumerated list, naming only "Bolt shear."**

This reads as an incomplete list, not a deliberate scope decision: the
formula section's own title says "shear/bearing," the formula itself is
already given and sourced (RoyMech's `bolted_joint_shear_bearing`), and the
key check already pairs shear with bearing for the structurally identical
physical reason (a component crushing into a softer contact face). Adding
the check costs one more optional-when-shear-path-used input
(`bolt.bearing_allowable_stress`, the clamped material's own bearing
allowable — a different material property from the bolt's own shear
allowable, since the plate/bracket being clamped is very often a different
material than the bolt) and one more output. Not adding it would mean
computing and reporting a stress with no accept/reject criterion at all,
which this project's own established pattern treats as informational-only
only when there is a real reason to (e.g. `coupling.torsional_stiffness`,
"reported, not evaluated," because no downstream resonant-frequency check
exists yet to evaluate it against) — no such reason applies here.

### 8. `0.1.0` releases without a JP-market source for the shaft-stress check

**Resolved: yes, `0.1.0` releases without one. The asymmetry is disclosed
in `shaft.torque_service_factor`'s own definition text and here, not held
as a release blocker.**

`stage-1-spec.md`'s own "Candidate Sources" (Shaft item 4) confirmed this
is a genuine negative finding, not an unread gap: `JIS B 0901` is a
preferred-number diameter-series standard, not a stress standard; Oriental
Motor's own combined technical-reference PDF (already a registered source
for other modules) has no shaft-strength section; `engineersedge.com`
returned HTTP 403 on every attempt across all three of this session's own
research passes. This project has direct precedent for shipping with
exactly this kind of disclosed one-sided sourcing rather than holding
release: `coupling@0.1.0` shipped with "a documented asymmetry" (no JP
methodology source, only JP catalog data) for the identical reason — a
domain returning HTTP 403 every attempt. The key and bolt sub-checks both
already have real JP/ISO-aligned sources (Miki Pulley/instant.engineer for
key; NBK America for bolt), so this asymmetry is specific to the shaft
sub-check alone, not the module as a whole.

### 9. `0.1.0`'s own module ports narrow to preload + tensile capacity only — a Stage 3 finding

**Resolved during Stage 3 (compute and trace), not Stage 2: `shaft-key-
bolt-checks@0.1.0`'s own manifest wires only `bolt.preload` and
`bolt.tensile_safety_factor` as bolt-group outputs. `bolt.separation_
safety_factor`, `bolt.shear_safety_factor`, and `bolt.bearing_safety_
factor` stay registered (this record's own "Released Additive Contract"
below is unchanged — no registry parameter is removed) but are not yet
consumed by any module port. `bolt.joint_stiffness_ratio` remains a genuine
optional input in `0.1.0`, feeding the tensile check's own applied-load
term (defaulting its share to `C = 1`, the conservative worst case, when
omitted) — but no longer gates a separate output port's existence.**

This is not a reversal of Decision 4's own reasoning — joint separation is
still not required, no default, exactly as decided — it is a correction to
*how* `0.1.0` can honor that decision within a real constraint Stage 2 did
not check: the module SDK requires every port a manifest declares in
`ports.outputs` to be produced by every `compute()` call
(`lib/engine/module-sdk/execute.ts`'s own `resolveModuleInput`/`executeModule`
— "did not produce output" is a hard failure, not a warning). A port whose
underlying formula has no defined value without an optional input (unlike
`drive-train@0.1.0`'s own `regen-energy` check, where the *value* is always
computable and only the *comparison* against an optional allowable becomes
`not_applicable` — `lib/modules/drive-train/0.1.0/checks.ts`) cannot be
made "sometimes present" at the module-instance level without either (a)
promoting its own governing inputs to required-whenever-the-group-is-active
(defeating the whole point of making them optional), or (b) reporting a
placeholder number that misrepresents an undefined result as a real one.
Neither is honest. Dropping the port from `0.1.0`'s own consumption — while
leaving the already-registered, already-additive parameter available for a
future version to wire up once this project has a real reason to (e.g. a
`0.2.0` scoped specifically to shear-loaded and separation-sensitive
joints) — is the same "approved pending proposal, released per module at
its own Stage 2 contract" treatment this registry's own `lib/engine/
parameters/README.md` already establishes for `screw.*`/`guide.*`/
`coupling.*`/`bearing.*`/`drive.*` (registered ahead of the specific module
version that would go on to consume them). The same reasoning applies to
`bolt.external_shear_load`, `bolt.shear_plane_count`, `bolt.clamped_
material_thickness`, `bolt.shear_allowable_stress`, and `bolt.bearing_
allowable_stress` — the whole shear/bearing sub-path is deferred alongside
separation, for the identical SDK-level reason (a zero shear load, the
parameter's own constant default, would make `bolt.shear_safety_factor`'s
own denominator zero whenever the sub-path is "on" but idle, an Infinity
this module must never report).

**Founder-directed addendum (2026-08-31, same Stage 3 session): the same
SDK constraint turned out to apply one level up, not just to the bolt
sub-paths.** Making the shaft+key group and the (preload+tensile) bolt
group each independently optional at the module-instance level — so an
engineer could add an instance for just a bolted bracket, unrelated to any
shaft — hits the identical "every declared output must always be produced"
wall: `shaft.combined_stress`, `key.shear_stress`, etc. are declared output
ports regardless of whether the shaft+key group is in use for a given
instance. Resolving this properly (independent module-instance usability)
would mean splitting this unit into two separate modules
(`shaft-key-checks`, `bolt-joint-checks`), each with its own always-computed
outputs — the only architecture this SDK actually supports for genuine
per-instance independence. Presented as a choice — split now, or keep one
module and require the full shaft+key+bolt input set together, deferring
independence — **the founder chose the simpler, single-module path**:
`shaft-key-bolt-checks@0.1.0` requires the complete shaft, key, and bolt
(preload+tensile) input set on every instance, and always computes all
three checks together. `stage-1-spec.md`'s own "each usable on its own"
framing (Purpose) is not implemented in `0.1.0` — a real, disclosed scope
reduction from that document's own stated intent, not a silent one. A
future version remains free to split into two modules, or to find another
way to make sub-scopes genuinely independent, once real usage shows this
matters in practice.

## Released Additive Contract

Registry `1.21.0` adds 38 new parameters across three new scopes. It does
not edit any `1.0.0`-`1.20.0` definition.

### `shaft.*` (10 parameters)

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `shaft.diameter` | quantity, `m` (display `mm`/`in`), `>= 0`, **required** | Candidate shaft outer diameter. Reused by `key.*` (Decision 6). |
| `shaft.bore_diameter` | quantity, `m` (display `mm`/`in`), `>= 0`, default `0` | Hollow-shaft bore diameter; `0` means solid. |
| `shaft.material_yield_strength` | quantity, `MPa`, `>= 0`, **required** | Candidate shaft material yield strength. |
| `shaft.applied_torque` | quantity, `N*m`, `>= 0`, **required**, per case (`normal`/`peak`), `bound: required` | Transmitted torque, magnitude. Unit/qualifier-compatible with `screw.drive_torque`, but NOT graph-link-compatible today — see Decision 5's own Stage 5 correction. Reused by `key.*`. |
| `shaft.applied_bending_moment` | quantity, `N*m`, `>= 0`, **required**, per case, `bound: required` | Bending moment at the checked cross-section, magnitude. Direct entry only (Decision 5). |
| `shaft.torque_service_factor` | quantity, ratio, `>= 1`, **required, no default** | `Ks` — Air-Force/ASME-B106.1M service factor (Decision 2). |
| `shaft.bending_service_factor` | quantity, ratio, `>= 1`, **required, no default** | `Km` — counterpart to `Ks`. |
| `shaft.safety_factor_minimum` | quantity, ratio, `>= 0`, **required, no default** | Minimum acceptable yield-based safety factor. |
| `shaft.combined_stress` | quantity, `MPa`, `>= 0`, output, per case | Computed Tresca combined stress (no axial term — Decision 1). |
| `shaft.safety_factor` | quantity, ratio, `>= 0`, output, per case | `shaft.material_yield_strength / shaft.combined_stress`. |

### `key.*` (9 parameters)

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `key.width` | quantity, `m` (display `mm`/`in`), `>= 0`, **required** | Key width (direct entry). |
| `key.height` | quantity, `m` (display `mm`/`in`), `>= 0`, **required** | Key height; `h/2` bearing depth (Decision 3). |
| `key.length` | quantity, `m` (display `mm`/`in`), `>= 0`, **required** | Engaged key length. |
| `key.material_yield_strength` | quantity, `MPa`, `>= 0`, **required** | Candidate key material yield strength. |
| `key.safety_factor_minimum` | quantity, ratio, `>= 0`, **required, no default** | Shared minimum for both shear and bearing checks (one consolidated input). |
| `key.shear_stress` | quantity, `MPa`, `>= 0`, output, per case | `tau = F/(w*L)`, `F = 2*T/d`. |
| `key.bearing_stress` | quantity, `MPa`, `>= 0`, output, per case | `sigma = F/((h/2)*L)`. |
| `key.shear_safety_factor` | quantity, ratio, `>= 0`, output, per case | Yield / shear stress. |
| `key.bearing_safety_factor` | quantity, ratio, `>= 0`, output, per case | Yield / bearing stress. |

### `bolt.*` (19 parameters)

Tension-path inputs:

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `bolt.thread_standard` | enum (`metric`/`unified`), **required** | Selects the metric or US/UN stress-area formula. |
| `bolt.nominal_diameter` | quantity, `m` (display `mm`/`in`), `>= 0`, **required** | Nominal bolt diameter. |
| `bolt.thread_pitch` | quantity, `m` (display `mm`/`in`), `>= 0`, **required** | Thread pitch (TPI converted to pitch on the US/UN side). |
| `bolt.proof_strength` | quantity, `MPa`, `>= 0`, **required, no default** | Property-class/grade proof stress, direct entry. |
| `bolt.k_factor` | quantity, ratio, `0-1`, **required, no default** | Nut/friction factor `K` in `T = K*F*d`. |
| `bolt.installation_torque` | quantity, `N*m`, `>= 0`, **required** | Applied installation torque. |
| `bolt.external_tensile_load` | quantity, `N`, `>= 0`, per case, `bound: required`, default `0` | Externally applied tensile load. |
| `bolt.joint_stiffness_ratio` | quantity, ratio, `0-1`, optional, no default | `C = kb/(kb+km)` (Decision 4). |
| `bolt.safety_factor_minimum` | quantity, ratio, `>= 0`, **required, no default** | Shared minimum for tensile, separation, shear, and bearing checks. |

Shear-path inputs (all optional — meaningful only when `bolt.
external_shear_load` is supplied):

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `bolt.external_shear_load` | quantity, `N`, `>= 0`, per case, `bound: required`, default `0` | Externally applied shear load. |
| `bolt.shear_plane_count` | enum (`single`/`double`), optional | Selects the shear-stress formula. |
| `bolt.clamped_material_thickness` | quantity, `m` (display `mm`/`in`), `>= 0`, optional | Clamped material thickness at the shear plane. |
| `bolt.shear_allowable_stress` | quantity, `MPa`, `>= 0`, optional | Bolt's own material shear allowable. |
| `bolt.bearing_allowable_stress` | quantity, `MPa`, `>= 0`, optional | Clamped material's own bearing allowable (Decision 7). |

Outputs:

| Parameter | Value and units | Meaning |
| --- | --- | --- |
| `bolt.preload` | quantity, `N`, `>= 0`, output (not per-case) | `F = T/(K*d)`. |
| `bolt.tensile_safety_factor` | quantity, ratio, `>= 0`, output, per case | Proof-load capacity / (preload + external tension share). |
| `bolt.separation_safety_factor` | quantity, ratio, `>= 0`, output, per case | Present only when `bolt.joint_stiffness_ratio` is supplied (Decision 4). |
| `bolt.shear_safety_factor` | quantity, ratio, `>= 0`, output, per case | Present only when `bolt.external_shear_load` is supplied. |
| `bolt.bearing_safety_factor` | quantity, ratio, `>= 0`, output, per case | Present only when `bolt.external_shear_load` is supplied (Decision 7). |

### No new unit or dimension

Stress shares the pressure dimension (`mass:1, length:-1, time:-2`). Every
`shaft.*`/`key.*`/`bolt.*` stress port reuses the existing `MPa`/`psi` units
`pneumatic.operating_pressure` already released — no new unit-registry
dimension or unit is needed for this contract, unlike `coupling` (`v1.6`,
torsional stiffness) or `pneumatic-cylinder` (`v1.16`, volume/flow rate).

## Existing Parameter Mapping

| Purpose | Canonical parameter | Note |
| --- | --- | --- |
| Semantically related upstream torque (not graph-link-compatible) | `screw.drive_torque` | Same unit/qualifiers/load cases as `shaft.applied_torque`, but a distinct registered parameter ID with no approved mapping to it — see Decision 5's own Stage 5 correction. Not a hard dependency; direct entry is always available regardless. |
| Shaft diameter, reused within this module | `shaft.diameter` | Consumed directly by the key check — see Decision 6. |
| Applied torque, reused within this module | `shaft.applied_torque` | Consumed directly by the key check — see Decision 6. |

`coupling.driving_shaft_diameter`/`coupling.driven_shaft_diameter`
(`stage-1-spec.md` "Existing Parameter Review") are confirmed, not reused:
they are coupling-specific *installation* inputs (an actual diameter
checked against a catalog bore range), a different purpose from
`shaft.diameter`'s own "candidate diameter under a stress check," matching
`stage-1-spec.md`'s own conclusion.

## Method Sources

No new source-registry entry is added by this record. The 17 sources
`stage-1-spec.md` registered in `lib/standards/engineering-sources.ts`
remain the method sources for this module; this record's own contribution
is the port mapping and the eight Stage-2-only decisions above, none of
which needed new source evidence beyond what Stage 1 already found and
registered.

## Stage 2 Entry Criteria — Resolution Status

Mapped against `stage-1-spec.md` "Stage 2 Entry Criteria":

1. New `shaft.*`, `key.*`, `bolt.*` registry parameters — **resolved**,
   "Released Additive Contract" above (also Decisions 1, 6, 7 for the
   port-list decisions Stage 1 did not fully spell out).
2. Which shock/duty-factor convention the shaft check adopts — **resolved
   (Air-Force/ASME-B106.1M `Ks`/`Km`)**, Decision 2.
3. Whether the key bearing-stress check exposes `h/2` only or also an exact
   effective-depth option — **resolved (`h/2` only)**, Decision 3.
4. Whether joint separation ships in `0.1.0` — **resolved (yes, as an
   optional input), refined at Stage 3 (Decision 9): the registry parameter
   ships additive in `1.21.0`, but `0.1.0`'s own module ports do not yet
   consume it — a real SDK-level constraint found during compute
   implementation, not a change of engineering judgment**, Decisions 4 and 9.
5. Whether torque/moment inputs are direct-entry-only or link-compatible
   from the start — **resolved (torque shares screw.drive_torque's own
   unit/qualifiers/load cases, but is NOT graph-link-compatible with it —
   corrected at Stage 5, see Decision 5's own correction note; moment
   remains direct-entry only, no upstream port exists)**, Decision 5.
6. Whether `0.1.0` releases without a JP-market source for the shaft-stress
   check — **resolved (yes, releases without one, disclosed)**, Decision 8.

Stage 2 is complete for `0.1.0`'s scope. Stage 3 (compute and trace) is
next — see `context/ai-workflow-rules.md` "New Module Workflow."
