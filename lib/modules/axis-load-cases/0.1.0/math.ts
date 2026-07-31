/**
 * Pure SI-number kernel for the in-progress axis-load-cases module.
 *
 * This is deliberately not a ModulePackage yet: the historical source phases
 * have not been classified as normal/peak/holding/emergency-stop cases, and
 * the package must remain absent from the generated module registry until its
 * contract and evidence are release-ready. Values become EngineeringValues only
 * at a future module-package boundary; bare numbers remain internal here.
 */

export type AxisOrientation = "horizontal" | "vertical" | "inclined";
export type TravelDirection = "positive" | "negative" | "stationary";
export type AxisVector = readonly [number, number, number];

export interface AxisLoadPhaseInput {
  readonly orientation: AxisOrientation;
  /** Incline above horizontal, in radians, using the Stage 1 `axis.v1` frame. */
  readonly inclineAngleRad: number;
  readonly totalMovingMassKg: number;
  readonly gravityMps2: number;
  /** Scalar Coulomb coefficient; the normal load is supplied explicitly. */
  readonly frictionCoefficient: number;
  /** Explicit normal load used for the Coulomb term, in N. */
  readonly normalLoadN: number;
  /** Additional documented guide/seal running resistance magnitude, in N. */
  readonly guideResistanceN: number;
  /** Travel state determines the direction of running-resistance forces. */
  readonly travelDirection: TravelDirection;
  /** Signed translational acceleration in the axis +X direction, in m/s^2. */
  readonly axialAccelerationMps2: number;
  /** Applied external force at the carriage reference point, resolved in axis.v1. */
  readonly externalForceN?: AxisVector;
  /** Applied external moment at the carriage reference point, resolved in axis.v1. */
  readonly externalMomentNm?: AxisVector;
  /** Combined centre-of-mass offset from the carriage reference point, in axis.v1. */
  readonly centerOfMassM?: AxisVector;
}

export interface AxisLoadPhaseResult {
  readonly gravityAccelerationMps2: AxisVector;
  readonly gravitationalForceN: AxisVector;
  readonly gravitationalMomentNm: AxisVector;
  readonly frictionForceN: AxisVector;
  readonly guideResistanceForceN: AxisVector;
  readonly externalForceN: AxisVector;
  readonly resultantAppliedForceN: AxisVector;
  readonly resultantAppliedMomentNm: AxisVector;
  /** Signed drive force the actuator must apply in +X. */
  readonly requiredAxialDriveForceN: number;
}

/** Thrown when an input falls outside the explicit Stage 1 validity envelope. */
export class AxisLoadPhaseInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AxisLoadPhaseInputError";
  }
}

const ZERO: AxisVector = [0, 0, 0];
const ANGLE_TOLERANCE = 1e-12;

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function vector(x: number, y: number, z: number): AxisVector {
  return [normalizeZero(x), normalizeZero(y), normalizeZero(z)];
}

function fail(message: string): never {
  throw new AxisLoadPhaseInputError(message);
}

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) fail(`${name} must be finite.`);
}

function assertNonNegative(name: string, value: number): void {
  assertFinite(name, value);
  if (value < 0) fail(`${name} must not be negative.`);
}

function isClose(a: number, b: number): boolean {
  return Math.abs(a - b) <= ANGLE_TOLERANCE;
}

function assertVector(
  name: string,
  value: readonly number[],
): asserts value is AxisVector {
  if (value.length !== 3)
    fail(`${name} must have exactly three axis.v1 components.`);
  for (const component of value) assertFinite(name, component);
}

function add(a: AxisVector, b: AxisVector): AxisVector {
  return vector(a[0] + b[0], a[1] + b[1], a[2] + b[2]);
}

function scale(input: AxisVector, scalar: number): AxisVector {
  return vector(input[0] * scalar, input[1] * scalar, input[2] * scalar);
}

/** Cross product for vectors expressed in the right-handed `axis.v1` frame. */
export function cross(a: AxisVector, b: AxisVector): AxisVector {
  return vector(
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  );
}

