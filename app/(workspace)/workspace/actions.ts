"use server";

// Server Actions backing the workspace's mutation forms. Each action:
// authorizes via Clerk, parses FormData, calls exactly one application
// service, and maps its typed result to the ActionState shape
// `useActionState` renders inline (context/code-standards.md "Next.js":
// "Server Actions follow the same validation and ownership rules as API
// routes"). Real validation and ownership checks live in the application
// services (lib/application/projects/) — these functions are glue only.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
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
import {
  asAssemblyId,
  asCalculationRunId,
  asMachineConfigurationId,
  asMachineProjectId,
  asManufacturerPartRevisionId,
  asModuleInstanceId,
  asParameterLinkId,
  asRequirementId,
  asUserId,
  asWorkflowInstanceId,
  resolveModuleInputs,
  type ParameterNodeKind,
} from "@/lib/db";
import { engineeringValuesClose, type EngineeringValue } from "@/lib/engine";
import type { ActionState, ModulePreviewActionState } from "./action-state";
import {
  isSkippableBlankField,
  parseLoadCase,
  parseSubmittedField,
  submittedPortKeys,
  type SubmittedFieldParseResult,
} from "./parse-submitted-field";

function fieldValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Creates a project (with its initial configuration) and selects it. */
export async function createProjectAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth.protect();
  const result = await createMachineProject(
    {
      name: fieldValue(formData, "name"),
      marketProfileKey: fieldValue(formData, "marketProfileKey"),
    },
    asUserId(userId),
  );
  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }
  redirect(`/workspace?project=${encodeURIComponent(result.project.id)}`);
}

/** Renames the active project. */
export async function renameProjectAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth.protect();
  const result = await renameMachineProject(
    asMachineProjectId(fieldValue(formData, "projectId")),
    fieldValue(formData, "name"),
    asUserId(userId),
  );
  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }
  revalidatePath("/workspace");
  return { status: "success" };
}

/** Creates an assembly (root, or nested under `parentId` when given). */
export async function createAssemblyAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth.protect();
  const parentIdRaw = fieldValue(formData, "parentId");
  const result = await createMachineAssembly(
    {
      configurationId: asMachineConfigurationId(
        fieldValue(formData, "configurationId"),
      ),
      ...(parentIdRaw.length > 0
        ? { parentId: asAssemblyId(parentIdRaw) }
        : {}),
      name: fieldValue(formData, "name"),
    },
    asUserId(userId),
  );
  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }
  revalidatePath("/workspace");
  return { status: "success" };
}

/** Renames an assembly. */
export async function renameAssemblyAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth.protect();
  const result = await renameMachineAssembly(
    asAssemblyId(fieldValue(formData, "assemblyId")),
    fieldValue(formData, "name"),
    asUserId(userId),
  );
  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }
  revalidatePath("/workspace");
  return { status: "success" };
}

export async function renameModuleInstanceAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth.protect();
  const result = await renameModuleInstanceLabel(
    asModuleInstanceId(fieldValue(formData, "moduleInstanceId")),
    fieldValue(formData, "name"),
    asUserId(userId),
  );
  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }
  revalidatePath("/workspace");
  return { status: "success" };
}

/**
 * Kept for the archived-module data model (`archivedAt`,
 * `listModuleInstancesForWorkflowInstance`'s own exclusion filter) even
 * though the navigator's own module row no longer offers an "Archive"
 * action (replaced by permanent delete — see `deleteModuleInstanceAction`
 * below) — not dead UI plumbing, just currently unreferenced from a form.
 */
export async function archiveModuleInstanceAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth.protect();
  const result = await archiveModuleInstance(
    asModuleInstanceId(fieldValue(formData, "moduleInstanceId")),
    asUserId(userId),
  );
  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }
  revalidatePath("/workspace");
  return { status: "success" };
}

/**
 * Not a `useActionState` form action like the others in this file — called
 * directly from `ArchiveModuleInstanceDialog` as a plain async function when
 * it opens, since the impact preview is a read, not a form submission.
 */
export async function previewArchiveModuleInstanceImpactAction(
  moduleInstanceId: string,
): Promise<
  | {
      readonly ok: true;
      readonly dependentModuleInstanceLabels: readonly string[];
      readonly attachedToWorkflow: boolean;
    }
  | { readonly ok: false; readonly message: string }
