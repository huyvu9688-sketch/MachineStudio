# Axis-Frame Vector-Quantity Input Editor

## Status

- Generic-platform work, not tied to a released module. Motivated by
  `context/progress/unit-4.md`'s "Next Safe Work Unit" and
  `context/axis-load-cases-stage-2-contract.md` deferred item 4
  (vector-input authoring), which named this "a real generic-UI/value-type
  design decision... likely worth a brainstorm/user check before
  implementation."
- No module is registered yet that declares a `vector_quantity` input port.
  Three released canonical parameters already use one
  (`lib/engine/parameters/definitions.ts`):
  `motion.axis.center_of_mass_offset`, `motion.axis.external_force`,
  `motion.axis.external_moment` — all `frame: "axis"`. This unit builds the
  generic editor those parameters will need once `axis-load-cases` (Unit 4.1)
  actually declares ports against them; it does not register that module.

## Problem

`vector_quantity` fields currently render as an honest "not yet editable"
notice (the `"unsupported"` field-descriptor branch,
`lib/application/calculations/load-module-workspace-view.ts`) — deliberately
deferred by Unit 3.3 and re-confirmed by Unit 3.9, since no released
value-type contract existed for what a generic editor needs. That gap is now
closed for one concrete, evidence-backed case:
`context/axis-load-cases-stage-1-spec.md`'s `axis.v1` convention normatively
fixes any `frame: "axis"` vector to exactly 3 ordered components `[X, Y, Z]` with
defined physical meaning (`+X` = the engineer-declared positive travel
direction, `+Y` = horizontal transverse, `+Z` = the resulting right-handed
axis). No other frame has a defined convention today.

## Scope decision

Support editing only when `definition.frame === "axis"`. Any other frame
(`"none"`, `"world"`, `"component"`) keeps rendering the existing
`"unsupported"` notice, unchanged — inventing component counts or labels for
a frame nothing uses yet would be guessing at a convention this project has
not defined. Revisit if a future parameter needs a non-axis vector.

A frame-agnostic, N-component-from-registry-metadata design was considered
and rejected for the same reason: no second frame exists to design against,
and it would add a registry schema field with no real second consumer.

A module-specific custom UI component was considered and rejected:
`code-standards.md` requires an ADR for custom module UI, and
`implementation-map.md` Unit 3.3 already bars module-specific forms inside
the generic renderer. `axis.v1` is a generic (if currently axis-only)
contract, not one module's private concern.

## Design

### 1. Read model — `lib/application/calculations/load-module-workspace-view.ts`

`ModuleInputFieldDescriptor` gains a new member:

```ts
| {
    readonly kind: "vector_quantity";
    readonly canonicalUnit: string;
    readonly displayUnits: readonly string[];
    readonly frame: "axis";
  }
```

`frame` is narrowed to the literal `"axis"` (not the full `FrameRequirement`
union) so the type itself documents that only this one case is handled —
extending to a second frame is a visible signature change, not a silent
fallthrough.

`describeField`'s `"vector_quantity"` case changes from an unconditional
`{ kind: "unsupported", valueType }` to:

```ts
case "vector_quantity": {
  if (definition.frame !== "axis") {
    return { kind: "unsupported", valueType };
  }
  if (definition.canonicalUnit === undefined) {
    throw new Error("Vector quantity parameter is missing its canonicalUnit.");
  }
  return {
    kind: "vector_quantity",
    canonicalUnit: definition.canonicalUnit,
    displayUnits: definition.displayUnits ?? [definition.canonicalUnit],
    frame: "axis",
  };
}
```

The `canonicalUnit === undefined` throw mirrors the existing `"quantity"`
case exactly — a genuine registry-invariant violation, not a user-facing
error path.

### 2. Editor UI — `components/engineering/module-input-workspace.tsx`

`FieldControl` gains a new branch for `descriptor.kind === "vector_quantity"`:
exactly 3 `<input type="number" step="any">` elements, labeled per axis.v1 —
"X (travel direction)", "Y (transverse)", "Z" — plus **one shared** unit
`<select>` (matching `VectorQuantity.unit`/`displayUnit`, which cover every
component; there is no per-component unit).

Display-unit round trip mirrors the quantity branch's Unit 3.9 fix exactly:
for a resolved manual/workflow value, `defaultUnit = current?.displayUnit ??
current?.unit ?? descriptor.canonicalUnit`, and each component's
`defaultValue` is `convert(current.components[i], current.unit, defaultUnit)`
— no rounding, so ten untouched saves stay within
`engineeringValuesClose` tolerance of the original, matching Unit 3.9's exit
criterion for scalars. A field with no current value (source `"default"`)
renders 3 empty inputs, same as the quantity branch's `undefined` case.

`FieldControl` receives one `inputId` per field row (from the parent's
`useId()`), tied to the row's single outer `<Label htmlFor={inputId}>`; the
existing quantity branch already works around this for its secondary
control — the unit `<select>` gets its own `aria-label` (the field label plus
the literal word "unit") rather than relying on `htmlFor`. The vector branch
needs the same treatment for all three components, not just one: each number
input gets an explicit `aria-label` combining the field label with its axis
suffix ("X (travel direction)", "Y (transverse)", "Z"), and the X input
additionally keeps `id={inputId}` so the row's visual label still focuses X
on click, matching the existing single-control convention as closely as
three controls allow. `aria-label` wins for accessible-name computation
regardless of `htmlFor`, so all three components resolve unambiguously via
`getByLabelText` in tests without depending on the `id`/`htmlFor` link for
anything but click-to-focus.

