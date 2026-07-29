# ADR-0003: Versioned module package contract (`ModulePackage` SDK boundary)

- Status: Accepted
- Date: 2026-07-28
- Related: `context/architecture.md` "Module Package Contract" and
  `lib/modules/`; `context/roadmap.md` "Module Definition of Done";
  `context/implementation-map.md` Units 1.6–1.7 (delivered in
  `lib/engine/module-sdk/`)

## Context

MachineStudio's MVP module set (axis load cases, motion profile, ball
screw, linear guide, coupling and support bearings, servo drive train)
must all share one generic engine, parameter graph, generic module
workspace, and report renderer
(`context/project-overview.md` "Product Definition": "The same module
contract must support later modules without changes to the core engine,
database shape, generic module UI, or report renderer"). Without a fixed
contract between "the engine" and "a module," each new calculator would
be tempted to add its own persistence shape, its own UI, or its own
report logic — which is exactly what `context/architecture.md` Invariant
#13 ("Generic extension") and the roadmap's module scoring/gating exist
to prevent.

A module also needs to evolve (bug fixes, new source editions, expanded
scope) without invalidating calculation runs that already reference an
older version, which requires versioning at the package level, not just
at the level of individual formulas.

## Decision

Every calculation module is a self-contained, versioned package under
`lib/modules/<module-id>/<version>/` that exports exactly one
`ModulePackage` object conforming to the SDK in `lib/engine/module-sdk/`:

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

(`context/architecture.md` "Module Package Contract"). The manifest
carries a stable module ID, semantic version, package content hash,
engine SDK compatibility range, parameter-registry version, category/
tags, workflow roles, validity-envelope summary, and source-reference
IDs. `compute` is pure and deterministic and returns output values, a
structured calculation trace, checks, warnings, assumptions, and
validity-limit results (`ModuleComputation`). The engine only ever
touches a module through the public SDK functions — `validateModulePackage`
at registration time and `executeModule` at run time
(`lib/engine/module-sdk`) — never a module's internals directly.

A released module version is never edited in place
(`context/code-standards.md` "Module Packages": "A released version is
never edited"). Module code cannot import `app`, database, authentication,
file storage, or network packages (engine/module purity, enforced by the
module conformance suite's import-boundary check). A module may add new
released parameter definitions (Stage 2 of the New Module Workflow) and
an optional component schema, but adding a module must not require a
Prisma schema change for module-specific inputs, outputs, traces, or
catalog attributes (`context/architecture.md` "Module Consistency
Mechanisms").

## Consequences

- A new module integrates by authoring a `ModulePackage` and registering
  it (`lib/modules/registry.generated.ts`, produced by the Unit 1.7
  scaffolder/codegen tooling) — never by modifying `lib/engine`, the
  generic UI renderer, the report renderer, or the Prisma schema. This is
  the roadmap's Module Definition of Done item #15 and the
  `context/project-overview.md` Success Criteria #3.
- Custom UI is an explicit, narrow exception: a module may ship a custom
  UI component only when the generic schema cannot represent the
  engineering interaction, and that exception itself requires its own ADR
  (`context/project-overview.md` "Module Package Requirements";
  `context/code-standards.md` "Module Packages": "Custom UI is an
  exception requiring an ADR").
- Module versioning composes directly with ADR-0002 (immutable runs): a
  `CalculationRun` stores the exact module semantic version and package
  content hash it executed against, so an old run remains reproducible
  after a module is upgraded, and old module versions remain executable
  (`context/roadmap.md` Phase 0C gate: "Old module versions remain
  executable").
- The conformance suite (`lib/engine/module-sdk` `runModuleConformance`)
  and the scaffolder give every module the same mechanical checks
  (manifest validity, stable parameter references, pure package import
  boundary, input/output validation, trace completeness, generic UI/
  report schema conformance, validation-record presence, package-hash
  integrity), which is what makes "no core-engine change" enforceable
  rather than aspirational.
- Cost: every module carries the overhead of the full contract (manifest,
  ports, schemas, validation record) even for a simple calculation. This
  is accepted because cross-module consistency and long-term
  reproducibility outweigh per-module implementation speed
  (`context/code-standards.md` "General": "Engineering correctness and
  traceability outrank implementation speed").
