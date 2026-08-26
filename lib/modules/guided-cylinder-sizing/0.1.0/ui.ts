// Generic UI schema for the guided-cylinder-sizing module. Selects and
// groups input ports for the generic module workspace; encodes no
// computation.

import type { ModuleUiSchema } from "@/lib/engine";

export const uiSchema: ModuleUiSchema = {
  groups: [
    {
      id: "load",
      title: "Load and installation",
      fields: [
        { portKey: "load_mass" },
        { portKey: "incline_angle" },
        { portKey: "friction_coefficient" },
        {
          portKey: "process_force",
          help: "Optional additive working force on the extend stroke only (e.g. clamping or pressing). Zero if the cylinder only needs to move the load.",
        },
      ],
    },
    {
      id: "load-offsets",
      title: "Guide plate load offsets",
      fields: [
        {
          portKey: "roll_offset",
          help: "Lever-arm distance from the guide plate's own load-reference point to the load's effective center of application, along the roll axis.",
        },
        {
          portKey: "pitch_offset",
          help: "Lever-arm distance along the pitch axis.",
        },
        {
          portKey: "yaw_offset",
          help: "Lever-arm distance along the yaw axis.",
        },
      ],
    },
    {
      id: "cylinder-requirements",
      title: "Cylinder requirements",
      fields: [
        { portKey: "required_stroke" },
        { portKey: "operating_pressure" },
        {
          portKey: "load_factor",
          help: "Required. No built-in default -- SMC's own load-factor table keys it to operation type.",
        },
        { portKey: "max_piston_speed" },
        { portKey: "cushion_type" },
        { portKey: "mounting_style" },
        {
          portKey: "buckling_safety_factor",
          help: "Required. No built-in default -- no pneumatic-cylinder-manufacturer source gives a specific value.",
        },
      ],
    },
  ],
};
