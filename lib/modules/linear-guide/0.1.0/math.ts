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
 * WHAT PMI'S `l1` AND `l2` ACTUALLY ARE (corrected at Stage 4, 2026-08-09).
 * The first draft of these interfaces did invent physical names anyway —
 * `railSpacingM` for `l1` and `blockSpacingM` for `l2` — and got them
 * backwards. Reproducing PMI's own Chapter 9 worked example
 * (./pmi-chapter-9.ts) settled it:
 *
 *   - **`l1` is the carriage spacing ALONG the direction of travel.**
 *     Chapter 9 divides the height-induced moments `m1*a1*l6` and
 *     `m2*a1*l5` by `2*l1`, and an axial inertia force acting at a height
 *     is a pitching moment, which only the carriage pair separated along
 *     travel can react. B23's own `m*a1*l3/(2*l1)` does the same thing.
 *     Chapter 9's lateral loads clinch it: they alternate sign across the
 *     same block pairs the `/(2*l1)` radial term separates, and they sum to
 *     zero — a yaw moment can only be balanced by lateral forces on pairs
 *     separated along travel.
 *   - **`l2` is the transverse spacing between the two rails.**
 *
 * The formulas below were always right; only the invented names were wrong,
 * so they now carry PMI's own letters (`spacingL1M`, `offsetL3M`, ...) as
 * this header always said they should. `resolveBlockLoadsFromResultant`,
 * which does speak in physical terms because its caller must, had one real
 * consequence — see its own doc comment.
 *
 * Values become EngineeringValues only at a future module-package boundary;
 * bare numbers remain internal here, mirroring
 * lib/modules/ball-screw/0.1.0/math.ts.
 *
 * IMPORTANT — which function a package should actually call (settled
 * 2026-08-09, see context/modules/linear-guide/stage-2-contract.md):
 * **`resolveBlockLoadsFromResultant` is the integration path**, not the
 * four installation-specific functions. Those four reproduce PMI's own
 * self-contained worked method, which re-derives gravity's and inertia's
 * separate contributions from raw mass/acceleration and locates the load
 * by a geometric offset. This project's `axis-load-cases` module already
 * resolves gravity, friction, guide resistance, and external force/moment
 * into one `(resultant_force, resultant_moment)` snapshot per load case,
 * so calling the offset-based functions from a package would mean
 * re-deriving physics that was already resolved upstream, from inputs
 * this module would have to duplicate from `axis-load-cases`' own
 * surface. The four are kept as a tested, source-faithful reference —
 * and as what the general form's own equivalence tests check against —
 * not as a hint that they are the intended entry point.
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
  /** PMI's own `l1` (B17): carriage spacing along the direction of travel, in m. Must be > 0. */
  readonly spacingL1M: number;
  /** PMI's own `l2` (B17): transverse spacing between the two rails, in m. Must be > 0. */
  readonly spacingL2M: number;
  /** PMI's own `l3` (B17): load offset from centre along the direction of travel, in m. */
  readonly offsetL3M: number;
  /** PMI's own `l4` (B17): load offset from centre across the rails, in m. */
  readonly offsetL4M: number;
}

/**
 * PMI Linear Guideway catalog, Section 6, "Horizontal application: Uniform
 * motion or at rest" (printed page B17), re-verified directly against the
 * source image twice this session. Radial load only — this installation
 * has no separate lateral (`T`) component in the source. Blocks 1-4 form a
 * rectangle: (+l3,-l4), (-l3,-l4), (-l3,+l4), (+l3,+l4) for blocks 1-4
 * respectively (confirmed by the printed sign pattern, not inferred) — that
 * is, blocks 1 and 4 sit at the `+l3` end along the direction of travel, and
 * blocks 3 and 4 on the `+l4` rail.
 *
 * PMI's own Chapter 9 worked example numbers its carriages differently:
 * `No.1` - `No.4` there correspond to `block3`, `block4`, `block1`, `block2`
 * here. See ./pmi-chapter-9.ts, which derives that mapping from the printed
 * sign patterns rather than from the illustration.
 */
export function resolveHorizontalUniformBlockLoads(
  input: HorizontalUniformLoadInput,
): FourBlockLoads {
  assertFinite("forceN", input.forceN);
  assertPositive("spacingL1M", input.spacingL1M);
  assertPositive("spacingL2M", input.spacingL2M);
  assertFinite("offsetL3M", input.offsetL3M);
  assertFinite("offsetL4M", input.offsetL4M);

  const { forceN: F, spacingL1M: l1, spacingL2M: l2 } = input;
  const l3 = input.offsetL3M;
  const l4 = input.offsetL4M;
  const pitchTerm = (F * l3) / (2 * l1);
  const rollTerm = (F * l4) / (2 * l2);
  const base = F / 4;

  return {
    block1: { radialN: base + pitchTerm - rollTerm, lateralN: 0 },
    block2: { radialN: base - pitchTerm - rollTerm, lateralN: 0 },
    block3: { radialN: base - pitchTerm + rollTerm, lateralN: 0 },
    block4: { radialN: base + pitchTerm + rollTerm, lateralN: 0 },
  };
}

