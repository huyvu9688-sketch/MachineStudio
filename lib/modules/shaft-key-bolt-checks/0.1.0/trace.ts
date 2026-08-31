// Calculation trace for the shaft-key-bolt-checks module. Follows the trace
// contract proposed in
// context/modules/shaft-key-bolt-checks/stage-1-spec.md "Trace Contract
// (Proposed)", narrowed to what 0.1.0 actually computes (no separation or
// shear/bearing bolt path -- stage-2-contract.md "Decisions" item 9). Cites
// the actual formula each step applies, distinguishing elementary geometry/
// arithmetic (no citation) from a sourced method (cited) -- the same
// discipline every other module in this project already established.

import { asSourceRevisionId } from "@/lib/standards";
import {
  buildCalculationTrace,
  makeQuantity,
  type CalculationTrace,
  type Quantity,
} from "@/lib/engine";

const AFDL_SHAFT_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "us.engineeringlibrary.afdl_stress_analysis_manual_shafts@web-2026-08-31",
    ),
    clause: "Chapter 10, combined bending/torsion shaft-diameter formula",
    label: "sigma_e = 16/(pi*D^3*(1-B^4)) * sqrt((Ks*T)^2 + (Km*M)^2)",
  },
];

const KEY_STRESS_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.instant_engineer.key_shear_bearing_stress@web-2026-08-31",
    ),
    clause: "Key shear and bearing stress formulas",
    label: "tau = F/(w*L), sigma = F/((h/2)*L), F = 2*T/d",
  },
];

const BOLT_PRELOAD_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "us.roymech.bolt_preload_calculation@web-2026-08-31",
    ),
    clause: "Torque-to-preload relationship",
    label: "F = T / (K*d)",
  },
];

const BOLT_STRESS_AREA_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "us.mechanicalc.bolted_joint_analysis@web-2026-08-31",
    ),
    clause: "Metric (ISO 898-1) tensile stress-area formula",
    label: "As = (pi/4)*(d - 0.9382*P)^2",
  },
  {
    sourceRevisionId: asSourceRevisionId(
      "us.triangle_fastener.stress_area_asme_b1_1@web-2026-08-31",
    ),
    clause: "Unified (US/UN, ASME B1.1) tensile stress-area formula",
    label: "TS = 0.7854*(Dia - 0.9743/TPI)^2",
  },
];

const BOLT_TENSILE_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "us.up_edu.me401_fastener_notes@web-2026-08-31",
    ),
    clause: "Joint-stiffness load-factor / bolt force under external tension",
    label: "fs = (As*Sp) / (F_preload + P_external*C)",
  },
];

export type ShaftKeyBoltCase = "normal" | "peak";

export interface TraceCaseInput {
  readonly shaftTorque: Quantity;
  readonly shaftMoment: Quantity;
  readonly shaftCombinedStressPa: number;
  readonly shaftSafetyFactor: number;
  readonly keyTangentialForceN: number;
  readonly keyShearStressPa: number;
  readonly keyBearingStressPa: number;
  readonly keyShearSafetyFactor: number;
  readonly keyBearingSafetyFactor: number;
  readonly boltExternalTensileLoad: Quantity;
  readonly boltTensileSafetyFactor: number;
}

export interface TraceInput {
  readonly shaftDiameter: Quantity;
  readonly shaftBoreDiameter: Quantity;
  readonly shaftYield: Quantity;
  readonly shaftKs: Quantity;
  readonly shaftKm: Quantity;
  readonly shaftSafetyFactorMinimum: Quantity;
  readonly keyWidth: Quantity;
  readonly keyHeight: Quantity;
  readonly keyLength: Quantity;
  readonly keyYield: Quantity;
  readonly keySafetyFactorMinimum: Quantity;
  readonly boltThreadStandard: string;
  readonly boltDiameter: Quantity;
  readonly boltPitch: Quantity;
  readonly boltProofStrength: Quantity;
  readonly boltKFactor: Quantity;
  readonly boltInstallationTorque: Quantity;
  readonly boltSafetyFactorMinimum: Quantity;
  readonly boltJointStiffnessRatio: Quantity | undefined;
  readonly boltPreloadN: number;
  readonly cases: Readonly<Record<ShaftKeyBoltCase, TraceCaseInput>>;
}

