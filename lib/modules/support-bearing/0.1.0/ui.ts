// Generic UI schema for the support-bearing module. Selects and groups
// input ports for the generic module workspace (Unit 3.3); it encodes no
// computation. Groups mirror the port families in ./manifest.ts.

import type { ModuleUiSchema } from "@/lib/engine";

export const uiSchema: ModuleUiSchema = {
  groups: [
    {
      id: "selection",
      title: "Bearing selection",
      fields: [
        {
          portKey: "location",
          help: "Which support-bearing location this calculation represents. The fixed side reacts axial and radial load (an angular contact bearing); the supported/floating side reacts radial load only (a deep-groove bearing).",
        },
      ],
    },
    {
      id: "drive",
      title: "Drive geometry",
      fields: [{ portKey: "lead" }],
    },
    {
      id: "ratings",
      title: "Catalog ratings",
      fields: [
        { portKey: "dynamic_load_rating" },
        { portKey: "static_load_rating" },
        { portKey: "allowable_speed" },
        { portKey: "bore_diameter" },
        { portKey: "outside_diameter" },
        { portKey: "preload" },
      ],
    },
    {
      id: "load-factors",
      title: "Equivalent-load factors",
      fields: [
        {
          portKey: "dynamic_load_factor_x",
          help: "Bearing-model-specific, from its own catalog dimensions table.",
        },
        {
          portKey: "dynamic_load_factor_y",
          help: 'Required when location is "fixed"; not applicable for "supported".',
        },
        { portKey: "static_load_factor_x" },
        {
          portKey: "static_load_factor_y",
          help: 'Required when location is "fixed"; not applicable for "supported".',
        },
      ],
    },
    {
      id: "safety-margin",
      title: "Safety margin",
      fields: [
        {
          portKey: "static_safety_factor_minimum",
          help: "Required. No built-in default — jp.ntn.rolling_bearings_handbook Table 6.4 gives lower-limit reference values by operating condition and bearing type.",
        },
      ],
    },
    {
      id: "normal-case",
      title: "Normal case",
      fields: [
        { portKey: "normal_actual_radial_load" },
        {
          portKey: "normal_thrust_force",
          help: 'Required when location is "fixed"; not applicable for "supported".',
        },
        { portKey: "normal_linear_velocity" },
      ],
    },
    {
      id: "peak-case",
      title: "Peak case",
      fields: [
        { portKey: "peak_actual_radial_load" },
        {
          portKey: "peak_thrust_force",
          help: 'Required when location is "fixed"; not applicable for "supported".',
        },
        { portKey: "peak_linear_velocity" },
      ],
    },
  ],
};
