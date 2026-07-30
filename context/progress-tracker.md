# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

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

## Current Goal

- Milestone 2 in progress. **Unit 2.5 (stale propagation service) is complete
  and verified in CI on 2026-07-30** — see the Completed entry. **Next work
  unit: Unit 2.6 (manufacturer catalog schema)** — Prisma models for
  `Manufacturer`, `ComponentType`, `ComponentSchemaVersion`,
  `CatalogImportBatch`, `ManufacturerPartRevision`, and datasheet attachment
  metadata, with versioned-attributes JSONB per component type (exit
  criterion: two component types with different attributes coexist without a
  schema change). Then Units 2.7–2.9; Milestone 3 (generic UI) and Milestone 4
  (modules) follow.
  - DEFERRED within Unit 2.5 (documented in
    `lib/application/parameters/stale-propagation.ts`, not a gap to
    silently carry forward): "change an assigned-component feedback input"
    — the implementation map's fourth stale-propagation use case. It needs
    `ComponentAssignment`, which does not exist until Unit 2.8. Revisit
    then — the same `computeStaleImpact` + transactional-mark pattern
    applies once that model exists.
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

Unit 2.5 is done and verified in CI (2026-07-30) and drops off this list.
This session had no local database at all (see Current Goal's 2026-07-30
correction) — CI is the verification path until a future session confirms
local Postgres access again.

1. **Unit 2.6 (manufacturer catalog schema)** — next. Prisma models:
   `Manufacturer`, `ComponentType`, `ComponentSchemaVersion`,
   `CatalogImportBatch`, `ManufacturerPartRevision`, and datasheet attachment
   metadata. Part data per the implementation map: manufacturer + part
   number, source revision + source link, lifecycle state when known,
   versioned attributes JSONB (validated against the component's
   `ComponentSchemaVersion`, same "validate on write and read" convention as
   every other JSONB payload so far), and a data-quality state. Explicit
   exclusions (context/roadmap.md "Explicitly Deferred"): no company
   approval state, no supplier/pricing records, no inventory, no procurement
   workflow. Exit criterion: two component types with different attributes
   coexist without a Prisma schema change — i.e. adding a new component type
   is a new `ComponentSchemaVersion` row, never a migration. Then Units
   2.7–2.9 (CSV import, catalog matching, baseline + audit services).
   Milestone 3 (generic UI) and Milestone 4 (modules) follow.
   - Deferred to the confirm/suggestion flow (NOT Unit 2.2): **semantic link
     compatibility** (`evaluateLinkCompatibility`). Unit 2.2 persists an
     already-confirmed link and rejects cycles (a structural rule independent
     of the registry); compatibility gating — which needs both endpoints to be
     registered canonical parameters plus the approved-mapping set — lives in
     the suggest-and-confirm graph service and the link-suggestion UI (Unit
     3.4), which only offer compatible links to confirm. See Architecture
     Decisions.
   - Deferred to Unit 2.8/2.9 (NOT Unit 2.5): "change an assigned-component
     feedback input" stale-propagation use case — needs `ComponentAssignment`,
     which Unit 2.6 does not create (that is Unit 2.8). Apply the same
     `computeStaleImpact` + transactional-mark pattern Unit 2.5 established
     once that model exists.
2. LATER (deferred): Unit 0.1 — structure ID39 + ID42 into validation
   fixtures once the user has real cases to compare against
3. Downstream parameter groups (screw, guide, coupling, support-bearing,
   drive-train): NOT released in registry v1 — approved pending proposals to
   be released per module at its Stage-2 parameter contract (bumping the
   registry version). See `lib/engine/parameters/README.md` and Open Questions

## Open Questions

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
- `public/ref data/` placement: reference PDFs/screenshots currently sit
  under `public/`, which Next.js serves publicly as static assets (~15 MB
  of third-party training/vendor material). Before any deploy or public
  commit, move these to a non-served location (e.g. `reference/` or
  `tests/fixtures/`) and/or gitignore them — they should not be web-served
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
