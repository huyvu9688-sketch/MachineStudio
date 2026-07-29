// Zod validation for the calculation-run snapshot (Unit 2.3). A stored run
// snapshot is validated on both write and read — "never trust JSONB only
// because the application originally wrote it" (context/code-standards.md
// "Validation": "Stored calculation snapshots"). The schema composes the engine
// schemas (ModuleInput, ModuleComputation) so the run envelope stays in lockstep
// with the value/trace/check contracts rather than duplicating them.

import { z } from "zod";
import { ModuleComputationSchema, ModuleInputSchema } from "../../engine/module-sdk";
import type { CalculationRunSnapshot } from "./run-types";
import { RUN_SNAPSHOT_FORMAT_VERSION } from "./run-types";

const nonEmpty = z.string().trim().min(1);

const runVersionsSchema = z
  .object({
    engineSdkVersion: nonEmpty,
    modulePackageId: nonEmpty,
    moduleVersion: nonEmpty,
    modulePackageHash: nonEmpty,
    parameterRegistryVersion: nonEmpty,
    sourceRevisionIds: z.array(z.string()).readonly(),
  })
  .strict();

/** Validates an unknown payload as a {@link CalculationRunSnapshot}. */
export const CalculationRunSnapshotSchema: z.ZodType<CalculationRunSnapshot> = z
  .object({
    snapshotVersion: z.literal(RUN_SNAPSHOT_FORMAT_VERSION),
    input: ModuleInputSchema,
    computation: ModuleComputationSchema,
    versions: runVersionsSchema,
    ranAt: nonEmpty,
    ranByUserId: nonEmpty.optional(),
  })
  .strict();

/**
 * Non-throwing validation of an untrusted/stored run snapshot, returning Zod's
 * discriminated success/error result.
 */
export function safeParseRunSnapshot(
  input: unknown,
): z.ZodSafeParseResult<CalculationRunSnapshot> {
  return CalculationRunSnapshotSchema.safeParse(input);
}
