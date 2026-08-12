# Detailed Implementation Map

## Purpose

This map converts the product and architecture specifications into small,
verifiable implementation units. Execute units in order unless a unit is
explicitly marked as parallel research.

Do not implement production engineering formulas until the generic
platform contracts they depend on are complete.

## Delivery Rules

For every work unit:

1. Confirm dependencies and exit criteria
2. Update or create tests first when practical
3. Implement only the named boundary
4. Run lint, typecheck, relevant tests, and build
5. Update `progress-tracker.md`
6. Commit with the work-unit ID in the message

Suggested branch/commit format:

- Branch: `unit/0.1-repo-scaffold`
- Commit: `feat(0.1): scaffold application repository`

## Target Repository Structure

```text
app/
  (auth)/
  (workspace)/
  api/
components/
  engineering/
  ui/
lib/
  application/
    calculations/
    catalogs/
    configurations/
    projects/
    reports/
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
tests/
  e2e/
  fixtures/
```

# Milestone 0 — Evidence and Repository Foundation

## Unit 0.1 — Create engineering evidence fixture set

### Goal

Collect representative source cases before formulas are implemented.

### Deliverables

- `tests/fixtures/axes/axis-horizontal-basic/`
- `tests/fixtures/axes/axis-vertical/`
- `tests/fixtures/axes/axis-long-stroke-high-speed/`
- For each fixture:
  - Original inputs
  - Existing spreadsheet result
  - Vendor sizing result when available
  - Final selected parts
  - Known design issues or corrections
  - Source documents and revisions

### Rules

- Remove customer-confidential identifiers from reusable fixtures
- Record unknown assumptions rather than inventing them
- Preserve original units and also provide normalized values

### Exit Criteria

- Three axis cases cover horizontal, vertical, and critical-speed or
  buckling-sensitive behavior
- Every planned MVP module has at least one case that exercises it

