// Author-provided input schema for the pneumatic-cylinder module. Extends
// the generic `ModuleInputSchema` with the four rules the generic port
// shape cannot express (context/modules/pneumatic-cylinder/
// stage-2-contract.md "Stage 3 Entry Criteria" item 2):
//
//   1. rod_diameter must be less than bore_diameter
//   2. at least one of required_extend_force/required_retract_force
//   3. allowable_kinetic_energy is required together with a cushion_type
//      other than "none"
//   4. piping_bore is required together with a nonzero piping_length
//
// Rule 1 is also re-derived defensively inside ./math.ts
// (resolvePistonAreas) -- the same "kernel functions assert their own
// preconditions independently of the schema" discipline ball-screw's own
// math.ts follows.

import { z } from "zod";
import { ModuleInputSchema, type ModuleInput } from "@/lib/engine";

function quantityValue(
  values: ModuleInput["values"],
  key: string,
): number | undefined {
  const value = values[key];
  return value?.kind === "quantity" ? value.value : undefined;
}

function enumValue(
  values: ModuleInput["values"],
  key: string,
): string | undefined {
  const value = values[key];
  return value?.kind === "enum" ? value.value : undefined;
}

export const inputSchema: z.ZodType<ModuleInput> =
  ModuleInputSchema.superRefine((input, ctx) => {
    const values = input.values;

    const boreDiameter = quantityValue(values, "bore_diameter");
    const rodDiameter = quantityValue(values, "rod_diameter");
    if (
      boreDiameter !== undefined &&
      rodDiameter !== undefined &&
      rodDiameter >= boreDiameter
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "pneumatic.rod_diameter must be less than pneumatic.bore_diameter.",
        path: ["values", "rod_diameter"],
      });
    }

    const requiredExtendForce = quantityValue(values, "required_extend_force");
    const requiredRetractForce = quantityValue(
      values,
      "required_retract_force",
    );
    if (
      requiredExtendForce === undefined &&
      requiredRetractForce === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "At least one of pneumatic.required_extend_force or pneumatic.required_retract_force is required.",
        path: ["values", "required_extend_force"],
      });
    }

    const cushionType = enumValue(values, "cushion_type");
    const allowableKineticEnergy = quantityValue(
      values,
      "allowable_kinetic_energy",
    );
    if (
      cushionType !== undefined &&
      cushionType !== "none" &&
      allowableKineticEnergy === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'pneumatic.allowable_kinetic_energy is required when pneumatic.cushion_type is not "none".',
        path: ["values", "allowable_kinetic_energy"],
      });
    }

    const pipingLength = quantityValue(values, "piping_length");
    const pipingBore = quantityValue(values, "piping_bore");
    if (
      pipingLength !== undefined &&
      pipingLength > 0 &&
      pipingBore === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "pneumatic.piping_bore is required when pneumatic.piping_length is nonzero.",
        path: ["values", "piping_bore"],
      });
    }
  });
