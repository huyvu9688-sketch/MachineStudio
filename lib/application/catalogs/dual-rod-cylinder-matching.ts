// Hybrid catalog matcher for dual-rod-cylinder-sizing candidates
// (Unit 7.4). Combines the generic MatchCriterion/rankCandidates engine
// (lib/catalog) for a true single-attribute comparison (stroke range)
// with a custom per-candidate evaluator for theoretical force and the
// load-mass-vs-overhang-length structural check, which need a real
// formula/interpolation (or a seeded catalog attribute) over that SAME
// candidate's own bore/rod diameter/bearing type plus this run's own
// pressure/load-factor/overhang/orientation -- the same architecture
// finding pneumatic-cylinder-matching.ts and guided-cylinder-matching.ts
// already established. Neither lib/catalog's generic engine nor the
// CatalogAdapter SDK contract (lib/engine/module-sdk/types.ts) is changed
// by this file.
//
// No buckling evaluation: this module has no buckling check
// (context/modules/dual-rod-cylinder-sizing/stage-1-spec.md "No buckling
// check for this family").
//
// The load-mass-vs-overhang-length check is evaluated for every candidate
// (unlike guided-cylinder-matching.ts's own allowable-lateral-load check,
// which is skipped for MGP candidates with no seeded value) -- every
// CXS2 catalog row seeded in this module's own reference/catalog-seed/
// smc-cxs2.csv carries a bearing_type attribute the digitized dataset can
// always be looked up by (a later catalog-seed task). A candidate whose
// bearing_type does not match "slide"/"ball_bushing" (a real seed-data
// problem, not a missing-attribute-is-fine case) is rejected as a data
// problem, not skipped.

import "server-only";
import {
  describeRequiredSpec,
  rankCandidates,
  type CandidatePart,
  type ComponentAttributes,
  type MatchCriterion,
  type RequiredSpecEntry,
} from "@/lib/catalog";
import {
  type ModuleComputation,
  type Quantity,
} from "@/lib/engine";
import {
  DualRodCylinderSizingInputError,
  resolveAllowableLoadMass,
  resolvePistonAreas,
  resolveTheoreticalForce,
  type DualRodBearingType,
  type DualRodMountingOrientation,
} from "@/lib/modules/dual-rod-cylinder-sizing/0.1.0/math";
import { DUAL_ROD_LOAD_MASS_CURVES } from "@/lib/modules/dual-rod-cylinder-sizing/0.1.0/load-mass-curves";

export interface DualRodCylinderMatchCandidate extends CandidatePart {
  readonly attributes: ComponentAttributes;
}

export interface DualRodCylinderRankedCandidate {
  readonly candidate: DualRodCylinderMatchCandidate;
  readonly score: number;
  readonly reasons: readonly string[];
}

export interface DualRodCylinderRejectedCandidate {
  readonly candidate: DualRodCylinderMatchCandidate;
  readonly reasons: readonly string[];
}

export interface DualRodCylinderMatchOutcome {
  readonly requiredSpec: readonly RequiredSpecEntry[];
  readonly accepted: readonly DualRodCylinderRankedCandidate[];
  readonly rejected: readonly DualRodCylinderRejectedCandidate[];
}

function quantityOutput(
  outputs: ModuleComputation["outputs"],
  key: string,
): Quantity {
  const value = outputs[key];
  if (value === undefined || value.kind !== "quantity") {
    throw new Error(
      `dual-rod-cylinder-sizing computation is missing a quantity output "${key}".`,
    );
  }
  return value;
}

