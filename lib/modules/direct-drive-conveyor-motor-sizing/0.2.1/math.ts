/**
 * Pure SI-number kernel for the direct-drive-conveyor-motor-sizing module
 * (Unit 6.3, Stage 3 draft). Resolves: drive-roller, idler-roller, belt,
 * and carried-load inertia; reflected load inertia, total system inertia,
 * and inertia ratio; friction-driven load torque; operating speed;
 * acceleration torque over a single accelerate-to-speed event; momentary
 * torque; and required torque with an engineer-supplied safety factor --
 * see context/modules/direct-drive-conveyor-motor-sizing/stage-1-spec.md
 * and stage-2-contract.md.
 *
 * Self-contained per ADR-0011 "Reuse policy": every formula below is
 * reproduced, not imported, from Omron Corporation's and Oriental Motor
 * Co., Ltd.'s own conveyor sizing methods -- except moment of inertia,
 * `alpha = delta_omega/t`, and `Ta = J*alpha`, which are genuinely
 * imported from `lib/engine/mechanics` (Unit 6.1), the one shared,
 * source-independent physics package this family depends on. This module
 * has no calculation-level dependency on `ball-screw-motor-sizing@0.1.0`
 * or on any Milestone-4 discipline module.
 *
 * Formula sources: Omron Corporation, *Technical Guide for Servo Motor
 * Selection* (`jp.omron.servo_motor_selection_guide@csm-tg-e-3-1`, pp.
 * 7-9, "Inertia when Carrying Object via Conveyor Belt" / "Torque of an
 * object on the conveyor belt to which the external force is applied");
 * Oriental Motor Co., Ltd., General Catalog *Technical Reference*
 * (`jp.oriental_motor.general_catalog_motor_fan_sizing@f-tecref-2003-2004`,
 * pp. F-8 through F-9, "Belt and Pully" / "Conveyor" worked examples) --
 * see `stage-1-spec.md` "Candidate Methods and Sources" and `math.test.ts`.
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

export class DirectDriveConveyorMotorSizingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectDriveConveyorMotorSizingInputError";
  }
}

function fail(message: string): never {
  throw new DirectDriveConveyorMotorSizingInputError(message);
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

// --- 1. Inertia ---------------------------------------------------------------

export interface RollerInertiaInput {
  /** Roller mass, in kg. Must be > 0. */
  readonly massKg: number;
  /** Roller diameter, in m. Must be > 0. */
  readonly diameterM: number;
}

export interface RollerInertiaResult {
  readonly inertiaKgM2: number;
}

/**
 * A roller's own rotating inertia: `J = (1/8)*M*D^2`
 * (`lib/engine/mechanics`' `solidCylinderInertia`) -- Omron's own
 * `J1 = M1*D1^2/8` term (Servo Selection.pdf p. 8, "Inertia when Carrying
 * Object via Conveyor Belt"). Used for both the drive roller and the
 * idler roller -- {@link resolveReflectedIdlerInertia} reflects the
 * idler's own result to the drive-roller shaft.
 */
export function resolveRollerInertia(
  input: RollerInertiaInput,
): RollerInertiaResult {
  assertPositive("massKg", input.massKg);
  assertPositive("diameterM", input.diameterM);

  return {
    inertiaKgM2: solidCylinderInertia({
      massKg: input.massKg,
      outerDiameterM: input.diameterM,
    }).inertiaKgM2,
  };
}

export interface ReflectedIdlerInertiaInput {
  /** The idler roller's own inertia, about its own axis, in kg*m^2. Must be >= 0. */
  readonly idlerInertiaOwnKgM2: number;
  /** Drive roller diameter, in m. Must be > 0. */
  readonly driveRollerDiameterM: number;
  /** Idler roller diameter, in m. Must be > 0. */
  readonly idlerRollerDiameterM: number;
}

export interface ReflectedIdlerInertiaResult {
  readonly reflectedIdlerInertiaKgM2: number;
}

/**
 * Reflects the idler roller's own inertia to the drive-roller (motor)
 * shaft by `(D1/D2)^2` -- Omron's own
 * `M2*D2^2/8*(D1/D2)^2` term, which simplifies to `M2*D1^2/8` when the two
 * rollers share one diameter (`stage-1-spec.md` "Candidate Methods" item
 * 1) -- the same parallel-shaft reflection shape `drive-train@0.1.0`'s own
 * gear-ratio-squared reflection already uses, here with `(D1/D2)` playing
 * the role of a gear ratio between the two rollers.
 */