> {
  const { userId } = await auth.protect();
  const result = await previewArchiveModuleInstanceImpact(
    asModuleInstanceId(moduleInstanceId),
    asUserId(userId),
  );
  if (!result.ok) {
    return { ok: false, message: result.error.message };
  }
  return {
    ok: true,
    dependentModuleInstanceLabels: result.preview.dependentModuleInstanceLabels,
    attachedToWorkflow: result.preview.attachedToWorkflow,
  };
}

export async function deleteModuleInstanceAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth.protect();
  const result = await deleteModuleInstance(
    asModuleInstanceId(fieldValue(formData, "moduleInstanceId")),
    asUserId(userId),
  );
  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }
  revalidatePath("/workspace");
  return { status: "success" };
}

/**
 * Not a `useActionState` form action like the others in this file — called
 * directly from `DeleteModuleInstanceDialog` as a plain async function when
 * it opens, since the impact preview is a read, not a form submission.
 */
export async function previewDeleteModuleInstanceImpactAction(
  moduleInstanceId: string,
): Promise<
  | {
      readonly ok: true;
      readonly dependentModuleInstanceLabels: readonly string[];
      readonly attachedToWorkflow: boolean;
    }
  | { readonly ok: false; readonly message: string }
> {
  const { userId } = await auth.protect();
  const result = await previewDeleteModuleInstanceImpact(
    asModuleInstanceId(moduleInstanceId),
    asUserId(userId),
  );
  if (!result.ok) {
    return { ok: false, message: result.error.message };
  }
  return {
    ok: true,
    dependentModuleInstanceLabels: result.preview.dependentModuleInstanceLabels,
    attachedToWorkflow: result.preview.attachedToWorkflow,
  };
}

/**
 * Saves every editable field's current form value and executes a real,
 * persisted `CalculationRun` in one action (module workspace save/run
 * redesign, 2026-08-27) — the single commit point that replaces the old
 * one-Save-per-field flow (`setModuleInputValueAction`) plus a separate bare
 * Run click (`runModuleInstanceAction`, both removed by this change).
 * `submittedPortKeys` enumerates exactly the ports the client rendered an
 * editable control for (`fields.<portKey>.valueKind`) — a linked, disabled,
 * or unsupported port never appears there, so nothing extra needs skipping
 * here.
 *
 * Every submitted field's *currently resolved* source/value is looked up
 * first (`resolveModuleInputs`, the same resolver `previewModuleComputation`
 * and `executeModuleInstance` already use) so a workflow-provided field the
 * user never actually touched can be recognized and skipped, rather than
 * unconditionally written as `source: "manual"`. Before this check existed,
 * a single Save on a guided-workflow module — even with no field edited —
 * silently reclassified every workflow-provided value as manual (their
 * submitted value always equals the resolved one, but `source: "manual"`
 * never equals the stored `source: "workflow"`, so `setParameterValue`'s own
 * no-op guard, which compares both source and value, never actually treated
 * it as a no-op), severing the workflow's own provenance and marking every
 * downstream run and component assignment stale. A field whose submitted
 * value genuinely differs from what's currently resolved is still written as
 * `source: "manual"` — a real, intentional override — exactly as before.
 * Two sequential existing calls (`setParameterValue`, `executeModuleInstance`),
 * not one new cross-field transaction — see the design doc's "Non-goals".
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

  const portKeys = submittedPortKeys(formData).filter(
    (portKey) => !isSkippableBlankField(formData, portKey),
  );
  const parsedFields: Extract<SubmittedFieldParseResult, { ok: true }>[] = [];
  for (const portKey of portKeys) {
    const parsed = parseSubmittedField(formData, portKey);
    if (!parsed.ok) {
      return { status: "error", message: parsed.message };
    }
    parsedFields.push(parsed);
  }

  const resolved = await resolveModuleInputs(
    moduleInstanceId,
    ownerId,
    parsedFields.map((field) => ({
      parameterId: field.parameterId,
      ...(field.loadCase !== undefined ? { loadCase: field.loadCase } : {}),
    })),
  );
  if (resolved === null) {
    return {
      status: "error",
      message: "Module instance not found or not owned by this user.",
    };
  }

  for (let i = 0; i < parsedFields.length; i++) {
    const field = parsedFields[i];
    const current = resolved[i].resolved;
    if (
      current.source === "workflow" &&
      engineeringValuesClose(current.value, field.value)
    ) {
      continue;
    }
    const result = await setParameterValue(
      {
        configurationId,
        moduleInstanceId,
        nodeKind: "module_input",
        parameterId: field.parameterId,
        ...(field.loadCase !== undefined ? { loadCase: field.loadCase } : {}),
        source: "manual",
        value: field.value,
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
    if (isSkippableBlankField(formData, portKey)) {
      continue;
    }
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

/**
 * Adds a module instance to an assembly, from the registered module list.
 * `workflowInstanceId` is optional and blank-means-omit, the same
 * "blank hidden/select field means omit" convention `createAssemblyAction`'s
 * `parentId` already uses — when present, this is how a module instance
 * actually comes to fill a guided workflow's role (Unit 4.9's
 * `addModuleInstance` extension), reusing this one form/action rather than a
 * workflow-specific add path.
 */
