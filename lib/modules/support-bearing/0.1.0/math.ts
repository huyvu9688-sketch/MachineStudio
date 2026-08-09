/**
 * Pure SI-number kernel for the support-bearing module (Unit 4.6, Stage 3
 * draft). Resolves: dynamic and static equivalent load, basic (L10) rating
 * life and its hours conversion, static safety factor, operating rotational
 * speed derived from a linear velocity, and speed safety factor — see
 * context/modules/support-bearing/stage-1-spec.md and stage-2-contract.md.
 *
 * All formulas below are NTN Corporation's own general rolling-bearing
 * selection methodology (jp.ntn.rolling_bearings_handbook, CAT. No.
 * 9012-@/E, chapters 6-7 and 10), not a support-bearing-specific method —
 * THK's own Support Unit catalog chapter gives per-model catalog values
 * (Ca/C0, bore/OD, preload) but no life or safety-factor formula of its own
 * (stage-1-spec.md "Candidate Sources" item 1).
 *
 * Deliberately NOT implemented in 0.1.0: NTN's own speed correction factors
 * fL/fC (handbook Ch. 10, Figs. 10.1-10.2), which are printed only as
 * graphs, not closed-form equations. The catalog allowable speed is used
 * uncorrected — a documented simplification, not silently assumed to be
 * always safe (see resolveSpeedSafetyFactor's own doc comment).
 *
 * Values become EngineeringValues only at the module-package boundary; bare
 * numbers remain internal here, mirroring every other module's own math.ts.
 */

export class SupportBearingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupportBearingInputError";
  }
}

