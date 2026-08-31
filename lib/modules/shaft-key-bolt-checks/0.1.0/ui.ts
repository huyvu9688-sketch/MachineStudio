// Generic UI schema for the shaft-key-bolt-checks module. Selects and groups
// input ports for the generic module workspace (Unit 3.3); it encodes no
// computation. Groups mirror the port families in ./manifest.ts.

import type { ModuleUiSchema } from "@/lib/engine";

export const uiSchema: ModuleUiSchema = {
  groups: [
    {
      id: "shaft-geometry",
      title: "Shaft geometry and material",
      fields: [
        { portKey: "shaft_diameter" },
        { portKey: "shaft_bore_diameter", help: "Optional. Defaults to 0 (solid shaft)." },
        { portKey: "shaft_material_yield_strength" },
      ],
    },
    {
      id: "shaft-service-factors",
      title: "Shaft service factors",
      fields: [
        {
          portKey: "shaft_torque_service_factor",
          help: "Required. No built-in default -- selected from a machine-type service table (e.g. 1.0 for a gradually applied load).",
        },
        {
          portKey: "shaft_bending_service_factor",
          help: "Required. No built-in default -- same service table as the torque factor.",
        },
        { portKey: "shaft_safety_factor_minimum" },
      ],
    },
    {
      id: "shaft-loads-normal",
      title: "Shaft loads (normal case)",
      fields: [
        { portKey: "normal_shaft_applied_torque" },
        { portKey: "normal_shaft_applied_bending_moment" },
      ],
    },
    {
      id: "shaft-loads-peak",
      title: "Shaft loads (peak case)",
      fields: [
        { portKey: "peak_shaft_applied_torque" },
        { portKey: "peak_shaft_applied_bending_moment" },
      ],
    },
    {
      id: "key",
      title: "Key",
      fields: [
        { portKey: "key_width" },
        { portKey: "key_height" },
        { portKey: "key_length" },
        { portKey: "key_material_yield_strength" },
        { portKey: "key_safety_factor_minimum" },
      ],
    },
    {
      id: "bolt",
      title: "Bolt",
      fields: [
        { portKey: "bolt_thread_standard" },
        { portKey: "bolt_nominal_diameter" },
        { portKey: "bolt_thread_pitch" },
        { portKey: "bolt_proof_strength" },
        {
          portKey: "bolt_k_factor",
          help: "Required. No built-in default -- found in the range 0.12-0.33 by coating/lubrication/finish.",
        },
        { portKey: "bolt_installation_torque" },
        { portKey: "bolt_safety_factor_minimum" },
        {
          portKey: "bolt_joint_stiffness_ratio",
          help: "Optional. When omitted, the tensile check conservatively assumes the bolt carries the full externally applied tensile load.",
        },
      ],
    },
    {
      id: "bolt-loads-normal",
      title: "Bolt external tensile load (normal case)",
      fields: [{ portKey: "normal_bolt_external_tensile_load" }],
    },
    {
      id: "bolt-loads-peak",
      title: "Bolt external tensile load (peak case)",
      fields: [{ portKey: "peak_bolt_external_tensile_load" }],
    },
  ],
};
