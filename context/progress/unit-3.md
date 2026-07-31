# Unit 3 Progress Context

Milestone 3 — Generic User Experience. This file holds the full Unit
3.1–3.8 history, standing deferrals, decisions, and the Unit 3.6 brief,
split out of `context/progress-tracker.md` on 2026-07-31 (see
`docs/superpowers/specs/2026-07-31-progress-tracker-unit-3-extraction-design.md`)
to keep normal Unit 3 continuation work small to read.
`context/progress-tracker.md` retains all cross-cutting and non-Unit-3
history and links here instead of duplicating this material — read both
files for a full project audit. Update this file (not the master tracker)
after every meaningful Unit 3.x change, per
`context/ai-workflow-rules.md`'s Documentation Synchronization rule.

## Current Phase

- **2026-07-31 (new session — user said "pull project from github ... start
  build next step"): Unit 3.8 (baseline and comparison UI) complete and
  locally verified.** Added the configuration-level `?panel=baselines`
  workspace, readiness summary plus explicit acknowledgement, baseline
  creation/history, and snapshot-only comparison for requirements, inputs,
  outputs, checks, and part assignments. Detailed output/check diffs load
  only the immutable calculation runs pinned by each baseline; they include
  added/removed ports and checks plus check-source provenance, and never
  re-execute a module or depend on a currently installed package. Local
  verification: Prettier on touched files, lint, typecheck, 513 passed / 200
  correctly skipped database-dependent tests (713 total), and production
  build all green. The local environment is Node 24 although `package.json`
  declares Node >=26; npm emitted its engine warning, but all listed checks
  completed successfully.
- **2026-07-31 (new session — user said "read claude.md and context files,
  build next task"): Unit 3.7 (requirements, assumptions, and load-case UI)
  complete, verified against the live database.** `npm run verify`-equivalent
  all green: lint 0 warnings, typecheck 0 errors, 701/701 tests passed
  against the live Neon database with 0 skipped (up from 701/701 with 200
  skipped locally, `DATABASE_URL` unset — the live-DB run added no new
  count since it re-runs the same suite for real rather than adding tests),
  build clean, `/workspace` still correctly dynamic. See Current Goal for
  full detail, including the standing decision that "verification status"
  reports only whether acceptance criteria are recorded, not whether a
  calculation run demonstrates a requirement — the same "state the honest
  scope, defer the schema-needing feature" posture Unit 3.6 established for
  `matchingAvailable: false`.
- **2026-07-31 (new session — user said "read claude.md and context files,
  start build next task"): Unit 3.6 (catalog matching and assignment UI)
  complete, verified against the live database.** Also, before starting it,
  this session committed the entire uncommitted Units 3.1–3.5 + bug-fix
  backlog as six separate, unit-tagged commits at the user's direction (the
  work had been complete but never committed; see "Commit History
  Reconstruction" below). `npm run verify` green: lint 0 warnings, typecheck
  0 errors, 665/665 tests passed against the live Neon database with **0
  skipped** (up from 650), build clean. See Current Goal for full detail,
  including the standing `matchingAvailable: false` decision this unit
  encodes rather than inventing the Milestone 4 operator mapping.
- **2026-07-31 (same session, continued — user's first real browser click-
  through after Unit 3.5): first-ever-real-user bug found and fixed —
  `createMachineProject` violated `machine_projects_ownerId_fkey` for
  every real (non-test) Clerk user.** Not a roadmap unit; a correctness
  bug this session's live QA pass surfaced (see Current Goal for full
  detail, including a real operational mistake this session also made and
  fixed: deleting `.next` while the user's own `next dev` server was
  running, corrupting Turbopack's persistent cache and producing a stuck
  "Compiling…" state unrelated to the code bug). Fixed by upserting the
  `User` row inside `createMachineProject`'s own transaction —
  `npm run verify` green (lint 0 warnings, typecheck 0 errors, 650/650
  tests passed against the live database, 0 skipped, build green).
- **2026-07-31 (same session, continued — user said "read claude.md and
  context files ... implement only the first item under Next Up"): Unit 3.5
  (generic result and trace renderer) complete, verified against both a
  local run with no database and a live Neon PostgreSQL database.**
  `npm run verify` green with `DATABASE_URL` unset (lint 0 warnings,
  typecheck 0 errors, 478/478 tests passed — 172 skipped — build green) and
  again with `DATABASE_URL`/`NODE_EXTRA_CA_CERTS` set against the live
  database (650/650 tests passed, 0 skipped, `--testTimeout=30000` — two
  unrelated pre-existing tests, `compare-baselines.test.ts` and
  `stale-propagation.test.ts`, hit the same documented Neon-latency timeout
  at the default 5000ms and passed cleanly once re-run alone at 30000ms,
  matching the already-recorded 2026-07-31 finding in
  `context/progress-tracker.md`; neither file was touched by this unit).
  See Current Goal for full detail: the new `loadModuleResultView` read
  model, `ModuleResultPanel`, `runModuleInstanceAction`, and the scope
  decisions (previous-run comparison scope, pane layout, what stays
  deferred to Unit 3.6).
- **2026-07-31 (same session, continued): Unit 3.4 (link suggestion UI)
  complete, locally verified, no CI round trip needed.** `npm run verify`
  all green (lint 0 warnings, typecheck 0 errors, 466/466 tests passed — 167
  skipped, up from 160 with 7 new skipped live-DB tests — build green). No
  `lib/db` schema file touched, so no CI round trip is required. See Current
  Goal for full detail: the new `buildConfigurationSuggestionIndex`/
  `describeLinkSuggestions` read model (`lib/application/parameters/
  suggest-link-sources.ts`), the new `previewRemoveParameterLinkImpact`
  read-only preview reusing Unit 2.5's stale-impact computation, the two new
  Server Actions (`confirmSuggestedLinkAction`/`removeParameterLinkAction`),
  and the new `LinkSuggestionPanel`/`LinkedFieldControl` components wired
  into Unit 3.3's `ModuleInputWorkspace`.
- **2026-07-31 (new session): Unit 3.3 (generic module input renderer)
  complete, locally verified, no CI round trip needed.** `npm run verify`
  all green (lint 0 warnings, typecheck 0 errors, 463/463 tests passed — 160
  skipped, up from 156 with 4 new skipped live-DB tests — build green). No
  `lib/db` schema file touched, so no CI round trip is required. This session
  first read the full CLAUDE.md chain and found the prior session had already
  attempted this exact unit, hit a real blocker (no released curve-parameter
  contract, no resolved-input read model), and correctly logged it under Open
  Questions instead of inventing behavior — this session verified that state,
  asked the user how to proceed, and implemented the "defer the curve editor,
  ship the rest" scope the user chose. See Current Goal for full detail.
- **2026-07-30 (same session, continued): Unit 3.2 (project and assembly
  management UI) complete, locally verified, no CI round trip needed.**
  `npm run verify` all green (lint 0 warnings, typecheck 0 errors, 458/458
  tests passed — 156 skipped, up from 136 with 20 new live-DB tests across
  the repository and application layers — build green, and a from-scratch
  `next dev` compile/redirect check). No `lib/db` migration (rename is a
  plain `UPDATE` on an existing column; "reorder assemblies," which would
  need one, is explicitly deferred to its own future unit). See Current Goal
  for full detail: what got built (create/rename project, create/rename
  assembly, add-module-instance, all Server-Action-backed), the two real
  product-shape decisions made along the way (a project always gets one
  auto-created configuration; "add workflow instance" is not built at all,
  since no workflow-definition registry exists yet), and one more real
  ESLint-driven fix (`react-hooks/set-state-in-effect`) plus one real
  test-authoring bug (a required-field HTML5-validation block) this
  session's own new tests caught.
- **2026-07-30 (new session): Unit 3.1 (workspace shell) complete, locally
  verified, no CI round trip needed.** Milestone 3 (Generic User Experience)
  is now started. `npm run verify` all green (lint 0 warnings, typecheck 0
  errors, 445/445 tests passed — 136 skipped, unchanged live-DB-only skip
  count plus this unit's own 4 new skipped live-DB tests — build green). No
  `lib/db` schema file touched, so no migration/CI round trip is needed
  before calling this fully verified, unlike every Milestone-2-era unit. See
  Current Goal for full detail, including one real testing-infrastructure
  bug this unit's tests surfaced and fixed (`tests/setup.ts` never
  registered Testing Library's DOM cleanup between tests) and the one
  verification gap that could not be closed on this dev machine (no
  authenticated visual check — same standing Clerk-keyless/Chromium-
  group-policy constraints as every prior UI-adjacent unit this session).

## Current Goal

- **UNIT 3.7 (2026-07-31, new session): requirements, assumptions, and
  load-case UI — complete, verified against the live database.**
  `implementation-map.md` Unit 3.7: "Requirement editor", "Acceptance
  criteria", "Load-case table", "Assumption register", "Verification
  status." Exit criterion: "Axis design intent is stored before downstream
  modules are run."
  - **Scope check before starting, per this file's own Unit 3.7 brief**: the
    `Requirement`/`AcceptanceCriterion`/`DesignAssumption`/`LoadCase` Prisma
    models and their repository (`lib/db/repositories/requirements-
    repository.ts`: creates plus ownership-scoped `listRequirements`/
    `listDesignAssumptions`/`listLoadCases`) already existed from Unit 2.2 —
    confirmed by reading the repository and its test file before writing
    anything. No `lib/application/requirements/` boundary existed yet, so
    this unit built one from scratch, the same "no read model, no write
    services yet" starting point Unit 3.6 had for `lib/application/
    catalogs/`.
  - **The one new `lib/db` function**: `loadRequirementForOwner`
    (ownership-scoped single-record read, mirroring `loadAssemblyForOwner`)
    — needed so `createRequirementAcceptanceCriterion` can authorize against
    a requirement id alone, without a `configurationId` in its input. No
    schema change, so no migration — the same "one new repository function"
    shape Unit 3.6 used for `listComponentAssignmentsForModuleInstance`.
  - **Four new application services** (`lib/application/requirements/`):
    `createMachineRequirement` and `createRequirementAcceptanceCriterion`
    (`manage-requirements.ts`), `createMachineLoadCase`
    (`manage-load-cases.ts`), `createMachineDesignAssumption`
    (`manage-design-assumptions.ts`) — all apply the "target ownership plus
    configuration membership" rule the 2026-07-30 hardening pass established
    for every write (`progress-tracker.md` Architecture Decisions),
    matching `createMachineAssembly`'s shape exactly for the two entities
    with an optional `assemblyId` (`Requirement`, `DesignAssumption`): a
    given assembly must belong to the same configuration, checked before any
    write. `LoadCase` has no `assemblyId` at all (architecture.md: a load
    case is a configuration-level concept), so it only needs the
    configuration-ownership check.
  - **THE CENTRAL SCOPE DECISION — "verification status" reports only
    whether acceptance criteria are recorded, not whether a calculation run
    demonstrates the requirement, and no `VerificationLink` model was
    added.** `architecture.md`'s domain model names a `VerificationLink`
    class under "Design intent," but Unit 2.2 never built it (its own
    deliverable list names Requirement/AcceptanceCriterion/
    DesignAssumption/LoadCase/ParameterValue/ParameterLink only), and
    Milestone 5's "Requirements verification matrix" (Unit 5.3) is the
    roadmap unit that actually needs a real requirement-to-run link. Adding
    that model now would combine a Prisma schema change with a UI unit —
    exactly what `ai-workflow-rules.md`'s Split Rule forbids — and deciding
    *which* run or check satisfies *which* requirement is real engineering
    judgment no released contract records, the same shape of problem Unit
    3.6 hit with `CatalogAdapter.requiredSpec()`'s missing operator. This
    decision was made directly (not asked to the user) because the
    precedent from Units 3.3 and 3.6 — ship the real, buildable behavior
    now, state the gap honestly, defer the schema-needing feature to the
    roadmap unit that owns it — was already unambiguous for this exact
    shape of gap. So `loadRequirementsView` computes
    `verificationStatus: "criteria_defined" | "no_criteria_yet"` per
    requirement from data that already exists (acceptance-criteria count),
    and the panel states the distinction plainly via a fixed info notice
    rather than implying a requirement is "verified" when nothing has
    actually checked it (`code-standards.md` "Standards and Sources": "Do
    not label a result generally compliant" — the same non-overclaim
    posture, applied here to a requirement's status).
  - **`RequirementsWorkspace`** (`components/engineering/
    requirements-workspace.tsx`, new): renders at the configuration level,
    independent of any module instance — the first main-canvas surface in
    this codebase that is. Three sections in one scrollable column (the
    same narrow-column pattern every prior panel unit kept, per Unit 3.5's
    layout decision): a requirement editor (add form plus a card per
    requirement showing its code, scope, statement, verification-status
    badge, recorded acceptance criteria, and an inline add-criterion form),
    a load-case table (add form plus a table row per load case), and a
    design-assumption register (add form plus a list). The scope picker
    (`AssemblyScopeField`) flattens the configuration's assembly tree into
    an indented-path list ("X axis / Drive train") shared by both the
    requirement and assumption forms. **A real accessibility fix caught by
    the component's own tests, not a runtime bug**: the requirement form's
    and the assumption form's "Statement" and "Scope" fields originally
    shared identical label text; since both forms render simultaneously on
    one page, `getByLabelText` failed on multiple matches and — more
    importantly — two same-labelled fields on one view is exactly what WCAG
    guidance advises against. Relabelled to "Requirement statement"/
    "Requirement scope" and "Assumption statement"/"Assumption scope."
  - **Routing**: the Requirements navigator row (`machine-navigator.tsx`,
    previously a disabled `StaticRow` since Unit 3.1) is now a real
    `<Link>` to `?project=&configuration=&panel=requirements`, the same
    deep-link pattern as the project/configuration pickers and module rows.
    `workspace/page.tsx` reads the new `?panel=` query param and calls
    `loadRequirementsView` only when it equals `"requirements"` and a
    configuration is selected; `WorkspaceShell` renders
    `RequirementsWorkspace` in the main canvas whenever that view resolves,
    mutually exclusive with the module workspace/result/assignment stack
    (both read from the same `props.status === "loaded"` branch, so a
    `?module=` deep link still takes its own path unchanged).
  - **Tests**: one new live-DB test in `requirements-repository.test.ts`
    (`loadRequirementForOwner` ownership isolation);
    `manage-requirements.test.ts` (8 live-DB tests — machine-level and
    assembly-scoped creation, cross-configuration assembly rejection,
    unowned-configuration rejection, blank code/statement rejection, adding
    an acceptance criterion, and rejecting one against a requirement the
    caller does not own); `manage-load-cases.test.ts` (5 live-DB tests);
    `manage-design-assumptions.test.ts` (6 live-DB tests, the same
    cross-configuration/unowned/blank-statement shape as
    manage-requirements.test.ts); `load-requirements-view.test.ts` (4
    live-DB tests — null for unowned/unknown, every list empty for a fresh
    configuration, the verification-status split proven against one
    requirement with a recorded criterion and one without, and design
    assumptions/load cases both round-tripping); `requirements-workspace.
    test.tsx` (9 component tests covering every empty state, the
    verification-status badge in both states, load-case table rendering,
    design-assumption rendering with rationale, nested-assembly scope
    options, and all four add-forms' submit paths, each new Server Action
    mocked the same way every other component test in this directory mocks
    the `"use server"` file); `workspace-shell.test.tsx` (new required
    `requirements` prop on every "loaded" fixture, plus a new test proving
    `RequirementsWorkspace` renders when `?panel=requirements` resolves);
    `machine-navigator.test.tsx` (new required `selectedPanel` prop; the
    former "Requirements/BOM/Reports are all placeholders" test split into
    a BOM/Reports-only placeholder test, a "no configuration" placeholder
    test for Requirements, a real-link-with-correct-href test, and an
    `aria-current` test).
  - **What could not be verified on this dev machine**: no live signed-in
    browser click-through of adding a requirement/criterion/assumption/load
    case (same standing Clerk-keyless/Chromium-group-policy constraint as
    every prior UI-adjacent unit). Covered instead by the live-database
    read-model/service tests, the component tests, and a full `npm run
    build` production compile.
  - Verified: `npm run lint` (0 warnings), `npm run typecheck` (0 errors),
    `npm run test` with `DATABASE_URL` unset (501/501 passed, 200 skipped)
    and against the live Neon database (**701/701 passed, 0 skipped**,
    `--testTimeout=30000`), `npm run build` (clean, `/workspace` still
    correctly dynamic).
- **UNIT 3.6 (2026-07-31, new session): catalog matching and assignment UI —
  complete, verified against the live database.** `implementation-map.md`
  Unit 3.6: "Required-spec panel", "Filtered candidate table", "Rejection
  reasons", "Ranking explanations", "Datasheet/source link", "Assign and
  manual-part actions." Exit criterion: "An engineer can assign a
  manufacturer part and see its supporting run."
  - **The read model** (`lib/application/catalogs/
    load-component-assignment-view.ts`, new, `loadComponentAssignmentView`):
    read-only, no transaction, same shape as `loadModuleResultView` (Unit
    3.5). Composes `lib/db` (authorization, the module instance, its latest
    run, its assignments, part revisions/manufacturers) and `lib/modules`
    (the pinned package, for its optional `catalogAdapter` — never
    `compute`). Returns `null` for an unknown/unowned instance; a module with
    no adapter is a **normal render**, not an error.
  - **THE CENTRAL SCOPE DECISION — `matchingAvailable: false`, and why this
    unit did not invent the missing contract.** Hard filtering and ranking
    (`rankCandidates`, Unit 2.8 part 1) need `MatchCriterion`s: attribute
    key + **comparison operator** + required value. A module's
    `CatalogAdapter.requiredSpec()` returns only
    `Record<string, EngineeringValue>` — no operator. Unit 2.8 part 1's own
    recorded Architecture Decision explicitly defers building criteria from
    `requiredSpec()` to "whichever later unit first wires a real production
    module's catalog adapter to this engine (Milestone 4)", precisely
    because deciding whether an attribute needs a capacity floor (`"gte"`), a
    size ceiling (`"lte"`), or an identity match (`"eq"`) is real
    engineering judgment no released contract records. **Extending
    `CatalogAdapter` to carry operators was considered and rejected here**:
    it is a released SDK contract, and `lib/engine` deliberately does not
    import `lib/catalog`'s `MatchCriterion` (stated in `CatalogAdapter`'s own
    TSDoc) — doing it would have pulled a fourth boundary into a UI unit and
    pre-empted a Milestone 4 engineering decision from a UI read model. So
    the panel reports `matchingAvailable: false` with a specific reason
    (no adapter / no run yet / no comparison rules yet) and says so honestly
    instead of rendering an empty candidate table. Today **every** module
    hits the first case — no registered module declares a `catalogAdapter` at
    all (only `example-relay`/`example-scaffold` exist; Milestone 4 has not
    started). This was raised with the user before implementing
    (`AskUserQuestion`), who chose "build both paths now"; the
    candidate/rejection/ranking UI is therefore fully built and fixture-
    tested, ready for Milestone 4 to populate, while manual/custom-part
    assignment is what satisfies the exit criterion today.
  - **`ComponentAssignmentPanel`** (`components/engineering/
    component-assignment-panel.tsx`, new): required-spec table, ranked
    candidate list (rank badge, manufacturer/part number, rev + lifecycle +
    data-quality meta, real datasheet link, per-candidate Assign form with
    quantity), collapsed-by-default "Show N rejected parts" with per-
    criterion rejection reasons, a manual/custom part form, and the
    assigned-parts list showing quantity, stale banner, and **the supporting
    calculation run**. Stacked below `ModuleResultPanel` in the same single
    scrollable column the Unit 3.5 layout decision established (no new layout
    infrastructure).
  - **Assignment is blocked with an inline explanation until the module has
    run.** `assignComponent` requires a `calculationRunId` for a
    `module_instance` target ("Supporting run required for calculated
    components"), so both Assign buttons are `disabled` with a stated reason
    rather than failing on submit — the same "don't show an affordance that
    does nothing" posture Unit 3.1 established.
  - **One Server Action, not two** (`assignComponentAction`): `partSource`
    ("catalog" | "manual") already discriminates which payload to read,
    mirroring the `AssignComponentInput` union `assignComponent` declares.
    Thin glue only — authorization, the target/run cross-check, and
    part-revision existence stay entirely in `assignComponent` (Unit 2.8),
    reused unchanged. No new persistence logic was written for this unit.
  - **The one new `lib/db` function**:
    `listComponentAssignmentsForModuleInstance` (`component-assignment-
    repository.ts`) — the per-module-instance narrowing of the existing
    `listComponentAssignmentsForConfiguration`, same ownership filter and
    same total order (`createdAt desc, id desc`). No schema change, so no
    migration and no CI round trip.
  - **Tests**: `load-component-assignment-view.test.ts` (6 live-DB tests —
    null for an unowned instance; the no-adapter `matchingAvailable: false`
    state; `latestRunId` appearing after a run; a manual assignment described
    with its supporting run **(the literal exit criterion)**; an assignment
    going stale after an upstream input change, proving Unit 2.5's
    same-transaction assignment staling surfaces here; and that one module's
    assignments never leak into another's view);
    `component-assignment-panel.test.tsx` (9 component tests covering the
    honest-notice state, required-spec with ranked candidates, ranking
    reasons and datasheet link, rejection reasons revealed on click, catalog assign
    submit, manual assign submit, the blocked-until-run state, an assigned
    part with its supporting run, a stale assignment, and the empty state);
    `workspace-shell.test.tsx` updated with the new required
    `componentAssignment` prop on every "loaded" fixture.
  - **What could not be verified on this dev machine**: no live signed-in
    browser click-through of assigning a part (same standing Clerk-keyless/
    Chromium-group-policy constraint as every prior UI-adjacent unit).
    Covered instead by the 9 component tests, the 6 live-database read-model
    tests, and a full `npm run build` production compile.
  - Verified: `npm run lint` (0 warnings), `npm run typecheck` (0 errors),
    `npm run test` with `DATABASE_URL` unset (487/487 passed, 178 skipped)
    and against the live Neon database (**665/665 passed, 0 skipped**,
    `--testTimeout=30000`), `npm run build` (clean, `/workspace` still
    correctly dynamic).
- **COMMIT HISTORY RECONSTRUCTION (2026-07-31, same session, before Unit
  3.6): Units 3.1–3.5 and the `upsertUser` bug fix had all been implemented
  and verified but never committed** — the entire Milestone 3 body of work
  was sitting as uncommitted changes on `main`. At the user's direction
  (asked before touching git), it was split into six separate, unit-tagged
  commits matching `implementation-map.md`'s own Delivery Rule ("Commit with
  the work-unit ID in the message") rather than one bulk commit: `feat(3.1)`
  workspace shell, `feat(3.2)` project/assembly management UI, `feat(3.3)`
  module workspace read model + navigator deep links, `feat(3.4)` link
  suggestion UI, `feat(3.5)` generic result and trace renderer, and a final
  `fix:` carrying the `createMachineProject`/`upsertUser` FK bug fix, the
  Neon adapter, and the documentation extraction.
  - Two files had to be split *within* themselves to keep the boundaries
    honest: `lib/db/repositories/project-repository.ts` was staged hunk-by-
    hunk (`git add -p`) so its Unit 3.2 renames/transaction-client params
    went in the 3.2 commit while the `upsertUser` bug-fix hunk stayed for the
    final commit. Files that genuinely span units (`actions.ts`,
    `module-input-workspace.tsx`, `workspace-shell.tsx`,
    `lib/application/index.ts`) were committed at the unit where they first
    appear or reach final form, with the commit message stating so — they
    were never developed in separable states, and inventing intermediate
    versions would have produced commits that never actually existed and did
    not build.
  - **A real incident during this reconstruction, disclosed for the record**:
    an intermediate edit to `lib/application/index.ts` (attempting to
    reconstruct a 3.1-era version of the barrel) removed exports that
    `actions.ts` imports, and the user's **running dev server** hot-reloaded
    the broken state and reported a compile error within seconds. Restored to
    the correct full content immediately and confirmed byte-identical to the
    pre-edit state (`git diff --stat` showed exactly the same 55 insertions
    as before), then re-verified with typecheck and lint. **Lesson for future
    sessions**: when reconstructing history for already-final code, split
    with `git add -p` against the index — never by editing working-tree files
    backwards into earlier states, which breaks a live dev server for real.
- **FIRST REAL-BROWSER QA PASS (2026-07-31, same session, immediately
  after Unit 3.5 — the user actually opened the app and clicked "New
  project"): a real, previously-invisible correctness bug found and
  fixed, plus a session-caused environment incident found and fixed.**
  Not a roadmap unit — every prior session's UI work could only be
  verified by component tests and a production build, never a live
  signed-in click-through (standing Clerk-keyless/Chromium-group-policy
  constraint). This was the first time that ever happened.
  - **The environment incident (not a code bug, disclosed for the
    record):** immediately after Unit 3.5, this session's own "Before
    Moving to the Next Unit" dev-server verification ran `rm -rf .next`
    while the user's own `next dev` process was already running against
    that same directory — corrupting Turbopack's persistent RocksDB-style
    cache (`.next/dev/cache/turbopack`) mid-write. The Rust backend
    panicked (`Failed to lookup task ids ... Unable to open static sorted
    file`), which is what produced the stuck "Compiling…" indicator the
    user saw and reported. Two follow-up restart attempts by this session
    compounded it further: the first restart dropped `NODE_EXTRA_CA_CERTS`
    (every request then took ~3s crawling through Clerk's middleware —
    see the `corporate-network-tls-block` memory), and a stop/restart
    cycle left multiple orphaned `node.exe` processes bound across ports
    3000/3001. Fixed by killing every stray process (confirmed via
    `netstat`/`tasklist`, not guessed), clearing `.next` once more for a
    truly clean cache, and starting exactly one `next dev` with both
    `NODE_EXTRA_CA_CERTS` and `DATABASE_URL` set correctly. **Lesson
    recorded for future sessions**: never run `rm -rf .next` (or any
    build-cache deletion) without first checking `netstat`/`tasklist` for
    an already-running dev server — Turbopack's persistent cache does not
    tolerate its files disappearing out from under a live process.
  - **The real bug**: creating a project as a real signed-in user threw
    `PrismaClientKnownRequestError` — `Foreign key constraint violated on
    the constraint: machine_projects_ownerId_fkey` — inside
    `createMachineProject` → `createProject` →
    `client.machineProject.create()`. Root cause: nothing in the actual
    (non-test) application ever calls `upsertUser` — every one of this
    project's 20+ existing test files calls it themselves as fixture
    setup, which is exactly what hid this gap through every unit from 2.1
    onward. A real Clerk user's `User` row was simply never created.
  - **Fix, at the root cause, not a patch at the auth boundary**:
    `upsertUser` (`lib/db/repositories/project-repository.ts`) gained the
    same optional trailing `client: DbClient = prisma` parameter every
    other create in that file already has, and `createMachineProject`
    (`lib/application/projects/create-project.ts`) now calls
    `upsertUser(ownerId, tx)` as the first statement inside its own
    transaction, before creating the project. **Why here and not Clerk
    middleware/`WorkspaceLayout`**: `createMachineProject` is the one true
    "first write" entry point for any given user in this app's entire
    current surface area — every other write path (assemblies, module
    instances, parameter values, links, catalog assignments, runs,
    baselines) operates on a project/configuration/module-instance that
    could only exist if `createMachineProject` already ran successfully
    for that user. Fixing it here closes the gap for every write path at
    once, atomically, with no dependency on request/render timing —
    unlike a middleware-level "sync user" call, which would need to run
    in Node (not Edge) runtime to reach Prisma and would still be a
    separate, non-atomic statement ahead of whatever write actually needs
    it. Verified no other write path shares this gap: every other
    `ownerId`/`UserId` reference in `project-repository.ts` is a read-side
    ownership filter (`where: { ownerId: owner }` or a nested
    `project: { ownerId: owner }`), not a write that creates a row
    against a `UserId` foreign key.
  - **Tests**: existing `upsertUser` calls in every fixture remain
    correct — the function is a plain upsert, so calling it twice for the
    same id (once by a test's own fixture, once now inside
    `createMachineProject`) is a harmless no-op the second time.
    `create-project.test.ts` and `project-repository.test.ts` (13 tests)
    re-verified against the live database; no test needed to change.
  - Verified: `npm run lint` (0 warnings), `npm run typecheck` (0
    errors), `npm run test` against the live database (650/650 passed, 0
    skipped, `--testTimeout=30000`), `npm run build` (clean). Confirmed
    live in the running dev server via the actual error log (not just
    tests) before and after the fix — the exact same "Create project"
    action that threw the FK violation compiled and ran clean afterward.
- **UNIT 3.5 (2026-07-31, same session — user said "implement only the
  first item under Next Up"): generic result and trace renderer —
  complete, verified against a live database.** `implementation-map.md`
  Unit 3.5: "Output summary", "Check table", "Warning/invalidity panel",
  "Expandable trace", "Source references", "Previous-run comparison",
  "Stale banner." Exit criterion: "The UI renders stored runs without
  importing module compute code."
  - **The read model** (`lib/application/calculations/
    load-module-result-view.ts`, new, `loadModuleResultView`): reads a
    module instance's latest `CalculationRun` (and, when a second one
    exists, the run immediately before it) entirely from the stored,
    already-validated snapshot (`CalculationRunSnapshot.computation`) —
    `listRunsForModuleInstance`/`loadCalculationRun` (Unit 2.3), never a
    module's `compute` function. Output labels come from the released
    parameter registry (`getParameter`); every unique `ClauseReference`
    cited across a run's checks/warnings/validity/assumptions/trace steps
    (walked via `walkTrace`, Unit 1.5) is deduplicated and resolved through
    `SOURCE_REGISTRY.resolveReference` (`lib/standards`) for display — a
    citation that fails to resolve (e.g. an old immutable run citing a
    source ID a later build no longer registers) is skipped, not thrown,
    the same "degrade, don't crash on stored data" posture
    `previewRemoveParameterLinkImpact` (Unit 3.4) already established. When
    the module instance has never run, `run`/`trace`/`comparison` are
    `null` and the list fields are empty — a normal render, not an error.
  - **Previous-run comparison scope decision**: compares only the latest
    run against the run immediately before it for the same module
    instance — not a user-selectable pair, and not a multi-run history.
    `implementation-map.md`'s "Comparison with previous run" is singular;
    a picker over arbitrary run history is a materially different (and
    unrequested) feature. Outputs are diffed by port key via
    `engineeringValuesEqual` (Unit 1.1); checks are diffed by check `id`,
    reporting only a changed `status` (a check present in only one of the
    two runs — e.g. after a module version upgrade changed its check set —
    is silently not compared, since matching checks across different
    module versions by id alone would be a real correctness risk this unit
    was not asked to solve).
  - **`ModuleResultPanel`** (`components/engineering/
    module-result-panel.tsx`, new): renders the module header (status
    badge, run timestamp, Run button), a stale banner above everything
    else when the latest run is stale (`ui-context.md` Status Model), an
    output summary, the previous-run comparison (only when one exists), a
    check table (status/criterion/observed/allowable/margin, right-aligned
    numeric cells via `formatQuantity` for proper significant figures —
    `ui-context.md` "Tables and Numeric Inputs"), a combined
    warning/invalidity panel (warnings plus any non-`within_limits`
    validity result), an expandable trace (`Collapsible` per section/step,
    inputs/outputs/method id/notes revealed on click, top-level sections
    open by default), and the resolved source references list.
  - **Layout decision**: `WorkspaceShell` stacks `ModuleResultPanel`
    directly below `ModuleInputWorkspace` in one scrollable column, not a
    side-by-side split. No prior unit established a resizable-pane
    primitive, and this dev machine still cannot verify a real-browser
    layout (same standing constraint as every UI-adjacent unit this
    session) — the simpler, already-established narrow-column pattern
    (`mx-auto max-w-3xl`) was kept rather than building new layout
    infrastructure for this one unit.
  - **`formatEngineeringValue`/`trimNumber` extracted** from
    `link-suggestion-panel.tsx` into a new shared
    `components/engineering/format-engineering-value.ts` (pure move, no
    behavior change to Unit 3.4) — this unit needed the same short-form
    value formatting for non-quantity kinds and trace operands, and it was
    about to be duplicated a third time. `ModuleResultPanel`'s own tabular
    cells (output summary, check table, trace operands) use
    `formatQuantity` (`lib/engine/units`) instead for `quantity` values
    specifically — proper significant figures, not the shared helper's
    fixed-3-decimal form, since these cells are exactly the "engineering
    table" `ui-context.md` asks for that treatment.
  - **A real bundling bug caught before running anything**: `formatQuantity`
    is re-exported from the full `@/lib/engine` barrel, but that barrel
    also re-exports `lib/engine/module-sdk`'s `runModuleConformance`
    (`conformance.ts`, which has its own `import "server-only"`) — a plain
    (non-type-only) import of `formatQuantity` from `@/lib/engine` in this
    client component would have pulled `server-only` into the client
    bundle and broken the build. Fixed by importing `formatQuantity` from
    `@/lib/engine/units` directly (its own self-contained,
    server-only-free public surface) instead of the full barrel; every
    other `@/lib/engine` import in this file stays type-only, which erases
    at compile time and never triggers the issue. `npm run build` is what
    would have caught this if missed — confirmed green.
  - **The "Run module" trigger**, deliberately deferred here by both Unit
    3.3 and Unit 3.4 (`ui-context.md` "Generic Module Workspace"):
    `runModuleInstanceAction` (`app/(workspace)/workspace/actions.ts`) is
    thinner than every other action in that file — a one-field wrapper
    around unchanged `executeModuleInstance` (Unit 2.4), which already
    does authorization, input resolution, compute, and persistence inside
    one transaction. Its `stale_upstream` error surfaces the service's own
    composed message (which upstream module needs re-running) rather than
    a generic one.
  - **Scope note**: "Assigned manufacturer part and stale state" from
    `ui-context.md`'s broader Result-pane description is Unit 3.6's
    deliverable ("An engineer can assign a manufacturer part and see its
    supporting run") — `loadModuleResultView` does not read
    `ComponentAssignment`. The application shell's status-bar "stale
    count" placeholder (Unit 3.1) also stays a placeholder: this unit
    renders one module's own stale state, not a tree-wide aggregate across
    every module instance in a configuration, which
    `implementation-map.md`'s Unit 3.5 deliverable list does not name —
    revisit only if a later unit actually needs that aggregate. Neither
    cut is an Open Question — both are scope-boundary calls the
    implementation map already settles, the same kind of judgment call
    Unit 3.2's reorder-assemblies/workflow-instance deferrals and Unit
    3.3's curve deferral made unprompted.
  - **Tests**: `load-module-result-view.test.ts` (5 live-DB tests — null
    for an unowned/unknown instance; an empty view before any run;
    outputs/checks/trace/sources described from a real stored snapshot
    after running `example-relay`; a stale run's `stale`/`staleReason`
    surfaced; a two-run comparison's `changedOutputs`/`changedChecks`,
    including the "nothing changed" case for a tautologically-passing
    check); `module-result-panel.test.tsx` (11 component tests covering
    the empty state, output/check rendering from a fixture snapshot, trace
    expand-on-click, the stale banner, warnings, source references
    present/absent, the comparison section present/absent, and the Run
    action's success/error paths, `runModuleInstanceAction` mocked the
    same way every other "use server" action in this directory is mocked);
    `workspace-shell.test.tsx` updated (new required `moduleResult` prop
    on every "loaded" fixture; one test extended to prove
    `ModuleResultPanel` renders alongside `ModuleInputWorkspace` in the
    shell).
  - **What could not be verified on this dev machine**: no live-in-browser
    check of clicking Run as a signed-in user (same standing Clerk-keyless/
    Chromium-group-policy constraints as every prior UI-adjacent unit). A
    from-scratch `next dev` boot check was attempted but this machine had
    a second, pre-existing `next dev` process already bound to port 3000
    from earlier in this session (a leftover, not started by this unit's
    work) — the two processes made `curl` responses unreliable, so this
    session relied on `npm run build`'s full production compile instead
    (the same substitute signal every prior UI unit here has used) and did
    not kill the pre-existing process, since it was not this unit's to
    manage.
  - **First time this project's test suite has run 100% green against a
    live database with zero skips** (650/650, `--testTimeout=30000`): every
    previously-"live-DB, self-skip locally" test file in the whole repo
    executed for real in the same run, not just this unit's own five.
  - Verified: `npm run lint` (0 warnings), `npm run typecheck` (0 errors),
    `npm run test` both with `DATABASE_URL` unset (478/478 passed, 172
    skipped) and set against the live Neon database (650/650 passed, 0
    skipped), `npm run build` (Next.js production build, `/workspace`
    still correctly dynamic) all green.
- **UNIT 3.4 (2026-07-31, same session — user said "read claude.md and
  context file, work on next step" after Unit 3.3's summary): link
  suggestion UI — complete, locally verified.** `implementation-map.md`
  Unit 3.4: "Suggestion banner", "Origin and scope display", "Parameter
  semantic details", "Confirm and dismiss actions", "Downstream stale-impact
  warning on removal/change." Exit criterion: "User can understand exactly
  what value is being linked and from where."
  - **The read model** (`lib/application/parameters/suggest-link-sources.ts`,
    new): `buildConfigurationSuggestionIndex` reconstructs a real, per-
    assembly-scoped `IndexedParameterGraph` for a whole configuration —
    deliberately NOT `lib/db`'s existing `loadConfigurationGraph`, which
    collapses every node into one synthetic scope (correct for its own
    callers, cycle rejection and stale-impact traversal, which do not care
    about scope proximity; only suggestion ranking does). It composes
    `loadConfigurationTree` (for the assembly hierarchy and every module
    instance's ports), `listCurrentParameterValuesForConfiguration` (for
    provider values), and `listParameterLinksForConfiguration` (so the graph
    stays internally consistent even when a link's source has no authored
    value yet). `describeLinkSuggestions` then calls Unit 1.8's
    `suggestSources` unchanged and turns each raw `NodeId` result into a
    fully human-described `LinkSuggestionSourceView` (parameter label, scope
    label, module label, load case, current value, origin) — capped at
    `MAX_LINK_SUGGESTIONS_PER_FIELD` (5). Nothing here decides a link is
    safe; that authority stays entirely with unchanged `confirmParameterLink`
    (Unit 2.5).
  - **A module-output source's current value is deliberately left `null`,
    not fetched** — its real value only exists inside a `CalculationRun`
    snapshot (Unit 2.3), keyed by port `key` rather than `parameterId`,
    which would mean an extra run-snapshot read per candidate module
    instance for every suggestion computed. The UI states this honestly
    ("Not yet available — comes from that module's calculation run"), the
    same posture Unit 3.3's `LinkedFieldNotice` already established for a
    confirmed link to an unrun module. Revisit only if a real workflow shows
    this is confusing in practice.
  - **`loadModuleWorkspaceView` (Unit 3.3) is extended, not replaced**: it
    now builds one `ConfigurationSuggestionIndex` per module-instance view
    (not per field — the three underlying reads would otherwise repeat once
    per port) and calls `describeLinkSuggestions` for every field whose
    `resolved.source !== "linked"`. Curve/`vector_quantity` ("unsupported")
    fields also get suggestions now — a real, deliberate scope decision:
    linking never needs a native editor, so a field with no editor can still
    be filled by confirming a link, partially softening the standing curve-
    editor deferral without building the curve contract itself.
  - **Downstream stale-impact warning on removal** (the deliverable's other
    half): `previewRemoveParameterLinkImpact` (new, in `lib/application/
    parameters/stale-propagation.ts`, next to `removeParameterLink`) reuses
    that file's own private `computeImpact` helper read-only, outside a
    transaction and without deleting — so `loadModuleWorkspaceView` can
    attach a `linkRemovalImpact: number | null` to every already-linked
    field up front, and the UI can show "removing this link will mark N
    other module(s) stale" *before* the user confirms removal
    (`ui-context.md` "Modals and Errors": "Confirmation required for ...
    link removal with downstream impact"). **Scope note**: the deliverable
    says "removal/change" — a "change" (replacing a confirmed link with a
    different source) is only reachable today by removing the old link
    (impact shown) and then confirming a new suggestion (no separate preview
    before that second step) — matching every other write path in this
    codebase, where impact is reported as a result of the write, never
    previewed before it, except the one case `ui-context.md` explicitly
    calls out (removal). Not a gap; a scope match to the literal requirement.
  - **Server Actions** (`app/(workspace)/workspace/actions.ts`): thin glue
    only, same shape as every prior action in this file —
    `confirmSuggestedLinkAction` re-derives nothing from the client beyond
    what a `LinkSuggestionSourceView`'s hidden fields already carry, and
    `confirmParameterLink` re-validates ownership, port declarations, and
    semantic compatibility from scratch, exactly as it does for every other
    caller; `removeParameterLinkAction` is a one-field wrapper around
    `removeParameterLink`.
  - **UI** (`components/engineering/link-suggestion-panel.tsx`, new):
    `LinkSuggestionPanel` renders every visible suggestion as its own row
    ("Use payload mass 12 kg from Axis Requirements / Normal load case?",
    matching `ui-context.md`'s literal example), each with Confirm (a real
    form action), View source (an inline expand/collapse showing parameter
    id, scope, load case, and current value — deliberately not a navigation,
    so confirming a suggestion never requires leaving the field being
    edited), and Dismiss (pure client-side `useState`, since a suggestion is
    recomputed on every render and was never persisted — there is nothing to
    "un-dismiss" server-side). `LinkedFieldControl` replaces Unit 3.3's
    read-only `LinkedFieldNotice` with the same notice plus a two-step
    "Remove link" → shows the stale-impact count → "Confirm removal" flow.
    `LOAD_CASE_LABELS` was extracted into a new tiny shared module
    (`load-case-labels.ts`) rather than importing it from
    `module-input-workspace.tsx` directly — that would have created a
    circular import (`module-input-workspace.tsx` also needs to import the
    two new components from `link-suggestion-panel.tsx`), caught before
    running anything by reasoning through the import graph, not by a runtime
    failure.
  - **Tests**: `suggest-link-sources.test.ts` (5 new live-DB tests, self-
    skip locally per this project's standing constraint — unowned
    configuration returns `null`; a module output is suggested with its
    module label and scope; a module with no other source and no provider
    value gets no suggestions; same-scope-before-ancestor-before-machine-root
    ranking across three provider values at different assembly depths; a
    source that would close a dependency cycle — both an already-linked
    downstream module and a module's own output offered back to its own
    input — is correctly excluded); 2 new live-DB tests added to
    `stale-propagation.test.ts` (`previewRemoveParameterLinkImpact` matches
    what `removeParameterLink` actually causes, and does not itself write
    anything; unauthorized for another owner's link); 3 new component tests
    in `module-input-workspace.test.tsx` (a suggestion renders with
    parameter/value/origin/load-case and Confirm calls the action; Dismiss
    hides it without calling the action; Remove-link states the impact count
    before Confirm removal calls the action) plus `suggestions: []`/
    `linkRemovalImpact: null` added to every existing fixture in that file
    and in `workspace-shell.test.tsx` (both files' `ModuleInputFieldView`
    fixtures needed the two new required fields; `workspace-shell.test.tsx`'s
    action mock also needed the two new action names or `useActionState`
    would have received `undefined`).
  - **What could not be verified on this dev machine (same standing
    constraints as every prior UI-adjacent unit)**: no live-in-browser check
    of confirming/dismissing/removing a link as a signed-in user. Confirmed
    instead: a from-scratch `next dev` boot still serves `/` (200) and
    redirects unauthenticated `/workspace` (307 to `/sign-in`) — proving the
    new component graph (`link-suggestion-panel.tsx`, `load-case-labels.ts`,
    the extended `actions.ts`) compiles cleanly under Turbopack, plus a full
    `npm run build` production compile, the same substitute signal every
    prior UI unit this project has used.
  - Verified locally: `npm run lint` (0 warnings), `npm run typecheck` (0
    errors), `npm run test` (466/466 passed, up from 463; 167 skipped, up
    from 160), `npm run build` (Next.js production build) all green. No
    `lib/db` schema file touched, so no CI round trip is required before
    calling this fully verified.
- **UNIT 3.3 (2026-07-31, new session): generic module input renderer —
  complete, locally verified.** `implementation-map.md` Unit 3.3: render
  fields from `ModuleUiSchema` — quantity with unit selector, enum and
  boolean, curve editor for motion inputs, grouping and help text, source
  badges, load-case context, inline validation; "no module-specific form is
  permitted"; exit criterion "two structurally different example modules
  render through the same component."
  - **Resolved the standing BLOCKER** (Open Questions, logged 2026-07-31 by
    the immediately preceding attempt at this unit): asked the user how to
    proceed (`AskUserQuestion`) rather than inventing either the curve
    contract or the read model; the user chose "defer the curve editor, ship
    the rest." Scope actually shipped: quantity/enum/boolean editors, source
    badges, load-case chip, grouping/help text, inline validation. **Curve
    editing remains deferred** — the registry still has no released curve
    value type — and **`vector_quantity` editing is also deferred**, for the
    same reason (no released module needs one, and it was not in Unit 3.3's
    literal deliverable list). Both render as an honest `"unsupported"` field
    state rather than a crash or an invented editor. See `ui-context.md`
    "Generic Module Workspace" for the full recorded scope and reasoning.
  - **The read-model gap the blocker actually named** ("the workspace read
    model does not expose the resolved input source/value/link provenance")
    is closed by a new read-only application service,
    `loadModuleWorkspaceView` (`lib/application/calculations/
    load-module-workspace-view.ts`), modeled on Unit 3.1's `loadWorkspaceView`
    (no writes, no transaction). It composes three existing boundaries
    without duplicating their logic: `resolveModuleInputs` (Unit 2.2 —
    manual/linked/default/workflow resolution, already used by
    `executeModuleInstance`), the module registry (`getModulePackage`, for
    ports + `ModuleUiSchema`), and the released parameter registry
    (`getParameter`, for `valueType`/`canonicalUnit`/`displayUnits`/
    `enumOptions`). Returns a fully-described `ModuleWorkspaceView` (groups →
    fields, each already carrying its label/help/required/loadCase/field-
    descriptor/resolved-source) so the renderer needs no engine imports of
    its own. Throws (not a user-facing error) if a registered module's UI
    schema references an unknown port or parameter — an invariant the module
    conformance suite already proves for every registered module, so this
    would be a genuine bug, not reachable in normal operation.
  - **Saving a manual value reuses Unit 2.5's `setParameterValue` completely
    unchanged** — no new persistence, authorization, or stale-propagation
    logic was written for this unit. The only new code is
    `setModuleInputValueAction` (`app/(workspace)/workspace/actions.ts`):
    thin glue that re-derives the canonical unit and enum option set from
    `getParameter` (never trusting a client-supplied unit/enumId, since a
    tampered request could otherwise store a value the registry does not
    actually describe) and converts the entered magnitude to canonical units
    via `lib/engine/units`'s `convert` — the same "display-unit conversion
    happens only through the unit package" rule `code-standards.md` already
    states, applied here for the first time to a user-entered value rather
    than a module's own compute output. This conversion is not optional:
    `resolveModuleInput`'s "must be the canonical unit" check
    (`lib/engine/module-sdk/execute.ts`) would otherwise reject the value the
    next time the module runs.
  - **UI** (`components/engineering/module-input-workspace.tsx`, new):
    `ModuleInputWorkspace` renders the module header (label, package id@
    version, status badge) and every declared UI group, each field rendered
    generically by value-type discriminant — no `if (moduleId === ...)`
    branch anywhere. A `"linked"` source renders a short read-only notice
    ("Linked from …") instead of an editable control — deliberately not the
    full Confirm/View source/Dismiss suggestion banner, which
    `ui-context.md`'s own pane split already assigns to Unit 3.4, not this
    one. No "Run module" action was added either — that is the Result pane's
    job (Unit 3.5), and a bare run button with nowhere to show the result
    would repeat the "looks tappable but does nothing" anti-pattern Unit
    3.1's own design decisions already rejected once.
  - **Routing**: module rows in `MachineNavigator` are now real `<Link>`s to
    `?project=&configuration=&module=`, matching the existing project/
    configuration deep-link pattern (not client-only selection state) — the
    project id had to be threaded down from `configuration.projectId` at the
    top of `MachineNavigator` (a real bug caught before it shipped: an
    earlier draft reused `moduleInstance.configurationId` for both the
    `project` and `configuration` query params, which is wrong — a
    configuration id is not a project id — caught by re-reading the diff
    before running tests, not by a failing test). `app/(workspace)/workspace/
    page.tsx` reads `?module=` and calls `loadModuleWorkspaceView`, passed
    through `WorkspaceShell` to either `ModuleInputWorkspace` (when it
    resolves) or the existing `WorkspaceCanvas` (unchanged otherwise, its
    final empty-state copy updated since "in a later update" was no longer
    true).
  - **Tests**: `load-module-workspace-view.test.ts` (4 live-DB tests, self-
    skip locally per this project's standing constraint — unknown/unowned
    instance returns null, a `"default"` resolution with no authored value,
    a `"manual"` resolution after `createParameterValue`, and — proving this
    unit's own "structurally different modules" exit criterion at the data
    layer — `example-relay`'s differently-keyed, differently-united force
    port resolves through the identical function); `module-input-workspace.
    test.tsx` (5 component tests covering every field kind — quantity,
    enum, boolean, linked, and the deferred-`unsupported` state — in one
    render, plus a second fixture proving the same component renders a
    structurally different field set, plus submit-success and submit-error
    paths for the new Server Action, mocked the same way every other
    component test in this directory mocks `"use server"` actions).
  - Verified locally: `npm run lint` (0 warnings), `npm run typecheck` (0
    errors), `npm run test` (463/463 passed, up from 458; 160 skipped, up
    from 156), `npm run build` (Next.js production build) all green. No
    `lib/db` schema file touched, so no CI round trip is required before
    calling this fully verified.
- **UNIT 3.2 (2026-07-30, same session — user said "continue" after Unit
  3.1's summary): project and assembly management UI — complete, locally
  verified.** `implementation-map.md` Unit 3.2: "Create/rename project,
  Create/rename/reorder assemblies, Add workflow or module instance, Status
  indicators, Ownership-safe actions." Exit criterion: "User can build a
  machine hierarchy without direct database access."
  - **Scoped down from the literal deliverable list, each cut recorded
    rather than silently dropped** (`ai-workflow-rules.md` "Handling Missing
    Requirements"): "Reorder assemblies" needs a `position`/order column —
    `Assembly` has none — so it needs a migration and is split into its own
    future unit (Split Rule: a schema change does not travel with a UI unit,
    the same reasoning Unit 2.7/2.8 already used to split their own
    persistence halves). "Add workflow instance" is not built at all: `lib/
    workflows/` does not exist yet (confirmed by directory search — Unit 4.8
    is the first thing that would create a real workflow definition), so a
    picker would have literally nothing real to list. A free-text workflow-
    id field was considered and rejected — it would let a user create
    `WorkflowInstance` rows with no backing definition, worse than not
    offering the feature yet.
  - **A project always gets one auto-created initial configuration —
    a real product-shape decision, not just an implementation detail (see
    Architecture Decisions below for the full reasoning).** Without this,
    "create project" alone could not satisfy the exit criterion at all,
    since `Assembly` requires a `configurationId` and nothing in Unit 3.2's
    own deliverable list mentions a separate "create configuration" step.
  - **Repository layer** (`lib/db/repositories/project-repository.ts`):
    `createProject`/`createConfiguration` gained the same optional trailing
    `client: DbClient = prisma` parameter the 2026-07-30 design-risk
    follow-up established for reads — the first time this project's
    *creates* need transactional composition from `lib/application`
    (a project together with its initial configuration, atomically). New
    `renameProject`/
    `renameAssembly`, matching `deleteProject`'s existing shape exactly: an
    ownership-scoped `updateMany`, returning `boolean` (not the updated row —
    every caller re-reads via `loadWorkspaceView` on next render, so a second
    fetched copy here would go unused).
  - **Application services** (`lib/application/projects/`, new files
    `create-project.ts`, `rename-project.ts`, `manage-assemblies.ts`,
    `add-module-instance.ts`, all re-exported through a new `projects/
    index.ts` sub-barrel mirroring `parameters/index.ts`'s existing
    pattern): `createMachineProject` validates `marketProfileKey` against
    `SOURCE_REGISTRY.listProfiles()` (`lib/standards`) — the real released
    registry, not a hardcoded pair of literals, so this stays correct as
    market profiles are added. `createMachineAssembly`/`addModuleInstance`
    both apply the "target ownership plus configuration membership" rule
    the 2026-07-30 hardening pass established for every other write
    (Architecture Decisions) **from their first version**, not as a later
    hardening pass of their own — a parent assembly or target assembly from
    a different configuration is rejected before any write. `addModuleInstance`
    validates against `lib/modules`'s real generated registry
    (`getModulePackage`) — a caller can never instantiate an unregistered or
    mistyped module id+version.
  - **Server Actions** (`app/(workspace)/workspace/actions.ts`, new,
    `"use server"`): thin glue only — authorize via `auth.protect()`, parse
    `FormData`, call one application service, map its result. A `"use
    server"` file may only export async functions, so the shared
    `ActionState` type/`IDLE_ACTION_STATE` constant live in a sibling
    `action-state.ts` instead. `createProjectAction` redirects to the new
    project on success (`redirect()` outside any try/catch — it throws by
    design and must propagate); the other four `revalidatePath("/workspace")`
    and return a `{status:"success"}` state for the calling dialog to react
    to.
  - **shadcn primitives added**: `dialog`, `input`, `label` via the real
    CLI (network reachable again this session). Also generated `select.tsx`,
    then deleted it unused — the market-profile and module-package pickers
    use a plain native `<select>` instead (simpler, zero risk for FormData
    participation, no Radix-specific behavior to verify) rather than mixing
    a second dropdown primitive in for two call sites.
  - **UI components** (`components/engineering/`): `CreateProjectDialog`,
    `CreateAssemblyDialog`, `AddModuleInstanceDialog`, and one reused
    `RenameDialog` (project and assembly rename are literally the same
    shape — one name field, one hidden id, one action — so this is the "same
    thing twice," not a premature abstraction over "similar" things,
    per `code-standards.md` "General"). All four use React 19's
    `useActionState`; all three that need to close themselves on success
    do it via "adjusting state during render" (comparing the action's
    returned status against a tracked previous value, calling `setState`
    synchronously in the render body when it changes), not a `useEffect` —
    ESLint's `react-hooks/set-state-in-effect` rule (new to this project's
    lint output this session) flagged the first, effect-based version of
    all three as an avoidable extra render pass; the fix follows React's own
    documented alternative pattern
    (<https://react.dev/learn/you-might-not-need-an-effect>) rather than
    disabling the rule.
  - **Wiring**: `MachineNavigator`'s assembly rows gained three always-
    visible 24px icon actions (add sub-assembly, add module, rename) as
    *siblings* of the row's own expand/collapse trigger, not descendants —
    nesting a button inside the Collapsible's trigger `<button>` would be
    invalid HTML. Deliberately not a hover-only reveal (`ux-pro-max`
    `hover-vs-tap`) and deliberately not a kebab/overflow `DropdownMenu`
    with `Dialog` triggers nested inside its items — that combination has a
    well-documented Radix focus-management conflict (the menu's own
    auto-close-and-refocus behavior fights the dialog trying to open), so
    three plain always-visible buttons sidestep the whole class of bug
    rather than working around it. `AppBar` gained a "New project" trigger
    for both the zero-projects and has-projects cases, plus a "Rename
    project" trigger. `WorkspaceCanvas`'s "no projects"/"empty configuration"
    empty states gained real CTAs (`CreateProjectDialog`/
    `CreateAssemblyDialog`) instead of being purely informational — the
    `ui-context.md` note from Unit 3.1 explicitly named this as the next
    unit's job.
  - **The `<select>` module-package picker submits one combined
    `"id@version"` value** (`name="modulePackageKey"`), parsed apart in the
    Server Action by the first `"@"` — not two hidden inputs kept in sync by
    an `onChange` handler reaching into `form.elements`. An early draft used
    the imperative version; rejected during self-review as unnecessarily
    fragile for something a single `indexOf`/`slice` on the server handles
    with no client-side script at all.
  - **A real, pre-existing testing-infrastructure gap this unit's own
    tests could not have surfaced without multiple dialog test files
    existing**: ESLint's `react-hooks/set-state-in-effect` (ecosystem rule,
    not something added this session) caught the three effect-based
    close-on-success handlers described above — fixed before any test was
    written against the buggy version, so no regression test exists for the
    fixed-vs-broken distinction itself (the resulting component tests just
    exercise the correct behavior directly).
  - **A real test-authoring bug, caught by the test itself failing, not
    silently passing**: `create-assembly-dialog.test.tsx`'s original error-
    message test clicked "Add assembly" without first filling the required
    "Assembly name" field — the browser's native HTML5 constraint validation
    blocks submission before React's action ever runs, so the mocked action
    was never called and the expected error never appeared. Root-caused by
    comparing against the three structurally identical tests in the other
    three dialog test files, all of which do fill their required fields
    first. Fixed by adding the missing `user.type(...)` — not by weakening
    the assertion.
  - **Tests**: 2 new live-DB tests in `project-repository.test.ts`
    (`renameProject`/`renameAssembly`, including a wrong-owner rejection
    each); 4 new live-DB test files under `lib/application/projects/`
    (`create-project.test.ts`, `rename-project.test.ts`,
    `manage-assemblies.test.ts`, `add-module-instance.test.ts` — 18 tests
    total, covering the happy path, every rejection code
    (`invalid_input`/`unauthorized`/`not_found`/`module_not_found`/
    `unknown_market_profile`), and the cross-configuration-write rejection
    for both `createMachineAssembly` and `addModuleInstance`); 5 new
    component test files (`create-project-dialog`, `rename-dialog`,
    `create-assembly-dialog`, `add-module-instance-dialog`, plus updates to
    all 4 of Unit 3.1's existing shell test files for the new required
    props and to mock the new `"use server"` actions module — importing it
    unmocked would pull `lib/application` → `lib/db` → Prisma and
    `@clerk/nextjs/server` into what should be fast, isolated component
    tests).
  - **What could not be verified on this dev machine (same standing
    constraints as Unit 3.1, not new ones)**: no live-in-browser check of
    actually submitting a form as a signed-in user — still no Clerk test
    credentials, still no working local Chromium launch. Confirmed instead:
    a from-scratch (`.next` cleared) `next dev` boot, `/workspace`'s
    unauthenticated redirect still 307s correctly, and `/` still 200s —
    proving the entire new module graph (`actions.ts`, `action-state.ts`,
    all five new dialogs, and the rewired `AppBar`/`MachineNavigator`/
    `WorkspaceCanvas`/`WorkspaceShell`) compiles cleanly under Turbopack from
    zero cache, the same stronger-than-`tsc`-alone signal Unit 3.1 relied on.
  - Verified locally: `npm run lint` (0 warnings), `npm run typecheck` (0
    errors), `npm run test` (458/458 passed, up from 445; 156 skipped, up
    from 136), `npm run build` (Next.js production build, `/workspace` still
    correctly dynamic) all green. No `lib/db` schema file touched, so no CI
    round trip is required before calling this fully verified.
- **UNIT 3.1 (2026-07-30, new session): workspace shell — complete, locally
  verified.** First Milestone 3 unit (`implementation-map.md` Unit 3.1: app
  bar, project/configuration selector, context action bar, 280px
  collapsible machine navigator, main canvas, bottom status bar, empty/
  loading/error states). Per the user's explicit direction, built with the
  `ui-ux-pro-max` and `frontend-design` skills and matched to the design
  already recorded in `ui-context.md` (itself the prior session's merge of
  the "Calculeaf" reference tool's design system — there is no separate
  Calculeaf artifact left to match against; `ui-context.md` already *is*
  that merge, adopted/rejected explicitly).
  - **shadcn/ui is now actually wired, not just configured.** `components.json`
    existed since Unit 0.2 but `npx shadcn add` had never been run (this
    machine's network blocked `ui.shadcn.com` every prior session — see
    Open Questions). This session's network reached it. Added
    `lib/utils.ts`'s `cn()` (already present, unused until now) plus seven
    generated primitives (`button`, `dropdown-menu`, `separator`, `skeleton`,
    `badge`, `scroll-area`, `collapsible`) via the real CLI. **The CLI's own
    "Installing dependencies" step silently failed to add two packages that
    ended up imported anyway** (`class-variance-authority`, used by
    `button.tsx`/`badge.tsx`; `tw-animate-css`, providing the
    `animate-in`/`fade-*`/`zoom-*` utility classes several generated
    components reference) — caught by `npm ls class-variance-authority`
    returning empty right after the "Created 7 files" success message,
    installed both by hand afterward (`tw-animate-css` under
    `devDependencies`, matching `tailwindcss`'s own placement as a build-time
    CSS tool, not a runtime one). `npm audit --omit=dev`: 0 vulnerabilities
    both before and after (the 9 new dev-only advisories are the same
    already-documented ESLint-tree class from the 2026-07-30 hardening pass).
  - **Theming**: shadcn-generated components reference shadcn's own semantic
    variable names, not this project's named tokens. Rather than hand-edit
    the generated (protected) files, `app/globals.css` now aliases every
    shadcn variable (`--primary`, `--destructive`, `--border`, `--ring`,
    `--radius`, etc.) to the existing `ui-context.md` tokens — the supported
    shadcn customization path. Two tokens ui-context.md had no role for yet
    (`--surface-hover`/`--surface-selected`, translucent `--accent-primary`
    tints for navigator/menu hover-selected rows) were added there too, not
    invented ad hoc in a component. A global
    `@media (prefers-reduced-motion: reduce)` rule was added covering every
    animation app-wide (ui-context.md Motion: "Every animation must have a
    prefers-reduced-motion: reduce alternative"), rather than opting in per
    shadcn component. See `ui-context.md`'s "Component Library" section for
    the full mapping and reasoning, added this session per Documentation
    Synchronization.
  - **Read path**: new `lib/application/projects/load-workspace-view.ts`
    (`loadWorkspaceView`) — the read-only counterpart to Unit 2.1's
    `listProjectsByOwner`/`loadProjectTree`, giving the shell exactly what it
    renders. Modeled on `compareBaselines`
    (`lib/application/configurations/`), the only prior read-only,
    no-transaction application service — chosen over calling `lib/db`
    repositories directly from `app/` to keep the route thin
    (`code-standards.md` "Next.js": "Route handlers ... call one application
    service"), even though this is a Server Component page, not a route
    handler. Falls back to the owner's first project (by `listProjectsByOwner`'s
    newest-first order) when no project is requested, or the requested one is
    unknown/not owned — a deep-link fallback, not a new error state.
  - **Components** (`components/engineering/`): `StatusBadge` (maps
    `CheckStatus | "not_configured"` to an icon+color+label pair — colour is
    never the only signal, per ui-context.md; warning and stale intentionally
    share `--state-stale`, matching the Colors table), `EmptyState`,
    `ModuleStatusSummary`/`summarizeModuleStatuses` (pure tally over the
    assembly tree, reusing `lib/engine/trace`'s own `overallCheckStatus`
    severity ordering for the "worst status" rather than re-deriving it),
    `AppBar`, `ContextActionBar`, `MachineNavigator`, `WorkspaceCanvas`,
    `StatusBar`, composed by `WorkspaceShell`. `WorkspaceShell`'s prop type is
    a `{status: "empty"} | {status: "loaded", ...}` discriminated union
    mirroring `WorkspaceView` — deliberately not nullable fields, so no
    non-null assertion is needed downstream (`code-standards.md`: "Avoid
    non-null assertions unless an invariant is locally proven" — the union
    makes the proof a type-level fact instead).
  - **Real design decisions, not just implementation**: (1) the navigator's
    project/configuration pickers are real `<Link>`s to
    `?project=`/`?configuration=`, not client state — deep-linkable, survives
    a reload, matches `ui-ux-pro-max`'s `deep-linking` guidance. (2) Navigator
    collapse is instant (conditional render), not width-animated — animating
    width is explicitly forbidden by ui-context.md's Motion section ("Do not
    animate layout properties"). (3) Assembly rows are the tree's only
    interactive rows (real expand/collapse via shadcn `Collapsible`); module-
    instance rows and the static Requirements/BOM/Reports section are
    informational-only, not styled as clickable, since nothing they would
    open exists yet (Units 3.6/3.7, Milestone 5) — avoids the "looks
    tappable but does nothing" anti-pattern. (4) The status bar's "stale
    count" field is a fixed placeholder, not a fabricated number: staleness
    lives on `CalculationRun`/`ComponentAssignment`, one read hop past what
    this unit loads (computing it would mean an extra per-module-instance
    read fanned out from this unit, more scope than "render the tree"), and
    is deferred to Unit 3.5 (the result/trace renderer that actually owns
    "Stale banner"). "Unit display profile" is likewise a fixed label ("SI
    (canonical)") — there is no persisted, user-configurable display-unit
    profile anywhere in the schema yet. All of this is recorded in
    `ui-context.md`'s "Application Shell" section, not only here.
  - **Real testing-infrastructure bug found and fixed**: the new component
    tests (multiple `it` blocks calling `render()` in one file) failed with
    "found multiple elements" — DOM from one test was still present in the
    next. Root cause: `tests/setup.ts` never registered Testing Library's
    `cleanup()`, and `vitest.config.ts` deliberately does not set
    `test.globals: true` (every file explicitly imports from `"vitest"`), so
    Testing Library's own auto-cleanup — which detects a *global* `afterEach`
    — never fired. Every prior RTL test file (`app/page.test.tsx`) happened
    to have exactly one `it` block, so this was never visible before. Fixed
    with one line, `afterEach(cleanup)`, added to `tests/setup.ts` — applies
    to every future test file, jsdom or not (a no-op without a DOM).
  - **Tests**: `lib/application/projects/load-workspace-view.test.ts` (4
    live-DB tests — empty owner, default-to-newest-project selection,
    explicit selection, fallback on an unknown/foreign id — proves this
    unit's literal exit criterion, "Database-backed project tree renders for
    the authenticated owner," at the data layer) plus 8 new component test
    files (`status-badge`, `empty-state`, `module-status-summary`,
    `workspace-canvas`, `status-bar`, `context-action-bar`,
    `machine-navigator` — including a real expand/collapse interaction via
    `userEvent` — `app-bar`, `workspace-shell`). `next/navigation` and
    `@clerk/nextjs` are mocked in the two component tests that need them
    (`app-bar`, `workspace-shell`) since jsdom has no App Router/Clerk
    runtime context.
  - **What could not be verified on this dev machine (same standing
    constraints as every prior UI-adjacent unit this session, not new
    ones)**: no live-in-browser check of the authenticated `/workspace`
    render (empty/loaded states, real interaction) — Clerk still has no
    test-instance credentials anywhere (Unit 0.3's already-open question),
    and launching Chromium for even an unauthenticated screenshot still
    fails with "spawn UNKNOWN" / "blocked by group policy," the identical
    error already documented for Unit 0.3's Playwright work. Confirmed
    instead, as the closest available substitute: the unauthenticated
    redirect (`GET /workspace` → 307 to `/sign-in`) works against a real
    `next dev` server, which also proves every new client component
    (`app-bar.tsx`, `machine-navigator.tsx`, `workspace-shell.tsx`, etc.)
    compiles cleanly under Turbopack's real bundler — a stronger signal than
    `tsc --noEmit` alone, since the redirect throws from inside
    `auth.protect()` only after the whole module graph reachable from
    `workspace/page.tsx` has already been parsed. The authenticated render
    path is otherwise covered only by the RTL component tests above, not a
    real browser.
  - Verified locally: `npm run lint` (0 warnings), `npm run typecheck` (0
    errors), `npm run test` (445/445 passed, up from 417; 136 skipped, up
    from 132 — the 4 new live-DB tests), `npm run build` (Next.js production
    build, `/workspace` correctly dynamic). No `lib/db` schema file touched
    (no migration), so — unlike every Milestone-2-era unit — no CI round
    trip is required before calling this fully verified.

## Next Up — Milestone 4

- **Units 3.1 (workspace shell) and 3.2 (project and assembly management
  UI) are complete** (2026-07-30, same session — see Current Goal) and drop
  off this list. **Milestone 3 (Generic User Experience) is under way.**
  Unit 3.2 shipped create/rename project, create/rename assembly, and
  add-module-instance; two pieces of its literal deliverable list were
  deliberately deferred rather than folded in (see Architecture Decisions
  for the full reasoning on both):
  - **"Reorder assemblies"** — `Assembly` has no position/order column, so
    this needs a migration and is its own future unit (a schema change does
    not travel with a UI unit, the Split Rule Unit 2.7/2.8 already used for
    their own persistence halves).
  - **"Add workflow instance"** — no workflow-definition registry exists
    yet (`lib/workflows/` is not built; Unit 4.8 is the first thing that
    would create one), so there is nothing real for a picker to list.
    Revisit once a workflow registry exists — most likely alongside Unit
    4.8, not as a standalone UI-only unit before there is a real
    definition to instantiate.

  **Unit 3.3 (generic module input renderer) is complete** (2026-07-31, new
  session — see Current Goal) and drops off this list. Curve-field editing
  and `vector_quantity` editing remain explicitly deferred (see Current Goal
  and `ui-context.md` "Generic Module Workspace") until a released curve
  contract exists and a real module needs either.

  **Unit 3.4 (link suggestion UI) is complete** (2026-07-31, same session —
  see Current Goal) and drops off this list. It reused `confirmParameterLink`
  exactly as the RESOLVED note below required — the suggestion read model
  pre-filters candidates for usability (via Unit 1.8's `suggestSources`), but
  `confirmParameterLink` alone still authorizes every write.
  - **RESOLVED (2026-07-30 hardening pass), superseding the deferral below:**
    semantic link compatibility is now enforced by `confirmParameterLink` in
    `lib/application/parameters/`, alongside declared-port verification and
    both-endpoint configuration scoping. Unit 3.4's suggestion UI must reuse
    that service; it may pre-filter candidates for usability, but the server
    boundary is what makes a link safe. The original deferral (kept for the
    record): compatibility gating was to live only in the suggest-and-confirm
    flow, because it needs both endpoints to be registered canonical
    parameters plus the approved-mapping set. That reasoning was sound about
    *what* the check needs and wrong about *where* it belongs — a UI-only
    gate leaves the write path open. (This decision is permanently recorded
    in `context/progress-tracker.md` Architecture Decisions, "2026-07-30
    hardening pass — Semantic link compatibility belongs to the application
    service, not the suggestion UI"; restated here because it directly
    governs Unit 3.4's design.)

  **Unit 3.5 (generic result and trace renderer) is complete** (2026-07-31,
  same session — see Current Goal) and drops off this list. It closed the
  "Run module" gap both Unit 3.3 and Unit 3.4 deliberately left for it,
  compares only the two most recent runs of a module instance (not a
  user-selectable pair — see Current Goal), and leaves "Assigned
  manufacturer part and stale state" and the status-bar's tree-wide "stale
  count" for Unit 3.6 and beyond (see Current Goal's Scope note).

  **Unit 3.6 (catalog matching and assignment UI) is complete** (2026-07-31,
  new session — see Current Goal) and drops off this list. It closed
  `ui-context.md`'s Result-pane "Assigned manufacturer part and stale state"
  bullet that Unit 3.5 deferred here. Its candidate-table/ranking half is
  built but reports `matchingAvailable: false` for every module today, by
  design: no registered module declares a `catalogAdapter`, and the
  `requiredSpec()`-to-`MatchCriterion` operator mapping is Unit 2.8's
  recorded Milestone 4 deferral, deliberately not invented in a UI unit.

  **Unit 3.7 (requirements, assumptions, and load-case UI) is complete**
  (2026-07-31, new session — see Current Goal) and drops off this list. It
  built the `lib/application/requirements/` boundary from scratch (four
  write services plus `loadRequirementsView`), made the Requirements
  navigator row a real deep link, and settled "verification status" as
  authoring-completeness only (acceptance criteria recorded or not) —
  a real requirement-to-run link is Milestone 5's Unit 5.3 to build.

  **Unit 3.8 (baseline and comparison UI) is complete** (2026-07-31, new
  session — see Current Phase) and closes Milestone 3. It reuses the existing
  atomic `createBaseline`/`compareBaselines` services through a new
  configuration-level read model; readiness remains advisory until the
  creation service rechecks it inside its transaction. Baseline output/check
  detail comes from the stored run snapshots referenced by two immutable
  baseline snapshots, with stable port-key fallback labels rather than a
  recalculation or current module-package dependency.

  **Next: Unit 4.1 — Axis application and load-case module.** Begin the
  first production engineering module only after reading its implementation
  map and validation gate. It owns orientation/incline, payload/moving mass,
  center-of-mass offsets, external forces/moments, friction, duty cycle,
  load cases, and derating inputs; it must make coordinate frames and sign
  conventions explicit in the trace/report and validate horizontal and
  vertical historical cases before release.

## Open Questions

- **RESOLVED (2026-07-31, new session — see Current Goal, Unit 3.3):** the
  read-model half of this blocker is closed by the new
  `loadModuleWorkspaceView` application service, which exposes resolved
  input source/value/link provenance and a fully-described field (unit/enum-
  options/etc.) per port. The curve-contract half is not closed — it is
  explicitly deferred, per the user's own decision (asked via
  `AskUserQuestion` rather than guessed): Unit 3.3 ships quantity/enum/
  boolean editing, source badges, load-case context, grouping/help text, and
  inline validation; curve fields (and `vector_quantity` fields, deferred for
  the identical reason) render an honest "not yet editable" notice instead of
  an invented editor. Revisit the curve-parameter contract — and this
  deferral — whichever Milestone-4 module first declares a curve-typed input
  (the motion-profile module, Unit 4.2, is the most likely candidate given
  `implementation-map.md`'s "Position/velocity/acceleration curves" output).
  Original blocker text, kept for the record: the implementation map requires
  a curve editor for supported motion inputs, but released parameter-registry
  v1 only permits `quantity`, `vector_quantity`, `enum`, and `boolean` value
  types — no released parameter or registered module declares a `curve`
  input, and `ParameterDefinition` has no metadata describing the curve axes,
  display units, point constraints, or validation semantics a generic editor
  would need.

## Architecture Decisions

- (2026-07-31, Unit 3.8) **A baseline comparison reads the immutable run
  snapshots referenced by the two baseline snapshots; it never re-executes a
  module or reads current module metadata to fill historical output/check
  details.** `MachineBaselineSnapshot` intentionally stores run references,
  not duplicate output/check payloads, because `CalculationRun.snapshot` is
  already immutable and permanently renderable. The new read model first
  uses `compareBaselines` for the structural snapshot diff, then loads only
  its selected, owner-scoped stored runs to compare output port keys and check
  IDs. Additions/removals are visible, and check equality includes status,
  values, messages, criteria, and normalized source citations. A missing
  stored run produces an explicit unavailable-detail notice rather than an
  invented recalculation. Revisit only if baseline snapshot format changes
  to embed run payloads in a future compatibility version.
- (2026-07-31, Unit 3.7) **"Verification status" reports only whether a
  requirement has recorded acceptance criteria — not whether a calculation
  run demonstrates it — and no `VerificationLink` model was added.**
  `architecture.md`'s domain model names a `VerificationLink` class under
  "Design intent," but Unit 2.2 never built it, and Milestone 5's
  "Requirements verification matrix" (Unit 5.3) is the roadmap unit that
  actually needs a real requirement-to-run link. Building it now would
  combine a Prisma schema change with a UI unit (the Split Rule,
  `ai-workflow-rules.md`), and deciding which run or check satisfies which
  requirement is engineering judgment no released contract records — the
  same shape of gap Unit 3.6 hit with `CatalogAdapter.requiredSpec()`'s
  missing comparison operator. `loadRequirementsView` computes
  `verificationStatus: "criteria_defined" | "no_criteria_yet"` from data
  that already exists, and the panel states the limitation via a fixed
  info notice rather than implying a requirement is "verified" when
  nothing has actually checked it. Revisit at Unit 5.3, which owns the
  real link.
- (2026-07-31, Unit 3.6) **The catalog matching UI reports
  `matchingAvailable: false` rather than deriving `MatchCriterion`s from a
  module's `requiredSpec()`.** Ranking and hard filtering need a comparison
  operator per attribute; `CatalogAdapter.requiredSpec()` supplies none, and
  Unit 2.8 part 1 already recorded that building criteria from it belongs to
  "whichever later unit first wires a real production module's catalog
  adapter to this engine (Milestone 4)" — because the operator is real
  engineering judgment (capacity floor vs. size ceiling vs. identity match),
  not a mechanical transformation. Two alternatives were considered and
  rejected: (a) inferring operators heuristically in the read model, which
  invents engineering behavior in a UI layer, and (b) extending
  `CatalogAdapter` to carry operators, which changes a released SDK contract
  and would force `lib/engine` to import `lib/catalog`'s `MatchCriterion`,
  something that interface's own TSDoc deliberately avoids. The panel
  therefore states why matching is unavailable (no adapter / no run yet / no
  comparison rules yet) and keeps manual/custom-part assignment fully
  functional. Revisit at the first Milestone 4 module that declares a real
  catalog adapter — that unit owns the operator mapping, and this UI
  activates with no change to the component.
- (2026-07-31, Unit 3.6) **One `assignComponentAction` serves both the
  catalog and manual assign forms.** `partSource` already discriminates the
  payload, mirroring the `AssignComponentInput` union `assignComponent`
  (Unit 2.8) declares — two near-identical actions differing only in which
  three fields they read would be duplication, not clarity. The action
  validates only what shaping requires; authorization, the target/run
  cross-check, and part-revision existence stay in the application service,
  reused unchanged.
- (2026-07-31, Unit 3.5) **Previous-run comparison is fixed to the latest
  run against the run immediately before it — not a user-selectable pair.**
  `implementation-map.md`'s "Comparison with previous run" is singular; a
  picker over a module instance's whole run history is a materially larger
  feature (its own UI, its own read model shape) that no deliverable list
  names. `loadModuleResultView` diffs outputs by port key
  (`engineeringValuesEqual`) and checks by check `id` (status only); a
  check present in only one of the two runs — e.g. after a module version
  upgrade changed its check set — is silently excluded from the diff rather
  than guessed at, since matching checks across module versions by id
  alone would be a real correctness risk. Revisit only if a real workflow
  needs to compare two arbitrary runs, not just consecutive ones.
- (2026-07-31, Unit 3.5) **The Result pane stacks below the Input pane in
  one scrollable column; the two are not a side-by-side split.**
  `ui-context.md`'s "Two primary panes" wording does not mandate a layout,
  and no prior unit built a resizable-pane primitive. Building one for this
  unit alone — on a dev machine that still cannot verify a real-browser
  layout — would be new UI infrastructure the deliverable list does not
  ask for. Revisit if a real user session shows the stacked layout is hard
  to use with a tall trace.
- (2026-07-30, Unit 3.2) **A `MachineProject` always gets exactly one
  auto-created initial `MachineConfiguration`, in the same transaction, with
  a fixed name ("Working configuration").** Unit 3.2's own deliverable list
  ("Create/rename project, Create/rename/reorder assemblies, ...") never
  names a separate "create a configuration" step, yet `Assembly` requires a
  `configurationId` — without this decision, "create project" alone could
  not satisfy Unit 3.2's exit criterion ("User can build a machine hierarchy
  without direct database access") at all. Supported by how
  `architecture.md`'s own domain-model framing already treats
  `MachineConfiguration` as the draft/working state a baseline is later cut
  from (`lib/configuration`'s "draft configurations, immutable baselines"),
  not a thing a user consciously names up front — and by
  `project-overview.md`'s Guided Design Flow narrative, which goes straight
  from "User creates a machine project" to "User creates an assembly or
  axis" with no configuration step in between. If multi-configuration
  variants become a real user-facing feature later (Milestone 2.9/3.8's
  baseline machinery already supports many configurations per project at
  the data layer), that is an *additive* UI unit — a way to create a
  *second* configuration — not a reversal of this one.
- (2026-07-30, Unit 3.2) **A module instance can only be created from a
  package actually present in `lib/modules`'s generated registry; "add
  workflow instance" is not built at all.** Mirrors the reasoning
  `confirmParameterLink` already applies one level down (a link's endpoints
  must be ports the pinned package actually declares) applied here to the
  package itself — `addModuleInstance` looks the requested id+version up via
  `getModulePackage` and rejects (`module_not_found`) rather than trusting
  the caller's strings. The asymmetry with "add workflow instance" is
  deliberate, not an oversight: `lib/workflows/` does not exist yet (Unit
  4.8 is the first thing that would create a real workflow definition), so
  there is no registry to validate a workflow id+version against the way
  `getModulePackage` validates a module. A free-text `workflowId`/
  `workflowVersion` form was considered and rejected — `WorkflowInstance`
  rows with no backing definition would be worse than the feature not
  existing yet. Revisit once a workflow-definition registry exists.
