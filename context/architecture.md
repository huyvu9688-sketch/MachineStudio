# Architecture Context

## Stack

| Layer | Technology | Role |
| --- | --- | --- |
| Framework | Next.js App Router + TypeScript | Full-stack application |
| UI | Tailwind CSS + shadcn/ui | Generic engineering workspace |
| Auth | Clerk | Sign-in and user identity |
| Database | Prisma + PostgreSQL | Projects, graph, runs, catalog, baselines |
| Validation | Zod | Boundary and schema validation |
| Engine | Pure TypeScript packages | Units, values, module execution, graph |
| Reports | HTML + print CSS | Calculation packages and BOM output |
| Tests | Vitest + Testing Library + Playwright | Unit, contract, UI, and E2E verification |

The initial deployment is a modular TypeScript monolith. The calculations
are mostly deterministic closed-form engineering methods and do not
justify a separate Python service at the start. Domain boundaries must
remain explicit so a specialized solver service can be introduced later
without changing module contracts or stored run snapshots.

## Target File Structure

```text
app/
components/
  engineering/
  ui/
lib/
  application/
  audit/
  catalog/
  configuration/
  db/
  engine/
    graph/
    mechanics/
    module-sdk/
    parameters/
    trace/
    units/
    values/
  logging/
  modules/
  reports/
  requirements/
  standards/
  workflows/
prisma/
context/
validation/
```

## System Boundaries

### `lib/engine/`

Generic deterministic calculation infrastructure only:

- Engineering value types
- Unit definitions and conversion
- Canonical parameter registry
- Module SDK and conformance rules
- Calculation trace primitives
- Module execution
- Dependency graph resolution
- Generic rigid-body mechanics (`lib/engine/mechanics/`, Unit 6.1) — mass
  moment of inertia for standard shapes and `Ta = J*alpha`, bare-SI-number
  functions consumed by module math kernels below the
  `EngineeringValue`/`Quantity` boundary. Genuinely source-independent
  physics (no manufacturer method disagreement, the same "ordinary physics"
  category `drive-train@0.1.0`'s own `resolveRegenEnergy` doc comment
  already used for `E = J*omega^2/2`) lives here so every module depends on
  one audited implementation instead of reproducing it — see
  `context/adr/0011-motor-sizing-tool-architecture.md` "Reuse policy" and
  `lib/engine/mechanics/README.md`. Mechanism-specific load-torque formulas
  and motion-profile kinematics are not generic in this sense and stay
  module-owned, reproduced per module rather than shared.

It imports nothing from `app`, `lib/db`, network clients, authentication,
or catalog persistence.

### `lib/modules/`

Versioned calculation packages. Each package contains its own manifest,
compute logic, checks, trace construction, generic UI schema, report
schema, validation record, tests, and optional catalog adapter.

Released versions are immutable. A module package cannot query the
database or network during computation.

### `lib/workflows/`

Guided engineering workflows that coordinate compatible modules without
combining their compute logic. A workflow declares:

- Required and optional module IDs
- Module sequence
- Initial parameter-link proposals
- Completion rules
- Workflow-level checks
- Candidate system comparison rules

The first workflow is `linear-axis@1` (Unit 4.8,
`lib/workflows/linear-axis/1.0.0/`; contract in
`lib/workflows/workflow-sdk/`; see ADR-0007).

A workflow definition exports one `WorkflowDefinition` object, mirroring the
module package's own single-object contract:

```ts
interface WorkflowDefinition {
  manifest: WorkflowManifest;               // stable ID, version, title, description
  roles: readonly WorkflowModuleRole[];     // id, label, allowed module IDs, cardinality
  sequence: readonly (readonly string[])[]; // ordered dependency levels of role IDs
  linkRules: readonly WorkflowLinkProposalRule[];
  completionRules: readonly CompletionRule[];
  checkRules: readonly WorkflowCheckRule[];
  comparisonCriteria: readonly CandidateComparisonCriterion[];
}
```

A role names the module IDs allowed to fill it, never a looser category
match. A link-proposal rule names only a canonical parameter ID and a
`fromRole`/`toRole` pair — never a module's own port key — and is resolved
against the real present role instances' ports through the same link-
compatibility evaluator the parameter graph itself uses (Unit 1.8,
`evaluateLinkCompatibility`), so a workflow can never encode hardcoded
field-to-field wiring. `lib/workflows` may depend on `lib/engine` and
`lib/modules`; the reverse is forbidden, the same asymmetry `lib/modules`
already holds toward `lib/engine`. It stays as pure and I/O-free as
`lib/modules` — no `lib/db`, `lib/application`, or `lib/catalog` import —
until an application-layer unit wires a `WorkflowInstance` through it.

### `lib/application/`

Use-case and transaction orchestration:

- Create project, assembly, module instance, and workflow instance
- Save parameter values and confirmed links
- Execute and persist calculation runs
- Propagate stale state
- Import manufacturer parts
- Assign components
- Create baselines
- Generate reports

Route handlers call application services. Business transactions do not
live in route handlers, React components, or raw database query files.