export async function addModuleInstanceAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth.protect();

  // The <select> submits one combined "id@version" value (module ids are
  // kebab-case and never contain "@"; module versions are semver, e.g.
  // "0.1.0"), so splitting on the first "@" recovers both fields without a
  // second hidden input kept in sync by client-side script.
  const modulePackageKey = fieldValue(formData, "modulePackageKey");
  const separatorIndex = modulePackageKey.indexOf("@");
  const modulePackageId =
    separatorIndex === -1
      ? modulePackageKey
      : modulePackageKey.slice(0, separatorIndex);
  const moduleVersion =
    separatorIndex === -1 ? "" : modulePackageKey.slice(separatorIndex + 1);

  const workflowInstanceIdRaw = fieldValue(formData, "workflowInstanceId");

  const result = await addModuleInstance(
    {
      assemblyId: asAssemblyId(fieldValue(formData, "assemblyId")),
      configurationId: asMachineConfigurationId(
        fieldValue(formData, "configurationId"),
      ),
      modulePackageId,
      moduleVersion,
      label: fieldValue(formData, "label"),
      ...(workflowInstanceIdRaw.length > 0
        ? { workflowInstanceId: asWorkflowInstanceId(workflowInstanceIdRaw) }
        : {}),
    },
    asUserId(userId),
  );
  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }
  revalidatePath("/workspace");
  return { status: "success" };
}

/**
 * Starts a guided workflow instance for the active configuration, from the
 * registered workflow-definition list (`listWorkflowDefinitions`), and
 * redirects into its own deep link — the same "redirect to the thing just
 * created" pattern `createProjectAction` already uses. `workflowKey` reuses
 * `addModuleInstanceAction`'s own "one combined id@version <select> value"
 * convention (workflow ids are kebab-case and never contain "@"; versions
 * are semver).
 */
export async function startWorkflowInstanceAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth.protect();

  const workflowKey = fieldValue(formData, "workflowKey");
  const separatorIndex = workflowKey.indexOf("@");
  const workflowId =
    separatorIndex === -1 ? workflowKey : workflowKey.slice(0, separatorIndex);
  const workflowVersion =
    separatorIndex === -1 ? "" : workflowKey.slice(separatorIndex + 1);

  const projectId = fieldValue(formData, "projectId");
  const configurationId = fieldValue(formData, "configurationId");

  const result = await startWorkflowInstance(
    {
      configurationId: asMachineConfigurationId(configurationId),
      workflowId,
      workflowVersion,
    },
    asUserId(userId),
  );
  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }
  redirect(
    `/workspace?project=${encodeURIComponent(projectId)}&configuration=${encodeURIComponent(configurationId)}&workflow=${encodeURIComponent(result.workflowInstance.id)}`,
  );
}

const SOURCE_KINDS: readonly ParameterNodeKind[] = [
  "machine_requirement",
  "assembly_parameter",
  "workflow_parameter",
  "module_output",
];

/** Parses a link source's node kind, rejecting anything a suggestion could never carry. */
function parseSourceKind(raw: string): ParameterNodeKind | undefined {
  return (SOURCE_KINDS as readonly string[]).includes(raw)
    ? (raw as ParameterNodeKind)
    : undefined;
}

/**
 * Confirms a link suggestion (Unit 3.4's "Confirm" action). Thin glue only —
 * every hidden field mirrors a `LinkSuggestionSourceView` the read model
 * already produced, and `confirmParameterLink` (Unit 2.5) is the sole
 * authority that re-validates ownership, port existence, and semantic
 * compatibility before writing; nothing here is trusted on its own.
 */
