# Motor Sizing Shared Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the two shared, reusable pieces every Motor Sizing module version bump in `docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md` depends on: a generic `disabledWhen` UI capability (lets one input field disable itself based on another enum field's value) and parameter registry v1.15.0 (five new `*.inertia_ratio_recommended_maximum` parameters, one per Motor Sizing mechanism, each carrying a founder-directed default of 10).

**Architecture:** `disabledWhen` is added at the `lib/engine/module-sdk` level (the `ModuleUiField` contract every module's UI schema already uses) so any current or future module can declare it; resolution happens once, in the existing `loadModuleWorkspaceView` read-model builder, as a small pure function so it's unit-testable without a database; rendering is a native HTML `disabled` attribute in the existing generic input renderer — no client-side reactivity needed, since this app already re-renders the whole page from the database after every field save. The five new registry parameters are appended to their own existing `motor_sizing.<mechanism>.*` definition groups, following this project's own established append-in-place pattern (confirmed by inspecting how belt-pulley's own 0.2.0 registry bump was done) — never editing an already-released parameter definition.

**Tech Stack:** TypeScript, Zod, Vitest, React (Server Components + one `"use client"` form component), Next.js.

---

## Before you start

Read `docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md` in full — this plan implements sections "Generic UI capability: `disabledWhen`" and "Inertia-ratio recommended default" only. It does **not** touch any of the five Motor Sizing modules themselves (ball-screw-motor-sizing, direct-drive-conveyor-motor-sizing, rack-pinion-motor-sizing, index-table-motor-sizing, belt-pulley-drive-motor-sizing) — those are five separate, later plans that depend on this one being merged first.

Confirm your starting point before Task 1:

```bash
git status
```

Expected: clean, or only unrelated changes you're aware of. Do not proceed on a dirty tree without checking with the user first.

---

### Task 1: Add `disabledWhen` to the generic UI field contract

**Files:**
- Modify: `lib/engine/module-sdk/types.ts:152-160`
- Modify: `lib/engine/module-sdk/schemas.ts:99-103`

This is a pure type/schema addition — nothing calls it yet, so there is no "failing test" to write first here (there is no observable behavior until Task 2 validates it and Task 3 resolves it). Instead, this task's own verification is that the package still typechecks with the new field present and optional.

- [ ] **Step 1: Add the `disabledWhen` field to `ModuleUiField`**

In `lib/engine/module-sdk/types.ts`, find:

```ts
/** A single generic UI field bound to an input port. */
export interface ModuleUiField {
  /** Input port key this field edits. Must reference a declared input port. */
  readonly portKey: string;
  /** Optional display label; defaults to the parameter's display name. */
  readonly label?: string;
  /** Optional help text. */
  readonly help?: string;
}
```

Replace it with:

```ts
/** A single generic UI field bound to an input port. */
export interface ModuleUiField {
  /** Input port key this field edits. Must reference a declared input port. */
  readonly portKey: string;
  /** Optional display label; defaults to the parameter's display name. */
  readonly label?: string;
  /** Optional help text. */
  readonly help?: string;
  /**
   * When present, the generic renderer shows this field disabled (visible,
   * non-editable) whenever the named enum input port currently resolves to
   * `equals`. Deliberately minimal — one condition, enum-equality only —
   * because that is the only case any module needs today (a motion-mode
   * toggle selecting which of two input pairs applies). `portKey` must
   * reference a declared enum-kind input port on the same module
   * (`lib/engine/module-sdk/validate.ts` enforces this at registration
   * time).
   */
  readonly disabledWhen?: {
    readonly portKey: string;
    readonly equals: string;
  };
}
```

- [ ] **Step 2: Add the matching Zod schema field**

In `lib/engine/module-sdk/schemas.ts`, find:

```ts
export const ModuleUiFieldSchema = z.strictObject({
  portKey: nonEmptyString,
  label: nonEmptyString.optional(),
  help: nonEmptyString.optional(),
});
```

Replace it with:

```ts
export const ModuleUiFieldSchema = z.strictObject({
  portKey: nonEmptyString,
  label: nonEmptyString.optional(),
  help: nonEmptyString.optional(),
  disabledWhen: z
    .strictObject({
      portKey: nonEmptyString,
      equals: nonEmptyString,
    })
    .optional(),
});
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: `0 errors`. This also exercises this file's own `_ModuleSdkSchemaParity` compile-time guard (schemas.ts, near the bottom), which asserts `ModuleUiField` and `z.infer<typeof ModuleUiFieldSchema>` stay mutually assignable — since both sides were edited identically, this passes without any other change.

- [ ] **Step 4: Commit**

```bash
git add lib/engine/module-sdk/types.ts lib/engine/module-sdk/schemas.ts
git commit -m "$(cat <<'EOF'
feat: add disabledWhen to the generic module UI field contract

Lets a module's UI schema declare that one input field should render
disabled whenever a named enum port holds a specific value — the
belt-pulley-drive-motor-sizing 0.3.0 motion-mode toggle is the first
consumer (a later plan).
EOF
)"
```

---

### Task 2: Validate `disabledWhen` at module-registration time

**Files:**
- Modify: `lib/engine/module-sdk/validate.ts:145-156`
- Modify: `lib/engine/module-sdk/validate.test.ts` (add after the existing "rejects a UI field referencing an unknown input port" test, currently ending around line 177)

- [ ] **Step 1: Write the three failing tests**

In `lib/engine/module-sdk/validate.test.ts`, immediately after the existing test:

```ts
  it("rejects a UI field referencing an unknown input port", () => {
    const draft = baseDraft();
    const pkg = sealModulePackage({
      ...draft,
      uiSchema: {
        groups: [{ id: "g", title: "G", fields: [{ portKey: "nope" }] }],
      },
    });
    expectSdkError(() => validateModulePackage(pkg), "invalid_ui_schema");
  });
