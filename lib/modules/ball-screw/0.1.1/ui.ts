// Generic UI schema for the ball-screw module. Selects and groups input
// ports for the generic module workspace (Unit 3.3); it encodes no
// computation. Groups mirror the port families in ./manifest.ts.

import type { ModuleUiSchema } from "@/lib/engine";

export const uiSchema: ModuleUiSchema = {
  groups: [
    {
      id: "geometry",
      title: "Screw geometry",
      fields: [
        { portKey: "minor_diameter" },
        { portKey: "lead" },
        { portKey: "unsupported_length" },
        { portKey: "end_support_arrangement" },
      ],
    },
    {
      id: "ratings",
      title: "Catalog ratings",
      fields: [
        { portKey: "dynamic_load_rating" },
        { portKey: "dynamic_load_rating_basis" },
        { portKey: "static_load_rating" },
        { portKey: "preload" },
        { portKey: "internal_friction_coefficient" },
        { portKey: "mechanical_efficiency" },
        { portKey: "gear_ratio" },
        {
          portKey: "manufacturer_speed_limit",
          help: "Optional. Only checked when the specific screw's own catalog data supplies it.",
        },
      ],
    },
    {
      id: "safety-margins",
      title: "Safety margins",
      fields: [
        {
          portKey: "static_safety_factor_minimum",
          help: "Required. No built-in default — published guidance varies by machine type and operating condition.",
        },
        {
          portKey: "buckling_safety_margin",
          help: "Required. No built-in default — published sources disagree between 0.5 and 0.8.",
        },
      ],
    },
    {
      id: "normal-case",
      title: "Normal case",
      fields: [
        { portKey: "normal_thrust_force" },
        { portKey: "normal_time_fraction" },
        { portKey: "normal_linear_velocity" },
      ],
    },
    {
      id: "peak-case",
      title: "Peak case",
      fields: [
        { portKey: "peak_thrust_force" },
        { portKey: "peak_time_fraction" },
        { portKey: "peak_linear_velocity" },
      ],
    },
  ],
};
