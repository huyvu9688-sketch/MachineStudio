// Validation record for the support-bearing module (roadmap module
// definition of done, item 10). Stage 4 (validation) has NOT started —
// this is a draft record accompanying the Stage 3 package, the same
// "Stage 4 has not started" honesty every other module's own first-draft
// validation.ts states before its own Stage 4 work begins.
//
// Two real evidence gaps are already known and documented
// (context/modules/support-bearing/stage-1-spec.md "Evidence Gaps"): no
// full published worked numerical example was found (NTN's own handbook
// lists one in its table of contents at printed page 84, but both copies
// fetched this session are identically truncated right before it), and no
// independent-benchmark candidate exists yet (NSK's own short bulletins
// corroborate NTN's formula shape exactly, which is agreement, not a
// second implementation).

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
  ],
  referenceExamples: [],
  independentBenchmark:
    "Not implemented. NSK's own two short 'Technical Insight' bulletins (TI Bearing Life.pdf, P_TI-0102_EN.pdf) corroborate NTN's own L10 = (C/P)^p and P = X*Fr + Y*Fa formula shape exactly, with no numeric disagreement found — real corroboration from a second manufacturer, but not a second, independently-implemented numerical computation of the kind lib/modules/ball-screw/0.1.0/thk-benchmark.ts or lib/modules/linear-guide/0.1.0/iko-benchmark.ts provide. No full published worked example has been found to reproduce independently yet either (see this file's own header note).",
  reviewer: "TODO",
  reviewDate: "TODO",
  supportedUseLimits: [
    "Draft Stage 3 package: not registered, not released. No reviewer is recorded yet. Stage 4 (validation) has not started.",
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
