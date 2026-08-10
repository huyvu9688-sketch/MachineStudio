// Validation record for the support-bearing module (roadmap module
// definition of done, item 10). Stage 4 (validation) is now substantially
// complete — the two evidence gaps recorded through 2026-08-09
// (context/modules/support-bearing/stage-1-spec.md "Evidence Gaps") are
// both closed 2026-08-10 by a third manufacturer, NSK Ltd., whose own
// "Rolling Bearings" catalog (CAT. No. E1102a) turned out to contain the
// worked-examples section the two candidates read on 2026-08-09 (THK, NTN)
// could not supply: THK's own catalog chapter has no life/safety-factor
// formula of its own, and NTN's own handbook's own "Bearing Life
// Calculation Examples" section (printed page 84) is missing from every one
// of three independently-fetched editions (see this file's own
// independentBenchmark note and lib/standards/engineering-sources.ts's own
// note on jp.ntn.rolling_bearings_handbook@cat-9012e for the retry that
// reconfirmed the gap rather than closing it).

import type { ValidationRecord } from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const validation: ValidationRecord = {
  moduleId: "support-bearing",
  moduleVersion: "0.1.0",
  methods: [
    "NTN dynamic equivalent load and basic rating life (P = X*Fr + Y*Fa; L10 = (C/P)^3 * 10^6; L10h = L10/(60n))",
    "NTN static equivalent load and static safety factor (P0 = max(X0*Fr + Y0*Fa, Fr); S0 = C0/P0)",
    "Locally-derived operating rotational speed (n = v/lead), reusing screw.lead directly rather than a manufacturer-specific method",
  ],
  sourceRevisionIds: [
    asSourceRevisionId(
      "jp.thk.ball_screw_general_catalog@technico-mirror-2026-08-09",
    ),
    asSourceRevisionId("jp.ntn.rolling_bearings_handbook@cat-9012e"),
    asSourceRevisionId("jp.nsk.rolling_bearings_catalog@e1102a-2005"),
  ],
  referenceExamples: [
    {
      id: "nsk-example-1-6208-radial-only",
      description:
        "NSK 'Rolling Bearings' (CAT. No. E1102a) Section 5.7 Example 1: single-row deep-groove ball bearing 6208 under a pure radial load (Fr=2500 N, n=900 rpm, Cr=29,100 N). Reproduced through executeModule (lib/modules/support-bearing/0.1.0/nsk-reference-examples.ts) as a bearing.location='supported' run.",
      tolerance:
        "Dynamic equivalent load matched to floating-point precision against NSK's own exact printed P=2500 N; basic rating life matched within 2% of NSK's own stated ~29,000 h, a documented allowance for NSK's own chart-reading rounding (fh is read from its own Fig. 5.4), not slack introduced to pass the test.",
    },
    {
      id: "nsk-example-3-6208-radial-plus-axial",
      description:
        "NSK 'Rolling Bearings' Section 5.7 Example 3: the same bearing 6208 and radial load as Example 1, plus an axial load (Fa=1000 N, X=0.56, Y=1.67, NSK's own printed factors). Reproduced through executeModule as a bearing.location='fixed' run.",
      tolerance:
        "Dynamic equivalent load matched to floating-point precision against NSK's own exact printed P=3070 N; basic rating life matched within 2% of NSK's own stated ~15,800 h, the same chart-reading allowance as nsk-example-1-6208-radial-only.",
    },
  ],
  independentBenchmark:
    "Met 2026-08-10. lib/modules/support-bearing/0.1.0/nsk-fh-benchmark.ts implements NSK's own distinct 'fatigue life factor' (fh) / 'speed factor' (fn) method (Table 5.2, ball-bearing column: fn=(0.03n)^(-1/3); fh=fn*C/P; Lh=500*fh^3) as a genuine second computation, reproducing NSK's own Example 1 and Example 3 figures (fh=3.88/3.16, ~29,000 h/~15,800 h) independently of ./math.ts's own resolveNominalLife/resolveLifeHours. The two are then shown to be a proved algebraic identity, not merely a numeric coincidence -- substituting NSK's own fn formula into Lh=500*fh^3 reduces exactly to (C/P)^3 * 10^6/(60n), the same form ./math.ts already computes (derivation in nsk-fh-benchmark.ts's own module doc comment) -- and nsk-fh-benchmark.test.ts asserts the two agree to floating-point precision across four cases, the same 'two independently-sourced formulations of one physics, proved identical' treatment lib/modules/linear-guide/0.1.0/iko-benchmark.ts gives PMI's and IKO's own equivalent-load forms. NSK's own two short 'Technical Insight' bulletins (TI Bearing Life.pdf, P_TI-0102_EN.pdf), read in an earlier session, had already corroborated the same formula shape without a full worked example to reproduce; this closes that gap with NSK's own full catalog instead.",
  reviewer: "TODO",
  reviewDate: "TODO",
  supportedUseLimits: [
    "Draft Stage 3 package: not registered, not released. No reviewer is recorded yet — the solo-validation reviewer-substitute policy (context/ai-workflow-rules.md 'Stage 4 — Validation') is now invokable, since both the reference-example and independent-benchmark items are met, but reviewer/reviewDate remain a Stage 6 (release) field, the same treatment ball-screw's, linear-guide's, and coupling's own validation.ts give that pair.",
    "Supports only the normal and peak load cases; holding and emergency_stop are not implemented.",
    "One support bearing per calculation run (bearing.location selects fixed or supported) — not a combined fixed+floating calculation.",
    "Two-point shaft support only; ball bearings only (life exponent p = 3).",
    "Axial load (fixed-side only) reuses motion.axis.thrust_force directly, the same load ball-screw's own kernel already resists internally.",
    "Radial load is a new required engineer-supplied input (bearing.actual_radial_load) — no released upstream parameter derives it.",
    "The dynamic/static equivalent-load factors (X, Y, X0, Y0) are engineer-supplied catalog lookups, not a reproduced universal table.",
    "bearing.static_safety_factor_minimum has no built-in default, even though only one source's own numbers (NTN Table 6.4) were read this session.",
    "bearing.bore_diameter, bearing.outside_diameter, and bearing.preload are reported catalog values only, not evaluated against an actual shaft/housing diameter.",
    "NTN's own speed correction factors (fL, fC) are not implemented — the catalog allowable speed is used uncorrected.",
    "A case with exactly zero dynamic/static equivalent load or exactly zero operating speed is unsupported: the kernel throws rather than reporting an infinite life or safety factor.",
    "No torsional-resonance check, no 3-point statically-indeterminate load derivation, no fit-tolerance-class (h6/k5/js5) verification.",
  ],
  deviations: [
    "NTN's own speed correction factors fL/fC (handbook Ch. 10, Figs. 10.1-10.2) are printed only as graphs, not closed-form equations, and are not implemented — the catalog allowable speed is used uncorrected (math.ts's own module doc comment).",
    "bearing.bore_diameter and bearing.outside_diameter are reported, not evaluated — a real scope narrowing from stage-1-spec.md's own initial 'simple bound check' proposal, since a support bearing's bore is manufactured to one matched shaft diameter, not a clamping range the way coupling.driving_bore_min/max is.",
  ],
};
