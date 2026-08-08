// Generic UI schema for the motion-profile module. Selects and groups input
// ports for the generic module workspace (Unit 3.3); it encodes no
// computation. One group per move (./manifest.ts, MAX_MOVES): move 1's
// fields are required, moves 2-5 are optional but must be filled in order
// (../input-schema.ts rejects a gap or a partially-filled move).

import type { ModuleUiGroup, ModuleUiSchema } from "@/lib/engine";
import { MAX_MOVES } from "./manifest";

function moveGroup(index: number): ModuleUiGroup {
  return {
    id: `move-${index}`,
    title: `Move ${index}`,
    fields: [
      { portKey: `move_${index}_distance` },
      { portKey: `move_${index}_max_velocity` },
      { portKey: `move_${index}_max_acceleration` },
      {
        portKey: `dwell_${index}_time`,
        help:
          index === 1
            ? "Optional. Leave blank for no dwell after this move."
            : `Optional. Leave move ${index} and its dwell blank to end the cycle after move ${index - 1}.`,
      },
    ],
  };
}

export const uiSchema: ModuleUiSchema = {
  groups: Array.from({ length: MAX_MOVES }, (_, i) => moveGroup(i + 1)),
};
