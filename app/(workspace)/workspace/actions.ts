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
  assignComponent,
  confirmParameterLink,
  createMachineAssembly,
  createBaseline,
  createMachineDesignAssumption,
  createMachineLoadCase,
  createMachineProject,
  createMachineRequirement,
  createRequirementAcceptanceCriterion,
  executeModuleInstance,
  removeParameterLink,
  renameMachineAssembly,
  renameMachineProject,
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
  type ParameterNodeKind,
} from "@/lib/db";
import {
  SERIALIZATION_FORMAT_VERSION,
  getParameter,
  type EngineeringValue,
  type LoadCaseCategory,
} from "@/lib/engine";
import type { ActionState } from "./action-state";
import { parseSubmittedQuantity } from "./parse-submitted-quantity";
import { parseSubmittedVector } from "./parse-submitted-vector";

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

const LOAD_CASE_CATEGORIES = [
  "normal",
  "peak",
  "holding",
  "emergency_stop",
] as const;

/** Parses a load-case field, ignoring anything outside the declared set. */
function parseLoadCase(raw: string): LoadCaseCategory | undefined {
  return (LOAD_CASE_CATEGORIES as readonly string[]).includes(raw)
    ? (raw as LoadCaseCategory)
    : undefined;
}

/**
 * Sets a manual value on one module input port (Unit 3.3's generic input
 * renderer). Thin glue only: this file's job is turning `FormData` into a
 * validated `EngineeringValue` in the parameter's canonical unit — the write
 * itself, ownership, and stale propagation are entirely
 * `setParameterValue`'s (Unit 2.5), reused unchanged. The canonical unit and
 * enum/option set are re-derived here from the released parameter registry
 * rather than trusted from the form, since a client-supplied unit or enum id
 * would otherwise let a tampered request store a value the registry does not
 * actually describe.
 */
export async function setModuleInputValueAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth.protect();

  const parameterId = fieldValue(formData, "parameterId");
  const definition = getParameter(parameterId);
  if (definition === undefined) {
    return { status: "error", message: `Unknown parameter "${parameterId}".` };
  }

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
    // (context/modules/axis-load-cases/stage-1-spec.md).
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
    if (definition.enumId === undefined) {
      return {
        status: "error",
        message: "This parameter is not an enumeration.",
      };
    }
    const option = fieldValue(formData, "option");
    if (!(definition.enumOptions ?? []).includes(option)) {
      return { status: "error", message: "Select a valid option." };
    }
    value = {
      v: SERIALIZATION_FORMAT_VERSION,
      kind: "enum",
      enumId: definition.enumId,
      value: option,
    };
  } else if (valueKind === "boolean") {
    value = {
      v: SERIALIZATION_FORMAT_VERSION,
      kind: "boolean",
      value: fieldValue(formData, "checked") === "true",
    };
  } else {
    return {
      status: "error",
      message: `Unsupported value kind "${valueKind}".`,
    };
  }

  const loadCase = parseLoadCase(fieldValue(formData, "loadCase"));
  const result = await setParameterValue(
    {
      configurationId: asMachineConfigurationId(
        fieldValue(formData, "configurationId"),
      ),
      moduleInstanceId: asModuleInstanceId(
        fieldValue(formData, "moduleInstanceId"),
      ),
      nodeKind: "module_input",
      parameterId,
      ...(loadCase !== undefined ? { loadCase } : {}),
      source: "manual",
      value,
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
 * Runs a module instance (Unit 3.5's Result pane "Run" action). Thin glue
 * only — `executeModuleInstance` (Unit 2.4) does the actual authorization,
 * input resolution, compute, and persistence; this just turns its typed
 * result into the `ActionState` shape `useActionState` renders. Its
 * `stale_upstream` error surfaces exactly the message the service already
 * composed (which upstream module needs re-running), not a generic one.
 */
export async function runModuleInstanceAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth.protect();
  const result = await executeModuleInstance({
    moduleInstanceId: asModuleInstanceId(
      fieldValue(formData, "moduleInstanceId"),
    ),
    ownerId: asUserId(userId),
  });
  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }
  revalidatePath("/workspace");
  return { status: "success" };
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
