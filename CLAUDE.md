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

Also read relevant files under `context/adr/` and `validation/` before
changing affected behavior.

Update `context/progress-tracker.md` after every meaningful implementation
change; update `context/progress/unit-3.md` instead for a Unit 3.x change.

If implementation changes architecture, scope, standards policy, module
contracts, parameter semantics, UI conventions, or roadmap order, update
the relevant context file before continuing.

Released module versions, released parameter-registry versions,
calculation runs, validation records, and machine baselines are immutable.
