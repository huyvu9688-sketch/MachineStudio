// Calculation trace for the support-bearing module. Follows the trace
// contract proposed in context/modules/support-bearing/stage-1-spec.md
// "Trace Contract (Proposed)": per-case applied load and operating speed,
// dynamic equivalent load, rating life, static-safety and speed checks,
// reported catalog values (bore/OD/preload), and a closing
// validity-and-assumptions section. Cites the actual formula each step
// applies, distinguishing elementary geometry/arithmetic (no citation) from
// a manufacturer-specific method (cited) — the same discipline every other
// module in this project already established.

import { asSourceRevisionId } from "@/lib/standards";
import {
  buildCalculationTrace,
  makeQuantity,
  type CalculationTrace,
  type Quantity,
} from "@/lib/engine";

const NTN_LOAD_LIFE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.ntn.rolling_bearings_handbook@cat-9012e",
    ),
    clause: "Ch. 6 'Load Rating and Life' / Ch. 7 'Bearing Load'",
    label: "P = X*Fr + Y*Fa; L10 = (C/P)^3 * 10^6; L10h = L10 / (60n)",
  },
];

const NTN_STATIC = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.ntn.rolling_bearings_handbook@cat-9012e",
    ),
    clause:
      "Ch. 6.5-6.6 'Basic Static Load Rating' / 'Allowable Static Equivalent Load'",
    label: "P0 = max(X0*Fr + Y0*Fa, Fr); S0 = C0 / P0",
  },
];

const OPERATING_SPEED_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.thk.ball_screw_general_catalog@technico-mirror-2026-08-09",
    ),
    clause: "screw.lead reuse, not a THK/NTN-specific formula",
    label: "n = v / lead",
  },
];

export type SupportBearingCase = "normal" | "peak";

export interface TraceCaseInput {
  readonly actualRadialLoad: Quantity;
  readonly thrustForce: Quantity | undefined;
  readonly linearVelocity: Quantity;
  readonly axialLoadN: number;
  readonly rotationalSpeedRadPerS: number;
  readonly dynamicEquivalentLoadN: number;
  readonly staticEquivalentLoadN: number;
  readonly lifeRevolutions: number;
  readonly lifeHours: number;
  readonly staticSafetyFactor: number;
  readonly speedSafetyFactor: number;
}

export interface TraceInput {
  readonly location: "fixed" | "supported";
  readonly lead: Quantity;
  readonly dynamicLoadRating: Quantity;
  readonly staticLoadRating: Quantity;
  readonly allowableSpeed: Quantity;
  readonly dynamicLoadFactorX: Quantity;
  readonly dynamicLoadFactorY: Quantity | undefined;
  readonly staticLoadFactorX: Quantity;
  readonly staticLoadFactorY: Quantity | undefined;
  readonly boreDiameter: Quantity;
  readonly outsideDiameter: Quantity;
  readonly preload: Quantity | undefined;
  readonly staticSafetyFactorMinimum: Quantity;
  readonly cases: Readonly<Record<SupportBearingCase, TraceCaseInput>>;
}

