# UI Context

## Theme

Light, professional engineering workspace. The shell uses a strong blue
app bar, contextual actions, collapsible machine navigator, large working
canvas, and bottom engineering status bar. Inspiration may be taken from
modern calculation tools, but no branding or proprietary visual design is
copied.

Light mode only in the MVP. All colors use tokens so future themes do not
require component changes.

## Colors

| Role | CSS Variable | Value |
| --- | --- | --- |
| Page background | `--bg-base` | `#F3F4F6` |
| Surface | `--bg-surface` | `#FFFFFF` |
| App bar | `--bg-appbar` | `#1565C0` |
| Primary text | `--text-primary` | `#1F2937` |
| Muted text | `--text-muted` | `#4B5563` |
| Text on accent | `--text-on-accent` | `#FFFFFF` |
| Primary accent | `--accent-primary` | `#1565C0` |
| Accent hover | `--accent-hover` | `#114E9E` |
| Border | `--border-default` | `#E5E7EB` |
| Error / fail | `--state-error` | `#DC2626` |
| Success / pass | `--state-success` | `#15803D` |
| Stale / warning | `--state-stale` | `#B45309` |
| Information | `--state-info` | `#1D4ED8` |
| Not configured | `--state-neutral` | `#6B7280` |
| Interactive surface (hover) | `--surface-hover` | `rgba(21, 101, 192, 0.06)` |
| Interactive surface (selected) | `--surface-selected` | `rgba(21, 101, 192, 0.1)` |

Text tokens must meet contrast on their intended backgrounds per the
accessibility target below. State colors are never the only signal; pair
them with an icon and label.

`--surface-hover`/`--surface-selected` (added Unit 3.1) are translucent
tints of `--accent-primary` for hover/selected rows (navigator, menus) —
they work over any surface without a separate light/dark value.

## Shadows

| Role | CSS Variable | Value |
| --- | --- | --- |
| Subtle elevation | `--shadow-sm` | `rgba(0, 0, 0, 0.08) 0px 1px 3px 0px` |

Prefer borders over shadows for panel separation. Use `--shadow-sm` for
dropdowns, popovers, and floating panels only.

## Typography

| Role | Font | Variable |
| --- | --- | --- |
| UI text | IBM Plex Sans | `--font-sans` |
| Values/code | IBM Plex Mono | `--font-mono` |

Font stack: `IBM Plex Sans, -apple-system, BlinkMacSystemFont,
"Segoe UI", sans-serif`.

Type scale (px): 12 (fine print, table meta), 13 (dense engineering
tables, minimum for data), 14 (body and forms, base size), 16 (pane
titles), 18 (section titles), 20 (page titles), 24 (rare display use).
Weights 400/500/600. Hierarchy uses size and weight rather than color
alone.

Calculated values, units, part numbers, tolerances, and formula symbols
use mono with `tabular-nums`. Body text stays at or above 14 px; 13 px
is permitted only inside dense data tables.

## Motion

| Token | Value |
| --- | --- |
| `--motion-instant` | `100ms` |
| `--motion-fast` | `150ms` |
| `--motion-normal` | `200ms` |

Ease-out curves only; no bounce or elastic. Every animation must have a
`prefers-reduced-motion: reduce` alternative (crossfade or instant).
Do not animate layout properties.

## Interaction States

Every interactive component defines all of: default, hover,
focus-visible, active, disabled, loading, and error. Keyboard-first:
all actions reachable by keyboard, with a visible focus ring
(`--accent-primary`, 2 px, offset 2 px) that is never suppressed.
Accessibility target: WCAG 2.2 AA, with testable acceptance criteria
per component (contrast, focus order, name/role/value).

## Merged from Calculeaf DESIGN.md — adopted and rejected

Adopted: IBM Plex Sans/Mono, motion duration tokens, the subtle
`--shadow-sm`, the component state matrix, keyboard-first and
focus-visible rules, and the WCAG 2.2 AA target.

Rejected as scraping artifacts (do not re-import in future sessions):
`color.surface.base=#000000` (black surface in a light app),
`font.size.base=13.33px` with a 10 to 13.33 px scale (below readable
data-UI sizes), the 2 to 9 px spacing scale (computed paddings, not a
system; keep the Tailwind 4 px grid), `radius.xl=50px` (pill-button
artifact), and the mislabeled `text.inverse`/`text.tertiary` colors.

## Border Radius

| Context | Class |
| --- | --- |
| Inline / small UI | `rounded-md` |
| Cards / panels | `rounded-lg` |
| Modals / overlays | `rounded-xl` |

## Component Library

Use shadcn/ui on Tailwind. Generated components live in
`components/ui/` and are not hand-edited. Engineering compositions live
in `components/engineering/`.

