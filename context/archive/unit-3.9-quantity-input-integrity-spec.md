# Unit 3.9 — Quantity Input Integrity Fixes (Workspace Module Input Page)

## Status

- Work unit: Unit 3.9 — defect fixes to Unit 3.3/3.4/3.5 deliverables
- Scope: `components/engineering/module-input-workspace.tsx`,
  `components/engineering/format-engineering-value.ts`,
  `app/(workspace)/workspace/actions.ts`, and their tests
- Status: **Specified, not started**
- Priority: **Blocks all Milestone 4+ module work.** Defect 1 silently
  mutates stored engineering values; no module may be released on top of
  an input path that corrupts its own inputs.

Read `CLAUDE.md`, `context/code-standards.md`, and
`context/ui-context.md` ("Tables and Numeric Inputs") before
implementing. This unit changes no `lib/db` file, no Prisma schema, no
released parameter, and registers no module — it is a pure UI +
server-action correction with tests.

## Background

A stored `Quantity` keeps `value` as the magnitude in its canonical
`unit`; `displayUnit` is presentation metadata only
(`lib/engine/values/types.ts`, `lib/engine/units/quantity.ts`). The save
path in `setModuleInputValueAction` honors this correctly: it converts
the submitted magnitude from the user's selected unit into the
parameter's canonical unit and records the selected unit as
`displayUnit`. Three call sites then break the contract on the way back
out. `module-result-panel.tsx` already shows the correct pattern —
`formatQuantity(value, { useDisplayUnit: true })` converts before
labeling — and this unit brings the remaining sites up to that standard.

## Defect 1 — Display-unit round trip corrupts stored values (HIGH)

### Current behavior

`components/engineering/module-input-workspace.tsx`, `FieldControl`,
quantity branch:

```tsx
const defaultUnit = current?.displayUnit ?? current?.unit ?? descriptor.canonicalUnit;
<input ... name="magnitude" defaultValue={current?.value} ... />
<select name="unit" defaultValue={defaultUnit} ...>
```

`current.value` is the canonical magnitude, but the select preselects
the display unit. A value entered as 500 mm is stored as
`{ value: 0.5, unit: "m", displayUnit: "mm" }` and re-renders as
`0.5 [mm]`. Saving the form untouched converts 0.5 mm → 0.0005 m: every
save divides the stored value by 1000. `env.ambient_temperature`
(canonical K, display °C/°F, affine conversion) drifts even faster:
25 °C → 298.15 K → re-save → 571.3 K.

### Required behavior

1. The magnitude input renders the stored value expressed in the
   preselected unit. 500 mm shows as `500` with `mm` selected; 25 °C
   shows as `25` with `degC` selected.
2. Saving an untouched form reproduces the stored canonical value within
   `engineeringValuesClose` default tolerances
   (`lib/engine/values/equality.ts`: relative 1e-9, absolute 1e-12). No
   compounding drift across repeated saves.

### Implementation guidance

- In `FieldControl`, convert for display:

  ```tsx
  defaultValue={current !== undefined
    ? convert(current.value, current.unit, defaultUnit)
    : undefined}
  ```

  `convert` comes from `@/lib/engine` — pure engine code, permitted in
  this `"use client"` component under the same rule that already allows
  `formatQuantity` in `module-result-panel.tsx`. Components may format
  values; they must not calculate engineering results
  (`context/architecture.md`, "`app/` and `components/`"). Unit
  conversion for display is formatting.
- Do not round the converted magnitude before placing it in
  `defaultValue`. React renders the shortest round-trip decimal;
  rounding here would reintroduce drift on re-save.
- **Decision point (recommended, record the choice in the progress
  entry):** add a no-op guard in `setParameterValue`'s path — when the
  newly converted canonical value satisfies `engineeringValuesClose`
  against the currently stored manual value for the same node, skip the
  write. This removes ulp-level float noise from repeated saves *and*
  stops an unchanged save from marking every downstream run stale. If
  the guard is judged out of scope for this unit, the round-trip
  tolerance test below still gates the defect; log the guard as a
  follow-up in `context/progress-tracker.md` Next Up instead.

## Defect 2 — Shared formatter labels canonical magnitudes with display units (MEDIUM)

### Current behavior

`components/engineering/format-engineering-value.ts`:

```ts
case "quantity":
  return `${trimNumber(value.value)} ${value.displayUnit ?? value.unit}`;
...
case "vector_quantity":
  return `[${value.components.map(trimNumber).join(", ")}] ${value.displayUnit ?? value.unit}`;
```

Both cases print canonical magnitudes under the display-unit label. The
500 mm example renders as "0.5 mm" in link suggestions and trace operand
labels. `VectorQuantity` has the same fault component-wise.

### Required behavior

Every rendered magnitude and its unit label describe the same unit.
Either convert to the display unit before printing, or drop the display
unit and label with the canonical unit. Converting is preferred: it is
what `module-result-panel.tsx` already ships.

### Implementation guidance

