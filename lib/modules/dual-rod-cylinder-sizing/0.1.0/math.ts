/**
 * Pure SI/mm-number kernel for the dual-rod-cylinder-sizing module
 * (Unit 7.4). Reproduces (independently, not imported -- ADR-0011's reuse
 * policy) pneumatic-cylinder-sizing@0.1.0's own resolveRequiredForce,
 * resolvePistonAreas, resolveTheoreticalForce, and
 * resolveCushionKineticEnergy unchanged, and adds a new
 * resolveAllowableLoadMass for the load-mass-vs-overhang-length structural
 * check unique to this twin-guide-rod mechanism. Unlike every other
 * pneumatic sizing module in this project, there is NO buckling section
 * here -- SMC's own CXS2 catalog gives no buckling formula, and this
 * mechanism's own governing structural check is the load-mass-vs-overhang
 * lookup instead (context/modules/dual-rod-cylinder-sizing/
 * stage-1-spec.md "No buckling check for this family").
 *
 * Same mm/MPa/N unit-system choice as pneumatic-cylinder-sizing@0.1.0's
 * own math.ts, for the same reason: 1 MPa = 1 N/mm^2 exactly, so
 * force[N] = loadFactor * area[mm^2] * pressure[MPa] needs no conversion
 * constant.
 */

/** Thrown when an input falls outside this kernel's explicit validity envelope. */
export class DualRodCylinderSizingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DualRodCylinderSizingInputError";
  }
}

