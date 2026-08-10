# ADR-0007: Workflow definition contract (`WorkflowDefinition` SDK boundary)

- Status: Accepted
- Date: 2026-08-10
- Related: `context/architecture.md` "lib/workflows/"; `context/roadmap.md`
  Phase 1D; `context/implementation-map.md` Unit 4.8 (delivered in
  `lib/workflows/workflow-sdk/`, concrete definition in
  `lib/workflows/linear-axis/1.0.0/`)

## Context

`context/architecture.md` names `lib/workflows/` as the boundary for
"Guided engineering workflows that coordinate compatible modules without
combining their compute logic," declaring "Required and optional module
IDs; Module sequence; Initial parameter-link proposals; Completion rules;
Workflow-level checks; Candidate system comparison rules," and states "The
first workflow is `linear-axis@1`." Until this unit, no code implemented
that boundary at all — no `WorkflowDefinition` contract existed anywhere in
the engine, the same way no `ModulePackage` contract existed before
ADR-0003.

By Unit 4.8, seven Milestone-4 modules (`axis-load-cases`, `motion-profile`,
`ball-screw`, `linear-guide`, `coupling`, `support-bearing`, `drive-train`)
were drafted through Stage 5 under the roadmap's parallel-specification
allowance, each with a real `ModuleManifest.workflowRoles: []` waiting for a
workflow vocabulary to populate it, and each with real, already-registered
canonical parameter ports. `linear-axis@1` is the first thing to actually
consume that shape, so this ADR fixes the contract from a concrete case
rather than speculatively, matching `context/code-standards.md` "General":
"Prefer explicit duplication over premature abstraction."

Unit 4.1's own release remains blocked behind a genuine external-evidence
gap unrelated to this unit (missing revision-confirmed source records —
`context/progress-tracker.md` "Blocked"). Building the workflow definition
does not depend on that evidence and does not change that gate: none of the
seven modules are registered through `lib/modules`'s own registry
(`package.ts`, not `index.ts`, on every one), and Stage 6 (release) for all
of them stays sequentially gated behind Unit 4.1 regardless.

## Decision

`lib/workflows/workflow-sdk/` is the generic, reusable contract every
workflow definition follows (mirroring `lib/engine/module-sdk/`'s own split
of contract types from algorithm files):

```ts
interface WorkflowDefinition {
  manifest: WorkflowManifest;               // id, version, title, description
  roles: readonly WorkflowModuleRole[];     // id, label, moduleIds, cardinality
  sequence: readonly (readonly string[])[]; // ordered dependency levels of role IDs
  linkRules: readonly WorkflowLinkProposalRule[];
  completionRules: readonly CompletionRule[];
  checkRules: readonly WorkflowCheckRule[];
  comparisonCriteria: readonly CandidateComparisonCriterion[];
}
```

A concrete workflow lives at `lib/workflows/<workflow-id>/<version>/
definition.ts`, mirroring the module version-directory convention. It is
**pure declarative data** — it never imports a specific `ModulePackage` or
hardcodes a port key. All resolution against real modules happens in
`workflow-sdk`'s algorithm files, given real instances by the caller (today:
a test fixture; eventually the application layer) — the same "the engine
never fetches its own input" discipline a module's own `compute` already
holds itself to.

**Role declares module IDs, not a category.** `context/architecture.md`
says a workflow declares "Required and optional module IDs" verbatim, so
`WorkflowModuleRole.moduleIds: readonly string[]` is the matching
mechanism, not a looser category match — a future alternative
implementation of the same role must be added to the list explicitly.

**Link proposals are never a hardcoded port-key pair.**
`WorkflowLinkProposalRule` names only `(parameterId, fromRoleId,
toRoleId)`. `resolveLinkProposals` (`workflow-sdk/links.ts`) enumerates
every candidate output/input port pair on the present role instances
matching that parameter ID and runs each pair through the existing engine
link evaluator (`lib/engine/graph/compatibility.ts`,
`evaluateLinkCompatibility`) — the same function Unit 1.8 already built and
every module's own `cross-module-links.test.ts` already exercises. That
evaluator's own load-case rule already rejects a normal-output-to-peak-
input pair, so per-case pairing needs no bespoke logic in the workflow
layer. This is what the Unit 4.8 gate requires: "All workflow links are
derived from canonical parameter contracts; no hardcoded database
field-to-field wiring exists."

