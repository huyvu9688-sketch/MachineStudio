// Validation record for the linear-guide module (roadmap module definition of
// done, item 10). Stage 4 is complete as a documentation matter — see
// validation/linear-guide/0.1.0.md.
//
// PMI's own Chapter 9 worked example is now reproduced end to end
// (./pmi-chapter-9.ts, ./pmi-chapter-9.test.ts): all twenty per-carriage
// radial loads across five motion phases, all twenty lateral loads with their
// signs, all twenty equivalent loads, the governing static safety factor, and
// all four mean loads and nominal lives — every figure to within the +/-0.1 N
// the source itself prints. That reproduction also pinned the "No.1"-"No.4"
// to P1-P4 carriage mapping Stage 1 declined to guess at, and it found two
// real defects in this kernel's lateral treatment plus one printing error in
// the source. All three are recorded in `deviations` below.
//
// It is still ONE example from ONE source, which is why `referenceExamples`
// below lists the five phases it actually covers rather than claiming five
// independent examples.
//
// `independentBenchmark` now records a genuine second implementation:
// ./iko-benchmark.ts reproduces IKO's own worked "Example 1" (catalog
// printed pages 15-16), a structurally different equivalent-load method
// (series/size-keyed conversion factors, then a load-dominance-keyed
// weighting) from PMI's PE = |PR| + |PT| form. The two are cross-checked
// against each other on IKO's own four slide units and found to disagree by
// a real, bounded, now-quantified amount — see ./iko-benchmark.test.ts.
//
// `reviewer` and `reviewDate` stay "TODO" for the same reason ball-screw's do:
// they feed a future *sealed* record at Stage 6 (release), which has not
// started, and that is a different thing from validation/linear-guide/
// 0.1.0.md's own completion. Release for this module no longer waits on
// Unit 4.1's Definition of Done -- axis-load-cases@0.1.0 released 2026-08-11
// (validation/axis-load-cases/0.1.0.md) -- it simply has not started its own
// Stage 6 yet.

