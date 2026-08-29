# Module Input Workspace: Preview Run, Batched Save, Link-Suggestion Menu — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic module workspace's one-`<form>`-per-field Save
model with a single form covering every field, a `Run` button that previews a
computation without persisting anything, a `Save` button that persists every
field plus a real `CalculationRun` in one action, and a collapsed
meatball-menu for link suggestions (replacing the always-visible "Suggested
sources" box). Full context: `docs/superpowers/specs/
2026-08-27-module-workspace-save-run-redesign-design.md`.

**Architecture:** One new `lib/application/calculations/` service
(`previewModuleComputation`) duplicates `executeModuleInstance`'s input-
resolution loop but calls `executeModule` directly instead of opening a
transaction — the one new "compute without persisting" capability. Two new
thin Server Actions (`saveModuleInputsAction`, `previewModuleComputationAction`)
replace `setModuleInputValueAction` and `runModuleInstanceAction`, sharing a
new namespaced-FormData parser (`parse-submitted-field.ts`) extracted from
`setModuleInputValueAction`'s old per-kind branches. `ModuleInputWorkspace`
becomes one `<form>` with a sticky header holding both submit buttons, plus a
small new completeness-tracking state for Run's disabled/tooltip logic.
Because `ModuleInputWorkspace` and `ModuleResultPanel` are rendered as
siblings by `WorkspaceShell` (not nested), the live preview computation is
lifted from the input form up to `WorkspaceShell` via a callback prop and
threaded back down into the result panel as a new `preview` prop — this
wiring is a necessary consequence of the existing component tree, not called
out by file name in the design doc, but required to satisfy it.

**Tech Stack:** Next.js 16 Server Actions, React 19 `useActionState`, Radix
`DropdownMenu` (`components/ui/dropdown-menu.tsx`, already in the repo),
Vitest + Testing Library, Prisma (live-DB tests via `tests/live-database.ts`).

---

## Task 1: Shared namespaced-field parser (`parse-submitted-field.ts`)

**Files:**
- Create: `app/(workspace)/workspace/parse-submitted-field.ts`
- Create: `app/(workspace)/workspace/parse-submitted-field.test.ts`

This extracts `setModuleInputValueAction`'s existing per-kind parsing
branches (quantity/vector_quantity/enum/boolean) into a pure function keyed
by a namespaced port key (`fields.<portKey>.*`), so both new Server Actions
in Task 5 can share it instead of duplicating the branches. Error message
text is preserved byte-for-byte from the current `setModuleInputValueAction`
branches (design doc: "parsed the same way `setModuleInputValueAction`
parses it today").

- [ ] **Step 1: Write `parse-submitted-field.ts`**

```ts
// app/(workspace)/workspace/parse-submitted-field.ts
//
// Namespaced-field FormData parsing for the module workspace's single-form
// Save/Run model (module workspace save/run redesign, 2026-08-27). Extracted
// from `setModuleInputValueAction`'s former per-kind branches (removed in the
// same change) so `saveModuleInputsAction` and `previewModuleComputationAction`
// share one parser instead of duplicating validation — same
// never-trust-the-client-alone re-derivation of canonical unit/enum
// options/frame from the released registry.

import {
  SERIALIZATION_FORMAT_VERSION,
  getParameter,
  type EngineeringValue,
  type LoadCaseCategory,
} from "@/lib/engine";
import { parseSubmittedQuantity } from "./parse-submitted-quantity";
import { parseSubmittedVector } from "./parse-submitted-vector";

const LOAD_CASE_CATEGORIES = [
  "normal",
  "peak",
  "holding",
  "emergency_stop",
] as const;

/** Parses a load-case field, ignoring anything outside the declared set. Shared with `actions.ts` (`confirmSuggestedLinkAction`, `createLoadCaseAction`). */
export function parseLoadCase(raw: string): LoadCaseCategory | undefined {
  return (LOAD_CASE_CATEGORIES as readonly string[]).includes(raw)
    ? (raw as LoadCaseCategory)
    : undefined;
}

export type SubmittedFieldParseResult =
  | {
      readonly ok: true;
      readonly parameterId: string;
      readonly loadCase: LoadCaseCategory | undefined;
      readonly value: EngineeringValue;
    }
  | { readonly ok: false; readonly message: string };

function fieldValue(formData: FormData, portKey: string, name: string): string {
  const value = formData.get(`fields.${portKey}.${name}`);
  return typeof value === "string" ? value : "";
}

/**
 * Parses one namespaced field group (`fields.<portKey>.*`) into a validated
 * `EngineeringValue` in the parameter's canonical unit. `portKey` identifies
 * which group to read; `fields.<portKey>.parameterId` names the canonical
 * parameter, re-derived here (never trusted from the client alone) exactly
 * as `setModuleInputValueAction` did before this extraction.
 */
export function parseSubmittedField(
  formData: FormData,
  portKey: string,
): SubmittedFieldParseResult {
  const parameterId = fieldValue(formData, portKey, "parameterId");
  const definition = getParameter(parameterId);
  if (definition === undefined) {
    return { ok: false, message: `Unknown parameter "${parameterId}".` };
  }

  const valueKind = fieldValue(formData, portKey, "valueKind");
  let value: EngineeringValue;
  if (valueKind === "quantity") {
    if (definition.canonicalUnit === undefined) {
      return { ok: false, message: "This parameter has no canonical unit." };
    }
    const parsed = parseSubmittedQuantity(
      fieldValue(formData, portKey, "magnitude"),
      fieldValue(formData, portKey, "unit"),
      definition.canonicalUnit,
    );
    if (!parsed.ok) {
      return { ok: false, message: parsed.message };
    }
    value = parsed.value;
  } else if (valueKind === "vector_quantity") {
    if (definition.frame !== "axis") {
      return {
        ok: false,
        message: "This parameter does not use the axis vector frame.",
      };
    }
    if (definition.canonicalUnit === undefined) {
      return { ok: false, message: "This parameter has no canonical unit." };
    }
    const parsed = parseSubmittedVector(
      [
        fieldValue(formData, portKey, "component-0"),
        fieldValue(formData, portKey, "component-1"),
        fieldValue(formData, portKey, "component-2"),
      ],
      fieldValue(formData, portKey, "unit"),
      definition.canonicalUnit,
      "axis",
    );
    if (!parsed.ok) {
      return { ok: false, message: parsed.message };
    }
    value = parsed.value;
  } else if (valueKind === "enum") {
    if (definition.enumId === undefined) {
      return { ok: false, message: "This parameter is not an enumeration." };
    }
    const option = fieldValue(formData, portKey, "option");
    if (!(definition.enumOptions ?? []).includes(option)) {
      return { ok: false, message: "Select a valid option." };
    }
    value = {
      v: SERIALIZATION_FORMAT_VERSION,
      kind: "enum",
      enumId: definition.enumId,
      value: option,
    };
  } else if (valueKind === "boolean") {
    if (definition.valueType !== "boolean") {
      return { ok: false, message: "This parameter is not a boolean." };
    }
    value = {
      v: SERIALIZATION_FORMAT_VERSION,
      kind: "boolean",
      value: fieldValue(formData, portKey, "checked") === "true",
    };
  } else {
    return { ok: false, message: `Unsupported value kind "${valueKind}".` };
  }

  return {
    ok: true,
    parameterId,
    loadCase: parseLoadCase(fieldValue(formData, portKey, "loadCase")),
    value,
  };
}

/**
 * Every port key with a submitted `fields.<portKey>.valueKind` group. The
 * client only ever renders that group for a manual/workflow/default,
 * non-disabled, editable field (`ModuleInputWorkspace`'s `FieldControl`
 * branch) — a `linked`, `disabled`, or `unsupported` port never has one, so
 * this list doubles as "which ports the client is allowed to edit" without a
 * second server-side derivation.
 */
export function submittedPortKeys(formData: FormData): readonly string[] {
  const keys = new Set<string>();
  for (const key of formData.keys()) {
    const match = /^fields\.(.+)\.valueKind$/.exec(key);
    if (match) {
      keys.add(match[1]);
    }
  }
  return [...keys];
}
```

- [ ] **Step 2: Write `parse-submitted-field.test.ts`**

```ts
// app/(workspace)/workspace/parse-submitted-field.test.ts
import { describe, expect, it } from "vitest";
import {
  parseLoadCase,
  parseSubmittedField,
  submittedPortKeys,
} from "./parse-submitted-field";
import { SERIALIZATION_FORMAT_VERSION } from "@/lib/engine";

function buildFormData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

describe("submittedPortKeys", () => {
  it("collects every distinct portKey with a submitted valueKind group", () => {
    const formData = buildFormData({
      "fields.payload_mass.valueKind": "quantity",
      "fields.payload_mass.magnitude": "12",
      "fields.orientation.valueKind": "enum",
      "fields.orientation.option": "vertical",
      configurationId: "cfg-1",
      moduleInstanceId: "mod-1",
    });
    expect(submittedPortKeys(formData).sort()).toEqual([
      "orientation",
      "payload_mass",
    ]);
  });

  it("returns an empty list when no field group was submitted", () => {
    expect(submittedPortKeys(buildFormData({ moduleInstanceId: "mod-1" }))).toEqual(
      [],
    );
  });
});

describe("parseSubmittedField", () => {
  it("parses a quantity field into its canonical value", () => {
    const result = parseSubmittedField(
      buildFormData({
        "fields.payload_mass.parameterId": "motion.axis.payload_mass",
        "fields.payload_mass.valueKind": "quantity",
        "fields.payload_mass.magnitude": "12",
        "fields.payload_mass.unit": "kg",
      }),
      "payload_mass",
    );
    expect(result).toEqual({
      ok: true,
      parameterId: "motion.axis.payload_mass",
      loadCase: undefined,
      value: { v: SERIALIZATION_FORMAT_VERSION, kind: "quantity", value: 12, unit: "kg", displayUnit: "kg" },
    });
  });

  it("rejects an unparseable magnitude without a portKey-unrelated error", () => {
    const result = parseSubmittedField(
      buildFormData({
        "fields.payload_mass.parameterId": "motion.axis.payload_mass",
        "fields.payload_mass.valueKind": "quantity",
        "fields.payload_mass.magnitude": "",
        "fields.payload_mass.unit": "kg",
      }),
      "payload_mass",
    );
    expect(result).toEqual({ ok: false, message: "Enter a numeric value." });
  });

  it("rejects a vector_quantity submission for a parameter whose real registry frame is not axis", () => {
    const result = parseSubmittedField(
      buildFormData({
        "fields.payload_mass.parameterId": "motion.axis.payload_mass",
        "fields.payload_mass.valueKind": "vector_quantity",
        "fields.payload_mass.component-0": "1",
        "fields.payload_mass.component-1": "2",
        "fields.payload_mass.component-2": "3",
        "fields.payload_mass.unit": "kg",
      }),
      "payload_mass",
    );
    expect(result).toEqual({
      ok: false,
      message: "This parameter does not use the axis vector frame.",
    });
  });

  it("parses a valid axis-frame vector_quantity submission", () => {
    const result = parseSubmittedField(
      buildFormData({
        "fields.cg_offset.parameterId": "motion.axis.center_of_mass_offset",
        "fields.cg_offset.valueKind": "vector_quantity",
        "fields.cg_offset.component-0": "1",
        "fields.cg_offset.component-1": "2",
        "fields.cg_offset.component-2": "3",
        "fields.cg_offset.unit": "m",
      }),
      "cg_offset",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      v: SERIALIZATION_FORMAT_VERSION,
      kind: "vector_quantity",
      components: [1, 2, 3],
      unit: "m",
      frame: "axis",
      displayUnit: "m",
    });
  });

  it("returns an error for an unknown parameter", () => {
    const result = parseSubmittedField(
      buildFormData({
        "fields.x.parameterId": "does.not.exist",
        "fields.x.valueKind": "quantity",
      }),
      "x",
    );
    expect(result).toEqual({
      ok: false,
      message: 'Unknown parameter "does.not.exist".',
    });
  });
});

