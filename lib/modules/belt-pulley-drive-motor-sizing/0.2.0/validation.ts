// Validation record for belt-pulley-drive-motor-sizing 0.2.0.

import { asSourceRevisionId } from "@/lib/standards";
import type { ValidationRecord } from "@/lib/engine";

export const validation: ValidationRecord = {
  moduleId: "belt-pulley-drive-motor-sizing",
  moduleVersion: "0.2.0",
  methods: [
    "Oriental Motor Co., Ltd.'s own combined wire-belt/rack-and-pinion sizing method (moment of inertia of two pulleys plus a translating belt, orientation-aware drive force, load torque, operating speed), unchanged from 0.1.0",
    "A native repeating trapezoidal motion cycle (accelerate/run/decelerate/dwell), velocity-first or distance-first, and Oriental Motor's own generic per-phase effective (RMS) torque formula for continuous/thermal motor rating (jp.oriental_motor.motor_sizing_calculations, pp. 5-6) -- new in 0.2.0",
  ],
  sourceRevisionIds: [
    asSourceRevisionId(
      "jp.oriental_motor.general_catalog_motor_fan_sizing@f-tecref-2003-2004",
    ),
    asSourceRevisionId(
      "us.automationdirect.sureservo_selection_appendix@2nd-ed-rev-b-08-2011",
    ),
    asSourceRevisionId(
      "jp.oriental_motor.motor_sizing_calculations@web-2026-08-08",
    ),
  ],
  referenceExamples: [
    {
      id: "automationdirect-belt-drive-pulley-inertia",
      description:
        "AutomationDirect's own 'Belt Drive - Example Calculations' worked example (pp. B-11-B-13), reformulated into 0.2.0's own velocity-mode motion inputs (acceleration_time=1.0s, deceleration_time=1.0s, constant_velocity_time=2.0s, dwell_time=0s -- the source's own printed 4.0s move time split into its own stated 1.0s/2.0s/1.0s accel/run/decel phases, cycle_time reproducing the source's own printed 4.0s exactly). Carried over unchanged from 0.1.0: pulley_inertia matches the source's own printed figure within 0.2% (no efficiency term either convention applies to this figure).",
      tolerance:
        "0.2% (pulley geometry/density rounding, not a formula disagreement) -- same as 0.1.0.",
    },
    {
      id: "automationdirect-belt-drive-load-and-reflected-inertia-with-disclosed-adjustment",
      description:
        "The same worked example's own carriage-only load inertia and reflected-to-motor inertia, carried over unchanged from 0.1.0: both reproduce the source's own printed figures within 0.1% only after AutomationDirect's own disclosed 1/e efficiency-on-inertia convention (not this module's own convention) is reapplied at the test level -- see 0.1.0's own validation record for the full account, unchanged by this release.",
      tolerance:
        "0.1% after the disclosed 1/e adjustment; ~25% (1/0.8) unadjusted, by design -- same as 0.1.0.",
    },
    {
      id: "belt-pulley-0.2.0-symmetric-decel-torque-internal-consistency",
      description:
        "New in 0.2.0: with acceleration_time == deceleration_time (both 1.0s, matching the AutomationDirect example's own stated symmetric accel/decel), deceleration_torque and acceleration_torque are asserted equal (same total_system_inertia, same operating_speed, same ramp time on both sides of the formula) -- an internal-consistency check, not a claim against a published figure: the source gives no printed deceleration-torque figure at all.",
      tolerance:
        "Exact (floating-point precision) -- an algebraic identity given equal ramp times, not a tolerance band.",
    },
  ],
  independentBenchmark:
    "independent-benchmark.test.ts carries forward 0.1.0's own force/load-torque cross-check (resolveDriveForce+resolveLoadTorque vs. a single combined reimplementation) and adds a new one for effective_torque: resolveEffectiveTorque's own closed-form Trms is cross-checked against a structurally different direct per-phase computation (Trms = sqrt(sum(T_i^2*t_i)/tf) applied to an explicit four-phase list [accel, run, decel, dwell] with dwell torque fixed at zero) -- algebraically the identical formula, built from an explicit phase list rather than the closed-form expression, the same 'structurally separate reimplementation, proved identical' pattern drive-train@0.1.0's own closed-cycle-benchmark.ts already establishes. A deterministic property sweep (torque magnitudes and phase durations varied, including the t2=0 triangular-move boundary) confirms algebraic identity to floating-point precision.",
  reviewer:
    "Solo validation -- independent-benchmark substitute, the same reviewer-substitute role this document already plays for every prior Motor Sizing Tool module (context/ai-workflow-rules.md Stage 4: 'When no second engineer is available, the documented independent benchmark comparison serves as the review substitute').",
  reviewDate: "2026-08-14",
  supportedUseLimits: [
    "Both pulleys must share one pitch diameter -- no source found this session gives an unequal-diameter belt-drive formula.",
    "No belt tension, belt width/pitch, tooth-shear, or wrap-angle selection, and no motor catalog matching.",
    "load_torque, momentary_torque, required_torque, reflected_load_inertia, and inertia_ratio are NOT claimed to reproduce AutomationDirect's own printed figures at face value, for the same reasons already disclosed in 0.1.0's own validation record (efficiency-convention difference; a confirmed source-internal arithmetic slip) -- see 'deviations' below.",
    "effective_torque has no published worked numerical example to reproduce -- Oriental Motor's own source page (pp. 5-6) states the formula generically, for all motors, with no belt/pulley-specific figures. Validated only via the algebraic-identity independent benchmark above, per the design doc's own pre-approved fallback (docs/superpowers/specs/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0-design.md 'Evidence Disposition'). A disclosed, open Stage 4 evidence gap -- to be closed against a real project's own duty-cycle results later, never a synthetic fixture.",
    "Load torque is assumed constant across all four motion phases -- true for this mechanism's own force-balance model (orientation/mass/friction do not change mid-cycle), not an approximation the way drive-train@0.1.0's own closed-cycle RMS-acceleration assumption is across a module boundary.",
  ],
  deviations: [
    "AutomationDirect's own worked example has a confirmed arithmetic slip, disclosed and not reproduced (carried over unchanged from 0.1.0): its own friction force is computed as 0.05 x 100 = 5.0 lb though the stated table+workpiece weight is 90 lb (correct: 4.5 lb). This module's own kernel computes friction from the actual supplied mass, so it does not reproduce the source's own printed T_run/T_motor totals that follow from it.",
    "The two primary sources place mechanical efficiency on opposite sides of the calculation (carried over unchanged from 0.1.0): Oriental Motor divides load torque by eta; AutomationDirect divides the carriage's own inertia by e. This module follows Oriental Motor's own convention, matching every already-released Motor Sizing Tool sibling.",
  ],
};
