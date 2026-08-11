# linear-axis 1.0.0 — Draft Workflow Definition (Unit 4.8)

`definition.ts` is the first guided-workflow definition in this codebase
(`context/architecture.md` "lib/workflows/": "The first workflow is
`linear-axis@1`"), coordinating the seven Milestone-4 calculation modules
(`axis-load-cases`, `motion-profile`, `ball-screw`, `linear-guide`,
`coupling`, `support-bearing`, `drive-train`) without combining their
compute logic. It is pure declarative data conforming to the generic
`WorkflowDefinition` contract in `../../workflow-sdk/` — see
`context/adr/0007-workflow-definition-contract.md` for the full reasoning
behind every design choice summarized here.

## Roles

Seven roles, one per module, each naming the real module ID(s) that may
fill it (`context/architecture.md`: a workflow declares "Required and
optional module IDs" — not a category match):

| Role                   | Module            | Cardinality                                                                                                                                                                                                                                               |
| ---------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `linear-axis.axis`     | `axis-load-cases` | 1                                                                                                                                                                                                                                                         |
| `linear-axis.motion`   | `motion-profile`  | 1                                                                                                                                                                                                                                                         |
| `linear-axis.screw`    | `ball-screw`      | 1                                                                                                                                                                                                                                                         |
| `linear-axis.guide`    | `linear-guide`    | 1 (the module's own scope already covers a full two-rail/four-block arrangement in one run)                                                                                                                                                               |
| `linear-axis.coupling` | `coupling`        | 0-1 — deliberately optional: the founder confirmed (2026-08-10) direct-drive axes (no separate coupling component) are a real configuration.                                                                                                              |
| `linear-axis.bearing`  | `support-bearing` | 1-2 — `support-bearing 0.1.0` models one bearing (fixed or supported) per run, so a fixed+supported arrangement needs two instances of this role. The fixed/supported distinction lives in each instance's own `bearing.location` input, not in the role. |
| `linear-axis.drive`    | `drive-train`     | 1                                                                                                                                                                                                                                                         |

## Link proposals

Nine rules, each declared only as `(parameterId, fromRole, toRole)` — never
a hardcoded port key — resolved at runtime against the real present
instances' ports through the engine's own `evaluateLinkCompatibility`
(`../../workflow-sdk/links.ts`). This satisfies the Unit 4.8 gate: "All
workflow links are derived from canonical parameter contracts; no hardcoded
database field-to-field wiring exists."

| Parameter                          | From -> To                                                                                                                                                                                                                                      |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `motion.axis.thrust_force`         | axis -> screw                                                                                                                                                                                                                                   |
| `motion.axis.thrust_force`         | axis -> bearing (resolves to both bearing instances; only the fixed-location one actually needs it — the port is declared regardless of location, so both receive a proposal, and an engineer leaves the supported instance's copy unconfirmed) |
| `motion.axis.resultant_force`      | axis -> guide                                                                                                                                                                                                                                   |
| `motion.axis.resultant_moment`     | axis -> guide                                                                                                                                                                                                                                   |
| `screw.drive_torque`               | screw -> coupling                                                                                                                                                                                                                               |
| `screw.drive_torque`               | screw -> drive                                                                                                                                                                                                                                  |
| `motion.profile.peak_acceleration` | motion -> drive                                                                                                                                                                                                                                 |
| `motion.profile.peak_deceleration` | motion -> drive                                                                                                                                                                                                                                 |
| `motion.profile.rms_acceleration`  | motion -> drive                                                                                                                                                                                                                                 |

Three parameters are shared by several roles with **no producing module**
among the seven (`motion.axis.orientation`, `screw.lead`,
`screw.gear_ratio`) — these are ordinary assembly-scoped values, not
module-to-module links, so Unit 1.8's existing nearest-scope suggestion
engine already proposes one shared source to every consuming role with zero
new mechanism. `motion.axis.case_linear_velocity` and
`motion.axis.case_time_fraction` have no producer either, and stay
engineer-supplied per-instance inputs for `0.1.0` — this is the same
documented gap every one of the seven modules' own
`cross-module-links.test.ts` already records, not a new one.

## Cross-module checks — final disposition

`context/implementation-map.md` Unit 4.8 lists five example cross-module
checks. Only one is implementable as new code against the real, released
`0.1.0` ports; the rest are either already covered by existing mechanisms or
genuine, documented gaps — inventing a numeric check with no sourced basis
would violate this project's "do not invent product behavior" policy
(`context/ai-workflow-rules.md` "Handling Missing Requirements").

| Example                                                      | Disposition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Motion speed vs. screw critical/manufacturer speed           | **Gap.** `ball-screw`'s own `checks.ts` already runs its `critical-speed-{case}`/`dn-limit` checks against its own per-case `case_linear_velocity` input (an existing, engineer-supplied gap). `motion-profile`'s own cycle-level `peak_velocity` output is explicitly documented (`lib/engine/parameters/definitions.ts`) as distinct from that per-case value, so there is no sourced mapping between the two to check.                                                                               |
| Screw torque/inertia vs. drive-train limits                  | **Torque: covered.** `screw.drive_torque` -> `drive-train` is a confirmed link; `drive-train`'s own `checks.ts` already runs `rms-torque-{case}`/`peak-torque-{case}` against it. **Inertia: gap.** `drive.reflected_load_inertia` (checked by `drive-train`'s own `inertia-ratio` check) is a required engineer-supplied input — no module among the seven produces an inertia/mass output to link it to.                                                                                              |
| Guide load cases use the same axis frame and duty definition | **Covered.** The force/moment half is already guaranteed once the `link_confirmed` completion rules are satisfied — `linear-axis.axis` has cardinality 1, so there is structurally only one possible source once a link is confirmed. The orientation half (an independent input on both `axis-load-cases` and `linear-guide`, not a module-to-module link) is the one genuinely new thing this workflow adds: the `shared-orientation` `shared_value_topology` check.                                  |
| Assigned bores and shaft interfaces are compatible           | **Gap.** `coupling`'s bore/shaft ports (`coupling.driving_bore_min/max`, `driven_bore_min/max`, `driving_shaft_diameter`, `driven_shaft_diameter`) and `support-bearing`'s (`bearing.bore_diameter`, `bearing.outside_diameter`) are distinct parameter IDs in distinct namespaces with no approved mapping — and physically a stepped shaft can legitimately have different diameters at the coupling vs. the bearing seat, so a blind equality check would invent an engineering rule with no source. |
| Vertical holding behavior has a recorded design response     | **Implemented as a completion rule, not a check.** `ball-screw`'s manifest explicitly scopes `holding`/`emergency_stop` out of `0.1.0`; `drive-train`'s `drive.brake_rated_torque` is reported-only with no check. No parameter anywhere represents a required holding torque to check numerically, so `vertical-holding-acknowledged` instead requires a recorded `Assumption` (ID `linear-axis.vertical-holding-response`) whenever the axis's resolved orientation is `"vertical"`.                  |

The two remaining "shared-value" risks this workflow _does_ guard against —
`screw.lead` and `screw.gear_ratio`, each entered independently by several
roles with no producing module — get their own `shared_value_topology`
checks (`shared-lead`, `shared-gear-ratio`) for the same reason as
orientation: nothing else would catch two roles silently diverging on a
value that should be single-sourced.

## Candidate comparison

Four criteria, in a declared priority order (screw static safety factor at
peak load, screw nominal life, guide nominal life at peak load, drive
inertia ratio) — a starting point for the founder to refine, not a
validated priority. Ranking is lexicographic over this order, never a
weighted score: a weighted formula would invent relative-importance numbers
with no sourced basis, while ordering the criteria list is the founder's
own explicit, reviewable judgment call
(`../../workflow-sdk/comparison.ts`'s own file header). A candidate with
any failing check is disqualified outright, never ranked ahead of a passing
one.

## Status

This is a Stage-3-equivalent draft: a complete, tested `WorkflowDefinition`
plus the generic `workflow-sdk` machinery to resolve links, evaluate
checks/completion/status, and compare candidates. There is no release gate
for workflows yet — this is the _first_ one, so none has been defined — and
no `lib/application` wiring, Prisma changes, or UI exist yet; those are
explicitly out of scope for this pass (see the ADR's "Consequences").
Unit 4.1 (`axis-load-cases@0.1.0`) released 2026-08-11
(`validation/axis-load-cases/0.1.0.md`) and is now registered through
`lib/modules`'s own registry (`index.ts`, not `package.ts`) — this
workflow's `linear-axis.axis` role can resolve a real module. The other
six roles' modules (`motion-profile`, `ball-screw`, `linear-guide`,
`coupling`, `support-bearing`, `drive-train`) remain unregistered
(`package.ts`, not `index.ts`, on every one) pending their own Stage 6;
this workflow definition does not change that.
