// Validation record for the motion-profile module (roadmap module definition
// of done, item 10). Stage 4 (validation) is complete as a documentation
// matter — see validation/motion-profile/0.1.0.md, which uses the documented
// solo-validation reviewer-substitute policy. Three published reference
// examples are now reproduced, from two independent manufacturers (ABB,
// Oriental Motor) across three independent worked scenarios — see
// "Reference Examples" below and validation/motion-profile/0.1.0.md for the
// full account. The independent benchmark (Oriental Motor's general
// asymmetric method, `./oriental-motor-benchmark.ts`) predates this and is
// unchanged. `reviewer`/`reviewDate` stay TODO regardless: that field feeds
// a future *sealed* `ValidationRecord` at Stage 6 (release), which has not
// started, and is not the same thing as validation/motion-profile/0.1.0.md's
// own completion.

import type { ValidationRecord } from "@/lib/engine";
import { asSourceRevisionId } from "@/lib/standards";

export const validation: ValidationRecord = {
  moduleId: "motion-profile",
  moduleVersion: "0.1.0",
  methods: [
    "Elementary constant-acceleration (symmetric trapezoidal/triangular) positioning-move kinematics",
    "Time-weighted RMS acceleration aggregation over a move-plus-dwell cycle",
  ],
  sourceRevisionIds: [
    asSourceRevisionId("us.abb.trapezoidal_move_calculations@rev-c-en"),
    asSourceRevisionId(
      "jp.oriental_motor.linear_rotary_actuator_selection_calculations@2015-2016",
    ),
  ],
  referenceExamples: [
    {
      id: "abb-walkthrough-demo",
      description:
        "ABB AN00115 'Trapezoidal Move Calculations,' Rev C (EN), p. 2-3: SPEED=8, ACCEL=DECEL=16, MOVER=12 (the source's own generic, deliberately unit-agnostic 'Mint scale factor' units, assigned directly as SI since the kinematics is unit-system-invariant). Published Ta=Td=0.5s, Ts=1s, T=2s. resolveTrapezoidalMove reproduces every printed value exactly.",
      tolerance:
        "exact (both inputs and outputs are the source's own printed integers/fractions)",
    },
    {
      id: "abb-exercise-answer",
      description:
        "ABB AN00115, p. 6-7 'Exercise': a 200mm ball-screw move in 1 second, assuming an equal Ta/Ts/Td time split (the 'third rule'). The exercise's own 'Exercise Answer' derives SPEED=250mm/s, ACCEL=DECEL=1250mm/s/s from that assumption; feeding those forward through resolveTrapezoidalMove reproduces the exercise's own printed Ta=Td=0.2s, Ts=0.6s, T=1s exactly. The exercise's own inverse direction (target time -> derived speed/accel) is not implemented by this module; only the forward reproduction of its own derived numbers is claimed here.",
      tolerance:
        "exact (fed the exercise's own derived SPEED/ACCEL/DECEL values)",
    },
    {
      id: "oriental-motor-eas6-example",
      description:
        "Oriental Motor General Catalog 2015/2016, p. H-19 '<Example operation>': EAS6, vertical, load 15 kg, positioning distance 500mm, positioning time 1.77s, operating speed 320mm/s, acceleration 1.5 m/s^2 (0.15G), no starting speed stated. resolveTrapezoidalMove computes 1.7758s for the same distance/speed/acceleration inputs.",
      tolerance:
        "+/-0.01s (~0.33% of the printed value) — a graph-read catalog reference value with 2-3-significant-figure printed inputs, not a full-precision formula result",
    },
  ],
  independentBenchmark:
    'Oriental Motor General Catalog 2015/2016 p. H-23 general trapezoidal/triangular positioning-time method (independent acceleration/deceleration rates, non-zero starting/ending speed), reduced to the a1=a2, Vs=0 case this kernel covers and cross-checked in lib/modules/motion-profile/0.1.0/oriental-motor-benchmark.test.ts. The cycle-level RMS aggregation is elementary time-weighted-RMS arithmetic (context/modules/motion-profile/stage-2-contract.md "Decisions" item 1); it has no manufacturer-specific formula to benchmark against.',
  reviewer: "TODO",
  reviewDate: "TODO",
  supportedUseLimits: [
    "Draft Stage 3 package: not registered, not released. No second engineer reviewed this record; the independent benchmark comparison (oriental-motor-benchmark.ts) serves as the documented review substitute.",
    "Supports a single symmetric trapezoidal/triangular move, optionally followed by one dwell, as the whole motion cycle. Asymmetric acceleration/deceleration, jerk-limited S-curve profiles, and more than one move per cycle are not implemented by this package (the cycle kernel at ./cycle.ts supports an arbitrary segment sequence, but this package's port cardinality does not yet expose it — see ./manifest.ts).",
    "move_distance > 0, max_velocity > 0, max_acceleration > 0, dwell_time >= 0 when supplied; no structural compliance, resonance/bandwidth limiting, or encoder/servo loop dynamics.",
    "The cycle-level RMS acceleration output has no published worked example to reproduce — it is elementary time-weighted-RMS arithmetic with no manufacturer-specific formula (context/modules/motion-profile/stage-2-contract.md 'Decisions' item 1), corroborated only by the internal-consistency tests in ./cycle.test.ts.",
  ],
  deviations: [],
};
