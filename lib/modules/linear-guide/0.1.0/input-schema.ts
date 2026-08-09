// Author-provided input schema for the linear-guide module. Extends the
// generic `ModuleInputSchema` with the two validity-envelope rules the generic
// port shape cannot express, both of which reject a real, representable input
// rather than guarding a hypothetical.
//
// 1. `rolling_element_type` must be `"ball"`. The registry deliberately
//    releases `roller` as well (a future version's scope), but a roller guide
//    uses a different life exponent and distance basis — e = 10/3 over 100 km
//    rather than e = 3 over 50 km (context/modules/linear-guide/
//    stage-1-spec.md item 4). Applying the ball branch to a roller guide would
//    overstate life, so `0.1.0` rejects it. ./math.ts's resolveNominalLife
//    throws on the same input; rejecting it at the schema boundary turns a
//    kernel exception into a validation error the UI can attribute to a field.
//
// 2. `orientation` must be `"horizontal"` or `"vertical"`. PMI's catalog does
//    publish tilted-installation formulas, but this version transcribed and
//    verified only the horizontal and vertical sets ("Validity Envelope
//    (Proposed)"), so an inclined axis has no supported method here. It is
//    rejected rather than approximated by the nearer of the two — the same
//    treatment ball-screw 0.1.0 gives a distance-basis dynamic load rating.
//
// The same enum-narrowing pattern as lib/modules/ball-screw/0.1.0/
// input-schema.ts.

import { z } from "zod";
import { ModuleInputSchema, type ModuleInput } from "@/lib/engine";

export const inputSchema: z.ZodType<ModuleInput> =
  ModuleInputSchema.superRefine((input, ctx) => {
    const rollingElementType = input.values.rolling_element_type;
    if (
      rollingElementType !== undefined &&
      rollingElementType.kind === "enum" &&
      rollingElementType.value !== "ball"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'This module version (0.1.0) implements ball-type guides only (guide.rolling_element_type = "ball"). A roller-type guide uses a different life exponent and distance basis (e = 10/3 over 100 km, not e = 3 over 50 km) — see context/modules/linear-guide/stage-1-spec.md "Validity Envelope (Proposed)".',
        path: ["values", "rolling_element_type"],
      });
    }

    const orientation = input.values.orientation;
    if (
      orientation !== undefined &&
      orientation.kind === "enum" &&
      orientation.value !== "horizontal" &&
      orientation.value !== "vertical"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'This module version (0.1.0) supports a horizontal or vertical installation only (motion.axis.orientation = "horizontal" | "vertical"). An inclined axis is rejected rather than approximated by either, because PMI\'s tilted-installation formulas were not transcribed or verified for this version — see context/modules/linear-guide/stage-1-spec.md "Validity Envelope (Proposed)".',
        path: ["values", "orientation"],
      });
    }
  });
