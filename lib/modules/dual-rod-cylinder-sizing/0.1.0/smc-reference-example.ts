// Reference-example reproduction (Stage 4) for the dual-rod-cylinder-sizing
// module. Reproduces a real SMC CXS2M20 (20 mm bore, slide bearing)
// scenario: a load resolved by this module's own compute path, checked
// against the CXS2M20's own theoretical force and the seeded horizontal
// bore-20, <=10mm-stroke, <=400mm/s load-mass-vs-overhang-length band
// (graph 14 in the digitized dataset: plateau 1.0 kg @ L<=4mm, 0.07 kg @
// L=100mm).
//
// Rod diameter (10mm) is a DISCLOSED INFERENCE, not a directly-confirmed
// CXS2 catalog value: this session had no live access to re-fetch
// ES20-275-CXS2.pdf's own dimension table, and no CXS2-specific bore-20
// rod diameter is recorded anywhere in this repo. An attempt to back-solve
// it from this module's own two already-recorded CXS2 area figures (bore
// 10: OUT 157mm^2/IN 100mm^2; bore 32: OUT 1608mm^2/IN 1206mm^2, both in
// context/modules/dual-rod-cylinder-sizing/stage-1-spec.md) did not
// produce a diameter consistent with the nominal bore label via the
// simple area=pi*D^2/4 formula, so that path was abandoned rather than
// forcing an unreliable derivation. 10mm instead reuses SMC's own MGQ/MGP
// guided-cylinder series' bore-20 rod diameter (reference/catalog-seed/
// smc-mgq-mgp.csv), on the argument that CXS2 -- like MGQ/MGP, unlike the
// plain round-body CM2/CA2 series (8mm rod at bore 20 per reference/
// catalog-seed/smc-cm2-ca2.csv, the ISO 6431 convention) -- has "one
// force-producing rod plus one parallel guide rod for anti-rotation"
// (docs/superpowers/specs/2026-08-26-dual-rod-cylinder-sizing-design.md),
// mechanically the same guided-cylinder class as MGQ/MGP. This is a
// disclosed engineering judgment call pending founder confirmation
// against the real CXS2 catalog, not a sourced value -- the same
// "inferred, not directly confirmed" treatment pneumatic-cylinder-
// sizing@0.1.0's own CA2 bore-40 rod diameter already received. The
// reference example's own checked assertions do not depend on this value
// being exactly right: theoretical force only needs to clear a tiny
// 0.49 N requirement by a wide margin, true for any physically plausible
// rod diameter at this bore.

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
