// `createMachineLoadCase` (Unit 3.7's "Load-case table" deliverable).
// `LoadCase` has no `assemblyId` (context/architecture.md domain model: a
// load case is a configuration-level concept; per-case parameter magnitudes
// are tagged `ParameterValue`s, not the `LoadCase` row itself), so this
// needs only the configuration-ownership check every other create in this
// boundary applies.

import "server-only";
import { z } from "zod";
import {
  createLoadCase,
  isConfigurationOwnedBy,
  type LoadCaseRecord,
  type MachineConfigurationId,
  type UserId,
} from "@/lib/db";
import type { LoadCaseCategory } from "@/lib/engine";

/** Machine-readable classification of a {@link createMachineLoadCase} failure. */
export type ManageLoadCasesErrorCode = "invalid_input" | "unauthorized";

/** A failed {@link createMachineLoadCase} outcome. */
export interface ManageLoadCasesError {
  readonly code: ManageLoadCasesErrorCode;
  readonly message: string;
}

const LOAD_CASE_CATEGORIES = [
  "normal",
  "peak",
  "holding",
  "emergency_stop",
] as const;
const categorySchema: z.ZodType<LoadCaseCategory> =
  z.enum(LOAD_CASE_CATEGORIES);
const labelSchema = z.string().trim().min(1, "A label is required.").max(200);
const descriptionSchema = z.string().trim().max(2000).optional();

/** Input to {@link createMachineLoadCase}. */
export interface CreateMachineLoadCaseInput {
  readonly configurationId: MachineConfigurationId;
  readonly category: LoadCaseCategory;
  readonly label: string;
  readonly description?: string;
}

/** Result of {@link createMachineLoadCase}. */
export type CreateMachineLoadCaseResult =
  | { readonly ok: true; readonly loadCase: LoadCaseRecord }
  | { readonly ok: false; readonly error: ManageLoadCasesError };

/** Records a load case (normal, peak, holding, emergency-stop) for a configuration. */
export async function createMachineLoadCase(
  input: CreateMachineLoadCaseInput,
  ownerId: UserId,
): Promise<CreateMachineLoadCaseResult> {
  const categoryResult = categorySchema.safeParse(input.category);
  if (!categoryResult.success) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message: "Select a valid load-case category.",
      },
    };
  }
  const labelResult = labelSchema.safeParse(input.label);
  if (!labelResult.success) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message: labelResult.error.issues[0]?.message ?? "Invalid label.",
      },
    };
  }
  const descriptionResult = descriptionSchema.safeParse(input.description);
  if (!descriptionResult.success) {
    return {
      ok: false,
      error: { code: "invalid_input", message: "Description is too long." },
    };
  }

  const configOwned = await isConfigurationOwnedBy(
    input.configurationId,
    ownerId,
  );
  if (!configOwned) {
    return {
      ok: false,
      error: {
        code: "unauthorized",
        message: "Configuration not found or not owned by this user.",
      },
    };
  }

  const loadCase = await createLoadCase({
    configurationId: input.configurationId,
    category: categoryResult.data,
    label: labelResult.data,
    description: descriptionResult.data,
  });
  return { ok: true, loadCase };
}