shadcn-generated components reference shadcn's own semantic CSS variable
names (`--background`, `--primary`, `--primary-foreground`, `--accent`,
`--destructive`, `--border`, `--ring`, `--radius`, etc.), not this file's
named tokens directly. `app/globals.css` aliases every one of those
variable names to the tokens above (`--primary: var(--accent-primary)`,
`--destructive: var(--state-error)`, and so on) — the supported shadcn
customization path. This means every newly generated primitive
automatically renders in the palette above with zero per-component edits;
never hardcode a color inside a generated `components/ui/*` file to work
around a mismatch — fix or extend the alias in `globals.css` instead.
`tw-animate-css` supplies the `animate-in`/`animate-out`/`fade-*`/`zoom-*`
utility classes several generated components use; a global
`prefers-reduced-motion: reduce` rule in `globals.css` disables all
animation/transition durations app-wide, covering these and every other
animation in one place rather than opting in per component.

## Application Shell

- 48 px app bar: product name, project/configuration, global actions
- Context action bar: workflow/module actions
- 280 px collapsible navigator: machine, assemblies, workflows, modules,
  requirements, BOM, and reports
- Main canvas: active workspace
- Bottom status bar: unit display profile, run status, stale count,
  failed checks, active market profile

**Implemented (Unit 3.1, `components/engineering/`):** `AppBar`,
`ContextActionBar`, `MachineNavigator`, `WorkspaceCanvas`, `StatusBar`,
composed by `WorkspaceShell`. The project/configuration pickers are real
`<Link>`s to `?project=`/`?configuration=` (deep-linkable, survives a
reload) rather than client-only state. Navigator collapse is instant, not
animated — animating the navigator's width would animate a layout
property, which this file's Motion section already forbids. Assembly rows
are the tree's only interactive rows (real expand/collapse); module-
instance rows and the Requirements/BOM/Reports section are informational
only in this unit — nothing they would open exists yet
(Units 3.6/3.7, Milestone 5), so they are not styled as if they were
clickable. The status bar's "stale count" field is a fixed placeholder for
the same reason: staleness lives on `CalculationRun`/`ComponentAssignment`,
one read hop past what this unit loads. **Update (Unit 3.5):** the result
pane now renders one module's own stale state (see "Generic Module
Workspace" below), but the status bar's count would need a different,
tree-wide aggregate read (every module instance's latest run, not one) that
`implementation-map.md`'s Unit 3.5 deliverable list does not name — it
remains a placeholder, revisit only if a later unit actually needs that
aggregate. "Unit display profile" is likewise a fixed label ("SI
(canonical)") — there is no persisted, user-configurable display-unit
profile yet, only the per-module display units `lib/engine/units` already
supports.

**Implemented (Unit 3.2, project/assembly management):** create/rename
project, create/rename assembly, and add-module-instance are now real,
Server-Action-backed dialogs (shadcn `Dialog` + React 19 `useActionState`),
not placeholders. Assembly rows are no longer only expand/collapse —
each carries three always-visible 24px icon actions (add sub-assembly, add
module, rename), not a hover-only affordance
(`ux-pro-max` `hover-vs-tap`: "don't rely on hover alone") and not a
kebab/overflow menu (a Dialog trigger nested inside a Radix DropdownMenu
item is a known focus-management conflict — simple always-visible buttons
sidestep it entirely). "Add workflow instance" is deliberately **not**
built: no workflow-definition registry or `lib/workflows` boundary exists
yet (Unit 4.8), so there is nothing real to populate a picker with; adding
a free-text workflow-id field would let a user create instances with no
backing definition, which is worse than not offering it. Revisit once a
workflow registry exists. "Reorder assemblies" is also deferred — the
`Assembly` model has no position/order column, so this needs a schema
change and is its own future unit, not folded into Unit 3.2 (Split Rule:
a Prisma schema change does not travel with a UI unit).

## Server Actions

`app/(workspace)/workspace/actions.ts` (Unit 3.2) holds the workspace
route's Server Actions — `"use server"`, so it may only export async
functions; the shared `ActionState` type/`IDLE_ACTION_STATE` constant this
file's forms all use live in the sibling `action-state.ts` instead. Each
action is thin glue only (authorize via Clerk, parse `FormData`, call one
`lib/application` service, map its result) — real validation and ownership
checks live in the application service, the same division of labor
`code-standards.md` "Next.js" already establishes for route handlers.
Dialog components close themselves on a successful result by "adjusting
state during render" (comparing the action's returned status against a
tracked previous value and calling `setState` synchronously in the render
body when it changes) rather than a `useEffect`, per React's own guidance —
`setState` inside an effect here would cause an avoidable extra render
pass, and the project's ESLint config (`react-hooks/set-state-in-effect`)
enforces this.

`setModuleInputValueAction` (Unit 3.3) is not dialog-backed — it drives
`ModuleInputWorkspace`'s inline per-field forms instead, one independent
`useActionState` per field. It re-derives the canonical unit and enum option
set from the released parameter registry (`getParameter`) rather than
trusting the form's own hidden fields, and converts the entered magnitude to
canonical units via `lib/engine/units`'s `convert` before calling
`setParameterValue` (Unit 2.5) — reused unchanged, so this action adds no new
persistence logic.

`runModuleInstanceAction` (Unit 3.5) is the single form in
`ModuleResultPanel`'s header (a `moduleInstanceId` hidden field and a Run
button) — thinner than every other action in this file, since it wraps
`executeModuleInstance` (Unit 2.4) unchanged and adds no input parsing beyond
the one id.

