// Generic UI schema for the axis-load-cases module. Selects and groups input
// ports for the generic module workspace (Unit 3.3); it encodes no
// computation. Groups mirror the port families in ./manifest.ts.

import type { ModuleUiSchema } from "@/lib/engine";

export const uiSchema: ModuleUiSchema = {
  groups: [
    {
      id: "geometry",
      title: "Axis geometry",
      fields: [{ portKey: "orientation" }, { portKey: "incline_angle" }],
    },
    {
      id: "mass",
      title: "Moving mass",
      fields: [
        { portKey: "total_moving_mass" },
        { portKey: "payload_mass" },
        { portKey: "carriage_mass" },
        { portKey: "additional_moving_mass" },
        { portKey: "center_of_mass_offset" },
      ],
    },
    {
      id: "environment",
      title: "Friction and environment",
      fields: [
        { portKey: "friction_coefficient" },
        { portKey: "gravity" },
        { portKey: "duty_cycle" },
        { portKey: "ambient_temperature" },
      ],
    },
    {
      id: "normal-case",
      title: "Normal case",
      fields: [
        { portKey: "normal_travel_direction" },
        { portKey: "normal_axial_acceleration" },
        { portKey: "normal_guide_resistance_force" },
        { portKey: "normal_external_force" },
        { portKey: "normal_external_moment" },
      ],
    },
    {
      id: "peak-case",
      title: "Peak case",
      fields: [
        { portKey: "peak_travel_direction" },
        { portKey: "peak_axial_acceleration" },
        { portKey: "peak_guide_resistance_force" },
        { portKey: "peak_external_force" },
        { portKey: "peak_external_moment" },
      ],
    },
  ],
};