**Status: partially met, still open.** Two of three cases exist
(`tests/fixtures/axes/axis-horizontal-basic/` — ID39, horizontal;
`tests/fixtures/axes/axis-vertical/` — ID42, vertical), and both were
accepted as `0.1.0-release-candidate` evidence for Unit 4.1's release
(2026-08-11 — see that unit's own "Gate" below). The third
long-stroke/high-speed, critical-speed-or-buckling-sensitive case does not
yet exist; it was explicitly decoupled from Unit 4.1's release and remains
this unit's own open exit criterion, needed when a real project exists —
never fabricated or replaced by a synthetic fixture.

## Unit 0.2 — Initialize repository

### Dependencies

- None

### Deliverables

- Next.js App Router project
- TypeScript strict configuration
- Tailwind CSS
- shadcn/ui initialization
- Package manager lockfile
- Node version pin
- `.editorconfig`
- `.env.example`
- Project README with local startup commands

### Verification

- Development server renders a placeholder page
- Production build succeeds
- No TypeScript errors

## Unit 0.3 — Add quality toolchain

### Deliverables

- ESLint
- Formatter
- Vitest
- React Testing Library
- Playwright
- Coverage configuration for engine and modules
- Scripts:
  - `lint`
  - `typecheck`
  - `test`
  - `test:watch`
  - `test:e2e`
  - `build`
  - `verify`

### CI

Run on pull request and main branch:

1. Install with lockfile enforcement
2. Lint
3. Typecheck
4. Unit/contract tests
5. Build
6. E2E smoke test when database services are available

### Exit Criteria

A deliberately failing lint, type, test, or build step blocks CI.

## Unit 0.4 — Configure database and authentication skeleton

### Deliverables

- Prisma initialization
- PostgreSQL local development configuration
- Clerk integration
- Authenticated workspace route
- Environment schema validation
- `lib/db/client.ts`

### Scope Limit

Do not create the full domain schema yet.

### Exit Criteria

- Authenticated user can access the empty workspace
- Unauthenticated user is redirected
- Database health check passes

## Unit 0.5 — Add documentation and ADR structure

### Deliverables

- Copy context files into `context/`
- `context/adr/README.md`
- ADR template
- `validation/module-validation-template.md`
- `validation/source-index.md`

### Initial ADRs

- ADR-0001: modular TypeScript monolith
- ADR-0002: immutable calculation runs
- ADR-0003: module package contract
- ADR-0004: canonical SI storage with flexible display units
- ADR-0005: manufacturer specifications plus lightweight assignment

### Exit Criteria

The repository read order in `CLAUDE.md` matches the actual paths.

# Milestone 1 — Generic Engineering Engine

## Unit 1.1 — Define EngineeringValue contracts

### Deliverables

Discriminated union definitions for:

- `Quantity`
- `VectorQuantity`
- `Curve`
- `LoadSpectrum`
- `TableValue`
- `EnumValue`
- `BooleanValue`
- `MaterialReference`
- `ComponentReference`

Include:

- Zod schemas
- Serialization format version
- Runtime type guards
- Equality helpers suitable for tests

### Initial Scope

Fully implement Quantity, Curve, EnumValue, and BooleanValue. Other types
may begin as validated contracts if no Phase 1 module executes them yet.

### Tests

- Round-trip serialization
- Invalid discriminators
- Missing units
- Non-finite numbers
- Version mismatch

### Exit Criteria

No physical module API needs a bare number.

## Unit 1.2 — Build unit registry and conversion engine

### Deliverables

- Dimension vector model
- Unit registry
- Multiplicative conversion
- Affine conversion for temperature
- Composite units
- Quantity arithmetic with dimension checks
- Formatting and significant-figure helpers

### Initial Units

- Length: m, mm, cm, in, ft
- Time: s, min, h
- Mass: kg, g, lbm
- Force: N, kN, lbf
- Torque: N*m, N*mm, lbf*in, lbf*ft
- Speed: m/s, mm/s, in/s, rpm
- Acceleration: m/s^2, mm/s^2, in/s^2
- Angular quantities: rad, deg, rad/s, rad/s^2
- Power: W, kW, hp
- Pressure: Pa, kPa, MPa, bar, psi
- Inertia: kg*m^2 and supported engineering display forms
- Temperature: K, degC, degF
- Frequency: Hz
- Dimensionless: ratio, percent, efficiency

### Tests

- Published conversion cases
- Round-trip conversions
- Invalid dimension arithmetic
- Mass versus force rejection
- Temperature affine cases
- Composite-unit simplification

### Exit Criteria

Unit tests are exhaustive enough that module code never performs manual
conversion constants.

## Unit 1.3 — Canonical parameter registry v1

### Deliverables

- Parameter definition schema
- Registry loader
- Stable ID lookup
- Deprecation/replacement behavior
- Registry version and content hash
- Parameter proposal checklist

### Initial Parameter Groups

- Project and environment
- Axis orientation and geometry
- Payload and moving mass
- Force and moment load cases
- Stroke and timing
- Linear and angular motion
- Screw requirements and results
- Guide requirements and results
- Coupling and support-bearing requirements
- Motor, gearbox, drive, brake, and regeneration requirements

### Required Semantics

Each parameter defines peak/RMS/static/dynamic and required/allowable
qualifiers where relevant.

### Tests

- Unique IDs
- No duplicate symbols with conflicting meanings in the same scope
- Valid unit dimensions
- Valid deprecation references
- Stable registry hash fixture

### Exit Criteria

Every planned Phase 1 port maps to a parameter or has an approved pending
proposal.

## Unit 1.4 — Source registry and market profiles (US and JP)

### Deliverables

- Source document schema
- Source revision schema
- Clause/page reference schema
- Source classification
- Market profile loader
- Seed data for `US-General-Industrial-Machinery@1`
- Seed data for `JP-General-Industrial-Machinery@1`, including the
  `administrative_guidance` classification and bilingual title fields
  required by Japanese sources

### Scope

Metadata only. Do not implement safety compliance calculators.

### Tests

- Unique source revision IDs
- Supersession links
- Missing edition validation
- Licensed-content field restrictions

### Exit Criteria

A calculation trace can reference an exact source revision and location.

## Unit 1.5 — Calculation trace and check contracts

### Deliverables

- Stable trace step schema
- Input/output references
- Expression/method ID
- Source references
- Check result schema
- Warning and invalidity schemas
- Trace serialization

### Tests

- Nested trace sections
- Stable step IDs
- Invalid source references
- Check severity behavior
- Snapshot rendering fixture

### Exit Criteria

A report can be produced from trace data without knowing module formulas.

## Unit 1.6 — Module SDK v1

### Deliverables

- `ModulePackage` interface
- Manifest schema
- Port schema
- Input and output validation
- Engine SDK compatibility check
- Module execution function
- Validity-envelope schema
- Generic UI schema
- Generic report schema
- Optional catalog-adapter interface

### Tests

- Minimal valid module
- Invalid manifest
- Unknown parameter ID
- Incompatible SDK range
- Output schema mismatch
- Missing trace source
- Nondeterministic test fixture detection where practical

### Exit Criteria

A complete example module executes through the public SDK only.

## Unit 1.7 — Module conformance suite and scaffolder

### Deliverables

- Reusable conformance test runner
- CLI command such as `npm run module:new -- <id>`
- Generated module folder with manifest, compute, checks, trace, UI,
  report, validation, and test placeholders
- Registry generation script

### Conformance Checks

- Manifest validity
- Stable parameter references
- Pure package import boundary
- Input/output validation
- Trace completeness
- Generic UI/report schemas
- Validation record presence
- Package hash generation

### Exit Criteria

A scaffolded sample module can be completed and registered without
editing the engine, generic UI, report renderer, or database schema.

## Unit 1.8 — Parameter graph core

### Deliverables

- Graph node and edge types
- Link compatibility evaluator
- Nearest-scope suggestion algorithm
- Cycle detection
- Downstream dependency resolution
- Stale-impact calculation

### Tests

- Same-assembly preference
- Parent-scope fallback
- Cross-assembly origin visibility
- Unit-compatible but semantically incompatible rejection
- Peak versus RMS rejection
- Wrong load-case rejection
- Cycle rejection
- Multi-level stale propagation

### Exit Criteria

Graph behavior is deterministic and independent of database and UI.

# Milestone 2 — Persistence and Application Services

## Unit 2.1 — Prisma schema: project hierarchy

### Deliverables

Models for:

- User ownership reference
- MachineProject
- MachineConfiguration
- Assembly
- WorkflowInstance
- ModuleInstance

### Tests

- Ownership constraints
- Parent/child assembly hierarchy
- Module package ID/version persistence
- Deletion behavior

### Exit Criteria

A project tree can be created and loaded through repository interfaces.

## Unit 2.2 — Prisma schema: requirements and graph

### Deliverables

Models for:

- Requirement
- AcceptanceCriterion
- DesignAssumption
- LoadCase
- ParameterValue
- ParameterLink

### Storage Choice

Use generic versioned JSONB for EngineeringValue payloads and relational
columns for identity, ownership, source type, and timestamps.

### Tests

- JSONB validation on write and read
- Cycle rejection at application boundary
- Ownership isolation

### Exit Criteria

A module instance can resolve manual, default, workflow, and linked input
sources.

## Unit 2.3 — Prisma schema: immutable runs

### Deliverables

- CalculationRun
- Searchable status and critical-margin summaries
- Full immutable snapshot JSONB
- Engine/module/registry/source version fields
- Run stale state and stale reason

### Constraints

- No update path for engineering snapshot fields
- Stale state may change; the original computation payload may not

### Tests

- Snapshot immutability
- Reproduction from stored inputs and versions
- Invalid stored snapshot rejection

### Exit Criteria

A run can be loaded and rendered without executing the current module.

## Unit 2.4 — Calculation application service

### Deliverables

`executeModuleInstance` use case:

1. Authorize owner
2. Load module package version
3. Resolve and validate inputs
4. Execute pure module
5. Persist immutable run
6. Update module status
7. Append audit event

### Transaction Rules

Run persistence and status/audit updates are atomic.

### Tests

- Successful execution
- Invalid inputs
- Missing module version
- Unauthorized access
- Repeated run creates a new row

### Exit Criteria

One example module runs end to end through an application service.

## Unit 2.5 — Stale propagation service

### Deliverables

Use cases for:

- Change manual/default value
- Confirm/remove link
- Change workflow-provided value
- Change assigned component feedback input when applicable

Each use case computes downstream impact and marks runs and assignments
stale in one transaction.

### Tests

- Multi-level dependency chain
- Multiple branches
- No unrelated stale records
- Transaction rollback

### Exit Criteria

The architecture stale invariant is proven against PostgreSQL.

## Unit 2.6 — Manufacturer catalog schema

### Deliverables

Models for:

- Manufacturer
- ComponentType
- ComponentSchemaVersion
- CatalogImportBatch
- ManufacturerPartRevision
- Datasheet attachment metadata

### Part Data

- Manufacturer and part number
- Source revision and source link
- Lifecycle state when known
- Versioned attributes JSONB
- Data quality state

### Explicit Exclusions

- Company approval state
- Supplier and pricing records
- Inventory
- Procurement workflow

### Exit Criteria

Two component types with different attributes coexist without a Prisma
schema change.

## Unit 2.7 — Catalog CSV import service

### Deliverables

- Import mapping schema
- CSV parser
- Unit normalization
- Row validation
- Dry-run mode
- Error report
- Import batch summary
- Idempotent upsert rules

### Tests

- Valid import
- Mixed units
- Missing required fields
- Duplicate source revision
- Invalid enum and numeric data
- Partial failure behavior

### Exit Criteria

A manufacturer catalog fixture imports reproducibly and reports every
rejected row.

## Unit 2.8 — Catalog matching and component assignment

### Deliverables

- Hard-filter engine
- Transparent ranking result
- Rejection reasons
- Required-spec output
- `ComponentAssignment` persistence
- Manual/custom part assignment

### Assignment Fields

- Target project/assembly/module
- Manufacturer part revision or manual part payload
- Quantity
- Supporting calculation run
- Assignment timestamp and user
- Stale state

### Tests

- Hard constraints precede ranking
- Exact part revision retained
- Supporting run required for calculated components
- Assignment becomes stale with run

### Exit Criteria

Assigned parts can populate the BOM without an approval or selection
workflow subsystem.

## Unit 2.9 — Baseline and audit services

### Deliverables

- MachineBaseline snapshot
- Baseline item references
- Baseline creation checks
- Baseline comparison
- Append-only AuditEvent

### Baseline Snapshot

Include:

- Requirements and assumptions
- Assembly/module tree
- Parameter values and links
- Calculation run IDs and package hashes
- Component assignments
- BOM
- Market/source profile versions

### Tests

- Immutability
- Stale/failed acknowledgement requirements
- Comparison of changed values, results, and parts

### Exit Criteria

A baseline remains renderable after later project edits.

# Milestone 3 — Generic User Experience

## Unit 3.1 — Workspace shell

### Deliverables

- App bar
- Project/configuration selector
- Context action bar
- Machine navigator
- Main canvas
- Status bar
- Empty/loading/error states

### Exit Criteria

Database-backed project tree renders for the authenticated owner.

## Unit 3.2 — Project and assembly management UI

### Deliverables

- Create/rename project
- Create/rename/reorder assemblies
- Add workflow or module instance
- Status indicators
- Ownership-safe actions

### Exit Criteria

User can build a machine hierarchy without direct database access.

## Unit 3.3 — Generic module input renderer

### Deliverables

Render fields from `ModuleUiSchema`:

- Quantity with unit selector
- Enum and boolean
- Curve editor for supported motion inputs
- Grouping and help text
- Source badges
- Load-case context
- Inline validation

### Rule

No module-specific form is permitted in this unit.

### Exit Criteria

Two structurally different example modules render through the same
component.

## Unit 3.4 — Link suggestion UI

### Deliverables

- Suggestion banner
- Origin and scope display
- Parameter semantic details
- Confirm and dismiss actions
- Downstream stale-impact warning on removal/change

### Exit Criteria

User can understand exactly what value is being linked and from where.

## Unit 3.5 — Generic result and trace renderer

### Deliverables

- Output summary
- Check table
- Warning/invalidity panel
- Expandable trace
- Source references
- Previous-run comparison
- Stale banner

### Exit Criteria

The UI renders stored runs without importing module compute code.

## Unit 3.6 — Catalog matching and assignment UI

### Deliverables

- Required-spec panel
- Filtered candidate table
- Rejection reasons
- Ranking explanations
- Datasheet/source link
- Assign and manual-part actions

### Exit Criteria

An engineer can assign a manufacturer part and see its supporting run.

## Unit 3.7 — Requirements, assumptions, and load-case UI

### Deliverables

- Requirement editor
- Acceptance criteria
- Load-case table
- Assumption register
- Verification status

### Exit Criteria

Axis design intent is stored before downstream modules are run.

## Unit 3.8 — Baseline and comparison UI

### Deliverables

- Pre-baseline validation summary
- Warning acknowledgement
- Baseline creation
- Baseline list
- Changed requirement/input/output/check/part comparison

### Exit Criteria

User can identify what changed between two design states.

# Milestone 4 — Linear-Axis Engineering Modules

Each module follows the module workflow and definition of done.
Specification and source research may occur in parallel, but production
release remains sequentially validation-gated.

## Unit 4.1 — Axis application and load-case module

### Inputs

- Orientation and incline
- Payload and moving masses
- Center-of-mass offsets
- External process forces and moments
- Friction assumptions
- Duty cycle
- Normal, peak, holding, and emergency-stop cases
- Environment and derating inputs

### Outputs

- Resolved force/moment load cases
- Moving mass totals
- Gravitational components
- Downstream load-case references

### Special Requirement

Coordinate frames and sign conventions must be explicit in the trace and
report.

### Gate

Horizontal and vertical historical cases validate.

**Met — Unit 4.1 complete, `axis-load-cases@0.1.0` released 2026-08-11.**
ID39 (horizontal) and ID42 (vertical) historical cases validate at
`0.1.0-release-candidate` status (provenance limitations recorded, not
cleared — see `context/modules/axis-load-cases/stage-1-spec.md`
"Validation Gate and Evidence Intake"). Evidence:

- Validation record: `validation/axis-load-cases/0.1.0.md`
- Historical fixtures: `tests/fixtures/axes/axis-horizontal-basic/`
  (ID39), `tests/fixtures/axes/axis-vertical/` (ID42)
- Module tests: `lib/modules/axis-load-cases/0.1.0/package.test.ts`,
  `axis-load-cases.test.ts`, `thk-reference-examples.test.ts`,
  `atlanta-benchmark.test.ts`
- Registry entry: `axis-load-cases@0.1.0` in
  `lib/modules/registry.generated.ts`

The third long-stroke/high-speed historical case (Unit 0.1's own broader
exit criterion below) is not part of this gate — it was explicitly
decoupled from Unit 4.1's release and remains open for the Unit 0.1 /
Phase 1B validation program.

## Unit 4.2 — Motion profile module

### Supported MVP Profiles

- Trapezoidal
- Symmetric S-curve where source method is validated
- Multi-segment move/dwell sequence

### Outputs

- Move time
- Peak velocity
- Peak acceleration/deceleration
- Jerk
- Position/velocity/acceleration curves
- Peak and RMS demand values used downstream

### Checks

- Geometric/time feasibility
- Maximum user limits
- Invalid segment timing

### Gate

Reference profiles and historical timing cases match tolerances.

**Met — Unit 4.2 complete, `motion-profile@0.1.0` released 2026-08-12.**
Three published reference examples from two independent manufacturers (ABB,
Oriental Motor) across three independent worked scenarios are reproduced
within stated tolerance; the single-move kinematics has an independent
benchmark against Oriental Motor's more general method. Evidence:

- Validation record: `validation/motion-profile/0.1.0.md`
- Module tests: `lib/modules/motion-profile/0.1.0/package.test.ts`,
  `math.test.ts`, `cycle.test.ts`, `oriental-motor-benchmark.test.ts`
- Registry entry: `motion-profile@0.1.0` in
  `lib/modules/registry.generated.ts`

The cycle-level `rms_acceleration` output has no published example or
independent benchmark — a documented, honest gap recorded in
`validation.ts`'s `supportedUseLimits`, not a release blocker (no source
publishes one for elementary time-weighted-RMS arithmetic).

