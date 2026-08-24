# Progress Tracker

**What this file is:** current state, active work, blockers, and open
decisions. Nothing else. Keep it under ~150 lines.

**What this file is not:** a changelog. Frozen history for Milestones 0-3
and early Milestone 4 lives in `context/archive/history.md` — including the
rationale that ~45 source-file comments still cite as
`context/progress-tracker.md`. New code comments cite an ADR
(`context/adr/`) or a module spec, never this file.

Last updated: 2026-08-18 (Milestone 4 complete, all seven linear-axis
modules registered; Unit 5.4 Scenario 1 complete end to end; Unit 5.5
(production readiness) done; **ADR-0011 records a new founder-directed
architecture: a mechanism-oriented "Motor Sizing Tool" module family**,
planned to become the primary user-facing entry point ahead of the
existing seven linear-axis discipline modules; **Milestone 6's own module
work is now complete -- Unit 6.1 (`lib/engine/mechanics`) built and
released, and Units 6.2 (`ball-screw-motor-sizing@0.1.0`), 6.3
(`direct-drive-conveyor-motor-sizing@0.1.0`), 6.4
(`rack-pinion-motor-sizing@0.1.0`), 6.5
(`belt-pulley-drive-motor-sizing@0.1.0`), and 6.6
(`index-table-motor-sizing@0.1.0`) are now all fully released** -- all
five Motor Sizing Tool family modules ADR-0011's own "Phase scope" named,
each with published worked examples (or an internal-only benchmark / a
disclosed partial reproduction filling a disclosed evidence gap)
reproduced through the real compute path, an independent benchmark, and
cross-module link/workflow-role conformance confirmed -- Units 6.3
through 6.6 each found and disclosed real evidence gaps in their own
source material rather than glossing over them. **Unit 6.6 closed the
load-torque evidence gap ADR-0011 itself predicted** (two independent
manufacturers both omit a load-torque formula for an index table
entirely, not merely agree on a value) **and is the first Motor Sizing
Tool module with no `motion.axis.*` reuse and no compatible
cross-module-link pair at all** -- a genuinely different-in-kind
mechanism (rotary, not linear), confirmed rather than merely predicted.
**The `AddModuleInstanceDialog` mechanism-picker UI work (Unit 6.7) is now
also built** -- Milestone 6 and Phase 1E are both fully complete -- see
"Next up" item 1 below; **module instance management (friendly default
labels, rename, archive-based removal) also shipped 2026-08-13**; **and
`belt-pulley-drive-motor-sizing@0.2.0` -- this project's first module-
version bump, adding a native repeating trapezoidal motion cycle and two
new outputs (`deceleration_torque`, `effective_torque`) on top of
everything `0.1.0` already computes -- shipped 2026-08-18, `0.1.0` staying
released, registered, and untouched** -- see "Active work" below; **and the
6 pre-existing `workspace-shell.test.tsx` failures that release's own
verification disclosed (a stale `vi.mock` missing three module-instance-
management actions) are fixed the same day** -- non-DB suite is 2080/2080).
**2026-08-20: a release-readiness audit found six release-blocking
calculation defects and several application-layer gaps; all are now fixed.**
Engine-level: `executeModule`/`resolveModuleInput` now enforce a
parameter's declared `range` against input magnitudes, previously declared
but never checked (`ENGINE_SDK_VERSION` bumped to `1.1.0`,
`lib/engine/module-sdk/execute.ts`). Four new patch module versions, each
0.1.0/0.2.0/0.3.0 staying released/registered/untouched: `ball-screw@0.1.1`
(drive torque now reports a magnitude, not a signed value, matching its own
`range: { min: 0 }`), `direct-drive-conveyor-motor-sizing@0.2.1` (inertia
ratio now includes the drive roller's own inertia), `belt-pulley-drive-motor-sizing@0.3.1`
(momentary torque now considers both ramp phases; effective/RMS torque now
includes a dwell holding term), `index-table-motor-sizing@0.2.1` (rejects a
motion profile where `2*acceleration_time > index_time`). Application-layer:
a workflow-level failing check now blocks `"completed"` status
(`lib/workflows/workflow-sdk/completion.ts`'s new `workflowChecks` input,
wired from `load-workflow-instance-view.ts`); `confirmParameterLink` now
validates every `sourceKind`/`sourceModuleInstanceId`/`sourceAssemblyId`
combination instead of silently skipping validation for a mismatched one;
`setModuleInputValueAction`'s boolean branch now checks
`definition.valueType`; `assignComponent` now rejects a stale
`calculationRunId`; `listModuleInstancesForWorkflowInstance` now excludes
archived instances; the CI E2E step now sets `pipefail`; BOM CSV export now
neutralizes a formula-injection prefix (`=+-@`) in manual fields. Full
non-DB suite green (2456/2456), DB-gated suite green, typecheck/lint/build
clean. **2026-08-24: the dev-fixtures-visible-in-module-picker item is
fixed** — `app/(workspace)/workspace/page.tsx`'s `modulePackageOptions()` now
also filters by a new `HIDDEN_MODULE_IDS` set (`example-relay`,
`example-scaffold`), the same route-level-filter pattern
`HIDDEN_MODULE_CATEGORIES` already uses; filtered by id rather than
`category` because `example-scaffold`'s own category is still its unfilled
`npm run module:new` placeholder (`"TODO"`), not the `"development-fixture"`
value `example-relay` actually declares. Both fixtures stay registered
(integration tests depend on them); neither manifest was edited.
**2026-08-24: two more audit items closed.** Concurrent link-creation cycle
detection: `confirmParameterLink`'s transaction now runs at `Serializable`
isolation (previously the Prisma default, effectively READ COMMITTED), so
Postgres detects the write-skew case where two concurrent confirmations each
see an acyclic graph and would together close a cycle neither alone would —
confirmed with a new regression test that races two closing links and
asserts at most one can ever succeed. A spurious serialization failure
between logically unrelated transactions is expected under concurrent load
per Postgres's own documented contract for this isolation level, so the call
now retries up to 5 times before surfacing a new `"conflict"` error code;
without the retry, running the new regression test alongside the rest of the
DB-gated suite produced real spurious failures in unrelated tests, confirmed
directly. `isSerializationConflict` (`lib/db/repositories/db-client.ts`)
recognizes both the `PrismaClientKnownRequestError` `P2034` shape and the
untranslated `DriverAdapterError`/`TransactionWriteConflict` shape
`@prisma/adapter-neon` raises for the same underlying SQLSTATE `40001`,
confirmed both occur depending on when in the transaction the conflict
fires. The nullable `targetLoadCase` unique-index gap: Postgres unique
constraints treat every NULL as distinct, so `ParameterLink`'s own
`@@unique([targetModuleInstanceId, targetParameterId, targetLoadCase])`
never actually fired for the common case (a load-case-agnostic input port,
`targetLoadCase` null) — closed with a hand-authored partial unique index
(`prisma/migrations/20260824120000_parameter_link_null_load_case_unique`),
applied directly to the live Neon database and recorded in
`_prisma_migrations` (`prisma migrate deploy` itself is blocked by the same
group-policy restriction documented below for Playwright), proven by a new
test that inserts through the raw Prisma client directly, bypassing
`createParameterLink`'s own application-level duplicate check entirely.
Full DB-gated suite green (2720/2720, confirmed twice) after both fixes,
typecheck and lint clean. **2026-08-24 (same day): two more items closed.**
"Permanent" account deletion not clearing the Clerk identity:
`deleteAccount` (`lib/application/account/delete-account.ts`) previously
only deleted the local `User` row; it now also calls
`clerkClient().users.deleteUser` after the local deletion succeeds. A failed
Clerk call does not fail the whole use case (the local data is already
irreversibly gone, the more important half for privacy) — it logs instead,
for an operator to clean up an orphaned Clerk identity. New unit tests
(`delete-account.test.ts`, mocked — no live Clerk credentials in this
environment) cover both the success path and the Clerk-call-fails path.
Cross-project deep-link mixing: every in-app link carrying `?module=` also
carries a `?project=`/`?configuration=` pair read from that same module
instance's own real configuration
(`components/engineering/machine-navigator.tsx`), so the two never
legitimately disagree — but nothing previously rejected a hand-edited or
stale `?module=`/`?workflow=` naming an instance in a *different,
same-owner* project than `?project=`/`?configuration=` named, which
rendered that instance's real data inside the unrelated selected project's
own sidebar/header chrome. `app/(workspace)/workspace/page.tsx` now nulls
out `moduleWorkspace`/`workflowInstance` (and everything derived from them)
on a configuration mismatch, falling back to "nothing selected" — the same
treatment every other nullable deep-link view in that file already gets for
an unauthorized or not-found id. Full non-DB and DB-gated suite green
(2725/2725), typecheck/lint clean. Not yet addressed from that same audit
(see the audit itself, not repeated here): Playwright trace/
credential-retention policy (blocked by group policy — see the Playwright
note below) and the UX/tooling-debt items.
**2026-08-24 (same day): Unit 7.1 (`pneumatic-cylinder`) Stage 3 (compute
and trace) is done** — `lib/modules/pneumatic-cylinder/0.1.0/` now has a
full package (manifest, `math.ts` kernel, input schema, compute, checks,
trace, generic UI/report schema, a draft `validation.ts`), reference
examples reproduced through the real compute path against SMC Corporation's
own worked examples, and 93/93 module tests passing — see
`context/implementation-map.md` Milestone 7 Unit 7.1 "Stage 3" for the full
account, including the buckling formula's own independent reproduction of
`ball-screw@0.1.0`'s established Euler end-fixity constants and a real,
disclosed registry gap (Milwaukee/SMC source revisions, never actually
registered at Stage 2 despite that stage's own "to be added" note) closed
in the same session. Full non-DB suite green (2520/2520), typecheck/lint/
build clean. The module is built and tested but not yet registered —
Stage 4 (validation review) through Stage 6 (release, including `npm run
registry:generate`) remain; see "Next up" item 0.
**2026-08-24 (same day): Unit 7.1 Stages 4-6 are done — `pneumatic-
cylinder@0.1.0` is released and registered, Milestone 7's first module.**
Stage 4's own still-open independent-benchmark question (Parker Hannifin's
own literature returned HTTP 403 again this session, the same block Stage
1/Stage 3 already recorded) is **partially resolved, not fully closed**:
Norgren (IMI Precision Engineering)'s own M/1000 catalog data sheet — a
third manufacturer, independent of both SMC and Milwaukee — supplies real
published per-model theoretical-force and air-consumption ratings this
module's kernel was never calibrated to; reproduced through the real
compute path (`lib/modules/pneumatic-cylinder/0.1.0/norgren-benchmark.ts`/
`.test.ts`) across 7 bore sizes, agreement is within 2% on all 21 figures
(mean under 1%). This closes the independent-benchmark item for 2 of the
module's 4 formula areas (theoretical force, air consumption) — the cushion
kinetic-energy-allowable and buckling formulas still have no second
independent source of any kind, an explicit, disclosed `0.1.0` limitation
carried into release, not silently dropped. `reviewer`/`reviewDate` are
honestly scoped to what the substitute evidence actually covers. Stage 5
(generic surfaces) was already effectively complete at Stage 3 — this
module has no cross-module link and no workflow role, confirmed rather
than assumed. Stage 6: source-immutability hash pinned
(`9700fdc94f2a344f`), registered via `npm run registry:generate`
(`pneumatic-cylinder@0.1.0` in `lib/modules/registry.generated.ts`, 25
modules total), sealed content hash `739621ff948938a9`. Full validation
record: `validation/pneumatic-cylinder/0.1.0.md`; three new
`validation/source-index.md` rows. Full non-DB suite green (2546/2546),
typecheck/lint/build clean. See `context/implementation-map.md` Milestone 7
Unit 7.1 "Stage 4"/"Stage 5"/"Stage 6" for the full account.

---

## Where the project is

| Milestone | Scope | State |
| --- | --- | --- |
| 0 | Evidence and repository foundation | Done |
| 1 | Generic engineering engine | Done |
| 2 | Persistence and application services | Done |
| 3 | Generic user experience (Units 3.1-3.9) | Done |
| 4 | Linear-axis engineering modules | **Done** |
| 5 | BOM, reports, MVP release | **In progress** |
| 6 | Motor Sizing Tool family (ADR-0011) | **Done** |
| 7 | Common automation modules | **In progress** |

Roadmap phases map onto these milestones as follows (the roadmap uses phase
letters, the implementation map and this tracker use milestone numbers —
same work, two labels):

- Phase 0A / 0B / 0C → Milestones 0, 1, 2
- Phase 1A → Milestones 3 and 4
- Phase 1B / 1C → Milestone 4 (later units)
- Phase 1D → Milestone 5
- Phase 1E → Milestone 6
- Phase 2 → Milestone 7
- Phase 3+ → after MVP

Milestone 5 work started ahead of Milestone 4's own Unit 4.1 release gate
clearing, per explicit founder direction -- the same kind of scope
exception that authorized Units 4.8 and 4.9. **Unit 4.1's own release gate
cleared 2026-08-11** (`axis-load-cases@0.1.0` released and registered), and
**Units 4.2 through 4.7's own release gates all cleared 2026-08-12**
(`motion-profile@0.1.0`, `ball-screw@0.1.0`, `linear-guide@0.1.0`,
`coupling@0.1.0`, `support-bearing@0.1.0`, `drive-train@0.1.0` released and
registered) -- **all seven Milestone 4 modules are now released**, and with
Units 4.8/4.9 already built, Milestone 4 itself is complete. Every
`linear-axis@1` role has a real registered module. See "Active work" below.
Roadmap-level phase gates (Phase 1B's "historical machine project run
through the module" item, Phase 1C's brake/drive/regeneration items) remain
open Unit-5.4-or-later work, not Milestone-4-unit completion items --
see `context/roadmap.md` Phase 1B/1C for the precise, honestly-assessed
status of each.

**Health:** lint 0 warnings on every file this or a prior session touched
(typecheck 0 errors), all 1642 tests pass with `DATABASE_URL` and
`NODE_EXTRA_CA_CERTS` set against the configured Neon database (confirmed
2026-08-12 — see the Environment notes below for how, though that specific
count predates Units 6.2-6.6's own Stage 3-6 additions below, and has not
been re-confirmed against the DB-gated suite since; none of those units'
own modules touches persistence, so this is not expected to change that
count). **Unit 6.1 added 44 (1436 non-DB tests without those two
variables set), Unit 6.2 Stages 3-6 added 64 more (1503), Unit 6.3 Stages
3-6 added 57 more (1563), Unit 6.4 Stages 3-6 added 50 more (1616), Unit
6.5 Stages 3-6 added 61 more (1680), and Unit 6.6 Stages 3-6 added 64 more
(1744 non-DB tests pass without those two variables set, confirmed
2026-08-13 in this session)**, lint and
typecheck clean on every file this session touched, build clean
(re-confirmed this session). `markdownlint-cli2` (no project config
found, run with its own defaults) flags `MD013` line-length on this
module's own table-heavy `README.md`/validation-record lines -- the same
default-config behavior an already-released sibling
(`rack-pinion-motor-sizing@0.1.0`'s own README/validation record) already
trips, confirmed by running it directly; not a regression, not fixed
(pre-existing pattern, not this unit's own gap to close).

**A real, non-code breakage found and fixed this session:** the 34
`reference/source-material/Image*.jpg` files backing the ID39/ID42 axis
fixtures were moved into a new `reference/source-material/ball screw/`
subfolder outside this session's own edits (a reference-material
reorganization), which broke all 8 of
`tests/fixtures/axes/evidence-integrity.test.ts`'s own SHA-256 checks with
`ENOENT`. Verified this session that every one of the 8 recorded hashes
still matches the moved file byte for byte — a **pure move**, no evidence
was modified — and updated each fixture's own `rawMaterialPath` to the new
location. The evidence-integrity guarantee itself is unchanged and the
test passes again (13/13).
**2026-08-24: the stale `.worktrees/unit-4-1-release/` checkout and its
lint-ignore gap are both closed.** The worktree (a superseded branch from
the 2026-08-11 Unit 4.1 release session; confirmed this session, again,
still fully incorporated into `main` and not an ancestor of it, and clean
of any uncommitted work) is removed via `git worktree remove`, and its now-
orphaned local branch deleted. `eslint.config.mjs`'s own global-ignore
patterns (`.next/**`, `out/**`, `build/**`) are now `**/.next/**`,
`**/out/**`, `**/build/**` — flat-config glob semantics only match a bare
`".next/**"` at the config root, not nested under e.g.
`.worktrees/*/.next/**` or `.claude/worktrees/*/.next/**`, which is why a
bare `npm run lint` from the repo root previously walked into that stale
worktree's own build artifact. `npm run lint` (0 errors) and `tsc --noEmit`
(clean) both confirm the fix from the repo root.
(`/workspace/bom` and `/workspace/report` -- this codebase's first two
Route Handlers, both still present). `format:check` flags ~212
pre-existing files repo-wide on this machine (CRLF line endings from a
Windows checkout vs. Prettier's default `endOfLine: "lf"` — see Environment
notes), not the small fixed set an earlier session's own note named; every
file touched by this or a prior session is formatted and not among them.
`npm audit` clean (0 vulnerabilities across the full tree, prod and dev --
see Unit 5.5 below for the 2026-08-11 fix). Parameter registry at `1.14.0`
(Unit 6.2 Stage 2 released the `motor_sizing.ball_screw.*` group
2026-08-12; Unit 6.3 Stage 2 released the `motor_sizing.
direct_drive_conveyor.*` group 2026-08-13; Unit 6.4 Stage 2 released the
`motor_sizing.rack_pinion.*` group 2026-08-13; Unit 6.5 Stage 2 released
the `motor_sizing.belt_pulley.*` group 2026-08-13, consumed by
`belt-pulley-drive-motor-sizing@0.1.0`, released the same day; Unit 6.6
Stage 2 released the `motor_sizing.index_table.*` group 2026-08-13,
consumed by `index-table-motor-sizing@0.1.0`, released the same day;
`1.14.0` released 2026-08-18 for the 8 new `motor_sizing.belt_pulley.*`
ports `belt-pulley-drive-motor-sizing@0.2.0` consumes -- see Active
work).

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

Unit 4.2 — `motion-profile`. **Released and complete (2026-08-12).**

Stages 1-4 done (2026-08-07 through 2026-08-09), drafted in parallel with
Unit 4.1's evidence wait per the roadmap's parallel-work allowance. Stage 1
spec: `context/modules/motion-profile/stage-1-spec.md` (ABB AN00115;
Oriental Motor's H-18/H-28 selection-calculations chapter). Stage 2
(registry `1.2.0`) resolved 2026-08-07: `context/modules/motion-profile/
stage-2-contract.md` — owns a cycle-level RMS *acceleration* output only
(not velocity or torque); multi-segment outputs are cycle-level aggregates
only; a bounded max of 5 moves per cycle (a founder-made scope decision, not
evidence-backed). Stage 3: a full `ModulePackage` in `lib/modules/
motion-profile/0.1.0/` (see that directory's `README.md`). Stage 4
(validation) resolved 2026-08-09: `validation/motion-profile/0.1.0.md` —
three published reference examples from two independent manufacturers (ABB,
Oriental Motor) across three independent scenarios (a stale spec citation
was corrected in the process — see the module README's "Stage 4 evidence"
section), plus the pre-existing Oriental Motor general-method independent
benchmark; solo-validation reviewer-substitute policy. The cycle-level RMS
acceleration output has no published example or independent benchmark — a
documented, honest gap, recorded in `validation.ts`'s `supportedUseLimits`,
not a release blocker.

**Stage 6 (release) done 2026-08-12.** `index.ts` (renamed from the earlier
draft `package.ts`) assembles the same manifest, ports, compute, UI, report,
and validation record `sealModulePackage` already sealed, so `npm run
registry:generate` now discovers it: the module is registered as
`motion-profile@0.1.0` in `lib/modules/registry.generated.ts`.
`package.test.ts` pins the source-immutability hash (`npm run
module:source-hash -- motion-profile 0.1.0` → `078276191ea6b98f`) and
asserts both `import-boundary` and `source-immutability` pass as real
checks, not skipped — the same conformance rigor `axis-load-cases@0.1.0`
established. `validation.ts`'s `reviewer`/`reviewDate` are finalized ("Solo
validation — Oriental Motor independent-benchmark substitute", `2026-08-12`)
reusing the pre-existing `oriental-motor-benchmark.ts` comparison — no new
evidence was needed at Stage 6, since Stage 4 had already closed both
evidence gaps. Cross-module link compatibility (tested from the consuming
side, `drive-train 0.1.0`'s own `cross-module-links.test.ts`, Unit 4.7) and
guided-workflow integration (`manifest.workflowRoles` declares
`"linear-axis.motion"`, Unit 4.8, exercised by
`lib/workflows/linear-axis/1.0.0/definition.test.ts` and
`integration.test.ts`) were already done. Sealed package content hash:
`e9ee7e63b1b17999`. Full validation record:
`validation/motion-profile/0.1.0.md`. Design record: this module's own
`README.md` "Stage 6 (release, 2026-08-12)".

Unit 4.3 — `ball-screw`. **Released and complete (2026-08-12).**

Stages 1-5 done (2026-08-08 through 2026-08-09; Stage 5 as far as
applicable pre-Unit-4.8), drafted in parallel with Unit 4.1's evidence
wait. Stage 1 spec: `context/modules/ball-screw/stage-1-spec.md` —
lead/speed, drive torque, equivalent dynamic load, nominal life, buckling,
critical speed, static safety factor, sourced from Rockford Ball Screw, WY
Ball Screw, Steinmeyer, Oriental Motor, and THK (via a third-party mirror —
`tech.thk.com` itself is blocked in this environment, see Environment
notes). Stage 2 (registry `1.3.0`) resolved 2026-08-08:
`context/modules/ball-screw/stage-2-contract.md` — the static safety
factor minimum and buckling safety margin are required module inputs with
no built-in default, since no source met this project's evidence bar for
either. Stage 3: a full `ModulePackage` in `lib/modules/ball-screw/0.1.0/`.
Stage 4 (validation) resolved 2026-08-09: `validation/ball-screw/0.1.0.md`
— six reference examples from two independent manufacturers (Rockford,
THK; two shared scenarios, not six independent ones), three
independent-benchmark comparisons (`thk-benchmark.ts`), solo-validation
reviewer-substitute policy. Two real discrepancies remain open, not
resolved: a three-way buckling/critical-speed calibration-constant
disagreement (Rockford/Steinmeyer/THK), and an equivalent-dynamic-load
methodology disagreement (this module's Steinmeyer-based single formula
vs. THK's own bidirectional-duty-cycle method, ~26% apart on THK's own
scenario — see `thk-benchmark.ts`'s `resolveThkDirectionalEquivalentLoad`)
— both recorded as documented deviations, not release blockers. Stage 5:
cross-module link compatibility against `axis-load-cases` is tested and
passing (`cross-module-links.test.ts`, the first per-module-pair link test
in this codebase); workflow role integration is done (2026-08-10) —
`manifest.workflowRoles` declares `"linear-axis.screw"`, matching
`linear-axis@1`'s own role of that ID (Unit 4.8), asserted in this
module's own `cross-module-links.test.ts` and exercised by
`lib/workflows/linear-axis/1.0.0/integration.test.ts`.

**Stage 6 (release) done 2026-08-12.** `index.ts` (renamed from the
earlier draft `package.ts`) assembles the same manifest, ports, compute,
UI, report, and validation record `sealModulePackage` already sealed, so
`npm run registry:generate` now discovers it: the module is registered as
`ball-screw@0.1.0` in `lib/modules/registry.generated.ts`.
`package.test.ts` pins the source-immutability hash (`npm run
module:source-hash -- ball-screw 0.1.0` → `347ace63740b27fd`) and asserts
both `import-boundary` and `source-immutability` pass as real checks, not
skipped. `validation.ts`'s `reviewer`/`reviewDate` are finalized ("Solo
validation — THK independent-benchmark substitute", `2026-08-12`), reusing
the pre-existing `thk-benchmark.ts` independent benchmark — no new
evidence was needed at Stage 6, since Stage 4 had already closed the
evidence gaps that could be closed (the two deviations above remain open
by design, not by omission). Sealed package content hash:
`f7be928d5e79f7df`. **This module's own generic Module Definition of Done
is complete, but the implementation map's own Unit 4.3 Gate ("Validate
horizontal, vertical, long-stroke, and high-speed cases") is a separate,
still-open Phase 1B / Unit 5.4 milestone-level requirement** — no
historical machine project's own case has been run through this module
(unlike `axis-load-cases`' ID39/ID42); see
`context/implementation-map.md` Unit 4.3 "Gate" and
`context/roadmap.md` Phase 1B for the precise distinction. Full validation
record: `validation/ball-screw/0.1.0.md`. Design record: this module's own
`README.md` "Stage 6 (release, 2026-08-12)".

Unit 4.4 — `linear-guide`. **Released and complete (2026-08-12).**

Stages 1-3 done 2026-08-09, drafted under the
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
solo-validation reviewer-substitute policy became invokable — this module's
own Stage 4 gate cleared. Stage 5's cross-module link compatibility against
`axis-load-cases` (`cross-module-links.test.ts`) and workflow role
integration (`"linear-axis.guide"`, Unit 4.8) were both done 2026-08-10.

**Stage 6 (release) done 2026-08-12.** `index.ts` (renamed from the
earlier draft `package.ts`) assembles the same manifest, ports, compute,
UI, report, and validation record `sealModulePackage` already sealed, so
`npm run registry:generate` now discovers it: the module is registered as
`linear-guide@0.1.0` in `lib/modules/registry.generated.ts`.
`package.test.ts` pins the source-immutability hash (`npm run
module:source-hash -- linear-guide 0.1.0` → `e47c2933546e88ed`) and
asserts both `import-boundary` and `source-immutability` pass as real
checks, not skipped. `validation.ts`'s `reviewer`/`reviewDate` are
finalized ("Solo validation — IKO independent-benchmark substitute",
`2026-08-12`), reusing the pre-existing `iko-benchmark.ts` independent
benchmark — no new evidence was needed at Stage 6. Sealed package content
hash: `fa3b112829175ce2`. Full validation record:
`validation/linear-guide/0.1.0.md`. Design record: this module's own
`README.md` "Stage 6 (release, 2026-08-12)".

Unit 4.5 — `coupling`. **Released and complete (2026-08-12).**

Stages 1-3 done 2026-08-09, drafted in the
roadmap's Phase 1B order once `linear-guide` was done through Stage 4.
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
the solo-validation reviewer-substitute policy.

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
pass conformance (`package.test.ts`'s `package-validation` check). Workflow
role integration is done (2026-08-10) — `manifest.workflowRoles` declares
`"linear-axis.coupling"` (`linear-axis@1`'s own role of that ID has
cardinality 0-1, resolved the same day: the founder confirmed direct-drive
axes are a real configuration, so it stays optional — see
`context/adr/0007-workflow-definition-contract.md` "Consequences"),
asserted in this module's own `cross-module-links.test.ts`.

**Stage 6 (release) done 2026-08-12.** `index.ts` (renamed from the earlier
draft `package.ts`) assembles the same manifest, ports, compute, UI,
report, and validation record into a single `ModulePackage` and seals it,
so `npm run registry:generate` now discovers it: the module is registered
as `coupling@0.1.0` in `lib/modules/registry.generated.ts`.
`package.test.ts` pins the source-immutability hash (`npm run
module:source-hash -- coupling 0.1.0` → `ff50ba8e7b2c6a6c`) and asserts
both `import-boundary` and `source-immutability` pass as real checks, not
skipped. `validation.ts`'s `reviewer`/`reviewDate` are finalized ("Solo
validation — KTR DIN 740 Part II independent-benchmark substitute",
`2026-08-12`), reusing the pre-existing `ktr-din740-benchmark.ts`
independent benchmark — no new evidence was needed at Stage 6, since Stage 4
had already closed both evidence gaps. Sealed package content hash:
`4e6ef500bad5ddda`. Full validation record: `validation/coupling/0.1.0.md`.
Design record: this module's own `README.md` "Stage 6 (release,
2026-08-12)".

Unit 4.6 — `support-bearing`. **Released and complete (2026-08-12).**

Stages 1-3 done 2026-08-09 through 2026-08-10, drafted in the roadmap's
Phase 1B order once `coupling`'s own Stage 4 evidence was as complete as it
could get without new sources. Stage 1 spec:
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
solo-validation reviewer-substitute policy.

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
conformance. Workflow role integration is done (2026-08-10) —
`manifest.workflowRoles` declares `"linear-axis.bearing"` (`linear-axis@1`'s
own role of that ID has cardinality 1-2, since a fixed+supported
arrangement needs two instances of this module), asserted in this module's
own `cross-module-links.test.ts`.

**Stage 6 (release) done 2026-08-12.** `index.ts` (renamed from the earlier
draft `package.ts`) assembles the same manifest, ports, compute, UI,
report, and validation record into a single `ModulePackage` and seals it,
so `npm run registry:generate` now discovers it: the module is registered
as `support-bearing@0.1.0` in `lib/modules/registry.generated.ts`.
`package.test.ts` pins the source-immutability hash (`npm run
module:source-hash -- support-bearing 0.1.0` → `7abf25cd378683a7`) and
asserts both `import-boundary` and `source-immutability` pass as real
checks, not skipped. `validation.ts`'s `reviewer`/`reviewDate` are
finalized ("Solo validation — NSK fh/fn independent-benchmark substitute",
`2026-08-12`), reusing the pre-existing `nsk-fh-benchmark.ts` independent
benchmark — no new evidence was needed at Stage 6. **This release also
closed two real documentation gaps left over from Stage 4/5, not carried
forward:** `validation/support-bearing/0.1.0.md` did not exist before this
release (every other released module already had one; this one was never
written when Stage 4 closed 2026-08-10) — it is now written, and its four
reference-example entries split each of NSK's two worked examples into a
dynamic-equivalent-load checkpoint and a nominal-life checkpoint (the same
per-checkpoint granularity `linear-guide`'s own PMI Chapter 9 reference
examples use), so the roadmap's own "at least three published reference
examples" item is met explicitly rather than left ambiguous at two entries.
`validation/source-index.md` also had zero rows for this module's three
sources until this release; three rows are now added. Sealed package
content hash: `1ac6c8a7d38cce69`. Full validation record:
`validation/support-bearing/0.1.0.md`. Design record: this module's own
`README.md` "Stage 6 (release, 2026-08-12)".

Unit 4.7 — `drive-train` (servo motor, gearbox, drive/amplifier, holding
brake, regenerative resistor). **Released and complete (2026-08-12) — the
seventh and last Milestone 4 module.**

Stage 1 drafted 2026-08-10, next in the roadmap's own order once every
Phase 1B module (`ball-screw`, `linear-guide`, `coupling`,
`support-bearing`) was done through Stage 5 — this began Phase 1C, under
the same parallel-specification allowance already used for Units 4.2-4.6.
Stage 1 spec:
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
reviewer-substitute policy is now invoked.

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
check). Workflow role integration is done (2026-08-10) —
`manifest.workflowRoles` declares `"linear-axis.drive"`, matching
`linear-axis@1`'s own role of that ID, asserted in this module's own
`cross-module-links.test.ts`.

**Stage 6 (release) done 2026-08-12.** `index.ts` (renamed from the earlier
draft `package.ts`) assembles the same manifest, ports, compute, UI,
report, and validation record into a single `ModulePackage` and seals it,
so `npm run registry:generate` now discovers it: the module is registered
as `drive-train@0.1.0` in `lib/modules/registry.generated.ts`.
`package.test.ts` pins the source-immutability hash (`npm run
module:source-hash -- drive-train 0.1.0` → `3afd6ea257966494`) and asserts
both `import-boundary` and `source-immutability` pass as real checks, not
skipped. `validation.ts`'s `reviewer`/`reviewDate` are finalized ("Solo
validation — closed-cycle-benchmark independent-benchmark substitute",
`2026-08-12`), reusing the pre-existing `closed-cycle-benchmark.ts`
independent benchmark — no new evidence was needed at Stage 6. As with
`support-bearing`, `validation/drive-train/0.1.0.md` and its
`validation/source-index.md` rows did not exist before this release even
though Stage 4 closed 2026-08-10 — both written now, closing the same
documentation gap a second time. `context/implementation-map.md`'s own
Unit 4.5, 4.6, and 4.7 "Gate" sections had also never been annotated with
their release status (unlike Units 4.1-4.4's own, which were updated as
each released) — all three now record their actual, honestly-assessed gate
status (`coupling`'s "transparent rejection reasons" half is unmet by a
published example; `drive-train`'s own brake/drive/regeneration items are
open scope gaps, not release blockers). `context/roadmap.md`'s Phase 1C
gate is updated the same way. Sealed package content hash:
`7a5e2cf96a9c2fcb`. Full validation record: `validation/drive-train/0.1.0.md`.
Design record: this module's own `README.md` "Stage 6 (release,
2026-08-12)".

**All seven Milestone 4 modules are now released and registered**
(`axis-load-cases@0.1.0`, `motion-profile@0.1.0`, `ball-screw@0.1.0`,
`linear-guide@0.1.0`, `coupling@0.1.0`, `support-bearing@0.1.0`,
`drive-train@0.1.0`) — every `linear-axis@1` role has a real registered
module, and Unit 5.4 (end-to-end MVP validation) is unblocked. See "Next
up" below.

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
2026-08-11, Units 4.2, 4.3, and 4.4 as `motion-profile@0.1.0`,
`ball-screw@0.1.0`, and `linear-guide@0.1.0` all 2026-08-12**, so four of
the seven roles (`linear-axis.axis`, `linear-axis.motion`,
`linear-axis.screw`, `linear-axis.guide`) now have a real registered
module (`lib/modules/registry.generated.ts`); the other three are still
unregistered (`package.ts`, not `index.ts`, on every one) pending their
own Stage 6.

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
reported, not silently dropped. Attaching or running all seven of
`linear-axis@1`'s own real modules through this wiring is no longer
blocked on any module's own registration (Units 4.1-4.7's own gates have
all since cleared -- `axis-load-cases@0.1.0`, `motion-profile@0.1.0`,
`ball-screw@0.1.0`, `linear-guide@0.1.0`, `coupling@0.1.0`,
`support-bearing@0.1.0`, and `drive-train@0.1.0` can now fill all seven
roles) -- this unit's own tests still prove the generic capability against
`example-workflow@1.0.0` rather than a re-run against `linear-axis@1`
itself, which is Unit 5.4 territory. Confirming a
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
2026-08-11 and Units 4.2-4.7's releases 2026-08-12 have since changed that
for all seven roles (`linear-axis.axis`/`axis-load-cases@0.1.0`,
`linear-axis.motion`/`motion-profile@0.1.0`,
`linear-axis.screw`/`ball-screw@0.1.0`,
`linear-axis.guide`/`linear-guide@0.1.0`,
`linear-axis.coupling`/`coupling@0.1.0`,
`linear-axis.bearing`/`support-bearing@0.1.0`,
`linear-axis.drive`/`drive-train@0.1.0`).

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
scope exception as Units 5.1-5.3. **Units 4.1 through 4.7's own release
gates all cleared by 2026-08-12** (`axis-load-cases@0.1.0`,
`motion-profile@0.1.0`, `ball-screw@0.1.0`, `linear-guide@0.1.0`,
`coupling@0.1.0`, `support-bearing@0.1.0`, and `drive-train@0.1.0` all
registered) -- **all seven Milestone 4 modules are now registered**, so a
real machine package can now include every module, and Unit 5.4 itself is
no longer blocked on any module's own Stage 6: all seven `linear-axis@1`
roles are filled by a registered module. See Unit 5.4 below for what it
actually needed next and what it now is.

Unit 5.4 -- `End-to-end MVP validation` (Milestone 5, Phase 1D). **Scenario
1 (horizontal linear axis) complete 2026-08-12.** Runs the complete, real
`linear-axis@1.0.0` guided workflow -- all eight role instances across the
seven Milestone 4 modules (`support-bearing` fills two, fixed + supported)
-- through the real application-service layer (the same services a UI
action calls: `startWorkflowInstance`, `addModuleInstance`,
`setParameterValue`, `confirmParameterLink`, `executeModuleInstance`,
`assignComponent`, `createBaseline`, `loadBomView`, `loadMachineReportView`)
against a live database, not a synthetic shortcut.
`lib/application/workflows/unit-5-4-scenario-1-horizontal-axis.test.ts`;
full evidence record `validation/unit-5.4/scenario-1-horizontal-axis.md`;
representative input data with per-field provenance
`tests/fixtures/unit-5-4-scenario-1/representative-inputs.ts`.

Real ID39 historical evidence drives `axis-load-cases` (reproduces `274 N`
peak / `8 N` normal within the same `±3 N`/`±1 N` tolerances the module's
own release regression already established) and, thinly, `motion-profile`
(the derived `move_1_distance`/`dwell_1_time` reproduce ID39's own stated
`cycleTime = 4.1 s` exactly). ID39 supplies **no** catalog data for
`ball-screw`, `linear-guide`, `coupling`, `support-bearing`, or
`drive-train` -- every one of those uses disclosed representative catalog
data, mostly reused from this project's own already-vetted manufacturer
reference-example files (PMI's Chapter 9 guide, R+W's own coupling example,
NSK's own bearing 6208 examples), with a couple of hand-verified
placeholders where no existing reference fit this scenario's own speed/
torque combination (the coupling's `allowable_speed`; the drive-train motor
entirely -- neither of that module's own existing reference motors, Omron's
real one included, supports this scenario's own ~6000 rpm operating speed
without a genuine sizing failure). Every field's provenance is tagged in
the fixture itself; the validation record's own "Disclosed Limitations"
section states plainly that this is not one coherent real machine's own
BOM, only ID39's real axis-load physics validated against a workflow proven
capable of carrying a complete, checked part selection through to a BOM,
report, and reproducible baseline.

**A real, previously-undiscovered generic-engine defect was found and
disclosed, not hidden or silently patched.** Driving `motion-profile`
through the real database-backed `executeModuleInstance` path (the first
time any live-DB test in this codebase has done so) surfaced that
`move_{1..5}_*`/`dwell_{1..5}_*` ports all share one canonical parameter ID
each with no `loadCase` to disambiguate them (unlike `axis-load-cases`' own
per-case ports) -- `lib/db/repositories/graph-repository.ts`'s
`resolveModuleInputs` resolves a stored value by `(parameterId, loadCase)`
only, never by port key, so setting `move_1_distance` makes every other
move-index port sharing that parameter ID resolve to the same value too,
even when never set. This computed a `cycle_time` five times too large
(`20.5 s` instead of `4.1 s`) before being diagnosed. It is a real gap
affecting any live use of `motion-profile@0.1.0` with more than a trivial
single move through the actual application, not specific to this test --
see "Open decisions" below. Founder direction (2026-08-12): document and
route around it rather than block Unit 5.4 on a generic-engine fix. This
scenario's own test computes and persists `motion-profile`'s run directly
(bypassing only the buggy input-resolution step, not its compute path or
the reality of the persisted run), disclosed in the test file's own header
and the validation record.

**Scenarios 2 (vertical axis with brake/holding requirements) and 3
(long-stroke/high-speed axis) remain blocked on evidence**, the same wall
Unit 4.1 hit for months: ID42 (the only vertical fixture) has no
holding/brake case, and no long-stroke/high-speed project fixture exists at
all (see "Blocked" below, unchanged by this unit). Unit 5.4's own exit
criterion ("All Phase 1D gates in roadmap.md pass") is not met by Scenario
1 alone.

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
**Structured application logs done 2026-08-12.** `lib/logging/` (new —
`logger.ts`, `normalize-error.ts`, `index.ts`, both files' own test suites)
is a small, dependency-free structured logger: each call emits one JSON
line (`timestamp`, `level`, `message`, optional `context`) to
stdout/stderr via `console.info`/`warn`/`error`, for the deployment
platform's own log collector to ingest (ADR-0009: Vercel) — a real, if
narrow, gap this session found: the only two existing operational-error
call sites in the app (`lib/db/index.ts`'s `checkDatabaseHealth`, and any
unhandled exception thrown inside either Route Handler) either used a bare
unstructured `console.error` or had no server-side visibility at all
(`/workspace/bom` and `/workspace/report` had no top-level `try/catch`, so
a thrown error became Next's own default unstructured 500). Both are now
wired: `checkDatabaseHealth`'s existing `console.error` call is replaced
with `logger.error` (its own doc comment already established "the
underlying error is logged instead" as intentional design — Unit 0.4 — so
this is a format change, not a new decision), and both route handlers now
wrap their post-auth body in `try/catch`, logging the normalized error with
route/ID/user context and returning a generic
`{ error: { code: "internal_error", ... } }` 500 that never leaks the raw
message (`code-standards.md` "APIs": never expose a stack trace). New
`context/architecture.md` "`lib/logging/`" boundary section and
`code-standards.md` "Logging" section record the contract: operational
visibility only, distinct from `lib/audit`'s append-only *engineering*
event trail, and log only unexpected/unhandled failures at a boundary —
not every typed `{ ok: false }` domain result, which is an expected,
already user-facing outcome. 8 new tests (`lib/logging/logger.test.ts`,
`normalize-error.test.ts`, plus one new 500-path case in each route's own
`route.test.ts`); full suite 1625/1625 with `DATABASE_URL`. **Deliberately
not done in this pass, and not assumed:** wiring the same logger into the
16 Server Actions in `app/(workspace)/workspace/actions.ts` or into
individual `lib/application` use-case catch blocks — Next.js already
catches an unhandled Server Action throw and reports it server-side on its
own, so the two Route Handlers (which had no such safety net at all) were
the real, verified gap; broadening coverage further is real follow-up
work, not assumed-equivalent to what shipped here.

**The remaining six Unit 5.5 deliverables all done 2026-08-12, closing this
unit.**

- **Data export and account deletion path.** `lib/db/repositories/
  project-repository.ts`'s new `deleteUserAccount` deletes the caller's own
  `User` row; the schema's own `onDelete: Cascade` chain removes everything
  they own. The one non-`Cascade` edge in that subtree
  (`ComponentAssignment.calculationRun`, `onDelete: Restrict`) was a real,
  previously unverified risk — proven safe, not assumed, by a new live-DB
  test that attaches a real `ComponentAssignment` before deleting the
  account and confirms no foreign-key violation
  (`project-repository.test.ts`). `lib/application/account/` adds
  `exportAccountData` (walks every owned project/configuration to a JSON
  document, including every calculation run's own full stored snapshot)
  and `deleteAccount` (requires a server-revalidated confirmation phrase —
  the one irreversible write in the app). `/workspace/account/export`
  (Route Handler, JSON download) and `deleteAccountAction` (Server Action,
  redirects to a new public `/account-deleted` page) wire both in;
  `AccountSettingsDialog` (new, triggered from the app bar) is the UI —
  type-to-confirm, submit stays disabled until the phrase matches exactly.
- **Basic performance benchmark.** `scripts/perf-benchmark.script.test.ts`
  (`npm run perf:benchmark`) times the operations a real session waits on
  against a disposable live-DB fixture it creates and deletes itself:
  `executeModuleInstance` ~507ms, `loadWorkspaceView` ~322ms, `loadBomView`
  ~302ms, `loadMachineReportView` ~957ms, `exportAccountData` ~509ms (one
  run against the configured Neon database from this dev machine — a
  snapshot, not a committed performance budget). Lives as a `*.test.ts`
  file run through a dedicated `vitest.perf-benchmark.config.ts` rather
  than a standalone script: Node's native TypeScript execution cannot
  resolve this codebase's extensionless relative imports the way Vitest
  and Next.js both already do (confirmed directly,
  `ERR_MODULE_NOT_FOUND`), and adding a new dependency (e.g. `tsx`) for one
  script was rejected in favor of reusing proven tooling.
  `vitest.config.ts` now excludes `scripts/**` so this never runs as part
  of the normal `npm test`/`npm run verify`.
- **Error monitoring.** New `app/report-client-error.ts`
  (`reportClientErrorAction`, a Server Action) gets a client error
  boundary's caught error into the same structured `lib/logging` output
  every server-side failure already goes through — closing a real gap: the
  existing `app/(workspace)/error.tsx` only ever logged to the browser's
  own console, invisible to a production operator. Also added
  `app/global-error.tsx`, the root error boundary — this codebase had none
  before, so a failure above `app/(workspace)/error.tsx`'s own scope (e.g.
  in the root layout) fell through to Next's unstyled default page with no
  server-side record at all. Not a full third-party integration (no
  error-monitoring SaaS account/DSN available this session) — swapping
  `logger.error` for a real service's `captureException` later is a
  one-function change, not a redesign.
- **Backup and recovery procedure.**
  `context/adr/0010-backup-recovery-strategy.md`: use Neon's own
  point-in-time restore (confirmed directly against Neon's current docs —
  a rolling restore window from 6 hours on the Free plan up to 30 days on
  paid tiers, branch-based instant restore, no custom `pg_dump` cron
  built or needed) as the only backup mechanism, with a five-step written
  recovery procedure (identify timestamp, create a Neon restore branch,
  verify before promoting, promote/repoint `DATABASE_URL`, record the
  incident). Not yet rehearsed against a real database — no production
  Neon project exists yet (ADR-0009's own follow-on work) — recorded as a
  plan, not something this session could exercise end to end.
- **Security review.** A scoped review of this session's own new surface
  (account export/deletion, client error reporting, the structured
  logger, the two modified Route Handlers) against `code-standards.md`
  "Security" — ownership scoping, server-side confirmation revalidation,
  no data exposure across users, no injection surface. No high-confidence
  findings.

Verified after all six: lint 0 errors on every changed file (the
pre-existing `.worktrees/unit-4-1-release` stale-build-artifact lint noise
is unrelated, see Health above), typecheck 0 errors, full suite
**1642/1642 passing** with `DATABASE_URL`, build clean (`/account-deleted`
and `/workspace/account/export` both now listed alongside the existing
routes).

**Unit 5.5 is done. Milestone 5's own remaining open item is Unit 5.4
Scenarios 2/3, still blocked on evidence (see "Blocked" below) — unchanged
by this unit.**

Unit 6.1 -- `lib/engine/mechanics`, the shared rigid-body-physics package
(Milestone 6, Phase 1E, ADR-0011). **Built and released 2026-08-12** --
founder-directed follow-on to ADR-0011, the prerequisite every mechanism
module in the new family needs internally before its own Stage 3 can start
(ADR-0011 "Module shape" steps 2 and 4).

Generic, source-independent rigid-body dynamics only -- moment of inertia
for standard shapes (point mass, solid/hollow cylinder in both mass and
density forms, rectangular pillar, parallel-axis offset transfer, and a
linearly moving mass converted to an equivalent shaft-side inertia) and
`Ta = J*alpha` plus the angular-acceleration-from-speed-ramp conversion
that produces `alpha` from a motion profile's own ramp. Restated with the
same symbols and constants as Oriental Motor Co., Ltd.'s *Motor Sizing
Calculations* (`jp.oriental_motor.motor_sizing_calculations@web-2026-08-08`,
already a registered source for `ball-screw@0.1.0`; cached
`reference/source-material/Oriental_Motor Sizing Calculators.pdf`, pp. 2-3
and p. 5) -- but the underlying physics is ordinary rigid-body dynamics no
source disagrees on, the same "ordinary physics, not a sourced engineering
method" category `drive-train@0.1.0`'s own `resolveRegenEnergy` doc comment
already used for `E = J*omega^2/2`. This is why it is a shared
`lib/engine/mechanics/` package (exported from `lib/engine/index.ts`, the
same way `lib/engine/units` and `lib/engine/values` already are) rather than
reproduced per mechanism module the way ADR-0011's own "Reuse policy"
requires for mechanism-specific load-torque formulas.

Built as a Generic Platform Workflow unit
(`context/ai-workflow-rules.md`), not a New Module Workflow module: no
manifest, ports, or registry entry -- a plain TypeScript package two
directories below the module-package boundary, called from module math
kernels that already work in bare SI numbers (the same convention every
`lib/modules/*` `math.ts` uses), never a source of `EngineeringValue`
conversion itself. 44 tests (`inertia.test.ts`, `torque.test.ts`) cover
reference-value reproduction against the source's own printed formulas,
boundary/invalid-input rejection, algebraic identities (the density forms
proved identical to the mass forms; the offset-axis transfer composed with
the rectangular-pillar form reproducing the source's own printed composed
result; the linear-motion form matching the point-mass form at the implied
radius), dimensional-consistency scaling checks (mass-form shapes scale as
`mass*length^2`; density-form shapes scale as `length^5` at fixed density),
and a cross-check of `accelerationTorque` composed with
`angularAccelerationFromSpeedRamp` against the source's own rpm-packaged
form `Ta = J*N/(9.55*t1)` (agreement to the precision the source's own
rounded `9.55` constant allows). Only the rotation-axis (`Jx`) forms are
implemented -- the source also prints transverse-axis (`Jy`) forms nothing
in this codebase consumes yet, not built ahead of a consumer. Full design
record: `lib/engine/mechanics/README.md`.

`lint`, `typecheck`, the full test suite, and `build` all pass (see Health
above for the current count).

Unit 6.2 -- `ball-screw-motor-sizing` (Milestone 6, Phase 1E). **Stage 1
done (2026-08-12).** `context/modules/ball-screw-motor-sizing/
stage-1-spec.md` -- the recommended first mechanism module
(`context/implementation-map.md` Milestone 6 "Unit 6.2"), since its
physics is already validated end to end elsewhere in this codebase.
Reproduces (not imports) physics already released in `axis-load-cases@
0.1.0`, `ball-screw@0.1.0`, `motion-profile@0.1.0`, and `drive-train@
0.1.0`, and calls `lib/engine/mechanics` (Unit 6.1) directly for moment of
inertia and `Ta = J*alpha` -- the one genuinely shared piece, per ADR-0011
"Reuse policy". Scoped to one full point-to-point round trip (forward
move, optional return move, optional dwell), deliberately not
`motion-profile@0.1.0`'s own bounded-5-move sequence, to avoid inheriting
that module's own undiscovered-until-Unit-5.4 per-move-index port defect
(see "Open decisions" below). Computes effective (RMS) torque as a
genuine N-phase sum rather than reusing `drive-train@0.1.0`'s own
closed-form approximation -- the literal structural fix ADR-0011 exists
to make. Two reference-example sources identified, both already
registered and re-verified directly this session: Omron Corporation's own
worked example (re-read at its own primary pages, cross-checked by hand
against `lib/engine/mechanics`'s formulas -- e.g. its printed `JB=1.5e-4`,
`JW=1.63e-4 kg*m^2` reproduce exactly) and THK Co., Ltd.'s own two worked
examples, where the vertical one is the key validation target: this
module's own N-phase computation is expected to reproduce THK's own
printed `743 N*mm` effective torque, where `drive-train@0.1.0`'s own
closed-form approximation computes `~901 N*mm` (a ~21% overstatement
already disclosed in `validation/drive-train/0.1.0.md`).

**Stage 2 (parameter contract) done (2026-08-12).**
`context/modules/ball-screw-motor-sizing/stage-2-contract.md` -- registry
`1.9.0` releases the full `motor_sizing.ball_screw.*` group (29 new
parameters) and resolves all four questions Stage 1 left open: a
per-mechanism prefix, not a shared `motor_sizing.*` bucket; six distinct
`forward_*`/`return_*` motion-input parameter IDs plus one `dwell_time`
-- never an indexed shared-ID family, the specific fix for
`motion-profile@0.1.0`'s own `move_{1..5}_*` port-resolution defect (see
"Open decisions" below); true signed per-direction load/acceleration
torque, not `drive-train@0.1.0`'s own conservative summation; and two
`>= 1` safety factors (the inverse direction from `drive.rms_torque_
margin`/`drive.peak_torque_margin`'s own `<= 1` shape), since this module
takes no candidate motor's own rated/peak torque as an input. Reuses ten
already-released parameters directly (`motion.axis.orientation`/
`incline_angle`/`gravity`/`friction_coefficient`/`total_moving_mass`,
`screw.lead`/`gear_ratio`/`preload`/`internal_friction_coefficient`/
`mechanical_efficiency`); deliberately does not reuse `screw.minor_
diameter`, `screw.drive_torque`, `drive.reflected_load_inertia`, or any
`drive.*` margin/limit parameter, each for its own documented reason. No
new unit or dimension needed. `PARAMETER_REGISTRY_SUPPORTED_VERSIONS` now
includes `1.8.0` (the version `drive-train@0.1.0`'s own manifest pins),
following the same pattern that version's own release already
established. Full registry invariant suite (57 tests) passes against the
new group. **Stage 3 (compute and trace) done (2026-08-12).** Full `ModulePackage`
in `lib/modules/ball-screw-motor-sizing/0.1.0/` -- see that directory's
own `README.md`. `math.ts` reproduces physics from four already-released
modules and calls `lib/engine/mechanics` (Unit 6.1) directly; a genuine
N-phase `Trms = sqrt(sum(T_i^2*t_i)/sum(t_i))` computation replaces
`drive-train@0.1.0`'s own closed-form approximation -- the structural fix
ADR-0011 exists to make. Omron Corporation's own complete worked example
is reproduced twice (kernel-level in `math.test.ts`, and through the real
`executeModule` compute path in `package.test.ts`) -- every printed
intermediate figure (screw/load inertia `1.5e-4`/`1.63e-4 kg*m^2`, load
torque `7.8e-3 N*m`, speed `1800 rpm`, acceleration/momentary/effective
torque `0.165`/`0.173`/`0.0828 N*m`) reproduces within the source's own
rounding. 44 tests, all passing; conformance reports `package-validation`
and `import-boundary` as real passes, `source-immutability` as skipped
(Stage 6). No module registered (`package.ts`, not `index.ts`).

Two real gaps found while wiring the kernel, corrected directly in the
still-unconsumed registry `1.9.0` -- `forward_move_distance`'s and
`return_move_distance`'s own definitions now state the "forward = away
from gravity" direction convention explicitly (`context/modules/
ball-screw-motor-sizing/stage-2-contract.md` "Stage 3 corrections").

**Stage 4 (validation) done (2026-08-12).** THK Co., Ltd.'s own two worked
examples (`jp.thk.example_ball_screw_selection@technico-mirror-2026-08-10`,
read directly this session via `pdftotext -layout` against the registered
technico.com mirror -- physical PDF pages 449-467) are both reproduced
through `executeModule` (`thk-reference-examples.ts`/`.test.ts`): the
horizontal baseline within 1% on every figure including effective torque;
the vertical case within 1% on load torque, inertia, and momentary torque,
but `effective_torque` understates THK's own printed `743 N*mm` by ~29%
through the real compute path, because THK's own cycle has a real, nonzero
`658 N*mm` stationary holding torque this module's own dwell phase does not
model (an already-disclosed scope gap, now quantified). Isolated from that
gap, a kernel-level test feeding `resolveEffectiveTorque` THK's own seven
printed phases directly (including the `658 N*mm` term) reproduces THK's
own `743 N*mm` within 0.5% -- direct confirmation the N-phase Trms formula
itself, the actual ADR-0011 structural fix, is correct. **A suspected sign
bug in `resolveDriveForce` was investigated and ruled out, not fixed**:
THK's own printed torques are unsigned magnitudes; the module's own signed
gravity-flip-by-direction is the mathematically correct projection of the
same fixed-frame force balance `axis-load-cases@0.1.0`'s own
`resolveAxisLoadPhase` already uses, and `resolveMomentaryTorque`/
`resolveEffectiveTorque` are already sign-agnostic -- recorded in
`validation.ts` as a finding, not a deviation; no code changed. The
independent-benchmark item is also met (`independent-benchmark.test.ts`):
this module's own N-phase Trms agrees with `drive-train@0.1.0`'s own
closed-form `resolveEffectiveTorque` within 1% on the horizontal case and
diverges by ~21% on the vertical case, reproducing -- not just resembling
-- the exact gap `validation/drive-train/0.1.0.md` already discloses. Full
record: `lib/modules/ball-screw-motor-sizing/0.1.0/validation.ts`; design
narrative: that module's own `README.md` "Stage 4 (validation, done
2026-08-12)".

**Stage 5 (generic surfaces) done (2026-08-13).** Generic UI/report schema
were already built in Stage 3 and already pass `package-validation`
conformance -- no new work needed there. `manifest.workflowRoles` stays
`[]` (this module has no `linear-axis@1` role and no other guided workflow
exists for the `motor-sizing.*` family yet), now confirmed by a real test
rather than left as an unchecked comment. `cross-module-links.test.ts`'s
own exhaustive sweep (every input port against every output port of all
four reproduced-from modules, the real `evaluateLinkCompatibility`
evaluator) **found and corrected a real inaccuracy**: this module's own
prior "no port links" claim was false -- `axis-load-cases@0.1.0`'s own
resolved `total_moving_mass` output is genuinely link-compatible with this
module's own `total_moving_mass` input (both reuse the identical
`motion.axis.total_moving_mass` parameter ID), the *only* compatible pair
across the full sweep. Not a calculation-level dependency (ADR-0011's own
"reproduce, don't import" policy is unaffected) and nothing wires it today
(no workflow role exists to confirm it through) -- corrected in
`manifest.ts`'s own header comment and the module's own `README.md` rather
than left as a disproven blanket claim. Catalog adapter: not applicable
(ADR-0011 "Output scope" excludes motor catalog matching from this phase).
63 tests total in the module directory, all passing.

**Stage 6 (release) done (2026-08-13).** `index.ts` (renamed from
`package.ts`) assembles the same manifest, ports, compute, UI, report, and
validation record into a single `ModulePackage` and seals it, so `npm run
registry:generate` now discovers it: the module is registered as
`ball-screw-motor-sizing@0.1.0` in `lib/modules/registry.generated.ts` --
**the first module in the Motor Sizing Tool family (ADR-0011), and the
first Milestone 6 module released.** `package.test.ts` pins the
source-immutability hash (`npm run module:source-hash --
ball-screw-motor-sizing 0.1.0` -> `18c8f078d2b91c8a`) and asserts
`import-boundary` and `source-immutability` both pass as real checks, not
skipped. Sealed package content hash: `1246d12939032577`.
`validation/ball-screw-motor-sizing/0.1.0.md` and its three
`validation/source-index.md` rows were written the same day Stage 4
closed (2026-08-12), not deferred to Stage 6 the way `support-bearing@
0.1.0`'s and `drive-train@0.1.0`'s own records had to be. 64 tests total
in the module directory, all passing. Full validation record:
`validation/ball-screw-motor-sizing/0.1.0.md`; design record: this
module's own `README.md` "Stage 6 (release, done 2026-08-13)". **This
module's entire New Module Workflow (Stages 1-6) is now complete.**

Unit 6.3 — `direct-drive-conveyor-motor-sizing` (Milestone 6, Phase 1E).
**Stage 1 done (2026-08-13).** `context/modules/
direct-drive-conveyor-motor-sizing/stage-1-spec.md` — the founder's own
pick among ADR-0011's four remaining mechanisms (over `belt-pulley-drive`/
`rack-pinion`, both exploratory-only per this project's own
validation-case history, and `index-table`, blocked on a missing
load-torque source), because it closes a real, previously reported gap:
the founder's own Oriental Motor sizing tool has fixed mechanism templates
but no template for a conveyor with the motor directly on the drive-roller
shaft, and the founder has hit this on a real project. Two sources read
directly this session (Omron's own already-registered *Servo Motor
Selection* guide, pp. 7-9, not previously read past p. 6 for this
codebase's other modules' own narrower ball-screw scope; a newly
registered Oriental Motor General Catalog Technical Reference chapter,
`jp.oriental_motor.general_catalog_motor_fan_sizing`, pp. F-2 through
F-10) agree on the same conveyor inertia/load-torque formula shape and
reuse `lib/engine/mechanics` (Unit 6.1) directly, the same treatment
`ball-screw-motor-sizing@0.1.0` already established. Two real findings
narrow this module's own scope relative to that one: no source frames a
conveyor's own duty cycle as a repeating cycle needing an effective (RMS)
torque check (every source instead checks a single breakaway/acceleration
event's peak torque plus a continuous running torque), and the conveyor
formula's own friction coefficient (`mu = 0.3` in both worked examples) is
a materially different quantity from `motion.axis.friction_coefficient`'s
own `0.05` sliding-guide default, so it will need its own new parameter,
not a reuse. Two full worked numerical examples were found and hand-
verified this session in the newly registered catalog document (p. F-8, a
geared belt conveyor selecting a standard AC motor, fully reconciled; p.
F-9, a second geared conveyor selecting a brushless DC motor, with one
unresolved printed inertia figure not blocking Stage 2 — see the spec's
own "Evidence Gaps"); a third, lower-confidence blog example was also
found and registered. This module's own `0.1.0` scope fixes the gear
ratio at `i = 1` (direct drive) even though both fully-verified reference
examples are geared — the specific resolution path ADR-0011 itself
anticipated for this module ("treat i = 1 as a documented special case of
the geared-belt formula").

**Stage 2 (parameter contract) done (2026-08-13).**
`context/modules/direct-drive-conveyor-motor-sizing/stage-2-contract.md`
-- registry `1.10.0` releases the full `motor_sizing.direct_drive_
conveyor.*` group (20 new parameters, reusing only `motion.axis.gravity`).
Resolves all five items `stage-1-spec.md` "Stage 2 Entry Criteria" left
open, and two of them turned out narrower than Stage 1 itself proposed --
found while writing the contract, not assumed going in: no source for this
mechanism computes or needs a deceleration-phase or RMS-cycle torque
(every worked example checks a single breakaway/acceleration event only),
so `0.1.0`'s own motion input is one `acceleration_time` ramp to
`target_belt_speed`, not a full accelerate/run/decelerate cycle; and
because there is therefore only one computed torque figure, the module
uses a single combined `required_torque_safety_factor` (`>= 1`), not
`ball-screw-motor-sizing@0.1.0`'s own two separate RMS/momentary margins.
`belt_friction_coefficient` is confirmed genuinely new (not a reuse of
`motion.axis.friction_coefficient` -- a different physical interface,
`~0.3` typical versus `~0.05`, no upper cap). The gear ratio has no
parameter at all in `0.1.0`'s own schema, not one defaulted to `1` --
this module's own purpose is specifically the no-gearbox case.
`PARAMETER_REGISTRY_SUPPORTED_VERSIONS` now includes `1.9.0` (the version
`ball-screw-motor-sizing@0.1.0`'s own manifest pins), following the same
pattern every prior module's own Stage 2 already established.

**Stages 3-6 done (2026-08-13) — released and registered as
`direct-drive-conveyor-motor-sizing@0.1.0`, the second module in the Motor
Sizing Tool family.** A full `ModulePackage` exists in
`lib/modules/direct-drive-conveyor-motor-sizing/0.1.0/` (manifest, ports,
math kernel, compute, trace, checks, generic UI/report schema, validation
record — see that directory's own `README.md`). Self-contained per
ADR-0011 "Reuse policy" like `ball-screw-motor-sizing@0.1.0`, reproducing
Omron Corporation's and Oriental Motor Co., Ltd.'s own conveyor sizing
methods rather than importing them; the one genuine import is
`lib/engine/mechanics` (Unit 6.1) — this module is the first in the family
to reuse that package's own `angularAccelerationFromSpeedRamp` directly,
not just inertia/`Ta=J*alpha`.

**Two real findings came out of Stage 4, both disclosed rather than
worked around.** First: neither of Oriental Motor's own two conveyor
worked examples (General Catalog Technical Reference pp. F-8 "Belt and
Pully", p. F-9 "Conveyor" — the full 9-page document fetched and read
directly this session, resolving the p. F-9 evidence gap `stage-1-spec.md`
had left open) computes an acceleration-torque term at all — both derive
their own final required-torque figure from load (friction) torque alone.
This module's own already-released parameter contract (registry `1.10.0`)
nonetheless defines `acceleration_torque`/`momentary_torque`/
`required_torque`, mirroring the general `TM=(TL+Ta)*Sf` shape the
already-registered Oriental Motor web page states; the kernel computes
real figures for all three, but they are validated only at the formula
level (`Ta=J*alpha`, already independently confirmed by
`lib/engine/mechanics`' own `torque.test.ts` and by
`ball-screw-motor-sizing@0.1.0`'s own worked examples), not against either
conveyor-specific printed figure — a disclosed evidence gap, not a code
defect. Second: p. F-9's own printed belt+work inertia figure
(`Jm2=132 oz-in^2`) is internally inconsistent with its own adjacent
single-roller inertia figure (`Jm1=70.4 oz-in^2`) — it omits the same
lb-to-oz conversion factor `Jm1` correctly applies three lines earlier in
the same worked example. This module's own kernel implements the
physically correct formula and does not reproduce the printed `132`
figure; `load_torque` and the single-roller inertia term (both internally
consistent in the source) are still reproduced. `load_torque`, the full
on-shaft inertia sum, and operating speed from p. F-8 all reproduce within
the source's own printed rounding, through both a kernel-level test and
the real `executeModule` compute path.

**The independent-benchmark item is met via a property-based sweep, not
just the one hand-verified scenario.** `omron-independent-benchmark.ts`/
`.test.ts` reimplements Omron Corporation's own combined `JW=J1+J2+J3+J4`
inertia formula as a genuinely separate mm-based computation and confirms
algebraic identity with this module's own decomposed kernel across 200
random roller/belt/load scenarios (including unequal roller diameters), to
floating-point precision. The solo-validation reviewer-substitute policy
is invoked. An exhaustive cross-module-link sweep
(`cross-module-links.test.ts`, against all seven Milestone-4 modules plus
`ball-screw-motor-sizing@0.1.0`) confirms zero compatible pairs — unlike
`ball-screw-motor-sizing@0.1.0`'s own sweep, this module reuses only one
already-released parameter (`motion.axis.gravity`), so no incidental
overlap exists. `manifest.workflowRoles` stays `[]` (not part of
`linear-axis@1`; no other guided workflow exists for the `motor-sizing.*`
family yet). `index.ts` (renamed from `package.ts`) assembles and seals
the package; `npm run module:source-hash -- direct-drive-conveyor-motor-sizing
0.1.0` → `3fa1417cf144229a`, pinned in `package.test.ts`, with
`import-boundary` and `source-immutability` both passing as real checks.
57 tests total. Full validation record:
`validation/direct-drive-conveyor-motor-sizing/0.1.0.md`. Design record:
this module's own `README.md`.

### Unit 6.4 -- Rack-and-pinion motor sizing module

**Done and released, 2026-08-13 -- all six stages, same session.**
`rack-pinion-motor-sizing@0.1.0`, the third Motor Sizing Tool module.
Architecturally closer to `ball-screw-motor-sizing@0.1.0` than to the
conveyor module: the primary source
(`jp.oriental_motor.general_catalog_motor_fan_sizing`, p. F-3) prints the
ball-screw and rack-and-pinion force formulas identically, so this module
reuses `motion.axis.orientation/incline_angle/gravity/
friction_coefficient/total_moving_mass` directly -- the opposite reuse
conclusion from the conveyor's own deliberate non-reuse of
`friction_coefficient`, reached for the opposite, equally source-backed
reason. Registry `1.11.0` releases `motor_sizing.rack_pinion.*` (21
parameters); a second independent public source
(`us.andantex.modular_rack_pinion_system`, newly registered) corroborates
the same formula shape, hand-verified this session.

**A genuine, disclosed evidence gap: no publicly citable worked numerical
example exists for this mechanism** -- both public sources give the
formula only. Atlanta Drive Systems' own two worked numerical examples
(already on hand from Unit 4.1's own validation work, already registered
`access: "licensed"`) fill this gap as an internal-only benchmark, the
exact precedent `axis-load-cases@0.1.0` already set for this same
document: reproduced through `executeModule` within `0.01%` for both a
horizontal and a vertical scenario, reusing `axis-load-cases@0.1.0`'s own
already-tested `resolveAtlantaHorizontalForce`/
`resolveAtlantaVerticalForce` directly, never cited in `manifest.ts` or a
customer-facing trace. Unlike the conveyor module, orientation/incline are
supported (both Atlanta's and Andantex's own sources give a dedicated
vertical formula); like the conveyor module, motion is a single
accelerate-to-speed event, independently reconfirmed for this mechanism,
not assumed. Cross-module link sweep finds the same one incidental
compatible pair (`axis-load-cases@0.1.0`'s own `total_moving_mass`)
`ball-screw-motor-sizing@0.1.0`'s own sweep already found. 50 tests total.
Full validation record: `validation/rack-pinion-motor-sizing/0.1.0.md`.
Design record: this module's own `README.md`.

### Unit 6.5 -- Belt-pulley drive motor sizing module

**Done and released, 2026-08-13 -- all six stages, same session.**
`belt-pulley-drive-motor-sizing@0.1.0`, the fourth Motor Sizing Tool
module. Registry `1.12.0` releases `motor_sizing.belt_pulley.*` (24
parameters). Records:
`context/modules/belt-pulley-drive-motor-sizing/stage-1-spec.md`,
`stage-2-contract.md`.

**Central finding: three independent sources state the belt-drive and
rack-and-pinion equations as one combined set** (Oriental Motor's "Wire
Belt Mechanism, Rack and Pinion Mechanism"; AutomationDirect's "Belt Drive
(or Rack & Pinion) Equations"; Andantex corroborating). What justifies a
separate module, on read evidence rather than assumption: two pulleys
instead of one pinion, and a belt carrying its own translating mass. The
kernel (`lib/modules/belt-pulley-drive-motor-sizing/0.1.0/math.ts`)
reproduces `rack-pinion-motor-sizing@0.1.0`'s own force/load-torque shape
directly, adding `resolvePulleyInertia` (both pulleys, added directly --
no speed-ratio reduction, since the belt connects them without slip at one
shared diameter) and `resolveBeltInertia` (the belt's own translating
mass, defaulting to 0).

**A newly registered public source closes the gap Unit 6.4 could not.**
`us.automationdirect.sureservo_selection_appendix` carries a full,
publicly citable belt-drive worked example (pp. B-11-B-13) -- where
rack-pinion had to fall back on a licensed internal-only benchmark for
want of any public example.

**Stage 3/4 found the Stage 1 spec's own reproduction claim was too
broad -- a real, disclosed narrowing, not silently absorbed.** Only
`pulley_inertia` reproduces the source's own printed figure unconditionally
(it carries no efficiency term in either source's own convention, within
0.2%). Every other inertia output (`load_inertia`, `reflected_load_inertia`)
reproduces its own printed figure only once AutomationDirect's own disclosed
`1/e` convention (dividing the *carriage's* inertia by mechanical
efficiency -- the same convention this module's kernel deliberately does
NOT adopt, following Oriental Motor instead like every sibling) is
reapplied explicitly at the **test** level, within 0.1% -- proving the
underlying physics is correct and quantifying the exact expected gap
rather than hiding it. `load_torque`/`momentary_torque`/`required_torque`
are not reproduced at all (the efficiency-convention difference, compounded
by AutomationDirect's own confirmed arithmetic slip -- friction computed on
`100 lb` where its stated weight is `90 lb`, the third such source-internal
slip this project has found). **A further finding, genuinely new at Stage
3/4, not anticipated at Stage 1:** `acceleration_torque` and
`inertia_ratio` cannot be numerically checked against the source's own
printed `T_accel=0.46 lb-in`/`inertia ratio=9.6` figures at all -- the
source's own worked example never prints its own candidate motor's rotor
inertia as an independent figure, and back-solving it two different ways
from those two printed downstream figures disagrees by ~15-20%, most
plausibly compounding rounding in the source's own low-precision
intermediate results. Both compute end to end and are exercised by the
reference-example test, just not asserted against a printed value --
recorded honestly in `validation/belt-pulley-drive-motor-sizing/0.1.0.md`
as a disclosed evidence gap discovered this session, not a pre-existing
one carried forward.

**The independent-benchmark item** (`independent-benchmark.test.ts`)
reimplements Oriental Motor's own combined force/load-torque formula as a
structurally separate expression, proved algebraically identical to this
module's own two-function kernel across a 300-scenario deterministic
property sweep -- the solo-validation reviewer-substitute policy is
invoked. Cross-module link sweep against all seven Milestone-4 modules plus
all three prior Motor Sizing Tool modules finds the same one incidental
compatible pair (`axis-load-cases@0.1.0`'s own `total_moving_mass`) every
prior sweep already found. `index.ts` assembles and seals the package;
`npm run module:source-hash -- belt-pulley-drive-motor-sizing 0.1.0` →
`1f371cb2c7a12ab8`, pinned in `package.test.ts`. Sealed package content
hash: `4c920fac2f89e3f6`. 61 tests total, all passing. Full validation
record: `validation/belt-pulley-drive-motor-sizing/0.1.0.md`. Design
record: this module's own `README.md`.

### Unit 6.6 -- Index-table motor sizing module

**Done and released, 2026-08-13 -- all six stages, same session.**
`index-table-motor-sizing@0.1.0`, the fifth and last Motor Sizing Tool
module ADR-0011's own "Phase scope" named. Registry `1.13.0` releases
`motor_sizing.index_table.*` (18 parameters). Records:
`context/modules/index-table-motor-sizing/stage-1-spec.md`,
`stage-2-contract.md`.

**Genuinely different in kind from every prior Motor Sizing Tool module
-- confirmed by two sources read this session, not merely predicted by
ADR-0011.** An index table's own motion is rotary, commanded directly in
angle/time: no `motion.axis.*` reuse at all (the first Motor Sizing Tool
module with an entirely self-contained parameter group), no
linear-to-rotary radius conversion anywhere, and `load_torque` is a
required, engineer-supplied input with a `0 N*m` default rather than a
computed output. Both Oriental Motor's own General Catalog Technical
Reference (pp. F-8-F-9, "Frictional load is omitted because it is
negligible. Load torque is considered 0") and AutomationDirect's own
SureServo Selection Appendix (pp. B-14-B-16, `Trun = 0`, no formula given
at all) independently omit a load-torque formula for this mechanism --
the evidence gap ADR-0011's own "Phase scope" flagged in advance before
either source was read in full, now genuinely closed.

**A real unit-convention finding disclosed during this session's own
hand-verification, not previously known.** AutomationDirect's own worked
examples -- including the belt-drive example
`belt-pulley-drive-motor-sizing@0.1.0` already validated -- compute
acceleration torque with a rounded `0.1` constant standing in for the
exact `2*pi/60=0.10472` (confirmed against the same document's own
Example 7, which uses the unrounded form and reproduces its own printed
figure only that way). This module's own kernel uses exact physics
throughout, so its own torque outputs are systematically `~8%` higher
than this source's own printed index-table figures -- reapplying the
source's own rounded constant and its own further-rounded intermediate
values at the test level exactly reproduces its own printed figure,
proving the deviation is fully explained, not a defect. This same
rounding convention most likely also explains part of the residual
`belt-pulley-drive-motor-sizing@0.1.0`'s own validation record already
disclosed for its own AutomationDirect reference example -- noted here
for the record; that module's own release is immutable and was not
revisited or re-released.

**Two worked examples, one fully reproduced through `executeModule`, one
partially reproduced at the kernel level.** AutomationDirect's own
"Index Table - Example Calculations" (a 12 in diameter steel table, 6:1
gear reducer, indexing 45 deg in 0.5 s): table inertia, reflected
inertia, operating speed, and inertia ratio all reproduce within
0.3%-1%; torque figures reproduce only after the source's own disclosed
rounded-constant convention is reapplied. Oriental Motor's own richer
"Index Table -- Using Stepping Motors" example (a table plus 12 discrete
mounted workpieces at a fixed radius, parallel-axis theorem): its own
inertia and operating-speed figures reproduce within 0.2%-1.5% at the
kernel level (`lib/engine/mechanics`' own `pointMassInertia`/
`offsetAxisInertia`, already-released generic physics, reused directly
for the 12-workpiece sum); its own final torque figures use a
stepping-motor pulse-speed convention this module does not share and its
own source page is OCR-degraded past reliable hand-verification in this
environment -- a disclosed, out-of-scope gap, not reproduced.

**The independent-benchmark item** (`independent-benchmark.test.ts`)
reimplements this module's own full inertia-to-acceleration-torque chain
as a structurally separate expression, proved algebraically identical
across a 300-scenario property sweep -- the solo-validation
reviewer-substitute policy is invoked. **Cross-module link sweep against
all seven Milestone-4 modules plus all four prior Motor Sizing Tool
modules finds zero compatible pairs** -- the first Motor Sizing Tool
module's own sweep to find none at all, since this module reuses no
`motion.axis.*` or sibling `motor_sizing.*` parameter ID (confirmed by an
exhaustive sweep, not assumed). `index.ts` assembles and seals the
package; `npm run module:source-hash -- index-table-motor-sizing 0.1.0` →
`0e6bd7b721780cd5`, pinned in `package.test.ts`. Sealed package content
hash: `bdb83dd90479f8c3`. 61 tests total, all passing. Full validation
record: `validation/index-table-motor-sizing/0.1.0.md`. Design record:
this module's own `README.md`.

**All five Motor Sizing Tool family mechanism modules ADR-0011's own
"Phase scope" named are now released and registered**
(`ball-screw-motor-sizing@0.1.0`, `direct-drive-conveyor-motor-sizing@
0.1.0`, `rack-pinion-motor-sizing@0.1.0`,
`belt-pulley-drive-motor-sizing@0.1.0`, `index-table-motor-sizing@0.1.0`).
The only Phase 1E deliverable left open is the `AddModuleInstanceDialog`
category-filter/mechanism-picker UI work -- see "Next up" below.

**Module instance management (friendly default labels, rename, and
archive-based removal) shipped 2026-08-13**, per the approved design at
`docs/superpowers/specs/2026-08-13-module-instance-management-design.md`
and implementation plan at
`docs/superpowers/plans/2026-08-13-module-instance-management.md`. A new
nullable `ModuleInstance.archivedAt` column
(`prisma/migrations/20260813120000_module_instance_archive/`) marks an
instance archived without deleting it -- parameter values, links, and
calculation-run history are all left untouched, honoring the "calculation
runs ... are immutable" invariant (`CLAUDE.md`) literally. Repository
layer: `renameModuleInstance`/`archiveModuleInstance`
(`lib/db/repositories/project-repository.ts`) and
`listModuleInstancesLinkedFromSource`
(`lib/db/repositories/graph-repository.ts`), both ownership-scoped.
Application layer: `renameModuleInstanceLabel`, `archiveModuleInstance`,
and `previewArchiveModuleInstanceImpact`
(`lib/application/projects/manage-module-instances.ts`) -- the preview
reports what still links from an instance's outputs and whether it fills a
workflow role, shown before the founder confirms. Server Actions
(`renameModuleInstanceAction`, `archiveModuleInstanceAction`,
`previewArchiveModuleInstanceImpactAction`) and a new
`ArchiveModuleInstanceDialog` wire this into `MachineNavigator`'s own
module rows alongside the existing rename action; archived instances are
filtered out of the navigator tree and out of
`suggest-link-sources.ts`'s link-suggestion graph (neither offered as a
source nor a target for new links), without touching any already-confirmed
`ParameterLink`. `AddModuleInstanceDialog` now also prefills "Instance
label" with the selected mechanism's friendly name rather than leaving it
blank, until the founder types their own text. No module, parameter
registry, calculation run, or baseline was touched -- confirmed by diff
review, not assumed. Full verification (`npm run verify`) passes: lint and
typecheck clean on every file this work touched; `format:check` and
`lint`'s remaining flags are both the same pre-existing, already-documented
gaps below (CRLF-vs-LF repo-wide, and the stale
`.worktrees/unit-4-1-release/.next/dev/types/` artifact); the full test
suite passes (2015/2015, after re-running four tests that hit Neon
free-tier latency past Vitest's 5s default timeout with a longer one -- the
same documented flakiness pattern, not a regression); `npm run build`
succeeds. One real drift from the plan's own file list, found and fixed
during implementation: `lib/db/repositories/workflow-repository.ts` has its
own second, independent `ModuleInstanceRow`/`toModuleInstanceRecord`
mapper the plan did not anticipate, needing the same `archivedAt` field
added to typecheck clean.

**`belt-pulley-drive-motor-sizing@0.2.0` shipped 2026-08-18**, per the
approved design at `docs/superpowers/specs/2026-08-13-belt-pulley-drive-
motor-sizing-0.2.0-design.md` and implementation plan at
`docs/superpowers/plans/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0.md`
-- this project's first module-version bump (ADR-0011's own "follow-on
work" note: embed motion-profile math natively inside each mechanism
module rather than cross-module-linking it). `0.1.0` stays released,
registered, and untouched -- nothing in this release edits
`lib/modules/belt-pulley-drive-motor-sizing/0.1.0/`. `0.2.0` adds a native
repeating trapezoidal motion cycle (accelerate/run/decelerate/dwell,
entered velocity-first or distance-first via `motion_mode`) and two new
outputs, `deceleration_torque` (symmetric to `acceleration_torque`) and
`effective_torque` (Trms, continuous/thermal motor rating) --
`required_torque` stays governed by the acceleration phase alone,
`effective_torque` is additive. Parameter registry bumped to `1.14.0` for
the 8 new `motor_sizing.belt_pulley.*` ports this release adds. **A
disclosed, open evidence gap, not a defect:** Oriental Motor's own
effective-torque formula is stated generically for all motors, with no
belt/pulley-specific worked numerical example, so `effective_torque` is
validated only via an algebraic-identity independent benchmark (a
structurally separate direct per-phase reimplementation, plus a
deterministic property sweep) -- the missing published example stays open,
to be closed against a real project's own duty-cycle results later, never
a synthetic fixture. Full account: `validation/belt-pulley-drive-motor-
sizing/0.2.0.md`. Registered in `lib/modules/registry.generated.ts`;
`cross-module-links.test.ts` exhaustively sweeps compatibility against
`0.1.0` itself as a coexisting sibling version -- the first version-to-
version link sweep in this project. **Full verification (`npm run
verify`) run this session:** typecheck 0 errors repo-wide; lint 0 issues
on every file this plan touched (a bare repo-root `npm run lint` still
hits the already-documented stale
`.worktrees/unit-4-1-release/.next/dev/types/` artifact below --
confirmed unrelated by linting the 26 changed `.ts` files directly, 0
problems); `format:check`'s only flags among this plan's own 30 changed
files are pre-existing, not new -- `lib/modules/registry.generated.ts`
(the same CRLF-vs-LF pattern documented below), one already-unformatted
line in `lib/standards/engineering-sources.ts` that predates this plan's
own edit to that file (confirmed against the pre-Task-1 revision), and
`manifest.ts`/`README.md` (the same long-string-literal/hand-wrapped-prose
pattern every already-released sibling module's own `manifest.ts`/
`README.md` already exhibits -- e.g. `rack-pinion-motor-sizing@0.1.0`,
`direct-drive-conveyor-motor-sizing@0.1.0`, confirmed directly); the full
suite was 2074/2080 passing at the time (`DATABASE_URL`/`NODE_EXTRA_CA_CERTS`
set, `--testTimeout=30000`) -- the 6 failures were all in
`components/engineering/workspace-shell.test.tsx`, a real, pre-existing gap
from the prior module-instance-management release (its own `vi.mock` of
`@/app/(workspace)/workspace/actions` was never updated with
`renameModuleInstanceAction`, `archiveModuleInstanceAction`, or
`previewArchiveModuleInstanceImpactAction` -- all three now referenced by
`machine-navigator.tsx`/`archive-module-instance-dialog.tsx`), confirmed
unmodified by and unrelated to this plan -- last touched by commit
`a10c777`, predating this plan's own Task 1 (`ba8845b`); not fixed at the
time (out of scope for that release). **Fixed 2026-08-18** (a standalone
follow-up unit, test-only): the mock now declares all three actions
alongside the others; non-DB suite is 2080/2080 passing, lint/typecheck/
build all clean. `npm run build` succeeds. Changed-file scope confirmed by
`git diff --stat` against the commit before this plan's own Task 1
(`e2527d0`): exactly the 30 files this plan's own scope names, nothing
under `lib/modules/belt-pulley-drive-motor-sizing/0.1.0/`, any other
module's own directory, `lib/modules/motion-profile/`, or
`lib/modules/drive-train/`.

**Motor Sizing shared infrastructure shipped 2026-08-18**, per
`docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md`
and `docs/superpowers/plans/2026-08-18-motor-sizing-shared-infrastructure.md`
-- the prerequisite for a founder-directed consistency pass across all five
Motor Sizing Tool modules (gravity, motion-mode UI, inertia-ratio
defaults). Two additive pieces, neither touching any released module:
`disabledWhen` (`lib/engine/module-sdk` -- lets a UI field disable itself
when a named enum port matches a value, resolved server-side with no
client reactivity needed) and parameter registry `1.15.0` (five new
`*.inertia_ratio_recommended_maximum` parameters, one per mechanism, each
with a disclosed founder-directed default of 10 -- every existing
`*.inertia_ratio_maximum` stays required-no-default and untouched). Five
follow-on plans -- one per Motor Sizing module version bump -- consume
this: `ball-screw-motor-sizing`, `direct-drive-conveyor-motor-sizing`,
`rack-pinion-motor-sizing`, and `index-table-motor-sizing` each to
`0.2.0`, and `belt-pulley-drive-motor-sizing` (already at `0.2.0`) to
`0.3.0` -- not yet started.

**`ball-screw-motor-sizing@0.2.0` shipped 2026-08-19** — the first of the
five Motor Sizing module-version bumps the shared-infrastructure plan
above named as its own follow-on work
(`docs/superpowers/plans/2026-08-19-ball-screw-motor-sizing-0.2.0.md`).
Two changes, neither touching the underlying physics: gravity is no
longer an editable input (`math.ts` hardcodes `9.80665 m/s^2`, the exact
value the removed port's own registry default already supplied), and
`inertia_ratio_maximum` now resolves to the new founder-directed
recommended default of `10` (`motor_sizing.ball_screw.
inertia_ratio_recommended_maximum`, registry `1.15.0`) rather than a
required no-default value, with the check's own exceeded-case status
downgraded from `fail` to `warning` to match. Every `0.1.0` reference
example (Omron, THK horizontal, THK vertical) re-passes unchanged under
`0.2.0` — the regression proof the gravity hardcode is behavior-neutral.
`0.1.0` stays released, registered, and untouched
(`validation/ball-screw-motor-sizing/0.1.0.md`); `0.2.0`'s own addendum
record is `validation/ball-screw-motor-sizing/0.2.0.md`.

**`direct-drive-conveyor-motor-sizing@0.2.0` shipped 2026-08-19** — the
second of the five module-version bumps, same two changes, same pattern:
gravity hardcoded (`STANDARD_GRAVITY_M_PER_S2 = 9.80665` in `math.ts`,
`resolveFrictionForce`'s own former `gravityMps2` input), and
`inertia_ratio_maximum` repointed at `motor_sizing.direct_drive_conveyor.
inertia_ratio_recommended_maximum` (registry `1.15.0`, default `10`),
with the check's exceeded-case status downgraded from `fail` to
`warning`. Every `0.1.0` reference example (both Oriental Motor Co., Ltd.
worked examples, the Omron Corporation independent-benchmark property
sweep) re-passes unchanged under `0.2.0` — the regression proof. `0.1.0`
stays released, registered, and untouched
(`validation/direct-drive-conveyor-motor-sizing/0.1.0.md`); `0.2.0`'s own
addendum record is
`validation/direct-drive-conveyor-motor-sizing/0.2.0.md`. Full
`npx vitest run` (non-DB) confirmed 1961/1961 passing, `npm run
typecheck`/`build` both clean.

**`rack-pinion-motor-sizing@0.2.0` shipped 2026-08-19** — the third of the
five module-version bumps. Same two changes as the prior two, but this one
found a real, measured (not just theoretical) precision regression: unlike
every other consistency-pass module, `0.1.0`'s own
`atlanta-benchmark.test.ts` explicitly overrode this module's own
`gravity` port to Atlanta Drive Systems' own printed `g=9.81` convention
so its comparison against Atlanta's two worked examples would be exact
(0.01% tolerance). `0.2.0` removes the `gravity` port entirely (no
override possible), so the real SI (`9.80665`) vs. Atlanta (`9.81`) gap
now shows up in that comparison -- measured directly at ~0.0079%
(horizontal example) and ~0.0203% (vertical example, where weight is
100% of the load-torque force since friction vanishes). Both are
disclosed by exact measured value in the test's own titles and in
`validation/rack-pinion-motor-sizing/0.2.0.md`; tolerance loosened from
0.01% to 0.03% with margin, not silently widened without explanation.
`inertia_ratio_maximum` repointed at `motor_sizing.rack_pinion.
inertia_ratio_recommended_maximum` (registry `1.15.0`, default `10`), check
downgraded `fail` -> `warning`, same as the other modules. `0.1.0` stays
released, registered, and untouched
(`validation/rack-pinion-motor-sizing/0.1.0.md`); `0.2.0`'s own addendum
record is `validation/rack-pinion-motor-sizing/0.2.0.md`. Full `npx
vitest run` (non-DB) confirmed 2015/2015 passing, `npm run
typecheck`/`build` both clean. Two more follow-on plans remain, not yet
started: `index-table-motor-sizing` `0.1.0` -> `0.2.0` (inertia-ratio
change only — it has no `gravity` port to drop), and
`belt-pulley-drive-motor-sizing` `0.2.0` -> `0.3.0` (the only one of the
five also wiring `disabledWhen`).

**`index-table-motor-sizing@0.2.0` shipped 2026-08-19** — the fourth of
the five module-version bumps, and the simplest: this mechanism has no
`gravity` port to begin with (zero `motion.axis.*` reuse, this project's
only Motor Sizing module with that property), so the only change is
`inertia_ratio_maximum` repointed at `motor_sizing.index_table.
inertia_ratio_recommended_maximum` (registry `1.15.0`, default `10`), with
the check's exceeded-case status downgraded from `fail` to `warning`. The
`R_Jmax` trace row's own `ref` is repointed at the same new parameter, so
the trace's source citation still matches what the value actually resolves
from. Every `0.1.0` reference example (AutomationDirect inertia/speed and
its own disclosed torque deviation, Oriental Motor partial inertia/speed)
re-passes unchanged under `0.2.0` — the regression proof. `0.1.0` stays
released, registered, and untouched
(`validation/index-table-motor-sizing/0.1.0.md`); `0.2.0`'s own addendum
record is `validation/index-table-motor-sizing/0.2.0.md`. Full `npx
vitest run` (non-DB) confirmed 2080/2080 passing (one
`add-module-instance-dialog.test.tsx` failure seen on the first full-suite
run was the same pre-existing test-order flakiness pattern already
documented elsewhere in this file, not a regression — it passed in
isolation and on a clean re-run of the full suite), `npm run
typecheck`/`build` both clean.

**`belt-pulley-drive-motor-sizing@0.3.0` shipped 2026-08-19** — the fifth
and last of the five module-version bumps, and the only one carrying all
three consistency-pass changes at once: gravity is now hardcoded
(`STANDARD_GRAVITY_M_PER_S2 = 9.80665` in `math.ts`), `inertia_ratio_maximum`
repoints at `motor_sizing.belt_pulley.inertia_ratio_recommended_maximum`
(registry `1.15.0`, default `10`, check downgraded `fail` -> `warning`),
and `ui.ts` wires the shared `disabledWhen` UI capability on the four
motion-mode-dependent fields (`target_velocity`/`constant_velocity_time`
disable when `motion_mode` is `"distance"`; `travel_distance`/`cycle_time`
disable when `motion_mode` is `"velocity"`) — this module is the design's
own only `disabledWhen` consumer. A real, session-specific finding not
present in any of the four prior module-version bumps:
`independent-benchmark.test.ts` calls this module's own `resolveDriveForce`
directly (not just through `executeModule`), so it needed the same
`gravityMps2` field drop `math.test.ts` needed — caught by reading the
file directly, not assumed from the sibling plans' own pattern. A second
real finding, not anticipated by the implementation plan itself: adding
`0.2.0` as an upstream candidate in `cross-module-links.test.ts` (the same
treatment `0.2.0`'s own file already gave `0.1.0`) surfaced four genuinely
new compatible pairs — `0.2.0`'s own dual-role motion outputs
(`target_velocity`, `travel_distance`, `constant_velocity_time`,
`cycle_time`, added by `0.2.0`'s own motion-cycle work, untouched here)
share identical parameter IDs with `0.3.0`'s own same-named inputs, the
same category of real incidental compatibility as the pre-existing
`axis-load-cases.total_moving_mass` pair — disclosed in
`KNOWN_COMPATIBLE_PAIRS` with a confirming test, not suppressed. Every
`0.2.0` reference example (AutomationDirect pulley-inertia, load/reflected
-inertia with its own disclosed 1/e adjustment, symmetric-deceleration-
torque internal-consistency check) re-passes unchanged under `0.3.0` — the
regression proof; none ever set `gravity` explicitly or exceeded the
inertia ratio. `0.1.0` and `0.2.0` both stay released, registered, and
untouched (`validation/belt-pulley-drive-motor-sizing/0.1.0.md`,
`validation/belt-pulley-drive-motor-sizing/0.2.0.md`); `0.3.0`'s own
addendum record is `validation/belt-pulley-drive-motor-sizing/0.3.0.md`.
Full `npx vitest run` (non-DB) confirmed 2151/2151 passing, `npm run
typecheck`/`build` both clean; a bare repo-root `npm run lint` still flags
only the already-documented, pre-existing stale
`.worktrees/unit-4-1-release/.next/dev/types/` artifact (confirmed
unrelated by linting the files this release touched directly — 0
problems). **This completes the five-module Motor Sizing Tool consistency
pass** (`docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md`)
— every mechanism module now consumes parameter registry `1.15.0`'s own
recommended inertia-ratio default, and the shared `disabledWhen` UI
capability has its one real consumer wired end to end.

**A real, non-blocking finding from this plan's own Task 13 review, not
fixed here:** `belt-pulley-drive-motor-sizing@0.2.0` is now visible in the
real "Add module instance" UI picker alongside `0.1.0`, with zero visual
distinction between the two versions --
`app/(workspace)/workspace/page.tsx`'s `modulePackageOptions()` filters
only by category, not by module id/version, and
`add-module-instance-dialog.tsx`'s own `MECHANISM_LABELS` map already
includes `belt-pulley-drive-motor-sizing`. This project has no
established convention yet for surfacing or hiding an in-progress or
superseding module version from the picker -- a real gap, not this
release's own scope to close.

Unit 7.1 — `pneumatic-cylinder`, the first Milestone 7 (Phase 2) module.
**Released and complete (2026-08-24).**

- Stage 1 (spec): **done as a draft (2026-08-24).**
  `context/modules/pneumatic-cylinder/stage-1-spec.md` — two sources read
  directly, Milwaukee Cylinder (US) and SMC Corporation (JP, via a local
  TLS/User-Agent fetch workaround, not a source-side block). Covers
  theoretical force, cushion kinetic energy (SMC's own formula and
  per-series allowable-energy tables), air consumption/required air
  volume, and piston-rod buckling. Two real, disclosed evidence gaps
  carried into Stage 2: the two sources disagree in formula *shape* (not
  just coefficients) on the force-sizing-margin method (SMC's `eta`
  load-factor multiplier vs. Milwaukee's load-type percentage method); and
  no source read this session gives a complete, pneumatic-manufacturer-
  sourced closed-form buckling formula.
- Stage 2 (parameter contract): **done (2026-08-24).**
  `context/modules/pneumatic-cylinder/stage-2-contract.md` — registry
  `1.16.0` releases the full `pneumatic.*` group (22 parameters) plus two
  new unit-registry dimensions (`volume`, `volumetricFlowRate`, needed for
  the reported air-consumption/required-air-volume outputs — a real gap in
  Stage 1's own "no unit-registry work expected" estimate). Both open Stage
  1 items resolved: the force-sizing-margin "disagreement" turns out to be
  two methods answering different questions, not one contested registry
  slot — SMC's `eta` becomes this module's own required-no-default sizing
  margin, while Milwaukee's load-type percentages are documented as
  upstream engineering guidance for arriving at the required-force inputs
  in the first place, never implemented as a module formula (the same
  "engineer already knows the load" treatment `coupling 0.1.0` gives
  `screw.drive_torque`). Buckling ships as a real `0.1.0` check: `pneumatic.
  mounting_style` reuses the identical four-case Euler end-fixity enum
  shape `screw.end_support_arrangement` already established (same textbook
  physics) but deliberately as a *distinct* parameter ID, not a reuse —
  this registry's own namespacing exists so a resolved value on one
  component is never mistaken for a compatible source on an unrelated one,
  the same reasoning `motor_sizing.rack_pinion.gear_ratio` already gives
  for not reusing `screw.gear_ratio`. `pneumatic.buckling_safety_factor` is
  required with no default — an even clearer case than `screw.
  buckling_safety_margin`'s own two-source disagreement, since no
  pneumatic-manufacturer source gives any number at all. **This session
  also caught and fixed a real, pre-existing gap unrelated to this
  module's own scope:** registry `1.15.0` (released 2026-08-18, pinned by
  six already-released module manifests) had never been added to
  `PARAMETER_REGISTRY_SUPPORTED_VERSIONS` explicitly — the same stranding
  risk `linear-guide`'s and `drive-train`'s own sessions each caught once
  before for `1.4.0`/`1.7.0`. Fixed in the same edit that adds `1.16.0`.
  `npx tsc --noEmit`, the full non-DB test suite (2462/2462), and `npm run
  lint` (0 errors) all pass; the two pinned registry-version/hash fixtures
  were updated to match, the expected update on every version bump.
- Stage 3 (compute and trace): **done (2026-08-24).**
  `lib/modules/pneumatic-cylinder/0.1.0/` — full `ModulePackage` (manifest,
  `math.ts` kernel, input schema, compute, checks, trace, generic UI/report
  schema, a draft `validation.ts`); SMC's own worked examples reproduced
  through the real compute path (`smc-reference-examples.ts`/`.test.ts`).
  The buckling kernel reproduces `ball-screw@0.1.0`'s own Euler end-fixity
  constants independently, not by import. A real registry gap found and
  closed the same session: the Milwaukee/SMC source revisions Stage 1
  flagged "to be added at Stage 2" were never actually registered — both
  added to `lib/standards/engineering-sources.ts` this stage.
- Stage 4 (validation): **done (2026-08-24).** Reference examples already
  met at Stage 3. The independent-benchmark question
  (`stage-2-contract.md` "Decisions" item 4) is **partially resolved, not
  fully closed** — Parker Hannifin's own literature returned HTTP 403 again
  this session, the same block Stage 1/Stage 3 already recorded. Norgren
  (IMI Precision Engineering)'s own M/1000 catalog data sheet — a third
  manufacturer, independent of both SMC and Milwaukee — supplies real
  published per-model theoretical-force/air-consumption ratings this
  module's own kernel was never calibrated to; reproduced through the real
  compute path (`norgren-benchmark.ts`/`.test.ts`) across 7 bore sizes,
  agreement within 2% on all 21 figures (mean under 1%). This closes the
  independent-benchmark item for 2 of the module's 4 formula areas
  (theoretical force, air consumption); the cushion kinetic-energy-
  allowable and buckling formulas still have no second independent source
  of any kind, an explicit, disclosed `0.1.0` limitation carried into
  release, not silently dropped. `reviewer`/`reviewDate` are honestly
  scoped to what the substitute evidence actually covers. Full validation
  record: `validation/pneumatic-cylinder/0.1.0.md`; three new
  `validation/source-index.md` rows.
- Stage 5 (generic surfaces): **done (2026-08-24), effectively already
  complete at Stage 3.** This module has no cross-module link and no
  guided-workflow role — confirmed (zero `pneumatic.*` overlap with any
  released parameter group, `manifest.ts`'s own `workflowRoles: []`), not
  merely assumed. Generic UI/report schema already passed conformance.
- Stage 6 (release): **done (2026-08-24).** Source-immutability hash pinned
  (`npm run module:source-hash -- pneumatic-cylinder 0.1.0` →
  `9700fdc94f2a344f`); registered via `npm run registry:generate`
  (`pneumatic-cylinder@0.1.0` in `lib/modules/registry.generated.ts`, 25
  modules total); sealed package content hash `739621ff948938a9`. Full
  non-DB suite green (2546/2546), typecheck/lint/build clean.

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

Unit 4.2 (`motion-profile`) is no longer blocked here either: released
2026-08-12 as `motion-profile@0.1.0` (see "Active work" above and
`validation/motion-profile/0.1.0.md`).

Unit 5.4 Scenario 1 (horizontal axis) is no longer blocked: complete
2026-08-12 (see "Active work" above and
`validation/unit-5.4/scenario-1-horizontal-axis.md`). Scenarios 2 and 3
remain genuinely blocked, the same evidence wall Unit 4.1 hit for months:

- Scenario 2 (vertical axis with brake/holding requirements) — ID42 is the
  only vertical fixture available and it contains no holding/brake case
  (`validation/axis-load-cases/0.1.0.md`); `axis-load-cases@0.1.0` itself
  has no `holding`/`emergency_stop` support to exercise even if a case
  existed. Needs a real sanitized project with a holding/brake case.
- Scenario 3 (long-stroke/high-speed axis) — the third historical fixture
  Unit 0.1 and Phase 1B both still need has never been found (see "Next up"
  item 2 below); no synthetic substitute will be created for it.

The authenticated-route E2E test (Next up item 3) needs a Clerk Development
instance and four GitHub Actions repository secrets this session cannot
provision itself (no dashboard/repository-settings access, no `gh` CLI
installed) — see Next up item 3 for exactly what and `.env.example` for the
variable names.

---

## Next up

0. **Unit 7.1 (`pneumatic-cylinder`) is fully released and complete
   (2026-08-24)** — Stages 1 through 6 all done; see "Active work" above
   and `context/implementation-map.md` Milestone 7 Unit 7.1 for the full
   account. `pneumatic-cylinder@0.1.0` is registered
   (`lib/modules/registry.generated.ts`), with a completed validation
   record (`validation/pneumatic-cylinder/0.1.0.md`) that honestly
   discloses a partial (2-of-4-formula-area) independent-benchmark
   resolution rather than overclaiming full closure. Nothing left to do
   for this unit. **Next: Unit 7.2 — the second Milestone 7 (Phase 2)
   module.** `context/roadmap.md` "Phase 2" lists eight remaining
   candidates (timing belts; chain and sprocket; bushings and plain
   bearings; cable carriers; mechanical stops and energy absorption; basic
   shaft/key/bolted-joint checks; a tolerance and fit reference module; PDF
   generation and improved catalog import) with no priority-score pass or
   founder direction yet picking which goes next — Unit 7.1 itself was a
   founder-directed exception to `context/roadmap.md`'s own "Module
   Prioritization" scoring order (see Unit 7.1's own Stage 1 spec
   "Status"), not a precedent that scoring is skipped going forward.
1. **All five Motor Sizing Tool family mechanism modules are fully released
   (2026-08-13), and Phase 1E's own last open deliverable — the
   `AddModuleInstanceDialog` category step/mechanism picker and the
   route-level discipline-category filter — is now built (Unit 6.7, same
   day).** `ball-screw-motor-sizing@0.1.0`, `direct-drive-conveyor-motor-
   sizing@0.1.0`, `rack-pinion-motor-sizing@0.1.0`, `belt-pulley-drive-
   motor-sizing@0.1.0`, and `index-table-motor-sizing@0.1.0` — see "Active
   work" Units 6.2-6.6 for the full account: all five registered in
   `lib/modules/registry.generated.ts` (64, 57, 50, 61, and 61 passing
   tests respectively), all five with completed validation records
   (`validation/ball-screw-motor-sizing/0.1.0.md`,
   `validation/direct-drive-conveyor-motor-sizing/0.1.0.md`,
   `validation/rack-pinion-motor-sizing/0.1.0.md`,
   `validation/belt-pulley-drive-motor-sizing/0.1.0.md`,
   `validation/index-table-motor-sizing/0.1.0.md`). **Unit 6.7 (see
   `context/implementation-map.md` Milestone 6) hides the seven Milestone 4
   discipline categories and `linear-axis@1`'s own "Start workflow" trigger
   from the default pickers via a new route-level filter in
   `app/(workspace)/workspace/page.tsx`, and gives `motor-sizing.*` modules
   their own "Motor Sizing Tools" entry point/mechanism picker inside
   `AddModuleInstanceDialog`** — none of the seven discipline modules or
   `linear-axis@1` were edited or unregistered (immutability invariant
   intact), and the dialog stays generic (the toggle only renders when both
   a motor-sizing and a non-motor-sizing package are present in whatever
   list it's given). **Milestone 6 and Phase 1E are now both fully
   complete** — every deliverable ADR-0011 named is built. Everything else
   in Milestone 4/5 is either done or blocked: Milestone 4 is complete
   (Unit 4.7's gate cleared 2026-08-12, `drive-train@0.1.0`, the seventh
   and last module; all seven `linear-axis@1` roles filled), Unit 5.4
   Scenario 1 is complete (see "Active work"), Unit 5.5 is done (item 9),
   and Unit 5.4 Scenarios 2/3 remain genuinely blocked on evidence (see
   "Blocked" above), not buildable until that evidence exists.
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
5. Units 4.2 (`motion-profile`), 4.3 (`ball-screw`), 4.4
   (`linear-guide`), 4.5 (`coupling`), 4.6 (`support-bearing`), and 4.7
   (`drive-train`): **all released, 2026-08-12** — see Active work for the
   full account. Nothing left to do for any of the six; all seven
   Milestone 4 modules (including Unit 4.1) are now released and
   registered.
6. Unit 4.8 (`linear-axis@1` workflow): **built 2026-08-10** — full
    `WorkflowDefinition` contract (`lib/workflows/workflow-sdk/`) and the
    concrete `linear-axis@1` definition, tested against all seven real
    modules' own ports (`lib/workflows/linear-axis/1.0.0/`), see Active
    work and `context/adr/0007-workflow-definition-contract.md`. The
    `coupling` role's 0-1 cardinality is resolved (2026-08-10): the founder
    confirmed direct-drive axes are a real configuration, so it stays
    optional — see `context/adr/0007-workflow-definition-contract.md`
    "Consequences". `lib/application` wiring (`startWorkflowInstance`,
    `loadWorkflowInstanceView`) and the generic UI surface are now both
    built — see Unit 4.9. All seven roles (`linear-axis.axis`,
    `linear-axis.motion`, `linear-axis.screw`, `linear-axis.guide`,
    `linear-axis.coupling`, `linear-axis.bearing`, `linear-axis.drive`) now
    have a real registered module (`axis-load-cases@0.1.0`, released
    2026-08-11; `motion-profile@0.1.0`, `ball-screw@0.1.0`,
    `linear-guide@0.1.0`, `coupling@0.1.0`, `support-bearing@0.1.0`, and
    `drive-train@0.1.0`, all released 2026-08-12). This unit is done.
7. Unit 4.9 (`WorkflowInstance` application wiring and generic UI surface):
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
8. Units 5.1-5.3 (BOM model and generator; module/assembly report
    renderer; machine calculation package): **all built 2026-08-11** — see
    Active work for the full account. No stored `BomItem` table (ADR-0008);
    `loadBomView`/`buildBomCsv`/`/workspace/bom`; `loadModuleReportView`/
    `loadAssemblyReportView`/`/workspace/report`; `loadMachineReportView`
    and its `?configuration=` report mode all exist and are tested. All
    three units are done. **Unit 5.4 Scenario 1 (horizontal axis) is
    complete (2026-08-12)** — see Active work and
    `validation/unit-5.4/scenario-1-horizontal-axis.md`; Scenarios 2 and 3
    remain genuinely blocked on evidence (see "Blocked" above), the
    tracker's own active/next pick (item 1 above). Unit 5.5 (production
    readiness) is in progress (see below).
9. Unit 5.5 (production readiness): **done, 2026-08-12** — all nine
    deliverables closed: the Deployment decision ADR
    (`context/adr/0009-deployment-target-vercel-neon.md`), the dependency
    audit, structured application logs (`lib/logging/`), data export and
    account deletion (`lib/application/account/`, `/workspace/account/
    export`, `AccountSettingsDialog`), a basic performance benchmark
    (`npm run perf:benchmark`), error monitoring
    (`app/report-client-error.ts`, `app/global-error.tsx`), managed backups
    and a recovery procedure (`context/adr/0010-backup-recovery-strategy.md`
    — Neon PITR, no custom backup job), and a security review (no
    high-confidence findings) — see Active work for the full account.
    Nothing left to do here.
10. **New, 2026-08-12: `context/adr/0011-motor-sizing-tool-architecture.md`**
    — founder direction, after using the running application, that the
    seven linear-axis discipline modules (Units 4.1-4.7) organize by
    mechanical discipline, not by the mechanism the founder actually sizes
    a motor for, and that `drive-train@0.1.0` cannot size a motor for
    anything but a ball screw (every function in its own kernel hard-
    requires `screw.lead`/`screw.gear_ratio`). The ADR records the decision
    — a new `motor-sizing.<mechanism>` module family (ball screw, belt
    conveyor split into geared/pulley-drive and direct-drive, rack and
    pinion, index table), each module self-contained (motion profile
    computed per-phase inside the module, not linked in from
    `motion-profile@0.1.0` — this also fixes the ~21% RMS-torque deviation
    `validation/drive-train/0.1.0.md` already discloses, at its structural
    root), required-specs-only output (no motor catalog matching yet), and
    a new shared `lib/engine/mechanics/` package for genuinely generic
    rigid-body physics (moment of inertia, `Ta = J*alpha`) that every
    mechanism module depends on rather than reproduces. The seven existing
    modules and `linear-axis@1` stay registered and immutable (the
    project's own invariant) but get hidden from the default "Add module"
    picker via a category filter in `page.tsx` — not deleted, not edited,
    not superseded. **`lib/engine/mechanics/` is now built (Unit 6.1, see
    "Active work")** — the first piece of this ADR's own follow-on list.
    **`ball-screw-motor-sizing`'s own Stages 1-3 are now done (Unit 6.2,
    see "Active work")** — registry `1.9.0` released, and a full
    `ModulePackage` exists with Omron's own worked example reproduced
    through the real compute path. **Still not yet built**: Stages 4-6 of
    `ball-screw-motor-sizing`; each of the remaining four mechanisms' own
    Stage 1 spec (index-table's own load-torque formula is a genuine
    sourced gap — Oriental Motor's own calculations page has none); and
    those four mechanism modules themselves, each following the full New
    Module Workflow stage-gate separately, per the ADR's own explicit
    rejection of one combined module. See the ADR's own "Consequences" and
    `context/implementation-map.md` Milestone 6 for the full follow-on
    list.

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
- **New (2026-08-12, found by Unit 5.4 Scenario 1): `motion-profile`'s
  per-move-index ports (`move_{1..5}_*`, `dwell_{1..5}_*`) cannot be
  correctly driven through the database-backed `executeModuleInstance`
  path** whenever a real move beyond move 1 might exist — they all share
  one canonical parameter ID each with no `loadCase` to disambiguate, so
  `lib/db/repositories/graph-repository.ts`'s `resolveModuleInputs`
  (keyed by `(parameterId, loadCase)`, never by port key) resolves the
  same stored value for every move-index port sharing that ID, even ports
  never explicitly set. Confirmed: setting only `move_1_distance` produced
  a `cycle_time` five times too large through the real application path
  (see `validation/unit-5.4/scenario-1-horizontal-axis.md` "A Real Finding
  From This Scenario"). This affects real application use, not only that
  test. Needs a generic-engine decision on how per-index (not per-load-
  case) ports should be represented in the parameter-value schema — a
  cross-cutting change, out of scope for the unit that found it. Worked
  around in that unit's own test (direct compute+persist, bypassing only
  the buggy resolution step); the underlying gap itself is unresolved.
  **`ball-screw-motor-sizing`'s own Stage 2 (2026-08-12) avoids inheriting
  this defect for its own motion inputs** by minting distinct parameter
  IDs per named phase slot (`forward_move_distance`, `return_move_
  distance`) instead of an indexed family sharing one ID
  (`context/modules/ball-screw-motor-sizing/stage-2-contract.md`
  "Decisions" item 2) — a per-module workaround for a much smaller, fixed
  motion shape, not a fix to `motion-profile@0.1.0`'s own generic-engine
  gap, which remains exactly as described above.

---

## Environment notes

Local development constraints, not product decisions. None of these block
anything on the roadmap.

- The primary dev machine sits behind a corporate TLS-intercepting proxy. Do
  not disable TLS verification to work around it — use GitHub Actions as the
  verification environment instead.
- **The same interception also affects the browser, not just Node** —
  confirmed 2026-08-12: `curl -v` to
  `https://<tenant>.clerk.accounts.dev/npm/@clerk/clerk-js@6/dist/
  clerk.browser.js` (the exact CDN URL `/sign-in`'s own rendered HTML loads
  Clerk's client JS from) fails schannel's revocation check
  (`CRYPT_E_NO_REVOCATION_CHECK`), distinct from the already-fixed Node-side
  `NODE_EXTRA_CA_CERTS` issue above. Effect: `/sign-in` (and any
  Clerk-gated route) can render a blank page stuck on Next's "Rendering..."
  dev indicator indefinitely, because Clerk's client script never finishes
  loading — not a code defect, and not something `NODE_EXTRA_CA_CERTS`
  fixes, since that only covers the Node process's own outbound TLS.
  Playwright can't be used to verify a fix in-session either — it's blocked
  by this machine's group policy (see the Playwright note below). Unverified
  against a real browser this session for the same reason; if seen again,
  check the browser's own DevTools Network tab for the failing
  `clerk.accounts.dev` request before assuming this is the cause.
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