import type { ValidationRecord } from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const validation: ValidationRecord = {
  moduleId: "linear-guide",
  moduleVersion: "0.1.0",
  methods: [
    "PMI per-block working-load distribution for a two-rail, two-blocks-per-rail arrangement (Section 6), reformulated in resolved force/moment terms",
    "PMI two-or-more-guideways equivalent load, PE = |PR| + |PT| (Section 7)",
    "PMI static safety factor, fs = C0 / P0 (Section 4.3); IKO's identical form corroborates it",
    "PMI ball-type nominal life, L = (fH*fT/fW * C/P)^3 * 50 km (Sections 4.4-4.5); IKO's ISO 14728-1-attributed form corroborates the shape and distance basis",
    "IKO dynamic/static equivalent load, Frw = kr*|Fr|, Faw = ka*|Fa|, P = X*Frw + Y*Faw (X, Y keyed on which conversion load dominates), P0 = kOr*|Fr| + kOa*|Fa| (catalog formulas 7-10) — implemented as a genuine second computation in iko-benchmark.ts, not merely corroborated",
  ],
  sourceRevisionIds: [
    asSourceRevisionId(
      "us.pmi.linear_guideway_catalog@bearing-net-au-mirror-2026-08-09",
    ),
    asSourceRevisionId("jp.iko.linear_way_catalog@1560e"),
  ],
  referenceExamples: [
    {
      id: "pmi-ch9-working-load",
      description:
        "PMI Linear Guideway catalog, Chapter 9 (printed pages B28-B31), model MSA35LA2SSFC + R2520-20/20 P II: m1 = 700 kg and m2 = 450 kg on a four-carriage table, v = 0.75 m/s, a1 = 15 m/s^2, a3 = 5 m/s^2, l1 = 650 mm, l2 = 450 mm, l3 = 135 mm, l4 = 60 mm, l5 = 175 mm, l6 = 400 mm. resolveBlockLoadsFromResultant reproduces all twenty printed per-carriage radial loads (uniform motion, plus acceleration and deceleration in each travel direction) and all twenty lateral loads including their signs, fed by a force and moment resolved from PMI's own given data — i.e. through this module's real integration path, not by restating PMI's per-installation formulas.",
      tolerance:
        "+/-0.1 N against every printed figure, the precision PMI itself prints. Requires g = 9.8 m/s^2, which is what PMI computes with (standard gravity misses the printed section 9.1.1 figures by about 2.7 N).",
    },
    {
      id: "pmi-ch9-equivalent-load",
      description:
        "Same example, section 9.2: the twenty per-carriage equivalent loads PE = |PR| + |PT| across the same five motion phases.",
      tolerance: "+/-0.1 N against every printed figure.",
    },
    {
      id: "pmi-ch9-static-safety-factor",
      description:
        "Same example, section 9.3: fs = C0 / PE_max = 100.6 kN / 8611.2 N = 11.7, governed by carriage No.2 during acceleration to the left. Both the governing carriage and the governing phase are reproduced, not just the number.",
      tolerance:
        "governing load within +/-0.1 N; fs within PMI's own one-decimal print (the exact quotient is 11.68).",
    },
    {
      id: "pmi-ch9-mean-load",
      description:
        "Same example, section 9.4: the four per-carriage mean loads (2700.7, 4077.2, 3187.7, 1872.6 N) from resolveMeanLoad over the six distance-weighted phases of a round trip.",
      tolerance: "+/-0.1 N against every printed figure.",
    },
    {
      id: "pmi-ch9-nominal-life",
      description:
        "Same example, section 9.5: the four per-carriage nominal lives (193,500 / 56,231 / 117,700 / 580,400 km) at fW = 1.5, and PMI's own conclusion that carriage No.2 governs at 56,231 km.",
      tolerance:
        "within 0.1% relative, since PMI prints these to 3-4 significant figures.",
    },
  ],
  independentBenchmark:
    "Implemented: lib/modules/linear-guide/0.1.0/iko-benchmark.ts reproduces IKO's own worked 'Example 1' (Linear Way ME 25 C2 R640 H, catalog printed pages 15-16, a two-rail/four-slide-unit arrangement matching this module's own scope) end to end -- P1-P4 (dynamic equivalent load), P01-P04 (static equivalent load), fs = 6.3, and the ~4410 km / ~73,500 h rating life all reproduced from IKO's own conversion-factor tables (kr, ka, kOr, kOa -- catalog Table 3/5) and its own two-class dominance-weighted combination rule (X, Y -- catalog Table 4), all confirmed in iko-benchmark.test.ts. This corrects stage-1-spec.md item 7's description of X/Y as a per-series table: reading the actual table shows it is a universal two-row class table, not per-series -- only kr/ka/kOr/kOa are series/size-specific. The formula-shape corroboration on rating life and static-safety-factor definition described above still stands independently of this. The open question stage-1-spec.md item 7 recorded -- whether IKO's more elaborate formula would give a materially different answer than PMI's PE = |PR| + |PT| for the same four-block scenario -- is now answered for this series bucket (kr = ka = 1): IKO's figure is always the lower of the two, exactly PMI's figure minus 0.4 * min(|Fr|, |Fa|) (an algebraic identity, not an empirical fit), a real 5-20% disagreement across IKO's own four slide units in this example. Neither form is corrected toward the other; both are genuine, sourced methods that disagree, the same treatment ball-screw's own Rockford/THK buckling and equivalent-load disagreements receive. IKO's own 'Example 2' (a one-rail/two-slide-unit mono-rail arrangement, catalog Table 6.2) is not reproduced -- it needs an added static-equivalent-load moment term this module's 0.1.0 scope does not cover, the same mono-rail/two-or-more-guideways scope split PMI itself draws.",
  reviewer: "TODO",
  reviewDate: "TODO",
  supportedUseLimits: [
    "Draft package: not registered, not released, no reviewer recorded (reviewer/reviewDate stay TODO -- that is a Stage 6 release field, not a Stage 4 completeness gate; see validation/linear-guide/0.1.0.md 'Reviewer'). Stage 4's reference-example reproduction and independent-benchmark items are both now complete.",
    "All reference evidence comes from a single worked example in a single manufacturer's catalog. A second source's numbers have not been reproduced.",
    "Supports only the normal and peak load cases; holding and emergency_stop are not implemented.",
    "One fixed arrangement: two parallel rails, two blocks per rail, four load-bearing points. One-rail and other multi-rail arrangements are out of scope.",
    "Horizontal or vertical installation only. An inclined axis is rejected by the input schema; PMI's overhung, wall-mount, and tilted formula sets exist in the source but were not transcribed or verified for this version.",
    "Ball-type rolling elements only (exponent 3, 50 km basis). A roller-type guide is rejected by the input schema rather than given the ball exponent.",
    "Equivalent load uses PMI's two-or-more-guideways form, so no moment rating is consumed and no separate moment term is added.",
    "The life load factor and the minimum static safety factor are required inputs with no built-in default; PMI and IKO publish differing guidance ranges for both.",
    "Nominal life is reported per load case from that case's own equivalent load. No duty-cycle mean load is computed, so a varying-load duty cycle is not aggregated into a single life figure.",
    "No preload-dependent stiffness modeling beyond recording the preload grade; no lubrication-regime, seal-wear, or rail-deflection modeling.",
  ],
  deviations: [
    "The module consumes axis-load-cases' resolved force and moment rather than PMI's own mass/gravity/acceleration inputs, so it calls the kernel's general resolveBlockLoadsFromResultant instead of the four installation-specific functions that reproduce PMI's printed diagrams. For the radial distribution this is exact, not an approximation: every load-position offset in PMI's in-scope diagrams appears only inside a force-times-offset product, and math.test.ts machine-checks that the general form reproduces the printed B17 and B23 formula sets. The consequence is that installation orientation selects no formula in this module, unlike in PMI's own method.",
    "CORRECTED AT STAGE 4, not a deviation any more but recorded because the released behaviour changed: the yawing moment's lever arm is the carriage spacing along travel, not the rail spacing, and the four lateral block loads form a signed zero-sum distribution rather than one shared magnitude. Both errors came from the Stage 1 spec reading PMI's l1 as the rail spacing and l2 as the carriage spacing when they are the other way round. Every PMI lateral formula divides by 2*l1, which under the mistaken reading looked like PMI reacting a yawing moment across the rails — physically impossible, and recorded at the time as a suspicious open question rather than trusted. Reproducing Chapter 9 showed it was PMI's letters that had been misread, not PMI's physics.",
    "PMI's section 9.1.3 contradicts itself and this module follows its formulas, not its printed values. For deceleration to the left it prints Pt3la3 = -m1*a3*l4/(2*l1) beside the value 161.5 N and Pt4la3 = +m1*a3*l4/(2*l1) beside -161.5 N — formula and value opposite in sign in both cases. The other three phases have formula and value in agreement and group carriages {No.1, No.4} against {No.2, No.3} in every phase; reading 9.1.3 by its formulas fits that pattern, while reading it by its values would make it the only phase whose lateral reactions regroup, which no rigid-body arrangement can do. Nothing downstream depends on it: equivalent load takes |PT| and every magnitude there is 161.5 N, so PMI's own sections 9.2-9.5 are unaffected either way. pmi-chapter-9.test.ts asserts the disagreement is confined to those two carriages and is a sign flip only.",
    "PMI computes Chapter 9 with g = 9.8 m/s^2, not the 9.80665 this project's motion.axis.gravity default uses. Confirmed by arithmetic rather than assumed: standard gravity misses PMI's printed section 9.1.1 figures by about 2.7 N, well outside the +/-0.1 N the reproduction holds to. The reference test therefore uses PMI's own constant; a real calculation fed by axis-load-cases will use standard gravity and differ by that much.",
    "The kernel accepts a direct lateral force share (F/4) that no in-scope PMI diagram prints, because none of them shows a net lateral force. It is elementary statics rather than source-confirmed, and passing zero reproduces any PMI diagram exactly.",
    "For a vertical installation the module requires the engineer's free choice of the axis.v1 +Y direction to be the in-plane transverse direction, which fixes the mounting-plane normal on +/-Z. axis.v1 leaves that choice open for a vertical axis and nothing in the resolved input can detect a different one, so it is carried as a reported assumption rather than a check.",
    "IKO's own equivalent-load formula (implemented separately in iko-benchmark.ts, not wired into this module's compute path) is not adopted as this module's own formula; PMI's PE = |PR| + |PT| remains what compute.ts uses. The two are now known to disagree by a real, bounded amount for the same load case -- IKO's figure is always the lower of the two, exactly PMI's figure minus 0.4 * min(|Fr|, |Fa|) for a symmetric-conversion-factor series (kr = ka = 1), a 5-20% gap on IKO's own four-slide-unit example -- resolving context/modules/linear-guide/stage-1-spec.md item 7's previously open question. Series with an asymmetric kr/ka (e.g. MV, or ME/MH's own 35-45 size bucket) were not checked and may not reduce this cleanly, since the dominance comparison in IKO's X/Y rule would then be between converted rather than raw loads.",
  ],
};