### `lib/catalog/`

Manufacturer part specifications and deterministic matching:

- Component-type schemas
- Manufacturer part revision validation
- CSV import mapping
- Hard filters and transparent ranking
- Compatibility rules
- Required-spec output

There is no company-approved-part layer in the MVP.

### `lib/requirements/`

Machine and assembly requirements, acceptance criteria, assumptions,
load cases, and verification links to calculation runs.

### `lib/configuration/`

Draft configurations, immutable baselines, baseline comparison, and
release labels. A full multi-user approval workflow is deferred.

### `lib/standards/`

Source and US-market-profile metadata:

- Source documents and editions
- Clause references
- Formula references
- Applicability metadata
- Licensing/access notes
- Supersession relationships

The package stores references and implementation metadata, not unlicensed
standards text.

### `lib/reports/`

Renders stored calculation traces and domain records. Reports must not
reimplement formulas.

### `lib/audit/`

Append-only engineering event records.

### `lib/logging/`

Structured, server-only operational logging (Unit 5.5) — one JSON line per
entry (timestamp, level, message, optional context), written to
stdout/stderr for the deployment platform's own log collector to ingest
(ADR-0009: Vercel). This is operational visibility for production
incidents, not the domain audit trail `lib/audit/` owns; it never
substitutes for an `AuditEvent`, and it never receives data destined for an
API response (`code-standards.md` "APIs" forbids exposing a stack trace
there).

### `lib/db/`

Prisma client and persistence adapters. This is the only library boundary
that imports Prisma.

### `app/` and `components/`

Thin routes and generic UI surfaces. Components may format values but
must not perform engineering calculations.

## Engineering Value Model

Module ports use `EngineeringValue`, not bare numbers.

```text
EngineeringValue =
  Quantity
  | VectorQuantity
  | Curve
  | LoadSpectrum
  | TableValue
  | EnumValue
  | BooleanValue
  | MaterialReference
  | ComponentReference
```

All value types are serializable and versioned. Physical values include
canonical-unit data plus explicit display-unit metadata where needed.

## Canonical Parameter Registry

Every parameter definition contains:

- Stable ID, for example `motion.axis.payload_mass`
- Display name and symbol
- Precise engineering definition
- Engineering value type
- Physical dimension and canonical storage unit
- Allowed display units
- Semantic qualifier, such as required/allowable, peak/RMS, static/dynamic
- Direction or coordinate-frame requirement where applicable
- Load-case compatibility
- Valid range and default policy
- Lifecycle state: draft, released, deprecated
- Replacement parameter ID when deprecated

Parameter IDs are never reused for a changed meaning. Similar quantities
are reviewed across existing modules before adding a new definition.

## Module Package Contract

A released module package exports one `ModulePackage` object:

```ts
interface ModulePackage {
  manifest: ModuleManifest;
  ports: ModulePorts;
  inputSchema: ZodSchema;
  compute(input: ModuleInput): ModuleComputation;
  uiSchema: ModuleUiSchema;
  reportSchema: ModuleReportSchema;
  validation: ValidationRecord;
  catalogAdapter?: CatalogAdapter;
}
```

The manifest includes:

- Stable module ID and semantic version
- Package content hash
- Engine SDK compatibility range
- Parameter-registry version
- Module category and tags
- Supported workflow roles
- Validity envelope summary
- Source-reference IDs
- Migration/replacement metadata

`ModuleComputation` returns:

- Output values
- Structured calculation trace
- Check results
- Warnings
- Assumptions used
- Validity-limit results

## Module Consistency Mechanisms

1. Stable canonical parameter IDs
2. Shared EngineeringValue and unit types
3. Module manifest JSON schema
4. Compile-time module registry
5. Automated module conformance suite
6. Module scaffolding command
7. Generic UI and report schema validation
8. Cross-module link compatibility tests
9. Workflow integration tests
10. Released package hashes stored on runs

Adding a new module may add new released parameter definitions and an
optional component schema. It must not require a Prisma schema change
for module-specific inputs, outputs, traces, or catalog attributes.

## Parameter Graph

### Nodes

- Machine requirements
- Assembly parameters
- Workflow-provided parameters
- Module input ports
- Module output ports

### Link Compatibility

A suggested or confirmed link must satisfy:

- Parameter identity or an explicit approved mapping
- Compatible EngineeringValue type
- Compatible physical dimension
- Compatible semantic qualifier
- Compatible load case
- Compatible coordinate frame/direction
- Valid scope and ownership

Compatible units alone are not enough.

### Link Behavior

- Suggestions search the same assembly first, then parent assemblies,
  then machine requirements, then explicit cross-assembly sources.
- A user must confirm every link.
- Cycles are rejected.
- Changes propagate stale state to downstream runs and component
  assignments in the same database transaction.
- Feedback calculations remain inside one module or workflow solver;
  graph cycles are not used for iterative design.

## Core Domain Model

### Project and configuration

- `MachineProject`
- `MachineConfiguration`
- `MachineBaseline`
- `Assembly`
- `WorkflowInstance`
- `ModuleInstance`

