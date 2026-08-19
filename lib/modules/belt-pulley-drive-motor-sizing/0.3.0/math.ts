/**
 * Pure SI-number kernel for belt-pulley-drive-motor-sizing 0.2.0. Adds a
 * native repeating trapezoidal motion cycle (resolveMotionFromVelocity /
 * resolveMotionFromDistance) and effective (RMS) torque
 * (resolveEffectiveTorque) on top of everything 0.1.0 already computes --
 * see context/modules/belt-pulley-drive-motor-sizing/stage-2-contract.md
 * "0.2.0 Addendum" and
 * docs/superpowers/specs/2026-08-13-belt-pulley-drive-motor-sizing-0.2.0-design.md.
 *
 * Every function through resolveRequiredTorque is duplicated, not
 * imported, from 0.1.0's own math.ts (stage-2-contract.md "0.2.0 Addendum"
 * cross-version reuse policy) -- 0.1.0 stays released and untouched.
 *
 * Formula sources: Oriental Motor Co., Ltd., General Catalog *Technical
 * Reference* (jp.oriental_motor.general_catalog_motor_fan_sizing@
 * f-tecref-2003-2004, p. F-3); AutomationDirect, *SureServo Selection
 * Appendix* (us.automationdirect.sureservo_selection_appendix@
 * 2nd-ed-rev-b-08-2011); Oriental Motor's own "Motor Sizing Calculations"
 * page (jp.oriental_motor.motor_sizing_calculations@web-2026-08-08, pp.
 * 5-6, "Acceleration Torque" and "Calculation for the Effective Load
 * Torque (Trms)") for the two new functions.
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
 * Standard gravitational acceleration, m/s^2. 0.3.0 hardcodes this rather
 * than taking it as an input — no scenario in this product's scope needs a
 * different value, and `motion.axis.gravity`'s own registry constant
 * default was already exactly this figure everywhere it was used
 * (docs/superpowers/specs/2026-08-18-motor-sizing-consistency-pass-design.md
 * "Gravity"). Exported so ./math.test.ts and ./independent-benchmark.test.ts
 * can reference the exact same value instead of repeating the literal.
 */
export const STANDARD_GRAVITY_M_PER_S2 = 9.80665;

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
  readonly pulleyMassKg: number;
  readonly idlerPulleyMassKg: number;
  readonly pulleyPitchDiameterM: number;
}

export interface PulleyInertiaResult {
  readonly inertiaKgM2: number;
}

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
  readonly beltMassKg: number;
  readonly pulleyPitchDiameterM: number;
}

export interface BeltInertiaResult {
  readonly inertiaKgM2: number;
}

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
  readonly pulleyInertiaKgM2: number;
  readonly beltInertiaKgM2: number;
  readonly totalMovingMassKg: number;
  readonly pulleyPitchDiameterM: number;
}

export interface LoadInertiaResult {
  readonly loadInertiaKgM2: number;
}

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
  readonly gearRatio: number;
}

export interface ReflectedLoadInertiaResult {
  readonly reflectedLoadInertiaKgM2: number;
}

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
  readonly externalForceN: number;
  readonly totalMovingMassKg: number;
  readonly inclineAngleRad: number;
  readonly frictionCoefficient: number;
}

export interface DriveForceResult {
  readonly forceN: number;
}

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
  readonly forceN: number;
  readonly pulleyPitchDiameterM: number;
  readonly mechanicalEfficiency: number;
  readonly gearRatio: number;
}

export interface LoadTorqueResult {
  readonly loadTorqueNm: number;
}

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
  readonly targetVelocityMps: number;
  readonly pulleyPitchDiameterM: number;
  readonly gearRatio: number;
}

export interface OperatingSpeedResult {
  readonly operatingSpeedRadPerS: number;
}

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
  readonly accelerationTorqueNm: number;
  readonly loadTorqueNm: number;
}

export interface MomentaryTorqueResult {
  readonly momentaryTorqueNm: number;
}

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
  readonly computedTorqueNm: number;
  readonly safetyFactor: number;
}

export interface RequiredTorqueResult {
  readonly requiredTorqueNm: number;
}

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

// --- 5. Motion profile (NEW in 0.2.0) ---------------------------------------

export interface MotionFromVelocityInput {
  /** Commanded steady-state carriage velocity, in m/s. Must be > 0. */
  readonly targetVelocityMps: number;
  /** Acceleration time, in s. Must be > 0. */
  readonly accelerationTimeS: number;
  /** Deceleration time, in s. Must be > 0. */
  readonly decelerationTimeS: number;
  /** Constant-velocity (run) time, in s. Must be >= 0 (0 is a valid triangular-move boundary case). */
  readonly constantVelocityTimeS: number;
  /** Dwell time, in s. Must be >= 0. */
  readonly dwellTimeS: number;
}

export interface MotionFromVelocityResult {
  readonly travelDistanceM: number;
  readonly cycleTimeS: number;
}

/**
 * Velocity-first motion derivation: `S = V*(t1+t3)/2 + V*t2`,
 * `tf = t1+t2+t3+t4` (belt-pulley-drive-motor-sizing-0.2.0-design.md
 * "Input Mode").
 */
