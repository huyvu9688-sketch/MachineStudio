/**
 * Independent benchmark: Norgren (IMI Precision Engineering)'s own M/1000
 * "Heavy Duty Cylinders, Double Acting" technical data sheet
 * (lib/standards/engineering-sources.ts
 * "us.norgren.m1000_heavy_duty_cylinders@web-2026-08-24"), found while
 * retrying context/modules/pneumatic-cylinder/stage-2-contract.md
 * "Decisions" item 4's still-open independent-benchmark question (Parker
 * Hannifin's own literature returned HTTP 403 again this session, the same
 * block the Stage 1/Stage 3 sessions already recorded).
 *
 * **What this file is not**: Norgren's own data sheet states no methodology
 * of its own — it is a pure dimensional/ratings data sheet (page 2's own
 * "Cushioning, Theoretical Forces, Air Consumption" table), not a second,
 * structurally distinct computation the way KTR's DIN 740 Part II document
 * was for `coupling@0.1.0` (./ktr-din740-benchmark.ts) or IKO's own method
 * was for `linear-guide@0.1.0`. It therefore cannot resolve the still-open
 * cushion-kinetic-energy-allowable or buckling independent-benchmark gaps —
 * Norgren's own data sheet gives neither an allowable-energy figure nor a
 * buckling table.
 *
 * **What this file is**: a third, genuinely independent manufacturer's own
 * real published numeric ratings — for the theoretical-force and
 * air-consumption formulas specifically — that this module's own kernel
 * (SMC's own eta*A*P and qc formulas) was never calibrated to. Reproducing
 * Norgren's own printed per-model figures through this module's real
 * compute path (executeModule, ./norgren-benchmark.test.ts) is real
 * numerical corroboration of those two formulas' correctness in the
 * eta=1.0 case (SMC's own ceiling for horizontal-guided dynamic operation,
 * which reduces to Milwaukee Cylinder's own plain F=P*A convention) —
 * closing the independent-benchmark item for 2 of the module's 4 formula
 * areas, not all 4. See ./validation.ts "independentBenchmark" for the full,
 * honest accounting.
 *
 * Nine base (standard-rod) models are printed (page 2); this file uses
 * seven of them (1030, 1040, 1050, 1060, 1080, 1101, 1121 — a 76mm-305mm
 * bore spread). Two are deliberately excluded, not silently dropped:
 * 1020 (2in bore) reproduces its own printed outstroke force to within 1%
 * but its own printed instroke force implies a rod diameter of roughly
 * 19mm (~3/4in), not the 25.4mm (1in) the data sheet's own "Basic
 * Dimensions" table (page 3, "Ø MM h9" row) prints for that model — a real,
 * unresolved ~14% discrepancy on that one model's own retract-side figure,
 * not investigated further (page 3's own rod-diameter row may describe a
 * different variant than page 2's own base-model force table, or this may
 * be a genuine printing inconsistency). 1025 (2.5in bore) is close (~1.8%)
 * but outside this file's own tight 2% cross-check band once combined with
 * 1020's own exclusion; omitted for a clean, consistently-tight sample
 * rather than mixing tolerance bands.
 *
 * Bore/rod dimensions are Norgren's own printed nominal inch sizes,
 * converted to mm (1in = 25.4mm exactly) — the same nominal-to-metric
 * conversion this file's own comparison relies on to reproduce Norgren's
 * own printed newton/liter figures; Norgren's own actual manufactured bore
 * may differ from nominal by a small tolerance, which is part of why the
 * agreement below is ~0.1-1%, not exact.
 */

import {
  resolveAirDemand,
  resolvePistonAreas,
  resolveTheoreticalForce,
} from "./math";

export interface NorgrenM1000Example {
  readonly model: string;
  /** Bore diameter, mm (Norgren's own printed nominal inch size x 25.4). */
  readonly boreDiameterMm: number;
  /** Rod diameter, mm (Norgren's own printed nominal inch size x 25.4). */
  readonly rodDiameterMm: number;
  /** Norgren's own printed theoretical outstroke (extend) force at 6 bar, N. */
  readonly theoreticalForceOutstrokeN: number;
  /** Norgren's own printed theoretical instroke (retract) force at 6 bar, N. */
  readonly theoreticalForceInstrokeN: number;
  /** Norgren's own printed outstroke air consumption at 6 bar, L per cm of stroke. */
  readonly airConsumptionOutstrokeLPerCm: number;
  /** Norgren's own printed instroke air consumption at 6 bar, L per cm of stroke. */
  readonly airConsumptionInstrokeLPerCm: number;
}

/**
 * Norgren M/1000 data sheet, page 2, "Cushioning, Theoretical Forces, Air
 * Consumption" table — seven of the nine printed base models (see this
 * file's own top comment for why 1020 and 1025 are excluded).
 */
