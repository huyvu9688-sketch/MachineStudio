// Author-provided input schema for the motion-profile module. Extends the
// generic `ModuleInputSchema` with the cross-field rules the generic port
// shape cannot express for a bounded, optional move sequence
// (./manifest.ts, MAX_MOVES): supplied moves must be contiguous starting at
// move 1, a move's three fields (distance/max_velocity/max_acceleration)
// must be all-present or all-absent, and a dwell requires its own move to be
// present. The generic `required: true` on move 1's own ports separately
// enforces that at least one move is supplied.

import { z } from "zod";
import { ModuleInputSchema, type ModuleInput } from "@/lib/engine";
import { MAX_MOVES } from "./manifest";

export const inputSchema: z.ZodType<ModuleInput> =
  ModuleInputSchema.superRefine((input, ctx) => {
    const values = input.values;
    let priorMoveMissing = false;

    for (let index = 1; index <= MAX_MOVES; index++) {
      const distanceKey = `move_${index}_distance`;
      const velocityKey = `move_${index}_max_velocity`;
      const accelerationKey = `move_${index}_max_acceleration`;
      const dwellKey = `dwell_${index}_time`;
      const hasDistance = values[distanceKey] !== undefined;
      const hasVelocity = values[velocityKey] !== undefined;
      const hasAcceleration = values[accelerationKey] !== undefined;
      const hasMove = hasDistance || hasVelocity || hasAcceleration;
      const hasDwell = values[dwellKey] !== undefined;

      if (hasMove && !(hasDistance && hasVelocity && hasAcceleration)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Move ${index} requires "${distanceKey}", "${velocityKey}", and "${accelerationKey}" together.`,
          path: ["values", distanceKey],
        });
        return;
      }

      if (hasMove && priorMoveMissing) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Move ${index} is supplied, but move ${index - 1} is not. Moves must be supplied contiguously starting at move 1.`,
          path: ["values", distanceKey],
        });
        return;
      }

      if (hasDwell && !hasMove) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `"${dwellKey}" is supplied, but move ${index} is not. A dwell requires its own move to be present.`,
          path: ["values", dwellKey],
        });
        return;
      }

      if (!hasMove) priorMoveMissing = true;
    }
  });
