/**
 * Pure SI/mm-number kernel for the pneumatic-cylinder module (Unit 7.1).
 * Resolves: piston areas, theoretical extend/retract force, cushion
 * kinetic energy, piston-rod Euler buckling, and air consumption/required
 * air volume -- see context/modules/pneumatic-cylinder/stage-1-spec.md and
 * stage-2-contract.md.
 *
 * Deliberately not SI-only: bore/rod/stroke/piping geometry is kept in
 * millimetres and pressure in megapascals throughout, matching
 * `pneumatic.*`'s own canonicalUnit choices (mm, MPa -- not m, Pa, unlike
 * `screw.*`). This is not a convenience shortcut: 1 MPa = 1 N/mm^2 exactly,
 * so `force[N] = loadFactor * area[mm^2] * pressure[MPa]` falls out with no
 * conversion constant, reproducing SMC's own formulas (1)-(2) exactly as
 * printed (stage-1-spec.md "Candidate Sources" item 1). Mixing this
 * mm/MPa/N system with ball-screw's own m/Pa/N system within one function
 * would be the real error; each module's kernel commits to the unit system
 * its own source formulas are printed in, matching ball-screw's own
 * inch/lbf choice for its Rockford-sourced buckling/critical-speed
 * formulas.
 *
 * This is deliberately not a ModulePackage: bare numbers are used
 * internally; EngineeringValues are constructed only at the module-package
 * boundary (./compute.ts), mirroring every other module's own math.ts.
 */

/** Thrown when an input falls outside this kernel's explicit validity envelope. */
export class PneumaticCylinderInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PneumaticCylinderInputError";
  }
}