function enumOutput(outputs: ModuleComputation["outputs"], key: string): string {
  const value = outputs[key];
  if (value === undefined || value.kind !== "enum") {
    throw new Error(
      `dual-rod-cylinder-sizing computation is missing an enum output "${key}".`,
    );
  }
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

/**
 * Builds the generic-engine criteria (stroke range) and runs the custom
 * force/load-mass-vs-overhang evaluation for every candidate, then
 * combines both into one accepted/rejected result. A candidate must pass
 * every generic criterion AND every custom check to be accepted.
 */
export function evaluateDualRodCylinderCandidates(
  computation: ModuleComputation,
  candidates: readonly DualRodCylinderMatchCandidate[],
): DualRodCylinderMatchOutcome {
  const outputs = computation.outputs;

  const requiredExtendForceN = Math.max(
    0,
    quantityOutput(outputs, "required_extend_force").value,
  );
  const requiredRetractForceN = Math.max(
    0,
    quantityOutput(outputs, "required_retract_force").value,
  );
  const requiredStroke = quantityOutput(outputs, "required_stroke_out");
  const overhangLengthMm = quantityOutput(outputs, "overhang_length_out").value;
  const mountingOrientation = enumOutput(
    outputs,
    "mounting_orientation_out",
  ) as DualRodMountingOrientation;
  const operatingPressureMPa = quantityOutput(outputs, "operating_pressure_out").value;
  const loadFactor = quantityOutput(outputs, "load_factor_out").value;
  const maxPistonSpeedMps = quantityOutput(outputs, "max_piston_speed_out").value;
  const loadMassKg = quantityOutput(outputs, "load_mass_out").value;

  const criteria: MatchCriterion[] = [
    {
      key: "stroke_max",
      label: "Maximum standard stroke",
      operator: "gte",
      value: requiredStroke,
    },
    {
      key: "stroke_min",
      label: "Minimum standard stroke",
      operator: "lte",
      value: requiredStroke,
    },
  ];

  const generic = rankCandidates(criteria, candidates);
  const genericScoreById = new Map(
    generic.accepted.map((ranked) => [ranked.candidate.id, ranked.score]),
  );
  const genericReasonsById = new Map(
    [...generic.accepted, ...generic.rejected].map((evaluation) => [
      evaluation.candidate.id,
      evaluation.criteria.map((c) => c.message),
    ]),
  );

  const accepted: DualRodCylinderRankedCandidate[] = [];
  const rejected: DualRodCylinderRejectedCandidate[] = [];

  for (const candidate of candidates) {
    const genericScore = genericScoreById.get(candidate.id);
    const genericPassed = genericScore !== undefined;
    const genericReasons = genericReasonsById.get(candidate.id) ?? [];

    const boreDiameterMm = quantityAttribute(candidate.attributes, "bore_diameter");
    const rodDiameterMm = quantityAttribute(candidate.attributes, "rod_diameter");
    const bearingType = enumAttribute(candidate.attributes, "bearing_type") as
      | DualRodBearingType
      | undefined;

    if (boreDiameterMm === undefined || rodDiameterMm === undefined || bearingType === undefined) {
      rejected.push({
        candidate,
        reasons: [
          ...genericReasons,
          "\"Bore/rod diameter or bearing type\" is not present on this part -- force capacity and the load-mass-vs-overhang-length check cannot be evaluated.",
        ],
      });
      continue;
    }

    let customReasons: string[] = [];
    let customPassed = true;
    let forceMarginFraction = 0;

    try {
      const { extendAreaMm2, retractAreaMm2 } = resolvePistonAreas({
        boreDiameterMm,
        rodDiameterMm,
      });
      const { forceN: theoreticalExtendForceN } = resolveTheoreticalForce({
        areaMm2: extendAreaMm2,
        pressureMPa: operatingPressureMPa,
        loadFactor,
      });
      const { forceN: theoreticalRetractForceN } = resolveTheoreticalForce({
        areaMm2: retractAreaMm2,
        pressureMPa: operatingPressureMPa,
        loadFactor,
      });

      const extendOk = theoreticalExtendForceN >= requiredExtendForceN;
      const retractOk = theoreticalRetractForceN >= requiredRetractForceN;
      customReasons.push(
        extendOk
          ? `"Theoretical extend force" ${theoreticalExtendForceN.toFixed(1)} N meets the required minimum ${requiredExtendForceN.toFixed(1)} N`
          : `"Theoretical extend force" ${theoreticalExtendForceN.toFixed(1)} N is below the required minimum ${requiredExtendForceN.toFixed(1)} N`,
      );
      customReasons.push(
        retractOk
          ? `"Theoretical retract force" ${theoreticalRetractForceN.toFixed(1)} N meets the required minimum ${requiredRetractForceN.toFixed(1)} N`
          : `"Theoretical retract force" ${theoreticalRetractForceN.toFixed(1)} N is below the required minimum ${requiredRetractForceN.toFixed(1)} N`,
      );
      customPassed = customPassed && extendOk && retractOk;
      const extendMargin =
        requiredExtendForceN > 0
          ? (theoreticalExtendForceN - requiredExtendForceN) / requiredExtendForceN
          : 0;
      const retractMargin =
        requiredRetractForceN > 0
          ? (theoreticalRetractForceN - requiredRetractForceN) / requiredRetractForceN
          : 0;
      forceMarginFraction += extendMargin + retractMargin;
    } catch (err) {
      if (!(err instanceof DualRodCylinderSizingInputError)) throw err;
      customPassed = false;
      customReasons = [err.message];
    }

    const loadMassResult = resolveAllowableLoadMass({
      mountingOrientation,
      boreDiameterMm,
      bearingType,
      maxPistonSpeedMps,
      requiredStrokeMm: requiredStroke.value,
      overhangLengthMm,
      curves: DUAL_ROD_LOAD_MASS_CURVES,
    });
    if (!loadMassResult.inEnvelope) {
      customPassed = false;
      customReasons.push(
        `"Load mass vs. overhang length" cannot be evaluated: ${loadMassResult.reason}`,
      );
    } else {
      const loadMassOk = loadMassResult.allowableLoadMassKg >= loadMassKg;
      customReasons.push(
        loadMassOk
          ? `"Allowable load mass" ${loadMassResult.allowableLoadMassKg.toFixed(3)} kg at this overhang/band meets the actual load of ${loadMassKg.toFixed(3)} kg`
          : `"Allowable load mass" ${loadMassResult.allowableLoadMassKg.toFixed(3)} kg at this overhang/band is below the actual load of ${loadMassKg.toFixed(3)} kg`,
      );
      customPassed = customPassed && loadMassOk;
    }

    const passed = genericPassed && customPassed;
    const reasons = [...genericReasons, ...customReasons];

    if (passed) {
      accepted.push({
        candidate,
        score: ((genericScore ?? 0) + forceMarginFraction / 2) / 2,
        reasons,
      });
    } else {
      rejected.push({ candidate, reasons });
    }
  }

  accepted.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.candidate.id < b.candidate.id ? -1 : a.candidate.id > b.candidate.id ? 1 : 0;
  });

  const requiredSpec: RequiredSpecEntry[] = [
    ...describeRequiredSpec(criteria),
    {
      key: "required_extend_force",
      label: "Required extend force (evaluated per candidate, not a flat filter)",
      operator: "gte",
      displayValue: `${requiredExtendForceN.toFixed(1)} N`,
    },
    {
      key: "required_retract_force",
      label: "Required retract force (evaluated per candidate, not a flat filter)",
      operator: "gte",
      displayValue: `${requiredRetractForceN.toFixed(1)} N`,
    },
    {
      key: "load_mass_vs_overhang",
      label: "Load mass vs. overhang length (evaluated per candidate, not a flat filter)",
      operator: "gte",
      displayValue: `overhang ${overhangLengthMm.toFixed(1)} mm, ${mountingOrientation} mounting`,
    },
  ];

  return { requiredSpec, accepted, rejected };
}
