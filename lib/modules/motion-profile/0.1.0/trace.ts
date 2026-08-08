// Calculation trace for the motion-profile module. Follows the trace
// contract proposed in context/modules/motion-profile/stage-1-spec.md
// ("Trace Contract (Proposed)"): a `profile-classification` section
// recording trapezoidal vs. triangular and why, a `kinematics` section with
// the resolved t1/t2/v_peak/a_lim steps, and a `cycle` section for the
// (single-move-plus-optional-dwell) cycle-level sums, per stage-2-contract.md
// "Decisions". The elementary-kinematics and time-weighted-RMS steps note
// they are standard mechanics/arithmetic rather than citing an unverified
// manufacturer page — no step here declares a `sources` citation.

import {
  SERIALIZATION_FORMAT_VERSION,
  buildCalculationTrace,
  makeQuantity,
  type CalculationTrace,
  type EnumValue,
  type Quantity,
} from "@/lib/engine";
import type { MotionCycleResult } from "./cycle";
import type { TrapezoidalMoveResult } from "./math";

export interface TraceInput {
  readonly moveDistance: Quantity;
  readonly maxVelocity: Quantity;
  readonly maxAcceleration: Quantity;
  /** Absent when the cycle is the single move only (no dwell segment). */
  readonly dwellTime: Quantity | undefined;
  readonly result: TrapezoidalMoveResult;
  readonly cycle: MotionCycleResult;
}

function profileTypeValue(
  profileType: TrapezoidalMoveResult["profileType"],
): EnumValue {
  return {
    v: SERIALIZATION_FORMAT_VERSION,
    kind: "enum",
    enumId: "motion_profile_type",
    value: profileType,
  };
}

