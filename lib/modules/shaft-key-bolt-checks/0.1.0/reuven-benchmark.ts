/**
 * Independent benchmark: Reuven Engineering Tools' own shaft-design
 * calculator, reproduced here as a distinct implementation from ./math.ts's
 * `resolveShaftCombinedStress` — the "compare against an independent method
 * or established tool" item `context/ai-workflow-rules.md` "New Module
 * Workflow" Stage 4 requires.
 *
 * Source: `lib/standards/engineering-sources.ts`,
 * `us.reuven_tools.shaft_design_calculator`. Gives both the maximum-shear-
 * stress (Tresca) and distortion-energy (von Mises) forms side by side, with
 * one full worked example: `M = T = 1.0e6 N*mm` (1000 N*m), `Sy = 400 MPa`,
 * `N = 2` (design safety factor), `Kb = Kt = 1` -> Tresca `d ~= 41.6 mm`,
 * von Mises `d ~= 40.7 mm`.
 *
 * Reuven's own Tresca formula (`d^3 = (16/(pi*tau_allow)) *
 * sqrt((Kb*M)^2+(Kt*T)^2)`, `tau_allow = Sy/(2N)`) is the *same physical
 * relationship* as ./math.ts's own `resolveShaftCombinedStress`
 * (`sigma_e = 16/(pi*D^3) * sqrt((Ks*T)^2+(Km*M)^2)`, solid shaft, `B=0`) —
 * Reuven's own `Kb`/`Kt` play the same role as this module's own `Km`/`Ks`,
 * and Reuven's own `tau_allow` is this module's own `combinedStressPa`'s
 * governing limit. This is not a coincidence: `stage-1-spec.md` "Formulas"
 * item 1 already identifies Reuven's Tresca form as one of three
 * corroborating tertiary sources for the same Air Force Stress Manual
 * formula shape. Because the two are the same relationship, this benchmark
 * is a direct numeric cross-check, not merely a bounded-ratio comparison
 * (contrast `lib/modules/ball-screw/0.1.0/thk-benchmark.ts`'s own buckling/
 * critical-speed cross-check, where THK's own mounting-coefficient
 * constants genuinely differ from Rockford's): this module's own
 * `resolveShaftCombinedStress`, evaluated at Reuven's own independently
 * solved diameter, must recover Reuven's own `tau_allow` figure.
 */

export class ReuvenBenchmarkInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReuvenBenchmarkInputError";
  }
}

function fail(message: string): never {
  throw new ReuvenBenchmarkInputError(message);
}

function assertPositive(name: string, value: number): void {
  if (!Number.isFinite(value)) fail(`${name} must be finite.`);
  if (value <= 0) fail(`${name} must be positive.`);
}

export interface ReuvenShaftDesignInput {
  /** Bending moment, in N*m. Must be > 0. */
  readonly bendingMomentNm: number;
  /** Torque, in N*m. Must be > 0. */
  readonly torqueNm: number;
  /** Material yield strength, in Pa. Must be > 0. */
  readonly yieldStrengthPa: number;
  /** Design safety factor `N`. Must be > 0. */
  readonly safetyFactor: number;
  /** Bending stress-concentration factor `Kb`. Must be > 0. */
  readonly kb: number;
  /** Torsional stress-concentration factor `Kt`. Must be > 0. */
  readonly kt: number;
}

/**
 * `d^3 = (16/(pi*tau_allow)) * sqrt((Kb*M)^2+(Kt*T)^2)`, `tau_allow =
 * Sy/(2N)` — Reuven's own maximum-shear-stress (Tresca) form, evaluated
 * directly in SI. Reproduces Reuven's own worked result: `d ~= 41.6 mm`.
 */
export function resolveReuvenTrescaDiameterM(
  input: ReuvenShaftDesignInput,
): number {
  assertPositive("bendingMomentNm", input.bendingMomentNm);
  assertPositive("torqueNm", input.torqueNm);
  assertPositive("yieldStrengthPa", input.yieldStrengthPa);
  assertPositive("safetyFactor", input.safetyFactor);
  assertPositive("kb", input.kb);
  assertPositive("kt", input.kt);

  const tauAllowPa = input.yieldStrengthPa / (2 * input.safetyFactor);
  const resultantNm = Math.sqrt(
    (input.kb * input.bendingMomentNm) ** 2 +
      (input.kt * input.torqueNm) ** 2,
  );
  return Math.cbrt((16 / (Math.PI * tauAllowPa)) * resultantNm);
}

/**
 * `d^3 = (32*N/(pi*Sy)) * sqrt((Kb*M)^2 + 0.75*(Kt*T)^2)` — Reuven's own
 * distortion-energy (von Mises) form, differing from the Tresca form above
 * only in the torque term's own coefficient (`0.75` vs `1.0`) — the expected
 * theoretical relationship between the two failure theories, not a
 * disagreement (`stage-1-spec.md` "Formulas" item 1). Reproduces Reuven's
 * own worked result: `d ~= 40.7 mm`.
 */
export function resolveReuvenVonMisesDiameterM(
  input: ReuvenShaftDesignInput,
): number {
  assertPositive("bendingMomentNm", input.bendingMomentNm);
  assertPositive("torqueNm", input.torqueNm);
  assertPositive("yieldStrengthPa", input.yieldStrengthPa);
  assertPositive("safetyFactor", input.safetyFactor);
  assertPositive("kb", input.kb);
  assertPositive("kt", input.kt);

  const resultant = Math.sqrt(
    (input.kb * input.bendingMomentNm) ** 2 +
      0.75 * (input.kt * input.torqueNm) ** 2,
  );
  return Math.cbrt(
    ((32 * input.safetyFactor) / (Math.PI * input.yieldStrengthPa)) *
      resultant,
  );
}
