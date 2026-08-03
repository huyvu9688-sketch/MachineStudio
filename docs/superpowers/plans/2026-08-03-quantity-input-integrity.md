# Quantity Input Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve canonical engineering values when a quantity is displayed and re-saved in a selected display unit, while rejecting blank numeric submissions and formatting quantities with matching magnitudes and labels.

**Architecture:** Keep unit conversion at the existing UI/server-action boundary. The client component converts a stored canonical magnitude only for its uncontrolled input's initial display value; the server action uses a small pure parser to reject blank input before numeric coercion and then preserves the existing canonical conversion/write path. The shared formatter delegates scalar quantities to the engine formatter and converts vector components before rendering. The optional `setParameterValue` no-op guard is intentionally deferred: adding its required no-write/stale-propagation proof needs a database-backed service test, contrary to this unit's pure-test/no-skip-change constraint.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Testing Library, MachineStudio unit/engineering-value engine.

---

### Task 1: Add red regression coverage for quantity integrity

**Files:**
- Modify: `components/engineering/module-input-workspace.test.tsx`
- Create: `components/engineering/format-engineering-value.test.ts`
- Modify: `lib/engine/units/convert.test.ts`
- Create: `app/(workspace)/workspace/parse-submitted-quantity.test.ts`

- [ ] **Step 1: Add UI round-trip tests to the existing workspace fixture suite.**

  Add two `ModuleInputFieldView` fixtures that are manual quantities, then assert the amount input and selected unit:

  ```tsx
  const metricManualField = {
    ...quantityDefaultField,
    resolved: {
      source: "manual",
      value: { v: 1, kind: "quantity", value: 0.5, unit: "m", displayUnit: "mm" },
    },
  } satisfies ModuleInputFieldView;

  expect(screen.getByLabelText("Payload mass")).toHaveValue(500);
  expect(screen.getByLabelText("Payload mass unit")).toHaveValue("mm");
  ```

  Use a length-labelled quantity fixture with `canonicalUnit: "m"` and display units `"m"`/`"mm"`; add a separate ambient-temperature fixture with stored `298.15 K`, `displayUnit: "degC"`, and expected numeric value `25`.

- [ ] **Step 2: Add formatter regression tests.**

  Cover a scalar display-unit conversion, canonical-only scalar behavior, and component-wise vector conversion:

  ```ts
  expect(formatEngineeringValue({ v: 1, kind: "quantity", value: 0.5, unit: "m", displayUnit: "mm" }))
    .toBe("500 mm");
  expect(formatEngineeringValue({ v: 1, kind: "quantity", value: 0.5, unit: "m" }))
    .toBe("0.5 m");
  expect(formatEngineeringValue({ v: 1, kind: "vector_quantity", components: [0.5, 1], unit: "m", displayUnit: "mm", frame: "axis" }))
    .toBe("[500, 1000] mm");
  ```

- [ ] **Step 3: Add a pure submitted-quantity parser test.**

  Define the desired parser contract with blank, whitespace, zero, and noncanonical-input cases:

  ```ts
  expect(parseSubmittedQuantity("", "mm", "m")).toEqual({
    ok: false,
    message: "Enter a numeric value.",
  });
  expect(parseSubmittedQuantity("   ", "mm", "m")).toEqual({
    ok: false,
    message: "Enter a numeric value.",
  });
  expect(parseSubmittedQuantity("0", "mm", "m")).toMatchObject({
    ok: true,
    value: { kind: "quantity", value: 0, unit: "m", displayUnit: "mm" },
  });
  expect(parseSubmittedQuantity("500", "mm", "m")).toMatchObject({
    ok: true,
    value: { kind: "quantity", value: 0.5, unit: "m", displayUnit: "mm" },
  });
  ```

- [ ] **Step 4: Extend the pure engine round-trip coverage.**

  For `0.5 m ↔ mm` and `298.15 K ↔ degC`, make matching-display-unit `Quantity` values and prove the conversion pair is within the default engineering tolerance:

  ```ts
  const expected = makeQuantity(value, canonicalUnit, displayUnit);
  const restored = makeQuantity(
    convert(convert(value, canonicalUnit, displayUnit), displayUnit, canonicalUnit),
    canonicalUnit,
    displayUnit,
  );
  expect(engineeringValuesClose(restored, expected)).toBe(true);
  ```

- [ ] **Step 5: Run the focused red suite outside the sandbox and inspect each failure.**

  Run:

  ```powershell
  npx vitest run components/engineering/module-input-workspace.test.tsx components/engineering/format-engineering-value.test.ts app/(workspace)/workspace/parse-submitted-quantity.test.ts lib/engine/units/convert.test.ts
  ```

  Expected: the quantity-display assertions, formatter assertions, and parser module/behavior fail because the defects remain; the standalone conversion-pair invariant can already pass because the conversion engine is not defective.

### Task 2: Implement the smallest UI, formatting, and parsing corrections

**Files:**
- Modify: `components/engineering/module-input-workspace.tsx`
- Modify: `components/engineering/format-engineering-value.ts`
- Create: `app/(workspace)/workspace/parse-submitted-quantity.ts`
- Modify: `app/(workspace)/workspace/actions.ts`

- [ ] **Step 1: Convert the stored canonical value only for the number input's initial display value.**

  Import `convert` from `@/lib/engine/units` (not the full `@/lib/engine` barrel, which is unsafe for this client bundle), retain `displayUnit ?? unit ?? canonicalUnit`, and use no rounding:

  ```tsx
  const defaultMagnitude = current === undefined
    ? undefined
    : convert(current.value, current.unit, defaultUnit);

  <input
    // existing attributes unchanged
    defaultValue={defaultMagnitude}
  />
  ```

