// Generic UI schema for the rack-pinion-motor-sizing module. Selects and
// groups input ports for the generic module workspace (Unit 3.3); it
// encodes no computation.

import type { ModuleUiSchema } from "@/lib/engine";

export const uiSchema: ModuleUiSchema = {
  groups: [
    {
      id: "geometry-and-environment",
      title: "Geometry and environment",
      fields: [
        { portKey: "orientation" },
        { portKey: "incline_angle" },
        { portKey: "gravity" },
        { portKey: "friction_coefficient" },
        { portKey: "total_moving_mass" },
      ],
    },
    {
      id: "pinion",
      title: "Pinion and drive",
      fields: [
        { portKey: "pinion_pitch_diameter" },
        { portKey: "pinion_mass" },
        { portKey: "gear_ratio" },
        { portKey: "mechanical_efficiency" },
        { portKey: "external_force" },
      ],
    },
    {
      id: "motion",
      title: "Motion",
      fields: [
        { portKey: "target_velocity" },
        { portKey: "acceleration_time" },
      ],
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
