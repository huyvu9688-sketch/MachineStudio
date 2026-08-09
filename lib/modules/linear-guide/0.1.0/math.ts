/**
 * Pure SI-number kernel for the in-progress linear-guide module (Unit 4.4,
 * Stage 1 draft). Implements the `0.1.0` proposed scope from
 * context/modules/linear-guide/stage-1-spec.md: a two-rail, four-block
 * arrangement (blocks 1-4), horizontal or vertical installation, uniform
 * motion or a single axial inertia phase, ball-type rolling elements only.
 *
 * Each `resolve*BlockLoads` function corresponds to one of PMI's own
 * installation-specific diagrams (Linear Guideway catalog, Section 6,
 * "Calculation of Working Load") and deliberately keeps that diagram's own
 * `l1`/`l2`/`l3`/`l4` parameter names rather than inventing a shared
 * "physical" naming across diagrams — the stage-1 spec found that the
 * horizontal and vertical diagrams use these letters for locally-scoped,
 * not necessarily corresponding, geometric quantities (see stage-1-spec.md
 * "Load distribution among blocks (`Calculation of Working Load`)").
 *
 * Values become EngineeringValues only at a future module-package boundary;
 * bare numbers remain internal here, mirroring
 * lib/modules/ball-screw/0.1.0/math.ts.
 */

export type RollingElementType = "ball";

/** Radial (downward/normal) and lateral load on one guide block. */
export interface BlockLoad {
  readonly radialN: number;
  readonly lateralN: number;
}

/** Loads on all four blocks of a two-rail, two-block-per-rail arrangement. */
export interface FourBlockLoads {
  readonly block1: BlockLoad;
  readonly block2: BlockLoad;
  readonly block3: BlockLoad;
  readonly block4: BlockLoad;
}

/** Thrown when an input falls outside the explicit Stage 1 validity envelope. */
export class LinearGuideInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LinearGuideInputError";
  }
}

function fail(message: string): never {
  throw new LinearGuideInputError(message);
}

function assertPositive(name: string, value: number): void {
  if (!Number.isFinite(value)) fail(`${name} must be finite.`);
  if (value <= 0) fail(`${name} must be positive.`);
}

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) fail(`${name} must be finite.`);
}

// --- Block load distribution (PMI Section 6) --------------------------------

export interface HorizontalUniformLoadInput {
  /** Applied downward force at the load position, in N. */
  readonly forceN: number;
  /** Rail spacing, in m. PMI's own `l1` (B17). Must be > 0. */
  readonly railSpacingM: number;
  /** Block spacing (along one rail), in m. PMI's own `l2` (B17). Must be > 0. */
  readonly blockSpacingM: number;
  /** Load offset in the rail-spacing direction from center, in m. PMI's own `l3`. */
  readonly loadOffsetRailM: number;
  /** Load offset in the block-spacing direction from center, in m. PMI's own `l4`. */
  readonly loadOffsetBlockM: number;
}

/**
 * PMI Linear Guideway catalog, Section 6, "Horizontal application: Uniform
 * motion or at rest" (printed page B17), re-verified directly against the
 * source image twice this session. Radial load only — this installation
 * has no separate lateral (`T`) component in the source. Blocks 1-4 form a
 * rectangle: (+l3,-l4), (-l3,-l4), (-l3,+l4), (+l3,+l4) for blocks 1-4
 * respectively (confirmed by the printed sign pattern, not inferred).
 */
export function resolveHorizontalUniformBlockLoads(
  input: HorizontalUniformLoadInput,
): FourBlockLoads {
  assertFinite("forceN", input.forceN);
  assertPositive("railSpacingM", input.railSpacingM);
  assertPositive("blockSpacingM", input.blockSpacingM);
  assertFinite("loadOffsetRailM", input.loadOffsetRailM);
  assertFinite("loadOffsetBlockM", input.loadOffsetBlockM);

  const { forceN: F, railSpacingM: l1, blockSpacingM: l2 } = input;
  const l3 = input.loadOffsetRailM;
  const l4 = input.loadOffsetBlockM;
  const railTerm = (F * l3) / (2 * l1);
  const blockTerm = (F * l4) / (2 * l2);
  const base = F / 4;

  return {
    block1: { radialN: base + railTerm - blockTerm, lateralN: 0 },
    block2: { radialN: base - railTerm - blockTerm, lateralN: 0 },
    block3: { radialN: base - railTerm + blockTerm, lateralN: 0 },
    block4: { radialN: base + railTerm + blockTerm, lateralN: 0 },
  };
}