function fail(message: string): never {
  throw new PneumaticCylinderInputError(message);
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

// --- 1. Piston areas ----------------------------------------------------

export interface PistonAreasInput {
  /** Cylinder bore (piston) diameter, in mm. Must be > 0. */
  readonly boreDiameterMm: number;
  /** Piston rod diameter, in mm. Must be > 0 and less than boreDiameterMm. */
  readonly rodDiameterMm: number;
}

export interface PistonAreasResult {
  /** Extend (thrust) side piston area, A1, in mm^2. */
  readonly extendAreaMm2: number;
  /** Retract (pull) side piston area (annulus), A2, in mm^2. */
  readonly retractAreaMm2: number;
}

/**
 * `A1 = pi*D^2/4`, `A2 = pi*(D^2-d^2)/4`. Direct geometric formulas, agreed
 * by both candidate sources; SMC's own printed piston-area table (Table
 * (1)) matches this formula to catalog-rounding precision (~3 significant
 * figures) across every entry cross-checked this session --
 * context/modules/pneumatic-cylinder/stage-2-contract.md "Stage 3 Entry
 * Criteria" item 3.
 */
export function resolvePistonAreas(input: PistonAreasInput): PistonAreasResult {
  assertPositive("boreDiameterMm", input.boreDiameterMm);
  assertPositive("rodDiameterMm", input.rodDiameterMm);
  if (input.rodDiameterMm >= input.boreDiameterMm) {
    fail("rodDiameterMm must be less than boreDiameterMm.");
  }

  const extendAreaMm2 = (Math.PI * input.boreDiameterMm ** 2) / 4;
  const retractAreaMm2 =
    (Math.PI * (input.boreDiameterMm ** 2 - input.rodDiameterMm ** 2)) / 4;

  return { extendAreaMm2, retractAreaMm2 };
}

// --- 2. Theoretical force -------------------------------------------------

export interface TheoreticalForceInput {
  /** Piston area on the side being evaluated (A1 or A2), in mm^2. Must be > 0. */
  readonly areaMm2: number;
  /** Gauge operating pressure at the cylinder, in MPa. Must be > 0. */
  readonly pressureMPa: number;
  /** SMC's own load factor (eta), `0 <= eta <= 1`. */
  readonly loadFactor: number;
}

export interface TheoreticalForceResult {
  readonly forceN: number;
}

/**
 * `F = eta * A * P` (SMC's own formulas (1)/(2), F1 = eta*A1*P extend,
 * F2 = eta*A2*P retract -- the same function evaluated with each side's
 * own area). `1 MPa = 1 N/mm^2` exactly, so no conversion constant is
 * needed for `area[mm^2] * pressure[MPa]` to yield newtons directly.
 */
export function resolveTheoreticalForce(
  input: TheoreticalForceInput,
): TheoreticalForceResult {
  assertPositive("areaMm2", input.areaMm2);
  assertPositive("pressureMPa", input.pressureMPa);
  assertFinite("loadFactor", input.loadFactor);
  if (input.loadFactor < 0 || input.loadFactor > 1) {
    fail("loadFactor must be between 0 and 1.");
  }

  return { forceN: input.loadFactor * input.areaMm2 * input.pressureMPa };
}

// --- 3. Cushion kinetic energy --------------------------------------------

export interface CushionKineticEnergyInput {
  /** Load mass moved by the piston, in kg. Must be > 0. */
  readonly loadMassKg: number;
  /** Piston speed at end of stroke, in m/s. Must be > 0. */
  readonly maxPistonSpeedMps: number;
}

export interface CushionKineticEnergyResult {
  readonly kineticEnergyJ: number;
}

/**
 * `E = (m/2) * V^2` (SMC's own formula (7)) --
 * context/modules/pneumatic-cylinder/stage-1-spec.md item 2.
 */
export function resolveCushionKineticEnergy(
  input: CushionKineticEnergyInput,
): CushionKineticEnergyResult {
  assertPositive("loadMassKg", input.loadMassKg);
  assertPositive("maxPistonSpeedMps", input.maxPistonSpeedMps);

  return {
    kineticEnergyJ: (input.loadMassKg / 2) * input.maxPistonSpeedMps ** 2,
  };
}

// --- 4. Piston-rod buckling (Euler column) --------------------------------

export type PneumaticMountingStyle =
  "fixed-fixed" | "fixed-supported" | "supported-supported" | "fixed-free";

/**
 * The classic Euler effective-length-factor values (`1/K^2` for
 * `K = 2, 1, 0.7, 0.5`) -- textbook physics, not a manufacturer-proprietary
 * fit, the same four cases and the same values ball-screw's own
 * `BUCKLING_END_FIXITY_FACTOR` (lib/modules/ball-screw/0.1.0/math.ts) uses
 * for the identical column-buckling physics on a different component.
 * Reproduced independently here, not imported --
 * context/modules/pneumatic-cylinder/stage-2-contract.md "Decisions" item 3.
 */
const BUCKLING_END_FIXITY_FACTOR: Record<PneumaticMountingStyle, number> = {
  "fixed-free": 0.25,
  "supported-supported": 1.0,
  "fixed-supported": 2.0,
  "fixed-fixed": 4.0,
};

/**
 * Elastic modulus of steel, in N/mm^2 (210 GPa). Hänchen's own generic
 * hydraulic-cylinder reference gives this value; no source read for this
 * module suggests a pneumatic cylinder rod is anything but standard steel
 * (context/modules/pneumatic-cylinder/stage-2-contract.md "Decisions"
 * item 3). Not an exposed module input -- the same "baked into the
 * kernel, not a port" treatment ball-screw's own Rockford-sourced buckling
 * constant receives.
 */
const STEEL_ELASTIC_MODULUS_N_PER_MM2 = 210_000;

function endFixityFactor(arrangement: PneumaticMountingStyle): number {
  const factor = BUCKLING_END_FIXITY_FACTOR[arrangement];
  if (factor === undefined) {
    fail(`Unknown mountingStyle: "${String(arrangement)}".`);
  }
  return factor;
}

export interface BucklingLoadInput {
  /** Piston rod diameter, in mm. Must be > 0. */
  readonly rodDiameterMm: number;
  /**
   * Unsupported column length of the piston rod under compression, in mm.
   * This module's own registry has no dedicated "unsupported length" port
   * distinct from the cylinder's own stroke -- `pneumatic.stroke` is used
   * directly (its own registry definition names this use:
   * "Used by the buckling check (unsupported column length)"). Must be > 0.
   */
  readonly columnLengthMm: number;
  readonly mountingStyle: PneumaticMountingStyle;
}

export interface BucklingLoadResult {
  /** Unfactored theoretical Euler column buckling load, in N. */
  readonly bucklingLoadN: number;
}

/**
 * `Fk = factor * pi^2 * E * J / L^2`, `J = pi*d^4/64` (solid round rod) --
 * the generic Euler column formula (Hänchen's own generic reference
 * confirms this shape; stage-1-spec.md item 4), evaluated with the same
 * four effective-length-factor cases ball-screw's own buckling kernel
 * uses, reproduced independently for this module's own rod geometry --
 * context/modules/pneumatic-cylinder/stage-2-contract.md "Stage 3 Entry
 * Criteria" item 4. `E` and `J` are both in mm-based units (N/mm^2, mm^4),
 * so `Fk` comes out in newtons directly with no conversion.
 */
export function resolveBucklingLoad(
  input: BucklingLoadInput,
): BucklingLoadResult {
  assertPositive("rodDiameterMm", input.rodDiameterMm);
  assertPositive("columnLengthMm", input.columnLengthMm);

  const factor = endFixityFactor(input.mountingStyle);
  const rodMomentOfInertiaMm4 = (Math.PI * input.rodDiameterMm ** 4) / 64;

  const bucklingLoadN =
    (factor *
      Math.PI ** 2 *
      STEEL_ELASTIC_MODULUS_N_PER_MM2 *
      rodMomentOfInertiaMm4) /
    input.columnLengthMm ** 2;

  return { bucklingLoadN };
}

export interface PermissibleCompressiveLoadInput {
  /** Unfactored theoretical Euler column buckling load, in N. Must be > 0. */
  readonly bucklingLoadN: number;
  /** Engineer-supplied safety factor (divisor), `>= 1`. Must be >= 1. */
  readonly bucklingSafetyFactor: number;
}

export interface PermissibleCompressiveLoadResult {
  readonly permissibleCompressiveLoadN: number;
}

/**
 * `F_perm = Fk / S` -- a divisor, not a multiplier, unlike ball-screw's own
 * `screw.buckling_safety_margin`: Hänchen's own source states this as a
 * divide-by factor of safety (`Fk_allowable = Fk / S`), the universal
 * "factor of safety" convention, the one source this project has for the
 * number's magnitude --
 * context/modules/pneumatic-cylinder/stage-2-contract.md "Decisions"
 * item 3.
 */
export function resolvePermissibleCompressiveLoad(
  input: PermissibleCompressiveLoadInput,
): PermissibleCompressiveLoadResult {
  assertPositive("bucklingLoadN", input.bucklingLoadN);
  assertFinite("bucklingSafetyFactor", input.bucklingSafetyFactor);
  if (input.bucklingSafetyFactor < 1) {
    fail("bucklingSafetyFactor must be at least 1.");
  }

  return {
    permissibleCompressiveLoadN:
      input.bucklingLoadN / input.bucklingSafetyFactor,
  };
}

// --- 5. Air consumption and required air volume ---------------------------

export interface AirDemandInput {
  /** Extend-side piston area (A1), in mm^2. Must be > 0. */
  readonly extendAreaMm2: number;
  /** Retract-side piston area (A2), in mm^2. Must be > 0. */
  readonly retractAreaMm2: number;
  /** Cylinder stroke, in mm. Must be > 0. */
  readonly strokeMm: number;
  /** Gauge operating pressure, in MPa. Must be > 0. */
  readonly pressureMPa: number;
  /**
   * Piping internal bore, in mm. `0` (the same value as no piping
   * configured) drops the piping term entirely. Must be `>= 0`.
   */
  readonly pipingBoreMm: number;
  /** Piping length, in mm. Must be `>= 0`. */
  readonly pipingLengthMm: number;
  /**
   * Piston speed at end of stroke, in m/s. Used only to approximate stroke
   * time (see {@link AirDemandResult}). Must be > 0.
   */
  readonly maxPistonSpeedMps: number;
}

export interface AirDemandResult {
  /**
   * Free-air-equivalent volume consumed by the cylinder and its piping over
   * one full stroke cycle, in L (SMC's own dm^3(ANR), identical to the
   * liter -- stage-1-spec.md item 3).
   */
  readonly airConsumptionPerCycleL: number;
  /**
   * Free-air-equivalent volumetric flow rate required to run the cylinder
   * at `maxPistonSpeedMps`, in L/min.
   */
  readonly requiredAirVolumeLPerMin: number;
}

/**
 * SMC's own formulas (8)-(16) (stage-1-spec.md item 3):
 *
 * ```text
 * qc1 = A1*L*(P+0.1)/0.1*1e-6   qc2 = A2*L*(P+0.1)/0.1*1e-6
 * qp1 = a*l*P/0.1*1e-6          qp2 = a*l*P/0.1*1e-6
 * q   = qc1+qp1+qc2+qp2
 * Q1  = (qc1+qp1)/t*60          Q2 = (qc2+qp2)/t*60
 * Q   = max(Q1, Q2)
 * ```
 *
 * Two documented simplifications, both required because this module has no
 * corresponding registered input (context/modules/pneumatic-cylinder/
 * stage-2-contract.md "Released Additive Contract" -- 22 parameters, none
 * of them a per-side pressure/piping pair or a stroke-time value):
 *
 * - **Symmetric piping**: SMC's own formula allows independent `a1/l1/P1`
 *   (extend) and `a2/l2/P2` (retract) piping legs; this module has only one
 *   `pneumatic.piping_bore`/`pneumatic.piping_length` pair and one
 *   `pneumatic.operating_pressure`, applied identically to both `qp1` and
 *   `qp2`. Confirmed against SMC's own worked example this session (bore
 *   50 mm, stroke 600 mm, 0.5 MPa, 2 m/6 mm piping): with a 20 mm rod,
 *   `qc1+qc2` reproduces the source's own printed ~13 L and `qp1+qp2`
 *   reproduces its own printed ~0.56 L exactly under this same-piping
 *   assumption -- see ./smc-reference-examples.ts.
 * - **Stroke time**: SMC's own `t1`/`t2` are the extend/retract stroke
 *   times; this module derives a single `strokeMm / maxPistonSpeedMps`
 *   approximation (constant speed for the whole stroke, using the same
 *   end-of-stroke speed this module's own cushion check already takes as
 *   an engineer-supplied input) rather than modeling acceleration, applied
 *   to both `Q1` and `Q2`. `air_consumption_per_cycle`/
 *   `required_air_volume` are reported, not evaluated
 *   (stage-1-spec.md "Validity Envelope") -- informational figures for
 *   compressor/FRL-equipment sizing outside this module's own scope, so
 *   this approximation does not affect any pass/fail check.
 */
export function resolveAirDemand(input: AirDemandInput): AirDemandResult {
  assertPositive("extendAreaMm2", input.extendAreaMm2);
  assertPositive("retractAreaMm2", input.retractAreaMm2);
  assertPositive("strokeMm", input.strokeMm);
  assertPositive("pressureMPa", input.pressureMPa);
  assertNonNegative("pipingBoreMm", input.pipingBoreMm);
  assertNonNegative("pipingLengthMm", input.pipingLengthMm);
  assertPositive("maxPistonSpeedMps", input.maxPistonSpeedMps);

  const ATMOSPHERIC_PRESSURE_MPA = 0.1;

  const qc1 =
    input.extendAreaMm2 *
    input.strokeMm *
    ((input.pressureMPa + ATMOSPHERIC_PRESSURE_MPA) /
      ATMOSPHERIC_PRESSURE_MPA) *
    1e-6;
  const qc2 =
    input.retractAreaMm2 *
    input.strokeMm *
    ((input.pressureMPa + ATMOSPHERIC_PRESSURE_MPA) /
      ATMOSPHERIC_PRESSURE_MPA) *
    1e-6;

  const pipingAreaMm2 = (Math.PI * input.pipingBoreMm ** 2) / 4;
  const pipingTermL =
    pipingAreaMm2 *
    input.pipingLengthMm *
    (input.pressureMPa / ATMOSPHERIC_PRESSURE_MPA) *
    1e-6;
  // Symmetric piping (see doc comment): qp1 = qp2 = pipingTermL.
  const qp1 = pipingTermL;
  const qp2 = pipingTermL;

  const airConsumptionPerCycleL = qc1 + qp1 + qc2 + qp2;

  const strokeTimeS = input.strokeMm / 1000 / input.maxPistonSpeedMps;
  const q1LPerMin = ((qc1 + qp1) / strokeTimeS) * 60;
  const q2LPerMin = ((qc2 + qp2) / strokeTimeS) * 60;

  return {
    airConsumptionPerCycleL,
    requiredAirVolumeLPerMin: Math.max(q1LPerMin, q2LPerMin),
  };
}
