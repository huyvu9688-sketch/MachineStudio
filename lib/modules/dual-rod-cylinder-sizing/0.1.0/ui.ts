// Generic UI schema for the dual-rod-cylinder-sizing module. Selects and
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
        {
          portKey: "overhang_length",
          help: "Lever arm from the cylinder's own end-plate load-reference point to the load's center of gravity (SMC's own 'Overhang L'). Governs the load-mass-vs-overhang-length structural check.",
        },
        {
          portKey: "mounting_orientation",
          help: "Vertical or horizontal only -- SMC's own CXS2 selection graphs have no inclined bucket.",
        },
      ],
    },
  ],
};