export function buildTrace(input: TraceInput): CalculationTrace {
  const CASES: readonly SupportBearingCase[] = ["normal", "peak"];
  const isFixed = input.location === "fixed";

  const speedSteps = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step" as const,
      id: `operating-speed-${loadCase}`,
      title: `Operating rotational speed (${loadCase})`,
      methodId: "bearing.operating_speed",
      expression: "n = v / lead",
      inputs: [
        {
          label: "v",
          value: c.linearVelocity,
          ref: "motion.axis.case_linear_velocity",
        },
        { label: "lead", value: input.lead, ref: "screw.lead" },
      ],
      outputs: [
        {
          label: "n",
          value: makeQuantity(c.rotationalSpeedRadPerS, "rad/s"),
        },
      ],
      sources: OPERATING_SPEED_SOURCE,
    };
  });

  const loadSteps = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step" as const,
      id: `applied-load-${loadCase}`,
      title: `Applied load (${loadCase})`,
      methodId: "bearing.applied_load",
      expression: "P = X*Fr + Y*Fa",
      inputs: [
        {
          label: "Fr",
          value: c.actualRadialLoad,
          ref: "bearing.actual_radial_load",
        },
        {
          label: "Fa",
          value: makeQuantity(c.axialLoadN, "N"),
          ...(isFixed && { ref: "motion.axis.thrust_force" }),
        },
        {
          label: "X",
          value: input.dynamicLoadFactorX,
          ref: "bearing.dynamic_load_factor_x",
        },
        {
          label: "Y",
          value: input.dynamicLoadFactorY ?? makeQuantity(0, "ratio"),
          ...(isFixed && { ref: "bearing.dynamic_load_factor_y" }),
        },
      ],
      outputs: [
        {
          label: "P",
          value: makeQuantity(c.dynamicEquivalentLoadN, "N"),
          ref: "bearing.dynamic_equivalent_load",
        },
      ],
      sources: NTN_LOAD_LIFE,
      notes: isFixed
        ? []
        : [
            'location = "supported": Fa is not consumed (a floating-side bearing does not react axial thrust in THK\'s own Support Unit design).',
          ],
    };
  });

  const lifeSteps = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step" as const,
      id: `rating-life-${loadCase}`,
      title: `Basic rating life (${loadCase})`,
      methodId: "bearing.nominal_life",
      expression: "L10 = (C/P)^3 * 10^6; L10h = L10 / (60n)",
      inputs: [
        {
          label: "C",
          value: input.dynamicLoadRating,
          ref: "bearing.dynamic_load_rating",
        },
        {
          label: "P",
          value: makeQuantity(c.dynamicEquivalentLoadN, "N"),
          ref: "bearing.dynamic_equivalent_load",
        },
      ],
      outputs: [
        {
          label: "L10",
          value: makeQuantity(c.lifeRevolutions, "rev"),
          ref: "bearing.nominal_life",
        },
        {
          label: "L10h",
          value: makeQuantity(c.lifeHours, "h"),
          ref: "bearing.nominal_life_hours",
        },
      ],
      sources: NTN_LOAD_LIFE,
    };
  });

  const staticSteps = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step" as const,
      id: `static-safety-${loadCase}`,
      title: `Static safety factor (${loadCase})`,
      methodId: "bearing.static_safety_factor",
      expression: "P0 = max(X0*Fr + Y0*Fa, Fr); S0 = C0 / P0",
      inputs: [
        {
          label: "C0",
          value: input.staticLoadRating,
          ref: "bearing.static_load_rating",
        },
        {
          label: "X0",
          value: input.staticLoadFactorX,
          ref: "bearing.static_load_factor_x",
        },
        {
          label: "Y0",
          value: input.staticLoadFactorY ?? makeQuantity(0, "ratio"),
          ...(isFixed && { ref: "bearing.static_load_factor_y" }),
        },
      ],
      outputs: [
        {
          label: "S0",
          value: makeQuantity(c.staticSafetyFactor, "ratio"),
          ref: "bearing.static_safety_factor",
        },
      ],
      sources: NTN_STATIC,
    };
  });

  const speedCheckSteps = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step" as const,
      id: `speed-check-${loadCase}`,
      title: `Speed safety factor (${loadCase})`,
      methodId: "bearing.speed_safety_factor",
      expression: "fs_n = n_allowable / n",
      inputs: [
        {
          label: "n_allowable",
          value: input.allowableSpeed,
          ref: "bearing.allowable_speed",
        },
        {
          label: "n",
          value: makeQuantity(c.rotationalSpeedRadPerS, "rad/s"),
        },
      ],
      outputs: [
        {
          label: "fs_n",
          value: makeQuantity(c.speedSafetyFactor, "ratio"),
          ref: "bearing.speed_safety_factor",
        },
      ],
      notes: [
        "Uses the catalog allowable speed uncorrected — NTN's own fL/fC correction factors are graphs, not closed-form equations, and are not implemented in 0.1.0.",
      ],
    };
  });

  return buildCalculationTrace([
    {
      node: "section",
      id: "operating-speed",
      title: "Operating speed",
      children: speedSteps,
    },
    {
      node: "section",
      id: "applied-load",
      title: "Applied load",
      children: loadSteps,
    },
    {
      node: "section",
      id: "rating-life",
      title: "Basic rating life",
      children: lifeSteps,
    },
    {
      node: "section",
      id: "static-safety",
      title: "Static safety",
      children: staticSteps,
    },
    {
      node: "section",
      id: "speed-limit",
      title: "Speed limit",
      children: speedCheckSteps,
    },
    {
      node: "section",
      id: "fit-compatibility",
      title: "Fit (reported)",
      children: [
        {
          node: "step",
          id: "fit-compatibility-report",
          title: "Bore, outside diameter, and preload",
          methodId: "bearing.fit_report",
          inputs: [],
          outputs: [
            {
              label: "d",
              value: input.boreDiameter,
              ref: "bearing.bore_diameter",
            },
            {
              label: "D",
              value: input.outsideDiameter,
              ref: "bearing.outside_diameter",
            },
            ...(input.preload !== undefined
              ? [
                  {
                    label: "F0",
                    value: input.preload,
                    ref: "bearing.preload",
                  },
                ]
              : []),
          ],
          notes: [
            "Reported catalog values, not evaluated pass/fail — a support bearing's bore is manufactured to one matched shaft diameter, not a clamping range (context/modules/support-bearing/stage-2-contract.md 'Decisions').",
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
          methodId: "bearing.scope_notes",
          inputs: [],
          outputs: [],
          notes: [
            "This module version (0.1.0) resolves only the normal and peak load cases, matching axis-load-cases' and ball-screw's own scope.",
            `This calculation represents the ${input.location}-side support bearing (bearing.location).`,
            `Static safety factor minimum = ${input.staticSafetyFactorMinimum.value} (engineer-supplied, no built-in default) — context/modules/support-bearing/stage-2-contract.md 'Decisions' item 5.`,
          ],
        },
      ],
    },
  ]);
}
