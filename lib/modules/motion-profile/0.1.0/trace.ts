// Calculation trace for the motion-profile module. Follows the trace
// contract proposed in context/modules/motion-profile/stage-1-spec.md
// ("Trace Contract (Proposed)"): a `kinematics-move-{index}` section per
// supplied move (classify-profile, peak velocity, phase times, move time —
// the same steps the single-move package always had, now repeated per move
// since up to MAX_MOVES moves can be supplied, ./manifest.ts), a `cycle`
// section for the cycle-level sums, per stage-2-contract.md "Decisions", and
// a `validity-and-assumptions` section. Per-move detail lives here, not as a
// canonical output port (./manifest.ts explains why a per-move port cannot
// be conditionally absent). The elementary-kinematics and time-weighted-RMS
// steps note they are standard mechanics/arithmetic rather than citing an
// unverified manufacturer page — no step here declares a `sources` citation.

import {
  SERIALIZATION_FORMAT_VERSION,
  buildCalculationTrace,
  makeQuantity,
  type CalculationTrace,
  type EnumValue,
  type Quantity,
  type TraceSection,
} from "@/lib/engine";
import type { MotionCycleResult } from "./cycle";
import type { TrapezoidalMoveResult } from "./math";
import type { ResolvedMoveSegment } from "./values";

/** One move's resolved segment paired with its own kinematics result. */
export interface ResolvedMove {
  readonly segment: ResolvedMoveSegment;
  readonly result: TrapezoidalMoveResult;
}

