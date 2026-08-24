// Manifest and ports for the pneumatic-cylinder module (Unit 7.1, Milestone
// 7 / roadmap Phase 2). A new, standalone module family: no linear-axis@1
// role, no Motor Sizing Tool family relationship (ADR-0011's own family is
// closed at five ball-screw/conveyor/rack-pinion/belt-pulley/index-table
// mechanisms) -- see context/modules/pneumatic-cylinder/stage-1-spec.md
// "Existing Parameter Review".
//
// No load-case semantics: force, mass, and speed are each a single
// engineer-supplied value per calculation run (stage-1-spec.md "Validity
// Envelope"), so unlike ball-screw this manifest has no per-case port
// families.

import {
  asParameterId,
  type ModuleManifest,
  type ModulePorts,
} from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const manifest: Omit<ModuleManifest, "contentHash"> = {
  id: "pneumatic-cylinder",
  version: "0.1.0",
  sdkRange: { min: "1.0.0" },
  // Draft-authored against registry 1.16.0. Keep this literal -- never
  // import the mutable current-version constant
  // (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.16.0",
  category: "pneumatic-cylinder",
  tags: ["pneumatic-cylinder", "pneumatics", "actuator"],
  workflowRoles: [],
  validityEnvelopeSummary:
    "One double-acting or single-acting pneumatic cylinder, one load, one installation -- not a multi-cylinder system, rodless, or guided-slide variant. Force sizing checks the engineer-supplied theoretical extend/retract force (SMC's own load-factor eta convention) against an engineer-supplied required force; the required-force estimation itself (from a load mass and an assumed friction/lift condition, e.g. Milwaukee Cylinder's own load-type percentage method) is upstream engineering guidance, not a formula this module implements. Cushioning checks end-of-stroke kinetic energy against the candidate cylinder's own catalog allowable-energy figure; piston speed at end of stroke is a required engineer-supplied input, never computed (no source read for this module gives a speed formula). Piston-rod buckling uses a generic Euler column formula (steel modulus, one of four end-fixity mounting cases) with an engineer-supplied, no-default safety factor -- no pneumatic-manufacturer source gives a specific safety-factor value; the rod is assumed to be in axial compression only on the extend (thrust) stroke, not the retract stroke. Air consumption and required air volume are reported, not evaluated, and assume symmetric piping (one length/bore pair applied to both the extend and retract legs) and a constant-speed stroke-time approximation (stroke / max piston speed) -- neither a per-side piping split nor a stroke-time input exists in this module's own scope. Lateral (side) rod-end load and condensation risk are out of scope. No load case (normal/peak/etc.) semantics.",
  sourceRevisionIds: [
    asSourceRevisionId(
      "us.milwaukee_cylinder.design_engineering_guide@web-2026-08-24",
    ),
    asSourceRevisionId("jp.smc.air_cylinders_model_selection@web-2026-08-24"),
    asSourceRevisionId("us.norgren.m1000_heavy_duty_cylinders@web-2026-08-24"),
  ],
};

export const ports: ModulePorts = {
  inputs: [
    {
      key: "bore_diameter",
      parameterId: asParameterId("pneumatic.bore_diameter"),
      required: true,
    },
    {
      key: "rod_diameter",
      parameterId: asParameterId("pneumatic.rod_diameter"),
      required: true,
    },
    {
      key: "operating_pressure",
      parameterId: asParameterId("pneumatic.operating_pressure"),
      required: true,
    },
    {
      key: "load_factor",
      parameterId: asParameterId("pneumatic.load_factor"),
      required: true,
    },
    {
      key: "required_extend_force",
      parameterId: asParameterId("pneumatic.required_extend_force"),
      // Optional: the input schema requires at least one of
      // required_extend_force/required_retract_force, not both.
      required: false,
    },
    {
      key: "required_retract_force",
      parameterId: asParameterId("pneumatic.required_retract_force"),
      required: false,
    },
    {
      key: "load_mass",
      parameterId: asParameterId("pneumatic.load_mass"),
      required: true,
    },
    {
      key: "max_piston_speed",
      parameterId: asParameterId("pneumatic.max_piston_speed"),
      required: true,
    },
    {
      key: "cushion_type",
      parameterId: asParameterId("pneumatic.cushion_type"),
      required: true,
    },
    {
      key: "allowable_kinetic_energy",
      parameterId: asParameterId("pneumatic.allowable_kinetic_energy"),
      // Optional: the input schema requires this together with a
      // cushion_type other than "none".
      required: false,
    },
    {
      key: "stroke",
      parameterId: asParameterId("pneumatic.stroke"),
      required: true,
    },
    {
      key: "mounting_style",
      parameterId: asParameterId("pneumatic.mounting_style"),
      required: true,
    },
    {
      key: "buckling_safety_factor",
      parameterId: asParameterId("pneumatic.buckling_safety_factor"),
      required: true,
    },
    {
      key: "piping_length",
      parameterId: asParameterId("pneumatic.piping_length"),
      // Optional: the registry's constant default (0, "no piping modeled")
      // auto-fills an absent value (lib/engine/module-sdk/execute.ts
      // resolveModuleInput) -- same pattern ball-screw's own gear_ratio
      // port relies on.
      required: false,
    },
    {
      key: "piping_bore",
      parameterId: asParameterId("pneumatic.piping_bore"),
      // Optional: the input schema requires this together with a nonzero
      // piping_length.
      required: false,
    },
  ],
  outputs: [
    {
      key: "theoretical_extend_force",
      parameterId: asParameterId("pneumatic.theoretical_extend_force"),
    },
    {
      key: "theoretical_retract_force",
      parameterId: asParameterId("pneumatic.theoretical_retract_force"),
    },
    {
      key: "kinetic_energy",
      parameterId: asParameterId("pneumatic.kinetic_energy"),
    },
    {
      key: "buckling_load",
      parameterId: asParameterId("pneumatic.buckling_load"),
    },
    {
      key: "permissible_compressive_load",
      parameterId: asParameterId("pneumatic.permissible_compressive_load"),
    },
    {
      key: "air_consumption_per_cycle",
      parameterId: asParameterId("pneumatic.air_consumption_per_cycle"),
    },
    {
      key: "required_air_volume",
      parameterId: asParameterId("pneumatic.required_air_volume"),
    },
  ],
};
