/**
 * Pure SI-number kernel for the belt-pulley-drive-motor-sizing module (Unit
 * 6.5, Stage 3). Resolves: drive+idler pulley inertia, belt
 * linear-motion-equivalent inertia, load inertia (pulleys + belt +
 * carriage), reflected load inertia, total system inertia, and inertia
 * ratio; force/load torque via the general orientation-aware force
 * balance; operating speed; acceleration torque over a single
 * accelerate-to-speed event; momentary torque; and required torque with an
 * engineer-supplied safety factor -- see
 * context/modules/belt-pulley-drive-motor-sizing/stage-1-spec.md and
 * stage-2-contract.md.
 *
 * Self-contained per ADR-0011 "Reuse policy": every formula below is
 * reproduced, not imported, from Oriental Motor Co., Ltd.'s own combined
 * "Wire Belt Mechanism, Rack and Pinion Mechanism" formula -- except moment
 * of inertia, `alpha = delta_omega/t`, and `Ta = J*alpha`, which are
 * genuinely imported from `lib/engine/mechanics` (Unit 6.1). This module
 * has no calculation-level dependency on `rack-pinion-motor-sizing@0.1.0`
 * or any other Motor Sizing Tool or Milestone-4 discipline module -- though
 * its own force-balance and load-torque formulas are algebraically
 * identical in shape to `rack-pinion-motor-sizing@0.1.0`'s own, both
 * tracing to the same primary source page
 * (`stage-1-spec.md` "The central finding").
 *
 * Formula sources: Oriental Motor Co., Ltd., General Catalog *Technical
 * Reference* (`jp.oriental_motor.general_catalog_motor_fan_sizing@
 * f-tecref-2003-2004`, p. F-3, "Wire Belt Mechanism, Rack and Pinion
 * Mechanism"); AutomationDirect, *SureServo Selection Appendix*
 * (`us.automationdirect.sureservo_selection_appendix@2nd-ed-rev-b-08-2011`,
 * Table 1, p. B-6, and the "Belt Drive - Example Calculations" worked
 * example, pp. B-11-B-13) -- see `stage-1-spec.md` "Candidate Methods and
 * Sources" and `math.test.ts`.
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

export class BeltPulleyMotorSizingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BeltPulleyMotorSizingInputError";
  }
}

function fail(message: string): never {
  throw new BeltPulleyMotorSizingInputError(message);
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

export interface PulleyInertiaInput {
  /** Drive pulley mass, in kg. Must be > 0. */
  readonly pulleyMassKg: number;
  /** Idler pulley mass, in kg. Must be > 0. */
  readonly idlerPulleyMassKg: number;
  /** Shared pulley pitch diameter, in m. Must be > 0. */
  readonly pulleyPitchDiameterM: number;
}

export interface PulleyInertiaResult {
  readonly inertiaKgM2: number;
}

/**
 * Combined drive-plus-idler pulley inertia about the drive shaft:
 * `J_pulleys = (1/8)*(M_drive+M_idler)*D^2` (`lib/engine/mechanics`'
 * `solidCylinderInertia`, summed). Both pulleys are added directly, not
 * reduced by a speed ratio: the belt connects them without slip and both
 * share one diameter, so they rotate at the same angular speed as the
 * drive shaft (`stage-2-contract.md` "Decisions" item 4).
 */
export function resolvePulleyInertia(
  input: PulleyInertiaInput,
): PulleyInertiaResult {
  assertPositive("pulleyMassKg", input.pulleyMassKg);
  assertPositive("idlerPulleyMassKg", input.idlerPulleyMassKg);
  assertPositive("pulleyPitchDiameterM", input.pulleyPitchDiameterM);

  const drive = solidCylinderInertia({
    massKg: input.pulleyMassKg,
    outerDiameterM: input.pulleyPitchDiameterM,
  }).inertiaKgM2;
  const idler = solidCylinderInertia({
    massKg: input.idlerPulleyMassKg,
    outerDiameterM: input.pulleyPitchDiameterM,
  }).inertiaKgM2;

  return { inertiaKgM2: drive + idler };
}

