/**
 * Pure SI-number kernel for the in-progress ball-screw module (Unit 4.3,
 * Stage 1 draft). Resolves: the lead/rotational-speed relationship,
 * ball-screw drive torque, duty-cycle equivalent dynamic load, nominal
 * (fatigue) life, buckling load, and critical speed — see
 * context/modules/ball-screw/stage-1-spec.md.
 *
 * Buckling and critical speed use the screw's minor (root) diameter, not
 * its nominal/major diameter — confirmed by Rockford Ball Screw, "How To
 * Size A Ball Screw" (rockfordballscrew.com), which labels its own formula
 * variable "Dmin = Minor Diameter (root) of Screw" explicitly, and whose
 * end-fixity coefficients are the classic Euler effective-length-factor
 * values (buckling ratios 0.25:1:2:4 match `1/K^2` for `K = 2, 1, 0.7,
 * 0.5`) — a textbook physical basis, not an unverifiable manufacturer fit.
 * This superseded an earlier open question in the spec (two
 * independently-sourced coefficient tables existed with no confirmation of
 * which diameter either used); see the spec's "Evidence Gaps and
 * Verification Confidence" for the full account, including a discrepancy
 * this source's own dynamic-load-rating convention creates for
 * {@link resolveNominalLife} (do not feed a distance-basis rating from this
 * source into that function — see that function's own doc comment).
 *
 * The static safety factor formula (`resolveStaticSafetyFactor`) is sourced
 * from WY Ball Screw's technical article stating `Fas_max < C0 / fs`; no
 * recommended minimum-`fs`-by-operating-condition table has been read
 * directly this session (a large THK catalog excerpt that likely has one is
 * cached locally but exceeds this environment's PDF page-range reading
 * limit — see stage-1-spec.md "Evidence Gaps and Verification Confidence").
 * `resolveStaticSafetyFactor` therefore returns the computed factor only,
 * with no built-in pass/fail threshold.
 *
 * This is deliberately not a ModulePackage: no screw.* registry parameter
 * exists yet (Stage 2 is still open). Values become EngineeringValues only
 * at a future module-package boundary; bare numbers remain internal here,
 * mirroring lib/modules/axis-load-cases/0.1.0/math.ts and
 * lib/modules/motion-profile/0.1.0/math.ts.
 */

/** Thrown when an input falls outside this kernel's explicit validity envelope. */
export class BallScrewInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BallScrewInputError";
  }
}

