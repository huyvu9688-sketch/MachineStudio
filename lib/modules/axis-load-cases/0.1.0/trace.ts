// Calculation trace for the axis-load-cases module. Follows the trace
// contract frozen in context/modules/axis-load-cases/stage-1-spec.md
// ("Trace and Report Contract"): sections `coordinate-convention`,
// `moving-mass`, `applied-loads`, `drive-demand`, and
// `validity-and-assumptions`, with stable per-case step IDs
// `external-load-<case>` and `resolved-moment-<case>`. Embeds the actual
// values used so a report renders without recomputation or reimplementing
// the formulas here.

import { asSourceRevisionId } from "@/lib/standards";
import {
  buildCalculationTrace,
  makeQuantity,
  type CalculationTrace,
  type Quantity,
  type VectorQuantity,
} from "@/lib/engine";
import type {
  AxisLoadPhaseResult,
  AxisOrientation,
  TravelDirection,
} from "./math";
import { makeAxisVector } from "./values";

const NIST_GRAVITY = [
  {
    sourceRevisionId: asSourceRevisionId("us.nist.sp811@web-2026-07-31"),
    clause: "Appendix B.8",
    label: "standard acceleration of free fall g_n = 9.80665 m/s^2",
  },
];

const THK_FRICTION = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.thk.ball_screw_general_catalog@515-1e",
    ),
    clause: "pp. A15-46 onward",
    label: "Coulomb friction and guide-resistance axial-load method",
  },
];

export interface TraceCaseInput {
  readonly loadCase: "normal" | "peak";
  readonly travelDirection: TravelDirection;
  readonly axialAcceleration: Quantity;
  readonly guideResistance: Quantity;
  readonly externalForce: VectorQuantity | undefined;
  readonly externalMoment: VectorQuantity | undefined;
  readonly result: AxisLoadPhaseResult;
}

export interface TraceInput {
  readonly orientation: AxisOrientation;
  readonly inclineAngle: Quantity;
  readonly gravity: Quantity;
  readonly massRoute: "total" | "breakdown";
  readonly totalMovingMass: Quantity;
  readonly payloadMass: Quantity | undefined;
  readonly carriageMass: Quantity | undefined;
  readonly additionalMass: Quantity | undefined;
  readonly frictionCoefficient: number;
  readonly normalLoadN: number;
  readonly centerOfMassOffset: VectorQuantity | undefined;
  readonly gravitationalForce: Quantity;
  readonly cases: Readonly<Record<"normal" | "peak", TraceCaseInput>>;
}

const ZERO_FORCE = (unit: string): VectorQuantity =>
  makeAxisVector([0, 0, 0], unit);

