# Module Instance Version Change

## Decision

Add a "Change version" action to an existing module instance, moving it to a
different registered version of the *same* `modulePackageId` in place —
preserving manual input values and confirmed links wherever the target
version's ports still use the same canonical `parameterId`. Today the only
path is delete-and-recreate, which loses every manual value, link, and
workflow-role wiring the instance had.

Two new application-layer use cases
(`lib/application/projects/change-module-instance-version.ts`):

1. **`previewModuleInstanceVersionChange`** — read-only port diff between the
   instance's current package and the target version, plus a downstream
   stale-impact count.
2. **`changeModuleInstanceVersion`** — the commit: repoints the instance's
   `moduleVersion`, clears its last-run status, and marks it and every
   downstream instance stale — identical treatment to any other input change.

## Context

Raised while fixing `belt-pulley-drive-motor-sizing`'s bento-layout UI: the
founder's existing module instance was pinned to an older version (0.2.0)
that still exposes `gravity` as an editable field, while the latest version
(0.3.1) hardcodes it. The only existing fix was recreating the instance from
scratch, losing every other input the founder had already entered. See
`context/progress-tracker.md` for the belt-pulley 0.3.0/0.3.1 history this
builds on.

## Why this is simpler than it sounds

`ParameterValueRecord` and `ParameterLinkRecord` rows
(`lib/db/repositories/graph-types.ts`) are keyed by canonical `parameterId`
(plus `loadCase`), not by a module's port key, and a `ModuleInstanceRecord` is
just a pointer pair (`modulePackageId`, `moduleVersion`) those rows reference
by `moduleInstanceId`. Because sibling module versions overwhelmingly reuse
the same `motion.axis.*`/`motor_sizing.<mechanism>.*` parameter IDs across
versions (belt-pulley 0.2.0→0.3.1 changes only the `gravity` port), most
values already "just work" the moment the instance's `moduleVersion` pointer
changes — no value migration code is needed. Only genuinely dropped or newly
added ports need special handling, and both are diff output, not migration
logic.

## Scope

- Same `modulePackageId` only — this is a version change, not a mechanism
  change. Switching mechanism families still means delete-and-recreate.
- Any registered version is selectable, including older ones (a downgrade) —
  every module version is independently released and validated
  (`CLAUDE.md` "Invariants"), so "newer" carries no inherent safety
  guarantee this feature should encode as a restriction.
- A workflow-role instance (`workflowInstanceId` set) can still change
  version; the workflow relationship itself (`workflowInstanceId`,
  `configurationId`, `assemblyId`) is untouched — only `moduleVersion`
  changes.

## `previewModuleInstanceVersionChange`

```ts
interface ModuleInstanceVersionDiff {
  readonly droppedPorts: readonly { portKey: string; parameterId: string; label: string }[];
  readonly newPorts: readonly { portKey: string; parameterId: string; label: string; required: boolean }[];
  readonly unchangedPortCount: number;
  readonly staleModuleInstanceCount: number;
}
```

Input: `moduleInstanceId`, `targetVersion`, `ownerId`.

1. Load and authorize the instance (`loadModuleInstanceForOwner`, same
   pattern as every other single-instance use case in this layer).
2. `getModulePackage(instance.modulePackageId, instance.moduleVersion)` for
   the current package (must resolve — an already-registered instance always
   has a real package) and `getModulePackage(instance.modulePackageId,
   targetVersion)` for the target. `undefined` target →
   `{ ok: false, error: { code: "module_not_found" } }`.
3. `targetVersion === instance.moduleVersion` → `invalid_input` (nothing to
   change).
