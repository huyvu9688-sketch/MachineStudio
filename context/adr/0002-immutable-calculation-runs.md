# ADR-0002: Immutable calculation runs and baselines

- Status: Accepted
- Date: 2026-07-27
- Related: `context/architecture.md` "Calculation Reproducibility" and
  Invariants #7 ("Immutable runs") and #11 ("Baseline immutability");
  `context/implementation-map.md` Unit 2.3 and Unit 2.9;
  `context/roadmap.md` Phase 1D gate ("Baseline remains reproducible
  after newer modules and catalog imports")

## Context

MachineStudio's engineering-evidence chain (`context/project-overview.md`
"Product Definition": requirement → assumption/load case → calculation
trace → check → required component specification → assigned part → BOM)
is only trustworthy if a stored calculation result can be reproduced
exactly, including which module version, engine version, parameter-
registry version, and source-reference editions produced it
(`context/architecture.md` "Calculation Reproducibility"). A model where
a calculation run or a released design baseline can be edited in place —
even to "fix" a mistake — breaks that guarantee: there would be no way to
tell whether a stored report reflects the inputs and formulas that were
actually reviewed.

The same problem applies to a released machine baseline
(`context/project-overview.md` "Success Criteria" #6: "A stored baseline
reproduces its calculations and reports after new module and catalog
versions are released").

## Decision

`CalculationRun` snapshots and `MachineBaseline` snapshots are immutable
once created. A run stores the full resolved input snapshot, output
snapshot, trace and checks, assumptions and load-case IDs, engine
semantic version and build hash, module semantic version and package
hash, parameter-registry version, source-reference IDs and editions, and
validity envelope (`context/architecture.md` "Calculation
Reproducibility"). None of those engineering-snapshot fields have an
update path (`context/implementation-map.md` Unit 2.3 "Constraints": "No
update path for engineering snapshot fields"). A baseline additionally
freezes the requirements/assumptions, assembly/module tree, parameter
values and links, run IDs and package hashes, component assignments, BOM,
and market/source profile versions in effect at baseline creation
(`context/architecture.md` "Core Domain Model" and Unit 2.9).

Corrections never mutate an existing run or baseline. A corrected input,
formula, or component assignment always produces a **new** run (and, if
released, a new baseline). The one field allowed to change after creation
is a run's or assignment's **stale state** — a side-channel flag, not the
computation payload — set by the stale-propagation service when an
upstream value changes (`context/architecture.md` Invariant #8
"Transactional stale propagation"; `context/implementation-map.md` Unit
2.3 "Stale state may change; the original computation payload may not").

## Consequences

- A stored run or baseline can always be re-rendered from its own
  snapshot without re-executing the current module code, which is what
  lets `context/architecture.md` Invariant #9 ("Trace-driven reporting")
  and the Phase 1D gate hold: newer module and catalog versions never
  silently change a released report.
- Every "fix" is additive: the audit trail (`AuditEvent`,
  `context/architecture.md` "Audit") accumulates a full history of runs
  rather than overwriting evidence, which is required for a design-review
  and safety-documentation product.
- Storage grows append-only; there is no in-place cleanup of superseded
  runs in the MVP. This is an accepted cost, not an oversight — pruning
  policy is deferred, not designed around by allowing mutation.
- Enforcement is layered, not merely conventional: `context/code-
  standards.md` "Database and Migrations" requires immutable records to
  be "protected by service rules and database constraints where
  practical," and `context/ai-workflow-rules.md` "Protected Files and
  Records" lists "Immutable calculation runs and machine baselines"
  explicitly.
- This decision is inseparable from ADR-0003 (versioned module packages):
  a run's reproducibility depends on the module package version and
  content hash it references also being immutable once released.
