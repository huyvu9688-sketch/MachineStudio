// SMC Corporation's own "Air Cylinders Model Selection" (BEST AUTOMATION
// Technical Data 1-4) worked examples, reproduced through this module's
// ACTUAL compute path (executeModule), not just the kernel formula level
// ./math.test.ts already covers -- context/ai-workflow-rules.md "New
// Module Workflow" Stage 3 ("Add reference... tests").
//
// Each scenario supplies every required port; values not exercised by the
// specific figure being reproduced are round, physically reasonable
// numbers, not sourced from SMC's own text.

import { makeQuantity } from "@/lib/engine";
import {
  cushionTypeValue,
  mountingStyleValue,
  type RawInput,
} from "./test-helpers";

/**
 * Bore-size-selection Example 1: 1000 N extend-side force required,
 * load factor eta = 0.7 (static/clamping), pressure P = 0.5 MPa. SMC's own
 * selection is a 63 mm bore. A1 = pi*63^2/4 = 3117.2 mm^2 (this module's
 * own geometric formula, matching SMC's own printed piston-area table to
 * catalog rounding), so F1 = 0.7*3117.2*0.5 = 1091.0 N, clearing the
 * stated 1000 N requirement -- see ./validation.ts "smc-force-capacity".
 */
export const SMC_FORCE_CAPACITY_EXAMPLE: RawInput = {
  values: {
    bore_diameter: makeQuantity(63, "mm"),
    // Rod diameter does not affect the extend-side force; a round,
    // physically reasonable value for a 63mm-bore cylinder.
    rod_diameter: makeQuantity(20, "mm"),
    operating_pressure: makeQuantity(0.5, "MPa"),
    load_factor: makeQuantity(0.7, "ratio"),
    required_extend_force: makeQuantity(1000, "N"),
    load_mass: makeQuantity(10, "kg"),
    max_piston_speed: makeQuantity(0.5, "m/s"),
    cushion_type: cushionTypeValue("none"),
    stroke: makeQuantity(300, "mm"),
    mounting_style: mountingStyleValue("fixed-free"),
    buckling_safety_factor: makeQuantity(4, "ratio"),
  },
};

export const SMC_FORCE_CAPACITY_EXPECTED_N = 1091.0358586835653;

/**
 * Air-consumption worked example (recovered via a text-extraction proxy
 * this session after smcworld.com/smcpneumatics.com both returned HTTP 403
 * to this session's direct fetch -- see
 * lib/standards/engineering-sources.ts's own jp.smc.air_cylinders_model_
 * selection revision note): 50 mm bore, 600 mm stroke, 0.5 MPa, 2 m/6 mm
 * piping. SMC's own printed sub-totals: cylinder air consumption ~13 L
 * (ANR), piping consumption ~0.56 L (ANR). The rod diameter (20 mm) is not
 * stated in the recovered text; it is the value that reproduces both
 * printed sub-totals exactly and is a real, standard SMC rod size for a
 * 50 mm bore -- see ./validation.ts "smc-air-consumption".
 */
export const SMC_AIR_CONSUMPTION_EXAMPLE: RawInput = {
  values: {
    bore_diameter: makeQuantity(50, "mm"),
    rod_diameter: makeQuantity(20, "mm"),
    operating_pressure: makeQuantity(0.5, "MPa"),
    load_factor: makeQuantity(0.7, "ratio"),
    required_extend_force: makeQuantity(100, "N"),
    load_mass: makeQuantity(10, "kg"),
    max_piston_speed: makeQuantity(0.5, "m/s"),
    cushion_type: cushionTypeValue("none"),
    stroke: makeQuantity(600, "mm"),
    mounting_style: mountingStyleValue("fixed-free"),
    buckling_safety_factor: makeQuantity(4, "ratio"),
    piping_length: makeQuantity(2000, "mm"),
    piping_bore: makeQuantity(6, "mm"),
  },
};

export const SMC_AIR_CONSUMPTION_EXPECTED_L = 13.571680263507904;

/**
 * Cushion-capacity graph example: a 50 kg load on a CM2-40 (bore 40 mm)
 * cylinder with an air cushion requires a maximum speed of 300 mm/s or
 * less to stay within the cushion's own absorption capacity. This module's
 * own kinetic-energy formula gives E = (50/2)*0.3^2 = 2.25 J. The
 * allowable-kinetic-energy figure (2.35 J) is the recovered text's own
 * bore-range endpoint for the CM2 20-40 family with an air cushion, not an
 * independently confirmed per-model value -- a disclosed evidence gap, see
 * ./validation.ts "smc-cushion-kinetic-energy".
 */
export const SMC_CUSHION_EXAMPLE: RawInput = {
  values: {
    bore_diameter: makeQuantity(40, "mm"),
    rod_diameter: makeQuantity(16, "mm"),
    operating_pressure: makeQuantity(0.5, "MPa"),
    load_factor: makeQuantity(0.7, "ratio"),
    required_extend_force: makeQuantity(100, "N"),
    load_mass: makeQuantity(50, "kg"),
    max_piston_speed: makeQuantity(0.3, "m/s"),
    cushion_type: cushionTypeValue("air_cushion"),
    allowable_kinetic_energy: makeQuantity(2.35, "J"),
    stroke: makeQuantity(300, "mm"),
    mounting_style: mountingStyleValue("fixed-free"),
    buckling_safety_factor: makeQuantity(4, "ratio"),
  },
};

export const SMC_CUSHION_EXPECTED_J = 2.25;
