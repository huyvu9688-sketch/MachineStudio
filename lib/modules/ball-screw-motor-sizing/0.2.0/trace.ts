// Calculation trace for the ball-screw-motor-sizing module. Follows the
// trace contract proposed in context/modules/ball-screw-motor-sizing/
// stage-1-spec.md "Trace Contract (Proposed)": geometry/inertia, per-
// direction drive force and load torque, per-direction acceleration
// torque, momentary and effective torque over the full cycle, required
// torque/power, and a closing validity-and-assumptions section. Cites the
// actual formula each step applies, the same discipline every other
// module in this project already established.

import { asSourceRevisionId } from "@/lib/standards";
import {
  buildCalculationTrace,
  makeQuantity,
  type CalculationTrace,
  type EnumValue,
  type Quantity,
} from "@/lib/engine";

const MECHANICS_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.oriental_motor.motor_sizing_calculations@web-2026-08-08",
    ),
    clause: "Moment of Inertia / Acceleration Torque",
    label: "J_B, J_W = f(geometry, mass); Ta = J*alpha",
  },
];

const FORCE_TORQUE_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.oriental_motor.motor_sizing_calculations@web-2026-08-08",
    ),
    clause: "Forces / Load Torque Calculation - Ball Screw Drive",
    label:
      "F = F_A + m*g*(sin(theta)+mu*cos(theta)); T_L = f(F, lead, eta, preload)",
  },
];

const RMS_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.oriental_motor.motor_sizing_calculations@web-2026-08-08",
    ),
    clause:
      "Calculation for Required Torque (TM) / Calculation for the Effective Load Torque (Trms)",
    label: "T1 = TA+TL; Trms = sqrt(sum(T_i^2*t_i)/sum(t_i)); TM = T*Sf",
  },
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.omron.servo_motor_selection_guide@csm-tg-e-3-1",
    ),
    clause: "Calculation of Maximum Momentary Torque, Effective Torque",
    label: "Cross-checked against Omron's own identical worked-example shape",
  },
];

export interface TraceInput {
  readonly orientation: EnumValue;
  readonly inclineAngle: Quantity;
  readonly frictionCoefficient: Quantity;
  readonly totalMovingMass: Quantity;
  readonly lead: Quantity;
  readonly gearRatio: Quantity;
  readonly preload: Quantity;
  readonly internalFrictionCoefficient: Quantity;
  readonly mechanicalEfficiency: Quantity;
  readonly screwDiameter: Quantity;
  readonly screwMass: Quantity;
  readonly externalForce: Quantity;
  readonly forwardMoveDistance: Quantity;
  readonly forwardMaxVelocity: Quantity;
  readonly forwardMaxAcceleration: Quantity;
  readonly returnMoveDistance: Quantity | undefined;
  readonly returnMaxVelocity: Quantity | undefined;
  readonly returnMaxAcceleration: Quantity | undefined;
  readonly dwellTime: Quantity;
  readonly motorRotorInertia: Quantity;
  readonly effectiveTorqueSafetyFactor: Quantity;
  readonly momentaryTorqueSafetyFactor: Quantity;
  readonly inertiaRatioMaximum: Quantity;
  readonly screwInertiaKgM2: number;
  readonly loadInertiaKgM2: number;
  readonly reflectedLoadInertiaKgM2: number;
  readonly totalSystemInertiaKgM2: number;
  readonly inertiaRatio: number;
  readonly forwardLoadTorqueNm: number;
  readonly returnLoadTorqueNm: number;
  readonly forwardAccelerationTorqueNm: number;
  readonly returnAccelerationTorqueNm: number;
  readonly momentaryTorqueNm: number;
  readonly effectiveTorqueNm: number;
  readonly operatingSpeedRadPerS: number;
  readonly requiredMotorRatedTorqueNm: number;
  readonly requiredMotorPeakTorqueNm: number;
  readonly hasReturn: boolean;
}

