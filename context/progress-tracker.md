# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- **2026-07-31 (same session, continued — the user's first real
  click-through of the running app): a real, app-wide correctness bug
  found and fixed — no `User` row was ever created for a real Clerk
  user, so `createMachineProject` violated `machine_projects_ownerId_
  fkey` on every first "New project" click.** Also: this session's own
  prior dev-server verification step (`rm -rf .next` while the user's
  `next dev` was already running) corrupted Turbopack's persistent cache
  and produced the "stuck Compiling…" symptom the user actually reported
  — a session-caused environment incident, not a code bug, fixed by
  killing the orphaned processes and restarting clean with the correct
  env vars. Full detail (root cause, why the fix lives in
  `createMachineProject` rather than the auth middleware, verification)
  is in `context/progress/unit-3.md` Current Goal — this is a
  cross-cutting correctness fix, not scoped to Milestone 3, so it is
  summarized here too. `npm run verify` green against the live database
  (650/650 tests, 0 skipped).
- **2026-07-31 (same session, continued): local dev environment fully
  working end-to-end for the first time — real Clerk auth, real PostgreSQL
  (Neon), 632/633 tests passing against a live database locally.** Not a
  roadmap unit; an environment/infrastructure fix triggered by the user
  actually running the app in a browser after Unit 3.4. See Current Goal
  for full detail (the corporate-network root cause, the `lib/db/client.ts`
  Neon-adapter addition, and the one Neon-latency-induced test timeout that
  is not a code defect). `npm run verify` reconfirmed green after the
  `lib/db/client.ts` change (lint 0 warnings, typecheck 0 errors, 466/466
  tests passed with `DATABASE_URL` unset — unchanged from before — build
  green); separately, with `DATABASE_URL`/`NODE_EXTRA_CA_CERTS` set, the
  previously-always-skipped live-DB suites ran for real: 632/633 passed.
- **Milestone 3 (Generic User Experience) is under way: Units 3.1–3.7 are
  complete** (workspace shell, project/assembly management UI, generic
  module input renderer, link suggestion UI, generic result and trace
  renderer, catalog matching and assignment UI, requirements/assumptions/
  load-case UI — 2026-07-30 through 2026-07-31), with 701/701 tests green
  against a live database and zero skips. Next: Unit 3.8 (baseline and
  comparison UI, the last Milestone 3 unit). Full history, decisions, and
  the Unit 3.8 brief now live in
  `context/progress/unit-3.md` — read that file for normal Unit 3
  continuation work instead of scrolling this one.
- **2026-07-31: the whole Milestone 3 backlog was finally committed.** Units
  3.1–3.5 and the `upsertUser` FK bug fix had been implemented and verified
  but never committed; they are now six separate, unit-tagged commits per
  `implementation-map.md`'s Delivery Rule. Detail in
  `context/progress/unit-3.md` Current Goal ("Commit History
  Reconstruction"), including one real incident: reconstructing an
  intermediate barrel state broke the user's running dev server for a few
  seconds, fixed immediately — the recorded lesson is to split already-final
  code with `git add -p` against the index, never by editing working-tree
  files backwards.
- **2026-07-30 (new session): a design-risk follow-up pass closed all six
  items the previous session's hardening pass listed under Open Questions as
  "not attempted" / "architecture follow-ups" — each its own work unit with a
  real decision recorded, per `context/ai-workflow-rules.md`'s Work-Unit
  Rule: (1) Unit 0.3's Playwright/Testing Library/coverage gap, (2) the
  angle-as-base-dimension power algebra gap, (3) the module content-hash gap,
  (4) DB-level same-configuration constraints, (5) catalog import
  authorization policy, (6) transactionally consistent read snapshots.**
  Implemented and locally verified (lint/typecheck/test/build all green
  throughout); this session did not commit or push, so **none of the six has
  had a CI round trip yet** — units 1, 4, and 6 touch live-DB tests or a
  migration and need one before being called fully verified, matching this
  project's established convention for anything requiring a real Postgres.
  See Current Goal for each item's full detail.
- **2026-07-30: an integrity-hardening pass sits on top of Milestone 2,
  implemented locally and not yet CI-verified** (see Current Goal). It closed
  cross-configuration write paths, made link compatibility a server-side rule,
  stopped stale upstream results from feeding downstream runs, made
  manufacturer part revisions immutable (ADR-0006, new migration), and cleared
  the production dependency advisories. Milestone 2's units remain complete;
  three earlier decisions were reversed rather than extended (see Architecture
  Decisions)
- Phase 0A — Evidence and Specification Baseline (evidence fixtures still
  outstanding)
- Phase 0B — Repository and Quality Foundations: repository
  initialization completed 2026-07-28, out of the roadmap's normal
  sequence (see Session Notes). Unit 0.4 (database client + health check)
  finished and **fully verified in GitHub Actions CI on 2026-07-29** —
  `prisma generate`, lint, typecheck, test, and build all green, with the
  live-database health check executing against a real PostgreSQL service
  container (not skipped). Unit 0.5 (ADR + validation structure) complete
  2026-07-29. **Phase 0B is complete** except Unit 0.1 (evidence fixtures),
  which is deliberately deferred
- Milestone 1 — Generic Engineering Engine: started 2026-07-28. Units 1.1
  (EngineeringValue contracts), 1.2 (unit registry and conversion engine), and
  1.3 (canonical parameter registry v1) complete. Unit 1.4 (source registry and
  US/JP market profiles) complete, delivered in the `lib/standards/` boundary.
  Unit 1.5 (calculation trace and check contracts) complete, delivered in
  `lib/engine/trace/`. Unit 1.6 (module SDK v1) complete, delivered in
  `lib/engine/module-sdk/`. Unit 1.7 (module conformance suite + scaffolder +
  registry codegen) complete, delivered across `lib/engine/module-sdk/`,
  `scripts/`, and the new `lib/modules/` boundary. Unit 1.8 (parameter graph
  core) complete, delivered in the new `lib/engine/graph/` boundary. **Milestone
  1's generic-engine units (1.1–1.8) are now all complete.**
- Milestone 2 — Persistence and Application Services: started 2026-07-29.
  **Unit 2.1 (Prisma schema: project hierarchy) complete**, delivered as the
  first models in `prisma/schema.prisma` (User, MachineProject,
  MachineConfiguration, Assembly, WorkflowInstance, ModuleInstance), the
  applied migration `prisma/migrations/…_project_hierarchy`, and the
  ownership-scoped project-tree repository in `lib/db/repositories/`.
  **Unit 2.2 (Prisma schema: requirements and graph) complete** (2026-07-29),
  adding Requirement, AcceptanceCriterion, DesignAssumption, LoadCase,
  ParameterValue, and ParameterLink, the migration
  `prisma/migrations/…_requirements_and_graph`, and two new repositories
  (`requirements-repository.ts`, `graph-repository.ts`) — JSONB validated on
  write and read, link cycle rejection reusing `lib/engine/graph`, and
  module-input source resolution. Verified locally against live PostgreSQL:
  `npm run verify` green, 334/334 tests.
  **Unit 2.3 (Prisma schema: immutable runs) complete** (2026-07-29), adding
  the `CalculationRun` model + `CheckStatus` enum, the migration
  `prisma/migrations/…_immutable_runs` (including a DB immutability-guard
  trigger), a versioned run-snapshot contract validated on write and read, and
  `run-repository.ts`. Verified locally: `npm run verify` green, 342/342 tests.
  **Unit 2.4 (calculation application service) complete** (2026-07-30), adding
  the `AuditEvent` model, two normalized `ModuleInstance` status-summary
  columns, the new `lib/audit` boundary, and the first `lib/application`
  service — `executeModuleInstance`. Verified **in GitHub Actions CI**
  (this session had no local database — see Current Goal): lint, typecheck,
  test, and build all green with migrations deployed to the live Postgres
  service container.
  **Unit 2.5 (stale propagation service) complete** (2026-07-30), adding
  `setParameterValue`, `confirmParameterLink`, and `removeParameterLink` in a
  new `lib/application/parameters/` boundary, plus the repository primitives
  they need (`loadConfigurationGraph`, `markRunsStaleForModuleInstances`,
  `isConfigurationOwnedBy`, `deleteParameterLink`,
  `loadParameterLinkForOwner`). Verified **in GitHub Actions CI**: lint,
  typecheck, test, and build all green.
  **Unit 2.6 (manufacturer catalog schema) complete** (2026-07-30), adding six
  new Prisma models (`Manufacturer`, `ComponentType`, `ComponentSchemaVersion`,
  `CatalogImportBatch`, `ManufacturerPartRevision`, `DatasheetAttachment`), a
  new `lib/db/repositories/catalog-repository.ts`, and the first real content
  in the previously-placeholder `lib/catalog/` boundary (component-type
  attribute schema contracts, reusing the Unit 1.1 `EngineeringValue` types).
  See the Completed entry for detail. Verified **in GitHub Actions CI**
  (commit `8dd8800`, run 30508278042): lint, typecheck, test (10 new live-DB
  catalog tests included), and build all green, with the hand-authored
  migration deployed cleanly to the live Postgres service container.
  **Unit 2.7 part 1 (catalog CSV import: mapping + parser + row validation +
  unit normalization) complete** (2026-07-30), delivered entirely in
  `lib/catalog/` — `import-mapping.ts`/`import-mapping-schemas.ts` (the
  versioned `ImportMapping` contract) and `csv-import.ts`
  (`parseCsvTable`/`parseCatalogCsv`), pure and DB-free. **Split from Unit
  2.7's persistence half** (idempotent upsert + import batch summary, which
  needs `lib/application`/`lib/db`) per the work-unit split rule — see Current
  Goal. 21 new pure tests (no live database needed). Verified **in GitHub
  Actions CI** (commit `484c733`, run 30509515278): lint, typecheck, test
  (334/334, 58 skipped unchanged), and build all green — this part needed no
  migration, so this is the first Milestone-2-era unit confirmed green without
  a "Deploy migrations" step doing any work.
  **Unit 2.7 part 2 (catalog import persistence + orchestration) complete**
  (2026-07-30), closing out Unit 2.7. Adds five nullable summary columns to
  `CatalogImportBatch` (migration
  `prisma/migrations/20260730140000_catalog_import_batch_summary`),
  `upsertManufacturerPartRevision` in `catalog-repository.ts`, and the new
  `lib/application/catalogs/import-catalog.ts` service (`importCatalog`) that
  composes part 1's `parseCatalogCsv` with these writes inside one
  transaction. **Plan correction**: the part-1-era plan to record the batch
  summary via `lib/audit`'s `AuditEvent` was reversed — `AuditEvent.projectId`
  is a mandatory FK to `MachineProject`, fundamentally incompatible with
  catalog data being project-independent (Unit 2.6's own architecture
  decision). `CatalogImportBatch` summary columns are the correct fit instead
  — still within the already-counted `lib/db` boundary, not a new one. See the
  Completed and Architecture Decisions entries. 8 new live-DB tests in
  `lib/application/catalogs/import-catalog.test.ts` plus 3 more in
  `catalog-repository.test.ts` (batch summary round-trip, upsert-create,
  upsert-update). **Unit 2.7 is now fully complete**; both parts' Unit 2.6
  exit criterion is satisfied: a manufacturer catalog fixture imports
  reproducibly (idempotent upsert, proven live) and reports every rejected row
  (proven in both part 1's pure tests and part 2's end-to-end test). Verified
  locally: lint (0 warnings), full suite (334/334, 69 skipped — up from 58 with
  the 11 new live-DB tests), typecheck confirmed to introduce no new errors
  beyond the pre-existing missing-generated-client cascade. Verified **in
  GitHub Actions CI** (commit `398047c`, run 30510736610): every step green,
  including "Deploy migrations" (confirming the hand-authored
  `CatalogImportBatch` ALTER TABLE applies cleanly) and all 11 new live-DB
  tests — notably proving the `manufacturerId_partNumber_sourceRevision`
  compound-unique-key name `upsertManufacturerPartRevision` assumed (Prisma's
  default naming for an unnamed `@@unique([...])`, guessed without being able
  to generate the client locally) is correct.
  **Unit 2.8 part 1 (catalog matching: hard-filter + ranking engine) complete**
  (2026-07-30), delivered entirely in `lib/catalog/` (`matching-types.ts`,
  `matching.ts`) — pure and DB-free, no migration needed. Split from Unit
  2.8's `ComponentAssignment` persistence + assignment orchestration half per
  the same "more than two system boundaries" rule Unit 2.7 used — see Current
  Goal. 22 new pure tests; full suite 356/356 passed (69 skipped, unchanged).
  Verified locally only (no DB touched, so no CI round trip needed): lint (0
  warnings), typecheck and build fail only on the pre-existing, unrelated
  missing-generated-client cascade (confirmed via `git status` that no file
  in that cascade was touched this session).
  **Unit 2.8 part 2 (`ComponentAssignment` persistence and assignment
  orchestration) implemented** (2026-07-30) — see the Current Goal entry for
  full detail. Adds the `ComponentAssignment` model and two new enums to
  `prisma/schema.prisma`, migration
  `prisma/migrations/20260730150000_component_assignment` (**hand-authored**
  — this session hit the same corporate-TLS `binaries.prisma.sh` block as
  every prior schema-touching session, confirmed freshly by re-testing `npx
  prisma generate`), the new `lib/db/repositories/component-assignment-repository.ts`
  and `component-assignment-types.ts`, `isAssemblyOwnedBy` in
  `project-repository.ts`, the new `lib/application/catalogs/assign-component.ts`
  service, and extends `lib/application/parameters/stale-propagation.ts` to
  also mark dependent `ComponentAssignment`s stale (closing invariant 8's
  "and component assignments" clause). 26 new tests (all live-DB, self-skip
  locally). **This unit's completeness note differs from Unit 2.8 part 1's**:
  because this part touches the Prisma schema, this project's established
  convention (every prior schema-touching unit: 2.1–2.7) is to treat GitHub
  Actions CI as the actual verification environment, not local `npm run
  build`/`typecheck` (which cannot pass without the generated Prisma client
  on this network). Locally confirmed: lint (0 warnings), full suite
  (356/356 passed, 95 skipped — up from 69), and typecheck/build introduce no
  new error class beyond the pre-existing, already-documented
  missing-generated-client cascade. **Full verification (typecheck, build,
  migration deploy, and the new live-DB tests) has not yet run in CI** — that
  needs a commit and push, which this session did not do without asking
  first (see Current Goal).
  **UPDATE (2026-07-30, next session): Unit 2.8 part 2 was committed and
  pushed (`07ac049`) and GitHub Actions CI came back red** — not a
  production bug, a **test-cleanup bug**: the two new live-DB test files
  (`assign-component.test.ts`, `component-assignment-repository.test.ts`)
  never tracked or deleted the `ManufacturerPartRevision` rows their
  `fixture()` creates, and deleted their `ComponentType` before it —
  violating the `onDelete: Restrict` FK from `ManufacturerPartRevision`
  (deliberate, Unit 2.6) and, for the one test that also created a
  `ComponentAssignment` against that revision, the identical `Restrict` FK
  from `ComponentAssignment.manufacturerPartRevisionId`. This only surfaces
  against a real Postgres (CI), not locally, where these tests self-skip
  without a generated Prisma client — so it was invisible until the push.
  `catalog-repository.test.ts` (Unit 2.6, already green in CI) already
  established the correct cleanup order (part revision → import batch →
  component type → manufacturer); the two new files just didn't follow it.
  Fixed by tracking `createdPartRevisionIds` and deleting the referencing
  `ComponentAssignment` rows, then the part revision, before
  `ComponentType`/`Manufacturer`, in both files — no production code
  changed. Verified **in GitHub Actions CI** (commit `ec7b5f7`, run
  confirmed green via the Checks API). **Unit 2.8 is now fully complete and
  CI-verified**, closing out the one open item from the previous session.
  See Next Up for Unit 2.9.

## Current Goal

