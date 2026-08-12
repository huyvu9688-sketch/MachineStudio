// Validation record for the coupling module (roadmap module definition of
// done, item 10). Stage 4 (validation) and Stage 6 (release) are both
// complete — see validation/coupling/0.1.0.md. Both Stage 4 evidence items
// are met: the reference-example item (see below) and the independent-
// benchmark item (see independentBenchmark below). `reviewer`/`reviewDate`
// are finalized below (Stage 6, 2026-08-12), reusing the pre-existing
// ktr-din740-benchmark.ts independent benchmark as the review substitute —
// the same treatment ball-screw's and linear-guide's own validation.ts
// received.
//
// ./math.test.ts reproduces KTR's own worked example (200 kW / 1500 rpm ->
// T_AN = 1273 Nm, T_KN >= 1909.5 Nm) and both of R+W's own worked examples
// (450 kW/980 rpm and 800 kW/980 rpm) at the KERNEL level —
// resolveRequiredTorqueFromPower and resolveScaledRequiredTorque reproduce
// each source's own printed numbers. That alone is not a full published
// worked example run through this module's actual integration path
// (compute.ts consumes screw.drive_torque directly, not
// resolveRequiredTorqueFromPower — see math.ts's own module doc comment).
//
// ./rw-reference-examples.ts / .test.ts close that gap: R+W's own printed
// T_AN is fed in as the already-resolved screw.drive_torque this module's
// compute() actually consumes, R+W's own printed combined correction factor
// as coupling.service_factor, and R+W's own selected coupling's catalog
// rated torque as coupling.rated_torque — run through
// executeModule(couplingModule, ...), the real sealed-package boundary. Both
// of R+W's own selections (ST2/10, ST4/10) are confirmed to clear their own
// printed requirement through this module's real compute path, the same
// depth pmi-chapter-9.ts reproduces for linear-guide and thk-benchmark.ts's
// reference-example half does for ball-screw.
//
// ./ktr-din740-benchmark.ts / .test.ts close the independent-benchmark gap:
// a second, distinct KTR document ("Coupling Selection According to DIN 740
// Part II", found 2026-08-10) gives a genuinely different, more detailed
// shock-torque derivation (T_Kmax >= T_S*S_Z*S_t + T_N*S_t, with
// T_S = T_AS*M_A*S_A and M_A a mass-distribution coefficient) than KTR's
// other document's own (T_N+T_S)*S_Z*S_t*S_R form recorded in
// context/modules/coupling/stage-1-spec.md item 2 — a real, recorded
// disagreement between two KTR documents, not resolved. It also carries a
// full worked shock-torque numerical example (page 13), the first one
// available in this module's source set — KTR's other example and both of
// R+W's are steady-torque selections only. The benchmark file's own
// comparison functions quantify how this module's own simplified shock
// check (`required * serviceFactor`) relates to KTR's own detailed method
// for that example: algebraically identical when serviceFactor is the fully
// composed M_A*S_A*S_Z*S_t; understating KTR's own requirement by about
// 1.2% when serviceFactor is the catalog shock factor S_A alone; and
// overstating it by about 43% (producing a false fail) when S_A*S_Z*S_t is
// used without the mass-distribution correction M_A — a real, sourced,
// quantified deviation, not a rounding footnote. See
// validation/coupling/0.1.0.md for the full record.