export function resolveMotionFromVelocity(
  input: MotionFromVelocityInput,
): MotionFromVelocityResult {
  assertPositive("targetVelocityMps", input.targetVelocityMps);
  assertPositive("accelerationTimeS", input.accelerationTimeS);
  assertPositive("decelerationTimeS", input.decelerationTimeS);
  assertNonNegative("constantVelocityTimeS", input.constantVelocityTimeS);
  assertNonNegative("dwellTimeS", input.dwellTimeS);

  const travelDistanceM =
    (input.targetVelocityMps *
      (input.accelerationTimeS + input.decelerationTimeS)) /
      2 +
    input.targetVelocityMps * input.constantVelocityTimeS;
  const cycleTimeS =
    input.accelerationTimeS +
    input.constantVelocityTimeS +
    input.decelerationTimeS +
    input.dwellTimeS;

  return { travelDistanceM, cycleTimeS };
}

export interface MotionFromDistanceInput {
  /** Carriage travel distance, in m. Must be > 0. */
  readonly travelDistanceM: number;
  /** Acceleration time, in s. Must be > 0. */
  readonly accelerationTimeS: number;
  /** Deceleration time, in s. Must be > 0. */
  readonly decelerationTimeS: number;
  /** Total repeating-cycle duration, in s. Must be > 0. */
  readonly cycleTimeS: number;
  /** Dwell time, in s. Must be >= 0. */
  readonly dwellTimeS: number;
}

export interface MotionFromDistanceResult {
  readonly targetVelocityMps: number;
  readonly constantVelocityTimeS: number;
}

/**
 * Distance-first motion derivation: `t2 = tf - t1 - t3 - t4`,
 * `V = S / (t2 + (t1+t3)/2)`
 * (belt-pulley-drive-motor-sizing-0.2.0-design.md "Input Mode"). Throws
 * `BeltPulleyMotorSizingInputError` -- a feasibility check, not an
 * acceptance check (the design doc's own wording) -- when the requested
 * cycle_time is too short for the given accel/decel times to cover the
 * travel distance (`t2 < 0`). `t2 = 0` is a valid boundary case (a
 * triangular move), not an error.
 */
export function resolveMotionFromDistance(
  input: MotionFromDistanceInput,
): MotionFromDistanceResult {
  assertPositive("travelDistanceM", input.travelDistanceM);
  assertPositive("accelerationTimeS", input.accelerationTimeS);
  assertPositive("decelerationTimeS", input.decelerationTimeS);
  assertPositive("cycleTimeS", input.cycleTimeS);
  assertNonNegative("dwellTimeS", input.dwellTimeS);

  const constantVelocityTimeS =
    input.cycleTimeS -
    input.accelerationTimeS -
    input.decelerationTimeS -
    input.dwellTimeS;
  if (constantVelocityTimeS < 0) {
    fail(
      "cycle_time is too short for the given acceleration_time, deceleration_time, and dwell_time to fit within it (derived constant_velocity_time would be negative).",
    );
  }

  const targetVelocityMps =
    input.travelDistanceM /
    (constantVelocityTimeS +
      (input.accelerationTimeS + input.decelerationTimeS) / 2);

  return { targetVelocityMps, constantVelocityTimeS };
}

// --- 6. Effective (RMS) torque (NEW in 0.2.0) -------------------------------

export interface EffectiveTorqueInput {
  /** Acceleration torque, in N*m. Must be >= 0. */
  readonly accelerationTorqueNm: number;
  /** Load torque, in N*m. Must be >= 0. */
  readonly loadTorqueNm: number;
  /** Deceleration torque, in N*m. Must be >= 0. */
  readonly decelerationTorqueNm: number;
  /** Acceleration time, in s. Must be > 0. */
  readonly accelerationTimeS: number;
  /** Constant-velocity time, in s. Must be >= 0. */
  readonly constantVelocityTimeS: number;
  /** Deceleration time, in s. Must be > 0. */
  readonly decelerationTimeS: number;
  /** Total cycle time, in s. Must be > 0. */
  readonly cycleTimeS: number;
}

export interface EffectiveTorqueResult {
  readonly effectiveTorqueNm: number;
}

/**
 * `Trms = sqrt(((Ta+TL)^2*t1 + TL^2*t2 + (Td-TL)^2*t3) / tf)` -- Oriental
 * Motor's own generic per-phase effective-load-torque formula
 * (jp.oriental_motor.motor_sizing_calculations, p. 6). Dwell time
 * contributes zero torque but counts toward `tf` (already folded into
 * `cycleTimeS`) -- matching how a servo's own thermal/RMS rating averages
 * over idle time too.
 */
export function resolveEffectiveTorque(
  input: EffectiveTorqueInput,
): EffectiveTorqueResult {
  assertNonNegative("accelerationTorqueNm", input.accelerationTorqueNm);
  assertNonNegative("loadTorqueNm", input.loadTorqueNm);
  assertNonNegative("decelerationTorqueNm", input.decelerationTorqueNm);
  assertPositive("accelerationTimeS", input.accelerationTimeS);
  assertNonNegative("constantVelocityTimeS", input.constantVelocityTimeS);
  assertPositive("decelerationTimeS", input.decelerationTimeS);
  assertPositive("cycleTimeS", input.cycleTimeS);

  const accelTerm =
    (input.accelerationTorqueNm + input.loadTorqueNm) ** 2 *
    input.accelerationTimeS;
  const runTerm = input.loadTorqueNm ** 2 * input.constantVelocityTimeS;
  const decelTerm =
    (input.decelerationTorqueNm - input.loadTorqueNm) ** 2 *
    input.decelerationTimeS;

  return {
    effectiveTorqueNm: Math.sqrt(
      (accelTerm + runTerm + decelTerm) / input.cycleTimeS,
    ),
  };
}

// Re-exported for callers that need lib/engine/mechanics directly without
// importing it themselves (compute.ts, math.test.ts).
export { accelerationTorque, angularAccelerationFromSpeedRamp };
