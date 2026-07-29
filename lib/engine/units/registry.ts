// Unit registry (Unit 1.2). A fixed table of named units, each mapped to its
// physical dimension and a factor/offset that converts it to the SI-coherent
// magnitude for that dimension. Every arithmetic result is expressed in the
// "SI-coherent" unit of its dimension (the registered unit whose factor is 1),
// which is how composite units simplify (e.g. N * m -> "N*m").
//
// This registry is closed for the MVP: adding a unit is a reviewed change, not
// something modules do at runtime. Module code must never hardcode a
// conversion constant; it goes through this package (Unit 1.2 exit criterion).

import {
  dimension,
  dimensionKey,
  type Dimension,
} from "./dimension";
import { UnknownUnitError } from "./errors";

/** A single registered unit. */
export interface UnitDefinition {
  /** Unique unit symbol, e.g. `"mm"`, `"N*m"`, `"rpm"`. */
  readonly symbol: string;
  /** Physical dimension of the unit. */
  readonly dimension: Dimension;
  /** Multiply a value in this unit by `factor` to get the SI-coherent magnitude. */
  readonly factor: number;
  /** Affine offset: `siMagnitude = value * factor + offset`. Zero unless affine. */
  readonly offset: number;
  /** True for temperature scales with a non-zero zero point (degC, degF). */
  readonly affine: boolean;
  /** True for the one SI-coherent unit of its dimension (`factor === 1`). */
  readonly siCoherent: boolean;
}

/** Named dimensions shared by the registry and available for reuse. */
export const Dimensions = {
  dimensionless: dimension({}),
  length: dimension({ length: 1 }),
  mass: dimension({ mass: 1 }),
  time: dimension({ time: 1 }),
  temperature: dimension({ temperature: 1 }),
  angle: dimension({ angle: 1 }),
  force: dimension({ mass: 1, length: 1, time: -2 }),
  torque: dimension({ mass: 1, length: 2, time: -2 }),
  speed: dimension({ length: 1, time: -1 }),
  acceleration: dimension({ length: 1, time: -2 }),
  angularVelocity: dimension({ angle: 1, time: -1 }),
  angularAcceleration: dimension({ angle: 1, time: -2 }),
  power: dimension({ mass: 1, length: 2, time: -3 }),
  pressure: dimension({ mass: 1, length: -1, time: -2 }),
  inertia: dimension({ mass: 1, length: 2 }),
  frequency: dimension({ time: -1 }),
} as const;

// Reference constants (exact where defined by standard).
const LBF_TO_N = 4.4482216152605;
const IN_TO_M = 0.0254;
const FT_TO_M = 0.3048;
const LBM_TO_KG = 0.45359237;
const HP_TO_W = 745.6998715822702;
const PSI_TO_PA = 6894.757293168361;
const DEG_TO_RAD = Math.PI / 180;
const RPM_TO_RAD_PER_S = (2 * Math.PI) / 60;
const FAHRENHEIT_SCALE = 5 / 9;

interface DefOptions {
  offset?: number;
  affine?: boolean;
  siCoherent?: boolean;
}

function def(
  symbol: string,
  dim: Dimension,
  factor: number,
  options: DefOptions = {},
): UnitDefinition {
  return {
    symbol,
    dimension: dim,
    factor,
    offset: options.offset ?? 0,
    affine: options.affine ?? false,
    siCoherent: options.siCoherent ?? false,
  };
}

