// Hybrid catalog matcher for pneumatic-cylinder-sizing candidates
// (Unit 7.2, Task 15). Combines the generic MatchCriterion/rankCandidates
// engine (lib/catalog) for true single-attribute comparisons (stroke
// range, mounting style, cushion energy) with a custom per-candidate
// evaluator for force capacity and buckling, which need a real formula
// over that SAME candidate's own bore and rod diameter plus this run's
// own pressure/load-factor/safety-factor -- the existing MatchCriterion
// contract cannot express that (see docs/superpowers/plans/
// 2026-08-24-pneumatic-cylinder-sizing-implementation.md "Corrections"
// item 3). Neither lib/catalog's generic engine nor the CatalogAdapter
// SDK contract (lib/engine/module-sdk/types.ts) is changed by this file.

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
  makeQuantity,
  SERIALIZATION_FORMAT_VERSION,
  type EngineeringValue,
  type EnumValue,
  type ModuleComputation,
  type Quantity,
} from "@/lib/engine";
import {
  PneumaticCylinderSizingInputError,
  resolveBucklingLoad,
  resolvePermissibleCompressiveLoad,
  resolvePistonAreas,
  resolveTheoreticalForce,
  type PneumaticMountingStyle,
} from "@/lib/modules/pneumatic-cylinder-sizing/0.1.0/math";

export interface PneumaticCylinderMatchCandidate extends CandidatePart {
  readonly attributes: ComponentAttributes;
}

export interface PneumaticCylinderRankedCandidate {
  readonly candidate: PneumaticCylinderMatchCandidate;
  readonly score: number;
  readonly reasons: readonly string[];
}

export interface PneumaticCylinderRejectedCandidate {
  readonly candidate: PneumaticCylinderMatchCandidate;
  readonly reasons: readonly string[];
}

export interface PneumaticCylinderMatchOutcome {
  readonly requiredSpec: readonly RequiredSpecEntry[];
  readonly accepted: readonly PneumaticCylinderRankedCandidate[];
  readonly rejected: readonly PneumaticCylinderRejectedCandidate[];
}

function quantityOutput(
  outputs: ModuleComputation["outputs"],
  key: string,
): Quantity {
  const value = outputs[key];
  if (value === undefined || value.kind !== "quantity") {
    throw new Error(
      `pneumatic-cylinder-sizing computation is missing a quantity output "${key}".`,
    );
  }
  return value;
}

function enumOutput(outputs: ModuleComputation["outputs"], key: string): string {
  const value = outputs[key];
  if (value === undefined || value.kind !== "enum") {
    throw new Error(
      `pneumatic-cylinder-sizing computation is missing an enum output "${key}".`,
    );
  }
  return value.value;
}

function quantityAttribute(
  attributes: ComponentAttributes,
  key: string,
): number | undefined {
  const value: EngineeringValue | undefined = attributes[key];
  return value?.kind === "quantity" ? value.value : undefined;
}

/**
 * `EnumValue` requires `v: SerializationFormatVersion`, not just
 * `kind`/`enumId`/`value` -- same fix this module's own compute.ts
 * `makeEnumOutput` helper already applies.
 */
function makeEnumValue(enumId: string, value: string): EnumValue {
  return { v: SERIALIZATION_FORMAT_VERSION, kind: "enum", enumId, value };
}

/**
 * Builds the generic-engine criteria (stroke range, mounting style,
 * cushion energy) and runs the custom force/buckling evaluation for every
 * candidate, then combines both into one accepted/rejected result. A
 * candidate must pass every generic criterion AND the custom force and
 * buckling checks to be accepted.
 */
