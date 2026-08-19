// Generic UI schema for the index-table-motor-sizing module. Selects and
// groups input ports for the generic module workspace (Unit 3.3); it
// encodes no computation.

import type { ModuleUiSchema } from "@/lib/engine";

export const uiSchema: ModuleUiSchema = {
  groups: [
    {
      id: "table-and-load",
      title: "Table and mounted load",
      fields: [
        { portKey: "table_mass" },
        { portKey: "table_diameter" },
        { portKey: "attached_load_inertia" },
        { portKey: "gear_ratio" },
      ],
    },
    {
      id: "motion",
      title: "Index move",
      fields: [
        { portKey: "index_angle" },
        { portKey: "index_time" },
        { portKey: "acceleration_time" },
      ],
    },
    {
      id: "load-torque",
      title: "Load torque",
      fields: [{ portKey: "load_torque" }],
    },
    {
      id: "motor-and-safety-factors",
      title: "Candidate motor and safety factors",
      fields: [
        { portKey: "motor_rotor_inertia" },
        { portKey: "required_torque_safety_factor" },
        { portKey: "inertia_ratio_maximum" },
      ],
    },
  ],
};