## Unit 4.3 — Ball screw and support module

### Required Checks

- Lead and rotational speed
- Acceleration and running torque contributions
- Axial load cases
- Equivalent dynamic load
- Static safety
- Nominal life
- Buckling
- Critical speed
- Manufacturer speed/DN limits when data exists
- Support arrangement
- Vertical back-driving/holding implications

### Gate

Validate horizontal, vertical, long-stroke, and high-speed cases.

## Unit 4.4 — Linear guide module

### Required Checks

- Forces and moments by load case
- Load distribution among blocks
- Equivalent dynamic load
- Static safety factor
- Nominal life
- Preload/clearance options
- Rail/block arrangement compatibility

### Gate

Independent hand and manufacturer-method comparisons pass.

## Unit 4.5 — Coupling module

### Required Checks

- Peak and nominal torque
- Bore and shaft compatibility
- Misalignment capability
- Torsional stiffness
- Coupling inertia
- Speed limit

### Gate

Known coupling selections are reproduced with transparent rejection
reasons.

## Unit 4.6 — Support-bearing module

### Required Checks

- Axial/radial load
- Static and dynamic capacity
- Speed
- Fixed/floating arrangement
- Preload where applicable
- Shaft and housing interface requirements

### Gate

Support-bearing output integrates with the ball-screw module without a
custom link mapping.

