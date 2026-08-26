/**
 * Pure SI/mm-number kernel for the pneumatic-cylinder-sizing module
 * (Unit 7.2). Resolves required extend/retract force (new physics, this
 * module's own forward/return convention -- see stage-2-contract.md
 * Decision 1) and reproduces (independently, not imported --
 * ADR-0011's reuse policy) pneumatic-cylinder@0.1.0's own piston-area,
 * theoretical-force, cushion-kinetic-energy, and Euler buckling formulas,
 * since the catalog matcher (lib/application/catalogs/
 * pneumatic-cylinder-matching.ts) evaluates every candidate row through
 * these same functions.
 *
 * Same mm/MPa/N unit-system choice as pneumatic-cylinder@0.1.0's own
 * math.ts, for the same reason: 1 MPa = 1 N/mm^2 exactly, so
 * force[N] = loadFactor * area[mm^2] * pressure[MPa] needs no conversion
 * constant.
 */

/** Thrown when an input falls outside this kernel's explicit validity envelope. */
export class PneumaticCylinderSizingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PneumaticCylinderSizingInputError";
  }
}

function fail(message: string): never {
  throw new PneumaticCylinderSizingInputError(message);
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

/**
 * Standard gravity, in m/s^2. Baked into the kernel, not a port --
 * matches every current Motor Sizing Tool module's own post-
 * consistency-pass convention (docs/superpowers/specs/
 * 2026-08-18-motor-sizing-consistency-pass-design.md), not the older
 * gravity-as-input pattern.
 */
export const STANDARD_GRAVITY_M_PER_S2 = 9.80665;

// --- 1. Required force (new; forward/return convention) -------------------

export type PneumaticSizingDirection = "extend" | "retract";

export interface RequiredForceInput {
  /** Additive process force, in N. Applied only for direction === "extend". Must be >= 0. */
  readonly processForceN: number;
  /** Moved load mass, in kg. Must be > 0. */
  readonly loadMassKg: number;
  /** Installation incline angle, in rad. Must be in [0, pi/2]. */
  readonly inclineAngleRad: number;
  /** Coulomb friction coefficient, unsigned. Must be >= 0. */
  readonly frictionCoefficient: number;
  readonly direction: PneumaticSizingDirection;
}

export interface RequiredForceResult {
  readonly forceN: number;
}

/**
 * Reproduces ball-screw-motor-sizing@0.2.0's own resolveDriveForce sign
 * convention (stage-2-contract.md Decision 1): forward (extend) adds the
 * gravity term, return (retract) subtracts it; friction is direction-
 * symmetric (always added, since Coulomb friction opposes motion
 * regardless of direction). Process force is added only for "extend"
 * (stage-2-contract.md Decision 3). The result may be negative for
 * "retract" on a strongly gravity-assisted return stroke -- a real,
 * physically meaningful output (the actuator must resist/brake rather
 * than drive), never floored here.
 */
export function resolveRequiredForce(
  input: RequiredForceInput,
): RequiredForceResult {
  assertNonNegative("processForceN", input.processForceN);
  assertPositive("loadMassKg", input.loadMassKg);
  assertFinite("inclineAngleRad", input.inclineAngleRad);
  if (input.inclineAngleRad < 0 || input.inclineAngleRad > Math.PI / 2) {
    fail("inclineAngleRad must be within [0, pi/2].");
  }
  assertNonNegative("frictionCoefficient", input.frictionCoefficient);

  const weightN = input.loadMassKg * STANDARD_GRAVITY_M_PER_S2;
  const gravityTermN = weightN * Math.sin(input.inclineAngleRad);
  const frictionTermN =
    weightN * input.frictionCoefficient * Math.cos(input.inclineAngleRad);

  const directionalGravityTermN =
    input.direction === "extend" ? gravityTermN : -gravityTermN;
  const processForceN = input.direction === "extend" ? input.processForceN : 0;

  return {
    forceN: processForceN + directionalGravityTermN + frictionTermN,
  };
}

// --- 2. Piston areas (reproduced from pneumatic-cylinder@0.1.0) -----------

export interface PistonAreasInput {
  /** Candidate cylinder bore (piston) diameter, in mm. Must be > 0. */
  readonly boreDiameterMm: number;
  /** Candidate cylinder piston rod diameter, in mm. Must be > 0 and less than boreDiameterMm. */
  readonly rodDiameterMm: number;
}

export interface PistonAreasResult {
  readonly extendAreaMm2: number;
  readonly retractAreaMm2: number;
}

/** `A1 = pi*D^2/4`, `A2 = pi*(D^2-d^2)/4` -- see pneumatic-cylinder@0.1.0's own math.ts for the source citation (SMC's own Table (1), agreed by both candidate sources). */
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

// --- 3. Theoretical force (reproduced from pneumatic-cylinder@0.1.0) ------

export interface TheoreticalForceInput {
  readonly areaMm2: number;
  readonly pressureMPa: number;
  readonly loadFactor: number;
}

export interface TheoreticalForceResult {
  readonly forceN: number;
}

/** `F = eta * A * P` (SMC's own formulas (1)/(2)). */
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

// --- 4. Cushion kinetic energy (reproduced from pneumatic-cylinder@0.1.0) -

export interface CushionKineticEnergyInput {
  readonly loadMassKg: number;
  readonly maxPistonSpeedMps: number;
}

export interface CushionKineticEnergyResult {
  readonly kineticEnergyJ: number;
}

/** `E = (m/2) * V^2` (SMC's own formula (7)). */
export function resolveCushionKineticEnergy(
  input: CushionKineticEnergyInput,
): CushionKineticEnergyResult {
  assertPositive("loadMassKg", input.loadMassKg);
  assertPositive("maxPistonSpeedMps", input.maxPistonSpeedMps);

  return {
    kineticEnergyJ: (input.loadMassKg / 2) * input.maxPistonSpeedMps ** 2,
  };
}

// --- 5. Piston-rod buckling (reproduced from pneumatic-cylinder@0.1.0) ----

export type PneumaticMountingStyle =
  "fixed-fixed" | "fixed-supported" | "supported-supported" | "fixed-free";

const BUCKLING_END_FIXITY_FACTOR: Record<PneumaticMountingStyle, number> = {
  "fixed-free": 0.25,
  "supported-supported": 1.0,
  "fixed-supported": 2.0,
  "fixed-fixed": 4.0,
};

/** Elastic modulus of steel, in N/mm^2 (210 GPa) -- see pneumatic-cylinder@0.1.0's own math.ts for the source citation (Hänchen). Not an exposed port. */
const STEEL_ELASTIC_MODULUS_N_PER_MM2 = 210_000;

function endFixityFactor(arrangement: PneumaticMountingStyle): number {
  const factor = BUCKLING_END_FIXITY_FACTOR[arrangement];
  if (factor === undefined) {
    fail(`Unknown mountingStyle: "${String(arrangement)}".`);
  }
  return factor;
}

export interface BucklingLoadInput {
  /** Candidate cylinder's own rod diameter, in mm. Must be > 0. */
  readonly rodDiameterMm: number;
  /** Unsupported column length -- this module uses required_stroke, not a candidate's own catalog stroke (see compute.ts). Must be > 0. */
  readonly columnLengthMm: number;
  readonly mountingStyle: PneumaticMountingStyle;
}

export interface BucklingLoadResult {
  readonly bucklingLoadN: number;
}

/** `Fk = factor * pi^2 * E * J / L^2`, `J = pi*d^4/64`. */
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
  readonly bucklingLoadN: number;
  readonly bucklingSafetyFactor: number;
}

export interface PermissibleCompressiveLoadResult {
  readonly permissibleCompressiveLoadN: number;
}

/** `F_perm = Fk / S` -- a divisor, matching pneumatic-cylinder@0.1.0's own convention. */
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
