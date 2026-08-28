// Coverage for saveModuleInputsAction's "vector_quantity" branch (the
// axis-frame vector-quantity input editor's save path — Task 3 of
// docs/design/vector-quantity-input-editor.md
// "Save path"). This is the one file in app/(workspace)/workspace that had
// no dedicated test coverage at all before this: every other test that
// touches this action (components/engineering/*.test.tsx) fully mocks the
// whole "./actions" module out, and parseSubmittedVector's own tests
// (parse-submitted-vector.test.ts) only ever receive the literal "axis"
// this action passes in — they have no way to independently exercise a
// *mismatched* registry frame. So parseSubmittedField's own
// `definition.frame !== "axis"` guard — the actual defense against a
// tampered `valueKind=vector_quantity` submission landing a mis-framed
// vector on a parameter whose real frame differs (see the guard's comment
// in parse-submitted-field.ts) — was otherwise backed by nothing but that
// comment.
//
// This exercises the real saveModuleInputsAction end to end against the
// real released parameter registry (lib/engine/parameters/definitions.ts),
// mocking only its three real dependencies: Clerk's auth.protect(),
// next/cache's revalidatePath (a no-op outside a real request scope — it
// throws "Invariant: static generation store missing" otherwise), and the
// two lib/db and lib/application seams setParameterValue and
// executeModuleInstance are the only exercised exports of. Every "as*"
// id-branding helper mocked from "@/lib/db"
// reproduces its real identity-at-runtime behavior
// (lib/db/repositories/types.ts) rather than pulling in the real module,
// which loads the Prisma client (lib/db/client.ts) and requires a live
// DATABASE_URL — exactly what every other application-layer test in this
// repo avoids via `describe.skipIf(!liveDatabaseAvailable)` (see
// tests/live-database.ts). setParameterValue's own write behavior is
// already fully covered live in
// lib/application/parameters/stale-propagation.test.ts; this file tests
// only the glue in front of it.

import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@clerk/nextjs/server", () => ({
  auth: { protect: mockAuthProtect },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// redirect() throws internally in real Next.js to short-circuit rendering;
// this mock instead just records its call so
// startWorkflowInstanceAction's own success path can be asserted directly
// (no existing test in this codebase exercises the throw-based real
// behavior — see createProjectAction, which has no dedicated test either).
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

// Every "as*" helper is identity at runtime (lib/db/repositories/types.ts:
// "The `as*` helpers are ... identity at runtime"); this mock reproduces
// that instead of importing the real module, which constructs a Prisma
// client requiring a live DATABASE_URL.
vi.mock("@/lib/db", () => ({
  asAssemblyId: (id: string) => id,
  asCalculationRunId: (id: string) => id,
  asMachineConfigurationId: (id: string) => id,
  asMachineProjectId: (id: string) => id,
  asManufacturerPartRevisionId: (id: string) => id,
  asModuleInstanceId: (id: string) => id,
  asParameterLinkId: (id: string) => id,
  asRequirementId: (id: string) => id,
  asUserId: (id: string) => id,
  asWorkflowInstanceId: (id: string) => id,
}));

// saveModuleInputsAction, startWorkflowInstanceAction, and
// deleteAccountAction are the only actions under test in this file;
// setParameterValue, executeModuleInstance, startWorkflowInstance, and
// deleteAccount are the only "@/lib/application" exports they call — every
// other named export actions.ts imports from that module backs a different
// action not exercised by this file.
vi.mock("@/lib/application", () => ({
  setParameterValue: mockSetParameterValue,
  executeModuleInstance: mockExecuteModuleInstance,
  startWorkflowInstance: mockStartWorkflowInstance,
  deleteAccount: mockDeleteAccount,
}));

import {
  saveModuleInputsAction,
  startWorkflowInstanceAction,
  deleteAccountAction,
} from "./actions";
import { IDLE_ACTION_STATE } from "./action-state";
import { SERIALIZATION_FORMAT_VERSION } from "@/lib/engine";

