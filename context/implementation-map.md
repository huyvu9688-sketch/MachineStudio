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

**`motion-profile@0.1.0` released 2026-08-12** — this unit's own Module
Definition of Done items are complete: three published reference examples
from two independent manufacturers (ABB, Oriental Motor) across three
independent worked scenarios are reproduced within stated tolerance, and
the single-move kinematics has an independent benchmark against Oriental
Motor's more general method. **The "historical timing cases" half of this
Gate is not met by real project data**: unlike `axis-load-cases`' ID39/ID42,
no historical machine's own move-timing record was reproduced here — the
three reference examples above are manufacturer catalog worked examples,
not a founder-supplied historical fixture (no such fixture exists for
motion timing in this project). "Reference profiles... match tolerances" is
met; "historical timing cases" stays open, the same Phase 1B / Unit 5.4
milestone-level status as `ball-screw`'s own Gate below. Evidence:

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

**`ball-screw@0.1.0` released 2026-08-12** — this unit's own Module
Definition of Done items are complete (six published reference examples
from two independent manufacturers, Rockford and THK; independent-benchmark
comparisons for drive torque, buckling/critical speed, and equivalent
dynamic load — see `validation/ball-screw/0.1.0.md`), the same generic
per-module bar `axis-load-cases@0.1.0` cleared. **This Gate itself is not
met yet**: unlike `axis-load-cases`, no historical axis project (ID39,
ID42, or the still-missing third long-stroke/high-speed project) has been
run through this module — it stays a Phase 1B / Unit 5.4 milestone-level
item, exercised once a complete `linear-axis@1` chain runs a real
historical case end to end, not a per-module Stage 6 release requirement.
Evidence:

- Validation record: `validation/ball-screw/0.1.0.md`
- Module tests: `lib/modules/ball-screw/0.1.0/package.test.ts`,
  `math.test.ts`, `thk-benchmark.test.ts`, `cross-module-links.test.ts`
- Registry entry: `ball-screw@0.1.0` in `lib/modules/registry.generated.ts`

Two real, unresolved deviations remain open (not release blockers, both
documented in `validation.ts`): a three-way buckling/critical-speed
calibration-constant disagreement (Rockford/Steinmeyer/THK), and an
equivalent-dynamic-load methodology disagreement (this module's
Steinmeyer-based single formula vs. THK's own bidirectional-duty-cycle
method, ~26% apart on THK's own scenario).

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

**Met — Unit 4.4 complete, `linear-guide@0.1.0` released 2026-08-12.** PMI's
own Chapter 9 worked example is reproduced end to end through the module's
real integration path (twenty per-carriage radial loads, twenty lateral
loads, twenty equivalent loads, the governing static safety factor, and
four mean loads/nominal lives, each to within the ±0.1 N PMI itself prints),
and IKO's own structurally different equivalent-load method is implemented
as a genuine second computation, reproducing IKO's own worked "Example 1"
end to end and cross-checked against PMI's own form (a real, quantified
5-20% disagreement, not reconciled). Evidence:

- Validation record: `validation/linear-guide/0.1.0.md`
- Module tests: `lib/modules/linear-guide/0.1.0/package.test.ts`,
  `pmi-chapter-9.test.ts`, `iko-benchmark.test.ts`,
  `cross-module-links.test.ts`
- Registry entry: `linear-guide@0.1.0` in `lib/modules/registry.generated.ts`

Reproducing PMI's own worked example also found and fixed two real defects
in this module's own kernel (a swapped rail/carriage spacing that put the
yawing-moment lever arm on the wrong term, and an unsigned lateral-load
distribution that should have been signed and zero-sum) — see
`validation/linear-guide/0.1.0.md` "Tolerances and Deviations".

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

**Partially met — Unit 4.5 complete, `coupling@0.1.0` released
2026-08-12.** Two real, published coupling selections are reproduced
through the module's own real compute path: R+W America's own "Sizing and
Selection" worked examples (`ST2/10`, `ST4/10`), both catalog-accepted
selections, confirmed to clear their own printed requirement running
through `executeModule` — not just the kernel formula level. **The
"transparent rejection reasons" half is demonstrated by the module's own
check mechanism, not yet by a published rejected-selection example**: every
check reports a computed safety factor and margin (the transparent reason),
verified by synthetic tests that force a failure (e.g. an oversized
required torque), but no source read this session gives a worked example
of a coupling selection that fails — KTR's and R+W's own examples are all
selections the source itself already accepted. Evidence:

- Validation record: `validation/coupling/0.1.0.md`
- Module tests: `lib/modules/coupling/0.1.0/package.test.ts`,
  `math.test.ts`, `rw-reference-examples.test.ts`,
  `ktr-din740-benchmark.test.ts`, `cross-module-links.test.ts`
- Registry entry: `coupling@0.1.0` in `lib/modules/registry.generated.ts`