function assertOrientation(input: AxisLoadPhaseInput): void {
  const { inclineAngleRad, orientation } = input;
  if (
    orientation !== "horizontal" &&
    orientation !== "vertical" &&
    orientation !== "inclined"
  ) {
    fail(
      `orientation must be horizontal, vertical, or inclined; got "${orientation}".`,
    );
  }
  assertFinite("inclineAngleRad", inclineAngleRad);
  if (inclineAngleRad < 0 || inclineAngleRad > Math.PI / 2) {
    fail("inclineAngleRad must be between 0 and pi/2 for axis.v1.");
  }

  if (orientation === "horizontal" && !isClose(inclineAngleRad, 0)) {
    fail("A horizontal axis must use a zero incline angle.");
  }
  if (orientation === "vertical" && !isClose(inclineAngleRad, Math.PI / 2)) {
    fail("A vertical axis must use an incline angle of pi/2.");
  }
  if (
    orientation === "inclined" &&
    (isClose(inclineAngleRad, 0) || isClose(inclineAngleRad, Math.PI / 2))
  ) {
    fail(
      "An inclined axis must use an angle strictly between horizontal and vertical.",
    );
  }
}

function resistanceForce(
  magnitude: number,
  travelDirection: TravelDirection,
): AxisVector {
  if (travelDirection === "stationary") return ZERO;
  return vector(travelDirection === "positive" ? -magnitude : magnitude, 0, 0);
}

function validateInput(input: AxisLoadPhaseInput): void {
  assertOrientation(input);
  if (
    input.travelDirection !== "positive" &&
    input.travelDirection !== "negative" &&
    input.travelDirection !== "stationary"
  ) {
    fail(
      `travelDirection must be positive, negative, or stationary; got "${input.travelDirection}".`,
    );
  }
  assertNonNegative("totalMovingMassKg", input.totalMovingMassKg);
  assertNonNegative("gravityMps2", input.gravityMps2);
  assertFinite("frictionCoefficient", input.frictionCoefficient);
  if (input.frictionCoefficient < 0 || input.frictionCoefficient > 1) {
    fail("frictionCoefficient must be between 0 and 1.");
  }
  assertNonNegative("normalLoadN", input.normalLoadN);
  assertNonNegative("guideResistanceN", input.guideResistanceN);
  assertFinite("axialAccelerationMps2", input.axialAccelerationMps2);

  if (input.travelDirection === "stationary") {
    if (!isClose(input.axialAccelerationMps2, 0)) {
      fail("A stationary phase must have zero axial acceleration.");
    }
    if (!isClose(input.guideResistanceN, 0)) {
      fail(
        "A stationary phase must not claim a running guide-resistance force.",
      );
    }
  }

  assertVector("externalForceN", input.externalForceN ?? ZERO);
  assertVector("externalMomentNm", input.externalMomentNm ?? ZERO);
  assertVector("centerOfMassM", input.centerOfMassM ?? ZERO);
}

/**
 * Resolves one source-defined phase in the Stage 1 `axis.v1` frame.
 *
 * `resultantAppliedForceN` includes gravity, friction, guide resistance, and
 * declared external force. `resultantAppliedMomentNm` includes only gravity's
 * centre-of-mass moment and declared external moment; inertial moments and
 * guide reactions are intentionally outside this kernel's validity envelope.
 */
export function resolveAxisLoadPhase(
  input: AxisLoadPhaseInput,
): AxisLoadPhaseResult {
  validateInput(input);

  const externalForceN = input.externalForceN ?? ZERO;
  const externalMomentNm = input.externalMomentNm ?? ZERO;
  const centerOfMassM = input.centerOfMassM ?? ZERO;
  const gravityAccelerationMps2 = vector(
    -input.gravityMps2 * Math.sin(input.inclineAngleRad),
    0,
    -input.gravityMps2 * Math.cos(input.inclineAngleRad),
  );
  const gravitationalForceN = scale(
    gravityAccelerationMps2,
    input.totalMovingMassKg,
  );
  const gravitationalMomentNm = cross(centerOfMassM, gravitationalForceN);
  const frictionForceN = resistanceForce(
    input.frictionCoefficient * input.normalLoadN,
    input.travelDirection,
  );
  const guideResistanceForceN = resistanceForce(
    input.guideResistanceN,
    input.travelDirection,
  );
  const resultantAppliedForceN = add(
    add(gravitationalForceN, frictionForceN),
    add(guideResistanceForceN, externalForceN),
  );
  const resultantAppliedMomentNm = add(gravitationalMomentNm, externalMomentNm);

  return {
    gravityAccelerationMps2,
    gravitationalForceN,
    gravitationalMomentNm,
    frictionForceN,
    guideResistanceForceN,
    externalForceN,
    resultantAppliedForceN,
    resultantAppliedMomentNm,
    requiredAxialDriveForceN:
      input.totalMovingMassKg * input.axialAccelerationMps2 -
      resultantAppliedForceN[0],
  };
}
