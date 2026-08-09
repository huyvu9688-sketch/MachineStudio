/**
 * Independent benchmark: IKO's own Linear Way / Linear Roller Way catalog
 * (1560E) dynamic/static equivalent-load, static-safety, and rating-life
 * formulas, reproduced from IKO's own worked "Example 1" (catalog printed
 * pages 15-16) as a second, genuinely independent computation — the
 * "at least one independent benchmark source or tool comparison"
 * context/roadmap.md Module Definition of Done item 9 requires, closing the
 * gap this module's README.md "Stage 4 still does not have" section flagged.
 *
 * IKO's equivalent-load method is a real methodological difference from
 * PMI's own `PE = |PR| + |PT|` form ./math.ts's resolveEquivalentLoad
 * implements (context/modules/linear-guide/stage-1-spec.md item 7): it first
 * applies series/size-specific conversion factors (`kr`, `ka` — catalog
 * Table 3, page 7) to the radial and lateral loads, then combines them with
 * a load-dominance-keyed weighting (`X`, `Y` — catalog Table 4, page 7)
 * rather than a bare sum. IKO's static equivalent load (Table 5, page 8,
 * formula (10)) similarly applies `kOr`/`kOa` conversion factors PMI's form
 * has no equivalent of. Reproducing IKO's own worked numbers below confirms
 * this reading is correct; the sibling test file then asks the question
 * stage-1-spec.md item 7 left open — whether the two methods diverge
 * materially for the same load case — algebraically, for a real sourced
 * case, rather than by inventing one.
 *
 * **Table 4's `X`/`Y` factor is a two-class table, not per-series.**
 * stage-1-spec.md item 7 described it as "`X`, `Y` from a per-series
 * dynamic-equivalent-load-factor table" — reading the actual table (catalog
 * page 7) corrects that: `X`/`Y` depend only on whether the (already
 * `kr`/`ka`-converted) radial or lateral load dominates, the same two rows
 * for every series. Only `kr`/`ka`/`kOr`/`kOa` (Tables 3 and 5) are
 * series/size-specific.
 *
 * **Scope: only IKO's own "Example 1" is reproduced.** Example 1 (Linear
 * Way `ME 25 C2 R640 H`) uses a two-rail/four-slide-unit arrangement
 * (catalog Table 6.4, printed page 11) — this module's own `0.1.0`
 * arrangement. IKO's own "Example 2" (Linear Way `MH 45 C2 R1050 H`) uses a
 * one-rail/two-slide-unit arrangement (Table 6.2) instead — IKO's own
 * mono-rail case, which needs an added moment term in the static equivalent
 * load (its own worked calculation includes a `(C0/T0)*|M0|` term Example 1
 * does not), the same scope split PMI draws between its two-or-more-
 * guideways form and its mono-rail form (stage-1-spec.md item 7). Out of
 * this module's `0.1.0` scope, so not reproduced here.
 *
 * **The per-slide-unit downward/lateral loads (`Fr1`-`Fr4`, `Fa1`-`Fa4`)
 * below are IKO's own printed intermediate figures**, taken as given rather
 * than re-derived from load position: this module's `0.1.0` scope already
 * does not implement IKO's general load-position-to-moment formulas
 * (stage-1-spec.md item 6, "not implemented in `0.1.0`"), and the printed
 * page these come from (page 11, Table 6.4) sets its position-dependent
 * moment terms in small type this session could not transcribe with the
 * confidence this project requires for a formula it would then assert
 * signs against — the same caution that already caught one real sign error
 * in this module's own PMI reading. Taking the figures as given is the same
 * "reproduce the source's own numbers, not a from-scratch derivation"
 * treatment ./pmi-chapter-9.ts gives PMI's own worked example; every number
 * transcribed below was independently checked by carrying it through this
 * file's formulas to IKO's own printed final answers (see the sibling test
 * file), which would not agree by coincidence if a figure were mistyped.
 *
 * Source: IKO (Nippon Thompson Co., Ltd.), Linear Way / Linear Roller Way
 * catalog 1560E, "Load Rating and Life" (printed pages 5-8) and "Examples of
 * Load and Life Calculation", Example 1 (printed pages 15-16). See
 * lib/standards/engineering-sources.ts "jp.iko.linear_way_catalog@1560e".
 */