export function buildTrace(input: TraceInput): CalculationTrace {
  const CASES: readonly ShaftKeyBoltCase[] = ["normal", "peak"];

  const shaftStressSteps = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step" as const,
      id: `shaft-combined-stress-${loadCase}`,
      title: `Shaft combined stress (${loadCase})`,
      methodId: "shaft.combined_stress",
      expression: "sigma_e = 16/(pi*D^3*(1-B^4)) * sqrt((Ks*T)^2 + (Km*M)^2)",
      inputs: [
        { label: "T", value: c.shaftTorque, ref: "shaft.applied_torque" },
        {
          label: "M",
          value: c.shaftMoment,
          ref: "shaft.applied_bending_moment",
        },
        { label: "Ks", value: input.shaftKs, ref: "shaft.torque_service_factor" },
        {
          label: "Km",
          value: input.shaftKm,
          ref: "shaft.bending_service_factor",
        },
        { label: "D", value: input.shaftDiameter, ref: "shaft.diameter" },
        {
          label: "Di",
          value: input.shaftBoreDiameter,
          ref: "shaft.bore_diameter",
        },
      ],
      outputs: [
        {
          label: "sigma_e",
          value: makeQuantity(c.shaftCombinedStressPa, "Pa"),
          ref: "shaft.combined_stress",
        },
      ],
      sources: AFDL_SHAFT_SOURCE,
      notes: [
        "No axial-load term -- stage-2-contract.md 'Decisions' item 1.",
      ],
    };
  });

  const shaftSafetySteps = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step" as const,
      id: `shaft-safety-${loadCase}`,
      title: `Shaft safety factor (${loadCase})`,
      methodId: "shaft.safety_factor",
      expression: "fs = Sy / sigma_e",
      inputs: [
        { label: "Sy", value: input.shaftYield, ref: "shaft.material_yield_strength" },
        {
          label: "sigma_e",
          value: makeQuantity(c.shaftCombinedStressPa, "Pa"),
          ref: "shaft.combined_stress",
        },
      ],
      outputs: [
        {
          label: "fs",
          value: makeQuantity(c.shaftSafetyFactor, "ratio"),
          ref: "shaft.safety_factor",
        },
      ],
    };
  });

  const keyStressSteps = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step" as const,
      id: `key-stress-${loadCase}`,
      title: `Key shear and bearing stress (${loadCase})`,
      methodId: "key.shear_and_bearing_stress",
      expression: "F = 2*T/d; tau = F/(w*L); sigma = F/((h/2)*L)",
      inputs: [
        { label: "T", value: c.shaftTorque, ref: "shaft.applied_torque" },
        { label: "d", value: input.shaftDiameter, ref: "shaft.diameter" },
        { label: "w", value: input.keyWidth, ref: "key.width" },
        { label: "h", value: input.keyHeight, ref: "key.height" },
        { label: "L", value: input.keyLength, ref: "key.length" },
      ],
      outputs: [
        {
          label: "F",
          value: makeQuantity(c.keyTangentialForceN, "N"),
        },
        {
          label: "tau",
          value: makeQuantity(c.keyShearStressPa, "Pa"),
          ref: "key.shear_stress",
        },
        {
          label: "sigma",
          value: makeQuantity(c.keyBearingStressPa, "Pa"),
          ref: "key.bearing_stress",
        },
      ],
      sources: KEY_STRESS_SOURCE,
      notes: [
        "Bearing depth uses h/2, a registered approximation -- stage-2-contract.md 'Decisions' item 3.",
      ],
    };
  });

  const keySafetySteps = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step" as const,
      id: `key-safety-${loadCase}`,
      title: `Key shear and bearing safety factor (${loadCase})`,
      methodId: "key.safety_factor",
      expression: "fs = Sy_key / stress",
      inputs: [
        {
          label: "Sy_key",
          value: input.keyYield,
          ref: "key.material_yield_strength",
        },
      ],
      outputs: [
        {
          label: "fs_shear",
          value: makeQuantity(c.keyShearSafetyFactor, "ratio"),
          ref: "key.shear_safety_factor",
        },
        {
          label: "fs_bearing",
          value: makeQuantity(c.keyBearingSafetyFactor, "ratio"),
          ref: "key.bearing_safety_factor",
        },
      ],
    };
  });

  const boltPreloadStep = {
    node: "step" as const,
    id: "bolt-preload",
    title: "Bolt preload",
    methodId: "bolt.preload",
    expression: "F = T_i / (K*d)",
    inputs: [
      {
        label: "T_i",
        value: input.boltInstallationTorque,
        ref: "bolt.installation_torque",
      },
      { label: "K", value: input.boltKFactor, ref: "bolt.k_factor" },
      { label: "d", value: input.boltDiameter, ref: "bolt.nominal_diameter" },
    ],
    outputs: [
      {
        label: "F_preload",
        value: makeQuantity(input.boltPreloadN, "N"),
        ref: "bolt.preload",
      },
    ],
    sources: BOLT_PRELOAD_SOURCE,
    notes: [`Thread standard: ${input.boltThreadStandard}.`],
  };

  const boltTensileSteps = CASES.map((loadCase) => {
    const c = input.cases[loadCase];
    return {
      node: "step" as const,
      id: `bolt-tensile-safety-${loadCase}`,
      title: `Bolt tensile-capacity safety factor (${loadCase})`,
      methodId: "bolt.tensile_safety_factor",
      expression: "fs = (As*Sp) / (F_preload + P_external*C)",
      inputs: [
        { label: "P", value: input.boltPitch, ref: "bolt.thread_pitch" },
        {
          label: "Sp",
          value: input.boltProofStrength,
          ref: "bolt.proof_strength",
        },
        {
          label: "F_preload",
          value: makeQuantity(input.boltPreloadN, "N"),
          ref: "bolt.preload",
        },
        {
          label: "P_external",
          value: c.boltExternalTensileLoad,
          ref: "bolt.external_tensile_load",
        },
        ...(input.boltJointStiffnessRatio !== undefined
          ? [
              {
                label: "C",
                value: input.boltJointStiffnessRatio,
                ref: "bolt.joint_stiffness_ratio",
              },
            ]
          : []),
      ],
      outputs: [
        {
          label: "fs",
          value: makeQuantity(c.boltTensileSafetyFactor, "ratio"),
          ref: "bolt.tensile_safety_factor",
        },
      ],
      sources: [...BOLT_STRESS_AREA_SOURCE, ...BOLT_TENSILE_SOURCE],
      notes:
        input.boltJointStiffnessRatio !== undefined
          ? []
          : [
              "No joint-stiffness ratio supplied: C defaults to 1 (the bolt's own share of external tension conservatively assumed to be the whole load).",
            ],
    };
  });

  return buildCalculationTrace([
    {
      node: "section",
      id: "shaft-stress",
      title: "Shaft combined stress",
      children: [...shaftStressSteps, ...shaftSafetySteps],
    },
    {
      node: "section",
      id: "key-stress",
      title: "Key shear and bearing stress",
      children: [...keyStressSteps, ...keySafetySteps],
    },
    {
      node: "section",
      id: "bolt",
      title: "Bolt preload and tensile capacity",
      children: [boltPreloadStep, ...boltTensileSteps],
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
          methodId: "shaft_key_bolt_checks.scope_notes",
          inputs: [],
          outputs: [],
          notes: [
            "0.1.0 requires the full shaft, key, and bolt input set together (founder-directed 2026-08-31, stage-2-contract.md 'Decisions' item 9).",
            "Static/yield-based shaft check only, no fatigue; no axial-load term.",
            "Key bearing stress uses the h/2 approximation.",
            "Joint separation and the bolt shear/bearing path are not implemented in this module version.",
            `Required minimum safety factors: shaft ${input.shaftSafetyFactorMinimum.value}, key ${input.keySafetyFactorMinimum.value}, bolt ${input.boltSafetyFactorMinimum.value}.`,
          ],
        },
      ],
    },
  ]);
}
