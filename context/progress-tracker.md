# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 0A — Evidence and Specification Baseline (evidence fixtures still
  outstanding)
- Phase 0B — Repository and Quality Foundations: repository
  initialization completed 2026-07-28, out of the roadmap's normal
  sequence (see Session Notes)
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
  1's generic-engine units (1.1–1.8) are now all complete.** Unit 0.4 remains
  partially open — Prisma client generation is still blocked (see Open Questions)

## Current Goal

- Milestone 1 (generic engineering engine) is functionally complete: Units
  1.1–1.8 are done. The remaining not-yet-satisfied item on the roadmap's
  "Definition of Project Ready for First Production Module" is
  calculation-run persistence (Milestone 2), which needs the database. Next
  unblocked, no-DB work: Unit 0.5 (ADR and validation structure). Milestone 2
  (Prisma schema + persistence + application services) is blocked until
  `prisma generate` runs on a network without the corporate TLS interception
  (or an authorized CA-trust change), which also gates finishing Unit 0.4
  (`lib/db/client.ts`, DB health check) (see Open Questions)

## Completed

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

Unblocked engine units are listed first; Unit 0.4 stays blocked on the
corporate-network Prisma issue (re-confirmed 2026-07-28, see Open Questions).

1. Unit 0.5: install ADR and validation structures (context files already
   in `context/`; add `context/adr/` with the ADR-0001..0005 records for
   decisions already made, an ADR template, and `validation/` templates). No
   network/DB dependency — the last unblocked non-DB unit
2. Milestone 2 (Prisma persistence + application services, Units 2.1–2.9):
   BLOCKED on the database. Needs `prisma generate` to run first (corporate TLS
   interception, see Open Questions). This is the remaining gap in the roadmap's
   "Definition of Project Ready for First Production Module" (calculation-run
   persistence). Milestone 3 (generic UI) and Milestone 4 (modules) follow
3. Finish Unit 0.4 (BLOCKED): unblock `prisma generate` on a different
   network, or via an authorized CA-trust change, then `lib/db/client.ts`
   and the database health check
4. LATER (deferred): Unit 0.1 — structure ID39 + ID42 into validation
   fixtures once the user has real cases to compare against
5. Downstream parameter groups (screw, guide, coupling, support-bearing,
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
  corporate proxy needs to allowlist them
- shadcn/ui was configured by hand (Radix + "new-york" style) instead of
  via `npx shadcn init`, since that command's live init endpoint was
  unreachable; confirm the style/base choice once the CLI is reachable,
  in case the newer default preset ("base-nova") is preferred
- The npm registry is pinned to `https://registry.npmjs.org/` via a
  committed project `.npmrc`, because the machine's configured mirror
  (`registry.npmmirror.com`) blocked a large binary download outright
  (a DLP "File Transfer Blocked" response, not a transient failure)
- No `prisma generate`/`migrate` has been run against a real database
  yet; `lib/db/generated/prisma` does not exist until that happens. This
  now blocks finishing Unit 0.4 (`lib/db/client.ts`, database health
  check). Confirmed the CLI fails on the schema-engine binary download
  regardless of subcommand (`init`, `generate`), always the same
  corporate TLS interception. Options for whoever picks this up: (a) run
  `prisma generate` from a network without that interception and commit
  the result, (b) ask IT to allowlist `binaries.prisma.sh`, (c)
  explicitly authorize extending Node's CA trust on this machine to the
  already-OS-trusted corporate root CA for Prisma CLI invocations only
  (narrower than disabling TLS verification, but still a security-review
  decision — not done unilaterally), or (d) leave Unit 0.4 partially
  open and continue with Unit 0.5 / Milestone 1 units that don't need
  Prisma client generation. RE-CONFIRMED 2026-07-28: reran `prisma
  generate`, same failure (`binaries.prisma.sh` .../schema-engine.exe.gz
  → "self-signed certificate in certificate chain"). User was asked and
  chose option (d): defer Unit 0.4 and proceed with Unit 1.1. Option (c)
  (`NODE_EXTRA_CA_CERTS` → the OS-trusted corporate root CA, Prisma CLI
  only) remains the narrowest way to unblock in-place and needs explicit
  user authorization before use

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