export function buildTrace(input: TraceInput): CalculationTrace {
  const gravityVector = makeAxisVector(
    input.cases.normal.result.gravityAccelerationMps2,
    "m/s^2",
  );
  const gravityForceVector = makeAxisVector(
    input.cases.normal.result.gravitationalForceN,
    "N",
  );
  const gravityMomentVector = makeAxisVector(
    input.cases.normal.result.gravitationalMomentNm,
    "N*m",
  );
  const centerOfMass = input.centerOfMassOffset ?? ZERO_FORCE("m");

  const massInputs =
    input.massRoute === "total"
      ? [
          {
            label: "m_t",
            value: input.totalMovingMass,
            ref: "motion.axis.total_moving_mass",
          },
        ]
      : [
          {
            label: "m_p",
            value: input.payloadMass as Quantity,
            ref: "motion.axis.payload_mass",
          },
          {
            label: "m_c",
            value: input.carriageMass as Quantity,
            ref: "motion.axis.carriage_mass",
          },
          ...(input.additionalMass !== undefined
            ? [
                {
                  label: "m_add",
                  value: input.additionalMass,
                  ref: "motion.axis.additional_moving_mass",
                },
              ]
            : []),
        ];

  const caseSections = (["normal", "peak"] as const).map((loadCase) => {
    const c = input.cases[loadCase];
    const externalForce = c.externalForce ?? ZERO_FORCE("N");
    const externalMoment = c.externalMoment ?? ZERO_FORCE("N*m");
    const resultantForceVector = makeAxisVector(
      c.result.resultantAppliedForceN,
      "N",
    );
    const resultantMomentVector = makeAxisVector(
      c.result.resultantAppliedMomentNm,
      "N*m",
    );

    return {
      node: "section" as const,
      id: `case-${loadCase}`,
      title: `${loadCase === "normal" ? "Normal" : "Peak"} case`,
      children: [
        {
          node: "step" as const,
          id: `running-resistance-${loadCase}`,
          title: "Coulomb friction and guide resistance",
          methodId: "axis_load_cases.coulomb_friction_and_guide_resistance",
          expression: "F_fric = -sign(dir)*mu*N; F_r = -sign(dir)*F_r,mag",
          inputs: [
            {
              label: "mu",
              value: makeQuantity(input.frictionCoefficient, "ratio"),
            },
            { label: "N", value: makeQuantity(input.normalLoadN, "N") },
            {
              label: "F_r,mag",
              value: c.guideResistance,
              ref: "motion.axis.guide_resistance_force",
            },
          ],
          outputs: [
            {
              label: "F_fric",
              value: makeAxisVector(c.result.frictionForceN, "N"),
            },
            {
              label: "F_r",
              value: makeAxisVector(c.result.guideResistanceForceN, "N"),
            },
          ],
          sources: THK_FRICTION,
          notes: [`Travel direction: ${c.travelDirection}.`],
        },
        {
          node: "step" as const,
          id: `external-load-${loadCase}`,
          title: "Declared external process load",
          methodId: "axis_load_cases.external_load_given",
          inputs: [],
          outputs: [
            {
              label: "F_ext",
              value: externalForce,
              ref: "motion.axis.external_force",
            },
            {
              label: "M_ext",
              value: externalMoment,
              ref: "motion.axis.external_moment",
            },
          ],
          notes:
            c.externalForce === undefined && c.externalMoment === undefined
              ? [
                  "No external process force or moment declared for this case; zero.",
                ]
              : undefined,
        },
        {
          node: "step" as const,
          id: `resolved-moment-${loadCase}`,
          title: "Resolved applied moment",
          methodId: "axis_load_cases.resolved_moment",
          expression: "M_case = M_g + M_ext",
          inputs: [
            { label: "M_g", value: gravityMomentVector },
            { label: "M_ext", value: externalMoment },
          ],
          outputs: [{ label: "M_case", value: resultantMomentVector }],
        },
        {
          node: "step" as const,
          id: `resultant-applied-force-${loadCase}`,
          title: "Resultant applied force",
          methodId: "axis_load_cases.resultant_applied_force",
          expression: "F_case = F_g + F_fric + F_r + F_ext",
          inputs: [
            { label: "F_g", value: gravityForceVector },
            {
              label: "F_fric",
              value: makeAxisVector(c.result.frictionForceN, "N"),
            },
            {
              label: "F_r",
              value: makeAxisVector(c.result.guideResistanceForceN, "N"),
            },
            { label: "F_ext", value: externalForce },
          ],
          outputs: [{ label: "F_case", value: resultantForceVector }],
        },
      ],
    };
  });

  const driveDemandSteps = (["normal", "peak"] as const).map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step" as const,
      id: `required-thrust-${loadCase}`,
      title: `Required axial thrust (${loadCase})`,
      methodId: "axis_load_cases.required_thrust",
      expression: "F_a = m_t*a - F_case,x",
      inputs: [
        { label: "m_t", value: input.totalMovingMass },
        {
          label: "a",
          value: c.axialAcceleration,
          ref: "motion.axis.case_axial_acceleration",
        },
        {
          label: "F_case,x",
          value: makeQuantity(c.result.resultantAppliedForceN[0], "N"),
        },
      ],
      outputs: [
        {
          label: "F_a",
          value: makeQuantity(c.result.requiredAxialDriveForceN, "N"),
          ref: "motion.axis.thrust_force",
        },
      ],
    };
  });

  return buildCalculationTrace([
    {
      node: "section",
      id: "coordinate-convention",
      title: "Coordinate convention (axis.v1)",
      children: [
        {
          node: "step",
          id: "axis-frame-definition",
          title: "Axis frame and travel convention",
          methodId: "axis_load_cases.axis_v1_frame",
          inputs: [
            {
              label: "beta",
              value: input.inclineAngle,
              ref: "motion.axis.incline_angle",
            },
          ],
          outputs: [],
          notes: [
            `Orientation: ${input.orientation}. +X is the declared positive travel direction (uphill/upward for an inclined or vertical axis). +Y is horizontal transverse; +Z = +X x +Y, right-handed.`,
          ],
        },
        {
          node: "step",
          id: "gravity-vector-resolution",
          title: "Gravity resolved onto the axis frame",
          methodId: "axis_load_cases.gravity_vector",
          expression: "g_vec = [-g*sin(beta), 0, -g*cos(beta)]",
          inputs: [
            { label: "g", value: input.gravity, ref: "motion.axis.gravity" },
            {
              label: "beta",
              value: input.inclineAngle,
              ref: "motion.axis.incline_angle",
            },
          ],
          outputs: [{ label: "g_vec", value: gravityVector }],
          sources: NIST_GRAVITY,
        },
      ],
    },
    {
      node: "section",
      id: "moving-mass",
      title: "Moving mass",
      children: [
        {
          node: "step",
          id: "total-moving-mass",
          title: "Total moving mass",
          methodId:
            input.massRoute === "total"
              ? "axis_load_cases.mass_total_given"
              : "axis_load_cases.mass_from_breakdown",
          expression:
            input.massRoute === "total" ? undefined : "m_t = m_p + m_c + m_add",
          inputs: massInputs,
          outputs: [{ label: "m_t", value: input.totalMovingMass }],
        },
      ],
    },
    {
      node: "section",
      id: "applied-loads",
      title: "Applied loads",
      children: [
        {
          node: "step",
          id: "gravity-force",
          title: "Gravitational force",
          methodId: "axis_load_cases.gravity_force",
          expression: "F_g = m_t * g_vec",
          inputs: [
            { label: "m_t", value: input.totalMovingMass },
            { label: "g_vec", value: gravityVector },
          ],
          outputs: [
            { label: "F_g", value: gravityForceVector },
            {
              label: "F_g,x",
              value: input.gravitationalForce,
              ref: "motion.axis.gravitational_force",
            },
          ],
        },
        {
          node: "step",
          id: "gravity-moment",
          title: "Gravitational moment about the carriage reference point",
          methodId: "axis_load_cases.gravity_moment",
          expression: "M_g = r_cm x F_g",
          inputs: [
            {
              label: "r_cm",
              value: centerOfMass,
              ref: "motion.axis.center_of_mass_offset",
            },
            { label: "F_g", value: gravityForceVector },
          ],
          outputs: [{ label: "M_g", value: gravityMomentVector }],
        },
        ...caseSections,
      ],
    },
    {
      node: "section",
      id: "drive-demand",
      title: "Drive demand",
      children: driveDemandSteps,
    },
    {
      node: "section",
      id: "validity-and-assumptions",
      title: "Validity and assumptions",
      children: [
        {
          node: "step",
          id: "validity-notes",
          title: "Scope and assumptions",
          methodId: "axis_load_cases.scope_notes",
          inputs: [],
          outputs: [],
          notes: [
            "This module version (0.1.0) resolves only the normal and peak load cases; holding and emergency_stop are out of scope pending real evidence of those cases.",
            "The Coulomb-friction normal load is taken as the gravity component perpendicular to the axis of travel (m_t * g * cos(beta)); no additional normal-load contribution (e.g. from an external force) is modeled in this version.",
            `Friction coefficient used: ${input.frictionCoefficient} (0 when not supplied).`,
          ],
        },
      ],
    },
  ]);
}
