// Validation record for the drive-train module (roadmap module definition
// of done, item 10). Stage 4 (validation) is now complete: three reference
// examples (Omron's own worked example, plus THK's own horizontal and
// vertical worked examples) are reproduced through the real compute path
// and hand-verified. The independent-benchmark item (item 9) is also met
// (see ./closed-cycle-benchmark.ts and its own test file) -- a structurally
// different, direct per-phase computation of the same RMS-torque physics,
// cross-checked against resolveEffectiveTorque's closed form across varied
// cycle shapes and (J_total, T_load) pairs, plus a counter-example proving
// the repeating-cycle precondition is load-bearing. `reviewer`/`reviewDate`
// stay TODO pending Stage 6, the same treatment every other Milestone 4
// module's own validation.ts gives that pair.

import type { ValidationRecord } from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const validation: ValidationRecord = {
  moduleId: "drive-train",
  moduleVersion: "0.1.0",
  methods: [
    "Omron total system inertia and acceleration/deceleration torque (J_total = J_M + J_L; T_A = J_total*alpha)",
    "Omron maximum momentary torque and effective (RMS) torque (T1 = T_A + T_L; Trms = sqrt(sum(T_i^2*t_i)/sum(t_i)), reformulated here as a closed form from motion.profile.rms_acceleration under a stated closed-cycle assumption — context/modules/drive-train/stage-2-contract.md 'Decisions' item 4)",
    "THK maximum momentary torque, effective (RMS) torque, and minimum motor-inertia rule (motor inertia >= reflected load inertia / 10) -- the identical two-term torque decomposition and RMS shape Omron's own method uses, corroborating it from a second, independent manufacturer (thk-reference-examples.ts)",
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
    asSourceRevisionId(
      "jp.thk.example_ball_screw_selection@technico-mirror-2026-08-10",
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
    {
      id: "thk-horizontal-wtf2040-2-ball-screw-axis",
      description:
        "THK Co., Ltd.'s own 'High-speed Transfer Equipment (Horizontal Use)' worked example (THK Ball Screw General Catalog, 'Examples of Selecting a Ball Screw' chapter): a direct-connected ball-screw axis (80 kg total load, 40 mm lead, no gearbox), AC servo motor (no catalog SKU named -- see below). Reproduced through executeModule (lib/modules/drive-train/0.1.0/thk-reference-examples.ts).",
      tolerance:
        "Maximum momentary torque matched within 0.05 N*m (~0.3%) of THK's own printed Tk=4730 N*mm, and effective (RMS) torque matched within 0.005 N*m (~0.06%) of THK's own printed Trms=1305 N*mm -- both residuals consistent with THK's own printed 3-significant-figure angular-acceleration rounding (1050 rad/s^2 printed vs. 1047.2 rad/s^2 exact), not slack introduced to pass the test. The inertia-ratio check reproduces THK's own 'motor inertia >= reflected load inertia / 10' rule exactly. THK's own text names no specific catalog motor SKU (unlike Omron's own example) -- this fixture supplies a plausible motor with headroom above THK's own stated minimum rated/peak torque, disclosed as such rather than presented as a THK-selected part.",
    },
    {
      id: "thk-vertical-blk1510-5-6-ball-screw-axis-partial",
      description:
        "THK Co., Ltd.'s own 'Vertical Conveyance System' worked example (same source chapter as the horizontal example above): a direct-connected vertical ball-screw axis (50 kg total load, 10 mm lead, no gearbox), AC servo motor (no catalog SKU named). Reproduced through executeModule for the governing upward/peak scenario only (lib/modules/drive-train/0.1.0/thk-reference-examples.ts) -- a partial reference example, the same treatment KTR's own example gets in coupling 0.1.0's own validation record when a source does not supply everything this module's own compute path needs.",
      tolerance:
        "Maximum momentary torque matched within 0.05 N*m (~0.4%) of THK's own printed Tk1=1100 N*mm. The inertia-ratio check reproduces THK's own 'motor inertia >= reflected load inertia / 10' rule exactly. Effective (RMS) torque is deliberately NOT reproduced -- this module's own computed value (~0.901 N*m) diverges from THK's own printed Trms=743 N*mm by roughly 21%, a real, quantified deviation recorded below under 'deviations', not a rounding residual. THK's own lower, gravity-assisted downward momentary torque (Tk2=630 N*mm) is also not reproducible by this module at all -- see 'deviations'.",
    },
  ],
  independentBenchmark:
    "Met (lib/modules/drive-train/0.1.0/closed-cycle-benchmark.ts). A structurally different, direct per-phase computation of RMS torque (Trms = sqrt(sum(T_i^2*t_i)/sum(t_i)), the general shape every Stage 1 source gives -- stage-1-spec.md item 3) is cross-checked against resolveEffectiveTorque's closed form across four repeating-cycle shapes (2-phase symmetric, 2-phase asymmetric, 4-phase Voss-style accel/dwell/decel/dwell, 5-phase multi-sign-change) and four (J_total, T_load) magnitude pairs, matching to floating-point precision (an algebraic identity, not an approximate corroboration -- the same treatment lib/modules/support-bearing/0.1.0/nsk-fh-benchmark.ts gives NSK's own fh method). A counter-example (a non-repeating cycle, net velocity change != 0) demonstrates the two methods diverge by a large, physically meaningful margin once the repeating-cycle precondition is violated, proving that precondition -- not just the formula's arithmetic -- is what the identity actually depends on. This is this project's own derivation (context/modules/drive-train/stage-1-spec.md 'The RMS-Acceleration Dependency Question'), not sourced from a manufacturer; no new sourceRevisionId is added.",
  reviewer: "TODO",
  reviewDate: "TODO",
  supportedUseLimits: [
    "Draft Stage 3 package: not registered, not released. Stage 5 (cross-module link compatibility, generic UI/report schema conformance) is done; Stage 6 (release) no longer waits on Unit 4.1's Definition of Done, which released as axis-load-cases@0.1.0 on 2026-08-11 (validation/axis-load-cases/0.1.0.md) -- this module's own Stage 6 has simply not started yet.",
    "Supports only the normal and peak load cases; holding and emergency_stop are not implemented.",
    "One candidate servo motor per calculation run; does not search a catalog or rank candidates.",
    "drive.reflected_load_inertia is a required engineer-supplied input -- no released upstream parameter derives it (context/modules/drive-train/stage-2-contract.md 'Stage 3 corrections').",
    "The RMS-torque margin, peak-torque margin, and maximum inertia ratio have no built-in default, even though this project's own sources disagree three-to-five ways on each -- including on the margin's own value: Omron's own worked example uses a flat 0.8 for both, while THK's own two worked examples use 1.0 (a plain 'at least' minimum, no derating).",
    "The effective (RMS) torque formula relies on a closed-cycle assumption (total system inertia and the per-case load torque both stay constant across a cycle). Verified as an algebraic identity against a synthetic per-phase torque profile (closed-cycle-benchmark.ts) and against Omron's own and THK's own horizontal worked examples (both closely match). THK's own vertical worked example is a real, sourced counter-case where the precondition does not hold -- see 'deviations' below.",
    "Regenerative energy assumes 100% of the released kinetic energy reaches the drive's own absorption path -- no drive-electronics efficiency loss or DC-bus capacitor-absorption credit is modeled.",
    "Gearbox backlash, transmission error, torsional rigidity, and mechanical life are reported catalog values only, not evaluated.",
    "Holding-brake rated torque is a reported catalog value only -- no standalone catalog-comparison check exists.",
    "Drive/amplifier current and voltage compatibility are out of scope entirely -- the unit registry has no electrical-current dimension yet.",
    "A case with exactly zero total system inertia, motor rotor inertia, lead, or gear ratio is unsupported: the kernel throws rather than reporting a degenerate result.",
  ],
  deviations: [
    "The gearbox transmission-efficiency derating this module applies on top of screw.drive_torque is not present in ball-screw 0.1.0's own released kernel -- a real, documented gap in an already-released module, not invented here (context/modules/drive-train/stage-1-spec.md 'A Real Gap Found in an Already-Released Kernel').",
    "drive.acceleration_torque uses the larger-magnitude of motion.profile.peak_acceleration/peak_deceleration as a single conservative figure rather than evaluating both phases separately -- a documented generalization of Omron's own symmetric worked example (math.ts resolveAccelerationTorque's own doc comment proves this bounds the true worst-case single-phase torque).",
    "THK's own vertical worked example (thk-reference-examples.ts) is a real, sourced case where the closed-cycle RMS-torque assumption's own precondition genuinely does not hold: its load torque differs between the upward (900 N*mm) and downward (830 N*mm) halves of the duty cycle instead of staying constant, and its stationary phase carries a nonzero holding torque (658 N*mm) rather than zero or the constant load torque. Feeding this module's own real required inputs for the governing (upward) case through the actual closed-form kernel gives an effective torque about 21% above THK's own printed figure -- a genuine, quantified deviation, not a rounding residual (contrast the horizontal example's own <0.1% residual). This module also cannot express THK's own lower, gravity-assisted downward momentary torque (630 N*mm) at all, since resolveAccelerationTorque always adds the acceleration torque to the load torque rather than modeling a direction where gravity assists -- a deliberate, documented conservative choice (math.ts's own doc comment), not a defect. Both are real scope limits for vertical/asymmetric-holding installations worth revisiting in a future version, not worked around here.",
  ],
};
