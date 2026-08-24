// Calculation trace for the ball-screw module. Follows the trace contract
// proposed in context/modules/ball-screw/stage-1-spec.md "Trace Contract
// (Proposed)": kinematics, per-case applied load and drive torque, duty-cycle
// aggregation, life, per-case static safety, buckling, critical speed, and a
// closing validity-and-assumptions section. Cites the actual formula each
// step applies, distinguishing elementary geometry/arithmetic (no citation)
// from a manufacturer-specific method (cited) — the same discipline
// axis-load-cases and motion-profile already established.

import { asSourceRevisionId } from "@/lib/standards";
import {
  buildCalculationTrace,
  convert,
  makeQuantity,
  type CalculationTrace,
  type Quantity,
} from "@/lib/engine";

const ORIENTAL_MOTOR_DRIVE_TORQUE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.oriental_motor.motor_sizing_calculations@web-2026-08-08",
    ),
    clause: "p. 4, Load Torque Calculation - Ball Screw Drive",
    label: "T_L = ( F*P/(2*pi*eta) + mu0*F0*P/(2*pi) ) * (1/i)",
  },
];

const STEINMEYER_EQUIVALENT_LOAD = [
  {
    sourceRevisionId: asSourceRevisionId(
      "us.steinmeyer.ball_screw_technology@web-2026-08-08",
    ),
    clause: "Equivalent Load for Ball Screws",
    label: "F_m = cbrt( sum(q_i*n_i*F_i^3) / sum(q_i*n_i) )",
  },
];

const STEINMEYER_FATIGUE_LIFE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "us.steinmeyer.ball_screw_technology@web-2026-08-08",
    ),
    clause: "Ball Screw Fatigue Life",
    label: "L10 = (Ca / Fm)^3 * 10^6 [revolutions]",
  },
];

const WY_BALL_SCREW_STATIC_SAFETY = [
  {
    sourceRevisionId: asSourceRevisionId(
      "us.wy_ball_screw.understanding_load@web-2026-08-08",
    ),
    clause: "Understanding Load in Ball Screw Applications",
    label: "fs = C0 / Fas_max",
  },
];

const ROCKFORD_BUCKLING = [
  {
    sourceRevisionId: asSourceRevisionId(
      "us.rockford_ball_screw.how_to_size@update-2018",
    ),
    clause: "Step 9",
    label:
      "Pc = Fe * 14,030,000 * (Dmin^4 / L^2), Dmin = minor (root) diameter",
  },
];

const ROCKFORD_CRITICAL_SPEED = [
  {
    sourceRevisionId: asSourceRevisionId(
      "us.rockford_ball_screw.how_to_size@update-2018",
    ),
    clause: "Step 6",
    label: "nk = Fe * 4,760,000 * (Dmin / L^2), Dmin = minor (root) diameter",
  },
];

export type BallScrewCase = "normal" | "peak";

export interface TraceCaseInput {
  readonly thrustForce: Quantity;
  readonly timeFraction: Quantity;
  readonly linearVelocity: Quantity;
  readonly rotationalSpeedRevPerMin: number;
  readonly driveTorqueNm: number;
  readonly staticSafetyFactor: number;
}

export interface TraceInput {
  readonly minorDiameter: Quantity;
  readonly lead: Quantity;
  readonly unsupportedLength: Quantity;
  readonly endSupportArrangement: string;
  readonly dynamicLoadRating: Quantity;
  readonly staticLoadRating: Quantity;
  readonly preload: Quantity;
  readonly internalFrictionCoefficient: Quantity;
  readonly mechanicalEfficiency: Quantity;
  readonly gearRatio: Quantity;
  readonly staticSafetyFactorMinimum: Quantity;
  readonly bucklingSafetyMargin: Quantity;
  readonly cases: Readonly<Record<BallScrewCase, TraceCaseInput>>;
  readonly equivalentLoadN: number;
  readonly meanRotationalSpeedRevPerMin: number;
  readonly lifeRevolutions: number;
  readonly lifeHours: number;
  readonly bucklingLoadN: number;
  readonly permissibleCompressiveLoadN: number;
  readonly criticalSpeedRevPerMin: number;
  readonly permissibleSpeedRevPerMin: number;
}