## Status Model

- Not configured
- Ready
- Pass
- Fail
- Warning
- Stale
- Invalid input

Tree nodes show label, icon, and state. A module may show pass with
warnings; warnings are visible separately.

## Guided Workflow UI

The guided linear-axis workflow uses a step navigator:

1. Requirements
2. Load cases
3. Motion
4. Screw and support
5. Guides
6. Coupling and bearings
7. Servo drive train
8. Compare systems
9. BOM and report

Each step shows completion criteria and unresolved downstream impact.
Users may switch to expert mode without losing data.

## Generic Module Workspace

Two primary panes:

### Input pane

- Grouped fields generated from module UI schema
- Explicit unit selectors
- Source badges: manual, linked, default, workflow
- Load-case and coordinate-frame context
- Inline link suggestions with source and scope
- Assumptions and validity limits
- Validation errors beside the field

### Result pane

- Overall status and critical margins
- Output values with units
- Check table: criterion, observed value, margin, status, source
- Warnings and unsupported-condition notices
- Expandable structured calculation trace
- Comparison with previous run
- Assigned manufacturer part and stale state

**Implemented (Unit 3.3, Input pane only — `components/engineering/
module-input-workspace.tsx`):** module rows in the navigator are now real
`<Link>`s to `?...&module=<id>` (deep-linkable, same pattern as project/
configuration); `WorkspaceShell` renders `ModuleInputWorkspace` in the main
canvas instead of `WorkspaceCanvas` whenever it resolves. Renders `quantity`
(number input + explicit unit `<select>`, converted to the parameter's
canonical unit on save via `lib/engine/units`'s `convert`), `enum`, and
`boolean` fields, grouped per the module's `ModuleUiSchema`, with help text,
a required-field indicator, a source badge (manual/linked/default/workflow),
and a load-case chip when the port is load-case specific. The read model —
`loadModuleWorkspaceView` (`lib/application/calculations/`) — is the "read-
model gap" the Unit 3.3 blocker (`progress-tracker.md` Open Questions,
2026-07-31) named: it composes `resolveModuleInputs` (Unit 2.2's manual/
linked/default/workflow resolution) with the released parameter registry so
the renderer gets a fully-described field with no engine imports of its own.
Saving a manual value reuses `setParameterValue` (Unit 2.5) unchanged, via
the new `setModuleInputValueAction` — no new persistence logic, only FormData
parsing and canonical-unit conversion.

