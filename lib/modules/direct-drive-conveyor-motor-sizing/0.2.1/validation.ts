// Validation record for the direct-drive-conveyor-motor-sizing module.
// Stage 4 (validation) is done as of 2026-08-13 -- see README.md "Stage 4"
// for the full narrative. 0.2.0 is a consistency-pass follow-on
// (docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md)
// that touches no underlying physics -- see the 0.2.0 addendum entry in
// "deviations" below and validation/direct-drive-conveyor-motor-sizing/
// 0.2.0.md.

import { asSourceRevisionId } from "@/lib/standards";
import type { ValidationRecord } from "@/lib/engine";

export const validation: ValidationRecord = {
  moduleId: "direct-drive-conveyor-motor-sizing",
  moduleVersion: "0.2.1",
  methods: [
    "Omron Corporation and Oriental Motor Co., Ltd. conveyor sizing methods (moment of inertia, friction-driven load torque, operating speed, acceleration torque, required torque with a safety factor)",
  ],
  sourceRevisionIds: [
    asSourceRevisionId(
      "jp.oriental_motor.general_catalog_motor_fan_sizing@f-tecref-2003-2004",
    ),
    asSourceRevisionId("jp.omron.servo_motor_selection_guide@csm-tg-e-3-1"),
  ],
  referenceExamples: [
    {
      id: "oriental-motor-f8-kernel-level",
      description:
        "Oriental Motor Co., Ltd.'s own 'Belt and Pully' worked example (General Catalog Technical Reference p. F-8) reproduced at the kernel level (math.test.ts 'end-to-end: Oriental Motor Co., Ltd.'s own Belt and Pully worked example'): friction force (F=144 oz=40.03 N), load torque (TL=320 oz-in=2.260 N*m), roller+idler+belt+load on-shaft inertia sum (J=2061 oz-in^2=0.03770 kg*m^2, excluding the motor's own rotor), and operating speed (NG=33.4 r/min).",
      tolerance:
        "Friction force and load torque within 5-6 decimal places (exact algebra once mass and gravity are held to the source's own implicit standard-gravity convention). On-shaft inertia within 0.06% (the source's own 3-4 significant-figure rounding of its two roller-mass and drum-diameter inputs). Operating speed within the source's own printed rounding (33.4 r/min).",
    },
    {
      id: "oriental-motor-f8-executemodule",
      description:
        "The same Oriental Motor Co., Ltd. worked example, reproduced through the real executeModule compute path (oriental-motor-reference-examples.test.ts) -- the higher bar this project's own other modules use for a genuine reference example, not just a kernel-level check. load_torque and total_system_inertia (less an arbitrarily-chosen, unsourced motor_rotor_inertia -- the source provides none) both reproduce the same figures as the kernel-level check above.",
      tolerance: "Same as oriental-motor-f8-kernel-level.",
    },
    {
      id: "oriental-motor-f9-executemodule",
      description:
        "Oriental Motor Co., Ltd.'s own 'Conveyor' worked example (General Catalog Technical Reference p. F-9), reproduced through executeModule for its load_torque only (F=9.9 lb, TL=22 lb-in=2.486 N*m) -- the one figure in this example this module's own correct-physics kernel can reproduce. The example's own printed belt+work inertia figure (Jm2=132 oz-in^2) is a genuine, disclosed arithmetic inconsistency internal to the source itself (it omits the lb-to-oz conversion factor its own single-roller Jm1=70.4 oz-in^2 term correctly applies three lines earlier in the same worked example) -- this module's own kernel implements the physically correct formula (which yields ~2112 oz-in^2 for the same inputs) and does not reproduce the printed 132 figure. The single-roller inertia term (Jm1=70.4 oz-in^2) is separately confirmed at the kernel level (math.test.ts).",
      tolerance:
        "load_torque within 4-5 decimal places (exact algebra). Jm1 (single-roller inertia, math.test.ts) within 6 decimal places. Jm2/JG are explicitly NOT reproduced -- see 'deviations'.",
    },
  ],
  independentBenchmark:
    "omron-independent-benchmark.test.ts cross-checks this module's own decomposed inertia kernel (resolveRollerInertia + resolveReflectedIdlerInertia + resolveLinearMassInertia + resolveReflectedLoadInertia) against Omron Corporation's own single combined formula (JW = J1+J2+J3+J4 = (M1*D1^2/8 + M2*D2^2/8*(D1/D2)^2 + M3*D1^2/4 + M4*D1^2/4)*1e-6, Servo Selection.pdf p. 8) -- a structurally independent second-manufacturer source stating the identical formula shape (stage-1-spec.md 'Candidate Methods' item 1), reimplemented here as a genuinely separate mm-based computation rather than assumed identical. A property-based sweep over 200 random roller/belt/load scenarios confirms the two structurally different computations agree to floating-point precision in every case, not just the one hand-verified in stage-1-spec.md -- the same 'proved identity' treatment linear-guide@0.1.0's own PMI/IKO benchmark and support-bearing@0.1.0's own NSK fh/fn benchmark already used for their own algebraically-equivalent independent comparisons.",
  reviewer:
    "Solo validation -- Omron Corporation independent-benchmark substitute (context/ai-workflow-rules.md Stage 4: 'When no second engineer is available, the documented independent benchmark comparison serves as the review substitute').",
  reviewDate: "2026-08-13",
  supportedUseLimits: [
    "acceleration_torque, momentary_torque, and required_torque are NOT validated against either reference example's own printed final figure. Neither of this module's own two fully-verified conveyor worked examples (General Catalog Technical Reference pp. F-8-F-9) computes an acceleration-torque term at all -- both derive their own final required-torque figure from load torque alone, with a safety factor (see 'deviations'). The Ta = J*alpha relationship itself is already validated independently, at the lib/engine/mechanics level (torque.test.ts, against Oriental Motor's own packaged r/min form) and at the ball-screw-motor-sizing@0.1.0 module level (against Omron's and THK's own worked examples that do include a real acceleration phase) -- but this specific pair of conveyor examples cannot confirm it with real conveyor-specific numbers.",
    "p. F-9's own printed belt+work inertia figure (Jm2=132 oz-in^2) is not reproduced -- a genuine, disclosed arithmetic inconsistency internal to the source itself, not a defect in this module's own kernel (see 'deviations').",
    "Horizontal only -- no source found gives an inclined-conveyor formula or worked example.",
    "No motor catalog matching -- required_torque and required_power are reported required-spec values, not pass/fail checks against a candidate motor.",
  ],
  deviations: [
    "Neither of Oriental Motor Co., Ltd.'s own two conveyor worked examples (General Catalog Technical Reference pp. F-8-F-9) computes an acceleration-torque term. Both derive their own final required-torque figure directly from load torque (friction) alone, with a safety factor -- p. F-8's own text: 'On a belt conveyor, the greatest torque is needed when starting the belt,' referring to static-friction breakaway, not an inertial (J*alpha) acceleration term. This module's own registered parameter contract (registry 1.10.0, already released and immutable) nonetheless defines acceleration_torque, momentary_torque = acceleration_torque+load_torque, and required_torque = momentary_torque*Sf, mirroring the already-registered jp.oriental_motor.motor_sizing_calculations web page's own general TM=(TL+Ta)*Sf shape (the same general method motor_sizing.ball_screw.required_torque and every stepping-motor/index-table example in this same document already use). This module's own kernel therefore computes a real, nonzero acceleration_torque for both reference scenarios above, using an engineer-supplied acceleration_time neither source states -- a real, disclosed evidence gap for those three specific output ports, not a formula this project invented without any source basis.",
    "p. F-9's own printed Jm2=132 oz-in^2 (belt+work inertia) is internally inconsistent with its own Jm1=70.4 oz-in^2 (single-roller inertia) three lines earlier in the same worked example: Jm1 correctly multiplies its own lb input by 16 to convert to oz before squaring the diameter (2.2 lb * 16 = 35.2 oz, matching m2=35.27 oz used identically in the separately-verified p. F-8 example), while Jm2 uses its own 33 lb input directly, without the same *16 conversion (33*(4/2)^2=132, not 528*(4/2)^2=2112). Recorded as a source-internal printing/arithmetic error, not resolved by this module (this environment cannot render a cleaner copy of this specific dense PDF page to double-check by eye) -- this module's own kernel implements the physically correct, internally consistent formula throughout, and does not reproduce the printed 132 figure.",
    "0.2.0 addendum, not a re-validation of the underlying physics (unchanged): (1) gravity is no longer an editable input -- resolveFrictionForce now hardcodes STANDARD_GRAVITY_M_PER_S2 = 9.80665 m/s^2 (math.ts), the exact value motion.axis.gravity's own registry constant default already supplied everywhere this module used it. Behavior-neutral: every existing reference example above (both Oriental Motor worked examples, the Omron independent benchmark) re-passes unchanged under 0.2.0 -- that unchanged pass is the regression proof, not a new derivation. (2) inertia_ratio_maximum now resolves to motor_sizing.direct_drive_conveyor.inertia_ratio_recommended_maximum (registry 1.15.0), a founder-directed default of 10:1 -- NOT a manufacturer-sourced value. The check's own exceeded-case status changed from 'fail' to 'warning' to match: exceeding a recommended (not required) default is advisory, never blocking. Both changes per docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md.",
    "0.2.1: resolveInertiaRatio (math.ts) now adds the drive roller's own inertia into its numerator alongside resolveReflectedLoadInertia's own idler+belt+load total. 0.2.0 silently excluded the drive roller -- the same inertia resolveTotalSystemInertia already added to the motor rotor one step later -- so a heavy or large-diameter drive roller could report a passing inertia-ratio check while the true load-side/rotor ratio was far above the declared maximum (a reproduced case: reported ratio 0.03, true ratio 1250). Both existing reference examples above use a light drive roller relative to their own carried load, so their printed inertia_ratio figures are unaffected by this fix (neither Oriental Motor worked example states an inertia-ratio figure to compare against in the first place -- see reference examples above). Every sibling Motor Sizing Tool module already folds its own drive-side roller/pulley inertia into the ratio's numerator; this brings direct-drive-conveyor-motor-sizing in line with that established convention. A release audit (2026-08-20) found the discrepancy.",
  ],
};