export interface VerticalUniformLoadInput {
  /** Applied lateral force at the load position, in N. */
  readonly forceN: number;
  /** Rail spacing, in m. PMI's own `l1` (B19). Must be > 0. */
  readonly railSpacingM: number;
  /** Load-position height/offset feeding the shared radial share, in m. PMI's own `l2` (B19). */
  readonly loadOffsetRadialM: number;
  /** Load-position offset feeding the shared lateral share, in m. PMI's own `l4` (B19). */
  readonly loadOffsetLateralM: number;
}

/**
 * PMI Linear Guideway catalog, Section 6, "Vertical application: Uniform
 * motion or at rest" (printed page B19), re-verified directly against the
 * source image twice this session. By symmetry, all four blocks carry an
 * identical radial share and an identical lateral share (no differential
 * loading across blocks for this installation, unlike the horizontal case).
 */
export function resolveVerticalUniformBlockLoads(
  input: VerticalUniformLoadInput,
): FourBlockLoads {
  assertFinite("forceN", input.forceN);
  assertPositive("railSpacingM", input.railSpacingM);
  assertFinite("loadOffsetRadialM", input.loadOffsetRadialM);
  assertFinite("loadOffsetLateralM", input.loadOffsetLateralM);

  const { forceN: F, railSpacingM: l1 } = input;
  const radialN = (F * input.loadOffsetRadialM) / (2 * l1);
  const lateralN = (F * input.loadOffsetLateralM) / (2 * l1);
  const block: BlockLoad = { radialN, lateralN };

  return { block1: block, block2: block, block3: block, block4: block };
}

export type InertiaPhase = "acceleration" | "deceleration" | "uniform";

export interface HorizontalInertiaLoadInput {
  readonly massKg: number;
  readonly gravityMps2: number;
  /** Signed acceleration during the "acceleration" phase, in m/s^2. Ignored for other phases. */
  readonly accelerationMps2: number;
  /** Signed deceleration magnitude during the "deceleration" phase, in m/s^2. Ignored for other phases. */
  readonly decelerationMps2: number;
  readonly phase: InertiaPhase;
  /** Rail spacing, in m. PMI's own `l1` (B23). Must be > 0. */
  readonly railSpacingM: number;
  /** Load-height offset feeding the radial differential, in m. PMI's own `l3` (B23). */
  readonly loadOffsetRadialM: number;
  /** Load-height offset feeding the lateral share, in m. PMI's own `l4` (B23). */
  readonly loadOffsetLateralM: number;
}

/**
 * PMI Linear Guideway catalog, Section 6, "Horizontal application: Subjected
 * to inertia" (printed page B23), re-verified directly against the source
 * image twice this session. The second read corrected a real error in this
 * kernel's first draft: acceleration and deceleration use *distinct* rates
 * (the source's own `a1`/`a3`), and the lateral component is equal across
 * all four blocks with no differential sign — see
 * context/modules/linear-guide/stage-1-spec.md "Evidence Gaps and
 * Verification Confidence".
 */
export function resolveHorizontalInertiaBlockLoads(
  input: HorizontalInertiaLoadInput,
): FourBlockLoads {
  assertPositive("massKg", input.massKg);
  assertPositive("gravityMps2", input.gravityMps2);
  assertFinite("accelerationMps2", input.accelerationMps2);
  assertFinite("decelerationMps2", input.decelerationMps2);
  assertPositive("railSpacingM", input.railSpacingM);
  assertFinite("loadOffsetRadialM", input.loadOffsetRadialM);
  assertFinite("loadOffsetLateralM", input.loadOffsetLateralM);

  const { massKg: m, gravityMps2: g, railSpacingM: l1 } = input;
  const l3 = input.loadOffsetRadialM;
  const l4 = input.loadOffsetLateralM;
  const mg4 = (m * g) / 4;

  if (input.phase === "uniform") {
    const block: BlockLoad = { radialN: mg4, lateralN: 0 };
    return { block1: block, block2: block, block3: block, block4: block };
  }

  const rate =
    input.phase === "acceleration"
      ? input.accelerationMps2
      : input.decelerationMps2;
  const sign = input.phase === "acceleration" ? 1 : -1;
  const radialTerm = (sign * m * rate * l3) / (2 * l1);
  const lateralN = (sign * m * rate * l4) / (2 * l1);

  return {
    block1: { radialN: mg4 - radialTerm, lateralN },
    block2: { radialN: mg4 + radialTerm, lateralN },
    block3: { radialN: mg4 + radialTerm, lateralN },
    block4: { radialN: mg4 - radialTerm, lateralN },
  };
}

