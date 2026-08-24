/**
 * Independent benchmark: THK's own ball-screw catalog buckling, critical-
 * (dangerous) speed, DN-value, and bidirectional-duty-cycle equivalent-load
 * formulas, reproduced here as a distinct implementation from ./math.ts's
 * resolveBucklingLoad/resolveCriticalSpeed/resolveEquivalentDynamicLoad —
 * the "at least one independent benchmark source or tool comparison"
 * context/roadmap.md Module Definition of Done item 9 requires, for the
 * checks that so far only had Rockford Ball Screw's own worked example (or,
 * for equivalent load, no independent benchmark at all) to validate against
 * (context/modules/ball-screw/stage-1-spec.md "Evidence Gaps and
 * Verification Confidence").
 *
 * THK's own buckling/critical-speed formulas use a different shape and unit
 * system than Rockford's: metric (mm) inputs, a mounting-method coefficient
 * read from THK's own table, and a fixed 10^4/10^7 scaling constant —
 * structurally the same shape Steinmeyer's own formulas use (stage-1-spec.md
 * items 7-8), not Rockford's inch/lbf `Fe * 14,030,000 * ...` shape ./math.ts
 * implements. Reproducing THK's own worked numbers here confirms this
 * reading of the formula is correct; it is deliberately NOT expected to
 * agree exactly with ./math.ts's Rockford-based functions for the same
 * geometry — the two sources use different mounting-coefficient constants
 * for the same nominal end condition (a real, documented discrepancy — see
 * this module's README.md "THK buckling/critical-speed formula" note) — so
 * the cross-check test in the sibling test file only asserts the two stay
 * within a bounded ratio of each other, not floating-point agreement (unlike
 * axis-load-cases/atlanta-benchmark.ts's cross-check, where both sources
 * reduce to identical Newtonian physics with no calibration constant to
 * disagree on).
 *
 * THK's equivalent-load formula ({@link resolveThkDirectionalEquivalentLoad})
 * is a genuine methodological difference, not just a differently-calibrated
 * version of the same shape: for a bidirectional/reversing duty cycle, it
 * computes two direction-specific averages (each normalized against the
 * *full* round-trip travel distance) instead of ./math.ts's single
 * weighted-cube-mean over every phase (Steinmeyer's own formula, evaluated
 * directly). The two are NOT expected to agree even in general shape, only
 * to both be defensible readings of "equivalent load" for a reversing duty
 * cycle — see that function's own doc comment for the open question this
 * benchmark does not resolve.
 *
 * Source: THK Ball Screw General Catalog, "Examples of Selecting a Ball
 * Screw" — High-speed Transfer Equipment (Horizontal Use), printed pages
 * A-744 through A-747. See lib/standards/engineering-sources.ts
 * "jp.thk.example_ball_screw_selection@bondy-mirror-2026-08-09". Public
 * source (THK catalog content), unlike axis-load-cases/atlanta-benchmark.ts
 * — safe to cite by source revision ID.
 */

export class ThkBenchmarkInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ThkBenchmarkInputError";
  }
}

function fail(message: string): never {
  throw new ThkBenchmarkInputError(message);
}

function assertPositive(name: string, value: number): void {
  if (!Number.isFinite(value)) fail(`${name} must be finite.`);
  if (value <= 0) fail(`${name} must be positive.`);
}

export interface ThkBucklingLoadInput {
  /** Screw minor (root) diameter, in mm. Must be > 0. */
  readonly rootDiameterMm: number;
  /** Distance between the two mounting surfaces, in mm. Must be > 0. */
  readonly unsupportedLengthMm: number;
  /**
   * Mounting-method factor from THK's own coefficient table (cited by page
   * reference only, not reproduced here). THK's own worked example uses
   * `20` for a fixed-fixed mounting between the nut and the bearing.
   */
  readonly mountingFactor: number;
}

/**
 * `P1 = mountingFactor * d1^4 / ls^2 * 10^4`, evaluated directly in mm/N as
 * printed (THK's own "eta_2" / "d1" / "ls" notation renamed here to match
 * this file's own parameter names). Reproduces THK's own worked result:
 * `20 * 17.5^4 / 1100^2 * 10^4 = 15,500 N`.
 */
export function resolveThkBucklingLoad(input: ThkBucklingLoadInput): number {
  assertPositive("rootDiameterMm", input.rootDiameterMm);
  assertPositive("unsupportedLengthMm", input.unsupportedLengthMm);
  assertPositive("mountingFactor", input.mountingFactor);

  return (
    ((input.mountingFactor * input.rootDiameterMm ** 4) /
      input.unsupportedLengthMm ** 2) *
    1e4
  );
}

export interface ThkCriticalSpeedInput {
  /** Screw minor (root) diameter, in mm. Must be > 0. */
  readonly rootDiameterMm: number;
  /** Distance between the two mounting surfaces, in mm. Must be > 0. */
  readonly unsupportedLengthMm: number;
  /**
   * Mounting-method factor from THK's own coefficient table. THK's own
   * worked example uses `15.1` for a fixed-supported mounting between the
   * nut and the bearing — a different mounting condition than the buckling
   * example above uses, per THK's own printed text.
   */
  readonly mountingFactor: number;
}

/**
 * `N1 = mountingFactor * d1 / ls^2 * 10^7`, evaluated directly in mm/(rev/min)
 * as printed. Linear in `d1`, not quartic — a real difference from the
 * buckling formula's own `d1^4` exponent, confirmed against THK's own two
 * worked numbers (`2180 min^-1` and `3294 min^-1`) in the sibling test file.
 */
