// Generic UI schema for the motion-profile module. Selects and groups input
// ports for the generic module workspace (Unit 3.3); it encodes no
// computation.

import type { ModuleUiSchema } from "@/lib/engine";

export const uiSchema: ModuleUiSchema = {
  groups: [
    {
      id: "move",
      title: "Move",
      fields: [
        { portKey: "move_distance" },
        { portKey: "max_velocity" },
        { portKey: "max_acceleration" },
      ],
    },
    {
      id: "cycle",
      title: "Cycle",
      fields: [
        {
          portKey: "dwell_time",
          help: "Optional. Leave blank for a cycle that is this move only.",
        },
      ],
    },
  ],
};
