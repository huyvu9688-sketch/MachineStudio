// Generic UI schema for the ball-screw-motor-sizing module. Selects and
// groups input ports for the generic module workspace (Unit 3.3); it
// encodes no computation.

import type { ModuleUiSchema } from "@/lib/engine";

export const uiSchema: ModuleUiSchema = {
  groups: [
    {
      id: "geometry-and-environment",
      title: "Axis geometry and environment",
      fields: [
        { portKey: "orientation" },
        { portKey: "incline_angle" },
        { portKey: "friction_coefficient" },
        { portKey: "total_moving_mass" },
      ],
    },
    {
      id: "screw",
      title: "Ball screw",
      fields: [
        { portKey: "lead" },
        { portKey: "gear_ratio" },
        { portKey: "screw_diameter" },
        { portKey: "screw_mass" },
        { portKey: "preload" },
        { portKey: "internal_friction_coefficient" },
        { portKey: "mechanical_efficiency" },
        { portKey: "external_force" },
      ],
    },
    {
      id: "forward-move",
      title: "Forward move",
      fields: [
        { portKey: "forward_move_distance" },
        { portKey: "forward_max_velocity" },
        { portKey: "forward_max_acceleration" },
      ],
    },
    {
      id: "return-move",
      title: "Return move (optional)",
      fields: [
        { portKey: "return_move_distance" },
        { portKey: "return_max_velocity" },
        { portKey: "return_max_acceleration" },
        { portKey: "dwell_time" },
      ],
    },
    {
      id: "motor-and-safety-factors",
      title: "Candidate motor and safety factors",
      fields: [
        { portKey: "motor_rotor_inertia" },
        { portKey: "effective_torque_safety_factor" },
        { portKey: "momentary_torque_safety_factor" },
        {
          portKey: "inertia_ratio_maximum",
          label: "Recommended maximum inertia ratio",
          help: "Use the motor manufacturer's limit when available.",
        },
      ],
    },
  ],
};
