import "server-only";
import type {
  CandidatePart,
  ComponentAttributes,
  RequiredSpecEntry,
} from "@/lib/catalog";
import type { ModuleComputation, ModuleInput, Quantity } from "@/lib/engine";
import {
  MGP_SELECTION_CURVES,
  interpolateMgpCurve,
  selectMgpSelectionBand,
  type MgpApplicationCase,
  type MgpBearingType,
  type MgpSelectedBand,
} from "./mgp-selection-curves";

export interface MgpGuidedCylinderMatchCandidate extends CandidatePart {
  readonly attributes: ComponentAttributes;
}

export interface MgpGuidedCylinderRankedCandidate {
  readonly candidate: MgpGuidedCylinderMatchCandidate;
  readonly score: number;
  readonly graph: number;
  readonly allowableLoadMassKg: number;
  readonly factoredLoadMassKg: number;
  readonly theoreticalExtendForceN: number;
  readonly theoreticalRetractForceN: number;
  readonly reasons: readonly string[];
}

export interface MgpGuidedCylinderRejectedCandidate {
  readonly candidate: MgpGuidedCylinderMatchCandidate;
  readonly reasons: readonly string[];
}

export interface MgpGuidedCylinderMatchOutcome {
  readonly requiredSpec: readonly RequiredSpecEntry[];
  readonly accepted: readonly MgpGuidedCylinderRankedCandidate[];
  readonly rejected: readonly MgpGuidedCylinderRejectedCandidate[];
}

function quantityOutput(
  outputs: ModuleComputation["outputs"],
  key: string,
): Quantity {
  const value = outputs[key];
  if (value?.kind !== "quantity")
    throw new Error(`MGP computation is missing quantity output "${key}".`);
  return value;
}

function enumOutput(
  outputs: ModuleComputation["outputs"],
  key: string,
): string {
  const value = outputs[key];
  if (value?.kind !== "enum")
    throw new Error(`MGP computation is missing enum output "${key}".`);
  return value.value;
}

function quantityAttribute(
  attributes: ComponentAttributes,
  key: string,
): number | undefined {
  const value = attributes[key];
  return value?.kind === "quantity" ? value.value : undefined;
}

function enumAttribute(
  attributes: ComponentAttributes,
  key: string,
): string | undefined {
  const value = attributes[key];
  return value?.kind === "enum" ? value.value : undefined;
}

function snapshotQuantity(input: ModuleInput, key: string): number | undefined {
  const value = input.values[key];
  return value?.kind === "quantity" ? value.value : undefined;
}

function asBearingType(value: string | undefined): MgpBearingType | undefined {
  return value === "slide" ||
    value === "ball_bushing" ||
    value === "high_precision_ball_bushing"
    ? value
    : undefined;
}

function standardStrokeIncludes(
  attributes: ComponentAttributes,
  requiredStrokeMm: number,
): boolean {
  return quantityAttribute(attributes, "standard_stroke") === requiredStrokeMm;
}

function curveForCandidate(band: MgpSelectedBand, boreDiameterMm: number) {
  return MGP_SELECTION_CURVES.find(
    (curve) =>
      curve.graph === band.graph &&
      curve.bearingType === band.bearingType &&
      curve.boreDiameterMm === boreDiameterMm &&
      (band.pressureBand === undefined ||
        curve.pressureBand === band.pressureBand),
  );
}

function theoreticalForces(
  boreDiameterMm: number,
  rodDiameterMm: number,
  pressureMPa: number,
) {
  const extendAreaMm2 = (Math.PI * boreDiameterMm ** 2) / 4;
  const retractAreaMm2 =
    (Math.PI * (boreDiameterMm ** 2 - rodDiameterMm ** 2)) / 4;
  return {
    theoreticalExtendForceN: extendAreaMm2 * pressureMPa,
    theoreticalRetractForceN: retractAreaMm2 * pressureMPa,
  };
}

