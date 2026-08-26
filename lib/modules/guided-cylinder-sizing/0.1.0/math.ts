/**
 * Pure SI/mm-number kernel for the guided-cylinder-sizing module
 * (Unit 7.3). Reproduces (independently, not imported -- ADR-0011's reuse
 * policy) pneumatic-cylinder-sizing@0.1.0's own resolveRequiredForce,
 * resolvePistonAreas, resolveTheoreticalForce, resolveCushionKineticEnergy,
 * resolveBucklingLoad, and resolvePermissibleCompressiveLoad unchanged
 * (see context/modules/guided-cylinder-sizing/stage-1-spec.md correction
 * 1: both fetched SMC MGQ/MGP catalogs confirm the identical F = P*A
 * theoretical-output shape), and adds a new resolveRequiredMoment for the
 * guide plate's own roll/pitch/yaw lateral-load moment check that a
 * round-body cylinder has no equivalent of.
 *
 * Same mm/MPa/N/N*m unit-system choice as pneumatic-cylinder-sizing@0.1.0's
 * own math.ts, for the same reason: 1 MPa = 1 N/mm^2 exactly, so
 * force[N] = loadFactor * area[mm^2] * pressure[MPa] needs no conversion
 * constant.
 */

/** Thrown when an input falls outside this kernel's explicit validity envelope. */
export class GuidedCylinderSizingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuidedCylinderSizingInputError";
  }
}

function fail(message: string): never {
  throw new GuidedCylinderSizingInputError(message);
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
 * Standard gravity, in m/s^2. Baked into the kernel, not a port -- matches
 * every current Motor Sizing module's own convention and
 * pneumatic-cylinder-sizing@0.1.0's own precedent.
 */
export const STANDARD_GRAVITY_M_PER_S2 = 9.80665;

// --- 1. Required force (reproduced from pneumatic-cylinder-sizing@0.1.0) --

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
 * Reproduces pneumatic-cylinder-sizing@0.1.0's own resolveRequiredForce
 * exactly (context/modules/guided-cylinder-sizing/stage-1-spec.md "Load
 * Resolution"): forward (extend) adds the gravity term, return (retract)
 * subtracts it; friction is direction-symmetric (always added); process
 * force is added only for "extend". The result may be negative for
 * "retract" on a strongly gravity-assisted return stroke -- a real,
 * physically meaningful output, never floored here.
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

// --- 2. Piston areas (reproduced from pneumatic-cylinder-sizing@0.1.0) ----

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

/** `A1 = pi*D^2/4`, `A2 = pi*(D^2-d^2)/4` -- SMC's own Table (1) formula shape, confirmed directly in both fetched MGQ/MGP catalogs' own Theoretical Output tables. */
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

// --- 3. Theoretical force (reproduced from pneumatic-cylinder-sizing@0.1.0) -

export interface TheoreticalForceInput {
  readonly areaMm2: number;
  readonly pressureMPa: number;
  readonly loadFactor: number;
}

export interface TheoreticalForceResult {
  readonly forceN: number;
}

/** `F = eta * A * P`. Both fetched MGQ/MGP catalogs print `F = P * A` (no separate eta column) -- eta is applied as the engineer's own sizing margin on top, the same relationship established for CM2/CA2 (stage-1-spec.md correction 1). */
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

// --- 4. Cushion kinetic energy (reproduced from pneumatic-cylinder-sizing@0.1.0) -

export interface CushionKineticEnergyInput {
  readonly loadMassKg: number;
  readonly maxPistonSpeedMps: number;
}

export interface CushionKineticEnergyResult {
  readonly kineticEnergyJ: number;
}

/** `E = (m/2) * V^2` (SMC's own formula (7)). Reported only in this module's own 0.1.0 -- neither MGQ nor MGP catalog publishes a discrete allowable-kinetic-energy figure to check it against (stage-1-spec.md correction 5). */
export function resolveCushionKineticEnergy(
  input: CushionKineticEnergyInput,
): CushionKineticEnergyResult {
  assertPositive("loadMassKg", input.loadMassKg);
  assertPositive("maxPistonSpeedMps", input.maxPistonSpeedMps);

  return {
    kineticEnergyJ: (input.loadMassKg / 2) * input.maxPistonSpeedMps ** 2,
  };
}

// --- 5. Piston-rod buckling (reproduced from pneumatic-cylinder-sizing@0.1.0) -

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
  /** Unsupported column length -- this module uses required_stroke, not a candidate's own catalog stroke. Must be > 0. */
  readonly columnLengthMm: number;
  readonly mountingStyle: PneumaticMountingStyle;
}

export interface BucklingLoadResult {
  readonly bucklingLoadN: number;
}

/** `Fk = factor * pi^2 * E * J / L^2`, `J = pi*d^4/64`. Same disclosed evidence gap as pneumatic-cylinder-sizing@0.1.0: no pneumatic-cylinder-manufacturer source supplies a closed-form buckling formula. */
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

/** `F_perm = Fk / S` -- a divisor, matching pneumatic-cylinder-sizing@0.1.0's own convention. */
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

// --- 6. Required moment (new) ----------------------------------------------

export interface RequiredMomentInput {
  /** The lateral force the guide plate's own load must resist -- this module's own required_extend_force, in N. Must be >= 0. */
  readonly lateralForceN: number;
  /** Unsigned lever-arm distance along the roll axis, in mm. Must be >= 0. */
  readonly rollOffsetMm: number;
  /** Unsigned lever-arm distance along the pitch axis, in mm. Must be >= 0. */
  readonly pitchOffsetMm: number;
  /** Unsigned lever-arm distance along the yaw axis, in mm. Must be >= 0. */
  readonly yawOffsetMm: number;
}

export interface RequiredMomentResult {
  readonly rollMomentNm: number;
  readonly pitchMomentNm: number;
  readonly yawMomentNm: number;
  readonly requiredMomentNm: number;
}

/**
 * `M_axis = F * d_axis` (ordinary statics, mm converted to m for an N*m
 * result), combined as `M_req = sqrt(M_roll^2 + M_pitch^2 + M_yaw^2)`.
 * Checked against each MGQ/MGP catalog candidate's own single published
 * allowable-rotational-torque-of-plate rating. The Euclidean-sum
 * combination is this module's own engineering assumption -- neither
 * fetched SMC catalog documents how to combine independently-computed
 * moments against its one published figure (context/modules/
 * guided-cylinder-sizing/stage-1-spec.md "Moment Resolution",
 * stage-2-contract.md Decision 5). Not a sourced formula; disclosed as an
 * assumption in the calculation trace and validation record.
 */
export function resolveRequiredMoment(
  input: RequiredMomentInput,
): RequiredMomentResult {
  assertNonNegative("lateralForceN", input.lateralForceN);
  assertNonNegative("rollOffsetMm", input.rollOffsetMm);
  assertNonNegative("pitchOffsetMm", input.pitchOffsetMm);
  assertNonNegative("yawOffsetMm", input.yawOffsetMm);

  const MM_PER_M = 1000;
  const rollMomentNm = (input.lateralForceN * input.rollOffsetMm) / MM_PER_M;
  const pitchMomentNm = (input.lateralForceN * input.pitchOffsetMm) / MM_PER_M;
  const yawMomentNm = (input.lateralForceN * input.yawOffsetMm) / MM_PER_M;

  const requiredMomentNm = Math.sqrt(
    rollMomentNm ** 2 + pitchMomentNm ** 2 + yawMomentNm ** 2,
  );

  return { rollMomentNm, pitchMomentNm, yawMomentNm, requiredMomentNm };
}
