// The `addModuleInstance` use case (Unit 3.2).

import "server-only";
import { z } from "zod";
import { getModulePackage } from "@/lib/modules";
import {
  createModuleInstance,
  loadAssemblyForOwner,
  type AssemblyId,
  type MachineConfigurationId,
  type ModuleInstanceRecord,
  type UserId,
} from "@/lib/db";

/** Machine-readable classification of an {@link addModuleInstance} failure. */
export type AddModuleInstanceErrorCode = "invalid_input" | "unauthorized" | "module_not_found";

/** A failed {@link addModuleInstance} outcome. */
export interface AddModuleInstanceError {
  readonly code: AddModuleInstanceErrorCode;
  readonly message: string;
}

/** Input to {@link addModuleInstance}. */
export interface AddModuleInstanceInput {
  readonly assemblyId: AssemblyId;
  readonly configurationId: MachineConfigurationId;
  readonly modulePackageId: string;
  readonly moduleVersion: string;
  readonly label: string;
}

/** Result of {@link addModuleInstance}. */
export type AddModuleInstanceResult =
  | { readonly ok: true; readonly moduleInstance: ModuleInstanceRecord }
  | { readonly ok: false; readonly error: AddModuleInstanceError };

const labelSchema = z.string().trim().min(1, "Module label is required.").max(200);

/**
 * Adds a module instance to an assembly, from a module package actually
 * registered in `lib/modules`'s generated registry
 * (`MODULE_REGISTRY`/`getModulePackage`) — a caller can never instantiate an
 * unregistered or mistyped module id+version this way. Mirrors
 * `confirmParameterLink`'s "each module endpoint must be a port its pinned
 * package actually declares" rigor, one level up: the package itself, not
 * just its ports.
 */
export async function addModuleInstance(
  input: AddModuleInstanceInput,
  ownerId: UserId,
): Promise<AddModuleInstanceResult> {
  const labelResult = labelSchema.safeParse(input.label);
  if (!labelResult.success) {
    return {
      ok: false,
      error: { code: "invalid_input", message: "Module label is required." },
    };
  }

  const assembly = await loadAssemblyForOwner(input.assemblyId, ownerId);
  if (assembly === null) {
    return {
      ok: false,
      error: { code: "unauthorized", message: "Assembly not found or not owned by this user." },
    };
  }
  if (assembly.configurationId !== input.configurationId) {
    return {
      ok: false,
      error: { code: "unauthorized", message: "Assembly does not belong to the given configuration." },
    };
  }

  const pkg = getModulePackage(input.modulePackageId, input.moduleVersion);
  if (pkg === undefined) {
    return {
      ok: false,
      error: {
        code: "module_not_found",
        message: `Module package "${input.modulePackageId}@${input.moduleVersion}" is not registered.`,
      },
    };
  }

  const moduleInstance = await createModuleInstance({
    assemblyId: input.assemblyId,
    configurationId: input.configurationId,
    // The registry's own manifest values, not the caller's unvalidated
    // strings — identical once getModulePackage resolves, but this is the
    // confirmed-canonical source.
    modulePackageId: pkg.manifest.id,
    moduleVersion: pkg.manifest.version,
    label: labelResult.data,
  });
  return { ok: true, moduleInstance };
}
