/**
 * Pure SI-number kernel for the drive-train module (Unit 4.7, Stage 3
 * draft). Resolves: total reflected system inertia and inertia ratio,
 * motor-shaft operating speed, acceleration/deceleration torque, maximum
 * momentary torque, effective (RMS) torque, and regenerative energy
 * released — see context/modules/drive-train/stage-1-spec.md and
 * stage-2-contract.md.
 *
 * Formula sources: Omron Corporation's own *Technical Guide for Servo
 * Motor Selection* (jp.omron.servo_motor_selection_guide@csm-tg-e-3-1),
 * corroborated in shape by HMK's and Voss's own guides and Oriental
 * Motor's own blog post (all four agree on the RMS-torque formula's
 * shape — stage-1-spec.md item 3). Regenerative energy is ordinary
 * kinetic-energy physics, restated by Celera Motion's own resistor-sizing
 * paper — see resolveRegenEnergy's own doc comment.
 *
 * Deliberately NOT implemented in 0.1.0: drive/amplifier current sizing
 * (no electrical-current dimension in the unit registry yet —
 * stage-1-spec.md "A Generic-Engine Gap, Not a Module Decision"); a
 * standalone holding-brake torque-capacity check (no source gives one —
 * stage-1-spec.md item 9); gearbox backlash/transmission-error/life
 * formulas (only qualitative catalog ranges by family exist —
 * stage-1-spec.md item 7).
 *
 * Values become EngineeringValues only at the module-package boundary; bare
 * numbers remain internal here, mirroring every other module's own math.ts.
 */

export class DriveTrainInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DriveTrainInputError";
  }
}

function fail(message: string): never {
  throw new DriveTrainInputError(message);
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

// --- 1. Total system inertia and inertia ratio -------------------------------

export interface TotalSystemInertiaInput {
  /** Motor rotor moment of inertia (drive.motor_rotor_inertia), in kg*m^2. Must be > 0. */
  readonly motorRotorInertiaKgM2: number;
  /** Load inertia already reflected to the motor shaft (drive.reflected_load_inertia), in kg*m^2. Must be >= 0. */
  readonly reflectedLoadInertiaKgM2: number;
}

export interface TotalSystemInertiaResult {
  readonly totalSystemInertiaKgM2: number;
}

/**
 * `J_total = J_M + J_L` (Omron's own "Motor Shaft Conversion Load Inertia"
 * plus rotor inertia, sample calculation item 6).
 */
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
  /** Load inertia already reflected to the motor shaft, in kg*m^2. Must be >= 0. */
  readonly reflectedLoadInertiaKgM2: number;
  /** Motor rotor moment of inertia, in kg*m^2. Must be > 0. */
  readonly motorRotorInertiaKgM2: number;
}

export interface InertiaRatioResult {
  readonly inertiaRatio: number;
}

/**
 * `R_J = J_L / J_M`. Sources disagree sharply on the acceptable maximum
 * (2:1 to 100:1 — stage-1-spec.md item 5); this module reports the ratio
 * and checks it against the engineer-supplied
 * `drive.inertia_ratio_maximum`, not a built-in constant.
 */
export function resolveInertiaRatio(
  input: InertiaRatioInput,
): InertiaRatioResult {
  assertNonNegative("reflectedLoadInertiaKgM2", input.reflectedLoadInertiaKgM2);
  assertPositive("motorRotorInertiaKgM2", input.motorRotorInertiaKgM2);

  return {
    inertiaRatio: input.reflectedLoadInertiaKgM2 / input.motorRotorInertiaKgM2,
  };
}

// --- 2. Motor-shaft operating speed ------------------------------------------

export interface OperatingSpeedInput {
  /** Axis linear velocity magnitude for this load case (`motion.axis.case_linear_velocity`), in m/s. Must be `>= 0`. */
  readonly linearVelocityMps: number;
  /** Ball-screw lead (`screw.lead`), in m. Must be > 0. */
  readonly leadM: number;
  /** Ball-screw-to-motor gear ratio (`screw.gear_ratio`). Must be > 0. */
  readonly gearRatio: number;
}

export interface OperatingSpeedResult {
  readonly rotationalSpeedRadPerS: number;
}

/**
 * `n_screw = v / lead` (rev/s), `n_motor = n_screw * 2*pi * gearRatio`
 * (rad/s) — the same conversion `coupling 0.1.0`'s own kernel already
 * uses for its own driving-shaft speed (stage-2-contract.md "Existing
 * Parameter Mapping"), reproduced here rather than imported: this module
 * has no dependency on `coupling`'s own package internals, only on the
 * parameter ports both modules share.
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

// --- 3. Acceleration/deceleration torque -------------------------------------

export interface AccelerationTorqueInput {
  /** Total system inertia (drive.total_system_inertia), in kg*m^2. Must be > 0. */
  readonly totalSystemInertiaKgM2: number;
  /** Peak linear acceleration (`motion.profile.peak_acceleration`), in m/s^2. Must be >= 0. */
  readonly peakAccelerationMps2: number;
  /** Peak linear deceleration (`motion.profile.peak_deceleration`), in m/s^2. Must be >= 0. */
  readonly peakDecelerationMps2: number;
  /** Ball-screw lead, in m. Must be > 0. */
  readonly leadM: number;
  /** Ball-screw-to-motor gear ratio. Must be > 0. */
  readonly gearRatio: number;
}

