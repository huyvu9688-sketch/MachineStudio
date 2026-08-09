// Pure, deterministic compute function for the linear-guide module (v0.1.0
// draft, Stage 3). Resolves the `normal` and `peak` load cases only, matching
// axis-load-cases' own scope (see ./manifest.ts). Reads input magnitudes in
// their canonical units, translates each case's resolved axis.v1 force/moment
// into guide-frame terms (./frame.ts), delegates the physics to the pure
// kernel in ./math, and returns a structured computation. Performs no I/O and
// imports only the engine's public surface and this module's own files.
//
// Which kernel function this calls, and which it deliberately does not:
// `resolveBlockLoadsFromResultant` is the integration path. The four
// installation-specific functions (resolveHorizontalUniformBlockLoads and
// friends) are a source-faithful reproduction of PMI's own self-contained
// method, which re-derives gravity and inertia from raw mass and acceleration
// — inputs this module would have to duplicate from axis-load-cases' own
// surface, producing a second, independently-drifting copy of physics that was
// already resolved upstream. context/modules/linear-guide/
// stage-2-contract.md "A Finding From Trying To Wire This Contract" is where
// that was settled; ./math.ts's own header repeats the warning so nobody
// mistakes the four for the intended entry point.
//
// Nominal life is per case, from that case's own equivalent load — not from a
// duty-cycle mean across cases. The kernel does implement PMI's mean-load
// formula (resolveMeanLoad), but weighting cases by running *distance* (what
// that formula divides by) would require deciding how to derive distance from
// the per-case time fraction and velocity, and the Stage 2 contract registers
// neither those inputs nor a mean-load output. Deferring is the honest call;
// inventing a weighting is not (context/ai-workflow-rules.md "Handling Missing
// Requirements").

import type { ModuleComputation, ModuleInput, Quantity } from "@/lib/engine";
import { convert, makeQuantity } from "@/lib/engine";
import {
  resolveBlockLoadsFromResultant,
  resolveEquivalentLoad,
  resolveNominalLife,
  resolveStaticSafetyFactor,
} from "./math";
import { BLOCK_KEYS, governingBlock, type BlockKey } from "./blocks";
import { mapResultantToGuideFrame, type SupportedOrientation } from "./frame";
import { buildChecks, type LinearGuideCase } from "./checks";
import { buildTrace, type TraceCaseInput } from "./trace";
import { axisComponents, enumValueAt, quantityAt, vectorAt } from "./values";

const CASES: readonly LinearGuideCase[] = ["normal", "peak"];

