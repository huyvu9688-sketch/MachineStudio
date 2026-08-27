import { z } from "zod";
import { ModuleInputSchema, type ModuleInput } from "@/lib/engine";
import { enumValueAt } from "./values";

function requireCaseInput(
  values: ModuleInput["values"],
  ctx: z.RefinementCtx,
  applicationCase: string,
  key: "max_piston_speed" | "eccentric_distance" | "transfer_speed",
): void {
  if (values[key] !== undefined) return;
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: `The ${applicationCase} application requires "${key}".`,
    path: ["values", key],
  });
}

/**
 * Selection needs differ by MGP application case. Ports remain optional so
 * stale values from a previously selected case can stay in the input snapshot.
 */
export const inputSchema: z.ZodType<ModuleInput> =
  ModuleInputSchema.superRefine((input, ctx) => {
    const applicationCase = enumValueAt(input.values, "application_case");

    if (
      applicationCase === "vertical_lifter" ||
      applicationCase === "horizontal_pusher"
    ) {
      requireCaseInput(input.values, ctx, applicationCase, "max_piston_speed");
      requireCaseInput(
        input.values,
        ctx,
        applicationCase,
        "eccentric_distance",
      );
    }

    if (applicationCase === "stopper") {
      requireCaseInput(input.values, ctx, applicationCase, "transfer_speed");
    }
  });
