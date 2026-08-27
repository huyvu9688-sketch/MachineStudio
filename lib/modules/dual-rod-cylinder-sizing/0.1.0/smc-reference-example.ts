// Reference-example reproduction (Stage 4) for the dual-rod-cylinder-sizing
// module. Reproduces a real SMC CXS2M20 (20 mm bore, slide bearing)
// scenario: a load resolved by this module's own compute path, checked
// against the CXS2M20's own theoretical force and the seeded horizontal
// bore-20, <=10mm-stroke, <=400mm/s load-mass-vs-overhang-length band
// (graph 14 in the digitized dataset: plateau 1.0 kg @ L<=4mm, 0.07 kg @
// L=100mm).
//
// Rod diameter (10mm) was originally a disclosed inference (this module's
// own MGQ/MGP-convention argument, since this session had no live access
// to re-fetch ES20-275-CXS2.pdf's own dimension table at the time). It is
// now directly confirmed: `reference/source-material/dual-rod-cylinder/
// CXS2.md`'s own "Theoretical Output" table lists "CXS2m20 / 10" under
// "Rod size [mm]" explicitly. This table also confirmed a separate,
// larger correction -- CXS2's piston area is genuinely doubled (a real
// dual-piston mechanism, not the single-piston formula this module
// originally assumed; see stage-1-spec.md "CORRECTION (2026-08-27)" and
// math.ts's own resolvePistonAreas) -- which `resolveTheoreticalForce`
// below picks up automatically via resolvePistonAreas's own corrected
// area, with no change needed to this file's own scenario values.

import { executeModule, makeQuantity } from "@/lib/engine";
import { dualRodCylinderSizingModule } from "./index";
import { DUAL_ROD_LOAD_MASS_CURVES } from "./load-mass-curves";
import {
  resolveAllowableLoadMass,
  resolvePistonAreas,
  resolveTheoreticalForce,
} from "./math";
import { asQuantity, cushionTypeValue, mountingOrientationValue } from "./test-helpers";

/** CXS2M20 (20 mm bore, slide bearing). Rod diameter sourced per this file's own top comment. */
export const CXS2M20_BORE_MM = 20;
export const CXS2M20_ROD_MM = 10;
export const CXS2M20_REQUIRED_STROKE_MM = 8;
export const CXS2M20_OVERHANG_MM = 4;

export function runCxs2m20Example() {
  const computation = executeModule(dualRodCylinderSizingModule, {
    values: {
      incline_angle: makeQuantity(0, "rad"),
      friction_coefficient: makeQuantity(0.1, "ratio"),
      load_mass: makeQuantity(0.5, "kg"),
      process_force: makeQuantity(0, "N"),
      operating_pressure: makeQuantity(0.5, "MPa"),
      load_factor: makeQuantity(0.7, "ratio"),
      max_piston_speed: makeQuantity(0.3, "m/s"),
      cushion_type: cushionTypeValue("none"),
      required_stroke: makeQuantity(CXS2M20_REQUIRED_STROKE_MM, "mm"),
      overhang_length: makeQuantity(CXS2M20_OVERHANG_MM, "mm"),
      mounting_orientation: mountingOrientationValue("horizontal"),
    },
  });

  const requiredExtendForceN = asQuantity(computation.outputs.required_extend_force).value;

  const { extendAreaMm2 } = resolvePistonAreas({
    boreDiameterMm: CXS2M20_BORE_MM,
    rodDiameterMm: CXS2M20_ROD_MM,
  });
  const { forceN: theoreticalExtendForceN } = resolveTheoreticalForce({
    areaMm2: extendAreaMm2,
    pressureMPa: 0.5,
    loadFactor: 0.7,
  });

  const loadMassCheck = resolveAllowableLoadMass({
    mountingOrientation: "horizontal",
    boreDiameterMm: CXS2M20_BORE_MM,
    bearingType: "slide",
    maxPistonSpeedMps: 0.3,
    requiredStrokeMm: CXS2M20_REQUIRED_STROKE_MM,
    overhangLengthMm: CXS2M20_OVERHANG_MM,
    curves: DUAL_ROD_LOAD_MASS_CURVES,
  });

  return {
    requiredExtendForceN,
    theoreticalExtendForceN,
    loadMassCheck,
    loadMassKg: 0.5,
  };
}
