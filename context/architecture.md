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
    module-sdk/
    parameters/
    trace/
    units/
    values/
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

The first workflow is `linear-axis@1`.

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
- `BomItem`

`ComponentAssignment` is intentionally lightweight. It records the
assigned manufacturer/manual part, target module or assembly, quantity,
and justifying calculation run. It is not an approval workflow.

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
- Component assignments and BOM items
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
