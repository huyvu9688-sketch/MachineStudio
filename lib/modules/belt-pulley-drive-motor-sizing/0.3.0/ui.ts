// Generic UI schema for belt-pulley-drive-motor-sizing 0.3.0. Selects and
// groups input ports for the generic module workspace (Unit 3.3); it
// encodes no computation. All four motion-mode-dependent fields
// (target_velocity, travel_distance, constant_velocity_time, cycle_time)
// are listed -- the real per-mode requirement is still enforced
// server-side by ./input-schema.ts (unchanged from 0.2.0), the same "all
// fields shown, validation enforces requirement" precedent
// support-bearing@0.1.0's own bearing.location split already established.
//
// NEW in 0.3.0: this module is the only consumer of the shared
// `disabledWhen` UI capability
// (docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md
// "Generic UI capability: disabledWhen") -- target_velocity/
// constant_velocity_time render disabled whenever motion_mode is
// "distance"; travel_distance/cycle_time render disabled whenever
// motion_mode is "velocity". This is a presentation hint only; the actual
// required/optional enforcement per mode still happens in
// ./input-schema.ts exactly as it did in 0.2.0.

import type { ModuleUiSchema } from "@/lib/engine";

export const uiSchema: ModuleUiSchema = {
  groups: [
    {
      id: "geometry-and-environment",
      title: "Geometry and environment",
      fields: [
        { portKey: "orientation" },
        { portKey: "incline_angle" },
        { portKey: "friction_coefficient" },
        { portKey: "total_moving_mass" },
      ],
    },
    {
      id: "pulleys-and-belt",
      title: "Pulleys, belt, and drive",
      fields: [
        { portKey: "pulley_pitch_diameter" },
        { portKey: "pulley_mass" },
        { portKey: "idler_pulley_mass" },
        { portKey: "belt_mass" },
        { portKey: "gear_ratio" },
        { portKey: "mechanical_efficiency" },
        { portKey: "external_force" },
      ],
    },
    {
      id: "motion",
      title: "Motion cycle",
      fields: [
        { portKey: "motion_mode" },
        {
          portKey: "target_velocity",
          disabledWhen: { portKey: "motion_mode", equals: "distance" },
        },
        {
          portKey: "travel_distance",
          disabledWhen: { portKey: "motion_mode", equals: "velocity" },
        },
        { portKey: "acceleration_time" },
        { portKey: "deceleration_time" },
        {
          portKey: "constant_velocity_time",
          disabledWhen: { portKey: "motion_mode", equals: "distance" },
        },
        {
          portKey: "cycle_time",
          disabledWhen: { portKey: "motion_mode", equals: "velocity" },
        },
        { portKey: "dwell_time" },
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
