/**
 * Independent benchmark: a second KTR Systems GmbH selection-calculation
 * document, "Coupling Selection According to DIN 740 Part II" (lib/standards/
 * engineering-sources.ts
 * "us.ktr.coupling_selection_din740_part2@web-2026-08-10"), reproduced from
 * its own full worked numerical example (catalog printed page 13) as a
 * genuinely independent second computation — closing the gap validation.ts's
 * own `independentBenchmark` field previously left open: "a numerical
 * comparison of KTR's own summed shock-torque form against this module's
 * simplified shock-check reuse of the steady-check shape ... which neither
 * source's own worked examples exercise". Neither KTR's other document's own
 * example nor either of R+W's own two examples (math.test.ts,
 * rw-reference-examples.ts) is a shock-torque selection — all three are
 * steady-torque selections only. This document's own example is the first
 * full published shock-torque numerical example in this module's source set.
 *
 * **This document's own general shock-torque formula is a real disagreement
 * with KTR's other document, recorded rather than resolved** (the same "two
 * sources agree on shape, disagree on specifics" treatment this project
 * already gives cross-manufacturer disagreements — ball-screw's buckling
 * constant, linear-guide's PMI/IKO equivalent load — except here both
 * documents share one manufacturer). context/modules/coupling/
 * stage-1-spec.md item 2 recorded KTR's shock check (from
 * us.ktr.coupling_selection_operating_factors) as
 * `T_Kmax >= (T_N + T_S) * S_Z * S_t * S_R`. This document's own general
 * (non-hydrostatic-drive) form is instead
 *
 *   T_Kmax >= T_S * S_Z * S_t + T_N * S_t,   T_S = T_AS * M_A * S_A
 *
 * where the shock torque actually reaching the coupling, `T_S`, is a
 * mass-distribution-weighted fraction (`M_A = J_L / (J_A + J_L)`, this
 * document's own "rotational inertia coefficient of driving side") of the
 * driving side's own peak torque `T_AS`, scaled by a driving-side shock
 * factor `S_A` — not the other document's flat `S_B`/`S_R` terms. `S_B`
 * (operating factor) appears in this document only as part of a separate,
 * explicitly simplified selection path for two specific coupling families
 * (BoWex-ELASTIC, MONOLASTIC) driving hydrostatic loads; `S_R` (direction
 * factor) does not appear anywhere in this document at all. `0.1.0` adopts
 * neither document's shock form verbatim (context/modules/coupling/
 * stage-2-contract.md "Decisions" item 3) — it reuses its own steady-check
 * shape for both cases, which this file's own comparison functions below
 * evaluate against this document's own detailed method.
 *
 * Source: KTR Systems GmbH, "Coupling Selection According to DIN 740 Part
 * II" (catalog printed pages 10-13, worked example on page 13). See
 * lib/standards/engineering-sources.ts
 * "us.ktr.coupling_selection_din740_part2@web-2026-08-10".
 */

import {
  resolveRequiredTorqueFromPower,
  resolveScaledRequiredTorque,
} from "./math";

export class KtrDin740BenchmarkInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KtrDin740BenchmarkInputError";
  }
}

