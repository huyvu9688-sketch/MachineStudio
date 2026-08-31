/**
 * Pure SI-number kernel for the shaft-key-bolt-checks module (Unit 7.5,
 * Stage 3 draft). Three semi-independent groups of functions, one per
 * sub-check — see context/modules/shaft-key-bolt-checks/stage-1-spec.md
 * "Formulas" and stage-2-contract.md "Decisions" for the sourcing and the
 * design choices each formula reflects.
 *
 * Values become EngineeringValues only at the module-package boundary; bare
 * numbers remain internal here, mirroring every other module's own math.ts.
 */

export class ShaftKeyBoltInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShaftKeyBoltInputError";
  }
}

function fail(message: string): never {
  throw new ShaftKeyBoltInputError(message);
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

// === Shaft: combined torque/bending stress (stage-1-spec.md "Formulas" ====
// === item 1) ================================================================

export interface ShaftCombinedStressInput {
  /** Transmitted torque magnitude, in N*m. Must be `>= 0`. */
  readonly torqueNm: number;
  /** Bending moment magnitude at the checked cross-section, in N*m. Must be `>= 0`. */
  readonly bendingMomentNm: number;
  /**
   * `Ks` — empirical service-severity factor applied to torque
   * (`shaft.torque_service_factor`). Must be `> 0`.
   */
  readonly torqueServiceFactor: number;
  /**
   * `Km` — empirical service-severity factor applied to bending moment
   * (`shaft.bending_service_factor`). Must be `> 0`.
   */
  readonly bendingServiceFactor: number;
  /** Candidate shaft outer diameter, in m. Must be `> 0`. */
  readonly diameterM: number;
  /**
   * Hollow-shaft bore diameter, in m. `0` for a solid shaft (the default).
   * Must be `>= 0` and `< diameterM`.
   */
  readonly boreDiameterM: number;
}

export interface ShaftCombinedStressResult {
  readonly combinedStressPa: number;
}

/**
 * `D^3 = 16 / (fs*pi*(1-B^4)) * sqrt(Ks^2*T^2 + [Km*M]^2)`, `B = Di/D` —
 * the Air Force Stress Manual's own maximum-shear-stress (Tresca) combined
 * bending/torsion shaft-diameter formula, inverted to report the actual
 * combined stress at a candidate diameter rather than solve for a required
 * one (this module checks a candidate, per stage-1-spec.md "Purpose"). No
 * axial-load term (`F`, `alpha` in the sourced cubic): omitted from `0.1.0`
 * (stage-2-contract.md "Decisions" item 1).
 */
export function resolveShaftCombinedStress(
  input: ShaftCombinedStressInput,
): ShaftCombinedStressResult {
  assertNonNegative("torqueNm", input.torqueNm);
  assertNonNegative("bendingMomentNm", input.bendingMomentNm);
  assertPositive("torqueServiceFactor", input.torqueServiceFactor);
  assertPositive("bendingServiceFactor", input.bendingServiceFactor);
  assertPositive("diameterM", input.diameterM);
  assertNonNegative("boreDiameterM", input.boreDiameterM);
  if (input.boreDiameterM >= input.diameterM) {
    fail("boreDiameterM must be less than diameterM.");
  }

  const B = input.boreDiameterM / input.diameterM;
  const torqueTerm = input.torqueServiceFactor * input.torqueNm;
  const bendingTerm = input.bendingServiceFactor * input.bendingMomentNm;
  const resultantMomentNm = Math.sqrt(
    torqueTerm * torqueTerm + bendingTerm * bendingTerm,
  );

  const combinedStressPa =
    (16 * resultantMomentNm) /
    (Math.PI * Math.pow(input.diameterM, 3) * (1 - Math.pow(B, 4)));

  return { combinedStressPa };
}

export interface ShaftSafetyFactorInput {
  /** Shaft material yield strength, in Pa. Must be `> 0`. */
  readonly yieldStrengthPa: number;
  /** Computed combined stress, in Pa. Must be `> 0`. */
  readonly combinedStressPa: number;
}

export interface ShaftSafetyFactorResult {
  readonly safetyFactor: number;
}

/**
 * `fs = Sy / sigma_e`. Requires a strictly positive combined stress: a
 * shaft with zero torque and zero bending moment is a degenerate case this
 * check does not support — reporting an infinite safety factor would
 * misrepresent an unbounded margin as a finite number, the same "throw
 * rather than report infinity" treatment `coupling`'s own zero-speed case
 * receives.
 */
export function resolveShaftSafetyFactor(
  input: ShaftSafetyFactorInput,
): ShaftSafetyFactorResult {
  assertPositive("yieldStrengthPa", input.yieldStrengthPa);
  assertPositive("combinedStressPa", input.combinedStressPa);

  return { safetyFactor: input.yieldStrengthPa / input.combinedStressPa };
}

// === Key: shear and bearing stress (stage-1-spec.md "Formulas" item 2) ====

export interface KeyTangentialForceInput {
  /** Transmitted torque magnitude, in N*m. Must be `> 0`. */
  readonly torqueNm: number;
  /** Shaft diameter at the key, in m (reused from `shaft.diameter`). Must be `> 0`. */
  readonly shaftDiameterM: number;
}

export interface KeyTangentialForceResult {
  readonly tangentialForceN: number;
}

/** `F = 2*T/d` — tangential force at the shaft surface. */
export function resolveKeyTangentialForce(
  input: KeyTangentialForceInput,
): KeyTangentialForceResult {
  assertPositive("torqueNm", input.torqueNm);
  assertPositive("shaftDiameterM", input.shaftDiameterM);

  return { tangentialForceN: (2 * input.torqueNm) / input.shaftDiameterM };
}

export interface KeyShearStressInput {
  /** Tangential force, in N. Must be `> 0`. */
  readonly tangentialForceN: number;
  /** Key width, in m. Must be `> 0`. */
  readonly widthM: number;
  /** Key length, in m. Must be `> 0`. */
  readonly lengthM: number;
}

export interface KeyShearStressResult {
  readonly shearStressPa: number;
}

/** `tau = F/(w*L)` — shear stress across the key's width. */
export function resolveKeyShearStress(
  input: KeyShearStressInput,
): KeyShearStressResult {
  assertPositive("tangentialForceN", input.tangentialForceN);
  assertPositive("widthM", input.widthM);
  assertPositive("lengthM", input.lengthM);

  return {
    shearStressPa: input.tangentialForceN / (input.widthM * input.lengthM),
  };
}

export interface KeyBearingStressInput {
  /** Tangential force, in N. Must be `> 0`. */
  readonly tangentialForceN: number;
  /** Key height, in m. Must be `> 0`. */
  readonly heightM: number;
  /** Key length, in m. Must be `> 0`. */
  readonly lengthM: number;
}

export interface KeyBearingStressResult {
  readonly bearingStressPa: number;
}

/**
 * `sigma = F/((h/2)*L)` — bearing (compressive) stress on the key's side
 * face, using `h/2` as the contact depth (a registered approximation to a
 * more exact geometry-dependent depth — stage-2-contract.md "Decisions"
 * item 3).
 */
export function resolveKeyBearingStress(
  input: KeyBearingStressInput,
): KeyBearingStressResult {
  assertPositive("tangentialForceN", input.tangentialForceN);
  assertPositive("heightM", input.heightM);
  assertPositive("lengthM", input.lengthM);

  return {
    bearingStressPa:
      input.tangentialForceN / ((input.heightM / 2) * input.lengthM),
  };
}

export interface KeySafetyFactorInput {
  /** Key material yield strength, in Pa. Must be `> 0`. */
  readonly yieldStrengthPa: number;
  /** Computed shear or bearing stress, in Pa. Must be `> 0`. */
  readonly stressPa: number;
}

export interface KeySafetyFactorResult {
  readonly safetyFactor: number;
}

/**
 * `fs = Sy / stress` — shared by both `key.shear_safety_factor` and
 * `key.bearing_safety_factor` (stage-2-contract.md "Released Additive
 * Contract"); the two stress values passed in are already distinct
 * ({@link resolveKeyShearStress}, {@link resolveKeyBearingStress}).
 */
export function resolveKeySafetyFactor(
  input: KeySafetyFactorInput,
): KeySafetyFactorResult {
  assertPositive("yieldStrengthPa", input.yieldStrengthPa);
  assertPositive("stressPa", input.stressPa);

  return { safetyFactor: input.yieldStrengthPa / input.stressPa };
}

// === Bolt: preload, tensile capacity, separation, shear/bearing ===========
// === (stage-1-spec.md "Formulas" items 3-6) ================================

export interface BoltPreloadInput {
  /** Installation torque, in N*m. Must be `> 0`. */
  readonly installationTorqueNm: number;
  /** Nut/friction factor `K`. Must be `> 0`. */
  readonly kFactor: number;
  /** Nominal bolt diameter, in m. Must be `> 0`. */
  readonly diameterM: number;
}

export interface BoltPreloadResult {
  readonly preloadN: number;
}

/** `F = T / (K*d)`, inverted from `T = K*F*d`. */
export function resolveBoltPreload(input: BoltPreloadInput): BoltPreloadResult {
  assertPositive("installationTorqueNm", input.installationTorqueNm);
  assertPositive("kFactor", input.kFactor);
  assertPositive("diameterM", input.diameterM);

  return {
    preloadN: input.installationTorqueNm / (input.kFactor * input.diameterM),
  };
}

export type BoltThreadStandard = "metric" | "unified";

export interface BoltStressAreaInput {
  readonly threadStandard: BoltThreadStandard;
  /** Nominal bolt diameter, in m. Must be `> 0`. */
  readonly diameterM: number;
  /** Thread pitch, in m. Must be `> 0`. */
  readonly pitchM: number;
}

export interface BoltStressAreaResult {
  readonly stressAreaM2: number;
}

const M_PER_IN = 0.0254;

/**
 * `metric` (ISO 898-1 / JIS B1051): `As = (pi/4)*(d - 0.9382*P)^2`, computed
 * directly in SI. `unified` (US/UN, ASME B1.1): `TS = 0.7854*(Dia -
 * 0.9743/TPI)^2`, computed in the inch units the source formula is printed
 * in (`TPI = 1/pitch_in`) and converted to m^2 at the end — the same
 * "implement as sourced, convert at the boundary" treatment this project
 * already gives an imperial-native formula (e.g. `ball-screw`'s own
 * Rockford-sourced buckling formula).
 */
export function resolveBoltStressArea(
  input: BoltStressAreaInput,
): BoltStressAreaResult {
  assertPositive("diameterM", input.diameterM);
  assertPositive("pitchM", input.pitchM);

  if (input.threadStandard === "metric") {
    const d = input.diameterM;
    const P = input.pitchM;
    const term = d - 0.9382 * P;
    if (term <= 0) fail("Metric thread pitch is too coarse for this diameter.");
    return { stressAreaM2: (Math.PI / 4) * term * term };
  }

  const diameterIn = input.diameterM / M_PER_IN;
  const pitchIn = input.pitchM / M_PER_IN;
  const tpi = 1 / pitchIn;
  const termIn = diameterIn - 0.9743 / tpi;
  if (termIn <= 0) fail("Unified thread pitch is too coarse for this diameter.");
  const stressAreaIn2 = 0.7854 * termIn * termIn;
  return { stressAreaM2: stressAreaIn2 * M_PER_IN * M_PER_IN };
}

export interface BoltTensileSafetyFactorInput {
  /** Tensile stress area, in m^2. Must be `> 0`. */
  readonly stressAreaM2: number;
  /** Proof stress, in Pa. Must be `> 0`. */
  readonly proofStrengthPa: number;
  /** Preload, in N. Must be `> 0`. */
  readonly preloadN: number;
  /** Externally applied tensile load, in N. Must be `>= 0`. */
  readonly externalTensileLoadN: number;
  /**
   * Joint stiffness ratio `C = kb/(kb+km)`. When omitted, the bolt's own
   * share of the external load is taken as the whole load (`C = 1`) — a
   * conservative simplification, not a guessed physical value
   * (stage-2-contract.md "Released Additive Contract",
   * `bolt.tensile_safety_factor`).
   */
  readonly jointStiffnessRatio?: number;
}

export interface BoltTensileSafetyFactorResult {
  readonly tensileSafetyFactor: number;
}

/**
 * `fs = (As*Sp) / (F_preload + P_external*C)`. `C` defaults to `1` when no
 * joint-stiffness ratio is supplied (see this function's own input doc).
 */
export function resolveBoltTensileSafetyFactor(
  input: BoltTensileSafetyFactorInput,
): BoltTensileSafetyFactorResult {
  assertPositive("stressAreaM2", input.stressAreaM2);
  assertPositive("proofStrengthPa", input.proofStrengthPa);
  assertPositive("preloadN", input.preloadN);
  assertNonNegative("externalTensileLoadN", input.externalTensileLoadN);
  const C = input.jointStiffnessRatio ?? 1;
  assertFinite("jointStiffnessRatio", C);
  if (C < 0 || C > 1) fail("jointStiffnessRatio must be between 0 and 1.");

  const capacityN = input.stressAreaM2 * input.proofStrengthPa;
  const appliedTensionN = input.preloadN + input.externalTensileLoadN * C;

  return { tensileSafetyFactor: capacityN / appliedTensionN };
}

export interface BoltSeparationSafetyFactorInput {
  /** Preload, in N. Must be `> 0`. */
  readonly preloadN: number;
  /** Externally applied tensile load, in N. Must be `> 0`. */
  readonly externalTensileLoadN: number;
  /** Joint stiffness ratio `C = kb/(kb+km)`. Must be `>= 0` and `< 1`. */
  readonly jointStiffnessRatio: number;
}

export interface BoltSeparationSafetyFactorResult {
  readonly separationSafetyFactor: number;
}

/**
 * `FoS_separation = F_preload / (P_external*(1-C))`. Only meaningful when
 * an external tensile load is actually present (stage-2-contract.md
 * "Decisions" item 4) — the caller only invokes this when both
 * `bolt.joint_stiffness_ratio` and a nonzero `bolt.external_tensile_load`
 * are supplied for the case being checked.
 */
export function resolveBoltSeparationSafetyFactor(
  input: BoltSeparationSafetyFactorInput,
): BoltSeparationSafetyFactorResult {
  assertPositive("preloadN", input.preloadN);
  assertPositive("externalTensileLoadN", input.externalTensileLoadN);
  assertFinite("jointStiffnessRatio", input.jointStiffnessRatio);
  if (input.jointStiffnessRatio < 0 || input.jointStiffnessRatio >= 1) {
    fail("jointStiffnessRatio must be between 0 (inclusive) and 1 (exclusive).");
  }

  const separationLoadN =
    input.preloadN / (1 - input.jointStiffnessRatio);
  return {
    separationSafetyFactor: separationLoadN / input.externalTensileLoadN,
  };
}

export type BoltShearPlaneCount = "single" | "double";

export interface BoltShearStressInput {
  /** Externally applied shear load, in N. Must be `> 0`. */
  readonly shearLoadN: number;
  /** Nominal bolt diameter, in m. Must be `> 0`. */
  readonly diameterM: number;
  readonly shearPlaneCount: BoltShearPlaneCount;
}

export interface BoltShearStressResult {
  readonly shearStressPa: number;
}

/**
 * `tau = 4*F/(pi*d^2)` (single shear) or `tau = 2*F/(pi*d^2)` (double
 * shear).
 */
export function resolveBoltShearStress(
  input: BoltShearStressInput,
): BoltShearStressResult {
  assertPositive("shearLoadN", input.shearLoadN);
  assertPositive("diameterM", input.diameterM);

  const areaM2 = Math.PI * input.diameterM * input.diameterM;
  const numerator = input.shearPlaneCount === "single" ? 4 : 2;
  return { shearStressPa: (numerator * input.shearLoadN) / areaM2 };
}

export interface BoltBearingStressInput {
  /** Externally applied shear load, in N. Must be `> 0`. */
  readonly shearLoadN: number;
  /** Nominal bolt diameter, in m. Must be `> 0`. */
  readonly diameterM: number;
  /** Clamped material thickness at the shear plane, in m. Must be `> 0`. */
  readonly thicknessM: number;
}

export interface BoltBearingStressResult {
  readonly bearingStressPa: number;
}

/** `sigma = F/(d*t)` — bearing (crushing) stress on the clamped material. */
export function resolveBoltBearingStress(
  input: BoltBearingStressInput,
): BoltBearingStressResult {
  assertPositive("shearLoadN", input.shearLoadN);
  assertPositive("diameterM", input.diameterM);
  assertPositive("thicknessM", input.thicknessM);

  return {
    bearingStressPa:
      input.shearLoadN / (input.diameterM * input.thicknessM),
  };
}

export interface BoltSafetyFactorInput {
  /** Allowable stress, in Pa. Must be `> 0`. */
  readonly allowableStressPa: number;
  /** Computed shear or bearing stress, in Pa. Must be `> 0`. */
  readonly stressPa: number;
}

export interface BoltSafetyFactorResult {
  readonly safetyFactor: number;
}

/**
 * `fs = allowable / stress` — shared by both `bolt.shear_safety_factor` and
 * `bolt.bearing_safety_factor`; the two stress values passed in are already
 * distinct ({@link resolveBoltShearStress}, {@link resolveBoltBearingStress}).
 */
export function resolveBoltSafetyFactor(
  input: BoltSafetyFactorInput,
): BoltSafetyFactorResult {
  assertPositive("allowableStressPa", input.allowableStressPa);
  assertPositive("stressPa", input.stressPa);

  return { safetyFactor: input.allowableStressPa / input.stressPa };
}