export async function confirmSuggestedLinkAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth.protect();

  const sourceKind = parseSourceKind(fieldValue(formData, "sourceKind"));
  if (sourceKind === undefined) {
    return { status: "error", message: "Unrecognized link source kind." };
  }
  const sourceModuleInstanceId = fieldValue(formData, "sourceModuleInstanceId");
  const sourceAssemblyId = fieldValue(formData, "sourceAssemblyId");
  const sourceLoadCase = parseLoadCase(fieldValue(formData, "sourceLoadCase"));
  const targetLoadCase = parseLoadCase(fieldValue(formData, "targetLoadCase"));

  const result = await confirmParameterLink(
    {
      configurationId: asMachineConfigurationId(
        fieldValue(formData, "configurationId"),
      ),
      targetModuleInstanceId: asModuleInstanceId(
        fieldValue(formData, "targetModuleInstanceId"),
      ),
      targetParameterId: fieldValue(formData, "targetParameterId"),
      ...(targetLoadCase !== undefined ? { targetLoadCase } : {}),
      sourceKind,
      ...(sourceModuleInstanceId.length > 0
        ? { sourceModuleInstanceId: asModuleInstanceId(sourceModuleInstanceId) }
        : {}),
      ...(sourceAssemblyId.length > 0
        ? { sourceAssemblyId: asAssemblyId(sourceAssemblyId) }
        : {}),
      sourceParameterId: fieldValue(formData, "sourceParameterId"),
      ...(sourceLoadCase !== undefined ? { sourceLoadCase } : {}),
    },
    asUserId(userId),
  );
  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }
  revalidatePath("/workspace");
  return { status: "success" };
}

/**
 * Removes a confirmed link (Unit 3.4). The UI is expected to have already
 * shown the removal's downstream stale impact (`ModuleInputFieldView.
 * linkRemovalImpact`) before this submits — the confirmation itself, not a
 * second server round trip.
 */
export async function removeParameterLinkAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth.protect();
  const result = await removeParameterLink(
    asParameterLinkId(fieldValue(formData, "linkId")),
    asUserId(userId),
  );
  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }
  revalidatePath("/workspace");
  return { status: "success" };
}

/** Parses a positive integer quantity field, defaulting to 1 when absent. */
function parseQuantity(raw: string): number | undefined {
  if (raw.trim().length === 0) return undefined;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
}

/**
 * Assigns a manufacturer catalog part, or a manual/custom part, to a module
 * instance (Unit 3.6's "Assign and manual-part actions"). Thin glue only —
 * `assignComponent` (Unit 2.8) is the sole authority that authorizes the
 * target, cross-checks the supporting calculation run against it, and
 * verifies the part revision exists; nothing submitted here is trusted on
 * its own. `partSource` picks which of the two payloads is read, matching the
 * discriminated `AssignComponentInput` the service already declares.
 */
export async function assignComponentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth.protect();

  const partSource = fieldValue(formData, "partSource");
  if (partSource !== "catalog" && partSource !== "manual") {
    return {
      status: "error",
      message: "Select a catalog part or a manual part.",
    };
  }

  const quantity = parseQuantity(fieldValue(formData, "quantity"));
  if (Number.isNaN(quantity)) {
    return {
      status: "error",
      message: "Quantity must be a whole number greater than zero.",
    };
  }

  const calculationRunId = fieldValue(formData, "calculationRunId");
  if (calculationRunId.length === 0) {
    return {
      status: "error",
      message:
        "Run this module before assigning a part — a calculated component needs a supporting run.",
    };
  }

  let partFields: Parameters<typeof assignComponent>[0];
  const common = {
    configurationId: asMachineConfigurationId(
      fieldValue(formData, "configurationId"),
    ),
    target: {
      kind: "module_instance" as const,
      moduleInstanceId: asModuleInstanceId(
        fieldValue(formData, "moduleInstanceId"),
      ),
    },
    calculationRunId: asCalculationRunId(calculationRunId),
    ...(quantity !== undefined ? { quantity } : {}),
  };

  if (partSource === "catalog") {
    const revisionId = fieldValue(formData, "manufacturerPartRevisionId");
    if (revisionId.length === 0) {
      return {
        status: "error",
        message: "Select a manufacturer part to assign.",
      };
    }
    partFields = {
      ...common,
      partSource: "catalog",
      manufacturerPartRevisionId: asManufacturerPartRevisionId(revisionId),
    };
  } else {
    const description = fieldValue(formData, "description").trim();
    if (description.length === 0) {
      return {
        status: "error",
        message: "Describe the manual or custom part.",
      };
    }
    const manufacturerName = fieldValue(formData, "manufacturerName").trim();
    const partNumber = fieldValue(formData, "partNumber").trim();
    const notes = fieldValue(formData, "notes").trim();
    partFields = {
      ...common,
      partSource: "manual",
      manualPartDetails: {
        description,
        ...(manufacturerName.length > 0 ? { manufacturerName } : {}),
        ...(partNumber.length > 0 ? { partNumber } : {}),
        ...(notes.length > 0 ? { notes } : {}),
      },
    };
  }

  const result = await assignComponent(partFields, asUserId(userId));
  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }
  revalidatePath("/workspace");
  return { status: "success" };
}

