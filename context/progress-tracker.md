# Progress Tracker

**What this file is:** current state, active work, blockers, and open
decisions. Nothing else. Keep it under ~150 lines.

**What this file is not:** a changelog. Frozen history for Milestones 0-3
and early Milestone 4 lives in `context/archive/history.md` — including the
rationale that ~45 source-file comments still cite as
`context/progress-tracker.md`. New code comments cite an ADR
(`context/adr/`) or a module spec, never this file.

Last updated: 2026-08-09

---

## Where the project is

| Milestone | Scope | State |
| --- | --- | --- |
| 0 | Evidence and repository foundation | Done |
| 1 | Generic engineering engine | Done |
| 2 | Persistence and application services | Done |
| 3 | Generic user experience (Units 3.1-3.9) | Done |
| 4 | Linear-axis engineering modules | **In progress** |
| 5 | BOM, reports, MVP release | Not started |

Roadmap phases map onto these milestones as follows (the roadmap uses phase
letters, the implementation map and this tracker use milestone numbers —
same work, two labels):

- Phase 0A / 0B / 0C → Milestones 0, 1, 2
- Phase 1A → Milestones 3 and 4
- Phase 1B / 1C → Milestone 4 (later units)
- Phase 1D → Milestone 5
- Phase 2+ → after MVP

**Health:** `npm run verify` green (format, lint 0 warnings, typecheck 0
errors, 742 tests passed / 204 database-gated skips, build clean).
Production dependencies audit clean.

---

## Active work

Unit 4.1 — `axis-load-cases`, the first production module.

- Stage 1 (spec): **done**. Stage 2 (parameter contract): **resolved
  2026-08-07**, scoped to `normal`/`peak` only — `holding`/`emergency_stop`
  deferred (see Open decisions). No new registry version needed; `1.1.0`
  already covers this scope. Details:
  `context/modules/axis-load-cases/stage-2-contract.md`.
- Stage 3 (compute and trace): **draft package built 2026-08-07**. A full
  `ModulePackage` (manifest, ports, input schema, compute, trace, checks, UI
  schema, report schema, draft validation record) wraps the existing kernel
  in `lib/modules/axis-load-cases/0.1.0/` — see that directory's `README.md`.
  Named `package.ts`, not `index.ts`, so `npm run registry:generate` still
  can't discover it — no module is registered; do not register one or claim a
  phase gate until the Stage 1 validation gate below clears.
