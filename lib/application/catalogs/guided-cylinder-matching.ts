// Hybrid catalog matcher for guided-cylinder-sizing candidates (Unit 7.3).
// Combines the generic MatchCriterion/rankCandidates engine (lib/catalog)
// for a true single-attribute comparison (stroke range) with a custom
// per-candidate evaluator for force capacity, buckling, allowable lateral
// load, and allowable rotational torque, which need a real formula (or a
// seeded catalog rating) over that SAME candidate's own bore/rod diameter
// plus this run's own pressure/load-factor/safety-factor/moment -- the
// same architecture finding pneumatic-cylinder-matching.ts already
// established for pneumatic-cylinder-sizing@0.1.0 (context/modules/
// guided-cylinder-sizing/stage-1-spec.md "Purpose"). Neither lib/catalog's
// generic engine nor the CatalogAdapter SDK contract
// (lib/engine/module-sdk/types.ts) is changed by this file.
//
// Allowable lateral load is checked only when a candidate has a seeded
// allowable_lateral_load attribute -- MGQ candidates have one, MGP
// candidates do not (stage-1-spec.md correction 2: MGP's own catalog
// publishes a plate-displacement stiffness graph, not a discrete allowable
// rating). A missing attribute is treated as "not applicable" (skipped),
// not a rejection -- the absence reflects a real catalog-data gap, not a
// candidate that fails the check.

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
  GuidedCylinderSizingInputError,
  resolveBucklingLoad,
  resolvePermissibleCompressiveLoad,
  resolvePistonAreas,
  resolveTheoreticalForce,
  type PneumaticMountingStyle,
} from "@/lib/modules/guided-cylinder-sizing/0.1.0/math";

export interface GuidedCylinderMatchCandidate extends CandidatePart {
  readonly attributes: ComponentAttributes;
}

export interface GuidedCylinderRankedCandidate {
  readonly candidate: GuidedCylinderMatchCandidate;
  readonly score: number;
  readonly reasons: readonly string[];
}

export interface GuidedCylinderRejectedCandidate {
  readonly candidate: GuidedCylinderMatchCandidate;
  readonly reasons: readonly string[];
}

export interface GuidedCylinderMatchOutcome {
  readonly requiredSpec: readonly RequiredSpecEntry[];
  readonly accepted: readonly GuidedCylinderRankedCandidate[];
  readonly rejected: readonly GuidedCylinderRejectedCandidate[];
}

function quantityOutput(
  outputs: ModuleComputation["outputs"],
  key: string,
): Quantity {
  const value = outputs[key];
  if (value === undefined || value.kind !== "quantity") {
    throw new Error(
      `guided-cylinder-sizing computation is missing a quantity output "${key}".`,
    );
  }
  return value;
}

