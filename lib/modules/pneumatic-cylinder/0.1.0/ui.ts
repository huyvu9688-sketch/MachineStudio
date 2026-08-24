// Generic UI schema for the pneumatic-cylinder module. Selects and groups
// input ports for the generic module workspace (Unit 3.3); it encodes no
// computation.

import type { ModuleUiSchema } from "@/lib/engine";

export const uiSchema: ModuleUiSchema = {
  groups: [
    {
      id: "geometry",
      title: "Cylinder geometry",
      fields: [
        { portKey: "bore_diameter" },
        { portKey: "rod_diameter" },
        { portKey: "stroke" },
        { portKey: "mounting_style" },
      ],
    },
    {
      id: "force",
      title: "Force sizing",
      fields: [
        { portKey: "operating_pressure" },
        {
          portKey: "load_factor",
          help: "Required. No built-in default -- SMC's own load-factor table keys it to operation type (static/clamping, guided horizontal dynamic, unguided vertical/horizontal dynamic).",
        },
        {
          portKey: "required_extend_force",
          help: "At least one of required extend/retract force is required.",
        },
        { portKey: "required_retract_force" },
      ],
    },
    {
      id: "cushion",
      title: "End-of-stroke cushion",
      fields: [
        { portKey: "load_mass" },
        { portKey: "max_piston_speed" },
        { portKey: "cushion_type" },
        {
          portKey: "allowable_kinetic_energy",
          help: 'Required together with a cushion type other than "none".',
        },
      ],
    },
    {
      id: "buckling",
      title: "Piston-rod buckling",
      fields: [
        {
          portKey: "buckling_safety_factor",
          help: "Required. No built-in default -- no pneumatic-cylinder-manufacturer source gives a specific value.",
        },
      ],
    },
    {
      id: "piping",
      title: "Piping (for reported air-consumption figures)",
      fields: [
        { portKey: "piping_length" },
        {
          portKey: "piping_bore",
          help: "Required together with a nonzero piping length.",
        },
      ],
    },
  ],
};