- Stage 4 (validation): **partly done, blocked**. The "three published
  reference examples reproduced within stated tolerances" item is now met:
  `thk-reference-examples.test.ts` reproduces THK's published B15-72
  (horizontal), B15-86 (vertical), and B2-22 (vertical) worked examples from
  `stage-1-spec.md` to within ±1 N, and `validation.ts` records them as real
  `referenceExamples` entries. The "independent numerical benchmark" item is
  now also met (**2026-08-07**): `reference/source-material/Atlanta_Rack and
  Pinion Drive Calculations and Selection.pdf` (found while searching for the
  third fixture — see below) has two complete worked examples for a
  rack-and-pinion drive (a different mechanism than THK's ball screw),
  reproduced in `lib/modules/axis-load-cases/0.1.0/atlanta-benchmark.ts` and
  cross-checked against `resolveAxisLoadPhase` to floating-point precision.
  Its licensing status is unresolved (see Open decisions), so it's an
  internal cross-check only, not registered in `lib/standards`. The
  remaining Stage 4 items are still blocked on evidence — see below.

Unit 4.2 — `motion-profile`. Stage 1 spec drafted 2026-08-07 in parallel
(roadmap explicitly allows spec/research work in parallel with a blocked
module; see `context/modules/motion-profile/stage-1-spec.md`). Both
candidate sources (ABB AN00115; Oriental Motor's H-18/H-23 selection-
calculations chapter) are now page-verified — the earlier PDF-extraction
failure was a tooling limitation. `motion-profile/0.1.0/
oriental-motor-benchmark.ts` reproduces Oriental Motor's general
asymmetric/non-zero-start-speed method as an independent benchmark of
`resolveTrapezoidalMove` (`math.ts`), cross-checked in its sibling test
file. Stage 2 (parameter contract) is **resolved 2026-08-07**:
`context/modules/motion-profile/stage-2-contract.md`. `motion-profile` owns
a cycle-level RMS *acceleration* output only (not RMS velocity, not RMS
torque — that stays a Unit 4.7 output); the multi-segment/cycle outputs are
cycle-level aggregates only, no per-segment port (the registry has no
`table`-typed parameter support yet, and adding that is a separate
generic-platform capability the Split Rules keep out of this module unit).
Registry `1.2.0` adds `motion.profile.rms_acceleration`.
`motion-profile/0.1.0/cycle.ts` (`resolveMotionCycle`) extends the kernel
with multi-segment sequencing and the RMS aggregation (31 kernel tests
total across `math.test.ts`, `oriental-motor-benchmark.test.ts`, and
`cycle.test.ts`). Stage 3 (compute and trace): **draft package built
2026-08-07**, extended the same day to wrap one move optionally followed by
one dwell, then **extended again 2026-08-08 to a bounded sequence of up to
5 moves**, each optionally followed by its own dwell. The multi-move
port-cardinality question (`table`-valued parameter support vs. a fixed
maximum) had no evidence in the repo either way — no fixture records a real
multi-move cycle's segment count, and this is a project-specific scoping
choice, not an engineering formula — so it was raised directly to the
founder, who chose a fixed maximum of 5
(`context/modules/motion-profile/stage-2-contract.md` "Decisions" item 4).
A full `ModulePackage` (manifest, ports, input schema, compute, trace,
checks, UI schema, report schema, draft validation record) wraps `math.ts`
and `cycle.ts` in `lib/modules/motion-profile/0.1.0/` — see that directory's
`README.md` "Stage 3 package". Each move has its own
`move_{index}_distance`/`max_velocity`/`max_acceleration` port trio (only
move 1 required) plus an optional `dwell_{index}_time`; the input schema
rejects a gap, a partially-supplied move, or an orphaned dwell. The
single-move package's `move_time` output port was removed — it no longer
has an unambiguous meaning with multiple moves possible — in favor of
per-move detail in the calculation trace only, since a declared output port
cannot be conditionally absent. No module is registered (`package.ts`, not
`index.ts`); release stays gated behind Unit 4.1 regardless.

**Stage 4 (validation) resolved 2026-08-09.** `validation/motion-profile/
0.1.0.md` is complete — the second module in this project with a completed
Stage 4 record (after `ball-screw`), using the same solo-validation
reviewer-substitute policy. Three published reference examples are now
reproduced, closing the item that was previously open ("no published worked
example exists for this method"): re-reading the two already-page-verified
candidate sources found that a citation in `stage-1-spec.md` had pointed at
the wrong ABB AN00115 example (the p. 6-7 "Exercise" solves an inverse
problem this module doesn't implement) — the actually-reproducible example
was on p. 2-3, and the p. 6-7 exercise's own derived numbers, fed forward,
gave a second example — plus a third from Oriental Motor's own p. H-19
catalog example (EAS6, previously unread; only its p. H-23 general formula
had been used, as the independent benchmark). Three examples from two
independent manufacturers across three independent scenarios, all in
`math.test.ts` and `validation.ts`. Two new source revisions registered in
`lib/standards/engineering-sources.ts`
(`us.abb.trapezoidal_move_calculations@rev-c-en`,
`jp.oriental_motor.linear_rotary_actuator_selection_calculations@2015-2016`).
The cycle-level RMS acceleration output remains without a published example
or independent benchmark — recorded as an honest gap, not silently assumed
correct. See `lib/modules/motion-profile/0.1.0/README.md` "Stage 4 evidence
(2026-08-09)" for the full account.

Unit 4.3 — `ball-screw`. Stage 1 spec drafted 2026-08-08, in parallel with
`axis-load-cases`' evidence wait (same allowance already used for Unit 4.2;
see `context/modules/ball-screw/stage-1-spec.md`). Covers lead/speed, drive
torque, equivalent dynamic load, nominal life, buckling, critical speed, and
static safety factor — a draft kernel now computes all six checks (39
tests) — `lib/modules/ball-screw/0.1.0/math.ts`, see that directory's
`README.md`. THK's own catalog (already cited for Unit 4.1) returned HTTP
403 on every direct-domain fetch attempted this session; two other sources
filled the gap instead: Rockford Ball Screw's "How To Size A Ball Screw"
(fetched directly, full worked numerical example) explicitly states its
buckling/critical-speed formulas use the screw's **minor (root) diameter,
not nominal diameter** — resolving the question that had been blocking
those two checks — and independently cross-checks the drive-torque formula;
WY Ball Screw supplied the static safety factor formula (`fs = C0 /
Fas_max`). The kernel reproduces Rockford's own worked numbers for drive
torque, buckling, and critical speed within whole-unit catalog rounding.
These sources surfaced two new discrepancies: Rockford's own buckling
safety margin (`Fs = 0.8`) disagrees with Steinmeyer's (`0.5`) for the
identical formula, and Rockford's own catalog dynamic-load ratings are
calibrated against `10^6` inches traveled, not `10^6` revolutions the way
this kernel's life formula assumes — silently mixing the two would misstate
life by a factor tied to the screw's lead.

**Stage 2 (parameter contract) resolved 2026-08-08:**
`context/modules/ball-screw/stage-2-contract.md`, registry `1.3.0`. A second
sourcing pass for the static safety factor minimum and the buckling margin
found a directly-read handbook source (MITcalc's ball-screw calculation
documentation) for the former but no manufacturer/standards-body number
that met this project's evidence bar for either — THK's own buckling PDF
and Nook Industries' catalog both still return HTTP 403 on direct fetch;
a University of Utah lecture PDF that might have settled the static-factor
range hit the same `pdftoppm` page-range limitation as before, even at only
14 pages (see Environment notes). Both are therefore released as **required
module inputs with no built-in default**
(`screw.static_safety_factor_minimum`, `screw.buckling_safety_margin`)
rather than a hardcoded number — a deliberate resolution, not a deferral.
Registry `1.3.0` also adds the full `screw.*` group (14 new parameters) and
two new `motion.axis.*` per-case parameters
(`case_time_fraction`, `case_linear_velocity`) that let the duty-cycle
equivalent-load formula reuse `axis-load-cases`' own `normal`/`peak` cases
as duty-cycle phases, resolving the last open Stage 1 item.

**Stage 3 (compute and trace) draft package built 2026-08-08, same day as
Stage 2.** A full `ModulePackage` (manifest, ports, input schema, compute,
trace, checks, UI schema, report schema, draft validation record) wraps the
Stage 1 kernel in `lib/modules/ball-screw/0.1.0/` — see that directory's
`README.md` "Stage 3 package". Two package-level wiring decisions: the input
schema rejects a `"distance"`-basis `dynamic_load_rating_basis` outright (no
documented conversion exists), and `compute.ts` ignores the kernel's own
baked-in `0.5` buckling margin, instead recomputing the permissible
compressive load from the registry-supplied `buckling_safety_margin` input —
the kernel itself (`math.ts`) is unchanged. 19 new package-level tests pass
alongside the 39 existing kernel tests. Named `package.ts`, not `index.ts`,
so `npm run registry:generate` still can't discover it — no module is
registered. Production release remains sequentially gated behind Unit 4.1's
Definition of Done regardless.

**Stage 4 evidence search attempted 2026-08-08, no new reference example
found.** Looked for a published worked example for the equivalent-dynamic-
load/duty-cycle formula and the static safety factor formula — the two
formulas the current three reference examples (all Rockford, one shared
scenario) don't cover. Found that a real THK example exists (model
WTF2040-2, `C0a = 13.6 kN`, `fs = 2.5`) via WebSearch synthesis only; the
source document itself is still unreachable (`thk.com` blocked more broadly
than previously known — see Environment notes), so it was not recorded as
a verified reference example. See `context/modules/ball-screw/
stage-1-spec.md` "Evidence Gaps and Verification Confidence" for the full
account.

**Stage 4 evidence found and verified 2026-08-09.** The WTF2040-2 example
flagged above is now directly read (a third-party distributor mirror of
THK's own catalog, since `thk.com` itself is still blocked) and three of its
printed numbers reproduce cleanly against already-implemented kernel
formulas: drive torque, nominal life, and static safety factor —
`validation.ts` now has six reference examples across two independent
manufacturers (three Rockford, three THK), up from three all sharing one
Rockford scenario. The same source also surfaced two new, unresolved
discrepancies: a third distinct buckling/critical-speed formula constant,
and a different methodology for THK's own equivalent-dynamic-load
calculation on a reversing duty cycle (THK's own numbers don't reproduce
through this kernel's single-formula implementation). The buckling/critical-
speed discrepancy is now also an implemented independent benchmark, not just
a documented finding: `lib/modules/ball-screw/0.1.0/thk-benchmark.ts`
implements THK's own formula separately, reproduces its three worked
numbers exactly, and cross-checks against `math.ts`'s Rockford-based
functions (bounded-ratio agreement, not exact — a genuine second
computation, same treatment `axis-load-cases/atlanta-benchmark.ts` already
established). This closes the roadmap's "independent benchmark" item
(Definition of Done item 9) for every check in this module. See
`lib/modules/ball-screw/0.1.0/README.md` "Stage 4 evidence (2026-08-09)" and
`context/modules/ball-screw/stage-1-spec.md` "Evidence Gaps and Verification
Confidence" for the full account.

**Stage 4 validation record completed 2026-08-09.**
`validation/ball-screw/0.1.0.md` is written (first module in the project
with a completed Stage 4 record), using the documented solo-validation
reviewer-substitute policy (`context/ai-workflow-rules.md` "Stage 4 —
Validation") since no second engineer is available — the independent
benchmark comparisons above serve as the review substitute, recorded as
such rather than left blank. `validation/source-index.md` now has its first
entries. This is Stage 4 completion, a documentation milestone — it does
not register or release the module. The record is explicit about its one
remaining limitation: six reference examples exceed the roadmap's "at least
three" by count, but come from only two independent worked scenarios
(Rockford, THK), not three.

**Cross-module link compatibility closed same day.**
`cross-module-links.test.ts` (new) — the first per-module-pair link-
compatibility test in this codebase — confirms `axis-load-cases`' real
output ports link correctly to this module's real input ports (including
correctly rejecting a load-case mismatch), and confirms, rather than
assumes, the known gap that no upstream module yet produces
`case_time_fraction`/`case_linear_velocity`. Closes roadmap Module
Definition of Done item 13 for `ball-screw`.

**Equivalent-dynamic-load discrepancy given a real second implementation,
same day.** `thk-benchmark.ts`'s new `resolveThkDirectionalEquivalentLoad`
implements THK's own bidirectional-duty-cycle equivalent-load method
separately from `math.ts`'s Steinmeyer-based formula, reproducing THK's own
printed `225 N`; a test confirms the kernel's own formula gives a materially
different `~283.5 N` for the identical scenario, rather than leaving the
discrepancy as unchecked prose. **Correction while doing this:** the
previously-recorded `~296 N` figure for that comparison was a hand-
arithmetic addition error, now corrected to `~283.5 N` everywhere it was
cited (this file, the module README, `validation.ts`,
`validation/ball-screw/0.1.0.md`) after re-deriving it through the actual
kernel function. The discrepancy's existence and rough magnitude are
unchanged; only the precise number was wrong.

---

## Blocked — needs evidence, not code

Stage 4 (validation) and release, not Stage 3, wait on this — see
`context/modules/axis-load-cases/stage-1-spec.md` "Validation Gate and
Evidence Intake":

- Release-grade ID39/ID42 records (original document revision, confirmed
  final installation/corrections) — the current fixtures are draft-only.
  **Checked 2026-08-07:** all 26 previously-unreviewed images in
  `reference/source-material/` were read; none carries a revision mark, date,
  correction, or holding/brake note (see the two fixture READMEs' "Additional
  source pages reviewed" notes). Still missing — not found among files
  currently in the repo.
- The third long-stroke/high-speed fixture required by Unit 0.1. **Checked
  2026-08-07:** the same 26-image review found only additional pages of the
  existing ID39/ID42 source documents (confirmed by each image's own app
  title bar), no third project. Still missing.
- A completed `validation/axis-load-cases/0.1.0.md`, reviewer or documented
  solo-review substitute, and `validation/source-index.md` rows.

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

1. Collect the Stage 4 evidence below — the only thing blocking
   `axis-load-cases` from release now that Stage 3 has a passing draft
   package.
2. Unit 0.1 — add the third long-stroke/high-speed fixture alongside ID39 and
   ID42 in `tests/fixtures/axes/`.
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
5. Unit 4.2 (`motion-profile`): Stages 3-4 are done (see Active work
   2026-08-09) — `validation/motion-profile/0.1.0.md` is complete (solo-
   validation reviewer-substitute policy). What's left is the same as Unit
   4.3: Stage 5 items that need Unit 4.8 (workflow role integration,
   workflow integration tests — `workflowRoles` is deliberately empty) and
   Stage 6 (release), which stays sequentially gated behind Unit 4.1
   regardless. Cross-module link compatibility is not yet testable in
   either direction: no other module in this codebase currently declares an
   input port for any `motion.profile.*` output. Optional parallel work;
   does not move Unit 4.1's critical path.
6. Unit 4.3 (`ball-screw`): Stages 3-5 are all done for what's applicable at
   this point (see Active work 2026-08-09) — `validation/ball-screw/
   0.1.0.md` is complete (solo-validation reviewer-substitute policy);
   generic UI/report schema conformance already passes
   (`package-validation` check); cross-module link compatibility against
   `axis-load-cases` is tested and passing. A real, documented equivalent-
   dynamic-load methodology discrepancy (THK vs. this module's own
   Steinmeyer-based formula) remains open, recorded rather than resolved.
   What's left is workflow role integration and workflow integration tests
   (blocked on Unit 4.8, not a Unit 4.3 gap) and Stage 6 (release), which
   stays sequentially gated behind Unit 4.1 regardless. Optional parallel
   work; does not move Unit 4.1's critical path.

---

## Open decisions

Product and scope questions that are genuinely still open. Resolved ones
have been removed; `context/archive/history.md` has the reasoning behind
past calls.

- Final product name. MachineStudio is a working name.
- Deployment target: Vercel plus managed PostgreSQL, or a single VPS.
- Initial manufacturer data sources for screws, guides, couplings, motors,
  and drives.
- Which three historical axis projects can be sanitized for validation.
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
- The Neon free tier occasionally exceeds Vitest's default 5000 ms timeout on
  the `stale-propagation` and `compare-baselines` live-DB tests. Latency, not
  a defect.
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
