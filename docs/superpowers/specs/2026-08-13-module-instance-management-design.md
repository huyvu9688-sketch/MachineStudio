# Module Instance Management — Friendly Labels, Rename, Archive

## Decision

Add three small, related capabilities to module instances in the machine
navigator, none of which exist today (there is currently no rename or delete
path for a module instance anywhere in the app — only assemblies can be
renamed, and nothing can be deleted):

1. A friendly default value for the "Instance label" field when adding a
   module, so new instances stop defaulting to raw ids like
   `belt-pulley-drive-motor-sizing@0.1.0`.
2. A rename action for existing module instances, so already-created
   poorly-named instances can be fixed — mirrors the existing
   `RenameDialog` + `renameAssemblyAction` pattern used for assemblies today.
3. An archive ("remove") action for module instances that clutter a
   configuration, with a stale-impact preview before the user commits,
   mirroring `previewRemoveParameterLinkImpact`'s existing role for single
   parameter links.

## Context

Raised alongside the `belt-pulley-drive-motor-sizing@0.2.0` motion-profile
work (`docs/superpowers/specs/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0-design.md`)
in the same session, but scoped as its own unit — a UI/data-layer change, not
a module/engineering change, and this project's own workflow rules split work
across system boundaries rather than bundling unrelated changes. A friendly
mechanism-name lookup (`MECHANISM_LABELS` in `add-module-instance-dialog.tsx`)
already exists for the *mechanism picker dropdown*, but the free-text
"Instance label" field a founder types when adding a module has no default —
which is why existing instances in the founder's own project ended up named
after the raw module id.

Archiving a module instance touches the "calculation runs ... are immutable"
invariant (`CLAUDE.md`); the founder confirmed the resolution below (archive,
not hard-delete) explicitly, rather than it being assumed.

## Friendly Default Label

In `AddModuleInstanceDialog`, track the selected package as component state
(the dialog currently only tracks `category`, not the specific package) and
set the "Instance label" `<Input>`'s value to `mechanismLabel(pkg)` for a
motor-sizing mechanism, or `pkg.modulePackageId` otherwise, whenever the
package selection changes — while the field stays fully editable, so a
founder can still type a more specific name (e.g. "X-axis belt drive") before
saving. This does not touch already-created instances.

## Rename

New DB repository function alongside the existing `renameAssembly`
(`lib/db/repositories/project-repository.ts`), scoped to module instances and
authorized the same way (`assembly.configuration.project.ownerId` chain). New
server action `renameModuleInstanceAction`
(`app/(workspace)/workspace/actions.ts`), reusing the existing `RenameDialog`
component unchanged. Wired into `ModuleRow` in `machine-navigator.tsx` as a
new icon-button action, the same visual slot `AssemblyRow` already gives its
own rename action.

## Archive (Remove)

**Data handling:** archiving never deletes rows. It sets a new status field
on the module instance (e.g. `archivedAt: DateTime | null`, mirroring how
`lastRunStatus` already exists as nullable module-instance state) —
parameter values, parameter links (both incoming and outgoing), and run
history for that instance stay exactly as they are. This is the founder's
own confirmed resolution to the immutability tension: "calculation runs ...
are immutable" is read literally, so removal must not delete run rows, not
even indirectly by cascading through their owning module instance.

**Effects of archiving:**

- The instance disappears from `MachineNavigator`'s assembly tree and from
  the link-suggestion index other fields draw on when a founder is filling in
  a value (`buildConfigurationSuggestionIndex`, surfaced via
  `LinkSuggestionPanel` — an archived instance's outputs stop being suggested
  as a source for new links on other, active instances), filtered to exclude
  archived ones.
- Existing parameter links **into** an archived instance's own inputs and
  **out of** its outputs to other instances are left in place, not
  auto-removed — an archived instance can still resolve and (if the owner
  chooses) still be run directly by a saved deep link, since nothing about
  its own data changed. What changes is discoverability, not capability.
- No new "show archived" surface ships in this unit — deliberately deferred
  (see Out of Scope). Archiving is a one-way action from the navigator's own
  point of view until that surface exists.

**Impact preview:** new use case `previewArchiveModuleInstanceImpact`,
mirroring `previewRemoveParameterLinkImpact`'s existing shape — reports how
many other module instances have a parameter link sourced from this
instance's own outputs (those instances do not become stale, since the link
itself is not removed, but the preview still names them so the founder knows
what depends on the instance they are about to hide), and whether this
instance fills a workflow role (`WorkflowInstance` attachment) so the founder
is not surprised by an unfilled role appearing in a guided workflow.

**UI:** a new "Archive" icon-button action on `ModuleRow`
(`machine-navigator.tsx`), opening a confirmation dialog (new component,
follows the existing `Dialog` primitives already used throughout
`components/engineering/`) that shows the impact preview's findings before
the founder confirms.

## Out of Scope

- A "show archived instances" / unarchive surface — deferred until a founder
  actually needs to recover one; archiving stays a hidden-not-gone state in
  the meantime.
- Assembly deletion/archiving — not requested, and assemblies have their own
  separate set of tree/children implications not covered here.
- Any change to how `resolveModuleInputs` or link resolution treats an
  archived instance's own *inputs* (e.g. whether an archived instance can
  still be linked *from* by others) — instances are archived because the
  founder considers them clutter, not because their data becomes invalid;
  no change in resolution behavior is intended or specified here beyond
  navigator/picker visibility.

## Open Questions (for the implementation plan, not resolved here)

- Exact Prisma schema shape for the new archive field (nullable
  `DateTime` vs. a boolean plus a separate audit trail) — a database schema
  increment, its own boundary per `ai-workflow-rules.md`'s Work-Unit Rule,
  decided at implementation time.
- Whether the impact preview also needs to walk into archived-but-still-linked
  instances transitively (an archived instance whose own inputs are linked
  from a second archived instance) — likely out of scope for a first version,
  confirmed at implementation time once the preview's real shape is drafted.
