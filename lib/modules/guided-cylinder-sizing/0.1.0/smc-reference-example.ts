// Reference-example reproduction (Stage 4) for the guided-cylinder-sizing
// module. Reproduces a real SMC MGQ series scenario, directly read from the
// fetched MGQ catalog (context/modules/guided-cylinder-sizing/
// stage-1-spec.md "Fetch record"): an MGQM40 (40 mm bore, slide bearing,
// 50 mm stroke) candidate's own catalog ratings -- rod diameter 16 mm,
// allowable lateral load 167 N, allowable rotational torque of plate
// 3.43 N*m at this bore/bearing-type/stroke -- checked against a load this
// module's own compute path resolves from a load mass, incline angle, and
// a set of roll/pitch/yaw offsets sized so the resultant lateral force and
// moment both stay within the MGQM40 candidate's own published ratings.

import { executeModule, makeQuantity } from "@/lib/engine";
import { guidedCylinderSizingModule } from "./index";
import {
  resolveBucklingLoad,
  resolvePermissibleCompressiveLoad,
  resolvePistonAreas,
  resolveTheoreticalForce,
} from "./math";
import { asQuantity, cushionTypeValue, mountingStyleValue } from "./test-helpers";

/** MGQM40 (40 mm bore, slide bearing), directly read from the fetched MGQ catalog. */
export const MGQM40_BORE_MM = 40;
export const MGQM40_ROD_MM = 16;
export const MGQM40_STROKE_MM = 50;
export const MGQM40_ALLOWABLE_LATERAL_LOAD_N = 167;
export const MGQM40_ALLOWABLE_TORQUE_NM = 3.43;

export function runMgqm40Example() {
  const computation = executeModule(guidedCylinderSizingModule, {
    values: {
      incline_angle: makeQuantity(Math.PI / 2, "rad"),
      friction_coefficient: makeQuantity(0, "ratio"),
      load_mass: makeQuantity(10, "kg"),
      process_force: makeQuantity(0, "N"),
      operating_pressure: makeQuantity(0.5, "MPa"),
      load_factor: makeQuantity(0.7, "ratio"),
      max_piston_speed: makeQuantity(0.3, "m/s"),
      cushion_type: cushionTypeValue("none"),
      required_stroke: makeQuantity(MGQM40_STROKE_MM, "mm"),
      mounting_style: mountingStyleValue("fixed-supported"),
      buckling_safety_factor: makeQuantity(4, "ratio"),
      roll_offset: makeQuantity(10, "mm"),
      pitch_offset: makeQuantity(5, "mm"),
      yaw_offset: makeQuantity(0, "mm"),
    },
  });

  const requiredExtendForceN = asQuantity(computation.outputs.required_extend_force).value;
  const requiredMomentNm = asQuantity(computation.outputs.required_moment).value;

  const { extendAreaMm2 } = resolvePistonAreas({
    boreDiameterMm: MGQM40_BORE_MM,
    rodDiameterMm: MGQM40_ROD_MM,
  });
  const { forceN: theoreticalExtendForceN } = resolveTheoreticalForce({
    areaMm2: extendAreaMm2,
    pressureMPa: 0.5,
    loadFactor: 0.7,
  });
  const { bucklingLoadN } = resolveBucklingLoad({
    rodDiameterMm: MGQM40_ROD_MM,
    columnLengthMm: MGQM40_STROKE_MM,
    mountingStyle: "fixed-supported",
  });
  const { permissibleCompressiveLoadN } = resolvePermissibleCompressiveLoad({
    bucklingLoadN,
    bucklingSafetyFactor: 4,
  });

  return {
    requiredExtendForceN,
    requiredMomentNm,
    theoreticalExtendForceN,
    permissibleCompressiveLoadN,
  };
}