- `quantity` case: delegate to
  `formatQuantity(value, { useDisplayUnit: true })` from
  `@/lib/engine/units`. Accept the change from fixed-3-decimal trimming
  to 6 significant figures in these labels — that is the documented
  house rule (`context/ui-context.md`, "Tables and Numeric Inputs") and
  removing the divergence deletes one bespoke formatter. If a reviewer
  wants the old trimming preserved, convert first and keep `trimNumber`:
  `trimNumber(convert(value.value, value.unit, target))` — but do not
  keep the current mismatched output.
- `vector_quantity` case: compute
  `const target = value.displayUnit ?? value.unit;` and map each
  component through `convert(c, value.unit, target)` before formatting.
- Update the file's doc comment: it currently explains why this helper
  differs from `formatQuantity`; after the fix the remaining difference
  (if any) is trimming style, not correctness.

## Defect 3 — Blank magnitude submits as 0 (MEDIUM)

### Current behavior

`app/(workspace)/workspace/actions.ts`, `setModuleInputValueAction`:

```ts
const magnitude = Number(fieldValue(formData, "magnitude"));
if (!Number.isFinite(magnitude)) { ... }
```

`Number("")` and `Number("   ")` are `0`, which is finite. An optional
quantity field (`required={false}` renders no HTML guard) submitted
blank stores a manual value of 0 in the canonical unit. A silent zero
for a mass, force, or friction coefficient is an engineering hazard, and
it also defeats the input-source model: blank should mean "no manual
value," never "manual value 0." A tampered request bypasses the HTML
`required` guard on required fields the same way.

### Required behavior

1. A blank or whitespace-only magnitude is rejected with the existing
   "Enter a numeric value." error message. It never stores 0.
2. Genuine zero remains storable by typing `0`.

### Implementation guidance

- Guard before coercion:

  ```ts
  const rawMagnitude = fieldValue(formData, "magnitude").trim();
  if (rawMagnitude.length === 0) {
    return { status: "error", message: "Enter a numeric value." };
  }
  const magnitude = Number(rawMagnitude);
  ```

  This mirrors the discipline `lib/catalog/csv-import.ts` already
  applies (`raw === ""` checked before `Number(raw)`).
- Keep the action thin-glue. If the quantity-parsing block grows past
  comfortable inline size with this guard, extract a pure
  `parseSubmittedQuantity(raw: { magnitude: string; unit: string },
  definition)` helper next to `action-state.ts` so it is testable
  without a Clerk session — the same extract-on-second-use judgment
  Units 3.4/3.5 recorded. Extraction is optional; the guard is not.
- Sweep the file for the same pattern: `parseQuantity` (assignment
  quantity) already handles blank correctly; confirm no other
  `Number(fieldValue(...))` site can receive an empty string.

## Test requirements

All new tests are pure (no database, no Clerk); the suite's skip count
must not change.

1. **Round-trip regression (Defect 1)** —
   `module-input-workspace.test.tsx`: render a quantity field whose
   resolved manual value is `{ value: 0.5, unit: "m", displayUnit:
   "mm" }`; assert the input's value is `500` and the select's value is
   `mm`. Add one affine case (`{ value: 298.15, unit: "K", displayUnit:
   "degC" }` → input `25`). This is the fixture shape the current suite
   lacks: no existing test stores a `Quantity` whose `displayUnit`
   differs from `unit`.
2. **Save-path round trip (Defect 1)** — pure test of the conversion
   pair: for representative (canonical, display) unit pairs including
   one affine pair, `convert(convert(v, canonical, display), display,
   canonical)` satisfies `engineeringValuesClose` against `v`. If the
   no-op guard is implemented, add a service-level assertion that an
   equal-within-tolerance re-save performs no write and propagates no
   stale state.
3. **Formatter (Defect 2)** — `format-engineering-value` tests: the
   500 mm quantity formats with magnitude and label in the same unit
   ("500 mm", not "0.5 mm"); a quantity without `displayUnit` is
   unchanged; a `vector_quantity` with `displayUnit` converts every
   component.
4. **Blank rejection (Defect 3)** — test the guard (via the extracted
   helper, or via the action if a harness exists): `""` and `"   "`
   produce the error state; `"0"` produces a stored canonical 0; a
   numeric string with a non-canonical unit still converts correctly.

## Out of scope

- `lib/env.ts` production Clerk-key refinement (separate one-line unit).
- Authenticated Playwright coverage (blocked on Clerk test-instance
  credentials; already an Open Question).
- Vector-input authoring UI (open Unit 4 generic-platform item; Defect
  2's vector fix touches read-only formatting only).
- Any change to `lib/engine/units`, `lib/engine/values`, released
  parameters, or the Prisma schema.

## Exit criteria

1. The three defects reproduce as failing tests before the fix and pass
   after it (write the tests first; they are cheap and they pin the
   contract).
2. Ten consecutive untouched saves of a 500 mm value leave the stored
   canonical value within `engineeringValuesClose` of 0.5 m.
3. `npm run lint` (0 warnings), `npm run typecheck`, `npm run test`
   (skip count unchanged), `npm run build` all pass.
4. `context/progress-tracker.md` Current Phase gains a Unit 3.9 entry
   recording the fixes, the no-op-guard decision, and test counts;
   `context/ui-context.md` is updated only if the formatter's
   significant-figure behavior changed user-visible label style.
