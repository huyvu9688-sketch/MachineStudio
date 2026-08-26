// Generic UI schema for the pneumatic-cylinder-sizing module. Selects and
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
        {
          portKey: "incline_angle",
          help: "0° = horizontal travel (gravity does not oppose the stroke, only friction does). 90° = vertical travel (full weight opposes the extend stroke and assists the retract stroke). Any value in between blends the two with sin/cos -- not a horizontal/vertical toggle.",
        },
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
        { portKey: "mounting_style" },
        {
          portKey: "buckling_safety_factor",
          help: "Required. No built-in default -- no pneumatic-cylinder-manufacturer source gives a specific value.",
        },
      ],
    },
  ],
};
