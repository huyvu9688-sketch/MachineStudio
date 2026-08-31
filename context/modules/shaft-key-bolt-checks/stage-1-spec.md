# Shaft, Key, and Bolted-Joint Checks Module — Stage 1 Engineering Specification

## Status

- Work unit: Milestone 7 (Phase 2), new unit — first module of this unit
- Proposed module ID: `shaft-key-bolt-checks`
- Proposed first released version: `0.1.0`
- Status: **Stage 1 draft.**
- Date: 2026-08-31

No released parameter, module version, calculation run, or validation record
is changed by this document.

### Why this module, next

Picked via `context/roadmap.md`'s own Module Prioritization formula
(`priority = usage frequency x manual pain x workflow leverage / data cost`)
across the eight remaining Phase 2 candidates, scored this session:

| Candidate | Usage freq (1-5) | Manual pain (1-5) | Workflow leverage (1-5) | Data cost (1-5) | Priority |
| --- | --- | --- | --- | --- | --- |
| **Shaft, key, bolted-joint checks** | 4 | 4 | 5 | 2 | **40** |
| Bushings and plain bearings | 3 | 3 | 4 | 2 | 18 |
| Tolerance and fit reference | 3 | 2 | 3 | 1 | 18 |
| Timing belts | 3 | 3 | 3 | 2 | 13.5 |
| Mechanical stops / energy absorption | 3 | 4 | 3 | 3 | 12 |
| Cable carriers | 3 | 2 | 2 | 2 | 6 |
| Chain and sprocket | 2 | 3 | 2 | 3 | 4 |

