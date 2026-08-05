# Axis-Frame Vector-Quantity Input Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an engineer edit a `frame: "axis"` `vector_quantity` input field (3 components — X/Y/Z per the `axis.v1` convention) in the generic module-input workspace, instead of seeing the "not yet editable" notice.

**Architecture:** Additive changes across the existing generic-renderer stack, following the exact pattern the `"quantity"` field kind already establishes at each layer — no new files beyond one small pure parsing helper, no database/schema change, no module registration. Read model (`load-module-workspace-view.ts`) gains a new field-descriptor kind for `frame === "axis"` vectors; the renderer (`module-input-workspace.tsx`) gains a matching editor branch with the same Unit-3.9 display-unit round-trip discipline; the save path (`actions.ts` + a new `parse-submitted-vector.ts`) gains a matching parse/convert branch with the same blank-rejection discipline as `parseSubmittedQuantity`.

**Tech Stack:** TypeScript strict, Next.js App Router (Server Actions), React 19, Vitest + React Testing Library + `@testing-library/user-event`, the existing `lib/engine` units/values packages.

**Spec:** `docs/superpowers/specs/2026-08-05-vector-quantity-input-editor-design.md` — read it first; this plan implements it exactly, do not re-derive scope decisions.

---

## File Structure

- **Modify** `lib/application/calculations/load-module-workspace-view.ts` — export `describeField`; add the `"vector_quantity"` member to `ModuleInputFieldDescriptor`; change `describeField`'s `"vector_quantity"` case from unconditional `"unsupported"` to frame-conditional.
- **Modify** `lib/application/calculations/load-module-workspace-view.test.ts` — append a new, non-DB-gated `describe` block testing `describeField` directly.
- **Create** `app/(workspace)/workspace/parse-submitted-vector.ts` — pure per-component parse/convert helper, sibling to the existing `parse-submitted-quantity.ts`.
- **Create** `app/(workspace)/workspace/parse-submitted-vector.test.ts` — pure tests for the new helper.
- **Modify** `app/(workspace)/workspace/actions.ts` — add a `valueKind === "vector_quantity"` branch to `setModuleInputValueAction`.
- **Modify** `components/engineering/module-input-workspace.tsx` — add a `descriptor.kind === "vector_quantity"` branch to `FieldControl`.
- **Modify** `components/engineering/module-input-workspace.test.tsx` — repoint the existing `unsupportedField` fixture at a still-genuinely-unsupported case (`curve`, since `vector_quantity`/`frame: "axis"` is no longer unsupported after this change), add new vector fixtures, add new test cases.
- **Modify** `context/ui-context.md`, `context/axis-load-cases-stage-2-contract.md`, `context/progress-tracker.md` — documentation sync (Task 6).

---

### Task 1: Read model — `describeField`'s new `"vector_quantity"` branch