**Deliberately deferred (2026-07-31 decision, superseding the blocker):** a
curve editor — no released curve-parameter contract exists yet, the same gap
the blocker named — and editing `vector_quantity` fields, which no registered
module needs yet either. Both render as an honest "not yet editable" notice
(the field descriptor's `"unsupported"` branch) rather than a crash or an
invented editor; this also means the renderer never throws on an
unrecognized parameter value type. Also out of scope, per this section's own
pane split: the link-suggestion banner (Confirm/View source/Dismiss — Unit
3.4, "Link Suggestions" below) and a "Run module" action (Unit 3.5's Result
pane) — a linked field instead shows a short read-only notice ("Linked from
…") with no editable control, and there is no run trigger anywhere in this
unit's UI.

**Implemented (Unit 3.5, Result pane — `components/engineering/
module-result-panel.tsx`):** `WorkspaceShell` stacks `ModuleResultPanel`
directly below `ModuleInputWorkspace` in the main canvas (one scrollable
column, not a side-by-side split — no prior unit established a resizable-pane
primitive, and this project's UI-adjacent units cannot verify a real-browser
layout on this dev machine, so the simpler, already-established narrow-column
pattern was kept). Renders the module's latest `CalculationRun` — output
summary, a check table (status/criterion/observed/allowable/margin, right-
aligned numeric cells via `formatQuantity`, per "Tables and Numeric Inputs"),
a warning/invalidity panel (warnings plus any non-`within_limits` validity
result), an expandable trace (`Collapsible` per section/step, inputs/outputs/
method id/notes revealed on click), resolved source references (every cited
`ClauseReference` across checks/warnings/validity/assumptions/trace steps,
deduplicated and resolved through `SOURCE_REGISTRY`), and, when a second run
exists, a previous-run comparison (changed outputs and changed check
statuses against the run immediately before the latest one). The read model —
`loadModuleResultView` (`lib/application/calculations/`) — reads entirely
from the stored snapshot (`CalculationRunSnapshot.computation`); no module
compute code is imported (this unit's exit criterion). Also owns the "Run
module" trigger both Unit 3.3 and Unit 3.4 deferred here
(`runModuleInstanceAction`, thin glue over unchanged `executeModuleInstance`,
Unit 2.4). The stale banner (`ui-context.md` Status Model "Stale") renders
above every other result when the latest run is stale.

**Scope note:** "Assigned manufacturer part and stale state" from this
section's Result-pane bullet list is Unit 3.6's deliverable ("An engineer can
assign a manufacturer part and see its supporting run"), not this one —
`loadModuleResultView` does not read `ComponentAssignment`. The application
shell's status-bar "stale count" placeholder (Unit 3.1) also stays a
placeholder: this unit renders one module's own stale state, not an
aggregate across every module instance in a configuration, which
`implementation-map.md`'s Unit 3.5 deliverable list does not name — revisit
only if a later unit actually needs that aggregate.

## Link Suggestions

Example:

`Use payload mass 12 kg from Axis Requirements / Normal load case?`

Actions:

- Confirm
- View source
- Dismiss

Never display only a value. Always show parameter meaning, origin,
assembly scope, and load case.

**Implemented (Unit 3.4 — `components/engineering/link-suggestion-panel.tsx`,
wired into `ModuleInputWorkspace`):** every non-linked field renders its
ranked suggestions (`ModuleInputFieldView.suggestions`, from the new
`lib/application/parameters/suggest-link-sources.ts` read model —
`buildConfigurationSuggestionIndex` reconstructs a per-assembly-scoped graph
for the whole configuration, `describeLinkSuggestions` calls Unit 1.8's
`suggestSources` and describes each candidate), one row per suggestion, each
with Confirm (a real form action calling unchanged `confirmParameterLink`),
View source (an inline expand/collapse — deliberately not a navigation, so
confirming never requires leaving the field), and Dismiss (client-side only;
suggestions are recomputed every render, never persisted). A module-output
source's current value is always shown as "not yet available" rather than
fetched — its real value lives inside a `CalculationRun` snapshot, and
reading one per candidate source per field was judged not worth the added
reads for this unit; revisit if that reads as confusing in practice. A
"curve"/`vector_quantity` field (no native editor, per the Unit 3.3 deferral
above) still gets suggestions — linking never needs an editor, so this
partially softens that deferral without building the curve contract.

A field with an already-confirmed link instead renders `LinkedFieldControl`:
the existing "Linked from …" notice, plus a two-step "Remove link" → shows
the downstream stale-impact count (`ModuleInputFieldView.linkRemovalImpact`,
from a new read-only `previewRemoveParameterLinkImpact`, reusing Unit 2.5's
stale-impact computation without writing) → "Confirm removal" flow, per
"Modals and Errors" below: "Confirmation required for ... link removal with
downstream impact."

## Catalog and Assignment UI

- Required specification summary first
- Hard filter results and rejection reasons
- Transparent ranking reasons
- Manufacturer, exact part number, revision/source, and lifecycle status
- Datasheet link where available
- Assign action creates a lightweight component assignment
- Manual/custom part entry is supported

The MVP does not expose approval, supplier, purchasing, or inventory
states.

## Reports and Baselines

- Reports render the same calculation trace shown in the workspace
- Baseline creation displays stale, failed, invalid, and unassigned items
- User must acknowledge warnings before baseline creation
- Baseline comparison shows changed requirements, inputs, outputs,
  checks, assigned parts, and BOM quantities

## Tables and Numeric Inputs

- Right-align numeric values
- Show unit in a dedicated cell or suffix
- Preserve significant figures appropriate to the result
- Do not imply false precision
- Use sticky headers for long engineering tables
- Support keyboard navigation and copy/paste for repeated values

## Modals and Errors

- Centered overlay with backdrop
- Inline validation for recoverable input errors
- Confirmation required for destructive actions and link removal with
  downstream impact
- Error messages state the failed action and practical correction

## Icons

Use Lucide React stroke icons only:

- `h-4 w-4` inline
- `h-5 w-5` in buttons
