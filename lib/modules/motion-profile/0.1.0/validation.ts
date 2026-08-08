// Validation record for the motion-profile module (roadmap module definition
// of done, item 10). This is a Stage 3 draft record, not a Stage 4
// completion: no published worked example exists for this method (see
// context/modules/motion-profile/stage-1-spec.md "Evidence Gaps" — neither
// verified candidate source publishes a numeric worked example), so
// `referenceExamples` stays empty rather than claiming one. The independent
// benchmark IS built and tested (`./oriental-motor-benchmark.ts` and its
// test), satisfying that module-testing requirement ahead of a registered
// package. `reviewer`/`reviewDate` stay TODO pending a real review.

import type { ValidationRecord } from "@/lib/engine";

export const validation: ValidationRecord = {
  moduleId: "motion-profile",
  moduleVersion: "0.1.0",
  methods: [
    "Elementary constant-acceleration (symmetric trapezoidal/triangular) positioning-move kinematics",
    "Time-weighted RMS acceleration aggregation over a move-plus-dwell cycle",
  ],
  sourceRevisionIds: [],
  referenceExamples: [],
  independentBenchmark:
    'Oriental Motor General Catalog 2015/2016 p. H-23 general trapezoidal/triangular positioning-time method (independent acceleration/deceleration rates, non-zero starting/ending speed), reduced to the a1=a2, Vs=0 case this kernel covers and cross-checked in lib/modules/motion-profile/0.1.0/oriental-motor-benchmark.test.ts. The cycle-level RMS aggregation is elementary time-weighted-RMS arithmetic (context/modules/motion-profile/stage-2-contract.md "Decisions" item 1); it has no manufacturer-specific formula to benchmark against.',
  reviewer: "TODO",
  reviewDate: "TODO",
  supportedUseLimits: [
    "Draft Stage 3 package: not registered, not released. No published reference example is reproduced yet — neither verified candidate source (ABB AN00115, Oriental Motor H-18/H-23) publishes a numeric worked example for this method.",
    "Supports a single symmetric trapezoidal/triangular move, optionally followed by one dwell, as the whole motion cycle. Asymmetric acceleration/deceleration, jerk-limited S-curve profiles, and more than one move per cycle are not implemented by this package (the cycle kernel at ./cycle.ts supports an arbitrary segment sequence, but this package's port cardinality does not yet expose it — see ./manifest.ts).",
    "move_distance > 0, max_velocity > 0, max_acceleration > 0, dwell_time >= 0 when supplied; no structural compliance, resonance/bandwidth limiting, or encoder/servo loop dynamics.",
  ],
  deviations: [],
};
