// linear-axis@1.0.0 — the first guided workflow (Unit 4.8), coordinating the
// seven Milestone-4 calculation modules (axis-load-cases, motion-profile,
// ball-screw, linear-guide, coupling, support-bearing, drive-train) without
// combining their compute logic (context/architecture.md "lib/workflows/").
//
// This file is pure declarative data — it names roles, parameter IDs, and
// rule shapes, never a module's own port key or a concrete ModulePackage
// import. `./definition.test.ts` is what actually reaches into each of the
// seven modules' real `manifest.ts` files to confirm every claim here is
// still true; that split keeps this file decoupled from which specific
// modules exist or how they're currently registered (none of the seven are
// registered yet — see each module's own README.md "Status").
//
// See context/adr/0007-workflow-definition-contract.md for the full
// reasoning behind every design choice below (role cardinalities, which
// cross-module checks are implemented vs. documented as gaps, why ranking is
// lexicographic, and why the vertical-holding requirement is a completion
// rule rather than a numeric check).

import { asParameterId } from "@/lib/engine";
import type { WorkflowDefinition } from "@/lib/workflows/workflow-sdk";

const THRUST_FORCE = asParameterId("motion.axis.thrust_force");
const RESULTANT_FORCE = asParameterId("motion.axis.resultant_force");
const RESULTANT_MOMENT = asParameterId("motion.axis.resultant_moment");
const DRIVE_TORQUE = asParameterId("screw.drive_torque");
const PEAK_ACCELERATION = asParameterId("motion.profile.peak_acceleration");
const PEAK_DECELERATION = asParameterId("motion.profile.peak_deceleration");
const RMS_ACCELERATION = asParameterId("motion.profile.rms_acceleration");
const ORIENTATION = asParameterId("motion.axis.orientation");
const LEAD = asParameterId("screw.lead");
const GEAR_RATIO = asParameterId("screw.gear_ratio");
const NOMINAL_LIFE = asParameterId("screw.nominal_life");
const STATIC_SAFETY_FACTOR = asParameterId("screw.static_safety_factor");
const GUIDE_NOMINAL_LIFE = asParameterId("guide.nominal_life");
const INERTIA_RATIO = asParameterId("drive.inertia_ratio");

/**
 * The acknowledgment ID a `conditional_acknowledgment` completion rule looks
 * for (an `Assumption.id`) once the axis's resolved orientation is
 * `"vertical"` — see `context/implementation-map.md` Unit 4.8 "Cross-Module
 * Checks": "Vertical holding behavior has a recorded design response." No
 * parameter in this project's registry represents a required holding
 * torque, so this stays a recorded acknowledgment, not a numeric check
 * (context/adr/0007-workflow-definition-contract.md).
 */
export const VERTICAL_HOLDING_ACKNOWLEDGMENT_ID =
  "linear-axis.vertical-holding-response";

