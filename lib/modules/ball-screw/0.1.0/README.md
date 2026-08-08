# Ball Screw 0.1.0 — Draft Package (Stage 3)

`math.ts` is a pure SI-number kernel for the third production engineering
module (Unit 4.3). It covers every check in
`context/modules/ball-screw/stage-1-spec.md`, including the static safety
factor (formula only — no recommended minimum value found yet):

- **Lead / rotational-speed relationship** (`resolveRotationalSpeed`) —
  definitional screw-thread geometry, `v = N * P`.
- **Ball-screw drive torque** (`resolveDriveTorque`) — Oriental Motor's
  published load-torque formula for a ball-screw drive, reusing
  `axis-load-cases`' already-resolved axial thrust rather than re-deriving
  gravity/friction. Cross-checked against a second, independent worked
  example (Rockford Ball Screw).
- **Duty-cycle equivalent dynamic load and mean rotational speed**
  (`resolveEquivalentDynamicLoad`) — Steinmeyer's published formula, image-
  verified directly against the source.
- **Nominal (fatigue) life** (`resolveNominalLife`,
  `resolvePermissibleMeanLoad`, `resolveLifeHours`) — the standard cubic
  life law, also image-verified directly. **Do not** feed this a
  distance-basis dynamic load rating (see `resolveNominalLife`'s own doc
  comment) — a real cross-catalog incompatibility found this session, not a
  hypothetical.
- **Buckling load** (`resolveBucklingLoad`) and **critical speed**
  (`resolveCriticalSpeed`) — Rockford Ball Screw's published formulas,
  which explicitly use the screw's minor (root) diameter, not its
  nominal/major diameter. Both reproduce Rockford's own full worked
  numerical example to within whole-unit catalog rounding.
- **Static safety factor** (`resolveStaticSafetyFactor`) — `fs = C0 /
Fas_max`, sourced from WY Ball Screw. Returns the computed factor only;
  no recommended minimum is built in (see below).

`math.test.ts` (39 tests) tests most functions against their own internal
consistency (inversion identities, boundary behavior, monotonicity, the
documented "a stationary phase does not accumulate fatigue" property of the
equivalent-load formula), plus genuine published-worked-example
reproductions for drive torque, buckling, and critical speed — the first
reference-example-quality validation this module has, short of a formal
Stage 4 record.

## Two discrepancies found and deliberately not silently resolved

- **Buckling safety margin.** Steinmeyer states a `0.5` factor should be
  applied to the raw buckling load; Rockford's own worked example applies
  `Fs = 0.8` to the identical formula. `resolveBucklingLoad` uses `0.5` (the
  more conservative choice) as a documented placeholder — see its own doc
  comment and stage-1-spec.md item 7 / "Stage 2 Entry Criteria" item 6.
- **Dynamic-load-rating life basis.** Rockford's own catalog dynamic load
  ratings are calibrated against `10^6` inches of travel, not `10^6`
  revolutions the way the Steinmeyer/ISO-attributed life formula this
  kernel implements assumes. Confirmed by reproducing Rockford's own worked
  numbers and finding they disagree with the revolution-basis formula for
  the same catalog figure — see `resolveNominalLife`'s doc comment and
  stage-1-spec.md item 5.

## What the kernel alone did not cover — resolved at the package boundary

**A recommended minimum static safety factor, and the buckling safety
margin, as built-in constants.** Both remain genuinely unresolved by any
source that met this project's evidence bar, across two sessions of
sourcing attempts — see `context/modules/ball-screw/stage-2-contract.md`
"Decisions" items 1-2. Stage 2 resolved this by making both a required
module input instead of a hardcoded number
(`screw.static_safety_factor_minimum`, `screw.buckling_safety_margin`), not
by finding the missing evidence. `resolveBucklingLoad`'s internal `0.5`
constant is a kernel-level default only — `compute.ts` ignores it and
recomputes the permissible compressive load from the registry-supplied
`buckling_safety_margin` input instead, so the kernel itself is unchanged
from Stage 1/2.

## Stage 3 package

A full `ModulePackage` — manifest, ports, input schema, compute, calculation
trace, checks, generic UI schema, report schema, and a draft validation
record — wraps `math.ts` in this directory (`manifest.ts`, `input-schema.ts`,
`values.ts`, `trace.ts`, `checks.ts`, `compute.ts`, `ui.ts`, `report.ts`,
`validation.ts`, assembled in `package.ts`, not `index.ts` — see "Status"
below). It supports only the `normal`/`peak` load cases, matching
`axis-load-cases 0.1.0`'s own scope restriction — there is no supported
`holding`/`emergency_stop` thrust force to consume yet.

Two Stage 3 wiring decisions worth noting:

- **`dynamic_load_rating_basis` must be `"revolutions"`.** `input-schema.ts`
  rejects a `"distance"`-basis rating outright — 0.1.0 has no documented
  distance-to-revolution conversion, so silently feeding one into
  `resolveNominalLife` would misstate life by a factor tied to the screw's
  lead (the real incompatibility Stage 1 found in Rockford's own catalog).
- **The duty-cycle equivalent-load formula reuses the `normal`/`peak` cases
  as its two phases**, fed by two new per-case `motion.axis.*` inputs
  (`case_time_fraction`, `case_linear_velocity`) rather than a
  screw-specific duplicate — `context/modules/ball-screw/stage-2-contract.md`
  "Decisions" item 3.

`package.test.ts` (19 tests) exercises the full module conformance suite
(package validation, execution, determinism) plus boundary/invalid-input and
output-correctness tests, on top of the 39 existing kernel-level tests in
`math.test.ts`.

## Status

Stage 3 (compute and trace) is done as a draft. No package is registered:
this directory has no `index.ts` (`package.ts` only), so
`npm run registry:generate` cannot discover it. Stage 4 (validation) is not
started — `validation.ts` is a draft record with `reviewer`/`reviewDate`
still `"TODO"`, and its three reference examples all come from one shared
Rockford Ball Screw worked scenario, not three independent scenarios (see
that file's own top comment). Production release remains sequentially gated
behind Unit 4.1's Definition of Done regardless
(`context/implementation-map.md` Milestone 4 header).