export function resolveThkCriticalSpeed(input: ThkCriticalSpeedInput): number {
  assertPositive("rootDiameterMm", input.rootDiameterMm);
  assertPositive("unsupportedLengthMm", input.unsupportedLengthMm);
  assertPositive("mountingFactor", input.mountingFactor);

  return (
    ((input.mountingFactor * input.rootDiameterMm) /
      input.unsupportedLengthMm ** 2) *
    1e7
  );
}

export interface ThkDnPermissibleSpeedInput {
  /** Ball center-to-center diameter, in mm. Must be > 0. */
  readonly ballCenterDiameterMm: number;
}

/**
 * `N2 = 70,000 / D` — THK's own large-lead rolled-ball-screw DN-value
 * permissible-speed formula (printed page A-745). A manufacturer/series-
 * specific data-sheet constant, not a universal physical law — see
 * context/modules/ball-screw/stage-1-spec.md item 9. `0.1.0` does not
 * implement a DN check (it is optional, gated on catalog data supplying one
 * — see math.ts's own module doc comment); this exists purely as a second
 * confirmed data point for that item's evidence record.
 */
export function resolveThkDnPermissibleSpeed(
  input: ThkDnPermissibleSpeedInput,
): number {
  assertPositive("ballCenterDiameterMm", input.ballCenterDiameterMm);
  return 70_000 / input.ballCenterDiameterMm;
}

export interface ThkDirectionalPhase {
  /**
   * Signed axial load for this phase, in N — sign, not magnitude, decides
   * which of the two direction-specific averages this phase feeds. A
   * `0` contributes its distance to the shared denominator but nothing to
   * either numerator, mirroring THK's own "assuming Fa = 0" treatment of
   * the opposite-direction phases in its worked example. Must be finite.
   */
  readonly signedAxialLoadN: number;
  /** Travel distance covered during this phase, in mm. Must be > 0. */
  readonly travelDistanceMm: number;
}

export interface ThkDirectionalEquivalentLoadResult {
  /** Equivalent load over every phase with a positive signedAxialLoadN, in N. */
  readonly positiveDirectionLoadN: number;
  /** Equivalent load over every phase with a negative signedAxialLoadN, in N. */
  readonly negativeDirectionLoadN: number;
}

/**
 * THK's own bidirectional/reversing-duty-cycle equivalent-load method
 * (printed pages A-746/A-747), as printed:
 *
 * `Fm1 = cbrt( sum_{i in positive-direction phases}(|Fa_i|^3 * l_i)
 *              / sum_{all phases}(l_i) )`
 * `Fm2 = cbrt( sum_{i in negative-direction phases}(|Fa_i|^3 * l_i)
 *              / sum_{all phases}(l_i) )`
 *
 * Each direction's numerator sums only that direction's own phases, but
 * both share the *same* denominator — the full round-trip travel distance,
 * not either direction's own sub-total. THK's own worked example states
 * "since the load direction varies, calculate the average axial load while
 * assuming Fa[opposite-direction phases] = 0N," which is exactly what
 * summing only one direction's cubed terms while dividing by the shared
 * total distance expresses.
 *
 * Reproduces THK's own worked result exactly: for the six-phase WTF2040-2
 * scenario (`+550N`/`75mm`, `+17N`/`850mm`, `-516N`/`75mm`, `-550N`/`75mm`,
 * `-17N`/`850mm`, `+516N`/`75mm`), both `positiveDirectionLoadN` and
 * `negativeDirectionLoadN` come out to `225 N`.
 *
 * **Open question this function does not resolve:** THK's own worked
 * example only shows a case where `Fm1 = Fm2` by construction (the forward
 * and backward halves of the cycle are numerically symmetric), and its own
 * text says only "since Fm1 = Fm2, assume the average axial load to be
 * Fm = Fm1 = Fm2" — it does not say what to do when the two directions
 * disagree. This function returns both values rather than guessing at a
 * combination rule for that case; no source read this session covers it.
 *
 * **Not the same formula ./math.ts's resolveEquivalentDynamicLoad
 * implements**, and not expected to agree with it — see this file's own
 * module doc comment and `context/modules/ball-screw/stage-1-spec.md`
 * "Evidence Gaps and Verification Confidence" for the numeric comparison
 * (`283.5 N` from `resolveEquivalentDynamicLoad` fed the equivalent
 * `(q_i, n_i, F_i)` triples, versus `225 N` here).
 */
export function resolveThkDirectionalEquivalentLoad(
  phases: readonly ThkDirectionalPhase[],
): ThkDirectionalEquivalentLoadResult {
  if (phases.length === 0) fail("At least one duty-cycle phase is required.");

  let totalDistanceMm = 0;
  let positiveCubedWeightedSum = 0;
  let negativeCubedWeightedSum = 0;

  phases.forEach((phase, index) => {
    const label = `phases[${index}]`;
    if (!Number.isFinite(phase.signedAxialLoadN)) {
      fail(`${label}.signedAxialLoadN must be finite.`);
    }
    assertPositive(`${label}.travelDistanceMm`, phase.travelDistanceMm);

    totalDistanceMm += phase.travelDistanceMm;
    const cubedContribution =
      Math.abs(phase.signedAxialLoadN) ** 3 * phase.travelDistanceMm;
    if (phase.signedAxialLoadN > 0) {
      positiveCubedWeightedSum += cubedContribution;
    } else if (phase.signedAxialLoadN < 0) {
      negativeCubedWeightedSum += cubedContribution;
    }
  });

  if (totalDistanceMm <= 0) {
    fail("At least one phase must have a positive travelDistanceMm.");
  }

  return {
    positiveDirectionLoadN: Math.cbrt(
      positiveCubedWeightedSum / totalDistanceMm,
    ),
    negativeDirectionLoadN: Math.cbrt(
      negativeCubedWeightedSum / totalDistanceMm,
    ),
  };
}
