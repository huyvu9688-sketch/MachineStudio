// Author-provided input schema for the drive-train module. Extends the
// generic `ModuleInputSchema` with a rule the generic port shape cannot
// express: `drive.gearbox_efficiency` is only meaningful (and only
// required) when a gearbox is actually declared via `screw.gear_ratio != 1`
// (context/modules/drive-train/stage-2-contract.md "Decisions" item 5) --
// the manifest marks it optional so a direct-connected run can omit it, but
// a geared run must supply it. Validation runs on the raw input, before the
// module SDK fills `screw.gear_ratio`'s own constant default
// (lib/engine/module-sdk/execute.ts `resolveModuleInput`), so an absent
// `gear_ratio` here is treated as the direct-connected case (1), not as
// "unknown, so require the efficiency" -- otherwise every direct-connected
// run relying on the default would spuriously fail.

import { z } from "zod";
import { ModuleInputSchema, type ModuleInput } from "@/lib/engine";

export const inputSchema: z.ZodType<ModuleInput> =
  ModuleInputSchema.superRefine((input, ctx) => {
    const gearRatio = input.values.gear_ratio;
    const isGeared = gearRatio?.kind === "quantity" && gearRatio.value !== 1;
    if (isGeared && input.values.gearbox_efficiency === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '"gearbox_efficiency" is required when gear_ratio is not 1.',
        path: ["values", "gearbox_efficiency"],
      });
    }
  });
