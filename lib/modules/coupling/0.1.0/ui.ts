// Generic UI schema for the coupling module. Selects and groups input ports
// for the generic module workspace (Unit 3.3); it encodes no computation.
// Groups mirror the port families in ./manifest.ts.

import type { ModuleUiSchema } from "@/lib/engine";

export const uiSchema: ModuleUiSchema = {
  groups: [
    {
      id: "drive",
      title: "Drive geometry",
      fields: [{ portKey: "lead" }, { portKey: "gear_ratio" }],
    },
    {
      id: "ratings",
      title: "Catalog ratings",
      fields: [
        { portKey: "rated_torque" },
        { portKey: "max_torque" },
        { portKey: "allowable_speed" },
        { portKey: "torsional_stiffness" },
        { portKey: "moment_of_inertia" },
      ],
    },
    {
      id: "bore",
      title: "Bore compatibility",
      fields: [
        { portKey: "driving_bore_min" },
        { portKey: "driving_bore_max" },
        { portKey: "driven_bore_min" },
        { portKey: "driven_bore_max" },
        { portKey: "driving_shaft_diameter" },
        { portKey: "driven_shaft_diameter" },
      ],
    },
    {
      id: "misalignment",
      title: "Misalignment",
      fields: [
        { portKey: "allowable_parallel_misalignment" },
        { portKey: "allowable_angular_misalignment" },
        { portKey: "allowable_axial_misalignment" },
        { portKey: "actual_parallel_misalignment" },
        { portKey: "actual_angular_misalignment" },
        { portKey: "actual_axial_misalignment" },
      ],
    },
    {
      id: "safety-margin",
      title: "Safety margin",
      fields: [
        {
          portKey: "service_factor",
          help: "Required. No built-in default — KTR and R+W each publish their own disagreeing operating/temperature/starting/direction factor tables.",
        },
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