export interface VerticalInertiaLoadInput {
  readonly massKg: number;
  readonly gravityMps2: number;
  readonly accelerationMps2: number;
  readonly decelerationMps2: number;
  readonly phase: InertiaPhase;
  /** Rail spacing, in m. PMI's own `l1` (B24). Must be > 0. */
  readonly railSpacingM: number;
  /** Load-offset feeding the shared radial share, in m. PMI's own `l3` (B24). */
  readonly loadOffsetRadialM: number;
  /** Load-offset feeding the shared lateral share, in m. PMI's own `l4` (B24). */
  readonly loadOffsetLateralM: number;
}

/**
 * PMI Linear Guideway catalog, Section 6, "Vertical application: Subjected
 * to inertia" (printed page B24), re-verified directly against the source
 * image twice this session (same `a1`/`a3` correction as the horizontal
 * case above). By symmetry, all four blocks carry an identical radial share
 * and an identical lateral share in every phase.
 */
export function resolveVerticalInertiaBlockLoads(
  input: VerticalInertiaLoadInput,
): FourBlockLoads {
  assertPositive("massKg", input.massKg);
  assertPositive("gravityMps2", input.gravityMps2);
  assertFinite("accelerationMps2", input.accelerationMps2);
  assertFinite("decelerationMps2", input.decelerationMps2);
  assertPositive("railSpacingM", input.railSpacingM);
  assertFinite("loadOffsetRadialM", input.loadOffsetRadialM);
  assertFinite("loadOffsetLateralM", input.loadOffsetLateralM);

  const { massKg: m, gravityMps2: g, railSpacingM: l1 } = input;
  const l3 = input.loadOffsetRadialM;
  const l4 = input.loadOffsetLateralM;

  const effectiveG =
    input.phase === "uniform"
      ? g
      : input.phase === "acceleration"
        ? g + input.accelerationMps2
        : g - input.decelerationMps2;

  const radialN = (m * effectiveG * l3) / (2 * l1);
  const lateralN = (m * effectiveG * l4) / (2 * l1);
  const block: BlockLoad = { radialN, lateralN };

  return { block1: block, block2: block, block3: block, block4: block };
}

// --- Equivalent load, static safety, and life (PMI Sections 4, 7) ----------

/**
 * PMI Linear Guideway catalog, Section 7, "Calculation of the Equivalent
 * Load" — the "two or more guideways" case (`PE = |PR| + |PT|`), which
 * `0.1.0`'s fixed two-rail/four-block arrangement uses throughout: the
 * moment is already captured by differential per-block loading (the
 * `resolve*BlockLoads` functions above), so no separate moment term is
 * added here. The single-rail ("mono rail") variant, which does add a
 * moment term, is out of `0.1.0` scope (stage-1-spec.md "Validity
 * Envelope").
 */
export function resolveEquivalentLoad(block: BlockLoad): number {
  return Math.abs(block.radialN) + Math.abs(block.lateralN);
}

export interface StaticSafetyFactorInput {
  /** Basic static load rating of the guide, in N. Must be > 0. */
  readonly staticLoadRatingN: number;
  /** Equivalent static load on the governing block, in N. Must be > 0. */
  readonly appliedLoadN: number;
}

export interface StaticSafetyFactorResult {
  readonly staticSafetyFactor: number;
}

/**
 * PMI Section 4.3 / IKO "Static safety factor": `fs = C0 / P0`. Returns the
 * computed factor only; no built-in minimum (both sources' standard-value
 * tables disagree — stage-1-spec.md item 3 — so a required minimum is a
 * package-level input, not a kernel constant, the same treatment
 * `ball-screw`'s own static-safety-factor minimum received).
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

export interface NominalLifeInput {
  /** Basic dynamic load rating of the guide, in N. Must be > 0. */
  readonly dynamicLoadRatingN: number;
  /** Equivalent (or mean) dynamic load on the governing block, in N. Must be > 0. */
  readonly equivalentLoadN: number;
  readonly rollingElementType: RollingElementType;
  /** Hardness correction factor. Defaults to 1.0 (PMI's own guideways meet spec) when omitted. */
  readonly hardnessFactor?: number;
  /** Temperature correction factor. Defaults to 1.0 (<=100C) when omitted. */
  readonly temperatureFactor?: number;
  /** Load correction factor (speed/impact-keyed). Must be > 0. */
  readonly loadFactor: number;
}