describe("parseLoadCase", () => {
  it("accepts a declared category", () => {
    expect(parseLoadCase("peak")).toBe("peak");
  });

  it("ignores anything outside the declared set", () => {
    expect(parseLoadCase("bogus")).toBeUndefined();
    expect(parseLoadCase("")).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run the new test file**

Run: `npx vitest run "app/(workspace)/workspace/parse-submitted-field.test.ts"`
Expected: all tests pass (this is a pure-function file — no live DB needed).

- [ ] **Step 4: Commit**

```bash
git add "app/(workspace)/workspace/parse-submitted-field.ts" "app/(workspace)/workspace/parse-submitted-field.test.ts"
git commit -m "feat: extract shared namespaced-field parser for module workspace save/run"
```

---

## Task 2: `ModulePreviewActionState`

**Files:**
- Modify: `app/(workspace)/workspace/action-state.ts`

- [ ] **Step 1: Add the preview action's state shape**

```ts
// app/(workspace)/workspace/action-state.ts
// Shared `useActionState` result shape for the workspace's mutation forms
// (Unit 3.2). A plain module, not "use server" — a "use server" file may
// only export async functions, so this type/constant live here and are
// imported by both actions.ts and the dialog components.

import type { ModulePreviewView } from "@/lib/application";

export interface ActionState {
  readonly status: "idle" | "error" | "success";
  readonly message?: string;
}

export const IDLE_ACTION_STATE: ActionState = { status: "idle" };

/**
 * `previewModuleComputationAction`'s own state shape (module workspace
 * save/run redesign, 2026-08-27) — success carries the fresh, unpersisted
 * computation itself, not just a status, so `ModuleInputWorkspace` can lift
 * it to the sibling `ModuleResultPanel` (via `WorkspaceShell`) without a
 * second round trip.
 */
export type ModulePreviewActionState =
  | { readonly status: "idle" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "success"; readonly preview: ModulePreviewView };

export const IDLE_MODULE_PREVIEW_ACTION_STATE: ModulePreviewActionState = {
  status: "idle",
};
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: fails only on `ModulePreviewView` not existing yet (Task 3 creates
it) — confirms the import path is otherwise correct. If it fails for any
other reason, stop and investigate before continuing.

- [ ] **Step 3: Commit**

```bash
git add "app/(workspace)/workspace/action-state.ts"
git commit -m "feat: add ModulePreviewActionState for the module workspace preview action"
```

---

## Task 3: `previewModuleComputation` application service

**Files:**
- Create: `lib/application/calculations/preview-module-computation.ts`
- Modify: `lib/application/index.ts`

This is the one genuinely new use case (design doc): compute a module
instance's result from its currently-resolved inputs, with client overrides
applied on top, without persisting anything. Mirrors
`execute-module-instance.ts`'s input-resolution loop (manual/workflow value
as authored, linked value pulled via `resolveModuleOutputValue`, "default"
left unresolved for the SDK) — duplicated rather than shared, since that
file is an explicit Non-goal ("No change to ... `executeModuleInstance` ...
themselves — all reused unchanged") and its loop is tightly coupled to its
own transaction.

- [ ] **Step 1: Write `preview-module-computation.ts`**

```ts
// lib/application/calculations/preview-module-computation.ts
//
// The `previewModuleComputation` use case (module workspace save/run
// redesign, 2026-08-27, docs/superpowers/specs/
// 2026-08-27-module-workspace-save-run-redesign-design.md). Computes a
// module instance's result from its currently-resolved inputs — with the
// caller's submitted field overrides applied on top — WITHOUT persisting
// anything: no `ParameterValue`, no `CalculationRun`, no audit event. Safe
// to call repeatedly while the caller tries different combinations before
// committing to `saveModuleInputsAction`.
//
// Mirrors `executeModuleInstance`'s (Unit 2.4) input-resolution loop
// exactly: a manual/workflow value resolves as authored; a linked value is
// pulled from the source module's latest run via `resolveModuleOutputValue`
// (refusing with `stale_upstream` if that run is stale, identical wording to
// `executeModuleInstance`'s own message); "default" is left unresolved for
// the SDK to fill its constant default or report a clear missing-required-
// input error. The loop is duplicated here rather than shared with
// `execute-module-instance.ts`, which stays unchanged (Non-goal) and runs
// its own version inside a `RepeatableRead` transaction this use case
// deliberately never opens.
//
// The only real difference from executeModuleInstance's loop: for any port
// whose resolved source is NOT "linked", a value present in `overrides`
// replaces the resolved one before `executeModule` ever sees it. A linked
// port's override (if the client somehow sent one) is always ignored — the
// honest client never renders a control for a linked field in the first
// place, but resolution order stays authoritative here too, matching every
// other "never trust the client alone" boundary in this codebase (e.g.
// `setModuleInputValueAction`'s canonical-unit/enum/frame re-derivation).

import "server-only";
import {
  ModuleSdkError,
  executeModule,
  type CalculationTrace,
  type CheckResult,
  type EngineeringValue,
  type ModuleComputation,
  type ValidityResult,
  type Warning,
} from "@/lib/engine";
import { getModulePackage } from "@/lib/modules";
import {
  loadModuleInstanceForOwner,
  prisma,
  resolveModuleInputs,
  type ModuleInstanceId,
  type UserId,
} from "@/lib/db";
import {
  collectClauseReferences,
  describePortValues,
  resolveSourceReferences,
  type PortValueView,
  type SourceReferenceView,
} from "./run-view-helpers";
import { resolveModuleOutputValue } from "./resolve-module-output-value";

/** Input to {@link previewModuleComputation}. */
export interface PreviewModuleComputationInput {
  readonly moduleInstanceId: ModuleInstanceId;
  readonly ownerId: UserId;
  /** Submitted client values, keyed by port key — applied only to a port whose resolved source is not "linked". */
  readonly overrides: Readonly<Record<string, EngineeringValue>>;
}

/** Machine-readable classification of a `previewModuleComputation` failure — mirrors `ExecuteModuleInstanceErrorCode`. */
export type PreviewModuleComputationErrorCode =
  | "unauthorized"
  | "module_not_found"
  | "invalid_input"
  | "stale_upstream";

/** A failed {@link previewModuleComputation} outcome. */
export interface PreviewModuleComputationError {
  readonly code: PreviewModuleComputationErrorCode;
  readonly message: string;
}

/**
 * The unpersisted computation, described for display — the same field
 * shapes `ModuleResultView`'s own described fields use (`RunOutputView` is a
 * type alias of `PortValueView`), so `ModuleResultPanel` can render either
 * with one set of sub-renderers.
 */
export interface ModulePreviewView {
  readonly outputs: readonly PortValueView[];
  readonly checks: readonly CheckResult[];
  readonly warnings: readonly Warning[];
  readonly validity: readonly ValidityResult[];
  readonly trace: CalculationTrace | null;
  readonly sources: readonly SourceReferenceView[];
}

/** Result of {@link previewModuleComputation}. */
export type PreviewModuleComputationResult =
  | { readonly ok: true; readonly preview: ModulePreviewView }
  | { readonly ok: false; readonly error: PreviewModuleComputationError };

export async function previewModuleComputation(
  input: PreviewModuleComputationInput,
): Promise<PreviewModuleComputationResult> {
  const context = await loadModuleInstanceForOwner(
    input.moduleInstanceId,
    input.ownerId,
  );
  if (context === null) {
    return {
      ok: false,
      error: {
        code: "unauthorized",
        message: "Module instance not found or not owned by this user.",
      },
    };
  }
  const { moduleInstance } = context;

  const pkg = getModulePackage(
    moduleInstance.modulePackageId,
    moduleInstance.moduleVersion,
  );
  if (pkg === undefined) {
    return {
      ok: false,
      error: {
        code: "module_not_found",
        message: `Module package "${moduleInstance.modulePackageId}@${moduleInstance.moduleVersion}" is not registered.`,
      },
    };
  }

  const resolvedPorts = await resolveModuleInputs(
    input.moduleInstanceId,
    input.ownerId,
    pkg.ports.inputs.map((port) => ({
      parameterId: port.parameterId,
      ...(port.loadCase !== undefined ? { loadCase: port.loadCase } : {}),
    })),
  );
  if (resolvedPorts === null) {
    return {
      ok: false,
      error: {
        code: "unauthorized",
        message: "Module instance not found or not owned by this user.",
      },
    };
  }

  const values: Record<string, EngineeringValue> = {};
  for (let i = 0; i < pkg.ports.inputs.length; i++) {
    const port = pkg.ports.inputs[i];
    const resolved = resolvedPorts[i].resolved;
    const override = input.overrides[port.key];

    if (override !== undefined && resolved.source !== "linked") {
      values[port.key] = override;
      continue;
    }

    let value: EngineeringValue | undefined;
    if (resolved.source === "manual" || resolved.source === "workflow") {
      value = resolved.value;
    } else if (resolved.source === "linked") {
      if (resolved.value !== null) {
        value = resolved.value;
      } else if (resolved.link.sourceModuleInstanceId !== null) {
        const upstream = await resolveModuleOutputValue(
          resolved.link.sourceModuleInstanceId,
          resolved.link.sourceParameterId,
          resolved.link.sourceLoadCase,
          input.ownerId,
          prisma,
        );
        if (upstream.kind === "stale") {
          return {
            ok: false,
            error: {
              code: "stale_upstream",
              message: `Input "${port.key}" is linked to a module output whose latest calculation run is stale${upstream.staleReason === null ? "" : ` (${upstream.staleReason})`}. Re-run the upstream module before executing this one.`,
            },
          };
        }
        if (upstream.kind === "value") {
          value = upstream.value;
        }
      }
    }
    // "default": leave undefined -- the SDK fills the constant default (or
    // reports a clear missing-required-input error) exactly as it would for
    // any other caller.

    if (value !== undefined) {
      values[port.key] = value;
    }
  }

  const rawInput: unknown = { values };

  let computation: ModuleComputation;
  try {
    computation = executeModule(pkg, rawInput);
  } catch (error) {
    if (error instanceof ModuleSdkError) {
      return {
        ok: false,
        error: { code: "invalid_input", message: error.message },
      };
    }
    throw error;
  }

  return {
    ok: true,
    preview: {
      outputs: describePortValues(computation.outputs, pkg.ports.outputs),
      checks: computation.checks,
      warnings: computation.warnings,
      validity: computation.validity,
      trace: computation.trace,
      sources: resolveSourceReferences(collectClauseReferences(computation)),
    },
  };
}
```

- [ ] **Step 2: Export it from the `lib/application` barrel**

In `lib/application/index.ts`, add this block immediately after the existing
`executeModuleInstance` export block (after line 12, before the
`loadModuleWorkspaceView` export block):

```ts
export {
  previewModuleComputation,
  type PreviewModuleComputationInput,
  type PreviewModuleComputationError,
  type PreviewModuleComputationErrorCode,
  type PreviewModuleComputationResult,
  type ModulePreviewView,
} from "./calculations/preview-module-computation";
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: passes (Task 2's `ModulePreviewView` import now resolves).

- [ ] **Step 4: Commit**

```bash
git add lib/application/calculations/preview-module-computation.ts lib/application/index.ts
git commit -m "feat: add previewModuleComputation application service"
```

---

## Task 4: Live-database tests for `previewModuleComputation`

**Files:**
- Create: `lib/application/calculations/preview-module-computation.test.ts`

Mirrors `execute-module-instance.test.ts`'s fixture style (scaffold helper,
`liveDatabaseAvailable` skip guard) minus persistence assertions, per the
design doc's Testing section — plus assertions that nothing was persisted,
since that is the whole point of this service.

- [ ] **Step 1: Write the test file**

```ts
// lib/application/calculations/preview-module-computation.test.ts
//
// Live-database tests for `previewModuleComputation` — mirrors
// execute-module-instance.test.ts's fixture style, minus persistence
// assertions, plus explicit "nothing was written" assertions (the entire
// point of this service). Skips when the generated Prisma client is absent
// (see context/progress-tracker.md).

import { randomUUID } from "node:crypto";
import { liveDatabaseAvailable } from "@/tests/live-database";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { makeQuantity } from "@/lib/engine";
import type {
  AssemblyId,
  MachineConfigurationId,
  ModuleInstanceId,
  UserId,
} from "../../db/repositories/types";

const RELAY_ID = "example-relay";
const RELAY_VERSION = "0.1.0";
const THRUST_FORCE = "motion.axis.thrust_force";

describe.skipIf(!liveDatabaseAvailable)(
  "previewModuleComputation (live database)",
  () => {
    let application: typeof import("./preview-module-computation");
    let projects: typeof import("../../db/repositories/project-repository");
    let graph: typeof import("../../db/repositories/graph-repository");
    let runs: typeof import("../../db/repositories/run-repository");
    let client: typeof import("../../db/client");
    let executeModuleInstance: typeof import("./execute-module-instance").executeModuleInstance;
    const createdUserIds: string[] = [];

    interface Scaffold {
      readonly ownerId: UserId;
      readonly configId: MachineConfigurationId;
      readonly assemblyId: AssemblyId;
      readonly moduleInstanceId: ModuleInstanceId;
    }

    async function scaffold(): Promise<Scaffold> {
      const user = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(user.id);
      const project = await projects.createProject({
        ownerId: user.id,
        name: "Axis",
        marketProfileKey: "US-General-Industrial-Machinery@1",
      });
      const config = await projects.createConfiguration({
        projectId: project.id,
        name: "Baseline",
      });
      const assembly = await projects.createAssembly({
        configurationId: config.id,
        name: "X axis",
      });
      const mi = await projects.createModuleInstance({
        assemblyId: assembly.id,
        configurationId: config.id,
        modulePackageId: RELAY_ID,
        moduleVersion: RELAY_VERSION,
        label: "Relay",
      });
      return {
        ownerId: user.id,
        configId: config.id,
        assemblyId: assembly.id,
        moduleInstanceId: mi.id,
      };
    }

    async function authorThrustForceIn(s: Scaffold, newtons: number): Promise<void> {
      await graph.createParameterValue({
        configurationId: s.configId,
        moduleInstanceId: s.moduleInstanceId,
        nodeKind: "module_input",
        parameterId: THRUST_FORCE,
        source: "manual",
        value: makeQuantity(newtons, "N"),
      });
    }

    beforeAll(async () => {
      application = await import("./preview-module-computation");
      projects = await import("../../db/repositories/project-repository");
      graph = await import("../../db/repositories/graph-repository");
      runs = await import("../../db/repositories/run-repository");
      client = await import("../../db/client");
      ({ executeModuleInstance } = await import("./execute-module-instance"));
    });

    afterEach(async () => {
      if (createdUserIds.length > 0) {
        await client.prisma.user.deleteMany({
          where: { id: { in: createdUserIds.splice(0) } },
        });
      }
    });

    it("computes a fresh result from currently-saved inputs without persisting anything", async () => {
      const s = await scaffold();
      await authorThrustForceIn(s, 100);

      const result = await application.previewModuleComputation({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: s.ownerId,
        overrides: {},
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.preview.outputs).toEqual([
        expect.objectContaining({
          portKey: "thrust_force_out",
          value: makeQuantity(100, "N"),
        }),
      ]);

      const persistedRuns = await client.prisma.calculationRun.findMany({
        where: { moduleInstanceId: s.moduleInstanceId },
      });
      expect(persistedRuns).toHaveLength(0);
      const reloaded = await client.prisma.moduleInstance.findUnique({
        where: { id: s.moduleInstanceId },
      });
      expect(reloaded?.lastCalculationRunId).toBeNull();
    });

    it("uses a submitted override instead of the saved value, still without persisting", async () => {
      const s = await scaffold();
      await authorThrustForceIn(s, 100);

      const result = await application.previewModuleComputation({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: s.ownerId,
        overrides: { thrust_force_in: makeQuantity(250, "N") },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.preview.outputs).toEqual([
        expect.objectContaining({
          portKey: "thrust_force_out",
          value: makeQuantity(250, "N"),
        }),
      ]);

      const persistedRuns = await client.prisma.calculationRun.findMany({
        where: { moduleInstanceId: s.moduleInstanceId },
      });
      expect(persistedRuns).toHaveLength(0);
      // The saved value itself is untouched by the override.
      const savedValues = await client.prisma.parameterValue.findMany({
        where: { moduleInstanceId: s.moduleInstanceId, parameterId: THRUST_FORCE },
      });
      expect(savedValues).toHaveLength(1);
    });

    it("ignores a submitted override for a linked port, resolving from the link instead", async () => {
      const upstream = await scaffold();
      await authorThrustForceIn(upstream, 42);
      const upstreamRun = await executeModuleInstance({
        moduleInstanceId: upstream.moduleInstanceId,
        ownerId: upstream.ownerId,
      });
      expect(upstreamRun.ok).toBe(true);

      const downstream = await projects.createModuleInstance({
        assemblyId: upstream.assemblyId,
        configurationId: upstream.configId,
        modulePackageId: RELAY_ID,
        moduleVersion: RELAY_VERSION,
        label: "Downstream relay",
      });
      await graph.createParameterLink({
        configurationId: upstream.configId,
        targetModuleInstanceId: downstream.id,
        targetParameterId: THRUST_FORCE,
        sourceKind: "module_output",
        sourceModuleInstanceId: upstream.moduleInstanceId,
        sourceParameterId: THRUST_FORCE,
      });

      const result = await application.previewModuleComputation({
        moduleInstanceId: downstream.id,
        ownerId: upstream.ownerId,
        // A bogus override for the linked port -- must be ignored.
        overrides: { thrust_force_in: makeQuantity(999, "N") },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.preview.outputs).toEqual([
        expect.objectContaining({
          portKey: "thrust_force_out",
          value: makeQuantity(42, "N"),
        }),
      ]);
    });

    it("refuses with stale_upstream when a linked source's latest run is stale, identical wording to executeModuleInstance", async () => {
      const s = await scaffold();
      await authorThrustForceIn(s, 274);
      const upstreamRun = await executeModuleInstance({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: s.ownerId,
      });
      expect(upstreamRun.ok).toBe(true);
      if (!upstreamRun.ok) return;

      const downstream = await projects.createModuleInstance({
        assemblyId: s.assemblyId,
        configurationId: s.configId,
        modulePackageId: RELAY_ID,
        moduleVersion: RELAY_VERSION,
        label: "Downstream relay",
      });
      await graph.createParameterLink({
        configurationId: s.configId,
        targetModuleInstanceId: downstream.id,
        targetParameterId: THRUST_FORCE,
        sourceKind: "module_output",
        sourceModuleInstanceId: s.moduleInstanceId,
        sourceParameterId: THRUST_FORCE,
      });

      await runs.markRunStale(upstreamRun.run.id, true, "An upstream value changed.");

      const result = await application.previewModuleComputation({
        moduleInstanceId: downstream.id,
        ownerId: s.ownerId,
        overrides: {},
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("stale_upstream");
      expect(result.error.message).toContain("An upstream value changed.");
    });

    it("reports invalid_input for an override with the wrong dimension, without persisting", async () => {
      const s = await scaffold();
      await authorThrustForceIn(s, 100);

      const result = await application.previewModuleComputation({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: s.ownerId,
        // Wrong dimension for "thrust_force_in" (expects N, a force).
        overrides: { thrust_force_in: makeQuantity(5, "kg") },
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("invalid_input");

      const persistedRuns = await client.prisma.calculationRun.findMany({
        where: { moduleInstanceId: s.moduleInstanceId },
      });
      expect(persistedRuns).toHaveLength(0);
    });

    it("reports unauthorized for another owner's module instance", async () => {
      const s = await scaffold();
      await authorThrustForceIn(s, 100);
      const stranger = await projects.upsertUser(`test-user-${randomUUID()}`);
      createdUserIds.push(stranger.id);

      const result = await application.previewModuleComputation({
        moduleInstanceId: s.moduleInstanceId,
        ownerId: stranger.id,
        overrides: {},
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("unauthorized");
    });
  },
);
```

- [ ] **Step 2: Run it (only if a live database is configured)**

Run: `npx vitest run "lib/application/calculations/preview-module-computation.test.ts"`
Expected: PASS if `DATABASE_URL`/`NODE_EXTRA_CA_CERTS` are set; otherwise the
whole suite reports skipped (`liveDatabaseAvailable` is false) — that is
expected on this machine per `context/progress-tracker.md`'s environment
notes, not a failure to chase.

- [ ] **Step 3: Commit**

```bash
git add lib/application/calculations/preview-module-computation.test.ts
git commit -m "test: cover previewModuleComputation against a live database"
```

---

## Task 5: `saveModuleInputsAction` and `previewModuleComputationAction`

**Files:**
- Modify: `app/(workspace)/workspace/actions.ts`

Removes `setModuleInputValueAction` and `runModuleInstanceAction`, adds the
two new actions, and switches the local `parseLoadCase`/`LOAD_CASE_CATEGORIES`
definitions to the shared ones from Task 1.

- [ ] **Step 1: Update imports**

In `app/(workspace)/workspace/actions.ts`, replace the `@/lib/application`
import block (lines 14-37) with:

```ts
import {
  addModuleInstance,
  archiveModuleInstance,
  assignComponent,
  confirmParameterLink,
  createMachineAssembly,
  createBaseline,
  createMachineDesignAssumption,
  createMachineLoadCase,
  createMachineProject,
  createMachineRequirement,
  createRequirementAcceptanceCriterion,
  deleteAccount,
  deleteModuleInstance,
  executeModuleInstance,
  previewArchiveModuleInstanceImpact,
  previewDeleteModuleInstanceImpact,
  previewModuleComputation,
  removeParameterLink,
  renameMachineAssembly,
  renameMachineProject,
  renameModuleInstanceLabel,
  setParameterValue,
  startWorkflowInstance,
} from "@/lib/application";
```

(This adds `previewModuleComputation` to the existing list — everything else
is unchanged.)

Replace the `@/lib/engine` import block (lines 51-56) with:

```ts
import {
  SERIALIZATION_FORMAT_VERSION,
  type EngineeringValue,
  type LoadCaseCategory,
} from "@/lib/engine";
```

(Drops `getParameter`, which was only used by the now-removed
`setModuleInputValueAction`; `SERIALIZATION_FORMAT_VERSION`/`EngineeringValue`
stay — still used by `confirmSuggestedLinkAction`... actually check: keep
whichever of these the remaining functions in this file still use. Concretely:
`LoadCaseCategory` is used by `parseLoadCase`'s call sites' typing;
`EngineeringValue` is used by the new `previewModuleComputationAction`
below; `SERIALIZATION_FORMAT_VERSION` is no longer used anywhere in this
file once `setModuleInputValueAction` is removed — drop it too. Final block:)

```ts
import {
  type EngineeringValue,
  type LoadCaseCategory,
} from "@/lib/engine";
```

Add a new import line right after the `./action-state` import:

```ts
import type { ActionState } from "./action-state";
import type { ModulePreviewActionState } from "./action-state";
import { parseSubmittedField, submittedPortKeys } from "./parse-submitted-field";
```

Delete the file's own `LOAD_CASE_CATEGORIES` constant and `parseLoadCase`
function (originally at lines 263-275), and import the shared one instead —
add to the new import line above:

```ts
import { parseLoadCase, parseSubmittedField, submittedPortKeys } from "./parse-submitted-field";
```

Remove the now-unused `parseSubmittedQuantity`/`parseSubmittedVector`
imports (lines 58-59) — they are only used inside `setModuleInputValueAction`,
which this task removes.

- [ ] **Step 2: Remove `setModuleInputValueAction`**

Delete the entire function (originally lines 277-415, from the doc comment
starting `/**\n * Sets a manual value on one module input port...` through
its closing `}`).

- [ ] **Step 3: Add `saveModuleInputsAction` in its place**

```ts
/**
 * Saves every editable field's current form value and executes a real,
 * persisted `CalculationRun` in one action (module workspace save/run
 * redesign, 2026-08-27) — the single commit point that replaces the old
 * one-Save-per-field flow (`setModuleInputValueAction`) plus a separate bare
 * Run click (`runModuleInstanceAction`, both removed by this change).
 * `submittedPortKeys` enumerates exactly the ports the client rendered an
 * editable control for (`fields.<portKey>.valueKind`) — a linked, disabled,
 * or unsupported port never appears there, so nothing extra needs skipping
 * here. Loops unconditionally (`setParameterValue`'s own no-op guard absorbs
 * a resubmitted, unchanged value) rather than tracking per-field dirty
 * state. Two sequential existing calls (`setParameterValue`,
 * `executeModuleInstance`), not one new cross-field transaction — see the
 * design doc's "Non-goals".
 */
export async function saveModuleInputsAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth.protect();
  const ownerId = asUserId(userId);
  const configurationId = asMachineConfigurationId(
    fieldValue(formData, "configurationId"),
  );
  const moduleInstanceId = asModuleInstanceId(
    fieldValue(formData, "moduleInstanceId"),
  );

  for (const portKey of submittedPortKeys(formData)) {
    const parsed = parseSubmittedField(formData, portKey);
    if (!parsed.ok) {
      return { status: "error", message: parsed.message };
    }
    const result = await setParameterValue(
      {
        configurationId,
        moduleInstanceId,
        nodeKind: "module_input",
        parameterId: parsed.parameterId,
        ...(parsed.loadCase !== undefined ? { loadCase: parsed.loadCase } : {}),
        source: "manual",
        value: parsed.value,
      },
      ownerId,
    );
    if (!result.ok) {
      return { status: "error", message: result.error.message };
    }
  }

  const executed = await executeModuleInstance({ moduleInstanceId, ownerId });
  if (!executed.ok) {
    return { status: "error", message: executed.error.message };
  }
  revalidatePath("/workspace");
  return { status: "success" };
}

/**
 * Previews a module instance's computation from its currently-resolved
 * inputs, with the submitted form's field overrides applied on top (module
 * workspace save/run redesign, 2026-08-27) — Run's Server Action. Writes
 * nothing; thin glue over `previewModuleComputation`, the same pattern every
 * other action in this file follows over its own application service.
 */
export async function previewModuleComputationAction(
  _prevState: ModulePreviewActionState,
  formData: FormData,
): Promise<ModulePreviewActionState> {
  const { userId } = await auth.protect();
  const ownerId = asUserId(userId);
  const moduleInstanceId = asModuleInstanceId(
    fieldValue(formData, "moduleInstanceId"),
  );

  const overrides: Record<string, EngineeringValue> = {};
  for (const portKey of submittedPortKeys(formData)) {
    const parsed = parseSubmittedField(formData, portKey);
    if (!parsed.ok) {
      return { status: "error", message: parsed.message };
    }
    overrides[portKey] = parsed.value;
  }

  const result = await previewModuleComputation({
    moduleInstanceId,
    ownerId,
    overrides,
  });
  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }
  return { status: "success", preview: result.preview };
}
```

(Place these two functions where `setModuleInputValueAction` used to be, so
the file's overall ordering stays close to the original.)

- [ ] **Step 4: Remove `runModuleInstanceAction`**

Delete the entire function (originally lines 417-441, the doc comment
starting `/**\n * Runs a module instance...` through its closing `}`).

- [ ] **Step 5: Confirm no other caller depends on the two removed actions**

Run: `grep -rn "setModuleInputValueAction\|runModuleInstanceAction" --include="*.ts" --include="*.tsx" app components lib`

Expected at this point in the plan: matches only in
`components/engineering/module-input-workspace.tsx`,
`components/engineering/module-input-workspace.test.tsx`,
`components/engineering/module-result-panel.tsx`,
`components/engineering/module-result-panel.test.tsx`,
`components/engineering/workspace-shell.test.tsx`, and
`app/(workspace)/workspace/actions.test.ts` — all fixed by later tasks in
this plan. If anything else matches, stop and investigate before continuing
(the design doc requires this exact check before deleting).

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: fails only in the files named in Step 5 (not yet updated) — the
new actions themselves should typecheck cleanly. If `actions.ts` itself has
errors, fix them now.

- [ ] **Step 7: Commit**

```bash
git add "app/(workspace)/workspace/actions.ts"
git commit -m "feat: replace per-field save and bare run with saveModuleInputsAction and previewModuleComputationAction"
```

---

## Task 6: Update `actions.test.ts`

**Files:**
- Modify: `app/(workspace)/workspace/actions.test.ts`

Replaces the `setModuleInputValueAction: vector_quantity branch` describe
block with an equivalent one for `saveModuleInputsAction`, using the new
namespaced field names and adding an `executeModuleInstance` mock (Save now
calls it too).

- [ ] **Step 1: Update the hoisted mocks and `@/lib/application` mock**

Replace lines 35-47 (the `vi.hoisted` block) with:

```ts
const {
  mockAuthProtect,
  mockSetParameterValue,
  mockExecuteModuleInstance,
  mockStartWorkflowInstance,
  mockDeleteAccount,
  mockRedirect,
} = vi.hoisted(() => ({
  mockAuthProtect: vi.fn(),
  mockSetParameterValue: vi.fn(),
  mockExecuteModuleInstance: vi.fn(),
  mockStartWorkflowInstance: vi.fn(),
  mockDeleteAccount: vi.fn(),
  mockRedirect: vi.fn(),
}));
```

Replace the `@/lib/application` mock (lines 89-93) with:

```ts
// saveModuleInputsAction, startWorkflowInstanceAction, and deleteAccountAction
// are the only actions under test in this file; setParameterValue,
// executeModuleInstance, startWorkflowInstance, and deleteAccount are the
// only "@/lib/application" exports they call.
vi.mock("@/lib/application", () => ({
  setParameterValue: mockSetParameterValue,
  executeModuleInstance: mockExecuteModuleInstance,
  startWorkflowInstance: mockStartWorkflowInstance,
  deleteAccount: mockDeleteAccount,
}));
```

- [ ] **Step 2: Replace the import and the vector_quantity describe block**

Replace the import (line 95-99):

```ts
import {
  saveModuleInputsAction,
  startWorkflowInstanceAction,
  deleteAccountAction,
} from "./actions";
```

Replace the entire `describe("setModuleInputValueAction: vector_quantity branch", ...)`
block (lines 111-194) with:

```ts
describe("saveModuleInputsAction: vector_quantity branch", () => {
  beforeEach(() => {
    mockAuthProtect.mockReset();
    mockAuthProtect.mockResolvedValue({ userId: "test-user-1" });
    mockSetParameterValue.mockReset();
    mockSetParameterValue.mockResolvedValue({
      ok: true,
      value: {},
      staleModuleInstanceIds: [],
    });
    mockExecuteModuleInstance.mockReset();
    mockExecuteModuleInstance.mockResolvedValue({
      ok: true,
      run: { id: "run-1", status: "pass" },
    });
  });

  it("rejects a vector_quantity submission for a parameter whose real registry frame is not axis, without writing", async () => {
    // motion.axis.payload_mass is a real released "quantity" parameter with
    // no declared `frame` (defaults to "none"). A tampered request could
    // still submit valueKind=vector_quantity against it; the shared parser
    // must re-derive the registry's real frame rather than trust the
    // client's claim.
    const result = await saveModuleInputsAction(
      IDLE_ACTION_STATE,
      buildFormData({
        configurationId: "cfg-1",
        moduleInstanceId: "mod-1",
        "fields.payload_mass.parameterId": "motion.axis.payload_mass",
        "fields.payload_mass.valueKind": "vector_quantity",
        "fields.payload_mass.component-0": "1",
        "fields.payload_mass.component-1": "2",
        "fields.payload_mass.component-2": "3",
        "fields.payload_mass.unit": "kg",
      }),
    );

    expect(result).toEqual({
      status: "error",
      message: "This parameter does not use the axis vector frame.",
    });
    expect(mockSetParameterValue).not.toHaveBeenCalled();
    expect(mockExecuteModuleInstance).not.toHaveBeenCalled();
  });

  it("parses a valid vector_quantity submission, writes it, and executes the module", async () => {
    // motion.axis.center_of_mass_offset is a real released vector_quantity
    // parameter with frame: "axis" and canonicalUnit "m", and carries no
    // loadCases restriction, so no loadCase field is needed.
    const result = await saveModuleInputsAction(
      IDLE_ACTION_STATE,
      buildFormData({
        configurationId: "cfg-1",
        moduleInstanceId: "mod-1",
        "fields.cg_offset.parameterId": "motion.axis.center_of_mass_offset",
        "fields.cg_offset.valueKind": "vector_quantity",
        "fields.cg_offset.component-0": "1",
        "fields.cg_offset.component-1": "2",
        "fields.cg_offset.component-2": "3",
        "fields.cg_offset.unit": "m",
      }),
    );

    expect(result).toEqual({ status: "success" });
    expect(mockSetParameterValue).toHaveBeenCalledTimes(1);
    expect(mockExecuteModuleInstance).toHaveBeenCalledWith({
      moduleInstanceId: "mod-1",
      ownerId: "test-user-1",
    });

    const [input, userId] = mockSetParameterValue.mock.calls[0] as [
      Record<string, unknown>,
      string,
    ];
    expect(userId).toBe("test-user-1");
    expect(input).toMatchObject({
      configurationId: "cfg-1",
      moduleInstanceId: "mod-1",
      nodeKind: "module_input",
      parameterId: "motion.axis.center_of_mass_offset",
      source: "manual",
    });
    expect(input.value).toEqual({
      v: SERIALIZATION_FORMAT_VERSION,
      kind: "vector_quantity",
      components: [1, 2, 3],
      unit: "m",
      frame: "axis",
      displayUnit: "m",
    });
  });

  it("stops and reports the error without executing when a field write fails", async () => {
    mockSetParameterValue.mockResolvedValueOnce({
      ok: false,
      error: { code: "invalid_input", message: "Something went wrong." },
    });

    const result = await saveModuleInputsAction(
      IDLE_ACTION_STATE,
      buildFormData({
        configurationId: "cfg-1",
        moduleInstanceId: "mod-1",
        "fields.cg_offset.parameterId": "motion.axis.center_of_mass_offset",
        "fields.cg_offset.valueKind": "vector_quantity",
        "fields.cg_offset.component-0": "1",
        "fields.cg_offset.component-1": "2",
        "fields.cg_offset.component-2": "3",
        "fields.cg_offset.unit": "m",
      }),
    );

    expect(result).toEqual({ status: "error", message: "Something went wrong." });
    expect(mockExecuteModuleInstance).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the file**

Run: `npx vitest run "app/(workspace)/workspace/actions.test.ts"`
Expected: all tests pass (`startWorkflowInstanceAction`/`deleteAccountAction`
describe blocks are untouched by this task and should still pass unchanged).

- [ ] **Step 4: Commit**

```bash
git add "app/(workspace)/workspace/actions.test.ts"
git commit -m "test: cover saveModuleInputsAction's vector_quantity branch"
```

---

## Task 7: Link-suggestion menu (`link-suggestion-panel.tsx`)

**Files:**
- Modify: `components/engineering/link-suggestion-panel.tsx`

Renames the exported `LinkSuggestionPanel` (an always-visible box) to
`LinkSuggestionMenu` (a ⋮ icon button opening a Radix `DropdownMenu`).
`LinkSuggestionRow`/`SuggestionDetail`/`suggestionKey`/`suggestionText` and
`LinkedFieldControl` are unchanged — only the outer wrapper changes.

- [ ] **Step 1: Update imports**

Replace lines 1-17 with:

```ts
"use client";

import { useActionState, useState } from "react";
import { EllipsisVertical, Link2Off } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  confirmSuggestedLinkAction,
  removeParameterLinkAction,
} from "@/app/(workspace)/workspace/actions";
import { IDLE_ACTION_STATE } from "@/app/(workspace)/workspace/action-state";
import { LOAD_CASE_LABELS } from "./load-case-labels";
import { formatEngineeringValue } from "./format-engineering-value";
import type { ResolvedInputSource } from "@/lib/db";
import type {
  LinkSuggestionSourceView,
  ModuleInputFieldView,
} from "@/lib/application";
```

- [ ] **Step 2: Replace `LinkSuggestionPanel` with `LinkSuggestionMenu`**

Replace the `export interface LinkSuggestionPanelProps` block and the
`export function LinkSuggestionPanel(...)` block (originally lines 198-239)
with:

```ts
export interface LinkSuggestionPanelProps {
  readonly field: ModuleInputFieldView;
  readonly configurationId: string;
  readonly targetModuleInstanceId: string;
}

/**
 * The ⋮ suggestion-menu trigger (module workspace save/run redesign,
 * 2026-08-27) — replaces the old always-visible "Suggested sources" box,
 * which read as unexplained clutter (founder feedback). Renders nothing
 * when `field.suggestions` is empty, same as the box it replaces. No
 * suggestion-count badge on the trigger — a plain icon, per founder
 * preference. Every row inside keeps identical underlying behavior to the
 * old panel: Confirm still calls the unchanged `confirmSuggestedLinkAction`;
 * View source still expands inline detail; Dismiss is still
 * client-side-only, recomputed every render, nothing persisted.
 */
export function LinkSuggestionMenu({
  field,
  configurationId,
  targetModuleInstanceId,
}: LinkSuggestionPanelProps) {
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const visible = field.suggestions.filter(
    (s) => !dismissed.has(suggestionKey(s)),
  );
  if (visible.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label={`Suggested source${visible.length > 1 ? "s" : ""} for ${field.label}`}
        >
          <EllipsisVertical aria-hidden="true" className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 p-2.5">
        <p className="mb-2 text-[11px] font-medium tracking-wide text-text-muted uppercase">
          Suggested source{visible.length > 1 ? "s" : ""}
        </p>
        <div className="flex flex-col gap-2">
          {visible.map((suggestion) => (
            <LinkSuggestionRow
              key={suggestionKey(suggestion)}
              suggestion={suggestion}
              configurationId={configurationId}
              targetModuleInstanceId={targetModuleInstanceId}
              targetParameterId={field.parameterId}
              targetLoadCase={field.loadCase}
              onDismiss={() =>
                setDismissed((prev) => new Set(prev).add(suggestionKey(suggestion)))
              }
            />
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

Leave everything else in the file (`suggestionKey`, `suggestionText`,
`SuggestionDetail`, `LinkSuggestionRow`, `LinkedFieldControlProps`,
`LINKED_SOURCE_WARNING`, `LinkedFieldControl`) exactly as it is today.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: fails only in `module-input-workspace.tsx` (still imports the old
`LinkSuggestionPanel` name — fixed in Task 8).

- [ ] **Step 4: Commit**

```bash
git add components/engineering/link-suggestion-panel.tsx
git commit -m "feat: replace the always-visible suggestion box with a meatball-menu"
```

---

## Task 8: `ModuleInputWorkspace` — single form, action bar, completeness tracking

**Files:**
- Modify: `components/engineering/module-input-workspace.tsx`

This is the largest change: one `<form>` for the whole module, a sticky
header with Save/Run, a client-side completeness map driving Run's
disabled/tooltip state, namespaced hidden inputs, and the suggestion trigger
moved into the field's label row.

- [ ] **Step 1: Replace the whole file**

```tsx
"use client";

import { useActionState, useEffect, useId, useState } from "react";
import {
  Boxes,
  CircleAlert,
  CircleDashed,
  Link2,
  PenLine,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import {
  LinkedFieldControl,
  LinkSuggestionMenu,
} from "./link-suggestion-panel";
import { LoadCaseChip } from "./load-case-chip";
import {
  previewModuleComputationAction,
  saveModuleInputsAction,
} from "@/app/(workspace)/workspace/actions";
import {
  IDLE_ACTION_STATE,
  IDLE_MODULE_PREVIEW_ACTION_STATE,
} from "@/app/(workspace)/workspace/action-state";
import { convert } from "@/lib/engine/units";
import { cn } from "@/lib/utils";
import type { ResolvedInputSource } from "@/lib/db";
import type {
  ModuleInputFieldView,
  ModuleInputGroupView,
  ModulePreviewView,
  ModuleWorkspaceView,
} from "@/lib/application";

export interface ModuleInputWorkspaceProps {
  readonly view: ModuleWorkspaceView;
  /**
   * Called with the fresh computation after a successful Run (preview), and
   * with `null` right after a successful Save (the persisted result takes
   * over once the page revalidates). `ModuleInputWorkspace` and
   * `ModuleResultPanel` are rendered as siblings by `WorkspaceShell`, not
   * nested, so the preview has to be lifted through the shared parent rather
   * than passed directly.
   */
  readonly onPreviewChange: (preview: ModulePreviewView | null) => void;
}

const CONTROL_CLASS =
  "h-9 rounded-md border border-border-default bg-bg-surface px-2.5 text-[13px] text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary";

/**
 * axis.v1's fixed 3-component order and physical meaning
 * (context/modules/axis-load-cases/stage-1-spec.md): X = the engineer-declared
 * positive travel direction, Y = horizontal transverse, Z = the resulting
 * right-handed axis. Only `frame: "axis"` vectors are editable today — see
 * docs/design/vector-quantity-input-editor.md.
 */
const AXIS_COMPONENT_LABELS = [
  "X (travel direction)",
  "Y (transverse)",
  "Z",
] as const;

/**
 * Short visible captions for the 3 axis-vector component inputs — the full
 * `AXIS_COMPONENT_LABELS` phrasing (e.g. "X (travel direction)") stays in
 * each input's `aria-label` for screen readers, but a sighted user needs a
 * persistent, at-a-glance way to tell 3 otherwise-identical number boxes
 * apart too. Deliberately not a `placeholder`, which disappears the moment a
 * value is typed — exactly when re-checking which box is which matters most.
 */
const AXIS_COMPONENT_CAPTIONS = ["X", "Y", "Z"] as const;

/**
 * Bento grid-cell placement for a module whose declared `ModuleUiSchema`
 * groups happen to match this exact 4-group id set — currently only
 * belt-pulley-drive-motor-sizing@0.3.x. Keyed by group id (not module id),
 * so this stays a generic "layout follows declared structure" rule rather
 * than a module-specific form: any module that declares these same four
 * group ids gets the same 2-column x 3-row bento automatically, and any
 * module whose groups don't match this set falls back to the plain stacked
 * layout below unchanged.
 */
const BENTO_CELL_CLASS: Record<string, string> = {
  "geometry-and-environment": "lg:col-start-1 lg:row-start-1",
  "motor-and-safety-factors": "lg:col-start-1 lg:row-start-2",
  "pulleys-and-belt": "lg:col-start-2 lg:row-start-1 lg:row-span-2",
  motion: "lg:col-start-1 lg:col-span-2 lg:row-start-3",
};
const BENTO_GROUP_IDS = Object.keys(BENTO_CELL_CLASS);

/**
 * Seeds a field's completeness from its *server-resolved* value alone (no
 * client typing yet) — so an already-saved field counts as complete
 * immediately on mount, not only after the user types (design doc, "Action
 * bar"). A `linked` field is always complete regardless of its own link's
 * run status (`ModuleInputFieldRow` excludes linked fields from the
 * required-check separately, using `field.resolved.source` directly — this
 * seed only matters for a field that *could* later become non-linked, which
 * never happens without a page reload, so its value here is inert for
 * linked fields but kept for symmetry). A `boolean` field is always complete
 * — a checkbox is always definitively true or false, never empty. Any other
 * kind is complete when it already has a manual/workflow value, or a
 * "default" resolution backed by a real registry constant.
 */
function isFieldInitiallyComplete(field: ModuleInputFieldView): boolean {
  if (field.resolved.source === "linked") return true;
  if (field.field.kind === "boolean") return true;
  if (field.resolved.source !== "default") return true;
  return field.hasBuiltInDefault ?? false;
}

/**
 * The generic module input renderer (Unit 3.3/3.4, redesigned 2026-08-27 —
 * see docs/superpowers/specs/2026-08-27-module-workspace-save-run-redesign-
 * design.md). One `<form>` covers every field in every group; a sticky
 * header holds `Run` (preview — computes from the form's current values,
 * persists nothing) and `Save` (persists every field plus a real
 * `CalculationRun`, in that order). Renders `quantity`, `enum`, `boolean`,
 * and axis-frame `vector_quantity` fields, grouped per the module's declared
 * `ModuleUiSchema` — the same component for every module. A non-linked
 * field's suggestions live behind a ⋮ menu next to its label
 * (`LinkSuggestionMenu`); a linked field renders its remove-link control
 * (`LinkedFieldControl`) instead of an editor.
 *
 * Deliberately deferred (unchanged from before this redesign): a `curve`
 * parameter, or a `vector_quantity` whose frame is not `"axis"` — both
 * render as an honest "not yet editable" notice via the field descriptor's
 * `"unsupported"` branch. Such a field still offers link suggestions, since
 * linking never needs a native editor.
 */
export function ModuleInputWorkspace({
  view,
  onPreviewChange,
}: ModuleInputWorkspaceProps) {
  const allFields = view.groups.flatMap((group) => group.fields);

  const [complete, setComplete] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      allFields.map((field) => [field.portKey, isFieldInitiallyComplete(field)]),
    ),
  );
  const handleCompletenessChange = (portKey: string, isComplete: boolean) => {
    setComplete((prev) =>
      prev[portKey] === isComplete ? prev : { ...prev, [portKey]: isComplete },
    );
  };

  const [saveState, saveFormAction, isSaving] = useActionState(
    saveModuleInputsAction,
    IDLE_ACTION_STATE,
  );
  const [previewState, previewFormAction, isPreviewing] = useActionState(
    previewModuleComputationAction,
    IDLE_MODULE_PREVIEW_ACTION_STATE,
  );

  // Lifts a successful preview up to the sibling ModuleResultPanel via
  // WorkspaceShell. An effect, not a render-time call: onPreviewChange
  // updates a DIFFERENT component's (WorkspaceShell's) state, which React
  // only supports doing from an effect, not synchronously during this
  // component's own render.
  useEffect(() => {
    if (previewState.status === "success") {
      onPreviewChange(previewState.preview);
    }
  }, [previewState, onPreviewChange]);

  // Clears any showing preview once Save actually persists a real run — the
  // page revalidates and ModuleResultPanel's own `view` prop takes over.
  useEffect(() => {
    if (saveState.status === "success") {
      onPreviewChange(null);
    }
  }, [saveState, onPreviewChange]);

  const missingRequiredFields = allFields.filter(
    (field) =>
      field.required &&
      !(field.disabled ?? false) &&
      field.field.kind !== "unsupported" &&
      field.resolved.source !== "linked" &&
      !(complete[field.portKey] ?? false),
  );
  const runDisabled = missingRequiredFields.length > 0 || isSaving || isPreviewing;
  const runTitle =
    missingRequiredFields.length > 0
      ? `Missing required input${missingRequiredFields.length > 1 ? "s" : ""}: ${missingRequiredFields.map((field) => field.label).join(", ")}`
      : undefined;

  const isBentoLayout =
    view.groups.length === BENTO_GROUP_IDS.length &&
    view.groups.every((group) => group.id in BENTO_CELL_CLASS);

  return (
    <form
      action={saveFormAction}
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-6"
    >
      <input
        type="hidden"
        name="configurationId"
        value={view.moduleInstance.configurationId}
      />
      <input
        type="hidden"
        name="moduleInstanceId"
        value={view.moduleInstance.id}
      />

      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-default bg-bg-base pb-4">
        <Boxes
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-text-muted"
        />
        <div className="min-w-0">
          <h1 className="truncate text-[18px] font-semibold text-text-primary">
            {view.moduleInstance.label}
          </h1>
          <p className="truncate font-mono text-[12px] text-text-muted">
            {view.moduleInstance.modulePackageId}@
            {view.moduleInstance.moduleVersion}
          </p>
        </div>
        <StatusBadge
          status={view.moduleInstance.lastRunStatus ?? "not_configured"}
          className="shrink-0"
        />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* `title` goes on the wrapping span, not the disabled Button
              itself: a disabled native <button> does not fire hover events
              in most browsers, so a `title` on the button alone would never
              show its tooltip while Run is actually disabled. */}
          <span title={runTitle}>
            <Button
              type="submit"
              formAction={previewFormAction}
              variant="outline"
              size="sm"
              disabled={runDisabled}
            >
              {isPreviewing ? "Running…" : "Run"}
            </Button>
          </span>
          <Button
            type="submit"
            formAction={saveFormAction}
            size="sm"
            disabled={isSaving || isPreviewing}
          >
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </header>

      {previewState.status === "error" ? (
        <p
          role="alert"
          className="text-[12px]"
          style={{ color: "var(--state-error)" }}
        >
          {previewState.message}
        </p>
      ) : null}
      {saveState.status === "error" ? (
        <p
          role="alert"
          className="text-[12px]"
          style={{ color: "var(--state-error)" }}
        >
          {saveState.message}
        </p>
      ) : null}

      {view.groups.length === 0 ? (
        <p className="text-[13px] text-text-muted">
          This module declares no input fields.
        </p>
      ) : isBentoLayout ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:grid-rows-[auto_auto_auto]">
          {view.groups.map((group) => (
            <FieldGroup
              key={group.id}
              group={group}
              configurationId={view.moduleInstance.configurationId}
              moduleInstanceId={view.moduleInstance.id}
              onCompletenessChange={handleCompletenessChange}
              className={cn("h-full", BENTO_CELL_CLASS[group.id])}
              showMotionProfilePlaceholder={group.id === "motion"}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {view.groups.map((group) => (
            <FieldGroup
              key={group.id}
              group={group}
              configurationId={view.moduleInstance.configurationId}
              moduleInstanceId={view.moduleInstance.id}
              onCompletenessChange={handleCompletenessChange}
            />
          ))}
        </div>
      )}
    </form>
  );
}

function FieldGroup({
  group,
  configurationId,
  moduleInstanceId,
  onCompletenessChange,
  className,
  showMotionProfilePlaceholder = false,
}: {
  readonly group: ModuleInputGroupView;
  readonly configurationId: string;
  readonly moduleInstanceId: string;
  readonly onCompletenessChange: (portKey: string, complete: boolean) => void;
  readonly className?: string;
  readonly showMotionProfilePlaceholder?: boolean;
}) {
  const fields = (
    <div className="flex flex-col gap-5">
      {group.fields.map((field) => (
        <ModuleInputFieldRow
          key={field.portKey}
          field={field}
          configurationId={configurationId}
          moduleInstanceId={moduleInstanceId}
          onCompletenessChange={onCompletenessChange}
        />
      ))}
    </div>
  );

  if (showMotionProfilePlaceholder) {
    return (
      <section
        className={cn(
          "flex flex-col gap-5 rounded-lg border border-border-default bg-bg-surface p-4",
          className,
        )}
      >
        <h2 className="text-[14px] font-semibold text-text-primary">
          {group.title}
        </h2>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
          {group.fields.map((field) => (
            <ModuleInputFieldRow
              key={field.portKey}
              field={field}
              configurationId={configurationId}
              moduleInstanceId={moduleInstanceId}
              onCompletenessChange={onCompletenessChange}
            />
          ))}
        </div>
        <div className="flex min-h-40 flex-1 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border-default text-center">
          <p className="text-[12px] font-medium text-text-muted">
            Motion profile chart
          </p>
          <p className="text-[11px] text-text-muted">Coming soon</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "flex flex-col gap-5 rounded-lg border border-border-default bg-bg-surface p-4",
        className,
      )}
    >
      <h2 className="text-[14px] font-semibold text-text-primary">
        {group.title}
      </h2>
      {fields}
    </section>
  );
}

const SOURCE_META: Record<
  ResolvedInputSource["source"],
  { label: string; icon: LucideIcon }
> = {
  manual: { label: "Manual", icon: PenLine },
  workflow: { label: "Workflow", icon: Workflow },
  linked: { label: "Linked", icon: Link2 },
  default: { label: "Default", icon: CircleDashed },
};

/**
 * Source badge: manual, linked, default, or workflow (ui-context.md
 * "Generic Module Workspace"). `source === "default"` on its own only means
 * "nothing was manually entered, linked, or workflow-supplied" — it does not
 * mean a real value is behind it. When `hasBuiltInDefault` is false, this
 * renders "Not set" in the error color instead of "Default", so an empty
 * required field never looks pre-filled.
 */
function SourceBadge({
  source,
  hasBuiltInDefault,
}: {
  readonly source: ResolvedInputSource["source"];
  readonly hasBuiltInDefault: boolean;
}) {
  if (source === "default" && !hasBuiltInDefault) {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium"
        style={{
          borderColor: "var(--state-error)",
          color: "var(--state-error)",
        }}
      >
        <CircleAlert aria-hidden="true" className="h-3 w-3" />
        Not set
      </span>
    );
  }
  const meta = SOURCE_META[source];
  const Icon = meta.icon;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border-default px-1.5 py-0.5 text-[11px] font-medium text-text-muted">
      <Icon aria-hidden="true" className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function ModuleInputFieldRow({
  field,
  configurationId,
  moduleInstanceId,
  onCompletenessChange,
}: {
  readonly field: ModuleInputFieldView;
  readonly configurationId: string;
  readonly moduleInstanceId: string;
  readonly onCompletenessChange: (portKey: string, complete: boolean) => void;
}) {
  const inputId = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={inputId}>{field.label}</Label>
        {field.required ? (
          <span className="text-[11px] text-text-muted">(required)</span>
        ) : null}
        <SourceBadge
          source={field.resolved.source}
          hasBuiltInDefault={field.hasBuiltInDefault ?? false}
        />
        {field.loadCase !== null ? (
          <LoadCaseChip loadCase={field.loadCase} />
        ) : null}
        {!(field.disabled ?? false) && field.resolved.source !== "linked" ? (
          <LinkSuggestionMenu
            field={field}
            configurationId={configurationId}
            targetModuleInstanceId={moduleInstanceId}
          />
        ) : null}
      </div>
      {field.help !== null ? (
        <p className="text-[12px] text-text-muted">{field.help}</p>
      ) : null}

      {field.resolved.source === "linked" ? (
        <LinkedFieldControl
          resolved={field.resolved}
          linkRemovalImpact={field.linkRemovalImpact ?? 0}
          linkedSourceStatus={field.linkedSourceStatus}
        />
      ) : field.field.kind === "unsupported" ? (
        <p className="text-[12px] text-text-muted italic">
          Editing {field.field.valueType.replace("_", " ")} values is not
          supported yet — link a source instead.
        </p>
      ) : (
        <div className="flex flex-wrap items-start gap-2">
          <input
            type="hidden"
            name={`fields.${field.portKey}.parameterId`}
            value={field.parameterId}
            disabled={field.disabled ?? false}
          />
          {field.loadCase !== null ? (
            <input
              type="hidden"
              name={`fields.${field.portKey}.loadCase`}
              value={field.loadCase}
              disabled={field.disabled ?? false}
            />
          ) : null}
          <input
            type="hidden"
            name={`fields.${field.portKey}.valueKind`}
            value={field.field.kind}
            disabled={field.disabled ?? false}
          />

          <FieldControl
            field={field}
            inputId={inputId}
            disabled={field.disabled ?? false}
            onCompletenessChange={(isComplete) =>
              onCompletenessChange(field.portKey, isComplete)
            }
          />
        </div>
      )}
    </div>
  );
}

function FieldControl({
  field,
  inputId,
  disabled,
  onCompletenessChange,
}: {
  readonly field: ModuleInputFieldView;
  readonly inputId: string;
  readonly disabled: boolean;
  readonly onCompletenessChange: (complete: boolean) => void;
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
          name={`fields.${field.portKey}.magnitude`}
          defaultValue={defaultMagnitude}
          required={field.required}
          disabled={disabled}
          onChange={(event) => {
            const text = event.target.value.trim();
            onCompletenessChange(
              text.length > 0 && Number.isFinite(Number(text)),
            );
          }}
          className={cn(CONTROL_CLASS, "w-36 font-mono tabular-nums")}
        />
        <select
          name={`fields.${field.portKey}.unit`}
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
      <div
        className="flex flex-wrap items-start gap-2"
        onChange={(event) => {
          const inputs =
            event.currentTarget.querySelectorAll<HTMLInputElement>(
              "input[type='number']",
            );
          const allParseable =
            inputs.length === 3 &&
            Array.from(inputs).every((el) => {
              const text = el.value.trim();
              return text.length > 0 && Number.isFinite(Number(text));
            });
          onCompletenessChange(allParseable);
        }}
      >
        {AXIS_COMPONENT_LABELS.map((axisLabel, index) => (
          <div key={axisLabel} className="flex flex-col gap-0.5">
            <span className="text-[11px] text-text-muted">
              {AXIS_COMPONENT_CAPTIONS[index]}
            </span>
            <input
              id={index === 0 ? inputId : undefined}
              type="number"
              step="any"
              name={`fields.${field.portKey}.component-${index}`}
              defaultValue={defaultComponents?.[index]}
              aria-label={`${field.label} ${axisLabel}`}
              required={field.required}
              disabled={disabled}
              className={cn(CONTROL_CLASS, "w-24 font-mono tabular-nums")}
            />
          </div>
        ))}
        <select
          name={`fields.${field.portKey}.unit`}
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
        name={`fields.${field.portKey}.option`}
        defaultValue={current ?? ""}
        required={field.required}
        disabled={disabled}
        onChange={(event) => onCompletenessChange(event.target.value !== "")}
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
        name={`fields.${field.portKey}.checked`}
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

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: fails only in `module-input-workspace.test.tsx` and
`workspace-shell.tsx`/`workspace-shell.test.tsx` (not yet updated). If
`module-input-workspace.tsx` itself has errors, fix them now.

- [ ] **Step 3: Commit**

```bash
git add components/engineering/module-input-workspace.tsx
git commit -m "feat: single-form module input workspace with Save/Run action bar and completeness tracking"
```

---

## Task 9: Update `module-input-workspace.test.tsx`

**Files:**
- Modify: `components/engineering/module-input-workspace.test.tsx`

- [ ] **Step 1: Replace the whole file**

```tsx
// @vitest-environment jsdom
import { describe, expect, vi, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModuleInputWorkspace } from "./module-input-workspace";
import {
  confirmSuggestedLinkAction,
  previewModuleComputationAction,
  removeParameterLinkAction,
  saveModuleInputsAction,
} from "@/app/(workspace)/workspace/actions";
import type {
  LinkSuggestionSourceView,
  ModuleInputFieldView,
  ModulePreviewView,
  ModuleWorkspaceView,
} from "@/lib/application";

// module-input-workspace.tsx (and the link-suggestion-panel.tsx it renders)
// import these Server Actions directly (inline forms, unlike the dialogs) —
// mocked for the same reason every other component test in this directory
// mocks the "use server" file (see app-bar.test.tsx).
vi.mock("@/app/(workspace)/workspace/actions", () => ({
  saveModuleInputsAction: vi.fn(),
  previewModuleComputationAction: vi.fn(),
  confirmSuggestedLinkAction: vi.fn(),
  removeParameterLinkAction: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(saveModuleInputsAction).mockReset();
  vi.mocked(saveModuleInputsAction).mockResolvedValue({ status: "success" });
  vi.mocked(previewModuleComputationAction).mockReset();
  vi.mocked(previewModuleComputationAction).mockResolvedValue({
    status: "success",
    preview: {
      outputs: [],
      checks: [],
      warnings: [],
      validity: [],
      trace: null,
      sources: [],
    },
  });
  vi.mocked(confirmSuggestedLinkAction).mockReset();
  vi.mocked(confirmSuggestedLinkAction).mockResolvedValue({
    status: "success",
  });
  vi.mocked(removeParameterLinkAction).mockReset();
  vi.mocked(removeParameterLinkAction).mockResolvedValue({ status: "success" });
});

function noopOnPreviewChange(): void {
  // The test's own assertions read the mock's calls when they care about
  // what was lifted, rather than reading state from this no-op.
}

const quantityDefaultField: ModuleInputFieldView = {
  portKey: "payload_mass",
  parameterId: "motion.axis.payload_mass",
  label: "Payload mass",
  help: "Total moving mass carried by the axis.",
  required: true,
  loadCase: null,
  field: {
    kind: "quantity",
    canonicalUnit: "kg",
    displayUnits: ["kg", "g", "lbm"],
  },
  resolved: { source: "default" },
  suggestions: [],
  linkRemovalImpact: null,
};
const lengthManualField: ModuleInputFieldView = {
  portKey: "stroke",
  parameterId: "motion.axis.stroke",
  label: "Stroke",
  help: null,
  required: true,
  loadCase: null,
  field: { kind: "quantity", canonicalUnit: "m", displayUnits: ["m", "mm"] },
  resolved: {
    source: "manual",
    value: { v: 1, kind: "quantity", value: 0.5, unit: "m", displayUnit: "mm" },
  },
  suggestions: [],
  linkRemovalImpact: null,
};

const fractionalLengthManualField: ModuleInputFieldView = {
  ...lengthManualField,
  resolved: {
    source: "manual",
    value: {
      v: 1,
      kind: "quantity",
      value: 0.123456789,
      unit: "m",
      displayUnit: "mm",
    },
  },
};

const temperatureManualField: ModuleInputFieldView = {
  portKey: "ambient_temperature",
  parameterId: "env.ambient_temperature",
  label: "Ambient temperature",
  help: null,
  required: true,
  loadCase: null,
  field: { kind: "quantity", canonicalUnit: "K", displayUnits: ["K", "degC"] },
  resolved: {
    source: "manual",
    value: {
      v: 1,
      kind: "quantity",
      value: 298.15,
      unit: "K",
      displayUnit: "degC",
    },
  },
  suggestions: [],
  linkRemovalImpact: null,
};

const enumManualField: ModuleInputFieldView = {
  portKey: "orientation",
  parameterId: "motion.axis.orientation",
  label: "Axis orientation",
  help: null,
  required: false,
  loadCase: "normal",
  field: {
    kind: "enum",
    enumId: "axis_orientation",
    options: ["horizontal", "vertical", "inclined"],
  },
  resolved: {
    source: "manual",
    value: {
      v: 1,
      kind: "enum",
      enumId: "axis_orientation",
      value: "vertical",
    },
  },
  suggestions: [],
  linkRemovalImpact: null,
};

const booleanWorkflowField: ModuleInputFieldView = {
  portKey: "brake_present",
  parameterId: "drive.brake.present",
  label: "Holding brake present",
  help: null,
  required: false,
  loadCase: null,
  field: { kind: "boolean" },
  resolved: {
    source: "workflow",
    value: { v: 1, kind: "boolean", value: true },
  },
  suggestions: [],
  linkRemovalImpact: null,
};

const linkedField: ModuleInputFieldView = {
  portKey: "thrust_force_in",
  parameterId: "motion.axis.thrust_force",
  label: "Required thrust force",
  help: null,
  required: true,
  loadCase: null,
  field: {
    kind: "quantity",
    canonicalUnit: "N",
    displayUnits: ["N", "kN", "lbf"],
  },
  resolved: {
    source: "linked",
    link: {
      id: "link1" as never,
      configurationId: "c1" as never,
      targetModuleInstanceId: "m1" as never,
      targetParameterId: "motion.axis.thrust_force",
      targetLoadCase: null,
      sourceKind: "module_output",
      sourceModuleInstanceId: "m0" as never,
      sourceAssemblyId: null,
      sourceParameterId: "motion.axis.thrust_force",
      sourceLoadCase: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    value: null,
  },
  suggestions: [],
  linkRemovalImpact: 2,
};

const unsupportedField: ModuleInputFieldView = {
  portKey: "non_axis_vector",
  parameterId: "example.non_axis_vector",
  label: "Non-axis vector example",
  help: null,
  required: false,
  loadCase: null,
  field: { kind: "unsupported", valueType: "vector_quantity" },
  resolved: { source: "default" },
  suggestions: [],
  linkRemovalImpact: null,
};

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

const requirementSuggestion: LinkSuggestionSourceView = {
  sourceKind: "machine_requirement",
  sourceModuleInstanceId: null,
  sourceAssemblyId: null,
  sourceParameterId: "motion.axis.payload_mass",
  sourceLoadCase: "normal",
  parameterLabel: "Payload mass",
  scopeLabel: "Machine",
  moduleLabel: null,
  origin: "scope",
  value: { v: 1, kind: "quantity", value: 12, unit: "kg" },
};

const fieldWithSuggestion: ModuleInputFieldView = {
  ...quantityDefaultField,
  suggestions: [requirementSuggestion],
};

const disabledFieldWithSuggestion: ModuleInputFieldView = {
  ...fieldWithSuggestion,
  disabled: true,
};

function view(fields: readonly ModuleInputFieldView[]): ModuleWorkspaceView {
  return {
    moduleInstance: {
      id: "m1" as never,
      assemblyId: "a1" as never,
      configurationId: "c1" as never,
      label: "Thrust check",
      modulePackageId: "example-scaffold",
      moduleVersion: "0.1.0",
      category: "example",
      lastRunStatus: "pass",
    },
    groups: [{ id: "inputs", title: "Inputs", fields }],
  };
}

describe("ModuleInputWorkspace", () => {
  it("renders the module header, group title, and every field kind generically", () => {
    render(
      <ModuleInputWorkspace
        view={view([
          quantityDefaultField,
          enumManualField,
          booleanWorkflowField,
          linkedField,
          unsupportedField,
        ])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Thrust check" }),
    ).toBeInTheDocument();
    expect(screen.getByText("example-scaffold@0.1.0")).toBeInTheDocument();
    expect(screen.getByText("Inputs")).toBeInTheDocument();

    expect(screen.getByLabelText("Payload mass")).toBeInTheDocument();
    expect(
      screen.getByText("Total moving mass carried by the axis."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Payload mass unit")).toBeInTheDocument();
    expect(screen.getAllByText("Not set")).toHaveLength(2);
    expect(screen.queryByText("Default")).not.toBeInTheDocument();

    expect(screen.getByLabelText("Axis orientation")).toHaveValue("vertical");
    expect(screen.getByText("Manual")).toBeInTheDocument();
    expect(screen.getByText("Normal load case")).toBeInTheDocument();

    expect(screen.getByLabelText("Holding brake present")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.getByText("Workflow")).toBeInTheDocument();

    expect(screen.getByText("Linked")).toBeInTheDocument();
    expect(screen.getByText(/Linked from a module output/)).toBeInTheDocument();

    expect(
      screen.getByText(/Editing vector quantity values is not supported yet/),
    ).toBeInTheDocument();

    // The header's own single Save/Run pair, not one per field.
    expect(screen.getAllByRole("button", { name: "Save" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Run" })).toHaveLength(1);
  });

  it("renders 'Default' (not 'Not set') for an unset field with a real registry constant", () => {
    const gravityField: ModuleInputFieldView = {
      ...quantityDefaultField,
      portKey: "gravity",
      parameterId: "motion.axis.gravity",
      label: "Gravitational acceleration",
      hasBuiltInDefault: true,
    };
    render(
      <ModuleInputWorkspace
        view={view([gravityField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(screen.getByText("Default")).toBeInTheDocument();
    expect(screen.queryByText("Not set")).not.toBeInTheDocument();
  });

  it("renders a stored canonical length in its selected display unit", () => {
    render(
      <ModuleInputWorkspace
        view={view([lengthManualField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(screen.getByLabelText("Stroke")).toHaveValue(500);
    expect(screen.getByLabelText("Stroke unit")).toHaveValue("mm");
  });

  it("does not round a stored quantity while preparing its display magnitude", () => {
    render(
      <ModuleInputWorkspace
        view={view([fractionalLengthManualField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(screen.getByLabelText("Stroke")).toHaveValue(123.456789);
    expect(screen.getByLabelText("Stroke unit")).toHaveValue("mm");
  });

  it("renders a stored canonical temperature in its selected affine display unit", () => {
    render(
      <ModuleInputWorkspace
        view={view([temperatureManualField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(screen.getByLabelText("Ambient temperature")).toHaveValue(25);
    expect(screen.getByLabelText("Ambient temperature unit")).toHaveValue(
      "degC",
    );
  });

  it("submits every field through the single Save button", async () => {
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={view([quantityDefaultField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    await user.type(screen.getByLabelText("Payload mass"), "12");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(saveModuleInputsAction).toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows Save's error message near the header on failure", async () => {
    vi.mocked(saveModuleInputsAction).mockResolvedValueOnce({
      status: "error",
      message: "Enter a numeric value.",
    });
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={view([quantityDefaultField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    await user.type(screen.getByLabelText("Payload mass"), "12");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter a numeric value.",
    );
  });

  it("previews via Run without calling Save, and lifts the successful computation", async () => {
    const preview: ModulePreviewView = {
      outputs: [
        {
          portKey: "result",
          parameterId: "motion.axis.thrust_force",
          label: "Thrust force",
          value: { v: 1, kind: "quantity", value: 12, unit: "N" },
          loadCase: null,
        },
      ],
      checks: [],
      warnings: [],
      validity: [],
      trace: null,
      sources: [],
    };
    vi.mocked(previewModuleComputationAction).mockResolvedValueOnce({
      status: "success",
      preview,
    });
    const onPreviewChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={view([lengthManualField])}
        onPreviewChange={onPreviewChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Run" }));

    expect(previewModuleComputationAction).toHaveBeenCalled();
    expect(saveModuleInputsAction).not.toHaveBeenCalled();
    expect(onPreviewChange).toHaveBeenCalledWith(preview);
  });

  it("shows Run's error message near the header on a failed preview", async () => {
    vi.mocked(previewModuleComputationAction).mockResolvedValueOnce({
      status: "error",
      message: 'Input "thrust_force_in" is linked to a stale upstream result.',
    });
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={view([lengthManualField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Run" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "stale upstream result",
    );
  });

  it("clears the lifted preview once Save succeeds", async () => {
    const onPreviewChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={view([lengthManualField])}
        onPreviewChange={onPreviewChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onPreviewChange).toHaveBeenCalledWith(null);
  });

  it("disables Run while a required field is incomplete, and names it in the tooltip", () => {
    render(
      <ModuleInputWorkspace
        view={view([quantityDefaultField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    const runButton = screen.getByRole("button", { name: "Run" });
    expect(runButton).toBeDisabled();
    expect(runButton.closest("span")).toHaveAttribute(
      "title",
      "Missing required inputs: Payload mass",
    );
  });

  it("enables Run once every required field is complete", async () => {
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={view([quantityDefaultField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    await user.type(screen.getByLabelText("Payload mass"), "12");

    expect(screen.getByRole("button", { name: "Run" })).not.toBeDisabled();
  });

  it("treats an already-saved required field as complete immediately, without typing", () => {
    render(
      <ModuleInputWorkspace
        view={view([lengthManualField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(screen.getByRole("button", { name: "Run" })).not.toBeDisabled();
  });

  it("treats a required linked field as satisfying Run regardless of its own link's run status", () => {
    render(
      <ModuleInputWorkspace
        view={view([{ ...linkedField, linkedSourceStatus: "not_run" }])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(screen.getByRole("button", { name: "Run" })).not.toBeDisabled();
  });

  it("shows a link suggestion behind the meatball menu and confirms it on request", async () => {
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={view([fieldWithSuggestion])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(
      screen.queryByText("Use Payload mass 12 kg from Machine — Normal load case?"),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Suggested source for Payload mass/ }),
    );

    expect(
      screen.getByText(
        "Use Payload mass 12 kg from Machine — Normal load case?",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View source" }));
    expect(screen.getByText("motion.axis.payload_mass")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(confirmSuggestedLinkAction).toHaveBeenCalled();
  });

  it("dismisses a suggestion without calling the confirm action", async () => {
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={view([fieldWithSuggestion])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /Suggested source for Payload mass/ }),
    );
    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(
      screen.queryByRole("button", { name: /Suggested source for Payload mass/ }),
    ).not.toBeInTheDocument();
    expect(confirmSuggestedLinkAction).not.toHaveBeenCalled();
  });

  it("states the downstream stale-impact count before removing a confirmed link", async () => {
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={view([linkedField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(screen.queryByText(/will mark/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove link" }));

    expect(
      screen.getByText("Removing this link will mark 2 other modules stale."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm removal" }));
    expect(removeParameterLinkAction).toHaveBeenCalled();
  });

  it("warns when a linked field's module-output source has not been run yet", () => {
    const notRunField: ModuleInputFieldView = {
      ...linkedField,
      linkedSourceStatus: "not_run",
    };
    render(
      <ModuleInputWorkspace
        view={view([notRunField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(
      screen.getByText(
        "Source module has not been run yet — run it, then run this module again.",
      ),
    ).toBeInTheDocument();
  });

  it("warns when a linked field's module-output source's latest run is stale", () => {
    const staleField: ModuleInputFieldView = {
      ...linkedField,
      linkedSourceStatus: "stale",
    };
    render(
      <ModuleInputWorkspace
        view={view([staleField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(
      screen.getByText(
        "Source module's latest run is stale — re-run it, then run this module again.",
      ),
    ).toBeInTheDocument();
  });

  it("shows no source warning for a linked field whose source is ready", () => {
    const readyField: ModuleInputFieldView = {
      ...linkedField,
      linkedSourceStatus: "ready",
    };
    render(
      <ModuleInputWorkspace
        view={view([readyField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(
      screen.queryByText(/has not been run yet|latest run is stale/),
    ).not.toBeInTheDocument();
  });

  it("renders a stored axis-frame vector in its selected display unit, per component", () => {
    render(
      <ModuleInputWorkspace
        view={view([vectorManualField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(
      screen.getByLabelText("Center-of-mass offset X (travel direction)"),
    ).toHaveValue(50);
    expect(
      screen.getByLabelText("Center-of-mass offset Y (transverse)"),
    ).toHaveValue(0);
    expect(screen.getByLabelText("Center-of-mass offset Z")).toHaveValue(-20);
    expect(screen.getByLabelText("Center-of-mass offset unit")).toHaveValue(
      "mm",
    );

    expect(screen.getByText("X")).toBeInTheDocument();
    expect(screen.getByText("Y")).toBeInTheDocument();
    expect(screen.getByText("Z")).toBeInTheDocument();
  });

  it("renders empty component inputs for a vector field with no current value", () => {
    render(
      <ModuleInputWorkspace
        view={view([vectorDefaultField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(
      screen.getByLabelText("External process force X (travel direction)"),
    ).toHaveValue(null);
    expect(
      screen.getByLabelText("External process force Y (transverse)"),
    ).toHaveValue(null);
    expect(screen.getByLabelText("External process force Z")).toHaveValue(null);
  });

  it("submits a vector field's three components and the shared unit", async () => {
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={view([vectorManualField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(saveModuleInputsAction).toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not submit a required vector field while a component is left blank (native validation)", async () => {
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={view([vectorDefaultField, lengthManualField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    await user.type(
      screen.getByLabelText("External process force X (travel direction)"),
      "10",
    );
    // Y and Z stay blank; the field is required, so the browser blocks
    // submission before the Server Action is ever called.
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(saveModuleInputsAction).not.toHaveBeenCalled();
  });

  it("keeps Run disabled while a required vector field has an incomplete component", async () => {
    const user = userEvent.setup();
    render(
      <ModuleInputWorkspace
        view={view([vectorDefaultField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    await user.type(
      screen.getByLabelText("External process force X (travel direction)"),
      "10",
    );
    await user.type(
      screen.getByLabelText("External process force Y (transverse)"),
      "20",
    );
    expect(screen.getByRole("button", { name: "Run" })).toBeDisabled();

    await user.type(
      screen.getByLabelText("External process force Z"),
      "30",
    );
    expect(screen.getByRole("button", { name: "Run" })).not.toBeDisabled();
  });

  it("renders a disabled field's control non-interactive and omits its link-suggestion menu, without blocking the header's Save/Run", () => {
    render(
      <ModuleInputWorkspace
        view={view([disabledFieldWithSuggestion])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(screen.getByRole("spinbutton")).toBeDisabled();
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /Suggested source/ }),
    ).not.toBeInTheDocument();
    // Excluded from the required check (design doc: "not disabled"), so Run
    // is not blocked by this field despite it being required.
    expect(screen.getByRole("button", { name: "Run" })).not.toBeDisabled();
  });

  it("renders a non-disabled field's control interactive", () => {
    render(
      <ModuleInputWorkspace
        view={view([enumManualField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(screen.getByRole("combobox")).not.toBeDisabled();
  });

  it("renders the bento grid when the module declares belt-pulley's exact four group ids, including a reserved motion-profile-chart placeholder", () => {
    const bentoView: ModuleWorkspaceView = {
      moduleInstance: {
        id: "m1" as never,
        assemblyId: "a1" as never,
        configurationId: "c1" as never,
        label: "Belt drive",
        modulePackageId: "belt-pulley-drive-motor-sizing",
        moduleVersion: "0.3.1",
        category: "motor-sizing.belt-pulley-drive",
        lastRunStatus: "pass",
      },
      groups: [
        {
          id: "geometry-and-environment",
          title: "Geometry and environment",
          fields: [quantityDefaultField],
        },
        {
          id: "pulleys-and-belt",
          title: "Pulleys, belt, and drive",
          fields: [lengthManualField],
        },
        { id: "motion", title: "Motion cycle", fields: [enumManualField] },
        {
          id: "motor-and-safety-factors",
          title: "Candidate motor and safety factors",
          fields: [booleanWorkflowField],
        },
      ],
    };

    render(
      <ModuleInputWorkspace view={bentoView} onPreviewChange={noopOnPreviewChange} />,
    );

    expect(
      screen.getByRole("heading", { name: "Geometry and environment" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Pulleys, belt, and drive" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Motion cycle" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Candidate motor and safety factors",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Motion profile chart")).toBeInTheDocument();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });

  it("falls back to the plain stacked layout when a module's groups don't match belt-pulley's exact four ids", () => {
    render(
      <ModuleInputWorkspace
        view={view([quantityDefaultField, enumManualField])}
        onPreviewChange={noopOnPreviewChange}
      />,
    );

    expect(screen.queryByText("Motion profile chart")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the file**

Run: `npx vitest run "components/engineering/module-input-workspace.test.tsx"`
Expected: all tests pass. If the Radix `DropdownMenu` requires
`ResizeObserver`/`PointerEvent` polyfills under jsdom that this repo's test
setup doesn't already provide, check `vitest.setup.ts` (or equivalent) for
existing polyfills used by other Radix-based component tests
(`app-bar.test.tsx` already renders a `DropdownMenu` under the same jsdom
environment, so the setup should already cover this — if it doesn't, mirror
whatever `app-bar.test.tsx` relies on).

- [ ] **Step 3: Commit**

```bash
git add components/engineering/module-input-workspace.test.tsx
git commit -m "test: update module-input-workspace tests for the single-form save/run redesign"
```

---

## Task 10: `ModuleResultPanel` — remove Run, add the preview banner

**Files:**
- Modify: `components/engineering/module-result-panel.tsx`

- [ ] **Step 1: Update imports and remove `RunButton`**

Replace the import block (lines 1-25) with:

```tsx
"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, ChevronRight, Play, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { StatusBadge } from "./status-badge";
import { EmptyState } from "./empty-state";
import { formatEngineeringValue } from "./format-engineering-value";
import { LoadCaseChip } from "./load-case-chip";
import { formatQuantity } from "@/lib/engine/units";
import type {
  CalculationTrace,
  CheckResult,
  EngineeringValue,
  TraceNode,
  ValidityResult,
  Warning,
} from "@/lib/engine";
import type {
  ModulePreviewView,
  ModuleResultView,
  RunOutputView,
  SourceReferenceView,
} from "@/lib/application";
import { cn } from "@/lib/utils";

export interface ModuleResultPanelProps {
  readonly view: ModuleResultView;
  /** The live, unpersisted preview from a Run click in the sibling `ModuleInputWorkspace` (lifted via `WorkspaceShell`). `null` when there is none showing. */
  readonly preview: ModulePreviewView | null;
}
```

Delete the entire `RunButton` function (originally lines 38-65, from `function RunButton(` through its closing `}`).

- [ ] **Step 2: Slice `OutputSummary`, `CheckTable`, and `WarningsPanel`'s props**

Replace:

```tsx
function OutputSummary({ view }: { readonly view: ModuleResultView }) {
  if (view.outputs.length === 0) {
```

with:

```tsx
function OutputSummary({
  outputs,
}: {
  readonly outputs: readonly RunOutputView[];
}) {
  if (outputs.length === 0) {
```

and inside that function, replace `view.outputs.map` with `outputs.map`
(the rest of the function body is unchanged).

Replace:

```tsx
function CheckTable({ view }: { readonly view: ModuleResultView }) {
  if (view.checks.length === 0) {
```

with:

```tsx
function CheckTable({
  checks,
}: {
  readonly checks: readonly CheckResult[];
}) {
  if (checks.length === 0) {
```

and inside, replace `view.checks.map` with `checks.map` (rest unchanged).

Replace:

```tsx
function WarningsPanel({ view }: { readonly view: ModuleResultView }) {
  const outOfEnvelope = view.validity.filter(
    (v) => v.status !== "within_limits",
  );
  if (view.warnings.length === 0 && outOfEnvelope.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {view.warnings.map((warning) => (
```

with:

```tsx
function WarningsPanel({
  warnings,
  validity,
}: {
  readonly warnings: readonly Warning[];
  readonly validity: readonly ValidityResult[];
}) {
  const outOfEnvelope = validity.filter((v) => v.status !== "within_limits");
  if (warnings.length === 0 && outOfEnvelope.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {warnings.map((warning) => (
```

(the rest of `WarningsPanel`'s body — the `outOfEnvelope.map(...)` block —
is unchanged).

`ComparisonSection`, `TraceOperandList`, `TraceNodeItem`,
`SourceReferencesList`, `ResultSection`, and `StaleBanner` are unchanged.

- [ ] **Step 3: Rewrite the main component**

Replace the entire `ModuleResultPanel` function (from its doc comment
through its closing `}`) with:

```tsx
/**
 * The generic result and trace renderer (Unit 3.5, redesigned 2026-08-27 —
 * see docs/superpowers/specs/2026-08-27-module-workspace-save-run-redesign-
 * design.md). Renders one of three states: never run (`view.run === null`
 * and no `preview`), a persisted `CalculationRun` (`view`, unchanged from
 * before this redesign), or a live, unpersisted preview (`preview`, from a
 * Run click in the sibling `ModuleInputWorkspace`) with a visible "not
 * saved" banner. The "Run module" trigger this panel used to own moved to
 * `ModuleInputWorkspace`'s action bar in this redesign — this file no
 * longer imports any Server Action.
 */
export function ModuleResultPanel({ view, preview }: ModuleResultPanelProps) {
  const active = preview ?? view;
  const hasContent = preview !== null || view.run !== null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 pb-8">
      <header className="flex items-center gap-3 border-b border-border-default pb-3">
        <h1 className="text-[16px] font-semibold text-text-primary">Result</h1>
        <StatusBadge status={view.run?.status ?? "not_configured"} />
        {view.run !== null ? (
          <span className="text-[12px] text-text-muted">
            {view.run.createdAt.toLocaleString()}
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <a
            href={`/workspace/report?module=${encodeURIComponent(view.moduleInstance.id)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border-default px-2.5 py-1.5 text-[13px] font-medium text-text-primary hover:bg-surface-hover"
          >
            <Printer aria-hidden="true" className="h-3.5 w-3.5" />
            Report
          </a>
        </div>
      </header>

      {view.run?.stale === true && preview === null ? (
        <StaleBanner reason={view.run.staleReason} />
      ) : null}

      {!hasContent ? (
        <EmptyState
          compact
          icon={Play}
          title="Not run yet"
          description="Click Run in the header above to preview this module's result from its current inputs."
        />
      ) : (
        <>
          {preview !== null ? (
            <div
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-[13px]"
              style={{
                borderColor: "var(--state-neutral)",
                color: "var(--state-neutral)",
              }}
            >
              <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>Preview — not saved. Click Save to keep this result.</span>
            </div>
          ) : null}

          <ResultSection title="Output summary">
            <OutputSummary outputs={active.outputs} />
          </ResultSection>

          {preview === null && view.comparison !== null ? (
            <ResultSection title="Previous-run comparison">
              <ComparisonSection view={view} />
            </ResultSection>
          ) : null}

          <ResultSection title="Checks">
            <CheckTable checks={active.checks} />
          </ResultSection>

          <WarningsPanel warnings={active.warnings} validity={active.validity} />

          <ResultSection title="Calculation trace">
            <div className="flex flex-col">
              {active.trace?.sections.map((section) => (
                <TraceNodeItem
                  key={`${section.node}-${section.id}`}
                  node={section}
                  depth={0}
                />
              ))}
            </div>
          </ResultSection>

          <ResultSection title="Source references">
            <SourceReferencesList sources={active.sources} />
          </ResultSection>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: fails only in `module-result-panel.test.tsx` and
`workspace-shell.tsx` (not yet updated).

- [ ] **Step 5: Commit**

```bash
git add components/engineering/module-result-panel.tsx
git commit -m "feat: remove Run from ModuleResultPanel, add a live-preview display state"
```

---

## Task 11: Update `module-result-panel.test.tsx`

**Files:**
- Modify: `components/engineering/module-result-panel.test.tsx`

- [ ] **Step 1: Drop the Server Action mock, add `preview: null` to every existing render, and update the empty-state test**

Replace lines 1-26 (imports through the `beforeEach` block) with:

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModuleResultPanel } from "./module-result-panel";
import type {
  CalculationTrace,
  CheckResult,
  EngineeringValue,
  Warning,
} from "@/lib/engine";
import type { ModulePreviewView, ModuleResultView } from "@/lib/application";
```

(This drops the `vi.mock("@/app/(workspace)/workspace/actions", ...)` block
and its `beforeEach` entirely — `module-result-panel.tsx` no longer imports
any Server Action, so there is nothing left to mock.)

Update the `view()` helper's signature (unchanged body) — no change needed,
it already returns a plain `ModuleResultView`.

For every existing `render(<ModuleResultPanel view={...} />)` call in the
file, add `preview={null}` — e.g. the first one becomes:

```tsx
render(
  <ModuleResultPanel
    view={view({ run: null, outputs: [], checks: [], trace: null })}
    preview={null}
  />,
);
```

Apply the same `preview={null}` addition to every other `render(<ModuleResultPanel ... />)`
call in the file (there are 13 more — one per `it(...)` block below the
first).

Update the "Not run yet" test's expected description text to match the new
copy:

```tsx
it("renders the empty state and no output/check content when never run", () => {
  render(
    <ModuleResultPanel
      view={view({ run: null, outputs: [], checks: [], trace: null })}
      preview={null}
    />,
  );

  expect(screen.getByText("Not run yet")).toBeInTheDocument();
  expect(
    screen.getByText(
      "Click Run in the header above to preview this module's result from its current inputs.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByText("Not configured")).toBeInTheDocument();
  expect(screen.queryByText("Output summary")).not.toBeInTheDocument();
  expect(screen.queryByText("Checks")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Remove the two Run-button tests**

Delete the `it("runs the module instance when Run is clicked", ...)` and
`it("shows the action's error message when running fails", ...)` blocks near
the end of the file (they test behavior that moved to
`module-input-workspace.test.tsx` in Task 9) — including their now-unused
`userEvent` setup if nothing else in the file needs it (check: the trace
expand test also uses `userEvent`, so keep the import).

- [ ] **Step 3: Add preview-rendering tests**

Add these at the end of the `describe("ModuleResultPanel", ...)` block:

```tsx
  it("renders the live preview instead of the persisted run, with its banner", () => {
    const preview: ModulePreviewView = {
      outputs: [
        {
          portKey: "thrust_force_out",
          parameterId: "motion.axis.thrust_force",
          label: "Thrust force",
          value: { v: 1, kind: "quantity", value: 99, unit: "N" },
          loadCase: null,
        },
      ],
      checks: [],
      warnings: [],
      validity: [],
      trace: null,
      sources: [],
    };

    render(<ModuleResultPanel view={view()} preview={preview} />);

    expect(
      screen.getByText("Preview — not saved. Click Save to keep this result."),
    ).toBeInTheDocument();
    expect(screen.getByText("99 N")).toBeInTheDocument();
    // The persisted run's own comparison section is hidden while previewing.
    expect(
      screen.queryByText("Previous-run comparison"),
    ).not.toBeInTheDocument();
  });

  it("shows a live preview even when the module instance has never been run", () => {
    const preview: ModulePreviewView = {
      outputs: [],
      checks: [],
      warnings: [],
      validity: [],
      trace: null,
      sources: [],
    };

    render(
      <ModuleResultPanel
        view={view({ run: null, outputs: [], checks: [], trace: null })}
        preview={preview}
      />,
    );

    expect(screen.queryByText("Not run yet")).not.toBeInTheDocument();
    expect(
      screen.getByText("Preview — not saved. Click Save to keep this result."),
    ).toBeInTheDocument();
  });

  it("suppresses the persisted run's stale banner while a live preview is showing", () => {
    render(
      <ModuleResultPanel
        view={{
          ...view(),
          run: {
            id: "run1" as never,
            status: "pass",
            criticalMargin: null,
            stale: true,
            staleReason: "Upstream input changed.",
            createdAt: new Date("2026-07-31T12:00:00Z"),
          },
        }}
        preview={{
          outputs: [],
          checks: [],
          warnings: [],
          validity: [],
          trace: null,
          sources: [],
        }}
      />,
    );

    expect(screen.queryByText("Upstream input changed.")).not.toBeInTheDocument();
  });
```

- [ ] **Step 4: Run the file**

Run: `npx vitest run "components/engineering/module-result-panel.test.tsx"`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/engineering/module-result-panel.test.tsx
git commit -m "test: update module-result-panel tests for the removed Run button and new preview state"
```

---

## Task 12: `WorkspaceShell` — lift the preview between the two panels

**Files:**
- Modify: `components/engineering/workspace-shell.tsx`

**Note:** this file is not named in the design doc's own file list, but its
own architecture (`ModuleInputWorkspace` and `ModuleResultPanel` rendered as
siblings, not nested) makes this wiring a required consequence of the design,
not an independent scope addition.

- [ ] **Step 1: Add the lifted preview state**

In `components/engineering/workspace-shell.tsx`, add to the `@/lib/application`
type-only import (currently lines 26-34):

```ts
import type {
  BomView,
  ComponentAssignmentPanelView,
  BaselineWorkspaceView,
  ModulePreviewView,
  ModuleResultView,
  ModuleWorkspaceView,
  RequirementsView,
  WorkflowInstanceView,
} from "@/lib/application";
```

Replace the top of `WorkspaceShell`'s body (currently just
`const [navigatorCollapsed, setNavigatorCollapsed] = useState(false);`) with:

```ts
export function WorkspaceShell(props: WorkspaceShellProps) {
  const [navigatorCollapsed, setNavigatorCollapsed] = useState(false);
  const [preview, setPreview] = useState<ModulePreviewView | null>(null);

  // A preview belongs to one module instance's current form. Selecting a
  // different module (or navigating away and back) must not carry a stale
  // preview over onto whatever renders next — the same "adjust state during
  // render when a prop changes" pattern DeleteModuleInstanceDialog already
  // uses for its own seenStatus tracking.
  const selectedModuleInstanceId =
    props.status === "loaded" ? props.selectedModuleInstanceId : null;
  const [seenModuleInstanceId, setSeenModuleInstanceId] = useState(
    selectedModuleInstanceId,
  );
  if (selectedModuleInstanceId !== seenModuleInstanceId) {
    setSeenModuleInstanceId(selectedModuleInstanceId);
    setPreview(null);
  }

  const selectedConfiguration =
```

(The `const selectedConfiguration = ...` line already exists right after —
just make sure the new block is inserted before it, not duplicated.)

- [ ] **Step 2: Wire the two panels**

Replace:

```tsx
          {props.status === "loaded" && props.moduleWorkspace !== null ? (
            <div className="flex w-full flex-col">
              <ModuleInputWorkspace view={props.moduleWorkspace} />
              {props.moduleResult !== null ? (
                <ModuleResultPanel view={props.moduleResult} />
              ) : null}
```

with:

```tsx
          {props.status === "loaded" && props.moduleWorkspace !== null ? (
            <div className="flex w-full flex-col">
              <ModuleInputWorkspace
                view={props.moduleWorkspace}
                onPreviewChange={setPreview}
              />
              {props.moduleResult !== null ? (
                <ModuleResultPanel view={props.moduleResult} preview={preview} />
              ) : null}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: fails only in `workspace-shell.test.tsx` (not yet updated).

- [ ] **Step 4: Commit**

```bash
git add components/engineering/workspace-shell.tsx
git commit -m "feat: lift the module preview between ModuleInputWorkspace and ModuleResultPanel"
```

---

## Task 13: Update `workspace-shell.test.tsx`

**Files:**
- Modify: `components/engineering/workspace-shell.test.tsx`

- [ ] **Step 1: Update the actions mock**

Replace:

```ts
  addModuleInstanceAction: vi.fn(),
  setModuleInputValueAction: vi.fn(),
  confirmSuggestedLinkAction: vi.fn(),
  removeParameterLinkAction: vi.fn(),
  runModuleInstanceAction: vi.fn(),
  assignComponentAction: vi.fn(),
```

with:

```ts
  addModuleInstanceAction: vi.fn(),
  saveModuleInputsAction: vi.fn(),
  previewModuleComputationAction: vi.fn(),
  confirmSuggestedLinkAction: vi.fn(),
  removeParameterLinkAction: vi.fn(),
  assignComponentAction: vi.fn(),
```

- [ ] **Step 2: Run the whole file**

Run: `npx vitest run "components/engineering/workspace-shell.test.tsx"`
Expected: all tests pass unchanged (this file only renders the module
workspace/result panel together, it does not click Save/Run).

- [ ] **Step 3: Commit**

```bash
git add components/engineering/workspace-shell.test.tsx
git commit -m "test: update workspace-shell's action mocks for the renamed module workspace actions"
```

---

## Task 14: Repo-wide verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm no remaining reference to the removed actions or component**

Run: `grep -rn "setModuleInputValueAction\|runModuleInstanceAction\|LinkSuggestionPanel\b" --include="*.ts" --include="*.tsx" app components lib`
Expected: no matches (a match in a comment inside a doc file under `context/`
or `docs/` is fine and out of scope for this grep's directories; this command
already excludes those).

- [ ] **Step 2: Full verification suite**

Run: `npm run verify`
Expected: `format:check`, `lint`, `typecheck`, `test`, and `build` all pass.
If the DB-gated tests in Task 4/6 are skipped on this machine (no
`DATABASE_URL`), that is expected and does not fail the suite — confirm the
skip is reported, not a hidden failure.

- [ ] **Step 3: Manual smoke check (only if a dev server can be started)**

Run: `npm run dev`, open `/workspace`, select a module instance with at
least one required field. Confirm: (a) Run is disabled with a tooltip
listing the missing field; (b) typing a value enables Run; (c) clicking Run
shows a "Preview — not saved" banner with fresh numbers, without a page
reload; (d) clicking Save persists the values, clears the banner, and shows
the real result with the same numbers; (e) the ⋮ menu on a field with
suggestions opens a dropdown with Confirm/View source/Dismiss, and confirming
one removes its editor in favor of the "Linked from …" notice. If the dev
server cannot authenticate (per this repo's known Clerk/TLS environment
notes in `context/progress-tracker.md`), skip this step and say so
explicitly rather than claiming it was verified.

- [ ] **Step 4: No commit for this task** — it is verification only. If Step
2 or 3 finds a defect, fix it as a normal edit to the relevant file from an
earlier task and commit that fix on its own.

---

## Task 15: Documentation updates

**Files:**
- Modify: `context/ui-context.md`
- Modify: `context/progress-tracker.md`

Required by `ai-workflow-rules.md`'s Documentation Synchronization rule
("UI patterns" is explicitly listed) and the design doc's own
"Documentation to update" section.

- [ ] **Step 1: Update `context/ui-context.md`'s "Generic Module Workspace" section**

Insert a new paragraph immediately after the existing "Update (2026-08-05):
`vector_quantity` editing is no longer universally deferred." paragraph
(before the "Implemented (Unit 3.5, Result pane ...)" paragraph):

```markdown
**Update (2026-08-27): Save/Run redesign — one form, a preview Run, and a
suggestion menu.** `ModuleInputWorkspace` now wraps every field in every
group in one `<form>`, with a sticky header holding two submit buttons:
`Run` (`previewModuleComputationAction`, backed by the new
`previewModuleComputation` application service) computes from the form's
current values — typed or not yet saved — and shows the result without
writing anything; `Save` (`saveModuleInputsAction`) persists every field's
current value via unchanged `setParameterValue`, then executes and persists
a real `CalculationRun` via unchanged `executeModuleInstance`, both in one
action. `Run` is disabled, with a tooltip naming what's missing, until every
required, non-disabled, non-unsupported field either has a non-empty
client-tracked value or is satisfied by a confirmed link (regardless of that
link's own run status) — tracked by a small client-side completeness map,
seeded from each field's server-resolved value on mount. The old
per-field `setModuleInputValueAction` and the old bare `runModuleInstanceAction`
are both removed. The always-visible "Suggested sources" box (Unit 3.4) is
replaced by a small ⋮ menu next to a non-linked field's label — see "Link
Suggestions" below.
```

Update the "Implemented (Unit 3.5, Result pane ...)" paragraph's sentence
"Also owns the "Run module" trigger both Unit 3.3 and Unit 3.4 deferred here
(`runModuleInstanceAction`, thin glue over unchanged `executeModuleInstance`,
Unit 2.4)." — replace it with:

```markdown
The "Run module" trigger this pane used to own moved to
`ModuleInputWorkspace`'s action bar in the 2026-08-27 save/run redesign (see
above): `ModuleResultPanel` no longer imports any Server Action, and instead
gains a third display state, "Preview" (an unpersisted `ModulePreviewView`
from a Run click, shown with a "not saved" banner) alongside "never run" and
"showing the last saved run".
```

- [ ] **Step 2: Update the "Link Suggestions" section**

Insert a new paragraph after the existing "**Implemented (Unit 3.4 —
...)**" paragraph and before the "A field with an already-confirmed link
instead renders..." paragraph:

```markdown
**Update (2026-08-27):** the always-visible "Suggested sources" box read as
unexplained clutter in practice (founder feedback while using the
workspace). It is replaced by a small ⋮ icon button placed right after the
field's label/required-tag/source-badge row, opening a Radix `DropdownMenu`
listing the same rows (`LinkSuggestionMenu`, `link-suggestion-panel.tsx`) —
renders nothing when there are no suggestions, same as the box it replaces,
and carries no suggestion-count badge on the trigger itself (a plain icon,
per founder preference). Underlying behavior — Confirm, View source,
Dismiss — is unchanged.
```

- [ ] **Step 3: Update `context/progress-tracker.md`**

The file's real, established convention (despite its own stated "under
~150 lines" aspiration) is a single, ever-extended "Last updated:" paragraph
at the top (starting at line 12), with each shipped unit added as its own
bolded, dated clause — e.g. the existing "**2026-08-27:
`dual-rod-cylinder-sizing@0.1.0` is fully released and registered — the
fourth Milestone 7 module ...**" clause around line 335. Add one more clause
in that same style, appended after the `dual-rod-cylinder-sizing` clause and
before whatever clause currently ends the paragraph:

```markdown
**2026-08-27: the generic module input workspace's Save/Run model is
redesigned** — `ModuleInputWorkspace` is now one `<form>` with a `Run`
(preview, no persistence, `previewModuleComputation`) and `Save` (persists
every field plus a real `CalculationRun`, `saveModuleInputsAction`) pair in
its header, replacing the old one-`<form>`-per-field
`setModuleInputValueAction` and the separate bare `runModuleInstanceAction`
(both removed); the always-visible "Suggested sources" box is replaced by a
⋮ menu. Founder-directed UI fix, not a validated-calculation change — touches
only the generic module workspace, `app/(workspace)/workspace/actions.ts`,
and one new `lib/application/calculations/` service; no change to
`dual-rod-cylinder-sizing` or any other module package. Full design:
`docs/superpowers/specs/2026-08-27-module-workspace-save-run-redesign-design.md`.
```

- [ ] **Step 4: Commit**

```bash
git add context/ui-context.md context/progress-tracker.md
git commit -m "docs: describe the module workspace save/run redesign and suggestion menu"
```
