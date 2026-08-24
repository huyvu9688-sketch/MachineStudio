// Oriental Motor Co., Ltd.'s own "Index Table -- Using Stepping Motors"
// worked example (jp.oriental_motor.general_catalog_motor_fan_sizing@
// f-tecref-2003-2004, pp. F-8-F-9), reproduced here as fixture data for
// ./oriental-motor-reference-example.test.ts's own kernel-level
// comparison (not executeModule -- this module's own attached_load_inertia
// port takes one pre-resolved figure, so the 12-workpiece parallel-axis
// sum is computed here exactly as the source's own method describes, then
// fed in as that one resolved figure).
//
// Inputs, as printed: table diameter 300 mm, thickness 10 mm, steel
// (rho=4.64 oz/in^3, a MASS-based density in this source's own
// convention -- see stage-1-spec.md "Oriental Motor's own example" for
// the confirmed oz-as-mass vs. AutomationDirect's own oz-as-weight
// distinction), 12 workpieces (40 mm diameter, 30 mm thick, same
// material) mounted at a 125 mm radius from the table center, 7.2:1
// gearhead, indexing 30 deg in 0.3 s (25% accel fraction, 0.075 s -- a
// clean value with no further source-internal rounding).

import { offsetAxisInertia, solidCylinderInertia } from "@/lib/engine";

const OZ_TO_KG = 0.028349523125;
const MM_TO_M = 0.001;

const TABLE_DIAMETER_MM = 300;
const TABLE_THICKNESS_MM = 10;
const STEEL_DENSITY_OZ_PER_IN3 = 4.64;
const WORKPIECE_COUNT = 12;
const WORKPIECE_DIAMETER_MM = 40;
const WORKPIECE_THICKNESS_MM = 30;
const WORKPIECE_OFFSET_MM = 125;
const GEAR_RATIO = 7.2;
export const INDEX_ANGLE_RAD = (30 * Math.PI) / 180;
export const INDEX_TIME_S = 0.3;
export const ACCELERATION_TIME_S = INDEX_TIME_S * 0.25;

const IN_TO_M = 0.0254;
const steelDensityKgPerM3 =
  STEEL_DENSITY_OZ_PER_IN3 * (OZ_TO_KG / IN_TO_M ** 3);

export const TABLE_DIAMETER_M = TABLE_DIAMETER_MM * MM_TO_M;
const tableThicknessM = TABLE_THICKNESS_MM * MM_TO_M;
const tableVolumeM3 = (Math.PI / 4) * TABLE_DIAMETER_M ** 2 * tableThicknessM;
export const TABLE_MASS_KG = steelDensityKgPerM3 * tableVolumeM3;

const workpieceDiameterM = WORKPIECE_DIAMETER_MM * MM_TO_M;
const workpieceThicknessM = WORKPIECE_THICKNESS_MM * MM_TO_M;
const workpieceVolumeM3 =
  (Math.PI / 4) * workpieceDiameterM ** 2 * workpieceThicknessM;
const workpieceMassKg = steelDensityKgPerM3 * workpieceVolumeM3;
const workpieceOffsetM = WORKPIECE_OFFSET_MM * MM_TO_M;

/** Each workpiece's own centroidal inertia, `JC = (1/8)*m*D^2`. */
const singleWorkpieceCentroidalInertiaKgM2 = solidCylinderInertia({
  massKg: workpieceMassKg,
  outerDiameterM: workpieceDiameterM,
}).inertiaKgM2;

/** Each workpiece's own inertia about the table's rotation axis, `JC+m*l^2` (parallel-axis theorem). */
const singleWorkpieceInertiaAboutCenterKgM2 = offsetAxisInertia({
  centroidalInertiaKgM2: singleWorkpieceCentroidalInertiaKgM2,
  massKg: workpieceMassKg,
  offsetM: workpieceOffsetM,
}).inertiaKgM2;

/** `JW = 12*(JC+m*l^2)` -- the combined 12-workpiece mounted-load inertia, the module's own `attached_load_inertia` input. */
export const ATTACHED_LOAD_INERTIA_KGM2 =
  WORKPIECE_COUNT * singleWorkpieceInertiaAboutCenterKgM2;

/** `JT = (pi/32)*rho*L_T*D_T^4` -- printed 3442 oz-in^2. */
export const PRINTED_TABLE_INERTIA_OZ_IN2 = 3442;
/** 1 oz-in^2 (mass-based, this source's own convention) in kg*m^2: oz(mass)*in^2. */
const OZ_IN2_TO_KGM2 = OZ_TO_KG * IN_TO_M ** 2;
export const PRINTED_TABLE_INERTIA_KGM2 =
  PRINTED_TABLE_INERTIA_OZ_IN2 * OZ_IN2_TO_KGM2;

/** `JW = 12*(JC+m*l^2)` -- printed 3118 oz-in^2. */
export const PRINTED_ATTACHED_LOAD_INERTIA_OZ_IN2 = 3118;
export const PRINTED_ATTACHED_LOAD_INERTIA_KGM2 =
  PRINTED_ATTACHED_LOAD_INERTIA_OZ_IN2 * OZ_IN2_TO_KGM2;

/** `JL = JT+JW` -- printed 6560 oz-in^2. */
export const PRINTED_LOAD_INERTIA_OZ_IN2 = 6560;
export const PRINTED_LOAD_INERTIA_KGM2 =
  PRINTED_LOAD_INERTIA_OZ_IN2 * OZ_IN2_TO_KGM2;

/** Table-shaft operating speed, `N = (60*theta)/(360*(t0-t1))` -- printed 22.2 r/min. */
export const PRINTED_TABLE_SPEED_RPM = 22.2;

export { GEAR_RATIO };