export interface TraceInput {
  readonly moves: readonly ResolvedMove[];
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

function buildMoveSection(move: ResolvedMove): TraceSection {
  const { segment, result } = move;
  const i = segment.index;

  const accelerationDistanceAtLimit = makeQuantity(
    (segment.maxVelocity.value * segment.maxVelocity.value) /
      (2 * segment.maxAcceleration.value),
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

  return {
    node: "section",
    id: `kinematics-move-${i}`,
    title: `Move ${i} kinematics`,
    children: [
      {
        node: "step",
        id: `classify-profile-move-${i}`,
        title: "Trapezoidal vs triangular",
        methodId: "motion_profile.classify_profile",
        expression:
          "d1 = v_lim^2 / (2*a_lim); trapezoidal iff 2*d1 <= d, else triangular",
        inputs: [
          {
            label: "d",
            value: segment.distance,
            ref: "motion.profile.move_distance",
          },
          {
            label: "v_lim",
            value: segment.maxVelocity,
            ref: "motion.profile.max_velocity",
          },
          {
            label: "a_lim",
            value: segment.maxAcceleration,
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
            ? `Triangular case: move ${i} never reaches its own max_velocity under its own max_acceleration. This is expected behavior, not a validity failure.`
            : `Trapezoidal case: move ${i} reaches its own max_velocity and holds it for a constant-velocity phase.`,
        ],
      },
      {
        node: "step",
        id: `peak-velocity-move-${i}`,
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
            value: segment.distance,
            ref: "motion.profile.move_distance",
          },
          {
            label: "v_lim",
            value: segment.maxVelocity,
            ref: "motion.profile.max_velocity",
          },
          {
            label: "a_lim",
            value: segment.maxAcceleration,
            ref: "motion.profile.max_acceleration",
          },
        ],
        outputs: [{ label: "v_peak", value: peakVelocityOut }],
      },
      {
        node: "step",
        id: `peak-acceleration-and-deceleration-move-${i}`,
        title: "Peak acceleration and deceleration",
        methodId: "motion_profile.symmetric_acceleration",
        expression: "a_max = dec_max = a_lim (symmetric profile, 0.1.0 scope)",
        inputs: [
          {
            label: "a_lim",
            value: segment.maxAcceleration,
            ref: "motion.profile.max_acceleration",
          },
        ],
        outputs: [
          { label: "a_max", value: peakAccelerationOut },
          { label: "dec_max", value: peakDecelerationOut },
        ],
      },
      {
        node: "step",
        id: `acceleration-and-deceleration-time-move-${i}`,
        title: "Acceleration and deceleration phase time",
        methodId: "motion_profile.phase_time",
        expression:
          "t1 = v_peak / a_lim (symmetric: deceleration time equals acceleration time)",
        inputs: [
          { label: "v_peak", value: peakVelocityOut },
          {
            label: "a_lim",
            value: segment.maxAcceleration,
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
        id: `constant-velocity-phase-move-${i}`,
        title: "Constant-velocity phase time",
        methodId: "motion_profile.constant_velocity_time",
        expression: "t2 = (d - 2*d1) / v_peak (zero when triangular)",
        inputs: [
          {
            label: "d",
            value: segment.distance,
            ref: "motion.profile.move_distance",
          },
          { label: "d1", value: accelerationDistanceAtLimit },
          { label: "v_peak", value: peakVelocityOut },
        ],
        outputs: [{ label: "t2", value: constantVelocityTime }],
      },
      {
        node: "step",
        id: `move-time-move-${i}`,
        title: "Total move time",
        methodId: "motion_profile.move_time",
        expression: "t_m = t1(accel) + t2 + t1(decel)",
        inputs: [
          { label: "t1 (accel)", value: accelerationTime },
          { label: "t2", value: constantVelocityTime },
          { label: "t1 (decel)", value: decelerationTime },
        ],
        outputs: [{ label: "t_m", value: moveTimeOut }],
      },
      ...(segment.dwellTime !== undefined
        ? [dwellStep(i, segment.dwellTime)]
        : []),
    ],
  };
}

function dwellStep(moveIndex: number, dwellTime: Quantity) {
  return {
    node: "step" as const,
    id: `dwell-after-move-${moveIndex}`,
    title: "Dwell following this move",
    methodId: "motion_profile.dwell",
    inputs: [],
    outputs: [
      {
        label: "t_d",
        value: dwellTime,
        ref: "motion.profile.dwell_time",
      },
    ],
  };
}

export function buildTrace(input: TraceInput): CalculationTrace {
  const { moves, cycle } = input;

  const cycleTimeOut = makeQuantity(cycle.cycleTimeS, "s");
  const rmsAccelerationOut = makeQuantity(cycle.rmsAccelerationMps2, "m/s^2");
  const peakVelocityOut = makeQuantity(cycle.peakVelocityMps, "m/s");
  const peakAccelerationOut = makeQuantity(cycle.peakAccelerationMps2, "m/s^2");
  const peakDecelerationOut = makeQuantity(cycle.peakDecelerationMps2, "m/s^2");

  const cycleTimeInputs = moves.flatMap(({ segment, result }) => [
    {
      label: `t_m (move ${segment.index})`,
      value: makeQuantity(result.moveTimeS, "s"),
    },
    ...(segment.dwellTime !== undefined
      ? [
          {
            label: `t_d (after move ${segment.index})`,
            value: segment.dwellTime,
            ref: "motion.profile.dwell_time",
          },
        ]
      : []),
  ]);

  const rmsInputs = moves.flatMap(({ segment, result }) => [
    {
      label: `t1 (move ${segment.index}, accel)`,
      value: makeQuantity(result.accelerationTimeS, "s"),
    },
    {
      label: `t2 (move ${segment.index}, cruise)`,
      value: makeQuantity(result.constantVelocityTimeS, "s"),
    },
    {
      label: `t1 (move ${segment.index}, decel)`,
      value: makeQuantity(result.decelerationTimeS, "s"),
    },
    ...(segment.dwellTime !== undefined
      ? [
          {
            label: `t_d (after move ${segment.index})`,
            value: segment.dwellTime,
            ref: "motion.profile.dwell_time",
          },
        ]
      : []),
  ]);

  const peakValueInputs = moves.flatMap(({ segment, result }) => [
    {
      label: `v_peak (move ${segment.index})`,
      value: makeQuantity(result.peakVelocityMps, "m/s"),
    },
    {
      label: `a_max (move ${segment.index})`,
      value: makeQuantity(result.peakAccelerationMps2, "m/s^2"),
    },
    {
      label: `dec_max (move ${segment.index})`,
      value: makeQuantity(result.peakDecelerationMps2, "m/s^2"),
    },
  ]);

  return buildCalculationTrace([
    ...moves.map(buildMoveSection),
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
            "t_cycle = sum(t_mi) + sum(t_di) across every move and dwell in the cycle",
          inputs: cycleTimeInputs,
          outputs: [
            {
              label: "t_cycle",
              value: cycleTimeOut,
              ref: "motion.profile.cycle_time",
            },
          ],
        },
        {
          node: "step",
          id: "cycle-rms-acceleration",
          title: "Cycle RMS acceleration",
          methodId: "motion_profile.cycle_rms_acceleration",
          expression:
            "a_rms = sqrt(sum(a_i^2 * t_i) / sum(t_i)) over every move's accel/cruise/decel phases and every dwell",
          inputs: rmsInputs,
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
          expression: `peak_velocity/peak_acceleration/peak_deceleration = max across the ${moves.length} supplied move(s)`,
          inputs: peakValueInputs,
          outputs: [
            {
              label: "peak_velocity",
              value: peakVelocityOut,
              ref: "motion.profile.peak_velocity",
            },
            {
              label: "peak_acceleration",
              value: peakAccelerationOut,
              ref: "motion.profile.peak_acceleration",
            },
            {
              label: "peak_deceleration",
              value: peakDecelerationOut,
              ref: "motion.profile.peak_deceleration",
            },
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
            `This module version (0.1.0) resolves ${moves.length} symmetric trapezoidal/triangular move(s) (up to 5 supported — context/modules/motion-profile/stage-2-contract.md "Decisions" item 4), each optionally followed by its own dwell, as the whole motion cycle.`,
            "Asymmetric acceleration/deceleration and jerk-limited S-curve profiles are out of scope for this version.",
          ],
        },
      ],
    },
  ]);
}