function fail(message: string): never {
  throw new DualRodCylinderSizingInputError(message);
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
 * exactly: forward (extend) adds the gravity term, return (retract)
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

/**
 * `A1 = pi*D^2/4`, `A2 = pi*(D^2-d^2)/4`. Single bore-dependent area pair,
 * not doubled -- confirmed directly against CXS2's own "Theoretical
 * Output" table, which is numerically identical to the older CXSJ
 * catalog's own table (stage-1-spec.md "A marketing claim... found not to
 * hold").
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

// --- 3. Theoretical force (reproduced from pneumatic-cylinder-sizing@0.1.0) -

export interface TheoreticalForceInput {
  readonly areaMm2: number;
  readonly pressureMPa: number;
  readonly loadFactor: number;
}

export interface TheoreticalForceResult {
  readonly forceN: number;
}

/** `F = eta * A * P` (SMC's own formula shape, confirmed against CXS2's own Theoretical Output table). */
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

/** `E = (m/2) * V^2` (SMC's own formula (7)). Reported only in this module's own 0.1.0 -- CXS2's own catalog gives no per-model allowable-kinetic-energy table this module has digitized. */
export function resolveCushionKineticEnergy(
  input: CushionKineticEnergyInput,
): CushionKineticEnergyResult {
  assertPositive("loadMassKg", input.loadMassKg);
  assertPositive("maxPistonSpeedMps", input.maxPistonSpeedMps);

  return {
    kineticEnergyJ: (input.loadMassKg / 2) * input.maxPistonSpeedMps ** 2,
  };
}

// --- 5. Load mass vs. overhang length (new) --------------------------------

export type DualRodMountingOrientation = "vertical" | "horizontal";
export type DualRodBearingType = "slide" | "ball_bushing";

/**
 * One digitized SMC "Model Selection" curve, described by its own two
 * anchor points (design doc "Digitized dataset"): a flat plateau up to
 * `plateauEndOverhangMm`, then a log-log-linear slope out to
 * `edgeOverhangMm`. A curve with no flat segment (sloped from its very
 * first digitized point) sets `plateauEndOverhangMm` equal to that first
 * point's own overhang -- the plateau branch then degenerates to an exact
 * match at that single point, not a divide-by-zero.
 */
export interface LoadMassCurve {
  readonly mountingOrientation: DualRodMountingOrientation;
  /** Present only for horizontal curves; vertical has no stroke-band split. */
  readonly strokeBandMaxMm: number | null;
  readonly speedBandMaxMps: number;
  readonly boreDiameterMm: number;
  readonly bearingType: DualRodBearingType;
  readonly plateauEndOverhangMm: number;
  readonly plateauLoadMassKg: number;
  readonly edgeOverhangMm: number;
  readonly edgeLoadMassKg: number;
}

export interface AllowableLoadMassInput {
  readonly mountingOrientation: DualRodMountingOrientation;
  readonly boreDiameterMm: number;
  readonly bearingType: DualRodBearingType;
  readonly maxPistonSpeedMps: number;
  /** Required for horizontal mounting (selects the stroke band); ignored for vertical. */
  readonly requiredStrokeMm: number;
  readonly overhangLengthMm: number;
  readonly curves: readonly LoadMassCurve[];
}

export type AllowableLoadMassResult =
  | {
      readonly inEnvelope: true;
      readonly allowableLoadMassKg: number;
      readonly matchedCurve: LoadMassCurve;
    }
  | {
      readonly inEnvelope: false;
      readonly reason: string;
    };

/**
 * Selects the narrowest seeded band covering the run's own real
 * mounting_orientation/max_piston_speed/(required_stroke for horizontal
 * only)/bore/bearing_type, then log-log-interpolates the allowable load
 * mass at overhang_length between that curve's own two digitized anchor
 * points (design doc "Band selection at compute time"). Reports
 * out-of-envelope, never extrapolating, when no seeded band covers the
 * query or overhang_length exceeds the matched curve's own edge.
 */
export function resolveAllowableLoadMass(
  input: AllowableLoadMassInput,
): AllowableLoadMassResult {
  assertPositive("boreDiameterMm", input.boreDiameterMm);
  assertNonNegative("maxPistonSpeedMps", input.maxPistonSpeedMps);
  assertNonNegative("requiredStrokeMm", input.requiredStrokeMm);
  assertNonNegative("overhangLengthMm", input.overhangLengthMm);

  const candidates = input.curves.filter(
    (curve) =>
      curve.mountingOrientation === input.mountingOrientation &&
      curve.boreDiameterMm === input.boreDiameterMm &&
      curve.bearingType === input.bearingType,
  );

  const strokeFiltered =
    input.mountingOrientation === "horizontal"
      ? candidates.filter((curve) => curve.strokeBandMaxMm !== null)
      : candidates;

  let strokeNarrowed = strokeFiltered;
  if (input.mountingOrientation === "horizontal") {
    const coveringStrokeBands = strokeFiltered
      .map((curve) => curve.strokeBandMaxMm as number)
      .filter((max) => max >= input.requiredStrokeMm);
    if (coveringStrokeBands.length === 0) {
      return {
        inEnvelope: false,
        reason: `No seeded stroke band covers a required stroke of ${input.requiredStrokeMm} mm for this bore/bearing-type/orientation.`,
      };
    }
    const narrowestStrokeBandMm = Math.min(...coveringStrokeBands);
    strokeNarrowed = strokeFiltered.filter(
      (curve) => curve.strokeBandMaxMm === narrowestStrokeBandMm,
    );
  }

  const coveringSpeedBands = strokeNarrowed
    .map((curve) => curve.speedBandMaxMps)
    .filter((max) => max >= input.maxPistonSpeedMps);
  if (coveringSpeedBands.length === 0) {
    return {
      inEnvelope: false,
      reason: `No seeded speed band covers a maximum piston speed of ${input.maxPistonSpeedMps} m/s for this bore/bearing-type/orientation${input.mountingOrientation === "horizontal" ? "/stroke-band" : ""}.`,
    };
  }
  const narrowestSpeedBandMps = Math.min(...coveringSpeedBands);
  const matched = strokeNarrowed.find(
    (curve) => curve.speedBandMaxMps === narrowestSpeedBandMps,
  );
  if (matched === undefined) {
    return {
      inEnvelope: false,
      reason: "No seeded curve matched after band narrowing (unexpected data gap).",
    };
  }

  if (input.overhangLengthMm <= matched.plateauEndOverhangMm) {
    return {
      inEnvelope: true,
      allowableLoadMassKg: matched.plateauLoadMassKg,
      matchedCurve: matched,
    };
  }
  if (input.overhangLengthMm > matched.edgeOverhangMm) {
    return {
      inEnvelope: false,
      reason: `Overhang length ${input.overhangLengthMm} mm exceeds the matched curve's own published range (edge at ${matched.edgeOverhangMm} mm).`,
    };
  }

  const logL1 = Math.log(matched.plateauEndOverhangMm);
  const logL2 = Math.log(matched.edgeOverhangMm);
  const logM1 = Math.log(matched.plateauLoadMassKg);
  const logM2 = Math.log(matched.edgeLoadMassKg);
  const logL = Math.log(input.overhangLengthMm);

  const fraction = (logL - logL1) / (logL2 - logL1);
  const allowableLoadMassKg = Math.exp(logM1 + fraction * (logM2 - logM1));

  return { inEnvelope: true, allowableLoadMassKg, matchedCurve: matched };
}
