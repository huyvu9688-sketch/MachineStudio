// Validation record for the shaft-key-bolt-checks module (Stage 4, done
// 2026-08-31). Three real, independently-sourced published worked examples
// -- one per sub-check (shaft, key, bolt) -- are now reproduced through the
// real executeModule() compute path (./reference-examples.ts/.test.ts), not
// only at the kernel level (math.test.ts still carries the same AFDL/
// stress-area figures plus the module's own unit/boundary tests). The shaft
// check also has a genuine independent-benchmark second computation
// (./reuven-benchmark.ts/.test.ts, Reuven Engineering Tools' own Tresca/von
// Mises shaft-design calculator) that cross-checks this module's own
// resolveShaftCombinedStress against an independently solved result, not
// just a shared formula shape. See "Independent Method or Tool Comparison"
// below for what is, and is not, covered for the key and bolt sub-checks.

import type { ValidationRecord } from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const validation: ValidationRecord = {
  moduleId: "shaft-key-bolt-checks",
  moduleVersion: "0.1.0",
  methods: [
    "Air Force Flight Dynamics Laboratory Stress Analysis Manual (Chapter 10) maximum-shear-stress (Tresca) combined bending/torsion shaft-diameter formula, inverted to a stress check on a candidate diameter",
    "Key shear (tau = F/(w*L)) and bearing (sigma = F/((h/2)*L)) stress formulas, F = 2*T/d",
    "Bolt torque-to-preload relationship (T = K*F*d)",
    "ISO 898-1 metric and ASME B1.1 unified (US/UN) tensile stress-area formulas",
    "Bolt tensile-capacity margin against proof strength, with the bolt's own applied-tension share optionally scaled by a joint-stiffness ratio",
  ],
  sourceRevisionIds: [
    asSourceRevisionId(
      "us.engineeringlibrary.afdl_stress_analysis_manual_shafts@web-2026-08-31",
    ),
    asSourceRevisionId("us.roymech.shaft_design@web-2026-08-31"),
    asSourceRevisionId("jp.miki_pulley.parallel_key_jis_b1301@web-2026-08-31"),
    asSourceRevisionId("us.roymech.key_and_spline_strength@web-2026-08-31"),
    asSourceRevisionId(
      "jp.instant_engineer.key_shear_bearing_stress@web-2026-08-31",
    ),
    asSourceRevisionId("us.fastenal.torque_tension_iso898_1@web-2026-08-31"),
    asSourceRevisionId("us.roymech.bolt_preload_calculation@web-2026-08-31"),
    asSourceRevisionId("us.mechanicalc.bolted_joint_analysis@web-2026-08-31"),
    asSourceRevisionId(
      "us.triangle_fastener.stress_area_asme_b1_1@web-2026-08-31",
    ),
    asSourceRevisionId("us.southwest_bolt.sae_j429_grades@web-2026-08-31"),
    asSourceRevisionId(
      "jp.nbk_america.technical_29_property_classes@web-2026-08-31",
    ),
    asSourceRevisionId("us.up_edu.me401_fastener_notes@web-2026-08-31"),
    asSourceRevisionId("us.reuven_tools.shaft_design_calculator@web-2026-08-31"),
  ],
  referenceExamples: [
    {
      id: "afdl-20hp-300rpm-pulley-shaft",
      description:
        "US Air Force Flight Dynamics Laboratory Stress Analysis Manual, Chapter 10: 20 hp / 300 rpm pulley shaft worked example, governing cross-section T = 4200 lbf*in, M = 7685 lbf*in, Ks = 1.0, Km = 1.5, solved diameter D = 1.726 in at a 12,150 psi design stress. Reproduced through the real compute() path (reference-examples.ts runAfdlShaftExample/reference-examples.test.ts): normal_shaft_combined_stress recovers the source's own 12,150 psi design stress to within 0.2%, also confirmed at the kernel level directly (math.test.ts). The source's own allowable-stress derivation (yield AND ultimate strength, plus a keyway stress-concentration derating factor) is more elaborate than this module's simpler yield-strength/safety-factor-minimum model -- this reproduction validates the combined-stress formula itself, not the source's own full allowable-stress derivation (see 'Deviations').",
      tolerance: "0.2% relative on the recovered combined stress.",
    },
    {
      id: "instant-engineer-key-shear-bearing",
      description:
        "instant.engineer parallel-key worked example: T = 500 N*m, d = 30 mm (shaft diameter), b = 10 mm (key width), h = 8 mm (key height), L = 40 mm (key length) -> tau = 83.3 MPa (shear), p = 208.3 MPa (bearing). Reproduced through the real compute() path (reference-examples.ts runInstantEngineerKeyExample/reference-examples.test.ts): normal_key_shear_stress and normal_key_bearing_stress both recover the source's own printed figures to within 0.2%.",
      tolerance: "0.2% relative (83.3/208.3 are themselves rounded to 1 decimal place).",
    },
    {
      id: "roymech-bolt-preload",
      description:
        "RoyMech bolt-preload worked example: preload F = 20 kN, d = 10 mm, K = 0.2, giving T = K*F*d = 40 N*m. This module's own bolt.preload port inverts the same relationship (F = T/(K*d)) -- reproduced through the real compute() path (reference-examples.ts runRoymechBoltPreloadExample/reference-examples.test.ts): bolt_preload recovers the source's own 20,000 N exactly (the source's own worked numbers have no rounding to absorb).",
      tolerance: "0.01% relative.",
    },
    {
      id: "metric-stress-area-m10x1_5",
      description:
        "Widely-published ISO metric tensile stress-area figure for an M10x1.5 bolt (58.0 mm^2, cited by MechaniCalc, Fastenal, and other registered sources). resolveBoltStressArea (math.ts) reproduces it from the formula directly. Kernel-level only: stress area is an internal intermediate value in this module's own compute() path (feeding bolt.tensile_safety_factor), not itself an output port, so it cannot be reproduced through executeModule() directly.",
      tolerance: "0.1% relative (58.0 is itself rounded to 1 decimal place).",
    },
    {
      id: "unified-stress-area-half-13-unc",
      description:
        "Widely-published ASME B1.1 unified tensile stress-area figure for a 1/2-13 UNC bolt (0.1419 in^2). resolveBoltStressArea (math.ts) reproduces it from the formula directly. Kernel-level only, for the same reason as the metric figure above.",
      tolerance: "0.2% relative.",
    },
  ],
  independentBenchmark:
    "Shaft check: a genuine second computation, not just a shared formula shape. reuven-benchmark.ts/.test.ts implements Reuven Engineering Tools' own Tresca and von Mises shaft-design-calculator formulas independently of ./math.ts, reproduces Reuven's own worked result (M=T=1000 N*m, Sy=400 MPa, N=2, Kb=Kt=1 -> Tresca d~=41.6mm, von Mises d~=40.7mm), and then cross-checks this module's own resolveShaftCombinedStress -- evaluated at Reuven's own independently solved diameter -- against Reuven's own governing allowable stress (tau_allow = Sy/(2N) = 100 MPa): recovers it to within 0.5%. Key check: RoyMech's own key-strength page (us.roymech.key_and_spline_strength) and instant.engineer's own page (jp.instant_engineer.key_shear_bearing_stress) were independently fetched and give the shear/bearing formulas in algebraically identical form once F=2T/d is substituted (stage-1-spec.md 'Candidate Sources', Key item 3) -- a real cross-source agreement on the formula itself, established at Stage 1, not a second independent worked-number reproduction with its own code artifact (RoyMech's own 10 kW/1500 rpm worked example was not independently re-solved this session: its own printed figures depend on values -- an effective key length distinct from the full key length, and its own Ks factor -- not confirmed precisely enough from the page's own text to reproduce without risking a fabricated intermediate step). Bolt check: no independent benchmark exists for the tensile-capacity check specifically -- a real, disclosed gap, not silently dropped. The stress-area formula itself has two widely-published reference figures (see 'Reference Examples' above), which is a reference-example comparison, not an independent second method.",
  reviewer:
    "Solo validation -- Reuven Engineering Tools independent-benchmark substitute (shaft check); RoyMech/instant.engineer cross-source formula agreement (key check, established at Stage 1). No independent benchmark for the bolt tensile-capacity check -- disclosed, not substituted.",
  reviewDate: "2026-08-31",
  supportedUseLimits: [
    "0.1.0 requires the full shaft, key, and bolt input set together and always computes all three checks -- founder-directed 2026-08-31, not fully independent per-check usability (stage-2-contract.md 'Decisions' item 9).",
    "Shaft check: static/yield-based only, no fatigue; no axial-load term; one shaft cross-section per check.",
    "Shaft check: Air-Force/ASME-B106.1M Ks/Km service-factor convention only, not the Shigley/Reuven Kf/Kfs geometric stress-concentration tradition.",
    "No JP-market source for the shaft-stress check specifically (key and bolt both have real JP/ISO-aligned sources) -- a disclosed asymmetry, not held as a release blocker (stage-2-contract.md 'Decisions' item 8).",
    "Key check: parallel/sunk keys only; bearing depth uses the h/2 approximation, not an exact geometry-dependent depth.",
    "Bolt check: preload and tensile-capacity margin only. Joint separation and the independent shear/bearing path are registered parameters but not yet wired as ports in this module version.",
    "Bolt check: no combined tension+shear interaction; one bolt (or one uniformly loaded equivalent bolt) per check; no multi-bolt-pattern eccentric-load distribution.",
    "No catalog matching -- a required-spec / pass-fail-with-margin check on an engineer-identified candidate only.",
    "Normal and peak load cases only; holding and emergency_stop are not supported.",
  ],
  deviations: [
    "The AFDL worked example's own allowable-stress derivation (yield strength AND ultimate strength, with an additional keyway stress-concentration derating factor) is more elaborate than this module's own simpler yield-strength/safety-factor-minimum model. The reference-example reproduction above validates the combined-stress formula itself, not the source's own full allowable-stress derivation.",
    "The key bearing-stress check adopts the common h/2 approximation one registered source (RoyMech) itself flags as inexact, rather than a more precise geometry-dependent effective depth (stage-2-contract.md 'Decisions' item 3).",
    "The bolt tensile check's own joint-stiffness ratio C defaults to 1 (the bolt carries the full externally applied tensile load) when not supplied -- a conservative engineering assumption, not a value any registered source states as a default.",
  ],
};