```

add:

```ts
  it("rejects a UI field's disabledWhen referencing an unknown input port", () => {
    const draft = baseDraft();
    const pkg = sealModulePackage({
      ...draft,
      uiSchema: {
        groups: [
          {
            id: "g",
            title: "G",
            fields: [
              { portKey: "mass", disabledWhen: { portKey: "nope", equals: "x" } },
            ],
          },
        ],
      },
    });
    expectSdkError(() => validateModulePackage(pkg), "invalid_ui_schema");
  });

  it("rejects a UI field's disabledWhen referencing a non-enum input port", () => {
    const draft = baseDraft();
    const pkg = sealModulePackage({
      ...draft,
      uiSchema: {
        groups: [
          {
            id: "g",
            title: "G",
            fields: [
              {
                portKey: "mass",
                disabledWhen: { portKey: "mass", equals: "x" },
              },
            ],
          },
        ],
      },
    });
    expectSdkError(() => validateModulePackage(pkg), "invalid_ui_schema");
  });

  it("accepts a UI field's disabledWhen referencing a declared enum input port", () => {
    const draft = baseDraft();
    const pkg = sealModulePackage({
      ...draft,
      ports: {
        inputs: [
          ...draft.ports.inputs,
          {
            key: "orientation",
            parameterId: asParameterId("motion.axis.orientation"),
            required: false,
          },
        ],
        outputs: draft.ports.outputs,
      },
      uiSchema: {
        groups: [
          {
            id: "g",
            title: "G",
            fields: [
              { portKey: "orientation" },
              {
                portKey: "mass",
                disabledWhen: { portKey: "orientation", equals: "vertical" },
              },
            ],
          },
        ],
      },
    });

    expect(() => validateModulePackage(pkg)).not.toThrow();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/engine/module-sdk/validate.test.ts`
Expected: the two `rejects` tests FAIL (no error is currently thrown for an unresolved/wrong-kind `disabledWhen`, since `validate.ts` doesn't inspect that field yet), and the `accepts` test PASSES (there's nothing to reject yet). Confirm this exact pattern before continuing.

- [ ] **Step 3: Implement the conformance check**

In `lib/engine/module-sdk/validate.ts`, find the UI field loop:

```ts
  const inputKeySet = new Set(inputKeys);
  for (const group of ui.data.groups) {
    for (const field of group.fields) {
      if (!inputKeySet.has(field.portKey)) {
        fail(
          "invalid_ui_schema",
          `Module "${id}" UI field references unknown input port "${field.portKey}".`,
          field.portKey,
        );
      }
    }
  }
```

Replace it with:

```ts
  const inputKeySet = new Set(inputKeys);
  const inputPortsByKey = new Map(pkg.ports.inputs.map((p) => [p.key, p]));
  for (const group of ui.data.groups) {
    for (const field of group.fields) {
      if (!inputKeySet.has(field.portKey)) {
        fail(
          "invalid_ui_schema",
          `Module "${id}" UI field references unknown input port "${field.portKey}".`,
          field.portKey,
        );
      }

      if (field.disabledWhen !== undefined) {
        const drivingPort = inputPortsByKey.get(field.disabledWhen.portKey);
        if (drivingPort === undefined) {
          fail(
            "invalid_ui_schema",
            `Module "${id}" UI field "${field.portKey}" has disabledWhen referencing unknown input port "${field.disabledWhen.portKey}".`,
            field.disabledWhen.portKey,
          );
        }
        const drivingDefinition = registry.get(drivingPort.parameterId);
        if (drivingDefinition?.valueType !== "enum") {
          fail(
            "invalid_ui_schema",
            `Module "${id}" UI field "${field.portKey}" has disabledWhen referencing non-enum input port "${field.disabledWhen.portKey}".`,
            field.disabledWhen.portKey,
          );
        }
      }
    }
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/engine/module-sdk/validate.test.ts`
Expected: all tests PASS, including the three new ones.

- [ ] **Step 5: Run the full module-sdk test directory and typecheck**

Run: `npx vitest run lib/engine/module-sdk/`
Expected: all tests PASS (this directory's other files — `conformance.test.ts`, `execute.test.ts`, `sdk.test.ts`, etc. — are unaffected by this change but must stay green).

Run: `npm run typecheck`
Expected: `0 errors`.

- [ ] **Step 6: Commit**

```bash
git add lib/engine/module-sdk/validate.ts lib/engine/module-sdk/validate.test.ts
git commit -m "$(cat <<'EOF'
feat: validate disabledWhen references a declared enum input port

A module registering a UI field's disabledWhen against an unknown port,
or a port that isn't enum-kind, now fails module conformance with a
clear invalid_ui_schema error instead of silently doing nothing at
render time.
EOF
)"
```

---

### Task 3: Resolve each field's disabled state in the workspace view builder

**Files:**
- Modify: `lib/application/calculations/load-module-workspace-view.ts`
- Modify: `lib/application/calculations/load-module-workspace-view.test.ts` (add a new top-level `describe` block, not nested inside the existing `describe.skipIf(!liveDatabaseAvailable)(...)` wrapper, so it runs without a database)

- [ ] **Step 1: Write the failing tests**

At the end of `lib/application/calculations/load-module-workspace-view.test.ts` (after the closing `);` of the existing `describe.skipIf(...)` block, as a new top-level, non-DB-gated block), add:

```ts
describe("resolveFieldDisabled", () => {
  it("is false when the field has no disabledWhen condition", async () => {
    const { resolveFieldDisabled } = await import(
      "./load-module-workspace-view"
    );
    expect(resolveFieldDisabled(undefined, new Map())).toBe(false);
  });

  it("is false when the driving port has no resolved entry", async () => {
    const { resolveFieldDisabled } = await import(
      "./load-module-workspace-view"
    );
    expect(
      resolveFieldDisabled(
        { portKey: "motion_mode", equals: "velocity" },
        new Map(),
      ),
    ).toBe(false);
  });

  it("is false when the driving port resolves to its registry default (no materialized view value)", async () => {
    const { resolveFieldDisabled } = await import(
      "./load-module-workspace-view"
    );
    const resolvedByPortKey = new Map([
      ["motion_mode", { source: "default" as const }],
    ]);
    expect(
      resolveFieldDisabled(
        { portKey: "motion_mode", equals: "velocity" },
        resolvedByPortKey,
      ),
    ).toBe(false);
  });

  it("is false when the driving port's value is a different enum member", async () => {
    const { resolveFieldDisabled } = await import(
      "./load-module-workspace-view"
    );
    const resolvedByPortKey = new Map([
      [
        "motion_mode",
        {
          source: "manual" as const,
          value: {
            v: 1 as const,
            kind: "enum" as const,
            enumId: "belt_pulley_motion_mode",
            value: "distance",
          },
        },
      ],
    ]);
    expect(
      resolveFieldDisabled(
        { portKey: "motion_mode", equals: "velocity" },
        resolvedByPortKey,
      ),
    ).toBe(false);
  });

  it("is true when the driving port's resolved enum value matches", async () => {
    const { resolveFieldDisabled } = await import(
      "./load-module-workspace-view"
    );
    const resolvedByPortKey = new Map([
      [
        "motion_mode",
        {
          source: "manual" as const,
          value: {
            v: 1 as const,
            kind: "enum" as const,
            enumId: "belt_pulley_motion_mode",
            value: "velocity",
          },
        },
      ],
    ]);
    expect(
      resolveFieldDisabled(
        { portKey: "motion_mode", equals: "velocity" },
        resolvedByPortKey,
      ),
    ).toBe(true);
  });

  it("is false for a linked port whose value has not resolved yet (module output not yet run)", async () => {
    const { resolveFieldDisabled } = await import(
      "./load-module-workspace-view"
    );
    const resolvedByPortKey = new Map([
      [
        "motion_mode",
        {
          source: "linked" as const,
          link: {} as never,
          value: null,
        },
      ],
    ]);
    expect(
      resolveFieldDisabled(
        { portKey: "motion_mode", equals: "velocity" },
        resolvedByPortKey,
      ),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/application/calculations/load-module-workspace-view.test.ts`
Expected: FAIL — `resolveFieldDisabled` is not exported from `./load-module-workspace-view` yet.

- [ ] **Step 3: Implement `resolveFieldDisabled` and wire it in**

In `lib/application/calculations/load-module-workspace-view.ts`, find the `ModuleInputFieldView` interface:

```ts
/** One input field, fully described for the generic renderer — no engine imports needed downstream. */
export interface ModuleInputFieldView {
  readonly portKey: string;
  readonly parameterId: string;
  readonly label: string;
  readonly help: string | null;
  readonly required: boolean;
  readonly loadCase: LoadCaseCategory | null;
  readonly field: ModuleInputFieldDescriptor;
  readonly resolved: ResolvedInputSource;
  /**
   * Ranked link suggestions for this port (Unit 3.4), nearest scope first.
   * Always `[]` when `resolved.source === "linked"` — a field with a
   * confirmed link is not offered alternatives; the user must remove the
   * existing link first (`ui-context.md` "Link Suggestions").
   */
  readonly suggestions: readonly LinkSuggestionSourceView[];
  /**
   * The number of module instances that would be marked stale if this
   * field's confirmed link were removed (Unit 3.4's "Downstream stale-impact
   * warning on removal"). `null` when `resolved.source !== "linked"` — there
   * is no link to remove.
   */
  readonly linkRemovalImpact: number | null;
}
```

Replace it with (only the new `disabled` field and its doc comment are added — everything else is unchanged):

```ts
/** One input field, fully described for the generic renderer — no engine imports needed downstream. */
export interface ModuleInputFieldView {
  readonly portKey: string;
  readonly parameterId: string;
  readonly label: string;
  readonly help: string | null;
  readonly required: boolean;
  readonly loadCase: LoadCaseCategory | null;
  readonly field: ModuleInputFieldDescriptor;
  readonly resolved: ResolvedInputSource;
  /**
   * Ranked link suggestions for this port (Unit 3.4), nearest scope first.
   * Always `[]` when `resolved.source === "linked"` — a field with a
   * confirmed link is not offered alternatives; the user must remove the
   * existing link first (`ui-context.md` "Link Suggestions").
   */
  readonly suggestions: readonly LinkSuggestionSourceView[];
  /**
   * The number of module instances that would be marked stale if this
   * field's confirmed link were removed (Unit 3.4's "Downstream stale-impact
   * warning on removal"). `null` when `resolved.source !== "linked"` — there
   * is no link to remove.
   */
  readonly linkRemovalImpact: number | null;
  /**
   * True when the module's own `ModuleUiField.disabledWhen` condition is
   * currently met by another port's resolved value — the generic renderer
   * shows this field but blocks interaction. Optional (rather than always
   * `false`) so the dozens of existing `ModuleInputFieldView` test fixtures
   * across this codebase compile unchanged; `undefined` renders identically
   * to `false`.
   */
  readonly disabled?: boolean;
}

/** A field's declarative "disable when" condition, mirroring `ModuleUiField.disabledWhen`. */
export interface FieldDisabledWhen {
  readonly portKey: string;
  readonly equals: string;
}

/**
 * Whether a field should render disabled given the driving port's currently
 * resolved value, per `disabledWhen`. `false` whenever the driving port's
 * value isn't yet known as a concrete enum value — unset, a module-output
 * link that hasn't run yet, or a registry constant default (which has no
 * materialized view value at this layer) — since showing a field normally
 * is safer than guessing which input mode applies. Exported and pure so it
 * is unit-testable without a database; `loadModuleWorkspaceView` is the only
 * real caller.
 */
export function resolveFieldDisabled(
  disabledWhen: FieldDisabledWhen | undefined,
  resolvedByPortKey: ReadonlyMap<string, ResolvedInputSource>,
): boolean {
  if (disabledWhen === undefined) return false;
  const driving = resolvedByPortKey.get(disabledWhen.portKey);
  if (driving === undefined || driving.source === "default") return false;
  const value = driving.value;
  if (value === null || value === undefined || value.kind !== "enum") {
    return false;
  }
  return value.value === disabledWhen.equals;
}
```

Then find the field-mapping closure:

```ts
      return {
        portKey: field.portKey,
        parameterId: port.parameterId,
        label: field.label ?? definition.displayName,
        help: field.help ?? null,
        required: port.required,
        loadCase: port.loadCase ?? null,
        field: describeField(definition.valueType, definition),
        resolved,
        suggestions,
        linkRemovalImpact:
          resolved.source === "linked"
            ? (removalImpactByPortKey.get(field.portKey) ?? 0)
            : null,
      };
```

Replace it with:

```ts
      return {
        portKey: field.portKey,
        parameterId: port.parameterId,
        label: field.label ?? definition.displayName,
        help: field.help ?? null,
        required: port.required,
        loadCase: port.loadCase ?? null,
        field: describeField(definition.valueType, definition),
        resolved,
        suggestions,
        linkRemovalImpact:
          resolved.source === "linked"
            ? (removalImpactByPortKey.get(field.portKey) ?? 0)
            : null,
        disabled: resolveFieldDisabled(field.disabledWhen, resolvedByPortKey),
      };
```

`resolvedByPortKey` is already in scope in this closure (declared earlier in the function, `const resolvedByPortKey = new Map<string, ResolvedInputSource>();`) — no new variable needed.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/application/calculations/load-module-workspace-view.test.ts`
Expected: all tests PASS, including the six new `resolveFieldDisabled` ones. (The live-DB tests in the same file report as skipped, not passed, unless `DATABASE_URL`/`NODE_EXTRA_CA_CERTS` are set — that's expected and unrelated to this change.)

- [ ] **Step 5: Typecheck and lint**

Run: `npm run typecheck`
Expected: `0 errors`.

Run: `npx eslint lib/application/calculations/load-module-workspace-view.ts lib/application/calculations/load-module-workspace-view.test.ts`
Expected: no output (0 problems).

- [ ] **Step 6: Commit**

```bash
git add lib/application/calculations/load-module-workspace-view.ts lib/application/calculations/load-module-workspace-view.test.ts
git commit -m "$(cat <<'EOF'
feat: resolve disabledWhen against each module instance's live input state

resolveFieldDisabled is a small pure function so the resolution logic
is unit-testable without a database; ModuleInputFieldView.disabled is
optional so every existing fixture across the codebase keeps compiling
unchanged.
EOF
)"
```

---

### Task 4: Render disabled fields in the generic input renderer

**Files:**
- Modify: `components/engineering/module-input-workspace.tsx`
- Modify: `components/engineering/module-input-workspace.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `components/engineering/module-input-workspace.test.tsx`, after the existing `enumManualField` fixture (and its closing `};`), add a disabled variant:

```ts
const disabledEnumField: ModuleInputFieldView = {
  ...enumManualField,
  portKey: "travel_distance_mode_locked_example",
  disabled: true,
};
```

Then, inside the `describe("ModuleInputWorkspace", ...)` block (find any existing `it(...)` inside it and add this as a sibling test — match the existing tests' own pattern of building a `view: ModuleWorkspaceView` from one group of fields and rendering `<ModuleInputWorkspace view={view} />`):

```ts
  it("renders a disabled field's control and Save button non-interactive, and omits its link-suggestion panel", () => {
    const view: ModuleWorkspaceView = {
      moduleInstance: {
        id: "mi-1" as ModuleWorkspaceView["moduleInstance"]["id"],
        assemblyId: "a-1" as ModuleWorkspaceView["moduleInstance"]["assemblyId"],
        configurationId:
          "c-1" as ModuleWorkspaceView["moduleInstance"]["configurationId"],
        label: "Test module",
        modulePackageId: "test-mod",
        moduleVersion: "0.1.0",
        category: "test",
        lastRunStatus: null,
      },
      groups: [{ id: "g", title: "Group", fields: [disabledEnumField] }],
    };

    render(<ModuleInputWorkspace view={view} />);

    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.queryByText(/suggestion/i)).not.toBeInTheDocument();
  });

  it("renders a non-disabled field's control and Save button interactive", () => {
    const view: ModuleWorkspaceView = {
      moduleInstance: {
        id: "mi-1" as ModuleWorkspaceView["moduleInstance"]["id"],
        assemblyId: "a-1" as ModuleWorkspaceView["moduleInstance"]["assemblyId"],
        configurationId:
          "c-1" as ModuleWorkspaceView["moduleInstance"]["configurationId"],
        label: "Test module",
        modulePackageId: "test-mod",
        moduleVersion: "0.1.0",
        category: "test",
        lastRunStatus: null,
      },
      groups: [{ id: "g", title: "Group", fields: [enumManualField] }],
    };

    render(<ModuleInputWorkspace view={view} />);

    expect(screen.getByRole("combobox")).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Save" })).not.toBeDisabled();
  });
```

Check the top of this test file for how existing tests construct a `ModuleWorkspaceView`/render call the ID branded types (e.g. search this same file for an existing `render(<ModuleInputWorkspace` call) and match that exact casting convention if it differs from the inline `as ModuleWorkspaceView["moduleInstance"]["id"]` pattern shown above — use whatever this file's own existing tests already use for `moduleInstance.id`/`assemblyId`/`configurationId`, so the new tests match file style exactly.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run components/engineering/module-input-workspace.test.tsx`
Expected: the new "renders a disabled field's..." test FAILS (nothing is disabled yet); the "renders a non-disabled field's..." test PASSES (already true today).

- [ ] **Step 3: Implement disabled rendering**

In `components/engineering/module-input-workspace.tsx`, find the `ModuleInputFieldRow` function's return JSX:

```tsx
      {field.resolved.source === "linked" ? (
        <LinkedFieldControl
          resolved={field.resolved}
          linkRemovalImpact={field.linkRemovalImpact ?? 0}
        />
      ) : (
        <>
          {field.field.kind === "unsupported" ? (
            <p className="text-[12px] text-text-muted italic">
              Editing {field.field.valueType.replace("_", " ")} values is not
              supported yet — link a source instead.
            </p>
          ) : (
            <form
              action={formAction}
              className="flex flex-wrap items-start gap-2"
            >
              <input
                type="hidden"
                name="configurationId"
                value={configurationId}
              />
              <input
                type="hidden"
                name="moduleInstanceId"
                value={moduleInstanceId}
              />
              <input
                type="hidden"
                name="parameterId"
                value={field.parameterId}
              />
              {field.loadCase !== null ? (
                <input type="hidden" name="loadCase" value={field.loadCase} />
              ) : null}
              <input type="hidden" name="valueKind" value={field.field.kind} />

              <FieldControl field={field} inputId={inputId} />

              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={isPending}
              >
                {isPending ? "Saving…" : "Save"}
              </Button>
            </form>
          )}
          <LinkSuggestionPanel
            field={field}
            configurationId={configurationId}
            targetModuleInstanceId={moduleInstanceId}
          />
        </>
      )}
```

Replace it with:

```tsx
      {field.resolved.source === "linked" ? (
        <LinkedFieldControl
          resolved={field.resolved}
          linkRemovalImpact={field.linkRemovalImpact ?? 0}
        />
      ) : (
        <>
          {field.field.kind === "unsupported" ? (
            <p className="text-[12px] text-text-muted italic">
              Editing {field.field.valueType.replace("_", " ")} values is not
              supported yet — link a source instead.
            </p>
          ) : (
            <form
              action={formAction}
              className="flex flex-wrap items-start gap-2"
            >
              <input
                type="hidden"
                name="configurationId"
                value={configurationId}
              />
              <input
                type="hidden"
                name="moduleInstanceId"
                value={moduleInstanceId}
              />
              <input
                type="hidden"
                name="parameterId"
                value={field.parameterId}
              />
              {field.loadCase !== null ? (
                <input type="hidden" name="loadCase" value={field.loadCase} />
              ) : null}
              <input type="hidden" name="valueKind" value={field.field.kind} />

              <FieldControl
                field={field}
                inputId={inputId}
                disabled={field.disabled ?? false}
              />

              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={isPending || (field.disabled ?? false)}
              >
                {isPending ? "Saving…" : "Save"}
              </Button>
            </form>
          )}
          {field.disabled ? null : (
            <LinkSuggestionPanel
              field={field}
              configurationId={configurationId}
              targetModuleInstanceId={moduleInstanceId}
            />
          )}
        </>
      )}
```

Then find the entire `FieldControl` function:

```tsx
function FieldControl({
  field,
  inputId,
}: {
  readonly field: ModuleInputFieldView;
  readonly inputId: string;
}) {
  const descriptor = field.field;
  const resolved = field.resolved;
  // "linked"/"unsupported" never reach here (handled by the caller), so
  // `resolved` here is always "manual" | "workflow" | "default".
  const currentValue =
    resolved.source === "default" ? undefined : resolved.value;

  if (descriptor.kind === "quantity") {
    const current =
      currentValue?.kind === "quantity" ? currentValue : undefined;
    const defaultUnit =
      current?.displayUnit ?? current?.unit ?? descriptor.canonicalUnit;
    const defaultMagnitude =
      current === undefined
        ? undefined
        : convert(current.value, current.unit, defaultUnit);
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
    const current =
      currentValue?.kind === "vector_quantity" ? currentValue : undefined;
    const defaultUnit =
      current?.displayUnit ?? current?.unit ?? descriptor.canonicalUnit;
    const defaultComponents = current?.components.map((component) =>
      convert(component, current.unit, defaultUnit),
    );
    return (
      <div className="flex flex-wrap items-start gap-2">
        {AXIS_COMPONENT_LABELS.map((axisLabel, index) => (
          <div key={axisLabel} className="flex flex-col gap-0.5">
            <span className="text-[11px] text-text-muted">
              {AXIS_COMPONENT_CAPTIONS[index]}
            </span>
            <input
              id={index === 0 ? inputId : undefined}
              type="number"
              step="any"
              name={`component-${index}`}
              defaultValue={defaultComponents?.[index]}
              aria-label={`${field.label} ${axisLabel}`}
              required={field.required}
              className={cn(CONTROL_CLASS, "w-24 font-mono tabular-nums")}
            />
          </div>
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
    const current =
      currentValue?.kind === "enum" ? currentValue.value : undefined;
    return (
      <select
        id={inputId}
        name="option"
        defaultValue={current ?? ""}
        required={field.required}
        className={cn(CONTROL_CLASS, "w-48")}
      >
        {current === undefined ? (
          <option value="" disabled>
            Select…
          </option>
        ) : null}
        {descriptor.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  // "boolean"
  const current = currentValue?.kind === "boolean" ? currentValue.value : false;
  return (
    <label className="flex h-9 items-center gap-2 text-[13px] text-text-primary">
      <input
        id={inputId}
        type="checkbox"
        name="checked"
        value="true"
        defaultChecked={current}
        className="h-4 w-4 rounded border-border-default"
      />
      Yes
    </label>
  );
}
```

Replace it with (every rendered `<input>`/`<select>` gets a new `disabled={disabled}` prop; nothing else changes):

```tsx
function FieldControl({
  field,
  inputId,
  disabled,
}: {
  readonly field: ModuleInputFieldView;
  readonly inputId: string;
  readonly disabled: boolean;
}) {
  const descriptor = field.field;
  const resolved = field.resolved;
  // "linked"/"unsupported" never reach here (handled by the caller), so
  // `resolved` here is always "manual" | "workflow" | "default".
  const currentValue =
    resolved.source === "default" ? undefined : resolved.value;

  if (descriptor.kind === "quantity") {
    const current =
      currentValue?.kind === "quantity" ? currentValue : undefined;
    const defaultUnit =
      current?.displayUnit ?? current?.unit ?? descriptor.canonicalUnit;
    const defaultMagnitude =
      current === undefined
        ? undefined
        : convert(current.value, current.unit, defaultUnit);
    return (
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="number"
          step="any"
          name="magnitude"
          defaultValue={defaultMagnitude}
          required={field.required}
          disabled={disabled}
          className={cn(CONTROL_CLASS, "w-36 font-mono tabular-nums")}
        />
        <select
          name="unit"
          defaultValue={defaultUnit}
          aria-label={`${field.label} unit`}
          disabled={disabled}
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
    const current =
      currentValue?.kind === "vector_quantity" ? currentValue : undefined;
    const defaultUnit =
      current?.displayUnit ?? current?.unit ?? descriptor.canonicalUnit;
    const defaultComponents = current?.components.map((component) =>
      convert(component, current.unit, defaultUnit),
    );
    return (
      <div className="flex flex-wrap items-start gap-2">
        {AXIS_COMPONENT_LABELS.map((axisLabel, index) => (
          <div key={axisLabel} className="flex flex-col gap-0.5">
            <span className="text-[11px] text-text-muted">
              {AXIS_COMPONENT_CAPTIONS[index]}
            </span>
            <input
              id={index === 0 ? inputId : undefined}
              type="number"
              step="any"
              name={`component-${index}`}
              defaultValue={defaultComponents?.[index]}
              aria-label={`${field.label} ${axisLabel}`}
              required={field.required}
              disabled={disabled}
              className={cn(CONTROL_CLASS, "w-24 font-mono tabular-nums")}
            />
          </div>
        ))}
        <select
          name="unit"
          defaultValue={defaultUnit}
          aria-label={`${field.label} unit`}
          disabled={disabled}
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
    const current =
      currentValue?.kind === "enum" ? currentValue.value : undefined;
    return (
      <select
        id={inputId}
        name="option"
        defaultValue={current ?? ""}
        required={field.required}
        disabled={disabled}
        className={cn(CONTROL_CLASS, "w-48")}
      >
        {current === undefined ? (
          <option value="" disabled>
            Select…
          </option>
        ) : null}
        {descriptor.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  // "boolean"
  const current = currentValue?.kind === "boolean" ? currentValue.value : false;
  return (
    <label className="flex h-9 items-center gap-2 text-[13px] text-text-primary">
      <input
        id={inputId}
        type="checkbox"
        name="checked"
        value="true"
        defaultChecked={current}
        disabled={disabled}
        className="h-4 w-4 rounded border-border-default"
      />
      Yes
    </label>
  );
}
```

Note the pre-existing `disabled` prop on the enum branch's own `<option value="" disabled>` placeholder is untouched — that's a permanently-disabled placeholder option, unrelated to this field's own `disabled` prop, and both can coexist on the same `<select>` without conflict.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run components/engineering/module-input-workspace.test.tsx`
Expected: all tests PASS, including both new ones.

- [ ] **Step 5: Typecheck and lint**

Run: `npm run typecheck`
Expected: `0 errors`.

Run: `npx eslint components/engineering/module-input-workspace.tsx components/engineering/module-input-workspace.test.tsx`
Expected: no output (0 problems).

- [ ] **Step 6: Commit**

```bash
git add components/engineering/module-input-workspace.tsx components/engineering/module-input-workspace.test.tsx
git commit -m "$(cat <<'EOF'
feat: render disabledWhen fields as non-interactive in the generic input renderer

A disabled field keeps its label, help text, and any previously-saved
value visible, but its control(s), Save button, and link-suggestion
panel are all inert — no client-side reactivity needed, since this
form already fully re-renders from the database after every save.
EOF
)"
```

---

### Task 5: Parameter registry v1.15.0 — five recommended-maximum inertia-ratio parameters

**Files:**
- Modify: `lib/engine/parameters/definitions.ts`
- Modify: `lib/engine/parameters/registered.ts:19-34`
- Modify: `lib/engine/parameters/hash.test.ts:8`

This task is additive-only: none of the five existing `*.inertia_ratio_maximum` parameter definitions are edited (`lib/engine/parameters/README.md`: "Released parameter IDs are immutable... never edit a released definition in place").

- [ ] **Step 1: Bump the registry version and header comment**

In `lib/engine/parameters/definitions.ts`, find:

```ts
// v1.14 adds 8 new motor_sizing.belt_pulley.* parameters (motion_mode,
// deceleration_time, dwell_time, constant_velocity_time, cycle_time,
// travel_distance, deceleration_torque, effective_torque) for the
// belt-pulley-drive-motor-sizing 0.2.0 release (context/modules/
// belt-pulley-drive-motor-sizing/stage-2-contract.md "0.2.0 Addendum") --
// the first module-version bump in this project. Additive only; none of
// the 24 parameters 1.12.0 already released for this module's own 0.1.0
// are edited.

import { makeQuantity } from "../units";
import { defineParameter } from "./define";
import type { ParameterDefinition } from "./types";

/** Semantic version of the released canonical parameter registry. */
export const PARAMETER_REGISTRY_VERSION = "1.14.0";
```

Replace it with:

```ts
// v1.14 adds 8 new motor_sizing.belt_pulley.* parameters (motion_mode,
// deceleration_time, dwell_time, constant_velocity_time, cycle_time,
// travel_distance, deceleration_torque, effective_torque) for the
// belt-pulley-drive-motor-sizing 0.2.0 release (context/modules/
// belt-pulley-drive-motor-sizing/stage-2-contract.md "0.2.0 Addendum") --
// the first module-version bump in this project. Additive only; none of
// the 24 parameters 1.12.0 already released for this module's own 0.1.0
// are edited.
//
// v1.15 adds one new parameter per Motor Sizing mechanism --
// motor_sizing.<mechanism>.inertia_ratio_recommended_maximum (ball_screw,
// direct_drive_conveyor, rack_pinion, belt_pulley, index_table) -- a
// sibling of each mechanism's own existing *.inertia_ratio_maximum
// (required, no default, unedited and unaffected by this release). Each
// new parameter carries a founder-directed default of 10, disclosed in its
// own definition text as founder judgment, not a manufacturer-sourced
// figure -- a deliberate, disclosed departure from this project's usual
// evidence bar for a numeric default, matching drive-train/stage-1-spec.md
// item 5's own finding that five sources disagree on this exact ratio (2:1
// to 100:1). See docs/superpowers/specs/
// 2026-08-18-motor-sizing-consistency-pass-design.md "Inertia-ratio
// recommended default" for the full account.

import { makeQuantity } from "../units";
import { defineParameter } from "./define";
import type { ParameterDefinition } from "./types";

/** Semantic version of the released canonical parameter registry. */
export const PARAMETER_REGISTRY_VERSION = "1.15.0";
```

- [ ] **Step 2: Add the ball-screw recommended-maximum parameter**

In `lib/engine/parameters/definitions.ts`, find (inside the `motorSizingBallScrew` array):

```ts
    id: "motor_sizing.ball_screw.inertia_ratio_maximum",
    displayName: "Maximum allowable load-to-rotor inertia ratio",
    symbol: "R_Jmax",
    definition:
      "Maximum acceptable inertia_ratio, engineer-supplied with no built-in default -- the same five-way sourced disagreement (2:1 to 100:1, depending on control technology, tuning method, and positioning objective) drive-train/stage-1-spec.md item 5 already documents, reused by citation here, not re-researched.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
```

Add immediately after it (still inside the `motorSizingBallScrew` array, as the next element):

```ts
  defineParameter({
    id: "motor_sizing.ball_screw.inertia_ratio_recommended_maximum",
    displayName: "Recommended maximum inertia ratio",
    symbol: "R_Jmax,rec",
    definition:
      "Suggested maximum load-to-rotor inertia ratio, editable. Founder-directed default (10:1, general industrial automation), not a manufacturer-sourced value -- use the motor manufacturer's own published limit when available. Typical servo-industry ranges: ~5:1 for high-precision/fast-response applications, ~10:1 for general automation, ~20:1 for moderate-performance applications, and up to 30:1 or higher where a specific manufacturer permits it. A sibling of inertia_ratio_maximum (required, no default, unedited by this release), not a replacement for it -- a new module version may choose to use this parameter instead.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "constant", value: makeQuantity(10, "ratio") },
  }),
```

- [ ] **Step 3: Add the direct-drive-conveyor recommended-maximum parameter**

Find (inside the `motorSizingDirectDriveConveyor` array):

```ts
    id: "motor_sizing.direct_drive_conveyor.inertia_ratio_maximum",
    displayName: "Maximum allowable load-to-rotor inertia ratio",
    symbol: "R_Jmax",
    definition:
      "Maximum acceptable inertia_ratio, engineer-supplied with no built-in default -- the same required-input-no-default precedent motor_sizing.ball_screw.inertia_ratio_maximum already established, reused by citation, not re-researched.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
```

Add immediately after it:

```ts
  defineParameter({
    id: "motor_sizing.direct_drive_conveyor.inertia_ratio_recommended_maximum",
    displayName: "Recommended maximum inertia ratio",
    symbol: "R_Jmax,rec",
    definition:
      "Suggested maximum load-to-rotor inertia ratio, editable. Founder-directed default (10:1, general industrial automation), not a manufacturer-sourced value -- use the motor manufacturer's own published limit when available. Typical servo-industry ranges: ~5:1 for high-precision/fast-response applications, ~10:1 for general automation, ~20:1 for moderate-performance applications, and up to 30:1 or higher where a specific manufacturer permits it. A sibling of inertia_ratio_maximum (required, no default, unedited by this release), not a replacement for it -- a new module version may choose to use this parameter instead.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "constant", value: makeQuantity(10, "ratio") },
  }),
```

- [ ] **Step 4: Add the rack-and-pinion recommended-maximum parameter**

Find (inside the `motorSizingRackPinion` array):

```ts
    id: "motor_sizing.rack_pinion.inertia_ratio_maximum",
    displayName: "Maximum allowable load-to-rotor inertia ratio",
    symbol: "R_Jmax",
    definition:
      "Maximum acceptable inertia_ratio, engineer-supplied with no built-in default -- the same required-input-no-default precedent every other motor_sizing.*.inertia_ratio_maximum already established, reused by citation, not re-researched.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
```

Add immediately after it:

```ts
  defineParameter({
    id: "motor_sizing.rack_pinion.inertia_ratio_recommended_maximum",
    displayName: "Recommended maximum inertia ratio",
    symbol: "R_Jmax,rec",
    definition:
      "Suggested maximum load-to-rotor inertia ratio, editable. Founder-directed default (10:1, general industrial automation), not a manufacturer-sourced value -- use the motor manufacturer's own published limit when available. Typical servo-industry ranges: ~5:1 for high-precision/fast-response applications, ~10:1 for general automation, ~20:1 for moderate-performance applications, and up to 30:1 or higher where a specific manufacturer permits it. A sibling of inertia_ratio_maximum (required, no default, unedited by this release), not a replacement for it -- a new module version may choose to use this parameter instead.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "constant", value: makeQuantity(10, "ratio") },
  }),
```

- [ ] **Step 5: Add the belt-pulley recommended-maximum parameter**

Find (inside the `motorSizingBeltPulley` array):

```ts
    id: "motor_sizing.belt_pulley.inertia_ratio_maximum",
    displayName: "Maximum allowable load-to-rotor inertia ratio",
    symbol: "R_Jmax",
    definition:
      "Maximum acceptable inertia_ratio, engineer-supplied with no built-in default -- the same required-input-no-default precedent every other motor_sizing.*.inertia_ratio_maximum already established. AutomationDirect's own belt-drive example uses 10 ('It is best to keep the load to motor inertia ratio at or below 10'), one datapoint among the wide sourced disagreement drive-train/stage-1-spec.md already records.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
```

Add immediately after it. This one's definition text is deliberately worded slightly differently from the other four: this mechanism's own existing `inertia_ratio_maximum` definition already cites a real, non-invented data point (AutomationDirect's own belt-drive worked example uses 10) that happens to corroborate the chosen default — a genuinely stronger disclosure than pure founder judgment for this one mechanism specifically, and worth stating plainly rather than flattening to the same generic wording the other four use:

```ts
  defineParameter({
    id: "motor_sizing.belt_pulley.inertia_ratio_recommended_maximum",
    displayName: "Recommended maximum inertia ratio",
    symbol: "R_Jmax,rec",
    definition:
      "Suggested maximum load-to-rotor inertia ratio, editable. Default of 10:1 -- founder-directed, and also the one value AutomationDirect's own belt-drive worked example uses ('It is best to keep the load to motor inertia ratio at or below 10', already cited by motor_sizing.belt_pulley.inertia_ratio_maximum's own definition) -- one corroborating datapoint, not a full sourced justification for every application. Use the motor manufacturer's own published limit when available. Typical servo-industry ranges: ~5:1 for high-precision/fast-response applications, ~10:1 for general automation, ~20:1 for moderate-performance applications, and up to 30:1 or higher where a specific manufacturer permits it. A sibling of inertia_ratio_maximum (required, no default, unedited by this release), not a replacement for it -- a new module version may choose to use this parameter instead.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "constant", value: makeQuantity(10, "ratio") },
  }),
```

- [ ] **Step 6: Add the index-table recommended-maximum parameter**

Find (inside the `motorSizingIndexTable` array):

```ts
    id: "motor_sizing.index_table.inertia_ratio_maximum",
    displayName: "Maximum allowable load-to-rotor inertia ratio",
    symbol: "R_Jmax",
    definition:
      "Maximum acceptable inertia_ratio, engineer-supplied with no built-in default -- the same required-input-no-default precedent every other motor_sizing.*.inertia_ratio_maximum already established.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "required" },
  }),
```

Add immediately after it:

```ts
  defineParameter({
    id: "motor_sizing.index_table.inertia_ratio_recommended_maximum",
    displayName: "Recommended maximum inertia ratio",
    symbol: "R_Jmax,rec",
    definition:
      "Suggested maximum load-to-rotor inertia ratio, editable. Founder-directed default (10:1, general industrial automation), not a manufacturer-sourced value -- use the motor manufacturer's own published limit when available. Typical servo-industry ranges: ~5:1 for high-precision/fast-response applications, ~10:1 for general automation, ~20:1 for moderate-performance applications, and up to 30:1 or higher where a specific manufacturer permits it. This mechanism is rotary, not linear, but the same inertia-ratio concept and numeric guidance applies unchanged. A sibling of inertia_ratio_maximum (required, no default, unedited by this release), not a replacement for it -- a new module version may choose to use this parameter instead.",
    valueType: "quantity",
    canonicalUnit: "ratio",
    displayUnits: ["ratio"],
    range: { min: 0, unit: "ratio" },
    defaultPolicy: { kind: "constant", value: makeQuantity(10, "ratio") },
  }),
```

- [ ] **Step 7: Add `1.14.0` to the supported-versions list**

In `lib/engine/parameters/registered.ts`, find:

```ts
export const PARAMETER_REGISTRY_SUPPORTED_VERSIONS = [
  "1.0.0",
  "1.1.0",
  "1.2.0",
  "1.3.0",
  "1.4.0",
  "1.5.0",
  "1.6.0",
  "1.7.0",
  "1.8.0",
  "1.9.0",
  "1.10.0",
  "1.11.0",
  "1.12.0",
  "1.13.0",
] as const;
```

Replace it with:

```ts
export const PARAMETER_REGISTRY_SUPPORTED_VERSIONS = [
  "1.0.0",
  "1.1.0",
  "1.2.0",
  "1.3.0",
  "1.4.0",
  "1.5.0",
  "1.6.0",
  "1.7.0",
  "1.8.0",
  "1.9.0",
  "1.10.0",
  "1.11.0",
  "1.12.0",
  "1.13.0",
  "1.14.0",
] as const;
```

This follows the exact same pattern every prior registry bump used: the version every currently-released module manifest pins (here, `1.14.0` — `belt-pulley-drive-motor-sizing@0.2.0`'s own pinned version) must be added explicitly before it stops being "the current version," or that module's manifest would be stranded the moment `1.15.0` becomes current.

- [ ] **Step 8: Run the registry test suite to see the pinned hash fail**

Run: `npx vitest run lib/engine/parameters/`
Expected: most tests PASS, but `lib/engine/parameters/hash.test.ts`'s `"matches the pinned content fixture"` test FAILS, printing the newly-computed actual hash (a 16-character hex string) against the stale pinned `EXPECTED_REGISTRY_HASH = "dbc8bd7f3064d351"`. Copy the printed **actual** value from the test failure output — you will use it in the next step. Do not guess or compute it by hand; it must come from the test's own printed output.

- [ ] **Step 9: Update the pinned hash fixture**

In `lib/engine/parameters/hash.test.ts`, find:

```ts
// Pinned content fixture: any change to a released parameter changes this hash.
// If this fails after an intentional, reviewed registry change, update the value
// AND bump PARAMETER_REGISTRY_VERSION.
const EXPECTED_REGISTRY_HASH = "dbc8bd7f3064d351";
```

Replace `"dbc8bd7f3064d351"` with the actual hash value printed by Step 8's test failure (`PARAMETER_REGISTRY_VERSION` was already bumped to `1.15.0` in Step 1, so the "AND bump" instruction in this comment is already satisfied).

- [ ] **Step 10: Run the full registry test suite to verify it passes**

Run: `npx vitest run lib/engine/parameters/`
Expected: all tests PASS, including `hash.test.ts`'s pinned-fixture test with the new hash.

- [ ] **Step 11: Typecheck and lint**

Run: `npm run typecheck`
Expected: `0 errors`.

Run: `npx eslint lib/engine/parameters/definitions.ts lib/engine/parameters/registered.ts lib/engine/parameters/hash.test.ts`
Expected: no output (0 problems).

- [ ] **Step 12: Run the full non-DB test suite as a regression check**

Run: `npx vitest run`
Expected: every previously-passing non-DB test still passes (this is an additive registry change; no existing module or test should be affected). Compare the total pass count against the pre-change baseline you noted before Task 1 — it should be exactly 11 higher: 3 new conformance tests from Task 2, 6 new `resolveFieldDisabled` tests from Task 3, and 2 new rendering tests from Task 4. This task (Task 5) adds no new test cases of its own — Steps 2-6 only add parameter *data* to existing arrays, and Steps 8-10 update an existing pinned-hash *value*, not a new test.

- [ ] **Step 13: Commit**

```bash
git add lib/engine/parameters/definitions.ts lib/engine/parameters/registered.ts lib/engine/parameters/hash.test.ts
git commit -m "$(cat <<'EOF'
feat: release parameter registry v1.15.0 (recommended inertia-ratio defaults)

Adds one new *.inertia_ratio_recommended_maximum parameter per Motor
Sizing mechanism (ball_screw, direct_drive_conveyor, rack_pinion,
belt_pulley, index_table), each with a founder-directed default of 10,
disclosed honestly in its own definition text as not
manufacturer-sourced. Every existing *.inertia_ratio_maximum parameter
is untouched, per this project's parameter-immutability invariant.
EOF
)"
```

---

### Task 6: Documentation sync

**Files:**
- Modify: `context/ui-context.md` (add a new paragraph to the existing "Generic Module Workspace" section)
- Modify: `lib/engine/parameters/README.md` (add a short v1.15 note, following the file's own existing per-version-bump convention)

- [ ] **Step 1: Document `disabledWhen` in `ui-context.md`**

Open `context/ui-context.md` and find its "Generic Module Workspace" section (search for that heading). Add a new paragraph at the end of that section:

```markdown
A `ModuleUiField` may declare `disabledWhen: { portKey, equals }`
(`lib/engine/module-sdk/types.ts`) to disable itself whenever another
enum-valued input port on the same module currently resolves to a
specific value — e.g. a `motion_mode` toggle that selects which of two
input pairs actually applies. Resolution happens once, server-side, in
`loadModuleWorkspaceView` (a pure `resolveFieldDisabled` helper reads the
driving port's currently-*saved* resolved value); the renderer then shows
the disabled field's label, help text, and any previously-saved value,
but blocks its control(s), Save button, and link-suggestion panel via the
native HTML `disabled` attribute. There is no client-side reactivity: the
existing per-field form already causes a full page reload from the
database after every save, which is when a driving field's change
actually takes effect for the fields it disables. Before the driving port
has ever been set, no dependent field is disabled — showing everything
normally is safer than guessing which mode applies.
```

- [ ] **Step 2: Document registry v1.15.0 in `lib/engine/parameters/README.md`**

Open `lib/engine/parameters/README.md` and find its most recent per-version-bump note (search for "v1.14" or the highest version number mentioned). Add a new paragraph immediately after it:

```markdown
Registry v1.15 adds one new parameter per Motor Sizing mechanism —
`motor_sizing.<mechanism>.inertia_ratio_recommended_maximum` (ball_screw,
direct_drive_conveyor, rack_pinion, belt_pulley, index_table) — a sibling
of each mechanism's own existing `*.inertia_ratio_maximum` (required, no
default, unedited by this release). Each new parameter carries a
founder-directed default of 10, disclosed in its own definition text as
founder judgment rather than a manufacturer-sourced figure — see
`docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md`
"Inertia-ratio recommended default" for the full account.
```

- [ ] **Step 3: Verify prose renders sensibly**

Read back both edited sections in full to confirm the new paragraph reads naturally next to the surrounding text (no orphaned heading, no duplicated version note). No automated test covers documentation prose.

- [ ] **Step 4: Commit**

```bash
git add context/ui-context.md lib/engine/parameters/README.md
git commit -m "$(cat <<'EOF'
docs: record the disabledWhen UI capability and registry v1.15.0

Documents both shared-infrastructure additions from this session so
the next module author (or the next session) knows disabledWhen exists
and why the new recommended-maximum inertia-ratio parameters carry an
explicitly disclosed, non-sourced default.
EOF
)"
```

---

### Task 7: Final verification and progress-tracker update

**Files:**
- Modify: `context/progress-tracker.md` (edit in place — do not append a dated narrative entry, per that file's own header rule)

- [ ] **Step 1: Full verification**

Run: `npm run lint`
Expected: 0 warnings/errors on every file this plan touched. (A bare repo-root `npm run lint` may still flag the already-documented, pre-existing stale `.worktrees/unit-4-1-release/.next/dev/types/` artifact — confirmed unrelated in prior sessions; if seen, verify by linting only the files this plan changed directly.)

Run: `npm run typecheck`
Expected: 0 errors.

Run: `npx vitest run --testTimeout=30000`
Expected: all non-DB tests pass (DB-gated tests report as skipped without `DATABASE_URL`/`NODE_EXTRA_CA_CERTS` set — that's expected, not a failure).

Run: `npm run build`
Expected: builds successfully, no new routes or errors.

- [ ] **Step 2: Update `context/progress-tracker.md`**

Add a new entry to the "Active work" section (find the most recent entry, e.g. the belt-pulley 0.2.0 paragraph, and add this as the next paragraph after it — do not create a new top-level section):

```markdown
**Motor Sizing shared infrastructure shipped 2026-08-18**, per
`docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md`
and `docs/superpowers/plans/2026-08-18-motor-sizing-shared-infrastructure.md`
-- the prerequisite for a founder-directed consistency pass across all five
Motor Sizing Tool modules (gravity, motion-mode UI, inertia-ratio
defaults). Two additive pieces, neither touching any released module:
`disabledWhen` (`lib/engine/module-sdk` -- lets a UI field disable itself
when a named enum port matches a value, resolved server-side with no
client reactivity needed) and parameter registry `1.15.0` (five new
`*.inertia_ratio_recommended_maximum` parameters, one per mechanism, each
with a disclosed founder-directed default of 10 -- every existing
`*.inertia_ratio_maximum` stays required-no-default and untouched). Five
follow-on plans -- one per Motor Sizing module version bump -- consume
this: `ball-screw-motor-sizing`, `direct-drive-conveyor-motor-sizing`,
`rack-pinion-motor-sizing`, and `index-table-motor-sizing` each to
`0.2.0`, and `belt-pulley-drive-motor-sizing` (already at `0.2.0`) to
`0.3.0` -- not yet started.
```

- [ ] **Step 3: Commit**

```bash
git add context/progress-tracker.md
git commit -m "$(cat <<'EOF'
docs: record Motor Sizing shared infrastructure in the progress tracker
EOF
)"
```

---

## What comes after this plan

Five more plans, one per Motor Sizing module, each consuming this plan's `disabledWhen` capability (belt-pulley only) and registry `1.15.0` (all five):

1. `ball-screw-motor-sizing` 0.1.0 → 0.2.0
2. `direct-drive-conveyor-motor-sizing` 0.1.0 → 0.2.0
3. `rack-pinion-motor-sizing` 0.1.0 → 0.2.0
4. `index-table-motor-sizing` 0.1.0 → 0.2.0
5. `belt-pulley-drive-motor-sizing` 0.2.0 → 0.3.0

Each removes `gravity` as an editable input (hardcoding `9.80665 m/s^2` in its own `math.ts` — index-table has no `gravity` port, so it skips this), switches its `inertia_ratio_maximum` port to the new `*.inertia_ratio_recommended_maximum` parameter this plan released, and changes its inertia-ratio check's exceeded-case status from `fail` to `warning`. Belt-pulley additionally wires `disabledWhen` into its own `motion_mode`/`target_velocity`/`travel_distance`/`constant_velocity_time`/`cycle_time` fields. These are written as separate plans, one at a time, after this plan is merged and verified — per the user's own explicit sequencing choice, and per this codebase's own established practice of one plan per module release.
