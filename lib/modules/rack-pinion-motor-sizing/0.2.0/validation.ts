// Validation record for the rack-pinion-motor-sizing module. Stage 4
// (validation) is done as of 2026-08-13 -- see README.md "Stage 4" for
// the full narrative. The package stays unregistered (package.ts, not
// index.ts) regardless of what this record says: registration is a
// separate Stage 6 action (context/ai-workflow-rules.md "New Module
// Workflow").
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
  moduleVersion: "0.1.0",
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
        "Atlanta Drive Systems' own 'travelling operation' worked example (internal-only benchmark, never cited in manifest.ts or a trace -- the axis-load-cases@0.1.0 precedent for this exact document, stage-1-spec.md 'Candidate Methods' item 4): m=820 kg, v=2 m/s, tb=1 s, mu=0.1 -> a=2 m/s^2, Fu=(m*g*mu+m*a)=2.444 kN (SI g=9.80665; Atlanta's own g=9.81 prints 2.44 kN). Reproduced through executeModule with a negligible pinion mass, gear_ratio=1, mechanical_efficiency=1, external_force=0 (Atlanta's own Fu has no efficiency derating or gearbox reduction): momentary_torque (load_torque+acceleration_torque) matches Fu*D/2 within 0.01% for any chosen pinion_pitch_diameter (the diameter cancels algebraically in this comparison).",
      tolerance:
        "0.01% (the small residual is the negligible pinion's own rotating inertia, absent from Atlanta's own force-only Fu, plus SI-vs-Atlanta's-own standard-gravity convention).",
    },
    {
      id: "atlanta-internal-benchmark-vertical",
      description:
        "Atlanta Drive Systems' own 'lifting operation' worked example (internal-only benchmark, same treatment as above): m=300 kg, v=1.08 m/s, tb=0.27 s -> a=4 m/s^2, Fu=(m*g+m*a)=4.142 kN (SI g; Atlanta's own g=9.81 prints 4.1 kN). Reproduced through executeModule the same way (orientation=vertical, incline_angle=90deg): momentary_torque matches Fu*D/2 within 0.01%.",
      tolerance: "0.01%, same reasoning as above.",
    },
  ],
  independentBenchmark:
    "atlanta-benchmark.test.ts reproduces both of Atlanta Drive Systems' own worked numerical examples (travelling/horizontal and lifting/vertical) through this module's own real executeModule compute path, converting Atlanta's own tangential force Fu to a pinion torque (Fu*D/2) -- a transform Atlanta's own document does not print, independently justified by Andantex USA, Inc.'s own separately-published Tp=Fr*d/2 relationship (stage-1-spec.md 'Candidate Methods' item 3), not invented for this benchmark. Serves as the independent benchmark AND the reference-example evidence for this module -- Atlanta's own document stays internal-only (licensed, redistribution status unresolved) and is never cited in manifest.ts or a customer-facing trace, following the axis-load-cases@0.1.0 precedent for this exact source document exactly.",
  reviewer:
    "Solo validation -- Atlanta Drive Systems internal-benchmark substitute, the same reviewer-substitute role this document already played for axis-load-cases@0.1.0 (context/ai-workflow-rules.md Stage 4: 'When no second engineer is available, the documented independent benchmark comparison serves as the review substitute').",
  reviewDate: "2026-08-13",
  supportedUseLimits: [
    "0.1.0 is not yet released (package.ts, not index.ts) -- Stage 5 (workflow role integration, cross-module link tests) and Stage 6 (release, source-immutability hash, registration) have not started.",
    "No publicly citable worked numerical example exists for rack-and-pinion motor sizing specifically -- Oriental Motor's and Andantex's own published sources give the formula only, not a worked example; Atlanta Drive Systems' own two worked examples are license-restricted and used only as an internal benchmark, never a customer-facing citation (stage-1-spec.md 'Reference Examples and Independent Benchmark').",
    "No inclined-axis worked example exists for this mechanism from any source -- validated at exactly horizontal and vertical (incline_angle = 0 and 90 deg) only.",
    "No rack mass/inertia term -- the rack itself is treated as infinitely rigid/massless; no source found this session gives it one.",
    "No rack/pinion gear-tooth mechanical-strength check (root bending fatigue, Hertzian pitting fatigue) and no motor catalog matching.",
  ],
  deviations: [
    "Andantex USA, Inc.'s own Tp=Fr*d/2 formula shows no explicit mechanical-efficiency divisor (unlike Oriental Motor's own T_L=F*D/(2*eta*i)) -- Andantex's own procedure instead compares the un-derated Tp against a catalog torque rating that presumably already accounts for mesh losses. This module's own kernel follows Oriental Motor's own explicit-efficiency form, consistent with every other Motor Sizing Tool module, which all require an explicit mechanical_efficiency input -- a real, disclosed structural difference between the two corroborating sources, not silently resolved by assuming they agree on every detail (stage-1-spec.md 'Evidence Gaps').",
    "A genuine, disclosed arithmetic inconsistency was found (and not reproduced) in Atlanta Drive Systems' own document while hand-verifying its two worked examples: the lifting example's own Fu_perm calculation states Futab=11.5 kN in its own formula line but the preceding sentence states Futab=12 kN; neither value reproduces either of the document's own two different printed results (5.9 kN and 6.0 kN) exactly. This figure is a hardware-selection derating check entirely out of this module's own scope regardless (stage-1-spec.md 'Candidate Methods' item 4) -- recorded for completeness, not something this module needed to resolve.",
  ],
};
