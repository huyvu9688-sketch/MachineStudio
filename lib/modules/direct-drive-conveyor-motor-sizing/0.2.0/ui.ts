// Generic UI schema for the direct-drive-conveyor-motor-sizing module.
// Selects and groups input ports for the generic module workspace (Unit
// 3.3); it encodes no computation.

import type { ModuleUiSchema } from "@/lib/engine";

export const uiSchema: ModuleUiSchema = {
  groups: [
    {
      id: "rollers",
      title: "Drive and idler rollers",
      fields: [
        { portKey: "drive_roller_diameter" },
        { portKey: "drive_roller_mass" },
        { portKey: "idler_roller_diameter" },
        { portKey: "idler_roller_mass" },
      ],
    },
    {
      id: "belt-and-load",
      title: "Belt and carried load",
      fields: [
        { portKey: "belt_mass" },
        { portKey: "carried_load_mass" },
        { portKey: "belt_friction_coefficient" },
        { portKey: "mechanical_efficiency" },
      ],
    },
    {
      id: "motion",
      title: "Motion",
      fields: [
        { portKey: "target_belt_speed" },
        { portKey: "acceleration_time" },
      ],
    },
    {
      id: "motor-and-safety-factors",
      title: "Candidate motor and safety factors",
      fields: [
        { portKey: "motor_rotor_inertia" },
        { portKey: "required_torque_safety_factor" },
        {
          portKey: "inertia_ratio_maximum",
          label: "Recommended maximum inertia ratio",
          help: "Use the motor manufacturer's limit when available.",
        },
      ],
    },
  ],
};