export function buildTrace(input: TraceInput): CalculationTrace {
  const inertiaStep = {
    node: "step" as const,
    id: "inertia-calculation",
    title: "Screw, load, reflected, and total system inertia",
    methodId: "motor_sizing.ball_screw.inertia",
    expression:
      "J_B = (1/8)*M_B*D^2; J_W = J_B + m*(P/2pi)^2; J_L = J_W/i^2; J_total = J_M + J_L; R_J = J_L/J_M",
    inputs: [
      {
        label: "D",
        value: input.screwDiameter,
        ref: "motor_sizing.ball_screw.screw_diameter",
      },
      {
        label: "M_B",
        value: input.screwMass,
        ref: "motor_sizing.ball_screw.screw_mass",
      },
      {
        label: "m",
        value: input.totalMovingMass,
        ref: "motion.axis.total_moving_mass",
      },
      { label: "P", value: input.lead, ref: "screw.lead" },
      { label: "i", value: input.gearRatio, ref: "screw.gear_ratio" },
      {
        label: "J_M",
        value: input.motorRotorInertia,
        ref: "motor_sizing.ball_screw.motor_rotor_inertia",
      },
    ],
    outputs: [
      {
        label: "J_B",
        value: makeQuantity(input.screwInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.ball_screw.screw_inertia",
      },
      {
        label: "J_W",
        value: makeQuantity(input.loadInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.ball_screw.load_inertia",
      },
      {
        label: "J_L",
        value: makeQuantity(input.reflectedLoadInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.ball_screw.reflected_load_inertia",
      },
      {
        label: "J_total",
        value: makeQuantity(input.totalSystemInertiaKgM2, "kg*m^2"),
        ref: "motor_sizing.ball_screw.total_system_inertia",
      },
      {
        label: "R_J",
        value: makeQuantity(input.inertiaRatio, "ratio"),
        ref: "motor_sizing.ball_screw.inertia_ratio",
      },
    ],
    sources: MECHANICS_SOURCE,
  };

  const directionSteps = (["forward", "return"] as const).map((direction) => {
    const loadTorqueNm =
      direction === "forward"
        ? input.forwardLoadTorqueNm
        : input.returnLoadTorqueNm;
    const accelTorqueNm =
      direction === "forward"
        ? input.forwardAccelerationTorqueNm
        : input.returnAccelerationTorqueNm;
    return {
      node: "step" as const,
      id: `${direction}-force-and-torque`,
      title: `${direction === "forward" ? "Forward" : "Return"}-direction drive force, load torque, and acceleration torque`,
      methodId: `motor_sizing.ball_screw.${direction}_load_torque`,
      // 0.2.0: g = 9.80665 m/s^2, hardcoded (no longer an input) — see
      // math.ts's own STANDARD_GRAVITY_M_PER_S2.
      expression:
        direction === "forward"
          ? "F = F_A + m*g*(sin(theta)+mu*cos(theta)), g=9.80665"
          : "F = F_A + m*g*(mu*cos(theta)-sin(theta)), g=9.80665",
      inputs: [
        {
          label: "F_A",
          value: input.externalForce,
          ref: "motor_sizing.ball_screw.external_force",
        },
        {
          label: "m",
          value: input.totalMovingMass,
          ref: "motion.axis.total_moving_mass",
        },
        {
          label: "theta",
          value: input.inclineAngle,
          ref: "motion.axis.incline_angle",
        },
        {
          label: "mu",
          value: input.frictionCoefficient,
          ref: "motion.axis.friction_coefficient",
        },
        {
          label: "eta",
          value: input.mechanicalEfficiency,
          ref: "screw.mechanical_efficiency",
        },
        { label: "F0", value: input.preload, ref: "screw.preload" },
        {
          label: "mu0",
          value: input.internalFrictionCoefficient,
          ref: "screw.internal_friction_coefficient",
        },
      ],
      outputs: [
        {
          label: "T_L",
          value: makeQuantity(loadTorqueNm, "N*m"),
          ref: `motor_sizing.ball_screw.${direction}_load_torque`,
        },
        {
          label: "T_A",
          value: makeQuantity(accelTorqueNm, "N*m"),
          ref: `motor_sizing.ball_screw.${direction}_acceleration_torque`,
        },
      ],
      sources: [...FORCE_TORQUE_SOURCE, ...MECHANICS_SOURCE],
      notes:
        direction === "return" && !input.hasReturn
          ? [
              "No return move is declared this cycle: T_L is still reported (pure statics, no move needed), but T_A is 0 and no return-direction phase contributes to momentary or effective torque.",
            ]
          : undefined,
    };
  });

  const torqueStep = {
    node: "step" as const,
    id: "momentary-and-effective-torque",
    title:
      "Maximum momentary torque and effective (RMS) torque over the full cycle",
    methodId: "motor_sizing.ball_screw.effective_torque",
    expression:
      "T1 = TA+TL (accel), TL (constant), TL-TA (decel), per direction; T_momentary = max(|T_i|); Trms = sqrt(sum(T_i^2*t_i)/sum(t_i))",
    inputs: [
      {
        label: "dwell_time",
        value: input.dwellTime,
        ref: "motor_sizing.ball_screw.dwell_time",
      },
    ],
    outputs: [
      {
        label: "T_momentary",
        value: makeQuantity(input.momentaryTorqueNm, "N*m"),
        ref: "motor_sizing.ball_screw.momentary_torque",
      },
      {
        label: "T_rms",
        value: makeQuantity(input.effectiveTorqueNm, "N*m"),
        ref: "motor_sizing.ball_screw.effective_torque",
      },
    ],
    sources: RMS_SOURCE,
    notes: [
      "A genuine multi-phase sum over every real phase in the full cycle -- not drive-train@0.1.0's own closed-form approximation from a single scalar rms_acceleration (stage-1-spec.md item 5, the structural fix ADR-0011 exists to make).",
    ],
  };

  const requiredStep = {
    node: "step" as const,
    id: "required-torque-speed-power",
    title: "Required motor rating: torque, speed, and power",
    methodId: "motor_sizing.ball_screw.required_motor_rated_torque",
    expression:
      "T_required = T_computed * Sf; N_op = max(forward, return) motor-shaft speed; P_required = T_required * N_op",
    inputs: [
      {
        label: "Sf_rms",
        value: input.effectiveTorqueSafetyFactor,
        ref: "motor_sizing.ball_screw.effective_torque_safety_factor",
      },
      {
        label: "Sf_peak",
        value: input.momentaryTorqueSafetyFactor,
        ref: "motor_sizing.ball_screw.momentary_torque_safety_factor",
      },
    ],
    outputs: [
      {
        label: "T_M,req",
        value: makeQuantity(input.requiredMotorRatedTorqueNm, "N*m"),
        ref: "motor_sizing.ball_screw.required_motor_rated_torque",
      },
      {
        label: "T_Mmax,req",
        value: makeQuantity(input.requiredMotorPeakTorqueNm, "N*m"),
        ref: "motor_sizing.ball_screw.required_motor_peak_torque",
      },
      {
        label: "N_op",
        value: makeQuantity(input.operatingSpeedRadPerS, "rad/s"),
        ref: "motor_sizing.ball_screw.operating_speed",
      },
    ],
    sources: RMS_SOURCE,
    notes: [
      "Two separate safety factors (>= 1), the inverse direction from drive.rms_torque_margin/drive.peak_torque_margin (<= 1) -- this module takes no candidate motor's own rated/peak torque as an input (stage-2-contract.md 'Decisions' item 4).",
    ],
  };

  const inertiaRatioCheckStep = {
    node: "step" as const,
    id: "inertia-ratio-check",
    title: "Inertia ratio against the engineer-supplied maximum",
    methodId: "motor_sizing.ball_screw.inertia_ratio",
    expression: "R_J <= R_Jmax",
    inputs: [
      {
        label: "R_Jmax",
        value: input.inertiaRatioMaximum,
        ref: "motor_sizing.ball_screw.inertia_ratio_maximum",
      },
    ],
    outputs: [
      {
        label: "R_J",
        value: makeQuantity(input.inertiaRatio, "ratio"),
        ref: "motor_sizing.ball_screw.inertia_ratio",
      },
    ],
    sources: [],
    notes: [
      "The one real catalog-free pass/fail check in 0.1.0 -- every other torque/speed/power figure is a reported required-spec value (ADR-0011 'Output scope').",
    ],
  };

  return buildCalculationTrace([
    {
      node: "section",
      id: "inertia",
      title: "Inertia",
      children: [inertiaStep],
    },
    {
      node: "section",
      id: "force-and-torque",
      title: "Drive force and load/acceleration torque",
      children: directionSteps,
    },
    {
      node: "section",
      id: "cycle-torque",
      title: "Momentary and effective (RMS) torque over the full cycle",
      children: [torqueStep],
    },
    {
      node: "section",
      id: "required-rating",
      title: "Required motor rating",
      children: [requiredStep, inertiaRatioCheckStep],
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
          methodId: "motor_sizing.ball_screw.scope_notes",
          inputs: [],
          outputs: [],
          notes: [
            `Orientation: ${input.orientation.value}. 'Forward' is the direction away from gravity; 'return' is gravity-assisted -- immaterial on a horizontal axis.`,
            input.hasReturn
              ? "A return move is declared; return-direction phases contribute to momentary_torque and effective_torque."
              : "No return move is declared: only the forward move's own phases (plus a zero-torque dwell) contribute to momentary_torque and effective_torque.",
            "The dwell phase contributes 0 torque to the RMS/momentary aggregates, matching Omron's own treatment of a stationary phase -- no servo-motor holding-torque formula for a stationary vertical/inclined dwell is modeled in 0.1.0.",
            "No screw mechanical-strength check (buckling, critical speed, life, static safety factor) -- that is ball-screw@0.1.0's own separate responsibility.",
            "No candidate motor's own rated/peak torque is taken as an input in 0.1.0 -- required_motor_rated_torque, required_motor_peak_torque, and required_power are reported required-spec values, not pass/fail checks.",
          ],
        },
      ],
    },
  ]);
}