const rpmToRadPerS = (revPerMin: number): Quantity =>
  makeQuantity(convert(revPerMin, "rpm", "rad/s"), "rad/s");

export function buildTrace(input: TraceInput): CalculationTrace {
  const CASES: readonly BallScrewCase[] = ["normal", "peak"];

  const kinematicsSteps = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step" as const,
      id: `rotational-speed-${loadCase}`,
      title: `Screw rotational speed (${loadCase})`,
      methodId: "ball_screw.rotational_speed",
      expression: "N = v / P",
      inputs: [
        {
          label: "v",
          value: c.linearVelocity,
          ref: "motion.axis.case_linear_velocity",
        },
        { label: "P", value: input.lead, ref: "screw.lead" },
      ],
      outputs: [
        { label: "N", value: rpmToRadPerS(c.rotationalSpeedRevPerMin) },
      ],
      notes: [
        "Definitional screw-thread geometry, not a manufacturer-specific method (context/modules/ball-screw/stage-1-spec.md item 1).",
      ],
    };
  });

  const appliedLoadSteps = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step" as const,
      id: `applied-load-${loadCase}`,
      title: `Applied axial load (${loadCase})`,
      methodId: "ball_screw.applied_load_given",
      inputs: [],
      outputs: [
        {
          label: "F_a",
          value: c.thrustForce,
          ref: "motion.axis.thrust_force",
        },
        {
          label: "q",
          value: c.timeFraction,
          ref: "motion.axis.case_time_fraction",
        },
      ],
      notes: [
        "Reuses axis-load-cases' already-resolved thrust force for this case; this module does not re-derive gravity, friction, or external-force terms.",
      ],
    };
  });

  const driveTorqueSteps = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step" as const,
      id: `drive-torque-${loadCase}`,
      title: `Ball-screw drive torque (${loadCase})`,
      methodId: "ball_screw.drive_torque",
      expression: "T_L = ( F*P/(2*pi*eta) + mu0*F0*P/(2*pi) ) * (1/i)",
      inputs: [
        { label: "F", value: c.thrustForce, ref: "motion.axis.thrust_force" },
        { label: "P", value: input.lead, ref: "screw.lead" },
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
        { label: "i", value: input.gearRatio, ref: "screw.gear_ratio" },
      ],
      outputs: [
        {
          label: "T_L",
          value: makeQuantity(c.driveTorqueNm, "N*m"),
          ref: "screw.drive_torque",
        },
      ],
      sources: ORIENTAL_MOTOR_DRIVE_TORQUE,
      notes: [
        "Cross-checked against a second, independent worked example (Rockford Ball Screw, 'How To Size A Ball Screw', step 10) — context/modules/ball-screw/stage-1-spec.md item 3.",
      ],
    };
  });

  const staticSafetySteps = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step" as const,
      id: `static-safety-${loadCase}`,
      title: `Static safety factor (${loadCase})`,
      methodId: "ball_screw.static_safety_factor",
      expression: "fs = C0 / |F_a|",
      inputs: [
        {
          label: "C0",
          value: input.staticLoadRating,
          ref: "screw.static_load_rating",
        },
        { label: "F_a", value: c.thrustForce, ref: "motion.axis.thrust_force" },
      ],
      outputs: [
        {
          label: "fs",
          value: makeQuantity(c.staticSafetyFactor, "ratio"),
          ref: "screw.static_safety_factor",
        },
      ],
      sources: WY_BALL_SCREW_STATIC_SAFETY,
      notes: [
        `Checked against the engineer-supplied minimum (screw.static_safety_factor_minimum = ${input.staticSafetyFactorMinimum.value}); no built-in minimum is assumed — context/modules/ball-screw/stage-2-contract.md "Decisions" item 1.`,
      ],
    };
  });

  return buildCalculationTrace([
    {
      node: "section",
      id: "kinematics",
      title: "Kinematics",
      children: kinematicsSteps,
    },
    {
      node: "section",
      id: "applied-loads",
      title: "Applied loads",
      children: appliedLoadSteps,
    },
    {
      node: "section",
      id: "drive-torque",
      title: "Drive torque",
      children: driveTorqueSteps,
    },
    {
      node: "section",
      id: "duty-aggregation",
      title: "Duty-cycle aggregation",
      children: [
        {
          node: "step",
          id: "equivalent-dynamic-load",
          title: "Equivalent dynamic axial load",
          methodId: "ball_screw.equivalent_dynamic_load",
          expression: "F_m = cbrt( sum(q_i*n_i*F_i^3) / sum(q_i*n_i) )",
          inputs: CASES.flatMap((loadCase) => {
            const c = input.cases[loadCase];
            return [
              {
                label: `q_${loadCase}`,
                value: c.timeFraction,
                ref: "motion.axis.case_time_fraction",
              },
              {
                label: `F_${loadCase}`,
                value: c.thrustForce,
                ref: "motion.axis.thrust_force",
              },
            ];
          }),
          outputs: [
            {
              label: "F_m",
              value: makeQuantity(input.equivalentLoadN, "N"),
              ref: "screw.equivalent_dynamic_load",
            },
          ],
          sources: STEINMEYER_EQUIVALENT_LOAD,
          notes: [
            "Duty-cycle phases are this module's supported load cases (normal, peak) only — context/modules/ball-screw/stage-2-contract.md 'Decisions' item 3.",
          ],
        },
        {
          node: "step",
          id: "mean-rotational-speed",
          title: "Mean rotational speed",
          methodId: "ball_screw.mean_rotational_speed",
          expression: "n_m = sum(q_i*n_i) / sum(q_i)",
          inputs: [],
          outputs: [
            {
              label: "n_m",
              value: rpmToRadPerS(input.meanRotationalSpeedRevPerMin),
              ref: "screw.mean_rotational_speed",
            },
          ],
          sources: STEINMEYER_EQUIVALENT_LOAD,
        },
      ],
    },
    {
      node: "section",
      id: "life",
      title: "Nominal (fatigue) life",
      children: [
        {
          node: "step",
          id: "nominal-life",
          title: "Nominal (L10) fatigue life",
          methodId: "ball_screw.nominal_life",
          expression: "L10 = (Ca / Fm)^3 * 10^6 [revolutions]",
          inputs: [
            {
              label: "Ca",
              value: input.dynamicLoadRating,
              ref: "screw.dynamic_load_rating",
            },
            { label: "Fm", value: makeQuantity(input.equivalentLoadN, "N") },
          ],
          outputs: [
            {
              label: "L10",
              value: makeQuantity(input.lifeRevolutions, "rev"),
              ref: "screw.nominal_life",
            },
          ],
          sources: STEINMEYER_FATIGUE_LIFE,
          notes: [
            "Requires a revolutions-basis dynamic load rating; a distance-basis rating is rejected by the input schema rather than silently misapplied (context/modules/ball-screw/stage-1-spec.md item 5).",
          ],
        },
        {
          node: "step",
          id: "nominal-life-hours",
          title: "Nominal life in hours",
          methodId: "ball_screw.nominal_life_hours",
          expression: "Lh = L10 / (60 * nm)",
          inputs: [
            { label: "L10", value: makeQuantity(input.lifeRevolutions, "rev") },
            {
              label: "nm",
              value: rpmToRadPerS(input.meanRotationalSpeedRevPerMin),
            },
          ],
          outputs: [
            {
              label: "Lh",
              value: makeQuantity(convert(input.lifeHours, "h", "s"), "s"),
              ref: "screw.nominal_life_hours",
            },
          ],
          notes: [
            "Elementary unit conversion; no manufacturer-specific method (UNC Charlotte Industrial Solutions Lab independently gives the same shape, attributed to Bosch Rexroth's Linear Motion Technology Handbook — context/modules/ball-screw/stage-1-spec.md item 5).",
          ],
        },
      ],
    },
    {
      node: "section",
      id: "static-safety",
      title: "Static safety",
      children: staticSafetySteps,
    },
    {
      node: "section",
      id: "buckling",
      title: "Buckling",
      children: [
        {
          node: "step",
          id: "buckling-load",
          title: "Theoretical and permissible buckling load",
          methodId: "ball_screw.buckling_load",
          expression: "Pc = Fe * 14,030,000 * (Dmin^4 / L^2) [lbf, in]",
          inputs: [
            {
              label: "Dmin",
              value: input.minorDiameter,
              ref: "screw.minor_diameter",
            },
            {
              label: "L",
              value: input.unsupportedLength,
              ref: "screw.unsupported_length",
            },
          ],
          outputs: [
            {
              label: "P_B",
              value: makeQuantity(input.bucklingLoadN, "N"),
              ref: "screw.buckling_load",
            },
            {
              label: "F_perm_buck",
              value: makeQuantity(input.permissibleCompressiveLoadN, "N"),
              ref: "screw.permissible_compressive_load",
            },
          ],
          sources: ROCKFORD_BUCKLING,
          notes: [
            `End-support arrangement: ${input.endSupportArrangement}.`,
            `Permissible load = theoretical load * buckling_safety_margin (= ${input.bucklingSafetyMargin.value}, engineer-supplied — published sources disagree between 0.5 and 0.8, context/modules/ball-screw/stage-2-contract.md "Decisions" item 2).`,
          ],
        },
        ...CASES.map((loadCase) => {
          const c = input.cases[loadCase];
          return {
            node: "step" as const,
            id: `buckling-${loadCase}`,
            title: `Buckling margin check (${loadCase})`,
            methodId: "ball_screw.buckling_check",
            expression: "|F_a| <= F_perm_buck",
            inputs: [
              {
                label: "F_a",
                value: c.thrustForce,
                ref: "motion.axis.thrust_force",
              },
              {
                label: "F_perm_buck",
                value: makeQuantity(input.permissibleCompressiveLoadN, "N"),
              },
            ],
            outputs: [],
          };
        }),
      ],
    },
    {
      node: "section",
      id: "critical-speed",
      title: "Critical speed",
      children: [
        {
          node: "step",
          id: "critical-speed-limits",
          title: "Theoretical and permissible critical speed",
          methodId: "ball_screw.critical_speed",
          expression: "nk = Fe * 4,760,000 * (Dmin / L^2) [rev/min, in]",
          inputs: [
            {
              label: "Dmin",
              value: input.minorDiameter,
              ref: "screw.minor_diameter",
            },
            {
              label: "L",
              value: input.unsupportedLength,
              ref: "screw.unsupported_length",
            },
          ],
          outputs: [
            {
              label: "n_k",
              value: rpmToRadPerS(input.criticalSpeedRevPerMin),
              ref: "screw.critical_speed",
            },
            {
              label: "n_perm",
              value: rpmToRadPerS(input.permissibleSpeedRevPerMin),
              ref: "screw.permissible_speed",
            },
          ],
          sources: ROCKFORD_CRITICAL_SPEED,
          notes: [
            `End-support arrangement: ${input.endSupportArrangement}.`,
            "Permissible speed = 0.8 * theoretical critical speed — both Rockford ('Fs = 0.8') and Steinmeyer ('approximately 80%') agree on this figure, unlike the buckling margin above (context/modules/ball-screw/stage-1-spec.md item 8).",
          ],
        },
        ...CASES.map((loadCase) => {
          const c = input.cases[loadCase];
          return {
            node: "step" as const,
            id: `critical-speed-${loadCase}`,
            title: `Operating speed check (${loadCase})`,
            methodId: "ball_screw.critical_speed_check",
            expression: "n <= n_perm",
            inputs: [
              { label: "n", value: rpmToRadPerS(c.rotationalSpeedRevPerMin) },
              {
                label: "n_perm",
                value: rpmToRadPerS(input.permissibleSpeedRevPerMin),
              },
            ],
            outputs: [],
          };
        }),
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
          methodId: "ball_screw.scope_notes",
          inputs: [],
          outputs: [],
          notes: [
            "This module version (0.1.0) resolves only the normal and peak load cases, matching axis-load-cases' own scope.",
            "Rotating-screw / translating-nut arrangement assumed; the rotating-nut arrangement is out of scope.",
            "Buckling and critical-speed formulas use the screw's minor (root) diameter, not its nominal/major diameter (context/modules/ball-screw/stage-1-spec.md items 7-8).",
            "No preload-dependent stiffness modeling beyond the internal-friction/efficiency terms in the drive-torque formula; no thermal derating, structural compliance, backlash, or lubrication-regime modeling.",
          ],
        },
      ],
    },
  ]);
}
