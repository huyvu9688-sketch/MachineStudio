// Validation record for the axis-load-cases module (roadmap module
// definition of done, item 10). This is the Stage 4 completion record for
// v0.1.0 (docs/superpowers/specs/2026-08-11-unit-4.1-release-design.md
// "Validation and Release Record"): three published THK worked examples are
// reproduced within stated tolerance (./thk-reference-examples.test.ts), the
// Atlanta rack-and-pinion independent benchmark is reproduced and
// cross-checked against this module's own kernel (./atlanta-benchmark.ts and
// its test), and that benchmark serves as the solo-validation reviewer
// substitute (context/ai-workflow-rules.md "Stage 4 — Validation") recorded
// below. The historical ID39/ID42 fixtures (tests/fixtures/axes/) are
// accepted as `0.1.0-release-candidate` regression evidence, with their
// remaining provenance gaps preserved rather than hidden — see
// `deviations`, below.

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
    asSourceRevisionId("us.nist.sp811@2008-2nd-printing"),
    asSourceRevisionId("jp.thk.ball_screw_general_catalog@515-1e"),
    asSourceRevisionId("jp.thk.example_ball_screw_selection@515-1e"),
    asSourceRevisionId(
      "us.atlanta_drive_systems.rack_pinion_calculations@sha256-2bc6e48c2dce79dd",
    ),
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
    "Atlanta Drive Systems, 'Rack and Pinion Drive Calculations and Selection,' pp. C-53-C-55 (us.atlanta_drive_systems.rack_pinion_calculations@sha256-2bc6e48c2dce79dd) — a rack-and-pinion drive manufacturer's method, a distinct transmission mechanism from THK's ball screw. Both of the source's own published worked examples are reproduced as an independent implementation in lib/modules/axis-load-cases/0.1.0/atlanta-benchmark.ts, tested in atlanta-benchmark.test.ts: the horizontal, friction-resisted case (p. C-54, Fu = m*g*mu + m*a; m = 820 kg, mu = 0.1, v = 2 m/s, t = 1 s) computes 2444.42 N against the source's published 2.44 kN (2440 N) — a difference of 4.42 N, 0.181%; the vertical, lifting case (p. C-55, Fu = m*g + m*a; m = 300 kg, v = 1.08 m/s, t = 0.27 s) computes 4143 N against the source's published 4.1 kN (4100 N) — a difference of 43 N, 1.049%. Both differences are attributable to the source's own coarser catalog rounding (2-3 significant figures), not a formula disagreement. The same test file also cross-checks resolveAtlantaHorizontalForce and resolveAtlantaVerticalForce — each an independently authored implementation — against this module's own resolveAxisLoadPhase kernel for the equivalent reduced scenario (no guide resistance, external load, or center-of-mass offset; horizontal reduces to incline = 0, vertical to incline = pi/2): the two independently-authored implementations agree to floating-point precision. This benchmark validates only the shared Newtonian/gravity/Coulomb-friction mechanics the two methods have in common; it does not exercise ball-screw-specific mechanics (lead-angle efficiency, preload friction torque) that THK's method separately covers, so it is a partial, not full-coverage, benchmark. Per context/ai-workflow-rules.md 'Stage 4 — Validation,' this comparison serves as the solo-validation reviewer substitute recorded below: no second engineer was available for this release. This source is registered in lib/standards as metadata-only with 'licensed' access, its redistribution status unresolved; its content is not redistributed, quoted, or linked from any customer-facing trace or report — only its SourceRevisionId is cited.",
  reviewer: "Solo validation — Atlanta independent-benchmark substitute",
  reviewDate: "2026-08-11",
  supportedUseLimits: [
    "Supports only the normal and peak load cases; holding and emergency_stop are not implemented in this version — neither ID39 nor ID42 contains a holding/brake or emergency-stop case, so there is no evidence to source their semantics from yet (context/modules/axis-load-cases/stage-2-contract.md 'Deferred Decisions and Release Gates' item 1).",
    "One rigid moving assembly on a straight axis; horizontal, vertical, or inclined 0-90 degrees.",
    "Scalar Coulomb friction in [0, 1].",
    "No structural compliance, backlash, guide-block load distribution, collision impact, regenerative braking, or brake sizing is modeled. This module and record make no legal or regulatory compliance claim; passing its checks does not certify the whole machine against any cited source.",
  ],
  deviations: [
    "The historical ID39 (horizontal, tests/fixtures/axes/axis-horizontal-basic/) and ID42 (vertical, tests/fixtures/axes/axis-vertical/) project fixtures are accepted as 0.1.0-release-candidate regression evidence for this release (docs/superpowers/specs/2026-08-11-unit-4.1-release-design.md 'Evidence Disposition'), not release-grade vendor-sizing validation: neither packet's original document revision nor a confirmed as-built installation record is available, and that gap is recorded here rather than hidden. This is in addition to, not a substitute for, the three published THK reference examples above.",
    "ID42 additionally carries two source discrepancies that are preserved as recorded deviations rather than silently corrected: the source's own p. 1 diagram states a 75 N acceleration force against p. 4's explicit 45 N calculation, and the source's Keyence motor attribution conflicts with the progress tracker's HIWIN attribution (tests/fixtures/axes/axis-vertical/README.md).",
    "A third long-stroke/high-speed real-project fixture, needed for the broader Unit 0.1 and Phase 1B linear-axis validation goals, remains absent from reference/source-material/ (context/modules/axis-load-cases/stage-1-spec.md 'Validation Gate and Evidence Intake'). Its absence is not a 0.1.0 supported-case claim and is not a blocker for this release: per the release design, it is deferred evidence for later validation work and will be added when a real project exists, not fabricated or replaced by a synthetic fixture.",
    "The independent benchmark (Atlanta) covers the shared friction/gravity/acceleration core only, not ball-screw-specific mechanics (lead-angle efficiency, preload friction torque) — see independentBenchmark above.",
  ],
};
