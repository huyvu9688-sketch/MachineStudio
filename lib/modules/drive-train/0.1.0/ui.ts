// Generic UI schema for the drive-train module. Selects and groups input
// ports for the generic module workspace (Unit 3.3); it encodes no
// computation. Groups mirror the port families in ./manifest.ts.

import type { ModuleUiSchema } from "@/lib/engine";

export const uiSchema: ModuleUiSchema = {
  groups: [
    {
      id: "drive-geometry",
      title: "Drive geometry",
      fields: [
        { portKey: "lead" },
        { portKey: "gear_ratio" },
        {
          portKey: "gearbox_efficiency",
          help: "Required when gear_ratio is not 1. Distinct from the ball screw's own mechanical efficiency.",
        },
      ],
    },
    {
      id: "motor",
      title: "Candidate motor catalog data",
      fields: [
        { portKey: "motor_rated_torque" },
        { portKey: "motor_peak_torque" },
        { portKey: "motor_rated_speed" },
        { portKey: "motor_rotor_inertia" },
        {
          portKey: "reflected_load_inertia",
          help: "Load-side moment of inertia already reflected to the motor shaft. No released upstream parameter derives this — engineer-supplied.",
        },
      ],
    },
    {
      id: "drive-and-brake",
      title: "Drive and holding brake (optional)",
      fields: [
        {
          portKey: "regen_absorption_capacity",
          help: "When omitted, the regenerative-energy check reports not applicable.",
        },
        {
          portKey: "brake_rated_torque",
          help: "Reported only — not evaluated in 0.1.0.",
        },
      ],
    },
    {
      id: "safety-margins",
      title: "Safety margins",
      fields: [
        {
          portKey: "rms_torque_margin",
          help: "Required. No built-in default — sources disagree from 0.5 to 0.8.",
        },
        {
          portKey: "peak_torque_margin",
          help: "Required. No built-in default.",
        },
        {
          portKey: "inertia_ratio_maximum",
          help: "Required. No built-in default — sources disagree from 2:1 to 100:1 depending on control technology.",
        },
      ],
    },
    {
      id: "motion-profile",
      title: "Motion profile",
      fields: [
        { portKey: "peak_acceleration" },
        { portKey: "peak_deceleration" },
        { portKey: "rms_acceleration" },
      ],
    },
    {
      id: "normal-case",
      title: "Normal case",
      fields: [
        { portKey: "normal_drive_torque" },
        { portKey: "normal_linear_velocity" },
      ],
    },
    {
      id: "peak-case",
      title: "Peak case",
      fields: [
        { portKey: "peak_drive_torque" },
        { portKey: "peak_linear_velocity" },
      ],
    },
  ],
};