export function evaluatePneumaticCylinderCandidates(
  computation: ModuleComputation,
  candidates: readonly PneumaticCylinderMatchCandidate[],
): PneumaticCylinderMatchOutcome {
  const outputs = computation.outputs;

  const requiredExtendForceN = Math.max(
    0,
    quantityOutput(outputs, "required_extend_force").value,
  );
  const requiredRetractForceN = Math.max(
    0,
    quantityOutput(outputs, "required_retract_force").value,
  );
  const requiredKineticEnergyJ = quantityOutput(outputs, "kinetic_energy").value;
  const requiredStroke = quantityOutput(outputs, "required_stroke_out");
  const operatingPressureMPa = quantityOutput(outputs, "operating_pressure_out").value;
  const loadFactor = quantityOutput(outputs, "load_factor_out").value;
  const bucklingSafetyFactor = quantityOutput(outputs, "buckling_safety_factor_out").value;
  const mountingStyle = enumOutput(outputs, "mounting_style_out") as PneumaticMountingStyle;
  const cushionType = enumOutput(outputs, "cushion_type_out");

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
    {
      key: "mounting_style",
      label: "Mounting style",
      operator: "eq",
      value: makeEnumValue("pneumatic_mounting_style", mountingStyle),
    },
  ];
  if (cushionType !== "none") {
    criteria.push({
      key: `allowable_kinetic_energy_${cushionType}`,
      label: "Allowable cushion kinetic energy",
      operator: "gte",
      value: makeQuantity(requiredKineticEnergyJ, "J"),
    });
  }

  const generic = rankCandidates(criteria, candidates);
  // `generic.accepted` holds `RankedCandidate`s (candidate/score/criteria,
  // no `passed` field) and `generic.rejected` holds `CandidateEvaluation`s
  // (candidate/passed/criteria, no `score`) -- two different shapes, so
  // pass/fail and score are looked up from their own list rather than a
  // merged map typed to the union of both.
  const genericScoreById = new Map(
    generic.accepted.map((ranked) => [ranked.candidate.id, ranked.score]),
  );
  const genericReasonsById = new Map(
    [...generic.accepted, ...generic.rejected].map((evaluation) => [
      evaluation.candidate.id,
      evaluation.criteria.map((c) => c.message),
    ]),
  );

  const accepted: PneumaticCylinderRankedCandidate[] = [];
  const rejected: PneumaticCylinderRejectedCandidate[] = [];

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

    let forceRodBucklingReasons: string[] = [];
    let forceRodBucklingPassed = true;
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
      forceRodBucklingReasons.push(
        extendOk
          ? `"Theoretical extend force" ${theoreticalExtendForceN.toFixed(1)} N meets the required minimum ${requiredExtendForceN.toFixed(1)} N`
          : `"Theoretical extend force" ${theoreticalExtendForceN.toFixed(1)} N is below the required minimum ${requiredExtendForceN.toFixed(1)} N`,
      );
      forceRodBucklingReasons.push(
        retractOk
          ? `"Theoretical retract force" ${theoreticalRetractForceN.toFixed(1)} N meets the required minimum ${requiredRetractForceN.toFixed(1)} N`
          : `"Theoretical retract force" ${theoreticalRetractForceN.toFixed(1)} N is below the required minimum ${requiredRetractForceN.toFixed(1)} N`,
      );
      forceRodBucklingPassed = forceRodBucklingPassed && extendOk && retractOk;
      // Only the force margins feed the ranking score -- they answer "how
      // tightly does this candidate's bore/rod match the required force,"
      // the actual size-fit question this test intends. Buckling margin is
      // deliberately excluded below: it is a pass/fail safety gate (like
      // pneumatic.buckling_safety_factor itself), not a fit criterion --
      // more buckling headroom is never "worse," so folding its margin
      // (routinely two orders of magnitude larger than a force margin for
      // a short column) into the same average would drown out the force
      // signal and invert the intended "tighter bore ranks first" order.
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
      // assumption pneumatic-cylinder@0.1.0 already carries.
      const bucklingOk = theoreticalExtendForceN <= permissibleCompressiveLoadN;
      forceRodBucklingReasons.push(
        bucklingOk
          ? `"Permissible compressive load" ${permissibleCompressiveLoadN.toFixed(1)} N meets the governing extend-side force ${theoreticalExtendForceN.toFixed(1)} N`
          : `"Permissible compressive load" ${permissibleCompressiveLoadN.toFixed(1)} N is below the governing extend-side force ${theoreticalExtendForceN.toFixed(1)} N`,
      );
      forceRodBucklingPassed = forceRodBucklingPassed && bucklingOk;
    } catch (err) {
      // Only the math kernel's own declared validity-envelope error (e.g.
      // rod diameter >= bore diameter) is an expected per-candidate data
      // problem, reportable as a rejection reason. Anything else -- a
      // typo, a null-deref, a genuine bug in this block -- must fail loud
      // rather than being silently absorbed into a rejection-reason string
      // indistinguishable from a legitimate data issue.
      if (!(err instanceof PneumaticCylinderSizingInputError)) throw err;
      forceRodBucklingPassed = false;
      forceRodBucklingReasons = [err.message];
    }

    const passed = genericPassed && forceRodBucklingPassed;
    const reasons = [...genericReasons, ...forceRodBucklingReasons];

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
  ];

  return { requiredSpec, accepted, rejected };
}
