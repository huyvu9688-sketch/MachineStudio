# Module Input Workspace: Preview Run, Batched Save, and a Link-Suggestion Menu — Design

## Status

Founder-directed UI fix (2026-08-27), triggered by a live screenshot of the
generic module workspace during `dual-rod-cylinder-sizing` implementation.
This unit is explicitly split from that module's own work per
`ai-workflow-rules.md`'s Split Rule ("a new module and a new generic UI
pattern") — it touches only the generic module workspace shared by every
released module, `app/(workspace)/workspace/actions.ts`, and one new
`lib/application/calculations/` service. No module package
(`lib/modules/*`), no `ModuleUiSchema` contract change, no
`dual-rod-cylinder-sizing` code.

## Problem

Today's generic module workspace (`components/engineering/
module-input-workspace.tsx`, Unit 3.3/3.4) gives every input field its own
independent `<form>` and its own Save button (`setModuleInputValueAction`,
one parameter per submit). Run lives entirely separately, in
`ModuleResultPanel`'s header (Unit 3.5), and always reads whatever is
currently persisted in the database.

Two founder complaints, both from actually using the workspace:

1. Clicking Save once per field, for every field, before Run can see any of
   it, is tedious when a module has 7-10 inputs and the founder expects to
   iterate (try a bore size or pressure, see if it passes, try another)
   several times before landing on values worth keeping.
2. The always-visible "Suggested sources" panel under every field (Confirm
   / View source / Dismiss, Unit 3.4) reads as unexplained clutter — the
   founder did not know what it was for.

## New interaction model

- **Run** becomes a *preview*: it computes using whatever values are
  currently in the form — typed or not yet saved — and shows the result.
  It writes nothing to the database: no `ParameterValue`, no
  `CalculationRun`, no `revalidatePath`. It can be clicked repeatedly while
  the founder tries different combinations.
- **Save** becomes the single commit point: it persists every field's
  current value *and* executes + persists a real `CalculationRun`, so the
  saved result is immediately what reports, BOM, and component-assignment
  candidates see. This mirrors "N field-Saves then one Run click" exactly —
  just as one action instead of several.
- Confirming a link suggestion stays a separate, immediate, independently
  persisted action (unchanged) — it was already independent of any field's
  Save state before this redesign, and stays that way.

This is a genuinely new capability: nothing in this codebase today computes
a module's output without also persisting it. It fits how catalog sizing
actually gets used (try values, keep the one that passes) and, as a side
effect, removes a small consistency risk the old per-field-Save-then-Run
flow already had (the saved `CalculationRun`'s input snapshot is now always
produced in the same action that saved the inputs, not a separate click at
an arbitrary later time).

## Data flow

### Reuse `resolveModuleInputs`, override only the editable ports

Both new actions build on the same base: call the existing
`resolveModuleInputs` (Unit 2.2) for the module instance exactly as
`loadModuleWorkspaceView`/`executeModuleInstance` already do today — this
correctly resolves every `linked`, `workflow`, `default`, and `disabled`
port from the database, unchanged. Then, for every port that the *client*
is allowed to edit (source is `manual`/`workflow`/`default`, kind is
`quantity`/`vector_quantity`/`enum`/`boolean`, and the port is not
`disabled`), override that port's value with whatever the submitted
`FormData` contains for it, parsed the same way `setModuleInputValueAction`
parses it today.

This means:

- A `linked` field's value always comes from the database (via the
  existing `resolveModuleOutputValue` path `resolveModuleInputs` already
  calls) — there is no client control for it to submit in the first place.
- A `disabled` field's value always comes from the database — its control
  renders with the HTML `disabled` attribute, and disabled controls are
  excluded from form submission by the browser itself, so there is nothing
  to override with even if we wanted to.
- An `unsupported` field (no native editor — curve, or a non-axis
  `vector_quantity`) behaves the same as today: no control, resolved from
  the database only, editable exclusively by confirming a link.

### Field submission naming

One form now carries every field, so each field's inputs are namespaced by
its port key to avoid name collisions: `fields.<portKey>.magnitude`,
`fields.<portKey>.unit`, `fields.<portKey>.option`, `fields.<portKey>.
checked`, `fields.<portKey>.component-0/1/2`, plus the existing
identifying hidden inputs (`fields.<portKey>.parameterId`, `fields.
<portKey>.valueKind`, `fields.<portKey>.loadCase`) — same per-kind shape
`setModuleInputValueAction` already parses, just prefixed. The new shared
parsing helper (extracted from `setModuleInputValueAction`'s existing
per-kind branches — quantity/vector_quantity/enum/boolean, unchanged
validation logic) is called once per port key found in the submitted
`FormData`.

### `previewModuleComputationAction` (new)

Thin Server Action → new `lib/application/calculations/
preview-module-computation.ts`. Authorization and module-instance/
configuration lookup follow the same pattern `executeModuleInstance`
already establishes (ownership-scoped, module instance must belong to the
authenticated user). Builds the overridden input map as described above,
calls the module package's own `compute()` directly, and returns the
`ModuleComputation` result (or a typed error, e.g. a missing-required-input
message identical in wording to what `executeModuleInstance` already
produces today) without persisting anything. This is the one genuinely new
use case this unit adds.

### `saveModuleInputsAction` (new)

Thin Server Action, no new application service. Loops the submitted,
overridable ports and calls the existing, unchanged `setParameterValue`
once per port (skipping `linked`/`disabled`/`unsupported` ports — nothing
to write for those), unconditionally, whether or not that port's value
actually changed since the last save. (Deliberately not tracking
per-field "dirty since last save" — the client only needs to track "does
every required field currently have *some* value," for Run's disabled
state, not a full change-tracking model. Resubmitting an unchanged value is
a harmless no-op write.) Then calls the existing, unchanged
`executeModuleInstance`. Two sequential existing calls, not one new
cross-field database transaction — reusing two already-tested services is
lower-risk than building new transactional plumbing, at the cost of the
same narrow "crash mid-loop leaves a partial save" exposure the current
per-field-click model already has today (not a regression).

The old `setModuleInputValueAction` is removed once nothing references it,
after confirming no other caller depends on it (a repo-wide check as part
of implementation, not assumed here).

## UI structure

### Action bar

`ModuleInputWorkspace` wraps its entire field-group tree in one `<form>`.
A sticky header inside that form (below the module title, above the field
groups) holds two submit buttons: `Save` (`formAction={saveModuleInputsAction}`)
and `Run` (`formAction={previewModuleComputationAction}`).

`Run` is `disabled`, with a tooltip naming what's still missing, until
every required, non-`disabled`, non-`unsupported` field either (a) has a
non-empty client-tracked value, or (b) is satisfied by a confirmed link
(source `linked`) — regardless of that link's own run status; a
stale/not-run linked source still shows its own existing warning text next
to the field, and if Run is clicked anyway with such a field, the preview
action surfaces a normal compute error the same way a missing input does.

This requires a small piece of new client state: a completeness map
(`Record<portKey, boolean>`) in `ModuleInputWorkspace`, seeded on mount
from each field's initial server-resolved value (so already-saved fields
count as complete immediately, not just after the user types), updated on
each editable control's `onChange`. This is the only field-level React
state this unit introduces — everything else about a field (its label,
badge, help text, suggestions) keeps rendering from server props exactly
as today.

"Non-empty" per field kind: `quantity` needs a parseable magnitude (unit
always has a default selection, so it's never the blocker); `vector_quantity`
needs all three components parseable; `enum` needs a selected option
(the control already forces this — no blank option once a value exists,
per the existing `FieldControl` rendering); `boolean` is always complete
(a checkbox is always definitively true or false, never empty).

### Result pane

`ModuleResultPanel` gains a third display state alongside "no run yet" and
"showing the last saved run": **Preview**. After a Run click, it renders
the fresh, unpersisted `ModuleComputation` with a visible banner ("Preview
— not saved. Click Save to keep this result."), using the same
`useActionState` pattern already used elsewhere in this codebase — the
action's returned state drives the render directly, no page reload.
Clicking Run again replaces the preview in place. Clicking Save clears the
preview state; the page revalidates and shows the real, persisted
`CalculationRun` (with its own "previous run" comparison against whatever
was persisted immediately before it) — unchanged from how Save-triggered
runs render today.

### Link-suggestion menu

`link-suggestion-panel.tsx`'s always-visible "Suggested sources" box is
replaced by a small ⋮ (meatball) icon button placed right after the
field's label / required-tag / source-badge row. It renders nothing when
`field.suggestions` is empty (same as today's panel rendering nothing).
Clicking it opens a Radix `DropdownMenu` (this codebase's existing
primitive) listing every suggestion as one row — its explanatory text
(`"Use payload mass 12 kg from Axis Requirements / Normal load case?"`,
unchanged) plus inline Confirm / View source / Dismiss controls, identical
underlying behavior to today (Confirm still calls the unchanged
`confirmSuggestedLinkAction`; View source still expands inline detail
within the same row; Dismiss is still client-side-only, recomputed every
render, nothing persisted). No suggestion-count badge on the trigger
itself — a plain icon, per founder preference.

### Source badges — unchanged

`SourceBadge` keeps reflecting the field's last-*saved* server state
(`manual`/`linked`/`default`/`workflow`/"Not set") exactly as today. A
badge does not change just because the user is mid-edit on an unsaved
value — the input control itself already shows what was typed. No new
"unsaved"/"dirty" badge state is introduced.

## Non-goals

- No change to `lib/modules/*` (any module package), `ModuleUiSchema`, or
  `ModuleReportSchema`.
- No change to `dual-rod-cylinder-sizing` or any other module's own files.
- No change to the catalog/component-assignment panel
  (`component-assignment-panel.tsx`), which still requires a real
  supporting `CalculationRun` — Save (not Run/preview) is what produces
  one, unchanged from that panel's own existing requirement.
- No new cross-field database transaction — Save reuses two existing,
  separately-transactional services sequentially (see above).
- No change to `resolveModuleInputs`, `executeModuleInstance`,
  `setParameterValue`, or `confirmSuggestedLinkAction` themselves — all
  reused unchanged.

## Testing

- New unit tests for `preview-module-computation.ts`, mirroring
  `execute-module-instance.test.ts`'s fixture style minus persistence
  assertions (confirms nothing is written to the database on a preview
  call).
- A component test asserting Run's disabled state across required /
  linked / disabled field combinations, and that it re-enables once every
  required field is satisfied.
- Existing `module-input-workspace.test.tsx`, `link-suggestion-panel.
  test.tsx`, and `module-result-panel.test.tsx` suites updated for the new
  single-form shape and the new preview/save action names, rather than
  replaced wholesale.

## Documentation to update

`context/ui-context.md`'s "Generic Module Workspace" (Input pane / Result
pane) and "Link Suggestions" sections need to describe the new model —
required by `ai-workflow-rules.md`'s Documentation Synchronization rule
("UI patterns" is explicitly listed). `context/progress-tracker.md` gets a
status update once this unit ships.
