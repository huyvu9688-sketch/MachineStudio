/**
 * Independent benchmark: NSK's own "fatigue life factor" (`fh`) / "speed
 * factor" (`fn`) method for basic rating life, reproduced here as a
 * distinct implementation from ./math.ts's `resolveNominalLife` /
 * `resolveLifeHours` — the "at least one independent benchmark source or
 * tool comparison" `context/roadmap.md` Module Definition of Done item 9
 * requires, closing the gap this module's own `validation.ts` and
 * `context/modules/support-bearing/stage-1-spec.md` "Evidence Gaps" record
 * ("no independent-benchmark candidate exists yet").
 *
 * Source: NSK Ltd., *Rolling Bearings* (CAT. No. E1102a), Section 5.2.3-
 * 5.2.5 and Table 5.2 (printed pages A24-A27). See
 * `lib/standards/engineering-sources.ts`
 * `"jp.nsk.rolling_bearings_catalog@e1102a-2005"`.
 *
 * NSK packages the identical ISO-281-catalogue physics `./math.ts` already
 * implements (via NTN's own handbook) into a different, chart-friendly
 * form: instead of computing `L10h` directly from `C`, `P`, and `n`, NSK
 * defines a speed factor `fn` (from `n` alone) and a fatigue life factor
 * `fh = fn * C/P`, then reads `Lh` off a chart keyed by `fh` (Fig. 5.4) or
 * computes it from the equivalent closed form `Lh = 500 * fh^3` (Table
 * 5.2, ball-bearing column; roller bearings use a separate `fn` formula and
 * a `10/3` exponent instead — not reproduced here, since this module
 * implements ball bearings only, `0.1.0`'s own validity envelope).
 *
 * **This is a proved algebraic identity, not an independently-calibrated
 * agreement** — the same "two formulations of the same physics, shown to
 * coincide exactly rather than merely corroborate" treatment
 * `lib/modules/linear-guide/0.1.0/iko-benchmark.ts` gives PMI's and IKO's
 * own equivalent-load forms. Substituting NSK's own
 * `fn = (0.03n)^(-1/3)` (Table 5.2, ball bearings) into `fh = fn * C/P`
 * and then into `Lh = 500 * fh^3` gives:
 *
 * ```text
 * Lh = 500 * (0.03n)^-1 * (C/P)^3 = (500 / 0.03) / n * (C/P)^3
 *    = (50000/3) / n * (C/P)^3 = (10^6 / 60) / n * (C/P)^3
 * ```
 *
 * — exactly `./math.ts`'s own `L10h = (C/P)^3 * 10^6 / (60n)`
 * (`resolveNominalLife` composed with `resolveLifeHours`). The sibling test
 * file asserts this identity holds to floating-point precision, not just
 * within a tolerance band — unlike `thk-benchmark.ts`'s own buckling/
 * critical-speed cross-check, which uses a genuinely different calibration
 * constant and is only ever expected to agree approximately.
 */

export class NskFhBenchmarkInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NskFhBenchmarkInputError";
  }
}

function fail(message: string): never {
  throw new NskFhBenchmarkInputError(message);
}

function assertPositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) fail(`${name} must be positive.`);
}

/**
 * NSK's own ball-bearing speed factor, `fn = (10^6 / (500*60n))^(1/3)`
 * (Table 5.2), algebraically `(0.03n)^(-1/3)`. `n` in rev/min.
 */
export function resolveNskSpeedFactorBall(
  rotationalSpeedRevPerMin: number,
): number {
  assertPositive("rotationalSpeedRevPerMin", rotationalSpeedRevPerMin);
  return (0.03 * rotationalSpeedRevPerMin) ** (-1 / 3);
}

/**
 * NSK's own fatigue life factor, `fh = fn * (C/P)` (Table 5.2, both bearing
 * types share this form -- only the final `Lh` exponent differs by type).
 */
export function resolveNskFatigueLifeFactor(
  speedFactor: number,
  dynamicLoadRatingN: number,
  equivalentLoadN: number,
): number {
  assertPositive("speedFactor", speedFactor);
  assertPositive("dynamicLoadRatingN", dynamicLoadRatingN);
  assertPositive("equivalentLoadN", equivalentLoadN);
  return speedFactor * (dynamicLoadRatingN / equivalentLoadN);
}

/**
 * NSK's own ball-bearing basic rating life in hours, `Lh = 500 * fh^3`
 * (Table 5.2, ball-bearing column).
 */
export function resolveNskLifeHoursBall(fatigueLifeFactor: number): number {
  assertPositive("fatigueLifeFactor", fatigueLifeFactor);
  return 500 * fatigueLifeFactor ** 3;
}

/** Composes the three steps above for a single ball-bearing life-hours figure. */
export function resolveNskLifeHoursBallDirect(
  rotationalSpeedRevPerMin: number,
  dynamicLoadRatingN: number,
  equivalentLoadN: number,
): number {
  const fn = resolveNskSpeedFactorBall(rotationalSpeedRevPerMin);
  const fh = resolveNskFatigueLifeFactor(
    fn,
    dynamicLoadRatingN,
    equivalentLoadN,
  );
  return resolveNskLifeHoursBall(fh);
}
