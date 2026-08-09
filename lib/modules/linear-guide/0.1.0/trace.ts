// Calculation trace for the linear-guide module. Follows the trace contract
// proposed in context/modules/linear-guide/stage-1-spec.md "Trace Contract
// (Proposed)": applied load per case, per-block working load, per-block
// equivalent load, static safety, nominal life, and a closing
// validity-and-assumptions section. Cites the actual formula each step
// applies, distinguishing elementary geometry/arithmetic and this module's own
// frame mapping (no citation) from a manufacturer-specific method (cited) —
// the same discipline axis-load-cases, motion-profile, and ball-screw already
// established.
//
// Two departures from that proposed contract, both deliberate and both
// recorded rather than silently dropped:
//
//   - There is no `mean-load` step. PMI's mean-load formula weights each phase
//     by running distance, and neither a distance weighting nor a mean-load
//     output is part of this module's Stage 2 contract — see ./compute.ts.
//   - A `guide-frame` step is added ahead of the block-load steps. It is not
//     in the proposed contract because Stage 1 did not yet know this module
//     would consume a resolved force/moment vector rather than PMI's own
//     force-at-an-offset inputs. The mapping is a real engineering step with
//     real sign choices, so a report must show it (./frame.ts).

import { asSourceRevisionId } from "@/lib/standards";
import {
  buildCalculationTrace,
  convert,
  makeQuantity,
  type CalculationTrace,
  type Quantity,
  type TraceStep,
  type VectorQuantity,
} from "@/lib/engine";
import type { FourBlockLoads, ResultantBlockLoadInput } from "./math";
import { BLOCK_KEYS, type BlockKey } from "./blocks";

const PMI_WORKING_LOAD = [
  {
    sourceRevisionId: asSourceRevisionId(
      "us.pmi.linear_guideway_catalog@bearing-net-au-mirror-2026-08-09",
    ),
    clause: "Section 6, 'Calculation of Working Load', printed page B17",
    label: "P1 = F/4 + F*l3/(2*l1) - F*l4/(2*l2) (and the P2-P4 sign variants)",
  },
];

const PMI_EQUIVALENT_LOAD = [
  {
    sourceRevisionId: asSourceRevisionId(
      "us.pmi.linear_guideway_catalog@bearing-net-au-mirror-2026-08-09",
    ),
    clause:
      "Section 7, 'Calculation of the Equivalent Load', two-or-more-guideways case",
    label: "PE = |PR| + |PT|",
  },
];

const PMI_STATIC_SAFETY = [
  {
    sourceRevisionId: asSourceRevisionId(
      "us.pmi.linear_guideway_catalog@bearing-net-au-mirror-2026-08-09",
    ),
    clause: "Section 4.3, 'Static Safety Factor'",
    label: "fs = C0 / P0",
  },
  {
    sourceRevisionId: asSourceRevisionId("jp.iko.linear_way_catalog@1560e"),
    clause: "General Explanation, 'Static safety factor' (ISO 14728-2 basis)",
    label: "fs = C0 / P0 (corroborating, identical form)",
  },
];

const PMI_NOMINAL_LIFE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "us.pmi.linear_guideway_catalog@bearing-net-au-mirror-2026-08-09",
    ),
    clause: "Sections 4.4-4.5, 'Nominal Life', ball-type branch",
    label: "L = (fH*fT/fW * C/P)^3 * 50 [km]",
  },
  {
    sourceRevisionId: asSourceRevisionId("jp.iko.linear_way_catalog@1560e"),
    clause: "General Explanation, 'Rating life' (ISO 14728-1 basis)",
    label: "L = 50 * (C/P)^3 [km] (corroborating; fW applied upstream of P)",
  },
];

export type LinearGuideCase = "normal" | "peak";

/** Everything one load case contributes to the trace. */
export interface TraceCaseInput {
  readonly resultantForce: VectorQuantity;
  readonly resultantMoment: VectorQuantity;
  readonly guideFrameLoad: ResultantBlockLoadInput;
  readonly blocks: FourBlockLoads;
  readonly blockEquivalentLoadsN: Readonly<Record<BlockKey, number>>;
  readonly governingBlock: BlockKey;
  readonly equivalentLoadN: number;
  readonly staticSafetyFactor: number;
  readonly lifeKm: number;
}

export interface TraceInput {
  readonly orientation: string;
  readonly railSpacing: Quantity;
  readonly blockSpacing: Quantity;
  readonly staticLoadRating: Quantity;
  readonly dynamicLoadRating: Quantity;
  readonly rollingElementType: string;
  readonly preloadGrade: string;
  readonly loadFactor: Quantity;
  readonly hardnessFactor: Quantity;
  readonly temperatureFactor: Quantity;
  readonly staticSafetyFactorMinimum: Quantity;
  readonly cases: Readonly<Record<LinearGuideCase, TraceCaseInput>>;
}

const CASES: readonly LinearGuideCase[] = ["normal", "peak"];

