import type { ModuleUiSchema } from "@/lib/engine";

export const uiSchema: ModuleUiSchema = {
  groups: [
    {
      id: "application",
      title: "MGP application",
      fields: [
        {
          portKey: "application_case",
          help: "Choose the catalogue application diagram that represents the load.",
        },
      ],
    },
    {
      id: "load",
      title: "Load and safety factor",
      fields: [
        { portKey: "load_mass" },
        {
          portKey: "load_safety_factor",
          help: "Engineer-selected multiplier for secondary uncertainty. It is applied once to mass before graph selection.",
        },
        {
          portKey: "eccentric_distance",
          help: "L: guide-plate-to-load-centre-of-gravity distance for a lifter or pusher.",
        },
      ],
    },
    {
      id: "selection-inputs",
      title: "MGP selection inputs",
      fields: [
        { portKey: "required_stroke" },
        { portKey: "operating_pressure" },
        {
          portKey: "max_piston_speed",
          help: "Required for a vertical lifter or horizontal pusher.",
        },
        {
          portKey: "transfer_speed",
          help: "Required for a stopper; entered canonically in m/s and reported against the catalogue m/min graph axis.",
        },
      ],
    },
  ],
};