### 3. Save path

New pure helper, sibling to the existing `parseSubmittedQuantity`
(`app/(workspace)/workspace/parse-submitted-quantity.ts`):

```ts
// app/(workspace)/workspace/parse-submitted-vector.ts
export type SubmittedVectorParseResult =
  | { readonly ok: true; readonly value: VectorQuantity }
  | { readonly ok: false; readonly message: string };

export function parseSubmittedVector(
  rawComponents: readonly string[], // length 3
  rawUnit: string,
  canonicalUnit: string,
  frame: "axis",
): SubmittedVectorParseResult;
```

Behavior mirrors `parseSubmittedQuantity` component-wise: trims each raw
string, rejects the whole submission with "Enter a numeric value." if **any**
component is blank or non-finite (no partial vectors — this is Defect 3's
guard, generalized), converts each via `convert(magnitude, unit,
canonicalUnit)`, and assembles one `VectorQuantity` with `unit: canonicalUnit`,
`displayUnit: unit`, `frame`.

`setModuleInputValueAction` (`app/(workspace)/workspace/actions.ts`) gains a
`valueKind === "vector_quantity"` branch, reading `component-0`, `component-1`,
`component-2`, and the shared `unit` field from `FormData`, calling
`parseSubmittedVector`, then falling into the existing `setParameterValue`
call unchanged — no new persistence logic, matching every prior unit's
"thin glue only" convention for this file.

### 4. Validation

Blank-rejection is all-or-nothing across the 3 components, not per-component
partial acceptance — an axis force with 2 authored components and one
silently defaulted to 0 is exactly the "silent zero is an engineering hazard"
failure mode Unit 3.9's Defect 3 fixed for scalars, generalized to vectors.

### 5. Out of scope

- The read-only vector formatter (`format-engineering-value.ts`) keeps its
  existing unlabeled `[c1, c2, c3] unit` rendering. Adding axis labels there
  is a separate, smaller follow-up, not part of "authoring."
- Non-`axis` frames stay on the `"unsupported"` notice.
- Registering, scaffolding, or releasing the `axis-load-cases` module itself
  — this unit only builds the generic capability it will need.
- Any change to `EngineeringValue`/`VectorQuantity`'s shape, the parameter
  registry schema, or `ParameterDefinition`.

## Testing plan

No registered module declares a `vector_quantity` port today, so there is no
live module to exercise this end to end — and this design does not add a
test-only module to manufacture one; that would be new module-fixture work
outside this unit's generic-platform scope.

1. **`parseSubmittedVector`** (pure, new test file next to the helper):
   valid 3-component conversion including a non-canonical unit; blank
   rejects for each of the 3 positions individually; whitespace-only
   rejects; non-numeric rejects; a genuine `0` in one component is accepted.
2. **`describeField`'s new branch** (`load-module-workspace-view.ts`):
   exported for direct unit testing (currently private); tested against the
   real released `motion.axis.external_force` definition (`frame: "axis"`,
   no fabrication needed) confirming the returned descriptor's
   `canonicalUnit`/`displayUnits`/`frame`; a second case with a fabricated
   non-`"axis"` frame confirms the `"unsupported"` fallthrough still holds.
3. **`FieldControl` vector branch** (`module-input-workspace.test.tsx`):
   extends the file's existing synthetic-fixture style (the current
   `unsupportedField` fixture already uses
   `motion.axis.center_of_mass_offset` — swapped to the new `"vector_quantity"`
   descriptor kind). Covers: 3 labeled inputs render with correct default
   values from a stored manual value whose `displayUnit` differs from `unit`
   (the round-trip case, mirroring Unit 3.9's scalar regression test); an
   affine-free case since force/moment/offset units are all multiplicative
   (no temperature-vector case exists in the registry, so none is invented);
   empty inputs for a `"default"`-sourced field; submit success calls
   `setModuleInputValueAction` with the 3 component fields plus the shared
   unit field; submit with one blank component surfaces the error without
   calling the action.

Verification: `npm run lint`, `npm run typecheck`, `npm run test` (skip count
should not increase — every new test here is pure/component-level, no new
live-DB test, since nothing here touches `lib/db`), `npm run build`.

## Documentation

- `context/ui-context.md` "Generic Module Workspace": update the Unit 3.3
  deferral note — `vector_quantity` editing is no longer universally
  deferred; record the `frame: "axis"` scope and point to this spec.
- `context/axis-load-cases-stage-2-contract.md` deferred item 4: mark the
  vector-input-authoring half closed, matching how the result-load-case-labels
  half was already marked closed on 2026-08-01.
- `context/progress-tracker.md` Current Phase: new dated entry recording the
  change, decisions, and verification, per `ai-workflow-rules.md`
  Documentation Synchronization.
