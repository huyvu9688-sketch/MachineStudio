# AI Workflow Rules

## Approach

Build incrementally with a spec-driven, validation-gated workflow. The
context files define product scope, architecture, module contracts,
engineering evidence, and current progress. When implementation and a
specification disagree, resolve the disagreement before continuing.

## Work-Unit Rule

Work on one verifiable unit at a time. A unit is one of:

- One generic engine capability
- One module package step
- One application use case
- One database schema increment
- One route group
- One generic UI surface
- One report surface
- One import adapter

A work unit must have a clear input, output, test plan, and exit criterion.

## Split Rules

Split work when it combines:

- A Prisma schema change and new engineering formulas
- A new module and a new generic UI pattern
- More than two system boundaries from `architecture.md`
- A new generic framework capability and production module behavior
- Requirements that are not defined in the context files
- Work that cannot be verified quickly end to end

## Required Read Order

Before implementation, read:

1. `project-overview.md`
2. `roadmap.md`
3. `architecture.md`
4. `us-market-profile.md`
5. `jp-market-profile.md`
6. `ui-context.md`
7. `code-standards.md`
8. `ai-workflow-rules.md`
9. `implementation-map.md`
10. `progress-tracker.md`

Read relevant ADRs and validation records before changing affected
behavior.

## Generic Platform Workflow

For an engine, graph, storage, or UI framework unit:

1. Identify the invariant and public contract
2. Write or update the specification and ADR if needed
3. Add failing contract/unit tests
4. Implement the smallest complete behavior
5. Add persistence or UI integration in a separate unit when required
6. Run lint, typecheck, tests, and build
7. Update progress tracker and affected context files

## New Module Workflow

A module is developed in these stages. Do not combine stages unless the
implementation map explicitly treats them as one unit.

### Stage 1 — Engineering specification

- Define purpose and supported applications
- Define assumptions and validity envelope
- Identify required load cases
- Identify inputs, outputs, intermediate values, checks, and warnings
- Record formula and method sources with editions and clauses/pages
- Identify reference examples and independent benchmark method

### Stage 2 — Parameter contract

- Map ports to released canonical parameter IDs
- Propose missing parameters through the registry checklist
- Review related modules for overlap and semantic consistency
- Define value type, units, qualifiers, direction/frame, and load-case
  semantics
- Release the required parameter-registry version

### Stage 3 — Compute and trace

- Scaffold the module package
- Implement pure compute logic
- Emit stable calculation-trace steps
- Implement checks, warnings, and validity evaluation
- Add reference, boundary, dimensional, and property tests

### Stage 4 — Validation

- Compare against published worked examples
- Compare against an independent method or established tool
- Record tolerances and deviations
- State unsupported conditions
- Complete reviewer and validation record
- When no second engineer is available, the documented independent
  benchmark comparison serves as the review substitute and is recorded
  as such in the validation record

### Stage 5 — Generic surfaces

- Add generic UI schema
- Add report schema
- Add workflow role and link integration
- Add catalog adapter when the module supports part matching
- Run module conformance and workflow integration tests

### Stage 6 — Release

- Freeze module version and content hash
- Register the package
- Update documentation and progress tracker
- Confirm build and full test suite

Do not start the next production module until the active module has
passed its definition of done, except when the roadmap explicitly allows
parallel research/specification work.

## Module Consistency Review

Before releasing any new module:

1. Compare every input and output with related modules
2. Verify parameter IDs and meanings are reused correctly
3. Verify peak/RMS, required/allowable, static/dynamic, and load-case
   qualifiers
4. Verify coordinate frame and direction requirements
5. Verify unit/display conversions
6. Verify workflow link suggestions are deterministic
7. Verify reports use computation traces
8. Verify no module-specific database or generic UI change was introduced

Any inconsistency blocks release.

## Catalog Workflow

1. Define or reuse the component type schema
2. Record manufacturer source and revision
3. Create versioned import mapping
4. Validate every row and produce an import error report
5. Normalize units through the unit package
6. Implement hard filters
7. Implement transparent ranking only after hard filters
8. Add matching tests against known parts
9. Store exact manufacturer part revision on assignment

Do not create company approval, purchasing, or supplier workflows in the
MVP.

## Market Standards and Source Workflow

- Use `us-market-profile.md` and `jp-market-profile.md` as the starting
  profiles for their markets
- Confirm the exact edition or effective requirement before encoding a
  standards-based check
- For Japanese sources, record the Japanese title plus an English
  working title; the Japanese identifier and text are authoritative
- Store source metadata and clause references; do not paste unlicensed
  standards or JIS content
- Distinguish regulatory requirement, consensus standard, manufacturer
  method, handbook method, and company rule
- Never claim the whole machine is compliant based on partial checks
- Add market profiles beyond the US and Japan only through a separate
  roadmap decision

## Handling Missing Requirements

- Do not invent product behavior
- Resolve ambiguous behavior in the relevant context file
- Add unresolved items to `progress-tracker.md`
- Record cross-cutting or difficult-to-reverse decisions as ADRs
- Use visible placeholders only in research/specification documents, not
  released module behavior

## Protected Files and Records

Do not modify without explicit reason:

- `components/ui/*`
- Applied `prisma/migrations/*`
- Released module versions
- Released parameter-registry versions
- Released validation records
- Immutable calculation runs and machine baselines
- Third-party library internals

Changes require a new version or migration rather than in-place editing.

## Documentation Synchronization

Update documentation whenever implementation changes:

- Product scope or roadmap
- System boundary or invariant
- Parameter definitions
- Module contract
- Storage model
- US market/source profile
- Code conventions
- UI patterns
- Implementation sequence

Update `progress-tracker.md` after every meaningful implementation unit.

## Required Verification Before Completing a Unit

1. Unit exit criterion is met
2. Relevant invariants remain satisfied
3. Tests for the changed boundary pass
4. No released module, parameter, run, or baseline was mutated
5. Documentation is synchronized
6. `npm run lint` passes
7. `npm run typecheck` passes
8. `npm run test` passes
9. `npm run build` passes
10. E2E tests pass when the unit changes a critical user flow
