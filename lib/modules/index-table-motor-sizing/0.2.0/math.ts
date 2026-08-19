/**
 * Pure SI-number kernel for the index-table-motor-sizing module (Unit 6.6,
 * Stage 3). Resolves: table inertia, load inertia (table + attached
 * mounted load), reflected load inertia, total system inertia, and
 * inertia ratio; motor-shaft operating (indexing) speed from a single
 * accelerate-decelerate-to-stop index move; acceleration torque; momentary
 * torque; and required torque with an engineer-supplied safety factor --
 * see context/modules/index-table-motor-sizing/stage-1-spec.md and
 * stage-2-contract.md.
 *
 * Genuinely different in kind from every sibling Motor Sizing Tool module
 * (stage-1-spec.md "Genuinely different in kind"): this mechanism's own
 * motion is rotary, commanded directly in angle/time -- there is no
 * linear-to-rotary radius conversion anywhere in this file, and
 * load_torque is not resolved here at all (it is a required, engineer-
 * supplied module input, not a kernel output -- both primary sources
 * independently omit a load-torque formula for this mechanism).
 *
 * Self-contained per ADR-0011 "Reuse policy": every formula below is
 * reproduced, not imported, from Oriental Motor Co., Ltd.'s and
 * AutomationDirect's own index-table sizing methods -- except moment of
 * inertia, `alpha = delta_omega/t`, and `Ta = J*alpha`, which are
 * genuinely imported from `lib/engine/mechanics` (Unit 6.1).
 *
 * Formula sources: Oriental Motor Co., Ltd., General Catalog *Technical
 * Reference* (`jp.oriental_motor.general_catalog_motor_fan_sizing@
 * f-tecref-2003-2004`, pp. F-8-F-9, "Index Table -- Using Stepping
 * Motors"); AutomationDirect, *SureServo Selection Appendix*
 * (`us.automationdirect.sureservo_selection_appendix@2nd-ed-rev-b-08-2011`,
 * pp. B-14-B-16, "Index Table - Example Calculations") -- see
 * `stage-1-spec.md` "Two worked examples" and `math.test.ts`.
 *
 * Values become EngineeringValues only at the module-package boundary;
 * bare numbers remain internal here, mirroring every other module's own
 * math.ts.
 */

import {
  accelerationTorque,
  angularAccelerationFromSpeedRamp,
  solidCylinderInertia,
} from "@/lib/engine";

export class IndexTableMotorSizingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IndexTableMotorSizingInputError";
  }
}

function fail(message: string): never {
  throw new IndexTableMotorSizingInputError(message);
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

export interface TableInertiaInput {
  /** Table mass, in kg. Must be > 0. */
  readonly tableMassKg: number;
  /** Table diameter, in m. Must be > 0. */
  readonly tableDiameterM: number;
}

export interface TableInertiaResult {
  readonly inertiaKgM2: number;
}

/**
 * The table's own rotating inertia, treated as a solid cylinder about its
 * own axis: `J_T = (1/8)*M_table*D^2` (`lib/engine/mechanics`'
 * `solidCylinderInertia`) -- Oriental Motor's own `JT =
 * (pi/32)*rho*L_T*D_T^4` reduces to this exact form once expressed in
 * terms of the table's own mass rather than density and thickness
 * (`stage-1-spec.md` "Oriental Motor's own example").
 */
export function resolveTableInertia(
  input: TableInertiaInput,
): TableInertiaResult {
  assertPositive("tableMassKg", input.tableMassKg);
  assertPositive("tableDiameterM", input.tableDiameterM);

  return {
    inertiaKgM2: solidCylinderInertia({
      massKg: input.tableMassKg,
      outerDiameterM: input.tableDiameterM,
    }).inertiaKgM2,
  };
}

export interface LoadInertiaInput {
  /** The table's own inertia, in kg*m^2. Must be >= 0. */
  readonly tableInertiaKgM2: number;
  /** Combined mounted-load inertia, in kg*m^2. Must be >= 0. */
  readonly attachedLoadInertiaKgM2: number;
}

export interface LoadInertiaResult {
  readonly loadInertiaKgM2: number;
}

/** `J_W = J_T + J_load` -- the table plus any engineer-resolved mounted-load inertia. */
export function resolveLoadInertia(input: LoadInertiaInput): LoadInertiaResult {
  assertNonNegative("tableInertiaKgM2", input.tableInertiaKgM2);
  assertNonNegative("attachedLoadInertiaKgM2", input.attachedLoadInertiaKgM2);

  return {
    loadInertiaKgM2: input.tableInertiaKgM2 + input.attachedLoadInertiaKgM2,
  };
}

export interface ReflectedLoadInertiaInput {
  readonly loadInertiaKgM2: number;
  /** Gear ratio between the table shaft and the motor shaft. Must be > 0. */
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

// --- 2. Motion: operating speed ---------------------------------------------

export interface OperatingSpeedInput {
  /** Angle rotated per index move, at the table shaft, in rad. Must be > 0. */
  readonly indexAngleRad: number;
  /** Total move time for one index, in s. Must be > accelerationTimeS. */
  readonly indexTimeS: number;
  /** Ramp (accel = decel) time within indexTimeS, in s. Must be > 0. */
  readonly accelerationTimeS: number;
  /** Gear ratio between the table shaft and the motor shaft. Must be > 0. */
  readonly gearRatio: number;
}

export interface OperatingSpeedResult {
  readonly operatingSpeedRadPerS: number;
}

/**
 * `omega_table = theta_index/(t_index-t_A)`; `omega_motor =
 * omega_table*i` -- the table's own indexing (cruise) angular speed for a
 * symmetric trapezoidal index move, then reflected to the motor shaft. No
 * linear-to-rotary radius conversion: this mechanism is commanded directly
 * in angular terms (`stage-1-spec.md` "Genuinely different in kind").
 * Reduces to Oriental Motor's own `N = (60*theta)/(360*(t0-t1))` and
 * AutomationDirect's own trapezoidal `fTRAP = (Ptotal-fstart*tramp)/
 * (ttotal-tramp)` once each is converted to consistent units -- verified
 * by hand this session, `math.test.ts`.
 */
export function resolveOperatingSpeed(
  input: OperatingSpeedInput,
): OperatingSpeedResult {
  assertPositive("indexAngleRad", input.indexAngleRad);
  assertPositive("accelerationTimeS", input.accelerationTimeS);
  assertPositive("indexTimeS", input.indexTimeS);
  if (input.accelerationTimeS >= input.indexTimeS) {
    fail("accelerationTimeS must be less than indexTimeS.");
  }
  assertPositive("gearRatio", input.gearRatio);

  const tableSpeedRadPerS =
    input.indexAngleRad / (input.indexTimeS - input.accelerationTimeS);

  return { operatingSpeedRadPerS: tableSpeedRadPerS * input.gearRatio };
}

// --- 3. Momentary and required torque ---------------------------------------

export interface MomentaryTorqueInput {
  /** Acceleration torque, in N*m. Must be >= 0. */
  readonly accelerationTorqueNm: number;
  /** Load torque, in N*m. Must be >= 0 (engineer-supplied; both primary sources default it to 0). */
  readonly loadTorqueNm: number;
}

export interface MomentaryTorqueResult {
  readonly momentaryTorqueNm: number;
}

/**
 * `T1 = Ta + TL` -- the governing peak/starting torque, matching
 * AutomationDirect's own `Tmotor = Taccel + Trun` shape exactly.
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
