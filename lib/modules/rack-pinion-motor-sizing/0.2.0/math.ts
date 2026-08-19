/**
 * Pure SI-number kernel for the rack-pinion-motor-sizing module (Unit 6.4,
 * Stage 3). Resolves: pinion inertia, load inertia (pinion + carriage),
 * reflected load inertia, total system inertia, and inertia ratio;
 * force/load torque via the general orientation-aware force balance;
 * operating speed; acceleration torque over a single accelerate-to-speed
 * event; momentary torque; and required torque with an engineer-supplied
 * safety factor -- see
 * context/modules/rack-pinion-motor-sizing/stage-1-spec.md and
 * stage-2-contract.md.
 *
 * Self-contained per ADR-0011 "Reuse policy": every formula below is
 * reproduced, not imported, from Oriental Motor Co., Ltd.'s and Andantex
 * USA, Inc.'s own rack-and-pinion sizing methods -- except moment of
 * inertia, `alpha = delta_omega/t`, and `Ta = J*alpha`, which are
 * genuinely imported from `lib/engine/mechanics` (Unit 6.1). This module
 * has no calculation-level dependency on `ball-screw-motor-sizing@0.1.0`,
 * `direct-drive-conveyor-motor-sizing@0.1.0`, or any Milestone-4
 * discipline module -- though its own force-balance formula is
 * algebraically identical in shape to `ball-screw-motor-sizing@0.1.0`'s
 * own `resolveDriveForce`, both tracing to the same primary source
 * printing both mechanisms' force formula identically
 * (`stage-1-spec.md` "Relationship to Existing and Planned Modules").
 *
 * Formula sources: Oriental Motor Co., Ltd., General Catalog *Technical
 * Reference* (`jp.oriental_motor.general_catalog_motor_fan_sizing@
 * f-tecref-2003-2004`, p. F-3, "Wire Belt Mechanism, Rack and Pinion
 * Mechanism"); Andantex USA, Inc. (Redex), *Modular Rack & Pinion System*
 * (`us.andantex.modular_rack_pinion_system@web-2026-08-13`, p. 62,
 * "Selection & Calculations") -- see `stage-1-spec.md` "Candidate Methods
 * and Sources" and `math.test.ts`. Atlanta Drive Systems' own two worked
 * numerical examples serve as an internal-only benchmark
 * (`omron-independent-benchmark.ts`-style test file, not cited here or in
 * `manifest.ts` -- the `axis-load-cases@0.1.0` precedent for this exact
 * document, `stage-1-spec.md` "Candidate Methods" item 4).
 *
 * Values become EngineeringValues only at the module-package boundary;
 * bare numbers remain internal here, mirroring every other module's own
 * math.ts.
 */

import {
  accelerationTorque,
  angularAccelerationFromSpeedRamp,
  linearMotionInertia,
  solidCylinderInertia,
} from "@/lib/engine";

/**
 * Standard gravitational acceleration, m/s^2. 0.2.0 hardcodes this rather
 * than taking it as an input -- no scenario in this product's scope needs a
 * different value, and `motion.axis.gravity`'s own registry constant
 * default was already exactly this figure everywhere it was used
 * (docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md
 * "Gravity"). Exported so ./math.test.ts can reference the exact same value
 * instead of repeating the literal.
 */
export const STANDARD_GRAVITY_M_PER_S2 = 9.80665;

export class RackPinionMotorSizingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RackPinionMotorSizingInputError";
  }
}

