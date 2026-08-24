// Manifest and ports for the pneumatic-cylinder-sizing module (Unit 7.2,
// Milestone 7 / roadmap Phase 2). Self-contained, no linear-axis@1 role,
// no Motor Sizing Tool family relationship (same "new, standalone family"
// treatment pneumatic-cylinder@0.1.0 itself received) -- see
// context/modules/pneumatic-cylinder-sizing/stage-1-spec.md.
//
// Reuses ten existing parameters directly (motion.axis.incline_angle,
// motion.axis.friction_coefficient, motion.axis.total_moving_mass,
// pneumatic.operating_pressure, pneumatic.load_factor,
// pneumatic.cushion_type, pneumatic.mounting_style,
// pneumatic.buckling_safety_factor, pneumatic.max_piston_speed,
// pneumatic.kinetic_energy) -- see stage-2-contract.md "Existing
// Parameter Review". Several inputs are also echoed as outputs
// (operating_pressure, load_factor, buckling_safety_factor,
// mounting_style, cushion_type, required_stroke): CatalogAdapter.
// requiredSpec() (./index.ts) only receives ModuleComputation.outputs,
// not raw resolved inputs, and lib/application/catalogs/
// pneumatic-cylinder-matching.ts needs these resolved values to run its
// own per-candidate formula evaluation.

import {
  asParameterId,
  type ModuleManifest,
  type ModulePorts,
} from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const manifest: Omit<ModuleManifest, "contentHash"> = {
  id: "pneumatic-cylinder-sizing",
  version: "0.1.0",
  sdkRange: { min: "1.0.0" },
  // Draft-authored against registry 1.17.0. Keep this literal -- never
  // import the mutable current-version constant
  // (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.17.0",
  category: "cylinder-sizing.pneumatic",
  tags: ["pneumatic-cylinder-sizing", "pneumatics", "actuator", "catalog-matching"],
  workflowRoles: [],
  validityEnvelopeSummary:
    "Given a load (mass, incline angle, friction coefficient, optional extend-stroke process force), a required stroke, and the engineer's own operating pressure, force-sizing load factor, cushion type, mounting style, and buckling safety factor, computes the required extend/retract force and required cushion kinetic energy for catalog matching against real SMC CM2/CA2 cylinder candidates -- it does not check one already-selected cylinder (that is pneumatic-cylinder@0.1.0's own scope). No load-case (normal/peak/etc.) semantics: every input is a single engineer-supplied value per run. Reproduces (independently, not imported) pneumatic-cylinder@0.1.0's own theoretical-force, cushion-kinetic-energy, and generic Euler buckling formulas -- the same disclosed evidence gaps that module carries (no pneumatic-manufacturer-sourced buckling formula; buckling governs on the extend/thrust stroke only) apply here unchanged. Process force is applied on the extend stroke only, a disclosed 0.1.0 simplification. Required retract force may be negative for a strongly gravity-assisted return stroke, reported as computed. Lateral (side) rod-end load is out of scope, matching pneumatic-cylinder@0.1.0.",
  sourceRevisionIds: [
    asSourceRevisionId(
      "us.milwaukee_cylinder.design_engineering_guide@web-2026-08-24",
    ),
    asSourceRevisionId("jp.smc.air_cylinders_model_selection@web-2026-08-24"),
    asSourceRevisionId("us.norgren.m1000_heavy_duty_cylinders@web-2026-08-24"),
    asSourceRevisionId("jp.smc.cm2_ca2_catalog@web-2026-08-24"),
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
      parameterId: asParameterId("pneumatic_sizing.process_force"),
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
      parameterId: asParameterId("pneumatic_sizing.required_stroke"),
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
  ],
  outputs: [
    {
      key: "required_extend_force",
      parameterId: asParameterId("pneumatic_sizing.required_extend_force"),
    },
    {
      key: "required_retract_force",
      parameterId: asParameterId("pneumatic_sizing.required_retract_force"),
    },
    {
      key: "kinetic_energy",
      parameterId: asParameterId("pneumatic.kinetic_energy"),
    },
    {
      key: "required_stroke_out",
      parameterId: asParameterId("pneumatic_sizing.required_stroke"),
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
      key: "buckling_safety_factor_out",
      parameterId: asParameterId("pneumatic.buckling_safety_factor"),
    },
    {
      key: "mounting_style_out",
      parameterId: asParameterId("pneumatic.mounting_style"),
    },
    {
      key: "cushion_type_out",
      parameterId: asParameterId("pneumatic.cushion_type"),
    },
  ],
};
