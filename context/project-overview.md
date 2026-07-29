# MachineStudio (working name)

## Product Definition

MachineStudio is a web platform for automation machine design
engineers. It connects engineering requirements, calculation
modules, manufacturer component specifications, component
assignments, BOM items, and calculation reports inside one machine
project.

The product is not intended to replace CAD, FEA, PLM, ERP, or a
licensed standards library. It owns the engineering decision chain:

`requirement -> assumption/load case -> calculation trace -> check ->
required component specification -> assigned manufacturer part -> BOM`

The initial commercial markets are the United States and Japan,
matching where the founder's machines are delivered. Additional market
profiles and jurisdiction-specific requirements are deferred until
these two workflows are proven.

## Product Position

MachineStudio is a vendor-neutral engineering evidence and component
sizing platform for automated machinery. It replaces disconnected Excel
sizing sheets, vendor-specific selection tools, and the missing
traceability between engineering calculations and the machine BOM.

The first product workflow is a guided linear-axis design. The same
module contract must support later modules without changes to the core
engine, database shape, generic module UI, or report renderer.

## Goals

1. An engineer completes a realistic linear-axis design in under
   30 minutes, including load cases, motion profile, transmission,
   guides, drive train, manufacturer part assignment, BOM, and report.
2. Every stored result is reproducible from an immutable input snapshot,
   module package version, engine version, and source references.
3. A new module is added as a self-contained versioned module package.
   It must pass conformance tests and must not require custom changes to
   the generic engine, parameter graph, generic workspace, report
   renderer, or database schema.
4. Shared parameters remain semantically consistent across modules as
   the library expands.
5. The founder replaces the current Excel sizing workflow on at least
   one live machine project by the end of the MVP.

## Primary Users

- Automation machine design engineers
- Mechanical design engineers
- Machine builders and system integrators
- Engineering leads reviewing sizing calculations and BOM rationale

## Core User Flows

### Guided Design Flow

1. User creates a machine project and selects the target market
   profile (US or Japan).
2. User creates an assembly or axis and defines requirements,
   environment, orientation, and load cases.
3. A workflow definition adds the required calculation modules and
   proposes valid parameter links.
4. User confirms links, assumptions, and manual values.
5. User runs each module and reviews checks, margins, validity limits,
   and the calculation trace.
6. The system filters manufacturer parts against the calculated
   requirements.
7. User assigns a manufacturer part or records a custom/manual part.
8. MachineStudio generates the BOM, requirements verification matrix,
   and calculation report.
9. User creates an immutable machine baseline for design review or
   release.

### Expert Flow

1. User builds the machine and assembly tree manually.
2. User adds compatible modules in any order.
3. MachineStudio suggests links using stable parameter identifiers,
   engineering-value type, units, load case, coordinate frame, and
   scope.
4. User confirms links and runs modules independently.
5. Upstream changes mark affected runs and component assignments stale.

## MVP Module Set

The MVP is a complete linear-axis design workflow, not only four
isolated calculators.

1. Axis application and load cases
   - orientation, payload, moving mass, external forces, center-of-mass
     offsets, duty cycle, normal/peak/holding/emergency-stop cases
2. Motion profile
   - trapezoidal and S-curve profiles, move/dwell segments, speed,
     acceleration, jerk, peak and RMS outputs
3. Ball screw and screw support
   - lead, thrust, torque, life, static safety, buckling, critical
     speed, support arrangement, speed limits
4. Linear guide
   - force/moment distribution, equivalent loads, static safety, life,
     preload/clearance and arrangement checks
5. Coupling and support bearings
   - torque, bore compatibility, misalignment, stiffness, bearing load
     and support configuration
6. Servo drive train
   - motor, optional gearbox, drive/amplifier, brake, inertia ratio,
     peak/RMS torque, speed, regeneration, compatibility and derating
7. Linear-axis workflow integration
   - guided sequence, candidate system comparison, BOM, report and
     baseline

Additional modules may enter the MVP only after scoring and after the
core linear-axis workflow remains end-to-end complete.

## Module Package Requirements

Every module package contains:

- Stable module ID and semantic version
- Manifest and compatibility metadata
- Inputs and outputs using the canonical parameter dictionary
- Pure compute function
- Structured calculation trace
- Checks, warnings, and validity envelope
- Source references
- Generic UI field and result schema
- Report definition
- Validation record and automated tests
- Optional manufacturer-part schema and filter/ranking adapter

