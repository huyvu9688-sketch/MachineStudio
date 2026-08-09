/**
 * Pure SI-number kernel for the coupling module (Unit 4.5, Stage 3 draft).
 * Resolves: torque required from power/speed (a reference-only function, not
 * this module's own compute path — see its own doc comment), service-
 * factor-scaled required torque, torque safety factor, driven-shaft
 * rotational speed derived from a linear velocity, and speed safety
 * factor — see context/modules/coupling/stage-1-spec.md and
 * stage-2-contract.md.
 *
 * This module's own compute path does NOT call
 * {@link resolveRequiredTorqueFromPower}: it consumes `screw.drive_torque`
 * (already resolved, per case) directly, per stage-2-contract.md "Decisions"
 * item 2. That function exists to reproduce KTR's and R+W's own worked
 * examples (both start from a motor's power/speed nameplate, not a
 * pre-resolved torque) as reference-example evidence — the same "kept as a
 * tested, source-faithful reference, not the intended entry point" treatment
 * lib/modules/linear-guide/0.1.0/math.ts gives its own four installation-
 * specific functions alongside the general form it actually integrates
 * through.
 *
 * Values become EngineeringValues only at the module-package boundary; bare
 * numbers remain internal here, mirroring every other module's own math.ts.
 */

export class CouplingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CouplingInputError";
  }
}

function fail(message: string): never {
  throw new CouplingInputError(message);
}

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) fail(`${name} must be finite.`);
}

function assertPositive(name: string, value: number): void {
  assertFinite(name, value);
  if (value <= 0) fail(`${name} must be positive.`);
}

function assertNonNegative(name: string, value: number): void {
  assertFinite(name, value);
  if (value < 0) fail(`${name} must not be negative.`);
}

// --- 1. Required torque from power and speed (reference only) --------------

export interface RequiredTorqueFromPowerInput {
  /** Drive power, in W. Must be > 0. */
  readonly powerW: number;
  /** Rotational speed, in rad/s. Must be > 0. */
  readonly rotationalSpeedRadPerS: number;
}

export interface RequiredTorqueFromPowerResult {
  readonly requiredTorqueNm: number;
}

/**
 * `T = P / omega`. Elementary physics (power = torque * angular velocity),
 * not a manufacturer-specific method: both KTR's own `T_N [Nm] = 9550 *
 * P[kW] / n[1/min]` and R+W's own `T_AN [Nm] = 9550 * P_Drive[kW] /
 * n[1/min]` (context/modules/coupling/stage-1-spec.md item 1) are this same
 * relation evaluated in kilowatt/rpm units — `9550` is a rounded stand-in
 * for `60,000 / (2*pi) = 9549.30...`, not a distinct physical constant. See
 * this file's own module doc comment for why this module's own compute path
 * does not call this function.
 */
export function resolveRequiredTorqueFromPower(
  input: RequiredTorqueFromPowerInput,
): RequiredTorqueFromPowerResult {
  assertPositive("powerW", input.powerW);
  assertPositive("rotationalSpeedRadPerS", input.rotationalSpeedRadPerS);

  return {
    requiredTorqueNm: input.powerW / input.rotationalSpeedRadPerS,
  };
}

// --- 2. Service-factor-scaled required torque and torque safety factor -----

export interface ScaledRequiredTorqueInput {
  /** Required torque magnitude before scaling, in N*m. Must be > 0. */
  readonly requiredTorqueNm: number;
  /**
   * Consolidated correction factor (`coupling.service_factor`). Must be > 0.
   * See context/modules/coupling/stage-2-contract.md "Decisions" item 5 for
   * why this is one consolidated factor rather than KTR's or R+W's own
   * separate operating/temperature/starting/direction factors.
   */
  readonly serviceFactor: number;
}

export interface ScaledRequiredTorqueResult {
  readonly scaledRequiredTorqueNm: number;
}

/**
 * `T_required,scaled = |T_required| * S`. KTR: `T_KN >= T_N * S_B * S_t *
 * S_R`; R+W: `T_KN >= T_AN * S_A * S_v * S_z` — both a required torque
 * scaled up by a product of correction factors, collapsed here into one
 * `serviceFactor` (stage-2-contract.md "Decisions" item 5).
 */
export function resolveScaledRequiredTorque(
  input: ScaledRequiredTorqueInput,
): ScaledRequiredTorqueResult {
  assertPositive("requiredTorqueNm", Math.abs(input.requiredTorqueNm));
  assertPositive("serviceFactor", input.serviceFactor);

  return {
    scaledRequiredTorqueNm:
      Math.abs(input.requiredTorqueNm) * input.serviceFactor,
  };
}