function fail(message: string): never {
  throw new KtrDin740BenchmarkInputError(message);
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

// --- KTR's own rotational-inertia coefficients ------------------------------

export interface KtrInertiaCoefficientsInput {
  /** Total driving-side inertia referred to the coupling speed, in kg*m^2 (J_A). */
  readonly drivingSideInertiaKgm2: number;
  /** Total load-side inertia referred to the coupling speed, in kg*m^2 (J_L). */
  readonly loadSideInertiaKgm2: number;
}

export interface KtrInertiaCoefficientsResult {
  /** M_A = J_L / (J_A + J_L) — the fraction of a driving-side shock that reaches the coupling. */
  readonly drivingSideCoefficient: number;
  /** M_L = J_A / (J_A + J_L) — the fraction of a load-side shock that reaches the coupling. */
  readonly loadSideCoefficient: number;
}

/**
 * KTR's own "rotational inertia coefficient" pair (page 11 terminology
 * table): a two-mass lumped model of how much of a shock torque originating
 * on one side of the coupling is actually transmitted through it, given the
 * inertia split between the two sides.
 */
export function resolveKtrInertiaCoefficients(
  input: KtrInertiaCoefficientsInput,
): KtrInertiaCoefficientsResult {
  assertPositive("drivingSideInertiaKgm2", input.drivingSideInertiaKgm2);
  assertPositive("loadSideInertiaKgm2", input.loadSideInertiaKgm2);

  const totalKgm2 = input.drivingSideInertiaKgm2 + input.loadSideInertiaKgm2;
  return {
    drivingSideCoefficient: input.loadSideInertiaKgm2 / totalKgm2,
    loadSideCoefficient: input.drivingSideInertiaKgm2 / totalKgm2,
  };
}

// --- KTR's own shock torque and torque requirements -------------------------

export interface KtrDrivingSideShockTorqueInput {
  /** Peak (starting) torque on the driving side, in N*m (T_AS). */
  readonly peakTorqueDrivingSideNm: number;
  /** M_A, from {@link resolveKtrInertiaCoefficients}. */
  readonly drivingSideInertiaCoefficient: number;
  /** Driving-side shock factor, by application (S_A). */
  readonly shockFactorDrivingSide: number;
}

export interface KtrShockTorqueResult {
  /** T_S — the shock torque actually reaching the coupling. */
  readonly shockTorqueNm: number;
}

/** KTR's own driving-side shock torque (page 12): `T_S = T_AS * M_A * S_A`. */
export function resolveKtrDrivingSideShockTorque(
  input: KtrDrivingSideShockTorqueInput,
): KtrShockTorqueResult {
  assertPositive("peakTorqueDrivingSideNm", input.peakTorqueDrivingSideNm);
  assertPositive(
    "drivingSideInertiaCoefficient",
    input.drivingSideInertiaCoefficient,
  );
  assertPositive("shockFactorDrivingSide", input.shockFactorDrivingSide);

  return {
    shockTorqueNm:
      input.peakTorqueDrivingSideNm *
      input.drivingSideInertiaCoefficient *
      input.shockFactorDrivingSide,
  };
}

export interface KtrMaxTorqueRequirementInput {
  /** T_S, from {@link resolveKtrDrivingSideShockTorque} (or its load-side equivalent). */
  readonly shockTorqueNm: number;
  /** Starting-frequency factor (S_Z). */
  readonly startingFactor: number;
  /** Temperature factor (S_t). */
  readonly temperatureFactor: number;
  /** T_N — the machine's own rated torque, when it is simultaneously present with the shock. Zero otherwise. */
  readonly ratedTorqueOverlapNm: number;
}

export interface KtrMaxTorqueRequirementResult {
  /** The required T_Kmax the candidate coupling's own catalog maximum torque must meet or exceed. */
  readonly requiredMaxTorqueNm: number;
}

/**
 * KTR's own general (non-hydrostatic-drive) shock-torque requirement (page
 * 12, item 1.2): `T_Kmax >= T_S * S_Z * S_t + T_N * S_t`.
 */
export function resolveKtrMaxTorqueRequirement(
  input: KtrMaxTorqueRequirementInput,
): KtrMaxTorqueRequirementResult {
  assertPositive("shockTorqueNm", input.shockTorqueNm);
  assertPositive("startingFactor", input.startingFactor);
  assertPositive("temperatureFactor", input.temperatureFactor);
  assertNonNegative("ratedTorqueOverlapNm", input.ratedTorqueOverlapNm);

  return {
    requiredMaxTorqueNm:
      input.shockTorqueNm * input.startingFactor * input.temperatureFactor +
      input.ratedTorqueOverlapNm * input.temperatureFactor,
  };
}

export interface KtrRatedTorqueRequirementInput {
  /** The machine's own rated torque (T_N, here the load side's T_LN). */
  readonly ratedTorqueNm: number;
  /** Temperature factor (S_t). */
  readonly temperatureFactor: number;
}

export interface KtrRatedTorqueRequirementResult {
  /** The required T_KN the candidate coupling's own catalog rated torque must meet or exceed. */
  readonly requiredRatedTorqueNm: number;
}

/** KTR's own general steady-torque requirement (page 12, item 1.1): `T_KN >= T_N * S_t`. */
export function resolveKtrRatedTorqueRequirement(
  input: KtrRatedTorqueRequirementInput,
): KtrRatedTorqueRequirementResult {
  assertPositive("ratedTorqueNm", input.ratedTorqueNm);
  assertPositive("temperatureFactor", input.temperatureFactor);

  return {
    requiredRatedTorqueNm: input.ratedTorqueNm * input.temperatureFactor,
  };
}

// --- KTR's own worked example (catalog printed page 13) ---------------------

/**
 * KTR's own given inputs and selected coupling, catalog printed page 13:
 * a 315L rotary current motor (160 kW / 1485 rpm) driving a screw compressor
 * (T_LN = 930 Nm) through a ROTEX Size 90 coupling.
 */
export const KTR_DIN740_PART2_EXAMPLE = {
  drivingSide: {
    powerKw: 160,
    speedRpm: 1485,
    inertiaKgm2: 2.9,
    startingsPerHour: 6,
  },
  loadSide: {
    label: "screw compressor",
    ratedTorqueNm: 930,
    inertiaKgm2: 6.8,
  },
  factors: {
    /** Size 315L, "moderate shocks" bucket (page 11). */
    shockFactorDrivingSide: 1.8,
    /** 6 starts/hour (page 11). */
    startingFactor: 1.0,
    /** +70 degC ambient, T-PUR spider (page 11). */
    temperatureFactor: 1.45,
  },
  coupling: {
    model: "ROTEX Size 90, spider 92 Shore A",
    ratedTorqueNm: 2400,
    maxTorqueNm: 4800,
    drivingHalfInertiaKgm2: 0.0673,
    loadHalfInertiaKgm2: 0.0673,
  },
  /** T_AS = 2 * T_AN, given. */
  peakTorqueMultiple: 2,
} as const;

/** T_AN = 9550*P/n in SI, via math.ts's own elementary relation — KTR's own printed 1029 Nm. */
export function ktrDin740ExampleDrivingTorqueNm(): number {
  const { drivingSide } = KTR_DIN740_PART2_EXAMPLE;
  const rotationalSpeedRadPerS = (drivingSide.speedRpm * 2 * Math.PI) / 60;
  return resolveRequiredTorqueFromPower({
    powerW: drivingSide.powerKw * 1000,
    rotationalSpeedRadPerS,
  }).requiredTorqueNm;
}

/** T_AS = 2 * T_AN — KTR's own printed 2058 Nm. */
export function ktrDin740ExamplePeakTorqueDrivingSideNm(): number {
  return (
    KTR_DIN740_PART2_EXAMPLE.peakTorqueMultiple *
    ktrDin740ExampleDrivingTorqueNm()
  );
}

/** T_KN >= T_LN * S_t — KTR's own printed 1348.5 Nm requirement (T_KN = 2400 Nm clears it). */
export function ktrDin740ExampleRequiredRatedTorqueNm(): number {
  const { loadSide, factors } = KTR_DIN740_PART2_EXAMPLE;
  return resolveKtrRatedTorqueRequirement({
    ratedTorqueNm: loadSide.ratedTorqueNm,
    temperatureFactor: factors.temperatureFactor,
  }).requiredRatedTorqueNm;
}

/** J_A = J_Motor + J_KA, J_L = J_compressor + J_KL — KTR's own printed 2.9673 / 6.8673 kg*m^2. */
export function ktrDin740ExampleCoupledInertiasKgm2(): {
  readonly drivingSideInertiaKgm2: number;
  readonly loadSideInertiaKgm2: number;
} {
  const { drivingSide, loadSide, coupling } = KTR_DIN740_PART2_EXAMPLE;
  return {
    drivingSideInertiaKgm2:
      drivingSide.inertiaKgm2 + coupling.drivingHalfInertiaKgm2,
    loadSideInertiaKgm2: loadSide.inertiaKgm2 + coupling.loadHalfInertiaKgm2,
  };
}

/**
 * M_A, computed exactly from J_A/J_L (not the source's own single-decimal
 * rounding to 0.7 — see this file's own test for the reproduction of the
 * source's printed figures, which carries that rounding forward the way the
 * source itself does).
 */
export function ktrDin740ExampleDrivingSideInertiaCoefficient(): number {
  const { drivingSideInertiaKgm2, loadSideInertiaKgm2 } =
    ktrDin740ExampleCoupledInertiasKgm2();
  return resolveKtrInertiaCoefficients({
    drivingSideInertiaKgm2,
    loadSideInertiaKgm2,
  }).drivingSideCoefficient;
}

/** T_S = T_AS * M_A * S_A, using the exact (unrounded) M_A above — KTR's own printed 2593.1 Nm rounds M_A to 0.7 first. */
export function ktrDin740ExampleShockTorqueNm(): number {
  const { factors } = KTR_DIN740_PART2_EXAMPLE;
  return resolveKtrDrivingSideShockTorque({
    peakTorqueDrivingSideNm: ktrDin740ExamplePeakTorqueDrivingSideNm(),
    drivingSideInertiaCoefficient:
      ktrDin740ExampleDrivingSideInertiaCoefficient(),
    shockFactorDrivingSide: factors.shockFactorDrivingSide,
  }).shockTorqueNm;
}

/**
 * T_Kmax >= T_S * S_Z * S_t (T_N = 0 — "shock on driving side without load
 * torque being overlapping", the source's own words) — KTR's own printed
 * 3760 Nm requirement (T_Kmax = 4800 Nm clears it).
 */
export function ktrDin740ExampleRequiredMaxTorqueNm(): number {
  const { factors } = KTR_DIN740_PART2_EXAMPLE;
  return resolveKtrMaxTorqueRequirement({
    shockTorqueNm: ktrDin740ExampleShockTorqueNm(),
    startingFactor: factors.startingFactor,
    temperatureFactor: factors.temperatureFactor,
    ratedTorqueOverlapNm: 0,
  }).requiredMaxTorqueNm;
}

// --- Comparison against this module's own simplified shock check -----------

export interface ModuleShockCheckComparison {
  /** KTR's own detailed required T_Kmax for this scenario. */
  readonly ktrRequiredMaxTorqueNm: number;
  /** This module's own scaled-required-torque figure for the same scenario. */
  readonly moduleRequiredTorqueNm: number;
  /** capacity / moduleRequiredTorqueNm, mirroring resolveTorqueSafetyFactor. */
  readonly moduleSafetyFactor: number;
  /** capacity / ktrRequiredMaxTorqueNm. */
  readonly ktrSafetyFactor: number;
  /** (module - KTR) / KTR — positive means the module over-states the required torque relative to KTR's own detailed method. */
  readonly relativeDeviation: number;
}

/**
 * Compares this module's own simplified shock check
 * (`resolveScaledRequiredTorque`/`resolveTorqueSafetyFactor`, `required *
 * serviceFactor` against `coupling.max_torque`) to KTR's own detailed method
 * above, for the same scenario. Both forms are fed the same "required
 * torque" input, `T_AS` (the driving side's own peak/starting torque) — the
 * same `screw.drive_torque[peak]` mapping `compute.ts`'s own
 * `peak-case-torque-concept-adapted` assumption documents. `serviceFactor` is
 * the caller's choice of `coupling.service_factor`; see this file's own test
 * for what value reproduces KTR's own figure exactly, and what a plausible
 * simpler choice gets wrong.
 */
export function compareModuleShockCheckToKtrDin740(
  serviceFactor: number,
): ModuleShockCheckComparison {
  assertPositive("serviceFactor", serviceFactor);

  const peakTorqueDrivingSideNm = ktrDin740ExamplePeakTorqueDrivingSideNm();
  const ktrRequiredMaxTorqueNm = ktrDin740ExampleRequiredMaxTorqueNm();
  const capacityTorqueNm = KTR_DIN740_PART2_EXAMPLE.coupling.maxTorqueNm;

  const { scaledRequiredTorqueNm: moduleRequiredTorqueNm } =
    resolveScaledRequiredTorque({
      requiredTorqueNm: peakTorqueDrivingSideNm,
      serviceFactor,
    });

  return {
    ktrRequiredMaxTorqueNm,
    moduleRequiredTorqueNm,
    moduleSafetyFactor: capacityTorqueNm / moduleRequiredTorqueNm,
    ktrSafetyFactor: capacityTorqueNm / ktrRequiredMaxTorqueNm,
    relativeDeviation:
      (moduleRequiredTorqueNm - ktrRequiredMaxTorqueNm) /
      ktrRequiredMaxTorqueNm,
  };
}

/**
 * The `coupling.service_factor` value that makes the module's own simplified
 * check algebraically identical to KTR's own detailed method for this
 * scenario: `M_A * S_A * S_Z * S_t` (the full composed factor, including the
 * mass-distribution coefficient this module cannot compute internally — see
 * context/modules/coupling/stage-1-spec.md item 3, "not implementable in
 * 0.1.0" for lack of a released motor/load inertia parameter).
 */
export function ktrDin740ExampleEquivalentServiceFactor(): number {
  const { factors } = KTR_DIN740_PART2_EXAMPLE;
  return (
    ktrDin740ExampleDrivingSideInertiaCoefficient() *
    factors.shockFactorDrivingSide *
    factors.startingFactor *
    factors.temperatureFactor
  );
}