/** Evaluates each candidate with its own MGP graph, bore, and bearing. */
export function evaluateMgpGuidedCylinderCandidates(
  computation: ModuleComputation,
  inputSnapshot: ModuleInput,
  candidates: readonly MgpGuidedCylinderMatchCandidate[],
): MgpGuidedCylinderMatchOutcome {
  const factoredLoadMassKg = quantityOutput(
    computation.outputs,
    "factored_load_mass",
  ).value;
  const requiredStrokeMm = quantityOutput(
    computation.outputs,
    "required_stroke_out",
  ).value;
  const operatingPressureMPa = quantityOutput(
    computation.outputs,
    "operating_pressure_out",
  ).value;
  const applicationCase = enumOutput(
    computation.outputs,
    "application_case_out",
  ) as MgpApplicationCase;
  const pistonSpeedMps = snapshotQuantity(inputSnapshot, "max_piston_speed");
  const transferSpeedMps = snapshotQuantity(inputSnapshot, "transfer_speed");
  const eccentricDistanceMm = snapshotQuantity(
    inputSnapshot,
    "eccentric_distance",
  );
  const accepted: MgpGuidedCylinderRankedCandidate[] = [];
  const rejected: MgpGuidedCylinderRejectedCandidate[] = [];

  for (const candidate of candidates) {
    const boreDiameterMm = quantityAttribute(
      candidate.attributes,
      "bore_diameter",
    );
    const rodDiameterMm = quantityAttribute(
      candidate.attributes,
      "rod_diameter",
    );
    const bearingType = asBearingType(
      enumAttribute(candidate.attributes, "bearing_type"),
    );
    if (
      boreDiameterMm === undefined ||
      rodDiameterMm === undefined ||
      bearingType === undefined
    ) {
      rejected.push({
        candidate,
        reasons: [
          "MGP candidate is missing bore diameter, rod diameter, or bearing type.",
        ],
      });
      continue;
    }
    if (!standardStrokeIncludes(candidate.attributes, requiredStrokeMm)) {
      rejected.push({
        candidate,
        reasons: [
          `Standard stroke ${requiredStrokeMm} mm is not available on this MGP candidate.`,
        ],
      });
      continue;
    }
    if (applicationCase === "stopper" && bearingType !== "slide") {
      rejected.push({
        candidate,
        reasons: [
          "MGP stopper selection applies only to MGPM slide-bearing candidates.",
        ],
      });
      continue;
    }

    const selection = selectMgpSelectionBand({
      applicationCase,
      bearingType,
      operatingPressureMPa,
      requiredStrokeMm,
      pistonSpeedMmPerS:
        pistonSpeedMps === undefined ? undefined : pistonSpeedMps * 1000,
      eccentricDistanceMm,
      transferSpeedMPerMin:
        transferSpeedMps === undefined ? undefined : transferSpeedMps * 60,
      boreDiameterMm,
    });
    if (!selection.inEnvelope) {
      const reason =
        selection.reason === "eccentric_distance_requires_selection_software"
          ? `MGP graph envelope does not cover eccentric distance ${eccentricDistanceMm} mm.`
          : selection.message;
      rejected.push({ candidate, reasons: [reason] });
      continue;
    }
    const curve = curveForCandidate(selection, boreDiameterMm);
    if (curve === undefined) {
      rejected.push({
        candidate,
        reasons: [
          `No published MGP graph ${selection.graph} curve is seeded for ${bearingType} bore ${boreDiameterMm} mm.`,
        ],
      });
      continue;
    }
    const interpolation = interpolateMgpCurve(curve, selection.xValue);
    if (!interpolation.inEnvelope) {
      rejected.push({ candidate, reasons: [interpolation.message] });
      continue;
    }
    const speedCorrectedFactoredMassKg =
      factoredLoadMassKg * (selection.loadCoefficient ?? 1);
    const graphMassMarginKg =
      interpolation.loadMassKg - speedCorrectedFactoredMassKg;
    const forces = theoreticalForces(
      boreDiameterMm,
      rodDiameterMm,
      operatingPressureMPa,
    );
    if (graphMassMarginKg < 0) {
      rejected.push({
        candidate,
        reasons: [
          `MGP graph ${selection.graph} allows ${interpolation.loadMassKg.toFixed(2)} kg, below the speed-corrected factored load ${speedCorrectedFactoredMassKg.toFixed(2)} kg.`,
        ],
      });
      continue;
    }
    accepted.push({
      candidate,
      score: graphMassMarginKg,
      graph: selection.graph,
      allowableLoadMassKg: interpolation.loadMassKg,
      factoredLoadMassKg: speedCorrectedFactoredMassKg,
      ...forces,
      reasons: [
        `MGP graph ${selection.graph} allows ${interpolation.loadMassKg.toFixed(2)} kg against the speed-corrected factored load ${speedCorrectedFactoredMassKg.toFixed(2)} kg.`,
        `Theoretical extend/retract output is ${forces.theoreticalExtendForceN.toFixed(1)} N / ${forces.theoreticalRetractForceN.toFixed(1)} N (informational only).`,
      ],
    });
  }

  accepted.sort((left, right) => {
    const leftBore =
      quantityAttribute(left.candidate.attributes, "bore_diameter") ?? Infinity;
    const rightBore =
      quantityAttribute(right.candidate.attributes, "bore_diameter") ??
      Infinity;
    if (leftBore !== rightBore) return leftBore - rightBore;
    if (left.score !== right.score) return right.score - left.score;
    return left.candidate.id.localeCompare(right.candidate.id);
  });
  return {
    requiredSpec: [
      {
        key: "factored_load_mass",
        label: "Factored guided load mass",
        operator: "gte",
        displayValue: `${factoredLoadMassKg.toFixed(2)} kg`,
      },
      {
        key: "required_stroke",
        label: "Exact standard stroke",
        operator: "eq",
        displayValue: `${requiredStrokeMm} mm`,
      },
    ],
    accepted,
    rejected,
  };
}
