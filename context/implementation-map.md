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

# Milestone 6 — Motor Sizing Tool Family

Founder-directed (`context/adr/0011-motor-sizing-tool-architecture.md`,
2026-08-12), maps onto roadmap Phase 1E. A mechanism-oriented module
family (ball screw, belt/pulley drive, direct-drive conveyor, rack and
pinion, index table) becomes the primary "Add module" entry point; the
seven Milestone 4 discipline modules and `linear-axis@1` stay registered,
immutable, and hidden from the default picker — not edited or superseded.
See the ADR for the full reasoning and `context/roadmap.md` Phase 1E for
the gate.

## Unit 6.1 — Rigid-body mechanics engine package

### Deliverables

`lib/engine/mechanics/` — generic, source-independent rigid-body physics
every mechanism module in this family needs internally (ADR-0011 "Module
shape" steps 2 and 4: motion profile and motor sizing computed per-phase
inside each module, not linked in from `motion-profile@0.1.0` or
`drive-train@0.1.0`):

- Mass moment of inertia for standard shapes — point mass, solid cylinder
  (mass and density forms), hollow cylinder (mass and density forms),
  rectangular pillar, parallel-axis (offset) transfer, and a linearly
  moving mass converted to an equivalent shaft-side inertia
  (`./inertia.ts`)
- `Ta = J*alpha` and the angular-acceleration-from-speed-ramp conversion
  that produces `alpha` from a motion profile's own ramp (`./torque.ts`)
- `MechanicsInputError` (`./errors.ts`)

Source: Oriental Motor Co., Ltd., *Motor Sizing Calculations*
(`jp.oriental_motor.motor_sizing_calculations@web-2026-08-08`, already
registered in `lib/standards/engineering-sources.ts` for the `ball-screw`
module; cached `reference/source-material/Oriental_Motor Sizing
Calculators.pdf`, pp. 2-3 and p. 5). Restated with that source's own
symbols and constants, but the underlying physics is ordinary rigid-body
dynamics no source disagrees on — the same category ADR-0011's own "Reuse
policy" already established for `E = J*omega^2/2` in
`drive-train@0.1.0`'s `resolveRegenEnergy`. This is why the package lives
in `lib/engine`, exported from `lib/engine/index.ts`, rather than being
reproduced inside each mechanism module the way mechanism-specific
load-torque formulas will be.

Built ahead of its first consumer, matching the "Generic Platform
Workflow" (`context/ai-workflow-rules.md`), because it is genuinely shared
infrastructure every one of the five planned mechanism modules needs, not
speculative: `context/progress-tracker.md` "Next up" names
`motor-sizing.ball-screw` as the recommended first consumer.

### Tests

- Reference-value reproduction against the source's own printed formulas
  and constants
- Boundary and invalid-input tests (non-finite, non-positive, and
  out-of-domain arguments — e.g. a hollow cylinder's bore not smaller than
  its outer diameter)
- Algebraic-identity tests (the density forms against the mass forms; the
  offset-axis transfer composed with the rectangular-pillar form against
  the source's own printed composed result; the linear-motion form against
  the point-mass form at the implied radius)
- Dimensional-consistency (scaling) tests: every mass-form shape scales as
  `mass * length^2`; every density-form shape scales as `length^5` at
  fixed density
- Cross-check of `accelerationTorque` composed with
  `angularAccelerationFromSpeedRamp` against the source's own rpm-packaged
  form `Ta = J*N/(9.55*t1)`

### Exit Criteria

No mechanism module needs to reproduce moment-of-inertia or
`Ta = J*alpha` formulas itself; `lint`, `typecheck`, `test`, and `build`
all pass.

## Unit 6.2 — Ball-screw motor sizing module

### Stage 1 — Engineering specification

