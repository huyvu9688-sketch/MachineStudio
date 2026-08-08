// Validation record for the axis-load-cases module (roadmap module
// definition of done, item 10). This is a Stage 3/4-in-progress draft
// record, not a Stage 4 completion: the reviewer field stays TODO and
// release-grade ID39/ID42 evidence plus a third long-stroke/high-speed
// fixture are still missing (see context/modules/axis-load-cases/
// stage-1-spec.md "Validation Gate and Evidence Intake" and
// context/progress-tracker.md "Blocked"). The three reference examples below
// ARE reproduced and tested (./thk-reference-examples.test.ts), satisfying
// the roadmap's "at least three published reference examples reproduced
// within stated tolerances" item on its own. The independent benchmark item
// is now also satisfied (./atlanta-benchmark.ts and its test) — do not treat
// the rest of this record as release evidence.

import type { ValidationRecord } from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const validation: ValidationRecord = {
  moduleId: "axis-load-cases",
  moduleVersion: "0.1.0",
  methods: [
    "Rigid-body quasi-static load resolution with constant acceleration",
    "Coulomb friction (normal-load-based) plus documented guide/seal resistance",
  ],
  sourceRevisionIds: [
    asSourceRevisionId("us.nist.sp811@web-2026-07-31"),
    asSourceRevisionId("jp.thk.ball_screw_general_catalog@515-1e"),
    asSourceRevisionId("jp.thk.example_ball_screw_selection@515-1e"),
  ],
  referenceExamples: [
    {
      id: "thk-b15-72-horizontal",
      description:
        "THK Example Ball Screw Selection, 515-1E, p. B15-72: horizontal axis, m = 80 kg, mu = 0.003, f = 15 N, Vmax = 1 m/s, t = 0.15 s. Published axial loads 550 N / 17 N / -516 N (accel / constant / decel).",
      tolerance: "+/-1 N (whole-newton catalog rounding; g = 9.8 m/s^2)",
    },
    {
      id: "thk-b15-86-vertical",
      description:
        "THK Example Ball Screw Selection, 515-1E, p. B15-86: vertical axis, m = 50 kg, f = 20 N, Vmax = 0.3 m/s, t = 0.2 s. Published axial loads 585 N / 510 N / 435 N (accel / constant / decel, upward).",
      tolerance: "+/-1 N (whole-newton catalog rounding; g = 9.8 m/s^2)",
    },
    {
      id: "thk-b2-22-vertical",
      description:
        "THK Example of Calculating the Nominal Life, 515-1E, p. B2-22: vertical axis, m = 30 kg, a = 2.4 m/s^2, guide resistance 10 N (derived from the published 304 N constant-speed figure). Published axial loads 376 N / 304 N / 232 N (accel / constant / decel, upward).",
      tolerance: "+/-1 N (whole-newton catalog rounding; g = 9.8 m/s^2)",
    },
  ],
  independentBenchmark:
    "Atlanta (a rack-and-pinion drive manufacturer, distinct mechanism from THK's ball screw) 'Rack and Pinion Drive Calculations and Selection,' pp. C-53-C-55: two complete published worked examples — horizontal/friction-resisted (Fu = m*g*mu + m*a) and vertical/lifting (Fu = m*g + m*a) — reproduced independently in lib/modules/axis-load-cases/0.1.0/atlanta-benchmark.ts and cross-checked against this module's own resolveAxisLoadPhase kernel for the equivalent reduced scenario (no guide resistance, external load, or center-of-mass offset) in atlanta-benchmark.test.ts; both agree to floating-point precision. This validates the shared Newtonian/Coulomb-friction core the two methods have in common, not ball-screw-specific mechanics (lead-angle efficiency, preload friction torque) THK's method separately covers, so it is a partial, not full-coverage, benchmark. This source's licensing status is unresolved (context/progress-tracker.md 'Open decisions': 'Licensing status of the ID39/ID42 training PDFs and the Omron/ATLANTA reference material — internal reference only until cleared'), so it is deliberately not registered in lib/standards or cited via a ClauseReference/SourceRevisionId anywhere — this is an internal cross-check only, not a customer-facing citation.",
  reviewer: "TODO",
  reviewDate: "TODO",
  supportedUseLimits: [
    "Draft Stage 3 package: not registered, not released. Reference examples and an independent benchmark are reproduced and tested; ID39/ID42 evidence is still draft-only, the third long-stroke/high-speed fixture is still missing, and no reviewer is recorded yet.",
    "Supports only the normal and peak load cases; holding and emergency_stop are not implemented.",
    "One rigid moving assembly on a straight axis; horizontal, vertical, or inclined 0-90 degrees.",
    "Scalar Coulomb friction in [0, 1]; no structural compliance, backlash, guide-block load distribution, collision impact, regenerative braking, or brake sizing.",
  ],
  deviations: [
    "Draft package: also reproduces ID39/ID42 historical force magnitudes as a regression aid (draft evidence, not release-grade — see stage-1-spec.md). This is in addition to, not a substitute for, the three published THK reference examples above.",
    "The independent benchmark (Atlanta) covers the shared friction/gravity/acceleration core only, not ball-screw-specific mechanics (lead-angle efficiency, preload friction torque) — see independentBenchmark above.",
  ],
};
