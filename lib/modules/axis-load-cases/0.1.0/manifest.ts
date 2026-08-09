// Manifest and ports for the axis-load-cases module (Unit 4.1, Stage 3 draft).
//
// v0.1.0 scope: the `normal` and `peak` load cases only. `holding` and
// `emergency_stop` are deferred to a future version — neither ID39 nor ID42
// contains a holding/brake case or an emergency-stop case, so there is no
// evidence to source their semantics from yet. See
// context/modules/axis-load-cases/stage-2-contract.md, "Deferred Decisions
// and Release Gates" item 1 (resolved 2026-08-07), and
// context/progress-tracker.md "Open decisions".
//
// This package is intentionally NOT registered: this directory has no
// `index.ts`, so `npm run registry:generate` cannot discover it (see
// ./README.md). Registration requires the Stage 1 validation gate
// (release-grade ID39/ID42 evidence, published reference examples, an
// independent benchmark) — see context/progress-tracker.md "Blocked".

import {
  asParameterId,
  type LoadCaseCategory,
  type ModuleInputPort,
  type ModuleManifest,
  type ModulePorts,
} from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

const MOVING_CASES = [
  "normal",
  "peak",
] as const satisfies readonly LoadCaseCategory[];

export const manifest: Omit<ModuleManifest, "contentHash"> = {
  id: "axis-load-cases",
  version: "0.1.0",
  sdkRange: { min: "1.0.0" },
  // Draft-authored against registry 1.4.0 (originally 1.1.0; bumped
  // 2026-08-09 when this still-unregistered draft gained the
  // resultant_force/resultant_moment output ports below — see
  // context/modules/linear-guide/stage-1-spec.md). Keep this literal —
  // never import the mutable current-version constant
  // (context/ai-workflow-rules.md).
  parameterRegistryVersion: "1.4.0",
  category: "motion.axis",
  tags: ["axis", "load-case"],
  // No linear-axis@1 workflow role vocabulary exists yet (Unit 4.8 is not
  // started); leave empty rather than invent one.
  workflowRoles: [],
  validityEnvelopeSummary:
    "One rigid moving assembly on a straight axis; horizontal, vertical, or inclined 0-90 degrees; normal and peak load cases only (holding and emergency_stop are not supported by this version); scalar Coulomb friction in [0, 1]; explicit external process force/moment and center-of-mass offset per case; no structural compliance, backlash, guide-block load distribution, collision impact, regenerative braking, or brake sizing.",
  sourceRevisionIds: [
    asSourceRevisionId("us.nist.sp811@web-2026-07-31"),
    asSourceRevisionId("jp.thk.ball_screw_general_catalog@515-1e"),
  ],
};

function perCasePorts(
  loadCase: (typeof MOVING_CASES)[number],
): ModuleInputPort[] {
  return [
    {
      key: `${loadCase}_travel_direction`,
      parameterId: asParameterId("motion.axis.case_travel_direction"),
      required: true,
      loadCase,
    },
    {
      key: `${loadCase}_axial_acceleration`,
      parameterId: asParameterId("motion.axis.case_axial_acceleration"),
      required: true,
      loadCase,
    },
    {
      key: `${loadCase}_guide_resistance_force`,
      parameterId: asParameterId("motion.axis.guide_resistance_force"),
      required: true,
      loadCase,
    },
    {
      key: `${loadCase}_external_force`,
      parameterId: asParameterId("motion.axis.external_force"),
      required: false,
      loadCase,
    },
    {
      key: `${loadCase}_external_moment`,
      parameterId: asParameterId("motion.axis.external_moment"),
      required: false,
      loadCase,
    },
  ];
}

export const ports: ModulePorts = {
  inputs: [
    {
      key: "orientation",
      parameterId: asParameterId("motion.axis.orientation"),
      required: true,
    },
    {
      key: "incline_angle",
      parameterId: asParameterId("motion.axis.incline_angle"),
      required: true,
    },
    // Exactly one mass route: `total_moving_mass`, or the complete
    // `payload_mass` + `carriage_mass` (+ optional `additional_moving_mass`)
    // breakdown. `./input-schema.ts` enforces the exclusivity; no port here
    // is individually required so that either route validates.
    {
      key: "total_moving_mass",
      parameterId: asParameterId("motion.axis.total_moving_mass"),
      required: false,
    },
    {
      key: "payload_mass",
      parameterId: asParameterId("motion.axis.payload_mass"),
      required: false,
    },
    {
      key: "carriage_mass",
      parameterId: asParameterId("motion.axis.carriage_mass"),
      required: false,
    },
    {
      key: "additional_moving_mass",
      parameterId: asParameterId("motion.axis.additional_moving_mass"),
      required: false,
    },
    {
      key: "center_of_mass_offset",
      parameterId: asParameterId("motion.axis.center_of_mass_offset"),
      required: false,
    },
    {
      key: "friction_coefficient",
      parameterId: asParameterId("motion.axis.friction_coefficient"),
      required: false,
    },
    {
      key: "gravity",
      parameterId: asParameterId("motion.axis.gravity"),
      // Optional: the registry's constant default (9.80665 m/s^2) auto-fills
      // an absent value (lib/engine/module-sdk/execute.ts resolveModuleInput).
      required: false,
    },
    ...MOVING_CASES.flatMap(perCasePorts),
  ],
  outputs: [
    {
      key: "total_moving_mass",
      parameterId: asParameterId("motion.axis.total_moving_mass"),
    },
    {
      key: "gravitational_force",
      parameterId: asParameterId("motion.axis.gravitational_force"),
    },
    {
      key: "normal_thrust_force",
      parameterId: asParameterId("motion.axis.thrust_force"),
      loadCase: "normal",
    },
    {
      key: "peak_thrust_force",
      parameterId: asParameterId("motion.axis.thrust_force"),
      loadCase: "peak",
    },
    // Full resolved force/moment vectors (all three axis.v1 components),
    // distinct from the axial-only thrust_force scalar above — added for
    // linear-guide (Unit 4.4), which needs the complete guide-reference-
    // point load to distribute across guide blocks. See
    // context/modules/linear-guide/stage-1-spec.md "A Real,
    // Already-Documented Dependency Gap".
    {
      key: "normal_resultant_force",
      parameterId: asParameterId("motion.axis.resultant_force"),
      loadCase: "normal",
    },
    {
      key: "peak_resultant_force",
      parameterId: asParameterId("motion.axis.resultant_force"),
      loadCase: "peak",
    },
    {
      key: "normal_resultant_moment",
      parameterId: asParameterId("motion.axis.resultant_moment"),
      loadCase: "normal",
    },
    {
      key: "peak_resultant_moment",
      parameterId: asParameterId("motion.axis.resultant_moment"),
      loadCase: "peak",
    },
  ],
};
