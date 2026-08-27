import { asSourceRevisionId } from "@/lib/standards";
import {
  buildCalculationTrace,
  convertQuantity,
  makeQuantity,
  SERIALIZATION_FORMAT_VERSION,
  type CalculationTrace,
  type EnumValue,
  type Quantity,
} from "@/lib/engine";
import type { MgpApplicationCase } from "./values";

const MGP_SELECTION_SOURCE = [
  {
    sourceRevisionId: asSourceRevisionId(
      "jp.smc.mgp_series_catalog@web-2026-08-26",
    ),
    clause: "MGP Series selection procedure, pp. 545–552",
    label: "MGP load-case selection graphs",
  },
];

export interface TraceInput {
  readonly applicationCase: MgpApplicationCase;
  readonly loadMass: Quantity;
  readonly loadSafetyFactor: Quantity;
  readonly factoredLoadMassKg: number;
  readonly requiredStroke: Quantity;
  readonly operatingPressure: Quantity;
  readonly maxPistonSpeed?: Quantity;
  readonly eccentricDistance?: Quantity;
  readonly transferSpeed?: Quantity;
}

function applicationCaseValue(applicationCase: MgpApplicationCase): EnumValue {
  return {
    v: SERIALIZATION_FORMAT_VERSION,
    kind: "enum",
    enumId: "pneumatic_guided_mgp_application_case",
    value: applicationCase,
  };
}

export function buildTrace(input: TraceInput): CalculationTrace {
  const selectionInputs = [
    {
      label: "application case",
      value: applicationCaseValue(input.applicationCase),
      ref: "pneumatic_guided_mgp_sizing.application_case",
    },
    {
      label: "required stroke",
      value: input.requiredStroke,
      ref: "pneumatic_guided_sizing.required_stroke",
    },
  ];

  if (input.applicationCase !== "stopper") {
    selectionInputs.push({
      label: "operating pressure",
      value: input.operatingPressure,
      ref: "pneumatic.operating_pressure",
    });
  }

  if (
    input.applicationCase !== "stopper" &&
    input.maxPistonSpeed !== undefined
  ) {
    selectionInputs.push({
      label: "piston speed",
      value: input.maxPistonSpeed,
      ref: "pneumatic.max_piston_speed",
    });
  }
  if (
    input.applicationCase !== "stopper" &&
    input.eccentricDistance !== undefined
  ) {
    selectionInputs.push({
      label: "eccentric distance L",
      value: input.eccentricDistance,
      ref: "pneumatic_guided_mgp_sizing.eccentric_distance",
    });
  }

  const stopperTransferStep =
    input.applicationCase === "stopper" && input.transferSpeed !== undefined
      ? {
          node: "step" as const,
          id: "stopper-transfer-speed",
          title: "Stopper transfer-speed selection input",
          methodId: "guided_cylinder_sizing.mgp_stopper_transfer_speed",
          expression: "v_transfer,m/min = convert(v_transfer,m/s)",
          inputs: [
            {
              label: "v_transfer",
              value: input.transferSpeed,
              ref: "pneumatic_guided_mgp_sizing.transfer_speed",
            },
          ],
          outputs: [
            {
              label: "v_transfer",
              value: convertQuantity(input.transferSpeed, "m/min"),
            },
          ],
          sources: MGP_SELECTION_SOURCE,
          notes: [
            "The canonical transfer-speed input is converted through the engine unit registry for the MGP stopper graph's m/min axis.",
          ],
        }
      : undefined;

  return buildCalculationTrace([
    {
      node: "section",
      id: "factored-load-mass",
      title: "Factored MGP graph demand",
      children: [
        {
          node: "step",
          id: "guided-load-safety-factor",
          title: "Factored load mass",
          methodId: "guided_cylinder_sizing.mgp_factored_load_mass",
          expression: "m_design = m_entered × S_guided",
          inputs: [
            {
              label: "m_entered",
              value: input.loadMass,
              ref: "motion.axis.total_moving_mass",
            },
            {
              label: "S_guided",
              value: input.loadSafetyFactor,
              ref: "pneumatic_guided_mgp_sizing.load_safety_factor",
            },
          ],
          outputs: [
            {
              label: "m_design",
              value: makeQuantity(input.factoredLoadMassKg, "kg"),
              ref: "factored_load_mass",
            },
          ],
          notes: [
            "The guided-load safety factor is supplied by the engineer for secondary uncertainty; it is not an assumed MGP catalogue rating.",
          ],
        },
      ],
    },
    {
      node: "section",
      id: "mgp-selection-context",
      title: `MGP selection context: ${input.applicationCase}`,
      children: [
        {
          node: "step",
          id: "application-case-inputs",
          title: "Manufacturer graph selection inputs",
          methodId: "guided_cylinder_sizing.mgp_selection_context",
          inputs: selectionInputs,
          outputs: [],
          sources: MGP_SELECTION_SOURCE,
          notes: [
            "MGP graph selection and candidate acceptance occur in the catalog matcher, not in this calculation package.",
            ...(input.applicationCase === "stopper"
              ? [
                  "Operating pressure is preserved for later theoretical candidate reporting; it is not a stopper graph input.",
                ]
              : []),
          ],
        },
        ...(stopperTransferStep === undefined ? [] : [stopperTransferStep]),
      ],
    },
  ]);
}
