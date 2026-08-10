// Validation record for the drive-train module (roadmap module definition
// of done, item 10). Stage 4 (validation) is not complete: one reference
// example (Omron's own worked example) is reproduced through the real
// compute path and hand-verified, but the roadmap's own Module Definition
// of Done wants at least three. The independent-benchmark item (item 9) is
// now met (see ./closed-cycle-benchmark.ts and its own test file) -- a
// structurally different, direct per-phase computation of the same RMS-
// torque physics, cross-checked against resolveEffectiveTorque's closed
// form across varied cycle shapes and (J_total, T_load) pairs, plus a
// counter-example proving the repeating-cycle precondition is load-bearing.
// This is an honest Stage 3/4-partial draft record, not a Stage 4
// completion claim -- two more reference examples are still needed.

import type { ValidationRecord } from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const validation: ValidationRecord = {
  moduleId: "drive-train",
  moduleVersion: "0.1.0",
  methods: [
    "Omron total system inertia and acceleration/deceleration torque (J_total = J_M + J_L; T_A = J_total*alpha)",
    "Omron maximum momentary torque and effective (RMS) torque (T1 = T_A + T_L; Trms = sqrt(sum(T_i^2*t_i)/sum(t_i)), reformulated here as a closed form from motion.profile.rms_acceleration under a stated closed-cycle assumption — context/modules/drive-train/stage-2-contract.md 'Decisions' item 4)",
    "Locally-derived motor-shaft operating speed (n_screw = v/lead; N_op = n_screw*2*pi*gearRatio), reusing coupling 0.1.0's own resolved derivation rather than a manufacturer-specific method",
    "Gearbox-derated load torque (T_L = screw.drive_torque / eta_g), this module's own derating applied on top of ball-screw 0.1.0's own released screw.drive_torque -- see stage-1-spec.md 'A Real Gap Found in an Already-Released Kernel'",
    "Ordinary kinetic-energy regenerative-energy formula (E = J_total*omega^2/2), corroborated in shape by Celera Motion's own resistor-sizing methodology",
  ],
  sourceRevisionIds: [
    asSourceRevisionId("jp.omron.servo_motor_selection_guide@csm-tg-e-3-1"),
    asSourceRevisionId(
      "us.hmk.servo_motor_amplifier_sizing_guide@edition-2-0802",
    ),
    asSourceRevisionId("us.voss.comprehensible_guide_servo_motor_sizing@2007"),
    asSourceRevisionId(
      "jp.oriental_motor.motor_sizing_basics_rms_torque@web-2026-08-10",
    ),
    asSourceRevisionId(
      "us.celera_motion.shunt_resistor_regenerative_braking@web-2026-08-10",
    ),
  ],
  referenceExamples: [
    {
      id: "omron-r88m-u20030-ball-screw-axis",
      description:
        "Omron Corporation's own 'Technical Guide for Servo Motor Selection' sample calculation (printed pp. 12-13): a direct-connected ball-screw axis (5 kg load, 10 mm lead, no gearbox), OMNUC U-series motor R88M-U20030. Reproduced through executeModule (lib/modules/drive-train/0.1.0/omron-reference-example.ts).",
      tolerance:
        "Acceleration torque and maximum momentary torque matched within 0.001 N*m of Omron's own printed T_A=0.165 N*m and T1=0.173 N*m. Effective (RMS) torque matched within 0.0003 N*m (~0.25%) of Omron's own printed Trms=0.0828 N*m -- rms_acceleration is not printed directly by Omron and is derived here from Omron's own printed duty-cycle segments, so the residual reflects Omron's own 3-significant-figure intermediate rounding (JB, JW, TA), not slack introduced to pass the test. All of Omron's own applicable checks (load inertia, effective torque, maximum momentary torque, maximum rotation speed) pass; encoder resolution is out of scope for this module.",
    },
  ],
  independentBenchmark:
    "Met (lib/modules/drive-train/0.1.0/closed-cycle-benchmark.ts). A structurally different, direct per-phase computation of RMS torque (Trms = sqrt(sum(T_i^2*t_i)/sum(t_i)), the general shape every Stage 1 source gives -- stage-1-spec.md item 3) is cross-checked against resolveEffectiveTorque's closed form across four repeating-cycle shapes (2-phase symmetric, 2-phase asymmetric, 4-phase Voss-style accel/dwell/decel/dwell, 5-phase multi-sign-change) and four (J_total, T_load) magnitude pairs, matching to floating-point precision (an algebraic identity, not an approximate corroboration -- the same treatment lib/modules/support-bearing/0.1.0/nsk-fh-benchmark.ts gives NSK's own fh method). A counter-example (a non-repeating cycle, net velocity change != 0) demonstrates the two methods diverge by a large, physically meaningful margin once the repeating-cycle precondition is violated, proving that precondition -- not just the formula's arithmetic -- is what the identity actually depends on. This is this project's own derivation (context/modules/drive-train/stage-1-spec.md 'The RMS-Acceleration Dependency Question'), not sourced from a manufacturer; no new sourceRevisionId is added.",
  reviewer: "TODO",
  reviewDate: "TODO",
  supportedUseLimits: [
    "Draft Stage 3 package: not registered, not released. Stage 4 (validation) is incomplete -- only one of the roadmap's own required three reference examples is reproduced (the independent-benchmark item is met). Investigated 2026-08-10: none of Voss's, HMK's, or Oriental Motor's own examples can supply a second reference example -- each stops short of checking a real catalog motor's rating (context/modules/drive-train/stage-1-spec.md 'Evidence Gaps and Verification Confidence'). A new source is required.",
    "Supports only the normal and peak load cases; holding and emergency_stop are not implemented.",
    "One candidate servo motor per calculation run; does not search a catalog or rank candidates.",
    "drive.reflected_load_inertia is a required engineer-supplied input -- no released upstream parameter derives it (context/modules/drive-train/stage-2-contract.md 'Stage 3 corrections').",
    "The RMS-torque margin, peak-torque margin, and maximum inertia ratio have no built-in default, even though this project's own sources disagree three-to-five ways on each.",
    "The effective (RMS) torque formula relies on a closed-cycle assumption -- verified against a synthetic per-phase torque profile (closed-cycle-benchmark.ts), not yet against a real, non-Omron reference example.",
    "Regenerative energy assumes 100% of the released kinetic energy reaches the drive's own absorption path -- no drive-electronics efficiency loss or DC-bus capacitor-absorption credit is modeled.",
    "Gearbox backlash, transmission error, torsional rigidity, and mechanical life are reported catalog values only, not evaluated.",
    "Holding-brake rated torque is a reported catalog value only -- no standalone catalog-comparison check exists.",
    "Drive/amplifier current and voltage compatibility are out of scope entirely -- the unit registry has no electrical-current dimension yet.",
    "A case with exactly zero total system inertia, motor rotor inertia, lead, or gear ratio is unsupported: the kernel throws rather than reporting a degenerate result.",
  ],
  deviations: [
    "The gearbox transmission-efficiency derating this module applies on top of screw.drive_torque is not present in ball-screw 0.1.0's own released kernel -- a real, documented gap in an already-released module, not invented here (context/modules/drive-train/stage-1-spec.md 'A Real Gap Found in an Already-Released Kernel').",
    "drive.acceleration_torque uses the larger-magnitude of motion.profile.peak_acceleration/peak_deceleration as a single conservative figure rather than evaluating both phases separately -- a documented generalization of Omron's own symmetric worked example (math.ts resolveAccelerationTorque's own doc comment proves this bounds the true worst-case single-phase torque).",
  ],
};