import type { ValidationRecord } from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const validation: ValidationRecord = {
  moduleId: "coupling",
  moduleVersion: "0.1.0",
  methods: [
    "KTR required-torque-from-power formula (T_N = 9550*P/n) and steady-torque service-factor check (T_KN >= T_N*S_B*S_t*S_R)",
    "R+W required-torque-from-power formula and steady-torque service-factor check (T_KN >= T_AN*S_A*S_v*S_z) — corroborating KTR's own, same shape, independently branded factors",
    "Locally-derived operating rotational speed (n = v/lead * 2*pi * gearRatio), reusing screw.lead/screw.gear_ratio rather than a manufacturer-specific method",
    "KTR's own second, more detailed shock-torque method (Coupling Selection According to DIN 740 Part II): T_Kmax >= T_S*S_Z*S_t + T_N*S_t, T_S = T_AS*M_A*S_A, M_A = J_L/(J_A+J_L) — implemented as this module's independent benchmark (ktr-din740-benchmark.ts), not adopted as this module's own shock-torque formula",
  ],
  sourceRevisionIds: [
    asSourceRevisionId(
      "us.ktr.coupling_selection_operating_factors@web-2026-08-09",
    ),
    asSourceRevisionId(
      "us.rw_america.coupling_sizing_selection@web-2026-08-09",
    ),
    asSourceRevisionId("us.ktr.coupling_selection_din740_part2@web-2026-08-10"),
    asSourceRevisionId("jp.nbk.coupling_catalog@orim-vexta-1908ov78"),
  ],
  referenceExamples: [
    {
      id: "rw-example-1-st2-10",
      description:
        "R+W 'Sizing and Selection' (DIN 740 part 2), Example 1: P = 450 kW, n = 980 rpm -> T_AN = 4385.2 Nm; T_KN >= T_AN * 1.25 * 1.1 * 1.0 = 6029.7 Nm (smooth uniform load, 40 degC ambient, 30 starts/hour). Selected coupling ST2/10, T_KN = 6030 Nm. Reproduced through this module's own compute path in ./rw-reference-examples.ts / .test.ts: T_AN fed in as screw.drive_torque, the combined factor as coupling.service_factor, T_KN as coupling.rated_torque, run through executeModule(couplingModule, ...) — the torque-safety-normal check passes, matching R+W's own selection.",
      tolerance:
        "Scaled required torque recovered from the module's own output matches R+W's own printed 6029.7 Nm to within 1 Nm; the resulting safety factor matches R+W's own implied ~1.00006 margin to 3 decimal places.",
    },
    {
      id: "rw-example-2-st4-10",
      description:
        "R+W 'Sizing and Selection', Example 2: P = 800 kW, n = 980 rpm -> T_AN = 7796 Nm; T_KN >= T_AN * 2 = 15,592 Nm (S_A = 2, bucket chain excavator). Selected coupling ST4/10, T_KN = 16,000 Nm. Reproduced through this module's own compute path in ./rw-reference-examples.ts / .test.ts, same method as rw-example-1-st2-10 — the torque-safety-normal check passes, matching R+W's own selection.",
      tolerance:
        "Scaled required torque recovered from the module's own output matches R+W's own printed 15,592 Nm to within 1 Nm; the resulting safety factor matches R+W's own implied ~1.026 margin to 3 decimal places.",
    },
    {
      id: "ktr-required-torque",
      description:
        "KTR 'Coupling Selection Based on Operating Factors', worked example: P = 200 kW, n = 1500 rpm -> T_AN = 1273 Nm; T_KN >= T_AN * 1.5 * 1.0 * 1.0 = 1909.5 Nm (radial pump, S_B = 1.5). resolveRequiredTorqueFromPower and resolveScaledRequiredTorque (math.ts) reproduce both figures — at the kernel formula level only, not through this module's own compute path (KTR's own text gives no specific selected-coupling rated torque to feed through executeModule the way R+W's two examples above do).",
      tolerance:
        "0.1% relative on T_AN (KTR's own printed '9550' constant is a rounded stand-in for 60,000/(2*pi)); exact on the scaled T_KN once T_AN is taken as KTR's own rounded 1273 Nm.",
    },
  ],
  independentBenchmark:
    "Implemented (2026-08-10): lib/modules/coupling/0.1.0/ktr-din740-benchmark.ts reproduces a second, distinct KTR document's own worked shock-torque example ('Coupling Selection According to DIN 740 Part II', catalog printed page 13: 160 kW/1485 rpm motor, screw-compressor load T_LN = 930 Nm, ROTEX Size 90 coupling T_KN = 2400 Nm / T_Kmax = 4800 Nm) end to end -- T_AN, T_KN required = 1348.5 Nm, the coupled inertias J_A = 2.9673 / J_L = 6.8673 kgm^2, the inertia coefficient M_A, T_S, and T_Kmax required = 3760 Nm, all within tolerances documented in ktr-din740-benchmark.test.ts. This document's own general shock-torque formula (T_Kmax >= T_S*S_Z*S_t + T_N*S_t, T_S = T_AS*M_A*S_A) is a genuinely different, more detailed derivation than KTR's other document's own (T_N+T_S)*S_Z*S_t*S_R form recorded in context/modules/coupling/stage-1-spec.md item 2 -- a real disagreement between two KTR documents, recorded rather than resolved, the same 'two sources agree on shape, disagree on specifics' treatment this project already gives cross-manufacturer disagreements. It also supplies the full published shock-torque worked example neither KTR's other document nor either of R+W's own two examples has (all three are steady-torque selections). compareModuleShockCheckToKtrDin740 then answers the exact question this field previously left open -- how this module's own simplified shock check ('required * serviceFactor') relates to KTR's own detailed method for a case that actually exercises it: algebraically identical (relative deviation ~0) when coupling.service_factor is the fully composed M_A*S_A*S_Z*S_t; understating KTR's own required torque by about 1.2% when serviceFactor is the catalog shock factor S_A alone (the module reports a slightly larger, non-conservative safety margin); and overstating it by about 43%, producing a false fail on a coupling KTR's own detailed method accepts, when serviceFactor is S_A*S_Z*S_t without the mass-distribution coefficient M_A. The practical risk this surfaces is not in this module's math -- it is that M_A depends on the driving/load inertia split, which varies by installation and which this project cannot compute internally yet (no released motor/load inertia parameter -- context/modules/coupling/stage-1-spec.md item 3, Unit 4.7 territory), so the engineer's own choice of coupling.service_factor is what actually carries this risk.",
  reviewer:
    "Solo validation — KTR DIN 740 Part II independent-benchmark substitute",
  reviewDate: "2026-08-12",
  supportedUseLimits: [
    "Supports only the normal and peak load cases; holding and emergency_stop are not implemented.",
    "One coupling connecting a ball screw's own drive shaft to its upstream driving shaft — not a multi-coupling driveline.",
    "The peak case is checked against the coupling's own maximum torque using screw.drive_torque[peak] as the required torque — a documented adaptation, not KTR's/R+W's own motor-starting-torque concept (context/modules/coupling/stage-2-contract.md 'Decisions' item 4).",
    "The shock-torque check uses the same required-torque-times-service-factor form as the steady check (KTR's general shape), not KTR's own summed (T_N+T_S) form or R+W's disengagement-multiplier form (context/modules/coupling/stage-2-contract.md 'Decisions' item 3).",
    "coupling.service_factor is one consolidated required input with no built-in default, applied identically to both cases — not KTR's or R+W's own separate operating/temperature/starting/direction factors (context/modules/coupling/stage-2-contract.md 'Decisions' item 5).",
    "Operating rotational speed is derived locally from motion.axis.case_linear_velocity via screw.lead/screw.gear_ratio, not a released screw.* speed port.",
    "A case with exactly zero operating speed (e.g. a true zero-velocity peak/start-up scenario) is unsupported: resolveSpeedSafetyFactor throws rather than reporting an infinite safety factor.",
    "Torsional stiffness and moment of inertia are reported only; no torsional-resonance or periodic-vibration check (no released motor/load inertia parameter exists yet).",
    "Misalignment and bore compatibility are simple bound checks against catalog data; no stiffness/life derating as a function of misalignment.",
  ],
  deviations: [
    "This module's own compute path does not call resolveRequiredTorqueFromPower: it consumes screw.drive_torque (already resolved, per case) directly. The ktr-required-torque reference example above validates that formula only at the kernel level (KTR's own text gives no selected-coupling rated torque to run through the real compute path); the two R+W reference examples above do run through the real compute path, taking R+W's own printed T_AN as the already-resolved drive torque (math.ts's own module doc comment).",
    "KTR's own shock-torque check sums a peak and rated torque before scaling (T_Kmax >= (T_N+T_S)*S_Z*S_t*S_R); R+W's own safety-coupling-specific form instead scales a single maximum system torque by a disengagement multiplier (T_AR >= K*T_max). This module implements neither directly — it reuses the steady-check form (capacity/(|required|*S)) for both cases, a deliberate simplification recorded in context/modules/coupling/stage-2-contract.md 'Decisions' item 3.",
    "coupling.service_factor is applied identically to both the normal and peak cases, even though both sources use a different named factor for each (context/modules/coupling/stage-2-contract.md 'Decisions' item 5).",
    "KTR's own two documents disagree on the general shock-torque formula shape, not just factor values: 'Coupling Selection Based on Operating Factors' gives (T_N+T_S)*S_Z*S_t*S_R (stage-1-spec.md item 2); 'Coupling Selection According to DIN 740 Part II' gives T_S*S_Z*S_t + T_N*S_t with T_S itself weighted by a mass-distribution coefficient M_A, and uses no S_R at all. This module adopts neither verbatim. See independentBenchmark above for the quantified consequence of that simplification.",
  ],
};
