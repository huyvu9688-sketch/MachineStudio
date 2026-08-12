# Progress Tracker

**What this file is:** current state, active work, blockers, and open
decisions. Nothing else. Keep it under ~150 lines.

**What this file is not:** a changelog. Frozen history for Milestones 0-3
and early Milestone 4 lives in `context/archive/history.md` — including the
rationale that ~45 source-file comments still cite as
`context/progress-tracker.md`. New code comments cite an ADR
(`context/adr/`) or a module spec, never this file.

Last updated: 2026-08-11 (Unit 4.1 released as `axis-load-cases@0.1.0`;
Unit 5.5 in progress -- deployment decision ADR-0009)

---

## Where the project is

| Milestone | Scope | State |
| --- | --- | --- |
| 0 | Evidence and repository foundation | Done |
| 1 | Generic engineering engine | Done |
| 2 | Persistence and application services | Done |
| 3 | Generic user experience (Units 3.1-3.9) | Done |
| 4 | Linear-axis engineering modules | **In progress** |
| 5 | BOM, reports, MVP release | **In progress** |

Roadmap phases map onto these milestones as follows (the roadmap uses phase
letters, the implementation map and this tracker use milestone numbers —
same work, two labels):

- Phase 0A / 0B / 0C → Milestones 0, 1, 2
- Phase 1A → Milestones 3 and 4
- Phase 1B / 1C → Milestone 4 (later units)
- Phase 1D → Milestone 5
- Phase 2+ → after MVP

Milestone 5 work started ahead of Milestone 4's own Unit 4.1 release gate
clearing, per explicit founder direction -- the same kind of scope
exception that authorized Units 4.8 and 4.9. **Unit 4.1's own release gate
cleared 2026-08-11** (`axis-load-cases@0.1.0` released and registered) --
the other eight Milestone 4 units remain in progress or unregistered. See
"Active work" below.

**Health:** lint 0 warnings, typecheck 0 errors, 1328 tests passed / 244
database-gated skips without a configured database; all 1572 pass with one
(`DATABASE_URL` set against the configured Neon database, confirmed
2026-08-12 during Unit 4.1's own final release verification — see
`context/archive/history.md` or the local dev setup notes for how), build
clean (`/workspace/bom` and `/workspace/report` -- this codebase's first two
Route Handlers, both still present; `/workspace/report` itself grew a third
query-param mode this unit, not a third route). `format:check` flags ~212
pre-existing files repo-wide on this machine (CRLF line endings from a
Windows checkout vs. Prettier's default `endOfLine: "lf"` — see Environment
notes), not the small fixed set an earlier session's own note named; every
file touched by this or a prior session is formatted and not among them.
`npm audit` clean (0 vulnerabilities across the full tree, prod and dev --
see Unit 5.5 below for the 2026-08-11 fix). Parameter registry at `1.8.0`
(unchanged -- Unit 5.3 needed no new parameters or registry version).

---

## Active work

Unit 4.1 — `axis-load-cases`, the first production module. **Released and
complete (2026-08-11).**

- Stage 1 (spec): **done**. Stage 2 (parameter contract): **resolved
  2026-08-07**, scoped to `normal`/`peak` only — `holding`/`emergency_stop`
  deferred (see Open decisions). No new registry version was needed for
  that scope; `1.1.0` already covered it (`1.4.0` later added the
  resultant-force/moment output ports — see Unit 4.4 below). Details:
  `context/modules/axis-load-cases/stage-2-contract.md`.
- Stage 3 (compute and trace): **released 2026-08-11.** The full
  `ModulePackage` (manifest, ports, input schema, compute, trace, checks, UI
  schema, report schema, validation record) in
  `lib/modules/axis-load-cases/0.1.0/` — see that directory's `README.md` —
  is now assembled in `index.ts` (renamed from the earlier draft
  `package.ts`), so `npm run registry:generate` discovers it: the module is
  registered as `axis-load-cases@0.1.0` in
  `lib/modules/registry.generated.ts`.