A second, independent KTR document ("Coupling Selection According to DIN
740 Part II") supplies this module's own independent benchmark — a
genuinely different, more detailed shock-torque derivation than KTR's other
document's own, quantified against this module's own simplified check (see
`validation/coupling/0.1.0.md` "Independent Method or Tool Comparison").

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

**Met — Unit 4.6 complete, `support-bearing@0.1.0` released 2026-08-12.**
`cross-module-links.test.ts` confirms, against the real engine
link-compatibility evaluator and each module's real `manifest.ts` ports,
that this module's per-case thrust-force input accepts an upstream output
with no custom mapping — the gate's own intent is met. **One wording
correction**: the real upstream producer is `axis-load-cases`' own
`motion.axis.thrust_force`, not `ball-screw` itself — `ball-screw` produces
no output this module consumes (only `screw.*` results); `motion.axis.
thrust_force` is the same port `ball-screw`'s own kernel already resists
internally, so the gate's own "without a custom link mapping" test still
holds, just against the actual producing module. Evidence:

- Validation record: `validation/support-bearing/0.1.0.md`
- Module tests: `lib/modules/support-bearing/0.1.0/package.test.ts`,
  `math.test.ts`, `nsk-reference-examples.test.ts`,
  `nsk-fh-benchmark.test.ts`, `cross-module-links.test.ts`
- Registry entry: `support-bearing@0.1.0` in
  `lib/modules/registry.generated.ts`

This module's own validation record and `validation/source-index.md` rows
were not written until Stage 6 (2026-08-12), even though Stage 4's own
evidence closed 2026-08-10 — a documentation gap this release closed, not
one carried forward.

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

**Met — Unit 4.7 complete, `drive-train@0.1.0` released 2026-08-12 — the
last of Milestone 4's seven modules.** One independent calculation:
`closed-cycle-benchmark.ts` implements a structurally different, direct
per-phase RMS-torque computation, proved algebraically identical to this
module's own closed form across sixteen cycle-shape/inertia combinations,
plus a counter-example proving the closed form's own precondition is
load-bearing. Two manufacturer comparisons: Omron Corporation's own
complete worked example (motor R88M-U20030) and THK Co., Ltd.'s own two
worked examples (horizontal, and a partial vertical reproduction — see
"Tolerances and Deviations" below), both reproduced through the module's
real compute path. Evidence:

- Validation record: `validation/drive-train/0.1.0.md`
- Module tests: `lib/modules/drive-train/0.1.0/package.test.ts`,
  `math.test.ts`, `omron-reference-example.test.ts`,
  `thk-reference-examples.test.ts`, `closed-cycle-benchmark.test.ts`,
  `cross-module-links.test.ts`
- Registry entry: `drive-train@0.1.0` in `lib/modules/registry.generated.ts`

THK's own vertical worked example is a real, sourced case where the
closed-cycle RMS-torque assumption's own precondition does not hold
(asymmetric per-direction load torque, nonzero holding torque) — the
module's own computed effective torque diverges from THK's own printed
figure by about 21%, a genuine, quantified deviation, not a rounding
residual (`validation/drive-train/0.1.0.md` "Tolerances and Deviations").
Drive/amplifier current and voltage compatibility stays out of scope
entirely, pending a generic-engine electrical-current dimension this
project does not have yet.

**All seven Milestone 4 modules (Units 4.1-4.7) are now released and
registered** — every `linear-axis@1` role has a real registered module.

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

1. Horizontal linear axis — **complete (2026-08-12).**
   `lib/application/workflows/unit-5-4-scenario-1-horizontal-axis.test.ts`
   runs the full `linear-axis@1.0.0` workflow (all seven modules, eight
   role instances) through the real application-service layer against a
   live database. Full evidence record:
   `validation/unit-5.4/scenario-1-horizontal-axis.md`. Real ID39
   historical evidence drives `axis-load-cases`/`motion-profile`; every
   catalog-level value for the other five modules is disclosed
   representative data (ID39 supplies none) — see that record's own
   "Disclosed Limitations." A real, previously-undiscovered generic-engine
   defect in `motion-profile`'s per-move-index port resolution was found,
   disclosed, and worked around, not hidden — see that record's own "A Real
   Finding From This Scenario" and `context/progress-tracker.md` "Open
   decisions."
2. Vertical linear axis with brake/holding requirements — **blocked on
   evidence, not started.** ID42 (the only vertical historical fixture) has
   no holding/brake case, and `axis-load-cases@0.1.0` has no
   `holding`/`emergency_stop` support to exercise even if one existed.
3. Long-stroke or high-speed axis limited by screw behavior — **blocked on
   evidence, not started.** The third historical fixture Unit 0.1 and Phase
   1B both still need has never been found; no synthetic fixture will
   substitute for it.

### Required Evidence

- Original reference method
- MachineStudio result
- Difference and explanation
- Assigned parts
- Generated BOM and report
- Baseline reproduction

Every item above is met for Scenario 1 — see
`validation/unit-5.4/scenario-1-horizontal-axis.md`. Not yet produced for
Scenarios 2/3, both blocked on evidence.

### Exit Criteria

All Phase 1D gates in `roadmap.md` pass. **Not yet met** — this requires
all three scenarios; only Scenario 1 is complete.

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