export function compute(input: ModuleInput): ModuleComputation {
  const values = input.values;

  const orientation = enumValueAt(values, "orientation") as
    SupportedOrientation | undefined;
  const railSpacing = quantityAt(values, "rail_spacing");
  const blockSpacing = quantityAt(values, "block_spacing");
  const staticLoadRating = quantityAt(values, "static_load_rating");
  const dynamicLoadRating = quantityAt(values, "dynamic_load_rating");
  const rollingElementType = enumValueAt(values, "rolling_element_type");
  const preloadGrade = enumValueAt(values, "preload_grade");
  const loadFactor = quantityAt(values, "load_factor");
  // Optional ports; the registry's constant defaults (1.0) auto-fill an absent
  // value before compute() is ever called (lib/engine/module-sdk/execute.ts
  // resolveModuleInput) — the same pattern ball-screw relies on for gear_ratio.
  const hardnessFactor = quantityAt(values, "hardness_factor");
  const temperatureFactor = quantityAt(values, "temperature_factor");
  const staticSafetyFactorMinimum = quantityAt(
    values,
    "static_safety_factor_minimum",
  );

  if (
    orientation === undefined ||
    railSpacing === undefined ||
    blockSpacing === undefined ||
    staticLoadRating === undefined ||
    dynamicLoadRating === undefined ||
    rollingElementType === undefined ||
    preloadGrade === undefined ||
    loadFactor === undefined ||
    hardnessFactor === undefined ||
    temperatureFactor === undefined ||
    staticSafetyFactorMinimum === undefined
  ) {
    throw new Error(
      "linear-guide requires its full set of installation, geometry, catalog-rating, correction-factor, and safety-minimum inputs.",
    );
  }

  const geometry = {
    railSpacingM: railSpacing.value,
    blockSpacingM: blockSpacing.value,
  };

  const cases = {} as Record<LinearGuideCase, TraceCaseInput>;
  for (const loadCase of CASES) {
    const resultantForce = vectorAt(values, `${loadCase}_resultant_force`);
    const resultantMoment = vectorAt(values, `${loadCase}_resultant_moment`);
    if (resultantForce === undefined || resultantMoment === undefined) {
      throw new Error(
        `linear-guide requires a resolved resultant force and moment for the "${loadCase}" case.`,
      );
    }

    const guideFrameLoad = mapResultantToGuideFrame(
      axisComponents(resultantForce, `${loadCase}_resultant_force`),
      axisComponents(resultantMoment, `${loadCase}_resultant_moment`),
      geometry,
    );
    const blocks = resolveBlockLoadsFromResultant(guideFrameLoad);

    const blockEquivalentLoadsN = Object.fromEntries(
      BLOCK_KEYS.map((key) => [key, resolveEquivalentLoad(blocks[key])]),
    ) as Record<BlockKey, number>;
    const governing = governingBlock(blockEquivalentLoadsN);
    const equivalentLoadN = blockEquivalentLoadsN[governing];

    if (equivalentLoadN <= 0) {
      // Both the static-safety and life formulas divide by this load, and the
      // kernel rejects a non-positive applied load outright. A four-block
      // guide whose most heavily loaded block carries nothing is a degenerate
      // input (no resolved load at all), not an operating condition worth
      // reporting an infinite safety factor for.
      throw new Error(
        `linear-guide resolved a zero equivalent load on every block for the "${loadCase}" case; the static safety factor and nominal life are undefined for an unloaded guide.`,
      );
    }

    const { staticSafetyFactor } = resolveStaticSafetyFactor({
      staticLoadRatingN: staticLoadRating.value,
      appliedLoadN: equivalentLoadN,
    });

    const { lifeKm } = resolveNominalLife({
      dynamicLoadRatingN: dynamicLoadRating.value,
      equivalentLoadN,
      // Narrowed to "ball" by ./input-schema.ts before compute runs; the
      // kernel re-rejects anything else, so this is not a silent widening.
      rollingElementType: "ball",
      hardnessFactor: hardnessFactor.value,
      temperatureFactor: temperatureFactor.value,
      loadFactor: loadFactor.value,
    });

    cases[loadCase] = {
      resultantForce,
      resultantMoment,
      guideFrameLoad,
      blocks,
      blockEquivalentLoadsN,
      governingBlock: governing,
      equivalentLoadN,
      staticSafetyFactor,
      lifeKm,
    };
  }

  const outputs: Record<string, Quantity> = {};
  for (const loadCase of CASES) {
    const resolved = cases[loadCase];
    outputs[`${loadCase}_equivalent_load`] = makeQuantity(
      resolved.equivalentLoadN,
      "N",
    );
    outputs[`${loadCase}_static_safety_factor`] = makeQuantity(
      resolved.staticSafetyFactor,
      "ratio",
    );
    outputs[`${loadCase}_nominal_life`] = makeQuantity(
      convert(resolved.lifeKm, "km", "m"),
      "m",
    );
  }

  return {
    outputs,
    trace: buildTrace({
      orientation,
      railSpacing,
      blockSpacing,
      staticLoadRating,
      dynamicLoadRating,
      rollingElementType,
      preloadGrade,
      loadFactor,
      hardnessFactor,
      temperatureFactor,
      staticSafetyFactorMinimum,
      cases,
    }),
    checks: buildChecks({
      railSpacing,
      blockSpacing,
      staticLoadRating,
      dynamicLoadRating,
      staticSafetyFactorMinimum,
      preloadGrade,
      cases: {
        normal: {
          equivalentLoadN: cases.normal.equivalentLoadN,
          staticSafetyFactor: cases.normal.staticSafetyFactor,
          lifeKm: cases.normal.lifeKm,
        },
        peak: {
          equivalentLoadN: cases.peak.equivalentLoadN,
          staticSafetyFactor: cases.peak.staticSafetyFactor,
          lifeKm: cases.peak.lifeKm,
        },
      },
    }),
    warnings: [],
    assumptions: [
      {
        id: "scope-normal-peak-only",
        statement:
          "This module version (0.1.0) resolves only the normal and peak load cases, matching axis-load-cases' own 0.1.0 scope. Holding and emergency_stop support is deferred pending a supported upstream resolved force and moment for those cases.",
      },
      {
        id: "guide-frame-convention",
        statement:
          "The two rails run parallel to the axis.v1 +X travel direction and are separated along +/-Y by the rail spacing; the two blocks on one rail are separated along +/-X by the block spacing; the mounting-plane normal is +/-Z, and a load acting in -Z produces a positive block radial load. For a vertical installation this additionally requires the engineer's free choice of +Y (which axis.v1 leaves open for a vertical axis) to be the in-plane transverse direction. Nothing in the resolved input can detect a different choice, so this is stated as an assumption rather than checked.",
      },
      {
        id: "orientation-selects-no-formula",
        statement:
          "Installation orientation is recorded and scope-checked but selects no formula. PMI publishes separate horizontal and vertical formula sets only because its own method re-derives gravity from mass; this module consumes a force and moment in which gravity, friction, guide resistance, and external loads are already resolved, so the block-load distribution is the same for both installations.",
      },
      {
        id: "lateral-lever-arm-unresolved",
        statement:
          "The lateral block load divides the yawing moment by twice the rail spacing, reproducing PMI's own printed lever arm. PMI prints an equal, same-signed lateral magnitude on all four blocks, which reads as a per-block sizing magnitude rather than a signed equilibrium distribution, and it uses the rail spacing even where a yaw reaction would physically act over the block spacing. Reproduced as printed; whether the block spacing is the correct lever arm is an open Stage 4 question, not a resolved one.",
      },
      {
        id: "equivalent-load-form",
        statement:
          "Equivalent load uses PMI's two-or-more-guideways form PE = |PR| + |PT|, with no separate moment term: in this fixed two-rail arrangement the moment is already expressed as differential loading between blocks, so adding one would double-count it. IKO publishes a more elaborate moment-inclusive form requiring series-specific conversion-factor tables this project holds for no specific guide; that discrepancy is documented, not resolved.",
      },
      {
        id: "life-correction-factors",
        statement:
          "The life load factor is engineer-supplied (guide.load_factor), not a built-in constant: PMI's and IKO's tables are speed- and impact-keyed guidance ranges rather than a single confirmed value. The hardness and temperature factors default to 1.0, the value PMI states for its own guideways at or below the 100 degC reference condition.",
        value: loadFactor,
      },
      {
        id: "static-safety-factor-minimum-supplied",
        statement:
          "The minimum required static safety factor is engineer-supplied (guide.static_safety_factor_minimum), not a built-in constant: PMI and IKO both publish standard-value tables but disagree on the ranges, so neither is adopted as a default.",
        value: staticSafetyFactorMinimum,
      },
    ],
    validity: [],
  };
}