function enumOutput(outputs: ModuleComputation["outputs"], key: string): string {
  const value = outputs[key];
  if (value === undefined || value.kind !== "enum") {
    throw new Error(
      `guided-cylinder-sizing computation is missing an enum output "${key}".`,
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

/**
 * Builds the generic-engine criteria (stroke range) and runs the custom
 * force/buckling/lateral-load/torque evaluation for every candidate, then
 * combines both into one accepted/rejected result. A candidate must pass
 * every generic criterion AND every applicable custom check to be
 * accepted.
 */
export function evaluateGuidedCylinderCandidates(
  computation: ModuleComputation,
  candidates: readonly GuidedCylinderMatchCandidate[],
): GuidedCylinderMatchOutcome {
  const outputs = computation.outputs;

  const requiredExtendForceN = Math.max(
    0,
    quantityOutput(outputs, "required_extend_force").value,
  );
  const requiredRetractForceN = Math.max(
    0,
    quantityOutput(outputs, "required_retract_force").value,
  );
  const requiredMomentNm = quantityOutput(outputs, "required_moment").value;
  const requiredStroke = quantityOutput(outputs, "required_stroke_out");
  const operatingPressureMPa = quantityOutput(outputs, "operating_pressure_out").value;
  const loadFactor = quantityOutput(outputs, "load_factor_out").value;
  const bucklingSafetyFactor = quantityOutput(outputs, "buckling_safety_factor_out").value;
  const mountingStyle = enumOutput(outputs, "mounting_style_out") as PneumaticMountingStyle;

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
  // `generic.accepted` holds `RankedCandidate`s (candidate/score/criteria,
  // no `passed` field) and `generic.rejected` holds `CandidateEvaluation`s
  // (candidate/passed/criteria, no `score`) -- two different shapes, so
  // pass/fail and score are looked up from their own list rather than a
  // merged map typed to the union of both (same pattern
  // pneumatic-cylinder-matching.ts already established).
  const genericScoreById = new Map(
    generic.accepted.map((ranked) => [ranked.candidate.id, ranked.score]),
  );
  const genericReasonsById = new Map(
    [...generic.accepted, ...generic.rejected].map((evaluation) => [
      evaluation.candidate.id,
      evaluation.criteria.map((c) => c.message),
    ]),
  );

  const accepted: GuidedCylinderRankedCandidate[] = [];
  const rejected: GuidedCylinderRejectedCandidate[] = [];

  for (const candidate of candidates) {
    const genericScore = genericScoreById.get(candidate.id);
    const genericPassed = genericScore !== undefined;
    const genericReasons = genericReasonsById.get(candidate.id) ?? [];

    const boreDiameterMm = quantityAttribute(candidate.attributes, "bore_diameter");
    const rodDiameterMm = quantityAttribute(candidate.attributes, "rod_diameter");

    if (boreDiameterMm === undefined || rodDiameterMm === undefined) {
      rejected.push({
        candidate,
        reasons: [
          ...genericReasons,
          "\"Bore/rod diameter\" is not present on this part -- force capacity and buckling cannot be evaluated.",
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
      // Same "force margins feed the ranking score, buckling/lateral-load/
      // torque margins are pass/fail safety gates excluded from scoring"
      // reasoning pneumatic-cylinder-matching.ts already established.
      const extendMargin =
        requiredExtendForceN > 0
          ? (theoreticalExtendForceN - requiredExtendForceN) / requiredExtendForceN
          : 0;
      const retractMargin =
        requiredRetractForceN > 0
          ? (theoreticalRetractForceN - requiredRetractForceN) / requiredRetractForceN
          : 0;
      forceMarginFraction += extendMargin + retractMargin;

      const { bucklingLoadN } = resolveBucklingLoad({
        rodDiameterMm,
        columnLengthMm: requiredStroke.value,
        mountingStyle,
      });
      const { permissibleCompressiveLoadN } = resolvePermissibleCompressiveLoad({
        bucklingLoadN,
        bucklingSafetyFactor,
      });
      // Buckling governs on the extend (thrust) stroke only -- the same
      // assumption pneumatic-cylinder-sizing@0.1.0 already carries.
      const bucklingOk = theoreticalExtendForceN <= permissibleCompressiveLoadN;
      customReasons.push(
        bucklingOk
          ? `"Permissible compressive load" ${permissibleCompressiveLoadN.toFixed(1)} N meets the governing extend-side force ${theoreticalExtendForceN.toFixed(1)} N`
          : `"Permissible compressive load" ${permissibleCompressiveLoadN.toFixed(1)} N is below the governing extend-side force ${theoreticalExtendForceN.toFixed(1)} N`,
      );
      customPassed = customPassed && bucklingOk;
    } catch (err) {
      // Only the math kernel's own declared validity-envelope error is an
      // expected per-candidate data problem, reportable as a rejection
      // reason -- same narrowing pneumatic-cylinder-matching.ts already
      // established.
      if (!(err instanceof GuidedCylinderSizingInputError)) throw err;
      customPassed = false;
      customReasons = [err.message];
    }

    // Allowable lateral load: checked only when the candidate has a
    // seeded value (MGQ). Absent for MGP -- skipped, not failed
    // (stage-1-spec.md correction 2).
    const allowableLateralLoadN = quantityAttribute(
      candidate.attributes,
      "allowable_lateral_load",
    );
    if (allowableLateralLoadN !== undefined) {
      const lateralOk = allowableLateralLoadN >= requiredExtendForceN;
      customReasons.push(
        lateralOk
          ? `"Allowable lateral load" ${allowableLateralLoadN.toFixed(1)} N meets the required minimum ${requiredExtendForceN.toFixed(1)} N`
          : `"Allowable lateral load" ${allowableLateralLoadN.toFixed(1)} N is below the required minimum ${requiredExtendForceN.toFixed(1)} N`,
      );
      customPassed = customPassed && lateralOk;
    }

    // Allowable rotational torque of plate: present for every candidate
    // in both series (stage-1-spec.md correction 3), so this always runs
    // when the attribute is present; a candidate with no seeded torque at
    // all is treated as missing data (rejected below), not skipped.
    const allowableTorqueNm = quantityAttribute(candidate.attributes, "allowable_torque");
    if (allowableTorqueNm !== undefined) {
      const torqueOk = allowableTorqueNm >= requiredMomentNm;
      customReasons.push(
        torqueOk
          ? `"Allowable rotational torque" ${allowableTorqueNm.toFixed(2)} N*m meets the required minimum ${requiredMomentNm.toFixed(2)} N*m`
          : `"Allowable rotational torque" ${allowableTorqueNm.toFixed(2)} N*m is below the required minimum ${requiredMomentNm.toFixed(2)} N*m`,
      );
      customPassed = customPassed && torqueOk;
    } else {
      customPassed = false;
      customReasons.push(
        "\"Allowable rotational torque\" is not present on this part -- the moment check cannot be evaluated.",
      );
    }

    const passed = genericPassed && customPassed;
    const reasons = [...genericReasons, ...customReasons];

    if (passed) {
      accepted.push({
        candidate,
        // `passed` (checked above) implies `genericPassed`, which implies
        // `genericScore !== undefined` -- but that implication crosses two
        // separate variables, which TypeScript's narrowing does not track,
        // hence the `?? 0` fallback (never actually exercised here).
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
      key: "required_moment",
      label: "Required resultant moment (evaluated per candidate, not a flat filter)",
      operator: "gte",
      displayValue: `${requiredMomentNm.toFixed(2)} N*m`,
    },
  ];

  return { requiredSpec, accepted, rejected };
}
