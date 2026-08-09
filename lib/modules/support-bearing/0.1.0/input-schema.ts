// Author-provided input schema for the support-bearing module. Extends the
// generic `ModuleInputSchema` with a rule the generic port shape cannot
// express: the axial-load-related ports (dynamic_load_factor_y,
// static_load_factor_y, and the per-case thrust_force) are only meaningful
// for a bearing.location = "fixed" calculation (stage-2-contract.md
// "Decisions" items 1 and 3) — the manifest marks them optional so a
// "supported"-location run can omit them, but a "fixed"-location run must
// supply all four together.

import { z } from "zod";
import { ModuleInputSchema, type ModuleInput } from "@/lib/engine";

function requireWhenFixed(
  input: ModuleInput,
  ctx: z.RefinementCtx,
  key: string,
): void {
  if (input.values[key] === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `"${key}" is required when bearing.location is "fixed".`,
      path: ["values", key],
    });
  }
}

export const inputSchema: z.ZodType<ModuleInput> =
  ModuleInputSchema.superRefine((input, ctx) => {
    const location = input.values.location;
    const isFixed = location?.kind === "enum" && location.value === "fixed";
    if (isFixed) {
      requireWhenFixed(input, ctx, "dynamic_load_factor_y");
      requireWhenFixed(input, ctx, "static_load_factor_y");
      requireWhenFixed(input, ctx, "normal_thrust_force");
      requireWhenFixed(input, ctx, "peak_thrust_force");
    }
  });