function fail(message: string): never {
  throw new SupportBearingInputError(message);
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

// --- 1. Dynamic and static equivalent load ----------------------------------

export interface DynamicEquivalentLoadInput {
  /** Actual radial load, in N. Must be >= 0. */
  readonly radialLoadN: number;
  /** Actual axial load, in N. Must be >= 0 (0 for a floating/supported-side bearing). */
  readonly axialLoadN: number;
  /** Dynamic equivalent load radial factor (bearing.dynamic_load_factor_x). Must be >= 0. */
  readonly factorX: number;
  /** Dynamic equivalent load axial factor (bearing.dynamic_load_factor_y). Must be >= 0. */
  readonly factorY: number;
}

export interface DynamicEquivalentLoadResult {
  readonly dynamicEquivalentLoadN: number;
}

/**
 * `P = X*Fr + Y*Fa` (jp.ntn.rolling_bearings_handbook eq. 7.10).
 */
export function resolveDynamicEquivalentLoad(
  input: DynamicEquivalentLoadInput,
): DynamicEquivalentLoadResult {
  assertNonNegative("radialLoadN", input.radialLoadN);
  assertNonNegative("axialLoadN", input.axialLoadN);
  assertNonNegative("factorX", input.factorX);
  assertNonNegative("factorY", input.factorY);

  return {
    dynamicEquivalentLoadN:
      input.factorX * input.radialLoadN + input.factorY * input.axialLoadN,
  };
}

export interface StaticEquivalentLoadInput {
  /** Actual radial load, in N. Must be >= 0. */
  readonly radialLoadN: number;
  /** Actual axial load, in N. Must be >= 0. */
  readonly axialLoadN: number;
  /** Static equivalent load radial factor (bearing.static_load_factor_x). Must be >= 0. */
  readonly factorX0: number;
  /** Static equivalent load axial factor (bearing.static_load_factor_y). Must be >= 0. */
  readonly factorY0: number;
}

export interface StaticEquivalentLoadResult {
  readonly staticEquivalentLoadN: number;
}

/**
 * `P0 = max(X0*Fr + Y0*Fa, Fr)` — NTN's own text: "The larger one of the
 * values calculated by equations 7.12 and 7.13 is used for static
 * equivalent radial load" (eq. 7.12: `P0r = X0*Fr + Y0*Fa`; eq. 7.13:
 * `P0r = Fr`).
 */
export function resolveStaticEquivalentLoad(
  input: StaticEquivalentLoadInput,
): StaticEquivalentLoadResult {
  assertNonNegative("radialLoadN", input.radialLoadN);
  assertNonNegative("axialLoadN", input.axialLoadN);
  assertNonNegative("factorX0", input.factorX0);
  assertNonNegative("factorY0", input.factorY0);

  const combined =
    input.factorX0 * input.radialLoadN + input.factorY0 * input.axialLoadN;
  return {
    staticEquivalentLoadN: Math.max(combined, input.radialLoadN),
  };
}

// --- 2. Basic rating life and hours conversion -------------------------------

export interface NominalLifeInput {
  /** Basic dynamic load rating from the bearing's own catalog data, in N. Must be > 0. */
  readonly dynamicLoadRatingN: number;
  /** Dynamic equivalent load, in N. Must be > 0 -- a true zero-load case is degenerate (see this function's own doc comment). */
  readonly equivalentLoadN: number;
}

export interface NominalLifeResult {
  readonly lifeRevolutions: number;
}

/**
 * `L10 = (C/P)^3 * 10^6` (jp.ntn.rolling_bearings_handbook eq. 6.1, `p = 3`
 * for ball bearings). A zero equivalent load is rejected rather than
 * reported as an infinite life -- the same "throw rather than report
 * infinity" treatment `linear-guide`'s own zero-equivalent-load case and
 * `coupling`'s own zero-operating-speed case already receive.
 */
export function resolveNominalLife(input: NominalLifeInput): NominalLifeResult {
  assertPositive("dynamicLoadRatingN", input.dynamicLoadRatingN);
  assertPositive("equivalentLoadN", input.equivalentLoadN);

  return {
    lifeRevolutions:
      (input.dynamicLoadRatingN / input.equivalentLoadN) ** 3 * 1e6,
  };
}

export interface LifeHoursInput {
  /** Nominal life, in revolutions. Must be > 0. */
  readonly lifeRevolutions: number;
  /** Operating rotational speed, in rev/min. Must be > 0. */
  readonly rotationalSpeedRevPerMin: number;
}

export interface LifeHoursResult {
  readonly lifeHours: number;
}

/**
 * `L10h = L10 / (60*n)`, the exact algebraic form of
 * jp.ntn.rolling_bearings_handbook eq. 6.2 (`L10h = 10^6/(60n) * (C/P)^p`)
 * once `L10` already carries the `10^6` factor, the same identity
 * `ball-screw`'s own `resolveLifeHours` already uses.
 */
export function resolveLifeHours(input: LifeHoursInput): LifeHoursResult {
  assertPositive("lifeRevolutions", input.lifeRevolutions);
  assertPositive("rotationalSpeedRevPerMin", input.rotationalSpeedRevPerMin);

  return {
    lifeHours: input.lifeRevolutions / (input.rotationalSpeedRevPerMin * 60),
  };
}

// --- 3. Static safety factor -------------------------------------------------

export interface StaticSafetyFactorInput {
  /** Basic static load rating from the bearing's own catalog data, in N. Must be > 0. */
  readonly staticLoadRatingN: number;
  /** Static equivalent load, in N. Must be > 0. */
  readonly staticEquivalentLoadN: number;
}

export interface StaticSafetyFactorResult {
  readonly staticSafetyFactor: number;
}

/**
 * `S0 = C0 / P0` (jp.ntn.rolling_bearings_handbook eq. 6.6).
 */
export function resolveStaticSafetyFactor(
  input: StaticSafetyFactorInput,
): StaticSafetyFactorResult {
  assertPositive("staticLoadRatingN", input.staticLoadRatingN);
  assertPositive("staticEquivalentLoadN", input.staticEquivalentLoadN);

  return {
    staticSafetyFactor: input.staticLoadRatingN / input.staticEquivalentLoadN,
  };
}

// --- 4. Operating rotational speed and speed safety factor ------------------

export interface OperatingSpeedInput {
  /** Axis linear velocity magnitude for this load case (`motion.axis.case_linear_velocity`), in m/s. Must be `>= 0`. */
  readonly linearVelocityMps: number;
  /** Ball-screw lead (`screw.lead`), in m. Must be > 0. */
  readonly leadM: number;
}

export interface OperatingSpeedResult {
  readonly rotationalSpeedRevPerMin: number;
  readonly rotationalSpeedRadPerS: number;
}

/**
 * `n = v / lead` (rev/s). The support bearing mounts directly on the screw
 * shaft itself, not a driving/motor shaft through a gearbox, so there is no
 * `screw.gear_ratio` term here, unlike `coupling 0.1.0`'s own driving-shaft
 * speed (context/modules/support-bearing/stage-2-contract.md "Existing
 * Parameter Mapping"). Reproduces the same physics `ball-screw`'s own
 * kernel already trusts internally, mirrored rather than imported.
 */
export function resolveOperatingSpeed(
  input: OperatingSpeedInput,
): OperatingSpeedResult {
  assertNonNegative("linearVelocityMps", input.linearVelocityMps);
  assertPositive("leadM", input.leadM);

  const revPerS = input.linearVelocityMps / input.leadM;
  return {
    rotationalSpeedRevPerMin: revPerS * 60,
    rotationalSpeedRadPerS: revPerS * 2 * Math.PI,
  };
}

export interface SpeedSafetyFactorInput {
  /** The bearing's own catalog allowable rotational speed, in rad/s. Must be > 0. */
  readonly allowableSpeedRadPerS: number;
  /** Operating rotational speed for this case, in rad/s. Must be > 0. */
  readonly operatingSpeedRadPerS: number;
}

export interface SpeedSafetyFactorResult {
  readonly speedSafetyFactor: number;
}

/**
 * `fs_n = n_allowable / n_operating`, using the catalog allowable speed
 * uncorrected (this module's own doc comment explains why NTN's own fL/fC
 * correction factors are not implemented in 0.1.0). Requires a strictly
 * positive operating speed: a zero-speed case is not supported by this
 * check, the same "throw rather than report infinity" treatment
 * `coupling`'s own zero-operating-speed case receives.
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