export interface AccelerationTorqueResult {
  readonly accelerationTorqueNm: number;
}

/**
 * `alpha = (a / lead) * 2*pi * gearRatio` (rad/s^2), `T_A = J_total * alpha`
 * (Omron's, HMK's, and Voss's own agreed shape — stage-1-spec.md item 2).
 *
 * Uses the *larger* of `peakAccelerationMps2`/`peakDecelerationMps2` as a
 * single conservative figure, not two separate values, because
 * `drive.momentary_torque = T_A + T_L` (with `T_L >= 0`) is then always at
 * least as large as the true worst single-phase torque
 * `max(T_A_accel + T_L, |T_L - T_A_decel|)` would give: `T_A + T_L >=
 * T_A_accel + T_L` when `T_A >= T_A_accel`, and `T_A + T_L >= T_A - T_L >=
 * T_A_decel - T_L >= |T_L - T_A_decel|` when `T_A >= T_A_decel` and `T_A >=
 * T_L` is not required for the first inequality (`T_A + T_L >= T_A - T_L`
 * holds whenever `T_L >= 0`). Omron's own worked example never needed this
 * generalization because its own accel/decel times (and therefore
 * magnitudes) were symmetric — `stage-2-contract.md` "Decisions" item 3's
 * own margin-separation reasoning applies the same "don't invent a tighter
 * rule than the sources give" caution here.
 */
export function resolveAccelerationTorque(
  input: AccelerationTorqueInput,
): AccelerationTorqueResult {
  assertPositive("totalSystemInertiaKgM2", input.totalSystemInertiaKgM2);
  assertNonNegative("peakAccelerationMps2", input.peakAccelerationMps2);
  assertNonNegative("peakDecelerationMps2", input.peakDecelerationMps2);
  assertPositive("leadM", input.leadM);
  assertPositive("gearRatio", input.gearRatio);

  const peakLinearAccelMps2 = Math.max(
    input.peakAccelerationMps2,
    input.peakDecelerationMps2,
  );
  const angularAccelRadPerS2 =
    (peakLinearAccelMps2 / input.leadM) * 2 * Math.PI * input.gearRatio;

  return {
    accelerationTorqueNm: input.totalSystemInertiaKgM2 * angularAccelRadPerS2,
  };
}

// --- 4. Gearbox-derated load torque ------------------------------------------

export interface GearboxDeratedLoadTorqueInput {
  /** Motor-shaft-converted load torque before gearbox derating (`screw.drive_torque`), in N*m. Must be >= 0. */
  readonly driveTorqueNm: number;
  /** Gearbox transmission efficiency (`drive.gearbox_efficiency`), `0 < eta <= 1`. */
  readonly gearboxEfficiency: number;
}

export interface GearboxDeratedLoadTorqueResult {
  readonly loadTorqueNm: number;
}

/**
 * `T_L = screw.drive_torque / eta_g`. `ball-screw 0.1.0`'s own released
 * kernel applies no efficiency loss to its own `screw.gear_ratio`
 * reduction (a real gap this module found while wiring Stage 3, not a
 * `ball-screw` defect — `stage-1-spec.md` "A Real Gap Found in an
 * Already-Released Kernel"), so this module applies the gearbox's own
 * transmission-efficiency derating itself, on top of the already-resolved
 * `screw.drive_torque`, mirroring the exact shape Omron's own `T_L =
 * T_W*G/eta` formula already uses for a gearbox's own efficiency term.
 */
export function resolveGearboxDeratedLoadTorque(
  input: GearboxDeratedLoadTorqueInput,
): GearboxDeratedLoadTorqueResult {
  assertNonNegative("driveTorqueNm", input.driveTorqueNm);
  assertFinite("gearboxEfficiency", input.gearboxEfficiency);
  if (input.gearboxEfficiency <= 0 || input.gearboxEfficiency > 1) {
    fail("gearboxEfficiency must be greater than 0 and at most 1.");
  }

  return {
    loadTorqueNm: input.driveTorqueNm / input.gearboxEfficiency,
  };
}

// --- 5. Maximum momentary torque ---------------------------------------------

export interface MomentaryTorqueInput {
  /** Acceleration/deceleration torque (drive.acceleration_torque), in N*m. Must be >= 0. */
  readonly accelerationTorqueNm: number;
  /** Gearbox-derated load torque for this case, in N*m. Must be >= 0. */
  readonly loadTorqueNm: number;
}