## Unit 4.7 — Servo drive-train module

### Components

- Servo motor
- Optional gearbox
- Drive/amplifier
- Holding brake
- Regenerative resistor when required

### Required Checks

- Peak torque
- RMS torque and thermal duty
- Maximum and continuous speed
- Rotor/load/reflected inertia
- Inertia ratio
- Gearbox input/output torque and speed
- Gearbox efficiency and life where data exists
- Brake holding torque
- Regenerated energy
- Drive current and supply compatibility
- Environmental derating

### Gate

At least one independent calculation and two manufacturer tool/catalog
comparisons are documented.

## Unit 4.8 — Linear-axis workflow definition

### Deliverables

`linear-axis@1` workflow with:

- Required module roles
- Initial link proposals
- Completion rules
- Cross-module checks
- Candidate system comparison
- Workflow status

### Cross-Module Checks

Examples:

- Motion output speed versus screw critical/manufacturer speed
- Screw torque and inertia versus drive-train limits
- Guide load cases use the same axis frame and duty definition
- Assigned bores and shaft interfaces are compatible
- Vertical holding behavior has a recorded design response

### Gate

All workflow links are derived from canonical parameter contracts; no
hardcoded database field-to-field wiring exists.

# Milestone 5 — BOM, Reports, and MVP Release

