// Manifest and ports for the guided-cylinder-sizing module (Unit 7.3,
// Milestone 7 / roadmap Phase 2). Self-contained, no linear-axis@1 role, no
// Motor Sizing Tool family relationship -- the same "new, standalone
// family" treatment pneumatic-cylinder@0.1.0 and pneumatic-cylinder-
// sizing@0.1.0 already received -- see context/modules/
// guided-cylinder-sizing/stage-1-spec.md.
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
// guided-cylinder-matching.ts needs these resolved values to run its own
// per-candidate formula evaluation -- the same pattern
// pneumatic-cylinder-sizing@0.1.0's own manifest.ts already established.

import {
  asParameterId,
  type ModuleManifest,
  type ModulePorts,
} from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const manifest: Omit<ModuleManifest, "contentHash"> = {
  id: "guided-cylinder-sizing",
  version: "0.1.0",
  sdkRange: { min: "1.0.0" },
  // Draft-authored against registry 1.18.0. Keep this literal -- never
  // import the mutable current-version constant
  // (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.18.0",
  category: "cylinder-sizing.pneumatic-guided",
  tags: [
    "guided-cylinder-sizing",
    "pneumatics",
    "actuator",
    "catalog-matching",
  ],
  workflowRoles: [],
  validityEnvelopeSummary:
    "Given a load (mass, incline angle, friction coefficient, optional extend-stroke process force), a required stroke, three load-offset lever arms (roll/pitch/yaw), and the engineer's own operating pressure, force-sizing load factor, cushion type, mounting style, and buckling safety factor, computes the required extend/retract force and required resultant moment for catalog matching against real SMC MGQ/MGP guided-cylinder candidates. Reuses pneumatic-cylinder-sizing@0.1.0's own force/cushion/buckling formulas unchanged (reproduced independently, not imported) and adds a new moment check neither existing pneumatic module has. No load-case (normal/peak/etc.) semantics. Process force is applied on the extend stroke only, a disclosed 0.1.0 simplification. Required retract force may be negative for a strongly gravity-assisted return stroke, reported as computed. The roll/pitch/yaw moment combination (Euclidean sum) is this module's own engineering assumption, not an SMC-documented method -- neither fetched catalog gives combination guidance. Cushion kinetic energy is reported only, not checked against a candidate: neither MGQ nor MGP catalog publishes a discrete allowable-kinetic-energy figure (both give a load-mass-vs-speed graph instead). Allowable lateral load is checked for MGQ candidates only -- MGP's own catalog publishes a plate-displacement stiffness graph, not a discrete allowable-load rating, for the equivalent data. Piston-rod buckling uses a generic (non-pneumatic-manufacturer-sourced) Euler column formula, the same disclosed evidence gap pneumatic-cylinder@0.1.0 and pneumatic-cylinder-sizing@0.1.0 already carry.",
  sourceRevisionIds: [
    asSourceRevisionId("jp.smc.mgq_series_catalog@web-2026-08-26"),
    asSourceRevisionId("jp.smc.mgp_series_catalog@web-2026-08-26"),
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
      parameterId: asParameterId("pneumatic_guided_sizing.process_force"),
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
      parameterId: asParameterId("pneumatic_guided_sizing.required_stroke"),
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
      key: "roll_offset",
      parameterId: asParameterId("pneumatic_guided_sizing.roll_offset"),
      required: true,
    },
    {
      key: "pitch_offset",
      parameterId: asParameterId("pneumatic_guided_sizing.pitch_offset"),
      required: true,
    },
    {
      key: "yaw_offset",
      parameterId: asParameterId("pneumatic_guided_sizing.yaw_offset"),
      required: true,
    },
  ],
  outputs: [
    {
      key: "required_extend_force",
      parameterId: asParameterId(
        "pneumatic_guided_sizing.required_extend_force",
      ),
    },
    {
      key: "required_retract_force",
      parameterId: asParameterId(
        "pneumatic_guided_sizing.required_retract_force",
      ),
    },
    {
      key: "required_moment",
      parameterId: asParameterId("pneumatic_guided_sizing.required_moment"),
    },
    {
      key: "kinetic_energy",
      parameterId: asParameterId("pneumatic.kinetic_energy"),
    },
    {
      key: "required_stroke_out",
      parameterId: asParameterId("pneumatic_guided_sizing.required_stroke"),
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