export interface VerticalUniformLoadInput {
  /** Applied lateral force at the load position, in N. */
  readonly forceN: number;
  /** PMI's own `l1` (B19): the spacing this diagram divides both shares by, in m. Must be > 0. */
  readonly spacingL1M: number;
  /** PMI's own `l2` (B19): load-position offset feeding the shared radial share, in m. */
  readonly offsetL2M: number;
  /** PMI's own `l4` (B19): load-position offset feeding the shared lateral share, in m. */
  readonly offsetL4M: number;
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
  assertPositive("spacingL1M", input.spacingL1M);
  assertFinite("offsetL2M", input.offsetL2M);
  assertFinite("offsetL4M", input.offsetL4M);

  const { forceN: F, spacingL1M: l1 } = input;
  const radialN = (F * input.offsetL2M) / (2 * l1);
  const lateralN = (F * input.offsetL4M) / (2 * l1);
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
  /** PMI's own `l1` (B23): carriage spacing along the direction of travel, in m. Must be > 0. */
  readonly spacingL1M: number;
  /** PMI's own `l3` (B23): load-height offset feeding the radial differential, in m. */
  readonly offsetL3M: number;
  /** PMI's own `l4` (B23): load offset feeding the lateral share, in m. */
  readonly offsetL4M: number;
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
  assertPositive("spacingL1M", input.spacingL1M);
  assertFinite("offsetL3M", input.offsetL3M);
  assertFinite("offsetL4M", input.offsetL4M);

  const { massKg: m, gravityMps2: g, spacingL1M: l1 } = input;
  const l3 = input.offsetL3M;
  const l4 = input.offsetL4M;
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
  /** PMI's own `l1` (B24): the spacing this diagram divides both shares by, in m. Must be > 0. */
  readonly spacingL1M: number;
  /** PMI's own `l3` (B24): load offset feeding the shared radial share, in m. */
  readonly offsetL3M: number;
  /** PMI's own `l4` (B24): load offset feeding the shared lateral share, in m. */
  readonly offsetL4M: number;
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
  assertPositive("spacingL1M", input.spacingL1M);
  assertFinite("offsetL3M", input.offsetL3M);
  assertFinite("offsetL4M", input.offsetL4M);

