// Author-provided input schema for belt-pulley-drive-motor-sizing 0.2.0.
// Extends the generic `ModuleInputSchema` with a rule the generic port
// shape cannot express: motion_mode selects which two of {target_velocity,
// travel_distance, constant_velocity_time, cycle_time} are real inputs and
// which two are purely derived/reported (all four are optional at the
// manifest level so both modes can omit the other pair) --
// docs/superpowers/specs/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0-design.md
// "Input Mode", the same conditional-requirement pattern
// support-bearing@0.1.0's own bearing.location split already established.

import { z } from "zod";
import { ModuleInputSchema, type ModuleInput } from "@/lib/engine";

function requireForMode(
  input: ModuleInput,
  ctx: z.RefinementCtx,
  key: string,
  mode: string,
): void {
  if (input.values[key] === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `"${key}" is required when motion_mode is "${mode}".`,
      path: ["values", key],
    });
  }
}

export const inputSchema: z.ZodType<ModuleInput> =
  ModuleInputSchema.superRefine((input, ctx) => {
    const motionMode = input.values.motion_mode;
    if (motionMode?.kind !== "enum") {
      return;
    }
    if (motionMode.value === "velocity") {
      requireForMode(input, ctx, "target_velocity", "velocity");
      requireForMode(input, ctx, "constant_velocity_time", "velocity");
    } else if (motionMode.value === "distance") {
      requireForMode(input, ctx, "travel_distance", "distance");
      requireForMode(input, ctx, "cycle_time", "distance");
    }
  });