function fail(message: string): never {
  throw new BallScrewInputError(message);
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

// --- 1. Lead / rotational-speed relationship --------------------------------

export interface RotationalSpeedInput {
  /** Linear feed rate along the axis, in m/s. Must be > 0. */
  readonly linearVelocityMps: number;
  /** Screw lead: linear travel per revolution, in m. Must be > 0. */
  readonly leadM: number;
}

export interface RotationalSpeedResult {
  readonly rotationalSpeedRevPerS: number;
  readonly rotationalSpeedRevPerMin: number;
}

/**
 * v = N * P. Definitional screw-thread geometry, not a manufacturer-specific
 * method — stage-1-spec.md "Candidate Methods and Sources" item 1.
 */
export function resolveRotationalSpeed(
  input: RotationalSpeedInput,
): RotationalSpeedResult {
  assertPositive("linearVelocityMps", input.linearVelocityMps);
  assertPositive("leadM", input.leadM);

  const rotationalSpeedRevPerS = input.linearVelocityMps / input.leadM;
  return {
    rotationalSpeedRevPerS,
    rotationalSpeedRevPerMin: rotationalSpeedRevPerS * 60,
  };
}

// --- 2. Ball-screw drive torque ---------------------------------------------

export interface DriveTorqueInput {
  /**
   * Axial force the drive must react against — this module reuses
   * axis-load-cases' already-resolved `motion.axis.thrust_force` rather than
   * re-deriving gravity/friction. May be signed; sign carries through to the
   * result (the preload-friction term below does not — it always opposes
   * rotation).
   */
  readonly axialForceN: number;
  /** Screw lead, in m. Must be > 0. */
  readonly leadM: number;
  /** Mechanical efficiency, `0 < eta <= 1` (source: typically 0.85-0.95). */
  readonly efficiency: number;
  /** Preload force, in N. Must be `>= 0` (source: typically `~= 1/3 * F`). */
  readonly preloadN: number;
  /**
   * Internal friction coefficient of the preload nut, unitless, `>= 0`
   * (source: typically 0.1-0.3).
   */
  readonly internalFrictionCoefficient: number;
  /**
   * Gear ratio between the screw and the driving shaft. Use `1` for a
   * direct-connected screw with no reduction in between. Must be > 0.
   */
  readonly gearRatio: number;
}

export interface DriveTorqueResult {
  readonly loadTorqueNm: number;
}

/**
 * `T_L = ( F*P/(2*pi*eta) + mu0*F0*P/(2*pi) ) * (1/i)`.
 * Oriental Motor, "Motor Sizing Calculations" (Load Torque Calculation -
 * Ball Screw Drive) — stage-1-spec.md "Candidate Methods and Sources" item 3.
 */
export function resolveDriveTorque(input: DriveTorqueInput): DriveTorqueResult {
  assertFinite("axialForceN", input.axialForceN);
  assertPositive("leadM", input.leadM);
  assertFinite("efficiency", input.efficiency);
  if (input.efficiency <= 0 || input.efficiency > 1) {
    fail("efficiency must be greater than 0 and at most 1.");
  }
  assertNonNegative("preloadN", input.preloadN);
  assertNonNegative(
    "internalFrictionCoefficient",
    input.internalFrictionCoefficient,
  );
  assertPositive("gearRatio", input.gearRatio);

  const driveTermNm =
    (input.axialForceN * input.leadM) / (2 * Math.PI * input.efficiency);
  const preloadFrictionTermNm =
    (input.internalFrictionCoefficient * input.preloadN * input.leadM) /
    (2 * Math.PI);

  return {
    loadTorqueNm: (driveTermNm + preloadFrictionTermNm) / input.gearRatio,
  };
}

// --- 3. Duty-cycle equivalent dynamic load and mean rotational speed -------

export interface DutyCyclePhase {
  /** Time fraction of the duty cycle this phase occupies, `0 <= q <= 1`. */
  readonly timeFraction: number;
  /** Rotational speed during this phase, in rev/min. Must be `>= 0`. */
  readonly rotationalSpeedRevPerMin: number;
  /**
   * Applied axial load magnitude during this phase, in N. Must be `>= 0` —
   * a magnitude, not a signed thrust: the cube in the source formula
   * assumes an unsigned load, since rolling-contact fatigue does not depend
   * on thrust direction.
   */
  readonly axialLoadMagnitudeN: number;
}

export interface EquivalentDynamicLoadResult {
  readonly equivalentLoadN: number;
  readonly meanRotationalSpeedRevPerMin: number;
}

/**
 * `F_m = cbrt( sum(q_i * n_i * F_i^3) / sum(q_i * n_i) )`
 * `n_m = sum(q_i * n_i) / sum(q_i)`
 * Steinmeyer, "Equivalent Load for Ball Screws" — stage-1-spec.md item 4.
 *
 * A phase with `rotationalSpeedRevPerMin: 0` (e.g. a holding dwell)
 * contributes zero weight to `F_m` by this formula's own construction — a
 * stationary phase does not accumulate rolling-contact fatigue regardless of
 * how large its load is. That is a real, source-documented property of the
 * formula, not a kernel defect.
 */
export function resolveEquivalentDynamicLoad(
  phases: readonly DutyCyclePhase[],
): EquivalentDynamicLoadResult {
  if (phases.length === 0) fail("At least one duty-cycle phase is required.");

  let weightSum = 0; // sum(q_i * n_i)
  let cubedWeightSum = 0; // sum(q_i * n_i * F_i^3)
  let timeFractionSum = 0; // sum(q_i)

  phases.forEach((phase, index) => {
    const label = `phases[${index}]`;
    assertFinite(`${label}.timeFraction`, phase.timeFraction);
    if (phase.timeFraction < 0 || phase.timeFraction > 1) {
      fail(`${label}.timeFraction must be between 0 and 1.`);
    }
    assertNonNegative(
      `${label}.rotationalSpeedRevPerMin`,
      phase.rotationalSpeedRevPerMin,
    );
    assertNonNegative(
      `${label}.axialLoadMagnitudeN`,
      phase.axialLoadMagnitudeN,
    );

    const weight = phase.timeFraction * phase.rotationalSpeedRevPerMin;
    weightSum += weight;
    cubedWeightSum += weight * phase.axialLoadMagnitudeN ** 3;
    timeFractionSum += phase.timeFraction;
  });

  if (timeFractionSum <= 0) {
    fail("At least one phase must have a positive timeFraction.");
  }
  if (weightSum <= 0) {
    fail(
      "At least one phase must have a positive rotationalSpeedRevPerMin " +
        "together with a positive timeFraction — the screw must rotate " +
        "under load for a duty cycle to have a defined equivalent dynamic " +
        "load.",
    );
  }

  return {
    equivalentLoadN: Math.cbrt(cubedWeightSum / weightSum),
    meanRotationalSpeedRevPerMin: weightSum / timeFractionSum,
  };
}

// --- 4. Nominal (fatigue) life -----------------------------------------------

export interface NominalLifeInput {
  /** Basic dynamic axial load rating from the screw's own catalog data, in N. Must be > 0. */
  readonly dynamicLoadRatingN: number;
  /** Equivalent dynamic axial load, in N. Must be > 0. */
  readonly equivalentLoadN: number;
}

export interface NominalLifeResult {
  readonly lifeRevolutions: number;
}

/**
 * `L10 = (Ca / Fm)^3 * 10^6`. Steinmeyer, "Ball Screw Fatigue Life" —
 * stage-1-spec.md item 5. The useful life L10 is expected to be reached by
 * 90% of a sufficiently large number of identical screws at load capacity
 * `Ca` under mean load `Fm`.
 *
 * `dynamicLoadRatingN` must be a **revolution-basis** rating (life expressed
 * in `10^6` revolutions, this formula's own convention). Rockford Ball
 * Screw's own catalog rates its screws against a **distance-basis** life
 * (`10^6` inches of travel — see `resolveCriticalSpeed`'s doc comment for
 * that source) instead. Feeding a distance-basis rating into this function
 * silently understates or overstates life by a factor related to the
 * screw's own lead; do not mix the two without an explicit, documented
 * conversion (life[in] = life[rev] * lead[in]) — this was discovered as a
 * real cross-catalog compatibility gap this session, not invented.
 */
export function resolveNominalLife(input: NominalLifeInput): NominalLifeResult {
  assertPositive("dynamicLoadRatingN", input.dynamicLoadRatingN);
  assertPositive("equivalentLoadN", input.equivalentLoadN);

  return {
    lifeRevolutions:
      (input.dynamicLoadRatingN / input.equivalentLoadN) ** 3 * 1e6,
  };
}

export interface PermissibleMeanLoadInput {
  /** Basic dynamic axial load rating from the screw's own catalog data, in N. Must be > 0. */
  readonly dynamicLoadRatingN: number;
  /** Target nominal life, in revolutions. Must be > 0. */
  readonly targetLifeRevolutions: number;
}

export interface PermissibleMeanLoadResult {
  readonly permissibleMeanLoadN: number;
}

/**
 * `Fm = Ca / (L10 / 10^6)^(1/3)` — the exact algebraic inverse of
 * {@link resolveNominalLife}, given by the same source.
 */
export function resolvePermissibleMeanLoad(
  input: PermissibleMeanLoadInput,
): PermissibleMeanLoadResult {
  assertPositive("dynamicLoadRatingN", input.dynamicLoadRatingN);
  assertPositive("targetLifeRevolutions", input.targetLifeRevolutions);

  return {
    permissibleMeanLoadN:
      input.dynamicLoadRatingN / (input.targetLifeRevolutions / 1e6) ** (1 / 3),
  };
}

export interface LifeHoursInput {
  readonly lifeRevolutions: number;
  readonly meanRotationalSpeedRevPerMin: number;
}

export interface LifeHoursResult {
  readonly lifeHours: number;
}

/**
 * `Lh = L10 / (nm * 60)`. UNC Charlotte Industrial Solutions Lab, *Ball
 * Screw Selection Guide* (attributed to Bosch Rexroth's *Linear Motion
 * Technology Handbook*) — stage-1-spec.md item 5.
 */
export function resolveLifeHours(input: LifeHoursInput): LifeHoursResult {
  assertPositive("lifeRevolutions", input.lifeRevolutions);
  assertPositive(
    "meanRotationalSpeedRevPerMin",
    input.meanRotationalSpeedRevPerMin,
  );

  return {
    lifeHours:
      input.lifeRevolutions / (input.meanRotationalSpeedRevPerMin * 60),
  };
}

// --- 5. Buckling load and critical speed (root/minor diameter) -------------

export type ScrewEndSupportArrangement =
  "fixed-fixed" | "fixed-supported" | "supported-supported" | "fixed-free";

/**
 * Rockford Ball Screw, "How To Size A Ball Screw" (rockfordballscrew.com),
 * step 6. "End Fixity Variable" (`Fe`); Rockford's own labels are
 * "Fixed-Free," "Simple-Simple," "Fixed-Simple," and "Fixed-Fixed" — this
 * kernel calls "Simple" support "supported" instead, matching the rest of
 * this module's terminology, same concept (a pinned/simple bearing, not
 * moment-fixed).
 */
const CRITICAL_SPEED_END_FIXITY_FACTOR: Record<
  ScrewEndSupportArrangement,
  number
> = {
  "fixed-free": 0.36,
  "supported-supported": 1.0,
  "fixed-supported": 1.47,
  "fixed-fixed": 2.23,
};

/**
 * Rockford Ball Screw, step 9. These ratios (0.25 : 1 : 2 : 4, i.e.
 * `1/K^2` for the classic Euler effective-length factors `K = 2, 1, 0.7,
 * 0.5`) are the standard textbook Euler-column values, not a
 * manufacturer-proprietary fit — the same physical basis a from-scratch
 * derivation would produce.
 */
const BUCKLING_END_FIXITY_FACTOR: Record<ScrewEndSupportArrangement, number> = {
  "fixed-free": 0.25,
  "supported-supported": 1.0,
  "fixed-supported": 2.0,
  "fixed-fixed": 4.0,
};

/** Exact by definition (1 in = 25.4 mm). */
const METERS_PER_INCH = 0.0254;
/** Exact by definition (1 lbf = 1 lb * 9.80665 m/s^2 in inch-pound-force units). */
const NEWTONS_PER_LBF = 4.4482216152605;

function endFixityFactor(
  table: Record<ScrewEndSupportArrangement, number>,
  arrangement: ScrewEndSupportArrangement,
): number {
  const factor = table[arrangement];
  if (factor === undefined) {
    fail(`Unknown endSupportArrangement: "${String(arrangement)}".`);
  }
  return factor;
}

export interface CriticalSpeedInput {
  /**
   * Screw minor (root) diameter, in m — not the nominal/major diameter.
   * Must be > 0.
   */
  readonly rootDiameterM: number;
  /** Unsupported screw length between bearing supports, in m. Must be > 0. */
  readonly unsupportedLengthM: number;
  readonly endSupportArrangement: ScrewEndSupportArrangement;
}

export interface CriticalSpeedResult {
  /** Unfactored (no operating-margin applied) critical rotational speed, in rev/min. */
  readonly criticalSpeedRevPerMin: number;
  /**
   * Recommended maximum operating speed: `0.8 * criticalSpeedRevPerMin`.
   * Both Rockford (`Fs = 0.8`, "recommended") and Steinmeyer ("approximately
   * 80% of the critical speed") agree on this margin — see stage-1-spec.md
   * item 8.
   */
  readonly permissibleSpeedRevPerMin: number;
}

/**
 * `nk = Fe * 4,760,000 * (Dmin / L^2)`, evaluated in the inch/rev-per-minute
 * units Rockford Ball Screw's own formula is published in (step 6, with its
 * own `Fs` factor of safety applied separately here as
 * `permissibleSpeedRevPerMin` rather than folded into the same constant, to
 * keep the physical formula and the operating-margin check separate — the
 * same separation `axis-load-cases` and this kernel's other functions use).
 * SI inputs are converted to inches internally so the published constant
 * (`4,760,000`) can be used exactly as printed rather than re-deriving a
 * fused SI constant that would be harder to check against the source.
 */
export function resolveCriticalSpeed(
  input: CriticalSpeedInput,
): CriticalSpeedResult {
  assertPositive("rootDiameterM", input.rootDiameterM);
  assertPositive("unsupportedLengthM", input.unsupportedLengthM);

  const fe = endFixityFactor(
    CRITICAL_SPEED_END_FIXITY_FACTOR,
    input.endSupportArrangement,
  );
  const rootDiameterIn = input.rootDiameterM / METERS_PER_INCH;
  const unsupportedLengthIn = input.unsupportedLengthM / METERS_PER_INCH;

  const criticalSpeedRevPerMin =
    fe * 4_760_000 * (rootDiameterIn / unsupportedLengthIn ** 2);

  return {
    criticalSpeedRevPerMin,
    permissibleSpeedRevPerMin: 0.8 * criticalSpeedRevPerMin,
  };
}

export interface BucklingLoadInput {
  /**
   * Screw minor (root) diameter, in m — not the nominal/major diameter.
   * Must be > 0.
   */
  readonly rootDiameterM: number;
  /** Unsupported screw length between bearing supports, in m. Must be > 0. */
  readonly unsupportedLengthM: number;
  readonly endSupportArrangement: ScrewEndSupportArrangement;
}

export interface BucklingLoadResult {
  /** Unfactored theoretical (Euler column) buckling load, in N. */
  readonly bucklingLoadN: number;
  /**
   * Recommended maximum permissible compressive axial load:
   * `0.5 * bucklingLoadN`. Steinmeyer states a `0.5` safety factor here;
   * Rockford's own worked example instead applies `Fs = 0.8` to the same
   * buckling formula — a real, unresolved discrepancy between the two
   * sources (see stage-1-spec.md item 7 and "Evidence Gaps and
   * Verification Confidence"), not silently picked. `0.5` is used here as
   * the more conservative of the two pending that resolution.
   */
  readonly permissibleCompressiveLoadN: number;
}

/**
 * `Pc = Fe * 14,030,000 * (Dmin^4 / L^2)`, evaluated in Rockford Ball
 * Screw's own inch/lbf units (step 9) and converted back to SI, for the
 * same reason given in {@link resolveCriticalSpeed}'s doc comment.
 */
export function resolveBucklingLoad(
  input: BucklingLoadInput,
): BucklingLoadResult {
  assertPositive("rootDiameterM", input.rootDiameterM);
  assertPositive("unsupportedLengthM", input.unsupportedLengthM);

  const fe = endFixityFactor(
    BUCKLING_END_FIXITY_FACTOR,
    input.endSupportArrangement,
  );
  const rootDiameterIn = input.rootDiameterM / METERS_PER_INCH;
  const unsupportedLengthIn = input.unsupportedLengthM / METERS_PER_INCH;

  const bucklingLoadLbf =
    fe * 14_030_000 * (rootDiameterIn ** 4 / unsupportedLengthIn ** 2);
  const bucklingLoadN = bucklingLoadLbf * NEWTONS_PER_LBF;

  return {
    bucklingLoadN,
    permissibleCompressiveLoadN: 0.5 * bucklingLoadN,
  };
}

// --- 6. Static safety factor -------------------------------------------------

export interface StaticSafetyFactorInput {
  /** Basic static axial load rating from the screw's own catalog data, in N. Must be > 0. */
  readonly staticLoadRatingN: number;
  /**
   * Maximum applied axial load magnitude for the case being checked, in N.
   * Must be > 0 — a magnitude, not a signed thrust.
   */
  readonly appliedLoadN: number;
}

export interface StaticSafetyFactorResult {
  readonly staticSafetyFactor: number;
}

/**
 * `fs = C0 / Fas_max` (the applied-load form, `Fas_max < C0 / fs`, is how
 * WY Ball Screw, "Understanding Load in Ball Screw Applications"
 * (wyballscrew.com), states it) — stage-1-spec.md item 6.
 *
 * Returns the computed factor only. No recommended minimum is built in:
 * no source-verified minimum-`fs`-by-operating-condition table has been
 * read directly (see this file's module doc comment and the spec's
 * "Evidence Gaps and Verification Confidence"). A future package's checks
 * layer supplies whatever minimum Stage 2 eventually sources.
 */
export function resolveStaticSafetyFactor(
  input: StaticSafetyFactorInput,
): StaticSafetyFactorResult {
  assertPositive("staticLoadRatingN", input.staticLoadRatingN);
  assertPositive("appliedLoadN", input.appliedLoadN);

  return {
    staticSafetyFactor: input.staticLoadRatingN / input.appliedLoadN,
  };
}
