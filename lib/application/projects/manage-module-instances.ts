// `renameModuleInstanceLabel`, `archiveModuleInstance`, and
// `previewArchiveModuleInstanceImpact` (module-instance-management design,
// docs/superpowers/specs/2026-08-13-module-instance-management-design.md).
// Bundled the way manage-assemblies.ts bundles its own related use cases.

import "server-only";
import { z } from "zod";
import {
  archiveModuleInstance as archiveModuleInstanceRow,
  listModuleInstancesLinkedFromSource,
  loadModuleInstanceForOwner,
  renameModuleInstance as renameModuleInstanceRow,
  type ModuleInstanceId,
  type UserId,
} from "@/lib/db";

/** Machine-readable classification of a module-instance-management failure. */
export type ManageModuleInstanceErrorCode =
  "invalid_input" | "unauthorized" | "not_found";

/** A failed module-instance-management outcome. */
export interface ManageModuleInstanceError {
  readonly code: ManageModuleInstanceErrorCode;
  readonly message: string;
}

const labelSchema = z
  .string()
  .trim()
  .min(1, "Module label is required.")
  .max(200);

/** Result of {@link renameModuleInstanceLabel}. */
export type RenameModuleInstanceResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: ManageModuleInstanceError };

/** Renames a module instance owned by `ownerId`. */
export async function renameModuleInstanceLabel(
  moduleInstanceId: ModuleInstanceId,
  label: string,
  ownerId: UserId,
): Promise<RenameModuleInstanceResult> {
  const labelResult = labelSchema.safeParse(label);
  if (!labelResult.success) {
    return {
      ok: false,
      error: { code: "invalid_input", message: "Module label is required." },
    };
  }
  const renamed = await renameModuleInstanceRow(
    moduleInstanceId,
    ownerId,
    labelResult.data,
  );
  if (!renamed) {
    return {
      ok: false,
      error: {
        code: "not_found",
        message: "Module instance not found or not owned by this user.",
      },
    };
  }
  return { ok: true };
}

/** Result of {@link archiveModuleInstance}. */
export type ArchiveModuleInstanceResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: ManageModuleInstanceError };

/** Archives (hides, never deletes) a module instance owned by `ownerId`. */
export async function archiveModuleInstance(
  moduleInstanceId: ModuleInstanceId,
  ownerId: UserId,
): Promise<ArchiveModuleInstanceResult> {
  const archived = await archiveModuleInstanceRow(moduleInstanceId, ownerId);
  if (!archived) {
    return {
      ok: false,
      error: {
        code: "not_found",
        message:
          "Module instance not found, not owned by this user, or already archived.",
      },
    };
  }
  return { ok: true };
}

/** What archiving a module instance would affect, shown before the founder confirms. */
export interface ArchiveModuleInstanceImpactPreview {
  /** Labels of other module instances that link from this one's own outputs. Archiving does not remove these links. */
  readonly dependentModuleInstanceLabels: readonly string[];
  /** Whether this instance currently fills a role in a workflow instance. */
  readonly attachedToWorkflow: boolean;
}

/** Result of {@link previewArchiveModuleInstanceImpact}. */
export type PreviewArchiveModuleInstanceImpactResult =
  | { readonly ok: true; readonly preview: ArchiveModuleInstanceImpactPreview }
  | { readonly ok: false; readonly error: ManageModuleInstanceError };

/**
 * Read-only preview of what archiving `moduleInstanceId` would leave
 * depending on it — shown before the founder confirms
 * (module-instance-management design "Archive (Remove)"). Archiving deletes
 * nothing, so this never reports anything as becoming stale.
 */
export async function previewArchiveModuleInstanceImpact(
  moduleInstanceId: ModuleInstanceId,
  ownerId: UserId,
): Promise<PreviewArchiveModuleInstanceImpactResult> {
  const context = await loadModuleInstanceForOwner(moduleInstanceId, ownerId);
  if (context === null) {
    return {
      ok: false,
      error: {
        code: "unauthorized",
        message: "Module instance not found or not owned by this user.",
      },
    };
  }
  const dependents = await listModuleInstancesLinkedFromSource(
    moduleInstanceId,
    ownerId,
  );
  return {
    ok: true,
    preview: {
      dependentModuleInstanceLabels: dependents.map(
        (dependent) => dependent.label,
      ),
      attachedToWorkflow: context.moduleInstance.workflowInstanceId !== null,
    },
  };
}
