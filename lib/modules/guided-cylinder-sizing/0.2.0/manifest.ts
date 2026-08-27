import {
  asParameterId,
  type ModuleManifest,
  type ModulePorts,
} from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const manifest: Omit<ModuleManifest, "contentHash"> = {
  id: "guided-cylinder-sizing",
  version: "0.2.0",
  sdkRange: { min: "1.0.0" },
  // This package was authored against the additive MGP parameter contract.
  parameterRegistryVersion: "1.20.0",
  category: "cylinder-sizing.pneumatic-guided",
  tags: [
    "guided-cylinder-sizing",
    "pneumatics",
    "actuator",
    "mgp",
    "catalog-matching",
  ],
  workflowRoles: [],
  validityEnvelopeSummary:
    "MGP-first guided-cylinder preselection for a vertical lifter, horizontal pusher, or stopper. It factors the engineer-entered load mass once by the guided-load safety factor and preserves the common manufacturer-selection context for catalog matching. MGP graph selection, candidate force reporting, and all candidate acceptance decisions are performed only by the catalog boundary. This package does not calculate a force, moment, roll/pitch/yaw loading, friction, process force, or Euler buckling.",
  sourceRevisionIds: [
    asSourceRevisionId("jp.smc.mgp_series_catalog@web-2026-08-26"),
  ],
};

export const ports: ModulePorts = {
  inputs: [
    {
      key: "application_case",
      parameterId: asParameterId(
        "pneumatic_guided_mgp_sizing.application_case",
      ),
      required: true,
    },
    {
      key: "load_mass",
      parameterId: asParameterId("motion.axis.total_moving_mass"),
      required: true,
    },
    {
      key: "load_safety_factor",
      parameterId: asParameterId(
        "pneumatic_guided_mgp_sizing.load_safety_factor",
      ),
      required: true,
    },
    {
      key: "required_stroke",
      parameterId: asParameterId("pneumatic_guided_sizing.required_stroke"),
      required: true,
    },
    {
      key: "operating_pressure",
      parameterId: asParameterId("pneumatic.operating_pressure"),
      required: true,
    },
    {
      key: "max_piston_speed",
      parameterId: asParameterId("pneumatic.max_piston_speed"),
      required: false,
    },
    {
      key: "eccentric_distance",
      parameterId: asParameterId(
        "pneumatic_guided_mgp_sizing.eccentric_distance",
      ),
      required: false,
    },
    {
      key: "transfer_speed",
      parameterId: asParameterId("pneumatic_guided_mgp_sizing.transfer_speed"),
      required: false,
    },
  ],
  outputs: [
    {
      key: "factored_load_mass",
      parameterId: asParameterId("motion.axis.total_moving_mass"),
    },
    {
      key: "application_case_out",
      parameterId: asParameterId(
        "pneumatic_guided_mgp_sizing.application_case",
      ),
    },
    {
      key: "required_stroke_out",
      parameterId: asParameterId("pneumatic_guided_sizing.required_stroke"),
    },
    {
      key: "operating_pressure_out",
      parameterId: asParameterId("pneumatic.operating_pressure"),
    },
  ],
};
