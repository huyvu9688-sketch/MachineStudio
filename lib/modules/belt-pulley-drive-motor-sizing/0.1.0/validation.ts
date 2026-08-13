// Validation record for the belt-pulley-drive-motor-sizing module. Stage 4
// (validation) is done as of 2026-08-13 -- see README.md "Stage 4" for the
// full narrative.

import { asSourceRevisionId } from "@/lib/standards";
import type { ValidationRecord } from "@/lib/engine";

export const validation: ValidationRecord = {
  moduleId: "belt-pulley-drive-motor-sizing",
  moduleVersion: "0.1.0",
  methods: [
    "Oriental Motor Co., Ltd.'s own combined wire-belt/rack-and-pinion sizing method (moment of inertia of two pulleys plus a translating belt, orientation-aware drive force, load torque, operating speed, acceleration torque, required torque with a safety factor)",
  ],
  sourceRevisionIds: [
    asSourceRevisionId(
      "jp.oriental_motor.general_catalog_motor_fan_sizing@f-tecref-2003-2004",
    ),
    asSourceRevisionId(
      "us.automationdirect.sureservo_selection_appendix@2nd-ed-rev-b-08-2011",
    ),
  ],
  referenceExamples: [
    {
      id: "automationdirect-belt-drive-pulley-inertia",
      description:
        "AutomationDirect's own 'Belt Drive - Example Calculations' worked example (pp. B-11-B-13, SureServo Selection Appendix): a 90 lb table+workpiece on a 10:1-geared, 2.0 in-diameter aluminum pulley pair. Reproduced through executeModule: pulley_inertia (both pulleys, (1/8)*(M_drive+M_idler)*D^2) matches the source's own printed J_pulleys=0.0006 lb-in-s^2 (stage-1-spec.md's own recomputed 0.000598) within 0.2% -- this figure carries no mechanical-efficiency term in either this module's own convention or AutomationDirect's own, so it is an unqualified exact reproduction.",
      tolerance:
        "0.2% (pulley geometry/density rounding, not a formula disagreement).",
    },
    {
      id: "automationdirect-belt-drive-load-and-reflected-inertia-with-disclosed-adjustment",
      description:
        "The same worked example's own carriage-only load inertia (printed J_W=0.291 lb-in-s^2, AutomationDirect's own (W/(g*e))*r^2, recomputed 0.29145) and reflected-to-motor inertia (printed J_(pulleys+load) to motor=0.0029 lb-in-s^2, recomputed 0.002920) both bake in AutomationDirect's own disclosed convention of dividing the CARRIAGE's inertia by mechanical efficiency e=0.8 -- a convention this module does not follow (stage-1-spec.md 'A real disagreement between sources'). This module's own load_inertia output, computed with no efficiency term at all, reproduces AutomationDirect's own J_W only after the same disclosed 1/e factor is reapplied at the test level (not inside this module's own kernel): (load_inertia - pulley_inertia)/0.8 matches printed J_W within 0.1%; (pulley_inertia + (load_inertia-pulley_inertia)/0.8)/gear_ratio^2 matches printed J_(pulleys+load) within 0.1%. This is not a claim that this module's own load_inertia/reflected_load_inertia outputs equal the printed figures -- they do not, by the same disclosed ~25% margin the efficiency-convention difference implies -- it is a claim that the underlying carriage-inertia physics is correct and the only source of difference is the already-disclosed convention choice, precisely quantified rather than absorbed.",
      tolerance:
        "0.1% after the disclosed 1/e adjustment; ~25% (1/0.8) unadjusted, by design, matching the efficiency-convention difference exactly.",
    },
  ],
  independentBenchmark:
    "independent-benchmark.test.ts cross-checks this module's own two-function force/load-torque kernel (resolveDriveForce then resolveLoadTorque) against a single combined expression reimplementing the identical Oriental Motor formula, written independently in independent-benchmark.ts -- the same 'structurally separate reimplementation, proved identical' pattern direct-drive-conveyor-motor-sizing@0.1.0's own Omron benchmark and rack-pinion-motor-sizing@0.1.0's own Andantex cross-check both establish. A deterministic 300-scenario property sweep (mass, incline, friction, external force, diameter, efficiency, and gear ratio all varied) confirms algebraic identity to floating-point precision.",
  reviewer:
    "Solo validation -- independent-benchmark substitute, the same reviewer-substitute role this document already plays for every prior Motor Sizing Tool module (context/ai-workflow-rules.md Stage 4: 'When no second engineer is available, the documented independent benchmark comparison serves as the review substitute').",
  reviewDate: "2026-08-13",
  supportedUseLimits: [
    "Both pulleys must share one pitch diameter -- no source found this session gives an unequal-diameter belt-drive formula.",
    "No belt tension, belt width/pitch, tooth-shear, or wrap-angle selection, and no motor catalog matching.",
    "load_torque, momentary_torque, required_torque, reflected_load_inertia, acceleration_torque, and inertia_ratio are NOT claimed to reproduce AutomationDirect's own printed figures at face value -- see 'deviations' below for exactly why and by how much.",
    "acceleration_torque and inertia_ratio are exercised end to end by the reference-example test (the compute path runs without error and produces a positive, correctly-ordered result) but are not asserted against AutomationDirect's own printed T_accel=0.46 lb-in (recomputed 0.4649) or inertia ratio=9.6 figures: those two figures both depend on AutomationDirect's own candidate motor's own rotor inertia, which the source's own printed worked example does not state as an independent figure -- only its downstream products (T_accel and the 9.6 ratio) are printed. Back-solving that rotor inertia two different ways from those two printed figures (via the printed inertia ratio, vs. via T_accel and the printed motor speed/accel time) disagrees by roughly 15-20%, most plausibly compounding rounding across the source's own multiple 2-4-significant-figure intermediate results -- a genuine, disclosed evidence gap found during this module's own Stage 3/4 work, not a defect in this module's own kernel.",
  ],
  deviations: [
    "AutomationDirect's own worked example has a confirmed arithmetic slip, disclosed and not reproduced: its own friction force is computed as 0.05 x 100 = 5.0 lb, though the stated table+workpiece weight is 90 lb (the correct product is 4.5 lb). This module's own kernel computes friction from the actual supplied mass, so it does not reproduce the source's own printed T_run=0.50 lb-in or T_motor=0.96 lb-in totals that follow from it -- the third such source-internal slip this project has found and recorded rather than silently matched (after direct-drive-conveyor-motor-sizing@0.1.0's own p. F-9 inertia figure and rack-pinion-motor-sizing@0.1.0's own Atlanta Futab inconsistency).",
    "The two primary sources place mechanical efficiency on opposite sides of the calculation, verified by hand as genuinely different, not a rounding artifact: Oriental Motor divides load torque by eta; AutomationDirect divides the carriage's own inertia by e and leaves running torque underated. This module follows Oriental Motor's own convention, matching every already-released Motor Sizing Tool sibling -- consequently this module's own load_torque, momentary_torque, and required_torque do not reproduce AutomationDirect's own printed figures (compounded by the arithmetic slip above), and this module's own load_inertia, reflected_load_inertia, and inertia_ratio outputs are smaller than AutomationDirect's own printed figures by the disclosed, precisely quantified 1/e=1.25x factor on the carriage-inertia term specifically (see referenceExamples above) -- not an unexplained residual.",
  ],
};