export function resolveReflectedIdlerInertia(
  input: ReflectedIdlerInertiaInput,
): ReflectedIdlerInertiaResult {
  assertNonNegative("idlerInertiaOwnKgM2", input.idlerInertiaOwnKgM2);
  assertPositive("driveRollerDiameterM", input.driveRollerDiameterM);
  assertPositive("idlerRollerDiameterM", input.idlerRollerDiameterM);

  const diameterRatio =
    input.driveRollerDiameterM / input.idlerRollerDiameterM;

  return {
    reflectedIdlerInertiaKgM2:
      input.idlerInertiaOwnKgM2 * diameterRatio ** 2,
  };
}

export interface LinearMassInertiaInput {
  /** Belt or carried-load mass, in kg. Must be >= 0 -- unlike lib/engine/mechanics' own linearMotionInertia, which requires > 0 (see this function's own doc comment). */
  readonly massKg: number;
  /** Drive roller diameter, in m. Must be > 0. */
  readonly driveRollerDiameterM: number;
}

export interface LinearMassInertiaResult {
  readonly inertiaKgM2: number;
}

/**
 * The belt's or the carried load's own linear-motion-equivalent inertia at
 * the drive-roller shaft: `J = m*(pi*D1/(2*pi))^2 = m*(D1/2)^2`
 * (`lib/engine/mechanics`' `linearMotionInertia`, with the drive roller's
 * own circumference `pi*D1` as travel per revolution -- `stage-1-spec.md`
 * "Candidate Methods" item 1). Algebraically identical to Omron's own
 * `M3*D1^2/4` / `M4*D1^2/4` terms.
 *
 * `belt_mass` and `carried_load_mass` both allow `>= 0` in the released
 * registry (an untracked belt mass, or an empty conveyor, are real cases)
 * -- unlike `lib/engine/mechanics`' own `linearMotionInertia`, which
 * requires a strictly positive mass. Zero mass contributes zero inertia
 * directly, without calling into `lib/engine/mechanics` -- a per-module
 * boundary-case decision, not a defect in that shared package, which has
 * no reason to support a mass of zero for its own other callers.
 */
export function resolveLinearMassInertia(
  input: LinearMassInertiaInput,
): LinearMassInertiaResult {
  assertNonNegative("massKg", input.massKg);
  assertPositive("driveRollerDiameterM", input.driveRollerDiameterM);

  if (input.massKg === 0) return { inertiaKgM2: 0 };

  return {
    inertiaKgM2: linearMotionInertia({
      massKg: input.massKg,
      travelPerRevolutionM: Math.PI * input.driveRollerDiameterM,
    }).inertiaKgM2,
  };
}

export interface ReflectedLoadInertiaInput {
  /** The idler roller's own inertia, already reflected to the drive-roller shaft, in kg*m^2. Must be >= 0. */
  readonly reflectedIdlerInertiaKgM2: number;
  /** The belt's own linear-motion-equivalent inertia, in kg*m^2. Must be >= 0. */
  readonly beltInertiaKgM2: number;
  /** The carried load's own linear-motion-equivalent inertia, in kg*m^2. Must be >= 0. */
  readonly loadInertiaKgM2: number;
}

export interface ReflectedLoadInertiaResult {
  readonly reflectedLoadInertiaKgM2: number;
}

/**
 * `J_L = J_idler(reflected) + J_belt + J_load` -- everything already on the
 * drive-roller/motor shaft in `0.1.0`'s own direct-drive (`i = 1`) scope,
 * excluding the drive roller's own inertia, which
 * {@link resolveTotalSystemInertia} adds directly
 * (`stage-2-contract.md` "Method Sources": a naming-consistency split from
 * Omron's own single combined `JW = J1+J2+J3+J4`, not a physics
 * difference).
 */
export function resolveReflectedLoadInertia(
  input: ReflectedLoadInertiaInput,
): ReflectedLoadInertiaResult {
  assertNonNegative("reflectedIdlerInertiaKgM2", input.reflectedIdlerInertiaKgM2);
  assertNonNegative("beltInertiaKgM2", input.beltInertiaKgM2);
  assertNonNegative("loadInertiaKgM2", input.loadInertiaKgM2);

  return {
    reflectedLoadInertiaKgM2:
      input.reflectedIdlerInertiaKgM2 +
      input.beltInertiaKgM2 +
      input.loadInertiaKgM2,
  };
}