**Files:**
- Modify: `lib/application/calculations/load-module-workspace-view.ts:41-64` (imports), `:66-76` (`ModuleInputFieldDescriptor`), `:129-161` (`describeField`)
- Test: `lib/application/calculations/load-module-workspace-view.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to the end of `lib/application/calculations/load-module-workspace-view.test.ts` (after the final `});` that closes the existing `describe.skipIf(...)` block, so this is a **second, top-level, sibling `describe` block** — not nested inside the DB-gated one, and not wrapped in `skipIf`, since it needs no database. It still defers its imports inside `beforeAll` (the same dynamic-import style the file already uses), so a machine with no generated Prisma client fails the same way every other unit in this codebase already documents, not a new failure mode this task introduces:

```ts
describe("describeField (pure, no live database)", () => {
  let describeField: typeof import("./load-module-workspace-view").describeField;
  let getParameter: typeof import("@/lib/engine").getParameter;

  beforeAll(async () => {
    describeField = (await import("./load-module-workspace-view")).describeField;
    getParameter = (await import("@/lib/engine")).getParameter;
  });

  it("describes the real released motion.axis.external_force as an axis-frame vector_quantity field", () => {
    const definition = getParameter("motion.axis.external_force");
    if (definition === undefined) {
      throw new Error("motion.axis.external_force must be registered");
    }

    const descriptor = describeField(definition.valueType, definition);

    expect(descriptor).toEqual({
      kind: "vector_quantity",
      canonicalUnit: "N",
      displayUnits: ["N", "kN", "lbf"],
      frame: "axis",
    });
  });

  it("keeps a non-axis-frame vector_quantity parameter unsupported", () => {
    const descriptor = describeField("vector_quantity", {
      canonicalUnit: "N",
      displayUnits: ["N"],
      frame: "world",
    });

    expect(descriptor).toEqual({ kind: "unsupported", valueType: "vector_quantity" });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/application/calculations/load-module-workspace-view.test.ts`
Expected: FAIL — `describeField` is not exported from `./load-module-workspace-view` (the import resolves to `undefined`, so calling it throws `TypeError: describeField is not a function` or similar), and the first test's expectation of `kind: "vector_quantity"` would fail even once callable, since the current code always returns `{ kind: "unsupported", valueType: "vector_quantity" }` for this parameter.

- [ ] **Step 3: Modify the import list**

In `lib/application/calculations/load-module-workspace-view.ts`, the current import (around line 41-47) is:

```ts
import "server-only";
import {
  getParameter,
  type CheckStatus,
  type LoadCaseCategory,
  type ParameterValueType,
} from "@/lib/engine";
```

Change it to add `type FrameRequirement`:

```ts
import "server-only";
import {
  getParameter,
  type CheckStatus,
  type FrameRequirement,
  type LoadCaseCategory,
  type ParameterValueType,
} from "@/lib/engine";
```

- [ ] **Step 4: Add the new `ModuleInputFieldDescriptor` member**

The current type (around line 66-76) is:

```ts
/** A field's editable shape, derived from its canonical parameter's `valueType`. */
export type ModuleInputFieldDescriptor =
  | {
      readonly kind: "quantity";
      readonly canonicalUnit: string;
      readonly displayUnits: readonly string[];
    }
  | { readonly kind: "enum"; readonly enumId: string; readonly options: readonly string[] }
  | { readonly kind: "boolean" }
  /** `vector_quantity` today; would also cover a future `curve` parameter type. */
  | { readonly kind: "unsupported"; readonly valueType: ParameterValueType };
```

Replace it with:

```ts
/** A field's editable shape, derived from its canonical parameter's `valueType`. */
export type ModuleInputFieldDescriptor =
  | {
      readonly kind: "quantity";
      readonly canonicalUnit: string;
      readonly displayUnits: readonly string[];
    }
  | {
      /**
       * A `frame: "axis"` vector (axis.v1: exactly 3 ordered components,
       * X = travel direction, Y = transverse, Z = right-handed). `frame` is
       * narrowed to the literal `"axis"` rather than the full
       * `FrameRequirement` union so a second frame is a visible signature
       * change here, not a silent fallthrough — see
       * docs/superpowers/specs/2026-08-05-vector-quantity-input-editor-design.md.
       */
      readonly kind: "vector_quantity";
      readonly canonicalUnit: string;
      readonly displayUnits: readonly string[];
      readonly frame: "axis";
    }
  | { readonly kind: "enum"; readonly enumId: string; readonly options: readonly string[] }
  | { readonly kind: "boolean" }
  /** A `curve` parameter, or a `vector_quantity` whose frame is not `"axis"`. */
  | { readonly kind: "unsupported"; readonly valueType: ParameterValueType };
```

- [ ] **Step 5: Export `describeField` and add its `"vector_quantity"` case**

The current function (around line 129-161) is:

```ts
function describeField(valueType: ParameterValueType, definition: {
  readonly canonicalUnit?: string;
  readonly displayUnits?: readonly string[];
  readonly enumId?: string;
  readonly enumOptions?: readonly string[];
}): ModuleInputFieldDescriptor {
  switch (valueType) {
    case "quantity": {
      if (definition.canonicalUnit === undefined) {
        throw new Error("Quantity parameter is missing its canonicalUnit.");
      }
      return {
        kind: "quantity",
        canonicalUnit: definition.canonicalUnit,
        displayUnits: definition.displayUnits ?? [definition.canonicalUnit],
      };
    }
    case "enum": {
      if (definition.enumId === undefined) {
        throw new Error("Enum parameter is missing its enumId.");
      }
      return { kind: "enum", enumId: definition.enumId, options: definition.enumOptions ?? [] };
    }
    case "boolean":
      return { kind: "boolean" };
    case "vector_quantity":
      return { kind: "unsupported", valueType };
    default: {
      const exhaustive: never = valueType;
      return { kind: "unsupported", valueType: exhaustive };
    }
  }
}
```

Replace it with (note the added `frame` field on the parameter, `export` added, and the new `"vector_quantity"` case body):

```ts
export function describeField(valueType: ParameterValueType, definition: {
  readonly canonicalUnit?: string;
  readonly displayUnits?: readonly string[];
  readonly enumId?: string;
  readonly enumOptions?: readonly string[];
  readonly frame?: FrameRequirement;
}): ModuleInputFieldDescriptor {
  switch (valueType) {
    case "quantity": {
      if (definition.canonicalUnit === undefined) {
        throw new Error("Quantity parameter is missing its canonicalUnit.");
      }
      return {
        kind: "quantity",
        canonicalUnit: definition.canonicalUnit,
        displayUnits: definition.displayUnits ?? [definition.canonicalUnit],
      };
    }
    case "enum": {
      if (definition.enumId === undefined) {
        throw new Error("Enum parameter is missing its enumId.");
      }
      return { kind: "enum", enumId: definition.enumId, options: definition.enumOptions ?? [] };
    }
    case "boolean":
      return { kind: "boolean" };
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
    default: {
      const exhaustive: never = valueType;
      return { kind: "unsupported", valueType: exhaustive };
    }
  }
}
```

`describeField` is called with the module's real `ParameterDefinition` at its one production call site (further down the same file, inside `loadModuleWorkspaceView`); `ParameterDefinition.frame` is a required field there, so passing it through needs no change at that call site — only the function's own signature and body change.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run lib/application/calculations/load-module-workspace-view.test.ts`
Expected: PASS — both new tests green; the existing DB-gated tests in the same file still report as skipped (no `DATABASE_URL`) or passed (if one is configured), unchanged from before this task.

- [ ] **Step 7: Run the full suite, lint, and typecheck**

Run: `npm run lint && npm run typecheck && npm run test`
Expected: lint 0 warnings; typecheck 0 errors; full suite passes with exactly 2 more passing tests than before this task, skip count unchanged (these tests are not DB-gated).

- [ ] **Step 8: Commit**

```bash
git add lib/application/calculations/load-module-workspace-view.ts lib/application/calculations/load-module-workspace-view.test.ts
git commit -m "feat: describe axis-frame vector_quantity parameters as editable fields"
```

---

### Task 2: `parseSubmittedVector` pure helper

**Files:**
- Create: `app/(workspace)/workspace/parse-submitted-vector.ts`
- Create: `app/(workspace)/workspace/parse-submitted-vector.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `app/(workspace)/workspace/parse-submitted-vector.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseSubmittedVector } from "./parse-submitted-vector";

describe("parseSubmittedVector", () => {
  it("converts three components from a non-canonical display unit into canonical units", () => {
    const result = parseSubmittedVector(["50", "0", "-20"], "mm", "m", "axis");

    expect(result).toEqual({
      ok: true,
      value: {
        v: 1,
        kind: "vector_quantity",
        components: [0.05, 0, -0.02],
        unit: "m",
        frame: "axis",
        displayUnit: "mm",
      },
    });
  });

  it("accepts a genuine zero in one component", () => {
    const result = parseSubmittedVector(["0", "0", "0"], "N", "N", "axis");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.components).toEqual([0, 0, 0]);
  });

  it("falls back to the canonical unit when no unit is submitted", () => {
    const result = parseSubmittedVector(["1", "2", "3"], "", "N", "axis");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.unit).toBe("N");
    expect(result.value.displayUnit).toBe("N");
  });

  it.each([
    ["blank first component", ["", "1", "2"]],
    ["blank middle component", ["1", "", "2"]],
    ["blank last component", ["1", "2", ""]],
    ["whitespace-only component", ["1", "   ", "2"]],
  ])("rejects with %s without storing a partial vector", (_label, components) => {
    const result = parseSubmittedVector(components, "N", "N", "axis");

    expect(result).toEqual({ ok: false, message: "Enter a numeric value." });
  });

  it("rejects a non-numeric component", () => {
    const result = parseSubmittedVector(["1", "abc", "2"], "N", "N", "axis");

    expect(result).toEqual({ ok: false, message: "Enter a numeric value." });
  });

  it("rejects an invalid unit", () => {
    const result = parseSubmittedVector(["1", "2", "3"], "not-a-unit", "N", "axis");

    expect(result).toEqual({
      ok: false,
      message: 'Unit "not-a-unit" is not valid for this value.',
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/\(workspace\)/workspace/parse-submitted-vector.test.ts`
Expected: FAIL — `Cannot find module './parse-submitted-vector'`.

- [ ] **Step 3: Write the implementation**

Create `app/(workspace)/workspace/parse-submitted-vector.ts`:

```ts
import { convert } from "@/lib/engine/units";
import { SERIALIZATION_FORMAT_VERSION, type VectorQuantity } from "@/lib/engine/values";

export type SubmittedVectorParseResult =
  | { readonly ok: true; readonly value: VectorQuantity }
  | { readonly ok: false; readonly message: string };

/**
 * Parses three submitted magnitude strings (one shared unit across all of
 * them, matching `VectorQuantity.unit`/`displayUnit`) into a canonical
 * `VectorQuantity`. Mirrors `parseSubmittedQuantity` component-wise: any
 * blank or non-finite component rejects the whole submission rather than
 * storing a partial vector (docs/superpowers/specs/
 * 2026-08-05-vector-quantity-input-editor-design.md, "Validation" — the
 * generalized form of Unit 3.9's Defect 3 guard).
 */
export function parseSubmittedVector(
  rawComponents: readonly string[],
  rawUnit: string,
  canonicalUnit: string,
  frame: "axis",
): SubmittedVectorParseResult {
  const components: number[] = [];
  for (const raw of rawComponents) {
    const text = raw.trim();
    if (text.length === 0) {
      return { ok: false, message: "Enter a numeric value." };
    }
    const magnitude = Number(text);
    if (!Number.isFinite(magnitude)) {
      return { ok: false, message: "Enter a numeric value." };
    }
    components.push(magnitude);
  }

  const unit = rawUnit || canonicalUnit;
  try {
    return {
      ok: true,
      value: {
        v: SERIALIZATION_FORMAT_VERSION,
        kind: "vector_quantity",
        components: components.map((component) => convert(component, unit, canonicalUnit)),
        unit: canonicalUnit,
        frame,
        displayUnit: unit,
      },
    };
  } catch {
    return {
      ok: false,
      message: `Unit "${unit}" is not valid for this value.`,
    };
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run app/\(workspace\)/workspace/parse-submitted-vector.test.ts`
Expected: PASS — all 8 tests (3 + 4 parameterized + 1) green.

- [ ] **Step 5: Run the full suite, lint, and typecheck**

Run: `npm run lint && npm run typecheck && npm run test`
Expected: lint 0 warnings; typecheck 0 errors; full suite passes with 8 more passing tests than after Task 1, skip count unchanged.

- [ ] **Step 6: Commit**

```bash
git add app/\(workspace\)/workspace/parse-submitted-vector.ts app/\(workspace\)/workspace/parse-submitted-vector.test.ts
git commit -m "feat: add parseSubmittedVector, the vector counterpart to parseSubmittedQuantity"
```

---

### Task 3: Wire the save path — `setModuleInputValueAction`

**Files:**
- Modify: `app/(workspace)/workspace/actions.ts:1-56` (imports), `:163-245` (`setModuleInputValueAction`)

No new test file for this step: `setModuleInputValueAction` has no existing dedicated test file today (it is a thin `"use server"` wrapper, exercised indirectly through component tests that mock it — the real parsing logic lives in, and is fully tested by, `parseSubmittedQuantity`/`parseSubmittedVector`). This matches the file's own established "thin glue only" convention. Task 4 adds component-level coverage that exercises this action's contract (its expected `FormData` field names) through the mock.

- [ ] **Step 1: Add the import**

Near the top of `app/(workspace)/workspace/actions.ts`, the current import (around line 50) is:

```ts
import { parseSubmittedQuantity } from "./parse-submitted-quantity";
```

Add directly below it:

```ts
import { parseSubmittedQuantity } from "./parse-submitted-quantity";
import { parseSubmittedVector } from "./parse-submitted-vector";
```

- [ ] **Step 2: Add the `"vector_quantity"` branch**

In `setModuleInputValueAction`, the current `valueKind` if/else-if chain (around line 175-221) is:

```ts
  const valueKind = fieldValue(formData, "valueKind");
  let value: EngineeringValue;
  if (valueKind === "quantity") {
    if (definition.canonicalUnit === undefined) {
      return {
        status: "error",
        message: "This parameter has no canonical unit.",
      };
    }
    const parsed = parseSubmittedQuantity(
      fieldValue(formData, "magnitude"),
      fieldValue(formData, "unit"),
      definition.canonicalUnit,
    );
    if (!parsed.ok) {
      return { status: "error", message: parsed.message };
    }
    value = parsed.value;
  } else if (valueKind === "enum") {
```

Add a new `else if` branch between the `"quantity"` branch and the `"enum"` branch:

```ts
  const valueKind = fieldValue(formData, "valueKind");
  let value: EngineeringValue;
  if (valueKind === "quantity") {
    if (definition.canonicalUnit === undefined) {
      return {
        status: "error",
        message: "This parameter has no canonical unit.",
      };
    }
    const parsed = parseSubmittedQuantity(
      fieldValue(formData, "magnitude"),
      fieldValue(formData, "unit"),
      definition.canonicalUnit,
    );
    if (!parsed.ok) {
      return { status: "error", message: parsed.message };
    }
    value = parsed.value;
  } else if (valueKind === "vector_quantity") {
    // Never trust a client-supplied valueKind alone: re-derive the frame
    // from the registry, the same "never trust a client-supplied unit/enumId"
    // discipline this action already applies to the quantity/enum branches
    // (ui-context.md "Server Actions"). A tampered request could otherwise
    // write an axis-framed vector onto a parameter whose real frame differs
    // — exactly what axis.v1 says must be rejected, not silently reinterpreted
    // (context/axis-load-cases-stage-1-spec.md).
    if (definition.frame !== "axis") {
      return {
        status: "error",
        message: "This parameter does not use the axis vector frame.",
      };
    }
    if (definition.canonicalUnit === undefined) {
      return {
        status: "error",
        message: "This parameter has no canonical unit.",
      };
    }
    const parsed = parseSubmittedVector(
      [
        fieldValue(formData, "component-0"),
        fieldValue(formData, "component-1"),
        fieldValue(formData, "component-2"),
      ],
      fieldValue(formData, "unit"),
      definition.canonicalUnit,
      "axis",
    );
    if (!parsed.ok) {
      return { status: "error", message: parsed.message };
    }
    value = parsed.value;
  } else if (valueKind === "enum") {
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors. `definition.frame` is a required field on `ParameterDefinition`, so this compiles without an optional-chain.

- [ ] **Step 4: Run the full suite, lint, and build**

Run: `npm run lint && npm run test && npm run build`
Expected: lint 0 warnings; full suite unchanged from Task 2 (no new tests in this task); build succeeds.

- [ ] **Step 5: Commit**

```bash
git add app/\(workspace\)/workspace/actions.ts
git commit -m "feat: accept vector_quantity submissions in setModuleInputValueAction"
```

---

### Task 4: Editor UI — `FieldControl`'s new branch

**Files:**
- Modify: `components/engineering/module-input-workspace.tsx:34-35` (add a constant), `:216-301` (`FieldControl`)
- Modify: `components/engineering/module-input-workspace.test.tsx`

- [ ] **Step 1: Update the existing `unsupportedField` fixture and its assertion**

`vector_quantity`/`frame: "axis"` is no longer unsupported after Task 1, so the existing fixture at line 153-164 of `components/engineering/module-input-workspace.test.tsx` (which currently represents `motion.axis.center_of_mass_offset` as `"unsupported"`) must be repointed at a case that is **still** genuinely unsupported — a `curve` field, the other value type this same deferral note has always covered. Current:

```ts
const unsupportedField: ModuleInputFieldView = {
  portKey: "cg_offset",
  parameterId: "motion.axis.center_of_mass_offset",
  label: "Center-of-mass offset",
  help: null,
  required: false,
  loadCase: null,
  field: { kind: "unsupported", valueType: "vector_quantity" },
  resolved: { source: "default" },
  suggestions: [],
  linkRemovalImpact: null,
};
```

Replace with:

```ts
const unsupportedField: ModuleInputFieldView = {
  portKey: "velocity_curve",
  parameterId: "motion.profile.velocity_curve",
  label: "Velocity curve",
  help: null,
  required: false,
  loadCase: null,
  field: { kind: "unsupported", valueType: "curve" },
  resolved: { source: "default" },
  suggestions: [],
  linkRemovalImpact: null,
};
```

(`motion.profile.velocity_curve` is not a real registered parameter — this component test uses fully synthetic `ModuleInputFieldView` fixtures decoupled from the real registry, matching this file's existing convention throughout, so a representative placeholder id is fine, same as `linkedField`'s and `fieldWithSuggestion`'s fixtures already do.)

Then update the one assertion in the "renders the module header, group title, and every field kind generically" test (around line 240-243) that checked this fixture's text and comment:

```ts
    // Unsupported (vector_quantity): honest deferral notice, not a crash or invented editor.
    expect(
      screen.getByText(/Editing vector quantity values is not supported yet/),
    ).toBeInTheDocument();
```

Replace with:

```ts
    // Unsupported (curve): honest deferral notice, not a crash or invented editor.
    expect(
      screen.getByText(/Editing curve values is not supported yet/),
    ).toBeInTheDocument();
```

- [ ] **Step 2: Add the new vector fixtures**

Add these two fixtures right after the existing `unsupportedField` block (same file):

```ts
const vectorManualField: ModuleInputFieldView = {
  portKey: "cg_offset",
  parameterId: "motion.axis.center_of_mass_offset",
  label: "Center-of-mass offset",
  help: null,
  required: false,
  loadCase: null,
  field: {
    kind: "vector_quantity",
    canonicalUnit: "m",
    displayUnits: ["mm", "cm", "m", "in"],
    frame: "axis",
  },
  resolved: {
    source: "manual",
    value: {
      v: 1,
      kind: "vector_quantity",
      components: [0.05, 0, -0.02],
      unit: "m",
      frame: "axis",
      displayUnit: "mm",
    },
  },
  suggestions: [],
  linkRemovalImpact: null,
};

const vectorDefaultField: ModuleInputFieldView = {
  portKey: "external_force",
  parameterId: "motion.axis.external_force",
  label: "External process force",
  help: null,
  required: true,
  loadCase: "normal",
  field: {
    kind: "vector_quantity",
    canonicalUnit: "N",
    displayUnits: ["N", "kN", "lbf"],
    frame: "axis",
  },
  resolved: { source: "default" },
  suggestions: [],
  linkRemovalImpact: null,
};
```

- [ ] **Step 3: Write the failing tests**

Two of these tests intentionally implement the design spec's testing-plan wording more precisely than its literal text, rather than following it verbatim — noted here so this isn't mistaken for a missed requirement during review:

- The spec says a submit test should confirm the action is called "with the 3 component fields plus the shared unit field." `setModuleInputValueAction` is mocked in this file (see the `vi.mock` at the top), so no test here can observe what a *real* `setParameterValue` call received — only whether the mock was invoked. The existing quantity-field submit test one section up (`"submits a quantity field's manual value..."`) already establishes the file's precedent for this: a shallow `toHaveBeenCalled()`, not a deep `FormData` inspection. This task's submit test matches that precedent instead of inventing a new, deeper assertion style the mock can't actually support meaningfully.
- The spec says a test should submit "with one blank component" and expect the error "without calling the action." Taken literally, that's not achievable through the mock either — the mock always "calls" successfully or with whatever `mockResolvedValueOnce` configures, regardless of what was typed. What's actually testable and meaningful here is native HTML5 `required` validation: every component input carries `required={field.required}` (Step 6 below), so on a required field, leaving one component blank blocks the browser from ever submitting the form — the same class of behavior this project's own history already documents catching for a different field in Unit 3.2 (`context/progress-tracker.md`: "a required-field HTML5-validation block"). The test below asserts that real, observable behavior (`setModuleInputValueAction` never called) instead of the spec's literal (not test-observable) framing. Server-side rejection of a blank component is fully covered instead by Task 2's `parseSubmittedVector` tests, which exercise the real parsing function directly.

Add these tests at the end of the `describe("ModuleInputWorkspace", ...)` block in `components/engineering/module-input-workspace.test.tsx` (right before its closing `});`):

```ts
  it("renders a stored axis-frame vector in its selected display unit, per component", () => {
    render(<ModuleInputWorkspace view={view([vectorManualField])} />);

    expect(screen.getByLabelText("Center-of-mass offset X (travel direction)")).toHaveValue(50);
    expect(screen.getByLabelText("Center-of-mass offset Y (transverse)")).toHaveValue(0);
    expect(screen.getByLabelText("Center-of-mass offset Z")).toHaveValue(-20);
    expect(screen.getByLabelText("Center-of-mass offset unit")).toHaveValue("mm");
  });

  it("renders empty component inputs for a vector field with no current value", () => {
    render(<ModuleInputWorkspace view={view([vectorDefaultField])} />);

    expect(screen.getByLabelText("External process force X (travel direction)")).toHaveValue(
      null,
    );
    expect(screen.getByLabelText("External process force Y (transverse)")).toHaveValue(null);
    expect(screen.getByLabelText("External process force Z")).toHaveValue(null);
  });

  it("submits a vector field's three components and the shared unit", async () => {
    const user = userEvent.setup();
    render(<ModuleInputWorkspace view={view([vectorManualField])} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(setModuleInputValueAction).toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not submit a required vector field while a component is left blank (native validation)", async () => {
    const user = userEvent.setup();
    render(<ModuleInputWorkspace view={view([vectorDefaultField])} />);

    await user.type(
      screen.getByLabelText("External process force X (travel direction)"),
      "10",
    );
    // Y and Z stay blank; the field is required, so the browser blocks
    // submission before the Server Action is ever called.
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(setModuleInputValueAction).not.toHaveBeenCalled();
  });
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npx vitest run components/engineering/module-input-workspace.test.tsx`
Expected: FAIL — `getByLabelText("Center-of-mass offset X (travel direction)")` finds nothing, since `FieldControl` still has no `"vector_quantity"` branch (it falls through to the existing `if (descriptor.kind === "quantity")` / `"enum"` / boolean-fallback chain, which will render the boolean checkbox branch incorrectly for a `vector_quantity` descriptor — confirming the current code has no real handling for this kind at all).

- [ ] **Step 5: Add the axis component-label constant**

In `components/engineering/module-input-workspace.tsx`, right after the existing `CONTROL_CLASS` constant (around line 34-35):

```ts
const CONTROL_CLASS =
  "h-9 rounded-md border border-border-default bg-bg-surface px-2.5 text-[13px] text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary";
```

Add directly below it:

```ts
/**
 * axis.v1's fixed 3-component order and physical meaning
 * (context/axis-load-cases-stage-1-spec.md): X = the engineer-declared
 * positive travel direction, Y = horizontal transverse, Z = the resulting
 * right-handed axis. Only `frame: "axis"` vectors are editable today — see
 * docs/superpowers/specs/2026-08-05-vector-quantity-input-editor-design.md.
 */
const AXIS_COMPONENT_LABELS = [
  "X (travel direction)",
  "Y (transverse)",
  "Z",
] as const;
```

- [ ] **Step 6: Add the `FieldControl` branch**

In `components/engineering/module-input-workspace.tsx`, the current `"quantity"` branch (around line 229-258) ends with:

```ts
  if (descriptor.kind === "quantity") {
    const current = currentValue?.kind === "quantity" ? currentValue : undefined;
    const defaultUnit = current?.displayUnit ?? current?.unit ?? descriptor.canonicalUnit;
    const defaultMagnitude =
      current === undefined ? undefined : convert(current.value, current.unit, defaultUnit);
    return (
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="number"
          step="any"
          name="magnitude"
          defaultValue={defaultMagnitude}
          required={field.required}
          className={cn(CONTROL_CLASS, "w-36 font-mono tabular-nums")}
        />
        <select
          name="unit"
          defaultValue={defaultUnit}
          aria-label={`${field.label} unit`}
          className={cn(CONTROL_CLASS, "w-24")}
        >
          {descriptor.displayUnits.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (descriptor.kind === "enum") {
```

Insert a new branch between them:

```ts
  if (descriptor.kind === "quantity") {
    const current = currentValue?.kind === "quantity" ? currentValue : undefined;
    const defaultUnit = current?.displayUnit ?? current?.unit ?? descriptor.canonicalUnit;
    const defaultMagnitude =
      current === undefined ? undefined : convert(current.value, current.unit, defaultUnit);
    return (
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="number"
          step="any"
          name="magnitude"
          defaultValue={defaultMagnitude}
          required={field.required}
          className={cn(CONTROL_CLASS, "w-36 font-mono tabular-nums")}
        />
        <select
          name="unit"
          defaultValue={defaultUnit}
          aria-label={`${field.label} unit`}
          className={cn(CONTROL_CLASS, "w-24")}
        >
          {descriptor.displayUnits.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (descriptor.kind === "vector_quantity") {
    const current = currentValue?.kind === "vector_quantity" ? currentValue : undefined;
    const defaultUnit = current?.displayUnit ?? current?.unit ?? descriptor.canonicalUnit;
    const defaultComponents = current?.components.map((component) =>
      convert(component, current.unit, defaultUnit),
    );
    return (
      <div className="flex flex-wrap items-start gap-2">
        {AXIS_COMPONENT_LABELS.map((axisLabel, index) => (
          <input
            key={axisLabel}
            id={index === 0 ? inputId : undefined}
            type="number"
            step="any"
            name={`component-${index}`}
            defaultValue={defaultComponents?.[index]}
            aria-label={`${field.label} ${axisLabel}`}
            required={field.required}
            className={cn(CONTROL_CLASS, "w-24 font-mono tabular-nums")}
          />
        ))}
        <select
          name="unit"
          defaultValue={defaultUnit}
          aria-label={`${field.label} unit`}
          className={cn(CONTROL_CLASS, "w-24")}
        >
          {descriptor.displayUnits.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (descriptor.kind === "enum") {
```

Notes on this step, so the next engineer does not "fix" it incorrectly:

- The X input keeps `id={inputId}` so the row's outer `<Label htmlFor={inputId}>` still focuses it on click, matching the quantity branch's single-control convention as closely as three controls allow — but **every** component, including X, also gets its own `aria-label`, which wins accessible-name computation regardless of `htmlFor`. This is deliberate (see the design spec's Editor UI section) — do not remove the X input's `aria-label` thinking `htmlFor` alone is enough; that would make X the only component whose accessible name doesn't include an axis suffix, breaking the `getByLabelText("... X (travel direction)")` calls in this task's tests.
- `defaultComponents` is `undefined` when there is no current value (source `"default"`), so every `defaultValue={defaultComponents?.[index]}` is `undefined` for all three inputs — an empty, not zero-filled, control. Do not default to `0`.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run components/engineering/module-input-workspace.test.tsx`
Expected: PASS — all tests in the file green, including the 4 new ones and the updated `unsupportedField`-based assertion.

- [ ] **Step 8: Run the full suite, lint, typecheck, and build**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: lint 0 warnings; typecheck 0 errors; full suite passes with 4 more passing tests than after Task 3 (skip count unchanged — nothing here touches `lib/db`); build succeeds.

- [ ] **Step 9: Commit**

```bash
git add components/engineering/module-input-workspace.tsx components/engineering/module-input-workspace.test.tsx
git commit -m "feat: add an axis-frame vector_quantity editor to the generic module-input workspace"
```

---

### Task 5: Documentation sync

**Files:**
- Modify: `context/ui-context.md`
- Modify: `context/axis-load-cases-stage-2-contract.md`
- Modify: `context/progress-tracker.md`

- [ ] **Step 1: Update `context/ui-context.md`**

In the "Generic Module Workspace" section, find the existing paragraph (added by Unit 3.3) that reads:

```text
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
```

Change the sentence about `vector_quantity` to reflect the new scope. Replace the first two sentences with:

```text
**Deliberately deferred (2026-07-31 decision, superseding the blocker):** a
curve editor — no released curve-parameter contract exists yet, the same gap
the blocker named. **Updated (2026-08-05):** `vector_quantity` editing is no
longer universally deferred — a `frame: "axis"` vector (axis.v1's fixed
3-component X/Y/Z convention) is now editable in the generic renderer; any
other frame still renders the honest "not yet editable" notice, since no
other frame has a defined convention
(`docs/superpowers/specs/2026-08-05-vector-quantity-input-editor-design.md`).
Both remaining
deferrals render via the field descriptor's `"unsupported"` branch rather
than a crash or an invented editor; this also means the renderer never
throws on an unrecognized parameter value type. Also out of scope, per this
section's own pane split: the link-suggestion banner (Confirm/View
source/Dismiss — Unit 3.4, "Link Suggestions" below) and a "Run module"
action (Unit 3.5's Result pane) — a linked field instead shows a short
read-only notice ("Linked from …") with no editable control, and there is no
run trigger anywhere in this unit's UI.
```

- [ ] **Step 2: Update `context/axis-load-cases-stage-2-contract.md`**

Find deferred item 4's block (currently ending with the sentence "**The vector-input-authoring half remains open** — a materially larger generic-UI/value-type design decision (how a `vector_quantity` field is edited, not just displayed), deliberately not attempted alongside the smaller labeling fix. See `context/progress-tracker.md` Current Phase for verification detail."). Append a new paragraph directly after it, keeping the existing text unchanged above:

```text
   - **CLOSED (2026-08-05)**: the vector-input-authoring half is done. The
     generic module-input renderer now edits any `frame: "axis"` vector
     (`ModuleInputFieldDescriptor`'s new `"vector_quantity"` kind,
     `lib/application/calculations/load-module-workspace-view.ts`) — exactly
     the case `motion.axis.center_of_mass_offset`,
     `motion.axis.external_force`, and `motion.axis.external_moment` all
     need. Design and verification detail:
     `docs/superpowers/specs/2026-08-05-vector-quantity-input-editor-design.md`
     and `context/progress-tracker.md` Current Phase. Item 4 is now fully
     closed — both halves (result-load-case labels, 2026-08-01, and
     vector-input authoring, 2026-08-05) are done.
```

- [ ] **Step 3: Update `context/progress-tracker.md`**

Add a new dated entry at the top of the `## Current Phase` section (above the most recent existing entry), following this file's established format (see the entries immediately below it for the exact voice/detail level to match):

```text
- **2026-08-05 (same session — user approved the brainstormed design for
  vector-input authoring, then said "go ahead" / "continue" through
  writing-plans and execution): the axis-frame vector_quantity input editor
  is complete.** Closes the vector-input-authoring half of
  `context/axis-load-cases-stage-2-contract.md` deferred item 4 (the
  result-load-case-labels half already closed 2026-08-01) and the
  `vector_quantity` half of Unit 3.3's original deferral note in
  `context/ui-context.md`.
  - **Scope, per the approved design spec**
    (`docs/superpowers/specs/2026-08-05-vector-quantity-input-editor-design.md`):
    editing is supported only for `frame: "axis"` vectors — the `axis.v1`
    convention's fixed 3-component `[X, Y, Z]` order, the only frame any
    released parameter uses (`motion.axis.center_of_mass_offset`,
    `motion.axis.external_force`, `motion.axis.external_moment`). Any other
    frame still renders the existing "not yet editable" notice.
  - **Read model**: `describeField`
    (`lib/application/calculations/load-module-workspace-view.ts`, now
    exported) gained a `"vector_quantity"` case, conditional on
    `definition.frame === "axis"`; `ModuleInputFieldDescriptor` gained a
    matching member with `frame` narrowed to the literal `"axis"`.
  - **Editor UI**: `FieldControl`
    (`components/engineering/module-input-workspace.tsx`) gained a branch
    rendering 3 labeled number inputs (aria-labeled per component, since a
    field row has only one `inputId`/`<Label>`) plus one shared unit
    `<select>`, with the identical no-rounding display-unit round trip Unit
    3.9 established for scalars, applied per component.
  - **Save path**: a new pure helper, `parseSubmittedVector`
    (`app/(workspace)/workspace/parse-submitted-vector.ts`, sibling to
    `parseSubmittedQuantity`), rejects the whole submission if any of the 3
    components is blank/non-finite — no partial vectors, the generalized
    form of Unit 3.9's Defect 3 guard. `setModuleInputValueAction` gained a
    matching `valueKind === "vector_quantity"` branch that also re-derives
    `frame` from the registry rather than trusting the client-supplied
    `valueKind`, the same "never trust client-supplied unit/enum metadata"
    discipline this action already applies elsewhere.
  - **No module registered or released, no `lib/db`/Prisma change** — this
    is generic-platform work the not-yet-released `axis-load-cases` module
    (Unit 4.1) will need once it declares ports against these parameters.
  - **Tests**: 2 new pure tests for `describeField`'s new branch (against
    the real released `motion.axis.external_force`, and a fabricated
    non-axis-frame case); 8 new pure tests for `parseSubmittedVector`; 4 new
    component tests for the editor branch (display-unit round trip, empty
    inputs with no current value, submit success, and native-HTML5-required
    blocking a submit with a blank component) — plus the pre-existing
    `unsupportedField` fixture/assertion repointed at a `curve` field
    instead of `motion.axis.center_of_mass_offset`, since that parameter is
    no longer unsupported.
  - Verified: `npm run lint` (0 warnings), `npm run typecheck` (0 errors),
    `npm run test` (skip count unchanged — every new test is pure/component-
    level), `npm run build` all green.
```

- [ ] **Step 4: Verify**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: all green, identical results to Task 4's Step 8 (documentation-only changes affect nothing here).

- [ ] **Step 5: Commit**

```bash
git add context/ui-context.md context/axis-load-cases-stage-2-contract.md context/progress-tracker.md
git commit -m "docs: record the axis-frame vector_quantity input editor"
```

---

## Final Verification

After all 5 tasks:

- [ ] Run `npm run lint && npm run typecheck && npm run test && npm run build` one more time from a clean state and confirm every step is green.
- [ ] Confirm the skip count in the `npm run test` summary matches what it was before Task 1 (this plan adds no live-DB test).
- [ ] If a live database is reachable this session (per this project's standing convention — see `context/progress-tracker.md` for how prior sessions configured `DATABASE_URL`/`NODE_EXTRA_CA_CERTS`), also run `npm run test -- --testTimeout=30000` with it set and confirm the full suite passes with 0 skipped, for the strongest available verification signal — though this plan adds no new live-DB test, so this step is a re-confirmation, not a new requirement.