export interface BeltInertiaInput {
  /** Belt mass, in kg. Must be >= 0 (0 is the registry's own default). */
  readonly beltMassKg: number;
  /** Pulley pitch diameter, in m. Must be > 0. */
  readonly pulleyPitchDiameterM: number;
}

export interface BeltInertiaResult {
  readonly inertiaKgM2: number;
}

/**
 * The belt's own translating mass expressed as inertia at the drive-pulley
 * shaft: `J_belt = M_belt*(D/2)^2` (`lib/engine/mechanics`'
 * `linearMotionInertia`, travel per revolution `pi*D`). The term a
 * rack-and-pinion drive does not have at all -- one of the two real
 * differences justifying this module's own separate existence
 * (`stage-1-spec.md`).
 */
export function resolveBeltInertia(input: BeltInertiaInput): BeltInertiaResult {
  assertNonNegative("beltMassKg", input.beltMassKg);
  assertPositive("pulleyPitchDiameterM", input.pulleyPitchDiameterM);

  if (input.beltMassKg === 0) {
    return { inertiaKgM2: 0 };
  }

  return {
    inertiaKgM2: linearMotionInertia({
      massKg: input.beltMassKg,
      travelPerRevolutionM: Math.PI * input.pulleyPitchDiameterM,
    }).inertiaKgM2,
  };
}

export interface LoadInertiaInput {
  /** Combined pulley inertia, in kg*m^2. Must be >= 0. */
  readonly pulleyInertiaKgM2: number;
  /** Belt linear-motion-equivalent inertia, in kg*m^2. Must be >= 0. */
  readonly beltInertiaKgM2: number;
  /** Total moving (carriage + payload) mass, in kg. Must be > 0. */
  readonly totalMovingMassKg: number;
  /** Pulley pitch diameter, in m. Must be > 0. */
  readonly pulleyPitchDiameterM: number;
}

export interface LoadInertiaResult {
  readonly loadInertiaKgM2: number;
}

/**
 * `J_W = J_pulleys + J_belt + m*(D/2)^2` -- pulleys, belt, and the
 * carriage's own linear-motion-equivalent inertia at the drive-pulley
 * shaft, combined. Mirrors `rack-pinion-motor-sizing@0.1.0`'s own
 * `resolveLoadInertia` composition, with the belt term added.
 */
export function resolveLoadInertia(input: LoadInertiaInput): LoadInertiaResult {
  assertNonNegative("pulleyInertiaKgM2", input.pulleyInertiaKgM2);
  assertNonNegative("beltInertiaKgM2", input.beltInertiaKgM2);
  assertPositive("totalMovingMassKg", input.totalMovingMassKg);
  assertPositive("pulleyPitchDiameterM", input.pulleyPitchDiameterM);

  const carriageInertiaKgM2 = linearMotionInertia({
    massKg: input.totalMovingMassKg,
    travelPerRevolutionM: Math.PI * input.pulleyPitchDiameterM,
  }).inertiaKgM2;

  return {
    loadInertiaKgM2:
      input.pulleyInertiaKgM2 + input.beltInertiaKgM2 + carriageInertiaKgM2,
  };
}