**Completion rules are a small, closed discriminated union** —
`role_cardinality`, `link_confirmed`, `no_failing_checks`, and
`conditional_acknowledgment` — chosen because these four cover every
concrete gating need `linear-axis@1` has today. `conditional_acknowledgment`
reuses the existing `Assumption` shape (`lib/engine/module-sdk/types.ts`)
as the "recorded design response" record rather than inventing a new one;
this is how the vertical-holding requirement below is satisfied.

**Workflow-level checks are separate from a module's own `checks.ts`** —
the workflow-sdk `checks.ts` module exists because a module's own checks
only ever see its own inputs and cannot see whether two *different* role
instances agree on a value with no producing module at all (e.g.
`screw.lead`, required by four roles with no upstream port). This pass
implements exactly one check kind, `shared_value_topology`: it asserts that
every named role's input for a given parameter resolves, through a
confirmed `GraphLink`, to the identical source node — a real, sourced risk
(a role silently diverging on a value that should be single-sourced), not a
speculative one. It reuses `CheckResult`'s existing pass/fail/not_applicable
semantics rather than inventing a new result shape.

**Five example cross-module checks, five different dispositions.**
`context/implementation-map.md` Unit 4.8 lists five examples. Each was
checked against the seven modules' real, released `checks.ts`/`manifest.ts`
files before deciding what to do with it — inventing a check with no
sourced basis would violate `context/ai-workflow-rules.md` "Handling
Missing Requirements": "Do not invent product behavior."

| Example | Disposition | Why |
| --- | --- | --- |
| Motion speed vs. screw critical/manufacturer speed | Documented gap, not coded | `ball-screw`'s own `checks.ts` already runs this against its own per-case `case_linear_velocity` input (an existing gap); `motion-profile`'s cycle-level `peak_velocity` is explicitly documented as a distinct value with no sourced mapping to it |
| Screw torque/inertia vs. drive-train limits | Torque covered by the confirmed link + `drive-train`'s existing checks; inertia is a documented gap | `drive.reflected_load_inertia` is a required engineer-supplied input — no module among the seven produces an inertia/mass output |
| Guide load cases use the same axis frame/duty | Implemented — force/moment via `link_confirmed` (cardinality 1 on the axis role structurally forecloses a second source once confirmed), orientation via `shared_value_topology` | Orientation is an independent input on two modules, not a module-to-module output, so nothing else would catch divergence |
| Bores/shaft interfaces compatible | Documented gap, not coded | No shared parameter ID between `coupling`'s and `support-bearing`'s bore/shaft ports, and a stepped shaft can legitimately have different diameters at each location — a blind equality check would invent an engineering rule |
| Vertical holding has a recorded design response | Implemented as a `conditional_acknowledgment` completion rule, not a numeric check | No parameter in this project's registry represents a required holding torque; `ball-screw` explicitly scopes `holding`/`emergency_stop` out of `0.1.0` |

**Role cardinality models physical reality without inventing scope.**
`support-bearing 0.1.0` computes one bearing (fixed or supported) per run,
so its role allows 1-2 instances — the fixed/supported distinction stays in
each instance's own `bearing.location` input, not duplicated into the role
shape. `coupling`'s role allows 0-1 instances: whether a direct-drive axis
(no separate coupling) is a real scenario was an open product decision,
recorded here and in `context/progress-tracker.md` "Open decisions" rather
than guessed. **Resolved 2026-08-10:** the founder confirmed direct-drive
axes are a real configuration, so the role stays optional as designed — no
cardinality change.