**Done (2026-08-12).** `context/modules/ball-screw-motor-sizing/
stage-1-spec.md` — proposed module ID `ball-screw-motor-sizing`, category
`motor-sizing.ball-screw` (ADR-0011). Reproduces (not imports) physics
already verified across four released modules and reuses `lib/engine/
mechanics` (Unit 6.1) directly for moment of inertia and `Ta = J*alpha` —
see the spec's own "Relationship to Existing Released Modules" table.
Scoped to one full point-to-point round trip (forward move, optional
return move, optional dwell), not `motion-profile@0.1.0`'s own general
bounded-5-move sequence, deliberately avoiding that module's own
undiscovered-until-Unit-5.4 per-move-index port defect
(`context/progress-tracker.md` "Open decisions"). Computes effective (RMS)
torque as a genuine N-phase sum
(`Trms = sqrt(sum(T_i^2*t_i)/sum(t_i))`) rather than `drive-train@0.1.0`'s
own closed-form approximation from a single scalar `rms_acceleration` —
the literal structural fix ADR-0011 exists to make. Reference examples
identified: Omron Corporation's own worked example
(`jp.omron.servo_motor_selection_guide@csm-tg-e-3-1`, re-read directly
this session at its own primary pages 12-13, cross-verified by hand
against `lib/engine/mechanics`'s own formulas) and THK Co., Ltd.'s own two
worked examples (`jp.thk.example_ball_screw_selection@technico-
mirror-2026-08-10`) — the vertical one is the key validation target,
since it is the exact scenario `drive-train@0.1.0`'s own closed-form
approximation overstates by ~21% (`validation/drive-train/0.1.0.md`
"deviations"); this module's own N-phase computation, fed THK's own seven
printed phases directly, is expected to reproduce THK's own printed
`743 N*mm` where `drive-train@0.1.0` computes `~901 N*mm`. Four open
questions remain for Stage 2 (parameter-group naming, the round-trip
motion-input parameter shape, the per-phase signed-torque convention, and
the required-torque/margin shape) — see the spec's own "Stage 2 Entry
Criteria." No code, manifest, or registry change — Stage 1 is a
specification document only.

### Stage 2 — Parameter contract

**Done (2026-08-12).** `context/modules/ball-screw-motor-sizing/
stage-2-contract.md` — registry `1.9.0` releases the full
`motor_sizing.ball_screw.*` group (29 new parameters) and resolves all
four questions Stage 1 left open:

- Per-mechanism prefix (`motor_sizing.ball_screw.*`), not a shared
  `motor_sizing.*` bucket across future mechanism modules.
- Six distinct `forward_*`/`return_*` parameter IDs plus one `dwell_time`
  for the round-trip motion input — never an indexed shared-ID family,
  the specific fix for `motion-profile@0.1.0`'s own `move_{1..5}_*`
  port-resolution defect.
- True signed per-direction load/acceleration torque (`forward_*`/
  `return_*` outputs), not `drive-train@0.1.0`'s own conservative
  summation — needed to reproduce THK's own vertical example exactly.
- Two `>= 1` safety factors (`effective_torque_safety_factor`,
  `momentary_torque_safety_factor`), the inverse direction from
  `drive.rms_torque_margin`/`drive.peak_torque_margin` (`<= 1`), since
  this module takes no candidate motor's own rated/peak torque as an
  input; `motor_rotor_inertia` is a required input so the inertia-ratio
  check has something real to check against.

Reuses `motion.axis.orientation`/`incline_angle`/`gravity`/
`friction_coefficient`/`total_moving_mass`, `screw.lead`/`gear_ratio`/
`preload`/`internal_friction_coefficient`/`mechanical_efficiency`
directly. Deliberately does not reuse `screw.minor_diameter`,
`screw.drive_torque`, `drive.reflected_load_inertia`, or any `drive.*`
margin/limit parameter — each for its own documented reason. No new unit
or dimension needed. `lib/engine/parameters/registry.test.ts`'s full
invariant suite (57 tests: unique IDs, symbol uniqueness, dimension
checks, value-type shape, constant defaults) passes against the new
group — satisfying "Add parameter contract tests" the same way every
prior module's own Stage 2 did, with no dedicated per-group test file.

### Stage 3 — Compute and trace

**Done (2026-08-12).** Full `ModulePackage` in
`lib/modules/ball-screw-motor-sizing/0.1.0/` (manifest, ports, input
schema, math kernel, trace, checks, generic UI/report schema, draft
validation — see that directory's own `README.md`). `math.ts`
reproduces the physics from four already-released modules and calls
`lib/engine/mechanics` (Unit 6.1) directly for moment of inertia and
`Ta = J*alpha`; a genuine N-phase `Trms = sqrt(sum(T_i^2*t_i)/sum(t_i))`
computation replaces `drive-train@0.1.0`'s own closed-form approximation
— the structural fix ADR-0011 exists to make.

Omron Corporation's own complete worked example is reproduced twice:
once at the kernel level (`math.test.ts`) and once through the real
`executeModule` compute path (`package.test.ts`) — every printed
intermediate figure (screw/load inertia, load torque, motor-shaft speed,
acceleration/momentary/effective torque) reproduces within the source's
own 3-significant-figure rounding. 44 tests total (32 kernel, 12
package/conformance), all passing. `runModuleConformance` reports
`package-validation` and `import-boundary` as real passing checks;
`source-immutability` reports `skipped` (a Stage 6 action). No module is
registered (`package.ts`, not `index.ts`).

Two real gaps found while wiring the kernel, corrected directly in the
still-unconsumed registry `1.9.0` (the same "Stage 2's own last step had
not actually been done" honesty `drive-train@0.1.0`'s own Stage 3
corrections already modeled) — see
`context/modules/ball-screw-motor-sizing/stage-2-contract.md` "Stage 3
corrections": `forward_move_distance`'s and `return_move_distance`'s own
definitions now state the "forward = away from gravity" direction
convention explicitly, closing a real ambiguity in how
`forward_load_torque`'s/`return_load_torque`'s own gravity-term sign is
determined.

### Stage 4 — Validation

**Done (2026-08-12).** THK Co., Ltd.'s own two worked examples
(`jp.thk.example_ball_screw_selection@technico-mirror-2026-08-10`, read
directly this session via `pdftotext -layout` against the registered
technico.com mirror) are both reproduced through `executeModule`
(`thk-reference-examples.ts`/`.test.ts`): the horizontal baseline within
1% on every figure; the vertical case within 1% on load torque, inertia,
and momentary torque, but `effective_torque` understates THK's own printed
`743 N*mm` by ~29% through the real compute path, since THK's own cycle
carries a real `658 N*mm` stationary holding torque this module's own
dwell phase does not model (an already-disclosed scope gap, now
quantified). Isolated from that gap, a kernel-level test feeding
`resolveEffectiveTorque` THK's own seven printed phases directly
(including the `658 N*mm` term) reproduces THK's own `743 N*mm` within
0.5% — the direct confirmation that the N-phase Trms formula itself, the
actual ADR-0011 structural fix, is correct. A suspected sign-convention
bug in `resolveDriveForce` was investigated by reading THK's own primary
algebra directly and ruled out (not fixed): THK's own printed torques are
unsigned magnitudes, and the module's own signed gravity-flip-by-direction
is the correct projection of the same fixed-frame force balance
`axis-load-cases@0.1.0`'s own `resolveAxisLoadPhase` already uses;
`resolveMomentaryTorque`/`resolveEffectiveTorque` are already sign-agnostic
so the difference has zero effect on any output — recorded in
`validation.ts` as a finding, not a deviation. The independent-benchmark
item is met (`independent-benchmark.test.ts`): this module's own N-phase
Trms agrees with `drive-train@0.1.0`'s own closed-form `resolveEffectiveTorque`
within 1% on the horizontal case and diverges by ~21% on the vertical case,
reproducing the exact gap `validation/drive-train/0.1.0.md` already
discloses. Full record: `lib/modules/ball-screw-motor-sizing/0.1.0/validation.ts`.

### Stage 5 — Generic surfaces

**Done (2026-08-12).** Generic UI schema (`ui.ts`) and report schema
(`report.ts`) were built in Stage 3 and already pass `package-validation`
conformance; no new work needed. `manifest.workflowRoles` stays `[]`,
confirmed by a real test rather than left as an unchecked comment — this
module has no `linear-axis@1` role and no other guided workflow exists for
the `motor-sizing.*` family yet. `cross-module-links.test.ts` runs an
exhaustive sweep (every input port against every output port of all four
reproduced-from modules, using the real `evaluateLinkCompatibility`
evaluator) and found — correcting a real inaccuracy in this module's own
prior "no port links" claim — exactly one genuine, incidental compatible
pair: `axis-load-cases@0.1.0`'s own resolved `total_moving_mass` output
links to this module's own `total_moving_mass` input (same parameter ID,
both reuse it). Not a calculation-level dependency and nothing wires it
today (no workflow role exists); recorded accurately rather than left as a
disproven blanket claim — see the module's own `README.md` "Stage 5" and
`manifest.ts`'s own header comment. Catalog adapter: not applicable
(ADR-0011 "Output scope" excludes motor catalog matching from this
phase). 63 tests total in the module directory as of Stage 5, all passing.

### Stage 6 — Release

**Done (2026-08-13).** `index.ts` (renamed from `package.ts`) assembles
the same manifest, ports, compute, UI, report, and validation record into
a single `ModulePackage` and seals it, so `npm run registry:generate` now
discovers it: the module is registered as `ball-screw-motor-sizing@0.1.0`
in `lib/modules/registry.generated.ts` — the first module in the Motor
Sizing Tool family (ADR-0011). `package.test.ts` pins the
source-immutability hash (`npm run module:source-hash --
ball-screw-motor-sizing 0.1.0` → `18c8f078d2b91c8a`) and asserts
`import-boundary` and `source-immutability` both pass as real checks, not
skipped. Sealed package content hash: `1246d12939032577`.
`validation/ball-screw-motor-sizing/0.1.0.md` and its three
`validation/source-index.md` rows were written the same day Stage 4
closed, not deferred. 64 tests total, all passing. Full validation record:
`validation/ball-screw-motor-sizing/0.1.0.md`. Design record: this
module's own `README.md` "Stage 6 (release, done 2026-08-13)".

## Unit 6.3 — Direct-drive conveyor motor sizing module

### Stage 1 — Engineering specification

**Done (2026-08-13).** `context/modules/direct-drive-conveyor-motor-sizing/
stage-1-spec.md` — the founder's own pick among ADR-0011's four remaining
mechanisms, chosen because it closes a real gap the founder has personally
hit: the Oriental Motor sizing tool the founder uses has no template for a
conveyor with the motor directly on the drive-roller shaft. Reuses
`lib/engine/mechanics` (Unit 6.1) directly, the same treatment
`ball-screw-motor-sizing@0.1.0` established. Two sources read directly this
session — Omron's already-registered *Servo Motor Selection* guide (pp.
7-9, not previously read for this codebase's other, narrower-scoped
modules) and a newly registered Oriental Motor General Catalog Technical
Reference chapter (`jp.oriental_motor.general_catalog_motor_fan_sizing`,
pp. F-2 through F-10) — agree on the same conveyor inertia/load-torque
formula shape. Two real scope findings, both disclosed in the spec: no
source frames a conveyor's own duty cycle as needing an effective (RMS)
torque check the way `ball-screw-motor-sizing@0.1.0`'s round-trip cycle
does (every conveyor source instead checks a single breakaway/acceleration
event plus continuous running torque), and the conveyor friction
coefficient (`mu = 0.3` in both worked examples) is a materially different
quantity from `motion.axis.friction_coefficient`'s own `0.05` sliding-guide
default, so it needs a new parameter rather than a reuse. Two full worked
numerical examples were found and hand-verified in the newly registered
catalog document (p. F-8, fully reconciled; p. F-9, one unresolved printed
inertia figure not blocking Stage 2); a third, lower-confidence blog
example was also found and registered. `0.1.0`'s own scope fixes the gear
ratio at `i = 1` (direct drive) even though both fully-verified reference
examples are geared — the specific resolution path ADR-0011 itself
anticipated for this module.