- Stage 4 (validation): **done 2026-08-11.** The "three published reference
  examples" item was already met: `thk-reference-examples.test.ts`
  reproduces THK's published B15-72 (horizontal), B15-86 (vertical), and
  B2-22 (vertical) worked examples to within ±1 N. The "independent
  numerical benchmark" item was already met: the Atlanta rack-and-pinion
  worked examples (`atlanta-benchmark.ts`) agree with `resolveAxisLoadPhase`
  to floating-point precision on the shared Newtonian/Coulomb-friction
  physics; Atlanta's licensing status remains unresolved (see Open
  decisions), so it stays registered `access: "licensed"`, metadata-only,
  never redistributed, quoted, or linked from a customer-facing trace or
  report. **The remaining item closed this release: the founder accepted
  ID39 (horizontal) and ID42 (vertical) as `0.1.0-release-candidate`
  historical regression evidence** — not release-grade vendor validation.
  Neither fixture's original document revision nor a confirmed as-built
  installation record exists, and neither contains a holding/brake case;
  both gaps are recorded, not cleared, in
  `validation/axis-load-cases/0.1.0.md`. Atlanta's independent benchmark
  serves as the solo-validation reviewer substitute (no second engineer was
  available). **The third long-stroke/high-speed fixture is explicitly
  decoupled from Unit 4.1's release** — it remains required/desirable
  evidence for the broader Unit 0.1 and Phase 1B linear-axis validation
  program, to be added only when a real project exists, never fabricated or
  replaced by a synthetic fixture (see Unit 0.1 and Open decisions below).
  No synthetic evidence was accepted anywhere in this release. `holding`
  and `emergency_stop` remain deferred to a future module version
  (unchanged from Stage 2's own resolution).
- Stage 5/6 (cross-module links, workflow integration, release): **done
  2026-08-11.** Cross-module link compatibility and guided-workflow
  integration tests pass
  (`lib/workflows/linear-axis/1.0.0/definition.test.ts`,
  `integration.test.ts`); `manifest.workflowRoles` resolves to the real
  `linear-axis@1` `linear-axis.axis` role (Unit 4.8). Module conformance
  (`import-boundary`, `source-immutability`) both pass as real checks, not
  skipped. `duty_cycle`/`ambient_temperature` were added as optional,
  trace-only context inputs as part of this release — proven by test to
  never change a `normal`/`peak` force or moment output; no registry-version
  change was needed since both parameters were already released. Full
  validation record: `validation/axis-load-cases/0.1.0.md`. Design record:
  `docs/superpowers/specs/2026-08-11-unit-4.1-release-design.md`.

Unit 4.2 — `motion-profile`. **Stages 1-4 done** (2026-08-07 through
2026-08-09), drafted in parallel with Unit 4.1's evidence wait per the
roadmap's parallel-work allowance. Stage 1 spec:
`context/modules/motion-profile/stage-1-spec.md` (ABB AN00115; Oriental
Motor's H-18/H-28 selection-calculations chapter). Stage 2 (registry
`1.2.0`) resolved 2026-08-07: `context/modules/motion-profile/
stage-2-contract.md` — owns a cycle-level RMS *acceleration* output only
(not velocity or torque); multi-segment outputs are cycle-level aggregates
only; a bounded max of 5 moves per cycle (a founder-made scope decision, not
evidence-backed). Stage 3: a full `ModulePackage` in `lib/modules/
motion-profile/0.1.0/` (see that directory's `README.md` "Stage 3 package").
Stage 4 (validation) resolved 2026-08-09: `validation/motion-profile/
0.1.0.md` — three published reference examples from two independent
manufacturers (ABB, Oriental Motor) across three independent scenarios (a
stale spec citation was corrected in the process — see the module README's
"Stage 4 evidence" section), plus the pre-existing Oriental Motor general-
method independent benchmark; solo-validation reviewer-substitute policy.
The cycle-level RMS acceleration output has no published example or
independent benchmark — a documented, honest gap. No module is registered
(`package.ts`, not `index.ts`); release no longer waits on Unit 4.1 (which
released as `axis-load-cases@0.1.0` 2026-08-11) — Stage 6 for this module
simply has not started. See "Next up" below.

Unit 4.3 — `ball-screw`. **Stages 1-5 done** (2026-08-08 through
2026-08-09; Stage 5 as far as applicable pre-Unit-4.8), drafted in parallel
with Unit 4.1's evidence wait. Stage 1 spec: `context/modules/ball-screw/
stage-1-spec.md` — lead/speed, drive torque, equivalent dynamic load,
nominal life, buckling, critical speed, static safety factor, sourced from
Rockford Ball Screw, WY Ball Screw, Steinmeyer, Oriental Motor, and THK
(via a third-party mirror — `tech.thk.com` itself is blocked in this
environment, see Environment notes). Stage 2 (registry `1.3.0`) resolved
2026-08-08: `context/modules/ball-screw/stage-2-contract.md` — the static
safety factor minimum and buckling safety margin are required module
inputs with no built-in default, since no source met this project's
evidence bar for either. Stage 3: a full `ModulePackage` in `lib/modules/
ball-screw/0.1.0/`. Stage 4 (validation) resolved 2026-08-09:
`validation/ball-screw/0.1.0.md` — six reference examples from two
independent manufacturers (Rockford, THK; two shared scenarios, not six
independent ones), three independent-benchmark comparisons
(`thk-benchmark.ts`), solo-validation reviewer-substitute policy. Two real
discrepancies remain open, not resolved: a three-way buckling/critical-
speed calibration-constant disagreement (Rockford/Steinmeyer/THK), and an
equivalent-dynamic-load methodology disagreement (this module's Steinmeyer-
based single formula vs. THK's own bidirectional-duty-cycle method, ~26%
apart on THK's own scenario — see `thk-benchmark.ts`'s
`resolveThkDirectionalEquivalentLoad`). Stage 5: cross-module link
compatibility against `axis-load-cases` is tested and passing
(`cross-module-links.test.ts`, the first per-module-pair link test in this
codebase); workflow role integration is done (2026-08-10) —
`manifest.workflowRoles` now declares `"linear-axis.screw"`, matching
`linear-axis@1`'s own role of that ID (Unit 4.8,
`lib/workflows/linear-axis/1.0.0/definition.ts`), asserted in this module's
own `cross-module-links.test.ts`. No module is registered; release no
longer waits on Unit 4.1 (which released as `axis-load-cases@0.1.0`
2026-08-11) — Stage 6 for this module simply has not started. See "Next
up" below.

Unit 4.4 — `linear-guide`. **Stages 1-3 done 2026-08-09**, drafted under the
same parallel-work allowance as Units 4.2-4.3. Stage 1 spec:
`context/modules/linear-guide/stage-1-spec.md` — two independent
manufacturer sources read directly (PMI's *Linear Guideway* catalog via a
`bearing.net.au` mirror, with a complete worked example; IKO's *Linear Way*
catalog from IKO's own domain, the first source in this project to cite ISO
14728-1/14728-2 directly). They agree on life-formula shape and the
distance-km basis, and disagree on equivalent-load complexity and
static-safety-factor standard values — both recorded, not resolved. Stage 2
(`stage-2-contract.md`) registers the `guide.*` parameters and reuses
`axis-load-cases`' resolved `resultant_force`/`resultant_moment` rather than
re-deriving mass/gravity/acceleration; the reformulation question it raised
(the kernel took a force-at-an-offset, `axis-load-cases` produces a
force-and-moment) closed the same day, and `resolveBlockLoadsFromResultant`
implements the general form with machine-checked equivalence to PMI's
printed B17 and B23 sets. Stage 3: a full `ModulePackage` in
`lib/modules/linear-guide/0.1.0/` — see that directory's `README.md`
"Stage 3 package".

Three things came out of Stage 3 that are not just wiring:

- **Stage 2's own last step had not actually been done.** The contract
  decided the `guide.*` parameters but nothing wrote them into the
  registry, so "Release the required parameter-registry version" was
  outstanding. Registry `1.5.0` releases them (13 parameters, plus a `km`
  unit for the life display). Doing it also surfaced that `1.4.0` was never
  added to `PARAMETER_REGISTRY_SUPPORTED_VERSIONS` — it validated only
  because the builder implicitly supports its own current version, so the
  bump to `1.5.0` would have stranded `axis-load-cases`' manifest. Both
  fixed, with a regression test.
- **A decision Stage 2 did not reach: the `axis.v1` → guide-frame mapping**
  (`frame.ts`), five sign/axis choices between the resolved force/moment
  and the kernel's guide terms, checked end to end against PMI's printed
  B17. One part is an assumption no input can validate (a vertical
  installation needs the engineer's free `+Y` choice to be the in-plane
  transverse direction), so it is reported on every calculation.
- **Orientation selects no formula**, contradicting the Stage 2 contract's
  own table. Gravity is already resolved upstream, so the distribution is
  identical for both installations; the input stays for scope-checking
  `inclined` and for the report. Asserted in a test; the contract is
  corrected.

**Stage 4 (reference examples) done same day — and it found two real bugs.**
PMI's Chapter 9 worked example is reproduced end to end
(`lib/modules/linear-guide/0.1.0/pmi-chapter-9.ts`,
`validation/linear-guide/0.1.0.md`): 64 printed figures — per-carriage
radial and lateral loads across five motion phases, equivalent loads,
governing static safety factor, mean loads, nominal lives — each to within
the ±0.1 N the source prints.

- **The kernel had the yaw lever arm and the lateral sign pattern wrong.**
  Root cause: the Stage 1 spec read PMI's `l1` as the rail spacing and `l2`
  as the carriage spacing; they are reversed. So the recorded suspicion that
  "PMI reacts a yawing moment across the rails, which is physically
  impossible" was right about the physics and wrong about PMI — the source
  was correct and this project misread its letters. Both fixed; the lever
  arm changes results whenever the two spacings differ.
- **PMI's section 9.1.3 contains a printing error** (two lateral values
  transposed against their own formulas). The module follows the formulas;
  no PMI result depends on it.
- The carriage-numbering map Stage 1 declined to guess is now pinned from
  printed sign patterns.

**Stage 4's independent-benchmark item is now met (resolved 2026-08-09).**
`lib/modules/linear-guide/0.1.0/iko-benchmark.ts` implements IKO's own
dynamic/static equivalent-load method as a genuine second computation,
reproducing IKO's own worked "Example 1" (a two-rail/four-block scenario,
this module's own scope) end to end — `P1`-`P4`, `P01`-`P04`,
`fs = 6.3`, and the ~4410 km / ~73,500 h rating life, all from IKO's own
conversion-factor tables. This also corrected a misreading in the Stage 1
spec: `X`/`Y` is a universal two-row class table, not per-series as first
described — only `kr`/`ka` (and their static counterparts `kOr`/`kOa`) are
series/size-specific, and the catalog prints those directly. The
methodology question Stage 1 left open is answered for a symmetric-factor
series (`kr = ka = 1`): IKO's figure is algebraically always PMI's figure
minus `0.4 * min(|Fr|, |Fa|)`, a real 5-20% disagreement, neither form
"corrected" toward the other. See `validation/linear-guide/0.1.0.md`
"Independent Method or Tool Comparison". With this closed, the
solo-validation reviewer-substitute policy is now invokable — this module's
own Stage 4 gate is clear; release no longer waits on Unit 4.1 (which
released as `axis-load-cases@0.1.0` 2026-08-11) — Stage 6 for this module
simply has not started. See "Next up" below.

Unit 4.5 — `coupling`. **Stages 1-3 done 2026-08-09**, next in the
roadmap's Phase 1B order now that `linear-guide` is done through Stage 4.
Stage 1 spec: `context/modules/coupling/stage-1-spec.md` — two independent
manufacturer methods (KTR, R+W America, both read via their US-market
sites — a documented asymmetry, since this project's other modules each
paired a US and a JP methodology source and no JP methodology source was
found this session) agree on a required-torque-times-correction-factors
shape and disagree on the exact factor tables; a third source (NBK, JP)
supplies catalog data (torsional stiffness, inertia, misalignment limits,
speed limit) but no methodology, since `nbk1560.com`'s own selection-guide
pages returned HTTP 403 all session. Stage 2
(`context/modules/coupling/stage-2-contract.md`, registry `1.6.0`)
resolves all six open design questions: this module derives its own
per-case rotational speed from `motion.axis.case_linear_velocity` +
`screw.lead` + `screw.gear_ratio` rather than using `screw.
mean_rotational_speed`'s duty-cycle mean; KTR's shock-torque form is
adopted over R+W's (R+W's own is scoped to safety/torque-limiting
couplings specifically); and the disagreeing correction-factor tables
collapse into one required `coupling.service_factor` input, the same
"required input, neither table adopted" treatment
`guide.static_safety_factor_minimum` received. Adds a new unit dimension
(`N*m/rad`, torsional stiffness) to the unit registry. Stage 3: a full
`ModulePackage` in `lib/modules/coupling/0.1.0/` — see that directory's
`README.md`. KTR's and R+W's own worked examples are reproduced at the
kernel formula level in `math.test.ts` (Stage 3's own workflow step
includes reference tests).

**Stage 4 (validation), both evidence items now met (2026-08-09 through
2026-08-10):** `rw-reference-examples.ts`/`.test.ts` run both of R+W's own
worked examples through this module's actual compute path (`executeModule`)
rather than just the kernel formulas — R+W's own printed `T_AN` as
`screw.drive_torque`, their combined factor as `coupling.service_factor`,
their selected coupling's own catalog rated torque as
`coupling.rated_torque` — and confirm both selections (`ST2/10`, `ST4/10`)
clear their own printed requirement through the real compute path. KTR's own
example stays kernel-level-only (KTR's text gives no selected-coupling rated
torque to run through the real path).

**The independent-benchmark item closed 2026-08-10.** A second, distinct KTR
document — "Coupling Selection According to DIN 740 Part II," found via
WebSearch while looking for a published shock-torque worked example (none of
the three reference examples above exercises the shock-torque check with
real numbers) — gives a genuinely different, more detailed shock-torque
derivation (`T_Kmax >= T_S*S_Z*S_t + T_N*S_t`, `T_S = T_AS*M_A*S_A`, `M_A` a
mass-distribution coefficient) than the one `stage-1-spec.md` item 2 recorded
from KTR's other document (`(T_N+T_S)*S_Z*S_t*S_R`) — a real, recorded
disagreement between two documents from the same manufacturer, not resolved.
`lib/modules/coupling/0.1.0/ktr-din740-benchmark.ts` reproduces this
document's own full worked shock-torque example (160 kW/1485 rpm motor,
screw compressor, ROTEX Size 90 coupling) end to end, then quantifies how
this module's own simplified shock check relates to it: algebraically
identical when `coupling.service_factor` is the fully composed
`M_A*S_A*S_Z*S_t`; understating the true requirement by ~1.2% when
`serviceFactor` is the catalog shock factor `S_A` alone; overstating it by
~43% (a false fail on a coupling the detailed method accepts) when
`S_A*S_Z*S_t` is used without `M_A` — a real, sourced, quantified deviation
whose practical risk sits with the engineer's own `service_factor` choice,
since this project has no released motor/load-inertia parameter to compute
`M_A` internally (`stage-1-spec.md` item 3, Unit 4.7 territory).
`validation/coupling/0.1.0.md` records the full Stage 4 evidence and invokes
the solo-validation reviewer-substitute policy; `reviewer`/`reviewDate` in
`validation.ts` itself stay `TODO` pending Stage 6, the same treatment
`ball-screw`'s and `linear-guide`'s own `validation.ts` give that pair. This
module's own Stage 4 gate is now clear; release no longer waits on Unit 4.1
(which released as `axis-load-cases@0.1.0` 2026-08-11) — Stage 6 for this
module simply has not started.

**Stage 5's cross-module link compatibility item done 2026-08-10.**
`lib/modules/coupling/0.1.0/cross-module-links.test.ts` (6 tests, the same
real-evaluator pattern `ball-screw`'s and `linear-guide`'s own files use)
confirms `ball-screw`'s per-case `screw.drive_torque` output links to
coupling's own per-case drive-torque input — the only upstream link
coupling has today — and confirms three things stay refused: a load-case
mismatch, `ball-screw`'s `mean_rotational_speed` output feeding the
linear-velocity sink (Stage 2 explicitly rejected that duty-cycle mean as
coupling's speed source), and any `coupling.*` catalog input from either
`ball-screw` or `axis-load-cases`. `motion.axis.case_linear_velocity` — the
port coupling actually derives speed from — still has no producing module
anywhere in the registry; confirmed here rather than assumed, the same
documented gap `ball-screw`'s own cross-module-links.test.ts already
records against its own consuming port. Generic UI/report schema already
pass conformance (`package.test.ts`'s `package-validation` check). What
remains for this module: workflow role integration is done (2026-08-10) —
`manifest.workflowRoles` now declares `"linear-axis.coupling"`
(`linear-axis@1`'s own role of that ID has cardinality 0-1, an open
product decision — see "Open decisions" below), asserted in this module's
own `cross-module-links.test.ts` — and Stage 6 (release), which no longer
waits on Unit 4.1 (released as `axis-load-cases@0.1.0` 2026-08-11) and
simply has not started. See "Next up" below.

Unit 4.6 — `support-bearing`. **Stages 1-3 done 2026-08-09 through
2026-08-10**, next in the roadmap's Phase 1B order now that `coupling`'s
own Stage 4 evidence is as complete as it can get without new sources.
Stage 1 spec:
`context/modules/support-bearing/stage-1-spec.md` — two JP-market sources
(a real asymmetry, recorded rather than glossed over): THK's own Ball
Screw General Catalog "Support Unit" chapter (already a registered source,
re-read for its own support-bearing pages, `technico.com` mirror since
`tech.thk.com` is still blocked) gives per-model catalog/data-sheet values
and structure (fixed side = angular contact bearing, factory-adjusted
preload; supported side = deep-groove bearing, floating) but no life or
safety-factor formula of its own; NTN's own Rolling Bearings Handbook
(new source, `jp.ntn.rolling_bearings_handbook`) supplies the general
ISO-281-based methodology THK's catalog lacks — basic rating life,
dynamic/static equivalent load, preload, allowable speed, shaft/housing
interface — mapping almost one-to-one onto the roadmap's own required
checks for this unit. **Two real evidence gaps, recorded 2026-08-09 and
both closed 2026-08-10** (see "Stage 4" below): no full published worked
numerical example was found that session (NTN's own handbook lists one in
its table of contents at printed page 84, but both copies fetched that
session are identically truncated right before it — a genuine, documented
gap, not a skipped step), and no independent-benchmark candidate existed
yet (NSK's own short bulletins corroborated NTN's formula shape exactly,
which is agreement, not a second implementation). Stage 2
(`context/modules/support-bearing/stage-2-contract.md`, registry `1.7.0`)
resolves all six open questions: `0.1.0` models one support bearing per
calculation run via a new `bearing.location` (`fixed`/`supported`) enum,
not a combined fixed+floating calculation; axial load reuses
`motion.axis.thrust_force` directly (satisfying the roadmap's own gate,
"integrates with the ball-screw module without a custom link mapping");
radial load has no clean upstream source and becomes a new required
engineer-supplied input, `bearing.actual_radial_load`; the new parameter
group uses a `bearing.*` prefix (matching `screw.*`/`guide.*`'s own
"short domain noun, not the full module ID" precedent); the dynamic/
static equivalent-load factors (`X`/`Y`/`X0`/`Y0`) are engineer-supplied
catalog lookups, not a reproduced table (no source gives a universal
one); the static-safety-factor minimum is required with no built-in
default, extending every other module's own precedent even though only
one source's own numbers exist to record, not two disagreeing ones; and
the two evidence gaps do not block Stage 2/3 — only this module's own
Stage 4 validation record. Bore/outside diameter and preload are
released as reported-only catalog values, not evaluated checks — a real
scope narrowing from Stage 1's own initial "simple bound check" proposal,
since a support bearing's bore is manufactured to one matched shaft
diameter, not a clamping range the way `coupling`'s own bore compatibility
is.

Stage 3: a full `ModulePackage` in `lib/modules/support-bearing/0.1.0/` —
see that directory's `README.md`. The axial-load-related ports
(`*_thrust_force`, `dynamic_load_factor_y`, `static_load_factor_y`) are
optional at the manifest level and required together only when
`bearing.location` is `"fixed"`, enforced by a new `input-schema.ts`
`superRefine` rule — the same "generic port shape can't express this, so
an author-provided schema rule does" pattern `coupling 0.1.0`'s own
bore-range check already established. `math.test.ts` (18 tests) and
`package.test.ts` (21 tests) both pass.

**Stage 4 (both evidence gaps) closed 2026-08-10.** Retrying the NTN
handbook against a third, independent Group edition (`ntn-snr.com`) found
it truncated at the identical point (blank page 83, no page 84) as the two
editions read 2026-08-09 — three independent editions now agree, evidence
this is a persistent omission from the handbook's own printing, not a
one-off fetch failure. The retry redirected the search to a different
manufacturer: NSK Ltd.'s own "Rolling Bearings" catalog (CAT. No. E1102a)
has the worked-examples section NTN's is missing (Section 5.7, printed
pages A34-A36). Examples 1 and 3 (single-row deep-groove ball bearing 6208,
pure radial load then the same bearing with an added axial load) map
exactly onto this module's own `bearing.location` split (`supported` /
`fixed`). `lib/modules/support-bearing/0.1.0/nsk-reference-examples.ts`/
`.test.ts` run both through `executeModule` — the sealed-package compute
path — and confirm the computed dynamic equivalent load matches NSK's own
exact printed figures and the computed basic rating life matches NSK's own
stated approximate service life within a documented 2% chart-reading
tolerance. `nsk-fh-benchmark.ts`/`.test.ts` close the independent-benchmark
gap: NSK's own distinct `fn`/`fh` fatigue-life-factor packaging is
reproduced as a genuinely separate computation, then proved algebraically
identical to this module's own `resolveNominalLife`/`resolveLifeHours` and
asserted to agree to floating-point precision — the same "proved identity"
treatment `linear-guide`'s own PMI/IKO benchmark received.
`validation.ts` records the full Stage 4 evidence and invokes the
solo-validation reviewer-substitute policy; `reviewer`/`reviewDate` stay
`TODO` pending Stage 6, the same treatment every other Milestone 4
module's own `validation.ts` gives that pair. This module's own Stage 4
gate is now clear; release no longer waits on Unit 4.1 (which released as
`axis-load-cases@0.1.0` 2026-08-11) — Stage 6 for this module simply has
not started.

**Stage 5's cross-module link compatibility item done 2026-08-10.**
`lib/modules/support-bearing/0.1.0/cross-module-links.test.ts` (6 tests,
the same real-evaluator pattern every other module's own file uses)
confirms `axis-load-cases`' per-case `motion.axis.thrust_force` output
links to this module's own per-case thrust-force input — direct evidence
for the roadmap's own Unit 4.6 gate wording ("integrates with the
ball-screw module without a custom link mapping"): `ball-screw` itself
produces no output this module can consume (only `screw.*` results), so
the real upstream producer is `axis-load-cases`, the same source
`ball-screw`'s own thrust force already comes from — asserted directly
rather than assumed. Also confirms three things stay refused: a load-case
mismatch, `motion.axis.case_linear_velocity` (this module's own speed
input) having no producer anywhere — the same documented gap `ball-screw`'s
and `coupling`'s own files already record — and any `bearing.*` catalog
input accepting an upstream output. Generic UI/report schema already pass
conformance. What remains for this module: workflow role integration is
done (2026-08-10) — `manifest.workflowRoles` now declares
`"linear-axis.bearing"` (`linear-axis@1`'s own role of that ID has
cardinality 1-2, since a fixed+supported arrangement needs two instances
of this module), asserted in this module's own
`cross-module-links.test.ts` — and Stage 6 (release), which no longer
waits on Unit 4.1 (released as `axis-load-cases@0.1.0` 2026-08-11) and
simply has not started. See "Next up" below.

Unit 4.7 — `drive-train` (servo motor, gearbox, drive/amplifier, holding
brake, regenerative resistor). **Stage 1 drafted 2026-08-10**, next in the
roadmap's own order now that every Phase 1B module (`ball-screw`,
`linear-guide`, `coupling`, `support-bearing`) is done through Stage 5 —
this begins Phase 1C, under the same parallel-specification allowance
already used for Units 4.2-4.6. Stage 1 spec:
`context/modules/drive-train/stage-1-spec.md` — five sources read (Omron's
own *Technical Guide for Servo Motor Selection*, already cached in
`reference/source-material/Servo Selection.pdf`, with a full worked
numerical example hand-verified this session; HMK's and Voss's own servo-
sizing guides, read in full; Oriental Motor's and Celera Motion's own pages,
read via `WebFetch` summarization only — lower confidence, flagged). Four
sources agree on the RMS-torque formula shape; five sources give five
different numeric conventions for the maximum load/rotor inertia ratio (2:1
to 100:1 depending on control technology and positioning objective) —
sharper than any prior module's own factor disagreement, a strong candidate
for a required-input-no-default treatment at Stage 2. Two real cross-cutting
findings, neither invented, both recorded rather than worked around:
`ball-screw 0.1.0`'s own released kernel (`lib/modules/ball-screw/0.1.0/
math.ts` `resolveDriveTorque`) applies no efficiency loss to its own gear-
ratio reduction, so `screw.drive_torque` implicitly assumes a 100%-efficient
gearbox whenever `screw.gear_ratio != 1` — not a defect in `ball-screw`'s
own Stage 1/2 scope, but a real gap this module inherits; and drive/
amplifier current sizing (a required check per
`context/implementation-map.md` Unit 4.7) is blocked entirely on a missing
unit-registry base dimension (`lib/engine/units/dimension.ts` has no
electrical-current dimension) — a generic-engine prerequisite, not a
Stage 2 module decision, the same category of gap
`lib/engine/parameters/README.md`'s own v1.2 note already recorded for
table-valued parameters. A third finding is this document's own derivation,
not sourced: whether `motion.profile.rms_acceleration` (registered
specifically for this module's own future use) is actually sufficient to
compute RMS torque without a missing signed-mean-acceleration port —
argued yes, for any complete repeating duty cycle, but not yet verified
against a kernel. Blocked (Kollmorgen's and Yaskawa's own sizing guides,
both HTTP 403 this session) and open items are in the spec's own "Evidence
Gaps" section.

**Stage 2 (parameter contract) resolved same day.**
`context/modules/drive-train/stage-2-contract.md` -- registry `1.8.0`
releases the full `drive.*` group (motor/gearbox/drive/brake catalog
inputs, three required-no-default margin/limit inputs, and per-case
computed torque/speed/regenerative-energy outputs). All six Stage 1 entry
criteria resolved: reuses `screw.gear_ratio` directly rather than adding a
duplicate; keeps the RMS-torque and peak-torque margins as two separate
required inputs rather than consolidating them (no source ties the two
together); adopts the closed-cycle RMS-acceleration argument as `0.1.0`'s
working assumption, recorded on every trace, with a Stage 4 action item to
verify it against a real kernel; resolves the gearbox-efficiency gap by
having `drive-train` apply its own derating on top of `screw.drive_torque`
via a new `drive.gearbox_efficiency` input, rather than editing
`ball-screw`'s own released kernel; and keeps regenerative energy in scope
for `0.1.0`, with its "100% efficient" simplifying assumption recorded
explicitly rather than silently applied. Also fixed the same class of bug
`linear-guide` found at `1.4.0`/`1.5.0`: `1.7.0` (the version
`support-bearing 0.1.0`'s own manifest pins) was only ever served
implicitly as "the current version" and had to be added to
`PARAMETER_REGISTRY_SUPPORTED_VERSIONS` explicitly before `1.8.0` could
become current, or `support-bearing`'s manifest would have been stranded --
caught and fixed before it happened this time, with the existing regression
test extended to cover it. Adds `J` (joule) to the unit registry as a new
unit on the *existing* torque dimension (not a new dimension -- this
registry's torque dimension carries no angle exponent, so energy and
torque share identical SI base-unit exponents), a deliberate reuse recorded
in the contract's own "Released Additive Contract". Wiring the kernel then
found two real mistakes in that same contract -- `drive.reflected_load_
inertia` had no upstream source and had to become a required
engineer-supplied input rather than a computed output, and `drive.
acceleration_torque` does not actually vary by load case in this project's
data model -- both fixed directly in the registry the same day
(`stage-2-contract.md` "Stage 3 corrections") so the pinned registry-hash
fixture and regression test both reflect it.

**Stage 3 (compute and trace) built same day.** A full `ModulePackage` in
`lib/modules/drive-train/0.1.0/` (manifest, ports, input schema, math
kernel, trace, checks, generic UI/report schema, draft validation -- see
that directory's `README.md`). `math.test.ts` (29 tests) and
`package.test.ts` pass, plus a real reference-example test
(`omron-reference-example.ts`/`.test.ts`) reproducing Omron Corporation's
own complete worked numerical example (R88M-U20030 on a direct-connected
ball-screw axis) through the actual compute path: acceleration torque and
maximum momentary torque match Omron's own printed figures within
0.001 N*m, and effective (RMS) torque matches within 0.0003 N*m (~0.25%)
using an RMS-acceleration value derived from Omron's own printed
duty-cycle segments -- the first real numeric confirmation that Stage 2's
own closed-cycle RMS-acceleration derivation actually holds, not just a
plausible argument. Every applicable check passes; the regenerative-energy
check reports `not_applicable`, matching Omron's own explicit note that its
example omits that calculation. No module is registered (`package.ts`, not
`index.ts`).

**Stage 4 is now complete (closed 2026-08-10).** Independent benchmark:
`closed-cycle-benchmark.ts`/`.test.ts` cross-check `resolveEffectiveTorque`'s
closed-form Trms against a structurally different direct per-phase RMS-torque
computation across four repeating-cycle shapes and four `(J_total, T_load)`
pairs (exact match, an algebraic identity), plus a counter-example proving
the repeating-cycle precondition is load-bearing, not vacuous.

**Second/third reference examples: six sources investigated and ruled out
first, then a seventh closed it.** Re-read Voss's book beyond the RMS-torque
section (Section 3.4 "Motor Selection" through 3.4.2.3) and found it never
selects or checks against a real catalog motor. Re-read HMK's own 23-page
PDF in full and found no holding-brake section and no worked numerical
example anywhere in it -- correcting a real misattribution in
`context/modules/drive-train/stage-1-spec.md` item 2. Oriental Motor's own
blog post stops in the same place Voss's does. Kollmorgen's and Yaskawa's
own guides remain blocked (HTTP 403). A sixth source, Oriental Motor's own
official *Technical Reference*, has real catalog-tied worked examples but
every one sizes an AC induction or stepper motor, not a servo (a real
convention mismatch, not missing data -- see `stage-1-spec.md` "Evidence
Gaps and Verification Confidence"). **The seventh source was already on
file for a different reason:** `jp.thk.example_ball_screw_selection` -- the
same THK Ball Screw General Catalog document `axis-load-cases`'s and
`ball-screw`'s own Stage 4 fixtures already cite for its mechanical
(screw/life) sections -- has its own "Studying the Driving Motor"
subsection following each of its two worked examples, unread until now
because those two modules' own scope never needed it. Both examples name
"AC servo motor" explicitly and decompose required torque into the
identical two-term shape this module's own kernel uses.
`lib/modules/drive-train/0.1.0/thk-reference-examples.ts`/`.test.ts`
reproduce both through `executeModule`: the horizontal example fully
(momentary torque within ~0.3%, effective/RMS torque within ~0.06%,
inertia-ratio rule exact); the vertical example partially (momentary
torque and inertia-ratio rule reproduced, but its effective/RMS torque
deliberately NOT -- its asymmetric per-direction load torque and nonzero
holding torque during the stationary phase genuinely violate this module's
own closed-cycle assumption, overstating the true value by ~21%, a real
quantified deviation recorded in `validation.ts` "deviations," not a
rounding residual -- the first real counter-case found for that
assumption's own stated precondition, see `stage-1-spec.md` "The
RMS-Acceleration Dependency Question"). Read via a technico.com mirror
(`tech.thk.com` returns HTTP 403) after `WebFetch` failed to extract
readable text from the same mirror directly; the cached binary was read
locally with `pdftotext -layout`. New source revision:
`jp.thk.example_ball_screw_selection@technico-mirror-2026-08-10`
(`lib/standards/engineering-sources.ts`). The solo-validation
reviewer-substitute policy is now invoked; `reviewer`/`reviewDate` stay
`TODO` pending Stage 6, the same treatment every other Milestone 4 module's
own `validation.ts` gives that pair.

**Stage 5's cross-module link compatibility item done 2026-08-10.**
`lib/modules/drive-train/0.1.0/cross-module-links.test.ts` (11 tests, the
same real-evaluator pattern every other Milestone 4 module's own file uses)
confirms `ball-screw`'s per-case `screw.drive_torque` output links to this
module's own per-case drive-torque input (the same link `coupling`'s own
file already consumes), and confirms `motion-profile`'s own
`peak_acceleration`/`peak_deceleration`/`rms_acceleration` outputs link
directly to this module's own identically-named, identically-unscoped
inputs -- the first real downstream consumer of any `motion.profile.*`
output in this codebase, reversing the documented gap `ball-screw`'s own
`cross-module-links.test.ts` records (true for `ball-screw` specifically,
not for `drive-train`; see this module's own `README.md` "Stage 5" for the
full account). `axis-load-cases` has no output this module consumes;
`motion.axis.case_linear_velocity` still has no producer anywhere in the
registry, the same documented gap `ball-screw`'s, `coupling`'s, and
`support-bearing`'s own files already record. Generic UI/report schema
conformance was already passing (`package.test.ts`'s `package-validation`
check). What remains for this module: workflow role integration is done
(2026-08-10) — `manifest.workflowRoles` now declares `"linear-axis.drive"`,
matching `linear-axis@1`'s own role of that ID, asserted in this module's
own `cross-module-links.test.ts` — and Stage 6 (release), which no longer
waits on Unit 4.1 (released as `axis-load-cases@0.1.0` 2026-08-11) and
simply has not started. See "Next up" below.

Unit 4.8 — `linear-axis@1` workflow definition. **Built 2026-08-10**, next
in the roadmap's own order now that every Milestone 4 module
(`axis-load-cases` through `drive-train`) is drafted through Stage 5 —
started per explicit user direction to move off Unit 4.1's evidence-only
blocker onto genuinely buildable work, rather than re-attempting an
evidence search two prior sessions already exhausted. `lib/workflows/`
did not exist before this session; `lib/workflows/workflow-sdk/` is the
new, reusable `WorkflowDefinition` contract (roles, link-proposal rules,
completion rules, workflow-level checks, candidate comparison, status) —
see `context/adr/0007-workflow-definition-contract.md` for the full design
reasoning. `lib/workflows/linear-axis/1.0.0/definition.ts` is the concrete
`linear-axis@1` definition: seven roles (one per Milestone 4 module,
`support-bearing`'s allowing 1-2 instances for a fixed+supported
arrangement, `coupling`'s allowing 0-1 pending the open cardinality
decision below), nine link-proposal rules covering every confirmed
output-to-input parameter match among the seven modules, three
`shared_value_topology` checks guarding the parameters with no producing
module at all (`motion.axis.orientation`, `screw.lead`,
`screw.gear_ratio`), a `conditional_acknowledgment` completion rule for the
vertical-holding design response (`context/implementation-map.md` Unit 4.8
"Cross-Module Checks" — no parameter anywhere represents a required
holding torque to check numerically, so this reuses the existing
`Assumption` shape instead), and four candidate-comparison criteria ranked
lexicographically, not by weighted score. Of the implementation map's five
example cross-module checks, two are genuine documented gaps (motion speed
vs. screw critical/manufacturer speed; bore/shaft interface compatibility
between `coupling` and `support-bearing`) rather than invented numeric
checks with no sourced basis — see the workflow's own
`lib/workflows/linear-axis/1.0.0/README.md` for the full five-item
disposition table. All seven modules' `manifest.workflowRoles` are now
populated (previously empty on every one), closing the "workflow role
integration" Stage-5 item every module's own entry above used to list as
blocked on this unit; each module's own test file asserts its role matches
a real `linear-axis@1` role. `lib/workflows` itself stays as pure and
DB-free as `lib/modules`, matching every other Milestone 4 module's own
pre-application-layer state. **Unit 4.1 released as `axis-load-cases@0.1.0`
2026-08-11**, so one of the seven roles (`linear-axis.axis`) now has a real
registered module (`lib/modules/registry.generated.ts`); the other six are
still unregistered (`package.ts`, not `index.ts`, on every one) pending
their own Stage 6, not because of Unit 4.1 any longer.

Unit 4.9 — `WorkflowInstance` application-layer wiring. **Built
2026-08-10**, an explicit scope exception ahead of Unit 4.1's release gate
(per founder direction) — the same kind of call that authorized Unit 4.8.
`lib/db/repositories/workflow-repository.ts` is new, split out of
`project-repository.ts` the way `run-repository.ts` already is:
`createWorkflowInstance` (now composable inside a transaction via a
`client` param it previously lacked, and was previously dead code above
`lib/db`), `loadWorkflowInstanceForOwner`, `listModuleInstancesForWorkflowInstance`,
`updateWorkflowInstanceStatus`. `addModuleInstance`
(`lib/application/projects/`) gained an optional `workflowInstanceId` --
how a module instance actually attaches to a workflow instance, reusing the
existing use case rather than duplicating it. Two new application services
in `lib/application/workflows/`: `startWorkflowInstance` (creates a
`WorkflowInstance` row from a workflow definition actually registered in
`lib/workflows`, mirroring `addModuleInstance`'s own registration rigor)
and `loadWorkflowInstanceView` -- the real payoff: assembles a workflow
instance's full state (present role instances mapped from real
`ModuleInstance` rows, resolved link proposals, confirmed links,
`evaluateCompletion`, `evaluateWorkflowStatus`, and `evaluateWorkflowChecks`
over a freshly built workflow-scoped graph) from real persisted data -- the
first thing to actually call `lib/workflows/workflow-sdk`'s pure functions
against a database. It also keeps the persisted `WorkflowInstance.status`
column in sync with the live-derived value (never overwriting an explicit
`"abandoned"`), since `machine-navigator.tsx` already renders that column
read-only.

Since none of `linear-axis@1`'s own seven modules are registered yet, this
unit's DB-integration tests use a new second workflow-registry entry,
`lib/workflows/example-workflow/1.0.0/` (`example-workflow@1.0.0`), pairing
the two already-registered example modules (`example-scaffold`,
`example-relay`) into a two-role workflow -- the same reason those two
modules exist themselves: proving a generic contract works against a real
database before a production consumer needs it. A separate test proves the
real `linear-axis@1` definition itself resolves and evaluates correctly
with zero attached instances (registration-independent), and another
proves a registered-but-role-mismatched module instance is excluded and
reported, not silently dropped. Attaching or running six of
`linear-axis@1`'s own seven real modules through this wiring is still
blocked on each module's own registration (Unit 4.1's own gate cleared
2026-08-11 -- `axis-load-cases@0.1.0` can now fill the `linear-axis.axis`
role -- but `motion-profile`, `ball-screw`, `linear-guide`, `coupling`,
`support-bearing`, and `drive-train` have not reached their own Stage 6
yet) -- this unit only proves the generic capability itself. Confirming a
proposed workflow link needs no new code -- a `WorkflowLinkProposal` maps
directly onto the existing `confirmParameterLink` use case's
`CreateParameterLinkInput` shape, exercised directly in this unit's own
tests.

**The generic UI surface is now built (2026-08-11).** `?workflow=<id>` is a
new deep-link param on the single `/workspace` route
(`app/(workspace)/workspace/page.tsx`), the same param-driven-branch
convention every other Unit 3.x panel already uses (`?module=`,
`?panel=requirements|baselines`) -- no new route segment. It calls
`loadWorkflowInstanceView` directly from the Server Component, the same
"read services return their own `{ok,error}` union, page unwraps it and
falls back to null on either failure code" treatment other nullable deep
links in that file already get. `WorkflowInstanceView` itself gained two
read-only fields for this (`roles`: the resolved definition's full role
catalog including unfilled roles, since `roleInstances` alone can't show
"which roles still need a module"; `instanceLabels`: each present role
instance's `ModuleInstance.label`, since `WorkflowInstanceContext` is a pure
workflow-sdk shape with no label of its own) -- both covered in
`load-workflow-instance-view.test.ts`.

Two new Server Actions in `app/(workspace)/workspace/actions.ts`:
`startWorkflowInstanceAction` (parses a `workflowKey` `<select>` the same
"id@version, split on the first @" way `addModuleInstanceAction` already
parses `modulePackageKey`, calls `startWorkflowInstance`, redirects into the
new instance's own `?workflow=<id>` deep link on success -- the same
redirect-to-the-thing-just-created pattern `createProjectAction` already
uses) and `addModuleInstanceAction` extended with an optional
`workflowInstanceId` field (blank-means-omit, `addModuleInstance`'s own
input already supported this since Unit 4.9's first pass -- only the UI
wiring was missing). Confirming a proposed link needed no new action at all,
as already noted above: `components/engineering/workflow-instance-workspace.tsx`
reuses `confirmSuggestedLinkAction` unchanged, mapping each
`WorkflowLinkProposal` onto its existing hidden-field contract.

Two new components: `WorkflowInstanceWorkspace`
(`components/engineering/workflow-instance-workspace.tsx`) -- roles with
cardinality and filled-instance links, link proposals with inline Confirm,
completion-rule results, workflow-level checks (reusing `StatusBadge`), and
excluded module instances, all rendered from `loadWorkflowInstanceView`'s
already-shaped read model with no compute logic imported, mirroring
`ModuleResultPanel`'s own "render the trace, don't recompute it" discipline
one level up -- and `StartWorkflowInstanceDialog`
(`components/engineering/start-workflow-instance-dialog.tsx`), picking from
`listWorkflowDefinitions()`'s real registered list, mirroring
`AddModuleInstanceDialog`'s own registered-list-only discipline. Since
`startWorkflowInstance` only requires the *workflow definition* to be
registered, not any of its own modules' packages, `linear-axis@1` itself is
already startable from this dialog today. At the time this unit was built,
none of its seven modules could yet fill a role; Unit 4.1's release
2026-08-11 changed that for one role (`linear-axis.axis`,
`axis-load-cases@0.1.0`) -- the other six still cannot, pending their own
Stage 6, not Unit 4.1's gate.

`machine-navigator.tsx`'s previously non-interactive "Workflows" section
(a plain, unclickable `<div>` list -- the gap `ui-context.md` had explicitly
recorded as deliberately unbuilt pending this registry) now has a real
`WorkflowRow` deep link per instance (mirroring `ModuleRow`) and a "Start
workflow" trigger on the section header (mirroring `CreateAssemblyDialog`'s
own header action). `AddModuleInstanceDialog` gained an optional "Attach to
workflow" `<select>` (rendered only when the configuration has any workflow
instances) so a module instance can actually be assigned to fill a role
from the UI, the missing piece needed to make the workflow view show
anything beyond an empty role list once modules exist to attach.

38 new/changed test cases across
`load-workflow-instance-view.test.ts` (live-DB, `roles`/`instanceLabels`
assertions), `workflow-instance-workspace.test.tsx`,
`start-workflow-instance-dialog.test.tsx`, `add-module-instance-dialog.test.tsx`,
`machine-navigator.test.tsx`, `workspace-shell.test.tsx`, and a new
`startWorkflowInstanceAction` describe block in `actions.test.ts` (the
`redirect()`-based success path, mocked rather than exercising Next's real
throw-based control flow -- no other action in this codebase has a direct
test for that either, `createProjectAction` included). Lint, typecheck, the
full test suite (1465/1465 with `DATABASE_URL`), and build all pass. This
unit is now fully done; nothing about Unit 4.1's own release gate changed
by it.

Unit 5.1 -- `BOM model and generator` (Milestone 5, Phase 1D). **Built
2026-08-11**, an explicit scope exception ahead of Milestone 4's own Unit
4.1 release gate clearing (per founder direction) -- the same kind of call
that authorized Units 4.8 and 4.9, now applied one milestone further out.

**No new `BomItem` table.** `context/architecture.md`'s own "Catalog and
BOM" entity list had named `BomItem` alongside real Prisma models since
Phase 0A, but by the time this unit was actually reached, `ComponentAssignment`
(ADR-0005) already carried everything one BOM line needs -- target, quantity,
part identity, and justifying calculation run -- and the Unit 2.9 part 2
baseline-snapshot work had already frozen `componentAssignments` rather than
inventing a `BomItem` shape ahead of this unit. ADR-0008 ("BOM is a generated
view, not a stored `BomItem` table") records the decision and corrects both
of `architecture.md`'s claims that a `BomItem` table exists or is stored.

A BOM is generated *live*, never persisted: `lib/application/reports/
load-bom-view.ts`'s `loadBomView` walks a configuration's assembly tree
(`loadConfigurationTree`) and its `ComponentAssignment` rows
(`listComponentAssignmentsForConfiguration`), resolving each into a `BomItem`
(mirroring `loadComponentAssignmentView`'s own `describePart`/
`describeAssignment` resolution logic -- manufacturer-name memoization, a
dangling part revision degrading to a plain description rather than failing
the whole view -- duplicated rather than imported, since those helpers are
private and code-standards.md prefers explicit duplication over a premature
shared abstraction here). Items nest into a `BomNode` tree mirroring the
assembly hierarchy exactly (an empty assembly still appears, matching
`AssemblyNode`'s own "present regardless of content" convention); a
`ComponentAssignment` with no assembly (`targetKind: "assembly"`, `assemblyId:
null` -- the documented "machine/configuration root" case) becomes a
`machineLevelItems` entry outside the tree. 7 live-DB tests
(`load-bom-view.test.ts`) cover null/unauthorized, an empty BOM, nested
catalog and manual items, a machine-level item, and stale-line counting
(built through the real `assignComponent`/`setParameterValue` services, not
raw repository writes).

CSV export is a pure function (`lib/reports/bom-csv.ts`'s `buildBomCsv`,
RFC 4180 escaping, CRLF line endings) over the same `BomView` the UI renders
-- never a second computation. It's served by
`app/(workspace)/workspace/bom/route.ts`, **this codebase's first Route
Handler** (every prior server boundary is a Server Action or a Server
Component page). Deliberately no `.csv` in the URL path itself:
`proxy.ts`'s Clerk middleware matcher explicitly excludes paths ending in a
`.csv` extension from running through `clerkMiddleware()`, so a literal
`/workspace/bom.csv` URL would bypass authentication context entirely --
the route is `/workspace/bom?configuration=<id>`, and the downloaded
filename (with its own `.csv` extension) comes from a `Content-Disposition`
header instead, which is independent of the request URL. Only the failure
path uses the `{ error: { code, message } }` envelope
(context/code-standards.md "APIs"); success returns raw `text/csv`, the one
legitimate exception to that convention (a file download is not JSON).

Generic UI: `BomWorkspace` (`components/engineering/bom-workspace.tsx`)
renders the same `BomView` as a recursive assembly tree with a Download CSV
link, mirroring `ModuleResultPanel`'s own "render the already-shaped view,
never recompute it" discipline. `machine-navigator.tsx`'s previously
non-interactive "BOM" static row is now a real `?panel=bom` deep link
(mirroring `RequirementsRow`/`BaselinesRow`); `workspace-shell.tsx` and
`page.tsx` wire it the same way every other configuration-level panel is
wired. 18 new UI/route test cases across `bom-workspace.test.tsx`,
`bom-csv.test.ts`, `route.test.ts` (the route handler, mocked dependencies,
no live database needed), and updated assertions in
`machine-navigator.test.tsx`/`workspace-shell.test.tsx`. Lint, typecheck,
the full test suite (1492/1492 with `DATABASE_URL`), and build all pass.

Unit 5.2 -- `Module and assembly report renderer` (Milestone 5, Phase 1D).
**Built 2026-08-11**, the same founder-authorized scope exception as Unit
5.1, continuing Milestone 5 ahead of Unit 4.1's own release gate.

Two new `lib/application/reports/` use cases assemble the printable read
model, both reading only a module instance's latest immutable
`CalculationRun` snapshot (never re-executing `compute`, per
`implementation-map.md`'s own Unit 5.2 rule: "The renderer receives stored
trace data; it does not import module formulas"). `loadModuleReportView`
covers every deliverable the implementation map lists -- resolved inputs,
the run's own active load case (resolved from
`CalculationRunSnapshot.input.loadCaseId` against the configuration's
`LoadCase` records -- currently almost always `null` in practice, since no
UI yet sets that field on `executeModuleInstance`'s call; an honest,
documented gap like `ball-screw`'s own missing gearbox-efficiency term, not
a defect), assumptions with resolved source citations, outputs, checks with
margins, warnings, validity limits, the calculation trace, source
references, assigned parts (reusing `ComponentAssignment`, scoped to one
module instance), and stale state -- plus the version pins
(`engineSdkVersion`/`modulePackageHash`/`parameterRegistryVersion`) a report
footer needs for reproducibility. `loadAssemblyReportView` rolls one named
assembly and every nested child assembly up into a tree by composing
`loadModuleReportView` per module instance, mirroring `loadBomView`'s own
tree-walk shape (Unit 5.1) one level narrower (one assembly, not a whole
configuration). Both share port-value description and source-reference
resolution with `loadModuleResultView` (Unit 3.5) via a new
`lib/application/calculations/run-view-helpers.ts`, extracted rather than
duplicated since both read the identical stored `ModuleComputation` shape --
`loadModuleResultView` itself is unchanged in behavior, only refactored to
import the shared functions.

`lib/reports/` gained its first HTML content alongside Unit 5.1's CSV
renderer: `module-report-html.ts` (`renderModuleReportSection` /
`buildModuleReportHtml`) and `assembly-report-html.ts`
(`buildAssemblyReportHtml`, nesting the same per-module fragment rather than
re-rendering module data, so a standalone module report and an assembly
report's own copy of that module always agree). Both are pure functions of
the already-assembled view -- no `lib/modules` import, satisfying Unit 5.2's
own rule directly, not just by convention. A shared `html-shell.ts`
(`escapeHtml`, `wrapReportHtml` with inlined print CSS -- architecture.md
"Reports \| HTML + print CSS") and a duplicated-on-purpose
`format-value.ts` (`lib/reports` cannot import
`components/engineering/format-engineering-value.ts` -- architecture's UI
boundary runs one direction only) back both renderers. Every dynamic string
(labels, statements, notes, assembly names) is escaped -- code-standards.md
Security: "Escape user-provided report content" -- tested directly with an
HTML-significant-character fixture.

`app/(workspace)/workspace/report/route.ts` is this codebase's second Route
Handler (after `/workspace/bom`): `GET ?module=<id>` or `?assembly=<id>`
(exactly one), returning `text/html` with `Content-Disposition: inline` (not
`attachment` like the BOM CSV route -- a report opens and prints in the same
tab rather than downloading). UI triggers: `ModuleResultPanel`'s header
gained a "Report" link next to Run, and every `AssemblyRow` in
`machine-navigator.tsx` gained a report icon-link (a new `IconLinkButton`,
the `<a>` counterpart to the existing Dialog-triggering `IconButton`) --
both open the route in a new tab. The navigator's own bottom-of-tree
"Reports" static row stays a deliberate placeholder (Unit 5.3's whole-
machine package, not this unit's per-module/per-assembly reports).

31 new test cases (`load-module-report-view.test.ts` and
`load-assembly-report-view.test.ts`, live-DB; `module-report-html.test.ts`
and `assembly-report-html.test.ts`, pure; `route.test.ts`, mocked
dependencies; plus new assertions in `module-result-panel.test.tsx` and
`machine-navigator.test.tsx`). Lint, typecheck, the full test suite
(1523/1523 with `DATABASE_URL`), and build all pass -- the build output now
lists `/workspace/report` alongside `/workspace` and `/workspace/bom`.

Unit 5.3 -- `Machine calculation package` (Milestone 5, Phase 1D). **Built
2026-08-11**, the same founder-authorized scope exception as Units 5.1-5.2,
continuing Milestone 5 ahead of Unit 4.1's own release gate.

One new `lib/application/reports/load-machine-report-view.ts` use case
assembles the whole package by composing every read model Units 5.1-5.2
already built, rather than re-deriving any of them: `loadRequirementsView`
(Unit 3.7) for the requirements verification matrix, `buildAssemblyReportNode`
(Unit 5.2, exported for this reuse) once per root assembly for module
summaries and detailed calculations, `loadBomView` (Unit 5.1) for the BOM,
`lib/standards`' released market-profile registry (resolved from the
project's own `marketProfileKey`, with every reference entry pre-resolved to
its document title/edition so `lib/reports` still performs no registry
lookup of its own), and `listMachineBaselinesForConfiguration`/
`loadMachineBaseline` for the latest baseline's own frozen module-package
hashes (there is no whole-baseline content hash -- `MachineBaselineSnapshot`
only ever carried per-module `modulePackageHash` values, so "baseline ID
and hashes" is exactly `baseline.id` plus that existing
`BaselineCalculationRunRef[]`, not an invented aggregate).

**The requirements verification matrix shows authoring completeness, not
run-based verification -- a deliberate, already-twice-documented scope
call, not a new gap.** `architecture.md`'s domain model names a
`VerificationLink` class linking a requirement to the run that demonstrates
it, but no unit has ever built it: `load-requirements-view.ts`'s own header
(Unit 3.7) already records that deciding *which* run or check satisfies
*which* requirement is real engineering judgment no released contract
records, and that adding the link now would combine a Prisma schema change
with a report/UI unit -- exactly what ai-workflow-rules.md's Split Rule
forbids. This unit reuses `loadRequirementsView` unchanged rather than
inventing that mapping to make Unit 5.3's own matrix look more complete than
the live Requirements panel already honestly claims; the report's own text
states the limitation directly next to the matrix, the same non-overclaim
posture code-standards.md's "Standards and Sources" section already
establishes for compliance claims.

`lib/reports/machine-report-html.ts` (`buildMachineReportHtml`) renders the
whole package as one HTML document: cover, market profile and references
(the profile's own baseline sources plus every source actually cited across
the package's own calculations, deduplicated), the requirements matrix,
an assembly/module summary table, detailed calculations (nesting
`assembly-report-html.ts`'s own `renderAssemblyNode`, exported for this
reuse, once per root -- so a standalone module report, an assembly report,
and this package's own copy of the same module always agree), the BOM, open
warnings/assumptions (aggregated from every module's own computed
`Warning`/`Assumption` list, attributed to the module instance that raised
them -- not project-level `DesignAssumption`s, already shown in the
requirements section), and the baseline section. `app/(workspace)/workspace/
report/route.ts` (Unit 5.2's route) gained a third mutually-exclusive query
mode, `?configuration=<id>`, rather than a new route -- the same
one-route/several-scopes shape the module/assembly modes already
established. `machine-navigator.tsx`'s previously non-interactive "Reports"
static row is now a real `MachineReportRow`, opening
`/workspace/report?configuration=<id>` in a new tab (the `<a>`, not
`?panel=`, pattern every other report trigger uses, since a report is a
printable document, not a workspace panel).

29 new test cases (`load-machine-report-view.test.ts`, live-DB;
`machine-report-html.test.ts`, pure; new assertions in `route.test.ts` and
`machine-navigator.test.tsx`). Lint, typecheck, the full test suite
(1541/1541 with `DATABASE_URL`), and build all pass.

What remains for Milestone 5: Unit 5.4 (end-to-end MVP validation), Unit 5.5
(production readiness). Both are optional parallel work under the same
scope exception as Units 5.1-5.3. **Unit 4.1's own release gate cleared
2026-08-11** (`axis-load-cases@0.1.0` registered), so a real machine
package can now include that one module -- the same dependency Unit 5.1's
own BOM and Unit 5.2's own module/assembly reports have on a registered
module. Unit 5.4 itself needs real reproduced scenarios through a complete
linear-axis MVP (all seven `linear-axis@1` roles filled by registered
modules), so it stays blocked on the other six modules' own Stage 6
(`motion-profile`, `ball-screw`, `linear-guide`, `coupling`,
`support-bearing`, `drive-train`), not on Unit 4.1 any longer -- Unit 5.5 is
the only Milestone 5 work actually startable right now (started below).

Unit 5.5 -- `Production readiness` (Milestone 5, Phase 1D). **Started
2026-08-11**, per founder direction after confirming Unit 5.4 and the
`axis-load-cases` evidence gate are both blocked on evidence this session
cannot manufacture, leaving Unit 5.5 as the only remaining buildable
Milestone 5 work. (**Later the same day**, the founder made the release
call recorded in "Active work" Unit 4.1 above -- the evidence gap was a
scope decision to accept, not additional evidence to manufacture --
clearing Unit 4.1's own release gate. Unit 5.4 remains blocked on the other
six Milestone 4 modules' own Stage 6, unaffected by that decision.)

**Deployment decision ADR (the unit's first deliverable) done 2026-08-11.**
`context/adr/0009-deployment-target-vercel-neon.md` settles the
long-standing open decision: deploy to Vercel, use Neon as the managed
PostgreSQL provider for every non-local environment. Local dev and CI are
unchanged (`docker-compose.yml` + `@prisma/adapter-pg` stays the default);
`lib/db/client.ts`'s existing host-based adapter switch (added 2026-07-31
for an unrelated corporate-network reason -- see Environment notes) already
routes a `*.neon.tech` `DATABASE_URL` to `@prisma/adapter-neon`
automatically, so acting on this decision needs new environment
configuration at actual provisioning time, not new code. Removed from
"Open decisions" below.

**Dependency audit done 2026-08-11.** `npm audit` (full tree, not just
`--omit=dev`) found 3 real high-severity transitive advisories: `nanoid
<3.3.17` (unbounded loop when a custom generator size is 0, pulled in via
`@tailwindcss/postcss` -> `postcss`), `js-yaml 4.0.0-4.3.0`, and
`brace-expansion` (two separate DoS advisories) -- none reachable from this
app's own runtime code (build-tooling transitive deps only), but real
advisories regardless. `npm audit fix` resolved all three with lockfile-
only patch/minor bumps (`package.json` itself untouched, no `--force`, no
major-version jump); `npm audit` now reports 0 vulnerabilities. Verified
clean after: lint, typecheck, build, and the full non-DB test suite
(1297/1297 passing, matching the pre-existing baseline) all still pass.
Remaining Unit 5.5 deliverables, not yet started: managed database backups,
error monitoring, structured application logs, security review, data
export and account deletion path, basic performance benchmark, recovery
procedure.

---

## Blocked — needs evidence, not code

Unit 4.1 (`axis-load-cases`) is no longer blocked here: released 2026-08-11
as `axis-load-cases@0.1.0` (see "Active work" above and
`validation/axis-load-cases/0.1.0.md`). The three items that used to block
its Stage 4/release no longer block release — not all three are actually
resolved:

- Release-grade ID39/ID42 records — **resolved differently, not cleared.**
  The founder accepted both fixtures at `0.1.0-release-candidate` status
  instead of the release-grade evidence originally required; their
  provenance gaps (no original document revision, no confirmed as-built
  installation record, no holding/brake record) are recorded in
  `validation/axis-load-cases/0.1.0.md`, not resolved.
- The third long-stroke/high-speed fixture required by Unit 0.1 —
  **decoupled from Unit 4.1's release**, not found. It is still genuinely
  missing and still needed for the broader Unit 0.1 and Phase 1B
  validation program — see "Next up" item 2 and "Open decisions" below. No
  synthetic fixture was substituted for it.
- A completed `validation/axis-load-cases/0.1.0.md`, reviewer or documented
  solo-review substitute, and `validation/source-index.md` rows — **done.**

`motion-profile` Stage 2 has no remaining evidence blocker: both candidate
sources are now page-verified (see Active work). RMS ownership and the
multi-segment port shape are resolved (`stage-2-contract.md`); a Stage 3
draft package exists for the single-move kernel. What remains is the
multi-segment package port-cardinality decision, not an evidence gap.

The authenticated-route E2E test (Next up item 3) needs a Clerk Development
instance and four GitHub Actions repository secrets this session cannot
provision itself (no dashboard/repository-settings access, no `gh` CLI
installed) — see Next up item 3 for exactly what and `.env.example` for the
variable names.

---

## Next up

1. Unit 4.2 (`motion-profile`) Stage 6 (release) — the active/next work now
   that Unit 4.1's own release gate cleared 2026-08-11
   (`axis-load-cases@0.1.0`, see "Active work" above). `motion-profile` is
   done through Stage 4 (`validation/motion-profile/0.1.0.md`) and Stage 5
   (workflow role integration, `"linear-axis.motion"`, Unit 4.8). What
   remains: registering it (rename `package.ts` to `index.ts`, run `npm run
   registry:generate`, seal the package hash) and completing Stage 6's own
   `reviewer`/`reviewDate` fields — see item 5 below for the full status.
2. Unit 0.1 — add the third long-stroke/high-speed fixture alongside ID39 and
   ID42 in `tests/fixtures/axes/`. Explicitly decoupled from Unit 4.1's own
   release (2026-08-11), but still required/desirable for the broader Unit
   0.1 and Phase 1B linear-axis validation program; not yet found (see
   "Open decisions" below). Will be added only when a real third project
   exists, never fabricated or replaced by a synthetic fixture.
3. Playwright CI round trip for the authenticated route. **Paused
   2026-08-07 by user request** ("leave this authentication here, we move
   to other tasks") — not abandoned, just not being worked further right
   now. Code is ready (`@clerk/testing`, `e2e/clerk-global-setup.ts`,
   `e2e/authenticated.spec.ts`, CI secret wiring in
   `.github/workflows/ci.yml`). A real Clerk Development-instance key pair
   is in `.env.local` (gitignored, local-only). Still open: the E2E test
   user's password was never captured (only its email,
   `josvu@wanekfurniture.com` — flagged as possibly a real personal/work
   address rather than a dedicated throwaway; worth reconsidering before
   this goes further), and none of the four values have been added as
   GitHub Actions repository secrets yet, so CI cannot exercise this path
   yet. Unauthenticated smoke coverage already exists and passes.
4. Downstream parameter groups (screw, guide, coupling, support bearing,
   drive train). Approved but deliberately unreleased — each ships with the
   module that needs it, at that module's Stage 2 contract. See
   `lib/engine/parameters/README.md`.
5. Unit 4.2 (`motion-profile`) and Unit 4.3 (`ball-screw`): both are done
   through Stage 4 (`ball-screw` also through Stage 5 as far as applicable
   pre-Unit-4.8 — see Active work). Workflow role integration is now done
   for both (2026-08-10): `motion-profile` declares `"linear-axis.motion"`,
   `ball-screw` declares `"linear-axis.screw"` (Unit 4.8,
   `lib/workflows/linear-axis/1.0.0/definition.ts`), each asserted in its
   own test file. Workflow integration tests exist at the workflow-
   definition level (`lib/workflows/linear-axis/1.0.0/integration.test.ts`)
   rather than per module, since neither module is registered yet. What's
   left for both: Stage 6 (release) itself — no longer gated behind Unit
   4.1 (released 2026-08-11), simply not yet started; `motion-profile` is
   this tracker's own active/next pick (item 1 above). `motion-
   profile`'s own cross-module link compatibility item is now testable and
   done: `drive-train 0.1.0` declares input ports for its `peak_
   acceleration`/`peak_deceleration`/`rms_acceleration` outputs (see Unit
   4.7 in Active work) — a claim this note made until 2026-08-10 that no
   module ever would has already turned out false, so `motion-profile` gets
   no separate `cross-module-links.test.ts` of its own; the link is tested
   from the consuming side, the same convention every other module pair in
   this codebase follows.
6. Unit 4.4 (`linear-guide`): **Stages 1-5 done** (see Active work) —
   Stage 4 including the independent benchmark (`iko-benchmark.ts`
   implements IKO's own equivalent-load method as a genuine second
   computation), Stage 5's generic UI/report schema (drafted at Stage 3,
   already passing conformance via `package.test.ts`) and cross-module link
   compatibility tests against `axis-load-cases`
   (`cross-module-links.test.ts`, already present). Workflow role
   integration is done (2026-08-10): declares `"linear-axis.guide"` (Unit
   4.8), asserted in `cross-module-links.test.ts`. What remains: Stage 6
   (release) itself — no longer gated behind Unit 4.1 (released
   2026-08-11), simply not yet started. Optional parallel work.
7. Unit 4.5 (`coupling`): **Stages 1-5 done** (see Active work) — Stage 4
   including the independent benchmark, Stage 5's generic UI/report schema
   (drafted at Stage 3) and cross-module link compatibility tests against
   `ball-screw` (`cross-module-links.test.ts`, done 2026-08-10). Registry
   `1.6.0` released, full package in `lib/modules/coupling/0.1.0/`,
   `validation/coupling/0.1.0.md` complete. Workflow role integration is
   done (2026-08-10): declares `"linear-axis.coupling"` (Unit 4.8;
   `linear-axis@1`'s own role of that ID has cardinality 0-1, an open
   product decision — see "Open decisions"), asserted in
   `cross-module-links.test.ts`. What remains: Stage 6 (release) itself —
   no longer gated behind Unit 4.1 (released 2026-08-11), simply not yet
   started. Optional parallel work.
8. Unit 4.6 (`support-bearing`): **Stages 1-5 done** (see Active work) —
   Stage 4 including the independent benchmark (NSK's own "Rolling
   Bearings" catalog supplied both the missing worked example and a proved
   algebraic-identity benchmark, closing the two gaps Stage 1 recorded),
   Stage 5's generic UI/report schema (drafted at Stage 3, already passing
   conformance) and cross-module link compatibility tests against
   `axis-load-cases`/`ball-screw` (`cross-module-links.test.ts`, done
   2026-08-10). Registry `1.7.0` released, full package in
   `lib/modules/support-bearing/0.1.0/`. Workflow role integration is done
   (2026-08-10): declares `"linear-axis.bearing"` (Unit 4.8; cardinality
   1-2 there, since a fixed+supported arrangement needs two instances),
   asserted in `cross-module-links.test.ts`. What remains: Stage 6
   (release) itself — no longer gated behind Unit 4.1 (released
   2026-08-11), simply not yet started. Optional parallel work.
9. Unit 4.7 (`drive-train`): **Stages 1-5 done** (see Active work) --
   registry `1.8.0` released, full `drive.*` group; full `ModulePackage` in
   `lib/modules/drive-train/0.1.0/` with three reference examples (Omron's
   own R88M-U20030 worked example, plus THK's own horizontal and vertical
   worked examples, the vertical one partial by design -- see Active work)
   reproduced through the real compute path, and the independent benchmark
   met (`closed-cycle-benchmark.ts`, done 2026-08-10). Stage 5's cross-module
   link compatibility tests against `ball-screw`/`axis-load-cases`/
   `motion-profile` are done (`cross-module-links.test.ts`, done
   2026-08-10 -- the first module to link against a `motion-profile`
   output), and generic UI/report schema conformance was already passing.
   Drive/amplifier current sizing stays out of scope until the unit
   registry gains an electrical-current dimension -- a separate
   generic-engine unit, not bundled into this module. Workflow role
   integration is done (2026-08-10): declares `"linear-axis.drive"` (Unit
   4.8), asserted in `cross-module-links.test.ts`. What remains: Stage 6
   (release) itself — no longer gated behind Unit 4.1 (released
   2026-08-11), simply not yet started. Optional parallel work.
10. Unit 4.8 (`linear-axis@1` workflow): **built 2026-08-10** — full
    `WorkflowDefinition` contract (`lib/workflows/workflow-sdk/`) and the
    concrete `linear-axis@1` definition, tested against all seven real
    modules' own ports (`lib/workflows/linear-axis/1.0.0/`), see Active
    work and `context/adr/0007-workflow-definition-contract.md`. The
    `coupling` role's 0-1 cardinality is resolved (2026-08-10): the founder
    confirmed direct-drive axes are a real configuration, so it stays
    optional — see `context/adr/0007-workflow-definition-contract.md`
    "Consequences". `lib/application` wiring (`startWorkflowInstance`,
    `loadWorkflowInstanceView`) and the generic UI surface are now both
    built — see Unit 4.9. One of the seven roles (`linear-axis.axis`) now
    has a real registered module (`axis-load-cases@0.1.0`, released
    2026-08-11); the other six modules above remain unregistered pending
    their own Stage 6, not Unit 4.1's gate. Starting or viewing a workflow
    instance itself was never blocked by this either way; optional parallel
    work in the meantime.
11. Unit 4.9 (`WorkflowInstance` application wiring and generic UI surface):
    **fully built** — application wiring 2026-08-10, the UI surface
    2026-08-11 — see Active work for the full account.
    `lib/db/repositories/workflow-repository.ts`,
    `lib/application/workflows/` (`startWorkflowInstance`,
    `loadWorkflowInstanceView`), the `?workflow=` deep link on
    `app/(workspace)/workspace/page.tsx`, `startWorkflowInstanceAction`,
    `WorkflowInstanceWorkspace`, and `StartWorkflowInstanceDialog` all exist
    and are tested (application layer end to end against a real database,
    proven generically via a new `example-workflow@1.0.0` registry entry
    (`lib/workflows/example-workflow/1.0.0/`) rather than against any of
    `linear-axis@1`'s own seven modules; UI layer via component
    tests). This unit is done. Nothing left to do here.
12. Units 5.1-5.3 (BOM model and generator; module/assembly report
    renderer; machine calculation package): **all built 2026-08-11** — see
    Active work for the full account. No stored `BomItem` table (ADR-0008);
    `loadBomView`/`buildBomCsv`/`/workspace/bom`; `loadModuleReportView`/
    `loadAssemblyReportView`/`/workspace/report`; `loadMachineReportView`
    and its `?configuration=` report mode all exist and are tested. All
    three units are done. Unit 5.4 (end-to-end MVP validation) needs a
    complete linear-axis MVP scenario (all seven `linear-axis@1` roles
    filled by registered modules); Unit 4.1 no longer blocks it (released
    2026-08-11), but the other six Milestone 4 modules
    (`motion-profile`, `ball-screw`, `linear-guide`, `coupling`,
    `support-bearing`, `drive-train`) still need their own Stage 6 — see
    items 5-9 above. Unit 5.5 (production readiness) is in progress (see
    below).
13. Unit 5.5 (production readiness): **started 2026-08-11** — the
    Deployment decision ADR (`context/adr/0009-deployment-target-vercel-
    neon.md`: Vercel + Neon managed Postgres) and the dependency audit
    (`npm audit fix`, 3 transitive high-severity advisories resolved, 0
    remaining) are both done. Remaining deliverables, not yet started:
    managed database backups, error monitoring, structured application
    logs, security review, data export and account deletion path, basic
    performance benchmark, recovery procedure. Optional parallel work,
    independent of Milestone 4's remaining modules.

---

## Open decisions

Product and scope questions that are genuinely still open. Resolved ones
have been removed; `context/archive/history.md` has the reasoning behind
past calls.

- Final product name. MachineStudio is a working name.
- Initial manufacturer data sources for screws, guides, couplings, motors,
  and drives.
- Which third historical axis project (long-stroke/high-speed) can be
  sanitized for validation. ID39 (horizontal) and ID42 (vertical) are
  decided — accepted 2026-08-11 as `0.1.0-release-candidate` evidence for
  Unit 4.1 (see Active work) — but they remain provenance-limited, and the
  third project needed for the broader Unit 0.1 / Phase 1B validation goal
  is still undetermined and unfound.
- `holding`/`emergency_stop` support for `axis-load-cases` (deferred out of
  `0.1.0`, see Active work): needs sanitized evidence of a holding/brake case
  and an emergency-stop deceleration/process-force case before a `0.2.0`
  proposal is possible. Neither ID39 nor ID42 contains either case.
- Whether S-curve motion is mandatory for the first live-axis replacement.
- Whether the first live project needs 480 V three-phase drive-system data.
- Whether the first Japanese project is 50 Hz (East) or 60 Hz (West).
- Whether Japanese-language report output is required by JP customers.
- Licensing status of the ID39/ID42 training PDFs and the Omron/ATLANTA
  reference material — internal reference only until cleared.
- Live-verification of official Japanese and US source editions (blocked by
  the TLS interception note below).
- A real `VerificationLink` (requirement-to-calculation-run link):
  `architecture.md`'s domain model has named it since Phase 0A, but no unit
  has built it — Unit 3.7 and Unit 5.3 (`context/ui-context.md`
  "Requirements, Assumptions, and Load-Case UI") both deliberately reused
  "acceptance criteria defined, or not yet" instead. Needs a founder call on
  *which* run or check should count as satisfying *which* requirement (an
  engineering-judgment question, not an implementation one) before the
  schema/UI work is scoped.

---

## Environment notes

Local development constraints, not product decisions. None of these block
anything on the roadmap.

- The primary dev machine sits behind a corporate TLS-intercepting proxy. Do
  not disable TLS verification to work around it — use GitHub Actions as the
  verification environment instead.
- Group policy on that machine blocks launching freshly downloaded browser
  binaries, so Playwright cannot run locally. Run it in CI.
- Vitest does not read `.env`. Pass `DATABASE_URL` explicitly to run the
  database-backed suites; otherwise they report as skipped, never as passed.
  **`.env`'s own `DATABASE_URL` value is double-quoted** (`DATABASE_URL="postgresql://…"`),
  so a naive shell extraction (e.g. `cut -d= -f2-`) passes the literal quote
  characters through, and Prisma then fails with a nonsense host like
  `Can't reach database server at base` — strip the surrounding quotes first
  (e.g. `sed -E 's/^DATABASE_URL="(.*)"$/\1/'`).
- **Vitest also does not read `.env`'s `NODE_EXTRA_CA_CERTS`** (confirmed
  2026-08-12): on the corporate-TLS-proxy machine (see the note above),
  exporting only `DATABASE_URL` before a database-gated `vitest run` is not
  enough — every query fails with an opaque WebSocket `ErrorEvent` (no
  useful message), reproducible even on a single trivial query in complete
  isolation, and looks exactly like a dead or overloaded database. It is
  neither: it is the same TLS-interception block the corporate-network note
  above describes, just surfaced through `@neondatabase/serverless`'s
  WebSocket driver instead of a plain HTTPS fetch. Export both
  `DATABASE_URL` and `NODE_EXTRA_CA_CERTS` (the path in `.env`, e.g.
  `C:/Users/<user>/.certs/<name>.pem`) before running the database-gated
  suites, not just the former.
- The Neon free tier occasionally exceeds Vitest's default 5000 ms timeout on
  the `stale-propagation` and `compare-baselines` live-DB tests, and — seen
  2026-08-11 running the full live-DB suite — can time out widely across
  many unrelated live-DB files at once under load. Pass a longer
  `--testTimeout` (30000 worked) when running the full suite against
  `DATABASE_URL` rather than treating a wide timeout wave as a regression.
  Latency, not a defect.
- **`format:check` now flags roughly 212 files repo-wide on this Windows
  machine** (confirmed 2026-08-11), not the small fixed set an earlier
  session recorded: files pulled/checked-out have CRLF line endings (`git
  check-attr` shows no `.gitattributes` `eol` rule forcing LF), while
  Prettier's default `endOfLine: "lf"` expects LF — every CRLF file reads as
  unformatted. Files this session's own `prettier --write` touched are LF
  and clean; the repo-wide CRLF drift itself is untouched, since fixing it
  is a separate, cross-cutting change (a `.gitattributes` `eol=lf` rule and/or
  a full-repo reformat), not part of any single work unit.
- The npm registry is pinned to `https://registry.npmjs.org/` via `.npmrc`.
- `package.json` `overrides` pins patched `postcss`, `sharp`, and `fast-uri`
  ahead of upstream releases. Re-check on every Next.js and Prisma upgrade.
- `.prettierignore` exempts 17 files on purpose: the 10 hand-configured
  `components/ui/*` primitives, and the source-hash-pinned files in
  `lib/modules/example-relay/` and `lib/modules/example-scaffold/`.
  Reformatting those would break their `expectedSourceHash` assertions.
- The PDF-reading tool cannot render page ranges from a PDF longer than it
  can read in one pass — `pdftoppm` (poppler-utils), needed for ranged
  rendering, is not installed. Short PDFs (up to ~19 pages, confirmed) read
  fine either from a local file or a `WebFetch`-cached download; a 20-page
  PDF already fails ("too many pages... use the `pages` parameter"), and the
  `pages` parameter itself then fails with the `pdftoppm`-not-installed
  error — there is currently no way to read any individual page of a PDF
  once it crosses that threshold. Confirmed 2026-08-08 against a cached
  `WebFetch` download, a local `reference/source-material/` file, and again
  against a 20-page and a 78-page cached download. **The "up to ~19 pages"
  figure is an upper bound, not a guarantee:** a later same-day attempt hit
  the same "too many pages" error on a cached 14-page PDF (a University of
  Utah lecture slide deck, image-dense), so page count alone does not
  predict whether a given PDF reads in one pass — content density likely
  matters too.
  **Update (2026-08-09): the `pages` parameter does work on long PDFs when
  the requested range itself is small.** A 488-page and a separate 172-page
  cached `WebFetch` download (both THK ball-screw catalogs, see the
  `thk.com` note below) both rendered cleanly with `pages: "1-5"` and
  `pages: "63-77"` (15 pages) requests — no `pdftoppm`-not-installed error.
  This contradicts the "pages parameter itself then fails" claim above,
  recorded 2026-08-08 from a 14-20-page document; the constraint is evidently
  the size of the *requested range* (stay near or under the tool's own
  20-page cap per call), not the total document length. Re-test before
  trusting either account fully — this note has now been revised twice.
- `thk.com` (THK's own PDF catalog host, already cited for
  `axis-load-cases`) returned HTTP 403 on every URL `WebFetch` tried against
  it on 2026-08-08 across two separate attempts in the same session,
  including individual chapter PDFs, not just the full catalog — looks like
  host-side bot protection, not the TLS-interception proxy noted above (that
  shows up as a certificate error instead, seen the same session against
  other hosts). A prior session evidently reached THK successfully (its
  URLs are cited with specific pages in `context/modules/axis-load-cases/
  stage-1-spec.md`); this looks like a host-side block on that specific
  domain rather than a permanent one, so retry rather than assume it will
  always fail. **Workaround found 2026-08-08:** THK's own catalog PDFs are
  also mirrored on non-`thk.com` hosts (e.g. a Contentful CDN asset URL, and
  `technico.com`) that are not subject to the same block — useful when the
  content is needed and the direct domain is down, though the mirrored PDFs
  found this way were long enough to hit the `pdftoppm` limitation above
  instead. **Confirmed 2026-08-08 (later same day) that the block covers
  more than `tech.thk.com`:** `www.thk.com` (a different subdomain, THK's
  own ball-screw selection-guide site) also returned HTTP 403 on direct
  fetch — treat any `thk.com` subdomain as likely blocked this session, not
  just the `tech.` one. **Confirmed still blocked 2026-08-09** (a third
  session, same result). A second working mirror was found this session:
  `bondy.dk` (a Danish industrial distributor), hosting the same catalog
  content as `technico.com` — useful as a fallback if one mirror goes down,
  since both are third-party hosts outside this project's control.

---

## How to update this file

After a meaningful change, edit the affected section in place. Do not append
a dated narrative entry — that is what produced the 3,636-line file this
replaced.

- Status changed → update the milestone table or Active work.
- A blocker cleared → delete it from Blocked, move the item into Next up.
- A decision was made → delete it from Open decisions. If it constrains
  future implementation, write an ADR in `context/adr/` instead of
  explaining it here.
- A milestone completed → move its detail to `context/archive/history.md`
  and leave one row in the table above.