export interface ReflectedLoadInertiaInput {
  readonly loadInertiaKgM2: number;
  /** Gear ratio between the drive pulley and the motor shaft. Must be > 0. */
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
  /** Gravitational acceleration, in m/s^2. Must be > 0. */
  readonly gravityMps2: number;
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
 * identically for the ball screw, rack-and-pinion, and wire-belt mechanism
 * alike (`F = FA + m(sina + mu*cosa)`, weight-based; this is the SI
 * mass/gravity form, the same transform `rack-pinion-motor-sizing@0.1.0`'s
 * own `resolveDriveForce` already makes -- reproduced independently here,
 * not imported, per ADR-0011 "Reuse policy").
 */
export function resolveDriveForce(input: DriveForceInput): DriveForceResult {
  assertFinite("externalForceN", input.externalForceN);
  assertPositive("totalMovingMassKg", input.totalMovingMassKg);
  assertPositive("gravityMps2", input.gravityMps2);
  assertFinite("inclineAngleRad", input.inclineAngleRad);
  assertNonNegative("frictionCoefficient", input.frictionCoefficient);

  const gravityForceN =
    input.totalMovingMassKg *
    input.gravityMps2 *
    (Math.sin(input.inclineAngleRad) +
      input.frictionCoefficient * Math.cos(input.inclineAngleRad));

  return { forceN: input.externalForceN + gravityForceN };
}

export interface LoadTorqueInput {
  /** Drive force, in N. */
  readonly forceN: number;
  /** Pulley pitch diameter, in m. Must be > 0. */
  readonly pulleyPitchDiameterM: number;
  /** Mechanical efficiency, `0 < eta <= 1`. */
  readonly mechanicalEfficiency: number;
  /** Gear ratio between the drive pulley and the motor shaft. Must be > 0. */
  readonly gearRatio: number;
}

export interface LoadTorqueResult {
  readonly loadTorqueNm: number;
}

/**
 * `T_L = F*D/(2*eta*i)` -- Oriental Motor's own combined wire-belt/
 * rack-and-pinion load-torque formula (General Catalog Technical Reference
 * p. F-3, `TL = F*D/(2*eta*i)`). Efficiency divides LOAD TORQUE, following
 * Oriental Motor's own convention and every already-released Motor Sizing
 * Tool sibling -- AutomationDirect's own source instead divides the
 * INERTIA by efficiency, a real, disclosed modeling disagreement
 * (`stage-1-spec.md` "A real disagreement between sources") this module
 * does not adopt.
 */
export function resolveLoadTorque(input: LoadTorqueInput): LoadTorqueResult {
  assertFinite("forceN", input.forceN);
  assertPositive("pulleyPitchDiameterM", input.pulleyPitchDiameterM);
  assertFinite("mechanicalEfficiency", input.mechanicalEfficiency);
  if (input.mechanicalEfficiency <= 0 || input.mechanicalEfficiency > 1) {
    fail("mechanicalEfficiency must be greater than 0 and at most 1.");
  }
  assertPositive("gearRatio", input.gearRatio);

  return {
    loadTorqueNm:
      (input.forceN * input.pulleyPitchDiameterM) /
      (2 * input.mechanicalEfficiency * input.gearRatio),
  };
}

// --- 3. Operating speed and acceleration torque ----------------------------

export interface OperatingSpeedInput {
  /** Commanded steady-state carriage velocity, in m/s. Must be > 0. */
  readonly targetVelocityMps: number;
  /** Pulley pitch diameter, in m. Must be > 0. */
  readonly pulleyPitchDiameterM: number;
  /** Gear ratio between the drive pulley and the motor shaft. Must be > 0. */
  readonly gearRatio: number;
}

export interface OperatingSpeedResult {
  readonly operatingSpeedRadPerS: number;
}

/**
 * `omega_pulley = V/(D/2)`; `omega_motor = omega_pulley*i` -- motor shaft
 * rotational speed at the target carriage velocity.
 */
export function resolveOperatingSpeed(
  input: OperatingSpeedInput,
): OperatingSpeedResult {
  assertPositive("targetVelocityMps", input.targetVelocityMps);
  assertPositive("pulleyPitchDiameterM", input.pulleyPitchDiameterM);
  assertPositive("gearRatio", input.gearRatio);

  const pulleySpeedRadPerS =
    input.targetVelocityMps / (input.pulleyPitchDiameterM / 2);

  return { operatingSpeedRadPerS: pulleySpeedRadPerS * input.gearRatio };
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
 * own single accelerate-to-speed event, matching AutomationDirect's own
 * `T_motor = T_accel + T_run` shape.
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