  const { massKg: m, gravityMps2: g, spacingL1M: l1 } = input;
  const l3 = input.offsetL3M;
  const l4 = input.offsetL4M;

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

// --- General resultant form (the integration path) --------------------------

export interface ResultantBlockLoadInput {
  /**
   * Force component normal to the mounting plane, in N — the only force
   * component that produces a direct per-block share. A force acting along
   * the rail axis produces no block share (it is reacted by the drive), which
   * is why PMI's own vertical diagram (B19) has no `F/4` term at all.
   */
  readonly normalForceN: number;
  /**
   * Force component parallel to the mounting plane and across the rails, in
   * N. Shared equally across the four blocks (`F/4`). **Elementary statics,
   * not source-confirmed:** no PMI diagram in `0.1.0`'s scope shows a net
   * lateral force, so none prints this term. It is included because a net
   * lateral force must go somewhere and four identical blocks split it
   * evenly; pass zero to reproduce any PMI diagram exactly.
   */
  readonly lateralForceN: number;
  /**
   * Rolling moment about the direction of travel, in N*m. Reacted by radial
   * loads on the two rails, so its lever arm is `2 * railSpacingM`. Positive
   * loads blocks 3 and 4 more and blocks 1 and 2 less.
   */
  readonly rollMomentNm: number;
  /**
   * Pitching moment about the transverse axis, in N*m. Reacted by radial
   * loads on the fore and aft carriage pairs, so its lever arm is
   * `2 * blockSpacingM`. Positive loads blocks 1 and 4 more and blocks 2 and
   * 3 less.
   */
  readonly pitchMomentNm: number;
  /**
   * Yawing moment about the mounting-plane normal, in N*m. Reacted by lateral
   * loads on the fore and aft carriage pairs — so its lever arm is
   * `2 * blockSpacingM`, **not** the rail spacing, and the four lateral loads
   * form a signed, zero-sum distribution rather than one shared magnitude.
   *
   * Both of those were wrong here until Stage 4 and are worth stating plainly:
   *
   * - PMI's general diagrams (B19, B23, B24) print the lateral load as a
   *   single unsigned magnitude on all four blocks over `2*l1`, which read as
   *   a per-block sizing figure and left it unclear which spacing `l1` was.
   *   PMI's own Chapter 9 worked example prints the same magnitude with
   *   *alternating signs* that sum to zero — an equilibrium distribution —
   *   and alternating across the same block pairs its `/(2*l1)` radial term
   *   separates. Since only pairs separated along the direction of travel can
   *   balance a yawing moment, `l1` is the along-travel carriage spacing.
   * - Dividing a yaw moment by the rail spacing, as this kernel first did,
   *   therefore used the wrong lever arm whenever the two spacings differ.
   *
   * See ./pmi-chapter-9.ts, which reproduces every printed figure of that
   * example, including the lateral signs.
   */
  readonly yawMomentNm: number;
  /** Transverse distance between the two rails, in m. Must be > 0. */
  readonly railSpacingM: number;
  /** Distance between the two carriages on one rail, along travel, in m. Must be > 0. */
  readonly blockSpacingM: number;
}

/**
 * General four-block load distribution in terms of a resolved force and
 * moment, rather than a force at a geometric offset.
 *
 * **Why this exists (resolved 2026-08-09, see
 * context/modules/linear-guide/stage-2-contract.md "Open Question"):**
 * re-reading all four of PMI's own installation diagrams (printed pages
 * B17, B19, B23, B24) together showed that every load-position offset
 * appears *only* inside a force-times-offset product — `F*l3`, `F*l4`,
 * `m*a1*l3`, `m*(g+a1)*l3` — and that product is a moment. The spacings
 * (`l1`, `l2`) appear only as denominators, and those are guide geometry,
 * not load position. So substituting `moment = force * offset` is exact
 * for the *radial* distribution, not an approximation.
 *
 * Two things this fixes over the offset-based form:
 *
 * 1. **A pure moment with no accompanying force is well defined here.**
 *    `offset = moment / force` is undefined when the force is zero, a case
 *    `axis-load-cases`' own `external_moment` input can produce on its own.
 * 2. **It matches what `axis-load-cases` actually resolves** — one
 *    `(resultant_force, resultant_moment)` snapshot per load case — so no
 *    caller has to re-derive gravity and inertia contributions that were
 *    already resolved upstream.
 *
 * **Block layout**, matching B17's printed sign pattern: blocks 1 and 4 sit
 * at the `+` end along the direction of travel, blocks 3 and 4 on the `+`
 * rail. So the pitching moment separates `{1,4}` from `{2,3}` and the rolling
 * moment separates `{3,4}` from `{1,2}`.
 *
 * **Every term here is now confirmed against a published worked example.**
 * `math.test.ts` asserts the radial distribution reproduces
 * `resolveHorizontalUniformBlockLoads` (B17) and
 * `resolveHorizontalInertiaBlockLoads` (B23) exactly for their own scenarios,
 * and ./pmi-chapter-9.ts reproduces all twenty per-carriage radial loads, all
 * twenty lateral loads (signs included), the equivalent loads, static safety
 * factor, mean loads, and nominal lives PMI's own Chapter 9 prints.
 *
 * That example also corrected two things this function originally got wrong,
 * both in the lateral direction and both described on
 * {@link ResultantBlockLoadInput.yawMomentNm}: the yaw lever arm is the
 * carriage spacing along travel, not the rail spacing, and the lateral loads
 * alternate in sign so they sum to zero.
 */
export function resolveBlockLoadsFromResultant(
  input: ResultantBlockLoadInput,
): FourBlockLoads {
  assertFinite("normalForceN", input.normalForceN);
  assertFinite("lateralForceN", input.lateralForceN);
  assertFinite("rollMomentNm", input.rollMomentNm);
  assertFinite("pitchMomentNm", input.pitchMomentNm);
  assertFinite("yawMomentNm", input.yawMomentNm);
  assertPositive("railSpacingM", input.railSpacingM);
  assertPositive("blockSpacingM", input.blockSpacingM);

  const base = input.normalForceN / 4;
  const rollTerm = input.rollMomentNm / (2 * input.railSpacingM);
  const pitchTerm = input.pitchMomentNm / (2 * input.blockSpacingM);
  const lateralBase = input.lateralForceN / 4;
  // Reacted by the fore/aft carriage pairs, so it alternates with the same
  // pattern the pitching moment separates -- and sums to zero across the four.
  const yawTerm = input.yawMomentNm / (2 * input.blockSpacingM);

  return {
    block1: {
      radialN: base + pitchTerm - rollTerm,
      lateralN: lateralBase + yawTerm,
    },
    block2: {
      radialN: base - pitchTerm - rollTerm,
      lateralN: lateralBase - yawTerm,
    },
    block3: {
      radialN: base - pitchTerm + rollTerm,
      lateralN: lateralBase - yawTerm,
    },
    block4: {
      radialN: base + pitchTerm + rollTerm,
      lateralN: lateralBase + yawTerm,
    },
  };
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
