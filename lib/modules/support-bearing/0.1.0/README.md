# Support Bearing 0.1.0 — Draft Package (Stage 3)

`math.ts` is a pure SI-number kernel for the sixth production engineering
module (Unit 4.6), covering the `0.1.0` proposed scope from
`context/modules/support-bearing/stage-1-spec.md`: one ball-screw shaft
support bearing (fixed-side angular contact, or supported/floating-side
deep-groove — `bearing.location` selects which), dynamic and static
equivalent load, basic (L10) rating life, static safety factor, and speed
margin.

- `resolveDynamicEquivalentLoad` / `resolveStaticEquivalentLoad` — NTN's
  own `P = X*Fr + Y*Fa` and `P0 = max(X0*Fr + Y0*Fa, Fr)` formulas
  (jp.ntn.rolling_bearings_handbook eq. 7.10, 7.12/7.13).
- `resolveNominalLife` / `resolveLifeHours` — `L10 = (C/P)^3 * 10^6`,
  `L10h = L10/(60n)` (eq. 6.1, 6.2) — the identical shape `ball-screw`'s
  own kernel already uses for the screw itself, mirrored rather than
  imported (this module's own component, a different physical part).
- `resolveStaticSafetyFactor` — `S0 = C0/P0` (eq. 6.6).
- `resolveOperatingSpeed` — `n = v / lead`. No gear-ratio term: the
  support bearing mounts directly on the screw shaft, not a driving/motor
  shaft (unlike `coupling 0.1.0`'s own driving-shaft speed).
- `resolveSpeedSafetyFactor` — `fs_n = n_allowable / n`, using the
  catalog allowable speed uncorrected (NTN's own `fL`/`fC` correction
  factors are graphs, not closed-form equations — not implemented in
  `0.1.0`, see `math.ts`'s own module doc comment). Requires a strictly
  positive operating speed; a true zero-speed case throws rather than
  reporting an infinite safety factor, the same treatment `coupling`'s
  own zero-operating-speed case receives.

## Stage 3 package (2026-08-10)

A full `ModulePackage` wraps the kernel:

| File                     | Role                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `manifest.ts`            | Identity, validity envelope, source revisions, and ports.                                                                            |
| `input-schema.ts`        | Requires `dynamic_load_factor_y`, `static_load_factor_y`, and per-case `thrust_force` together when `bearing.location` is `"fixed"`. |
| `compute.ts`             | Pure compute over the two supported load cases, branching on `bearing.location`.                                                     |
| `trace.ts` / `checks.ts` | Trace steps and acceptance checks.                                                                                                   |
| `ui.ts` / `report.ts`    | Generic UI and report schemas.                                                                                                       |
| `validation.ts`          | Draft validation record — **Stage 4 has not started**, and it says so.                                                               |
| `package.ts`             | Sealed package. Named `package.ts`, not `index.ts`, so `npm run registry:generate` cannot discover it.                               |

No registry version is released by this package — `bearing.*` was already
released at Stage 2 (`context/modules/support-bearing/stage-2-contract.md`,
registry `1.7.0`).

### Why the axial-load and Y-factor ports are optional at the manifest level

`bearing.location = "supported"` (the floating side) does not react axial
thrust in THK's own Support Unit design (stage-1-spec.md "Candidate
Sources" item 1) — its own catalog table gives that bearing only a radial
dynamic/static rating, no axial one. Requiring `motion.axis.thrust_force`,
`bearing.dynamic_load_factor_y`, and `bearing.static_load_factor_y`
unconditionally would force a "supported"-location calculation to
fabricate meaningless axial numbers. Instead the manifest marks all four
`required: false`, and `input-schema.ts` requires them together only when
`bearing.location` is `"fixed"` — the same "generic port shape can't
express this, so an author-provided schema rule does" pattern
`coupling 0.1.0`'s own bore-range check already established.

### What the package deliberately leaves out

- **No speed correction factors (`fL`/`fC`).** NTN's own handbook prints
  these as graphs (Figs. 10.1-10.2), not closed-form equations — the
  catalog allowable speed is used uncorrected, a documented simplification
  (`stage-1-spec.md` item 5, `validation.ts`'s own `deviations`).
- **No bore/outside-diameter or preload check.** `bearing.bore_diameter`,
  `bearing.outside_diameter`, and `bearing.preload` are reported catalog
  values only — a support bearing's bore is manufactured to one matched
  shaft diameter, not a clamping range the way `coupling`'s own bore
  compatibility is (`stage-2-contract.md` "Decisions").
- **No 3-point statically-indeterminate load derivation.** NTN's own
  Table 7.3 reaction formulas are sourced but not implemented — this
  module's own `0.1.0` scope is two-point shaft support only
  (`stage-1-spec.md` "Validity Envelope").
- **No torsional-resonance check.** Same gap `coupling 0.1.0` has for the
  same reason: no released motor/load inertia parameter exists yet.

## Stage 2 (2026-08-09): six decisions, all sourced from Stage 1's own open questions

`context/modules/support-bearing/stage-2-contract.md` resolved all six
Stage 2 entry criteria and released registry `1.7.0`. The two worth
restating here:

- **One support bearing per calculation run**, selected by a new
  `bearing.location` enum (`fixed` | `supported`) — not a combined
  fixed+floating calculation. The two locations are physically different
  components (an angular contact bearing vs. a deep-groove bearing) with
  different applicable checks, the same "one candidate component per run"
  scope every other Milestone 4 module already uses.
- **Radial load has no clean upstream source.** Unlike axial load (which
  reuses `motion.axis.thrust_force` directly, satisfying the roadmap's own
  Unit 4.6 gate — "integrates with the ball-screw module without a custom
  link mapping"), no released parameter represents the support bearing's
  own radial load. `bearing.actual_radial_load` is a new required
  engineer-supplied input instead, the same treatment `coupling`'s own
  actual-misalignment inputs already received.

## Stage 1 kernel, before the package existed

`math.test.ts` (18 tests) tests every function against boundary/invalid
input and elementary property checks (the static-equivalent-load `max()`
form taking either branch, a zero axial load producing the pure-radial
dynamic equivalent load, etc.) rather than a published worked numerical
example: **no full published worked example was found this session** —
NTN's own handbook table of contents lists a "Bearing Life Calculation
Examples" section at printed page 84, but both copies fetched this
session (`ntnglobal.com` and `ntnamericas.com`) are identically truncated
right before it. A real, documented evidence gap, not a skipped step —
see `context/modules/support-bearing/stage-1-spec.md` "Evidence Gaps" and
`validation.ts`'s own header note.

Production release stays sequentially gated behind Unit 4.1's Definition of
Done regardless (`context/implementation-map.md` Milestone 4 header), and
this module additionally has not started Stage 4.