4. Diff **input** ports by `(parameterId, loadCase)`: in current but not
   target → `droppedPorts`; in target but not current → `newPorts` (carrying
   `required` from the target port so the confirm dialog can flag "this will
   start unset and required"); in both → counted in `unchangedPortCount`.
   Diff **output** ports by `parameterId` the same way and fold any dropped
   output ports into `droppedPorts` too (a downstream link sourcing a dropped
   output orphans exactly like a dropped input's own value does).
5. `staleModuleInstanceCount`: reuse `computeStaleImpact` (already imported
   by `stale-propagation.ts`) seeded from this instance's own graph node,
   exactly as `previewRemoveParameterLinkImpact` seeds it from a link's
   source node — the count of distinct downstream module instances reached.

Read-only: no writes, no transaction.

## `changeModuleInstanceVersion`

Input: `moduleInstanceId`, `targetVersion`, `ownerId`. Same authorization and
target-resolution checks as the preview (duplicated validation, not a shared
private helper that would need its own file — matches this codebase's
existing preview/commit pairs, e.g. `previewRemoveParameterLinkImpact` /
`removeParameterLink`, which do not share one either).

In one transaction:

1. `updateModuleInstanceVersion(moduleInstanceId, targetVersion)` — new
   `lib/db/repositories/project-repository.ts` function, sibling to the
   existing `renameModuleInstance`. Updates only `moduleVersion`,
   `lastCalculationRunId` (→ `null`), `lastRunStatus` (→ `null`),
   `updatedAt`. `modulePackageId`, `id`, `assemblyId`, `configurationId`,
   `workflowInstanceId`, `archivedAt`, `createdAt` are all untouched.
2. `markRunsStaleForModuleInstances` /
   `markComponentAssignmentsStaleForModuleInstances` for this instance and
   every instance `computeStaleImpact` found downstream — the same two calls
   `stale-propagation.ts`'s existing use cases already make, given the same
   node set the preview computed.

No `ParameterValue`/`ParameterLink` row is created, updated, or deleted.
Values/links referencing a now-dropped port simply stop being read by
`resolveModuleInputs` (its port list comes from the *target* package from
this point on) — inert, not cleaned up, matching this codebase's existing
"orphaned rows are harmless, not worth a cleanup pass" posture elsewhere
(e.g. archived-instance rows are never physically deleted either).

### Error handling

Same `{ code, message }` shape every other use case in this layer returns:
`unauthorized` (not owned), `invalid_input` (missing/equal target version),
`module_not_found` (target version not registered for this
`modulePackageId`). No new error codes needed beyond what `AddModuleInstance`
and the stale-propagation use cases already define.

## Supporting: `listRegisteredVersions`

New query in `lib/modules` (alongside the existing `getModulePackage`,
`MODULE_REGISTRY`-backed): `listRegisteredVersions(modulePackageId): string[]`
— every registered version string for that package id, sorted descending by
semver. Powers the dialog's version `<select>`; excludes nothing (including
the current version — the dialog filters that client-side so the "nothing to
change" case never round-trips to the server).

## UI

`ChangeModuleVersionDialog` (new component, `components/engineering/`),
structurally mirroring `AddModuleInstanceDialog`:

- Triggered by a new "Change version" `<Button>` next to the
  `modulePackageId@moduleVersion` caption in `module-input-workspace.tsx`'s
  header.
- A version `<select>` populated from `listRegisteredVersions`, current
  version excluded, sorted descending (newest first).
- On selecting a version, calls a new server action wrapping
  `previewModuleInstanceVersionChange` and renders the diff: dropped ports
  (with a note that their stored value/link will no longer apply), new
  required ports (flagged distinctly from new optional ones), and "N
  downstream module instances will be marked stale."
- A "Confirm" button calls a new server action wrapping
  `changeModuleInstanceVersion`, then closes the dialog and revalidates the
  workspace view — the page re-renders against the target version's
  `ModuleUiSchema`, which is also what makes belt-pulley's bento layout
  (`docs/superpowers/plans/...` bento work, same session) apply automatically
  the moment an instance lands on 0.3.1.
- No preview/confirm step is skippable — matches the founder's explicit
  choice (no silent version switch).

## Testing

- `lib/application/projects/change-module-instance-version.test.ts`: port-diff
  correctness using a real registered version pair
  (`belt-pulley-drive-motor-sizing` 0.2.0 → 0.3.1 is the natural fixture — it
  exercises a dropped port, an unchanged large majority, and 0.3.1's
  `disabledWhen`-driven fields all at once), ownership/unauthorized rejection,
  equal-version and unregistered-version rejection, and stale-propagation
  correctness (both the target instance and a downstream-linked fixture
  instance end up marked stale).
- `ChangeModuleVersionDialog` component test: version list rendering, diff
  rendering after selection, confirm wiring.
- One `load-module-workspace-view` or workspace-shell integration-level test
  confirming a changed instance's rendered fields reflect the *target*
  version's `ModuleUiSchema`, not the version it was created with.