**Candidate comparison is lexicographic, never weighted.**
`compareCandidateSystems` (`workflow-sdk/comparison.ts`) ranks candidates by
`comparisonCriteria` in declared order — earlier criteria dominate ties. A
weighted formula would require inventing relative-importance numbers with
no sourced basis; ordering the criteria list is instead the founder's own
explicit, reviewable judgment call, changeable without touching code. A
candidate with any failing `CheckResult` is disqualified outright and
never ranked ahead of a passing one, reusing existing check-status
semantics verbatim (`context/code-standards.md` "Checks and Status":
"Warnings never convert a failed requirement into a pass").

**`WorkflowStatus` mirrors Prisma's `WorkflowInstanceStatus` enum exactly**
(`draft | active | completed | abandoned`) — the same "kept in lockstep"
pattern the schema already uses for `LoadCaseCategory`.
`evaluateWorkflowStatus` never returns `"abandoned"`: that is an explicit
user action, not a state derivable from engineering data.

**No `lib/application`, Prisma, or UI wiring in this pass.** `lib/workflows`
stays as pure and DB-free as `lib/modules` — no I/O, no import from `lib/db`,
`lib/application`, `lib/catalog`, `app`, or `components`. Wiring a
`WorkflowInstance` through the application layer, persisting proposals/
confirmations/acknowledgments, and any UI are explicitly future work.
**Update (Unit 4.9, 2026-08-10):** the application-layer wiring is now
built — `lib/application/workflows/` (`startWorkflowInstance`,
`loadWorkflowInstanceView`) and `lib/db/repositories/workflow-repository.ts`
— proven against a new `example-workflow@1.0.0` registry entry rather than
`linear-axis@1` itself, since none of its own seven modules are registered
yet. `lib/workflows` itself is unchanged: still pure and DB-free. Only the
UI surface remains future work.

## Consequences

- A future workflow (Phase 2+) is added by authoring a new
  `WorkflowDefinition` at `lib/workflows/<id>/<version>/definition.ts` and
  registering it in `lib/workflows/registry.ts` — never by modifying
  `workflow-sdk` itself unless the shared contract genuinely needs to grow
  (the same "generic extension" discipline ADR-0003 established for
  modules).
- `lib/workflows/registry.ts` is hand-maintained, not generated
  (`lib/modules/registry.generated.ts`'s own codegen tooling is not built
  here) — deliberate, since there is exactly one entry; build a generator
  only once a second workflow exists.
- The two documented gaps (motion-speed-vs-screw-speed,
  bore/shaft-interface compatibility) remain real, sourced limitations of
  `linear-axis@1`, not silently absent behavior — they are recorded in
  `lib/workflows/linear-axis/1.0.0/README.md`'s own disposition table so a
  future session does not need to re-derive this reasoning from scratch.
- The `coupling` role's 0-1 cardinality is now a settled product decision
  (resolved 2026-08-10, direct-drive axes are real, cardinality unchanged).
  A future scenario that instead needs a *required* coupling role in some
  other workflow would still be an additive, non-breaking
  `WorkflowModuleRole.cardinality` change, not a contract change.
- `linear-axis@1`'s own comparison-criteria ordering (screw static safety
  factor, screw nominal life, guide nominal life, drive inertia ratio) is a
  starting point, not a validated priority — the founder may reorder it
  without any code-level implication beyond editing the array.
- Alternatives considered and rejected: a category-based role match (looser
  than "module IDs," but contradicts the architecture doc's literal
  wording); a weighted candidate-scoring formula (rejected — invents
  unsourced importance numbers); reusing `suggestSources`' nearest-scope
  ranking directly for link proposals instead of a dedicated
  `resolveLinkProposals` (rejected — `suggestSources` answers "what could
  feed this one sink," which is the right question for the Expert Flow's
  per-field UI, not "what does this workflow's own rule set propose across
  every present instance," which needed its own rule-driven enumeration
  built on top of the same `evaluateLinkCompatibility` primitive).

## Notes

None yet.
