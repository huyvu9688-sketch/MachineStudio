// Author-provided input schema for the coupling module. Extends the generic
// `ModuleInputSchema` with two rules the generic port shape cannot express:
// each bore range's minimum must not exceed its own maximum. `math.ts`'s own
// kernel functions already reject non-positive torque/speed/misalignment
// magnitudes; a bore range being internally inconsistent is a different kind
// of error the kernel has no way to see (it never receives "min" and "max"
// together as a pair to compare).

import { z } from "zod";
import { ModuleInputSchema, type ModuleInput } from "@/lib/engine";

function checkBoreRange(
  input: ModuleInput,
  ctx: z.RefinementCtx,
  minKey: string,
  maxKey: string,
): void {
  const min = input.values[minKey];
  const max = input.values[maxKey];
  if (
    min?.kind === "quantity" &&
    max?.kind === "quantity" &&
    min.value > max.value
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${minKey} must not exceed ${maxKey}.`,
      path: ["values", minKey],
    });
  }
}

export const inputSchema: z.ZodType<ModuleInput> =
  ModuleInputSchema.superRefine((input, ctx) => {
    checkBoreRange(input, ctx, "driving_bore_min", "driving_bore_max");
    checkBoreRange(input, ctx, "driven_bore_min", "driven_bore_max");
  });