function fail(message: string): never {
  throw new RackPinionMotorSizingInputError(message);
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

// --- 1. Inertia -----------------------------------------------------------

export interface PinionInertiaInput {
  /** Pinion mass, in kg. Must be > 0. */
  readonly massKg: number;
  /** Pinion pitch diameter, in m. Must be > 0. */
  readonly diameterM: number;
}

export interface PinionInertiaResult {
  readonly inertiaKgM2: number;
}

/**
 * The pinion's own rotating inertia: `J_pinion = (1/8)*M_pinion*D^2`
 * (`lib/engine/mechanics`' `solidCylinderInertia`) -- Section F, p. F-3,
 * "Inertia of a Cylinder," `Jx = (1/8)*m*D1^2`. Direct
 * `ball-screw-motor-sizing@0.1.0`'s own `resolveScrewInertia` analog.
 */
export function resolvePinionInertia(
  input: PinionInertiaInput,
): PinionInertiaResult {
  assertPositive("massKg", input.massKg);
  assertPositive("diameterM", input.diameterM);

  return {
    inertiaKgM2: solidCylinderInertia({
      massKg: input.massKg,
      outerDiameterM: input.diameterM,
    }).inertiaKgM2,
  };
}

export interface LoadInertiaInput {
  /** The pinion's own inertia, in kg*m^2. Must be >= 0. */
  readonly pinionInertiaKgM2: number;
  /** Total moving (carriage + payload) mass, in kg. Must be > 0. */
  readonly totalMovingMassKg: number;
  /** Pinion pitch diameter, in m. Must be > 0. */
  readonly pinionPitchDiameterM: number;
}

export interface LoadInertiaResult {
  readonly loadInertiaKgM2: number;
}

/**
 * `J_W = J_pinion + m*(pi*D/(2*pi))^2 = J_pinion + m*(D/2)^2` -- the
 * pinion's own inertia plus the carriage's own linear-motion-equivalent
 * inertia at the pinion shaft (`lib/engine/mechanics`'
 * `linearMotionInertia`, with the pinion's own circumference `pi*D` as
 * travel per revolution). Combined, mirroring
 * `ball-screw-motor-sizing@0.1.0`'s own `resolveLoadInertia`
 * (`J_W = J_B + m*(P/2*pi)^2`) exactly.
 */
export function resolveLoadInertia(input: LoadInertiaInput): LoadInertiaResult {
  assertNonNegative("pinionInertiaKgM2", input.pinionInertiaKgM2);
  assertPositive("totalMovingMassKg", input.totalMovingMassKg);
  assertPositive("pinionPitchDiameterM", input.pinionPitchDiameterM);

  const carriageInertiaKgM2 = linearMotionInertia({
    massKg: input.totalMovingMassKg,
    travelPerRevolutionM: Math.PI * input.pinionPitchDiameterM,
  }).inertiaKgM2;

  return {
    loadInertiaKgM2: input.pinionInertiaKgM2 + carriageInertiaKgM2,
  };
}

export interface ReflectedLoadInertiaInput {
  readonly loadInertiaKgM2: number;
  /** Gear ratio between the pinion and the motor shaft. Must be > 0. */
  readonly gearRatio: number;
}

export interface ReflectedLoadInertiaResult {
  readonly reflectedLoadInertiaKgM2: number;
}

/** `J_L = J_W / i^2`. */
export function resolveReflectedLoadInertia(
  input: ReflectedLoadInertiaInput,
): ReflectedLoadInertiaResult {
  assertNonNegative("loadInertiaKgM2", input.loadInertiaKgM2);
  assertPositive("gearRatio", input.gearRatio);

  return {
    reflectedLoadInertiaKgM2: input.loadInertiaKgM2 / input.gearRatio ** 2,
  };
}

export interface TotalSystemInertiaInput {
  readonly motorRotorInertiaKgM2: number;
  readonly reflectedLoadInertiaKgM2: number;
}

export interface TotalSystemInertiaResult {
  readonly totalSystemInertiaKgM2: number;
}

/** `J_total = J_M + J_L`. */
export function resolveTotalSystemInertia(
  input: TotalSystemInertiaInput,
): TotalSystemInertiaResult {
  assertPositive("motorRotorInertiaKgM2", input.motorRotorInertiaKgM2);
  assertNonNegative("reflectedLoadInertiaKgM2", input.reflectedLoadInertiaKgM2);

  return {
    totalSystemInertiaKgM2:
      input.motorRotorInertiaKgM2 + input.reflectedLoadInertiaKgM2,
  };
}

export interface InertiaRatioInput {
  readonly reflectedLoadInertiaKgM2: number;
  readonly motorRotorInertiaKgM2: number;
}

export interface InertiaRatioResult {
  readonly inertiaRatio: number;
}

/** `R_J = J_L / J_M`. */
export function resolveInertiaRatio(
  input: InertiaRatioInput,
): InertiaRatioResult {
  assertNonNegative("reflectedLoadInertiaKgM2", input.reflectedLoadInertiaKgM2);
  assertPositive("motorRotorInertiaKgM2", input.motorRotorInertiaKgM2);

  return {
    inertiaRatio: input.reflectedLoadInertiaKgM2 / input.motorRotorInertiaKgM2,
  };
}

// --- 2. Force and load torque ----------------------------------------------

export interface DriveForceInput {
  /** External force along the axis of travel, in N. */
  readonly externalForceN: number;
  /** Total moving mass, in kg. Must be > 0. */
  readonly totalMovingMassKg: number;
  /** Incline angle, in rad, `0 <= theta <= pi/2`. */
  readonly inclineAngleRad: number;
  /** Coefficient of friction, `>= 0`. */
  readonly frictionCoefficient: number;
}

export interface DriveForceResult {
  readonly forceN: number;
}

/**
 * `F = F_A + m*g*(sin(theta) + mu*cos(theta))` -- the general
 * orientation-aware force balance Oriental Motor's own source states
 * identically for the ball screw and the rack-and-pinion mechanism alike
 * (`F = FA + m*(sin(alpha)+mu*cos(alpha))`, weight-based; this is the SI
 * mass/gravity form, the same transform
 * `ball-screw-motor-sizing@0.1.0`'s own `resolveDriveForce` already makes
 * -- reproduced independently here, not imported, per ADR-0011 "Reuse
 * policy"). Reduces to Atlanta's and Andantex's own `mu*M*g+M*a`
 * (horizontal, `theta=0`) and `M*g+M*a` (vertical, `theta=pi/2`) special
 * cases once the `M*a` acceleration term (handled separately by this
 * module's own `acceleration_torque`, not folded into `F`) is set aside
 * -- verified by hand this session, `math.test.ts`.
 */
export function resolveDriveForce(input: DriveForceInput): DriveForceResult {
  assertFinite("externalForceN", input.externalForceN);
  assertPositive("totalMovingMassKg", input.totalMovingMassKg);
  assertFinite("inclineAngleRad", input.inclineAngleRad);
  assertNonNegative("frictionCoefficient", input.frictionCoefficient);

  const gravityForceN =
    input.totalMovingMassKg *
    STANDARD_GRAVITY_M_PER_S2 *
    (Math.sin(input.inclineAngleRad) +
      input.frictionCoefficient * Math.cos(input.inclineAngleRad));

  return { forceN: input.externalForceN + gravityForceN };
}

export interface LoadTorqueInput {
  /** Drive force, in N. */
  readonly forceN: number;
  /** Pinion pitch diameter, in m. Must be > 0. */
  readonly pinionPitchDiameterM: number;
  /** Mechanical efficiency, `0 < eta <= 1`. */
  readonly mechanicalEfficiency: number;
  /** Gear ratio between the pinion and the motor shaft. Must be > 0. */
  readonly gearRatio: number;
}

export interface LoadTorqueResult {
  readonly loadTorqueNm: number;
}

/**
 * `T_L = F*D/(2*eta*i)` -- Oriental Motor's own rack-and-pinion
 * load-torque formula (General Catalog Technical Reference p. F-3,
 * `TL = F*D/(2*eta*i)`).
 */
export function resolveLoadTorque(input: LoadTorqueInput): LoadTorqueResult {
  assertFinite("forceN", input.forceN);
  assertPositive("pinionPitchDiameterM", input.pinionPitchDiameterM);
  assertFinite("mechanicalEfficiency", input.mechanicalEfficiency);
  if (input.mechanicalEfficiency <= 0 || input.mechanicalEfficiency > 1) {
    fail("mechanicalEfficiency must be greater than 0 and at most 1.");
  }
  assertPositive("gearRatio", input.gearRatio);

  return {
    loadTorqueNm:
      (input.forceN * input.pinionPitchDiameterM) /
      (2 * input.mechanicalEfficiency * input.gearRatio),
  };
}

// --- 3. Operating speed and acceleration torque ----------------------------

export interface OperatingSpeedInput {
  /** Commanded steady-state carriage velocity, in m/s. Must be > 0. */
  readonly targetVelocityMps: number;
  /** Pinion pitch diameter, in m. Must be > 0. */
  readonly pinionPitchDiameterM: number;
  /** Gear ratio between the pinion and the motor shaft. Must be > 0. */
  readonly gearRatio: number;
}

export interface OperatingSpeedResult {
  readonly operatingSpeedRadPerS: number;
}

/**
 * `omega_pinion = V/(D/2)`; `omega_motor = omega_pinion*i` -- motor shaft
 * rotational speed at the target carriage velocity. Reduces to Andantex's
 * own `Np = V*19100/d` (rpm, `d` in mm, `i=1`) once converted to
 * consistent units -- verified by hand this session, `math.test.ts`.
 */
export function resolveOperatingSpeed(
  input: OperatingSpeedInput,
): OperatingSpeedResult {
  assertPositive("targetVelocityMps", input.targetVelocityMps);
  assertPositive("pinionPitchDiameterM", input.pinionPitchDiameterM);
  assertPositive("gearRatio", input.gearRatio);

  const pinionSpeedRadPerS =
    input.targetVelocityMps / (input.pinionPitchDiameterM / 2);

  return { operatingSpeedRadPerS: pinionSpeedRadPerS * input.gearRatio };
}

// --- 4. Momentary and required torque ---------------------------------------

export interface MomentaryTorqueInput {
  /** Acceleration torque, in N*m. Must be >= 0. */
  readonly accelerationTorqueNm: number;
  /** Load torque, in N*m. Must be >= 0. */
  readonly loadTorqueNm: number;
}

export interface MomentaryTorqueResult {
  readonly momentaryTorqueNm: number;
}

/**
 * `T1 = Ta + TL` -- the governing peak/starting torque for this module's
 * own single accelerate-to-speed event, matching Andantex's and Atlanta's
 * own combined tangential-force check (`stage-1-spec.md` "Candidate
 * Methods" items 3-4).
 */
export function resolveMomentaryTorque(
  input: MomentaryTorqueInput,
): MomentaryTorqueResult {
  assertNonNegative("accelerationTorqueNm", input.accelerationTorqueNm);
  assertNonNegative("loadTorqueNm", input.loadTorqueNm);

  return {
    momentaryTorqueNm: input.accelerationTorqueNm + input.loadTorqueNm,
  };
}

export interface RequiredTorqueInput {
  /** Momentary torque, in N*m. Must be >= 0. */
  readonly computedTorqueNm: number;
  /** Safety factor, `>= 1`. */
  readonly safetyFactor: number;
}

export interface RequiredTorqueResult {
  readonly requiredTorqueNm: number;
}

/** `T_required = T1 * Sf`. */
export function resolveRequiredTorque(
  input: RequiredTorqueInput,
): RequiredTorqueResult {
  assertNonNegative("computedTorqueNm", input.computedTorqueNm);
  assertFinite("safetyFactor", input.safetyFactor);
  if (input.safetyFactor < 1) {
    fail("safetyFactor must be at least 1.");
  }

  return {
    requiredTorqueNm: input.computedTorqueNm * input.safetyFactor,
  };
}

// Re-exported for callers that need lib/engine/mechanics directly without
// importing it themselves (compute.ts, math.test.ts).
export { accelerationTorque, angularAccelerationFromSpeedRamp };