export function buildTrace(input: TraceInput): CalculationTrace {
  const {
    moveDistance,
    maxVelocity,
    maxAcceleration,
    dwellTime,
    result,
    cycle,
  } = input;

  const accelerationDistanceAtLimit = makeQuantity(
    (maxVelocity.value * maxVelocity.value) / (2 * maxAcceleration.value),
    "m",
  );
  const accelerationTime = makeQuantity(result.accelerationTimeS, "s");
  const decelerationTime = makeQuantity(result.decelerationTimeS, "s");
  const constantVelocityTime = makeQuantity(result.constantVelocityTimeS, "s");
  const peakVelocityOut = makeQuantity(result.peakVelocityMps, "m/s");
  const peakAccelerationOut = makeQuantity(
    result.peakAccelerationMps2,
    "m/s^2",
  );
  const peakDecelerationOut = makeQuantity(
    result.peakDecelerationMps2,
    "m/s^2",
  );
  const moveTimeOut = makeQuantity(result.moveTimeS, "s");
  const cycleTimeOut = makeQuantity(cycle.cycleTimeS, "s");
  const rmsAccelerationOut = makeQuantity(cycle.rmsAccelerationMps2, "m/s^2");

  return buildCalculationTrace([
    {
      node: "section",
      id: "profile-classification",
      title: "Profile classification",
      children: [
        {
          node: "step",
          id: "classify-profile",
          title: "Trapezoidal vs triangular",
          methodId: "motion_profile.classify_profile",
          expression:
            "d1 = v_lim^2 / (2*a_lim); trapezoidal iff 2*d1 <= d, else triangular",
          inputs: [
            {
              label: "d",
              value: moveDistance,
              ref: "motion.profile.move_distance",
            },
            {
              label: "v_lim",
              value: maxVelocity,
              ref: "motion.profile.max_velocity",
            },
            {
              label: "a_lim",
              value: maxAcceleration,
              ref: "motion.profile.max_acceleration",
            },
          ],
          outputs: [
            { label: "d1", value: accelerationDistanceAtLimit },
            {
              label: "profile_type",
              value: profileTypeValue(result.profileType),
            },
          ],
          notes: [
            'Elementary constant-acceleration kinematics; not a manufacturer-specific method (context/modules/motion-profile/stage-1-spec.md "Candidate Method — Single Trapezoidal Move").',
            result.profileType === "triangular"
              ? "Triangular case: the move never reaches max_velocity under max_acceleration. This is expected behavior, not a validity failure."
              : "Trapezoidal case: the move reaches max_velocity and holds it for a constant-velocity phase.",
          ],
        },
      ],
    },
    {
      node: "section",
      id: "kinematics",
      title: "Kinematics",
      children: [
        {
          node: "step",
          id: "peak-velocity",
          title: "Peak velocity",
          methodId: "motion_profile.peak_velocity",
          expression:
            result.profileType === "trapezoidal"
              ? "v_peak = v_lim"
              : "v_peak = sqrt(a_lim * d)",
          inputs: [
            { label: "d1", value: accelerationDistanceAtLimit },
            {
              label: "d",
              value: moveDistance,
              ref: "motion.profile.move_distance",
            },
            {
              label: "v_lim",
              value: maxVelocity,
              ref: "motion.profile.max_velocity",
            },
            {
              label: "a_lim",
              value: maxAcceleration,
              ref: "motion.profile.max_acceleration",
            },
          ],
          outputs: [
            {
              label: "v_peak",
              value: peakVelocityOut,
              ref: "motion.profile.peak_velocity",
            },
          ],
        },
        {
          node: "step",
          id: "peak-acceleration-and-deceleration",
          title: "Peak acceleration and deceleration",
          methodId: "motion_profile.symmetric_acceleration",
          expression:
            "a_max = dec_max = a_lim (symmetric profile, 0.1.0 scope)",
          inputs: [
            {
              label: "a_lim",
              value: maxAcceleration,
              ref: "motion.profile.max_acceleration",
            },
          ],
          outputs: [
            {
              label: "a_max",
              value: peakAccelerationOut,
              ref: "motion.profile.peak_acceleration",
            },
            {
              label: "dec_max",
              value: peakDecelerationOut,
              ref: "motion.profile.peak_deceleration",
            },
          ],
        },
        {
          node: "step",
          id: "acceleration-and-deceleration-time",
          title: "Acceleration and deceleration phase time",
          methodId: "motion_profile.phase_time",
          expression:
            "t1 = v_peak / a_lim (symmetric: deceleration time equals acceleration time)",
          inputs: [
            { label: "v_peak", value: peakVelocityOut },
            {
              label: "a_lim",
              value: maxAcceleration,
              ref: "motion.profile.max_acceleration",
            },
          ],
          outputs: [
            { label: "t1 (accel)", value: accelerationTime },
            { label: "t1 (decel)", value: decelerationTime },
          ],
        },
        {
          node: "step",
          id: "constant-velocity-phase",
          title: "Constant-velocity phase time",
          methodId: "motion_profile.constant_velocity_time",
          expression: "t2 = (d - 2*d1) / v_peak (zero when triangular)",
          inputs: [
            {
              label: "d",
              value: moveDistance,
              ref: "motion.profile.move_distance",
            },
            { label: "d1", value: accelerationDistanceAtLimit },
            { label: "v_peak", value: peakVelocityOut },
          ],
          outputs: [{ label: "t2", value: constantVelocityTime }],
        },
        {
          node: "step",
          id: "move-time",
          title: "Total move time",
          methodId: "motion_profile.move_time",
          expression: "t_m = t1(accel) + t2 + t1(decel)",
          inputs: [
            { label: "t1 (accel)", value: accelerationTime },
            { label: "t2", value: constantVelocityTime },
            { label: "t1 (decel)", value: decelerationTime },
          ],
          outputs: [
            {
              label: "t_m",
              value: moveTimeOut,
              ref: "motion.profile.move_time",
            },
          ],
        },
      ],
    },
    {
      node: "section",
      id: "cycle",
      title: "Cycle aggregation",
      children: [
        {
          node: "step",
          id: "cycle-time",
          title: "Total cycle time",
          methodId: "motion_profile.cycle_time",
          expression:
            dwellTime !== undefined
              ? "t_cycle = t_m + t_d"
              : "t_cycle = t_m (no dwell segment supplied)",
          inputs: [
            { label: "t_m", value: moveTimeOut },
            ...(dwellTime !== undefined
              ? [
                  {
                    label: "t_d",
                    value: dwellTime,
                    ref: "motion.profile.dwell_time",
                  },
                ]
              : []),
          ],
          outputs: [
            {
              label: "t_cycle",
              value: cycleTimeOut,
              ref: "motion.profile.cycle_time",
            },
          ],
          notes:
            dwellTime === undefined
              ? [
                  "No dwell segment supplied; the cycle is this single move only.",
                ]
              : undefined,
        },
        {
          node: "step",
          id: "cycle-rms-acceleration",
          title: "Cycle RMS acceleration",
          methodId: "motion_profile.cycle_rms_acceleration",
          expression:
            "a_rms = sqrt(sum(a_i^2 * t_i) / sum(t_i)) over the move's accel/cruise/decel phases and the dwell phase (zero acceleration)",
          inputs: [
            { label: "t1 (accel)", value: accelerationTime },
            { label: "t2", value: constantVelocityTime },
            { label: "t1 (decel)", value: decelerationTime },
            ...(dwellTime !== undefined
              ? [
                  {
                    label: "t_d",
                    value: dwellTime,
                    ref: "motion.profile.dwell_time",
                  },
                ]
              : []),
          ],
          outputs: [
            {
              label: "a_rms",
              value: rmsAccelerationOut,
              ref: "motion.profile.rms_acceleration",
            },
          ],
          notes: [
            'Elementary time-weighted RMS arithmetic (context/modules/motion-profile/stage-2-contract.md "Decisions" item 1); not a manufacturer-specific formula.',
          ],
        },
        {
          node: "step",
          id: "cycle-peak-values",
          title: "Cycle peak values",
          methodId: "motion_profile.cycle_peak_values",
          inputs: [],
          outputs: [],
          notes: [
            'This package supports exactly one move per cycle (plus an optional dwell), so the cycle\'s peak velocity/acceleration/deceleration equal this move\'s own values reported above ("Kinematics" section) — see context/modules/motion-profile/stage-2-contract.md "Multi-segment port shape".',
          ],
        },
      ],
    },
    {
      node: "section",
      id: "validity-and-assumptions",
      title: "Validity and assumptions",
      children: [
        {
          node: "step",
          id: "scope-notes",
          title: "Scope and assumptions",
          methodId: "motion_profile.scope_notes",
          inputs: [],
          outputs: [],
          notes: [
            "This module version (0.1.0) resolves a single symmetric trapezoidal/triangular move, optionally followed by one dwell, as the whole motion cycle.",
            "Asymmetric acceleration/deceleration, jerk-limited S-curve profiles, and more than one move per cycle are out of scope for this version (context/modules/motion-profile/stage-2-contract.md).",
          ],
        },
      ],
    },
  ]);
}
