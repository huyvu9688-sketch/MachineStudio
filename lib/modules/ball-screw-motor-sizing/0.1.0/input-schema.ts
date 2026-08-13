// Author-provided input schema for the ball-screw-motor-sizing module.
// Extends the generic `ModuleInputSchema` with the one rule the generic
// port shape cannot express: the return move's three ports must be
// supplied together or not at all (stage-2-contract.md "Decisions"
// item 2) -- the same "generic port shape can't express this
// co-requirement, so an author-provided schema rule does" pattern
// `drive-train@0.1.0`'s own `gearbox_efficiency` requirement and
// `support-bearing@0.1.0`'s own conditional axial-load ports already
// established.

import { z } from "zod";
import { ModuleInputSchema, type ModuleInput } from "@/lib/engine";

export const inputSchema: z.ZodType<ModuleInput> =
  ModuleInputSchema.superRefine((input, ctx) => {
    const hasDistance = input.values.return_move_distance !== undefined;
    const hasVelocity = input.values.return_max_velocity !== undefined;
    const hasAcceleration = input.values.return_max_acceleration !== undefined;
    const suppliedCount = [hasDistance, hasVelocity, hasAcceleration].filter(
      Boolean,
    ).length;

    if (suppliedCount !== 0 && suppliedCount !== 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Supply "return_move_distance", "return_max_velocity", and "return_max_acceleration" together, or omit all three -- a return move is optional, but partial return-move data is not accepted.',
        path: ["values", "return_move_distance"],
      });
    }
  });
