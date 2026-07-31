// `createMachineDesignAssumption` (Unit 3.7's "Assumption register"
// deliverable). Same "configuration ownership, plus assembly-in-
// configuration cross-check when scoped" shape as
// manage-requirements.ts's `createMachineRequirement` — `DesignAssumption`
// has the identical optional `assemblyId` shape.

import "server-only";
import { z } from "zod";
import {
  createDesignAssumption,
  isConfigurationOwnedBy,
  loadAssemblyForOwner,
  type AssemblyId,
  type DesignAssumptionRecord,
  type MachineConfigurationId,
  type UserId,
} from "@/lib/db";

/** Machine-readable classification of a {@link createMachineDesignAssumption} failure. */
export type ManageDesignAssumptionsErrorCode = "invalid_input" | "unauthorized";

/** A failed {@link createMachineDesignAssumption} outcome. */
export interface ManageDesignAssumptionsError {
  readonly code: ManageDesignAssumptionsErrorCode;
  readonly message: string;
}

const statementSchema = z.string().trim().min(1, "A statement is required.").max(2000);
const rationaleSchema = z.string().trim().max(2000).optional();

/** Input to {@link createMachineDesignAssumption}. Omit `assemblyId` for a machine-level assumption. */
export interface CreateMachineDesignAssumptionInput {
  readonly configurationId: MachineConfigurationId;
  readonly assemblyId?: AssemblyId;
  readonly statement: string;
  readonly rationale?: string;
}

/** Result of {@link createMachineDesignAssumption}. */
export type CreateMachineDesignAssumptionResult =
  | { readonly ok: true; readonly designAssumption: DesignAssumptionRecord }
  | { readonly ok: false; readonly error: ManageDesignAssumptionsError };

/** Records a design assumption (machine-level, or scoped to an assembly). */
export async function createMachineDesignAssumption(
  input: CreateMachineDesignAssumptionInput,
  ownerId: UserId,
): Promise<CreateMachineDesignAssumptionResult> {
  const statementResult = statementSchema.safeParse(input.statement);
  if (!statementResult.success) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message: statementResult.error.issues[0]?.message ?? "Invalid statement.",
      },
    };
  }
  const rationaleResult = rationaleSchema.safeParse(input.rationale);
  if (!rationaleResult.success) {
    return { ok: false, error: { code: "invalid_input", message: "Rationale is too long." } };
  }

  const configOwned = await isConfigurationOwnedBy(input.configurationId, ownerId);
  if (!configOwned) {
    return {
      ok: false,
      error: { code: "unauthorized", message: "Configuration not found or not owned by this user." },
    };
  }

  if (input.assemblyId !== undefined) {
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
        error: {
          code: "unauthorized",
          message: "Assembly does not belong to the given configuration.",
        },
      };
    }
  }

  const designAssumption = await createDesignAssumption({
    configurationId: input.configurationId,
    assemblyId: input.assemblyId,
    statement: statementResult.data,
    rationale: rationaleResult.data,
  });
  return { ok: true, designAssumption };
}