export interface TotalSystemInertiaInput {
  /** Motor rotor moment of inertia, in kg*m^2. Must be > 0. */
  readonly motorRotorInertiaKgM2: number;
  /** The drive roller's own inertia, in kg*m^2. Must be >= 0. */
  readonly driveRollerInertiaKgM2: number;
  /** Reflected load inertia (idler + belt + load), in kg*m^2. Must be >= 0. */
  readonly reflectedLoadInertiaKgM2: number;
}

export interface TotalSystemInertiaResult {
  readonly totalSystemInertiaKgM2: number;
}

/** `J_total = J_M + J1(drive roller) + J_L`. */
export function resolveTotalSystemInertia(
  input: TotalSystemInertiaInput,
): TotalSystemInertiaResult {
  assertPositive("motorRotorInertiaKgM2", input.motorRotorInertiaKgM2);
  assertNonNegative("driveRollerInertiaKgM2", input.driveRollerInertiaKgM2);
  assertNonNegative("reflectedLoadInertiaKgM2", input.reflectedLoadInertiaKgM2);

  return {
    totalSystemInertiaKgM2:
      input.motorRotorInertiaKgM2 +
      input.driveRollerInertiaKgM2 +
      input.reflectedLoadInertiaKgM2,
  };
}

export interface InertiaRatioInput {
  readonly reflectedLoadInertiaKgM2: number;
  /** The drive roller's own inertia, in kg*m^2. Must be >= 0. */
  readonly driveRollerInertiaKgM2: number;
  readonly motorRotorInertiaKgM2: number;
}

export interface InertiaRatioResult {
  readonly inertiaRatio: number;
}

/**
 * `R_J = (J_L + J1(drive roller)) / J_M` -- checked against an
 * engineer-supplied maximum.
 *
 * 0.2.1 fix: now includes the drive roller's own inertia in the numerator.
 * 0.2.0 computed `R_J = J_L / J_M` using only `resolveReflectedLoadInertia`'s
 * own idler+belt+load total, silently excluding the drive roller -- the same
 * inertia `resolveTotalSystemInertia` (above) already adds to the motor
 * rotor. For a heavy/large-diameter drive roller this let `inertia-ratio`
 * report a passing value while the true load-side/rotor ratio (every
 * non-rotor inertia in the system) was far above the declared maximum -- see
 * the release audit this closes. Every sibling Motor Sizing Tool module
 * (belt-pulley, rack-pinion, index-table) already folds its own drive-side
 * roller/pulley inertia into the same load-side total this fix now matches.
 */
export function resolveInertiaRatio(
  input: InertiaRatioInput,
): InertiaRatioResult {
  assertNonNegative("reflectedLoadInertiaKgM2", input.reflectedLoadInertiaKgM2);
  assertNonNegative("driveRollerInertiaKgM2", input.driveRollerInertiaKgM2);
  assertPositive("motorRotorInertiaKgM2", input.motorRotorInertiaKgM2);

  return {
    inertiaRatio:
      (input.reflectedLoadInertiaKgM2 + input.driveRollerInertiaKgM2) /
      input.motorRotorInertiaKgM2,
  };
}

// --- 2. Friction force and load torque -----------------------------------------

export interface FrictionForceInput {
  /** Coefficient of friction between the belt and the carried load, `>= 0`, no upper cap. */
  readonly beltFrictionCoefficient: number;
  /** Belt mass, in kg. Must be >= 0. */
  readonly beltMassKg: number;
  /** Carried load mass, in kg. Must be >= 0. */
  readonly carriedLoadMassKg: number;
}

export interface FrictionForceResult {
  readonly forceN: number;
}

/**
 * `F = mu*(belt_mass+carried_load_mass)*g` -- Coulomb friction between the
 * belt and the carried load, horizontal only (`0.1.0`'s own validity
 * envelope; `stage-1-spec.md` "Candidate Methods" item 2). Both Oriental
 * Motor worked examples (p. F-8, p. F-9) use this exact form, with weight
 * (mass times standard gravity) numerically equal to the source's own `lb`
 * figure treated directly as `lbf` -- confirmed by hand this session,
 * `math.test.ts` "end-to-end" tests.
 */
