// Public surface of the unit registry and conversion engine (Unit 1.2).

export type { Dimension } from "./dimension";
export {
  DIMENSIONLESS,
  dimension,
  dimensionsEqual,
  addDimensions,
  subtractDimensions,
  isDimensionless,
  dimensionKey,
  canonicalDimensionSymbol,
} from "./dimension";

export type { UnitDefinition } from "./registry";
export {
  Dimensions,
  hasUnit,
  getUnit,
  preferredSymbol,
  listUnits,
} from "./registry";

export {
  UnknownUnitError,
  DimensionMismatchError,
  AffineUnitError,
  NonFiniteValueError,
} from "./errors";

export { makeQuantity, getDimensionOf, quantityDimension } from "./quantity";
export { convert, convertQuantity } from "./convert";
export {
  addQuantities,
  subtractQuantities,
  multiplyQuantities,
  divideQuantities,
  scaleQuantity,
  rotationalPower,
  torqueFromPower,
  angularVelocityFromPower,
} from "./arithmetic";

export type { FormatQuantityOptions } from "./formatting";
export {
  toSignificantFigures,
  formatSignificant,
  formatQuantity,
} from "./formatting";
