# MachineStudio (working name)

## Read order

Read these before implementing or making an architectural decision:

1. `context/progress-tracker.md` — current state, active work, blockers.
   **Start here.** It tells you whether the thing you are about to build is
   actually next.
2. `context/project-overview.md` — product definition and scope
3. `context/roadmap.md` — phases, priorities, and phase gates
4. `context/architecture.md` — boundaries, domain model, and invariants
5. `context/ai-workflow-rules.md` — work-unit and module delivery workflow
6. `context/code-standards.md` — implementation and verification rules

Read as needed, not by default:

- `context/implementation-map.md` — the ordered unit-by-unit execution plan.
  Read the milestone you are working in, not the whole file.
- `context/ui-context.md` — before any UI work
- `context/us-market-profile.md` / `context/jp-market-profile.md` — before
  any standards, source-citation, or market-specific work
- `context/adr/` — before changing behaviour an ADR covers
- `context/modules/<module>/` — before working on that module
- `validation/` — before changing a validated calculation

Do not read by default:

- `context/archive/` — frozen history. Read only when you need the reasoning
  behind a past decision, or when a source comment cites
  `context/progress-tracker.md` for rationale that is no longer there.
- `docs/archive/` — completed implementation plans, kept for reference only.

## Updating documentation

Update `context/progress-tracker.md` when status, blockers, or open
decisions change — by editing the relevant section, never by appending a
dated narrative entry.

If implementation changes architecture, scope, standards policy, module
contracts, parameter semantics, UI conventions, or roadmap order, update
that context file too. A decision that constrains future implementation
belongs in an ADR, not in the tracker.

## Invariants

Released module versions, released parameter-registry versions, calculation
runs, validation records, and machine baselines are immutable.