export function resolveFrictionForce(
  input: FrictionForceInput,
): FrictionForceResult {
  assertNonNegative("beltFrictionCoefficient", input.beltFrictionCoefficient);
  assertNonNegative("beltMassKg", input.beltMassKg);
  assertNonNegative("carriedLoadMassKg", input.carriedLoadMassKg);

  return {
    forceN:
      input.beltFrictionCoefficient *
      (input.beltMassKg + input.carriedLoadMassKg) *
      STANDARD_GRAVITY_M_PER_S2,
  };
}

export interface LoadTorqueInput {
  /** Friction force, in N. Must be >= 0. */
  readonly forceN: number;
  /** Drive roller diameter, in m. Must be > 0. */
  readonly driveRollerDiameterM: number;
  /** Belt/roller mechanical efficiency, `0 < eta <= 1`. */
  readonly mechanicalEfficiency: number;
}

export interface LoadTorqueResult {
  readonly loadTorqueNm: number;
}

/**
 * `T_L = F*D1/(2*eta)` -- Oriental Motor's own pulley/belt-drive
 * load-torque formula (General Catalog Technical Reference p. F-8,
 * `TL = F*D/(2*eta)`; also the already-registered `jp.oriental_motor.
 * motor_sizing_calculations` web page's own "Wire Belt Mechanism" form).
 * No preload-nut term -- a conveyor has no preload nut, genuinely simpler
 * than `motor_sizing.ball_screw.load_torque` (`stage-1-spec.md` "Candidate
 * Methods" item 2).
 */
export function resolveLoadTorque(input: LoadTorqueInput): LoadTorqueResult {
  assertNonNegative("forceN", input.forceN);
  assertPositive("driveRollerDiameterM", input.driveRollerDiameterM);
  assertFinite("mechanicalEfficiency", input.mechanicalEfficiency);
  if (input.mechanicalEfficiency <= 0 || input.mechanicalEfficiency > 1) {
    fail("mechanicalEfficiency must be greater than 0 and at most 1.");
  }

  return {
    loadTorqueNm:
      (input.forceN * input.driveRollerDiameterM) /
      (2 * input.mechanicalEfficiency),
  };
}

// --- 3. Operating speed and acceleration torque --------------------------------

export interface OperatingSpeedInput {
  /** Commanded steady-state belt speed, in m/s. Must be > 0. */
  readonly targetBeltSpeedMps: number;
  /** Drive roller diameter, in m. Must be > 0. */
  readonly driveRollerDiameterM: number;
}

export interface OperatingSpeedResult {
  readonly operatingSpeedRadPerS: number;
}

/**
 * `omega = V/(D1/2)` -- motor/drive-roller shaft rotational speed at the
 * target belt speed. Reproduces Oriental Motor's own `NG = V*60/(pi*D)`
 * (General Catalog Technical Reference p. F-8, "Determine the Gear
 * Ratio") to within its own printed rounding: `V=7 in/s`, `D=4 in` ->
 * `NG=33.4 r/min` -- `math.test.ts`.
 */
export function resolveOperatingSpeed(
  input: OperatingSpeedInput,
): OperatingSpeedResult {
  assertPositive("targetBeltSpeedMps", input.targetBeltSpeedMps);
  assertPositive("driveRollerDiameterM", input.driveRollerDiameterM);

  return {
    operatingSpeedRadPerS:
      input.targetBeltSpeedMps / (input.driveRollerDiameterM / 2),
  };
}

// --- 4. Momentary and required torque -------------------------------------------

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
 * own single accelerate-to-speed event, matching both reference examples'
 * own combined breakaway/acceleration check (`stage-2-contract.md`
 * "Decisions" item 3). Always the plain sum, never a `max`/`abs`
 * combination: this module's own accelerate-only, horizontal-only scope
 * has no braking or gravity-assisted case where the two terms could
 * oppose each other (unlike `motor_sizing.ball_screw`'s own signed,
 * direction-dependent phases).
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

/**
 * `T_required = T1 * Sf` -- both reference examples' own combined
 * safety-factor shape (`Sf = 2` in each; the already-registered
 * `jp.oriental_motor.motor_sizing_calculations` web page's own general
 * `TM = (TL+Ta)*Sf`), applied to one combined momentary-torque figure
 * rather than `motor_sizing.ball_screw`'s own two separate margins --
 * neither reference example computes an effective (RMS) torque distinct
 * from its own momentary torque (`stage-2-contract.md` "Decisions" item
 * 4).
 */
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
