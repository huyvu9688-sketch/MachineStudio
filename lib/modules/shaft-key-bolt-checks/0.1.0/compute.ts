// Pure, deterministic compute function for the shaft-key-bolt-checks module
// (v0.1.0 draft, Stage 3). Every instance supplies the full shaft, key, and
// bolt (preload + tensile-capacity) input set together and every check
// always computes -- founder-directed 2026-08-31, see ./manifest.ts's own
// header note and context/modules/shaft-key-bolt-checks/stage-2-contract.md
// "Decisions" item 9. Reads input magnitudes in their canonical units,
// delegates the physics to the pure kernel in ./math, and returns a
// structured computation. Performs no I/O and imports only the engine's
// public surface and this module's own files.

import type { ModuleComputation, ModuleInput, Quantity } from "@/lib/engine";
import { convert, makeQuantity } from "@/lib/engine";
import {
  resolveBoltPreload,
  resolveBoltStressArea,
  resolveBoltTensileSafetyFactor,
  resolveKeyBearingStress,
  resolveKeySafetyFactor,
  resolveKeyShearStress,
  resolveKeyTangentialForce,
  resolveShaftCombinedStress,
  resolveShaftSafetyFactor,
  type BoltThreadStandard,
} from "./math";
import { buildChecks } from "./checks";
import { buildTrace, type TraceCaseInput } from "./trace";
import { enumValueAt, quantityAt } from "./values";

export type ShaftKeyBoltCase = "normal" | "peak";
const CASES: readonly ShaftKeyBoltCase[] = ["normal", "peak"];