const UNIT_LIST: readonly UnitDefinition[] = [
  // Length
  def("m", Dimensions.length, 1, { siCoherent: true }),
  def("mm", Dimensions.length, 1e-3),
  def("cm", Dimensions.length, 1e-2),
  def("in", Dimensions.length, IN_TO_M),
  def("ft", Dimensions.length, FT_TO_M),
  // Time
  def("s", Dimensions.time, 1, { siCoherent: true }),
  def("min", Dimensions.time, 60),
  def("h", Dimensions.time, 3600),
  // Mass
  def("kg", Dimensions.mass, 1, { siCoherent: true }),
  def("g", Dimensions.mass, 1e-3),
  def("lbm", Dimensions.mass, LBM_TO_KG),
  // Force
  def("N", Dimensions.force, 1, { siCoherent: true }),
  def("kN", Dimensions.force, 1e3),
  def("lbf", Dimensions.force, LBF_TO_N),
  // Torque
  def("N*m", Dimensions.torque, 1, { siCoherent: true }),
  def("N*mm", Dimensions.torque, 1e-3),
  def("lbf*in", Dimensions.torque, LBF_TO_N * IN_TO_M),
  def("lbf*ft", Dimensions.torque, LBF_TO_N * FT_TO_M),
  // Linear speed
  def("m/s", Dimensions.speed, 1, { siCoherent: true }),
  def("mm/s", Dimensions.speed, 1e-3),
  def("in/s", Dimensions.speed, IN_TO_M),
  // Linear acceleration
  def("m/s^2", Dimensions.acceleration, 1, { siCoherent: true }),
  def("mm/s^2", Dimensions.acceleration, 1e-3),
  def("in/s^2", Dimensions.acceleration, IN_TO_M),
  // Angle
  def("rad", Dimensions.angle, 1, { siCoherent: true }),
  def("deg", Dimensions.angle, DEG_TO_RAD),
  // Angular velocity
  def("rad/s", Dimensions.angularVelocity, 1, { siCoherent: true }),
  def("rpm", Dimensions.angularVelocity, RPM_TO_RAD_PER_S),
  // Angular acceleration
  def("rad/s^2", Dimensions.angularAcceleration, 1, { siCoherent: true }),
  // Power
  def("W", Dimensions.power, 1, { siCoherent: true }),
  def("kW", Dimensions.power, 1e3),
  def("hp", Dimensions.power, HP_TO_W),
  // Pressure
  def("Pa", Dimensions.pressure, 1, { siCoherent: true }),
  def("kPa", Dimensions.pressure, 1e3),
  def("MPa", Dimensions.pressure, 1e6),
  def("bar", Dimensions.pressure, 1e5),
  def("psi", Dimensions.pressure, PSI_TO_PA),
  // Mass moment of inertia
  def("kg*m^2", Dimensions.inertia, 1, { siCoherent: true }),
  def("kg*cm^2", Dimensions.inertia, 1e-4),
  def("g*cm^2", Dimensions.inertia, 1e-7),
  // Temperature (K is multiplicative/absolute; degC and degF are affine)
  def("K", Dimensions.temperature, 1, { siCoherent: true }),
  def("degC", Dimensions.temperature, 1, { offset: 273.15, affine: true }),
  def("degF", Dimensions.temperature, FAHRENHEIT_SCALE, {
    offset: 273.15 - 32 * FAHRENHEIT_SCALE,
    affine: true,
  }),
  // Frequency
  def("Hz", Dimensions.frequency, 1, { siCoherent: true }),
  // Dimensionless
  def("ratio", Dimensions.dimensionless, 1, { siCoherent: true }),
  def("percent", Dimensions.dimensionless, 1e-2),
  def("efficiency", Dimensions.dimensionless, 1),
];

const REGISTRY: ReadonlyMap<string, UnitDefinition> = new Map(
  UNIT_LIST.map((unit) => [unit.symbol, unit]),
);

// SI-coherent symbol per dimension, used to name arithmetic results. Built once
// and validated: each dimension may have at most one SI-coherent unit.
const PREFERRED_BY_DIMENSION: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const unit of UNIT_LIST) {
    if (!unit.siCoherent) continue;
    const key = dimensionKey(unit.dimension);
    const existing = map.get(key);
    if (existing !== undefined) {
      throw new Error(
        `Two SI-coherent units share a dimension: "${existing}" and "${unit.symbol}"`,
      );
    }
    map.set(key, unit.symbol);
  }
  return map;
})();

/** True when `symbol` is a registered unit. */
export function hasUnit(symbol: string): boolean {
  return REGISTRY.has(symbol);
}

/** Returns the definition for `symbol`, or throws {@link UnknownUnitError}. */
export function getUnit(symbol: string): UnitDefinition {
  const unit = REGISTRY.get(symbol);
  if (unit === undefined) throw new UnknownUnitError(symbol);
  return unit;
}

/**
 * The SI-coherent unit symbol for a dimension (e.g. `"N*m"` for torque), or
 * `undefined` when no registered unit is SI-coherent for it.
 */
export function preferredSymbol(dim: Dimension): string | undefined {
  return PREFERRED_BY_DIMENSION.get(dimensionKey(dim));
}

/** All registered unit definitions, in registration order. */
export function listUnits(): readonly UnitDefinition[] {
  return UNIT_LIST;
}