## Unit 5.1 — BOM model and generator

### Deliverables

- Multi-level BOM tree
- Calculated component items
- Manual/custom items
- Quantity and parent assembly
- Assignment/run traceability
- CSV export

### Exit Criteria

Every calculated component line identifies its supporting run and exact
part revision.

## Unit 5.2 — Module and assembly report renderer

### Deliverables

- Inputs and sources
- Assumptions and load cases
- Trace steps
- Checks and margins
- Validity limits
- Source references
- Assigned parts
- Stale state

### Rule

The renderer receives stored trace data; it does not import module
formulas.

### Exit Criteria

Stored historical runs produce the same report after module upgrades.

## Unit 5.3 — Machine calculation package

### Deliverables

- Cover/project details
- Selected market profile and project-specific references
- Requirements verification matrix
- Assembly/module summaries
- Detailed calculations
- BOM
- Open warnings and assumptions
- Baseline ID and hashes

### Exit Criteria

One HTML print package supports a formal design review.

## Unit 5.4 — End-to-end MVP validation

### Scenarios

1. Horizontal linear axis
2. Vertical linear axis with brake/holding requirements
3. Long-stroke or high-speed axis limited by screw behavior

### Required Evidence

- Original reference method
- MachineStudio result
- Difference and explanation
- Assigned parts
- Generated BOM and report
- Baseline reproduction