export function compute(input: ModuleInput): ModuleComputation {
  const values = input.values;

  const shaftDiameter = quantityAt(values, "shaft_diameter");
  const shaftBoreDiameter = quantityAt(values, "shaft_bore_diameter");
  const shaftYield = quantityAt(values, "shaft_material_yield_strength");
  const shaftKs = quantityAt(values, "shaft_torque_service_factor");
  const shaftKm = quantityAt(values, "shaft_bending_service_factor");
  const shaftSafetyFactorMinimum = quantityAt(
    values,
    "shaft_safety_factor_minimum",
  );
  const keyWidth = quantityAt(values, "key_width");
  const keyHeight = quantityAt(values, "key_height");
  const keyLength = quantityAt(values, "key_length");
  const keyYield = quantityAt(values, "key_material_yield_strength");
  const keySafetyFactorMinimum = quantityAt(
    values,
    "key_safety_factor_minimum",
  );
  const boltThreadStandard = enumValueAt(values, "bolt_thread_standard") as
    | BoltThreadStandard
    | undefined;
  const boltDiameter = quantityAt(values, "bolt_nominal_diameter");
  const boltPitch = quantityAt(values, "bolt_thread_pitch");
  const boltProofStrength = quantityAt(values, "bolt_proof_strength");
  const boltKFactor = quantityAt(values, "bolt_k_factor");
  const boltInstallationTorque = quantityAt(
    values,
    "bolt_installation_torque",
  );
  const boltSafetyFactorMinimum = quantityAt(
    values,
    "bolt_safety_factor_minimum",
  );
  const boltJointStiffnessRatio = quantityAt(
    values,
    "bolt_joint_stiffness_ratio",
  );

  if (
    shaftDiameter === undefined ||
    shaftBoreDiameter === undefined ||
    shaftYield === undefined ||
    shaftKs === undefined ||
    shaftKm === undefined ||
    shaftSafetyFactorMinimum === undefined ||
    keyWidth === undefined ||
    keyHeight === undefined ||
    keyLength === undefined ||
    keyYield === undefined ||
    keySafetyFactorMinimum === undefined ||
    boltThreadStandard === undefined ||
    boltDiameter === undefined ||
    boltPitch === undefined ||
    boltProofStrength === undefined ||
    boltKFactor === undefined ||
    boltInstallationTorque === undefined ||
    boltSafetyFactorMinimum === undefined
  ) {
    throw new Error(
      "shaft-key-bolt-checks requires its full set of shaft, key, and bolt inputs.",
    );
  }

  const { stressAreaM2 } = resolveBoltStressArea({
    threadStandard: boltThreadStandard,
    diameterM: boltDiameter.value,
    pitchM: boltPitch.value,
  });
  const { preloadN } = resolveBoltPreload({
    installationTorqueNm: boltInstallationTorque.value,
    kFactor: boltKFactor.value,
    diameterM: boltDiameter.value,
  });

  const cases = {} as Record<ShaftKeyBoltCase, TraceCaseInput>;
  for (const loadCase of CASES) {
    const shaftTorque = quantityAt(values, `${loadCase}_shaft_applied_torque`);
    const shaftMoment = quantityAt(
      values,
      `${loadCase}_shaft_applied_bending_moment`,
    );
    const boltExternalTensileLoad = quantityAt(
      values,
      `${loadCase}_bolt_external_tensile_load`,
    );
    if (
      shaftTorque === undefined ||
      shaftMoment === undefined ||
      boltExternalTensileLoad === undefined
    ) {
      throw new Error(
        `shaft-key-bolt-checks requires applied torque, bending moment, and external tensile load for the "${loadCase}" case.`,
      );
    }

    const { combinedStressPa } = resolveShaftCombinedStress({
      torqueNm: shaftTorque.value,
      bendingMomentNm: shaftMoment.value,
      torqueServiceFactor: shaftKs.value,
      bendingServiceFactor: shaftKm.value,
      diameterM: shaftDiameter.value,
      boreDiameterM: shaftBoreDiameter.value,
    });
    const { safetyFactor: shaftSafetyFactor } = resolveShaftSafetyFactor({
      yieldStrengthPa: convert(shaftYield.value, "MPa", "Pa"),
      combinedStressPa,
    });

    const { tangentialForceN } = resolveKeyTangentialForce({
      torqueNm: shaftTorque.value,
      shaftDiameterM: shaftDiameter.value,
    });
    const { shearStressPa: keyShearStressPa } = resolveKeyShearStress({
      tangentialForceN,
      widthM: keyWidth.value,
      lengthM: keyLength.value,
    });
    const { bearingStressPa: keyBearingStressPa } = resolveKeyBearingStress({
      tangentialForceN,
      heightM: keyHeight.value,
      lengthM: keyLength.value,
    });
    const keyYieldPa = convert(keyYield.value, "MPa", "Pa");
    const { safetyFactor: keyShearSafetyFactor } = resolveKeySafetyFactor({
      yieldStrengthPa: keyYieldPa,
      stressPa: keyShearStressPa,
    });
    const { safetyFactor: keyBearingSafetyFactor } = resolveKeySafetyFactor({
      yieldStrengthPa: keyYieldPa,
      stressPa: keyBearingStressPa,
    });

    const { tensileSafetyFactor: boltTensileSafetyFactor } =
      resolveBoltTensileSafetyFactor({
        stressAreaM2,
        proofStrengthPa: convert(boltProofStrength.value, "MPa", "Pa"),
        preloadN,
        externalTensileLoadN: boltExternalTensileLoad.value,
        jointStiffnessRatio: boltJointStiffnessRatio?.value,
      });

    cases[loadCase] = {
      shaftTorque,
      shaftMoment,
      shaftCombinedStressPa: combinedStressPa,
      shaftSafetyFactor,
      keyTangentialForceN: tangentialForceN,
      keyShearStressPa,
      keyBearingStressPa,
      keyShearSafetyFactor,
      keyBearingSafetyFactor,
      boltExternalTensileLoad,
      boltTensileSafetyFactor,
    };
  }

  const outputs: Record<string, Quantity> = {
    bolt_preload: makeQuantity(preloadN, "N"),
  };
  for (const loadCase of CASES) {
    const c = cases[loadCase];
    outputs[`${loadCase}_shaft_combined_stress`] = makeQuantity(
      convert(c.shaftCombinedStressPa, "Pa", "MPa"),
      "MPa",
    );
    outputs[`${loadCase}_shaft_safety_factor`] = makeQuantity(
      c.shaftSafetyFactor,
      "ratio",
    );
    outputs[`${loadCase}_key_shear_stress`] = makeQuantity(
      convert(c.keyShearStressPa, "Pa", "MPa"),
      "MPa",
    );
    outputs[`${loadCase}_key_bearing_stress`] = makeQuantity(
      convert(c.keyBearingStressPa, "Pa", "MPa"),
      "MPa",
    );
    outputs[`${loadCase}_key_shear_safety_factor`] = makeQuantity(
      c.keyShearSafetyFactor,
      "ratio",
    );
    outputs[`${loadCase}_key_bearing_safety_factor`] = makeQuantity(
      c.keyBearingSafetyFactor,
      "ratio",
    );
    outputs[`${loadCase}_bolt_tensile_safety_factor`] = makeQuantity(
      c.boltTensileSafetyFactor,
      "ratio",
    );
  }

  return {
    outputs,
    trace: buildTrace({
      shaftDiameter,
      shaftBoreDiameter,
      shaftYield,
      shaftKs,
      shaftKm,
      shaftSafetyFactorMinimum,
      keyWidth,
      keyHeight,
      keyLength,
      keyYield,
      keySafetyFactorMinimum,
      boltThreadStandard,
      boltDiameter,
      boltPitch,
      boltProofStrength,
      boltKFactor,
      boltInstallationTorque,
      boltSafetyFactorMinimum,
      boltJointStiffnessRatio,
      boltPreloadN: preloadN,
      cases,
    }),
    checks: buildChecks({
      shaftSafetyFactorMinimum,
      keySafetyFactorMinimum,
      boltSafetyFactorMinimum,
      cases: {
        normal: {
          shaftSafetyFactor: cases.normal.shaftSafetyFactor,
          keyShearSafetyFactor: cases.normal.keyShearSafetyFactor,
          keyBearingSafetyFactor: cases.normal.keyBearingSafetyFactor,
          boltTensileSafetyFactor: cases.normal.boltTensileSafetyFactor,
        },
        peak: {
          shaftSafetyFactor: cases.peak.shaftSafetyFactor,
          keyShearSafetyFactor: cases.peak.keyShearSafetyFactor,
          keyBearingSafetyFactor: cases.peak.keyBearingSafetyFactor,
          boltTensileSafetyFactor: cases.peak.boltTensileSafetyFactor,
        },
      },
    }),
    warnings: [],
    assumptions: [
      {
        id: "full-input-set-required",
        statement:
          "0.1.0 requires the full shaft, key, and bolt input set together and always computes all three checks -- founder-directed 2026-08-31 (stage-2-contract.md 'Decisions' item 9), not the fully independent per-check usability stage-1-spec.md's own Purpose first described.",
      },
      {
        id: "shaft-static-only-no-axial-term",
        statement:
          "The shaft check is static/yield-based only (no fatigue) and omits the sourced formula's own axial-load term -- stage-2-contract.md 'Decisions' item 1.",
      },
      {
        id: "shaft-service-factor-convention",
        statement:
          "The shaft check adopts the Air-Force/ASME-B106.1M Ks/Km service-factor tradition, not the Shigley/Reuven geometric stress-concentration-factor tradition -- stage-2-contract.md 'Decisions' item 2.",
        value: shaftKs,
      },
      {
        id: "key-bearing-depth-approximation",
        statement:
          "The key bearing-stress check uses h/2 as the contact depth, a registered approximation to a more exact geometry-dependent depth -- stage-2-contract.md 'Decisions' item 3.",
      },
      {
        id: "bolt-tensile-share-default",
        statement: boltJointStiffnessRatio
          ? "bolt_joint_stiffness_ratio was supplied and scales the bolt's own share of externally applied tension."
          : "No bolt_joint_stiffness_ratio was supplied: the tensile check conservatively assumes the bolt carries the full externally applied tensile load (C = 1).",
      },
      {
        id: "bolt-separation-shear-not-implemented",
        statement:
          "Joint separation and the shear/bearing bolt path are registered parameters but are not yet wired as ports in this module version -- stage-2-contract.md 'Decisions' item 9.",
      },
    ],
    validity: [],
  };
}
