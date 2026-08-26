// Reference-example reproduction (Stage 4) for the pneumatic-cylinder-
// sizing module. Reproduces the same SMC Air Cylinders Model Selection
// bore-size-selection Example 1 pneumatic-cylinder@0.1.0's own validation
// record cites (1000 N extend-side force required, eta = 0.7
// static/clamping, P = 0.5 MPa, SMC's own selection is a 63 mm bore) --
// reached here through this module's own compute path from a load (a
// vertical lift, zero friction, zero process force, load_mass = 1000/g)
// rather than a directly-supplied required force, then checked against
// the same 63 mm bore candidate via this module's own reproduced
// resolvePistonAreas/resolveTheoreticalForce (math.ts).

import { executeModule, makeQuantity } from "@/lib/engine";
import { pneumaticCylinderSizingModule } from "./index";
import { resolvePistonAreas, resolveTheoreticalForce, STANDARD_GRAVITY_M_PER_S2 } from "./math";
import { asQuantity, cushionTypeValue, mountingStyleValue } from "./test-helpers";

export function runSmcBoreSelectionExample() {
  const loadMassKg = 1000 / STANDARD_GRAVITY_M_PER_S2;

  const computation = executeModule(pneumaticCylinderSizingModule, {
    values: {
      incline_angle: makeQuantity(Math.PI / 2, "rad"),
      friction_coefficient: makeQuantity(0, "ratio"),
      load_mass: makeQuantity(loadMassKg, "kg"),
      process_force: makeQuantity(0, "N"),
      operating_pressure: makeQuantity(0.5, "MPa"),
      load_factor: makeQuantity(0.7, "ratio"),
      max_piston_speed: makeQuantity(0.3, "m/s"),
      cushion_type: cushionTypeValue("none"),
      required_stroke: makeQuantity(200, "mm"),
      mounting_style: mountingStyleValue("fixed-supported"),
      buckling_safety_factor: makeQuantity(4, "ratio"),
    },
  });

  const requiredExtendForceN = asQuantity(computation.outputs.required_extend_force).value;

  // SMC's own selection for this exact requirement: a 63 mm bore.
  const { extendAreaMm2 } = resolvePistonAreas({
    boreDiameterMm: 63,
    rodDiameterMm: 20, // a standard CM2-63 rod size, per SMC's own catalog dimension table
  });
  const { forceN: theoreticalExtendForceN } = resolveTheoreticalForce({
    areaMm2: extendAreaMm2,
    pressureMPa: 0.5,
    loadFactor: 0.7,
  });

  return { requiredExtendForceN, theoreticalExtendForceN };
}