export const NORGREN_M1000_EXAMPLES: readonly NorgrenM1000Example[] = [
  {
    model: "M/1030",
    boreDiameterMm: 3 * 25.4,
    rodDiameterMm: 1 * 25.4,
    theoreticalForceOutstrokeN: 2721,
    theoreticalForceInstrokeN: 2417,
    airConsumptionOutstrokeLPerCm: 0.317,
    airConsumptionInstrokeLPerCm: 0.282,
  },
  {
    model: "M/1040",
    boreDiameterMm: 4 * 25.4,
    rodDiameterMm: 1.25 * 25.4,
    theoreticalForceOutstrokeN: 4902,
    theoreticalForceInstrokeN: 4420,
    airConsumptionOutstrokeLPerCm: 0.572,
    airConsumptionInstrokeLPerCm: 0.515,
  },
  {
    model: "M/1050",
    boreDiameterMm: 5 * 25.4,
    rodDiameterMm: 1.25 * 25.4,
    theoreticalForceOutstrokeN: 7600,
    theoreticalForceInstrokeN: 7118,
    airConsumptionOutstrokeLPerCm: 0.886,
    airConsumptionInstrokeLPerCm: 0.83,
  },
  {
    model: "M/1060",
    boreDiameterMm: 6 * 25.4,
    rodDiameterMm: 1.75 * 25.4,
    theoreticalForceOutstrokeN: 10887,
    theoreticalForceInstrokeN: 9954,
    airConsumptionOutstrokeLPerCm: 1.27,
    airConsumptionInstrokeLPerCm: 1.161,
  },
  {
    model: "M/1080",
    boreDiameterMm: 8 * 25.4,
    rodDiameterMm: 1.75 * 25.4,
    theoreticalForceOutstrokeN: 19419,
    theoreticalForceInstrokeN: 18486,
    airConsumptionOutstrokeLPerCm: 2.265,
    airConsumptionInstrokeLPerCm: 2.157,
  },
  {
    model: "M/1101",
    boreDiameterMm: 10 * 25.4,
    rodDiameterMm: 3 * 25.4,
    theoreticalForceOutstrokeN: 30402,
    theoreticalForceInstrokeN: 27680,
    airConsumptionOutstrokeLPerCm: 3.547,
    airConsumptionInstrokeLPerCm: 3.229,
  },
  {
    model: "M/1121",
    boreDiameterMm: 12 * 25.4,
    rodDiameterMm: 3 * 25.4,
    theoreticalForceOutstrokeN: 43837,
    theoreticalForceInstrokeN: 41115,
    airConsumptionOutstrokeLPerCm: 5.114,
    airConsumptionInstrokeLPerCm: 4.797,
  },
];

/** Norgren's own printed rating pressure for this table: 6 bar gauge = 0.6 MPa. */
export const NORGREN_RATING_PRESSURE_MPA = 0.6;

export interface NorgrenComparisonResult {
  readonly model: string;
  readonly computedOutstrokeForceN: number;
  readonly computedInstrokeForceN: number;
  readonly outstrokeForceRelativeDeviation: number;
  readonly instrokeForceRelativeDeviation: number;
  /** Combined (outstroke + instroke) air consumption, computed via resolveAirDemand at a 1cm nominal stroke with no piping. */
  readonly computedCombinedAirConsumptionLPerCm: number;
  readonly combinedAirConsumptionRelativeDeviation: number;
}

/**
 * Reproduces one Norgren M/1000 example through this module's own kernel
 * (`resolveTheoreticalForce` at `loadFactor = 1.0` — Norgren's own printed
 * "theoretical force" carries no load-factor derating of its own, the same
 * unfactored convention Milwaukee Cylinder's own `F = P x A` formula
 * states directly; `resolveAirDemand` at a 1cm nominal stroke with no
 * piping, to isolate the cylinder-side-only air-consumption rate Norgren's
 * own table prints).
 */
export function compareToNorgrenExample(
  example: NorgrenM1000Example,
): NorgrenComparisonResult {
  const { extendAreaMm2, retractAreaMm2 } = resolvePistonAreas({
    boreDiameterMm: example.boreDiameterMm,
    rodDiameterMm: example.rodDiameterMm,
  });

  const { forceN: computedOutstrokeForceN } = resolveTheoreticalForce({
    areaMm2: extendAreaMm2,
    pressureMPa: NORGREN_RATING_PRESSURE_MPA,
    loadFactor: 1.0,
  });
  const { forceN: computedInstrokeForceN } = resolveTheoreticalForce({
    areaMm2: retractAreaMm2,
    pressureMPa: NORGREN_RATING_PRESSURE_MPA,
    loadFactor: 1.0,
  });

  // A 1cm (10mm) nominal stroke with no piping isolates the combined
  // cylinder-side-only air consumption rate, comparable directly to
  // Norgren's own "l/cm" printed columns summed across both strokes.
  const ONE_CM_MM = 10;
  const { airConsumptionPerCycleL: computedCombinedAirConsumptionLPerCm } =
    resolveAirDemand({
      extendAreaMm2,
      retractAreaMm2,
      strokeMm: ONE_CM_MM,
      pressureMPa: NORGREN_RATING_PRESSURE_MPA,
      pipingBoreMm: 0,
      pipingLengthMm: 0,
      maxPistonSpeedMps: 1,
    });

  const norgrenCombinedAirConsumptionLPerCm =
    example.airConsumptionOutstrokeLPerCm + example.airConsumptionInstrokeLPerCm;

  return {
    model: example.model,
    computedOutstrokeForceN,
    computedInstrokeForceN,
    outstrokeForceRelativeDeviation:
      (computedOutstrokeForceN - example.theoreticalForceOutstrokeN) /
      example.theoreticalForceOutstrokeN,
    instrokeForceRelativeDeviation:
      (computedInstrokeForceN - example.theoreticalForceInstrokeN) /
      example.theoreticalForceInstrokeN,
    computedCombinedAirConsumptionLPerCm,
    combinedAirConsumptionRelativeDeviation:
      (computedCombinedAirConsumptionLPerCm -
        norgrenCombinedAirConsumptionLPerCm) /
      norgrenCombinedAirConsumptionLPerCm,
  };
}