### Design intent

- `Requirement`
- `AcceptanceCriterion`
- `DesignAssumption`
- `LoadCase`
- `VerificationLink`

### Calculation

- `ParameterValue`
- `ParameterLink`
- `CalculationRun`
- `CheckResultSummary`

Full traces, values, checks, assumptions, versions, and references are
stored inside the immutable run snapshot. Search-critical summaries are
also normalized into columns.

### Sources and standards

- `SourceDocument`
- `SourceRevision`
- `ClauseReference`
- `MarketProfile`

### Catalog and BOM

- `ComponentType`
- `ComponentSchemaVersion`
- `Manufacturer`
- `CatalogImportBatch`
- `ManufacturerPartRevision`
- `ComponentAssignment`

`ComponentAssignment` is intentionally lightweight. It records the
assigned manufacturer/manual part, target module or assembly, quantity,
and justifying calculation run. It is not an approval workflow.

`BomItem` is not a stored table. It is a computed shape — one flattened
BOM line — generated at read time from a configuration's assembly tree and
its `ComponentAssignment` rows (ADR-0008). A BOM is always as current as
the assignments it is generated from; there is no separate BOM record to
keep in sync or mark stale.

### Audit

- `AuditEvent`
- `ChangeReason`

## Storage Model

### PostgreSQL

Stores:

- Project ownership and configuration hierarchy
- Requirements, assumptions, and load cases
- Module instances, parameters, and links
- Immutable calculation-run snapshots
- Searchable run summaries
- Standards/source metadata
- Manufacturer part revisions and import batches
- Component assignments (a BOM is generated from these, not stored itself —
  ADR-0008)
- Baselines and audit events

Module-specific value payloads and part attributes use versioned JSONB
validated on both write and read. Identity, ownership, revision,
lifecycle, and frequently filtered fields remain relational.

### Blob storage

Stores:

- Uploaded manufacturer datasheets
- Generated PDF reports when PDF support is added
- Large import source files

Blob records include checksum, MIME type, size, upload source, and access
control metadata.

## Calculation Reproducibility

Every run stores:

- Full resolved input snapshot
- Output snapshot
- Trace and checks
- Assumptions and load case IDs
- Engine semantic version and build hash
- Module semantic version and package hash
- Parameter-registry version
- Source-reference IDs and editions
- Validity envelope
- Timestamp and user

Catalog matching or component assignment additionally stores the
manufacturer part revision and import batch used at the time.

## Market Model

The MVP ships two market profiles:

- `US-General-Industrial-Machinery@1`
- `JP-General-Industrial-Machinery@1`

A project selects one primary profile at creation. Profiles are a
reference and applicability layer, not an automatic compliance
certificate. Project-level requirements may extend the profile: state,
local, customer, and Authority Having Jurisdiction requirements in the
US; Labor Standards Inspection Office guidance, customer, and site
requirements in Japan. Profiles beyond the US and Japan are deferred.

Market data is also an engineering-catalog concern, not only a
documentation concern. Japanese projects require 50 Hz (East Japan) or
60 Hz (West Japan) supply data and 200 V class three-phase drive
systems; US projects commonly require 480 V/60 Hz data. Drive, motor,
and transformer part schemas must carry supply voltage and frequency
attributes so catalog filtering can enforce market compatibility.

## Auth and Access

- Every user signs in through Clerk.
- Every project has exactly one owner in the MVP.
- Ownership is enforced on every project-related query and mutation.
- Sharing, organization tenancy, and reviewer permissions are deferred.
- Catalog data has no owner (it is shared, project-independent reference
  data — see "lib/catalog/"). Any authenticated user may write to it, but
  every write is attributed. A role-gated import policy is deferred to the
  same reviewer-permissions work this section already defers.

## Invariants

1. **Engine purity**: module compute functions are deterministic and
   perform no I/O.
2. **Units and value types everywhere**: bare physical numbers never
   cross module boundaries.
3. **Stable semantics**: released parameter IDs and module versions are
   immutable.
4. **No silent binding**: parameter links require explicit confirmation.
5. **Semantic link safety**: unit compatibility alone cannot authorize a
   link.
6. **Acyclic graph**: confirmed parameter links cannot form cycles.
7. **Immutable runs**: corrections create new runs.
8. **Transactional stale propagation**: downstream runs and component
   assignments become stale in the same transaction as the upstream
   change.
9. **Trace-driven reporting**: reports render the stored calculation
   trace and never duplicate formulas.
10. **Catalog provenance**: manufacturer part specifications always carry
    source and revision metadata.
11. **Baseline immutability**: released baselines never change.
12. **No compliance overclaim**: the system reports implemented checks
    and references, not a general legal certification.
13. **Generic extension**: a conforming module does not require changes to
    the core engine, database schema, generic UI, or report renderer.
14. **Thin request handlers**: routes validate, authorize, call one
    application service, and return a typed result.
15. **No long work in request handlers**: imports and report generation
    must be structured so a job runner can be added without redesign.