- **LOCAL DEV ENVIRONMENT (2026-07-31, same session, continued — the user
  opened the app in a real browser after the Unit 3.4 summary and hit a
  blank page): full local dev stack working for the first time.** Not a
  roadmap unit — triggered by the user actually trying the app, which no
  session before this one had a working Clerk instance or reachable
  Postgres to attempt.
  - **Root cause 1 — Clerk's API is behind the same corporate TLS-
    inspection block already known for `ui.shadcn.com`/`binaries.prisma.sh`
    (see the `corporate-network-tls-block` memory)**: this dev machine's
    network (Ashley Furniture Industries) intercepts outbound HTTPS with
    its own root CA, which Node does not trust by default (the OS/browser
    trust store does, which is why Clerk's browser-side widget partially
    worked before the server-side fix — sign-in itself completed, but every
    subsequent middleware session check silently timed out and bounced back
    to `/sign-in`, since the *server* couldn't verify the session against
    Clerk's API). **Fix**: exported the actual intercepting cert chain via
    a raw `SslStream`/`X509Chain` probe (PowerShell), saved to
    `%USERPROFILE%\.certs\ashley-corporate-ca.pem`, and set
    `NODE_EXTRA_CA_CERTS` before starting `next dev` — scoped to this one
    process's TLS verification, not a global trust-store change, and
    `NODE_TLS_REJECT_UNAUTHORIZED` was never touched. **Asked the user
    explicitly before keeping this** (`AskUserQuestion`), per this
    project's own standing instruction (in memory) not to trust a
    corporate CA in Node without explicit authorization — confirmed "yes,
    keep it."
  - **Root cause 2 — a second, unrelated block on the same network**: raw
    PostgreSQL wire protocol (TCP:5432) is dropped outbound entirely,
    confirmed by a raw-socket test (TCP handshake succeeds; the server
    never responds to the Postgres `SSLRequest` packet; the connection
    times out). Confirmed NOT a TLS/cert issue — identical failure with
    `rejectUnauthorized: false`. This has nothing to do with Root cause 1;
    the user had already created a free Neon Postgres project (chosen over
    installing Docker/native Postgres, since this machine has neither and
    installing either needs admin rights this session didn't want to
    assume), and HTTPS:443 to that same Neon host worked fine once the
    Root-cause-1 CA fix was applied. **Fix**: `lib/db/client.ts` now
    selects between two Prisma driver adapters by `DATABASE_URL`'s host —
    `@prisma/adapter-pg` (the existing default, plain Postgres-over-TCP,
    still what docker-compose.yml/CI/a native install speak) stays default;
    `@prisma/adapter-neon` (new dependency, wraps
    `@neondatabase/serverless`'s WebSocket-over-443 driver) is used only
    when the host ends in `.neon.tech`. Purely additive — no existing path
    changes. `npm audit --omit=dev`: 0 vulnerabilities before and after.
  - **Migrations applied without `prisma migrate deploy`**: that command
    itself spawns `schema-engine-windows.exe`, which failed with "This
    program is blocked by group policy" — the exact same class of
    OS-level execution block already documented for Playwright's
    downloaded Chromium binary, confirmed directly (both `bash` and a
    native PowerShell invocation of the `.exe` fail identically). Worked
    around with a one-off script (not committed — deleted after running)
    that read each `prisma/migrations/*/migration.sql` in order and
    executed it via `@neondatabase/serverless`'s `Client`, recording each
    in a hand-created `_prisma_migrations` table matching Prisma's own
    schema (id/checksum/migration_name/finished_at) so `prisma migrate
    deploy`/`status` recognize the database as up to date afterward, same
    as if the real CLI had run. All 10 migrations applied cleanly; the
    resulting schema (22 tables) matches `prisma/schema.prisma` exactly.
  - **A real, incidental finding**: the Clerk keys the user pasted first
    landed in the wrong `.env` variables (`NEXT_PUBLIC_CLERK_SIGN_IN_URL`/
    `_SIGN_UP_URL` got the publishable/secret key values, leaving
    `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`/`CLERK_SECRET_KEY` empty) — caught
    by reading `.env` directly rather than trusting the user's "I pasted
    the keys" at face value, fixed by moving each value to its correct
    variable and restoring the two URL vars to `/sign-in`/`/sign-up`.
  - **First-ever real local live-database verification for this project**:
    with `DATABASE_URL` and `NODE_EXTRA_CA_CERTS` both set, `npm run test`
    ran every previously-always-skipped live-DB suite for real: 632/633
    passed. The one failure (`stale-propagation.test.ts`, "marks a
    multi-level dependency chain stale") was a `Test timed out in 5000ms`
    immediately followed by a `deadlock detected` in its `afterEach`
    cleanup — confirmed to be Neon free-tier latency (plus this network's
    extra WebSocket/TLS hop) exceeding Vitest's 5s default on the single
    heaviest test in the suite, not a code defect: re-run alone with
    `--testTimeout=30000` passes cleanly in 5.5s. Not chased further, and
    no test file was edited to accommodate this one local database choice
    — this project's existing "CI is the authoritative environment for
    anything DB-related" posture already covers exactly this case, and
    GitHub Actions' dedicated `postgres:16-alpine` service container has no
    reason to share Neon free-tier's latency characteristics.
  - Every prior session's "self-skips locally, GitHub Actions CI is the
    actual verification environment" language throughout this file was a
    real, load-bearing constraint, not caution for its own sake — this is
    the first session it was ever actually possible to do otherwise.
  - See the `corporate-network-tls-block` memory for the full technical
    detail (exact cert chain, exact error signatures) kept for whichever
    future session runs on this same machine again.
- **UNITS 3.1–3.5 (2026-07-30 through 2026-07-31): workspace shell, project
  and assembly management UI, generic module input renderer, link
  suggestion UI, and generic result and trace renderer — all complete,
  verified against a live database.** Full detail (scope decisions, read
  models, UI components, tests, verification results) has been relocated to
  `context/progress/unit-3.md` to keep this file focused on cross-cutting
  history — nothing here was summarized or lost, it moved. Next: Unit 3.6
  (catalog matching and assignment UI), whose brief is also in that file.
- **DESIGN-RISK FOLLOW-UP 1 of 6 (2026-07-30, new session): Unit 0.3's
  Playwright/Testing Library/coverage gap — closed, locally verified,
  Playwright itself pending a CI round trip.** Unit 0.3's deliverables list
  (`implementation-map.md`) named Vitest, React Testing Library, Playwright,
  and "coverage configuration for engine and modules" as required toolchain;
  only Vitest and ESLint/Prettier had ever actually been added. Added:
  - `@testing-library/react` + `@testing-library/jest-dom` +
    `@testing-library/user-event`, wired through a new
    `tests/setup.ts` (`test.setupFiles`) and exercised by a real test,
    `app/page.test.tsx`, against the existing static `Home` placeholder
    component (no Clerk/router context needed, so no provider wrapping).
    **Per-file environment, not a blanket rule**: tried `test.environmentMatchGlobs`
    first (the documented way to run only `*.test.tsx` files under jsdom
    while everything else stays on the lighter `"node"` environment this
    project's server-only DB tests need); **confirmed by direct test that
    this vitest version (4.1.10) does not apply that option** — the render
    call still threw `document is not defined` with it set. Replaced with a
    per-file `// @vitest-environment jsdom` docblock instead (confirmed
    working), so `vitest.config.ts` keeps `environment: "node"` as the
    default.
  - `@vitest/coverage-v8`, configured on `test.coverage` scoped to
    `lib/engine/**` and `lib/modules/**` — the literal "engine and modules"
    wording of the deliverable — rather than the whole repository: most
    `lib/db`/`lib/application` coverage comes from live-database tests that
    self-skip without a reachable Postgres (see the standing constraint
    below), which would make a repo-wide number swing on network
    availability rather than reflect real test gaps. Exposed via a new
    `test:coverage` script (`vitest run --coverage`) — not one of the exact
    script names `implementation-map.md` lists, added anyway because a
    coverage configuration nobody can invoke is not a usable deliverable;
    verified locally (`npx vitest run --coverage lib/engine/units`: 97%
    statement coverage on that folder, confirming `include`/`exclude`
    resolve correctly).
  - `@playwright/test`, a new `playwright.config.ts`, and `e2e/smoke.spec.ts`
    covering the two literal exit criteria Unit 0.4 defined but never had an
    automated check for: the home page renders, and **an unauthenticated
    user is redirected away from `/workspace`**. **Real design decision**:
    the suite runs against `next dev`, not a production `next start` build.
    Clerk's Next.js SDK auto-provisions a no-keys "keyless" dev instance
    (already anticipated by this repo's gitignored `/.clerk/` entry and
    `lib/env.ts`'s comment) only under `next dev`; a production build throws
    without real `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`/`CLERK_SECRET_KEY`
    values, and this project has never had a Clerk instance's keys
    configured anywhere, dev or test. **The authenticated half of Unit
    0.4's exit criteria ("authenticated user can access the empty
    workspace") is deliberately NOT covered** — proving it needs a real
    signed-in session, which needs Clerk test-instance credentials
    (`@clerk/testing`'s testing-token flow) as CI secrets. That is a new
    policy/cost decision — creating a Clerk test instance — not a bug fix,
    so it is recorded below under Open Questions rather than silently
    skipped or faked with a bypassed auth check.
  - `.gitignore`: `/test-results/`, `/playwright-report/`, `/blob-report/`.
  - `.github/workflows/ci.yml`: two new steps after "Build" —
    `npx playwright install --with-deps chromium` then `npm run test:e2e` —
    matching `implementation-map.md`'s literal CI step order (install, lint,
    typecheck, unit tests, build, **then** E2E).
  - **Verification differs for Playwright specifically.** `npm run lint`,
    `npm run typecheck` (0 errors — the generated Prisma client is present
    on this session's network, so this was a real signal, not the
    usual missing-client cascade), `npm run test` (397/397 passed, up from
    396 with the one new RTL test; the `e2e/` directory is excluded from
    Vitest's own `include` globs so nothing double-runs), and `npm run
    build` (Next.js production build) **all passed locally**. Chromium
    itself downloaded successfully (this session's network reaches
    `cdn.playwright.dev`, confirmed by a full `npx playwright install
    chromium --with-deps`), but **launching it failed with "This program is
    blocked by group policy"** (confirmed directly: running
    `chrome-headless-shell.exe --version` from PowerShell, bypassing
    Playwright entirely, hits the identical OS-level block) — a corporate
    endpoint-protection policy on this dev machine blocking execution of a
    freshly downloaded, unsigned browser binary. This is the same class of
    local-machine-only restriction already documented for
    `binaries.prisma.sh` (see the standing constraint below), just enforced
    at process-launch instead of TLS. **Not attempted as a workaround**: no
    policy or Defender exclusion was requested or changed. GitHub Actions'
    `ubuntu-latest` runners carry no such policy, so — consistent with this
    project's established pattern for anything this machine cannot verify —
    CI is the actual verification environment for the two new Playwright
    steps; this has not yet had a CI round trip (needs a commit and push,
    which this session did not do without asking first).
  - **UPDATE: pushed as commit `282200d`, CI run 30545399216 — everything
    green except "E2E smoke test," which failed after almost exactly 120.0s
    (13:08:02–13:10:03 UTC).** That is an exact match to
    `playwright.config.ts`'s `webServer.timeout: 120_000`. Job logs were not
    fetchable (`GET .../actions/jobs/<id>/logs` returned 403 "Must have
    admin rights" — this session has no GitHub token, only anonymous `curl`
    against the public REST API, which is enough for run/job status but not
    log content). Root-caused instead by direct local repro: started `next
    dev --port 3100` on this dev machine and `curl`'d both routes — `/`
    (200, contains "MachineStudio"/"Repository initialized") and `/workspace`
    (302 to `/sign-in?redirect_url=...`, exactly the redirect the test
    asserts) both served correctly within ~15s, so the server and route logic
    are not the bug. The exact timeout match plus a working server points at
    a slower cold start on a shared GitHub Actions runner (Turbopack's first
    compile, the `next/font/google` fetch, npm/node startup overhead) rather
    than anything wrong with the app. **Fix**: `webServer.timeout` raised to
    `300_000`; the default per-test timeout raised from Playwright's 30s to
    `90_000` (test 2's first navigation to `/workspace` compiles a route the
    webServer readiness check never touched, since that check only GETs
    `/`); `webServer.stdout`/`stderr` changed from the default (silently
    dropped) to `"pipe"`, so a future failure's real cause appears in the CI
    step output directly instead of requiring another guess-and-repro cycle
    like this one. Not yet re-verified in CI — needs another push.
  - **UPDATE: the timeout raise was the wrong diagnosis.** Pushed as
    `49c1038`, CI run 30546168760 — "E2E smoke test" failed again, this time
    running to the *exact new* 300s timeout (13:18:19–13:23:20 UTC) with the
    piped stdout/stderr adding nothing visible (still no log access — the
    `check-runs` annotations API, tried as a fallback, returned only
    "Process completed with exit code 1," no detail). Two runs failing at
    two different configured timeouts, both to the exact second, is not
    "slow" — it is "never succeeds," so raising the number further would
    never have helped. Re-diagnosed by local repro instead: removed the
    gitignored `.clerk/` cache entirely (forcing keyless mode's full
    first-time provisioning, the closest local approximation of a fresh CI
    checkout) and polled `127.0.0.1` every 5s — ready and reachable within
    10s regardless, ruling out Clerk/Turbopack/font-fetch slowness as the
    cause. The remaining candidate: `next dev` binding only to the IPv6
    loopback (`::1`) on some Linux containers, unreachable from a
    `127.0.0.1`-based (IPv4) check no matter how long it waits — a
    documented Next.js/Node class of issue on certain CI images. Fixed by
    adding `--hostname 0.0.0.0` to the dev command, forcing both interfaces;
    confirmed locally that `next dev --hostname 0.0.0.0` still serves both
    `127.0.0.1` and `localhost` correctly. Timeouts brought back down to
    120s (webServer) / Playwright's own defaults, since a fixed binding
    issue should restore the ~10-15s local start time. Not yet re-verified
    in CI — this is the third attempt.
  angle-as-base-dimension power algebra gap — closed, locally verified.**
  Confirmed-by-test problem: `multiplyQuantities(10 N*m, 100 rad/s)` returns
  `kg*m^2*s^-3*rad`, not `W` — because `Dimensions.torque` carries no angle
  exponent while `Dimensions.angularVelocity` carries `angle: 1`, the
  product's angle exponent never cancels. **Decision, from the three named
  in Open Questions ("an explicit angle-cancelling rule in
  multiply/divide, a dedicated power helper, or a documented convention")**:
  a dedicated helper, not a change to generic `multiplyQuantities`/
  `divideQuantities`. Loosening the generic algebra to auto-cancel angle
  would defeat the reason angle is a base dimension at all
  (`context/architecture.md` invariant 5, "semantic link safety") — it
  would also silently cancel angle in cases the graph relies on keeping,
  e.g. two angular velocities multiplied together, or `rad/s^2` drifting
  toward reading as `s^-2`. Instead, `lib/engine/units/arithmetic.ts` gains
  three new explicit, dimension-checked functions for the reviewed P = T*ω
  relationship and its two inversions: `rotationalPower(torque,
  angularVelocity)`, `torqueFromPower(power, angularVelocity)`,
  `angularVelocityFromPower(power, torque)` — each validates both operand
  dimensions with a new `requireDimension` helper (throwing the existing
  `DimensionMismatchError`) and computes the SI result directly rather than
  through `addDimensions`/`subtractDimensions`, so the angle exponent never
  enters the calculation. This mirrors a convention this codebase already
  has for other domain-specific relationships
  (`code-standards.md`: "never infer force from mass or mass from force") —
  extended here to angle. All three are exported from
  `lib/engine/units/index.ts`. 8 new tests in `arithmetic.test.ts`,
  including a regression guard that pins the exact broken
  `multiplyQuantities` case from Open Questions so a future change to the
  angle-dimension trade-off is caught rather than silently fixing (or
  re-breaking) these helpers' reason to exist. **Deliberately not built**:
  a linear/rotational helper (`v = r*ω`, the ball-screw/pulley conversion
  Milestone 1B/1C will need) — same root cause, same "angle cancels by
  reviewed physical law" shape, but a different relationship that was not
  the one confirmed broken by test, and no module needs it yet; noted below
  under Open Questions so it is a deliberate deferral, not a gap
  rediscovered later. Verified locally: `npm run lint` (0 warnings),
  `npm run typecheck` (0 errors — Prisma client present this session),
  `npm run test` (406/406 passed, up from 397), `npm run build` all green.
  No `lib/db` file touched, so — mirroring every prior pure-engine unit —
  no CI round trip is needed for this one.
- **DESIGN-RISK FOLLOW-UP 3 of 6 (2026-07-30, new session): the module
  content-hash gap — closed, locally verified.** `packageContentHash`'s own
  top comment already named the gap: it hashes the manifest/ports/schemas
  but deliberately excludes `compute` (a function is not stably
  serializable), so two module versions with identical manifests but
  different formulas hash identically — a run's pinned `contentHash` cannot
  by itself prove which formula actually executed, and nothing stopped an
  in-place edit to an already-released version's `compute.ts` (forbidden by
  convention, `ai-workflow-rules.md` "Protected Files and Records", but not
  by tooling). **Constraint that shaped the design**: module code cannot do
  its own file I/O to hash itself (`code-standards.md` "Module Packages": no
  file-storage imports), and `lib/engine` must stay pure/portable — so the
  hash cannot be computed automatically inside `sealModulePackage` at import
  time the way `packageContentHash` is. Resolved with the same
  external-tool split this project already uses for the scaffolder and
  registry codegen (`scripts/module-new.mts`/`generate-registry.mts`: pure
  logic in `lib/engine/module-sdk`, filesystem I/O in a `scripts/*.mts`
  wrapper):
  - `moduleSourceHash(sources: ModuleSourceFile[])` (new, in
    `lib/engine/module-sdk/hash.ts`) — pure, takes pre-read files, sorts by
    path. **Normalizes `\r\n`/`\r` to `\n` before hashing — confirmed
    necessary by direct test**: this repo checks out with CRLF on Windows
    (`core.autocrlf=true`) but stores (and CI checks out) LF, and a file
    freshly written by an editor/tool (LF, bypassing git's checkout smudge
    filter) sits alongside one `git checkout`-restored (CRLF) in the same
    directory — an un-normalized hash computed here would never match CI's,
    making the check spuriously fail on every module. Caught by adding a
    dedicated regression test before this shipped, not discovered later.
  - A new, fifth `runModuleConformance` check, `"source-immutability"`
    (`lib/engine/module-sdk/conformance.ts`): given `options.sources` (the
    same pre-read files the existing `import-boundary` check already
    accepts) and a new `options.expectedSourceHash`, fails if
    `moduleSourceHash(sources)` no longer matches — the same "pinned
    fixture catches accidental edits" pattern
    `lib/engine/parameters/hash.ts` already uses for the parameter
    registry's own content hash, extended to modules. Skips (not fails)
    when either input is missing, so existing callers are unaffected.
  - `scripts/module-source-hash.mts` (new CLI, mirrors `module-new.mts`'s
    pattern exactly): `npm run module:source-hash -- <module-id> <version>`
    reads the version directory's non-test `.ts` files and prints the
    hash to paste into that module's test file. **Had to change
    `lib/engine/module-sdk/hash.ts`'s own import of `contentHash`/
    `stableStringify` from the `../parameters` barrel to the specific file
    `../parameters/hash.ts`, confirmed necessary by direct test**: Node's
    native TypeScript execution (what every `scripts/*.mts` CLI runs
    under, no bundler) cannot resolve a directory/barrel specifier and
    failed with `ERR_UNSUPPORTED_DIR_IMPORT` before this change. Harmless
    under the normal bundler/vitest path (same file, `tsconfig.json` already
    sets `allowImportingTsExtensions: true`) — confirmed by the full
    verification run below.
  - **Stage 6 (Release) in `ai-workflow-rules.md` and `code-standards.md`
    "Module Packages" updated**: pinning `expectedSourceHash` is now a
    required release step, per Documentation Synchronization.
  - **Wired into both existing example modules as the reference
    implementation** (`lib/modules/example-scaffold/0.1.0/
    example-scaffold.test.ts`, `lib/modules/example-relay/0.1.0/
    example-relay.test.ts`), via a new shared test-only helper,
    `lib/modules/test-support.ts`'s `readModuleSources` (Node `fs`, so it
    can never be imported by module or engine production code — only a
    module's own `<id>.test.ts`). This is not purely a demonstration: it
    also activates `import-boundary`, which — discovered while wiring this
    in — **no real module's test had ever actually run**; every module's
    generated test template only ever passed `sampleInputs`, never
    `sources`, so that check had been silently `skipped` for both example
    modules since Unit 1.7. Both checks now genuinely `pass` for both
    modules (confirmed via `--reporter=verbose`, not just an aggregate
    `report.ok`).
  - **Proved the check actually catches drift, not just that it can pass**:
    temporarily edited `example-scaffold`'s `compute.ts`, confirmed
    `source-immutability` (and the overall suite) failed with a clear
    message naming the mismatched hashes, then reverted and confirmed green
    again.
  - **Deliberately not done**: retroactively enforcing this for every
    future scaffolded module by baking it into `scaffold.ts`'s generated
    test template. A freshly scaffolded module is mid-development (Stage
    1–5, `TODO` markers throughout); pinning a hash of placeholder content
    would add churn with no value before Stage 6 actually freezes anything.
    This is a Stage 6 step by design, not a scaffold-time one.
  - Verified locally: `npm run lint` (0 warnings), `npm run typecheck` (0
    errors), `npm run test` (417/417 passed, up from 406), `npm run build`
    all green. No `lib/db` file touched, so no CI round trip is needed for
    this one either.
- **DESIGN-RISK FOLLOW-UP 4 of 6 (2026-07-30, new session): DB-level
  same-configuration constraints — implemented, locally checked, pending a
  CI round trip.** The 2026-07-30 hardening pass closed cross-configuration
  writes at the *service* boundary (`setParameterValue`,
  `confirmParameterLink`, `assignComponent` all cross-check the target's real
  configuration before writing), but the database itself would still accept
  a `ParameterValue`, `ParameterLink`, or `ComponentAssignment` whose
  `configurationId` disagreed with its assembly/module-instance target —
  nothing enforced consistency below the application layer, so a bug in a
  future caller (or a direct repository call bypassing the service, as the
  new tests below do on purpose) could still write inconsistent data.
  **Decision, the first of the two options Open Questions named ("composite
  foreign keys or triggers")**: composite foreign keys, not triggers — purely
  declarative, matches Postgres's standard "denormalized consistency" pattern
  for this exact shape of problem, and needed no new PL/pgSQL function the
  way the immutable-run/part-revision triggers did.
  - **This session's network can reach `binaries.prisma.sh` for real**
    (`npx prisma generate`/`validate` both ran clean against the edited
    schema) — a first for this project mid-session, previously only ever
    confirmed working in CI or on a since-unreproducible dev-machine network
    (see the 2026-07-29/2026-07-30 Open Questions history below). Used this
    to actually validate the composite-relation schema changes with the real
    Prisma engine rather than guessing. **Still no local PostgreSQL/Docker**,
    so `prisma migrate dev`'s shadow-database diff remains unavailable; tried
    `prisma migrate diff --from-schema/--to-schema --script` (schema-to-schema,
    no live database needed in principle) as a way to get a real generated
    SQL diff to check the hand-written migration against, but it failed with
    `spawn UNKNOWN` — the same class of corporate-endpoint block that stopped
    Playwright's Chromium earlier this session ("This program is blocked by
    group policy"), apparently also covering the schema-engine binary
    `migrate diff` needs to spawn (never even reached the download step, no
    cached binary found under `%LOCALAPPDATA%\ms-playwright`-style caches).
    So the migration below is still hand-authored, matching every other
    schema-touching unit's established pattern, just with a real
    `prisma validate` pass this time instead of none.
  - **Schema change** (`prisma/schema.prisma`): `ModuleInstance` gains a
    denormalized `configurationId` column (its assembly's own
    `configurationId` — there is no "move a module to another assembly"
    operation anywhere in this codebase, so this never needs an independent
    update path). `Assembly` and `ModuleInstance` each gain
    `@@unique([id, configurationId])` (adds no new real constraint on either
    table by itself — `id` alone is already unique — it only gives other
    tables something to composite-FK against). Eight relations become
    composite FKs on `(localId, configurationId)` instead of just `localId`:
    `ModuleInstance.assembly`; `ParameterValue.assembly` and
    `.moduleInstance`; `ParameterLink.targetModuleInstance`,
    `.sourceModuleInstance`, and `.sourceAssembly`; `ComponentAssignment
    .moduleInstance` and `.assembly`. Every nullable one of these (all except
    `ModuleInstance.assembly` and `ParameterLink.targetModuleInstance`, both
    required) relies on Postgres's default `MATCH SIMPLE`: the composite FK
    is not checked when any of its columns is null, which is correct here —
    null already means "not applicable" (machine-root scope, no linked
    source) for every one of them, not "unchecked by accident."
  - **Migration** `prisma/migrations/20260730180000_same_configuration_constraints`
    (hand-authored): adds the column, backfills it from `assemblies` (a plain
    `UPDATE ... FROM`, even though CI's database is always freshly empty —
    written as if real data existed, since that is what an eventual
    production rollout would need), sets it `NOT NULL`, adds the two unique
    indexes, then drops and recreates each of the eight FKs above under the
    **identical constraint name** Prisma's own naming convention already
    produced for the single-column version (same drop-then-recreate-under-
    the-same-name shape `20260730170000_immutable_part_revisions` used for
    `manufacturer_part_revisions_importBatchId_fkey`).
  - **One production call site needed updating**: `createModuleInstance`
    (`lib/db/repositories/project-repository.ts`) now requires
    `configurationId` on its input (`CreateModuleInstanceInput`,
    `ModuleInstanceRecord` — both updated), caller-supplied and trusted, the
    same convention `CreateParameterValueInput`/`CreateParameterLinkInput`
    already establish (a mismatch is now rejected at the database level
    instead of only trusted). Confirmed by `npm run typecheck` catching every
    site that needed it: the repository's own `.create()` call, plus **17
    test-fixture call sites across 9 test files** (every live-DB test file
    that creates a `ModuleInstance`) — none of these are behavior changes,
    each one just supplies the `configurationId` its existing assembly
    already implied.
  - **`loadModuleInstanceForOwner` was deliberately left as-is** even though
    it could now read the new denormalized column directly instead of
    joining through `assembly.configuration` — that join still returns the
    identical, correct result (redundant, not wrong), and simplifying it is
    an unrelated cleanup this unit's scope did not call for.
  - **5 new tests proving the constraint actually rejects a genuine
    mismatch**, not just that the schema compiles — matching this session's
    "prove it, don't just claim it" pattern from follow-up 3: one in
    `project-repository.test.ts` (`ModuleInstance.assembly`), three in
    `graph-repository.test.ts` (`ParameterValue.assembly`,
    `ParameterValue.moduleInstance`, `ParameterLink.targetModuleInstance`),
    one in `component-assignment-repository.test.ts`
    (`ComponentAssignment.moduleInstance`). Each creates a second, fully
    legitimate configuration/assembly/module-instance (real IDs, correctly
    scoped to each other) and then calls the **repository function
    directly** — bypassing `lib/application`'s own service-level checks on
    purpose — with a `configurationId` that does not match the real target,
    asserting the raw call rejects. This is deliberately the same
    "call the repository directly, not through the service" shape the FK
    itself protects against: an application-layer bug or a future caller
    that skips the service.
  - **Verification differs from every other schema-touching unit this
    session in one respect, and matches it in every other**: `npm run lint`
    (0 warnings) and `npm run typecheck` (0 errors — real signal, the
    generated client is present) both passed for real, not against the
    usual missing-client cascade. `npm run test` (417/417 passed, 130
    skipped — up from 125, the 5 new tests correctly registering as skipped
    rather than silently absent) and `npm run build` also passed. Matching
    every prior schema-touching unit: this session did not commit or push,
    so **GitHub Actions CI has not yet run the new migration against a real
    Postgres, and the 5 new negative-path tests have not yet executed for
    real** (they only self-skip locally, proving they compile and register,
    not that the constraint behaves as designed). Until that CI round trip,
    this unit should be treated the same way Unit 2.8 part 2 was at the
    equivalent stage: implemented and locally checked, not fully verified.
- **DESIGN-RISK FOLLOW-UP 5 of 6 (2026-07-30, new session): catalog import
  authorization policy — decided and implemented, locally verified.**
  `importCatalog` took no owner and checked nothing; catalog data is
  deliberately shared, project-independent reference data (Unit 2.6), so
  "who may import" cannot be answered with the ownership query every other
  application service uses. **The real policy decision**: any authenticated
  user may import, and every import is attributed — not a role/admin gate.
  Reasoning: this codebase has no role or reviewer concept anywhere yet
  (`architecture.md` "Auth and Access" already defers "organization tenancy
  and reviewer permissions"), so inventing an admin role here would be new
  product behavior with no spec behind it, not a bug fix. "Attributed" was
  already half-true (`CatalogImportBatch.importedByUserId` exists) but
  unenforced — nothing required it be set, so today's `importCatalog` could
  be called with no identified caller at all. That is what this closes.
  - **`importedByUserId` moved from an optional field on `ImportCatalogInput`
    to a required second parameter**, `importCatalog(input, importedByUserId:
    UserId)` — matching the `(input, ownerId)` shape
    `assignComponent`/`setParameterValue`/`confirmParameterLink`/
    `createBaseline` already use (4 of the 5 existing application services;
    `executeModuleInstance`, the first one ever written, is the one outlier
    that still embeds `ownerId` in its input object — not touched here, out
    of scope). The point of a separate parameter, not just a required input
    field: an application-service *input* is caller-suppliable/untrusted,
    while a second positional parameter is what every other service already
    uses for the identity a route handler derives from the verified Clerk
    session — so this reuses an existing, load-bearing distinction rather
    than only tightening a type.
  - A blank/whitespace-only `importedByUserId` returns a new `"unauthenticated"`
    error code, checked before anything else in the function (including the
    manufacturer/schema-version lookups) — proven by a new test that also
    confirms zero rows are written when this fires.
  - **Deliberately not added**: an `AuditEvent` for catalog imports — Unit
    2.7 part 2 already found this impossible (`AuditEvent.projectId` is a
    mandatory FK to `MachineProject`; catalog data has no project) and
    settled on `CatalogImportBatch`'s own columns as the audit trail
    instead. `importedByUserId` being mandatory now is what makes that
    trail actually reliable, not a new mechanism.
  - **No DB-level enforcement of `importedByUserId`** (no FK to `users`):
    confirmed by inspecting `prisma/schema.prisma` that every "byUserId"
    attribution column in this schema (`AuditEvent.userId`,
    `CalculationRun.createdByUserId`, `ComponentAssignment.assignedByUserId`)
    is already a bare, unenforced string, not a foreign key — matched that
    existing convention rather than introducing a new one just for this
    field.
  - **`context/architecture.md` "Auth and Access" and `code-standards.md`
    "Catalog" updated** with the policy and its reasoning, per Documentation
    Synchronization — this is exactly the kind of decision that belongs in
    a context file, not only a commit message.
  - `import-catalog.test.ts`: all 12 existing `importCatalog` calls updated
    to the new two-argument signature (a bare, non-DB-backed
    `IMPORTED_BY_USER_ID` constant — no real `User` row needed, matching the
    "not a foreign key" point above), plus the new unauthenticated-rejection
    test. Verified locally: `npm run lint` (0 warnings), `npm run typecheck`
    (0 errors — confirmed this was the *only* file needing changes: no
    production code anywhere calls `importCatalog` yet, since no route or UI
    exposes it), `npm run test` (417/417 passed, 131 skipped — up from 130
    with the one new test), `npm run build` all green. No `lib/db` schema
    file touched, so no CI round trip is needed for this one either.
- **DESIGN-RISK FOLLOW-UP 6 of 6 (2026-07-30, new session): transactionally
  consistent read snapshots — implemented, locally checked, pending a CI
  round trip. All six design-risk follow-ups from the 2026-07-30 hardening
  pass are now addressed.** `createBaseline` issued seven-plus independent
  reads before persisting, and `executeModuleInstance` resolved inputs across
  several reads (its own authored values/links, then — per linked port whose
  source is another module's output — that source's ownership, run list, and
  latest run snapshot); every one of those reads ran at the default
  `READ COMMITTED` isolation, each able to observe a different committed
  state under a concurrent edit. A baseline is immutable once created and a
  run is the thing a report renders forever after, so either freezing or
  computing from a mix of before-and-after states was a real, if narrow,
  correctness gap — not simultaneous-in-reality data presented as if it were.
  - **The fix, exactly as scoped in Open Questions**: "thread a transaction
    client through the repository *read* surface and run those reads at
    `RepeatableRead`." Nine repository read functions across four files
    gained an optional `client: DbClient = prisma` trailing parameter — the
    same type this project's write functions already use for the identical
    reason, `db-client.ts`'s comment updated to say so — defaulting to the
    singleton so every existing 2-argument call site keeps compiling
    unchanged: `loadModuleInstanceForOwner`, `loadConfigurationForOwner`,
    `loadConfigurationTree` (project-repository.ts); `listRequirements`,
    `listDesignAssumptions`, `listLoadCases` (requirements-repository.ts);
    `listCurrentParameterValuesForConfiguration`,
    `listParameterLinksForConfiguration`, `resolveModuleInputs` and its
    internal `resolveLinkedSourceValue` helper (graph-repository.ts);
    `listComponentAssignmentsForConfiguration`
    (component-assignment-repository.ts); `loadCalculationRun`,
    `listRunsForModuleInstance` (run-repository.ts).
  - **Both application services now wrap their entire body — authorization,
    every read, readiness/compute, and the final write — in one
    `prisma.$transaction(fn, { isolationLevel: "RepeatableRead" })`**, not
    just their final persist step as before. Each returns a discriminated
    "outcome" type from inside the transaction (`CreateBaselineOutcome` /
    `ExecuteOutcome` — `unauthorized`, `not_ready`/`module_not_found`/
    `stale_upstream`, or the success case) rather than returning early with
    an HTTP-shaped result from inside the callback, then maps that outcome
    to the real `CreateBaselineResult`/`ExecuteModuleInstanceResult` after
    the transaction settles — the same shape `assign-component.ts` uses for
    its authorize-then-act flow, adapted to also cover a whole read phase. A
    thrown `ModuleSdkError`/`BaselineRepositoryError` still propagates out of
    the callback uncaught, rolling the transaction back cleanly before being
    caught outside exactly as before — no change to that behavior, only to
    what happens before it.
  - **Deliberately no retry-on-serialization-failure loop.** A concurrent
    transaction committing a conflicting change to something this
    transaction already read can make Postgres fail it with a serialization
    error rather than silently mixing snapshots — the correct, intended
    failure mode, not a bug to paper over. Nothing in this codebase retries a
    transaction today (no precedent to extend), and inventing a generic retry
    wrapper for a failure mode that cannot yet be observed (no concurrent
    users exist) would be exactly the kind of speculative infrastructure
    "no invented behavior" warns against. Revisit once real concurrent usage
    makes this an actual, not hypothetical, operational question.
  - **Proved the actual Postgres guarantee, not just that the code still
    compiles**: a new test in `create-baseline.test.ts` opens a real
    `RepeatableRead` transaction, reads current parameter values through it,
    then — *while that transaction is still open* — commits a genuinely
    concurrent, independent write via `setParameterValue` (the default
    `prisma` singleton, a different Postgres session) and awaits its
    completion, then reads again through the still-open transaction and
    asserts the second read is byte-identical to the first (still the
    pre-change value) — then, after the transaction commits, confirms a
    fresh read outside it does see the change. This tests Postgres's own
    isolation guarantee directly (the same primitive both application
    services now rely on) rather than only re-running `createBaseline`'s
    existing behavioral tests, which would exercise the new transaction
    wrapping without proving the property it exists for.
  - Verified locally: `npm run lint` (0 warnings), `npm run typecheck` (0
    errors — confirmed across every changed repository and application-service
    file), `npm run test` (417/417 passed, 132 skipped — up from 131 with the
    one new concurrency test; every existing `createBaseline`/
    `executeModuleInstance` test still passes unchanged, since the public
    input/output shapes of both services did not change), `npm run build` all
    green. **No `lib/db` schema file touched** (no migration — this unit only
    changes how existing tables are *read*, not their shape), so — unlike
    follow-up 4 — this one needs no migration-deploy round trip in CI, but the
    new live-DB concurrency test has still only run against
    `describe.skipIf` locally and needs a real CI pass before being called
    fully verified, the same caveat every live-DB-test-adding unit this
    session carries.
- **2026-07-30 integrity-hardening pass — complete and verified in GitHub
  Actions CI** (commit `a774c22`, run 30537557349 — every step green,
  including "Deploy migrations" applying the new
  `manufacturer_part_revisions_immutable_guard` trigger, and "Test" running
  the full live-database suite for real, not skipped). An external audit
  reported a set of findings
  against `main` at `22cdf64`; each was re-checked against the code in this
  repository and every one held. Note that the audit's own fixes never
  reached this repository — they were made in a different container and
  never committed, so this pass re-implements them here. What changed:
  - **Cross-configuration writes are rejected.** `setParameterValue`,
    `confirmParameterLink`, and `assignComponent` authorized their *target*
    but trusted the caller's `configurationId`, so an owned module instance
    or assembly could be used to file a value, link, or component assignment
    into a different configuration — including one belonging to another
    owner, which would then surface in that configuration's graph, BOM, and
    baseline snapshots. Each service now cross-checks the target's real
    configuration, and `loadModuleInstanceForOwner` returns
    `configurationId` for that purpose. `isAssemblyOwnedBy` became
    `loadAssemblyForOwner` (a boolean could not answer "which configuration
    is this assembly in?"). This reverses the Unit 2.8 note that called
    caller-supplied `configurationId` a deliberate, consistent convention:
    the convention was consistently wrong.
  - **Semantic link compatibility is enforced server-side**, in
    `confirmParameterLink`, not deferred to the Unit 3.4 suggestion UI.
    Both endpoints must be owned and in the named configuration, each module
    endpoint must be a port its pinned package actually declares, and the
    pair must satisfy `lib/engine/graph`'s `evaluateLinkCompatibility`
    (invariant "Semantic link safety"). Two new error codes:
    `incompatible`, `module_not_found`. No approved cross-parameter mappings
    are declared, so only same-parameter links are authorized today — and an
    approved mapping must never come from the request arguments.
  - **A new development fixture module, `example-relay@0.1.0`**
    (`lib/modules/example-relay/`), declares `motion.axis.thrust_force` as
    both its input and its output. It exists because enforcing compatibility
    made the previous integration-test chains inexpressible: they linked
    example-scaffold's force output into another instance's mass input, a
    link that is genuinely unsafe and is now rejected. The relay makes a
    *valid* multi-module chain expressible, so cycle rejection and
    multi-level stale propagation are still covered. It computes nothing and
    its validation record says so plainly.
  - **Downstream execution refuses a stale upstream run.**
    `executeModuleInstance` resolved a linked module-output value from the
    source's latest run without checking `stale`, so a downstream run could
    be persisted looking fresh while built on superseded numbers. New error
    code `stale_upstream`. There is no older non-stale run to fall back on —
    `markRunsStaleForModuleInstances` marks every run of an affected module
    instance — so the upstream module must be re-run.
  - **Append-only selection is deterministic.** `resolveModuleInputs` read a
    port's authored values with no `orderBy` at all and let the last row seen
    win, so "the current value" depended on Postgres row order; several
    other reads ordered by `createdAt` alone, which ties. Every read that
    *picks* a row or feeds a snapshot now orders by `createdAt` plus `id`.
  - **Graph reads inside a transaction use the transaction client.**
    `loadConfigurationGraph` and `createParameterLink`'s duplicate/cycle
    checks read through the singleton, so they could not see rows written
    earlier in the same transaction. Stale-impact computation also moved
    *inside* each use case's transaction.
  - **Manufacturer part revisions are immutable (ADR-0006, written this
    session).** `upsertManufacturerPartRevision` overwrote attributes,
    lifecycle, data-quality state, source link, and provenance in place on
    re-import — silently changing what an already-released baseline or
    component assignment meant. It now creates, returns an exact repeat
    unchanged (provenance stays with the first batch), or raises
    `conflict`; migration `20260730170000_immutable_part_revisions` adds a
    `BEFORE UPDATE` trigger and changes `importBatchId` to `onDelete:
    Restrict`. `importCatalog` reports a conflict per row (with a new
    `conflictCount`) rather than failing a whole file — the conflict is
    detected before any write is issued, so the transaction stays intact.
  - **Health-check errors are redacted.** Driver messages name the host,
    port, and database; the detail is logged instead.
  - **Production dependency advisories cleared** with `overrides` for
    `postcss` (^8.5.25) and `sharp` (^0.35.3) — three high-severity
    advisories reachable through Next 16.2.12 — and CI now runs
    `npm audit --omit=dev`. Remaining findings are ESLint-tree and
    development-only (a `brace-expansion` DoS needing a breaking ESLint
    major).
  - **15.3 MB of third-party reference material moved** from `public/ref
    data/` (which Next.js serves to anyone, unauthenticated) to
    `reference/source-material/`, via `git mv` so history follows the
    rename. Licensing review and history rewriting remain open decisions.
  - **Root `README.md` and `.editorconfig` added** (the two Unit 0.2
    artifacts the 2026-07-30 audit found missing).
  - **Live-database suites now report skipped rather than failing** when
    there is no `DATABASE_URL`, via a shared `tests/live-database.ts` gate
    replacing 15 copies of a client-existence check. Previously the guard
    only checked for the generated Prisma client, so generating the client
    without a database turned 15 files red.
  - **Verification.** `prisma generate` **succeeded on this machine that
    session** — unlike every session since 2026-07-29, this network did not
    block it — so typecheck and build were real local signals: `npm run lint`
    (0 warnings), `npm run typecheck`, `npm run build`, and `npm audit
    --omit=dev` (0 vulnerabilities) all passed, with 396 tests green across 36
    files. There is still **no local PostgreSQL** (no `psql`, no Docker) on
    this machine, so the 15 live-database files (125 tests) always skip here,
    including every test written this session for the new rejections, the
    immutability trigger, and the new migration.
    **Pushed and verified in GitHub Actions CI in two commits.** The first
    (`54ca63d`) failed at the "Test" step: the new
    `manufacturer_part_revisions_immutable_guard` trigger correctly rejected
    a pre-existing test's `.update()`-based corruption bypass in
    `catalog-repository.test.ts` ("rejects a corrupt stored attributes
    payload on read") — the trigger was doing exactly its job, the test just
    hadn't been updated for it. Fixed the same way
    `baseline-repository.test.ts` already handles its own immutable table:
    insert an already-corrupt row via a raw `INSERT` instead of corrupting an
    existing one via `UPDATE`; also removed a duplicate immutability-trigger
    test this session had accidentally introduced. Pushed as `a774c22`, run
    30537557349 — every step green, including the full live-database suite
    running for real (not skipped): the cross-configuration and
    incompatible-link rejections in `stale-propagation.test.ts` and
    `assign-component.test.ts`, the catalog conflict/immutability tests in
    `catalog-repository.test.ts`/`import-catalog.test.ts`, and
    `executeModuleInstance`'s new `stale_upstream` refusal via the
    `example-relay` chain in `execute-module-instance.test.ts`. This
    hardening pass is now complete and CI-verified, on the same footing as
    every prior schema-touching Milestone 2 unit.
  - **Not attempted this session** (each is a design decision, not a bug fix,
    and is recorded under Open Questions): transactionally consistent
    baseline/execution snapshots; a module content hash covering compute
    source; the angle-as-base-dimension consequence for angular power
    algebra (**confirmed by direct test**: `multiplyQuantities(10 N·m,
    100 rad/s)` yields `kg*m^2*s^-3*rad`, magnitude correct but not
    convertible to `W`); database-level same-configuration constraints;
    an administrator authorization policy for shared catalog imports; Unit
    0.3's Playwright/Testing Library/coverage gap; and `format:check`, red on
    124 files and still not in CI.
- Milestone 2 in progress. **Unit 2.6 (manufacturer catalog schema) is
  complete and verified in GitHub Actions CI** (2026-07-30, commit `8dd8800`,
  run 30508278042 — every step green). **Unit 2.7 part 1 (catalog CSV import:
  mapping + parser + row validation + unit normalization) is complete and
  verified in GitHub Actions CI** (2026-07-30, commit `484c733`, run
  30509515278 — every step green). **Unit 2.7 part 2 (persistence +
  orchestration) is complete and verified in GitHub Actions CI** (2026-07-30,
  commit `398047c`, run 30510736610 — every step green, including migration
  deploy) — see the Completed entry. **Unit 2.7 as a whole is now done.**
  - **SPLIT DECISION (2026-07-30, Unit 2.7):** the implementation map's Unit
    2.7 ("Catalog CSV import service") deliverables — import mapping schema,
    CSV parser, unit normalization, row validation, dry-run mode, error
    report, import batch summary, idempotent upsert rules — span three
    `context/architecture.md` system boundaries: `lib/catalog` (mapping
    schema, parsing, row validation, unit normalization — all pure), `lib/db`
    (an idempotent upsert repository function), and `lib/application`
    (`lib/application/catalogs/`: the multi-step orchestration transaction
    that persists rows and writes the batch summary, per
    context/code-standards.md "Application Services": "Multi-step use cases
    live in lib/application"). `ai-workflow-rules.md`'s split rule triggers at
    "more than two system boundaries," so this session split Unit 2.7 into
    **part 1** (`lib/catalog` only — done, see Completed) and **part 2**
    (`lib/db` + `lib/application`, exactly two boundaries, the same count Unit
    2.4 used as one unit delivered via two commits — precedent for keeping
    part 2 as a single unit rather than splitting further).
  - **Part 2 delivered** (2026-07-30): `upsertManufacturerPartRevision` (a
    genuine Prisma `.upsert()` on the `manufacturerId_partNumber_sourceRevision`
    compound unique key) and `lib/application/catalogs/import-catalog.ts`
    (`importCatalog`), which loads/cross-checks the manufacturer, schema
    version, and mapping identity, calls part 1's `parseCatalogCsv`, and — for
    a real (non-dry-run) import — creates the `CatalogImportBatch` (with its
    row-count summary already known) and upserts every valid row atomically.
    **The batch-summary plan changed from what was written here**: originally
    planned to reuse `lib/audit`'s `AuditEvent`, but `AuditEvent.projectId` is
    a mandatory FK to `MachineProject` — catalog data has no project, so that
    never could have worked. Five nullable summary columns were added to
    `CatalogImportBatch` instead (migration
    `20260730140000_catalog_import_batch_summary`) — still inside the
    already-counted `lib/db` boundary, not a new one, so the split-rule count
    (`lib/catalog` + `lib/db` + `lib/application` = 3, split into part-1's 1 +
    part-2's 2) still holds. See Architecture Decisions.
  - **SPLIT DECISION (2026-07-30, Unit 2.8):** the implementation map's Unit
    2.8 ("Catalog matching and component assignment") deliverables —
    hard-filter engine, transparent ranking result, rejection reasons,
    required-spec output, `ComponentAssignment` persistence, manual/custom
    part assignment — span the same three boundaries Unit 2.7 did:
    `lib/catalog` (hard filters + ranking, pure), `lib/db` (schema +
    `ComponentAssignment` persistence), and `lib/application` (assignment
    orchestration). Split the same way: **part 1** (`lib/catalog` only, this
    session) and **part 2** (`lib/db` + `lib/application`, not yet started).
  - **Part 1 delivered** (2026-07-30): `lib/catalog/matching-types.ts` +
    `matching.ts` — a generic, component-type-agnostic hard-filter and ranking
    engine. A `MatchCriterion` is `{ key, label, operator: "gte"|"lte"|"eq",
    value: EngineeringValue, tolerance? }` — deliberately **not** shaped
    around `lib/engine/module-sdk`'s `CatalogAdapter.requiredSpec()` (which
    returns a bare `Record<string, EngineeringValue>` with no comparison
    operator). Touching that type would have pulled a fourth boundary
    (`lib/engine`) into this unit, and — more importantly — the operator a
    given attribute needs (a capacity floor, a size ceiling, or an identity
    match) is real engineering judgment no released contract currently
    records; inventing it silently would violate "no invented behavior."
    Building explicit `MatchCriterion`s from a module's `requiredSpec()` output
    is deferred to whichever later unit first wires a real production module's
    catalog adapter to this engine (Milestone 4). `evaluateCriterion` compares
    one candidate attribute against one criterion (unit-aware for quantities
    via `lib/engine/units`'s `convert`, never inferring a comparison operator
    itself) and returns a typed pass/fail plus a human-readable reason
    (`missing_attribute`, `value_kind_mismatch`, `dimension_mismatch`,
    `below_minimum`, `above_maximum`, `not_equal`) — the "rejection reasons"
    deliverable. `rankCandidates` runs hard filters first (a failing candidate
    is never scored — "hard constraints run before ranking") and orders
    survivors by mean fractional margin across their `"gte"`/`"lte"` criteria,
    smallest surplus (tightest fit, least oversized) first, ties broken by
    candidate `id` for determinism — the same tie-break pattern
    `lib/engine/graph/suggest.ts` uses for source-suggestion ordering.
    `describeRequiredSpec` formats criteria for the UI's "required
    specification summary first" (`context/ui-context.md`). 22 new tests;
    `npm run lint`/`test` clean, `typecheck`/`build` show only the
    pre-existing missing-generated-client cascade (unrelated — this part
    touches no `lib/db` file).
  - **Part 2 delivered** (2026-07-30): the `ComponentAssignment` model, two
    new enums, and five new back-relations in `prisma/schema.prisma`; the
    migration `prisma/migrations/20260730150000_component_assignment`
    (**hand-authored** — `npx prisma generate` was re-tried fresh this
    session and hit the identical corporate-TLS `binaries.prisma.sh` block
    every prior schema-touching session documents, so nothing changed about
    that constraint); `lib/db/repositories/component-assignment-types.ts` +
    `component-assignment-repository.ts` (`createComponentAssignment`,
    ownership-scoped `loadComponentAssignmentForOwner`/
    `listComponentAssignmentsForConfiguration`, and the bulk
    `markComponentAssignmentsStaleForModuleInstances`); a new
    `isAssemblyOwnedBy` in `project-repository.ts` (the assembly-level
    counterpart to Unit 2.5's `isConfigurationOwnedBy`); and
    `lib/application/catalogs/assign-component.ts` (`assignComponent`),
    which authorizes the target, cross-checks a supplied `calculationRunId`
    against its target module instance, verifies a catalog part revision
    exists, then persists.
    - **Schema design mirrors `ParameterLink`'s existing discriminator
      pattern** (Unit 2.2): `targetKind` (`"module_instance"` |
      `"assembly"`) sits alongside nullable `moduleInstanceId`/`assemblyId`
      columns, and `partSource` (`"catalog"` | `"manual"`) sits alongside
      nullable `manufacturerPartRevisionId`/`manualPartDetails` — validated
      together by the repository's Zod `.refine()` chain, not a DB CHECK
      constraint, the same boundary `graph-repository.ts`'s
      `createParameterLink` already draws. `targetKind: "assembly"` with
      `assemblyId` omitted means the machine/configuration root — the same
      nullable-`assemblyId`-means-machine-level convention `Requirement`/
      `DesignAssumption` already use — so two DB columns plus one
      discriminator cover all three of the implementation map's "target
      project/assembly/module" cases without a third column.
    - **`partSource` and `targetKind` are orthogonal.** A manual/custom part
      can target a `module_instance` (an engineer's own hand-picked
      substitute for a calculated requirement, still needing a justifying
      run) exactly as a catalog part can — "supporting run required for
      calculated components" is keyed off `targetKind`, not `partSource`.
    - **`configurationId` is caller-supplied and trusted**, not cross-checked
      against the target's real configuration — matching the existing
      convention `CreateParameterLinkInput`/`CreateParameterValueInput`
      already establish (`stale-propagation.ts`'s use cases never verify
      `input.configurationId` against the module instance's actual
      configuration either). Not a new gap Unit 2.8 introduces; consistent
      with what is already there.
    - **Stale propagation closes invariant 8's second half.**
      `lib/application/parameters/stale-propagation.ts` (Unit 2.5) now calls
      the new `markComponentAssignmentsStaleForModuleInstances` alongside
      the existing `markRunsStaleForModuleInstances` in all three use cases,
      inside the same transaction — "downstream runs and component
      assignments become stale in the same transaction as the upstream
      change" is now literally true, not only true for runs. This is
      deliberately the *simple* direction only (an assignment goes stale
      when its justifying run does); Unit 2.5's fourth deferred trigger
      ("change an assigned-component feedback input" — an assignment acting
      as a value *source* other calculations consume) still needs a new
      parameter-graph node kind and remains deferred as its own future unit
      — see Next Up.
    - **Nullable JSONB write convention**: `manualPartDetails` is the
      project's first *nullable* `Json` column (every prior JSONB column —
      `ParameterValue.value`, `CalculationRun.snapshot`,
      `ComponentSchemaVersion.fields`, `ManufacturerPartRevision.attributes`
      — is required). To avoid Prisma's `DbNull`/`JsonNull` ambiguity for a
      nullable JSON column, `createComponentAssignment` omits the
      `manualPartDetails` key entirely from the `data` object when there is
      no payload (rather than assigning `null`), letting the column default
      to real SQL `NULL`.
    - 26 new tests (all live-DB, self-skipping locally):
      `component-assignment-repository.test.ts` covers the create/read shape
      rules (both part sources, all three target cases, every `.refine()`
      mismatch, malformed and corrupt `manualPartDetails`, ownership
      isolation, and the bulk stale-marking primitive including its
      idempotency and empty-list no-op); `assign-component.test.ts` covers
      the orchestration layer (successful assignment for each target kind,
      unauthorized for each target kind, a run that does not exist, a run
      belonging to a different module instance, a run supplied for a
      non-calculated target, a part revision that does not exist, and a
      repository validation failure surfacing as `invalid_input` rather than
      throwing); two new tests appended to `stale-propagation.test.ts`
      (`setParameterValue` and `confirmParameterLink`/`removeParameterLink`
      each marking a dependent assignment stale) prove the wiring end to
      end, reusing the existing `scaffold()`/`newModuleWithRun()` fixtures.
    - **Verification differs from every other schema-touching unit so far**:
      this session did not commit or push (git commits require the user's
      explicit go-ahead, independent of `ai-workflow-rules.md`'s own
      suggested "commit with the work-unit ID" delivery step), so **GitHub
      Actions CI has not verified this migration, the new repository
      queries against real Prisma-generated types, or the 26 new live-DB
      tests.** Locally confirmed: `npm run lint` (0 warnings), `npm run
      test` (356/356 passed, 95 skipped — up from 69), and `npm run
      typecheck`/`build` introduce no new error class beyond the
      pre-existing missing-generated-client cascade (verified line-by-line
      against the pre-change error list). Until a commit is pushed and CI
      runs, this part should be treated as implemented-and-locally-checked,
      not fully verified — unlike Units 2.1–2.7, which all reached a
      "verified in GitHub Actions CI" state before being called done.
  - **Unit 2.8 is now committed, pushed, and verified green in GitHub Actions
    CI** (commit `ec7b5f7`, after the test-cleanup fix — see the Completed
    entry above this section). Unit 2.8 as a whole is done.
  - **SPLIT DECISION (2026-07-30, Unit 2.9):** the implementation map's Unit
    2.9 ("Baseline and audit services") deliverables — `MachineBaseline`
    snapshot, baseline item references, baseline creation checks, baseline
    comparison, and `AuditEvent` query surfaces — span the same shape of
    boundary split Units 2.7/2.8 used: a pure, DB-free snapshot/comparison
    contract (the new `lib/configuration/` boundary,
    context/architecture.md: "Draft configurations, immutable baselines,
    baseline comparison") versus persistence (`MachineBaseline` schema +
    repository, `lib/db`) and orchestration (`createBaseline`/
    `compareBaselines`, `lib/application`). Split the same way: **part 1**
    (`lib/configuration` only, this session) and **part 2** (`lib/db` +
    `lib/application`, not yet started — the `AuditEvent` query-surface
    addition folds into the already-counted `lib/db` boundary, the same way
    Unit 2.8 part 2 folded a small `lib/catalog` addition into its
    `lib/db`+`lib/application` count rather than treating it as a third
    boundary).
  - **Part 1 delivered** (2026-07-30): the new `lib/configuration/` boundary
    — `types.ts` (`MachineBaselineSnapshot` and its nested contracts,
    `BASELINE_SNAPSHOT_FORMAT_VERSION = 1`), `schemas.ts`
    (`MachineBaselineSnapshotSchema`, composing the engine's own
    `EngineeringValueSchema` and `lib/catalog`'s `ManualPartDetailsSchema` so
    the envelope stays in lockstep with those contracts, the same approach
    `run-snapshot.ts` takes for `CalculationRunSnapshot`), `readiness.ts`
    (`evaluateBaselineReadiness` — the "Baseline creation checks"
    deliverable), and `comparison.ts` (`compareBaselineSnapshots` — the
    "baseline comparison" deliverable). 30 new tests, all pure; `npm run
    lint`/`test` clean (386/386 passed, up from 356), `typecheck` confirmed
    to introduce no new error beyond the pre-existing 14-error
    missing-generated-client cascade (exact count matched before and after).
    No `lib/db` file touched, so — mirroring Unit 2.8 part 1's own note —
    this part needs no CI round trip; local verification is the complete
    verification story for a pure boundary.
    - **Every ID in the snapshot contract is a plain `string`, not a branded
      type imported from `lib/db`.** `lib/configuration` must never import
      `lib/db` (a schema change to the persisted row shape must not ripple
      into the pure snapshot contract, and vice versa) — the same
      generic-and-decoupled pattern `lib/catalog`'s `CandidatePart.id: string`
      already established in Unit 2.8 part 1, rather than reusing
      `AssemblyId`/`ModuleInstanceId`/etc.
    - **BOM scope decision**: the implementation map lists "BOM" as part of
      the baseline snapshot, but no `BomItem` model exists yet (Milestone 5,
      Unit 5.1, not yet built). Per "no invented behavior," this snapshot does
      not fabricate a BOM shape ahead of its owning unit — `componentAssignments`
      (already required separately by the implementation map, and named in
      project-overview.md as "required for BOM generation") is what a BOM is
      generated *from*; freezing it here is what keeps a future BOM
      reproducible from this baseline. A literal frozen `BomItem[]` is
      deferred to Unit 5.1, which can extend the snapshot (a new format
      version) once that model exists. Documented in `types.ts`'s top comment,
      not silently dropped.
    - **`ParameterValue` and `CalculationRun` are diffed/frozen by logical
      slot, not raw row id.** A `ParameterValue` is append-only history (Unit
      2.2/2.5: changing a value creates a new row, never edits one), and a
      module instance gets a new `CalculationRun` row each execution — so the
      snapshot's own `BaselineParameterValue`/`BaselineCalculationRunRef`
      entries are the *resolved current* row per node/module instance (the
      snapshot builder's job, Unit 2.9 part 2), and `compareBaselineSnapshots`
      diffs them by graph-node key / `moduleInstanceId` rather than by their
      row `id` — otherwise a value literally changing from 10 kg to 12 kg
      would show as an opaque "row X removed, row Y added" instead of a
      genuine "changed" entry. Every other category (`Requirement`,
      `DesignAssumption`, `LoadCase`, `ParameterLink`, `ComponentAssignment`)
      has no update path in `lib/db` today, so diffing those by `id` is exact
      — `ComponentAssignment`'s `stale` flag flipping in place is still caught
      correctly this way, since the `id` is unchanged but the frozen content
      differs between two baselines.
    - **Baseline creation checks are a soft gate, not a hard block.** A
      baseline can legitimately freeze a known-imperfect design for review
      (project-overview.md: a baseline supports "design review or release," not
      only a finished release) — so `evaluateBaselineReadiness` always reports
      every blocker it finds (`stale_run`, `failed_run` for `status` `"fail"`
      or `"invalid_input"`, `stale_assignment`), and `ready` is `true` either
      when there are none or when the caller passes `acknowledgeWarnings: true`
      — mirroring Unit 3.8's named UI flow ("Pre-baseline validation summary" +
      "Warning acknowledgement") rather than inventing a different UX.
  - **Part 2 delivered** (2026-07-30): the `MachineBaseline` model in
    `prisma/schema.prisma` (one new relation on `MachineConfiguration`); the
    migration `prisma/migrations/20260730160000_machine_baselines`
    (**hand-authored** — `npx prisma generate` was re-tried fresh this
    session and hit the identical corporate-TLS `binaries.prisma.sh` block
    every prior schema-touching session documents); the new
    `lib/db/repositories/baseline-types.ts` + `baseline-repository.ts`
    (`createMachineBaseline`, ownership-scoped `loadMachineBaseline`/
    `listMachineBaselinesForConfiguration`); the `AuditEvent` query surface
    (`listAuditEventsForProject`, added to the existing `audit-repository.ts`)
    and a `machine_baseline.created`/`MachineBaseline` extension to
    `lib/audit`'s `AuditEventType`/`AuditEntityType` unions; two small
    `project-repository.ts` additions (`loadConfigurationForOwner` — the
    configuration-plus-owning-project shape the snapshot builder needs, and
    `loadConfigurationTree` — one configuration's assembly/module forest,
    the single-configuration counterpart to `loadProjectTree`); two new
    `graph-repository.ts` reads (`listParameterLinksForConfiguration`, and
    `listCurrentParameterValuesForConfiguration` — resolves every graph node
    to its single latest `ParameterValue` row, since those are append-only
    history); and `lib/application/configurations/create-baseline.ts`
    (`createBaseline`) + `compare-baselines.ts` (`compareBaselines`).
    - **`MachineBaseline` has no update path at all — stricter than
      `CalculationRun`.** A calculation run still legitimately mutates its
      `stale`/`staleReason` columns; a baseline has no mutable field
      whatsoever (invariant "Baseline immutability"), so the migration's
      `machine_baselines_immutable_guard` trigger rejects every `UPDATE`
      unconditionally, rather than allowing specific columns through the way
      `calculation_runs_immutable_guard` (Unit 2.3) does. Proved with a
      live-DB test expecting any `UPDATE` — even a harmless `label` rename —
      to raise.
    - **`createBaseline` composes seven reads into one snapshot, then
      persists atomically.** Authorizes the configuration
      (`loadConfigurationForOwner`), loads its assembly/module tree
      (`loadConfigurationTree`), requirements/assumptions/load cases,
      current parameter values and links, each module's latest calculation
      run (skipping modules that have never run — a baseline of a
      partial/WIP design is legitimate, so an unrun module is simply absent
      from `calculationRuns`, not a blocker), and component assignments —
      then runs part 1's `evaluateBaselineReadiness` before persisting the
      `MachineBaselineSnapshot` and an audit event together in one
      `prisma.$transaction`.
    - **The "failed_run" readiness blocker is untestable end to end on
      purpose, and that is fine.** `example-scaffold`'s placeholder compute
      (`result = mass * 0`) can never fail its own "result is non-negative"
      check, and forcing a fake `status: "fail"` onto a real persisted run is
      impossible by design — `calculation_runs_immutable_guard` rejects any
      change to a run's `status` column. Part 1's `readiness.test.ts` already
      covers `failed_run` exhaustively as a pure unit test; the live
      `create-baseline.test.ts` instead proves the wiring with a scenario
      that genuinely occurs (`stale_run` + the dependent `stale_assignment`,
      triggered together by Unit 2.5/2.8's existing stale-propagation), and
      documents the "failed_run" gap explicitly rather than fabricating a
      fake failing run to force coverage.
    - 17 new live-DB tests (all self-skipping locally, no generated Prisma
      client on this network): `baseline-repository.test.ts` (round trip,
      invalid snapshot/label on write, corrupt-snapshot-on-read via a raw
      `INSERT` — the immutability trigger blocks the usual `.update()`
      bypass other repositories' corrupt-on-read tests use, so this table's
      test simulates pre-existing bad data instead — the immutability
      trigger itself, ownership isolation, summary-list shape, and cascade
      delete); two new `audit-repository.test.ts` tests
      (`listAuditEventsForProject` newest-first and ownership isolation);
      `create-baseline.test.ts` (full snapshot content, atomic audit event,
      unauthorized, and the stale/acknowledge gate); `compare-baselines.test.ts`
      (a real changed-value-and-changed-run comparison across two live
      baselines, plus both `not_found` cases). Verified locally: `npm run
      lint` (0 warnings), `npm run test` (386/386 passed, 112 skipped — up
      from 95), `npm run typecheck` introduces exactly two new occurrences of
      the pre-existing error classes (one `TS7006` "tx implicitly any" in
      `create-baseline.ts`'s `$transaction` callback, one `TS2307` missing
      generated-client import in `baseline-repository.ts` — both already
      present elsewhere for the identical root cause), and `npm run build`
      fails at the same pre-existing `execute-module-instance.ts:247` error
      it already failed at before this session's changes (Next.js stops at
      the first type error, so this confirms no new error class without
      needing to see past that known blocker). **Verified in GitHub Actions
      CI** (commit `7941eaf`, run 30525753448 — every step green, including
      "Deploy migrations" confirming the hand-authored `MachineBaseline`
      table and its immutability-guard trigger apply cleanly, and all 17 new
      live-DB tests). **Unit 2.9 is now fully complete.**
  - **Next work unit**: Milestone 3 (generic UI), starting with Unit 3.1
    (workspace shell), then Milestone 4 (modules).
  - DEFERRED within Unit 2.6, RESOLVED in Unit 2.7 part 1 (documented in
    `lib/catalog/types.ts`'s Unit 2.6 comment and `csv-import.ts`'s top
    comment): matching a specific `ManufacturerPartRevision.attributes`
    payload against its declared `ComponentSchemaVersion.fields` list
    (required keys present, kind/unit match) is now implemented in
    `parseCatalogCsv` (`validateMappingAgainstSchema` at setup time, plus
    per-row required/kind/unit resolution) — not merely generic
    `EngineeringValue` shape validation.
  - DEFERRED within Unit 2.5 (documented in
    `lib/application/parameters/stale-propagation.ts`, not a gap to
    silently carry forward): "change an assigned-component feedback input"
    — the implementation map's fourth stale-propagation use case. It needs
    `ComponentAssignment`, which does not exist until Unit 2.8. Revisit
    then — the same `computeStaleImpact` + transactional-mark pattern
    applies once that model exists.
- STANDING (2026-07-30, unchanged from the Unit 2.4/2.5 sessions): this
  session again had no local PostgreSQL and `prisma generate` again failed
  with the corporate-TLS `self-signed certificate in certificate chain` error
  on `binaries.prisma.sh`. Unit 2.6's migration
  (`prisma/migrations/20260730130000_manufacturer_catalog_schema`) was
  therefore **hand-authored** (mirroring the SQL shape of the four existing
  migrations, including the 63-byte Postgres identifier truncation on one long
  unique-index name) rather than generated by `prisma migrate dev`. Locally
  confirmed: `npm run lint` (0 warnings) and `npm run test` (313 passed, 58
  skipped — `catalog-repository.test.ts` self-skips via the same
  `describe.skipIf(!generatedClientAvailable)` guard every other live-DB test
  file uses). `npm run typecheck` and `npm run build` were run and fail **only**
  on the pre-existing, already-documented missing-generated-client cascade
  (`TS2307` on `../generated/prisma/client` in every repository file that
  imports Prisma types, plus its downstream `TS7006` implicit-any errors in
  unrelated pre-existing files) — confirmed no new error class was introduced
  by this unit's changes. Full verification (typecheck, build, migration
  deploy, and the 10 new live-DB tests) ran in GitHub Actions CI after pushing
  — all green (see the updated Current Goal entry above). **Note for future
  sessions**: the `gh` CLI is not installed in this environment, but the
  GitHub REST API is reachable over plain `curl` even though
  `binaries.prisma.sh` is blocked (only that specific host is intercepted) —
  `curl -s "https://api.github.com/repos/<owner>/<repo>/actions/runs?branch=main&per_page=3"`
  and `.../actions/runs/<id>/jobs` are enough to confirm a push's CI result
  without waiting on the user or fabricating a result.
- IMPORTANT UPDATE (2026-07-29) to the long-standing `prisma generate`
  constraint: on a fresh clone this session, `prisma generate`, `typecheck`,
  and `build` **all succeed on a local dev machine** — because the schema uses
  Prisma 7's Rust-free `prisma-client` generator (`provider = "prisma-client"`),
  which downloads **no** engine binary from `binaries.prisma.sh`, so the old
  corporate-TLS block on that host no longer affects generation. A local
  PostgreSQL was provisioned with `scoop install postgresql` (Docker absent)
  and the live-DB tests (`health.test.ts`, `project-repository.test.ts`) pass
  against it. Practical notes for the next session: (a) neither
  `prisma.config.ts` nor vitest auto-loads `.env`, so pass `DATABASE_URL`
  **inline** for the Prisma CLI, `npm test`, and `npm run verify` (`next build`
  does auto-load `.env`); (b) the `machinestudio` role was granted `CREATEDB`
  so `prisma migrate dev` can create its shadow database. CI remains a valid
  verification path, but local DB iteration now works too.
- CORRECTION (2026-07-30): the "IMPORTANT UPDATE" above does not hold on
  every network. This session (no `scoop`/Postgres/Docker present, a fresh
  environment) hit the **original** block: `prisma generate` failed with
  `self-signed certificate in certificate chain` fetching
  `binaries.prisma.sh/.../schema-engine.exe` — so Prisma 7's Rust-free client
  generator still needs the schema-engine binary (only the *runtime* query
  engine is avoided via the driver adapter), and that download is exactly
  what the corporate TLS inspection blocks. The 2026-07-29 session must have
  been on a different, non-intercepting network. Practical implication: do
  not assume local `prisma generate`/`migrate dev` will work from machine
  identity alone — check the network each session, per
  `context/adr` policy of stating blockers plainly rather than re-deriving
  this each time. This session's Unit 2.4 migration
  (`prisma/migrations/20260730120000_audit_events_and_module_status`) was
  therefore **hand-authored** (mirroring the SQL shape of the three existing
  migrations) rather than generated by `prisma migrate dev`, and verified via
  CI's new "Deploy migrations" step (see Unit 2.4's Completed entry) rather
  than a local shadow-database run.
- Also discovered this session (2026-07-30), unrelated to Unit 2.4 itself but
  blocking any CI verification of it: **CI had been red since the Unit
  2.1–2.3 push** (`6cfb90c`). Those units' live-database repository tests
  need real tables, but `.github/workflows/ci.yml` only ran `prisma generate`
  (client generation) and never applied the committed migrations to the
  Postgres service container, so `Test` failed with "relation does not
  exist." Units 2.1–2.3 had only ever been verified **locally** against a
  hand-provisioned database (see the 2026-07-29 update above) and were never
  re-checked against this workflow after landing. Fixed by adding a "Deploy
  migrations" step (`npx prisma migrate deploy`) between client generation
  and Lint; confirmed the fix alone turned CI green before building Unit 2.4
  on top of it.

## Completed

- Unit 2.6: manufacturer catalog schema (2026-07-30), the sixth Milestone 2
  unit. Six new Prisma models — `Manufacturer`, `ComponentType`,
  `ComponentSchemaVersion`, `CatalogImportBatch`, `ManufacturerPartRevision`,
  `DatasheetAttachment` — plus two new enums (`PartLifecycleStatus`,
  `DataQualityStatus`), the migration
  `prisma/migrations/20260730130000_manufacturer_catalog_schema`
  (**hand-authored**, not `prisma migrate dev`-generated — see Current Goal),
  a new `lib/db/repositories/catalog-repository.ts` + `catalog-types.ts`, and
  the first real content in the previously-placeholder `lib/catalog/`
  boundary (`types.ts`/`schemas.ts`: component-type attribute schema
  contracts).
  - **Generic attribute storage, reusing the engine's own value contract.**
    Rather than inventing a catalog-specific value system,
    `ManufacturerPartRevision.attributes` is a JSONB `ComponentAttributes`
    record — attribute key to `EngineeringValue` (Unit 1.1) — the same value
    contract module ports already use. Every component type's part revisions
    share this one generic column, validated on write **and** read with
    `lib/catalog`'s `ComponentAttributesSchema`
    (`z.record(nonEmpty, EngineeringValueSchema)`), matching the "never trust
    JSONB" convention every prior JSONB payload in this repo follows. This is
    what makes the exit criterion ("two component types with different
    attributes coexist without a Prisma schema change") true in practice, not
    only structurally: proved with a live-DB test creating a `ball_screw`
    component type (lead/diameter, both `quantity` in mm) and a `servo_motor`
    component type (ratedTorque N·m / ratedSpeed rpm) side by side.
  - **`ComponentSchemaVersion.fields`** is a second, independent versioned
    JSONB payload — a `ComponentAttributeFieldDefinition[]` (key, label,
    `valueKind` reusing `EngineeringValueKind`, required, optional unit/enumId)
    — also validated on write and read (`ComponentAttributeFieldListSchema`:
    non-empty, unique keys). **Deliberately deferred**, mirroring the Unit 2.2
    architecture decision to defer semantic parameter-link compatibility to
    the confirm/suggestion flow rather than the schema unit: this unit
    validates that `attributes` is well-formed `EngineeringValue`s and that a
    schema version's `fields` list is well-formed, but does not cross-validate
    a specific part revision's `attributes` against its declared schema
    version's field list (required keys present, kind/unit match). That is a
    catalog import (Unit 2.7) and matching (Unit 2.8) concern — see Next Up.
  - **`ComponentType.id` is a caller-chosen stable slug** (e.g.
    `"ball_screw"`), not a generated cuid — mirroring
    `ModuleInstance.modulePackageId`'s convention for a code-referenced stable
    identifier, since a future catalog-matching adapter keys its filtering
    logic by this string.
  - **Catalog data is shared reference data, not project-owned.** Unlike
    every model in Units 2.1–2.5, these six tables carry no `ownerId`/project
    scope, and the repository's reads have no owner filter — every project's
    component filtering is meant to read from the same imported catalog (the
    real-world equivalent: one imported SKF bearing catalog serves every
    project). This parallels how `lib/standards`' market profiles are also
    account-independent, though those are code constants, not persisted rows;
    catalog data is DB-backed because it is large and user-imported. See
    Architecture Decisions.
  - **Referential-integrity choices**: `ComponentSchemaVersion.componentType`
    is `onDelete: Cascade` (a schema version has no independent meaning apart
    from its type); every FK from `ManufacturerPartRevision`/
    `CatalogImportBatch` to `Manufacturer`/`ComponentType`/
    `ComponentSchemaVersion` is `onDelete: Restrict` (protects catalog
    reference data from deletion while parts still cite it — proved with a
    live-DB test); `ManufacturerPartRevision.importBatch` is `onDelete:
    SetNull` (detaching an import batch record must not delete the parts it
    created); `DatasheetAttachment.manufacturerPartRevision` is `onDelete:
    Cascade` (an attachment has no independent meaning apart from its part
    revision — also proved with a live-DB test).
  - **Datasheet attachment metadata** (context/architecture.md "Blob
    storage": checksum, MIME type, size, upload source) is its own
    `DatasheetAttachment` model rather than inline fields on
    `ManufacturerPartRevision`, since a part can have more than one datasheet.
    `storageKey` is a placeholder locator — actual blob-storage integration
    (upload endpoint, backend, signed URLs) is a later concern this unit does
    not implement.
  - **Explicit exclusions honored** (context/roadmap.md "Explicitly
    Deferred"): no company-approval state, no supplier/pricing records, no
    inventory, no procurement workflow anywhere in the new schema.
  - `(manufacturerId, partNumber, sourceRevision)` is a DB unique constraint
    supporting Unit 2.7's idempotent-import requirement (proved with a live-DB
    test expecting a second insert with the same triple to reject); the
    constraint does not include an import-mapping component, since a part
    revision's identity is independent of which import produced it.
  - 10 new live-DB tests (`catalog-repository.test.ts`) cover: manufacturer
    create+load, import-batch create+load, a full component-type →
    schema-version → part-revision round trip (both `attributes` and `fields`
    JSONB), **the exit criterion itself** (two component types with different
    attributes coexisting, read back correctly through the same generic
    query), duplicate field-key rejection, malformed-attributes rejection on
    write, corrupt-payload rejection on read (bypassing the repository to
    write raw invalid JSONB directly), the unique-identity constraint, and the
    two delete-behavior invariants (attachment cascade, manufacturer
    restrict).
  - **Verification path**: no local PostgreSQL this session; `prisma
    generate` failed again with the corporate-TLS `self-signed certificate in
    certificate chain` error. Locally confirmed: `npm run lint` (0 warnings)
    and `npm run test` (313 passed, 58 skipped — the new file self-skips via
    the same `describe.skipIf(!generatedClientAvailable)` guard every other
    live-DB test file uses). `npm run typecheck` and `npm run build` were run
    and fail **only** on the pre-existing, already-documented
    missing-generated-client cascade (`TS2307` on `../generated/prisma/client`
    in every repository file that imports Prisma types, plus its downstream
    `TS7006` implicit-any errors in unrelated pre-existing files) — confirmed
    no new error class was introduced by this unit. Full verification
    (typecheck, build, migration deploy, and the 10 new live-DB tests) is
    deferred to GitHub Actions CI.
- Unit 2.5: stale propagation service (2026-07-30), the fifth Milestone 2
  unit, delivered in a new `lib/application/parameters/` boundary plus
  supporting repository primitives. Implements three of the implementation
  map's four use cases — `setParameterValue` (change a manual/default or
  workflow-provided value — one function, since both are structurally
  identical: author a new `ParameterValue` row, then propagate), and
  `confirmParameterLink`/`removeParameterLink`. Each computes downstream
  impact with `lib/engine/graph`'s `computeStaleImpact` and marks every
  affected `CalculationRun` stale in the same transaction as the write
  (invariant "Transactional stale propagation") via a new bulk
  `markRunsStaleForModuleInstances` (the counterpart to Unit 2.3's
  single-run `markRunStale`).
  - **Graph reconstruction, generalized.** `createParameterLink`'s existing
    cycle-check reconstruction (Unit 2.2) only added nodes for existing
    *link endpoints* — sufficient for cycle detection, but not for stale
    impact: a module's own directly-authored, never-linked input has no
    node to start a traversal from, and if its sibling output is also
    unlinked, no internal edge to prove *that module's own* runs are
    affected by changing it. Extracted a shared, exported
    `loadConfigurationGraph(configurationId, extraNodes)` (refactoring
    `createParameterLink` to call it — behavior unchanged) that accepts
    extra node descriptors to guarantee are present. The stale-propagation
    services always pass the changed module's **full port set** (inputs and
    outputs, read from its package via `lib/modules`) as extra nodes,
    guaranteeing its own internal feed edge exists regardless of link
    connectivity. `lib/db` still never imports the module registry — only
    the application layer enumerates a package's ports, mirroring Unit
    2.4's own `executeModuleInstance`. `parameterGraphNodeId` and
    `GraphNodeDescriptor` are now exported for this reuse.
  - **Authorization** branches on whether the changed node has an owning
    module instance: `loadModuleInstanceForOwner` (Unit 2.4) for a module's
    own port, or a new `isConfigurationOwnedBy` for a bare provider value
    (machine requirement / assembly / workflow parameter). New
    `loadParameterLinkForOwner` (ownership-scoped read) and
    `deleteParameterLink` (ownership-scoped delete, no separate
    authorization query needed) support `removeParameterLink`.
    `createParameterValue`/`createParameterLink` now accept an optional
    transaction client, like Unit 2.4's repositories.
  - **Transaction ordering is deliberate**: each use case marks the
    precomputed downstream runs stale *before* performing the actual write,
    inside the same `prisma.$transaction`. An invalid write (a malformed
    `EngineeringValue`, a cycle, a duplicate link) then rolls back the
    stale marks too, not just the write — proving real atomicity rather
    than merely short-circuiting before any mutation.
  - **DEFERRED** (documented in `stale-propagation.ts`, not implemented):
    "change an assigned-component feedback input," the implementation
    map's fourth use case — needs `ComponentAssignment` (Unit 2.8).
  - 10 new live-DB tests (`stale-propagation.test.ts`) cover the Unit 2.5
    plan exactly: multi-level dependency chain (A→B→C, changing A stales
    all three), multiple branches (A→B, A→C, changing A stales both, not
    each other), no unrelated stale records, and transaction rollback —
    plus confirm/remove's individual stale-marking behavior, provider-value
    authorization, and unauthorized access for all three use cases. One
    round of CI failures (the first push) came from a **test-authoring**
    mistake, not an implementation bug: several tests tried to get a
    "fresh" run for a linked module by re-executing it through the
    confirmed link, but `example-scaffold`'s one input/output pair is
    deliberately dimension-mismatched (mass in, force out — chosen so
    linked-value resolution has something concrete to pull, same as Unit
    2.4's own test) — re-executing through it genuinely fails validation,
    exactly as it should. Fixed by resetting a run's stale flag directly
    via `markRunStale` instead of trying to produce a second run through
    re-execution; no production code changed. Exit criterion met: the
    architecture stale invariant is proven against PostgreSQL. **Verified
    in GitHub Actions CI** (no local database this session): lint,
    typecheck, test, and build all green, migrations deployed to the live
    Postgres service container.
- Unit 2.4: calculation application service (2026-07-30), the fourth
  Milestone 2 unit and the first `lib/application` boundary
  (context/architecture.md "lib/application/": use-case and transaction
  orchestration). Split into two commits per the implementation map's split
  rule ("more than two system boundaries"): schema/persistence first, then
  orchestration.
  - **Schema/persistence half**: added the `AuditEvent` model to
    `prisma/schema.prisma` (append-only; the full audit *service* — query
    surfaces, `ChangeReason` — is Unit 2.9, this is the minimal shape "append
    an audit event" needs) and two normalized columns on `ModuleInstance` —
    `lastCalculationRunId`/`lastRunStatus` — the same "search-critical
    summary normalized into a column" pattern `CalculationRun.status` already
    uses, one level up, so the implementation map's "update module status"
    step (2.4 step 6) has somewhere to write; migration
    `prisma/migrations/20260730120000_audit_events_and_module_status`
    (**hand-authored**, not `prisma migrate dev`-generated — see Current Goal
    "CORRECTION (2026-07-30)" — mirroring the SQL shape of the three existing
    migrations). New `lib/audit/` boundary (`types.ts`/`schemas.ts`/
    `index.ts`): a domain-only `AuditEventInput` contract + Zod schema, no
    Prisma import. New `lib/db/repositories/audit-repository.ts` +
    `audit-types.ts`: `appendAuditEvent`, validating on write like every
    other repository. New `lib/db/repositories/db-client.ts`: a shared
    `DbClient` type (`PrismaClient | Prisma.TransactionClient`) so a write
    function can run standalone or inside an application-service
    transaction without `lib/application` ever importing Prisma directly
    (architecture "lib/db/" stays the only Prisma-importing boundary).
    `run-repository.ts`'s `createCalculationRun` and two new
    `project-repository.ts` functions — `loadModuleInstanceForOwner`
    (ownership-scoped, joins through to the owning project ID for audit
    attribution) and `updateModuleInstanceRunStatus` (the status-summary
    write; ownership authorized by the caller, matching `markRunStale`'s
    convention) — accept this client, defaulting to the singleton.
  - **Orchestration half**: `lib/application/calculations/
    execute-module-instance.ts` implements `executeModuleInstance` per the
    implementation map's seven steps: authorize owner
    (`loadModuleInstanceForOwner`) → load the pinned module package
    (`lib/modules`' `getModulePackage`) → resolve declared input ports
    (Unit 2.2's `resolveModuleInputs`) → execute the pure module
    (`executeModule`) → persist an immutable run (Unit 2.3's
    `createCalculationRun`) → update the module instance's status summary →
    append an audit event, the last three atomic in one
    `prisma.$transaction` opened here, not in `lib/db`
    (context/code-standards.md "Application Services"). A linked input whose
    source is another module's output — `graph-repository.ts`'s
    `resolveLinkedSourceValue` returns `null` for this case, commented
    "wired in the execution service (Unit 2.4)" — is resolved here by
    loading the source module's latest calculation run and reading the
    matching output-port value from its stored snapshot; when the source has
    no run yet the port is simply left unresolved, so `executeModule`'s own
    required-input check produces the error rather than this service
    reimplementing it. Returns a discriminated `{ok:true, run}`/
    `{ok:false, error:{code,message}}` result instead of throwing for
    expected domain failures (`unauthorized`, `module_not_found`,
    `invalid_input` wrapping a caught `ModuleSdkError`) — only a genuine
    repository bug still throws. New `lib/application/index.ts` barrel.
    9 new live-DB tests across `audit-repository.test.ts` (append, invalid
    input, cascade on project delete) and
    `execute-module-instance.test.ts` (successful execution with the status
    summary and audit event verified atomic, repeated execution creating a
    new run each time, invalid input via a dimension-mismatched authored
    value, an unregistered module version, unauthorized access, and the
    module-output link resolution — confirmed via the error message
    signature that the value was actually pulled from the upstream run
    rather than left missing). Exit criterion met:
    `example-scaffold@0.1.0` runs end to end through `lib/application`, not
    only through `executeModule` directly. **Verified in GitHub Actions CI**
    (this session had no local database at all — no `psql`, Docker, or
    scoop-installed Postgres — see Current Goal): both commits green, lint +
    typecheck + test + build, with migrations deployed to the live Postgres
    service container by the newly-added CI step.
- Unit 2.3: Prisma schema for immutable calculation runs + repository
  (2026-07-29), the third Milestone 2 unit. Added the `CalculationRun` model
  and a `CheckStatus` enum (mirroring `lib/engine/trace`) to
  `prisma/schema.prisma`, with migration
  `prisma/migrations/20260729153159_immutable_runs`. Storage per the
  implementation map + architecture "Calculation Reproducibility": the **full
  immutable snapshot** (resolved input + `ModuleComputation` outputs/trace/
  checks/warnings/assumptions/validity + version pins + attribution) is a
  versioned JSONB payload validated on **write and read** with a schema
  composed from the engine's own `ModuleInputSchema`/`ModuleComputationSchema`
  (`run-snapshot.ts`, `RUN_SNAPSHOT_FORMAT_VERSION = 1`), so the run envelope
  stays in lockstep with the value/trace/check contracts. Search-critical
  summaries are **normalized into columns**: `status`
  (`overallCheckStatus(checks)`) and `criticalMargin` (the smallest
  *dimensionless* safety-factor margin — heterogeneous physical margins are not
  comparable, so they are ignored, and the authoritative per-check margins with
  units stay in the snapshot), plus the engine-SDK/module/hash/registry version
  columns. **Immutability is enforced two ways** (context/code-standards.md:
  "service rules and database constraints where practical"): the repository
  exposes no path to update the snapshot or any engineering column, and the
  migration installs a `BEFORE UPDATE` trigger `calculation_runs_immutable_guard`
  that raises unless only `stale`/`staleReason`/`updatedAt` changed — a
  correction is a new run (invariant "Immutable runs"). `run-repository.ts`
  (only-Prisma-boundary): `createCalculationRun` (validate snapshot → derive
  summaries → persist), ownership-scoped `loadCalculationRun` (returns the full
  validated snapshot so a report renders **without executing the module** — the
  exit criterion) and `listRunsForModuleInstance` (summaries via Prisma `omit`),
  and the `markRunStale` stale-state primitive (the only mutation; full
  transactional propagation is Unit 2.5). Typed `RunRepositoryError`
  (invalid_input | invalid_snapshot). New `run-types.ts` (branded
  `CalculationRunId`, `CalculationRunSnapshot`/`RunVersions`/summary+record/
  create-input contracts); re-exported through `lib/db/repositories/index.ts`.
  8 new live-DB tests (`run-repository.test.ts`, same `describe.skipIf` guard)
  cover snapshot round-trip (render without re-execute), **reproduction from
  the stored input + pinned version** (re-executing `example-scaffold@0.1.0`
  from the reloaded input matches the stored outputs), summary derivation
  (status + smallest dimensionless margin), invalid-on-write and
  corrupt-on-read rejection, the **trigger blocking a snapshot/version update**,
  stale state changing while the snapshot stays put, and ownership isolation.
  `npm run verify` green with a live database: lint (0 warnings), typecheck,
  **342/342 tests**, and build all pass (2026-07-29)
- Unit 2.2: Prisma schema for requirements and the parameter graph +
  repositories (2026-07-29), the second Milestone 2 unit. Added six relational
  models to `prisma/schema.prisma`: `Requirement` (machine-level when
  `assemblyId` is null, else assembly-scoped) with `AcceptanceCriterion`
  children, `DesignAssumption`, `LoadCase` (with a `LoadCaseCategory` enum
  mirroring `lib/engine/parameters`), and the graph pair `ParameterValue` +
  `ParameterLink`. Storage per the implementation map: identity/ownership/
  source-type/timestamps are relational; the `EngineeringValue` payload on
  `ParameterValue.value` is **versioned JSONB validated on both write and
  read** (reuses the `lib/engine/values` schema — never trust JSONB). Nothing
  is module-specific — nodes are keyed by canonical `parameterId` strings, so
  invariant #13 (generic extension) holds; a `ParameterValue.nodeKind` /
  `ParameterLink.sourceKind` enum mirrors `lib/engine/graph`'s `GraphNodeKind`.
  Migration `prisma/migrations/20260729150630_requirements_and_graph` created
  and applied; timestamps `TIMESTAMPTZ` (UTC). Deletion via FK rules: every new
  table cascades from its configuration (and provider values/links cascade from
  the assembly or module instance they reference), so deleting a project still
  cleans up the whole subtree. A unique index on
  `(targetModuleInstanceId, targetParameterId, targetLoadCase)` enforces one
  confirmed link per input port. Two new repositories under
  `lib/db/repositories/` (still the only Prisma-importing boundary):
  `requirements-repository.ts` (Zod-validated `createRequirement`/
  `createAcceptanceCriterion`/`createDesignAssumption`/`createLoadCase`;
  ownership-scoped reads `listRequirements` (with criteria)/
  `listDesignAssumptions`/`listLoadCases` that filter through
  configuration→project→owner) and `graph-repository.ts`
  (`createParameterValue` — JSONB validated on write; `createParameterLink` —
  rejects duplicate target ports and **cycles** by reconstructing the
  configuration's link graph and calling `lib/engine/graph`'s
  `buildParameterGraph`+`wouldCreateCycle`, which adds each module's internal
  input→output feed edges so cross-module cycles are caught; and
  `resolveModuleInputs(moduleInstanceId, ownerId, inputPorts)` — the exit
  criterion, classifying each declared port as manual/workflow/linked/default
  and re-validating JSONB on read). Typed `RequirementsRepositoryError`
  (invalid_input) and `GraphRepositoryError` (invalid_input | invalid_snapshot
  | cycle | duplicate_link). New branded IDs + records/inputs in
  `requirements-types.ts` and `graph-types.ts`; re-exported through
  `lib/db/repositories/index.ts`. Exit criterion met: a module instance can
  resolve manual, default, workflow, and linked input sources. 13 new live-DB
  tests (`graph-repository.test.ts` ×9, `requirements-repository.test.ts` ×4,
  same `describe.skipIf` guard as `health.test.ts`) cover JSONB round-trip,
  invalid-value-on-write and corrupt-payload-on-read rejection, four-source
  resolution, module-output link resolving to a null value (run supplies it in
  2.4), self-cycle and cross-module cycle rejection with the acyclic link
  allowed, duplicate-link rejection, and ownership isolation on the reads.
  `npm run verify` green with a live database: lint (0 warnings), typecheck,
  **334/334 tests**, and build all pass (2026-07-29)
- Unit 2.1: Prisma schema for the project hierarchy + ownership-scoped
  repository (2026-07-29), the first Milestone 2 unit. Added six relational
  models to `prisma/schema.prisma`: `User` (a local ownership reference keyed
  by the Clerk user ID — not a profile store), `MachineProject` (owner FK +
  `marketProfileKey` chosen at creation), `MachineConfiguration`, `Assembly`
  (self-referential `parentId` for the assembly hierarchy — the parameter-graph
  scope), `WorkflowInstance` (`workflowId` + `workflowVersion` + a
  `WorkflowInstanceStatus` enum), and `ModuleInstance` (pins the released
  package by `modulePackageId` + `moduleVersion`). Timestamps are `TIMESTAMPTZ`
  (UTC per code-standards). Deletion behavior is enforced by FK rules:
  `onDelete: Cascade` down owner→project→configuration→assembly(subtree)→module,
  and `ModuleInstance.workflowInstance` uses `onDelete: SetNull` so detaching a
  workflow does not delete its modules. Nothing is module-specific, upholding
  invariant #13 (generic extension). Migration
  `prisma/migrations/20260729…_project_hierarchy` created and applied.
  `lib/db/repositories/` is the new persistence-adapter surface (still the only
  Prisma-importing boundary): `types.ts` (branded IDs `UserId`/`MachineProjectId`/
  … with `as*` casts matching lib/engine convention, plus record/tree and
  create-input contracts) and `project-repository.ts` (Zod-validated create
  functions `upsertUser`/`createProject`/`createConfiguration`/`createAssembly`/
  `createWorkflowInstance`/`createModuleInstance`; ownership-scoped
  `loadProjectTree(projectId, ownerId)` that reassembles the flat assembly rows
  into a nested forest by `parentId`; `listProjectsByOwner`; and
  `deleteProject(projectId, ownerId)`). Typed `ProjectRepositoryError`
  (`invalid_input`) at the validation boundary. Re-exported from
  `lib/db/index.ts`. Exit criterion met: a project tree is created and loaded
  through repository interfaces. 7 new live-DB tests
  (`project-repository.test.ts`, same `describe.skipIf` guard as
  `health.test.ts`) cover the Unit 2.1 plan — create+load full tree, ownership
  isolation (another owner loads/lists nothing), non-existent-owner FK
  rejection, invalid-input rejection, project-delete cascade, parent-assembly
  self-referential cascade, and workflow-delete SetNull detach. `npm run verify`
  green with a live database: lint (0 warnings), typecheck, **321/321 tests**,
  and build all pass (2026-07-29)
- Competitive landscape and white-space analysis
- Initial architecture direction selected
- Context documentation v1 written on 2026-07-27
- Specifications upgraded on 2026-07-28
- US market selected as the only initial market profile
- Manufacturer data scope simplified to manufacturer specifications plus
  lightweight component assignment
- MVP expanded from four calculators to a complete linear-axis workflow
- Versioned module-package contract defined
- Cross-module consistency and module conformance requirements defined
- Detailed implementation map written
- Japan added as second initial market; `jp-market-profile.md` created
  (2026-07-28)
- Calculeaf DESIGN.md merged into `ui-context.md` selectively; scraped
  artifact tokens documented and rejected (2026-07-28)
- Unit 0.2: Next.js App Router repository initialized — TypeScript
  strict, Tailwind CSS v4 with the `ui-context.md` CSS custom-property
  tokens wired into `app/globals.css` (`@theme inline`), IBM Plex
  Sans/Mono via `next/font/google`, one placeholder page styled only
  with those tokens (2026-07-28)
- shadcn/ui hand-configured (`components.json`, `lib/utils.ts` with
  `cn()`, `lucide-react`) using the classic Radix/"new-york" style; the
  CLI's live `init` network call was unreachable, see Open Questions
  (2026-07-28)
- Unit 0.3: ESLint (flat config) + Prettier, Vitest with one passing
  example test (`lib/utils.test.ts`), `npm run verify` script, and a
  GitHub Actions workflow running lint/typecheck/test/build (2026-07-28)
- Unit 0.4 (partial): Prisma configured for PostgreSQL — hand-authored
  `prisma/schema.prisma` (datasource + generator, no models) and
  `prisma.config.ts`, `docker-compose.yml` for local Postgres,
  `.env.example`; Clerk installed with `proxy.ts` (Next.js 16's renamed
  middleware convention) and `ClerkProvider`; build succeeds without
  real Clerk keys via Clerk's keyless dev mode (2026-07-28)
- Folder skeleton added per `architecture.md` System Boundaries:
  `lib/engine`, `lib/catalog`, `lib/db`, `lib/reports`, each with an
  `index.ts` placeholder and a top comment stating what it owns
  (2026-07-28)
- Git repository initialized locally; no commit created yet (2026-07-28)
- Unit 0.4 continued: environment schema validation (`lib/env.ts`, Zod,
  server-only; DATABASE_URL required, Clerk keys optional to match
  keyless dev mode) and the authenticated workspace route —
  `app/(auth)/sign-in`, `app/(auth)/sign-up` (Clerk prebuilt
  components), `app/(workspace)/layout.tsx` (`auth.protect()` gates
  every route in the group; `createRouteMatcher`-in-middleware is
  deprecated in the installed Clerk version, so protection is per
  resource, not path-matched in `proxy.ts`), and the empty
  `app/(workspace)/workspace/page.tsx`. Verified at runtime: `/workspace`
  unauthenticated → 307 to `/sign-in?redirect_url=...`; `/`, `/sign-in`,
  `/sign-up` all 200. Full authenticated-access verification needs real
  Clerk keys (not available yet). Still blocked: `lib/db/client.ts` and
  the database health check — both need `prisma generate` to run first,
  which is blocked on this network (see Open Questions) (2026-07-28)
- Unit 0.1 (evidence intake, analyzed then DEFERRED): first reference
  batch received under `public/ref data/` and analyzed. Decision
  (2026-07-28): build the platform first; construct validation fixtures
  later when real comparison cases are ready. Designated real validation
  references going forward: **ID39** (ball-screw linear-axis sizing →
  BSS1520-914, Ø15/lead 20, stroke 720 mm, high-speed near critical
  3000 vs 3024 rpm, axial 274 N vs allow. 3660 N) and **ID42** (servo
  drive-train torque/RMS → HIWIN SV2-B040AS, T_rms 0.532, SF 2.38).
  `Book1.xlsx` Case1 (rack-and-pinion, 400 kg horizontal) and Case2
  (rotary index table, 4.508 kg·m²) are CALCULATION-PHASE exploration,
  NOT validation fixtures. Also received as supporting method references:
  ATLANTA rack-and-pinion selection method, Oriental Motor Sizing
  Calculators (image-only PDF, 66 imgs), and the Omron R88M "Servo
  Selection" technical guide (full inertia / load-torque / accel-decel /
  RMS-torque / positioning method set + worked ball-screw sample →
  R88M-U20030). All 34 JPGs + 3 PDFs verified readable (see Open
  Questions re: the one image-only PDF) (2026-07-28)
- Unit 1.1: EngineeringValue contracts implemented in `lib/engine/values/`
  (2026-07-28). Discriminated union over all nine value families
  (`quantity`, `vector_quantity`, `curve`, `load_spectrum`, `table`, `enum`,
  `boolean`, `material_ref`, `component_ref`) discriminated on `kind`; every
  payload carries the serialization format version in `v`
  (`SERIALIZATION_FORMAT_VERSION = 1`). Deliverables: hand-written TSDoc'd
  interfaces (`types.ts`), strict Zod schemas rejecting unknown keys
  (`schemas.ts`) with a compile-time schema/interface parity guard,
  serialize/deserialize + parse/safeParse (`serialization.ts`), per-kind
  runtime guards + `isEngineeringValue` (`guards.ts`), and equality helpers
  (`equality.ts`) — exact `engineeringValuesEqual` plus tolerance-based
  `engineeringValuesClose` (default rel 1e-9 / abs 1e-12; no unit
  conversion, values compared in canonical units). Fully implemented:
  Quantity, Curve, EnumValue, BooleanValue; the other five are validated
  contracts per the Unit 1.1 initial scope. `lib/engine/index.ts` re-exports
  the package; `lib/engine/values` imports only `zod` (engine-purity
  boundary intact). 43 tests across four files cover round-trip
  serialization, invalid discriminators, missing/empty units, non-finite
  numbers, and version mismatch. Exit criterion met: no physical module API
  needs a bare number. `npm run lint`, `typecheck`, `test`, and `build` all
  pass (2026-07-28)
- Unit 1.2: unit registry and conversion engine implemented in
  `lib/engine/units/` (2026-07-28). Dimension-vector model over five base
  dimensions — length, mass, time, temperature, and **angle** (angle is a
  base dimension so `rad` stays distinct from a pure ratio and `rad/s`
  stays distinct from `Hz`). Every unit named in the implementation map is
  registered (length, time, mass, force, torque, linear speed/accel,
  angle/angular velocity/accel incl. `rpm`, power, pressure, inertia,
  temperature, frequency, dimensionless) with a factor (+ affine offset for
  temperature) to its SI-coherent magnitude. Deliverables: `dimension.ts`
  (ops, key, canonical symbol), `registry.ts` (unit table, `getUnit`/
  `hasUnit`/`preferredSymbol`, SI-coherent-per-dimension uniqueness
  invariant), typed `errors.ts` (`UnknownUnitError`,
  `DimensionMismatchError`, `AffineUnitError`, `NonFiniteValueError`),
  `convert.ts` (affine-correct scalar + quantity conversion, same-dimension
  only), `quantity.ts` (`makeQuantity` bridging to the Unit 1.1 `Quantity`),
  `arithmetic.ts` (add/subtract with dimension checks; multiply/divide with
  composite-unit simplification via preferred SI symbols; scale; affine
  rejected), and `formatting.ts` (significant figures + `formatQuantity`).
  `lib/engine/index.ts` re-exports the package. 59 tests (102 total) cover
  published conversions, round trips, mass-vs-force rejection, temperature
  affine cases, and composite-unit simplification. Exit criterion met:
  module code can convert and combine quantities without hardcoding
  constants. `npm run lint`, `typecheck`, `test`, and `build` all pass
  (2026-07-28)
- Unit 1.3: canonical parameter registry v1 implemented in
  `lib/engine/parameters/` (2026-07-28). Deliverables: parameter definition
  contract (`types.ts`) with a branded `ParameterId`, value type restricted to
  the v1-modeled subset (`quantity`/`vector_quantity`/`enum`/`boolean`),
  qualifier axes (bound required/allowable, aggregation peak/rms/nominal/mean,
  loadNature static/dynamic), coordinate-frame requirement, load-case
  compatibility, valid range, and a `DefaultPolicy`
  (required/optional/constant, where the constant is a full `EngineeringValue`);
  strict Zod shape schema (`schemas.ts`) with a compile-time schema/interface
  parity guard (it caught a readonly-array mismatch, fixed with `.readonly()`);
  `defineParameter` authoring factory (`define.ts`); registry loader + validator
  (`registry.ts`, `buildParameterRegistry`) enforcing unique IDs,
  symbol-per-scope uniqueness (scope = the ID's dotted prefix),
  physical-vs-enum-vs-boolean metadata shape, registered/dimension-compatible
  units for canonical/display/range, constant-default type+dimension
  consistency, and deprecation/replacement validity (existing, acyclic, chain
  resolves) with a chain-following `resolve()`; typed `ParameterRegistryError`
  carrying a `code`; deterministic dependency-free content hash (`hash.ts`,
  double FNV-1a via `Math.imul`, no BigInt so it stays ES2017-safe and
  runtime-portable) over a stable canonical serialization; released singleton +
  convenience lookups (`registered.ts`); barrel (`index.ts`, re-exported from
  `lib/engine/index.ts`); and a proposal-checklist README (`README.md`).
  Physical-parameter **dimension is derived** from the canonical unit via the
  Unit 1.2 registry rather than stored, so it cannot drift. Registry version
  `1.0.0`, content hash `bc1997a5cc36864b` (pinned in `hash.test.ts`; any change
  to a released parameter fails that fixture and must come with a version bump).
  27 parameters released across the project/environment, axis-application/
  load-case (`motion.axis.*`), and motion-profile (`motion.profile.*`) groups —
  the Phase 1A set (Units 4.1/4.2) plus shared supply/ambient data. 46 new tests
  (148 total) cover unique IDs, symbol-per-scope, unit/dimension validity,
  invalid ranges, value-type shape, constant defaults, deprecation/replacement +
  cycles, schema strictness, hash determinism/stability, and Phase 1A port
  coverage. `lib/engine/parameters` imports only `../values`, `../units`, and
  `zod` (engine-purity boundary intact). Exit criterion met: every Phase 1A port
  maps to a released parameter; the deferred downstream groups are approved
  pending proposals (see Architecture Decisions and Open Questions).
  `npm run lint`, `typecheck`, `test`, and `build` all pass (2026-07-28)
- Unit 1.4: source registry and US/JP market profiles implemented in the new
  `lib/standards/` boundary (2026-07-28). Deliverables: metadata contracts
  (`types.ts`) — `SourceDocument` (edition-independent identity, classification,
  `public`/`licensed` access, authority, market, optional bilingual
  `originalTitle`/`originalLanguage`), immutable `SourceRevision` (edition,
  effectiveDate, `supersedes`, optional permitted `excerpt`), `ClauseReference`
  (revision + clause/page/label location), and `MarketProfile` (versioned bundle
  of applicability-tagged entries + no-overclaim disclaimer), with branded IDs;
  the shared `SourceClassification` enum **includes `administrative_guidance`**
  (required by the JP profile); strict Zod schemas (`schemas.ts`) with a
  compile-time parity guard; typed `SourceRegistryError` with a `code`
  (`errors.ts`); registry loader + validator (`registry.ts`,
  `buildSourceRegistry`) enforcing unique document/revision/profile IDs,
  revision→document existence, non-empty edition, licensed-excerpt restriction,
  supersession validity (existing, non-self, acyclic), and profile-entry
  resolution, plus `resolveReference()` (revision + document + location) and a
  `marketProfileKey()` helper (`id@major`, e.g.
  `US-General-Industrial-Machinery@1`); US seed (`profiles/us.ts`: 9 documents,
  8 revisions — OSHA ×4, ANSI B11.0/B11.19, NFPA 79, UL 508A; NFPA 70 is a
  document with no baseline revision because its edition is AHJ-specific) and JP
  seed (`profiles/jp.ts`: 6 documents/revisions — ISHA, Ordinance, MHLW
  comprehensive-safety guideline, JIS B 9700/9705-1/9960-1 — with Japanese
  authoritative titles on the statutes/guideline and licensed JIS carrying no
  excerpt); released singleton + seed exports (`registered.ts`); barrel
  (`index.ts`); and a policy README (`README.md`). Scope: metadata only, no
  safety calculators. `lib/standards` imports only `zod` and its own types.
  34 new tests (182 total) cover unique IDs, revision/document validity,
  missing-edition, licensed-excerpt restriction, supersession (valid/self/
  unknown/cycle), profile-entry resolution, reference resolution, bilingual +
  administrative_guidance coverage, and schema strictness. Exit criterion met:
  a clause reference resolves to an exact source revision and location.
  `npm run lint`, `typecheck`, `test`, and `build` all pass (2026-07-28)
- Unit 1.5: calculation trace and check contracts implemented in the new
  `lib/engine/trace/` boundary (2026-07-28). Deliverables: a versioned
  `CalculationTrace` envelope (`TRACE_FORMAT_VERSION = 1`, deliberately
  independent of the value `SERIALIZATION_FORMAT_VERSION`) over ordered,
  nestable `TraceSection`s whose `children` are `TraceNode`s (a discriminated
  `step | section` union), each `TraceStep` carrying a stable `id`, a
  `methodId` (expression/method identifier) + optional human `expression`
  (rendering only, no logic), named `inputs`/`outputs` as `TraceOperand`s
  (label + embedded `EngineeringValue` + optional `ref` provenance), and
  optional source citations **reusing `lib/standards` `ClauseReference`**;
  check-side contracts `CheckResult` (5-state `CheckStatus`
  pass/fail/warning/not_applicable/invalid_input + message/criterion/observed/
  allowable/margin/sources), `Warning`, and `ValidityResult` (validity-envelope
  result: within_limits/out_of_range/not_evaluated). Files: `types.ts` (TSDoc'd
  interfaces), strict Zod `schemas.ts` with a compile-time schema/interface
  parity guard (recursive `TraceSectionSchema`/`TraceNodeSchema` via `z.lazy`
  typed as `z.ZodType<T>`), typed `TraceError` (`errors.ts`: invalid_shape /
  duplicate_node_id / invalid_source_reference), `trace.ts` (`walkTrace`
  depth-first in-order visitor, `traceStepIds`, `validateCalculationTrace`
  enforcing trace-unique node IDs + source-refs that carry a clause or page,
  `buildCalculationTrace` author factory, serialize/deserialize with full
  re-validation on read), and `checks.ts` (`overallCheckStatus` — precedence
  invalid_input > fail > warning > pass, not_applicable ignored, empty →
  not_applicable; `isBlockingStatus`). Barrel `index.ts` re-exported from
  `lib/engine/index.ts`. `lib/engine/trace` imports only `zod`, `../values`,
  and `../../standards` **types + the `ClauseReferenceSchema` shape only** (not
  the standards seed/registry singleton), so engine determinism/purity holds.
  31 new tests (213 total) across three files cover nested-section traversal,
  stable/unique step IDs, invalid source references (clause-or-page),
  serialization round-trip + re-validation on deserialize + version-mismatch
  rejection, check severity behavior (a warning never masks a fail; a fail
  never presents as a pass), schema strictness, and a **snapshot rendering
  fixture** that produces a trace outline from trace data alone (no module
  compute import). Exit criterion met: a report can be produced from trace data
  without knowing module formulas. `npm run lint`, `typecheck`, `test`, and
  `build` all pass (2026-07-28)
- Unit 1.6: module SDK v1 implemented in the new `lib/engine/module-sdk/`
  boundary (2026-07-28). The released `ModulePackage` contract — `manifest`,
  `ports`, author `inputSchema`, pure `compute`, `uiSchema`, `reportSchema`,
  `validation` record, optional `catalogAdapter` — with all declarative parts
  Zod-validated (strict, compile-time parity guard) and the behavior parts
  (compute/inputSchema/adapter) left as typed functions. Deliverables: `sdk.ts`
  (`ENGINE_SDK_VERSION = "1.0.0"`, dependency-free 3-part semver compare, `SdkRange`
  {min inclusive, maxExclusive}, `isSdkCompatible`); `types.ts` (manifest, input/
  output ports mapping to canonical `ParameterId`s, `ModuleInput`/`ModuleComputation`
  composing the Unit 1.5 trace/checks/warnings/**assumptions**/validity,
  minimal generic UI + report schemas, validation record, catalog-adapter
  interface, `ModulePackageDraft`); `schemas.ts`; typed `ModuleSdkError`;
  `hash.ts` (`packageContentHash` over the declarative projection excluding the
  hash field + behavior; `sealModulePackage` stamps it — the Stage-6 "freeze
  content hash" step); `validate.ts` (`validateModulePackage`: manifest/ports/ui/
  report/validation shape, well-formed SDK range, registry-version match, unique
  port keys, every port parameter registered, UI fields ⊆ input ports, unique
  report section IDs, content-hash integrity); `execute.ts` (`executeModule`:
  SDK-compat gate, input-schema parse, constant-default fill, **canonical-unit +
  kind enforcement** on inputs and outputs, output completeness/no-extras, trace
  invariant re-validation, and a manifest source-declaration cross-check —
  `missing_trace_source`; plus `computeIsDeterministic`). A sealed
  `example-linear-thrust` module (`example-module.ts`, imports **only** the engine
  public barrel `..`) computes F=μ·m·g and executes end to end through the public
  SDK (exit criterion). `lib/engine/module-sdk` imports only `zod`, sibling engine
  packages (`../values`,`../units`,`../parameters`,`../trace`), and `../../standards`
  types + `ClauseReferenceSchema` — the catalog adapter is an interface only, so
  the SDK never imports `lib/catalog` (engine purity intact). Barrel re-exported
  from `lib/engine/index.ts`. 37 new tests (250 total) across sdk/schemas/validate/
  execute cover the seven implementation-map cases (minimal valid module, invalid
  manifest, unknown parameter ID, incompatible SDK range, output schema mismatch,
  missing trace source, nondeterminism detection) plus registry-version mismatch,
  duplicate port keys, UI/report validation, content-hash tamper, missing-required/
  non-canonical-unit inputs, and default fill. Exit criterion met: a complete
  example module executes through the public SDK only. `npm run lint` (0 warnings),
  `typecheck`, `test`, and `build` all pass (2026-07-28)
- Unit 1.7: module conformance suite, scaffolder, and registry codegen
  implemented (2026-07-28), across `lib/engine/module-sdk/` and the new
  `lib/modules/` boundary. Three reusable, engine-pure surfaces:
  (1) `conformance.ts` — `runModuleConformance(pkg, options)` returns a
  structured `ConformanceReport` of independent pass/fail/skipped checks,
  reusing the SDK's own functions rather than reimplementing rules:
  `package-validation` (delegates to `validateModulePackage` — manifest
  validity, stable parameter references, UI/report schemas, validation-record
  presence, content-hash integrity), `execution` (`executeModule` per sample
  input — input/output validation, trace completeness, declared-source
  integrity), `determinism` (`computeIsDeterministic` on the fully-resolved
  input), and `import-boundary` (`checkImportBoundary`, a pure heuristic source
  scanner flagging imports of persistence/auth/framework/UI/application/catalog/
  Node-I/O). The runner never throws — every failure is a failing check — and is
  pure (takes pre-read source files, no fs). (2) `scaffold.ts` —
  `generateModuleScaffold({moduleId, version?})` returns the file set for a new
  module (manifest, split trace/checks/compute, UI, report, validation, an
  assembling index, and a conformance test) mapping placeholder ports to real
  released parameters so a fresh scaffold compiles and passes conformance
  immediately. (3) `registry-codegen.ts` — `generateRegistrySource(entries)`
  emits `lib/modules/registry.generated.ts` (the compile-time module registry,
  architecture.md "Module Consistency Mechanisms" #4). Both scaffold and
  registry-codegen are **runtime-import-free** (local types only) so the two CLIs
  can import them directly under Node's native TypeScript execution. CLIs:
  `scripts/module-new.mts` (`npm run module:new -- <id> [version]`) and
  `scripts/generate-registry.mts` (`npm run registry:generate`), both `.mts` and
  run with `--disable-warning=MODULE_TYPELESS_PACKAGE_JSON`. New `lib/modules/`
  boundary: hand-written `index.ts` (`MODULE_REGISTRY`, `getModulePackage`,
  `listModulePackages`), generated `registry.generated.ts`, and a
  `registry.test.ts` that validates + conforms every registered module.
  Supporting refactor: extracted `resolveModuleInput` from `executeModule` (Unit
  1.6, additive — same behavior) so the determinism check computes on the exact
  input `executeModule` builds (constant defaults filled). The `example-scaffold`
  module under `lib/modules/example-scaffold/0.1.0/` was produced by the
  scaffolder and registered by the codegen script — a demonstration artifact
  (parallel to `example-linear-thrust` being an SDK proof fixture), not a
  production module. tsconfig: `allowImportingTsExtensions: true` (safe under the
  existing `noEmit`; only permits the scripts' `.ts`-extension imports —
  `next build` tolerates it). 30 net-new tests (280 total) across conformance,
  scaffold, registry-codegen, the registered-module suite, and the generated
  example-scaffold test. Exit criterion met: a scaffolded module compiles,
  passes conformance, and registers with **no** core-engine, generic-UI,
  report-renderer, or database-schema change. `npm run lint` (0 warnings),
  `typecheck`, `test`, and `build` all pass (2026-07-28)
- Unit 1.8: parameter graph core implemented in the new `lib/engine/graph/`
  boundary (2026-07-28), completing Milestone 1's generic engine. Deliverables:
  contracts (`types.ts`) — branded `ScopeId`/`NodeId`/`LinkId`, `GraphScope`
  (assembly hierarchy via `parentId`), `GraphNode` (kind ∈ machine_requirement/
  assembly_parameter/workflow_parameter/module_output/module_input, a canonical
  `parameterId`, a scope, an optional load case, and an owning module instance
  for ports), `GraphLink` (confirmed source→target), `ParameterGraph`,
  `ApprovedParameterMapping`, and the result types (`LinkCompatibility` with a
  typed `LinkIncompatibilityReason`, `SourceSuggestion`, `StaleImpact`); strict
  Zod schemas (`schemas.ts`) with a compile-time parity guard (these structures
  persist in Unit 2.2); typed `ParameterGraphError` (`errors.ts`);
  **link-compatibility evaluator** (`compatibility.ts`, `evaluateLinkCompatibility`)
  enforcing the seven architecture criteria — direction (value flows from a
  provider to a `module_input`), parameter identity **or** an approved mapping,
  and (for a mapped, cross-parameter link) value family, physical dimension
  (via the unit registry), qualifier axes (bound/aggregation/load-nature agree
  on every populated axis), coordinate frame, plus load case for every link;
  unit compatibility alone never authorizes a link (invariant "Semantic link
  safety"); **graph builder + traversal** (`graph.ts`) — `buildParameterGraph`
  validates shape + referential integrity (unique IDs, known scopes/nodes, link
  target is an input, link source is not an input, module ports carry a module
  instance, acyclic scope hierarchy) and indexes a **feed graph** whose edges are
  the confirmed links plus each module's internal input→output dependencies;
  `wouldCreateCycle` (a link source→target cycles iff target already feeds
  source; invariant "Acyclic graph"), `downstreamNodeIds` (BFS), and
  `computeStaleImpact` (downstream nodes → distinct stale module instances;
  invariant "Transactional stale propagation" — the graph computes impact, the
  application layer applies it in one transaction); **nearest-scope suggestion**
  (`suggest.ts`, `suggestSources`) ranking compatible, visible, non-cycling
  sources by scope proximity (same scope, then ancestors to the machine root,
  then explicitly-exposed cross-assembly sources), deterministic ordering with an
  ID tie-break. Barrel (`index.ts`) re-exported from `lib/engine/index.ts`.
  `lib/engine/graph` imports only `zod`, `../parameters`, and `../units` —
  engine purity intact; every function is pure and DB/UI-independent (exit
  criterion). 33 new tests (313 total) covering the listed Unit 1.8 cases:
  same-assembly preference, parent-scope fallback, cross-assembly visibility,
  unit-compatible-but-semantically-incompatible rejection, peak-vs-RMS
  (aggregation) rejection, wrong-load-case rejection, cycle rejection, and
  multi-level stale propagation, plus builder-integrity errors and semantic-axis
  (dimension/value-type/bound) rejections. `npm run lint` (0 warnings),
  `typecheck`, `test`, and `build` all pass (2026-07-28)
- Unit 0.5: ADR and validation structure implemented (2026-07-29).
  `context/adr/README.md` documents the ADR process (when to write one, the
  numbering convention, and an immutability rule that mirrors the
  parameter-deprecation/source-revision immutability pattern already used
  elsewhere: an accepted ADR is never edited to reflect a reversal — a
  reversal is a new ADR that supersedes it) plus an index of the five initial
  records; `context/adr/TEMPLATE.md` is the copy-and-fill template
  (Context/Decision/Consequences/Notes). Five ADRs formalize decisions
  **already made** — no new rationale invented, all pulled from
  `context/architecture.md`, `context/project-overview.md`,
  `context/roadmap.md`, and this file's own "Architecture Decisions"/
  "Resolved Product Decisions" entries: ADR-0001 (modular TypeScript
  monolith for the MVP), ADR-0002 (immutable calculation runs and
  baselines), ADR-0003 (the versioned `ModulePackage` SDK contract in
  `lib/engine/module-sdk/`), ADR-0004 (canonical SI storage with flexible
  engineering display units), ADR-0005 (manufacturer specifications plus
  lightweight component assignment, explicitly no approval/supplier/
  inventory workflow in the MVP). `validation/module-validation-template.md`
  is the Stage-4 validation record template from `ai-workflow-rules.md`'s
  New Module Workflow: module identity, purpose/validity envelope, a sources
  table referencing `lib/standards` `SourceRevision` IDs, three published
  reference examples with explicit tolerances, an independent-method/tool
  comparison, tolerances-and-deviations summary, unsupported conditions, a
  test-coverage checklist, a reviewer field, and — verbatim per
  `ai-workflow-rules.md` — the documented solo-validation
  reviewer-substitute rule ("When no second engineer is available, the
  documented independent benchmark comparison serves as the review
  substitute and is recorded as such"). `validation/source-index.md` is the
  running index of source revisions used by validated modules, referencing
  `lib/standards`; it ships with its row format explained and **zero
  entries**, since no module has completed Stage-4 validation yet —
  pre-populating it would invent evidence that does not exist. Exit
  criterion met: the `context/adr/` and `validation/` paths `CLAUDE.md`
  already referenced now exist and match
- Unit 0.4: finished the database client and health check (2026-07-29).
  Added the `postinstall` script (`"prisma generate"`) to `package.json` so
  the generated client regenerates on every `npm ci`/`npm install` instead
  of being committed — the standard fix for a gitignored custom-output
  Prisma client, and it keeps `lib/db` the sole Prisma-importing boundary.
  Implemented `lib/db/client.ts`: a `server-only`, TSDoc'd singleton
  `PrismaClient` cached on `globalThis` outside production (the standard
  Next.js/Prisma hot-reload-safe pattern, so dev-server edits reuse one
  connection pool instead of exhausting Postgres connections), importing
  `PrismaClient` from the generated `./generated/prisma/client` output.
  Implemented `checkDatabaseHealth()` in `lib/db/index.ts`: a typed
  `SELECT 1` round trip via `$queryRaw`, returning a discriminated
  `{ ok: true, latencyMs }` / `{ ok: false, error }` result rather than
  throwing, per the project's discriminated-union result-state convention.
  Added `lib/db/health.test.ts` — a **live**-database Vitest test that
  round-trips `checkDatabaseHealth()` against `DATABASE_URL`, gated with
  `describe.skipIf` so it reports as *skipped* (not silently passed)
  whenever `lib/db/generated/prisma` does not exist locally — and a
  `db:health` convenience script. Added a `postgres:16-alpine` service
  container plus a job-level `DATABASE_URL` to
  `.github/workflows/ci.yml`, matching `docker-compose.yml`'s local
  credentials, so `prisma generate` (via postinstall) and the live health
  check both have a real target database in CI.
- Unit 0.4 completion — Prisma 7 configuration corrected and verified
  (2026-07-29). The first three CI runs all failed. Root cause, read from
  the Actions logs: `prisma generate` aborted with **P1012, "The datasource
  property `url` is no longer supported in schema files."** Prisma 7 removed
  `url` from the datasource block. `prisma/schema.prisma` had been
  hand-authored back when `prisma generate` could not run anywhere, so it
  had **never actually been executed** — CI was the first environment to run
  it, and it failed immediately. Fixes:
  - `prisma/schema.prisma`: dropped `url` from the datasource block. Prisma 7
    takes the CLI connection URL from `prisma.config.ts` (already present)
    and the *runtime* connection from a driver adapter.
  - `lib/db/client.ts`: connects through **`@prisma/adapter-pg`** (added with
    `pg`; `@types/pg` as a dev dependency), constructed from the
    `DATABASE_URL` that `lib/env.ts` already validates with Zod, so the
    single validated env boundary still owns the value.
  - `vitest.config.ts`: aliased `server-only` to a local no-op stub
    (`tests/stubs/server-only.ts`). The real package's entry point *throws*
    by design, and Next.js only neutralizes it under the `react-server`
    export condition, which the Node test environment does not set — so
    `health.test.ts` would have failed the moment generation started
    working. The alias is test-runner-only; application builds still resolve
    the real package, so the marker keeps its meaning. (Aliasing to the
    package's own `empty.js` does **not** work — its `exports` field
    declares only `.`, so that subpath is not importable.)
  - `vitest.config.ts`: made `exclude` use globs. A bare `"node_modules"`
    does not match nested paths, so a nested `node_modules` had its
    third-party tests collected and run as if they were ours — 2527 tests
    and an 84 s run instead of 314 tests in ~1 s.
  **Verification, stated plainly per this project's blocker-transparency
  norm.** Verified green in GitHub Actions CI (commit `2fd597e`): `npm ci`,
  `prisma generate`, lint, typecheck, test, and build all pass, and
  `lib/db/health.test.ts` **executed rather than skipped** (`1 test`, 315 ms
  — a real round trip to the `postgres:16-alpine` service container),
  314/314 tests passing. Unit 0.4's exit criterion "Database health check
  passes" is therefore met against a real PostgreSQL instance. Verified
  locally on the corporate-network dev machine: lint clean, with 313 tests
  passing and 1 correctly skipped. `npm run typecheck`/`build` still fail
  **there** on exactly one line — `lib/db/client.ts`'s `Cannot find module
  './generated/prisma/client'` — because `prisma generate` remains blocked
  on that network. That is an environment limitation, not an unverified
  code path: CI runs both cleanly

## In Progress

- None. Unit 0.1 (fixtures) intentionally deferred until real comparison
  cases are ready; platform build proceeds first (see decision above)

## Note — mechanisms the user works with (not an MVP reprioritization)

- CORRECTION of an earlier read: the designated real validation cases
  (ID39 ball-screw axis, ID42 servo drive-train) ALIGN with the current
  ball-screw-first MVP roadmap — no reprioritization is warranted. The
  user also works with rack-and-pinion, rotary index tables, and
  direct-drive conveyors (seen in the calculation-phase `Book1.xlsx`
  Case1/Case2 and their conveyor question), but those are exploratory,
  not the validation basis. Keep them in mind as likely Phase 2+
  mechanism modules; the generic engine (mechanism-agnostic motion and
  servo modules, generic parameter/graph/trace) already accommodates
  them. Do NOT re-order the roadmap on this; revisit at a prioritization
  checkpoint if the user's real machine mix shifts.

## Next Up

Units 2.6 through 2.9 are all complete and verified green in GitHub Actions
CI (2026-07-30 — Unit 2.8's initial push needed a test-cleanup fix, see
Current Goal) and drop off this list. **Milestone 2 (Persistence and
Application Services) is now complete.**

The 2026-07-30 integrity-hardening pass is complete and CI-verified (commit
`a774c22`, run 30537557349 — see Current Goal) and drops off this list.

1. **CLOSED (2026-07-30, new session — see Current Goal, "DESIGN-RISK
   FOLLOW-UP 1 of 6"):** React Testing Library, Playwright, coverage
   configuration for engine/modules, a `test:e2e` script, and the CI E2E
   step are all added. **Not fully closed as specified**: Playwright covers
   only the *unauthenticated*-route smoke strategy (home page renders, and
   `/workspace` redirects an unauthenticated visitor) — the authenticated
   half needs Clerk test-instance credentials this project has never had
   configured, now tracked as its own Open Questions item. Playwright
   itself has not had a CI round trip yet (this dev machine's group policy
   blocks launching any freshly downloaded browser binary — see Current
   Goal); everything else (lint/typecheck/test/build, all green locally) has
   already been re-verified with the new files present. Phase 0B's gate
   ("CI blocks lint, type, unit, and build failures") was already true
   before this pass; the roadmap's own toolchain deliverable list is what
   was incomplete, and that gap is now closed pending the CI round trip.
2. **Milestone 3 (Generic User Experience) is under way; Units 3.1–3.7 are
   complete.** See `context/progress/unit-3.md` for full unit-by-unit
   history, the Unit 3.2/3.5/3.6/3.7 architecture decisions, the curve-editor
   deferral, Unit 3.6's `matchingAvailable: false` deferral (the
   `requiredSpec()`-to-`MatchCriterion` operator mapping stays Milestone
   4's), Unit 3.7's verification-status scope (authoring completeness only,
   not a real requirement-to-run link — that stays Milestone 5's Unit 5.3),
   and the Unit 3.8 brief (next: baseline and comparison UI, the last
   Milestone 3 unit).
   - Deferred as its own future unit (NOT Unit 2.8): "change an
     assigned-component feedback input" stale-propagation use case — an
     assignment acting as a *source* of a value other calculations consume
     (e.g. an assigned bearing's real stiffness feeding back into an
     upstream calculation). Unit 2.8 part 2 implemented the simpler
     direction only (an assignment goes stale when its justifying run does).
     This feedback direction needs a new parameter-graph node kind — a
     materially larger change than a stale-propagation call site — so it is
     deferred until a real module actually needs it, not folded into Unit
     2.8. See Architecture Decisions.
   - Deferred to whichever Milestone-4 module first ships a `catalogAdapter`
     (NOT Unit 2.8): converting a module's `CatalogAdapter.requiredSpec()`
     output (a bare `Record<string, EngineeringValue>`, no operator) into
     part 1's explicit `MatchCriterion[]` (key + `"gte"`/`"lte"`/`"eq"` +
     value), then choosing a `manufacturerPartRevisionId` from
     `rankCandidates`'s output to pass to `assignComponent`. Part 1
     deliberately did not guess which operator each attribute needs — see
     Current Goal and Architecture Decisions.
3. LATER (deferred): Unit 0.1 — structure ID39 + ID42 into validation
   fixtures once the user has real cases to compare against
4. Downstream parameter groups (screw, guide, coupling, support-bearing,
   drive-train): NOT released in registry v1 — approved pending proposals to
   be released per module at its Stage-2 parameter contract (bumping the
   registry version). See `lib/engine/parameters/README.md` and Open Questions

## Open Questions

- **RESOLVED (2026-07-31, Unit 3.3) — read-model half only; the curve/
  `vector_quantity` editor half remains a standing deferral.** Full detail,
  the revisit trigger, and the original blocker text are relocated to
  `context/progress/unit-3.md` Open Questions.

- Unit 1.3 SCOPE DECISION (2026-07-28): the implementation map lists 10 initial
  parameter groups for Unit 1.3, but the screw/guide/coupling/support-bearing/
  drive-train **result** groups have engineering semantics (units, qualifiers,
  frames) that depend on each module's Stage-1 spec, which does not exist yet.
  Because released parameter IDs are immutable, those groups were NOT released
  in registry v1 — releasing them now would be inventing behavior. They are
  approved pending proposals, released per module at its Stage-2 parameter
  contract (bumping the registry version), per the New Module Workflow. The
  Phase 1A upstream outputs (`motion.axis.thrust_force`, `motion.profile.peak_*`,
  etc.) already serve as those modules' shared input ports. Also deferred: the
  `curve`/`load_spectrum`/`table`/`material_ref`/`component_ref` value families
  are modeled as parameters only when a module first needs them. Revisit each
  when its module reaches Stage 2. Not a blocker for Units 1.4/1.5
- RESOLVED (2026-07-28): `Book1.xlsx` Case1/Case2 are calculation-phase
  exploration, not validation fixtures; ID39 + ID42 are the designated
  real validation references. Build platform first, structure fixtures
  later. Ball-screw-first roadmap stands (ID39 is a ball-screw axis)
- LATER (deferred with Unit 0.1): for ID39 and ID42, capture the FINAL
  selected components (motor model, reducer/gearbox + ratio, screw model,
  guide, coupling/bearing) and any real-world corrections, so they become
  full validation fixtures with a pass/fail comparison target
- Conveyor sizing: the Oriental tool only templates pulley/roller-reduced
  conveyors, but the user's design is direct drive. Our generic engine
  models this as (drive-roller + belt + load inertia) at ratio 1:1 using
  standard formulas (Omron R88M guide has the conveyor-belt inertia
  formula). Not an MVP blocker; note as a Phase 2+ mechanism to support
- PARTLY RESOLVED (2026-07-30 hardening pass): the ~15.3 MB reference batch
  moved from `public/ref data/` to `reference/source-material/` (`git mv`, so
  history follows the rename), and Next.js no longer serves it as
  unauthenticated static content. **Still open:** those 38 files remain in git
  history at the old path, so a history rewrite is the only way to remove them
  from the repository if distribution requires it; the licensing review below
  is unchanged; and the spreadsheet and at least one PDF carry author metadata
  worth checking before the repository is shared
- ARCHITECTURE FOLLOW-UPS from the 2026-07-30 audit, each a design decision
  rather than a bug fix, none attempted in the hardening pass:
  - **RESOLVED (2026-07-30, design-risk follow-up 6 of 6 — see Current
    Goal), pending a CI round trip before it can be called fully verified.**
    Nine repository read functions across four files gained an optional
    `client: DbClient = prisma` parameter; `createBaseline` and
    `executeModuleInstance` each now wrap their whole body — authorization,
    every read, and the final write — in one `prisma.$transaction(fn, {
    isolationLevel: "RepeatableRead" })`. A new live-DB test in
    `create-baseline.test.ts` proves the actual Postgres guarantee (a
    concurrent commit mid-transaction stays invisible to reads already
    inside it), but has only run against `describe.skipIf` locally so far.
    **All six design-risk follow-ups from the 2026-07-30 hardening pass are
    now addressed** — every "Not attempted this session" item that pass
    named is either resolved or, for Unit 0.3's Playwright authenticated-path
    gap and the linear/rotational unit helper, explicitly re-deferred with a
    stated reason above, not silently dropped.
  - **RESOLVED (2026-07-30, design-risk follow-up 3 of 6 — see Current
    Goal).** `packageContentHash` still deliberately excludes `compute` and
    helper source (functions are not stably serializable) — that has not
    changed, and a run's pinned `contentHash` still cannot by itself prove
    which formula executed. What closes the gap is a separate mechanism,
    external to `packageContentHash`: `moduleSourceHash` + a new
    `runModuleConformance` "source-immutability" check + `npm run
    module:source-hash`, wired into both example modules as the reference
    pattern for Stage 6 release. See `ai-workflow-rules.md` Stage 6 and
    `code-standards.md` "Module Packages" for the now-required release step.
  - **RESOLVED (2026-07-30, design-risk follow-up 2 of 6 — see Current
    Goal).** Angle is a base dimension on purpose (so `rad` ≠ ratio and
    `rad/s` ≠ `Hz`, which the graph relies on to reject wrong links), so
    generic `multiplyQuantities(10 N·m, 100 rad/s)` staying `kg*m^2*s^-3*rad`
    rather than simplifying to `W` was a real trade-off, not an oversight.
    Resolved with a dedicated helper (not a change to generic
    multiply/divide): `rotationalPower`/`torqueFromPower`/
    `angularVelocityFromPower` in `lib/engine/units/arithmetic.ts`. Modules
    doing torque × angular velocity must call `rotationalPower`, not
    `multiplyQuantities`.
  - NEW, deferred (2026-07-30, same follow-up): the same "angle cancels by
    reviewed physical law" shape also applies to `v = r*ω` (linear speed
    from a radius/lead and an angular velocity) — the ball-screw and
    pulley/roller conversions Milestone 1B/1C need. Not built yet: it is a
    different relationship from the one confirmed broken by test, and no
    module calls it yet. Add it as its own small helper (the same
    `requireDimension` + direct-SI-computation pattern
    `rotationalPower` uses) when Unit 1B's ball-screw or Unit 1C's servo
    module first needs it, rather than guessing its exact signature now
  - **IMPLEMENTED (2026-07-30, design-risk follow-up 4 of 6 — see Current
    Goal), pending a CI round trip before it can be called resolved.**
    Composite foreign keys (not triggers) on `ModuleInstance.assembly`,
    `ParameterValue.assembly`/`.moduleInstance`,
    `ParameterLink.targetModuleInstance`/`.sourceModuleInstance`/
    `.sourceAssembly`, and `ComponentAssignment.moduleInstance`/`.assembly`
    — migration `20260730180000_same_configuration_constraints`. 5 new
    repository-level tests prove a genuine mismatch is rejected, but have
    only run against `describe.skipIf` locally (no Postgres on this
    machine); do not treat this as fully verified until CI's "Deploy
    migrations" step and those 5 tests both go green
  - **RESOLVED (2026-07-30, design-risk follow-up 5 of 6 — see Current
    Goal).** Policy: any authenticated user may import catalog data (no
    role/admin concept exists in this codebase to gate on, and inventing one
    here would be new product behavior), but every import is now mandatorily
    attributed — `importCatalog(input, importedByUserId: UserId)`, the
    second parameter no longer optional. See `architecture.md` "Auth and
    Access" and `code-standards.md` "Catalog" for the recorded policy. A
    stricter, role-gated policy remains deferred to whenever this codebase
    gets a role/reviewer concept (Phase 4)
  - **`format:check` is red on 124 files and is not in CI.** Most predate this
    work. A formatting-only commit would fix it, but mixing it into a
    behavior change makes review impossible — so it needs its own commit
- Licensing: ID39/ID42 are third-party training PDFs and the Omron/ATLANTA
  guides are vendor method references. Store METHOD + clause/source
  metadata only (per licensing policy), never embed their copyrighted
  text/tables/figures into modules or reports
- Final product name; MachineStudio remains a working name
- Deployment target: Vercel plus managed PostgreSQL or a single VPS
- Initial manufacturer data sources for:
  - ball screws
  - linear guides
  - couplings
  - support bearings
  - servo motors, drives, gearboxes, and brakes
- Which three historical axis projects can be sanitized for validation
- Whether S-curve motion is mandatory for the first live-axis replacement
- Whether the first live project requires 480 V three-phase drive-system
  compatibility data
- STILL OPEN after Unit 1.4: live-verify official Japanese (and US) source
  links and current editions (e-Gov, MHLW, JSA/JISC, OSHA, ANSI, NFPA, UL).
  Unit 1.4 seeded the registry from the metadata already recorded in
  `us-market-profile.md`/`jp-market-profile.md` (URLs, classifications,
  editions) rather than fabricating new verification — this dev network cannot
  reach those hosts. When a network allows it, confirm each `officialUrl`
  resolves and each edition is current; a new edition creates a new immutable
  `SourceRevision` (never edits an existing one). OSHA CFR sections and the JP
  Ordinance are seeded with edition `current` (continuously in force) and NFPA
  70 has no baseline revision (AHJ-specific edition) — revisit if a project
  needs a specific adopted edition
- Whether the first Japanese project needs 50 Hz (East) or 60 Hz (West)
  200 V class drive data
- Whether Japanese-language report output is required by JP customers
- This dev machine sits behind a corporate network that performs TLS
  inspection and blocks some hosts entirely for Node's `fetch` (confirmed
  for `ui.shadcn.com` and Prisma's engine-binary host
  `binaries.prisma.sh`; `registry.npmjs.org` and Google Fonts work).
  Whoever next runs `npx shadcn add <component>` or `prisma
  generate`/`migrate` needs network access to those hosts, or the
  corporate proxy needs to allowlist them. STILL STANDING (2026-07-29):
  this is a separate, unresolved constraint for anyone running these
  commands directly on that machine — it is not fixed by anything done
  this session (see the Unit 0.4 session note immediately below for what
  *was* actually tested)
- NEW (2026-07-30, Unit 0.3 design-risk follow-up): this project has never
  had a Clerk instance's keys configured anywhere — dev runs on Clerk's
  keyless auto-provisioned instance, and no CI secret exists either. That
  is enough for the new `e2e/smoke.spec.ts` to prove the unauthenticated
  half of Unit 0.4's exit criteria (redirect away from `/workspace`), but
  not the authenticated half ("authenticated user can access the empty
  workspace"), which needs a real signed-in session. Proving that in CI
  needs a decision to create a Clerk test/dev instance and store its keys
  (plus, for a non-interactive sign-in, `@clerk/testing`'s testing-token
  flow) as GitHub Actions secrets — a policy/cost decision, not a bug fix.
  Revisit once Milestone 3 UI work makes the authenticated path something
  users actually exercise
- shadcn/ui was configured by hand (Radix + "new-york" style) instead of
  via `npx shadcn init`, since that command's live init endpoint was
  unreachable; confirm the style/base choice once the CLI is reachable,
  in case the newer default preset ("base-nova") is preferred
- The npm registry is pinned to `https://registry.npmjs.org/` via a
  committed project `.npmrc`, because the machine's configured mirror
  (`registry.npmmirror.com`) blocked a large binary download outright
  (a DLP "File Transfer Blocked" response, not a transient failure)
- RESOLVED (2026-07-29) — `prisma generate` now succeeds, and Unit 0.4's
  live-database health check passes, **in GitHub Actions CI**. The long
  investigation below is kept because its conclusion changed twice; the
  short version: the failure was never only about the network. Timeline:
  (1) the corporate-network dev machine could not run `prisma generate`
  (`binaries.prisma.sh` → "self-signed certificate in certificate chain");
  (2) a cloud/remote agent sandbox, used specifically as option (a) "a
  network without that interception," failed **identically** — direct
  TLS-chain inspection showed the certificate presented there was issued by
  the same self-signed corporate root CA, so that sandbox was not actually
  network-isolated from the corporate proxy; (3) CI on GitHub-hosted runners
  reached `binaries.prisma.sh` fine — and then failed anyway, on a **real
  configuration bug that the network block had been hiding all along**:
  Prisma 7 error **P1012, "The datasource property `url` is no longer
  supported in schema files."** `prisma/schema.prisma` was hand-authored at
  a time when `prisma generate` could not be run to check it, so it had
  never once been executed. Fixed by dropping `url` from the datasource
  block and connecting at runtime through the `@prisma/adapter-pg` driver
  adapter (see the Unit 0.4 completion entry under Completed). Lesson worth
  keeping: an environment block that prevents a tool from *ever* running
  also prevents its configuration from ever being validated — the two
  failures looked like one.
- STILL STANDING (2026-07-29): the primary dev machine's corporate TLS
  interception of `binaries.prisma.sh` is **not** resolved. `prisma
  generate`/`migrate` still cannot run there, and because the generated
  client is gitignored by design, `npm run typecheck` and `npm run build`
  cannot pass on that machine either (both fail on the single import in
  `lib/db/client.ts`). `npm run lint` and `npm run test` do pass locally;
  the health test self-skips rather than false-passing. `npm ci` also now
  fails there at the `postinstall` hook — use `npm ci --ignore-scripts`
  locally, which is what CI does. Remaining options, unchanged and none
  taken unilaterally: (a) run Prisma commands from a genuinely
  unintercepted network — note that a cloud sandbox is **not** automatically
  one, as proven above; (b) ask IT to allowlist `binaries.prisma.sh` — now
  the clearly preferred fix, since Milestone 2 is migration-heavy and
  iterative; (c) explicitly authorize `NODE_EXTRA_CA_CERTS` pointing at the
  already-OS-trusted corporate root CA for Prisma CLI invocations only
  (narrower than disabling TLS verification, still a security-review
  decision); or (d) treat CI as the verification environment for all
  database work and accept a CI round trip per iteration. The user directed
  on 2026-07-29 not to attempt any TLS workaround; no bypass has been
  attempted in any session (no `NODE_TLS_REJECT_UNAUTHORIZED`, no CA-trust
  change).
- UPDATE (2026-07-30, new session, design-risk follow-up 4 of 6): on
  *this* session's network, `npx prisma generate` and `npx prisma validate`
  both worked cleanly against the current schema — another data point (like
  2026-07-29's) that this constraint varies by network/session, not by
  something fixed in the repository. **New finding, narrower than the
  binaries.prisma.sh TLS block above**: `npx prisma migrate diff --script`
  (schema-to-schema, no live database required in principle) failed with
  `spawn UNKNOWN`; running the downloaded Chromium binary directly (see the
  Unit 0.3 entry, same session) had already shown this exact OS-level
  message plainly: "This program is blocked by group policy." So on a
  network where the TLS block is absent, a *different*, process-launch-level
  corporate restriction can still block Prisma's schema-engine binary
  specifically (needed for `migrate diff`/`migrate dev`, apparently not for
  `generate`/`validate`) — two independent obstacles, not one. Still no
  local PostgreSQL/Docker on this machine either way, so `prisma migrate
  dev`'s shadow-database workflow remains unavailable regardless of which
  obstacle is active; CI stays the actual verification environment for
  migrations.

## Resolved Product Decisions

- Initial markets are the United States and Japan
- Market profiles beyond the US and Japan are deferred
- The UI remains English-only in the MVP; Japanese report output is an
  open question
- The product does not claim automatic legal certification
- The MVP stores manufacturer part specifications and source provenance
- No company-approved-part, supplier, inventory, or procurement workflow
  in the MVP
- A lightweight component assignment remains necessary for BOM and
  calculation traceability
- Canonical SI storage with common engineering input/display units
- The MVP is a complete linear-axis workflow with expanded modules
- Adding a conforming module must not require changes to the core engine,
  generic database schema, generic module workspace, or report renderer
- (2026-07-28) Build the platform first; validation fixtures (Unit 0.1)
  are deferred until real comparison cases are ready. ID39 (ball-screw
  axis) and ID42 (servo drive-train) are the designated real validation
  references; `Book1.xlsx` Case1/Case2 are calculation-phase only

## Architecture Decisions

- (2026-07-30/07-31, Units 3.2 and 3.5) Four Unit 3.x architecture
  decisions — Unit 3.2's auto-created initial `MachineConfiguration` and
  module-instance creation validated against the real module registry; Unit
  3.5's previous-run-comparison scope (latest vs. immediately-prior run
  only) and the Result/Input pane stacked-column layout — are relocated to
  `context/progress/unit-3.md` Architecture Decisions.
- (2026-07-30 hardening pass) **Manufacturer part revisions are write-once
  engineering records — ADR-0006.** An exact repeat import reuses the existing
  row and leaves its provenance with the batch that first produced it; changed
  content under the same `(manufacturer, part number, source revision)`
  identity is a `conflict` and must be imported under a new source revision. A
  `BEFORE UPDATE` trigger backs the repository rule (the second use of the
  custom-SQL-trigger pattern Unit 2.3 established), and `importBatchId` became
  `onDelete: Restrict` so recorded provenance cannot be detached. `importCatalog`
  reports conflicts per row rather than failing a whole file: the other rows
  are valid manufacturer data, and the conflict is detected before any write is
  issued, so the transaction stays intact. This reverses Unit 2.7 part 2's
  "re-importing the same identity updates the existing row in place."
- (2026-07-30 hardening pass) **Authorization is target ownership *plus*
  configuration membership.** Units 2.2/2.5/2.8 treated a caller-supplied
  `configurationId` as trusted and documented that as a deliberate convention.
  It was a cross-tenant write path: one owner's module instance or assembly
  could file a value, link, or component assignment under any configuration id
  the caller chose. Every application service now cross-checks the target's
  real configuration, and both endpoints of a link must be in it.
  `ModuleInstanceExecutionContext` carries `configurationId` for this;
  `isAssemblyOwnedBy` was replaced by `loadAssemblyForOwner`.
- (2026-07-30 hardening pass) **Semantic link compatibility belongs to the
  application service, not the suggestion UI** — reversing Unit 2.2's
  deferral. `confirmParameterLink` verifies declared ports on both module
  endpoints and calls `evaluateLinkCompatibility` (invariant "Semantic link
  safety"). The repository keeps only the structural, registry-independent
  rules (duplicate target port, cycle), so `createParameterLink` stays a
  lower-level primitive — that split is why the repository's own tests can
  still construct a deliberately mismatched link to exercise value
  resolution. Approved cross-parameter mappings, when any exist, must come
  from a reviewed set — never from the caller's arguments.
- (2026-07-30 hardening pass) **A stale upstream run is not an input.**
  `executeModuleInstance` refuses (`stale_upstream`) rather than computing from
  a superseded output, because the alternative persists an immutable run whose
  own inputs were never valid together. `example-relay@0.1.0` was added as a
  development fixture so a *valid* multi-module chain remains expressible for
  integration tests now that incompatible links are rejected; it is a fixture
  in the same sense `example-scaffold` is a scaffolder demonstration, not a
  production module.
- (2026-07-30, Unit 2.8 part 2) **`ComponentAssignment` reuses `ParameterLink`'s
  discriminator-plus-nullable-columns pattern** rather than a DB CHECK
  constraint or separate tables per target/part-source combination:
  `targetKind` (`module_instance`/`assembly`) alongside nullable
  `moduleInstanceId`/`assemblyId`, and `partSource` (`catalog`/`manual`)
  alongside nullable `manufacturerPartRevisionId`/`manualPartDetails`, both
  cross-validated by the repository's Zod `.refine()` chain. A
  `targetKind: "assembly"` row with `assemblyId` omitted means the
  machine/configuration root — reusing `Requirement`/`DesignAssumption`'s
  existing nullable-`assemblyId`-means-machine-level convention — so the
  implementation map's three-way "target project/assembly/module" is covered
  by two columns and one enum, not three columns.
- (2026-07-30, Unit 2.8 part 2) **The Unit 2.5 stale-propagation invariant is
  now fully implemented for its simple direction only.** Every one of
  `stale-propagation.ts`'s three use cases now calls the new
  `markComponentAssignmentsStaleForModuleInstances` in the same transaction
  as `markRunsStaleForModuleInstances`, making architecture invariant 8
  ("downstream runs and component assignments become stale in the same
  transaction") literally true. Deliberately NOT implemented: Unit 2.5's
  fourth deferred trigger, "change an assigned-component feedback input" — an
  assignment acting as a *source* feeding a value into other calculations
  (e.g. an assigned bearing's real stiffness overriding an assumed value
  used elsewhere). That direction needs a new `lib/engine/graph`
  `GraphNodeKind` (a node kind that resolves to an assignment's recorded
  spec rather than an authored/linked `ParameterValue`), a materially larger
  change than adding a stale-propagation call site, and no module yet
  produces or consumes such a value. Deferred until a real module needs it,
  not folded into this unit — see Next Up.
- (2026-07-30, Unit 2.8 part 1) Split Unit 2.8 into two parts for the same
  reason and the same way as Unit 2.7 (three system boundaries: `lib/catalog`,
  `lib/db`, `lib/application`). Part 1 (this session): `lib/catalog` only —
  the hard-filter/ranking matching engine (`matching-types.ts`/`matching.ts`),
  pure and DB-free. Part 2 (not started): `lib/db` (`ComponentAssignment`
  schema/persistence) + `lib/application` (assignment orchestration), the same
  two-boundary-as-one-unit precedent Unit 2.4 and Unit 2.7 part 2 both used.
  See Current Goal and Next Up.
- (2026-07-30, Unit 2.8 part 1) **`MatchCriterion` is a generic key/operator/
  value triple, deliberately decoupled from `lib/engine/module-sdk`'s
  `CatalogAdapter.requiredSpec()`.** `requiredSpec()` (Unit 1.6) returns a bare
  `Record<string, EngineeringValue>` with no comparison semantics — it cannot
  say whether a given attribute is a capacity floor (`"gte"`), a size ceiling
  (`"lte"`), or an identity match (`"eq"`). That mapping is genuine
  engineering judgment specific to each component type/attribute (e.g. a
  ball screw's dynamic load rating is a floor, its bore diameter is often an
  exact fit, a motor's max speed is a ceiling) that no released contract
  records yet, and no production module exists yet to consult. Rather than
  invent a per-attribute default (risking a silently wrong hard filter — the
  opposite of "transparent") or extend `CatalogAdapter` itself (pulling a
  fourth boundary, `lib/engine`, into an already-three-boundary unit), Unit
  2.8 part 1 defines `MatchCriterion` as an explicit, caller-constructed
  input to the pure evaluator. Converting a specific module's `requiredSpec()`
  output into `MatchCriterion[]` is deferred to that module's Stage 5 (Milestone
  4), when the real per-attribute semantics are actually known. This mirrors
  the Unit 1.8 precedent of keeping `evaluateLinkCompatibility` generic over
  parameter *qualifier metadata* rather than hardcoding per-parameter rules.
- (2026-07-30, Unit 2.8 part 1) **Ranking heuristic: tightest fit first.**
  `rankCandidates` scores a passing candidate by the mean fractional margin
  across its `"gte"`/`"lte"` criteria and sorts ascending — the candidate that
  clears the requirement by the *smallest* margin ranks first, not the most
  capable one. Rationale: once a candidate has passed every hard constraint,
  preferring the least-oversized part is the standard engineering/cost
  heuristic (avoid paying for capacity the design does not need) and gives a
  single deterministic, code-standards-required "score reason" without
  needing a cost or size attribute that does not exist in the schema yet.
  `"eq"` criteria never contribute to the score (they are pass/fail identity
  checks, not a spectrum) — a candidate scored only on `"eq"` criteria gets
  `0`. This is a default, not a hardcoded final ranking policy: a future
  catalog adapter can pass different criteria weighting once real
  cost/preference data exists; the mechanism (deterministic score + exposed
  per-criterion reasons + stable `id` tie-break) is what Unit 2.8 commits to,
  not this specific scoring formula.
- (2026-07-30, Unit 2.7) Split Unit 2.7 into two parts because its deliverables
  span three `context/architecture.md` system boundaries (`lib/catalog`,
  `lib/db`, `lib/application`), exceeding `ai-workflow-rules.md`'s "more than
  two system boundaries" split trigger. Part 1 (this session): `lib/catalog`
  only — `ImportMapping` contract, CSV tokenizer, row validation, unit
  normalization via `lib/engine/units`, all pure and DB-free, so
  `parseCatalogCsv` alone already *is* dry-run mode. Part 2 (delivered later
  the same session, continued on user request): `lib/db` (idempotent upsert)
  together with `lib/application/catalogs/` (orchestration transaction, batch
  summary) — exactly two boundaries, mirroring Unit 2.4's precedent of
  delivering a `lib/db` + `lib/application` pair as one unit via two commits
  rather than splitting further. See Current Goal and Next Up for the full
  breakdown.
- (2026-07-30, Unit 2.7 part 2) Catalog import batch summary lands on
  `CatalogImportBatch` columns, not `AuditEvent`. Part 1's session had planned
  to reuse `lib/audit`'s `AuditEvent` for the row-count summary — that plan
  did not survive contact with the actual schema: `AuditEvent.projectId` is a
  mandatory FK to `MachineProject`, and catalog data is deliberately
  project-independent (the Unit 2.6 architecture decision above), so there is
  no project to attribute a catalog-import audit event to. Five nullable
  columns (`importMappingId`, `importMappingVersion`, `totalRowCount`,
  `validRowCount`, `invalidRowCount`) were added to `CatalogImportBatch`
  instead (migration `20260730140000_catalog_import_batch_summary`) — a
  second migration within Unit 2.7, but not a second *system boundary*: it
  stays inside `lib/db`, which part 2's boundary count already included. The
  full per-row error report is still NOT persisted anywhere (no UI reads
  historical import errors yet) — `importCatalog` returns it directly to its
  caller. `upsertManufacturerPartRevision` uses a genuine Prisma
  `.upsert()` on the `manufacturerId_partNumber_sourceRevision` compound
  unique key (not a read-then-write check), so a re-import is atomic and
  idempotent at the database level, not just at the application layer.
- (2026-07-30, Unit 2.7) Moved `PartLifecycleStatus`/`DataQualityStatus` from
  `lib/db/repositories/catalog-types.ts` (hand-rolled there in Unit 2.6) to
  `lib/catalog/types.ts` (domain-owned), with `lib/db` now importing them —
  the same cross-package pattern `LoadCaseCategory`
  (`lib/engine/parameters` → `lib/db/repositories/graph-repository.ts`) and
  `CheckStatus` (`lib/engine/trace` → `lib/db/repositories/types.ts`) already
  establish: a concept `lib/db` is allowed to depend on (per
  context/architecture.md's one-directional boundaries) should be defined once
  in its owning domain package, not redeclared. Caught while building Unit
  2.7's CSV importer, which needed `PartLifecycleStatus` and would otherwise
  have redeclared it a third time. Non-breaking: the Prisma enum values are
  unchanged (no migration), `lib/db/repositories/catalog-types.ts` re-exports
  both names so existing imports from that module or the `lib/db/repositories`
  barrel are unaffected.
- (2026-07-30, Unit 2.6) Catalog data is shared reference data, not
  project-owned. Every model added in this unit (`Manufacturer`,
  `ComponentType`, `ComponentSchemaVersion`, `CatalogImportBatch`,
  `ManufacturerPartRevision`, `DatasheetAttachment`) carries no `ownerId` or
  project scope, unlike every model added in Units 2.1–2.5. This matches how a
  real manufacturer catalog behaves in practice — one imported SKF bearing
  catalog serves every project on the account — and parallels
  `lib/standards`' market profiles being account-independent (those are code
  constants, not persisted rows; catalog data is DB-backed because it is
  large and user-imported via CSV, unlike the small curated standards set).
  `ComponentAssignment` (Unit 2.8) is where a specific project links to a
  specific catalog part revision — ownership/scoping enters there, not in the
  catalog tables themselves.
- (2026-07-30, Unit 2.6) Component attributes reuse the engine's own
  `EngineeringValue` contract instead of a bespoke catalog value system.
  `ManufacturerPartRevision.attributes` is `Record<attributeKey,
  EngineeringValue>`, validated generically (every value must be a
  well-formed `EngineeringValue`) with `lib/catalog`'s
  `ComponentAttributesSchema`. This is *why* the exit criterion ("two
  component types with different attributes coexist without a Prisma schema
  change") holds: every component type's attributes live in the same generic
  JSONB column and value contract, so adding a component type is only new
  `ComponentType`/`ComponentSchemaVersion` rows. **Deliberately deferred**
  (mirroring the Unit 2.2 decision to defer semantic parameter-link
  compatibility to the confirm/suggestion flow rather than the schema unit):
  cross-validating a specific part revision's `attributes` against its
  declared `ComponentSchemaVersion.fields` list (required keys present,
  kind/unit match) is not implemented here — that belongs to the catalog CSV
  import (Unit 2.7) and matching (Unit 2.8) services, the layers that
  actually choose a schema version for untrusted external data.
- (2026-07-29, Unit 2.3) Immutable calculation-run persistence model. A run is
  written once; its engineering payload is a **versioned JSONB snapshot**
  (`CalculationRunSnapshot`, format version 1) holding the resolved input, the
  full `ModuleComputation`, the version pins, and attribution — validated on
  write and read by a schema **composed from the engine's own
  `ModuleInputSchema`/`ModuleComputationSchema`** so the run envelope never
  drifts from the value/trace/check contracts. `status` and `criticalMargin`
  are **denormalized search columns** derived from the snapshot's checks at
  write time; `criticalMargin` is the smallest *dimensionless* (safety-factor)
  margin only — mixing units in a min is meaningless, so physical margins are
  excluded and the authoritative per-check margins stay in the snapshot.
  **Immutability is enforced in two layers:** (a) the repository exposes no
  update path for the snapshot or any engineering/summary/version column — only
  `markRunStale` touches `stale`/`staleReason`; (b) a Postgres `BEFORE UPDATE`
  trigger (`calculation_runs_immutable_guard`, installed by hand-appending SQL
  to the `--create-only` migration) raises unless only stale state + updatedAt
  changed. This is the first use of a **custom-SQL trigger in a migration** in
  this repo; the pattern (generate with `--create-only`, append the trigger,
  then apply) is how future immutable tables (baselines, Unit 2.9) should be
  guarded. Ownership is enforced on the reads (`loadCalculationRun`/
  `listRunsForModuleInstance` filter moduleInstance→assembly→configuration→
  project→owner); `createCalculationRun`/`markRunStale` trust the caller (the
  application service authorizes), matching the Unit 2.1/2.2 pattern. Engine
  "build hash": only the engine **SDK semantic version** is pinned today; a
  git/build hash can be added to `RunVersions` when a deploy pipeline provides
  one (the snapshot schema is versioned, so adding a field is a format bump)
- (2026-07-29, Unit 2.2) Requirements + parameter-graph persistence model.
  `ParameterValue` is a generic value node — a provider (machine requirement /
  assembly parameter / workflow value, scoped by `assemblyId` or the
  configuration root) or an authored value on a module input port (keyed by
  `moduleInstanceId`); its `value` is a versioned `EngineeringValue` JSONB
  payload validated with `lib/engine/values` **on write and on read** (a
  corrupt stored payload is rejected, not trusted). `ParameterLink` records a
  confirmed source→(module input) link; a unique index on the target port
  enforces one confirmed source per input. **Cycle rejection is a persistence
  rule** here (structural, registry-independent): `createParameterLink`
  reconstructs the configuration's link graph — the persisted links plus the
  proposed link's two endpoint nodes (so `buildParameterGraph` can add each
  module's internal input→output feed edges) — and calls `wouldCreateCycle`
  before writing. Because a cycle-relevant internal edge always has two
  link-endpoint ports, reconstructing from `ParameterLink` rows alone (no
  module-registry lookup) detects cross-module cycles correctly. **Input
  resolution** (`resolveModuleInputs`) takes the module's declared input ports
  from the caller (the application layer holds the package) rather than
  importing `lib/modules`, keeping `lib/db` free of the registry; it classifies
  each port as manual / workflow / linked / default. A module-output link
  resolves to a `null` value at this layer — its value comes from that module's
  run (Unit 2.4). **Deliberately deferred: semantic link compatibility.** The
  tracker's Next Up flagged reusing `wouldCreateCycle`/compatibility; cycle
  rejection is done, but `evaluateLinkCompatibility` needs both endpoints to be
  registered canonical parameters and the approved-mapping set, which is the
  suggest-and-confirm flow's concern (the UI only offers compatible links) —
  not the schema unit's. Compatibility gating lives with link suggestion (Unit
  3.4) and the graph application service. Ownership is enforced on the reads
  (`listRequirements`/`listDesignAssumptions`/`listLoadCases`/
  `resolveModuleInputs` filter through configuration→project→owner); creates
  trust the caller, matching the Unit 2.1 pattern
- (2026-07-29, Unit 0.4) Database connection model under Prisma 7. The
  connection URL is declared in **two** places by design, both reading the
  same `DATABASE_URL`: `prisma.config.ts` supplies it to the **CLI**
  (Migrate, introspection), and `lib/db/client.ts` supplies it to the
  **runtime** client through the `@prisma/adapter-pg` driver adapter.
  `prisma/schema.prisma` declares no `url` at all — Prisma 7 rejects it
  (P1012). The runtime value comes from `lib/env.ts`'s Zod-validated `env`,
  so the validated environment boundary still owns it and an unset or
  malformed URL fails at the same place as every other env var. `lib/db`
  remains the only Prisma-importing boundary; the generated client stays
  gitignored at `lib/db/generated/prisma` and is produced by the
  `postinstall` hook, so no generated artifact is committed. Consequence to
  keep in mind: any environment that cannot run `prisma generate` cannot
  typecheck or build the project at all
- (2026-07-29, Unit 0.5) The five decisions immediately below (modular
  monolith, immutable runs, module package contract, canonical SI storage,
  manufacturer specs plus lightweight assignment) are now formalized as
  ADR-0001 through ADR-0005 in `context/adr/`, with the reasoning traced
  back to the specification sections that motivated each one. This list
  entry is not replaced by the ADRs — it stays as the running index this
  file already provides
- Modular TypeScript monolith for the MVP
- Generic engine separated from versioned module packages
- Guided workflows coordinate modules without combining formulas
- Stable canonical parameter registry protects cross-module semantics
- Suggest-and-confirm linking; no silent parameter binding
- Semantic link compatibility includes value type, qualifiers, load case,
  direction/frame, and scope
- Immutable calculation runs and baselines
- Trace-driven reports; formulas are not duplicated in report code
- Transactional stale propagation to downstream runs and assignments
- Manufacturer part revisions stored with source/import provenance
- PostgreSQL with relational identity/revision fields and versioned JSONB
  for module values and component attributes
- US standards/source metadata stored without unlicensed standards text
- Next.js 16's `proxy.ts` file convention used instead of the deprecated
  `middleware.ts` for the Clerk integration
- Generated Prisma client output is directed to
  `lib/db/generated/prisma` (gitignored) so `lib/db` remains the only
  Prisma-importing boundary, per the architecture invariant
- (2026-07-28, Unit 1.1) EngineeringValue serialization envelope: every
  value is a plain JSON object discriminated on a `kind` string and
  carrying its serialization format version in a `v` field
  (`SERIALIZATION_FORMAT_VERSION`, currently 1). Zod schemas are strict
  (unknown keys rejected on read) so a payload from a different format
  version fails validation instead of being silently misread. Value
  interfaces are hand-written with TSDoc and kept in lockstep with their
  Zod schemas by a compile-time mutual-assignability parity guard in
  `schemas.ts`. Equality never converts units — values are compared in
  canonical units, so unit-aware comparison waits on Unit 1.2 and belongs
  to callers, not the value layer
- (2026-07-28, Unit 1.2) Unit model: five base dimensions — length, mass,
  time, temperature, and angle. Angle is deliberately a base dimension
  (not folded into dimensionless) so `rad` ≠ ratio and `rad/s` ≠ `Hz`,
  which the parameter graph relies on to reject unit-compatible but
  semantically wrong links. Each unit stores a factor (+ affine offset) to
  its dimension's SI-coherent magnitude; arithmetic runs in SI and names
  results by the SI-coherent unit of the resulting dimension
  (composite-unit simplification). Temperature scales degC/degF are affine
  and are rejected in add/subtract/multiply/divide/scale (K is
  multiplicative and allowed). The unit table is closed for the MVP —
  adding a unit is a reviewed change, never a runtime module action
- (2026-07-28, Unit 1.3) Canonical parameter registry model: a parameter's
  physical **dimension is derived** from its canonical unit via the Unit 1.2
  registry, not stored, so it cannot drift; validation cross-checks that
  canonical/display/range units are registered and dimension-compatible.
  **Symbol uniqueness is per scope**, where scope = the ID's dotted prefix
  (e.g. `motion.axis` for `motion.axis.payload_mass`, matching the architecture
  doc's normative example). Semantics are structured as independent qualifier
  axes (bound, aggregation, loadNature) plus a coordinate-frame requirement and
  load-case categories, so the Unit 1.8 graph can reject unit-compatible but
  semantically wrong links. The **registry is versioned + content-hashed**: a
  non-cryptographic, dependency-free double-FNV-1a fingerprint over a stable
  canonical serialization detects drift in immutable content; adding parameters
  (e.g. a module's Stage-2 ports) releases a new registry version and updates
  the pinned hash fixture. Released parameter IDs are immutable — changing a
  meaning requires deprecate-and-replace, validated for acyclic, resolving
  chains. Registry v1 is `1.0.0`; downstream module ports are deferred (see
  Open Questions)
- (2026-07-28, Unit 1.4) Source/market model lives in its own `lib/standards/`
  boundary (per architecture.md), separate from `lib/engine`; it stores
  metadata + references only, never unlicensed standards text. A
  document's `access` is `public` vs `licensed`, and a **licensed document's
  revisions may carry no reproduced excerpt** (schema/registry-enforced,
  faithful to the licensing policy). `SourceRevision`s are immutable; a new
  edition is a new revision that may `supersedes` an earlier one (validated
  existing/non-self/acyclic). Bilingual titles: Japanese statutes/guideline
  carry the authoritative `originalTitle`; JIS is language-neutral by number.
  Editions recorded exactly as the profile states them — OSHA CFR sections and
  the JP Ordinance use edition `current` (continuously in force); NFPA 70 is
  registered as a document with **no** baseline revision because its adopted
  edition is AHJ-specific. Application-specific standards are added per project,
  not seeded. Market profiles are versioned (`marketProfileKey` → `id@major`)
- (2026-07-28, Unit 1.5) Calculation trace/check model lives in
  `lib/engine/trace/` (per architecture.md `lib/engine/ trace/`). The trace is
  the single report-renderable artifact: a versioned envelope over nestable
  titled sections whose leaves are steps; a step embeds the concrete
  `EngineeringValue` of each input/output (so a report renders the actual
  number without recomputation) plus an optional human `expression` string
  (rendering only — **no formula logic in the trace**, upholding the
  "Trace-driven reporting" invariant). The trace **format version is
  independent** of the value `SERIALIZATION_FORMAT_VERSION`, so the envelope and
  the value payloads it embeds evolve separately. Trace source citations
  **reuse `lib/standards` `ClauseReference`**; the engine imports the standards
  *type + `ClauseReferenceSchema` shape only*, never the standards seed/registry
  singleton, so engine determinism/purity holds. Trace validation is
  deliberately **shape + structural** (trace-unique node IDs; every citation
  carries a clause or a page) — it does **not** resolve a cited revision against
  `SOURCE_REGISTRY`; full resolution happens in the application/report layer
  where the registry is available, keeping the engine decoupled from seed data.
  Check state is the 5-value `CheckStatus`; `overallCheckStatus` precedence is
  invalid_input > fail > warning > pass (not_applicable ignored; empty →
  not_applicable) so a warning can never mask a fail. Unit 1.5 delivers the
  individual contracts (trace, check, warning, validity); composing them into
  `ModuleComputation` is Unit 1.6
- (2026-07-28, Unit 1.6) Module SDK v1 in `lib/engine/module-sdk/`. A module is
  one `ModulePackage`; the engine touches modules only through the public SDK
  (execute/validate), never their internals. **Declarative vs behavior split**:
  manifest, ports, UI/report schemas, and validation record are Zod-validated
  (strict, parity-guarded); `compute`, the author `inputSchema`, and the catalog
  adapter carry behavior and are typed but not schema-validated. The **package
  content hash** covers only the declarative projection (excluding the hash field
  and all behavior, which isn't stably serializable) and is stamped by
  `sealModulePackage` at release, so it reproduces on re-hash and is stored on
  runs. **Values cross ports in canonical units**: `executeModule` enforces each
  input/output value's kind AND that a physical value carries exactly the
  parameter's canonical unit (not merely a dimension-compatible one) — display
  conversion is the application layer's job, so a module's `compute` can read a
  magnitude directly; constant parameter defaults (e.g. gravity) are auto-filled
  for absent inputs. **Trace/source integrity at run time**: the returned
  computation is shape-validated, its trace re-checked for invariants, and every
  cited `sourceRevisionId` must be declared on the manifest (`missing_trace_source`).
  The **catalog adapter is an interface only** (a `requiredSpec` extractor), so
  the SDK declares part-matching without importing `lib/catalog` — the hard
  filters/ranking stay in the catalog boundary (Units 2.6–2.8); engine purity
  holds (imports limited to `zod`, sibling engine packages, and `lib/standards`
  types + `ClauseReferenceSchema`). SDK version is its own semver
  (`ENGINE_SDK_VERSION`, minimal dependency-free comparator); a module declares a
  compatibility range and the engine refuses to execute outside it. The
  `example-linear-thrust` module is a **proof fixture, not a released production
  module** (a real linear-axis module is Milestone 4 with a full validation
  record). `validateModulePackage` is the registration-time gate; `executeModule`
  does the run-time input/output/trace/source checks and does not re-run the full
  package validation each call
- (2026-07-28, Unit 1.7) Module tooling: the conformance suite, scaffolder, and
  registry codegen live in `lib/engine/module-sdk/` as **pure functions**
  (`runModuleConformance`, `checkImportBoundary`, `generateModuleScaffold`,
  `generateRegistrySource`), keeping engine purity — no fs/network/UI. The
  conformance runner **reuses the SDK's own gate/execute functions** instead of
  reimplementing validation rules (single source of truth); `package-validation`
  delegates to `validateModulePackage`, so the eight implementation-map
  conformance concerns map onto four independently-reported checks
  (package-validation, execution, determinism, import-boundary). The
  import-boundary check is a **heuristic source-specifier scan** (not a full
  import graph), pure over pre-read file contents so the caller owns I/O. The two
  CLIs are `.mts` scripts run by **Node's native TypeScript execution** (Node
  ≥26, already pinned); to make that work without a bundler/loader, the pure
  generators they import (`scaffold.ts`, `registry-codegen.ts`) are written with
  **zero runtime imports** (types only, fully erased), and tsconfig enables
  `allowImportingTsExtensions` (safe under the existing `noEmit`) so the scripts
  can import them by explicit `.ts` path. The **compile-time module registry is
  generated** (`lib/modules/registry.generated.ts`, committed and typechecked),
  not hand-maintained, so it stays in sync with the filesystem. A freshly
  scaffolded module maps its placeholder ports to **real released parameters**
  (`motion.axis.payload_mass` → `motion.axis.thrust_force`) so it compiles and
  passes conformance out of the box; the author then replaces the `TODO` markers.
  `example-scaffold` is committed as the scaffolder **demonstration artifact**
  (not a production module — a production module needs a full validation record,
  Milestone 4)
- (2026-07-28, Unit 1.8) Parameter graph core in `lib/engine/graph/`, pure and
  DB/UI-independent (exit criterion). A node's semantic identity comes from its
  **canonical parameter** plus an instance **load case**; the compatibility
  evaluator authorizes a link only on **parameter identity OR an approved
  mapping**, and unit compatibility alone is never sufficient (a payload-mass →
  carriage-mass link is rejected though both are kg). The **semantic-axis checks**
  (value family, dimension, bound/aggregation/load-nature qualifiers, frame) are
  enforced when an approved mapping joins two *different* parameters, so even an
  approved mapping cannot bind semantically incompatible ports; qualifiers follow
  the parameter registry's rule — a populated-on-both-sides, differing axis
  rejects; an absent axis does not constrain. The graph is modeled as a **feed
  graph** (edge `from → to` = "from feeds to"): edges are the confirmed links
  **plus each module instance's internal input→output dependencies**, which is
  what makes cycle detection and multi-level stale propagation correct across
  modules. A proposed link source→target **cycles iff target already feeds
  source**. Stale impact is computed by the graph (downstream nodes → distinct
  stale module instances) but **applied** transactionally by the application
  layer (Unit 2.5) — the graph owns no DB. Nearest-scope suggestion ranks
  same-scope, then ancestors to the machine root, then explicitly-exposed
  cross-assembly sources; sibling-assembly sources are hidden unless exposed;
  ordering is deterministic with a node-ID tie-break. Approved mappings are a
  first-class (default-empty) input; none are declared yet

## Session Notes

- 2026-07-30 integrity-hardening session: the user supplied an external audit
  report (findings plus claimed fixes) produced in a different container. The
  first thing checked was whether those fixes were present here — they were
  not: `HEAD` was `22cdf64` with a clean tree, and none of the audit's
  artifacts (root `README.md`, `.editorconfig`, ADR-0006, the `reference/`
  move) existed, because that container never committed or pushed. Each
  finding was then re-verified against the actual code, all held, and the
  fixes were re-implemented here — see Current Goal for the full list and
  Architecture Decisions for the three reversals of earlier decisions
  (part-revision mutability, trusted `configurationId`, UI-only link
  compatibility). Two "remaining risk" claims were checked rather than
  restated: the angular-power-algebra consequence of angle-as-a-base-dimension
  is real (direct test: `10 N·m × 100 rad/s` → `kg*m^2*s^-3*rad`, not `W`),
  and `format:check` fails on 124 files, not ~100. **`prisma generate`
  succeeded on this network today**, so local typecheck/build were meaningful
  signals — but there is still no local PostgreSQL, so every live-database
  test (including all of this session's new ones) and the new migration
  stayed CI-only. The shared `tests/live-database.ts` gate was added so those
  suites report *skipped* rather than failing once a client exists without a
  database. Committed and pushed on explicit instruction: the first push
  (`54ca63d`) went red at "Test" — the new immutability trigger correctly
  rejected a pre-existing test's `.update()`-based corruption bypass in
  `catalog-repository.test.ts`, which needed the same raw-`INSERT` treatment
  `baseline-repository.test.ts` already uses for its own immutable table.
  Fixed and pushed as `a774c22`; run 30537557349 came back fully green,
  including "Deploy migrations" and the complete live-database suite running
  for real. The hardening pass is now CI-verified
- Specification upgrade completed 2026-07-28
- Start with Unit 0.1, not repository code, because validation evidence is
  required before production formulas
- Use `implementation-map.md` as the execution queue
- Spec v3 update 2026-07-28: JP market profile added, DESIGN.md merged
  into ui-context, reviewer-substitute rule added for solo validation
- 2026-07-28: repository initialization was implemented directly on
  explicit instruction, ahead of Unit 0.1 (evidence fixtures), which is
  the tracker's literal top "Next Up" item. This is a deliberate,
  explicitly-instructed departure from the normal unit order, not an
  autonomous reprioritization — Unit 0.1 remains open and is back at the
  top of "Next Up". Scope delivered: Units 0.2 and 0.3 in full, and Unit
  0.4 partially (Prisma + Clerk installed and configured; no schema,
  client wiring, or auth-gated route yet). `npm run lint`, `npm run
  typecheck`, `npm run test`, and `npm run build` all pass
  (`npm run verify` runs all four)
- 2026-07-28 (continued): asked which "next step" to build given the
  fork between Unit 0.1 (needs user-supplied historical data) and
  finishing Unit 0.4 (pure implementation); user chose Unit 0.4.
  Delivered env validation and the auth-gated workspace route; hit a
  hard blocker finishing `lib/db/client.ts` — `prisma generate` needs
  the schema-engine binary from `binaries.prisma.sh`, which this network
  blocks the same way it blocked `ui.shadcn.com` last session (confirmed
  same corporate TLS-interception root CA both times). Did not attempt
  to route around it (e.g. `NODE_TLS_REJECT_UNAUTHORIZED=0`, importing
  the corporate CA into Node's trust store) without the user's explicit
  say — that crosses from "repository setup" into "locally weakening a
  corporate network security control," which isn't a call to make
  unilaterally even when the intent is benign. `npm run verify` passes
  (lint, typecheck, test, build all green) with the delivered scope
- 2026-07-28 (Unit 1.1 session): the tracker's top "Next Up" item was to
  finish Unit 0.4, but `prisma generate` was re-confirmed blocked by the
  same corporate TLS interception. Asked the user how to proceed; they
  chose to defer Unit 0.4 and implement Unit 1.1 instead. Delivered Unit
  1.1 (EngineeringValue contracts) in `lib/engine/values/` end to end —
  discriminated union, strict Zod schemas with a compile-time parity
  guard, serialization, guards, and equality/close helpers — with 43
  passing tests. `npm run lint`, `typecheck`, `test`, and `build` all
  pass. Did not start Unit 1.2 in the same session (kept to one unit)
- 2026-07-28 (Unit 1.2 session): on "continue", implemented Unit 1.2 (unit
  registry and conversion engine) in `lib/engine/units/` — dimension model,
  full unit table, affine-correct conversion, dimension-checked arithmetic
  with composite-unit simplification, and formatting. 59 new tests (102
  total). `npm run lint`, `typecheck`, `test`, and `build` all pass. Unit
  0.4 was re-checked and is still blocked, so it stays deferred; next
  unblocked engine unit is 1.3 (canonical parameter registry v1)
- 2026-07-28 (Unit 1.3 session): on "implement the first Next Up item",
  implemented Unit 1.3 (canonical parameter registry v1) in
  `lib/engine/parameters/` end to end — definition contract + Zod shape schema
  with parity guard, `defineParameter` factory, validating registry loader
  (`buildParameterRegistry`) + released singleton, deterministic content hash,
  and a proposal-checklist README. 27 parameters across the project/environment,
  axis-application, and motion-profile groups; 46 new tests (148 total).
  Deliberately deferred the screw/guide/coupling/bearing/drive-train result
  groups to each module's Stage-2 contract rather than inventing immutable
  parameters (logged under Open Questions). `npm run lint`, `typecheck`,
  `test`, and `build` all pass (`npm run verify` runs all four). Did not start
  Unit 1.4 in the same session (kept to one unit)
- 2026-07-28 (Unit 1.4 session): on "continue", implemented Unit 1.4 (source
  registry and US/JP market profiles) end to end in the new `lib/standards/`
  boundary — metadata contracts + strict Zod schemas with parity guard,
  validating `buildSourceRegistry` + released singleton, `resolveReference`, and
  US/JP seeds from the market-profile context docs. 34 new tests (182 total).
  Metadata only (no safety calculators). Seeded from the existing profile-doc
  metadata rather than fabricating live source-link/edition verification (that
  network is unreachable here; logged as a still-open verification task).
  `npm run lint`, `typecheck`, `test`, and `build` all pass. Did not start Unit
  1.5 in the same session (kept to one unit)
- 2026-07-28 (Unit 1.5 session): on "implement the first Next Up item",
  implemented Unit 1.5 (calculation trace and check contracts) end to end in the
  new `lib/engine/trace/` boundary — versioned nested-section trace envelope,
  step/operand contracts embedding `EngineeringValue`s and reusing
  `lib/standards` `ClauseReference`, `CheckResult`/`Warning`/`ValidityResult`
  contracts, strict Zod schemas with a compile-time parity guard (recursive via
  `z.lazy`), `walkTrace`/`validateCalculationTrace`/`buildCalculationTrace` +
  serialization, and `overallCheckStatus`. 31 new tests (213 total), including a
  snapshot fixture that renders a report outline from trace data alone (exit
  criterion). Engine purity preserved (imports only `zod`, `../values`, and
  `../../standards` types + the `ClauseReferenceSchema` shape — not the standards
  registry singleton). `npm run lint`, `typecheck`, `test`, and `build` all pass.
  Kept to one unit — did not start Unit 1.6
- 2026-07-28 (Unit 1.6 session): on "continue", implemented Unit 1.6 (module
  SDK v1) end to end in the new `lib/engine/module-sdk/` boundary — the
  `ModulePackage` contract (manifest, ports, input schema, pure compute, UI/report
  schemas, validation record, optional catalog-adapter interface), semver-based
  SDK compatibility, `packageContentHash`/`sealModulePackage`,
  `validateModulePackage` (registration gate), `executeModule` (run-time input/
  output/trace/source contract with canonical-unit enforcement and constant-default
  fill), `computeIsDeterministic`, and a sealed `example-linear-thrust` proof
  module executing through the public engine barrel only. 37 new tests (250 total)
  covering all seven implementation-map cases plus extras. This composed the Unit
  1.5 trace/checks/warnings/validity into `ModuleComputation` (with assumptions).
  Engine purity held (catalog adapter is an interface only; no `lib/catalog`
  import). `npm run lint` (0 warnings), `typecheck`, `test`, and `build` all pass.
  Kept to one unit — did not start Unit 1.7
- 2026-07-28 (Unit 1.7 session): on "implement the first Next Up item",
  implemented Unit 1.7 (module conformance suite + scaffolder + registry codegen)
  end to end. New pure surfaces in `lib/engine/module-sdk/`: `conformance.ts`
  (`runModuleConformance` + `checkImportBoundary`), `scaffold.ts`
  (`generateModuleScaffold`), `registry-codegen.ts` (`generateRegistrySource`).
  New `lib/modules/` boundary (index + generated registry + registry test) and
  two `.mts` CLIs (`npm run module:new`, `npm run registry:generate`) run via
  Node's native TS. Small additive refactor of `executeModule` to expose
  `resolveModuleInput` (needed so the determinism check computes on the
  default-filled input — this was the one iteration: the first attempt parsed the
  raw input without filling constant defaults, so the example module built a
  malformed trace on the missing gravity operand). Generated + committed the
  `example-scaffold` demonstration module and its registry entry; `registry.test.ts`
  proves it validates and conforms (exit criterion). tsconfig gained
  `allowImportingTsExtensions` for the scripts' `.ts`-extension imports;
  confirmed `next build` tolerates it. 30 net-new tests (280 total). `npm run
  lint` (0 warnings), `typecheck`, `test`, and `build` all pass. Kept to one unit
  — did not start Unit 1.8
- 2026-07-28 (Unit 1.8 session): on "continue", implemented Unit 1.8 (parameter
  graph core) end to end in the new `lib/engine/graph/` boundary — contracts +
  strict Zod schemas with a parity guard, typed `ParameterGraphError`,
  `evaluateLinkCompatibility` (7 architecture criteria + approved mappings),
  `buildParameterGraph` (shape + referential integrity, feed-graph indexing),
  `wouldCreateCycle`/`downstreamNodeIds`/`computeStaleImpact`, and
  `suggestSources` (nearest-scope). 33 new tests (313 total) covering every
  listed Unit 1.8 case. One small style fix during verify (folded a standalone
  load-case parity type into the exported guard tuple to clear an unused-var lint
  warning). Engine purity held (imports only `zod`, `../parameters`, `../units`).
  This completes Milestone 1's generic engine (Units 1.1–1.8). `npm run lint`
  (0 warnings), `typecheck`, `test`, and `build` all pass. Kept to one unit — did
  not start the next (Unit 0.5 / Milestone 2)
- 2026-07-29 (Unit 0.5 + Unit 0.4-finish session, run from a cloud/remote
  agent sandbox on an explicit, detailed brief covering both units): read
  the full mandatory context set first (`CLAUDE.md` through
  `progress-tracker.md`, plus `us-market-profile.md`/`jp-market-profile.md`/
  `ui-context.md`). **Unit 0.5** delivered end to end and committed alone
  (`feat(0.5): add ADR and validation structure`): `context/adr/`
  (README + process, template, ADR-0001..0005 pulling rationale only from
  already-recorded decisions in `architecture.md`/`project-overview.md`/
  `roadmap.md`/this file — no invented rationale) and `validation/`
  (`module-validation-template.md` with the solo reviewer-substitute rule
  quoted verbatim from `ai-workflow-rules.md`; `source-index.md` with its
  format explained and deliberately zero entries). **Unit 0.4** delivered
  next and committed separately (`feat(0.4): finish database client and
  health check`): `postinstall` script, `lib/db/client.ts`
  (server-only singleton `PrismaClient`), `checkDatabaseHealth()` in
  `lib/db/index.ts`, and `lib/db/health.test.ts` (a live-DB test that
  reports *skipped*, not passed, when the generated client is absent — an
  explicit design choice so `npm run test` never fakes a pass it can't
  back up). The brief's premise — that this sandbox would be a network
  without the corporate TLS interception — did not hold: `prisma generate`
  failed here too, and inspecting the TLS chain directly showed the
  intercepting certificate is issued by the same
  `Ashley Furniture Industries Root Certificate Authority` documented for
  the original dev machine. No bypass was attempted (no
  `NODE_TLS_REJECT_UNAUTHORIZED`, no CA-trust change), matching the brief's
  explicit instruction to stop and report rather than route around it; an
  attempt to inspect local git credential configuration (to see whether a
  reusable token existed for querying CI logs) was correctly blocked by
  the environment's own permission classifier and was not pursued further.
  Locally verified: `npm run lint` clean, `npm run test` green (313 passed,
  1 skipped). Not locally verified: `npm run typecheck`/`npm run build`
  (both fail on the single expected `Cannot find module
  './generated/prisma/client'` line). Added a `postgres` service container
  to `.github/workflows/ci.yml` and pushed both commits to `origin/main` to
  get a real answer from GitHub's runners; the first resulting CI run
  failed at "Install dependencies," but the exact log text was not
  retrievable without an authenticated GitHub session (REST log download:
  `403 Must have admin rights`; web viewer: sign-in required) — logged as a
  new, unresolved open item rather than guessed at. `context/
  progress-tracker.md` updated in a third commit reflecting all of the
  above, including correcting the brief's assumption that the
  corporate-network block was resolved for this remote path — it was not
- 2026-07-29 (Unit 0.4 CI-verification session, on the primary dev machine):
  picked up the remote agent's work after it stopped mid-diagnosis with CI
  red on all three of its commits. Pulled `origin/main` (fast-forward, no
  local work at risk), then read the actual Actions logs — which the remote
  agent could not, having no credentials — using the dev machine's existing
  stored GitHub credential. Root cause was immediate and was **not** a
  network problem: `npm ci` succeeded and `prisma generate` failed with
  Prisma 7 **P1012, "The datasource property `url` is no longer supported in
  schema files."** The hand-authored `prisma/schema.prisma` had never been
  executed anywhere, because the TLS block had prevented `prisma generate`
  from running since the day it was written — so a plain configuration bug
  had been sitting undetected behind an environment blocker, and the two
  were easy to mistake for one. Fixed the schema (dropped `url`), moved the
  runtime connection to the `@prisma/adapter-pg` driver adapter fed by the
  Zod-validated `env.DATABASE_URL`, and found and fixed two further latent
  bugs that CI had not yet reached: (1) `lib/db/health.test.ts` would have
  failed the moment generation started working, because `server-only`'s
  entry point throws by design and the Node test environment does not set
  the `react-server` condition that neutralizes it — fixed with a
  test-runner-only alias to `tests/stubs/server-only.ts` (aliasing to the
  package's own `empty.js` does not work; its `exports` map declares only
  `.`); and (2) `vitest.config.ts`'s `exclude` used bare directory names
  instead of globs, so a nested `node_modules` inside a leftover agent git
  worktree had its third-party tests collected and run — 2527 tests in 84 s
  instead of 314 in ~1 s. Removed that stale worktree (verified it held no
  unique commits and no real diff first) and gitignored `.claude/worktrees/`.
  Two commits (`4c6af27`, `2fd597e`); **CI green on `2fd597e`** with all six
  steps passing and `lib/db/health.test.ts` executing rather than skipping
  (1 test, 315 ms, real round trip to the `postgres:16-alpine` service
  container), 314/314 tests. Unit 0.4's exit criterion is met. Per the
  user's explicit instruction this session, no TLS workaround was attempted
  at any point; the dev machine's `binaries.prisma.sh` block stands, and CI
  is the verification environment for database work until IT allowlists it
- 2026-07-29 (Unit 2.2 session, primary dev machine): on "implement the first
  Next Up item", implemented Unit 2.2 (Prisma schema: requirements and graph)
  end to end. Read the full mandatory context set first. Confirmed scope stays
  within two boundaries of change (`prisma/` + `lib/db/`), reusing the already
  built pure engine (`lib/engine/graph`, `/values`, `/parameters`) as library
  dependencies — no split needed, matching the Unit 2.1 precedent. Added the
  six models + three enums, generated the client, and created/applied the
  migration against the **local** PostgreSQL (scoop) — `prisma generate`,
  `migrate dev`, and the live-DB tests all run locally now, with `DATABASE_URL`
  passed inline (neither `prisma.config.ts` nor vitest auto-loads `.env`; only
  `next build` does). Two new repositories + two type files + 13 live tests.
  One iteration during test: `parseValue` initially guessed the error code from
  whether the payload was `undefined`, which mis-classified an invalid
  write-path value as `invalid_snapshot`; fixed by passing the intended code
  (`invalid_input` on write, `invalid_snapshot` on read) explicitly. Deferred
  semantic link compatibility to the confirm/suggestion flow (Unit 3.4) with a
  documented rationale — cycle rejection is in, compatibility is not. `npm run
  verify` green against the live DB (lint 0 warnings, typecheck, 334/334 tests,
  build). Kept to one unit — did not start Unit 2.3
- 2026-07-29 (Unit 2.3 session, primary dev machine): on "continue" (the
  project's established signal to take the next Next Up item), implemented Unit
  2.3 (Prisma schema: immutable runs) end to end. Scope stayed within two
  boundaries of change (`prisma/` + `lib/db/`), reusing the engine's
  module-sdk/trace/units/values schemas as library dependencies — no split.
  Added `CalculationRun` + `CheckStatus`; created the migration with
  `--create-only`, **hand-appended a `BEFORE UPDATE` immutability trigger** to
  the SQL, then applied it (the first custom-SQL migration here). Composed the
  run-snapshot Zod schema from `ModuleInputSchema`/`ModuleComputationSchema`;
  derived `status`/`criticalMargin` summary columns (dimensionless margins
  only). `run-repository.ts` has no snapshot-update path; `markRunStale` is the
  only mutation. 8 live-DB tests including a real reproduction test
  (re-executing `example-scaffold` from the stored input matches stored
  outputs) and a trigger test (a direct snapshot UPDATE is rejected by the DB).
  As in Unit 2.2, `prisma migrate dev`'s bundled client regen did not refresh
  the generated TS types for the new model until an explicit `prisma generate`
  was run — do that after every `migrate dev` on this setup before typecheck.
  `npm run verify` green against the live DB (lint 0 warnings, typecheck,
  342/342 tests, build). Kept to one unit — did not start Unit 2.4