export interface MomentaryTorqueResult {
  readonly momentaryTorqueNm: number;
}

/**
 * `T1 = T_A + T_L` (Omron's own "Maximum Momentary Torque" formula,
 * sample calculation item 8) — see resolveAccelerationTorque's own doc
 * comment for why a single, conservative `T_A` bounds the true per-phase
 * worst case.
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

// --- 6. Effective (RMS) torque -----------------------------------------------

export interface EffectiveTorqueInput {
  /** Total system inertia, in kg*m^2. Must be > 0. */
  readonly totalSystemInertiaKgM2: number;
  /** Cycle-level RMS linear acceleration (`motion.profile.rms_acceleration`), in m/s^2. Must be >= 0. */
  readonly rmsAccelerationMps2: number;
  /** Ball-screw lead, in m. Must be > 0. */
  readonly leadM: number;
  /** Ball-screw-to-motor gear ratio. Must be > 0. */
  readonly gearRatio: number;
  /** Gearbox-derated load torque for this case, in N*m. Must be >= 0. */
  readonly loadTorqueNm: number;
}

export interface EffectiveTorqueResult {
  readonly effectiveTorqueNm: number;
}

/**
 * `Trms^2 = (J_total * 2*pi*gearRatio/lead)^2 * a_rms^2 + T_L^2`, the closed
 * form `context/modules/drive-train/stage-2-contract.md` "Decisions" item 4
 * derives from Omron's/HMK's/Voss's own `Trms = sqrt(sum(T_i^2 * t_i) /
 * sum(t_i))` shape: valid when total system inertia and the per-case load
 * torque both stay constant across a cycle that returns to its starting
 * velocity (true here — `screw.drive_torque` is already a single value per
 * case, not per-phase). This project's own derivation, not stated by any
 * source read in Stage 1 — recorded as an assumption on every calculation
 * (see ./trace.ts), not a settled fact.
 */
export function resolveEffectiveTorque(
  input: EffectiveTorqueInput,
): EffectiveTorqueResult {
  assertPositive("totalSystemInertiaKgM2", input.totalSystemInertiaKgM2);
  assertNonNegative("rmsAccelerationMps2", input.rmsAccelerationMps2);
  assertPositive("leadM", input.leadM);
  assertPositive("gearRatio", input.gearRatio);
  assertNonNegative("loadTorqueNm", input.loadTorqueNm);

  const torquePerLinearAccel =
    (input.totalSystemInertiaKgM2 * 2 * Math.PI * input.gearRatio) /
    input.leadM;
  const inertialRmsTorqueNm = torquePerLinearAccel * input.rmsAccelerationMps2;

  return {
    effectiveTorqueNm: Math.sqrt(
      inertialRmsTorqueNm ** 2 + input.loadTorqueNm ** 2,
    ),
  };
}

// --- 7. Regenerative energy ---------------------------------------------------

export interface RegenEnergyInput {
  /** Total system inertia, in kg*m^2. Must be > 0. */
  readonly totalSystemInertiaKgM2: number;
  /** Axis linear velocity magnitude for this load case, in m/s. Must be >= 0. */
  readonly linearVelocityMps: number;
  /** Ball-screw lead, in m. Must be > 0. */
  readonly leadM: number;
  /** Ball-screw-to-motor gear ratio. Must be > 0. */
  readonly gearRatio: number;
}

export interface RegenEnergyResult {
  readonly regenEnergyJ: number;
}

/**
 * `E = J_total * omega^2 / 2`, the ordinary kinetic energy released
 * decelerating the total system inertia from `motion.axis.
 * case_linear_velocity`-derived motor-shaft speed to rest — the same
 * relationship independently restated across every source read in Stage 1
 * (`E_RE = J*(N1^2-N2^2)/182` in rpm-based form; stage-1-spec.md item 10),
 * here with `N2 = 0` (assumes the case's own deceleration phase brings the
 * axis to rest, matching a point-to-point positioning move). Assumes 100%
 * of this energy reaches the drive's own absorption path, per Celera
 * Motion's own stated simplifying assumption — no drive-electronics
 * efficiency loss or DC-bus capacitor-absorption credit is modeled
 * (stage-2-contract.md "Decisions" item 6).
 */
export function resolveRegenEnergy(input: RegenEnergyInput): RegenEnergyResult {
  assertPositive("totalSystemInertiaKgM2", input.totalSystemInertiaKgM2);
  assertNonNegative("linearVelocityMps", input.linearVelocityMps);
  assertPositive("leadM", input.leadM);
  assertPositive("gearRatio", input.gearRatio);

  const omegaRadPerS =
    (input.linearVelocityMps / input.leadM) * 2 * Math.PI * input.gearRatio;

  return {
    regenEnergyJ: (input.totalSystemInertiaKgM2 * omegaRadPerS ** 2) / 2,
  };
}