import {
  resolveNominalLife,
  resolveServiceLifeHours,
  resolveStaticSafetyFactor,
} from "./math";

export class IkoBenchmarkInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IkoBenchmarkInputError";
  }
}

function fail(message: string): never {
  throw new IkoBenchmarkInputError(message);
}

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) fail(`${name} must be finite.`);
}

/** IKO's own conversion factors for load direction (Table 3, dynamic; Table 5, static). */
export interface IkoConversionFactors {
  readonly kr: number;
  readonly ka: number;
  readonly kOr: number;
  readonly kOa: number;
}

/**
 * Linear Way ME, size 15-30 — the series and size bucket IKO's own Example 1
 * (`ME 25 C2 R640 H`) uses. Catalog Table 3 / Table 5 (printed pages 7-8):
 * `kr = kOr = 1`, `ka = kOa = 1` — a symmetric bucket that, unlike some
 * series (e.g. `MV`, `1`/`1.23`), carries no direction-dependent split.
 */
export const ME_15_30_FACTORS: IkoConversionFactors = {
  kr: 1,
  ka: 1,
  kOr: 1,
  kOa: 1,
};

export interface IkoDynamicEquivalentLoadInput {
  readonly radialLoadN: number;
  readonly lateralLoadN: number;
  readonly kr: number;
  readonly ka: number;
}

/**
 * IKO catalog formulas (7)-(9), page 7: `Frw = kr*|Fr|`, `Faw = ka*|Fa|` (the
 * moment terms formulas (7)/(8) also carry are omitted here — IKO's own
 * Example 1 omits them too, for the same reason PMI's own form needs no
 * separate moment term in this module's two-rail/four-block scope: the
 * moment is already captured by differential per-block loading), then
 * `P = X*Frw + Y*Faw`, where `X`/`Y` are the two-class table keyed on which
 * conversion load dominates (Table 4, page 7).
 */
export function resolveIkoDynamicEquivalentLoad(
  input: IkoDynamicEquivalentLoadInput,
): number {
  assertFinite("radialLoadN", input.radialLoadN);
  assertFinite("lateralLoadN", input.lateralLoadN);
  assertFinite("kr", input.kr);
  assertFinite("ka", input.ka);

  const radialConversionN = input.kr * Math.abs(input.radialLoadN);
  const lateralConversionN = input.ka * Math.abs(input.lateralLoadN);
  const [x, y] = radialConversionN >= lateralConversionN ? [1, 0.6] : [0.6, 1];

  return x * radialConversionN + y * lateralConversionN;
}

export interface IkoStaticEquivalentLoadInput {
  readonly radialLoadN: number;
  readonly lateralLoadN: number;
  readonly kOr: number;
  readonly kOa: number;
}

/**
 * IKO catalog formula (10), page 8: `P0 = kOr*|Fr| + kOa*|Fa|` (moment terms
 * omitted for the same reason as the dynamic case above — Example 1 needs
 * none of them either).
 */
export function resolveIkoStaticEquivalentLoad(
  input: IkoStaticEquivalentLoadInput,
): number {
  assertFinite("radialLoadN", input.radialLoadN);
  assertFinite("lateralLoadN", input.lateralLoadN);
  assertFinite("kOr", input.kOr);
  assertFinite("kOa", input.kOa);

  return (
    input.kOr * Math.abs(input.radialLoadN) +
    input.kOa * Math.abs(input.lateralLoadN)
  );
}

/**
 * IKO's own "Example 1" (catalog printed pages 15-16): Linear Way
 * `ME 25 C2 R640 H`, a two-rail/four-slide-unit arrangement (Table 6.4).
 * `dynamicLoadRatingN`/`staticLoadRatingN`/`loadFactor`/`strokeLengthM`/
 * `cyclesPerMinute` are the example's own given inputs; each slide unit's
 * `radialN`/`lateralN` are IKO's own printed intermediate figures (`Fr1`-
 * `Fr4`, `Fa1`-`Fa4`) — see this file's header for why they are taken as
 * given rather than re-derived from load position.
 */