export interface TorqueSafetyFactorInput {
  /** The coupling's own catalog torque capacity for this check, in N*m. Must be > 0. */
  readonly capacityTorqueNm: number;
  /** Service-factor-scaled required torque, in N*m. Must be > 0. */
  readonly scaledRequiredTorqueNm: number;
}

export interface TorqueSafetyFactorResult {
  readonly torqueSafetyFactor: number;
}

/**
 * `fs_T = T_capacity / T_required,scaled`. `capacityTorqueNm` is
 * `coupling.rated_torque` for the steady (`normal`-case) check or
 * `coupling.max_torque` for the shock (`peak`-case) check — the caller
 * selects which (stage-2-contract.md "Decisions" item 4).
 */
export function resolveTorqueSafetyFactor(
  input: TorqueSafetyFactorInput,
): TorqueSafetyFactorResult {
  assertPositive("capacityTorqueNm", input.capacityTorqueNm);
  assertPositive("scaledRequiredTorqueNm", input.scaledRequiredTorqueNm);

  return {
    torqueSafetyFactor: input.capacityTorqueNm / input.scaledRequiredTorqueNm,
  };
}

// --- 3. Operating rotational speed and speed safety factor ------------------

export interface OperatingSpeedInput {
  /**
   * Axis linear velocity magnitude for this load case
   * (`motion.axis.case_linear_velocity`), in m/s. Must be `>= 0` — zero is a
   * real case (e.g. a peak-torque case at start-up, before the axis
   * moves — see context/modules/coupling/stage-1-spec.md "Checks
   * (Proposed)"), not rejected here, though {@link resolveSpeedSafetyFactor}
   * below does reject a zero *result*, for the same reason
   * lib/modules/linear-guide/0.1.0's own zero-equivalent-load case is
   * rejected rather than reported as an infinite safety factor.
   */
  readonly linearVelocityMps: number;
  /** Ball-screw lead (`screw.lead`), in m. Must be > 0. */
  readonly leadM: number;
  /**
   * Ball-screw-to-driving-shaft gear ratio (`screw.gear_ratio`). Must be > 0.
   * The coupling sits on the driving shaft, which turns faster than the
   * screw by exactly this ratio for an ideal gearbox (the same speed-ratio
   * `screw.drive_torque`'s own `/ gearRatio` torque scaling already implies
   * by power conservation) — `1` for a direct-connected screw with no
   * gearbox in between.
   */
  readonly gearRatio: number;
}

export interface OperatingSpeedResult {
  readonly rotationalSpeedRadPerS: number;
}

/**
 * `n_screw = v / lead` (rev/s), `n_driving = n_screw * 2*pi * gearRatio`
 * (rad/s) — the same conversion `ball-screw`'s own kernel already trusts
 * internally (`resolveRotationalSpeed`, `n = v / lead`), reproduced here
 * rather than imported: this module has no dependency on `ball-screw`'s own
 * package internals, only on the parameter ports both modules share
 * (context/modules/coupling/stage-2-contract.md "Decisions" item 1).
 */
export function resolveOperatingSpeed(
  input: OperatingSpeedInput,
): OperatingSpeedResult {
  assertNonNegative("linearVelocityMps", input.linearVelocityMps);
  assertPositive("leadM", input.leadM);
  assertPositive("gearRatio", input.gearRatio);

  const screwRevPerS = input.linearVelocityMps / input.leadM;
  return {
    rotationalSpeedRadPerS: screwRevPerS * 2 * Math.PI * input.gearRatio,
  };
}

export interface SpeedSafetyFactorInput {
  /** The coupling's own catalog allowable rotational speed, in rad/s. Must be > 0. */
  readonly allowableSpeedRadPerS: number;
  /** Operating rotational speed for this case, in rad/s. Must be > 0. */
  readonly operatingSpeedRadPerS: number;
}

export interface SpeedSafetyFactorResult {
  readonly speedSafetyFactor: number;
}

/**
 * `fs_n = n_allowable / n_operating`. Requires a strictly positive operating
 * speed: a zero-speed case is a real scenario {@link resolveOperatingSpeed}
 * permits (see its own doc comment), but it is not supported *by this
 * check* — reporting an infinite safety factor would misrepresent an
 * unbounded margin as a finite number, the same "throw rather than report
 * infinity" treatment `linear-guide`'s own zero-equivalent-load case
 * receives.
 */
export function resolveSpeedSafetyFactor(
  input: SpeedSafetyFactorInput,
): SpeedSafetyFactorResult {
  assertPositive("allowableSpeedRadPerS", input.allowableSpeedRadPerS);
  assertPositive("operatingSpeedRadPerS", input.operatingSpeedRadPerS);

  return {
    speedSafetyFactor:
      input.allowableSpeedRadPerS / input.operatingSpeedRadPerS,
  };
}