Usage-frequency scores are a qualitative 1-5 judgment (this project has no
logged historical-machine telemetry beyond the ID39/ID42 axis fixtures), not
a count against real machines. The deciding factor is workflow leverage and
data cost, not usage frequency: two already-released modules name a shaft
check as a gap in their own scope rather than closing it —
`context/modules/coupling/stage-1-spec.md` item 5 checks bore/shaft
*diameter compatibility* (a range check against a catalog bore) but never
checks whether the shaft itself survives the transmitted load, and
`context/modules/support-bearing/stage-1-spec.md` similarly treats the
shaft/housing interface as a given. Unlike every catalog-driven Phase 2
candidate (timing belts, chain/sprocket, cable carriers), the governing
formulas here come from standard machine-design references and
government/consensus-standard handbooks, not hard-to-source manufacturer
catalogs — the lowest data cost of any candidate except the tolerance/fit
reference module, which itself scores far lower on workflow leverage.
"PDF generation and improved catalog import" was excluded from scoring
entirely — it is a platform/reporting capability
(`context/architecture.md`'s own `lib/reports/`), not a `ModulePackage`
candidate the priority formula's own "usage frequency" and "manual pain"
terms meaningfully apply to.

## Purpose

Given a shaft segment transmitting a known torque and/or bending moment, a
key coupling that shaft to a hub (pulley, sprocket, coupling half, gear),
and a bolt or bolt group carrying an applied load, check whether each
candidate is mechanically adequate — a required-spec / pass-fail-with-margin
result the engineer supplies dimensions and material properties for, the
same scope restriction `coupling@0.1.0`, `ball-screw@0.1.0`, and
`linear-guide@0.1.0` already established (no catalog search/ranking in
`0.1.0` — catalog matching is optional item 12 in `context/roadmap.md`'s
Module Definition of Done). Three semi-independent checks, each usable on
its own:

1. **Shaft stress** — a candidate shaft diameter under combined torque and
   bending moment, checked against a yield-based allowable stress
   (maximum-shear-stress/Tresca or distortion-energy/von Mises theory, both
   sourced — see "Formulas" item 1).
2. **Key shear and bearing stress** — a candidate key (standard parallel-key
   cross-section, dimensioned by shaft diameter per JIS B 1301 or
   ANSI/ASME B17.1) under the tangential force implied by a transmitted
   torque, checked against shear (across the key's width) and bearing
   (compressive, on the key's side face) allowable stress.
3. **Bolted joint** — a candidate bolt (standard size/grade, US/UN or
   ISO/JIS metric) under an installation torque and an applied external
   load: preload from the torque-tension relationship, tensile-capacity
   margin against proof/yield strength, and (when the engineer supplies a
   joint-stiffness ratio — see "Validity Envelope") a joint-separation
   margin under external tensile load. A basic shear/bearing check for a
   shear-loaded joint is included as a separate, simpler path.

Unlike every module released so far in this project, **this module's inputs
are not tied to a specific mechanism family** (ball screw, guided cylinder,
etc.) — a shaft, key, or bolt exists in nearly every mechanism this project
already models or will model. Torque/moment/force inputs are therefore
generic required inputs the engineer supplies directly (optionally sourced
from an upstream module's output via a cross-module link, e.g.
`screw.drive_torque`), not a hard-wired dependency on any one upstream
module. See "Existing Parameter Review" and Stage 2 Entry Criteria item 5.

It will **not**, in `0.1.0`:

- perform fatigue/S-N, notch-sensitivity, or stress-concentration-factor
  design on the shaft check — static/yield-based only (see "Validity
  Envelope" for why, and Evidence Gaps for the sourcing reason).
- design woodruff or taper keys — parallel/sunk keys only.
- perform a torsional-vibration or critical-speed analysis (distinct from,
  and not reusing, `ball-screw@0.1.0`'s own screw-specific critical-speed
  check).
- implement the full VDI 2230 "Systematic Calculation of High Duty Bolted
  Joints" method — the joint-separation check uses the simpler
  stiffness-ratio method found this session (see "Formulas" item 5), not
  VDI 2230's own more detailed treatment.
- check combined tension-and-shear loading on a single bolt as one
  interaction equation — a real formula was found (NASA/TM-20210024657)
  but its own generalized `(Rt)^a+(Rs)^b+(Rk)^c=1` form is aerospace-scoped
  and considerably beyond "basic"; tension and shear are checked as two
  independent paths in `0.1.0` (see "Evidence Gaps").
- check a multi-bolt pattern's own load distribution (eccentric shear,
  bolt-group centroid) — one bolt (or one uniformly-loaded bolt group
  treated as a single equivalent bolt) per check invocation.
- select a shaft, key, or bolt from a catalog — a required-spec /
  pass-fail-with-margin check on an engineer-identified candidate only.

## Candidate Sources

Three independent research passes were run in parallel this session
(2026-08-31), one per sub-check. All sources actually fetched and read are
now registered in `lib/standards/engineering-sources.ts`; every registry
entry below cites its own real URL and what was actually read — see that
file for the full note on each. Sources found only via a search-engine
result snippet, never independently fetched, are **not** registered and are
called out explicitly in "Evidence Gaps" instead — this project's
convention throughout (e.g. `context/modules/coupling/stage-1-spec.md`
"Evidence Gaps") is to record an unread lead, not silently drop it or treat
it as confirmed.

### Shaft stress

1. **`us.engineeringlibrary.afdl_stress_analysis_manual_shafts`** — the US
   Air Force Flight Dynamics Laboratory's own *Stress Analysis Manual*
   (Oct. 1986), Chapter 10, a public-domain government handbook hosted by
   `engineeringlibrary.org`. Gives the combined bending/torsion/axial
   maximum-shear-stress shaft-diameter formula and one full worked
   numerical example (20 hp/300 rpm pulley shaft, solved diameter
   1.726 in). Primary US source for `0.1.0`.
2. **`us.roymech.shaft_design`**, **`us.reuven_tools.shaft_design_calculator`**,
   **`us.steelsolver.shaft_design_calculator`** — three corroborating
   tertiary handbook/calculator sources, all giving the identical formula
   shape (a Tresca root-sum-square cubic in diameter); Reuven additionally
   gives the distortion-energy (von Mises) variant, which differs from
   Tresca only in the torque term's coefficient (0.75 vs. 1.0) — the
   expected theoretical relationship, not a disagreement.
3. **The actual ANSI/ASME B106.1M-1985 standard text was never obtained.**
   Every direct attempt failed (`pdfcoffee.com` HTTP 503, `scribd.com`
   paywalled teaser only, `academia.edu` HTTP 403,
   `standards.globalspec.com` HTTP 403). The Air Force manual is a
   documented predecessor/equivalent method to B106.1M, not a confirmed
   reproduction of its exact text — recorded, not glossed over.
4. **No JP-market shaft-stress source was found.** `JIS B 0901` was checked
   and confirmed to be a preferred-number *diameter series* standard only
   (4-630 mm, R5/R10/R20 from JIS Z 8601) — not a stress/strength design
   standard, a genuine negative finding, not an unread gap. Oriental
   Motor's own combined technical-reference PDF (already a registered
   source for other modules) was checked directly and contains no
   shaft-strength/allowable-torque section. `engineersedge.com` returned
   HTTP 403 on every attempt across all three research passes this
   session — see "Evidence Gaps". This is a real, disclosed asymmetry
   against this project's own established US+JP dual-sourcing pattern
   (`coupling@0.1.0`, `ball-screw@0.1.0`, `linear-guide@0.1.0` each found a
   JP-side source or catalog).

### Key shear and bearing stress

1. **`jp.miki_pulley.parallel_key_jis_b1301`** — a JP manufacturer's own
   reproduction of the JIS B 1301-1996 parallel-key dimension table
   (width x height by shaft-diameter range), read directly.
2. **`us.asme.b17_1_keys_and_keyseats`** — confirmed directly from
   `asme.org`: the standard's own scope statement says strength/stress
   analysis is explicitly **not** within ASME B17.1's own scope. This
   independently confirms the dimension standard and the stress-check
   method are always sourced separately — the project should not expect a
   single document to cover both.
3. **`us.roymech.key_and_spline_strength`** and
   **`jp.instant_engineer.key_shear_bearing_stress`** — two independently
   fetched sources (one US-hosted, one JP-hosted) giving the shear
   (`tau = F/(w*L)`) and bearing (`sigma = F/((h/2)*L)`) formulas in
   algebraically identical form once `F = 2T/d` is substituted. **A real,
   directly observed methodological caveat, not a fabricated
   disagreement:** RoyMech's own page explicitly flags `h/2` as an
   approximation to a geometry-dependent "effective depth", not an exact
   figure. Both give worked numerical examples with real printed numbers.
4. A third table (`keyseaters.com`, an ANSI-B17.1-style inch dimension
   table) was fetched but is **not registered** — it cites no specific
   edition and reads as an uncited secondary reproduction; flagged for
   re-verification against a cleaner source before Stage 2, not treated as
   confirmed.

### Bolted joint

The most heavily sourced of the three sub-checks — nine sources registered:
`us.fastenal.torque_tension_iso898_1` and `us.roymech.bolt_preload_calculation`
(torque-to-preload, `T = K*F*d`, with K-factor tables that genuinely differ
by coating/lubrication — expected, not a problem); `us.mechanicalc.
bolted_joint_analysis` (a comprehensive tertiary summary explicitly citing
Shigley, ASME B1.1/B1.13M, MIL-HDBK-60, and NASA, corroborating several
other sources at once); `us.triangle_fastener.stress_area_asme_b1_1` and
`us.southwest_bolt.sae_j429_grades` (US/UN-thread tensile-stress-area
formula and SAE J429 grade proof/yield/tensile tables); `jp.nbk_america.
technical_29_property_classes` (the JIS B 1051/ISO 898-1-aligned
property-class table — reached via NBK America's own US-hosted
technical-data page, notably **not** the `nbk1560.com` domain that returned
HTTP 403 during `coupling@0.1.0`'s own Stage 1 research, a different page
on the same manufacturer succeeding where the main catalog domain did not);
`us.up_edu.me401_fastener_notes` (joint-stiffness load factor
`C = kb/(kb+km)`, separation-load, and factor-of-safety formulas, citing
Shigley Ch. 8 equations/tables directly); `us.roymech.
bolted_joint_shear_bearing` (single/double-shear and bearing formulas); and
`us.roymech.joint_stiffness` (the bolt/member stiffness-estimation model —
see "Formulas" item 5 for its own real, formula-level disagreement).

**Correction to this session's own initial research brief, caught before
being carried into the spec:** the joint-stiffness load factor is
`C = kb/(kb+km)` (the *bolt's own* share of an externally applied load,
typically 15-25%), not `km/(kb+km)` as the research prompt itself
mis-stated — confirmed against three independently read sources (Portland's
own course notes, MechaniCalc, and the Sandia-report summary referenced
below) before being recorded here.

A combined tension+shear bolt interaction equation was found
(NASA/TM-20210024657, read in full) but is aerospace-scoped and out of
`0.1.0`'s "basic" envelope — see "Purpose". A frequently search-cited
simplified interaction form (`Rt^2+Rs^2<=1`) was never independently traced
to a primary text actually read this session — **not registered, flagged
as unverified**. A K-factor range attributed to Sandia report SAND2008-0371
(0.092-0.332) was reached only via a secondary summary page, not the
primary Sandia PDF itself (both direct mirrors failed to load) — also not
independently confirmed, not registered as its own source.

`engineersedge.com` and `portlandbolt.com` both returned HTTP 403 on every
attempt.

## Formulas (as sourced)

### 1. Shaft combined-stress diameter check

Maximum-shear-stress (Tresca) form, general (solid or hollow) shaft, per the
Air Force Stress Manual:

```text
D^3 = 16 / (fs*pi*(1-B^4)) * sqrt( Ks^2*T^2 + [Km*M + alpha*F*D*(1+B^2)/8]^2 )
```

where `fs` is the allowable shear stress, `B = Di/D` (hollow-shaft ratio,
`0` for solid), `Ks`/`Km` are named shock/fatigue application factors keyed
to service severity, `alpha` a column factor for an axial load `F`. The
distortion-energy (von Mises) variant found (Reuven) has the identical
shape with the torque term's coefficient changed from `1` to `0.75`:

```text
d^3 = (32*N)/(pi*Sy) * sqrt( (Kb*M)^2 + 0.75*(Kt*T)^2 )
```

**A real semantic trap, not just a units/constant difference:** the
Air-Force/ASME-B106.1M tradition's `Ks`/`Km` are empirical shock-and-duty
factors selected from a machine-type service table (turbine, pump, punch
press); the Shigley/Reuven-tradition's `Kb`/`Kt` in the *static* formula
above are geometric fatigue stress-concentration factors (`Kf`, tied to a
fillet or keyway radius) — different physical meanings reusing the same
symbol letters across sources. `0.1.0`'s own parameter definitions must not
conflate these; Stage 2 must pick one tradition's own meaning and name the
input accordingly (see Stage 2 Entry Criteria item 2).

### 2. Key shear and bearing stress

```text
F = 2*T/d                    (tangential force at the shaft surface)
tau = F/(w*L)                (shear stress across the key's width)
sigma_bearing = F/((h/2)*L)  (bearing/compressive stress on the key's face)
```

where `T` = transmitted torque, `d` = shaft diameter, `w`/`h` = key width/
height (from the JIS B 1301 or ASME B17.1 dimension table by shaft
diameter), `L` = key length. Both checked against an allowable stress
derived from the key material's yield strength with a safety factor. The
`h/2` bearing-stress term is flagged by one source (RoyMech) as an
approximation to a more exact geometry-dependent depth — `0.1.0` adopts
`h/2` (the form every other source uses directly) and records the
simplification, the same "reported approximation, not silently exact"
treatment this project gives e.g. `linear-guide`'s own installation-offset
assumption (`context/modules/linear-guide/stage-1-spec.md`).

### 3. Bolt preload from installation torque

```text
T = K * F * d
```

`T` = installation torque, `K` = a nut/friction factor (found in the range
0.12-0.33 across every source read, by coating/lubrication/finish — a
required input with no single built-in default, the same "required,
no-default" treatment this project already gives `ball-screw.
static_safety_factor_minimum` and `coupling.service_factor` for a
similarly source-disputed value), `F` = resulting preload/clamp force,
`d` = nominal bolt diameter.

### 4. Bolt tensile-capacity margin

Metric (ISO/JIS) stress area: `As = (pi/4)*(d - 0.9382*P)^2` (`P` = thread
pitch), confirmed by two independently read sources. US/UN stress area (per
ASME B1.1, Triangle Fastener's own reproduction): `TS = 0.7854*(Dia -
0.9743/TPI)^2`. Tensile-capacity margin checks `F` (preload plus any
externally applied tension share — see item 5) against `As * Sp` (JIS
B 1051/ISO 898-1 proof stress by property class, e.g. `8.8 -> 580 N/mm^2`,
`10.9 -> 830`, `12.9 -> 970`) or the SAE J429 grade's own proof-load table
on the US/UN side.

### 5. Bolt joint-separation margin (engineer-supplied stiffness ratio)

```text
C = kb/(kb+km)                      (bolt's own share of an external load)
F_bolt = F_preload + P_external*C
F_member = F_preload - P_external*(1-C)
P_separation = F_preload/(1-C)
FoS_separation = F_preload/(P_external*(1-C))
```

`kb`/`km` (bolt/clamped-member stiffness) have **no single agreed
estimation formula** — RoyMech's own frustum-cone contact model and an
alternate empirical fit disagree by roughly 8% on the same worked example
(`3503` vs `1906` combined kN/mm equivalent scale), and RoyMech's own page
states plainly that "widely different stiffness values result from
different studies." `0.1.0` therefore takes the joint-stiffness ratio `C`
itself (or `kb`/`km` directly) as a required, no-default engineer-supplied
input rather than deriving it from geometry — the same treatment item 3's
`K` factor and every other source-disputed value in this project already
receives. See Stage 2 Entry Criteria item 4.

### 6. Bolt shear/bearing check (shear-loaded joint, independent path)

```text
tau_single_shear = 4*F/(pi*d^2)
tau_double_shear = 2*F/(pi*d^2)
sigma_bearing = F/(d*t)
```

Simple, directly sourced, and structurally independent of the tension path
above (items 3-5) — a shear-loaded joint (e.g. a bracket in single or
double shear) is checked without ever computing a preload.

## Validity Envelope (Proposed)

- **Static/yield-based only, no fatigue, on all three sub-checks.** This is
  a cross-cutting scope decision, not three independent ones: the shaft
  check's own JP-source gap (no reachable JP shaft-fatigue methodology was
  found) and the roadmap's own "Basic" framing for this candidate both
  point the same direction. A future version could add fatigue (S-N,
  Goodman/Gerber) once a source clears this project's own evidence bar.
- **Parallel/sunk keys only** — woodruff and taper keys are out of scope.
- **One shaft segment / one key / one bolt (or one uniformly loaded
  equivalent bolt) per check** — no multi-bolt-pattern eccentric-load
  distribution, no full driveline model.
- **Bending moment is a required, no-default raw input**, not derived from
  any upstream module (see "Existing Parameter Review" — this project has
  no released "bending moment at an arbitrary shaft cross-section" port).
  The engineer supplies it directly, the same "engineer already knows the
  load" treatment `coupling@0.1.0` gives `screw.drive_torque` as an
  upstream-vs-hand-computed choice, and `pneumatic-cylinder@0.1.0` gives
  Milwaukee's own load-type percentages (documented upstream guidance,
  never implemented as a module formula).
- **Torque may be either a required raw input or linked from an upstream
  module's output** (e.g. `screw.drive_torque`) — this module is not
  scoped to any one mechanism family, unlike every module released so far.
  See Stage 2 Entry Criteria item 5.
- **Bolt joint-separation is checked only when the engineer supplies a
  joint-stiffness ratio (or `kb`/`km` directly)**; when omitted, only the
  preload and tensile-capacity checks run — a graceful reduced-scope path,
  not a hard requirement, because no source gives a single agreed
  stiffness-estimation formula (item 5).
- **No combined tension+shear bolt interaction** — tension (items 3-5) and
  shear (item 6) are two independent checks in `0.1.0`, not one combined
  equation (see "Purpose").
- **No catalog matching** — matches the same scope restriction `coupling`,
  `ball-screw`, and `linear-guide` already established.

## Existing Parameter Review

| Purpose | Parameter | Note |
| --- | --- | --- |
| Torque input (shaft, key) | `screw.drive_torque` | `ball-screw@0.1.0`'s own output (N*m, per case) — a candidate upstream link, not a hard dependency (see "Purpose"). |
| Shaft-diameter naming precedent | `coupling.driving_shaft_diameter` / `coupling.driven_shaft_diameter` | Coupling-specific *installation* inputs (an engineer-supplied actual diameter checked against a candidate's catalog bore range), not generically reusable — a new `shaft.*` diameter parameter is needed, not a reuse of these. |

**No `shaft.*`, `key.*`, `bolt.*`, or `fastener.*` parameter namespace
exists yet** (`grep` of `lib/engine/parameters/definitions.ts` confirms
zero matches as of this document). **A real gap, not an oversight:** this
project has no released "bending moment at an arbitrary shaft
cross-section" output — `motion.axis.resultant_moment`
(`axis-load-cases@0.1.0`) resolves a moment at the moving assembly's own
guide/carriage reference point, a different physical location from a
generic shaft cross-section a downstream mechanism (a pulley, sprocket, or
gear on its own separate shaft) would need. A Stage 2 registry proposal
would need at least:

- Shaft inputs: candidate diameter, material yield/ultimate strength,
  applied torque (per case), applied bending moment (per case), shock/duty
  factor (required, no default — see "Formulas" item 1's own semantic
  trap), hollow-shaft bore diameter (optional, defaults to solid).
- Key inputs: shaft diameter (reused from the shaft check when both run
  together), key width/height (from a dimension-table lookup or direct
  entry), key length, key material shear/bearing allowable stress.
- Bolt inputs: nominal diameter, thread pitch, property class or grade,
  installation torque, K-factor (required, no default), externally applied
  tensile load, externally applied shear load, joint-stiffness ratio
  (optional, no default).
- Outputs: shaft stress-margin check result (and/or minimum adequate
  diameter), key shear-margin and bearing-margin check results, bolt
  preload (reported), bolt tensile-capacity-margin check result, bolt
  joint-separation-margin check result (when stiffness supplied), bolt
  shear-margin check result.

## Checks (Proposed)

- Invalid input: non-positive diameter, length, torque magnitude, material
  strength, or K-factor; non-finite moment or load input.
- Shaft stress: combined-loading stress (item 1) against the
  allowable-stress limit derived from yield strength and the required
  safety factor — fail if exceeded.
- Key shear: `tau` (item 2) against the key material's own shear allowable
  — fail if exceeded.
- Key bearing: `sigma_bearing` (item 2) against the key material's own
  bearing/compressive allowable — fail if exceeded.
- Bolt tensile capacity: preload plus any externally applied tension share
  against `As * Sp` (proof stress) or the grade's proof-load table — fail
  if exceeded.
- Bolt joint separation (when stiffness supplied): external load against
  the separation load `P_separation` (item 5) — fail (or warn, below a
  margin) if the joint would separate.
- Bolt shear: `tau` (item 6) against the bolt material's own shear
  allowable — fail if exceeded.

## Trace Contract (Proposed)

Mirroring the established pattern
(`context/modules/coupling/stage-1-spec.md`):

1. `shaft-applied-loads-<case>` — resolved torque and bending moment,
   traced to their source (upstream link or direct entry)
2. `shaft-stress-check` — combined stress against the allowable limit
3. `key-dimensions` — resolved key width/height (table lookup or direct
   entry), cited against its own dimension-standard source
4. `key-shear-check` / `key-bearing-check`
5. `bolt-preload` — installation torque, K-factor, resulting preload
6. `bolt-tensile-capacity-check`
7. `bolt-separation-check` (only present when stiffness was supplied)
8. `bolt-shear-check`
9. `validity-and-assumptions` — which sub-checks ran, static-only scope,
   which shock/duty-factor convention was used

Each formula step cites its registered source revision and exact
page/section; it must not repeat the formula in UI/report code.

## Evidence Gaps and Verification Confidence

- **Directly read this session, high confidence:** the Air Force Stress
  Manual's own worked example (hand-checkable, not yet hand-verified — flag
  for Stage 3); Fastenal's, Triangle Fastener's, and Southwest Bolt's own
  full PDF tables; NBK America's Technical-29 property-class table; the
  Portland ME401 course-notes derivation (explicit Shigley citations
  throughout).
- **Directly read but tertiary/uncited, lower confidence:** RoyMech's four
  pages (shaft design, key strength, bolt preload, bolted joint, joint
  stiffness), Reuven's and SteelSolver's own calculator pages,
  instant.engineer's key-stress page, MechaniCalc's summary page — all
  corroborate each other and, where checkable, the higher-confidence
  sources above, but none is itself a standards body or the actual ASME/JIS
  standard text.
- **Not obtained this session, real gaps, not silently dropped:**
  - ANSI/ASME B106.1M-1985's own full text (four independent access
    attempts all failed — see "Candidate Sources", Shaft item 3).
  - ASME B17.1's own full text (only its scope statement was read from
    `asme.org` directly; licensed, not reproduced).
  - No JP-market source for the shaft-stress check specifically — a real,
    disclosed asymmetry against this project's own established
    US+JP dual-sourcing pattern (see "Candidate Sources", Shaft item 4).
  - `engineersedge.com` returned HTTP 403 on every attempt across all
    three research passes this session (shaft, key, and bolt) — a
    consistent, repeated block across independent sessions the same day,
    worth treating with the same "likely persistent, not a one-off"
    suspicion this project already records for `tech.thk.com` and
    (initially) `nbk1560.com` elsewhere in `lib/standards/
    engineering-sources.ts`; not yet confirmed across a second day.
  - `keyseaters.com`'s own ASME-B17.1-style dimension table — fetched but
    not registered, uncited secondary reproduction, needs re-verification
    against a cleaner source before Stage 2 relies on it for the US-side
    key-dimension table.
  - The simplified bolt tension+shear interaction form (`Rt^2+Rs^2<=1`)
    frequently cited in search results — never traced to a primary text
    actually read; not registered, not adopted.
  - The Sandia SAND2008-0371 K-factor range (0.092-0.332) — reached only
    via a secondary summary page, not the primary report itself (both
    direct mirrors failed); not registered as its own source, treated as
    an unconfirmed lead only.
  - A `machinedesign.com` lead suggesting a key-length-to-shaft-diameter
    ratio rule (~1.5-1.6x) — HTTP 403 on every attempt, never verified
    against real article text; a real lead to re-check, not a finding.

## Stage 2 Entry Criteria

Stage 2 must resolve, with real sources where a disputed convention is
involved (not invented here):

1. New `shaft.*`, `key.*`, `bolt.*` (or `fastener.*`) registry parameters —
   namespace and exact port list (see "Existing Parameter Review").
2. Which shock/duty-factor convention the shaft check adopts — the
   Air-Force/ASME-B106.1M service-table tradition (`Ks`/`Km`) or the
   Shigley/Reuven geometric stress-concentration-factor tradition
   (`Kf`/`Kfs`) — these are not interchangeable (see "Formulas" item 1's
   own semantic trap); `0.1.0` must not silently blend them under one
   input name.
3. Whether the key bearing-stress check exposes only the common `h/2` form
   or also a more exact effective-depth option (see "Formulas" item 2).
4. Whether joint separation ships in `0.1.0` as an engineer-supplied
   `kb`/`km` (or `C`) input, or is deferred to a later version given no
   source gives a single agreed stiffness-estimation formula (see
   "Formulas" item 5 and "Validity Envelope").
5. Whether torque/moment inputs are exclusively direct engineer entry in
   `0.1.0`, or whether a cross-module link to `screw.drive_torque` (and,
   later, other mechanism modules' own torque outputs) ships from the
   start — a real design question specific to this module being
   mechanism-agnostic, unlike every module released so far (see
   "Purpose").
6. Whether `0.1.0` releases without a JP-market source for the shaft-stress
   check specifically (key and bolt both already have real JP/ISO-aligned
   sources — Miki Pulley/instant.engineer for key, NBK America for bolt),
   or whether release is held until one is found — a founder-level
   evidence-bar decision, the same kind `axis-load-cases@0.1.0`'s own
   ID39/ID42-acceptance decision was (`context/progress-tracker.md`
   2026-08-11 entry).

## Status

Stage 1 (engineering specification) is done as a draft. Three parallel
research passes (shaft, key, bolted joint) were run this session; all
sources actually fetched and read are registered in `lib/standards/
engineering-sources.ts` (17 new source documents/revisions). Stage 2
(parameter contract) is next — see "Stage 2 Entry Criteria" above for the
six open questions it must resolve.