/**
 * Records a requirement (Unit 3.7's "Requirement editor"). An empty
 * `assemblyId` field means machine-level, the same "blank hidden/select
 * field means omit" convention `createAssemblyAction`'s `parentId` already
 * uses.
 */
export async function createRequirementAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth.protect();
  const assemblyIdRaw = fieldValue(formData, "assemblyId");
  const result = await createMachineRequirement(
    {
      configurationId: asMachineConfigurationId(
        fieldValue(formData, "configurationId"),
      ),
      ...(assemblyIdRaw.length > 0
        ? { assemblyId: asAssemblyId(assemblyIdRaw) }
        : {}),
      code: fieldValue(formData, "code"),
      statement: fieldValue(formData, "statement"),
    },
    asUserId(userId),
  );
  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }
  revalidatePath("/workspace");
  return { status: "success" };
}

/** Adds an acceptance criterion to a requirement (Unit 3.7). */
export async function createAcceptanceCriterionAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth.protect();
  const result = await createRequirementAcceptanceCriterion(
    {
      requirementId: asRequirementId(fieldValue(formData, "requirementId")),
      statement: fieldValue(formData, "statement"),
    },
    asUserId(userId),
  );
  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }
  revalidatePath("/workspace");
  return { status: "success" };
}

/** Records a design assumption (Unit 3.7's "Assumption register"). */
export async function createDesignAssumptionAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth.protect();
  const assemblyIdRaw = fieldValue(formData, "assemblyId");
  const rationale = fieldValue(formData, "rationale");
  const result = await createMachineDesignAssumption(
    {
      configurationId: asMachineConfigurationId(
        fieldValue(formData, "configurationId"),
      ),
      ...(assemblyIdRaw.length > 0
        ? { assemblyId: asAssemblyId(assemblyIdRaw) }
        : {}),
      statement: fieldValue(formData, "statement"),
      ...(rationale.length > 0 ? { rationale } : {}),
    },
    asUserId(userId),
  );
  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }
  revalidatePath("/workspace");
  return { status: "success" };
}

/** Records a load case (Unit 3.7's "Load-case table"). Reuses `parseLoadCase`. */
export async function createLoadCaseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth.protect();
  const category = parseLoadCase(fieldValue(formData, "category"));
  if (category === undefined) {
    return { status: "error", message: "Select a valid load-case category." };
  }
  const description = fieldValue(formData, "description");
  const result = await createMachineLoadCase(
    {
      configurationId: asMachineConfigurationId(
        fieldValue(formData, "configurationId"),
      ),
      category,
      label: fieldValue(formData, "label"),
      ...(description.length > 0 ? { description } : {}),
    },
    asUserId(userId),
  );
  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }
  revalidatePath("/workspace");
  return { status: "success" };
}

/** Creates an immutable configuration baseline after the service's atomic readiness review. */
export async function createBaselineAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth.protect();
  const result = await createBaseline(
    {
      configurationId: asMachineConfigurationId(
        fieldValue(formData, "configurationId"),
      ),
      label: fieldValue(formData, "label"),
      acknowledgeWarnings:
        fieldValue(formData, "acknowledgeWarnings") === "true",
    },
    asUserId(userId),
  );
  if (!result.ok) {
    // The advisory readiness view may have become stale between the initial
    // render and this atomic service check. Refresh it so newly found
    // blockers and their acknowledgement control appear without a manual
    // page reload.
    if (result.error.code === "not_ready") {
      revalidatePath("/workspace");
    }
    return { status: "error", message: result.error.message };
  }
  revalidatePath("/workspace");
  return { status: "success" };
}

/**
 * Permanently deletes the caller's own account and everything they own
 * (Unit 5.5). `confirmationPhrase` is re-validated server-side by
 * `deleteAccount` itself, not trusted from the client — see that service's
 * own doc comment. On success, redirects to `/account-deleted`, a public
 * route outside `(workspace)` (mirrors createProjectAction's own
 * redirect-to-the-outcome pattern), since after this call the caller's
 * `MachineProject` rows (and, in a race, possibly their `User` row) no
 * longer exist for `/workspace` to load.
 */
export async function deleteAccountAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth.protect();
  const result = await deleteAccount(
    asUserId(userId),
    fieldValue(formData, "confirmationPhrase"),
  );
  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }
  redirect("/account-deleted");
}
