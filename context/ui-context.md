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

Text tokens must meet contrast on their intended backgrounds per the
accessibility target below. State colors are never the only signal; pair
them with an icon and label.

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

## Application Shell

- 48 px app bar: product name, project/configuration, global actions
- Context action bar: workflow/module actions
- 280 px collapsible navigator: machine, assemblies, workflows, modules,
  requirements, BOM, and reports
- Main canvas: active workspace
- Bottom status bar: unit display profile, run status, stale count,
  failed checks, active market profile

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

## Link Suggestions

Example:

`Use payload mass 12 kg from Axis Requirements / Normal load case?`

Actions:

- Confirm
- View source
- Dismiss

Never display only a value. Always show parameter meaning, origin,
assembly scope, and load case.

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
