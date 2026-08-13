# Code Standards

## General

- Keep files and packages single-purpose
- Fix root causes instead of layering workarounds
- Do not mix engine, module, catalog, persistence, application, and UI
  concerns
- Prefer explicit duplication over premature abstraction
- All released engineering behavior is versioned and immutable
- Engineering correctness and traceability outrank implementation speed

## TypeScript

- Strict mode throughout; no `any`
- Use `unknown` with explicit narrowing at boundaries
- Avoid non-null assertions unless an invariant is locally proven
- Prefer discriminated unions for engineering values and result states
- Exhaustive switches must use a `never` check
- Public domain interfaces require TSDoc comments
- Stable identifiers use branded string types where practical

## Validation

Use Zod at every external or persistence boundary:

- API request bodies and query parameters
- Environment variables
- CSV import rows
- Catalog JSONB reads and writes
- Stored calculation snapshots
- Module manifests, UI schemas, and report schemas

Never trust JSONB only because the application originally wrote it.

## Engineering Values and Units

- Module interfaces accept and return `EngineeringValue`, never a bare
  physical `number`
- Canonical storage units are defined in the parameter registry
- Display-unit conversion occurs only through the unit package
- Never infer force from mass or mass from force
- Angles, ratios, percentages, efficiency, counts, and cycles use
  explicit semantic types or tags
- Temperature conversions must support affine units correctly
- All values must serialize and deserialize without semantic loss

## Canonical Parameters

Before adding a parameter:

1. Search existing definitions and related modules
2. Confirm the exact engineering meaning
3. Define stable ID, name, symbol, value type, dimension, canonical unit,
   qualifiers, coordinate/load-case requirements, and valid range
4. Document overlap analysis
5. Add parameter contract tests
6. Release a new registry version

Never change the meaning of a released parameter ID. Deprecate and
replace it.

## Module Packages

- Modules live under `lib/modules/<module-id>/<version>/`
- A released version is never edited
- Each package exports the standard `ModulePackage` contract
- Compute functions are pure and deterministic
- Compute functions return the calculation trace used by reports
- Formula and check steps reference source IDs and method IDs
- Module code cannot import app, database, authentication, file storage,
  or network packages
- A released version's source files are pinned by a source-immutability
  hash (`runModuleConformance`'s `source-immutability` check,
  `npm run module:source-hash`) recorded in the module's own test file —
  `packageContentHash` alone cannot detect an in-place edit to `compute`
- Module-specific persisted data must fit the generic versioned snapshot
  schemas; do not add a database column for one module
- Custom UI is an exception requiring an ADR

## Module Testing

Each released module requires:

- Reference example tests with explicit tolerances
- Invalid-input and boundary tests
- Unit/dimension tests
- Serialization round-trip tests
- Property or monotonicity tests where physically valid
- Independent benchmark comparison
- Trace snapshot tests for stable step IDs
- Module conformance suite
- Cross-module link tests
- Guided-workflow integration tests when applicable

Numerical comparisons must use engineering tolerances, not arbitrary
string equality.

## Calculation Trace

- Reports render the trace returned by computation
- Stable trace step IDs are required
- A trace step includes inputs, expression/method ID, output, source
  references, and optional notes
- Do not duplicate formula logic in UI or report code
- Trace changes that alter engineering meaning require a module version
  change

## Checks and Status

Use separate states:

- `pass`
- `fail`
- `warning`
- `not_applicable`
- `invalid_input`

Warnings never convert a failed requirement into a pass. Every check has
an ID, message, observed value, criterion, source, and severity.

## Catalog

- Manufacturer part specifications are versioned and source-backed
- Manufacturer part identity, revision, source, and lifecycle fields are
  relational
- Component-specific attributes are versioned JSONB validated against a
  component schema version
- Imports are idempotent by manufacturer, part number, source revision,
  and import mapping
- Ranking is deterministic and exposes score reasons
- Hard constraints run before ranking
- The MVP has no company-approved-part workflow
- A component assignment references an exact manufacturer part revision
  or an explicit manual/custom part record
- Catalog data is shared and project-independent, so it has no owner to
  authorize against; any authenticated user may import a catalog batch, but
  every import is attributed (`CatalogImportBatch.importedByUserId`,
  required, not client-suppliable — a service parameter, not an input
  field). A stricter, role-gated import policy needs a role/reviewer
  concept the MVP does not have (`architecture.md` "Auth and Access")

## Standards and Sources

- Store source metadata, editions, clause references, and access notes
- Do not copy licensed standards text without permission
- Do not label a result generally compliant; state the exact implemented
  check and reference
- Source revisions used by released modules are immutable references

## Application Services

- Multi-step use cases live in `lib/application`
- Database transactions are opened at the application-service boundary
- Calculation execution, run storage, stale propagation, assignment
  updates, and audit creation must be atomic when part of one use case
- Application services depend on ports/interfaces, not route objects

## Next.js

- Default to Server Components
- Add `use client` only where interaction requires it
- Route handlers validate, authorize, call one application service, and
  return a typed response
- React components do not calculate engineering results
- Server Actions follow the same validation and ownership rules as API
  routes

## APIs

- Success envelope: `{ data }`
- Failure envelope: `{ error: { code, message, details? } }`
- Error codes are stable and documented
- Never expose stack traces or internal database identifiers that are not
  part of the public contract
- Use idempotency keys for large imports and retryable write operations
  when introduced

## Database and Migrations

- Prisma is imported only from `lib/db`
- Applied migrations are never edited
- Every schema change includes migration and persistence tests
- Immutable records are protected by service rules and database
  constraints where practical
- Store timestamps in UTC
- Use transactions for stale propagation and baseline creation

## Security

- Enforce authentication and project ownership on every project read and
  mutation
- Validate uploaded file type, size, and checksum
- Never execute imported formulas or user-uploaded code
- Escape user-provided report content
- Record security-relevant mutations in the audit log

## Logging

- Use `lib/logging`'s `logger` for server-side operational visibility, not
  a bare `console.*` call
- Log unexpected/unhandled failures at a boundary (a route handler's outer
  catch, a health check) — not every typed `{ ok: false }` domain result,
  which is an expected, already user-facing outcome, not an incident
- Never put a raw error object, stack trace, or caught value straight into
  a log call; normalize it with `normalizeError` first
- A log entry's `context` is for operational fields (route, IDs, a
  normalized error) — never a raw request body, credential, or full
  `EngineeringValue` payload
- Structured logs are operational, not a substitute for `lib/audit`'s
  append-only engineering event trail

## UI and Styling

- Use design tokens from `ui-context.md`
- No hardcoded colors in components
- State color is always paired with text or icon
- Numerical fields use tabular figures and show units
- Forms expose source, validity, and stale state clearly

## File Organization

- `app/` — routes, layouts, and thin handlers
- `components/engineering/` — generic engineering UI
- `components/ui/` — generated shadcn components; protected
- `lib/application/` — use cases and transactions
- `lib/engine/` — generic calculation infrastructure
- `lib/modules/` — versioned module packages
- `lib/workflows/` — guided workflow definitions
- `lib/catalog/` — manufacturer data and matching
- `lib/requirements/` — requirements and load cases
- `lib/configuration/` — baselines and comparisons
- `lib/standards/` — source and market metadata
- `lib/reports/` — trace-driven rendering
- `lib/audit/` — audit event definitions
- `lib/logging/` — structured operational logging
- `lib/db/` — persistence adapters
- `prisma/` — schema and migrations
- `context/` — product and implementation specifications
- `validation/` — validation templates and evidence indexes