- [ ] **Step 2: Make every formatter magnitude agree with its label.**

  Import `convert` and `formatQuantity` from `@/lib/engine/units`. Replace the scalar quantity branch with:

  ```ts
  case "quantity":
    return formatQuantity(value, { useDisplayUnit: true });
  ```

  For `vector_quantity`, choose `const target = value.displayUnit ?? value.unit`, convert every component from `value.unit` to `target`, continue using `trimNumber` for the vector's compact presentation, and label it with `target`. Update the module comment so it describes the remaining scalar/vector presentation distinction without accepting a mismatched unit label.

- [ ] **Step 3: Extract pure quantity parsing and delegate to it from the Server Action.**

  Implement a non-`"use server"` sibling helper with a discriminated result:

  ```ts
  export function parseSubmittedQuantity(
    rawMagnitude: string,
    rawUnit: string,
    canonicalUnit: string,
  ): SubmittedQuantityParseResult {
    const magnitudeText = rawMagnitude.trim();
    if (magnitudeText.length === 0) {
      return { ok: false, message: "Enter a numeric value." };
    }
    const magnitude = Number(magnitudeText);
    if (!Number.isFinite(magnitude)) {
      return { ok: false, message: "Enter a numeric value." };
    }
    const unit = rawUnit || canonicalUnit;
    try {
      return {
        ok: true,
        value: makeQuantity(convert(magnitude, unit, canonicalUnit), canonicalUnit, unit),
      };
    } catch {
      return { ok: false, message: `Unit "${unit}" is not valid for this value.` };
    }
  }
  ```

  In `setModuleInputValueAction`, call the helper after confirming the registry definition has a canonical unit. On an unsuccessful parse, return its existing user-facing message. Keep authorization, the registry lookup, `setParameterValue`, and `revalidatePath("/workspace")` unchanged.

- [ ] **Step 4: Re-run the focused suite and inspect the full result.**

  Run the same focused Vitest command as Task 1. Expected: all focused tests pass with no new skipped tests.

### Task 3: Synchronize the documented behavior and deferred guard decision

**Files:**
- Modify: `context/ui-context.md`
- Modify: `context/progress/unit-3.md`
- Modify: `context/progress-tracker.md`

- [ ] **Step 1: Record the user-visible formatting convention.**

  In `context/ui-context.md`'s “Tables and Numeric Inputs” section, state that engineering quantity labels format in the selected display unit using the shared six-significant-figure formatter, so a label never pairs a canonical magnitude with a display-unit suffix.

- [ ] **Step 2: Add a Unit 3.9 progress entry in both required progress records.**

  Record the UI display conversion, scalar/vector formatting correction, blank-input rejection, pure test additions, and the verification counts. State that the `setParameterValue` no-op guard is deferred to follow-up work because it would need a database-backed no-write/stale-propagation test while this unit’s new suite must stay pure and preserve the skip count. Add that follow-up to the master tracker’s Next Up section.

- [ ] **Step 3: Review the diff for scope.**

  Run:

  ```powershell
  git diff --check
  git diff -- components/engineering/module-input-workspace.tsx components/engineering/format-engineering-value.ts app/(workspace)/workspace/actions.ts app/(workspace)/workspace/parse-submitted-quantity.ts context/ui-context.md context/progress/unit-3.md context/progress-tracker.md
  ```

  Expected: no whitespace errors; no Prisma, `lib/db`, released parameter, module, or engine-unit files changed.

### Task 4: Verify and commit the work unit

**Files:**
- Verify: all Task 1–3 files

- [ ] **Step 1: Run formatter check, lint, typecheck, the full unit suite, and production build outside the sandbox when Vitest/Next need child-process spawning.**

  Run:

  ```powershell
  npx prettier --check components/engineering/module-input-workspace.tsx components/engineering/module-input-workspace.test.tsx components/engineering/format-engineering-value.ts components/engineering/format-engineering-value.test.ts app/(workspace)/workspace/actions.ts app/(workspace)/workspace/parse-submitted-quantity.ts app/(workspace)/workspace/parse-submitted-quantity.test.ts context/ui-context.md context/progress/unit-3.md context/progress-tracker.md
  npm run lint
  npm run typecheck
  npm run test
  npm run build
  ```

  Expected: Prettier clean; lint has zero warnings; typecheck has zero errors; all tests pass with the baseline skip count of 200; build exits zero.

- [ ] **Step 2: Re-read the Unit 3.9 exit criteria against fresh output.**

  Confirm that the two display-input cases, conversion-pair tolerance, scalar/vector formatting, blank-versus-zero parsing, documentation, and all verification commands are evidenced. Confirm the optional guard is logged rather than silently omitted.

- [ ] **Step 3: Create the unit-scoped local commit without staging the user’s untracked specification file.**

  Run:

  ```powershell
  git add components/engineering/module-input-workspace.tsx components/engineering/module-input-workspace.test.tsx components/engineering/format-engineering-value.ts components/engineering/format-engineering-value.test.ts app/(workspace)/workspace/actions.ts app/(workspace)/workspace/parse-submitted-quantity.ts app/(workspace)/workspace/parse-submitted-quantity.test.ts lib/engine/units/convert.test.ts context/ui-context.md context/progress/unit-3.md context/progress-tracker.md docs/superpowers/plans/2026-08-03-quantity-input-integrity.md
  git commit -m "fix(3.9): preserve quantity input integrity"
  ```

  Expected: only the named work-unit files are committed; `context/unit-3.9-quantity-input-integrity-spec.md` remains untracked and untouched.
