// Manifest and ports for the dual-rod-cylinder-sizing module (Unit 7.4,
// Milestone 7 / roadmap Phase 2). Self-contained, no linear-axis@1 role,
// no Motor Sizing Tool family relationship -- see context/modules/
// dual-rod-cylinder-sizing/stage-1-spec.md.
//
// Reuses eight existing parameters directly (motion.axis.incline_angle,
// motion.axis.friction_coefficient, motion.axis.total_moving_mass,
// pneumatic.operating_pressure, pneumatic.load_factor,
// pneumatic.cushion_type, pneumatic.max_piston_speed,
// pneumatic.kinetic_energy) -- see stage-2-contract.md. No
// pneumatic.mounting_style or pneumatic.buckling_safety_factor port: this
// module has no buckling check (stage-1-spec.md "No buckling check for
// this family"). Several inputs are also echoed as outputs
// (operating_pressure, load_factor, max_piston_speed, cushion_type,
// required_stroke, overhang_length, mounting_orientation):
// CatalogAdapter.requiredSpec() (./index.ts) only receives
// ModuleComputation.outputs, not raw resolved inputs, and
// lib/application/catalogs/dual-rod-cylinder-matching.ts needs these
// resolved values to run its own per-candidate formula/band-lookup
// evaluation.

import {
  asParameterId,
  type ModuleManifest,
  type ModulePorts,
} from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const manifest: Omit<ModuleManifest, "contentHash"> = {
  id: "dual-rod-cylinder-sizing",
  version: "0.1.0",
  sdkRange: { min: "1.0.0" },
  // Draft-authored against registry 1.19.0. Keep this literal -- never
  // import the mutable current-version constant
  // (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.19.0",
  category: "cylinder-sizing.pneumatic-dual-rod",
  tags: ["dual-rod-cylinder-sizing", "pneumatics", "actuator", "catalog-matching"],
  workflowRoles: [],
  validityEnvelopeSummary:
    "Given a load (mass, incline angle, friction coefficient, optional extend-stroke process force), a required stroke, an overhang length, and the engineer's own operating pressure, force-sizing load factor, cushion type, and mounting orientation (vertical/horizontal), computes the required extend/retract force and required cushion kinetic energy for catalog matching against real SMC CXS2 (CXS2M/CXS2L) dual-rod cylinder candidates. No buckling check -- a disclosed scope difference from pneumatic-cylinder-sizing@0.1.0 and guided-cylinder-sizing@0.1.0: SMC's own CXS2 catalog gives no buckling formula, and this mechanism's own governing structural check is SMC's own directly-published load-mass-vs-overhang-length rating instead. That check selects the matching seeded band from the engineer's own real required_stroke/max_piston_speed/mounting_orientation and log-log-interpolates the allowable load mass at overhang_length -- it does not extrapolate past SMC's own published envelope. No load-case (normal/peak/etc.) semantics: every input is a single engineer-supplied value per run. Process force is applied on the extend stroke only. Required retract force may be negative for a strongly gravity-assisted return stroke, reported as computed.",
  sourceRevisionIds: [
    asSourceRevisionId("jp.smc.cxs2_series_catalog@web-2026-08-26"),
    asSourceRevisionId(
      "jp.smc.air_cylinders_model_selection@web-2026-08-24",
    ),
    asSourceRevisionId(
      "us.milwaukee_cylinder.design_engineering_guide@web-2026-08-24",
    ),
    asSourceRevisionId("us.norgren.m1000_heavy_duty_cylinders@web-2026-08-24"),
  ],
};

export const ports: ModulePorts = {
  inputs: [
    {
      key: "incline_angle",
      parameterId: asParameterId("motion.axis.incline_angle"),
      required: true,
    },
    {
      key: "friction_coefficient",
      parameterId: asParameterId("motion.axis.friction_coefficient"),
      required: true,
    },
    {
      key: "load_mass",
      parameterId: asParameterId("motion.axis.total_moving_mass"),
      required: true,
    },
    {
      key: "process_force",
      parameterId: asParameterId("dual_rod_sizing.process_force"),
      required: false,
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
      key: "required_stroke",
      parameterId: asParameterId("dual_rod_sizing.required_stroke"),
      required: true,
    },
    {
      key: "overhang_length",
      parameterId: asParameterId("dual_rod_sizing.overhang_length"),
      required: true,
    },
    {
      key: "mounting_orientation",
      parameterId: asParameterId("dual_rod_sizing.mounting_orientation"),
      required: true,
    },
  ],
  outputs: [
    {
      key: "required_extend_force",
      parameterId: asParameterId("dual_rod_sizing.required_extend_force"),
    },
    {
      key: "required_retract_force",
      parameterId: asParameterId("dual_rod_sizing.required_retract_force"),
    },
    {
      key: "kinetic_energy",
      parameterId: asParameterId("pneumatic.kinetic_energy"),
    },
    {
      key: "required_stroke_out",
      parameterId: asParameterId("dual_rod_sizing.required_stroke"),
    },
    {
      key: "overhang_length_out",
      parameterId: asParameterId("dual_rod_sizing.overhang_length"),
    },
    {
      key: "mounting_orientation_out",
      parameterId: asParameterId("dual_rod_sizing.mounting_orientation"),
    },
    {
      key: "operating_pressure_out",
      parameterId: asParameterId("pneumatic.operating_pressure"),
    },
    {
      key: "load_factor_out",
      parameterId: asParameterId("pneumatic.load_factor"),
    },
    {
      key: "max_piston_speed_out",
      parameterId: asParameterId("pneumatic.max_piston_speed"),
    },
    {
      key: "cushion_type_out",
      parameterId: asParameterId("pneumatic.cushion_type"),
    },
    {
      key: "load_mass_out",
      parameterId: asParameterId("motion.axis.total_moving_mass"),
    },
  ],
};
