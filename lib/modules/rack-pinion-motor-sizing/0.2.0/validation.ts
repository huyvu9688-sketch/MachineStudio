// Validation record for the rack-pinion-motor-sizing module. Stage 4
// (validation) is done as of 2026-08-13 -- see README.md "Stage 4" for
// the full narrative. 0.2.0 is a consistency-pass follow-on
// (docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md)
// -- see the 0.2.0 addendum entry in "deviations" below and
// validation/rack-pinion-motor-sizing/0.2.0.md.
//
// sourceRevisionIds below includes the internal-only Atlanta Drive
// Systems benchmark -- the same treatment axis-load-cases@0.1.0's own
// validation.ts already gives this exact document (its own
// SourceRevisionId is cited here, in this Stage-4 validation record, but
// never in manifest.ts's own sourceRevisionIds, and never redistributed
// or quoted -- "internal-only" means "not customer-facing," not "not
// cited in the validation record itself").

import { asSourceRevisionId } from "@/lib/standards";
import type { ValidationRecord } from "@/lib/engine";

export const validation: ValidationRecord = {
  moduleId: "rack-pinion-motor-sizing",
  moduleVersion: "0.2.0",
  methods: [
    "Oriental Motor Co., Ltd. and Andantex USA, Inc. (Redex) rack-and-pinion sizing methods (moment of inertia, orientation-aware drive force, load torque, operating speed, acceleration torque, required torque with a safety factor)",
  ],
  sourceRevisionIds: [
    asSourceRevisionId(
      "jp.oriental_motor.general_catalog_motor_fan_sizing@f-tecref-2003-2004",
    ),
    asSourceRevisionId(
      "us.atlanta_drive_systems.rack_pinion_calculations@sha256-2bc6e48c2dce79dd",
    ),
    asSourceRevisionId("us.andantex.modular_rack_pinion_system@web-2026-08-13"),
  ],
  referenceExamples: [
    {
      id: "atlanta-internal-benchmark-horizontal",
      description:
        "Atlanta Drive Systems' own 'travelling operation' worked example (internal-only benchmark, never cited in manifest.ts or a trace -- the axis-load-cases@0.1.0 precedent for this exact document, stage-1-spec.md 'Candidate Methods' item 4): m=820 kg, v=2 m/s, tb=1 s, mu=0.1 -> a=2 m/s^2, Fu=(m*g*mu+m*a)=2.444 kN (SI g=9.80665; Atlanta's own g=9.81 prints 2.44 kN). Reproduced through executeModule with a negligible pinion mass, gear_ratio=1, mechanical_efficiency=1, external_force=0 (Atlanta's own Fu has no efficiency derating or gearbox reduction): momentary_torque (load_torque+acceleration_torque) matches Fu*D/2 within 0.03% for any chosen pinion_pitch_diameter (the diameter cancels algebraically in this comparison).",
      tolerance:
        "0.03% (0.1.0's own tolerance was 0.01%, achieved by overriding this module's own gravity port to Atlanta's own g=9.81 convention; 0.2.0 removes that port entirely -- see 'deviations' below -- so the tolerance is loosened to absorb the real, measured ~0.008% SI-vs-Atlanta gravity-convention gap this introduces here, plus the negligible pinion's own rotating inertia, absent from Atlanta's own force-only Fu).",
    },
    {
      id: "atlanta-internal-benchmark-vertical",
      description:
        "Atlanta Drive Systems' own 'lifting operation' worked example (internal-only benchmark, same treatment as above): m=300 kg, v=1.08 m/s, tb=0.27 s -> a=4 m/s^2, Fu=(m*g+m*a)=4.142 kN (SI g; Atlanta's own g=9.81 prints 4.1 kN). Reproduced through executeModule the same way (orientation=vertical, incline_angle=90deg): momentary_torque matches Fu*D/2 within 0.03%.",
      tolerance:
        "0.03%, same reasoning as above -- the measured gap is larger here (~0.02%) because the vertical case's weight term is 100% of the load-torque force (friction vanishes), so it carries the full SI-vs-Atlanta gravity-convention gap, versus a partial contribution in the horizontal case.",
    },
  ],
  independentBenchmark:
    "atlanta-benchmark.test.ts reproduces both of Atlanta Drive Systems' own worked numerical examples (travelling/horizontal and lifting/vertical) through this module's own real executeModule compute path, converting Atlanta's own tangential force Fu to a pinion torque (Fu*D/2) -- a transform Atlanta's own document does not print, independently justified by Andantex USA, Inc.'s own separately-published Tp=Fr*d/2 relationship (stage-1-spec.md 'Candidate Methods' item 3), not invented for this benchmark. Serves as the independent benchmark AND the reference-example evidence for this module -- Atlanta's own document stays internal-only (licensed, redistribution status unresolved) and is never cited in manifest.ts or a customer-facing trace, following the axis-load-cases@0.1.0 precedent for this exact source document exactly.",
  reviewer:
    "Solo validation -- Atlanta Drive Systems internal-benchmark substitute, the same reviewer-substitute role this document already played for axis-load-cases@0.1.0 (context/ai-workflow-rules.md Stage 4: 'When no second engineer is available, the documented independent benchmark comparison serves as the review substitute').",
  reviewDate: "2026-08-13",
  supportedUseLimits: [
    "No publicly citable worked numerical example exists for rack-and-pinion motor sizing specifically -- Oriental Motor's and Andantex's own published sources give the formula only, not a worked example; Atlanta Drive Systems' own two worked examples are license-restricted and used only as an internal benchmark, never a customer-facing citation (stage-1-spec.md 'Reference Examples and Independent Benchmark').",
    "No inclined-axis worked example exists for this mechanism from any source -- validated at exactly horizontal and vertical (incline_angle = 0 and 90 deg) only.",
    "No rack mass/inertia term -- the rack itself is treated as infinitely rigid/massless; no source found this session gives it one.",
    "No rack/pinion gear-tooth mechanical-strength check (root bending fatigue, Hertzian pitting fatigue) and no motor catalog matching.",
  ],
  deviations: [
    "Andantex USA, Inc.'s own Tp=Fr*d/2 formula shows no explicit mechanical-efficiency divisor (unlike Oriental Motor's own T_L=F*D/(2*eta*i)) -- Andantex's own procedure instead compares the un-derated Tp against a catalog torque rating that presumably already accounts for mesh losses. This module's own kernel follows Oriental Motor's own explicit-efficiency form, consistent with every other Motor Sizing Tool module, which all require an explicit mechanical_efficiency input -- a real, disclosed structural difference between the two corroborating sources, not silently resolved by assuming they agree on every detail (stage-1-spec.md 'Evidence Gaps').",
    "A genuine, disclosed arithmetic inconsistency was found (and not reproduced) in Atlanta Drive Systems' own document while hand-verifying its two worked examples: the lifting example's own Fu_perm calculation states Futab=11.5 kN in its own formula line but the preceding sentence states Futab=12 kN; neither value reproduces either of the document's own two different printed results (5.9 kN and 6.0 kN) exactly. This figure is a hardware-selection derating check entirely out of this module's own scope regardless (stage-1-spec.md 'Candidate Methods' item 4) -- recorded for completeness, not something this module needed to resolve.",
    "0.2.0 addendum, not a re-validation of the underlying physics (unchanged): (1) gravity is no longer an editable input -- resolveDriveForce now hardcodes STANDARD_GRAVITY_M_PER_S2 = 9.80665 m/s^2 (math.ts), the exact value motion.axis.gravity's own registry constant default already supplied everywhere this module used it by default. This is a REAL, measured, disclosed regression in the Atlanta benchmark's own precision, not just a theoretical concern: 0.1.0's own comparison overrode this module's own gravity port to Atlanta's own g=9.81 convention, achieving exact agreement (0.01% tolerance, dominated by the negligible pinion's own rotating inertia). 0.2.0 removes that override entirely, so the real SI (9.80665) vs. Atlanta (9.81) gravity-convention gap now shows up: ~0.008% for the horizontal example (weight is a minor term) and ~0.02% for the vertical example (weight is 100% of the load-torque force). Both are quantified in atlanta-benchmark.test.ts's own test titles, and the tolerance is loosened from 0.01% to 0.03% with comfortable margin above both measured values -- disclosed here rather than silently widened. Every other reference example and independent-benchmark claim above is otherwise unaffected. (2) inertia_ratio_maximum now resolves to motor_sizing.rack_pinion.inertia_ratio_recommended_maximum (registry 1.15.0), a founder-directed default of 10:1 -- NOT a manufacturer-sourced value. The check's own exceeded-case status changed from 'fail' to 'warning' to match: exceeding a recommended (not required) default is advisory, never blocking. Both changes per docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md.",
  ],
};
