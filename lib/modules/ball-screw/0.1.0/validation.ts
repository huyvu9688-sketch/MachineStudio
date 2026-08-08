// Validation record for the ball-screw module (roadmap module definition of
// done, item 10). This is a Stage 3 draft record, not a Stage 4 completion:
// the reviewer field stays TODO. The three reference examples below all come
// from one shared Rockford Ball Screw worked scenario (drive torque,
// buckling, and critical speed applied to the same input numbers), not three
// independent scenarios — recorded honestly as such, distinct from
// axis-load-cases' three genuinely independent THK examples. Do not treat
// the rest of this record as release evidence; it does not by itself satisfy
// the Stage 1 spec's own evidence gaps (context/modules/ball-screw/
// stage-1-spec.md "Evidence Gaps and Verification Confidence").

import type { ValidationRecord } from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const validation: ValidationRecord = {
  moduleId: "ball-screw",
  moduleVersion: "0.1.0",
  methods: [
    "Oriental Motor ball-screw-drive load-torque method",
    "Steinmeyer equivalent (cube-mean) dynamic axial load and cubic fatigue-life law",
    "WY Ball Screw static safety factor (fs = C0 / applied load)",
    "Rockford Ball Screw buckling (Euler column) and critical (whip) speed methods, minor/root diameter basis",
  ],
  sourceRevisionIds: [
    asSourceRevisionId(
      "jp.oriental_motor.motor_sizing_calculations@web-2026-08-08",
    ),
    asSourceRevisionId("us.steinmeyer.ball_screw_technology@web-2026-08-08"),
    asSourceRevisionId("us.rockford_ball_screw.how_to_size@update-2018"),
    asSourceRevisionId("us.wy_ball_screw.understanding_load@web-2026-08-08"),
  ],
  referenceExamples: [
    {
      id: "rockford-drive-torque",
      description:
        "Rockford Ball Screw, 'How To Size A Ball Screw,' step 10: Pt = 500 lbf, Sl = .250 in, Eff = 90%. Published torque 23 in-lbs (the source's own shown arithmetic, .177*500*.250, computes to 22.125, not 23 — its own final rounding is internally inconsistent, not evidence against the formula). resolveDriveTorque reproduces 22.1 from the more precise 1/(2*pi*0.9), matching the source's own shown arithmetic to within its own rounding.",
      tolerance:
        "matches the source's own shown arithmetic (not its final rounded print) to within 0.1 in-lbs",
    },
    {
      id: "rockford-buckling",
      description:
        "Rockford Ball Screw, 'How To Size A Ball Screw,' step 9: Dmin = .84 in, L = 41.347 in, Fixed-Simple, Fs = 0.8. Published Pc = 6,537 lbf. resolveBucklingLoad reproduces this figure using Rockford's own formula and end-fixity coefficients.",
      tolerance: "+/-1 lbf (whole-pound-force catalog rounding)",
    },
    {
      id: "rockford-critical-speed",
      description:
        "Rockford Ball Screw, 'How To Size A Ball Screw,' step 6: same geometry as the buckling example. Published permissible linear speed 687 in/min. resolveCriticalSpeed reproduces this figure.",
      tolerance: "matches within whole-unit catalog rounding",
    },
  ],
  independentBenchmark:
    "Drive torque is implemented from Oriental Motor's 'Motor Sizing Calculations' (T_L = F*P/(2*pi*eta) + mu0*F0*P/(2*pi), divided by gear ratio) and independently cross-checked against Rockford Ball Screw's own worked example (a different manufacturer's document), which gives the same F*P/(2*pi*eta) term independently and agrees to within its own shown-arithmetic rounding — see the rockford-drive-torque reference example above, and lib/modules/ball-screw/0.1.0/math.test.ts. Buckling and critical speed do not have a comparably independent second-source computation: Rockford's own formula and coefficients are what the kernel implements directly (not a separate implementation cross-checked against Rockford), because only Rockford's page supplied a worked numeric example to validate against; Steinmeyer's differing buckling safety margin (0.5 vs. Rockford's 0.8) is a documented discrepancy, not an independent computation match — see context/modules/ball-screw/stage-1-spec.md 'Evidence Gaps and Verification Confidence'.",
  reviewer: "TODO",
  reviewDate: "TODO",
  supportedUseLimits: [
    "Draft Stage 3 package: not registered, not released. No reviewer is recorded yet.",
    "Supports only the normal and peak load cases; holding and emergency_stop are not implemented.",
    "One straight ball-screw shaft, rotating-screw / translating-nut arrangement only, on one linear axis.",
    "One of four end-support arrangements (fixed-fixed, fixed-supported, supported-supported, fixed-free); buckling and critical-speed formulas use the screw's minor (root) diameter.",
    "The dynamic load rating must be on a revolutions basis; a distance-basis rating is rejected by the input schema, not converted.",
    "The static safety factor minimum and the buckling safety margin are required inputs with no built-in default; published guidance disagrees on both (see stage-2-contract.md).",
    "No preload-dependent stiffness modeling beyond the internal-friction/efficiency terms, no thermal derating, no structural compliance, backlash, or lubrication-regime modeling.",
  ],
  deviations: [
    "The buckling safety margin is engineer-supplied per run rather than a single fixed constant, because Steinmeyer (0.5) and Rockford (0.8) disagree for the identical formula and neither source is definitively authoritative (context/modules/ball-screw/stage-2-contract.md 'Decisions' item 2).",
    "The static safety factor minimum is engineer-supplied per run rather than a single fixed constant, because no manufacturer or standards-body minimum was confirmed by direct reading across two sourcing sessions (context/modules/ball-screw/stage-2-contract.md 'Decisions' item 1).",
    "The DN/manufacturer-speed-limit check is evaluated only when the specific screw's own catalog data supplies it (stage-1-spec.md item 9); it is not a formula this module derives.",
  ],
};