export const linearAxisDefinition: WorkflowDefinition = {
  manifest: {
    id: "linear-axis",
    version: "1.0.0",
    title: "Linear Axis",
    description:
      "Guides an axis application/load-case, motion profile, ball screw, linear guide, coupling, support bearings, and servo drive train through one coordinated design.",
  },

  roles: [
    {
      id: "linear-axis.axis",
      label: "Axis application and load cases",
      moduleIds: ["axis-load-cases"],
      cardinality: { min: 1, max: 1 },
    },
    {
      id: "linear-axis.motion",
      label: "Motion profile",
      moduleIds: ["motion-profile"],
      cardinality: { min: 1, max: 1 },
    },
    {
      id: "linear-axis.screw",
      label: "Ball screw and screw support",
      moduleIds: ["ball-screw"],
      cardinality: { min: 1, max: 1 },
    },
    {
      id: "linear-axis.guide",
      label: "Linear guide",
      moduleIds: ["linear-guide"],
      // One instance covers the whole rail/block arrangement — the module's
      // own scope already models a full two-rail/four-block scenario in one
      // run (context/modules/linear-guide/stage-1-spec.md).
      cardinality: { min: 1, max: 1 },
    },
    {
      id: "linear-axis.coupling",
      label: "Coupling",
      moduleIds: ["coupling"],
      // Optional by design: the founder confirmed (2026-08-10) that
      // direct-drive axes (motor coupled straight to the screw, no separate
      // coupling component) are a real configuration — see
      // context/adr/0007-workflow-definition-contract.md "Consequences".
      cardinality: { min: 0, max: 1 },
    },
    {
      id: "linear-axis.bearing",
      label: "Support bearing",
      moduleIds: ["support-bearing"],
      // support-bearing 0.1.0 models one bearing (fixed or supported) per
      // run (context/modules/support-bearing/stage-2-contract.md), so a
      // fixed+supported arrangement needs two instances of this role. The
      // fixed/supported distinction itself lives in each instance's own
      // `bearing.location` input, not in the role.
      cardinality: { min: 1, max: 2 },
    },
    {
      id: "linear-axis.drive",
      label: "Servo drive train",
      moduleIds: ["drive-train"],
      cardinality: { min: 1, max: 1 },
    },
  ],

  // Dependency levels derived directly from linkRules below: axis/motion
  // produce values nothing else here depends on; screw/guide/bearing all
  // consume axis's outputs; coupling/drive both consume screw's drive
  // torque, and drive also consumes motion's outputs.
  sequence: [
    ["linear-axis.axis", "linear-axis.motion"],
    ["linear-axis.screw", "linear-axis.guide", "linear-axis.bearing"],
    ["linear-axis.coupling", "linear-axis.drive"],
  ],

  linkRules: [
    {
      id: "axis-thrust-to-screw",
      parameterId: THRUST_FORCE,
      fromRoleId: "linear-axis.axis",
      toRoleId: "linear-axis.screw",
    },
    {
      id: "axis-thrust-to-bearing",
      parameterId: THRUST_FORCE,
      fromRoleId: "linear-axis.axis",
      toRoleId: "linear-axis.bearing",
      note: "Only support-bearing's fixed-location instance declares this input port; the supported-location instance has no matching sink, so this rule resolves to at most one proposal per bearing instance.",
    },
    {
      id: "axis-resultant-force-to-guide",
      parameterId: RESULTANT_FORCE,
      fromRoleId: "linear-axis.axis",
      toRoleId: "linear-axis.guide",
    },
    {
      id: "axis-resultant-moment-to-guide",
      parameterId: RESULTANT_MOMENT,
      fromRoleId: "linear-axis.axis",
      toRoleId: "linear-axis.guide",
    },
    {
      id: "screw-drive-torque-to-coupling",
      parameterId: DRIVE_TORQUE,
      fromRoleId: "linear-axis.screw",
      toRoleId: "linear-axis.coupling",
    },
    {
      id: "screw-drive-torque-to-drive",
      parameterId: DRIVE_TORQUE,
      fromRoleId: "linear-axis.screw",
      toRoleId: "linear-axis.drive",
    },
    {
      id: "motion-peak-acceleration-to-drive",
      parameterId: PEAK_ACCELERATION,
      fromRoleId: "linear-axis.motion",
      toRoleId: "linear-axis.drive",
    },
    {
      id: "motion-peak-deceleration-to-drive",
      parameterId: PEAK_DECELERATION,
      fromRoleId: "linear-axis.motion",
      toRoleId: "linear-axis.drive",
    },
    {
      id: "motion-rms-acceleration-to-drive",
      parameterId: RMS_ACCELERATION,
      fromRoleId: "linear-axis.motion",
      toRoleId: "linear-axis.drive",
    },
  ],

  completionRules: [
    {
      kind: "role_cardinality",
      id: "axis-present",
      roleId: "linear-axis.axis",
    },
    {
      kind: "role_cardinality",
      id: "motion-present",
      roleId: "linear-axis.motion",
    },
    {
      kind: "role_cardinality",
      id: "screw-present",
      roleId: "linear-axis.screw",
    },
    {
      kind: "role_cardinality",
      id: "guide-present",
      roleId: "linear-axis.guide",
    },
    {
      kind: "role_cardinality",
      id: "coupling-cardinality",
      roleId: "linear-axis.coupling",
    },
    {
      kind: "role_cardinality",
      id: "bearing-cardinality",
      roleId: "linear-axis.bearing",
    },
    {
      kind: "role_cardinality",
      id: "drive-present",
      roleId: "linear-axis.drive",
    },

    {
      kind: "link_confirmed",
      id: "thrust-to-screw-linked",
      ruleId: "axis-thrust-to-screw",
    },
    {
      kind: "link_confirmed",
      id: "thrust-to-bearing-linked",
      ruleId: "axis-thrust-to-bearing",
    },
    {
      kind: "link_confirmed",
      id: "resultant-force-to-guide-linked",
      ruleId: "axis-resultant-force-to-guide",
    },
    {
      kind: "link_confirmed",
      id: "resultant-moment-to-guide-linked",
      ruleId: "axis-resultant-moment-to-guide",
    },
    {
      kind: "link_confirmed",
      id: "drive-torque-to-coupling-linked",
      ruleId: "screw-drive-torque-to-coupling",
    },
    {
      kind: "link_confirmed",
      id: "drive-torque-to-drive-linked",
      ruleId: "screw-drive-torque-to-drive",
    },
    {
      kind: "link_confirmed",
      id: "peak-acceleration-to-drive-linked",
      ruleId: "motion-peak-acceleration-to-drive",
    },
    {
      kind: "link_confirmed",
      id: "peak-deceleration-to-drive-linked",
      ruleId: "motion-peak-deceleration-to-drive",
    },
    {
      kind: "link_confirmed",
      id: "rms-acceleration-to-drive-linked",
      ruleId: "motion-rms-acceleration-to-drive",
    },

    {
      kind: "no_failing_checks",
      id: "no-failing-checks",
      roleIds: [
        "linear-axis.axis",
        "linear-axis.motion",
        "linear-axis.screw",
        "linear-axis.guide",
        "linear-axis.coupling",
        "linear-axis.bearing",
        "linear-axis.drive",
      ],
    },

    {
      kind: "conditional_acknowledgment",
      id: "vertical-holding-acknowledged",
      roleId: "linear-axis.axis",
      parameterId: ORIENTATION,
      whenValue: "vertical",
      acknowledgmentId: VERTICAL_HOLDING_ACKNOWLEDGMENT_ID,
    },
  ],

  checkRules: [
    // "Guide load cases use the same axis frame and duty definition"
    // (context/implementation-map.md Unit 4.8): axis and guide both take
    // motion.axis.orientation as an independent input (it is not a module
    // output either module produces), so nothing but this check guards
    // against the two ever diverging. The force/moment half of this
    // requirement is already covered by the link_confirmed rules above,
    // since linear-axis.axis has cardinality 1 — once those links are
    // confirmed there is structurally only one possible source.
    {
      kind: "shared_value_topology",
      id: "shared-orientation",
      parameterId: ORIENTATION,
      roleIds: ["linear-axis.axis", "linear-axis.guide"],
    },
    // screw.lead has no producing module (documented gap in every consuming
    // module's own cross-module-links.test.ts); four roles enter it
    // independently, so a single-sourced check catches real divergence.
    {
      kind: "shared_value_topology",
      id: "shared-lead",
      parameterId: LEAD,
      roleIds: [
        "linear-axis.screw",
        "linear-axis.coupling",
        "linear-axis.bearing",
        "linear-axis.drive",
      ],
    },
    {
      kind: "shared_value_topology",
      id: "shared-gear-ratio",
      parameterId: GEAR_RATIO,
      roleIds: [
        "linear-axis.screw",
        "linear-axis.coupling",
        "linear-axis.drive",
      ],
    },
  ],

  // A starting comparison ordering, not a validated priority — the founder's
  // own judgment call to refine (context/adr/0007-workflow-definition-contract.md
  // "Consequences"). Deliberately lexicographic, not weighted: see
  // lib/workflows/workflow-sdk/comparison.ts's own file header.
  comparisonCriteria: [
    {
      id: "screw-static-safety-peak",
      roleId: "linear-axis.screw",
      parameterId: STATIC_SAFETY_FACTOR,
      loadCase: "peak",
      direction: "higher_is_better",
    },
    {
      id: "screw-nominal-life",
      roleId: "linear-axis.screw",
      parameterId: NOMINAL_LIFE,
      direction: "higher_is_better",
    },
    {
      id: "guide-nominal-life-peak",
      roleId: "linear-axis.guide",
      parameterId: GUIDE_NOMINAL_LIFE,
      loadCase: "peak",
      direction: "higher_is_better",
    },
    {
      id: "drive-inertia-ratio",
      roleId: "linear-axis.drive",
      parameterId: INERTIA_RATIO,
      direction: "lower_is_better",
    },
  ],
};
