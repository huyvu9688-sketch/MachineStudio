// Author-provided input schema for the axis-load-cases module. Extends the
// generic `ModuleInputSchema` with the one rule the generic port shape
// cannot express: exactly one mass route (context/modules/axis-load-cases/
// stage-2-contract.md "The package schema must require exactly one mass
// route... It must not silently sum an optional total with a breakdown or
// select one based on field presence."). Both-present and neither-present
// are rejected as hard errors rather than silently resolved.

import { z } from "zod";
import { ModuleInputSchema, type ModuleInput } from "@/lib/engine";

export const inputSchema: z.ZodType<ModuleInput> =
  ModuleInputSchema.superRefine((input, ctx) => {
    const hasTotal = input.values.total_moving_mass !== undefined;
    const hasPayload = input.values.payload_mass !== undefined;
    const hasCarriage = input.values.carriage_mass !== undefined;
    const hasBreakdown = hasPayload || hasCarriage;

    if (hasTotal && hasBreakdown) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Supply exactly one mass route: "total_moving_mass", or the "payload_mass"/"carriage_mass" breakdown — not both.',
        path: ["values", "total_moving_mass"],
      });
      return;
    }

    if (!hasTotal && !hasBreakdown) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Supply exactly one mass route: "total_moving_mass", or both "payload_mass" and "carriage_mass".',
        path: ["values", "total_moving_mass"],
      });
      return;
    }

    if (hasBreakdown && !(hasPayload && hasCarriage)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'The mass breakdown route requires both "payload_mass" and "carriage_mass" ("additional_moving_mass" is optional within it).',
        path: ["values", "payload_mass"],
      });
    }
  });