export const IKO_EXAMPLE_1 = {
  dynamicLoadRatingN: 18_100,
  staticLoadRatingN: 21_100,
  loadFactor: 1.5,
  strokeLengthM: 0.1,
  cyclesPerMinute: 5,
  slideUnits: {
    unit1: { radialN: 1750, lateralN: 1600 },
    unit2: { radialN: 346, lateralN: 600 },
    unit3: { radialN: 252, lateralN: 1600 },
    unit4: { radialN: 1150, lateralN: 600 },
  },
} as const;

export type IkoExample1Unit = keyof typeof IKO_EXAMPLE_1.slideUnits;

const EXAMPLE_1_UNITS: readonly IkoExample1Unit[] = [
  "unit1",
  "unit2",
  "unit3",
  "unit4",
];

/** Dynamic equivalent load on one slide unit, IKO's own formula (9). */
export function ikoExample1DynamicEquivalentLoad(
  unit: IkoExample1Unit,
): number {
  const { radialN, lateralN } = IKO_EXAMPLE_1.slideUnits[unit];
  return resolveIkoDynamicEquivalentLoad({
    radialLoadN: radialN,
    lateralLoadN: lateralN,
    kr: ME_15_30_FACTORS.kr,
    ka: ME_15_30_FACTORS.ka,
  });
}

/** Static equivalent load on one slide unit, IKO's own formula (10). */
export function ikoExample1StaticEquivalentLoad(unit: IkoExample1Unit): number {
  const { radialN, lateralN } = IKO_EXAMPLE_1.slideUnits[unit];
  return resolveIkoStaticEquivalentLoad({
    radialLoadN: radialN,
    lateralLoadN: lateralN,
    kOr: ME_15_30_FACTORS.kOr,
    kOa: ME_15_30_FACTORS.kOa,
  });
}

interface GoverningLoad {
  readonly unit: IkoExample1Unit;
  readonly loadN: number;
}

function governingLoad(
  loadFor: (unit: IkoExample1Unit) => number,
): GoverningLoad {
  let governing: GoverningLoad = { unit: EXAMPLE_1_UNITS[0], loadN: -Infinity };
  for (const unit of EXAMPLE_1_UNITS) {
    const loadN = loadFor(unit);
    if (loadN > governing.loadN) governing = { unit, loadN };
  }
  return governing;
}

/** The governing (largest) static equivalent load and its slide unit. */
export function ikoExample1GoverningStaticLoad(): GoverningLoad {
  return governingLoad(ikoExample1StaticEquivalentLoad);
}

/** The governing (largest) dynamic equivalent load and its slide unit. */
export function ikoExample1GoverningDynamicLoad(): GoverningLoad {
  return governingLoad(ikoExample1DynamicEquivalentLoad);
}

/** IKO's own printed static safety factor (page 16): `fs = C0/P0`, governed by unit 1. */
export function ikoExample1StaticSafetyFactor(): number {
  const { loadN } = ikoExample1GoverningStaticLoad();
  return resolveStaticSafetyFactor({
    staticLoadRatingN: IKO_EXAMPLE_1.staticLoadRatingN,
    appliedLoadN: loadN,
  }).staticSafetyFactor;
}

/** IKO's own printed basic rating life, in km (page 16): about 4410 km. */
export function ikoExample1LifeKm(): number {
  const { loadN } = ikoExample1GoverningDynamicLoad();
  return resolveNominalLife({
    dynamicLoadRatingN: IKO_EXAMPLE_1.dynamicLoadRatingN,
    equivalentLoadN: loadN,
    rollingElementType: "ball",
    loadFactor: IKO_EXAMPLE_1.loadFactor,
  }).lifeKm;
}

/** IKO's own printed rating life, in hours (page 16): "about 73,500 hours". */
export function ikoExample1LifeHours(): number {
  return resolveServiceLifeHours({
    lifeKm: ikoExample1LifeKm(),
    strokeLengthM: IKO_EXAMPLE_1.strokeLengthM,
    cyclesPerMinute: IKO_EXAMPLE_1.cyclesPerMinute,
  });
}