### Stage 2 — Parameter contract

**Done (2026-08-13).** `context/modules/direct-drive-conveyor-motor-sizing/
stage-2-contract.md` -- registry `1.10.0` releases the full
`motor_sizing.direct_drive_conveyor.*` group (20 new parameters, reusing
only `motion.axis.gravity`). Resolves all five Stage 1 entry criteria, two
narrower than Stage 1 itself proposed: `0.1.0`'s own motion input is a
single acceleration event (`acceleration_time` ramp to
`target_belt_speed`), not a full accelerate/run/decelerate cycle, since no
source for this mechanism computes or needs a deceleration-phase or
RMS-cycle torque; and the module uses one combined
`required_torque_safety_factor` (`>= 1`), not two separate margins, since
there is only one computed torque figure. `belt_friction_coefficient` is
confirmed genuinely new, not a reuse of `motion.axis.
friction_coefficient`. The gear ratio has no parameter at all in `0.1.0`'s
own schema -- this module's own purpose is specifically the no-gearbox
case, not one defaulted to a ratio of `1`.

### Stage 3 -- Compute and trace

**Done (2026-08-13).** A full ModulePackage in
lib/modules/direct-drive-conveyor-motor-sizing/0.1.0/ (manifest, ports,
math kernel, compute, trace, checks, generic UI/report schema, draft
validation -- see that directory's own README.md). Self-contained per
ADR-0011 "Reuse policy": every formula is reproduced from Omron's and
Oriental Motor's own conveyor sizing methods, except moment of inertia and
Ta=J*alpha, genuinely imported from lib/engine/mechanics (Unit 6.1) --
this module is the first in the family to also reuse that package's own
angularAccelerationFromSpeedRamp directly (belt-speed-to-angular-velocity
conversion plus delta_omega/t), not just inertia. No module registered
yet (package.ts, not index.ts).

### Stage 4 -- Validation

**Done (2026-08-13).** The full 9-page Oriental Motor General Catalog
Technical Reference source document (pp. F-2 through F-10) was fetched and
read directly this session, resolving the p. F-9 evidence gap Stage 1 had
left open and surfacing two real findings, both disclosed rather than
worked around. First: neither of the document's own two conveyor worked
examples (p. F-8 "Belt and Pully", p. F-9 "Conveyor") computes an
acceleration-torque term at all -- both derive their own final
required-torque figure from load (friction) torque alone. This module's
own already-released parameter contract defines acceleration_torque /
momentary_torque / required_torque regardless (mirroring the general
TM=(TL+Ta)*Sf shape the already-registered Oriental Motor web page
states), so the kernel computes real figures for all three, but they are
validated only at the formula level (Ta=J*alpha, already confirmed by
lib/engine/mechanics' own torque.test.ts and by
ball-screw-motor-sizing@0.1.0's own worked examples), not against either
conveyor-specific printed figure. Second: p. F-9's own printed
Jm2=132 oz-in^2 (belt+work inertia) omits the same lb-to-oz conversion
factor its own adjacent Jm1=70.4 oz-in^2 (single-roller inertia) correctly
applies -- a source-internal printing/arithmetic error, not reproduced by
this module's own physically-correct kernel. load_torque, the full
on-shaft inertia sum, and operating speed from p. F-8 all reproduce within
the source's own printed rounding, both at the kernel level (math.test.ts)
and through executeModule
(oriental-motor-reference-examples.ts/.test.ts); p. F-9's own load_torque
and single-roller inertia (its own internally consistent figures) are
reproduced the same way. The independent-benchmark item is met via
omron-independent-benchmark.ts/.test.ts: Omron's own combined
JW=J1+J2+J3+J4 formula, reimplemented as a genuinely separate mm-based
computation, agrees with this module's own decomposed kernel to
floating-point precision across a 200-scenario deterministic
property-based sweep -- not just the one scenario hand-verified during
Stage 1. Full record:
lib/modules/direct-drive-conveyor-motor-sizing/0.1.0/validation.ts.

### Stage 5 -- Generic surfaces

**Done (2026-08-13).** Generic UI schema (ui.ts) and report schema
(report.ts) were built in Stage 3 and already pass package-validation
conformance. manifest.workflowRoles stays [], confirmed by a real test --
no linear-axis@1 role and no other guided workflow exists for the
motor-sizing.* family yet. cross-module-links.test.ts runs an exhaustive
sweep (every input port against every output port of all seven
Milestone-4 modules plus ball-screw-motor-sizing@0.1.0) and confirms zero
compatible pairs -- this module reuses only one already-released
parameter (motion.axis.gravity), so unlike ball-screw-motor-sizing@0.1.0's
own sweep, no incidental overlap exists. Catalog adapter: not applicable
(ADR-0011 "Output scope"). 55 tests total in the module directory as of
Stage 5, all passing.

### Stage 6 -- Release

**Done (2026-08-13).** index.ts (renamed from package.ts) assembles the
same manifest, ports, compute, UI, report, and validation record into a
single ModulePackage and seals it, so `npm run registry:generate` now
discovers it: the module is registered as
direct-drive-conveyor-motor-sizing@0.1.0 in
lib/modules/registry.generated.ts -- the second module in the Motor
Sizing Tool family (ADR-0011). package.test.ts pins the
source-immutability hash (`npm run module:source-hash --
direct-drive-conveyor-motor-sizing 0.1.0` -> `3fa1417cf144229a`) and
asserts import-boundary and source-immutability both pass as real checks,
not skipped. Sealed package content hash: `bfc0a603d8c5e3a1`.
validation/direct-drive-conveyor-motor-sizing/0.1.0.md and its two
validation/source-index.md rows were written the same day Stage 4 closed,
not deferred. 57 tests total, all passing. Full validation record:
validation/direct-drive-conveyor-motor-sizing/0.1.0.md. Design record:
this module's own README.md "Stage 6 (release, done 2026-08-13)".

## Unit 6.4 — Rack-and-pinion motor sizing module

**Done and released, 2026-08-13 -- all six New Module Workflow stages,
same day.** `rack-pinion-motor-sizing@0.1.0`, the third Motor Sizing Tool
family module, following `ball-screw-motor-sizing@0.1.0` and
`direct-drive-conveyor-motor-sizing@0.1.0`. Full record:
`context/modules/rack-pinion-motor-sizing/stage-1-spec.md` (Stage 1) and
`stage-2-contract.md` (Stage 2); `lib/modules/rack-pinion-motor-sizing/
0.1.0/README.md` (Stages 3-6); `validation/rack-pinion-motor-sizing/
0.1.0.md`.

Architecturally closer to `ball-screw-motor-sizing@0.1.0` than to
`direct-drive-conveyor-motor-sizing@0.1.0`: a rack-and-pinion axis is the
same "one rigid carriage on a guide" mechanism class as a ball screw, and
the primary source (`jp.oriental_motor.general_catalog_motor_fan_sizing`,
p. F-3) prints the ball-screw and rack-and-pinion force formulas
identically. This module therefore reuses `motion.axis.orientation/
incline_angle/gravity/friction_coefficient/total_moving_mass` directly --
the opposite reuse conclusion from the conveyor module's own deliberate
non-reuse of `friction_coefficient`, reached for the opposite, equally
source-backed reason. Registry `1.11.0` releases the new
`motor_sizing.rack_pinion.*` group (21 parameters); `1.10.0` was added to
`PARAMETER_REGISTRY_SUPPORTED_VERSIONS` so
`direct-drive-conveyor-motor-sizing@0.1.0`'s own pinned manifest target
stays served, the same displaced-current-version step every prior
registry bump already followed.

A second independent public source was found and newly registered this
session (`us.andantex.modular_rack_pinion_system`, Andantex USA, Inc./
Redex's own published horizontal/vertical selection procedure),
hand-verified as algebraically identical to Oriental Motor's own formula
shape. **A genuine, disclosed evidence gap:** no publicly citable worked
numerical example exists for rack-and-pinion motor sizing specifically —
both public sources give the formula only. Atlanta Drive Systems' own two
full worked numerical examples (already in `reference/source-material/`,
already registered `access: "licensed"` from Unit 4.1's own validation
work) fill this gap as an **internal-only benchmark**, following the exact
precedent `axis-load-cases@0.1.0` already established for this same
document: reproduced through the real `executeModule` compute path
(`atlanta-benchmark.test.ts`, reusing `axis-load-cases@0.1.0`'s own
already-tested `resolveAtlantaHorizontalForce`/
`resolveAtlantaVerticalForce` directly), matching within `0.01%` for both
the horizontal and vertical scenarios, but never cited in `manifest.ts` or
a customer-facing trace/report. This single test file serves as both the
independent-benchmark and reference-example evidence, honestly labeled as
a substitute rather than overclaimed as a citable published example.

Unlike the conveyor module, orientation and incline ARE supported —
Atlanta's and Andantex's own sources both give a dedicated
vertical-lifting formula variant, real evidence this mechanism needs it.
Like the conveyor module, motion is a single accelerate-to-speed event,
not a full accelerate/run/decelerate cycle or an RMS torque check —
independently reconfirmed for this different mechanism, not assumed from
the conveyor's own finding. Cross-module link sweep finds exactly one
real, incidental compatible pair (`axis-load-cases@0.1.0`'s own resolved
`total_moving_mass` output), the same exception
`ball-screw-motor-sizing@0.1.0`'s own sweep already found and documented.
`index.ts` (renamed from `package.ts`) registers the module; source hash
`86bb223f9834865d`; sealed content hash `95e30556b36aa304`. 50 tests
total, all passing.

## Unit 6.5 — Belt-pulley drive motor sizing module

**Done and released, 2026-08-13 -- all six stages, same session.**
`belt-pulley-drive-motor-sizing@0.1.0`, the fourth Motor Sizing Tool
module. Records: `context/modules/belt-pulley-drive-motor-sizing/
stage-1-spec.md` and `stage-2-contract.md`. Registry `1.12.0` releases the
`motor_sizing.belt_pulley.*` group (24 parameters); `1.11.0` was added to
`PARAMETER_REGISTRY_SUPPORTED_VERSIONS` so
`rack-pinion-motor-sizing@0.1.0`'s own pinned manifest target stays
served. Stages 3-6 built this session: a full `ModulePackage` in
`lib/modules/belt-pulley-drive-motor-sizing/0.1.0/` (see that directory's
own `README.md`), registered in `lib/modules/registry.generated.ts`, 61
tests passing.

**The central Stage 1 finding: three independent sources state the
belt-drive and rack-and-pinion equations as ONE combined set** -- Oriental
Motor's own "Wire Belt Mechanism, Rack and Pinion Mechanism" (p. F-3),
AutomationDirect's own "Belt Drive (or Rack & Pinion) Equations" (Table 1,
p. B-6), and Andantex's own corroborating rack-and-pinion shape. At the
force/load-torque level this module therefore reproduces what
`rack-pinion-motor-sizing@0.1.0` already implements, with the pulley pitch
radius in place of the pinion's. What genuinely justifies a separate
module, evidence-backed rather than assumed: two pulleys instead of one
pinion, and a belt that carries its own translating mass (a fixed rack
carries none).

**A newly registered public source closes the gap Unit 6.4 could not:**
`us.automationdirect.sureservo_selection_appendix@2nd-ed-rev-b-08-2011`
carries a full, publicly citable belt-drive worked example (pp.
B-11-B-13), every printed figure of which was reproduced by hand this
session (`J_W=0.291`, `J_pulleys=0.0006`, `J_reflected=0.0029
lb-in-s^2`, `T_accel=0.46 lb-in`, inertia ratio `9.6`). Unit 6.4's own
rack-pinion module had to fall back on a licensed internal-only benchmark
because no such public example existed for that mechanism.

**Two real findings disclosed, not absorbed.** (1) The two primary sources
place mechanical efficiency on **opposite sides**: Oriental Motor divides
load torque by `eta`; AutomationDirect divides the **inertia** by `e` and
leaves running torque underated. Verified by hand as genuinely different,
not algebraically equivalent. This module follows Oriental Motor,
matching all three released siblings; the disagreement is recorded rather
than reconciled away. (2) AutomationDirect's own belt-drive example
contains an arithmetic slip -- its friction force is computed as
`0.05 x 100 = 5.0 lb` though the stated weight is `90 lb` (correct
`4.5 lb`) -- so this module's kernel does not reproduce its printed
`T_run`/`T_motor` figures. The third such source-internal slip this
project has found and recorded.

**Stage 3/4 found the Stage 1 spec's own reproduction claim was too
broad.** `pulley_inertia` reproduces the source's own printed figure
exactly (efficiency-independent in both conventions). But `load_inertia`,
`reflected_load_inertia`, `acceleration_torque`, and `inertia_ratio` all
inherit AutomationDirect's own disclosed `1/e` convention on the carriage
term -- reproduced only after that exact factor is reapplied at the test
level, not by this module's own kernel (`stage-1-spec.md`'s own claim that
these are all "reproduced by hand" undersold how much of that reproduction
depends on adopting AutomationDirect's own convention, which `0.1.0`
deliberately does not). A further, genuinely new Stage 3/4 finding:
`acceleration_torque` and `inertia_ratio` cannot be numerically verified
against the source's own printed `T_accel=0.46 lb-in`/`inertia ratio=9.6`
figures at all -- the source's own worked example never prints its own
candidate motor's rotor inertia as an independent figure, and back-solving
it two different ways from those two printed downstream figures disagrees
by roughly 15-20%, most plausibly compounding rounding in the source's own
low-precision intermediate results. Recorded as a disclosed evidence gap
in `validation/belt-pulley-drive-motor-sizing/0.1.0.md`, not silently
narrowed or force-fit.

The independent-benchmark item (`independent-benchmark.test.ts`)
reimplements Oriental Motor's own combined force/load-torque formula as a
structurally separate computation, proved algebraically identical across a
300-scenario property sweep -- the solo-validation reviewer-substitute
policy is invoked. Cross-module link sweep finds the same one incidental
compatible pair (`axis-load-cases@0.1.0`'s own `total_moving_mass`) every
prior Motor Sizing Tool module's own sweep already found. Full validation
record: `validation/belt-pulley-drive-motor-sizing/0.1.0.md`. Design
record: this module's own `README.md`.

## Unit 6.6 — Index-table motor sizing module

**Done and released, 2026-08-13 -- all six stages, same session.**
`index-table-motor-sizing@0.1.0`, the fifth and last mechanism module in
the Motor Sizing Tool family (ADR-0011) -- every mechanism ADR-0011's own
"Phase scope" listed is now released. Records:
`context/modules/index-table-motor-sizing/stage-1-spec.md`,
`stage-2-contract.md`. Registry `1.13.0` releases
`motor_sizing.index_table.*` (18 parameters); `1.12.0` was added to
`PARAMETER_REGISTRY_SUPPORTED_VERSIONS` so
`belt-pulley-drive-motor-sizing@0.1.0`'s own pinned manifest target stays
served.

**Genuinely different in kind from every prior Motor Sizing Tool
module, confirmed rather than merely predicted by ADR-0011.** An index
table's own motion is rotary, commanded directly in angle/time -- no
`motion.axis.*` reuse at all (the first Motor Sizing Tool module with an
entirely self-contained parameter group), no linear-to-rotary radius
conversion anywhere, and `load_torque` is a required, engineer-supplied
input with a `0 N*m` default rather than a computed output -- both
Oriental Motor's own General Catalog Technical Reference (pp. F-8-F-9,
"Frictional load is omitted because it is negligible. Load torque is
considered 0") and AutomationDirect's own SureServo Selection Appendix
(pp. B-14-B-16, `Trun = 0`, no formula given at all) independently omit a
load-torque formula for this mechanism -- the evidence gap ADR-0011's own
"Phase scope" flagged in advance, now closed against a second source, not
merely characterized.

**A genuine unit-convention finding disclosed during this session's own
hand-verification, not previously known:** AutomationDirect's own worked
examples (including the belt-drive example `belt-pulley-drive-motor-
sizing@0.1.0` already validated) compute acceleration torque with a
rounded `0.1` constant standing in for the exact `2*pi/60=0.10472`
(confirmed against the same document's own Example 7, which uses the
unrounded form). This module's own kernel uses exact physics throughout,
so its own torque outputs are systematically `~8%` higher than
AutomationDirect's own printed index-table figures -- reapplying the
source's own rounded constant and its own further-rounded intermediate
values at the test level reproduces its own printed figure exactly,
proving the deviation is fully explained, not a defect. This same
rounding convention likely also explains part of the residual
`belt-pulley-drive-motor-sizing@0.1.0`'s own validation record already
disclosed for its own AutomationDirect reference example, though that
module's own release is immutable and was not revisited.

Oriental Motor's own richer worked example (a table plus 12 discrete
mounted workpieces, parallel-axis theorem) is reproduced at the kernel
level for its own inertia and speed figures (`lib/engine/mechanics`' own
`pointMassInertia`/`offsetAxisInertia`, already-released generic physics,
reused directly); its own final torque figures use a stepping-motor
pulse-speed convention this module does not share and are a disclosed,
out-of-scope gap, not reproduced. Independent benchmark: a structurally
separate reimplementation of the full inertia-to-acceleration-torque
chain, proved algebraically identical across a 300-scenario property
sweep. Cross-module link sweep against all seven Milestone-4 modules plus
all four prior Motor Sizing Tool modules finds **zero** compatible pairs
-- the first Motor Sizing Tool module's own sweep to find none at all,
since this module reuses no `motion.axis.*` or sibling `motor_sizing.*`
parameter ID. 61 tests total. Full validation record:
`validation/index-table-motor-sizing/0.1.0.md`. Design record: this
module's own `README.md`.

## Unit 6.7 — Add-module UI: Motor Sizing Tools category step

**Done (2026-08-13).** The generic UI surface unit ADR-0011 "Add-module UI
flow" and "Existing modules: kept, immutable, hidden from the primary
picker" describe, split from any one mechanism module per the Split Rule
(a new module and a new generic UI pattern do not travel together). With
all five ADR-0011 mechanism modules released (Units 6.2-6.6), this was the
only Phase 1E deliverable left open.

`app/(workspace)/workspace/page.tsx`'s `modulePackageOptions()` now filters
out the seven Milestone 4 discipline categories (`motion.axis`,
`motion.profile`, `screw`, `guide`, `coupling`, `bearing`, `drive`) via a
new `HIDDEN_MODULE_CATEGORIES` set — a route-level list filter over an
unmodified registry, not a core-engine, module-SDK, or generic-UI change,
exactly as the ADR specifies; none of the seven modules or `linear-axis@1`
were edited, deprecated, or unregistered (the project's own immutability
invariant). `workflowDefinitionOptions()` gained the matching
`HIDDEN_WORKFLOW_IDS` filter, hiding `linear-axis@1`'s own
`StartWorkflowInstanceDialog` trigger the same way.

`components/engineering/add-module-instance-dialog.tsx` gained the
first-level category step: whenever the filtered module list contains both
a `motor-sizing.*` package and a non-motor-sizing one, two toggle buttons
("Motor Sizing Tools", defaulted to, and "Other modules") switch which
`<select>` is rendered — a mechanism picker with friendly names (Ball
Screw, Belt & Pulley Drive, Direct-Drive Conveyor, Rack & Pinion, Index
Table, from a new UI-layer-only `MECHANISM_LABELS` map keyed by module id,
not a `ModuleManifest` field — adding one there would change every
released module's own content hash) or the original flat
id@version-(category) picker. When only one side of that split is
non-empty (every test fixture today; any environment with no motor-sizing
modules registered), the toggle itself does not render and the dialog
behaves exactly as before Unit 6.7 — the same generic "keeps rendering
whatever list it is given" component the ADR requires, not a
motor-sizing-specific rewrite. Three new component tests cover the toggle
appearing/not appearing, the mechanism labels, and that the correct
`modulePackageKey` reaches `addModuleInstanceAction`; all five prior tests
pass unchanged. `lint`, `typecheck`, `test` (1747 passing, up from 1744),
and `build` all pass.

No route-file test was added for `modulePackageOptions()`/
`workflowDefinitionOptions()` themselves — `app/(workspace)/workspace/
page.tsx` has no test file today despite comparable existing orchestration
logic (deep-link precedence, panel selection), the established project
pattern of testing this route's behavior through its presentational
components (`AddModuleInstanceDialog`, `MachineNavigator`,
`WorkspaceShell`) with fixture data instead; the two new filter sets were
hand-verified against the real registry (exactly the seven Milestone 4
manifests' own `category` values; `linear-axis` is the only registered
workflow id besides the `example-workflow` dev fixture, which stays
visible — out of this ADR's stated scope).

# Milestone 7 — Common Automation Modules

Maps onto roadmap Phase 2. Candidates are scored by
`priority = usage frequency x manual pain x workflow leverage / data cost`
(`context/roadmap.md` "Module Prioritization"); pneumatic cylinders were
chosen as the first module ahead of a formal score across all nine Phase 2
candidates — the founder's own direct call (2026-08-24), since every
candidate is expected to be built eventually, so starting order matters
less than starting. Each module in this milestone is a new, standalone
family with no `linear-axis@1` role and no Motor Sizing Tool family
relationship (ADR-0011's own family is closed at five ball-screw/conveyor/
rack-pinion/belt-pulley/index-table mechanisms).

## Unit 7.1 — Pneumatic cylinder module

### Stage 1 — Engineering specification

**Done (2026-08-24).** `context/modules/pneumatic-cylinder/
stage-1-spec.md` — proposed module ID `pneumatic-cylinder`. Two sources
read directly: Milwaukee Cylinder's own *Design Engineering Guide* (US) and
SMC Corporation's own *Air Cylinders Model Selection* technical data (JP,
`smcworld.com`'s own domain, reached after a local corporate-TLS/User-Agent
fetch workaround — not a source-side block). Covers theoretical extend/
retract force, cushion kinetic-energy absorption (`E = mV^2/2`, SMC formula
7, with real per-series allowable-energy tables), air consumption/required
air volume (SMC formulas 8-16), and piston-rod buckling. Two real,
disclosed gaps carried into Stage 2, not glossed over: the two sources
disagree in *formula shape* (not just coefficients) on how a force-sizing
margin is applied — SMC's `eta` load-factor multiplier vs. Milwaukee's
load-type percentage-of-actual-load method; and no source read this session
gives a complete, directly citable, pneumatic-manufacturer-sourced
closed-form buckling formula (Milwaukee references but does not include its
own per-series Table 1; SMC gives only a pre-computed maximum-stroke lookup
table; a general hydraulic-industry source, Hänchen, confirms the generic
Euler formula shape but is not a pneumatic-specific citation) — structurally
the same kind of open item `ball-screw@0.1.0`'s own buckling-safety-margin
discrepancy (Steinmeyer `0.5` vs. Rockford `0.8`) already models, except
here no source yet supplies the constant to disagree over. Piston speed is
explicitly out of scope as a computed value — both sources state directly
that it cannot be calculated from a formula. No `pneumatic.*` registry
parameter exists yet (confirmed by `grep`); `MPa`, `N`, and `J` (reused from
`drive-train@0.1.0`'s own energy/torque-dimension addition) cover every
force/pressure/energy unit this module's own formulas need — Stage 2 found
one gap this estimate missed: the reported air-consumption/required-air-
volume outputs need a volume and a volumetric-flow-rate unit, neither of
which existed yet.

### Stage 2 — Parameter contract

**Done (2026-08-24).** `context/modules/pneumatic-cylinder/
stage-2-contract.md` — registry `1.16.0` releases the full `pneumatic.*`
group (22 parameters) plus two new unit-registry dimensions (`volume`,
`volumetricFlowRate`). Resolves both open Stage 1 items: the force-sizing-
margin disagreement turns out to be two methods answering different
questions, not one registry slot — SMC's own `eta` becomes this module's
required-no-default sizing-margin input, while Milwaukee's own load-type
percentages are documented as upstream engineering guidance for arriving
at `required_extend_force`/`required_retract_force` in the first place,
never implemented as a module formula (matching how `coupling 0.1.0`
already treats `screw.drive_torque` as an already-resolved upstream
value). Buckling ships as a real `0.1.0` check, mirroring `ball-screw`'s
own precedent: `pneumatic.mounting_style` reuses the identical four-case
Euler end-fixity enum shape `screw.end_support_arrangement` already
established (same textbook physics, deliberately *not* the same parameter
ID — this registry's own namespacing exists precisely so a resolved value
on one component is never mistaken for a compatible source on an
unrelated one, the same reasoning `motor_sizing.rack_pinion.gear_ratio`
already gives for not reusing `screw.gear_ratio`), and
`pneumatic.buckling_safety_factor` is required with no default — an even
clearer case than `screw.buckling_safety_margin`'s own two-source
disagreement, since no pneumatic-manufacturer source gives any number at
all. This session also caught and fixed a real, pre-existing gap
unrelated to this module's own scope: registry `1.15.0` (released
2026-08-18, pinned by six already-released module manifests) had never
been added to `PARAMETER_REGISTRY_SUPPORTED_VERSIONS` explicitly — the
same stranding risk `linear-guide`'s and `drive-train`'s own sessions each
caught once before for `1.4.0` and `1.7.0`. Fixed in the same edit that
adds `1.16.0`. `npx tsc --noEmit`, the full non-DB test suite (2462/2462),
and `npm run lint` (0 errors) all pass; the two pinned registry-version/
hash fixtures (`lib/engine/parameters/registry.test.ts`, `hash.test.ts`)
were updated to match, the expected update on every version bump. No
kernel or package exists yet — Stage 3 (compute and trace) is next.

### Stage 3 — Compute and trace

**Done (2026-08-24).** `lib/modules/pneumatic-cylinder/0.1.0/` — a full
package (manifest, ports, `math.ts` kernel, `input-schema.ts`, `compute.ts`,
`checks.ts`, `trace.ts`, generic UI/report schema, a draft `validation.ts`)
scaffolded via `npm run module:new` and built out with the real engineering
from stage-2-contract.md. `math.ts` implements piston areas (`A1=pi*D^2/4`,
`A2=pi*(D^2-d^2)/4`), theoretical force (`F=eta*A*P`), cushion kinetic
energy (`E=(m/2)*V^2`), a generic Euler column buckling formula
(`Fk=factor*pi^2*E_steel*J/L^2`, `J=pi*d^4/64`, steel `E=210,000 N/mm^2`),
and air consumption/required air volume (SMC's own formulas (8)-(16)) —
all in the mm/MPa/N unit system `pneumatic.*`'s own canonical units use
directly (1 MPa = 1 N/mm^2 exactly, so no conversion constant is needed,
unlike `screw.*`'s own m/Pa/N choice). The buckling formula reuses the
identical four end-fixity cases and `1/K^2` effective-length-factor values
(`0.25/1.0/2.0/4.0`) `ball-screw@0.1.0`'s own kernel already established,
reproduced independently per stage-2-contract.md "Decisions" item 3 (not
imported); `pneumatic.buckling_safety_factor` is applied as a divisor
(`F_perm = Fk / S`), not a multiplier like `screw.buckling_safety_margin` —
a deliberate difference, since Hänchen's own source (the only one with a
number) states it that way. The piston rod is assumed to be in axial
compression only on the extend (thrust) stroke — a new, explicit modeling
assumption this stage introduced (recorded in the trace, checks, and
`compute.ts`'s own assumptions list), since neither candidate source states
this directly. Two real, disclosed simplifications close gaps
stage-2-contract.md left open (no stroke-time or per-side-piping port was
released): `resolveAirDemand` assumes symmetric extend/retract piping (one
`piping_length`/`piping_bore` pair applied to both legs) and approximates
stroke time as `stroke / max_piston_speed` — both affect only the reported
(not evaluated) air-consumption/required-air-volume outputs, never a
pass/fail check.

**A real registry gap found and closed this stage, not carried over
silently:** `stage-1-spec.md`'s own "to be added at Stage 2" note for the
Milwaukee Cylinder and SMC source revisions was never actually done —
`lib/standards/engineering-sources.ts` had zero `pneumatic`/`milwaukee`
entries before this stage, confirmed by grep. Both are now registered
(`us.milwaukee_cylinder.design_engineering_guide@web-2026-08-24`,
`jp.smc.air_cylinders_model_selection@web-2026-08-24`), a prerequisite for
this module's own trace to cite SMC's formulas at all (`lib/standards/
registry.ts` validates every cited source resolves to a registered
revision).

**Reference-example reproduction (stage-2-contract.md "Stage 3 Entry
Criteria" item 5) done through the real compute path, not just
`math.ts`**, in `smc-reference-examples.ts`/`.test.ts`: SMC's own
bore-selection Example 1 (63 mm bore, eta=0.7, P=0.5 MPa, 1000 N required)
reproduces a theoretical force of 1091.0 N, clearing SMC's own selection
decision; an SMC air-consumption worked example (50 mm bore, 600 mm
stroke, 0.5 MPa, 2 m/6 mm piping) reproduces the source's own printed
sub-totals (~13 L cylinder, ~0.56 L piping) to within 0.1 L — recovered via
a text-extraction proxy this session after `smcworld.com`/
`smcpneumatics.com` both returned HTTP 403 to this session's own direct
fetch, and reproduced with a 20 mm rod diameter inferred (not stated in
the recovered text) as the value that makes both printed sub-totals match;
and an SMC cushion-capacity graph example (50 kg load, CM2-40, air
cushion, "300 mm/s or less") is cross-checked against an inferred
allowable-energy figure (2.35 J), disclosed as not independently confirmed
against a per-model table. `math.ts`'s own piston-area formula is also
spot-checked against six of SMC's own printed piston-area table entries
(6-100 mm bores), matching to within 0.3% (catalog-rounding) — confirmed,
not assumed. No worked buckling example exists in either source (a
disclosed gap `stage-1-spec.md` already recorded, not newly found).
`math.test.ts` (property/boundary tests: end-fixity ratio scaling,
`1/L^2` and `d^4` proportionality, non-positive-input rejection) and
`package.test.ts` (conformance, the four input-schema cross-field rules,
dimensional-unit assertions, per-check pass/fail/not_applicable behavior)
round out the suite — 93/93 tests pass. `npx tsc --noEmit`, `npm run lint`
(0 errors), the full non-DB test suite (2520/2520, confirmed twice — one
run's own `add-module-instance-dialog.test.tsx` failure, a file this stage
never touched, passed 13/13 in isolation and did not reproduce on rerun,
a pre-existing flake, not a regression), and `npm run build` all pass. The
module is built and tested but **not yet registered** — `npm run
registry:generate` and the module's own source-immutability hash are Stage
6 (release) work, not done here; `validation.ts` is an honest Stage 3
draft (real reference examples, but `reviewer`/`reviewDate` explicitly
state Stage 4 has not yet been performed, and `independentBenchmark`
records the open item stage-2-contract.md's own "Decisions" item 4 already
flagged, still unresolved). Stage 4 (validation: reviewer sign-off, and
resolving the still-open independent-benchmark question) is next.

### Stage 4 — Validation

**Done (2026-08-24).** Reference examples were already met at Stage 3 (see
above). The independent-benchmark question
(stage-2-contract.md "Decisions" item 4) is **partially resolved, not fully
closed -- recorded honestly as a split, not overclaimed**. Parker Hannifin's
own literature returned HTTP 403 again this session, the same block the
Stage 1 and Stage 3 sessions already recorded; no genuine second,
structurally distinct *method* (the KTR-DIN-740-vs-`coupling` or
IKO-vs-`linear-guide` kind of independent benchmark) exists for any of this
module's four formula areas. What was found instead: Norgren (IMI Precision
Engineering)'s own M/1000 "Heavy Duty Cylinders" technical data sheet
(`us.norgren.m1000_heavy_duty_cylinders@web-2026-08-24`) -- a third
manufacturer, independent of both SMC and Milwaukee, whose own printed
per-model theoretical-force and air-consumption ratings
(`lib/modules/pneumatic-cylinder/0.1.0/norgren-benchmark.ts`/`.test.ts`)
this module's own kernel was never calibrated to. Reproduced through
`resolveTheoreticalForce`/`resolveAirDemand` (at `loadFactor = 1.0` --
Norgren's own printed force carries no derating of its own, matching
Milwaukee Cylinder's own unfactored `F = P*A` convention directly) across 7
of Norgren's own 9 printed base bore sizes (76mm-305mm; 2 excluded and
disclosed -- one has a real, unresolved ~14% rod-diameter inconsistency
against the same data sheet's own dimension table), agreement is within 2%
on every one of 21 individual figures (mean absolute deviation under 1%)
for both extend/retract theoretical force and combined air consumption.
This closes the independent-benchmark item for **2 of the module's 4
formula areas** (theoretical force, air consumption) with real third-party
numeric corroboration -- not a second competing methodology, since
Norgren's own data sheet states no formula of its own, only pre-computed
ratings. **The cushion kinetic-energy-allowable and buckling formulas
still have no second independent source of any kind** -- carried forward as
an explicit, disclosed `0.1.0` limitation, the same "a real gap stays open
at release" treatment `ball-screw@0.1.0`'s own two unresolved
buckling/equivalent-load discrepancies received. `validation.ts`'s
`reviewer`/`reviewDate` are finalized ("Solo validation -- Norgren M/1000
independent-benchmark substitute (theoretical-force and air-consumption
formulas only...)", `2026-08-24`), honestly scoped to what the substitute
evidence actually covers rather than implying full coverage. Full
validation record: `validation/pneumatic-cylinder/0.1.0.md`.
`lib/standards/engineering-sources.ts` gained one new source
(`us.norgren.m1000_heavy_duty_cylinders`); `validation/source-index.md`
gained three rows (SMC, Milwaukee, Norgren) for this module.

### Stage 5 — Generic surfaces

**Done (2026-08-24), effectively already complete at Stage 3.** This
module has no upstream or downstream cross-module link and no
guided-workflow role -- `manifest.ts`'s own `workflowRoles: []` and
stage-1-spec.md's own "Existing Parameter Review" already confirmed zero
`pneumatic.*`/`load.*`/`force.*`/`mass.*` overlap with any released
parameter group, so there is no `cross-module-links.test.ts` for this
module (unlike every Milestone 4/6 module) -- confirmed, not merely
assumed. Generic UI and report schema (`ui.ts`/`report.ts`, drafted at
Stage 3) already passed conformance validation through `package.test.ts`'s
`runModuleConformance` `package-validation` check.

### Stage 6 — Release

**Done (2026-08-24).** `npm run module:source-hash -- pneumatic-cylinder
0.1.0` computed `9700fdc94f2a344f`, pinned in `package.test.ts` as
`expectedSourceHash` -- both `import-boundary` and `source-immutability`
now pass as real checks, not skipped. `npm run registry:generate`
registered the module: `pneumatic-cylinder@0.1.0` in
`lib/modules/registry.generated.ts` (25 modules total). Sealed package
content hash: `739621ff948938a9`. Full non-DB suite green (2546/2546),
`npx tsc --noEmit` clean, `npm run lint` clean (0 errors -- the one
warning `npm run lint` reports is in the pre-existing generated
`coverage/` artifact, untouched by this unit), `npm run build` clean. Unit
7.1 is now fully released -- the first Milestone 7 module, and this
project's first module with no `linear-axis@1` role and no Motor Sizing
Tool family relationship, released, registered, and validated end to end.

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
