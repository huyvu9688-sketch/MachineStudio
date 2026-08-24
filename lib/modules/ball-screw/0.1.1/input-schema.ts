// Author-provided input schema for the ball-screw module. Extends the
// generic `ModuleInputSchema` with the one rule the generic port shape
// cannot express: `dynamic_load_rating_basis` must be `"revolutions"`.
//
// The kernel's life formula (./math.ts resolveNominalLife) assumes a
// revolution-basis dynamic load rating; a distance-basis rating (e.g.
// Rockford Ball Screw's own catalog convention — see
// context/modules/ball-screw/stage-1-spec.md item 5) is a real, source-
// confirmed incompatibility, not a hypothetical. 0.1.0 has no documented
// distance-to-revolution conversion, so it rejects a distance-basis rating
// outright rather than silently misreporting life
// (context/modules/ball-screw/stage-2-contract.md "Draft Kernel Impact").

import { z } from "zod";
import { ModuleInputSchema, type ModuleInput } from "@/lib/engine";

export const inputSchema: z.ZodType<ModuleInput> =
  ModuleInputSchema.superRefine((input, ctx) => {
    const basis = input.values.dynamic_load_rating_basis;
    if (
      basis !== undefined &&
      basis.kind === "enum" &&
      basis.value !== "revolutions"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'This module version (0.1.0) only supports a revolutions-basis "dynamic_load_rating" (screw.dynamic_load_rating_basis = "revolutions"). A distance-basis rating (e.g. Rockford Ball Screw\'s own 10^6-inches convention) is not interchangeable without a documented conversion this version does not implement — see context/modules/ball-screw/stage-2-contract.md.',
        path: ["values", "dynamic_load_rating_basis"],
      });
    }
  });
