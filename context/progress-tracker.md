# Progress Tracker

**What this file is:** current state, active work, blockers, and open
decisions. Nothing else. Keep it under ~150 lines.

**What this file is not:** a changelog. Frozen history for Milestones 0-3
and early Milestone 4 lives in `context/archive/history.md` — including the
rationale that ~45 source-file comments still cite as
`context/progress-tracker.md`. New code comments cite an ADR
(`context/adr/`) or a module spec, never this file.

Last updated: 2026-08-06

---

## Where the project is

| Milestone | Scope | State |
| --- | --- | --- |
| 0 | Evidence and repository foundation | Done |
| 1 | Generic engineering engine | Done |
| 2 | Persistence and application services | Done |
| 3 | Generic user experience (Units 3.1-3.9) | Done |
| 4 | Linear-axis engineering modules | **In progress — blocked** |
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
errors, 568 tests passed / 204 database-gated skips, build clean).
Production dependencies audit clean.

---

## Active work

Unit 4.1 — `axis-load-cases`, the first production module.

- Stage 1 (engineering specification): **done**. See
  `context/modules/axis-load-cases/stage-1-spec.md`.
- Stage 2 (parameter contract): **partly done, blocked**. See
  `context/modules/axis-load-cases/stage-2-contract.md`.
- Stages 3-6: not started. No module is registered. Do not register one,
  claim a phase gate, or write a validation record until the blockers below
  clear.

---

## Blocked — needs evidence, not code

These three Stage 2 decisions cannot be resolved by writing code. They need
real source documents and sanitized historical cases the project does not
yet have.

1. **Per-case external force/moment vectors.** Whether `holding` and
   `emergency_stop` get their own vector parameters, and whether canonical
   resolved force/moment outputs are needed.
2. **Where per-case load vectors live.** Per-case parameters vs. a generic
   load-case container. An unpinned existing port must not be overloaded to
   dodge load-case validation.
3. **Emergency-stop and holding semantics.** Deceleration and process-force
   evidence; holding static resistance and brake behaviour.

**What unblocks them:** sanitized horizontal (ID39) and vertical (ID42)
historical fixtures, plus one independent numerical benchmark to compare
against. Until those exist, Milestone 4 cannot advance past Stage 2.

---

## Next up

1. **Collect the evidence above.** This is the only thing on the critical
   path. Everything below is optional and does not move Milestone 4.
2. Unit 0.1 — structure ID39 and ID42 into validation fixtures. Deferred
   since Milestone 0; clearing item 1 makes this actionable.
3. Playwright CI round trip for the authenticated route. Needs Clerk
   test-instance credentials, never configured. Unauthenticated smoke
   coverage already exists and passes.
4. Downstream parameter groups (screw, guide, coupling, support bearing,
   drive train). Approved but deliberately unreleased — each ships with the
   module that needs it, at that module's Stage 2 contract, bumping the
   registry version. See `lib/engine/parameters/README.md`.

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
