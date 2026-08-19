// Validation record for the ball-screw-motor-sizing module. Stage 4
// (validation) is done as of 2026-08-12 -- see README.md "Stage 4" for the
// full narrative. The package stays unregistered (package.ts, not
// index.ts) regardless of what this record says: registration is a
// separate Stage 6 action (context/ai-workflow-rules.md "New Module
// Workflow").

import { asSourceRevisionId } from "@/lib/standards";
import type { ValidationRecord } from "@/lib/engine";

export const validation: ValidationRecord = {
  moduleId: "ball-screw-motor-sizing",
  moduleVersion: "0.2.0",
  methods: [
    "Oriental Motor Motor Sizing Calculations (moment of inertia, forces, ball-screw load torque, acceleration torque, required torque, effective/RMS torque)",
  ],
  sourceRevisionIds: [
    asSourceRevisionId(
      "jp.oriental_motor.motor_sizing_calculations@web-2026-08-08",
    ),
    asSourceRevisionId("jp.omron.servo_motor_selection_guide@csm-tg-e-3-1"),
    asSourceRevisionId(
      "jp.thk.example_ball_screw_selection@technico-mirror-2026-08-10",
    ),
  ],
  referenceExamples: [
    {
      id: "omron-kernel-level",
      description:
        "Omron Corporation's own worked example (Servo Selection.pdf pp. 12-13) reproduced at the kernel level (math.test.ts 'end-to-end: Omron Corporation's own worked example'): screw/load inertia (JB=1.5e-4, JW=1.63e-4 kg*m^2), load torque (TW=7.8e-3 N*m), motor-shaft speed (N=1800 rpm), acceleration torque (TA=0.165 N*m), momentary torque (T1=0.173 N*m), and effective torque (Trms=0.0828 N*m) all reproduce within the source's own printed rounding.",
      tolerance:
        "Inertia and load torque within 4-6 decimal places (exact algebra); torque figures within ~0.6% (source's own 3-significant-figure rounding).",
    },
    {
      id: "omron-executemodule",
      description:
        "The same Omron Corporation worked example, reproduced through the real executeModule compute path (package.test.ts 'Omron Corporation's own worked example, through executeModule') -- the higher bar this project's own other modules use for a genuine reference example, not just a kernel-level check.",
      tolerance: "Every printed figure within the source's own rounding.",
    },
    {
      id: "thk-horizontal-executemodule",
      description:
        "THK Co., Ltd.'s own 'High-speed Transfer Equipment' (horizontal) worked example, reproduced through executeModule (thk-reference-examples.test.ts): screw+load inertia (J=3.39e-3 kg*m^2), friction torque (T1=120 N*mm), maximum momentary torque (Tk=4730 N*mm), and effective (RMS) torque (Trms=1305 N*mm) -- a baseline confirming the generalization to a genuine N-phase RMS computation did not break the case drive-train@0.1.0's own closed-form approximation already handled correctly.",
      tolerance:
        "Inertia within 0.5%; torque figures within 1% (consistent with THK's own 3-significant-figure rounding of intermediate values, e.g. its own rounded angular-acceleration figure).",
    },
    {
      id: "thk-vertical-executemodule",
      description:
        "THK Co., Ltd.'s own 'Vertical Conveyance System' worked example, reproduced through executeModule (thk-reference-examples.test.ts): screw+load inertia (J=1.58e-4 kg*m^2), upward and downward friction torque magnitudes (T1=900 N*mm, T2=830 N*mm), and the governing maximum momentary torque (Tk1=1100 N*mm) all reproduce within 1%. effective_torque does NOT reproduce THK's own printed 743 N*mm through this path -- see 'deviations' below.",
      tolerance:
        "Inertia and torque figures (other than effective_torque) within 1%.",
    },
    {
      id: "thk-vertical-n-phase-formula-kernel-level",
      description:
        "The key Stage 4 validation target (stage-1-spec.md 'Reference Examples' item 2): resolveEffectiveTorque (the general N-phase Trms formula, ADR-0011's own structural fix) fed THK's own seven printed vertical-example phase torques and durations directly, including the 658 N*mm stationary holding torque this module's own compute.ts does not model -- reproduces THK's own printed 743 N*mm to within 0.5%, confirming the formula itself is correct, isolated from the separate dwell-holding-torque scope gap 'thk-vertical-executemodule' and 'deviations' record.",
      tolerance: "Within 0.5% of THK's own printed 743 N*mm.",
    },
  ],
  independentBenchmark:
    "independent-benchmark.test.ts cross-checks this module's own N-phase Trms against drive-train@0.1.0's own structurally different closed-form resolveEffectiveTorque (a single-scalar rms_acceleration approximation), both run through their own module's real executeModule path against THK Co., Ltd.'s own two published worked examples (reusing drive-train@0.1.0's own already-tested THK fixtures directly, a cross-module test-only import in the same pattern every other module's own cross-module-links.test.ts already establishes). Result: the two methods agree within 1% on the horizontal case (drive-train@0.1.0's own closed-cycle precondition holds) and diverge by ~21% on the vertical case, reproducing -- not merely resembling -- the exact documented gap validation/drive-train/0.1.0.md already discloses (drive-train@0.1.0 computes ~901 N*mm there against THK's own printed 743 N*mm). Agreeing exactly where the precondition holds and diverging exactly where it is violated is the actual evidence the structural fix works, not just a plausible-looking number.",
  reviewer:
    "Solo validation -- drive-train@0.1.0 independent-benchmark substitute (context/ai-workflow-rules.md Stage 4: 'When no second engineer is available, the documented independent benchmark comparison serves as the review substitute').",
  reviewDate: "2026-08-12",
  supportedUseLimits: [
    "0.1.0 is not yet released (package.ts, not index.ts) -- Stage 5 (generic UI/report schema conformance beyond what Stage 3 already builds, workflow role integration) and Stage 6 (release, source-immutability hash, registration) have not started.",
    "No holding-torque formula for a stationary vertical/inclined dwell is modeled (README.md 'Not in scope for 0.1.0'). Quantified by THK's own vertical example: effective_torque understates THK's own printed 743 N*mm by ~29% (thk-vertical-executemodule) whenever a real holding-torque phase is present and non-negligible relative to the moving phases -- a real, disclosed limitation, not a rounding residual.",
    "The module's own scalar drive-force model has no distinct guide-resistance term separate from Coulomb friction (stage-1-spec.md 'Relationship to Existing Released Modules', a deliberate scope narrowing versus axis-load-cases@0.1.0's own fuller model). THK's own vertical example was reproduced by mapping its own 'guide surface resistance' figure onto this module's existing external_force input; a mechanism whose guide resistance is not disclosable as a single external-force-equivalent figure is not directly supported.",
    "Validated at theta=0 (horizontal) and theta=pi/2 (vertical) only; no published worked example at an intermediate incline angle was available this session.",
  ],
  deviations: [
    "effective_torque understates THK Co., Ltd.'s own printed vertical-example figure (743 N*mm) by ~29% through the real executeModule compute path, because the dwell phase always contributes 0 torque rather than THK's own real 658 N*mm stationary holding torque (see 'thk-vertical-executemodule' above). The N-phase Trms FORMULA itself is not at fault -- fed THK's own seven printed phases directly (including the 658 N*mm term), it reproduces 743 N*mm within 0.5% (see 'thk-vertical-n-phase-formula-kernel-level'). Recorded as a real, sourced, quantified deviation from an already-documented scope gap, not a defect discovered here for the first time.",
    "A finding recorded, not a deviation requiring a fix: this module's own resolveDriveForce (math.ts) flips gravity's own sign between the 'forward' and 'return' directions, producing a NEGATIVE signed return_load_torque on THK's own vertical example (-0.83 N*m, versus THK's own printed unsigned 830 N*mm). Verified by hand this session that this is the mathematically correct transform of a fixed-frame force-balance model (the same one lib/modules/axis-load-cases/0.1.0/math.ts's own resolveAxisLoadPhase already uses, where gravity is a fixed vector and only friction/guide-resistance flip) projected onto a single travel-direction-relative scalar -- and that resolveMomentaryTorque (Math.abs) and resolveEffectiveTorque (squares every term) are already sign-agnostic, so the sign difference has zero effect on any reported output. Not a bug; no code change was needed.",
    "0.2.0 addendum, not a re-validation of the underlying physics (unchanged): (1) gravity is no longer an editable input -- resolveDriveForce now hardcodes STANDARD_GRAVITY_M_PER_S2 = 9.80665 m/s^2 (math.ts), the exact value motion.axis.gravity's own registry constant default already supplied everywhere this module used it. Behavior-neutral: every existing reference example above (Omron kernel-level/executeModule, THK horizontal/vertical) re-passes unchanged under 0.2.0 -- that unchanged pass is the regression proof, not a new derivation. (2) inertia_ratio_maximum now resolves to motor_sizing.ball_screw.inertia_ratio_recommended_maximum (registry 1.15.0), a founder-directed default of 10:1 -- NOT a manufacturer-sourced value; drive-train/stage-1-spec.md item 5's own five-source survey (2:1 to 100:1) is the closest sourced context and does not itself endorse 10 specifically. The check's own exceeded-case status changed from 'fail' to 'warning' to match: exceeding a recommended (not required) default is advisory, never blocking. Both changes per docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md.",
  ],
};
