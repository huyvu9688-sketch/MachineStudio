/**
 * Rotational Newton's second law: the torque needed to angularly accelerate a
 * known inertia, and the angular acceleration a speed ramp implies.
 *
 * Like `./inertia.ts`, these are source-independent rigid-body dynamics rather
 * than a manufacturer's own selection method, which is why they live in
 * `lib/engine` — see `context/adr/0011-motor-sizing-tool-architecture.md`
 * "Reuse policy". Oriental Motor Co., Ltd., *Motor Sizing Calculations*
 * (`jp.oriental_motor.motor_sizing_calculations@web-2026-08-08`, cached at
 * `reference/source-material/Oriental_Motor Sizing Calculators.pdf`, p. 5,
 * "Acceleration Torque") states the same relationship as `Ta = J x A` and
 * packages it for r/min speeds as `Ta = J*N/(9.55*t1)`; `torque.test.ts`
 * confirms this package reproduces that packaged form to within the rounding
 * of the printed 9.55 constant (exactly `30/pi`).
 *
 * Contract: bare numbers in SI-coherent units, as in `./inertia.ts`.
 *
 * Note on units: this project's unit registry tracks angle as its own base
 * dimension, so `inertia * angularAcceleration` is dimensionally
 * `kg*m^2*rad*s^-2`, not `N*m`, and generic `multiplyQuantities` cannot
 * express it — the same angle-exponent cancellation `lib/engine/units/
 * arithmetic.ts` already documents for `P = T*omega`. `Ta = J*alpha` is a
 * reviewed case where the radian cancels (radian is dimensionless, NIST
 * SP811). Callers here work in bare numbers, so the cancellation is a
 * documented property of this function rather than a registry rule; a
 * `Quantity`-level counterpart belongs beside `rotationalPower` in
 * `arithmetic.ts` if a caller ever needs one, and is deliberately not added
 * ahead of that caller.
 */

import { MechanicsInputError } from "./errors";

function assertFinite(argument: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new MechanicsInputError(
      argument,
      `${argument} must be a finite number, received: ${value}`,
    );
  }
}

function assertNonNegative(argument: string, value: number): void {
  assertFinite(argument, value);
  if (value < 0) {
    throw new MechanicsInputError(
      argument,
      `${argument} must not be negative, received: ${value}`,
    );
  }
}

function assertPositive(argument: string, value: number): void {
  assertFinite(argument, value);
  if (value <= 0) {
    throw new MechanicsInputError(
      argument,
      `${argument} must be positive, received: ${value}`,
    );
  }
}

export interface AccelerationTorqueInput {
  /**
   * Moment of inertia seen at the accelerating shaft, in kg*m^2. Must be >= 0
   * (zero is admissible — a massless idealization contributes no torque).
   */
  readonly inertiaKgM2: number;
  /**
   * Angular acceleration `alpha`, in rad/s^2. Signed: a negative value is a
   * deceleration and yields a negative torque.
   */
  readonly angularAccelerationRadPerS2: number;
}

export interface AccelerationTorqueResult {
  /** Torque required to produce the given angular acceleration, in N*m. */
  readonly torqueNm: number;
}

/**
 * `Ta = J * alpha`.
 *
 * The sign of `angularAccelerationRadPerS2` is preserved, so a deceleration
 * returns a negative torque. Callers that need a magnitude — a maximum
 * momentary torque, say — take the absolute value at their own boundary,
 * where they also know whether the load torque assists or opposes; deciding
 * that here would hide a real per-mechanism engineering choice inside a
 * generic physics function.
 */
export function accelerationTorque(
  input: AccelerationTorqueInput,
): AccelerationTorqueResult {
  assertNonNegative("inertiaKgM2", input.inertiaKgM2);
  assertFinite(
    "angularAccelerationRadPerS2",
    input.angularAccelerationRadPerS2,
  );

  return {
    torqueNm: input.inertiaKgM2 * input.angularAccelerationRadPerS2,
  };
}

export interface AngularAccelerationFromSpeedRampInput {
  /**
   * Change in angular velocity over the ramp, in rad/s. Signed: negative is a
   * slow-down.
   */
  readonly angularVelocityChangeRadPerS: number;
  /** Ramp (acceleration or deceleration) time, in s. Must be > 0. */
  readonly rampTimeS: number;
}

export interface AngularAccelerationResult {
  /** Constant angular acceleration over the ramp, in rad/s^2. */
  readonly angularAccelerationRadPerS2: number;
}

/**
 * `alpha = delta_omega / t` — the constant angular acceleration of a linear
 * speed ramp.
 *
 * This is the conversion that turns a motion profile's own ramp into the
 * argument {@link accelerationTorque} needs. It assumes a constant-rate
 * (trapezoidal) ramp; an S-curve profile's peak angular acceleration is
 * higher and is not what this returns.
 */
export function angularAccelerationFromSpeedRamp(
  input: AngularAccelerationFromSpeedRampInput,
): AngularAccelerationResult {
  assertFinite(
    "angularVelocityChangeRadPerS",
    input.angularVelocityChangeRadPerS,
  );
  assertPositive("rampTimeS", input.rampTimeS);

  return {
    angularAccelerationRadPerS2:
      input.angularVelocityChangeRadPerS / input.rampTimeS,
  };
}