A module may use a custom UI component only when the generic schema
cannot represent the engineering interaction. The exception must be
recorded as an architecture decision.

## Parameter and Linking Model

- Parameters use stable IDs, precise definitions, canonical dimensions,
  canonical storage units, value types, semantic qualifiers, and
  deprecation rules.
- Physical values are not limited to scalars. Supported value families
  include Quantity, VectorQuantity, Curve, LoadSpectrum, Table,
  EnumValue, BooleanValue, MaterialReference, and ComponentReference.
- Link suggestions require semantic compatibility, not name similarity
  alone.
- Links are never created silently.
- Every input source is manual, linked, default, or workflow-provided.
- Upstream changes propagate stale state to dependent runs and assigned
  components in the same transaction.

## Manufacturer Part Data

The MVP stores manufacturer part specifications and their source
provenance. It does not implement a separate company-approved-part
master or procurement approval workflow.

Manufacturer part data includes:

- Manufacturer and part number
- Component type and schema version
- Specification attributes and units
- Datasheet/catalog source and source revision
- Import batch and import timestamp
- Lifecycle status when known
- Data quality status and validation errors

A lightweight `ComponentAssignment` links one manufacturer part or
manual/custom part to a module instance and the calculation run that
supports it. This is required for BOM generation and stale detection;
it is not a separate approval or project-selection workflow.

## Market Profiles

- The MVP ships two market profiles:
  `US-General-Industrial-Machinery` and
  `JP-General-Industrial-Machinery`.
- A project selects one primary market profile at creation and may add
  project-specific sources and requirements.
- Profiles store references and applicability metadata (US: OSHA, ANSI,
  NFPA, UL; Japan: Industrial Safety and Health Act, MHLW machinery
  safety guideline, JIS) and never claim certification or automatic
  legal compliance.
- Standards text is not copied into the product without an appropriate
  license. MachineStudio stores metadata, edition, clause references,
  implementation notes, and permitted links.
- Project inputs still include: state, local, customer, and Authority
  Having Jurisdiction requirements (US); Labor Standards Inspection
  Office guidance, customer, and site requirements (Japan).
- The UI remains English-only in the MVP. Japanese-language report
  output is a tracked open question, not an MVP commitment.
- Market profiles beyond the United States and Japan are explicitly
  deferred.

## Machine Data and Outputs

- Machine, assembly, workflow, and module tree
- Module status: not configured, ready, pass, fail, stale, invalid
- Requirements and verification links
- Assumptions and load cases
- Manufacturer component assignments
- Multi-level BOM
- Calculation reports per module, assembly, and machine
- Immutable machine baselines and baseline comparison
- Append-only engineering audit events

## In Scope for MVP

- Single-owner authenticated projects
- US general industrial machinery profile
- Expanded linear-axis module set
- Canonical engineering-value and parameter dictionaries
- Suggest-and-confirm parameter graph
- Generic module workspace and report renderer
- Manufacturer part specification import by CSV and manual entry
- Lightweight component assignment linked to a calculation run
- Machine tree, BOM, HTML print reports
- Immutable design baselines
- Canonical SI storage with common engineering input/display units

## Out of Scope for MVP

- Legal or certification claims
- Full functional-safety calculations
- Multi-user approval workflow
- Company-approved-part governance
- Procurement, inventory, pricing, or supplier management
- CAD, PDM, PLM, and ERP integrations
- Public or licensed redistribution of manufacturer catalogs
- Full standards-document hosting
- Runtime execution of user-uploaded calculation code
- Dark mode, mobile-first layouts, and non-English UI
- Market profiles outside the United States and Japan
- FEA, multibody simulation, and general symbolic mathematics

## Success Criteria

1. One real linear axis is designed from requirements to baseline without
   using the original sizing spreadsheet.
2. Every released module passes its conformance suite, reference tests,
   boundary tests, and validation review.
3. A newly scaffolded example module integrates without modifying the
   core engine, database schema, generic module workspace, or generic
   report renderer.
4. Changing an upstream value marks every dependent run and assigned
   part stale in one transaction.
5. The BOM identifies the assigned part, assignment source, and
   justifying calculation run for every calculated component.
6. A stored baseline reproduces its calculations and reports after new
   module and catalog versions are released.