const newtons = (value: number): Quantity => makeQuantity(value, "N");
const newtonMetres = (value: number): Quantity => makeQuantity(value, "N*m");
const lifeDistance = (lifeKm: number): Quantity =>
  makeQuantity(convert(lifeKm, "km", "m"), "m");

export function buildTrace(input: TraceInput): CalculationTrace {
  const appliedLoadSteps: TraceStep[] = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step",
      id: `applied-load-${loadCase}`,
      title: `Resolved applied load (${loadCase})`,
      methodId: "linear_guide.applied_load_given",
      inputs: [],
      outputs: [
        {
          label: "F_res",
          value: c.resultantForce,
          ref: "motion.axis.resultant_force",
        },
        {
          label: "M_res",
          value: c.resultantMoment,
          ref: "motion.axis.resultant_moment",
        },
      ],
      notes: [
        "Reuses axis-load-cases' already-resolved force and moment at the guide reference point for this case; this module does not re-derive gravity, friction, guide resistance, inertia, or external-load terms.",
        "Both vectors are resolved in the axis.v1 frame, component order [X, Y, Z].",
      ],
    };
  });

  const guideFrameSteps: TraceStep[] = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step",
      id: `guide-frame-${loadCase}`,
      title: `Guide-frame resolution (${loadCase})`,
      methodId: "linear_guide.guide_frame_mapping",
      expression:
        "F_n = -Fz;  F_t = Fy;  M_roll = -Mx;  M_pitch = +My;  M_yaw = Mz",
      inputs: [
        {
          label: "F_res",
          value: c.resultantForce,
          ref: "motion.axis.resultant_force",
        },
        {
          label: "M_res",
          value: c.resultantMoment,
          ref: "motion.axis.resultant_moment",
        },
      ],
      outputs: [
        { label: "F_n", value: newtons(c.guideFrameLoad.normalForceN) },
        { label: "F_t", value: newtons(c.guideFrameLoad.lateralForceN) },
        {
          label: "M_roll",
          value: newtonMetres(c.guideFrameLoad.rollMomentNm),
        },
        {
          label: "M_pitch",
          value: newtonMetres(c.guideFrameLoad.pitchMomentNm),
        },
        {
          label: "M_yaw",
          value: newtonMetres(c.guideFrameLoad.yawMomentNm),
        },
      ],
      notes: [
        "Elementary frame resolution, not a manufacturer method — no source is cited because none states it: PMI's own diagrams take a force at a geometric offset rather than a resolved force and moment.",
        "The axial component Fx produces no block share (the drive reacts it), which is why PMI's own vertical diagram has no F/4 term. A vertical axis' weight therefore reaches the blocks only through the moment its centre-of-mass offset creates.",
        "Sign derivations and the confidence attached to each term are in lib/modules/linear-guide/0.1.0/frame.ts.",
      ],
    };
  });

  const blockLoadSteps: TraceStep[] = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step",
      id: `block-load-distribution-${loadCase}`,
      title: `Working load per block (${loadCase})`,
      methodId: "linear_guide.block_load_distribution",
      expression:
        "P_i = F_n/4 +/- M_pitch/(2*l_block) +/- M_roll/(2*l_rail);  P_iT = F_t/4 +/- M_yaw/(2*l_block)",
      inputs: [
        { label: "F_n", value: newtons(c.guideFrameLoad.normalForceN) },
        {
          label: "M_roll",
          value: newtonMetres(c.guideFrameLoad.rollMomentNm),
        },
        {
          label: "M_pitch",
          value: newtonMetres(c.guideFrameLoad.pitchMomentNm),
        },
        {
          label: "l_rail",
          value: input.railSpacing,
          ref: "guide.rail_spacing",
        },
        {
          label: "l_block",
          value: input.blockSpacing,
          ref: "guide.block_spacing",
        },
      ],
      outputs: BLOCK_KEYS.flatMap((block, index) => [
        {
          label: `P${index + 1}R`,
          value: newtons(c.blocks[block].radialN),
        },
        {
          label: `P${index + 1}T`,
          value: newtons(c.blocks[block].lateralN),
        },
      ]),
      sources: PMI_WORKING_LOAD,
      notes: [
        "The moment form of PMI's own per-block formulas: every load-position offset in PMI's in-scope diagrams appears only inside a force-times-offset product, i.e. as a moment, so the substitution is exact for the radial distribution (context/modules/linear-guide/stage-2-contract.md).",
        "The lateral term is reproduced as PMI prints it — an equal, same-signed magnitude on all four blocks over the rail spacing — which is a per-block sizing magnitude rather than a signed equilibrium distribution.",
      ],
    };
  });

  const equivalentLoadSteps: TraceStep[] = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    const governingIndex = BLOCK_KEYS.indexOf(c.governingBlock) + 1;
    return {
      node: "step",
      id: `equivalent-load-${loadCase}`,
      title: `Equivalent load per block (${loadCase})`,
      methodId: "linear_guide.equivalent_load",
      expression: "PE = |PR| + |PT|",
      inputs: BLOCK_KEYS.flatMap((block, index) => [
        { label: `P${index + 1}R`, value: newtons(c.blocks[block].radialN) },
        { label: `P${index + 1}T`, value: newtons(c.blocks[block].lateralN) },
      ]),
      outputs: [
        ...BLOCK_KEYS.map((block, index) => ({
          label: `PE${index + 1}`,
          value: newtons(c.blockEquivalentLoadsN[block]),
        })),
        {
          label: "PE_max",
          value: newtons(c.equivalentLoadN),
          ref: "guide.equivalent_load",
        },
      ],
      sources: PMI_EQUIVALENT_LOAD,
      notes: [
        `Block ${governingIndex} governs this case. Only the governing block's value reaches an output port; per-block detail is reported here (context/modules/linear-guide/stage-2-contract.md "Decisions" item 3).`,
        "No moment term is added: in this two-rail arrangement the moment is already expressed as the differential per-block loading above, so adding one would double-count it.",
      ],
    };
  });

  const staticSafetySteps: TraceStep[] = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step",
      id: `static-safety-${loadCase}`,
      title: `Static safety factor (${loadCase})`,
      methodId: "linear_guide.static_safety_factor",
      expression: "fs = C0 / PE_max",
      inputs: [
        {
          label: "C0",
          value: input.staticLoadRating,
          ref: "guide.static_load_rating",
        },
        { label: "PE_max", value: newtons(c.equivalentLoadN) },
      ],
      outputs: [
        {
          label: "fs",
          value: makeQuantity(c.staticSafetyFactor, "ratio"),
          ref: "guide.static_safety_factor",
        },
      ],
      sources: PMI_STATIC_SAFETY,
      notes: [
        `Checked against the engineer-supplied minimum (guide.static_safety_factor_minimum = ${input.staticSafetyFactorMinimum.value}); no built-in minimum is assumed, because PMI's and IKO's own standard-value tables disagree on the ranges (context/modules/linear-guide/stage-1-spec.md item 3).`,
      ],
    };
  });

  const nominalLifeSteps: TraceStep[] = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step",
      id: `nominal-life-${loadCase}`,
      title: `Nominal life (${loadCase})`,
      methodId: "linear_guide.nominal_life",
      expression: "L = (fH*fT/fW * C/PE_max)^3 * 50 [km]",
      inputs: [
        {
          label: "C",
          value: input.dynamicLoadRating,
          ref: "guide.dynamic_load_rating",
        },
        { label: "PE_max", value: newtons(c.equivalentLoadN) },
        {
          label: "fH",
          value: input.hardnessFactor,
          ref: "guide.hardness_factor",
        },
        {
          label: "fT",
          value: input.temperatureFactor,
          ref: "guide.temperature_factor",
        },
        { label: "fW", value: input.loadFactor, ref: "guide.load_factor" },
      ],
      outputs: [
        {
          label: "L",
          value: lifeDistance(c.lifeKm),
          ref: "guide.nominal_life",
        },
      ],
      sources: PMI_NOMINAL_LIFE,
      notes: [
        "Ball-type branch (exponent 3, 50 km basis). A roller-type guide uses exponent 10/3 over a 100 km basis and is rejected by this version's input schema rather than given the ball exponent.",
        "Life is a travel distance, not a revolution count — the basis both sources publish for a rolling guide. Reported per load case from that case's own equivalent load; no duty-cycle mean load is computed (see the module's compute.ts for why).",
      ],
    };
  });

  return buildCalculationTrace([
    {
      node: "section",
      id: "applied-loads",
      title: "Applied loads",
      children: appliedLoadSteps,
    },
    {
      node: "section",
      id: "guide-frame",
      title: "Guide-frame resolution",
      children: guideFrameSteps,
    },
    {
      node: "section",
      id: "block-loads",
      title: "Working load per block",
      children: blockLoadSteps,
    },
    {
      node: "section",
      id: "equivalent-loads",
      title: "Equivalent load",
      children: equivalentLoadSteps,
    },
    {
      node: "section",
      id: "static-safety",
      title: "Static safety",
      children: staticSafetySteps,
    },
    {
      node: "section",
      id: "nominal-life",
      title: "Nominal life",
      children: nominalLifeSteps,
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
          methodId: "linear_guide.scope_notes",
          inputs: [],
          outputs: [],
          notes: [
            `Installation: ${input.orientation}. Rolling elements: ${input.rollingElementType}. Preload grade: ${input.preloadGrade} (reported as a selection fact, not evaluated pass/fail).`,
            "Fixed arrangement: two parallel rails, two blocks per rail, four load-bearing points. One-rail and other multi-rail arrangements are out of scope.",
            "Orientation is recorded and scope-checked but selects no formula — gravity is already resolved into the incoming force and moment, so the block-load distribution is the same for a horizontal and a vertical installation.",
            "This module version resolves only the normal and peak load cases, matching axis-load-cases' own scope.",
            "No preload-dependent stiffness modeling beyond recording the grade; no lubrication-regime, seal-wear, or rail-deflection modeling.",
          ],
        },
      ],
    },
  ]);
}
