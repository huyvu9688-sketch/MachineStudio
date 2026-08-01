# MachineStudio (working name)

## Application Building Context

Read the following files in order before implementing or making an
architectural decision:

1. `context/project-overview.md` — product definition and scope
2. `context/roadmap.md` — phases, priorities, and phase gates
3. `context/architecture.md` — boundaries, domain model, and invariants
4. `context/us-market-profile.md` — US source and compliance-reference
   policy
5. `context/jp-market-profile.md` — Japan source and compliance-reference
   policy
6. `context/ui-context.md` — UI system and engineering workspace patterns
7. `context/code-standards.md` — implementation and verification rules
8. `context/ai-workflow-rules.md` — work-unit and module delivery workflow
9. `context/implementation-map.md` — detailed ordered execution plan
10. `context/progress-tracker.md` — current state and next work unit

For normal Unit 3.x (Milestone 3) continuation work, read
`context/progress/unit-3.md` instead of the full progress tracker — it
holds complete Unit 3.1+ history, decisions, and the next Unit 3 brief.
Read both files for a full project audit.

For Unit 4.x (Milestone 4) continuation work, also read
`context/progress/unit-4.md` — it holds the Unit 4.1 status summary and
the next safe work unit. Unlike `progress/unit-3.md`, it is a short
pointer, not full detail: the module-contract record lives in
`context/axis-load-cases-stage-1-spec.md` and
`context/axis-load-cases-stage-2-contract.md`, and generic-engine/UI work
this milestone motivates is recorded in `context/progress-tracker.md`
directly (it is not module-specific, so it does not belong in a
per-module spec file).

Also read relevant files under `context/adr/` and `validation/` before
changing affected behavior.

Update `context/progress-tracker.md` after every meaningful implementation
change; update `context/progress/unit-3.md` instead for a Unit 3.x change.
Update `context/progress/unit-4.md`'s status summary too for a Unit 4.x
change (in addition to, not instead of, `progress-tracker.md` — see above).

If implementation changes architecture, scope, standards policy, module
contracts, parameter semantics, UI conventions, or roadmap order, update
the relevant context file before continuing.

Released module versions, released parameter-registry versions,
calculation runs, validation records, and machine baselines are immutable.