### Exit Criteria

All Phase 1D gates in `roadmap.md` pass.

## Unit 5.5 — Production readiness

### Deliverables

- Deployment decision ADR
- Managed database backups
- Error monitoring
- Structured application logs
- Security review
- Dependency audit
- Data export and account deletion path
- Basic performance benchmark
- Recovery procedure

### Exit Criteria

A production incident does not risk losing calculation evidence or
project ownership boundaries.

# Initial Two-Week Start Sequence

This is the recommended exact starting order. It is not a promise of
calendar completion; it is the first implementation queue.

1. Unit 0.1 — gather and normalize three historical axis fixtures
2. Unit 0.2 — initialize repository
3. Unit 0.3 — configure CI and test stack
4. Unit 0.4 — add database/auth skeleton
5. Unit 0.5 — install context and ADR structure
6. Unit 1.1 — EngineeringValue contracts
7. Unit 1.2 — unit registry foundation
8. Unit 1.3 — parameter registry schema and first parameter group
9. Unit 1.4 — source registry and US/JP profile seeds
10. Unit 1.5 — trace and check contracts

Do not start the first production motion formula until Units 1.1 through
1.7 are complete.

# Definition of Project Ready for First Production Module

The project is ready to begin Unit 4.1 only when:

- Repository and CI are stable
- Engineering values and units pass tests
- Parameter registry v1 is released
- US and JP source registries are available
- Module SDK and conformance suite are green
- Module scaffolder works
- Calculation trace renders generically
- Graph semantic compatibility tests pass
- Calculation-run persistence is immutable
- Generic module UI renders example modules