export interface NominalLifeResult {
  /** Nominal life, in km of travel (distance basis, not revolutions). */
  readonly lifeKm: number;
}

const BALL_LIFE_EXPONENT = 3;
const BALL_LIFE_BASIS_KM = 50;

/**
 * PMI Section 4.4-4.5 / IKO "Rating life": ball-type only in `0.1.0`
 * (`L = (fH*fT/fW * C/P)^3 * 50`, km basis — both sources agree on shape
 * and basis; stage-1-spec.md item 4). Roller-type (`e=10/3`, `100` km
 * basis) is a documented, sourced alternative not implemented here
 * (stage-1-spec.md "Validity Envelope").
 */
export function resolveNominalLife(input: NominalLifeInput): NominalLifeResult {
  assertPositive("dynamicLoadRatingN", input.dynamicLoadRatingN);
  assertPositive("equivalentLoadN", input.equivalentLoadN);
  assertPositive("loadFactor", input.loadFactor);
  if (input.rollingElementType !== "ball") {
    fail(
      "Only rollingElementType \"ball\" is implemented in this version; roller-type guides use a different life exponent and basis (stage-1-spec.md 'Validity Envelope').",
    );
  }
  const hardnessFactor = input.hardnessFactor ?? 1;
  const temperatureFactor = input.temperatureFactor ?? 1;
  assertPositive("hardnessFactor", hardnessFactor);
  assertPositive("temperatureFactor", temperatureFactor);

  const correctedRatio =
    ((hardnessFactor * temperatureFactor) / input.loadFactor) *
    (input.dynamicLoadRatingN / input.equivalentLoadN);

  return {
    lifeKm: Math.pow(correctedRatio, BALL_LIFE_EXPONENT) * BALL_LIFE_BASIS_KM,
  };
}

export interface ServiceLifeHoursInput {
  readonly lifeKm: number;
  /** Stroke length, in m. Must be > 0. */
  readonly strokeLengthM: number;
  /** Reciprocating cycles per minute. Must be > 0. */
  readonly cyclesPerMinute: number;
}

/**
 * PMI Section 4.6 / IKO "Calculation of Service Life in Time":
 * `Lh = L*1000 / (2*ls*n1*60)`, hours.
 */
export function resolveServiceLifeHours(input: ServiceLifeHoursInput): number {
  assertPositive("lifeKm", input.lifeKm);
  assertPositive("strokeLengthM", input.strokeLengthM);
  assertPositive("cyclesPerMinute", input.cyclesPerMinute);
  return (
    (input.lifeKm * 1000) /
    (2 * input.strokeLengthM * input.cyclesPerMinute * 60)
  );
}

export interface MeanLoadPhase {
  /** Load magnitude during this phase, in N. Must be > 0. */
  readonly loadN: number;
  /** Running distance under this phase's load, in any consistent unit. Must be > 0. */
  readonly runningDistance: number;
}

/**
 * PMI Section 8 / IKO "mean load": `Pm = (sum(Pn^e * Ln) / L)^(1/e)`,
 * `e = 3` for ball-type. `phases` must cover the full duty cycle (their
 * running distances sum to the total `L` the formula divides by).
 */
export function resolveMeanLoad(phases: readonly MeanLoadPhase[]): number {
  if (phases.length === 0) fail("At least one duty-cycle phase is required.");
  let totalDistance = 0;
  let weightedSum = 0;
  for (const phase of phases) {
    assertPositive("loadN", phase.loadN);
    assertPositive("runningDistance", phase.runningDistance);
    totalDistance += phase.runningDistance;
    weightedSum +=
      Math.pow(phase.loadN, BALL_LIFE_EXPONENT) * phase.runningDistance;
  }
  return Math.pow(weightedSum / totalDistance, 1 / BALL_LIFE_EXPONENT);
}
