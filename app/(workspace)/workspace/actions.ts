"use server";

// Server Actions backing Unit 3.2's create/rename/add-module forms. Each
// action: authorize via Clerk, parse FormData, call exactly one application
// service, and map its typed result to the ActionState shape
// `useActionState` renders inline (context/code-standards.md "Next.js":
// "Server Actions follow the same validation and ownership rules as API
// routes"). Real validation and ownership checks live in the application
// services (lib/application/projects/) — these functions are glue only.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  addModuleInstance,
  confirmParameterLink,
  createMachineAssembly,
  createMachineProject,
  executeModuleInstance,
  removeParameterLink,
  renameMachineAssembly,
  renameMachineProject,
  setParameterValue,
} from "@/lib/application";
import {
  asAssemblyId,
  asMachineConfigurationId,
  asMachineProjectId,
  asModuleInstanceId,
  asParameterLinkId,
  asUserId,
  type ParameterNodeKind,
} from "@/lib/db";
import {
  SERIALIZATION_FORMAT_VERSION,
  convert,
  getParameter,
  makeQuantity,
  type EngineeringValue,
  type LoadCaseCategory,
} from "@/lib/engine";
import type { ActionState } from "./action-state";

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
      configurationId: asMachineConfigurationId(fieldValue(formData, "configurationId")),
      ...(parentIdRaw.length > 0 ? { parentId: asAssemblyId(parentIdRaw) } : {}),
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

const LOAD_CASE_CATEGORIES = ["normal", "peak", "holding", "emergency_stop"] as const;

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
      return { status: "error", message: "This parameter has no canonical unit." };
    }
    const magnitude = Number(fieldValue(formData, "magnitude"));
    if (!Number.isFinite(magnitude)) {
      return { status: "error", message: "Enter a numeric value." };
    }
    const unit = fieldValue(formData, "unit") || definition.canonicalUnit;
    try {
      value = makeQuantity(
        convert(magnitude, unit, definition.canonicalUnit),
        definition.canonicalUnit,
        unit,
      );
    } catch {
      return { status: "error", message: `Unit "${unit}" is not valid for this value.` };
    }
  } else if (valueKind === "enum") {
    if (definition.enumId === undefined) {
      return { status: "error", message: "This parameter is not an enumeration." };
    }
    const option = fieldValue(formData, "option");
    if (!(definition.enumOptions ?? []).includes(option)) {
      return { status: "error", message: "Select a valid option." };
    }
    value = { v: SERIALIZATION_FORMAT_VERSION, kind: "enum", enumId: definition.enumId, value: option };
  } else if (valueKind === "boolean") {
    value = {
      v: SERIALIZATION_FORMAT_VERSION,
      kind: "boolean",
      value: fieldValue(formData, "checked") === "true",
    };
  } else {
    return { status: "error", message: `Unsupported value kind "${valueKind}".` };
  }

  const loadCase = parseLoadCase(fieldValue(formData, "loadCase"));
  const result = await setParameterValue(
    {
      configurationId: asMachineConfigurationId(fieldValue(formData, "configurationId")),
      moduleInstanceId: asModuleInstanceId(fieldValue(formData, "moduleInstanceId")),
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
    moduleInstanceId: asModuleInstanceId(fieldValue(formData, "moduleInstanceId")),
    ownerId: asUserId(userId),
  });
  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }
  revalidatePath("/workspace");
  return { status: "success" };
}

/** Adds a module instance to an assembly, from the registered module list. */
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
    separatorIndex === -1 ? modulePackageKey : modulePackageKey.slice(0, separatorIndex);
  const moduleVersion =
    separatorIndex === -1 ? "" : modulePackageKey.slice(separatorIndex + 1);

  const result = await addModuleInstance(
    {
      assemblyId: asAssemblyId(fieldValue(formData, "assemblyId")),
      configurationId: asMachineConfigurationId(fieldValue(formData, "configurationId")),
      modulePackageId,
      moduleVersion,
      label: fieldValue(formData, "label"),
    },
    asUserId(userId),
  );
  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }
  revalidatePath("/workspace");
  return { status: "success" };
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
      configurationId: asMachineConfigurationId(fieldValue(formData, "configurationId")),
      targetModuleInstanceId: asModuleInstanceId(fieldValue(formData, "targetModuleInstanceId")),
      targetParameterId: fieldValue(formData, "targetParameterId"),
      ...(targetLoadCase !== undefined ? { targetLoadCase } : {}),
      sourceKind,
      ...(sourceModuleInstanceId.length > 0
        ? { sourceModuleInstanceId: asModuleInstanceId(sourceModuleInstanceId) }
        : {}),
      ...(sourceAssemblyId.length > 0 ? { sourceAssemblyId: asAssemblyId(sourceAssemblyId) } : {}),
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