function buildFormData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

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
    // no declared `frame` (defaults to "none" per
    // lib/engine/parameters/define.ts's `frame: spec.frame ?? "none"`). A
    // tampered request could still submit valueKind=vector_quantity against
    // it; the shared parser must re-derive the registry's real frame rather
    // than trust the client's claim.
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
    // parameter with frame: "axis" and canonicalUnit "m"
    // (lib/engine/parameters/definitions.ts), and carries no loadCases
    // restriction, so no loadCase field is needed.
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

// startWorkflowInstanceAction (Unit 4.9's generic UI surface): the "id@version
// <select> value" splitting logic mirrors addModuleInstanceAction's own
// modulePackageKey convention, and is otherwise untested anywhere else —
// component tests (machine-navigator.test.tsx, start-workflow-instance-
// dialog.test.tsx) mock this whole module out, the same way they mock every
// other action.
describe("startWorkflowInstanceAction", () => {
  beforeEach(() => {
    mockAuthProtect.mockReset();
    mockAuthProtect.mockResolvedValue({ userId: "test-user-1" });
    mockStartWorkflowInstance.mockReset();
    mockRedirect.mockReset();
  });

  function buildFormData(fields: Record<string, string>): FormData {
    const data = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      data.set(key, value);
    }
    return data;
  }

  it("splits the combined workflowKey and redirects into the new instance's own deep link on success", async () => {
    mockStartWorkflowInstance.mockResolvedValue({
      ok: true,
      workflowInstance: { id: "wf1", configurationId: "cfg-1" },
    });

    await startWorkflowInstanceAction(
      IDLE_ACTION_STATE,
      buildFormData({
        projectId: "proj-1",
        configurationId: "cfg-1",
        workflowKey: "linear-axis@1.0.0",
      }),
    );

    expect(mockStartWorkflowInstance).toHaveBeenCalledWith(
      {
        configurationId: "cfg-1",
        workflowId: "linear-axis",
        workflowVersion: "1.0.0",
      },
      "test-user-1",
    );
    expect(mockRedirect).toHaveBeenCalledWith(
      "/workspace?project=proj-1&configuration=cfg-1&workflow=wf1",
    );
  });

  it("returns the service's error message and does not redirect on failure", async () => {
    mockStartWorkflowInstance.mockResolvedValue({
      ok: false,
      error: {
        code: "workflow_not_found",
        message: 'Workflow "bad@1.0.0" is not registered.',
      },
    });

    const result = await startWorkflowInstanceAction(
      IDLE_ACTION_STATE,
      buildFormData({
        projectId: "proj-1",
        configurationId: "cfg-1",
        workflowKey: "bad@1.0.0",
      }),
    );

    expect(result).toEqual({
      status: "error",
      message: 'Workflow "bad@1.0.0" is not registered.',
    });
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});

describe("deleteAccountAction", () => {
  beforeEach(() => {
    mockAuthProtect.mockReset();
    mockAuthProtect.mockResolvedValue({ userId: "test-user-1" });
    mockDeleteAccount.mockReset();
    mockRedirect.mockReset();
  });

  it("passes the typed confirmation phrase through and redirects to /account-deleted on success", async () => {
    mockDeleteAccount.mockResolvedValue({ ok: true });

    await deleteAccountAction(
      IDLE_ACTION_STATE,
      buildFormData({ confirmationPhrase: "DELETE MY ACCOUNT" }),
    );

    expect(mockDeleteAccount).toHaveBeenCalledWith(
      "test-user-1",
      "DELETE MY ACCOUNT",
    );
    expect(mockRedirect).toHaveBeenCalledWith("/account-deleted");
  });

  it("returns the service's error message and does not redirect when the confirmation phrase is wrong", async () => {
    mockDeleteAccount.mockResolvedValue({
      ok: false,
      error: {
        code: "confirmation_mismatch",
        message: 'Type "DELETE MY ACCOUNT" exactly to confirm.',
      },
    });

    const result = await deleteAccountAction(
      IDLE_ACTION_STATE,
      buildFormData({ confirmationPhrase: "delete my account" }),
    );

    expect(result).toEqual({
      status: "error",
      message: 'Type "DELETE MY ACCOUNT" exactly to confirm.',
    });
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
