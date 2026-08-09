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
errors, 772 tests passed / 204 database-gated skips, build clean).
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
(`package.ts`, not `index.ts`); release stays gated behind Unit 4.1
regardless.

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
codebase); workflow role integration stays not-applicable until Unit 4.8
exists. No module is registered; release stays gated behind Unit 4.1
regardless.

Unit 4.4 — `linear-guide`. Stage 1 spec drafted 2026-08-09, the next module
in the roadmap's own Phase 1B order (same parallel-work allowance already
used for Units 4.2-4.3; see `context/modules/linear-guide/stage-1-spec.md`).
Two independent manufacturer sources read directly: PMI's *Linear Guideway*
catalog (via a distributor mirror, `bearing.net.au`) with a complete worked
numerical example covering every required check end to end, and IKO's
*Linear Way* catalog (read from IKO's own domain) — the first source in
this project to directly cite ISO 14728-1/14728-2 for the load-rating/life
formulas, rather than only a WebSearch-synthesized paraphrase. The two
sources agree on life-formula shape and (distance-km, not revolution)
basis, but disagree on the equivalent-load formula's complexity and on
static-safety-factor standard values — both recorded, not resolved.

**Both Stage 2 entry blockers resolved same day.** The real dependency gap
this spec found — `axis-load-cases 0.1.0` already anticipated this module
by name in its own Stage 1/2 documents ("the guide module, Unit 4.4, is not
built") but exposed only the axial thrust-force scalar, not the full
resolved force/moment vector this module needs — is now closed: registry
`1.4.0` adds `motion.axis.resultant_force`/`resultant_moment` (both
per-case `vector_quantity`) to `axis-load-cases 0.1.0`'s still-unregistered
draft, built from values its kernel already computed internally
(`lib/modules/axis-load-cases/0.1.0/README.md` "Resultant force/moment
output ports"). A second re-verification pass against the PMI source
images also caught and corrected a real transcription error in this
document's own first draft (the inertia-phase formulas had used one shared
acceleration rate instead of the source's own distinct `a1`/`a3`).

**A Stage 1 kernel now exists**, ahead of a full Stage 2 parameter
contract: `lib/modules/linear-guide/0.1.0/math.ts` implements block-load
distribution for all four in-scope installation/motion combinations
(horizontal/vertical × uniform/inertia), equivalent load, static safety
factor, nominal life (ball-type, distance-basis), service life in hours,
and mean load under a varying duty cycle — 29 tests, all internal-
consistency and boundary checks (PMI's own full worked example uses a
bespoke geometry this session could not confidently map onto the generic
formulas, so it is reserved for Stage 4, not guessed at). No package,
manifest, or Stage 2 parameter contract yet.

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
5. Unit 4.2 (`motion-profile`) and Unit 4.3 (`ball-screw`): both are done
   through Stage 4 (`ball-screw` also through Stage 5 as far as applicable
   pre-Unit-4.8 — see Active work). What's left for both is identical:
   workflow role integration and workflow integration tests (blocked on
   Unit 4.8, `workflowRoles` is deliberately empty on each), cross-module
   link compatibility (untestable for `motion-profile` specifically — no
   other module declares an input port for any `motion.profile.*` output
   yet), and Stage 6 (release), sequentially gated behind Unit 4.1
   regardless. Optional parallel work; does not move Unit 4.1's critical
   path.
6. Unit 4.4 (`linear-guide`): Stage 1 spec and kernel done (see Active work
   2026-08-09); the `axis-load-cases` port gap is resolved. Next: a Stage 2
   parameter contract (the `guide.*` group — geometry, catalog ratings,
   preload grade, rolling-element type; see the spec's "Existing Parameter
   Review"), then a Stage 3 package (manifest, ports, compute, trace,
   checks) wrapping the existing kernel, linking to `axis-load-cases`'
   `resultant_force`/`resultant_moment` ports. Optional parallel work; does
   not move Unit 4.1's critical path.

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
