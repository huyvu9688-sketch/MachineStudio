import type { ValidationRecord } from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const validation: ValidationRecord = {
  moduleId: "guided-cylinder-sizing",
  moduleVersion: "0.2.0",
  methods: [
    "Engineer-supplied guided-load safety-factor method: m_design = m_entered × S_guided before MGP graph selection.",
    "SMC MGP application-case graph selection is preserved as a catalog-boundary operation rather than replaced with an unsourced universal force, moment, or buckling formula.",
  ],
  sourceRevisionIds: [
    asSourceRevisionId("jp.smc.mgp_series_catalog@web-2026-08-26"),
  ],
  referenceExamples: [],
  independentBenchmark:
    "The package's one arithmetic operation is covered by direct hand-check tests. MGP curve anchors and worked selection examples are validated at the separate catalog-curve and catalog-matching boundaries because this immutable package does not import application catalog data.",
  reviewer:
    "Preselection package review: preserves the SMC MGP graph method at the catalog boundary and verifies the package only factors the engineer-selected mass demand.",
  reviewDate: "2026-08-27",
  supportedUseLimits: [
    "Applies only the engineer-selected guided-load safety factor to mass; it does not select a bore or evaluate an MGP graph itself.",
    "Vertical-lifter and horizontal-pusher runs require piston speed and eccentric distance; stopper runs require transfer speed.",
    "Required stroke is preserved for configuration matching. Operating pressure is preserved for later theoretical candidate reporting and is not a stopper graph input.",
  ],
  deviations: [
    "No axial-force, friction, process-force, roll/pitch/yaw moment, lateral-load, rotational-torque, or Euler-buckling calculation is carried into the simplified MGP workflow.",
    "The module does not invent a universal load or force limit outside the published MGP selection curves; the catalog matcher owns curve-domain rejection and candidate decisions.",
  ],
};
