// Validation record for the ball-screw module (roadmap module definition of
// done, item 10). Stage 4 (validation) and Stage 6 (release) are both
// complete — see validation/ball-screw/0.1.0.md, which uses the documented
// solo-validation reviewer-substitute policy. The reference examples below
// span two genuinely independent manufacturer sources: three from one shared
// Rockford Ball Screw worked scenario (drive torque, buckling, critical
// speed), and three more from one shared THK worked scenario (drive torque,
// nominal life, static safety factor — model WTF2040-2, THK's own
// "High-speed Transfer Equipment" example) — recorded honestly as two shared
// scenarios, not six independent ones, but two independent manufacturers is
// real corroboration distinct from axis-load-cases' three genuinely
// independent THK examples. The buckling/critical-speed calibration-constant
// discrepancy (a three-way disagreement — see thk-benchmark.ts) and the
// equivalent-dynamic-load methodology discrepancy (also implemented on both
// sides — see thk-benchmark.ts's resolveThkDirectionalEquivalentLoad) are
// real, unresolved deviations recorded below, not release blockers.

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
    "THK ball-screw-drive load-torque, cubic fatigue-life, and static safety factor methods (corroborating, not separately implemented)",
  ],
  sourceRevisionIds: [
    asSourceRevisionId(
      "jp.oriental_motor.motor_sizing_calculations@web-2026-08-08",
    ),
    asSourceRevisionId("us.steinmeyer.ball_screw_technology@web-2026-08-08"),
    asSourceRevisionId("us.rockford_ball_screw.how_to_size@update-2018"),
    asSourceRevisionId("us.wy_ball_screw.understanding_load@web-2026-08-08"),
    asSourceRevisionId(
      "jp.thk.example_ball_screw_selection@bondy-mirror-2026-08-09",
    ),
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
    {
      id: "thk-drive-torque",
      description:
        "THK Ball Screw General Catalog, 'Examples of Selecting a Ball Screw,' High-speed Transfer Equipment (Horizontal Use): model WTF2040-2, lead 40 mm, efficiency 0.9, no preload, direct coupling, forward-uniform-motion axial load 17 N. Published friction torque T1 = Fa*Ph/(2*pi*eta)*A = 120 N.mm. resolveDriveTorque reproduces 120.2 N.mm — a third, independent manufacturer confirmation of the same F*P/(2*pi*eta) term already cross-checked between Oriental Motor and Rockford.",
      tolerance: "matches within whole-unit catalog rounding",
    },
    {
      id: "thk-nominal-life",
      description:
        "Same THK example, model WTF2040-2: dynamic load rating Ca = 5400 N, THK's own printed average axial load Fm = 225 N, and THK's own printed load factor fw = 1.5. Published nominal life L = (Ca/(fw*Fm))^3 * 1e6 = 4.1e9 rev. resolveNominalLife reproduces this figure when fed the already-fw-adjusted load (fw*Fm = 337.5 N) — the fw factor itself is THK's own addition, not implemented by this kernel's formula, so this is a documented input adaptation rather than a claim that fw is built in.",
      tolerance: "matches to 2 significant figures (1e8 rev)",
    },
    {
      id: "thk-static-safety-factor",
      description:
        "Same THK example, model WTF2040-2: static load rating C0a = 13.6 kN. THK assumes fs = 2.5 (chosen for an application with deceleration impact loading) and derives a permissible axial load of C0a/fs = 5440 N. resolveStaticSafetyFactor(13600, 5440) reproduces THK's own assumed fs = 2.5 exactly, the algebraic inverse of the same published pair of numbers.",
      tolerance: "exact (both inputs are THK's own printed figures)",
    },
  ],
  independentBenchmark:
    "Drive torque is implemented from Oriental Motor's 'Motor Sizing Calculations' (T_L = F*P/(2*pi*eta) + mu0*F0*P/(2*pi), divided by gear ratio) and independently cross-checked against two other manufacturers' worked examples: Rockford Ball Screw (F*P/(2*pi*eta) term, agrees to within its own shown-arithmetic rounding) and THK (same term, agrees to within whole-unit catalog rounding) — see the rockford-drive-torque and thk-drive-torque reference examples above. Nominal life and static safety factor now also have a THK-sourced worked-number check alongside their original Steinmeyer/WY Ball Screw formula sourcing (see thk-nominal-life, thk-static-safety-factor above), though THK's own life example additionally applies a load factor (fw) this kernel does not implement — a documented adaptation, not an independent implementation match. Buckling and critical speed are implemented from Rockford Ball Screw's own formula and coefficients directly (the only source with a worked numeric example when Stage 1 was written); lib/modules/ball-screw/0.1.0/thk-benchmark.ts now separately implements THK's own structurally different (Steinmeyer-shaped, mm-based) buckling and critical-speed formulas as a genuine second implementation, reproducing THK's own three worked numbers (15,500 N buckling; 2180 and 3294 min^-1 critical speed) in thk-benchmark.test.ts, and cross-checked there against math.ts's Rockford-based functions for the equivalent geometry — the two agree within the same order of magnitude (ratios of 0.52 and 0.85 for buckling and critical speed respectively) but not to floating-point precision, because THK and Rockford use different calibration constants for the same nominal end condition, a real discrepancy documented in the module README rather than silently reconciled. This satisfies the roadmap's 'independent benchmark source or tool comparison' item for buckling/critical speed the same way axis-load-cases/atlanta-benchmark.ts does for that module, adapted for a case where the two sources are not expected to agree exactly. Equivalent dynamic load has the same treatment: thk-benchmark.ts's resolveThkDirectionalEquivalentLoad implements THK's own bidirectional-duty-cycle method (a genuinely different methodology, not just a different calibration constant), reproducing THK's own printed 225 N for both directions of its six-phase scenario; a dedicated test feeds the mathematically equivalent per-phase inputs through math.ts's resolveEquivalentDynamicLoad and confirms the two methods give materially different results (~283.5 N vs. 225 N) rather than silently asserting the discrepancy in prose alone.",
  reviewer: "Solo validation — THK independent-benchmark substitute",
  reviewDate: "2026-08-12",
  supportedUseLimits: [
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
    "resolveEquivalentDynamicLoad sums a single weighted-cube-mean over every supplied duty-cycle phase (Steinmeyer's published formula, evaluated directly). THK's own worked example (the same WTF2040-2 scenario cited above) instead splits a bidirectional/reversing duty cycle into two direction-specific averages, each normalized against the full round-trip travel distance rather than its own sub-total, and does not further combine them — a real procedural difference from what this kernel implements, not resolved here. Both methods are now implemented and tested (thk-benchmark.ts's resolveThkDirectionalEquivalentLoad reproduces THK's own printed 225 N; math.ts's resolveEquivalentDynamicLoad, fed the equivalent per-phase (time fraction, rotational speed, load) triples, gives ~283.5 N for the identical scenario — a genuine disagreement, not a rounding difference, confirmed by a test that asserts the two values are NOT close). This kernel's own formula was not changed pending further evidence on which convention a released module should follow; see stage-1-spec.md 'Evidence Gaps and Verification Confidence' for the full numeric account.",
    "resolveBucklingLoad and resolveCriticalSpeed implement Rockford Ball Screw's own end-fixity coefficients and formula shape (inch/lbf, Fe * 14,030,000 * ... ). thk-benchmark.ts implements THK's own, structurally different formula (mm, mounting-factor * d^4/L^2 * 1e4) as a separate independent computation, not a second implementation of the same formula: for the same nominal fixed-fixed/fixed-supported end conditions, THK's own mounting-factor constants (20, 15.1) differ from Steinmeyer's own table for the identical nominal conditions (22.4, 17.7) by roughly 10-15%, and the two formula shapes agree with the kernel's Rockford-based results only to within a bounded ratio (0.3x-3x, verified in thk-benchmark.test.ts), not floating-point precision. Three sources (Rockford, Steinmeyer, THK) now disagree on the exact buckling/critical-speed constants for nominally identical end conditions; the kernel keeps Rockford's own values because only Rockford's page supplied a worked example the kernel's own formula shape reproduces exactly.",
  ],
};
